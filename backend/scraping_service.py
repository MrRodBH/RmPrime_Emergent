import logging
from datetime import datetime, timezone
from typing import Optional

import httpx

from database import db

logger = logging.getLogger(__name__)

BANCOS = ["CEF", "Itaú", "Bradesco", "Inter"]
MODALIDADES_CEF = ["MCMV", "SBPE"]

URL_BCB = "https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata/TaxasJurosMensalPorMes"

INSTITUICOES = {
    "CEF": ("CAIXA ECONOMICA FEDERAL",),
    "Itaú": ("ITAÚ UNIBANCO", "ITAU UNIBANCO"),
    "Bradesco": ("BRADESCO",),
    "Inter": ("BANCO INTER", "BCO INTER"),
}


async def _consultar_bcb() -> tuple[str, list[dict]]:
    parametros = {
        "$filter": "contains(Modalidade,'imobili')",
        "$format": "json",
        "$top": 2000,
    }
    async with httpx.AsyncClient(timeout=40) as cliente:
        resposta = await cliente.get(URL_BCB, params=parametros)
        resposta.raise_for_status()
        dados = resposta.json()["value"]
    if not dados:
        raise ValueError("A API do Banco Central não retornou registros.")
    mes_recente = max(d["anoMes"] for d in dados)
    return mes_recente, [d for d in dados if d["anoMes"] == mes_recente]


def _modalidade_bcb(registro: dict) -> Optional[str]:
    modalidade = registro.get("Modalidade", "")
    if "Pós-fixado referenciado em TR" not in modalidade:
        return None
    return "MCMV" if "taxas reguladas" in modalidade else "SBPE"


async def _registrar_log(banco: str, sucesso: bool, detalhe: str) -> None:
    await db.scraping_log.insert_one(
        {
            "banco": banco,
            "sucesso": sucesso,
            "detalhe": detalhe,
            "tentativa_em": datetime.now(timezone.utc),
        }
    )


async def executar_scraping() -> dict:
    resumo: dict[str, str] = {}
    try:
        mes, registros = await _consultar_bcb()
    except Exception as erro:
        logger.error("Falha na consulta ao Banco Central: %s", erro)
        for banco in BANCOS:
            await _registrar_log(banco, False, f"Falha ao consultar os dados do Banco Central: {erro}")
        return {banco: "falha" for banco in BANCOS}

    ano, numero_mes = mes.split("-")
    referencia = datetime(int(ano), int(numero_mes), 1, tzinfo=timezone.utc)
    agora = datetime.now(timezone.utc)

    documentos: list[dict] = []
    for banco, nomes in INSTITUICOES.items():
        do_banco = [
            r
            for r in registros
            if any(nome in r["InstituicaoFinanceira"].upper() for nome in nomes)
        ]
        encontradas: dict[Optional[str], float] = {}
        for registro in do_banco:
            modalidade = _modalidade_bcb(registro)
            if not modalidade:
                continue
            if banco == "CEF":
                encontradas[modalidade] = float(registro["TaxaJurosAoAno"])
            elif modalidade == "SBPE":
                encontradas[None] = float(registro["TaxaJurosAoAno"])
        if not encontradas:
            await _registrar_log(banco, False, f"Banco não encontrado nos dados do Banco Central de {mes}.")
            resumo[banco] = "falha"
            continue
        for modalidade, taxa in encontradas.items():
            for sistema in ("SAC", "PRICE"):
                documentos.append(
                    {
                        "banco": banco,
                        "modalidade": modalidade,
                        "sistema": sistema,
                        "taxa_aa": taxa,
                        "fonte": "scraping",
                        "data_referencia": referencia,
                        "atualizado_em": agora,
                    }
                )
        await _registrar_log(
            banco, True, f"{len(encontradas)} modalidade(s) atualizadas (Banco Central, ref. {mes})."
        )
        resumo[banco] = "sucesso"
    if documentos:
        await db.bank_rates.delete_many({"fonte": "scraping"})
        await db.bank_rates.insert_many(documentos)
    logger.info("Atualização de taxas concluída: %s", resumo)
    return resumo

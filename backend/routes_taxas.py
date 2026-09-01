import hmac
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from database import db
from deps import exigir_papeis
from scraping_service import BANCOS, MODALIDADES_CEF, executar_scraping

router = APIRouter(prefix="/taxas", tags=["taxas de financiamento"])
cron_router = APIRouter(prefix="/cron", tags=["tarefas agendadas"])

admin_ou_gestor = exigir_papeis("admin", "gestor")
somente_admin = exigir_papeis("admin")

ORDEM_BANCOS = {banco: i for i, banco in enumerate(BANCOS)}
SISTEMAS = ("SAC", "PRICE")


class TaxaManual(BaseModel):
    banco: str
    modalidade: Optional[str] = None
    sistema: str
    taxa_aa: float = Field(gt=0, le=30)


def _saida_taxa(doc: dict) -> dict:
    return {
        "banco": doc["banco"],
        "modalidade": doc.get("modalidade"),
        "sistema": doc["sistema"],
        "taxa_aa": doc["taxa_aa"],
        "fonte": doc["fonte"],
        "data_referencia": doc["data_referencia"].isoformat() if doc.get("data_referencia") else None,
    }


def _vigentes(docs: list[dict]) -> list[dict]:
    combos: dict[tuple, dict] = {}
    for doc in docs:
        chave = (doc["banco"], doc.get("modalidade"), doc["sistema"])
        atual = combos.get(chave)
        if atual is None:
            combos[chave] = doc
        elif doc["fonte"] == "manual" and atual["fonte"] == "scraping":
            combos[chave] = doc
    return sorted(
        combos.values(),
        key=lambda d: (
            ORDEM_BANCOS.get(d["banco"], 99),
            d.get("modalidade") or "",
            0 if d["sistema"] == "SAC" else 1,
        ),
    )


@router.get("")
async def listar_taxas(atual: dict = Depends(admin_ou_gestor)):
    docs = await db.bank_rates.find({}).sort("data_referencia", -1).to_list(2000)
    return [_saida_taxa(doc) for doc in _vigentes(docs)]


@router.put("/manual", status_code=201)
async def registrar_taxa_manual(dados: TaxaManual, atual: dict = Depends(admin_ou_gestor)):
    if dados.banco not in BANCOS:
        raise HTTPException(status_code=422, detail="Banco inválido.")
    if dados.sistema not in SISTEMAS:
        raise HTTPException(status_code=422, detail="Sistema inválido. Use SAC ou PRICE.")
    modalidade = None
    if dados.banco == "CEF":
        if dados.modalidade not in MODALIDADES_CEF:
            raise HTTPException(status_code=422, detail="Para a Caixa, escolha a modalidade MCMV ou SBPE.")
        modalidade = dados.modalidade
    agora = datetime.now(timezone.utc)
    await db.bank_rates.insert_one(
        {
            "banco": dados.banco,
            "modalidade": modalidade,
            "sistema": dados.sistema,
            "taxa_aa": dados.taxa_aa,
            "fonte": "manual",
            "data_referencia": agora,
            "atualizado_em": agora,
        }
    )
    return {"mensagem": "Taxa registrada com sucesso. Ela já vale para a calculadora do site."}


@router.get("/status-scraping")
async def status_scraping(atual: dict = Depends(somente_admin)):
    docs = await db.scraping_log.find({}).sort("tentativa_em", -1).to_list(500)
    ultimos: dict[str, dict] = {}
    for doc in docs:
        if doc["banco"] not in ultimos:
            ultimos[doc["banco"]] = {
                "banco": doc["banco"],
                "sucesso": doc["sucesso"],
                "detalhe": doc.get("detalhe"),
                "tentativa_em": doc["tentativa_em"].isoformat() if doc.get("tentativa_em") else None,
            }
    return sorted(ultimos.values(), key=lambda d: ORDEM_BANCOS.get(d["banco"], 99))


@router.post("/atualizar-agora")
async def atualizar_agora(tarefas: BackgroundTasks, atual: dict = Depends(admin_ou_gestor)):
    tarefas.add_task(executar_scraping)
    return {
        "mensagem": "Atualização iniciada. Aguarde cerca de 1 minuto e recarregue a página para ver o resultado."
    }


@cron_router.post("/atualizar-taxas")
async def cron_atualizar_taxas(request: Request, tarefas: BackgroundTasks):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    segredo = os.environ.get("WEBHOOK_CRON_SECRET", "")
    autorizacao = request.headers.get("Authorization", "")
    token = autorizacao[7:] if autorizacao.startswith("Bearer ") else ""
    if not segredo or not hmac.compare_digest(token, segredo):
        raise HTTPException(status_code=401, detail="Não autorizado.")
    try:
        corpo = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Corpo inválido.")
    if not isinstance(corpo, dict):
        raise HTTPException(status_code=400, detail="Corpo inválido.")

    run_id = corpo.get("run_id") or request.headers.get("X-Webhook-Id")
    if run_id:
        if await db.cron_runs.find_one({"run_id": run_id}):
            return {"ok": True, "duplicado": True}
        await db.cron_runs.insert_one({"run_id": run_id, "criado_em": datetime.now(timezone.utc)})
    tarefas.add_task(executar_scraping)
    return {"ok": True}

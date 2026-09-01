import json
import re
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from database import db
from deps import obter_usuario_atual
from ia_service import gerar_texto
from models_site import ETAPAS_CRM

router = APIRouter(prefix="/ia", tags=["ia"])

ERRO_IA = "Não foi possível gerar a análise com IA agora. Tente novamente em alguns instantes."


class MelhorarDescricaoEntrada(BaseModel):
    texto: str = Field(max_length=5000)
    campos: Optional[dict] = None


@router.post("/melhorar-descricao")
async def melhorar_descricao(dados: MelhorarDescricaoEntrada, atual: dict = Depends(obter_usuario_atual)):
    texto = dados.texto.strip()
    if len(texto) < 10:
        raise HTTPException(
            status_code=422,
            detail="Escreva um texto inicial (mínimo de 10 caracteres) antes de usar a IA.",
        )

    campos = dados.campos or {}
    fatos = []
    for rotulo, chave in (("Título", "titulo"), ("Tipo", "tipo"), ("Finalidade", "finalidade"), ("Bairro", "bairro"), ("Cidade", "cidade")):
        if campos.get(chave):
            fatos.append(f"{rotulo}: {campos[chave]}")
    if campos.get("preco"):
        fatos.append(f"Preço: R$ {campos['preco']}")
    if campos.get("quartos"):
        fatos.append(f"Quartos: {campos['quartos']}")
    bloco_fatos = "\n".join(fatos) if fatos else "(nenhum dado estruturado informado)"

    sistema = (
        "Você é um redator imobiliário brasileiro experiente. Reescreve descrições de imóveis "
        "com gramática impecável, clareza e apelo comercial."
    )
    prompt = (
        "Fatos verificados do imóvel (cadastro estruturado):\n"
        f"{bloco_fatos}\n\n"
        "Texto original escrito pelo corretor:\n"
        f'"""{texto}"""\n\n'
        "Reescreva o texto em português do Brasil, corrigindo gramática, melhorando a clareza e "
        "aumentando o apelo comercial. Regras obrigatórias: não invente nenhuma característica que "
        "não esteja no texto original ou nos fatos verificados acima; não altere números, bairros, "
        "preços ou quantidades; mantenha tamanho parecido com o original; retorne APENAS o texto "
        "revisado, sem comentários, títulos ou explicações."
    )
    try:
        melhorado = await gerar_texto(sistema, prompt, f"descricao-{uuid4().hex}")
    except Exception:
        raise HTTPException(status_code=503, detail=ERRO_IA)
    if len(melhorado) < 10:
        raise HTTPException(status_code=503, detail=ERRO_IA)
    return {"texto_melhorado": melhorado}


def _extrair_json(resposta: str) -> Optional[dict]:
    limpo = re.sub(r"^```(?:json)?|```$", "", resposta.strip(), flags=re.MULTILINE).strip()
    inicio, fim = limpo.find("{"), limpo.rfind("}")
    if inicio == -1 or fim <= inicio:
        return None
    try:
        return json.loads(limpo[inicio : fim + 1])
    except ValueError:
        return None


@router.get("/insights-lead/{lead_id}")
async def insights_lead(lead_id: str, atual: dict = Depends(obter_usuario_atual)):
    try:
        lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    except InvalidId:
        lead = None
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")
    if atual["role"] == "corretor" and str(lead.get("corretor_atribuido_id")) != atual["id"]:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")

    atividades = await db.activities.find({"lead_id": lead["_id"]}).sort("data", -1).to_list(30)
    imovel_titulo = None
    if lead.get("imovel_id"):
        imovel = await db.properties.find_one({"_id": lead["imovel_id"]}, {"titulo": 1})
        imovel_titulo = imovel["titulo"] if imovel else None

    linhas = [
        f"- {a['data'].strftime('%d/%m/%Y')} [{a.get('tipo', 'registro')}]: {a.get('descricao', '')}"
        for a in reversed(atividades)
        if a.get("data")
    ]
    historico = "\n".join(linhas) if linhas else "(nenhuma atividade registrada ainda)"

    sistema = (
        "Você é um gerente comercial de imobiliária que orienta corretores. "
        "Analisa o histórico de um lead e responde sempre em JSON válido."
    )
    prompt = (
        f"Dados do lead: nome {lead.get('nome')}; origem: {lead.get('origem')}; "
        f"etapa atual do funil: {lead.get('etapa_crm')}; "
        f"imóvel de interesse: {imovel_titulo or 'não informado'}; "
        f"mensagem enviada pelo cliente: {lead.get('mensagem') or 'sem mensagem'}.\n\n"
        f"Histórico de atividades (mais antigas primeiro):\n{historico}\n\n"
        "Com base nessas informações, responda APENAS com um JSON neste formato exato:\n"
        '{"sentimento": "positivo|neutro|negativo|indefinido", '
        '"resumo": "resumo de 2 a 3 frases sobre o momento e o interesse do cliente, em PT-BR", '
        '"proximos_passos": ["passo concreto 1", "passo concreto 2", "passo concreto 3"]}\n'
        "Não invente fatos que não estejam no histórico. Se houver pouca informação, use "
        '"sentimento": "indefinido" e sugira o primeiro contato como próximo passo.'
    )
    try:
        resposta = await gerar_texto(sistema, prompt, f"lead-{lead_id}-{uuid4().hex[:8]}")
    except Exception:
        raise HTTPException(status_code=503, detail=ERRO_IA)

    dados = _extrair_json(resposta)
    if not dados or "resumo" not in dados:
        dados = {
            "sentimento": "indefinido",
            "resumo": resposta[:600],
            "proximos_passos": [],
        }
    passos = dados.get("proximos_passos")
    return {
        "sentimento": dados.get("sentimento") or "indefinido",
        "resumo": dados.get("resumo") or "",
        "proximos_passos": passos if isinstance(passos, list) else [],
        "gerado_em": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/insights-dashboard")
async def insights_dashboard(dias: int = Query(default=30, ge=1, le=365), atual: dict = Depends(obter_usuario_atual)):
    filtro: dict = {}
    if atual["role"] == "corretor":
        filtro["corretor_atribuido_id"] = ObjectId(atual["id"])

    agora = datetime.now(timezone.utc)
    inicio = agora - timedelta(days=dias)
    inicio_anterior = inicio - timedelta(days=dias)
    atuais = await db.leads.find(
        {**filtro, "criado_em": {"$gte": inicio}},
        {"etapa_crm": 1, "origem": 1},
    ).to_list(10000)
    anteriores = await db.leads.count_documents({**filtro, "criado_em": {"$gte": inicio_anterior, "$lt": inicio}})

    funil = {e: 0 for e in ETAPAS_CRM}
    origens: dict[str, int] = {}
    for lead in atuais:
        etapa = lead.get("etapa_crm")
        if etapa in funil:
            funil[etapa] += 1
        origem = lead.get("origem") or "outros"
        origens[origem] = origens.get(origem, 0) + 1

    total = len(atuais)
    visitas = funil["Visita"] + funil["Proposta"] + funil["Negócio Fechado"]
    propostas = funil["Proposta"] + funil["Negócio Fechado"]
    fechados = funil["Negócio Fechado"]

    sistema = (
        "Você é um consultor de gestão imobiliária. Explica números em português do Brasil, "
        "em linguagem simples para quem não entende de estatística."
    )
    prompt = (
        f"Números dos últimos {dias} dias{' (apenas leads deste corretor)' if filtro else ' (toda a imobiliária)'}:\n"
        f"- Leads recebidos: {total} (no período anterior de {dias} dias: {anteriores})\n"
        f"- Funil por etapa: {json.dumps(funil, ensure_ascii=False)}\n"
        f"- Origens dos leads: {json.dumps(origens, ensure_ascii=False)}\n"
        f"- Leads que chegaram à visita: {visitas}; que chegaram à proposta: {propostas}; negócios fechados: {fechados}\n\n"
        "Escreva um resumo de 3 a 5 frases curtas em PT-BR destacando tendências e pontos de "
        "atenção (ex.: queda na passagem de Visita para Proposta, origem que mais converte, "
        "aumento ou queda de volume em relação ao período anterior). Termine com uma sugestão "
        "prática de ação. Use apenas os números informados — não invente dados. Retorne apenas "
        "o texto, sem títulos nem marcações."
    )
    try:
        texto = await gerar_texto(sistema, prompt, f"dashboard-{atual['id']}-{uuid4().hex[:8]}")
    except Exception:
        raise HTTPException(status_code=503, detail=ERRO_IA)
    if not texto:
        raise HTTPException(status_code=503, detail=ERRO_IA)
    return {"texto": texto, "periodo_dias": dias, "gerado_em": agora.isoformat()}

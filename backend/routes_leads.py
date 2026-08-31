from datetime import datetime, timedelta, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Request

from database import db
from models_site import LeadCriar

router = APIRouter(prefix="/leads", tags=["leads"])

ROTULOS_ORIGEM = {
    "site": "formulário do site",
    "landing_page": "landing page",
    "agendamento": "agendamento de visita",
}


async def _config_imobiliaria() -> dict:
    config = await db.imobiliaria_config.find_one({})
    if config is None:
        await db.imobiliaria_config.insert_one(
            {
                "nome": "Minha Imobiliária",
                "logomarca": None,
                "telefone": None,
                "email_contato": None,
                "endereco": None,
                "redes_sociais": {},
                "emails_notificacao": [],
                "round_robin_ativo": True,
                "round_robin_posicao": -1,
                "corretor_padrao_id": None,
            }
        )
        config = await db.imobiliaria_config.find_one({})
    return config


async def _atribuir_corretor() -> ObjectId | None:
    config = await db.imobiliaria_config.find_one({})
    if config is None:
        config = await _config_imobiliaria()

    corretores = await db.users.find({"role": "corretor", "ativo": True}).sort("_id", 1).to_list(200)
    if config.get("round_robin_ativo") and corretores:
        from pymongo import ReturnDocument

        config = await db.imobiliaria_config.find_one_and_update(
            {},
            {"$inc": {"round_robin_posicao": 1}},
            return_document=ReturnDocument.AFTER,
        )
        posicao = config.get("round_robin_posicao", 0)
        return corretores[posicao % len(corretores)]["_id"]

    padrao = config.get("corretor_padrao_id")
    if padrao:
        try:
            usuario = await db.users.find_one({"_id": ObjectId(str(padrao)), "ativo": True})
            if usuario:
                return usuario["_id"]
        except InvalidId:
            pass
    if corretores:
        return corretores[0]["_id"]
    admin = await db.users.find_one({"role": "admin", "ativo": True})
    return admin["_id"] if admin else None


@router.post("", status_code=201)
async def criar_lead(dados: LeadCriar, request: Request):
    if not dados.consentimento_lgpd:
        raise HTTPException(
            status_code=422,
            detail="É necessário aceitar a Política de Privacidade para enviar o formulário.",
        )

    agora = datetime.now(timezone.utc)
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if not ip:
        ip = request.client.host if request.client else "desconhecido"
    limite = agora - timedelta(hours=1)
    recentes = await db.leads.count_documents({"ip": ip, "criado_em": {"$gte": limite}})
    if recentes >= 20:
        raise HTTPException(
            status_code=429,
            detail="Muitas solicitações em pouco tempo. Aguarde um pouco e tente novamente.",
        )

    imovel_oid = None
    imovel_titulo = None
    if dados.imovel_id:
        try:
            imovel = await db.properties.find_one({"_id": ObjectId(dados.imovel_id)})
        except InvalidId:
            imovel = None
        if imovel:
            imovel_oid = imovel["_id"]
            imovel_titulo = imovel["titulo"]

    mensagem = dados.mensagem or ""
    if dados.origem == "agendamento" and dados.data_visita:
        mensagem = (mensagem + "\n" if mensagem else "") + f"Data preferida para a visita: {dados.data_visita}"

    corretor_id = await _atribuir_corretor()
    doc = {
        "nome": dados.nome.strip(),
        "telefone": dados.telefone.strip(),
        "email": dados.email.lower().strip() if dados.email else None,
        "origem": dados.origem,
        "imovel_id": imovel_oid,
        "mensagem": mensagem or None,
        "consentimento_lgpd": True,
        "consentimento_em": agora,
        "corretor_atribuido_id": corretor_id,
        "etapa_crm": "Novo",
        "motivo_descarte": None,
        "ip": ip,
        "criado_em": agora,
    }
    resultado = await db.leads.insert_one(doc)

    descricao = f"Lead captado via {ROTULOS_ORIGEM[dados.origem]}."
    if imovel_titulo:
        descricao += f" Imóvel de interesse: {imovel_titulo}."
    await db.activities.insert_one(
        {
            "lead_id": resultado.inserted_id,
            "tipo": "cadastro",
            "descricao": descricao,
            "autor_id": corretor_id,
            "data": agora,
        }
    )
    return {
        "mensagem": "Recebemos seu contato! Em breve um de nossos corretores falará com você."
    }

import os
import re
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from config_service import obter_config
from database import db
from deps import exigir_papeis, obter_usuario_atual
from email_service import enviar_email_novo_lead
from models_site import (
    ETAPAS_CRM,
    AtividadeCriar,
    AtribuirLeadEntrada,
    EtapaLeadAtualizar,
    atividade_para_saida,
    lead_para_saida,
)

router = APIRouter(prefix="/crm", tags=["crm"])

admin_ou_gestor = exigir_papeis("admin", "gestor")


async def _obter_lead(lead_id: str, atual: dict) -> dict:
    try:
        lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    except InvalidId:
        lead = None
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")
    if atual["role"] == "corretor" and str(lead.get("corretor_atribuido_id")) != atual["id"]:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")
    return dict(lead)


async def _registrar_atividade(lead_oid: ObjectId, tipo: str, descricao: str, autor_id: Optional[str]):
    await db.activities.insert_one(
        {
            "lead_id": lead_oid,
            "tipo": tipo,
            "descricao": descricao,
            "autor_id": ObjectId(autor_id) if autor_id else None,
            "data": datetime.now(timezone.utc),
        }
    )


def _link_crm(lead_id) -> str:
    base = os.environ.get("FRONTEND_URL", "").rstrip("/")
    return f"{base}/painel/crm?lead={lead_id}"


@router.get("/motivos-descarte")
async def motivos_descarte(atual: dict = Depends(obter_usuario_atual)):
    config = await obter_config()
    return config.get("motivos_descarte") or []


@router.get("/leads")
async def listar_leads(
    busca: Optional[str] = None,
    etapa: Optional[str] = None,
    atual: dict = Depends(obter_usuario_atual),
):
    filtro: dict = {}
    if atual["role"] == "corretor":
        filtro["corretor_atribuido_id"] = ObjectId(atual["id"])
    if etapa in ETAPAS_CRM:
        filtro["etapa_crm"] = etapa
    if busca:
        trecho = {"$regex": re.escape(busca.strip()), "$options": "i"}
        filtro["$or"] = [{"nome": trecho}, {"telefone": trecho}, {"email": trecho}]

    docs = await db.leads.find(filtro).sort("criado_em", -1).to_list(500)

    imovel_ids = [d["imovel_id"] for d in docs if d.get("imovel_id")]
    imoveis = {}
    if imovel_ids:
        for imovel in await db.properties.find({"_id": {"$in": imovel_ids}}, {"titulo": 1}).to_list(None):
            imoveis[imovel["_id"]] = imovel["titulo"]
    corretor_ids = [d["corretor_atribuido_id"] for d in docs if d.get("corretor_atribuido_id")]
    corretores = {}
    if corretor_ids:
        for usuario in await db.users.find({"_id": {"$in": corretor_ids}}, {"nome": 1}).to_list(None):
            corretores[usuario["_id"]] = usuario["nome"]

    saida = []
    for doc in docs:
        item = lead_para_saida(doc)
        item["imovel_titulo"] = imoveis.get(doc.get("imovel_id"))
        item["corretor_nome"] = corretores.get(doc.get("corretor_atribuido_id"))
        saida.append(item)
    return saida


@router.get("/leads/{lead_id}")
async def detalhe_lead(lead_id: str, atual: dict = Depends(obter_usuario_atual)):
    lead = await _obter_lead(lead_id, atual)
    saida = lead_para_saida(lead)
    if lead.get("imovel_id"):
        imovel = await db.properties.find_one({"_id": lead["imovel_id"]}, {"titulo": 1, "slug": 1})
        if imovel:
            saida["imovel_titulo"] = imovel["titulo"]
            saida["imovel_slug"] = imovel.get("slug")
    if lead.get("corretor_atribuido_id"):
        corretor = await db.users.find_one({"_id": lead["corretor_atribuido_id"]}, {"nome": 1})
        if corretor:
            saida["corretor_nome"] = corretor["nome"]
    atividades = await db.activities.find({"lead_id": lead["_id"]}).sort("data", -1).to_list(200)
    autor_ids = [a["autor_id"] for a in atividades if a.get("autor_id")]
    autores = {}
    if autor_ids:
        for usuario in await db.users.find({"_id": {"$in": autor_ids}}, {"nome": 1}).to_list(None):
            autores[usuario["_id"]] = usuario["nome"]
    saida["atividades"] = [
        {**atividade_para_saida(a), "autor_nome": autores.get(a.get("autor_id"))} for a in atividades
    ]
    return saida


@router.patch("/leads/{lead_id}/etapa")
async def mudar_etapa(lead_id: str, dados: EtapaLeadAtualizar, atual: dict = Depends(obter_usuario_atual)):
    lead = await _obter_lead(lead_id, atual)
    motivo = dados.motivo_descarte
    if dados.etapa == "Descartado":
        config = await obter_config()
        motivos = config.get("motivos_descarte") or []
        if not motivo:
            raise HTTPException(status_code=422, detail="Selecione o motivo do descarte para continuar.")
        if motivos and motivo not in motivos:
            raise HTTPException(status_code=422, detail="Motivo de descarte inválido. Ajuste a lista em Configurações.")
    else:
        motivo = None

    anterior = lead["etapa_crm"]
    await db.leads.update_one(
        {"_id": lead["_id"]},
        {"$set": {"etapa_crm": dados.etapa, "motivo_descarte": motivo}},
    )
    if anterior != dados.etapa:
        descricao = f'Etapa alterada de "{anterior}" para "{dados.etapa}".'
        if motivo:
            descricao += f" Motivo do descarte: {motivo}."
        await _registrar_atividade(lead["_id"], "etapa", descricao, atual["id"])
    atualizado = await db.leads.find_one({"_id": lead["_id"]})
    return lead_para_saida(atualizado)


@router.patch("/leads/{lead_id}/atribuir")
async def reatribuir_lead(
    lead_id: str,
    dados: AtribuirLeadEntrada,
    tarefas: BackgroundTasks,
    atual: dict = Depends(admin_ou_gestor),
):
    lead = await _obter_lead(lead_id, atual)
    try:
        corretor = await db.users.find_one({"_id": ObjectId(dados.corretor_id), "role": "corretor", "ativo": True})
    except InvalidId:
        corretor = None
    if not corretor:
        raise HTTPException(status_code=404, detail="Corretor não encontrado ou inativo.")
    if str(lead.get("corretor_atribuido_id")) == str(corretor["_id"]):
        return lead_para_saida(lead)

    await db.leads.update_one({"_id": lead["_id"]}, {"$set": {"corretor_atribuido_id": corretor["_id"]}})
    await _registrar_atividade(
        lead["_id"], "atribuicao", f'Lead reatribuído para {corretor["nome"]} por {atual["nome"]}.', atual["id"]
    )
    imovel_titulo = None
    if lead.get("imovel_id"):
        imovel = await db.properties.find_one({"_id": lead["imovel_id"]}, {"titulo": 1})
        imovel_titulo = imovel["titulo"] if imovel else None
    tarefas.add_task(enviar_email_novo_lead, [corretor["email"]], lead, imovel_titulo, _link_crm(lead["_id"]))
    atualizado = await db.leads.find_one({"_id": lead["_id"]})
    return lead_para_saida(atualizado)


@router.post("/leads/{lead_id}/atividades", status_code=201)
async def registrar_atividade(lead_id: str, dados: AtividadeCriar, atual: dict = Depends(obter_usuario_atual)):
    lead = await _obter_lead(lead_id, atual)
    rotulos = {"anotacao": "Anotação", "ligacao": "Ligação registrada", "email": "E-mail registrado"}
    texto = dados.descricao.strip()
    if len(texto) < 2:
        raise HTTPException(status_code=422, detail="Descreva a atividade com pelo menos 2 caracteres.")
    await _registrar_atividade(
        lead["_id"], dados.tipo, f'{rotulos[dados.tipo]} de {atual["nome"]}: {texto}', atual["id"]
    )
    return {"mensagem": "Atividade registrada com sucesso."}

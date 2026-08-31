from datetime import datetime, timedelta, timezone
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query

from database import db
from deps import obter_usuario_atual
from models_site import ETAPAS_CRM

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/metricas")
async def metricas(
    dias: int = Query(default=30, ge=0, le=3650),
    corretor_id: Optional[str] = None,
    atual: dict = Depends(obter_usuario_atual),
):
    filtro: dict = {}
    if atual["role"] == "corretor":
        filtro["corretor_atribuido_id"] = ObjectId(atual["id"])
    elif corretor_id:
        try:
            filtro["corretor_atribuido_id"] = ObjectId(corretor_id)
        except InvalidId:
            raise HTTPException(status_code=422, detail="Corretor inválido.")

    agora = datetime.now(timezone.utc)
    if dias > 0:
        filtro["criado_em"] = {"$gte": agora - timedelta(days=dias)}

    # Limite adequado ao MVP; se o volume de leads crescer muito, trocar por agregação MongoDB.
    leads = await db.leads.find(
        filtro, {"criado_em": 1, "etapa_crm": 1, "origem": 1, "corretor_atribuido_id": 1}
    ).to_list(10000)
    total = len(leads)

    por_dia: dict[str, int] = {}
    if dias > 0:
        for i in range(dias):
            dia = (agora - timedelta(days=dias - 1 - i)).date().isoformat()
            por_dia[dia] = 0
    for lead in leads:
        criado = lead.get("criado_em")
        if not criado:
            continue
        dia = criado.date().isoformat()
        if dias == 0:
            por_dia.setdefault(dia, 0)
        if dia in por_dia:
            por_dia[dia] += 1
    leads_por_dia = [{"data": d, "total": t} for d, t in sorted(por_dia.items())]

    contagem = {e: 0 for e in ETAPAS_CRM}
    for lead in leads:
        etapa = lead.get("etapa_crm")
        if etapa in contagem:
            contagem[etapa] += 1
    funil = [
        {
            "etapa": e,
            "total": contagem[e],
            "percentual": round(contagem[e] / total * 100, 1) if total else 0,
        }
        for e in ETAPAS_CRM
    ]

    fechados = contagem["Negócio Fechado"]
    agendadas = sum(1 for l in leads if l.get("origem") == "agendamento")
    realizadas = sum(1 for l in leads if l.get("etapa_crm") in ("Visita", "Proposta", "Negócio Fechado"))
    enviadas = sum(1 for l in leads if l.get("etapa_crm") in ("Proposta", "Negócio Fechado"))

    por_corretor = None
    if atual["role"] in ("admin", "gestor"):
        mapa: dict[str, dict] = {}
        for lead in leads:
            oid = lead.get("corretor_atribuido_id")
            if not oid:
                continue
            cid = str(oid)
            entrada = mapa.setdefault(cid, {"leads": 0, "fechados": 0})
            entrada["leads"] += 1
            if lead.get("etapa_crm") == "Negócio Fechado":
                entrada["fechados"] += 1
        ids = [ObjectId(cid) for cid in mapa]
        nomes = {}
        if ids:
            async for usuario in db.users.find({"_id": {"$in": ids}}, {"nome": 1}):
                nomes[str(usuario["_id"])] = usuario["nome"]
        por_corretor = sorted(
            [
                {"corretor_id": cid, "nome": nomes.get(cid, "Sem nome"), **valores}
                for cid, valores in mapa.items()
            ],
            key=lambda item: -item["leads"],
        )

    return {
        "total_leads": total,
        "leads_por_dia": leads_por_dia,
        "funil": funil,
        "conversao_global": round(fechados / total * 100, 1) if total else 0,
        "visitas": {"agendadas": agendadas, "realizadas": realizadas},
        "propostas": {"enviadas": enviadas, "fechadas": fechados},
        "por_corretor": por_corretor,
        "gerado_em": agora.isoformat(),
    }

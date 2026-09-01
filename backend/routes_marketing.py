import hashlib
import logging
import re
import time
from typing import Optional

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from database import db
from deps import exigir_papeis

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/marketing", tags=["marketing"])

somente_admin = exigir_papeis("admin")


class MarketingConfigAtualizar(BaseModel):
    meta_pixel_id: Optional[str] = None
    meta_capi_token: Optional[str] = None
    google_ads_id: Optional[str] = None
    script_cabecalho: Optional[str] = None
    script_rodape: Optional[str] = None


async def obter_marketing_config() -> dict:
    config = await db.marketing_config.find_one({})
    return dict(config) if config else {}


@router.get("/config")
async def ler_config(atual: dict = Depends(somente_admin)):
    config = await obter_marketing_config()
    return {
        "meta_pixel_id": config.get("meta_pixel_id") or "",
        "meta_capi_token": config.get("meta_capi_token") or "",
        "google_ads_id": config.get("google_ads_id") or "",
        "script_cabecalho": config.get("script_cabecalho") or "",
        "script_rodape": config.get("script_rodape") or "",
    }


@router.put("/config")
async def salvar_config(dados: MarketingConfigAtualizar, atual: dict = Depends(somente_admin)):
    alteracoes = dados.model_dump(exclude_none=True)
    if alteracoes:
        await db.marketing_config.update_one({}, {"$set": alteracoes}, upsert=True)
    return {"mensagem": "Configurações de marketing salvas com sucesso."}


@router.get("/publico")
async def config_publica():
    # Nunca expõe o token CAPI — apenas o que é seguro injetar no site.
    config = await obter_marketing_config()
    return {
        "meta_pixel_id": config.get("meta_pixel_id") or "",
        "google_ads_id": config.get("google_ads_id") or "",
        "script_cabecalho": config.get("script_cabecalho") or "",
        "script_rodape": config.get("script_rodape") or "",
    }


def _sha256(valor: str) -> str:
    return hashlib.sha256(valor.encode("utf-8")).hexdigest()


async def disparar_capi_lead(
    lead: dict,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
    url_origem: Optional[str] = None,
) -> bool:
    config = await obter_marketing_config()
    pixel_id = config.get("meta_pixel_id")
    token = config.get("meta_capi_token")
    if not pixel_id or not token:
        return False

    user_data: dict = {}
    if ip:
        user_data["client_ip_address"] = ip
    if user_agent:
        user_data["client_user_agent"] = user_agent
    if lead.get("email"):
        user_data["em"] = [_sha256(lead["email"].strip().lower())]
    if lead.get("telefone"):
        digitos = re.sub(r"\D", "", lead["telefone"])
        if digitos and not digitos.startswith("55"):
            digitos = "55" + digitos
        if digitos:
            user_data["ph"] = [_sha256(digitos)]

    evento = {
        "event_name": "Lead",
        "event_time": int(time.time()),
        "action_source": "website",
        "event_id": lead.get("evento_id"),
        "event_source_url": url_origem,
        "user_data": user_data,
    }
    try:
        async with httpx.AsyncClient(timeout=20) as cliente:
            resposta = await cliente.post(
                f"https://graph.facebook.com/v21.0/{pixel_id}/events",
                params={"access_token": token},
                json={"data": [evento]},
            )
        if resposta.status_code != 200:
            logger.error("CAPI Meta retornou %s: %s", resposta.status_code, resposta.text[:300])
            return False
        logger.info("Evento CAPI 'Lead' enviado (event_id=%s).", lead.get("evento_id"))
        return True
    except Exception as erro:
        logger.error("Falha ao enviar evento CAPI: %s", erro)
        return False

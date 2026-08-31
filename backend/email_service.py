import logging
import os
from html import escape
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

URL_BASE_EMAIL = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip().rstrip("/") or "https://integrations.emergentagent.com"
CHAVE_EMAIL = os.environ.get("EMERGENT_EMAIL_KEY", "")
NOME_REMETENTE = os.environ.get("EMAIL_FROM_NAME") or "Imobiliária"


async def enviar_email_redefinicao(destinatario: str, token: str) -> bool:
    base = os.environ.get("FRONTEND_URL", "").rstrip("/")
    link = f"{base}/redefinir-senha?token={token}"
    if not CHAVE_EMAIL or not base.startswith("https://"):
        if urlparse(base).hostname in ("localhost", "127.0.0.1", "::1"):
            logger.warning("E-mail não configurado; link de redefinição: %s", link)
        else:
            logger.error("E-mail de redefinição não configurado (EMERGENT_EMAIL_KEY / FRONTEND_URL)")
        return False
    marca = escape(NOME_REMETENTE)
    html = (
        '<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif">'
        f"<p>Recebemos uma solicitação para redefinir a sua senha no painel da {marca}.</p>"
        f'<p><a href="{escape(link)}">Clique aqui para redefinir sua senha</a></p>'
        "<p>Este link expira em 1 hora e só pode ser usado uma vez. Se você não fez esta "
        "solicitação, ignore este e-mail — sua senha permanece a mesma.</p>"
        f'<p style="font-size:12px;color:#888">Enviado por {marca}. Nunca pedimos sua senha por e-mail.</p>'
        "</td></tr></table>"
    )
    try:
        async with httpx.AsyncClient(timeout=30) as cliente:
            resposta = await cliente.post(
                f"{URL_BASE_EMAIL}/api/v1/email/send",
                headers={"X-Email-Key": CHAVE_EMAIL},
                json={
                    "to": [destinatario],
                    "subject": f"Redefinição de senha — {NOME_REMETENTE}",
                    "html": html,
                    "from_name": NOME_REMETENTE,
                },
            )
        resposta.raise_for_status()
        return True
    except Exception as erro:
        logger.error("Falha ao enviar e-mail de redefinição: %s", erro)
        return False

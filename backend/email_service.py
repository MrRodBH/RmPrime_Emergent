import ipaddress
import logging
import os
import re
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME") or "Imobiliária"

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = (
    "reply with your password", "reply with the code", "send your password", "cvv",
    "send us your password", "enter your password below", "confirm your card number",
    "your full card number", "seed phrase", "recovery phrase", "verify your card",
    "social security number", "confirm your bank details",
)
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


async def send_email(*, to: list[str], subject: str, html: str, reply_to: str | None = None) -> str | None:
    _assert_safe_email(subject, html)
    payload = {"to": to, "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if reply_to:
        payload["contact_email"] = reply_to
    async with httpx.AsyncClient(timeout=30) as cliente:
        resposta = await cliente.post(
            f"{EMAIL_BASE_URL}/api/v1/email/send",
            headers={"X-Email-Key": EMAIL_KEY},
            json=payload,
        )
    resposta.raise_for_status()
    return resposta.json().get("id")


def _modelo_base(titulo: str, conteudo: str) -> str:
    marca = escape(EMAIL_FROM_NAME)
    return (
        '<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif">'
        f'<p style="font-size:18px;font-weight:bold;margin:0 0 12px">{escape(titulo)}</p>'
        f"{conteudo}"
        f'<p style="font-size:12px;color:#888;margin-top:24px">Enviado por {marca}. '
        "Nunca pedimos sua senha por e-mail.</p>"
        "</td></tr></table>"
    )


async def enviar_email_redefinicao(destinatario: str, token: str) -> bool:
    base = os.environ.get("FRONTEND_URL", "").rstrip("/")
    link = f"{base}/redefinir-senha?token={token}"
    if not EMAIL_KEY or not base.startswith("https://"):
        if urlparse(base).hostname in ("localhost", "127.0.0.1", "::1"):
            logger.warning("E-mail não configurado; link de redefinição: %s", link)
        else:
            logger.error("E-mail de redefinição não configurado (EMERGENT_EMAIL_KEY / FRONTEND_URL)")
        return False
    conteudo = (
        f"<p>Recebemos uma solicitação para redefinir a sua senha no painel da {escape(EMAIL_FROM_NAME)}.</p>"
        f'<p><a href="{escape(link)}">Clique aqui para redefinir sua senha</a></p>'
        "<p>Este link expira em 1 hora e só pode ser usado uma vez. Se você não fez esta "
        "solicitação, ignore este e-mail — sua senha permanece a mesma.</p>"
    )
    try:
        await send_email(
            to=[destinatario],
            subject=f"Redefinição de senha — {EMAIL_FROM_NAME}",
            html=_modelo_base("Redefinição de senha", conteudo),
        )
        return True
    except Exception as erro:
        logger.error("Falha ao enviar e-mail de redefinição: %s", erro)
        return False


async def enviar_email_novo_lead(
    destinatarios: list[str], lead: dict, imovel_titulo: str | None, link: str
) -> bool:
    if not EMAIL_KEY or not destinatarios:
        return False
    rotulos_origem = {"site": "Site", "landing_page": "Landing page", "agendamento": "Agendamento de visita"}
    linhas = [
        ("Nome", lead.get("nome", "")),
        ("Telefone", lead.get("telefone", "")),
        ("Origem", rotulos_origem.get(lead.get("origem"), lead.get("origem", ""))),
    ]
    if lead.get("email"):
        linhas.append(("E-mail", lead["email"]))
    if imovel_titulo:
        linhas.append(("Imóvel de interesse", imovel_titulo))
    if lead.get("mensagem"):
        linhas.append(("Mensagem", lead["mensagem"]))
    tabela = "".join(
        f'<tr><td style="padding:6px 12px;color:#78716c;font-size:13px">{escape(str(k))}</td>'
        f'<td style="padding:6px 12px;font-size:13px"><strong>{escape(str(v))}</strong></td></tr>'
        for k, v in linhas
    )
    conteudo = (
        "<p>Um novo lead foi atribuído a você no CRM:</p>"
        f'<table role="presentation" style="border:1px solid #e7e5e4;border-radius:8px;margin:12px 0">{tabela}</table>'
        f'<p><a href="{escape(link)}" style="display:inline-block;background:#1c1917;color:#ffffff;'
        'padding:12px 20px;border-radius:6px;text-decoration:none;font-size:14px">Abrir o lead no CRM</a></p>'
    )
    try:
        for destinatario in destinatarios:
            try:
                await send_email(
                    to=[destinatario],
                    subject=f"Novo lead para você: {lead.get('nome', '')}",
                    html=_modelo_base("Novo lead atribuído", conteudo),
                )
            except Exception as erro_individual:
                logger.error("Falha ao enviar e-mail de novo lead para %s: %s", destinatario, erro_individual)
        return True
    except Exception as erro:
        logger.error("Falha ao enviar e-mail de novo lead: %s", erro)
        return False

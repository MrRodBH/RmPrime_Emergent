import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response

from database import db
from deps import obter_usuario_atual
from email_service import enviar_email_redefinicao
from models import EsqueciSenhaEntrada, LoginEntrada, RedefinirSenhaEntrada, usuario_para_saida
from security import (
    ALGORITMO,
    criar_access_token,
    criar_refresh_token,
    definir_cookies,
    gerar_hash_senha,
    limpar_cookies,
    segredo_jwt,
    verificar_senha,
)

router = APIRouter(prefix="/auth", tags=["autenticação"])

JANELA_TENTATIVAS_MINUTOS = 15
MAX_TENTATIVAS = 5
MENSAGEM_REDEFINICAO = "Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha."


def _agora() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/login")
async def entrar(dados: LoginEntrada, request: Request, resposta: Response):
    email = dados.email.lower().strip()
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if not ip:
        ip = request.client.host if request.client else "desconhecido"
    identificador = f"{ip}:{email}"
    limite = _agora() - timedelta(minutes=JANELA_TENTATIVAS_MINUTOS)
    falhas = await db.login_attempts.count_documents(
        {"identifier": identificador, "criado_em": {"$gte": limite}}
    )
    if falhas >= MAX_TENTATIVAS:
        raise HTTPException(
            status_code=429,
            detail="Muitas tentativas de login. Aguarde 15 minutos e tente novamente.",
        )
    usuario = await db.users.find_one({"email": email})
    if not usuario or not verificar_senha(dados.senha, usuario["senha_hash"]):
        await db.login_attempts.insert_one(
            {"identifier": identificador, "email": email, "criado_em": _agora()}
        )
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos.")
    if not usuario.get("ativo", True):
        raise HTTPException(status_code=403, detail="Usuário desativado. Fale com o administrador.")
    await db.login_attempts.delete_many({"identifier": identificador})
    versao = usuario.get("token_version", 0)
    definir_cookies(
        resposta,
        criar_access_token(str(usuario["_id"]), email, versao),
        criar_refresh_token(str(usuario["_id"]), versao),
    )
    return usuario_para_saida(usuario)


@router.post("/logout")
async def sair(resposta: Response, usuario: dict = Depends(obter_usuario_atual)):
    limpar_cookies(resposta)
    return {"mensagem": "Sessão encerrada com sucesso."}


@router.get("/me")
async def eu(usuario: dict = Depends(obter_usuario_atual)):
    usuario["_id"] = str(usuario["_id"])
    return usuario_para_saida({**usuario, "_id": usuario["_id"]})


@router.post("/refresh")
async def renovar(request: Request, resposta: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Sessão expirada. Faça login novamente.")
    try:
        payload = jwt.decode(token, segredo_jwt(), algorithms=[ALGORITMO])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token inválido.")
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        raise HTTPException(status_code=401, detail="Sessão expirada. Faça login novamente.")
    usuario = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not usuario or payload.get("ver", 0) != usuario.get("token_version", 0):
        raise HTTPException(status_code=401, detail="Sessão expirada. Faça login novamente.")
    if not usuario.get("ativo", True):
        raise HTTPException(status_code=403, detail="Usuário desativado. Fale com o administrador.")
    resposta.set_cookie(
        key="access_token",
        value=criar_access_token(str(usuario["_id"]), usuario["email"], usuario.get("token_version", 0)),
        httponly=True, secure=True, samesite="none", max_age=3600, path="/",
    )
    return {"mensagem": "Sessão renovada."}


@router.post("/forgot-password")
async def esqueci_senha(dados: EsqueciSenhaEntrada, tarefas: BackgroundTasks):
    email = dados.email.lower().strip()
    limite = _agora() - timedelta(minutes=JANELA_TENTATIVAS_MINUTOS)
    envios = await db.password_reset_requests.count_documents(
        {"email": email, "created_at": {"$gte": limite}}
    )
    await db.password_reset_requests.insert_one({"email": email, "created_at": _agora()})
    if envios >= MAX_TENTATIVAS:
        return {"mensagem": MENSAGEM_REDEFINICAO}
    usuario = await db.users.find_one({"email": email})
    if usuario:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one(
            {
                "token_hash": hashlib.sha256(token.encode()).hexdigest(),
                "user_id": usuario["_id"],
                "email": email,
                "expires_at": _agora() + timedelta(hours=1),
                "used": False,
            }
        )
        tarefas.add_task(enviar_email_redefinicao, usuario["email"], token)
    return {"mensagem": MENSAGEM_REDEFINICAO}


@router.post("/reset-password")
async def redefinir_senha(dados: RedefinirSenhaEntrada, resposta: Response):
    token_hash = hashlib.sha256(dados.token.encode()).hexdigest()
    registro = await db.password_reset_tokens.find_one_and_update(
        {"token_hash": token_hash, "used": False, "expires_at": {"$gt": _agora()}},
        {"$set": {"used": True}},
    )
    if not registro:
        raise HTTPException(
            status_code=400,
            detail="Link inválido ou expirado. Solicite uma nova redefinição de senha.",
        )
    email = registro["email"]
    await db.users.update_one(
        {"_id": registro["user_id"]},
        {"$set": {"senha_hash": gerar_hash_senha(dados.senha)}, "$inc": {"token_version": 1}},
    )
    await db.password_reset_tokens.delete_many({"user_id": registro["user_id"], "used": False})
    await db.login_attempts.delete_many({"email": email})
    limpar_cookies(resposta)
    return {"mensagem": "Senha redefinida com sucesso. Faça login com a nova senha."}

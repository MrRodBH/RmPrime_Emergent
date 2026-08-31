import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Response

ALGORITMO = "HS256"
ACCESS_TOKEN_MINUTOS = 60
REFRESH_TOKEN_DIAS = 7


def segredo_jwt() -> str:
    return os.environ["JWT_SECRET"]


def gerar_hash_senha(senha: str) -> str:
    return bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verificar_senha(senha: str, senha_hash: str) -> bool:
    return bcrypt.checkpw(senha.encode("utf-8"), senha_hash.encode("utf-8"))


def criar_access_token(usuario_id: str, email: str, versao: int = 0) -> str:
    payload = {
        "sub": usuario_id,
        "email": email,
        "ver": versao,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTOS),
    }
    return jwt.encode(payload, segredo_jwt(), algorithm=ALGORITMO)


def criar_refresh_token(usuario_id: str, versao: int = 0) -> str:
    payload = {
        "sub": usuario_id,
        "ver": versao,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DIAS),
    }
    return jwt.encode(payload, segredo_jwt(), algorithm=ALGORITMO)


def definir_cookies(resposta: Response, access_token: str, refresh_token: str) -> None:
    resposta.set_cookie(
        key="access_token", value=access_token, httponly=True, secure=True,
        samesite="none", max_age=ACCESS_TOKEN_MINUTOS * 60, path="/",
    )
    resposta.set_cookie(
        key="refresh_token", value=refresh_token, httponly=True, secure=True,
        samesite="none", max_age=REFRESH_TOKEN_DIAS * 24 * 3600, path="/",
    )


def limpar_cookies(resposta: Response) -> None:
    resposta.delete_cookie(key="access_token", path="/", secure=True, samesite="none")
    resposta.delete_cookie(key="refresh_token", path="/", secure=True, samesite="none")

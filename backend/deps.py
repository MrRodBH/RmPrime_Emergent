import jwt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends, HTTPException, Request

from database import db
from security import ALGORITMO, segredo_jwt


async def obter_usuario_atual(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        cabecalho = request.headers.get("Authorization", "")
        if cabecalho.startswith("Bearer "):
            token = cabecalho[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado. Faça login para continuar.")
    try:
        payload = jwt.decode(token, segredo_jwt(), algorithms=[ALGORITMO])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token inválido.")
        try:
            usuario = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        except InvalidId:
            usuario = None
        if not usuario:
            raise HTTPException(status_code=401, detail="Usuário não encontrado.")
        if payload.get("ver", 0) != usuario.get("token_version", 0):
            raise HTTPException(status_code=401, detail="Sessão expirada. Faça login novamente.")
        if not usuario.get("ativo", True):
            raise HTTPException(status_code=403, detail="Usuário desativado. Fale com o administrador.")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada. Faça login novamente.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido.")
    usuario["id"] = str(usuario["_id"])
    usuario.pop("senha_hash", None)
    return usuario


def exigir_papeis(*papeis: str):
    async def verificador(usuario: dict = Depends(obter_usuario_atual)) -> dict:
        if usuario["role"] not in papeis:
            raise HTTPException(status_code=403, detail="Você não tem permissão para acessar este recurso.")
        return usuario

    return verificador

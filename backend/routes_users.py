import re
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query

from database import db
from deps import exigir_papeis
from models import UsuarioAtualizar, UsuarioCriar, usuario_para_saida
from security import gerar_hash_senha

router = APIRouter(prefix="/usuarios", tags=["usuários"])

admin_ou_gestor = exigir_papeis("admin", "gestor")


async def _obter_alvo(usuario_id: str) -> dict:
    try:
        oid = ObjectId(usuario_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    alvo = await db.users.find_one({"_id": oid})
    if not alvo:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return dict(alvo)


@router.get("")
async def listar_usuarios(
    busca: Optional[str] = Query(default=None),
    papel: Optional[str] = Query(default=None),
    ativo: Optional[bool] = Query(default=None),
    atual: dict = Depends(admin_ou_gestor),
):
    filtro: dict = {}
    if busca:
        trecho = re.escape(busca.strip())
        filtro["$or"] = [
            {"nome": {"$regex": trecho, "$options": "i"}},
            {"email": {"$regex": trecho, "$options": "i"}},
        ]
    if papel:
        filtro["role"] = papel
    if ativo is not None:
        filtro["ativo"] = ativo
    docs = await db.users.find(filtro).sort("nome", 1).to_list(500)
    return [usuario_para_saida(doc) for doc in docs]


@router.post("", status_code=201)
async def criar_usuario(dados: UsuarioCriar, atual: dict = Depends(admin_ou_gestor)):
    if dados.papel == "admin" and atual["role"] != "admin":
        raise HTTPException(
            status_code=403, detail="Somente administradores podem criar outros administradores."
        )
    email = dados.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Já existe um usuário cadastrado com este e-mail.")
    doc = {
        "nome": dados.nome.strip(),
        "email": email,
        "senha_hash": gerar_hash_senha(dados.senha),
        "role": dados.papel,
        "telefone": dados.telefone,
        "foto": dados.foto,
        "ativo": dados.ativo,
        "token_version": 0,
        "criado_em": datetime.now(timezone.utc),
    }
    resultado = await db.users.insert_one(doc)
    doc["_id"] = resultado.inserted_id
    return usuario_para_saida(doc)


@router.patch("/{usuario_id}")
async def atualizar_usuario(
    usuario_id: str, dados: UsuarioAtualizar, atual: dict = Depends(admin_ou_gestor)
):
    alvo = await _obter_alvo(usuario_id)
    if alvo["role"] == "admin" and atual["role"] != "admin":
        raise HTTPException(
            status_code=403, detail="Somente administradores podem editar outros administradores."
        )
    if dados.papel == "admin" and atual["role"] != "admin":
        raise HTTPException(
            status_code=403, detail="Somente administradores podem promover usuários a administrador."
        )
    if dados.ativo is False and str(alvo["_id"]) == atual["id"]:
        raise HTTPException(status_code=400, detail="Você não pode desativar a própria conta.")

    alteracoes: dict = {}
    if dados.nome is not None:
        alteracoes["nome"] = dados.nome.strip()
    if dados.email is not None:
        email = dados.email.lower().strip()
        existente = await db.users.find_one({"email": email, "_id": {"$ne": alvo["_id"]}})
        if existente:
            raise HTTPException(status_code=409, detail="Já existe um usuário cadastrado com este e-mail.")
        alteracoes["email"] = email
    if dados.telefone is not None:
        alteracoes["telefone"] = dados.telefone
    if dados.foto is not None:
        alteracoes["foto"] = dados.foto
    if dados.papel is not None:
        alteracoes["role"] = dados.papel
    if dados.ativo is not None:
        alteracoes["ativo"] = dados.ativo

    incremento: dict = {}
    if dados.senha:
        alteracoes["senha_hash"] = gerar_hash_senha(dados.senha)
        incremento["token_version"] = 1

    if not alteracoes and not incremento:
        return usuario_para_saida(alvo)

    operacao: dict = {"$set": alteracoes}
    if incremento:
        operacao["$inc"] = incremento
    await db.users.update_one({"_id": alvo["_id"]}, operacao)
    atualizado = await db.users.find_one({"_id": alvo["_id"]})
    return usuario_para_saida(atualizado)

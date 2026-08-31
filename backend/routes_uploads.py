import logging
import os
import uuid
from datetime import datetime, timezone

import requests
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile

from database import db
from deps import obter_usuario_atual

logger = logging.getLogger(__name__)

BASE_INTEGRACAO = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
URL_STORAGE = BASE_INTEGRACAO.rstrip("/") + "/objstore/api/v1/storage"
CHAVE_EMERGENT = os.environ.get("EMERGENT_LLM_KEY")
NOME_APP = "imobiliaria"

_chave_storage = None

TIPOS_PERMITIDOS = {"image/jpeg", "image/png", "image/webp", "image/gif"}
TAMANHO_MAXIMO = 10 * 1024 * 1024


def init_storage(forcar: bool = False):
    global _chave_storage
    if _chave_storage and not forcar:
        return _chave_storage
    resposta = requests.post(f"{URL_STORAGE}/init", json={"emergent_key": CHAVE_EMERGENT}, timeout=30)
    resposta.raise_for_status()
    _chave_storage = resposta.json()["storage_key"]
    return _chave_storage


def _subir(caminho: str, dados: bytes, content_type: str) -> dict:
    resposta = requests.put(
        f"{URL_STORAGE}/objects/{caminho}",
        headers={"X-Storage-Key": init_storage(), "Content-Type": content_type},
        data=dados,
        timeout=120,
    )
    if resposta.status_code == 404:
        init_storage(forcar=True)
        resposta = requests.put(
            f"{URL_STORAGE}/objects/{caminho}",
            headers={"X-Storage-Key": _chave_storage, "Content-Type": content_type},
            data=dados,
            timeout=120,
        )
    resposta.raise_for_status()
    return resposta.json()


def _baixar(caminho: str) -> tuple[bytes, str]:
    resposta = requests.get(
        f"{URL_STORAGE}/objects/{caminho}",
        headers={"X-Storage-Key": init_storage()},
        timeout=60,
    )
    if resposta.status_code == 404:
        init_storage(forcar=True)
        resposta = requests.get(
            f"{URL_STORAGE}/objects/{caminho}",
            headers={"X-Storage-Key": _chave_storage},
            timeout=60,
        )
    resposta.raise_for_status()
    return resposta.content, resposta.headers.get("Content-Type", "application/octet-stream")


router = APIRouter(tags=["uploads"])


@router.post("/uploads", status_code=201)
async def enviar_arquivo(arquivo: UploadFile, atual: dict = Depends(obter_usuario_atual)):
    content_type = arquivo.content_type or "application/octet-stream"
    if content_type not in TIPOS_PERMITIDOS:
        raise HTTPException(status_code=422, detail="Formato não suportado. Envie imagens JPG, PNG, WEBP ou GIF.")
    dados = await arquivo.read()
    if len(dados) > TAMANHO_MAXIMO:
        raise HTTPException(status_code=422, detail="Arquivo muito grande. O limite é 10 MB por imagem.")

    extensao = arquivo.filename.split(".")[-1].lower() if arquivo.filename and "." in arquivo.filename else "jpg"
    caminho = f"{NOME_APP}/uploads/{atual['id']}/{uuid.uuid4()}.{extensao}"
    try:
        resultado = _subir(caminho, dados, content_type)
    except Exception as erro:
        logger.error("Falha no upload: %s", erro)
        raise HTTPException(status_code=502, detail="Não foi possível enviar a imagem. Tente novamente.")

    await db.files.insert_one(
        {
            "storage_path": resultado["path"],
            "nome_original": arquivo.filename,
            "content_type": content_type,
            "tamanho": resultado.get("size", len(dados)),
            "autor_id": ObjectId(atual["id"]),
            "is_deleted": False,
            "criado_em": datetime.now(timezone.utc),
        }
    )
    return {"url": f"/api/arquivos/{resultado['path']}", "caminho": resultado["path"]}


@router.get("/arquivos/{caminho:path}")
async def servir_arquivo(caminho: str):
    registro = await db.files.find_one({"storage_path": caminho, "is_deleted": False})
    if not registro:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
    try:
        dados, content_type = _baixar(caminho)
    except Exception:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
    return Response(
        content=dados,
        media_type=registro.get("content_type", content_type),
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )

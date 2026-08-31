from dotenv import load_dotenv

load_dotenv()

import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

from database import client, configurar_banco, db
from routes_auth import router as auth_router
from routes_users import router as usuarios_router
from security import gerar_hash_senha, verificar_senha

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Plataforma Imobiliária — API")

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(usuarios_router)


@api_router.get("/")
async def raiz():
    return {"mensagem": "API da plataforma imobiliária ativa."}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _garantir_usuario(email: str, senha: str, nome: str, papel: str):
    existente = await db.users.find_one({"email": email})
    if existente is None:
        await db.users.insert_one(
            {
                "nome": nome,
                "email": email,
                "senha_hash": gerar_hash_senha(senha),
                "role": papel,
                "telefone": None,
                "foto": None,
                "ativo": True,
                "token_version": 0,
                "criado_em": datetime.now(timezone.utc),
            }
        )
        logger.info("Usuário %s criado (%s).", email, papel)
    elif not verificar_senha(senha, existente["senha_hash"]):
        await db.users.update_one(
            {"email": email}, {"$set": {"senha_hash": gerar_hash_senha(senha)}}
        )
        logger.info("Senha do usuário %s atualizada pelo seed.", email)


async def semear_usuarios():
    await _garantir_usuario(
        os.environ.get("ADMIN_EMAIL", ""), os.environ.get("ADMIN_PASSWORD", ""),
        "Rodolfo Vaz", "admin",
    )
    await _garantir_usuario("gestor.teste@imobiliaria.com.br", "Gestor@123", "Gestor de Teste", "gestor")
    await _garantir_usuario("corretor.teste@imobiliaria.com.br", "Corretor@123", "Corretor de Teste", "corretor")


@app.on_event("startup")
async def iniciar():
    await configurar_banco()
    await semear_usuarios()


@app.on_event("shutdown")
async def encerrar():
    client.close()

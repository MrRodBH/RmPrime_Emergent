from dotenv import load_dotenv

load_dotenv()

import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

from database import client, configurar_banco, db
from routes_auth import router as auth_router
from routes_crm import router as crm_router
from routes_dashboard import router as dashboard_router
from routes_ia import router as ia_router
from routes_imoveis import router as imoveis_router
from routes_leads import router as leads_router
from routes_marketing import router as marketing_router
from routes_site import router as site_router
from routes_taxas import cron_router, router as taxas_router
from routes_uploads import router as uploads_router
from routes_users import router as usuarios_router
from security import gerar_hash_senha, verificar_senha
from seeds import semear_site

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Plataforma Imobiliária — API")

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(usuarios_router)
api_router.include_router(imoveis_router)
api_router.include_router(leads_router)
api_router.include_router(site_router)
api_router.include_router(uploads_router)
api_router.include_router(ia_router)
api_router.include_router(crm_router)
api_router.include_router(dashboard_router)
api_router.include_router(marketing_router)
api_router.include_router(taxas_router)
api_router.include_router(cron_router)


@api_router.get("/")
async def raiz():
    return {"mensagem": "API da plataforma imobiliária ativa."}


app.include_router(api_router)

_origens_cors = {
    os.environ.get("FRONTEND_URL", "http://localhost:3000"),
    *[o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()],
    "https://rmprimeimoveis.com.br",
    "https://www.rmprimeimoveis.com.br",
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(_origens_cors),
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
    await semear_site()
    migrados = await db.leads.update_many(
        {"etapa_crm": "Fechado"}, {"$set": {"etapa_crm": "Negócio Fechado"}}
    )
    if migrados.modified_count:
        logger.info("Leads migrados para a etapa 'Negócio Fechado': %s", migrados.modified_count)
    if not await db.imobiliaria_config.find_one({"motivos_descarte": {"$exists": True}}):
        await db.imobiliaria_config.update_one(
            {},
            {"$set": {"motivos_descarte": ["Sem interesse", "Sem resposta", "Fora do perfil", "Duplicado", "Dados inválidos"]}},
        )
    try:
        from routes_uploads import init_storage

        init_storage()
        logger.info("Object storage inicializado.")
    except Exception as erro:
        logger.error("Falha ao inicializar object storage: %s", erro)


@app.on_event("shutdown")
async def encerrar():
    client.close()

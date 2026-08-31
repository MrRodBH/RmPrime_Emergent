import json
import os
import re
from datetime import datetime, timezone
from typing import Optional
from xml.sax.saxutils import escape

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse

from config_service import obter_config
from database import db
from deps import exigir_papeis
from models_site import (
    ConfigSiteAtualizar,
    LandingPageAtualizar,
    LandingPageCriar,
    PostAtualizar,
    PostCriar,
    imovel_para_saida,
    post_para_saida,
)
from utils_texto import slugify

router = APIRouter(tags=["site"])

admin_ou_gestor = exigir_papeis("admin", "gestor")

CHAVES_CMS = ["footer_texto", "footer_endereco", "politica_privacidade", "depoimentos"]


async def _valor_cms(chave: str, padrao: str = "") -> str:
    doc = await db.cms_content.find_one({"chave": chave})
    return doc["valor"] if doc else padrao


def _parse_depoimentos(texto: str) -> list[dict]:
    bruto = texto.strip()
    if not bruto:
        return []
    try:
        dados = json.loads(bruto)
        if isinstance(dados, list):
            return dados
    except (ValueError, TypeError):
        pass
    depoimentos = []
    for linha in bruto.splitlines():
        if "::" in linha:
            nome, texto_dep = linha.split("::", 1)
            depoimentos.append({"nome": nome.strip(), "texto": texto_dep.strip()})
    return depoimentos


# ---------- Configuração pública do site ----------

@router.get("/site/config")
async def config_publica():
    config = await obter_config()
    depoimentos = _parse_depoimentos(await _valor_cms("depoimentos"))
    return {
        "nome": config.get("nome"),
        "logomarca": config.get("logomarca"),
        "telefone": config.get("telefone"),
        "email_contato": config.get("email_contato"),
        "endereco": config.get("endereco"),
        "redes_sociais": config.get("redes_sociais") or {},
        "footer_texto": await _valor_cms("footer_texto"),
        "footer_endereco": await _valor_cms("footer_endereco"),
        "politica_privacidade": await _valor_cms("politica_privacidade"),
        "depoimentos": depoimentos,
    }


async def _config_completa_dict() -> dict:
    config = await obter_config()
    return {
        "nome": config.get("nome"),
        "logomarca": config.get("logomarca"),
        "telefone": config.get("telefone"),
        "email_contato": config.get("email_contato"),
        "endereco": config.get("endereco"),
        "redes_sociais": config.get("redes_sociais") or {},
        "round_robin_ativo": config.get("round_robin_ativo", True),
        "corretor_padrao_id": str(config["corretor_padrao_id"]) if config.get("corretor_padrao_id") else None,
        "footer_texto": await _valor_cms("footer_texto"),
        "footer_endereco": await _valor_cms("footer_endereco"),
        "politica_privacidade": await _valor_cms("politica_privacidade"),
        "depoimentos": await _valor_cms("depoimentos"),
    }


@router.get("/site/config/completa")
async def config_completa(atual: dict = Depends(admin_ou_gestor)):
    return await _config_completa_dict()


@router.put("/site/config")
async def salvar_config(dados: ConfigSiteAtualizar, atual: dict = Depends(admin_ou_gestor)):
    await obter_config()
    campos_config = ["nome", "logomarca", "telefone", "email_contato", "endereco", "redes_sociais", "round_robin_ativo", "corretor_padrao_id"]
    alteracoes: dict = {}
    for campo in campos_config:
        valor = getattr(dados, campo)
        if valor is not None:
            alteracoes[campo] = valor
    if "corretor_padrao_id" in alteracoes:
        bruto = alteracoes["corretor_padrao_id"]
        try:
            alteracoes["corretor_padrao_id"] = ObjectId(str(bruto)) if bruto else None
        except InvalidId:
            alteracoes["corretor_padrao_id"] = None
    if alteracoes:
        await db.imobiliaria_config.update_one({}, {"$set": alteracoes})

    agora = datetime.now(timezone.utc)
    for chave in CHAVES_CMS:
        valor = getattr(dados, chave)
        if valor is not None:
            await db.cms_content.update_one(
                {"chave": chave},
                {"$set": {"valor": valor, "tipo": "texto", "atualizado_em": agora}},
                upsert=True,
            )
    return {"mensagem": "Configurações salvas com sucesso.", "config": await _config_completa_dict()}


# ---------- Blog ----------

async def _slug_post_unico(titulo: str, ignorar_id: Optional[ObjectId] = None) -> str:
    base = slugify(titulo)
    slug = base
    contador = 2
    while True:
        filtro: dict = {"slug": slug}
        if ignorar_id:
            filtro["_id"] = {"$ne": ignorar_id}
        if not await db.posts.find_one(filtro):
            return slug
        slug = f"{base}-{contador}"
        contador += 1


@router.get("/blog")
async def listar_posts(pagina: int = Query(default=1, ge=1), por_pagina: int = Query(default=9, ge=1, le=24)):
    filtro = {"publicado": True}
    total = await db.posts.count_documents(filtro)
    docs = (
        await db.posts.find(filtro)
        .sort("criado_em", -1)
        .skip((pagina - 1) * por_pagina)
        .limit(por_pagina)
        .to_list(por_pagina)
    )
    return {"itens": [post_para_saida(d) for d in docs], "total": total, "pagina": pagina, "por_pagina": por_pagina}


@router.get("/blog/admin")
async def listar_posts_admin(atual: dict = Depends(admin_ou_gestor)):
    docs = await db.posts.find({}).sort("criado_em", -1).to_list(500)
    return [post_para_saida(d) for d in docs]


@router.get("/blog/{slug}")
async def detalhe_post(slug: str):
    doc = await db.posts.find_one({"slug": slug, "publicado": True})
    if not doc:
        raise HTTPException(status_code=404, detail="Post não encontrado.")
    return post_para_saida(doc)


@router.post("/blog", status_code=201)
async def criar_post(dados: PostCriar, atual: dict = Depends(admin_ou_gestor)):
    doc = dados.model_dump()
    doc["slug"] = await _slug_post_unico(dados.titulo)
    doc["criado_em"] = datetime.now(timezone.utc)
    resultado = await db.posts.insert_one(doc)
    doc["_id"] = resultado.inserted_id
    return post_para_saida(doc)


@router.patch("/blog/{post_id}")
async def atualizar_post(post_id: str, dados: PostAtualizar, atual: dict = Depends(admin_ou_gestor)):
    try:
        alvo = await db.posts.find_one({"_id": ObjectId(post_id)})
    except InvalidId:
        alvo = None
    if not alvo:
        raise HTTPException(status_code=404, detail="Post não encontrado.")
    alteracoes = dados.model_dump(exclude_none=True)
    if "titulo" in alteracoes:
        alteracoes["slug"] = await _slug_post_unico(alteracoes["titulo"], ignorar_id=alvo["_id"])
    if alteracoes:
        await db.posts.update_one({"_id": alvo["_id"]}, {"$set": alteracoes})
    atualizado = await db.posts.find_one({"_id": alvo["_id"]})
    return post_para_saida(atualizado)


# ---------- Landing Pages ----------

@router.get("/landing-pages")
async def listar_lps(atual: dict = Depends(admin_ou_gestor)):
    docs = await db.landing_pages.find({}).sort("_id", -1).to_list(200)
    saida = []
    for doc in docs:
        imovel = await db.properties.find_one({"_id": doc["imovel_id"]})
        saida.append(
            {
                "id": str(doc["_id"]),
                "slug": doc["slug"],
                "imovel_id": str(doc["imovel_id"]),
                "imovel_titulo": imovel["titulo"] if imovel else "Imóvel removido",
                "dominio_customizado": doc.get("dominio_customizado"),
                "conteudo": doc.get("conteudo") or {},
                "publicada": doc.get("publicada", False),
            }
        )
    return saida


@router.post("/landing-pages", status_code=201)
async def criar_lp(dados: LandingPageCriar, atual: dict = Depends(admin_ou_gestor)):
    slug = slugify(dados.slug)
    if await db.landing_pages.find_one({"slug": slug}):
        raise HTTPException(status_code=409, detail="Já existe uma landing page com este endereço (slug).")
    try:
        imovel = await db.properties.find_one({"_id": ObjectId(dados.imovel_id)})
    except InvalidId:
        imovel = None
    if not imovel:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado.")
    doc = {
        "slug": slug,
        "imovel_id": imovel["_id"],
        "dominio_customizado": dados.dominio_customizado or None,
        "conteudo": dados.conteudo.model_dump(exclude_none=True),
        "publicada": dados.publicada,
    }
    resultado = await db.landing_pages.insert_one(doc)
    doc["_id"] = resultado.inserted_id
    return {"id": str(resultado.inserted_id), "slug": slug, "publicada": dados.publicada}


@router.patch("/landing-pages/{lp_id}")
async def atualizar_lp(lp_id: str, dados: LandingPageAtualizar, atual: dict = Depends(admin_ou_gestor)):
    try:
        alvo = await db.landing_pages.find_one({"_id": ObjectId(lp_id)})
    except InvalidId:
        alvo = None
    if not alvo:
        raise HTTPException(status_code=404, detail="Landing page não encontrada.")
    alteracoes = dados.model_dump(exclude_none=True)
    if "slug" in alteracoes:
        slug = slugify(alteracoes["slug"])
        conflito = await db.landing_pages.find_one({"slug": slug, "_id": {"$ne": alvo["_id"]}})
        if conflito:
            raise HTTPException(status_code=409, detail="Já existe uma landing page com este endereço (slug).")
        alteracoes["slug"] = slug
    if "imovel_id" in alteracoes:
        try:
            imovel = await db.properties.find_one({"_id": ObjectId(alteracoes["imovel_id"])})
        except InvalidId:
            imovel = None
        if not imovel:
            raise HTTPException(status_code=404, detail="Imóvel não encontrado.")
        alteracoes["imovel_id"] = imovel["_id"]
    if alteracoes:
        await db.landing_pages.update_one({"_id": alvo["_id"]}, {"$set": alteracoes})
    return {"mensagem": "Landing page atualizada com sucesso."}


@router.get("/lp/{slug}")
async def lp_publica(slug: str):
    doc = await db.landing_pages.find_one({"slug": slug, "publicada": True})
    if not doc:
        raise HTTPException(status_code=404, detail="Página não encontrada ou não publicada.")
    imovel = await db.properties.find_one({"_id": doc["imovel_id"]})
    if not imovel or imovel.get("status") == "inativo":
        raise HTTPException(status_code=404, detail="Imóvel não disponível.")
    return {
        "slug": doc["slug"],
        "conteudo": doc.get("conteudo") or {},
        "imovel": imovel_para_saida(imovel, publico=True),
    }


# ---------- Calculadora ----------

@router.get("/calculadora/taxa")
async def taxa_exemplo():
    ultima = await db.bank_rates.find_one({}, sort=[("data_referencia", -1)])
    if ultima:
        return {
            "taxa_aa": ultima["taxa_aa"],
            "banco": ultima.get("banco"),
            "sistema": ultima.get("sistema"),
            "fonte": ultima.get("fonte", "manual"),
            "data_referencia": ultima.get("data_referencia"),
        }
    return {"taxa_aa": 10.0, "banco": None, "sistema": None, "fonte": "exemplo", "data_referencia": None}


# ---------- SEO ----------

@router.get("/sitemap.xml", response_class=PlainTextResponse)
async def sitemap():
    base = os.environ.get("FRONTEND_URL", "").rstrip("/")
    urls = ["/", "/imoveis", "/blog", "/contato", "/financiamento", "/politica-de-privacidade"]
    imoveis = await db.properties.find({"status": "ativo"}, {"slug": 1}).to_list(2000)
    posts = await db.posts.find({"publicado": True}, {"slug": 1}).to_list(2000)
    lps = await db.landing_pages.find({"publicada": True}, {"slug": 1}).to_list(500)
    urls += [f"/imoveis/{i['slug']}" for i in imoveis if i.get("slug")]
    urls += [f"/blog/{p['slug']}" for p in posts if p.get("slug")]
    urls += [f"/lp/{l['slug']}" for l in lps if l.get("slug")]
    corpo = "".join(f"  <url><loc>{escape(base + u)}</loc></url>\n" for u in urls)
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + corpo + "</urlset>"
    return PlainTextResponse(xml, media_type="application/xml")


@router.get("/robots.txt", response_class=PlainTextResponse)
async def robots():
    base = os.environ.get("FRONTEND_URL", "").rstrip("/")
    return PlainTextResponse(
        f"User-agent: *\nAllow: /\nDisallow: /painel\n\nSitemap: {base}/api/sitemap.xml\n",
        media_type="text/plain",
    )

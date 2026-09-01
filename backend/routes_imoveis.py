import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query

from database import db
from deps import exigir_papeis, obter_usuario_atual
from models_site import ImovelAtualizar, ImovelCriar, imovel_para_saida
from utils_texto import slugify

router = APIRouter(prefix="/imoveis", tags=["imóveis"])

ORDENACOES = {
    "recentes": [("criado_em", -1)],
    "menor_preco": [("preco", 1)],
    "maior_preco": [("preco", -1)],
    "maior_area": [("caracteristicas.area_m2", -1)],
}


def _regex(texto: str) -> dict:
    return {"$regex": re.escape(texto.strip()), "$options": "i"}


async def _slug_unico(titulo: str, ignorar_id: Optional[ObjectId] = None) -> str:
    base = slugify(titulo)
    slug = base
    contador = 2
    while True:
        filtro: dict = {"slug": slug}
        if ignorar_id:
            filtro["_id"] = {"$ne": ignorar_id}
        if not await db.properties.find_one(filtro):
            return slug
        slug = f"{base}-{contador}"
        contador += 1


async def _obter_imovel(imovel_id: str) -> dict:
    try:
        doc = await db.properties.find_one({"_id": ObjectId(imovel_id)})
    except InvalidId:
        doc = None
    if not doc:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado.")
    return dict(doc)


# ---------- Rotas públicas ----------

@router.get("/publico")
async def listar_imoveis_publico(
    finalidade: Optional[str] = None,
    tipo: Optional[str] = None,
    bairro: Optional[str] = None,
    quartos_min: Optional[int] = None,
    preco_min: Optional[float] = None,
    preco_max: Optional[float] = None,
    busca: Optional[str] = None,
    destaque: Optional[bool] = None,
    ordenar: str = "recentes",
    pagina: int = Query(default=1, ge=1),
    por_pagina: int = Query(default=9, ge=1, le=24),
):
    filtro: dict = {"status": "ativo"}
    if finalidade in ("venda", "aluguel"):
        filtro["finalidade"] = finalidade
    if tipo:
        filtro["tipo"] = _regex(tipo)
    if bairro:
        filtro["endereco.bairro"] = _regex(bairro)
    if quartos_min:
        filtro["caracteristicas.quartos"] = {"$gte": quartos_min}
    if preco_min is not None:
        filtro.setdefault("preco", {})["$gte"] = preco_min
    if preco_max is not None:
        filtro.setdefault("preco", {})["$lte"] = preco_max
    if destaque:
        filtro["destaque"] = True
    if busca:
        trecho = _regex(busca)
        filtro["$or"] = [{"titulo": trecho}, {"descricao": trecho}, {"endereco.bairro": trecho}, {"endereco.cidade": trecho}]

    total = await db.properties.count_documents(filtro)
    cursor = (
        db.properties.find(filtro)
        .sort(ORDENACOES.get(ordenar, ORDENACOES["recentes"]))
        .skip((pagina - 1) * por_pagina)
        .limit(por_pagina)
    )
    itens = [imovel_para_saida(doc, publico=True) for doc in await cursor.to_list(por_pagina)]
    return {"itens": itens, "total": total, "pagina": pagina, "por_pagina": por_pagina}


@router.get("/opcoes")
async def opcoes_filtro():
    tipos = await db.properties.distinct("tipo", {"status": "ativo"})
    bairros = await db.properties.distinct("endereco.bairro", {"status": "ativo"})
    return {
        "tipos": sorted([t for t in tipos if t]),
        "bairros": sorted([b for b in bairros if b]),
    }


@router.get("/publico/{slug}")
async def detalhe_imovel_publico(slug: str):
    doc = await db.properties.find_one({"slug": slug, "status": {"$ne": "inativo"}})
    if not doc:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado.")
    saida = imovel_para_saida(doc, publico=True)
    if doc.get("corretor_responsavel_id"):
        corretor = await db.users.find_one(
            {"_id": doc["corretor_responsavel_id"]}, {"nome": 1, "telefone": 1, "foto": 1}
        )
        if corretor:
            saida["corretor"] = {
                "nome": corretor["nome"],
                "telefone": corretor.get("telefone"),
                "foto": corretor.get("foto"),
            }
    return saida


@router.get("/recomendados")
async def imoveis_recomendados(imovel_id: Optional[str] = None, limite: int = Query(default=6, ge=1, le=12)):
    sementes: list[dict] = []
    if imovel_id:
        try:
            base = await db.properties.find_one({"_id": ObjectId(imovel_id)})
        except InvalidId:
            base = None
        if base:
            sementes.append(base)
    if not sementes:
        recentes = await db.leads.find(
            {"imovel_id": {"$ne": None}, "criado_em": {"$gte": datetime.now(timezone.utc) - timedelta(days=90)}},
            {"imovel_id": 1},
        ).sort("criado_em", -1).to_list(50)
        ids = list(dict.fromkeys(l["imovel_id"] for l in recentes))[:5]
        if ids:
            sementes = await db.properties.find({"_id": {"$in": ids}, "status": "ativo"}).to_list(5)
    if not sementes:
        sementes = await db.properties.find({"status": "ativo", "destaque": True}).sort("criado_em", -1).to_list(3)

    ids_semente = {s["_id"] for s in sementes}
    candidatos = await db.properties.find({"status": "ativo", "_id": {"$nin": list(ids_semente)}}).to_list(500)
    if not candidatos:
        reposicao = await db.properties.find({"status": "ativo"}).sort("criado_em", -1).to_list(limite)
        return {"itens": [imovel_para_saida(d, publico=True) for d in reposicao]}

    def pontuar(candidato: dict) -> float:
        pontos = 0.0
        endereco = candidato.get("endereco") or {}
        caracteristicas = candidato.get("caracteristicas") or {}
        for semente in sementes:
            s_end = semente.get("endereco") or {}
            s_car = semente.get("caracteristicas") or {}
            if endereco.get("bairro") and endereco.get("bairro") == s_end.get("bairro"):
                pontos += 3
            if candidato.get("tipo") == semente.get("tipo"):
                pontos += 2
            preco_s = semente.get("preco") or 0
            preco_c = candidato.get("preco") or 0
            if preco_s > 0 and preco_c > 0 and abs(preco_c - preco_s) / preco_s <= 0.2:
                pontos += 2
            if caracteristicas.get("quartos") is not None and caracteristicas.get("quartos") == s_car.get("quartos"):
                pontos += 1
        return pontos

    ordenados = sorted(candidatos, key=lambda c: (-pontuar(c), -(c.get("criado_em").timestamp() if c.get("criado_em") else 0)))
    return {"itens": [imovel_para_saida(d, publico=True) for d in ordenados[:limite]]}


# ---------- Rotas do painel (autenticadas) ----------

@router.get("")
async def listar_imoveis_painel(
    busca: Optional[str] = None,
    status: Optional[str] = None,
    atual: dict = Depends(obter_usuario_atual),
):
    filtro: dict = {}
    if atual["role"] == "corretor":
        filtro["corretor_responsavel_id"] = ObjectId(atual["id"])
    if status in ("ativo", "inativo", "vendido"):
        filtro["status"] = status
    if busca:
        filtro["titulo"] = _regex(busca)
    docs = await db.properties.find(filtro).sort("criado_em", -1).to_list(500)
    return [imovel_para_saida(doc) for doc in docs]


@router.post("", status_code=201)
async def criar_imovel(dados: ImovelCriar, atual: dict = Depends(obter_usuario_atual)):
    responsavel = None
    if atual["role"] == "corretor":
        responsavel = ObjectId(atual["id"])
    elif dados.corretor_responsavel_id:
        try:
            responsavel = ObjectId(dados.corretor_responsavel_id)
        except InvalidId:
            responsavel = None

    doc = dados.model_dump()
    doc["slug"] = await _slug_unico(dados.titulo)
    doc["corretor_responsavel_id"] = responsavel
    doc["criado_em"] = datetime.now(timezone.utc)
    doc["atualizado_em"] = None
    resultado = await db.properties.insert_one(doc)
    doc["_id"] = resultado.inserted_id
    return imovel_para_saida(doc)


@router.patch("/{imovel_id}")
async def atualizar_imovel(
    imovel_id: str, dados: ImovelAtualizar, atual: dict = Depends(obter_usuario_atual)
):
    alvo = await _obter_imovel(imovel_id)
    if atual["role"] == "corretor" and str(alvo.get("corretor_responsavel_id")) != atual["id"]:
        raise HTTPException(status_code=403, detail="Você só pode editar os seus próprios imóveis.")

    alteracoes = dados.model_dump(exclude_none=True)
    if atual["role"] == "corretor":
        alteracoes.pop("corretor_responsavel_id", None)
    elif "corretor_responsavel_id" in alteracoes and alteracoes["corretor_responsavel_id"]:
        try:
            alteracoes["corretor_responsavel_id"] = ObjectId(alteracoes["corretor_responsavel_id"])
        except InvalidId:
            alteracoes.pop("corretor_responsavel_id", None)

    if "titulo" in alteracoes:
        alteracoes["slug"] = await _slug_unico(alteracoes["titulo"], ignorar_id=alvo["_id"])
    alteracoes["atualizado_em"] = datetime.now(timezone.utc)
    if alteracoes:
        await db.properties.update_one({"_id": alvo["_id"]}, {"$set": alteracoes})
    atualizado = await db.properties.find_one({"_id": alvo["_id"]})
    return imovel_para_saida(atualizado)

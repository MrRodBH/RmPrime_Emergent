from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

Finalidade = Literal["venda", "aluguel"]
StatusImovel = Literal["ativo", "inativo", "vendido"]
OrigemLead = Literal["site", "landing_page", "agendamento"]


class Endereco(BaseModel):
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class Caracteristicas(BaseModel):
    quartos: Optional[int] = None
    banheiros: Optional[int] = None
    vagas: Optional[int] = None
    area_m2: Optional[float] = None


class ImovelCriar(BaseModel):
    titulo: str = Field(min_length=4, max_length=200)
    descricao: Optional[str] = None
    tipo: str = Field(min_length=2, max_length=60)
    finalidade: Finalidade
    preco: float = Field(gt=0)
    condominio: Optional[float] = None
    iptu: Optional[float] = None
    endereco: Optional[Endereco] = None
    exibir_endereco_exato: bool = False
    caracteristicas: Optional[Caracteristicas] = None
    lazer: list[str] = []
    fotos: list[str] = []
    videos: list[str] = []
    status: StatusImovel = "ativo"
    destaque: bool = False
    corretor_responsavel_id: Optional[str] = None


class ImovelAtualizar(BaseModel):
    titulo: Optional[str] = Field(default=None, min_length=4, max_length=200)
    descricao: Optional[str] = None
    tipo: Optional[str] = None
    finalidade: Optional[Finalidade] = None
    preco: Optional[float] = Field(default=None, gt=0)
    condominio: Optional[float] = None
    iptu: Optional[float] = None
    endereco: Optional[Endereco] = None
    exibir_endereco_exato: Optional[bool] = None
    caracteristicas: Optional[Caracteristicas] = None
    lazer: Optional[list[str]] = None
    fotos: Optional[list[str]] = None
    videos: Optional[list[str]] = None
    status: Optional[StatusImovel] = None
    destaque: Optional[bool] = None
    corretor_responsavel_id: Optional[str] = None


class LeadCriar(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    telefone: str = Field(min_length=8, max_length=30)
    email: Optional[EmailStr] = None
    mensagem: Optional[str] = Field(default=None, max_length=2000)
    origem: OrigemLead
    imovel_id: Optional[str] = None
    consentimento_lgpd: bool
    data_visita: Optional[str] = None


class PostCriar(BaseModel):
    titulo: str = Field(min_length=4, max_length=200)
    resumo: Optional[str] = Field(default=None, max_length=400)
    conteudo: str = Field(min_length=10)
    capa: Optional[str] = None
    publicado: bool = True


class PostAtualizar(BaseModel):
    titulo: Optional[str] = Field(default=None, min_length=4, max_length=200)
    resumo: Optional[str] = None
    conteudo: Optional[str] = Field(default=None, min_length=10)
    capa: Optional[str] = None
    publicado: Optional[bool] = None


class ConteudoLandingPage(BaseModel):
    titulo: Optional[str] = None
    subtitulo: Optional[str] = None
    texto: Optional[str] = None
    cor_destaque: Optional[str] = None
    blocos: Optional[list[dict]] = None


class LandingPageCriar(BaseModel):
    imovel_id: str
    slug: str = Field(min_length=2, max_length=120)
    dominio_customizado: Optional[str] = None
    conteudo: ConteudoLandingPage = ConteudoLandingPage()
    publicada: bool = False


class LandingPageAtualizar(BaseModel):
    imovel_id: Optional[str] = None
    slug: Optional[str] = Field(default=None, min_length=2, max_length=120)
    dominio_customizado: Optional[str] = None
    conteudo: Optional[ConteudoLandingPage] = None
    publicada: Optional[bool] = None


class ConfigSiteAtualizar(BaseModel):
    nome: Optional[str] = None
    logomarca: Optional[str] = None
    telefone: Optional[str] = None
    email_contato: Optional[str] = None
    endereco: Optional[str] = None
    redes_sociais: Optional[dict] = None
    round_robin_ativo: Optional[bool] = None
    corretor_padrao_id: Optional[str] = None
    footer_texto: Optional[str] = None
    footer_endereco: Optional[str] = None
    politica_privacidade: Optional[str] = None
    depoimentos: Optional[str] = None
    banner_home_titulo: Optional[str] = None
    banner_home_subtitulo: Optional[str] = None
    banner_home_imagem: Optional[str] = None
    menu_inicio: Optional[str] = None
    menu_imoveis: Optional[str] = None
    menu_blog: Optional[str] = None
    menu_contato: Optional[str] = None
    emails_notificacao: Optional[list[EmailStr]] = None


def imovel_para_saida(doc: dict, publico: bool = False) -> dict:
    endereco = doc.get("endereco")
    if publico and endereco and not doc.get("exibir_endereco_exato", False):
        endereco = {
            "bairro": endereco.get("bairro"),
            "cidade": endereco.get("cidade"),
            "estado": endereco.get("estado"),
            "lat": round(endereco["lat"], 2) if endereco.get("lat") is not None else None,
            "lng": round(endereco["lng"], 2) if endereco.get("lng") is not None else None,
        }
    saida = {
        "id": str(doc["_id"]),
        "slug": doc.get("slug"),
        "titulo": doc["titulo"],
        "descricao": doc.get("descricao"),
        "tipo": doc["tipo"],
        "finalidade": doc["finalidade"],
        "preco": doc["preco"],
        "condominio": doc.get("condominio"),
        "iptu": doc.get("iptu"),
        "endereco": endereco,
        "exibir_endereco_exato": doc.get("exibir_endereco_exato", False),
        "caracteristicas": doc.get("caracteristicas"),
        "lazer": doc.get("lazer") or [],
        "fotos": doc.get("fotos") or [],
        "videos": doc.get("videos") or [],
        "status": doc["status"],
        "destaque": doc.get("destaque", False),
        "criado_em": doc.get("criado_em"),
        "atualizado_em": doc.get("atualizado_em"),
    }
    if not publico:
        saida["corretor_responsavel_id"] = (
            str(doc["corretor_responsavel_id"]) if doc.get("corretor_responsavel_id") else None
        )
    return saida


def post_para_saida(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "titulo": doc["titulo"],
        "slug": doc["slug"],
        "resumo": doc.get("resumo"),
        "conteudo": doc["conteudo"],
        "capa": doc.get("capa"),
        "publicado": doc.get("publicado", False),
        "criado_em": doc.get("criado_em"),
    }

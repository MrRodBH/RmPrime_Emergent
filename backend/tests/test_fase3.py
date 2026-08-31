"""Backend API tests — Fase 3 (uploads, IA simulada, CMS ampliado, LP com blocos)."""
import io
import os
import time

import pytest
import requests
from bson import ObjectId
from pymongo import MongoClient

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://admin-imoveis.preview.emergentagent.com"
API = f"{BASE_URL}/api"

ADMIN = ("rodolfovaz882@gmail.com", "Admin@123")
GESTOR = ("gestor.teste@imobiliaria.com.br", "Gestor@123")
CORRETOR = ("corretor.teste@imobiliaria.com.br", "Corretor@123")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


# Minimal 1x1 PNG bytes
PNG_1PX = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xcf"
    b"\xc0\xf0\x1f\x00\x05\x00\x01\xff\xa8\xd1\x93k\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _login(email, senha):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "senha": senha})
    return s, r


@pytest.fixture(scope="module")
def admin_session():
    s, r = _login(*ADMIN)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def corretor_session():
    s, r = _login(*CORRETOR)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def mdb():
    return MongoClient(MONGO_URL)[DB_NAME]


# ---------------- Uploads ----------------
class TestUploads:
    def test_upload_sem_auth_401(self):
        files = {"arquivo": ("test.png", io.BytesIO(PNG_1PX), "image/png")}
        r = requests.post(f"{API}/uploads", files=files)
        assert r.status_code == 401

    def test_upload_arquivo_texto_422(self, admin_session):
        files = {"arquivo": ("teste.txt", io.BytesIO(b"hello"), "text/plain")}
        r = admin_session.post(f"{API}/uploads", files=files)
        assert r.status_code == 422

    def test_upload_png_e_download(self, admin_session):
        files = {"arquivo": ("test.png", io.BytesIO(PNG_1PX), "image/png")}
        r = admin_session.post(f"{API}/uploads", files=files)
        assert r.status_code == 201, r.text
        data = r.json()
        assert "url" in data and data["url"].startswith("/api/arquivos/")
        # Baixar via URL retornada (público)
        r2 = requests.get(f"{BASE_URL}{data['url']}")
        assert r2.status_code == 200
        assert len(r2.content) > 0
        assert "image" in r2.headers.get("content-type", "")


# ---------------- IA simulada ----------------
class TestIA:
    def test_ia_requer_auth(self):
        r = requests.post(f"{API}/ia/melhorar-descricao", json={"texto": "apartamento amplo"})
        assert r.status_code == 401

    def test_ia_texto_curto_422(self, admin_session):
        r = admin_session.post(f"{API}/ia/melhorar-descricao", json={"texto": "abc"})
        assert r.status_code == 422

    def test_ia_texto_vazio_422(self, admin_session):
        r = admin_session.post(f"{API}/ia/melhorar-descricao", json={"texto": ""})
        assert r.status_code == 422

    def test_ia_melhora_texto_ok(self, admin_session):
        r = admin_session.post(
            f"{API}/ia/melhorar-descricao",
            json={"texto": "apartamento amplo com vista para o parque"},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["simulado"] is True
        assert "texto_melhorado" in d and len(d["texto_melhorado"]) > 10


# ---------------- CMS ampliado (banner, menus, e-mails de notificação) ----------------
class TestCMSAmpliado:
    def test_config_publica_traz_novas_chaves(self):
        r = requests.get(f"{API}/site/config")
        assert r.status_code == 200
        d = r.json()
        for k in [
            "banner_home_titulo",
            "banner_home_subtitulo",
            "banner_home_imagem",
            "menu_inicio",
            "menu_imoveis",
            "menu_blog",
            "menu_contato",
        ]:
            assert k in d, f"faltando {k}"
        # fallback dos menus quando vazio
        assert d["menu_inicio"] in ("Início", "")  # se não configurado, deve trazer 'Início'
        # se configurado vazio, o backend retornaria "" — aceitamos ambos

    def test_admin_edita_banner_e_menu_e_reflete(self, admin_session, mdb):
        original = admin_session.get(f"{API}/site/config/completa").json()
        try:
            novo_titulo = f"TEST Banner {int(time.time())}"
            novo_menu = f"TEST Imoveis {int(time.time())}"
            r = admin_session.put(
                f"{API}/site/config",
                json={
                    "banner_home_titulo": novo_titulo,
                    "menu_imoveis": novo_menu,
                },
            )
            assert r.status_code == 200, r.text
            # público reflete
            d = requests.get(f"{API}/site/config").json()
            assert d["banner_home_titulo"] == novo_titulo
            assert d["menu_imoveis"] == novo_menu
        finally:
            # restaurar
            admin_session.put(
                f"{API}/site/config",
                json={
                    "banner_home_titulo": original.get("banner_home_titulo") or "",
                    "menu_imoveis": original.get("menu_imoveis") or "",
                },
            )

    def test_politica_privacidade_editavel(self, admin_session):
        original = admin_session.get(f"{API}/site/config/completa").json().get("politica_privacidade") or ""
        try:
            texto = f"TEST Política atualizada em {int(time.time())}"
            r = admin_session.put(f"{API}/site/config", json={"politica_privacidade": texto})
            assert r.status_code == 200
            d = requests.get(f"{API}/site/config").json()
            assert d["politica_privacidade"] == texto
        finally:
            # restaurar (mesmo que original vazio, mantemos algum texto p/ LGPD)
            admin_session.put(
                f"{API}/site/config",
                json={"politica_privacidade": original or "Política de Privacidade padrão."},
            )

    def test_depoimentos_formato_double_colon(self, admin_session):
        try:
            r = admin_session.put(
                f"{API}/site/config",
                json={"depoimentos": "Ana Silva :: Excelente atendimento\nJoão Souza :: Recomendo"},
            )
            assert r.status_code == 200
            d = requests.get(f"{API}/site/config").json()
            deps_ = d["depoimentos"]
            assert isinstance(deps_, list) and len(deps_) == 2
            assert deps_[0]["nome"] == "Ana Silva"
            assert deps_[0]["texto"] == "Excelente atendimento"
        finally:
            admin_session.put(f"{API}/site/config", json={"depoimentos": ""})

    def test_emails_notificacao_salva_como_array(self, admin_session):
        original = admin_session.get(f"{API}/site/config/completa").json().get("emails_notificacao") or []
        try:
            emails = ["notif1@ex.com", "notif2@ex.com"]
            r = admin_session.put(f"{API}/site/config", json={"emails_notificacao": emails})
            assert r.status_code == 200
            d = admin_session.get(f"{API}/site/config/completa").json()
            assert d["emails_notificacao"] == emails
        finally:
            admin_session.put(f"{API}/site/config", json={"emails_notificacao": original})

    def test_corretor_403_config_completa(self, corretor_session):
        r = corretor_session.get(f"{API}/site/config/completa")
        assert r.status_code == 403

    def test_corretor_403_put_config(self, corretor_session):
        r = corretor_session.put(f"{API}/site/config", json={"banner_home_titulo": "hack"})
        assert r.status_code == 403


# ---------------- Landing pages com blocos ----------------
class TestLPBlocos:
    def test_criar_lp_com_blocos_e_ordem(self, admin_session, mdb):
        imv = mdb.properties.find_one({"status": "ativo"})
        assert imv is not None
        slug = f"test-lp-blocos-{int(time.time())}"
        blocos = [
            {"tipo": "hero", "ativo": True},
            {"tipo": "texto", "ativo": True},
            {"tipo": "caracteristicas", "ativo": True},
            {"tipo": "galeria", "ativo": False},
            {"tipo": "formulario", "ativo": True},
        ]
        r = admin_session.post(
            f"{API}/landing-pages",
            json={
                "imovel_id": str(imv["_id"]),
                "slug": slug,
                "publicada": True,
                "conteudo": {"titulo": "TEST Blocos", "blocos": blocos},
            },
        )
        assert r.status_code == 201, r.text
        lp = r.json()
        try:
            # público reflete ordem e blocos
            r_pub = requests.get(f"{API}/lp/{slug}")
            assert r_pub.status_code == 200
            d = r_pub.json()
            got = d["conteudo"].get("blocos") or []
            assert [b["tipo"] for b in got] == ["hero", "texto", "caracteristicas", "galeria", "formulario"]
            galeria = next(b for b in got if b["tipo"] == "galeria")
            assert galeria["ativo"] is False
        finally:
            mdb.landing_pages.delete_one({"_id": ObjectId(lp["id"])})

    def test_lp_existente_cobertura_itaim_ok(self):
        r = requests.get(f"{API}/lp/cobertura-itaim-oferta")
        assert r.status_code == 200


# ---------------- Cleanup ----------------
def teardown_module(module):
    try:
        mc = MongoClient(MONGO_URL)[DB_NAME]
        mc.landing_pages.delete_many({"slug": {"$regex": "^test-lp-"}})
        mc.properties.delete_many({"titulo": {"$regex": "^TEST "}})
        # Restaurar CMS chaves TEST em branco
        for ch in ["banner_home_titulo", "menu_imoveis"]:
            doc = mc.cms_content.find_one({"chave": ch})
            if doc and str(doc.get("valor", "")).startswith("TEST "):
                mc.cms_content.update_one({"chave": ch}, {"$set": {"valor": ""}})
        # Restaurar round_robin
        mc.imobiliaria_config.update_one({}, {"$set": {"round_robin_ativo": True, "corretor_padrao_id": None}})
    except Exception as e:
        print(f"cleanup falhou: {e}")

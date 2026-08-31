"""Backend API tests — Fase 2 (site público, imóveis, leads/LGPD/round-robin, blog, LP, SEO, calculadora)."""
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
CORRETOR2 = ("corretor.novo@imobiliaria.com.br", "Senha@123")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


def _login(email, senha):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "senha": senha})
    return s, r


@pytest.fixture(scope="module")
def admin_session():
    s, r = _login(*ADMIN)
    assert r.status_code == 200
    return s


@pytest.fixture(scope="module")
def gestor_session():
    s, r = _login(*GESTOR)
    assert r.status_code == 200
    return s


@pytest.fixture(scope="module")
def corretor_session():
    s, r = _login(*CORRETOR)
    assert r.status_code == 200
    return s


@pytest.fixture(scope="module")
def mdb():
    return MongoClient(MONGO_URL)[DB_NAME]


# ---------- Site config público ----------
class TestSiteConfig:
    def test_config_publica_ok(self):
        r = requests.get(f"{API}/site/config")
        assert r.status_code == 200
        d = r.json()
        for k in ["nome", "footer_texto", "footer_endereco", "politica_privacidade", "depoimentos"]:
            assert k in d
        assert isinstance(d["depoimentos"], list)

    def test_config_completa_requer_auth(self):
        r = requests.get(f"{API}/site/config/completa")
        assert r.status_code == 401

    def test_config_completa_admin(self, admin_session):
        r = admin_session.get(f"{API}/site/config/completa")
        assert r.status_code == 200
        assert "round_robin_ativo" in r.json()

    def test_config_corretor_403(self, corretor_session):
        r = corretor_session.get(f"{API}/site/config/completa")
        assert r.status_code == 403


# ---------- Imóveis público ----------
class TestImoveisPublico:
    def test_lista_publica(self):
        r = requests.get(f"{API}/imoveis/publico")
        assert r.status_code == 200
        d = r.json()
        assert "itens" in d and "total" in d
        assert d["total"] >= 1

    def test_filtro_finalidade_venda(self):
        r = requests.get(f"{API}/imoveis/publico", params={"finalidade": "venda"})
        assert r.status_code == 200
        for it in r.json()["itens"]:
            assert it["finalidade"] == "venda"

    def test_filtro_tipo_e_quartos(self):
        r = requests.get(f"{API}/imoveis/publico", params={"quartos_min": 3})
        assert r.status_code == 200
        for it in r.json()["itens"]:
            q = (it.get("caracteristicas") or {}).get("quartos") or 0
            assert q >= 3

    def test_filtro_faixa_preco(self):
        r = requests.get(f"{API}/imoveis/publico", params={"preco_min": 100000, "preco_max": 2000000})
        assert r.status_code == 200
        for it in r.json()["itens"]:
            assert 100000 <= it["preco"] <= 2000000

    def test_ordenar_menor_preco(self):
        r = requests.get(f"{API}/imoveis/publico", params={"ordenar": "menor_preco", "por_pagina": 10})
        precos = [i["preco"] for i in r.json()["itens"]]
        assert precos == sorted(precos)

    def test_opcoes_filtro(self):
        r = requests.get(f"{API}/imoveis/opcoes")
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["tipos"], list)
        assert isinstance(d["bairros"], list)

    def test_detalhe_publico_seed(self):
        r = requests.get(f"{API}/imoveis/publico")
        item = r.json()["itens"][0]
        r2 = requests.get(f"{API}/imoveis/publico/{item['slug']}")
        assert r2.status_code == 200
        d = r2.json()
        assert d["slug"] == item["slug"]
        # Endereço sem lat/lng exato quando exibir_endereco_exato=false
        end = d.get("endereco") or {}
        if not d.get("exibir_endereco_exato", False):
            assert "logradouro" not in end or end.get("logradouro") is None

    def test_estado_vazio(self):
        r = requests.get(f"{API}/imoveis/publico", params={"busca": "ZZZ_NAO_EXISTE_XYZ"})
        assert r.status_code == 200
        assert r.json()["total"] == 0


# ---------- Leads / LGPD / round-robin ----------
class TestLeads:
    def test_lead_sem_lgpd_422(self):
        r = requests.post(f"{API}/leads", json={
            "nome": "TEST Fulano", "telefone": "11999998888",
            "origem": "site", "consentimento_lgpd": False,
        })
        assert r.status_code == 422

    def test_lead_lgpd_ausente_422(self):
        # LGPD field missing → pydantic validation
        r = requests.post(f"{API}/leads", json={
            "nome": "TEST Fulano", "telefone": "11999998888", "origem": "site",
        })
        assert r.status_code == 422

    def test_criar_lead_site_ok(self, mdb):
        payload = {
            "nome": "TEST Lead Site", "telefone": "11988887777",
            "email": "test_lead_site@ex.com", "origem": "site",
            "consentimento_lgpd": True, "mensagem": "Interesse",
        }
        r = requests.post(f"{API}/leads", json=payload)
        assert r.status_code == 201, r.text
        # verifica no banco
        doc = mdb.leads.find_one({"email": "test_lead_site@ex.com"})
        assert doc is not None
        assert doc["etapa_crm"] == "Novo"
        assert doc["consentimento_lgpd"] is True
        assert doc["origem"] == "site"

    def test_criar_lead_agendamento_ok(self, mdb):
        payload = {
            "nome": "TEST Lead Agendamento", "telefone": "11977776666",
            "email": "test_lead_agend@ex.com", "origem": "agendamento",
            "consentimento_lgpd": True, "data_visita": "2026-02-10",
        }
        r = requests.post(f"{API}/leads", json=payload)
        assert r.status_code == 201
        doc = mdb.leads.find_one({"email": "test_lead_agend@ex.com"})
        assert doc is not None
        assert doc["origem"] == "agendamento"
        assert "Data preferida" in (doc.get("mensagem") or "")

    def test_round_robin_alterna(self, mdb):
        # cria 4 leads e verifica alternância entre corretores ativos
        corretores_ativos = list(mdb.users.find({"role": "corretor", "ativo": True}).sort("_id", 1))
        assert len(corretores_ativos) >= 2, "precisa de 2+ corretores ativos para RR"
        # Garantir round_robin_ativo=True
        mdb.imobiliaria_config.update_one({}, {"$set": {"round_robin_ativo": True}})

        atribuidos = []
        for i in range(4):
            r = requests.post(f"{API}/leads", json={
                "nome": f"TEST RR {i}", "telefone": "11999990000",
                "email": f"test_rr_{i}_{int(time.time())}@ex.com",
                "origem": "site", "consentimento_lgpd": True,
            })
            assert r.status_code == 201
            doc = mdb.leads.find_one({"email": {"$regex": f"^test_rr_{i}_"}}, sort=[("criado_em", -1)])
            atribuidos.append(str(doc["corretor_atribuido_id"]))
        # Deve haver ao menos 2 corretores diferentes atribuídos
        assert len(set(atribuidos)) >= 2, f"round-robin não alternou: {atribuidos}"

    def test_round_robin_desligado_usa_padrao(self, admin_session, mdb):
        corretor = mdb.users.find_one({"email": CORRETOR[0]})
        assert corretor is not None
        cid = str(corretor["_id"])
        # desligar RR e definir corretor padrão
        r = admin_session.put(f"{API}/site/config", json={
            "round_robin_ativo": False, "corretor_padrao_id": cid,
        })
        assert r.status_code == 200
        try:
            # criar lead e verificar
            email = f"test_padrao_{int(time.time())}@ex.com"
            r2 = requests.post(f"{API}/leads", json={
                "nome": "TEST Padrão", "telefone": "11999990000",
                "email": email, "origem": "site", "consentimento_lgpd": True,
            })
            assert r2.status_code == 201
            doc = mdb.leads.find_one({"email": email})
            assert str(doc["corretor_atribuido_id"]) == cid
        finally:
            # restaurar
            admin_session.put(f"{API}/site/config", json={
                "round_robin_ativo": True, "corretor_padrao_id": None,
            })


# ---------- CRUD imóveis painel + RBAC ----------
class TestImoveisPainelRBAC:
    def test_corretor_ve_apenas_proprios(self, corretor_session, admin_session, mdb):
        r = corretor_session.get(f"{API}/imoveis")
        assert r.status_code == 200
        corretor = mdb.users.find_one({"email": CORRETOR[0]})
        cid = str(corretor["_id"])
        for it in r.json():
            assert it["corretor_responsavel_id"] == cid

    def test_corretor_nao_edita_de_outros(self, corretor_session, mdb):
        # pega um imóvel que NÃO é do corretor
        corretor = mdb.users.find_one({"email": CORRETOR[0]})
        alvo = mdb.properties.find_one({"corretor_responsavel_id": {"$ne": corretor["_id"]}})
        if not alvo:
            pytest.skip("Não há imóvel de outro corretor")
        r = corretor_session.patch(f"{API}/imoveis/{alvo['_id']}", json={"titulo": "TEST hack"})
        assert r.status_code == 403

    def test_criar_editar_imovel_admin(self, admin_session, mdb):
        payload = {
            "titulo": "TEST Imóvel Fase2",
            "tipo": "Apartamento",
            "finalidade": "venda",
            "preco": 500000.0,
            "endereco": {"bairro": "Moema", "cidade": "São Paulo", "estado": "SP"},
            "caracteristicas": {"quartos": 2, "banheiros": 1, "vagas": 1, "area_m2": 60.0},
            "lazer": ["Piscina"],
            "fotos": ["https://example.com/foto.jpg"],
            "destaque": True,
        }
        r = admin_session.post(f"{API}/imoveis", json=payload)
        assert r.status_code == 201, r.text
        imv = r.json()
        assert imv["destaque"] is True
        # editar
        r2 = admin_session.patch(f"{API}/imoveis/{imv['id']}", json={"preco": 550000.0})
        assert r2.status_code == 200
        assert r2.json()["preco"] == 550000.0
        # cleanup
        mdb.properties.delete_one({"_id": ObjectId(imv["id"])})


# ---------- Blog ----------
class TestBlog:
    def test_lista_publica_apenas_publicados(self, mdb):
        r = requests.get(f"{API}/blog")
        assert r.status_code == 200
        for p in r.json()["itens"]:
            assert p["publicado"] is True

    def test_crud_post_rascunho_nao_aparece(self, admin_session, mdb):
        payload = {
            "titulo": "TEST Post Rascunho Fase2",
            "conteudo": "Conteúdo do rascunho para teste.",
            "publicado": False,
        }
        r = admin_session.post(f"{API}/blog", json=payload)
        assert r.status_code == 201, r.text
        post = r.json()
        # não deve aparecer no público
        r_pub = requests.get(f"{API}/blog")
        slugs = [p["slug"] for p in r_pub.json()["itens"]]
        assert post["slug"] not in slugs
        # detalhe público 404
        r_det = requests.get(f"{API}/blog/{post['slug']}")
        assert r_det.status_code == 404
        # publicar
        r_up = admin_session.patch(f"{API}/blog/{post['id']}", json={"publicado": True})
        assert r_up.status_code == 200
        r_det2 = requests.get(f"{API}/blog/{post['slug']}")
        assert r_det2.status_code == 200
        # cleanup
        mdb.posts.delete_one({"_id": ObjectId(post["id"])})


# ---------- Landing Pages ----------
class TestLandingPages:
    def test_lp_publicada_existe(self):
        r = requests.get(f"{API}/lp/cobertura-itaim-oferta")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["slug"] == "cobertura-itaim-oferta"
        assert "imovel" in d

    def test_lp_rascunho_404(self, admin_session, mdb):
        # criar LP rascunho
        imv = mdb.properties.find_one({"status": "ativo"})
        payload = {
            "imovel_id": str(imv["_id"]),
            "slug": f"test-lp-rascunho-{int(time.time())}",
            "publicada": False,
            "conteudo": {"titulo": "TEST Rascunho"},
        }
        r = admin_session.post(f"{API}/landing-pages", json=payload)
        assert r.status_code == 201, r.text
        lp = r.json()
        try:
            r_pub = requests.get(f"{API}/lp/{lp['slug']}")
            assert r_pub.status_code == 404
        finally:
            mdb.landing_pages.delete_one({"_id": ObjectId(lp["id"])})

    def test_lp_lead_origem_landing_page(self, mdb):
        # criar lead com origem landing_page
        email = f"test_lead_lp_{int(time.time())}@ex.com"
        r = requests.post(f"{API}/leads", json={
            "nome": "TEST LP Lead", "telefone": "11955554444",
            "email": email, "origem": "landing_page", "consentimento_lgpd": True,
        })
        assert r.status_code == 201
        doc = mdb.leads.find_one({"email": email})
        assert doc["origem"] == "landing_page"


# ---------- Calculadora ----------
class TestCalculadora:
    def test_taxa_exemplo_default_10(self, mdb):
        # garantir bank_rates vazia
        mdb.bank_rates.delete_many({"fonte": "manual_test_only"})
        r = requests.get(f"{API}/calculadora/taxa")
        assert r.status_code == 200
        d = r.json()
        assert "taxa_aa" in d
        # se bank_rates vazio, deve ser 10.0
        if mdb.bank_rates.count_documents({}) == 0:
            assert d["taxa_aa"] == 10.0
            assert d["fonte"] == "exemplo"


# ---------- SEO ----------
class TestSEO:
    def test_sitemap_xml(self):
        r = requests.get(f"{API}/sitemap.xml")
        assert r.status_code == 200
        body = r.text
        assert "<urlset" in body
        assert "/imoveis/" in body
        assert "/blog" in body or "/blog/" in body

    def test_robots_txt(self):
        r = requests.get(f"{API}/robots.txt")
        assert r.status_code == 200
        assert "Sitemap:" in r.text
        assert "/api/sitemap.xml" in r.text


# ---------- Cleanup ----------
def teardown_module(module):
    try:
        mc = MongoClient(MONGO_URL)[DB_NAME]
        mc.leads.delete_many({"nome": {"$regex": "^TEST "}})
        mc.leads.delete_many({"email": {"$regex": "^test_"}})
        mc.activities.delete_many({"descricao": {"$regex": "TEST"}})
        mc.properties.delete_many({"titulo": {"$regex": "^TEST "}})
        mc.posts.delete_many({"titulo": {"$regex": "^TEST "}})
        mc.landing_pages.delete_many({"slug": {"$regex": "^test-lp-"}})
        # Restaurar round_robin_ativo=True
        mc.imobiliaria_config.update_one({}, {"$set": {"round_robin_ativo": True, "corretor_padrao_id": None}})
    except Exception as e:
        print(f"cleanup falhou: {e}")

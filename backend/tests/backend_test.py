"""Backend API tests — Fase 1 (auth + gestão de usuários + RBAC + MongoDB)."""
import os
import time
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://admin-imoveis.preview.emergentagent.com"
API = f"{BASE_URL}/api"

ADMIN = ("rodolfovaz882@gmail.com", "Admin@123")
GESTOR = ("gestor.teste@imobiliaria.com.br", "Gestor@123")
CORRETOR = ("corretor.teste@imobiliaria.com.br", "Corretor@123")


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
def gestor_session():
    s, r = _login(*GESTOR)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def corretor_session():
    s, r = _login(*CORRETOR)
    assert r.status_code == 200, r.text
    return s


# --- Auth ---
class TestAuth:
    def test_login_admin_ok(self):
        s, r = _login(*ADMIN)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN[0]
        assert data["papel"] == "admin"
        assert "access_token" in s.cookies
        assert "refresh_token" in s.cookies

    def test_login_gestor_ok(self):
        _, r = _login(*GESTOR)
        assert r.status_code == 200
        assert r.json()["papel"] == "gestor"

    def test_login_corretor_ok(self):
        _, r = _login(*CORRETOR)
        assert r.status_code == 200
        assert r.json()["papel"] == "corretor"

    def test_login_senha_errada_pt_br(self):
        # unique email to avoid tripping rate limits for real users
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN[0], "senha": "senhaErrada!"})
        assert r.status_code == 401
        assert r.json()["detail"] == "E-mail ou senha inválidos."

    def test_auth_me(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN[0]

    def test_refresh(self, admin_session):
        r = admin_session.post(f"{API}/auth/refresh")
        assert r.status_code == 200

    def test_logout(self):
        s, _ = _login(*ADMIN)
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # cookies limpos → /me deve falhar
        r2 = s.get(f"{API}/auth/me")
        assert r2.status_code == 401

    def test_me_sem_auth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# --- RBAC ---
class TestRBAC:
    def test_corretor_lista_usuarios_403(self, corretor_session):
        r = corretor_session.get(f"{API}/usuarios")
        assert r.status_code == 403

    def test_gestor_lista_usuarios_ok(self, gestor_session):
        r = gestor_session.get(f"{API}/usuarios")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_lista_usuarios_ok(self, admin_session):
        r = admin_session.get(f"{API}/usuarios")
        assert r.status_code == 200

    def test_gestor_nao_pode_criar_admin(self, gestor_session):
        payload = {
            "nome": "TEST Novo Admin",
            "email": f"test_admin_{int(time.time())}@ex.com",
            "senha": "Senha@123",
            "papel": "admin",
        }
        r = gestor_session.post(f"{API}/usuarios", json=payload)
        assert r.status_code == 403


# --- CRUD Usuários ---
@pytest.fixture(scope="module")
def usuario_criado(gestor_session):
    payload = {
        "nome": "TEST Corretor Criado",
        "email": f"test_corretor_{int(time.time())}@ex.com",
        "senha": "Senha@123",
        "papel": "corretor",
    }
    r = gestor_session.post(f"{API}/usuarios", json=payload)
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["papel"] == "corretor"
    assert data["email"] == payload["email"]
    yield data, payload
    # cleanup via mongo
    try:
        mc = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        mc[os.environ.get("DB_NAME", "test_database")].users.delete_one({"email": payload["email"]})
    except Exception:
        pass


class TestUsuariosCRUD:
    def test_gestor_cria_corretor_e_get(self, gestor_session, usuario_criado):
        data, payload = usuario_criado
        r = gestor_session.get(f"{API}/usuarios", params={"busca": payload["email"]})
        assert r.status_code == 200
        emails = [u["email"] for u in r.json()]
        assert payload["email"] in emails

    def test_email_duplicado_409(self, gestor_session, usuario_criado):
        _, payload = usuario_criado
        r = gestor_session.post(f"{API}/usuarios", json=payload)
        assert r.status_code == 409

    def test_editar_usuario(self, gestor_session, usuario_criado):
        data, _ = usuario_criado
        r = gestor_session.patch(f"{API}/usuarios/{data['id']}", json={"nome": "TEST Nome Editado"})
        assert r.status_code == 200
        assert r.json()["nome"] == "TEST Nome Editado"

    def test_desativar_e_reativar(self, gestor_session, usuario_criado):
        data, payload = usuario_criado
        r = gestor_session.patch(f"{API}/usuarios/{data['id']}", json={"ativo": False})
        assert r.status_code == 200 and r.json()["ativo"] is False
        # login com desativado → 403
        _, lr = _login(payload["email"], payload["senha"])
        assert lr.status_code == 403
        # reativar
        r2 = gestor_session.patch(f"{API}/usuarios/{data['id']}", json={"ativo": True})
        assert r2.status_code == 200 and r2.json()["ativo"] is True

    def test_busca_por_email(self, gestor_session, usuario_criado):
        _, payload = usuario_criado
        r = gestor_session.get(f"{API}/usuarios", params={"busca": payload["email"][:10]})
        assert r.status_code == 200
        assert any(u["email"] == payload["email"] for u in r.json())


# --- Forgot / Reset password ---
class TestPasswordReset:
    def test_forgot_password_resposta_generica_email_cadastrado(self):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": CORRETOR[0]})
        assert r.status_code == 200
        assert "Se este e-mail estiver cadastrado" in r.json()["mensagem"]

    def test_forgot_password_resposta_generica_email_nao_cadastrado(self):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": f"naoexiste_{int(time.time())}@ex.com"})
        assert r.status_code == 200
        assert "Se este e-mail estiver cadastrado" in r.json()["mensagem"]

    def test_reset_password_token_invalido(self):
        r = requests.post(f"{API}/auth/reset-password", json={"token": "TOKEN_INVALIDO_XYZ", "senha": "NovaSenha@123"})
        assert r.status_code == 400
        assert "inválido" in r.json()["detail"].lower() or "expirado" in r.json()["detail"].lower()


# --- MongoDB ---
class TestMongoDB:
    @pytest.fixture(scope="class")
    def mdb(self):
        mc = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        return mc[os.environ.get("DB_NAME", "test_database")]

    def test_colecoes_existem(self, mdb):
        esperadas = {
            "users", "properties", "leads", "activities", "landing_pages",
            "cms_content", "marketing_config", "bank_rates", "imobiliaria_config",
        }
        atuais = set(mdb.list_collection_names())
        assert esperadas.issubset(atuais), f"Faltando: {esperadas - atuais}"

    def test_validators_configurados(self, mdb):
        for nome in ["users", "properties", "leads"]:
            info = mdb.command({"listCollections": 1, "filter": {"name": nome}})
            options = info["cursor"]["firstBatch"][0].get("options", {})
            assert "validator" in options and "$jsonSchema" in options["validator"]

    def test_indice_unico_email(self, mdb):
        idx = mdb.users.index_information()
        email_indexes = [v for k, v in idx.items() if any("email" == f[0] for f in v.get("key", []))]
        assert any(i.get("unique") for i in email_indexes)

    def test_admin_bcrypt_hash(self, mdb):
        u = mdb.users.find_one({"email": ADMIN[0]})
        assert u is not None
        assert u["senha_hash"].startswith("$2b$") or u["senha_hash"].startswith("$2a$")

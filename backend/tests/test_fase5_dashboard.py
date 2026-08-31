"""Fase 5 — Dashboard /api/dashboard/metricas: filtros, RBAC, funil, KPIs."""
import os
import pytest
import requests
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timezone

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = ("rodolfovaz882@gmail.com", "Admin@123")
GESTOR = ("gestor.teste@imobiliaria.com.br", "Gestor@123")
CORRETOR = ("corretor.teste@imobiliaria.com.br", "Corretor@123")


def _login(email, senha):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "senha": senha})
    assert r.status_code == 200, f"login {email} falhou: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def mdb():
    mc = MongoClient(os.environ["MONGO_URL"])
    return mc[os.environ["DB_NAME"]]


@pytest.fixture(scope="module")
def admin_s():
    return _login(*ADMIN)


@pytest.fixture(scope="module")
def gestor_s():
    return _login(*GESTOR)


@pytest.fixture(scope="module")
def corretor_s():
    return _login(*CORRETOR)


@pytest.fixture(scope="module")
def ids(mdb):
    corretor = mdb.users.find_one({"email": CORRETOR[0]})
    admin = mdb.users.find_one({"email": ADMIN[0]})
    return {
        "corretor_id": str(corretor["_id"]) if corretor else None,
        "admin_id": str(admin["_id"]) if admin else None,
    }


# ---------- Shape / estrutura ----------

def test_shape_metricas_30dias(admin_s):
    r = admin_s.get(f"{API}/dashboard/metricas", params={"dias": 30})
    assert r.status_code == 200
    data = r.json()
    for k in ("total_leads", "leads_por_dia", "funil", "conversao_global",
             "visitas", "propostas", "por_corretor", "gerado_em"):
        assert k in data, f"faltou {k}"
    assert isinstance(data["total_leads"], int)
    assert isinstance(data["leads_por_dia"], list)
    # 30 dias => 30 buckets preenchidos
    assert len(data["leads_por_dia"]) == 30
    for d in data["leads_por_dia"]:
        assert "data" in d and "total" in d
    # funil 7 etapas
    assert len(data["funil"]) == 7
    etapas = [f["etapa"] for f in data["funil"]]
    assert etapas == ["Novo", "Conversando", "Visita", "Proposta", "Negócio Fechado", "Perdido", "Descartado"]
    for f in data["funil"]:
        assert "total" in f and "percentual" in f
    assert set(data["visitas"].keys()) == {"agendadas", "realizadas"}
    assert set(data["propostas"].keys()) == {"enviadas", "fechadas"}


def test_periodo_7dias(admin_s):
    r = admin_s.get(f"{API}/dashboard/metricas", params={"dias": 7})
    assert r.status_code == 200
    data = r.json()
    assert len(data["leads_por_dia"]) == 7


def test_periodo_todo(admin_s):
    r = admin_s.get(f"{API}/dashboard/metricas", params={"dias": 0})
    assert r.status_code == 200
    data = r.json()
    # com dias=0, comprimento pode variar (só datas com leads); apenas checa que soma <= total
    soma = sum(d["total"] for d in data["leads_por_dia"])
    assert soma <= data["total_leads"]


# ---------- RBAC ----------

def test_rbac_corretor_por_corretor_null(corretor_s):
    r = corretor_s.get(f"{API}/dashboard/metricas", params={"dias": 30})
    assert r.status_code == 200
    assert r.json()["por_corretor"] is None


def test_rbac_admin_ve_por_corretor(admin_s):
    r = admin_s.get(f"{API}/dashboard/metricas", params={"dias": 0})
    assert r.status_code == 200
    assert isinstance(r.json()["por_corretor"], list)


def test_rbac_corretor_nao_pode_ver_outro(corretor_s, admin_s, ids):
    # corretor tenta passar admin_id — deve ser ignorado (backend força próprio)
    r1 = corretor_s.get(f"{API}/dashboard/metricas", params={"dias": 0, "corretor_id": ids["admin_id"]})
    assert r1.status_code == 200
    total_forcado = r1.json()["total_leads"]
    # comparar com o total do próprio corretor
    r2 = corretor_s.get(f"{API}/dashboard/metricas", params={"dias": 0})
    assert r2.status_code == 200
    assert total_forcado == r2.json()["total_leads"]


def test_admin_filtra_corretor_especifico(admin_s, ids):
    if not ids["corretor_id"]:
        pytest.skip("sem corretor")
    r = admin_s.get(f"{API}/dashboard/metricas", params={"dias": 0, "corretor_id": ids["corretor_id"]})
    assert r.status_code == 200
    data = r.json()
    # todos os leads do por_corretor (se houver) devem ser desse corretor
    if data["por_corretor"]:
        for c in data["por_corretor"]:
            assert c["corretor_id"] == ids["corretor_id"]


def test_corretor_id_invalido_422(admin_s):
    r = admin_s.get(f"{API}/dashboard/metricas", params={"dias": 30, "corretor_id": "nao-e-oid"})
    assert r.status_code == 422


def test_gestor_ve_consolidado(gestor_s):
    r = gestor_s.get(f"{API}/dashboard/metricas", params={"dias": 30})
    assert r.status_code == 200
    assert isinstance(r.json()["por_corretor"], list)


# ---------- Coerência com dados existentes ----------

def test_soma_funil_igual_total(admin_s):
    r = admin_s.get(f"{API}/dashboard/metricas", params={"dias": 0})
    data = r.json()
    soma = sum(f["total"] for f in data["funil"])
    assert soma == data["total_leads"]


def test_percentuais_funil(admin_s):
    r = admin_s.get(f"{API}/dashboard/metricas", params={"dias": 0})
    data = r.json()
    if data["total_leads"] > 0:
        soma_pct = sum(f["percentual"] for f in data["funil"])
        # tolerância por arredondamento
        assert 99.0 <= soma_pct <= 101.0


def test_sem_auth_401():
    r = requests.get(f"{API}/dashboard/metricas", params={"dias": 30})
    assert r.status_code in (401, 403)


# ---------- Move lead → funil reflete ----------

def test_funil_reflete_movimento(admin_s, mdb, ids):
    """Mover um lead existente para Visita aumenta 'realizadas' e a etapa Visita no funil."""
    lead = mdb.leads.find_one({"nome": "Lead Um"})
    if not lead:
        pytest.skip("Lead Um ausente")
    lead_id = str(lead["_id"])
    etapa_original = lead.get("etapa_crm", "Novo")

    baseline = admin_s.get(f"{API}/dashboard/metricas", params={"dias": 0}).json()
    visita_antes = next(f["total"] for f in baseline["funil"] if f["etapa"] == "Visita")
    realizadas_antes = baseline["visitas"]["realizadas"]

    try:
        # move para Visita
        r = admin_s.patch(f"{API}/crm/leads/{lead_id}/etapa", json={"etapa": "Visita"})
        assert r.status_code == 200, r.text

        depois = admin_s.get(f"{API}/dashboard/metricas", params={"dias": 0}).json()
        visita_depois = next(f["total"] for f in depois["funil"] if f["etapa"] == "Visita")
        assert visita_depois == visita_antes + (1 if etapa_original != "Visita" else 0)
        assert depois["visitas"]["realizadas"] >= realizadas_antes
    finally:
        # restaura
        admin_s.patch(f"{API}/crm/leads/{lead_id}/etapa", json={"etapa": etapa_original})

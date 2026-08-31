"""Fase 4 — CRM: RBAC, Kanban, Descartado (motivo), Reatribuição, Atividades."""
import os
import time
import pytest
import requests
from pymongo import MongoClient
from bson import ObjectId

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = ("rodolfovaz882@gmail.com", "Admin@123")
GESTOR = ("gestor.teste@imobiliaria.com.br", "Gestor@123")
CORRETOR = ("corretor.teste@imobiliaria.com.br", "Corretor@123")
CORRETOR2 = ("corretor.novo@imobiliaria.com.br", "Senha@123")


def _login(email, senha):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "senha": senha})
    return s, r


@pytest.fixture(scope="module")
def mdb():
    mc = MongoClient(os.environ["MONGO_URL"])
    return mc[os.environ["DB_NAME"]]


@pytest.fixture(scope="module")
def admin_s():
    s, r = _login(*ADMIN); assert r.status_code == 200; return s

@pytest.fixture(scope="module")
def gestor_s():
    s, r = _login(*GESTOR); assert r.status_code == 200; return s

@pytest.fixture(scope="module")
def corretor_s():
    s, r = _login(*CORRETOR); assert r.status_code == 200; return s

@pytest.fixture(scope="module")
def corretor2_s():
    s, r = _login(*CORRETOR2)
    if r.status_code != 200:
        pytest.skip(f"corretor2 login falhou: {r.status_code} {r.text}")
    return s


@pytest.fixture(scope="module")
def ids(mdb):
    corretor = mdb.users.find_one({"email": CORRETOR[0]})
    corretor2 = mdb.users.find_one({"email": CORRETOR2[0]})
    assert corretor
    return {
        "corretor_id": str(corretor["_id"]),
        "corretor2_id": str(corretor2["_id"]) if corretor2 else None,
    }


@pytest.fixture(scope="module")
def test_leads(mdb, ids, admin_s):
    """Create test leads: one assigned to CORRETOR, one to CORRETOR2 (or admin if missing)."""
    corretor_oid = ObjectId(ids["corretor_id"])
    outro_oid = ObjectId(ids["corretor2_id"]) if ids["corretor2_id"] else None

    created = []
    docs = [
        {
            "nome": "TEST_Lead_Corretor",
            "telefone": "11999990001",
            "email": "test_c1@ex.com",
            "origem": "site",
            "imovel_id": None,
            "mensagem": None,
            "consentimento_lgpd": True,
            "corretor_atribuido_id": corretor_oid,
            "etapa_crm": "Novo",
            "motivo_descarte": None,
            "ip": "127.0.0.1",
        },
    ]
    if outro_oid:
        docs.append({
            "nome": "TEST_Lead_Outro",
            "telefone": "11999990002",
            "email": "test_c2@ex.com",
            "origem": "site",
            "imovel_id": None,
            "mensagem": None,
            "consentimento_lgpd": True,
            "corretor_atribuido_id": outro_oid,
            "etapa_crm": "Novo",
            "motivo_descarte": None,
            "ip": "127.0.0.1",
        })
    from datetime import datetime, timezone
    for d in docs:
        d["criado_em"] = datetime.now(timezone.utc)
        d["consentimento_em"] = d["criado_em"]
        r = mdb.leads.insert_one(d)
        created.append(str(r.inserted_id))

    yield {"corretor_lead": created[0], "outro_lead": created[1] if len(created) > 1 else None}

    # cleanup
    for lid in created:
        oid = ObjectId(lid)
        mdb.activities.delete_many({"lead_id": oid})
        mdb.leads.delete_one({"_id": oid})


# --- Motivos-descarte endpoint ---
class TestMotivosDescarte:
    def test_get_motivos_padrao(self, admin_s):
        r = admin_s.get(f"{API}/crm/motivos-descarte")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert "Sem interesse" in data

    def test_motivos_requer_auth(self):
        r = requests.get(f"{API}/crm/motivos-descarte")
        assert r.status_code == 401


# --- Listar leads + RBAC ---
class TestListarLeadsRBAC:
    def test_admin_ve_todos(self, admin_s, test_leads):
        r = admin_s.get(f"{API}/crm/leads")
        assert r.status_code == 200
        ids_ret = [l["id"] for l in r.json()]
        assert test_leads["corretor_lead"] in ids_ret

    def test_gestor_ve_todos(self, gestor_s, test_leads):
        r = gestor_s.get(f"{API}/crm/leads")
        assert r.status_code == 200
        ids_ret = [l["id"] for l in r.json()]
        assert test_leads["corretor_lead"] in ids_ret

    def test_corretor_ve_so_seus(self, corretor_s, test_leads):
        r = corretor_s.get(f"{API}/crm/leads")
        assert r.status_code == 200
        leads = r.json()
        assert test_leads["corretor_lead"] in [l["id"] for l in leads]
        if test_leads["outro_lead"]:
            assert test_leads["outro_lead"] not in [l["id"] for l in leads]

    def test_busca_por_nome(self, admin_s, test_leads):
        r = admin_s.get(f"{API}/crm/leads", params={"busca": "TEST_Lead_Corretor"})
        assert r.status_code == 200
        assert any(l["id"] == test_leads["corretor_lead"] for l in r.json())


# --- Detalhe lead + RBAC ---
class TestDetalheLead:
    def test_admin_ve_qualquer(self, admin_s, test_leads):
        r = admin_s.get(f"{API}/crm/leads/{test_leads['corretor_lead']}")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == test_leads["corretor_lead"]
        assert "atividades" in d and isinstance(d["atividades"], list)

    def test_corretor_pode_ver_seu(self, corretor_s, test_leads):
        r = corretor_s.get(f"{API}/crm/leads/{test_leads['corretor_lead']}")
        assert r.status_code == 200

    def test_corretor_403_lead_alheio(self, corretor_s, test_leads):
        if not test_leads["outro_lead"]:
            pytest.skip("corretor2 não disponível")
        r = corretor_s.get(f"{API}/crm/leads/{test_leads['outro_lead']}")
        assert r.status_code == 403

    def test_lead_inexistente_404(self, admin_s):
        r = admin_s.get(f"{API}/crm/leads/000000000000000000000000")
        assert r.status_code == 404


# --- Mudar etapa + descartado com motivo ---
class TestMudarEtapa:
    def test_mudar_para_conversando(self, corretor_s, test_leads, mdb):
        lid = test_leads["corretor_lead"]
        r = corretor_s.patch(f"{API}/crm/leads/{lid}/etapa", json={"etapa": "Conversando"})
        assert r.status_code == 200, r.text
        assert r.json()["etapa_crm"] == "Conversando"
        # atividade gravada
        atv = list(mdb.activities.find({"lead_id": ObjectId(lid), "tipo": "etapa"}))
        assert len(atv) >= 1

    def test_negocio_fechado_aceito(self, admin_s, test_leads):
        lid = test_leads["corretor_lead"]
        r = admin_s.patch(f"{API}/crm/leads/{lid}/etapa", json={"etapa": "Negócio Fechado"})
        assert r.status_code == 200
        assert r.json()["etapa_crm"] == "Negócio Fechado"

    def test_etapa_antiga_fechado_rejeitada(self, admin_s, test_leads):
        lid = test_leads["corretor_lead"]
        r = admin_s.patch(f"{API}/crm/leads/{lid}/etapa", json={"etapa": "Fechado"})
        assert r.status_code == 422

    def test_descartado_sem_motivo_422(self, admin_s, test_leads):
        lid = test_leads["corretor_lead"]
        r = admin_s.patch(f"{API}/crm/leads/{lid}/etapa", json={"etapa": "Descartado"})
        assert r.status_code == 422
        assert "motivo" in r.json()["detail"].lower()

    def test_descartado_motivo_invalido_422(self, admin_s, test_leads):
        lid = test_leads["corretor_lead"]
        r = admin_s.patch(f"{API}/crm/leads/{lid}/etapa", json={"etapa": "Descartado", "motivo_descarte": "Motivo Inexistente XYZ"})
        assert r.status_code == 422

    def test_descartado_motivo_valido(self, admin_s, test_leads, mdb):
        lid = test_leads["corretor_lead"]
        r = admin_s.patch(f"{API}/crm/leads/{lid}/etapa", json={"etapa": "Descartado", "motivo_descarte": "Sem interesse"})
        assert r.status_code == 200
        data = r.json()
        assert data["etapa_crm"] == "Descartado"
        assert data["motivo_descarte"] == "Sem interesse"
        # atividade menciona motivo
        atv = list(mdb.activities.find({"lead_id": ObjectId(lid), "tipo": "etapa"}).sort("data", -1))
        assert any("Sem interesse" in a.get("descricao", "") for a in atv)
        # reset para Novo
        admin_s.patch(f"{API}/crm/leads/{lid}/etapa", json={"etapa": "Novo"})

    def test_corretor_nao_move_lead_alheio(self, corretor_s, test_leads):
        if not test_leads["outro_lead"]:
            pytest.skip()
        r = corretor_s.patch(f"{API}/crm/leads/{test_leads['outro_lead']}/etapa", json={"etapa": "Conversando"})
        assert r.status_code == 403


# --- Reatribuição ---
class TestReatribuir:
    def test_corretor_nao_pode_reatribuir(self, corretor_s, test_leads, ids):
        lid = test_leads["corretor_lead"]
        r = corretor_s.patch(f"{API}/crm/leads/{lid}/atribuir", json={"corretor_id": ids["corretor_id"]})
        assert r.status_code == 403

    def test_admin_reatribui(self, admin_s, test_leads, ids, mdb):
        if not ids["corretor2_id"]:
            pytest.skip()
        lid = test_leads["corretor_lead"]
        r = admin_s.patch(f"{API}/crm/leads/{lid}/atribuir", json={"corretor_id": ids["corretor2_id"]})
        assert r.status_code == 200, r.text
        assert r.json()["corretor_atribuido_id"] == ids["corretor2_id"]
        # atividade
        atv = list(mdb.activities.find({"lead_id": ObjectId(lid), "tipo": "atribuicao"}))
        assert len(atv) >= 1
        # restaura
        admin_s.patch(f"{API}/crm/leads/{lid}/atribuir", json={"corretor_id": ids["corretor_id"]})

    def test_reatribuir_corretor_inexistente_404(self, admin_s, test_leads):
        r = admin_s.patch(f"{API}/crm/leads/{test_leads['corretor_lead']}/atribuir", json={"corretor_id": "000000000000000000000000"})
        assert r.status_code == 404


# --- Atividades ---
class TestAtividades:
    def test_criar_anotacao(self, corretor_s, test_leads, mdb):
        lid = test_leads["corretor_lead"]
        r = corretor_s.post(f"{API}/crm/leads/{lid}/atividades", json={"tipo": "anotacao", "descricao": "TEST_anotacao"})
        assert r.status_code == 201
        # aparece no detalhe
        d = corretor_s.get(f"{API}/crm/leads/{lid}").json()
        assert any("TEST_anotacao" in a["descricao"] for a in d["atividades"])

    def test_criar_ligacao(self, corretor_s, test_leads):
        r = corretor_s.post(f"{API}/crm/leads/{test_leads['corretor_lead']}/atividades", json={"tipo": "ligacao", "descricao": "TEST_ligacao"})
        assert r.status_code == 201

    def test_tipo_invalido_422(self, admin_s, test_leads):
        r = admin_s.post(f"{API}/crm/leads/{test_leads['corretor_lead']}/atividades", json={"tipo": "whatsapp", "descricao": "x"})
        assert r.status_code == 422

    def test_corretor_nao_registra_em_lead_alheio(self, corretor_s, test_leads):
        if not test_leads["outro_lead"]:
            pytest.skip()
        r = corretor_s.post(f"{API}/crm/leads/{test_leads['outro_lead']}/atividades", json={"tipo": "anotacao", "descricao": "TEST_x"})
        assert r.status_code == 403


# --- Integração Fase 1: POST /leads cria em 'Novo' com corretor ---
class TestCriarLeadIntegracao:
    def test_novo_lead_entra_kanban(self, admin_s, mdb):
        payload = {
            "nome": f"TEST_Site_{int(time.time())}",
            "telefone": "11988887777",
            "email": "test_site@ex.com",
            "origem": "site",
            "consentimento_lgpd": True,
        }
        r = requests.post(f"{API}/leads", json=payload)
        assert r.status_code == 201, r.text
        # localiza no DB
        doc = mdb.leads.find_one({"nome": payload["nome"]})
        assert doc is not None
        assert doc["etapa_crm"] == "Novo"
        assert doc.get("corretor_atribuido_id") is not None
        # cleanup
        mdb.activities.delete_many({"lead_id": doc["_id"]})
        mdb.leads.delete_one({"_id": doc["_id"]})


# --- Enum: não existir 'Fechado' antigo ---
class TestEnumMigrado:
    def test_nenhum_lead_com_fechado_antigo(self, mdb):
        n = mdb.leads.count_documents({"etapa_crm": "Fechado"})
        assert n == 0, f"Existem {n} leads com etapa 'Fechado' antiga"

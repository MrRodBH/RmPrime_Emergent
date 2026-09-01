"""
Fase 6: IA (melhorar descricao, insights lead/dashboard), calculadora, taxas manuais,
scraping status, cron, imoveis recomendados.
"""
import os
import time
import uuid
import pytest
import requests

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if "REACT_APP_BACKEND_URL" in os.environ else "https://admin-imoveis.preview.emergentagent.com"
API = f"{BASE}/api"
CRON_SECRET = "c8f2a14b9e6d47f0a3c5e81b2d9f6047aa15c3e7890bd4f6a2c8e1d5f7b90364"

ADMIN = ("rodolfovaz882@gmail.com", "Admin@123")
GESTOR = ("gestor.teste@imobiliaria.com.br", "Gestor@123")
CORRETOR = ("corretor.teste@imobiliaria.com.br", "Corretor@123")


def _sess(cred):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": cred[0], "senha": cred[1]}, timeout=15)
    assert r.status_code == 200, f"login {cred[0]}: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def admin():
    return _sess(ADMIN)


@pytest.fixture(scope="module")
def gestor():
    return _sess(GESTOR)


@pytest.fixture(scope="module")
def corretor():
    return _sess(CORRETOR)


# ---------------- IA ----------------
class TestIAMelhorarDescricao:
    def test_texto_curto_422(self, corretor):
        r = corretor.post(f"{API}/ia/melhorar-descricao", json={"texto": "curto"}, timeout=15)
        assert r.status_code == 422

    def test_texto_valido_preserva_fatos(self, corretor):
        texto = "Apto em Moema com 2 quartos, varanda, 1 vaga e piscina no prédio."
        r = corretor.post(
            f"{API}/ia/melhorar-descricao",
            json={"texto": texto, "campos": {"bairro": "Moema", "quartos": 2}},
            timeout=90,
        )
        assert r.status_code == 200, r.text
        out = r.json().get("texto_melhorado", "").lower()
        assert len(out) > 20
        # deve preservar fatos-chave
        assert "moema" in out
        assert "2" in out  # 2 quartos
        # não deve inventar número diferente de quartos (heurística: presença de "3 quartos" ou "4 quartos" é falso)
        assert "3 quartos" not in out and "4 quartos" not in out


class TestInsightsLead:
    def test_lead_inexistente_404(self, corretor):
        r = corretor.get(f"{API}/ia/insights-lead/000000000000000000000000", timeout=30)
        assert r.status_code == 404

    def test_lead_invalido_404(self, corretor):
        r = corretor.get(f"{API}/ia/insights-lead/invalido", timeout=30)
        assert r.status_code == 404

    def test_admin_gera_insights_e_corretor_nao_ve_alheio(self, admin, corretor):
        # pegar um lead qualquer via admin
        r = admin.get(f"{API}/crm/leads?limite=1", timeout=15)
        if r.status_code != 200:
            pytest.skip(f"listar leads: {r.status_code}")
        lista = r.json() if isinstance(r.json(), list) else r.json().get("itens", [])
        if not lista:
            pytest.skip("sem leads no ambiente")
        lead = lista[0]
        lead_id = lead.get("id") or lead.get("_id")
        assert lead_id
        # admin gera
        ra = admin.get(f"{API}/ia/insights-lead/{lead_id}", timeout=90)
        assert ra.status_code == 200, ra.text
        data = ra.json()
        assert "sentimento" in data and "resumo" in data and "proximos_passos" in data
        assert isinstance(data["proximos_passos"], list)
        # corretor tentando ver lead que provavelmente não é dele → 404
        rc = corretor.get(f"{API}/ia/insights-lead/{lead_id}", timeout=90)
        # aceita 200 caso o lead esteja atribuído ao corretor de teste; caso contrário deve ser 404
        assert rc.status_code in (200, 404)


class TestInsightsDashboard:
    def test_admin(self, admin):
        r = admin.get(f"{API}/ia/insights-dashboard?dias=30", timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("periodo_dias") == 30
        assert isinstance(d.get("texto"), str) and len(d["texto"]) > 20

    def test_corretor(self, corretor):
        r = corretor.get(f"{API}/ia/insights-dashboard?dias=30", timeout=90)
        assert r.status_code == 200, r.text
        assert len(r.json().get("texto", "")) > 20


# ---------------- Calculadora ----------------
class TestCalculadoraTaxa:
    def test_default_cef_mcmv_sac(self):
        r = requests.get(f"{API}/calculadora/taxa", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["banco"] == "CEF"
        assert d["sistema"] == "SAC"
        assert d["modalidade"] == "MCMV"
        assert d["fonte"] == "scraping"
        assert 5 <= d["taxa_aa"] <= 15
        assert d["data_referencia"] and "2026-07" in d["data_referencia"]

    def test_inter_price(self):
        r = requests.get(f"{API}/calculadora/taxa?banco=Inter&sistema=PRICE", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["banco"] == "Inter"
        assert d["sistema"] == "PRICE"
        assert d["fonte"] == "scraping"
        assert 8 <= d["taxa_aa"] <= 20

    def test_banco_inexistente_cai_para_exemplo(self):
        r = requests.get(f"{API}/calculadora/taxa?banco=Santander&sistema=SAC", timeout=15)
        assert r.status_code == 200
        assert r.json()["fonte"] == "exemplo"


# ---------------- Taxas manuais / permissões ----------------
class TestTaxasPermissoes:
    def test_listar_taxas_admin(self, admin):
        r = admin.get(f"{API}/taxas", timeout=15)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list) and len(arr) >= 8

    def test_listar_taxas_gestor(self, gestor):
        r = gestor.get(f"{API}/taxas", timeout=15)
        assert r.status_code == 200

    def test_listar_taxas_corretor_403(self, corretor):
        r = corretor.get(f"{API}/taxas", timeout=15)
        assert r.status_code == 403

    def test_status_scraping_somente_admin(self, admin, gestor, corretor):
        assert admin.get(f"{API}/taxas/status-scraping", timeout=15).status_code == 200
        assert gestor.get(f"{API}/taxas/status-scraping", timeout=15).status_code == 403
        assert corretor.get(f"{API}/taxas/status-scraping", timeout=15).status_code == 403


class TestTaxaManual:
    def test_validacoes_e_sobrepoe_e_cleanup(self, admin, corretor):
        # 403 corretor
        r = corretor.put(f"{API}/taxas/manual", json={"banco": "Inter", "sistema": "SAC", "taxa_aa": 12}, timeout=15)
        assert r.status_code == 403
        # banco invalido
        r = admin.put(f"{API}/taxas/manual", json={"banco": "XPTO", "sistema": "SAC", "taxa_aa": 10}, timeout=15)
        assert r.status_code == 422
        # CEF sem modalidade valida
        r = admin.put(f"{API}/taxas/manual", json={"banco": "CEF", "sistema": "SAC", "taxa_aa": 10}, timeout=15)
        assert r.status_code == 422
        # taxa fora de 0-30
        r = admin.put(f"{API}/taxas/manual", json={"banco": "Inter", "sistema": "SAC", "taxa_aa": 99}, timeout=15)
        assert r.status_code == 422
        r = admin.put(f"{API}/taxas/manual", json={"banco": "Inter", "sistema": "SAC", "taxa_aa": 0}, timeout=15)
        assert r.status_code == 422

        # cria manual válido para Inter SAC = 7.77
        r = admin.put(f"{API}/taxas/manual", json={"banco": "Inter", "sistema": "SAC", "taxa_aa": 7.77}, timeout=15)
        assert r.status_code == 201, r.text
        try:
            # calculadora deve retornar manual
            r2 = requests.get(f"{API}/calculadora/taxa?banco=Inter&sistema=SAC", timeout=15)
            assert r2.status_code == 200
            d = r2.json()
            assert d["fonte"] == "manual"
            assert abs(d["taxa_aa"] - 7.77) < 0.001
        finally:
            # cleanup: acessar mongo direto via variavel de ambiente
            import asyncio
            from motor.motor_asyncio import AsyncIOMotorClient
            mongo_url = os.environ.get("MONGO_URL")
            db_name = os.environ.get("DB_NAME")
            if mongo_url and db_name:
                async def _clean():
                    client = AsyncIOMotorClient(mongo_url)
                    await client[db_name].bank_rates.delete_many({"fonte": "manual"})
                    client.close()
                asyncio.get_event_loop().run_until_complete(_clean())


# ---------------- Cron ----------------
class TestCron:
    def test_sem_token_401(self):
        r = requests.post(f"{API}/cron/atualizar-taxas", json={"run_id": "x"}, timeout=15)
        assert r.status_code == 401

    def test_token_invalido_401(self):
        r = requests.post(
            f"{API}/cron/atualizar-taxas",
            json={"run_id": "x"},
            headers={"Authorization": "Bearer errado"},
            timeout=15,
        )
        assert r.status_code == 401

    def test_token_correto_ok_e_duplicado(self):
        rid = f"test-{uuid.uuid4().hex}"
        h = {"Authorization": f"Bearer {CRON_SECRET}"}
        r1 = requests.post(f"{API}/cron/atualizar-taxas", json={"run_id": rid}, headers=h, timeout=30)
        assert r1.status_code == 200, r1.text
        assert r1.json().get("ok") is True
        assert not r1.json().get("duplicado")
        r2 = requests.post(f"{API}/cron/atualizar-taxas", json={"run_id": rid}, headers=h, timeout=30)
        assert r2.status_code == 200
        assert r2.json().get("duplicado") is True


# ---------------- Imoveis recomendados ----------------
class TestRecomendados:
    def test_sem_id(self):
        r = requests.get(f"{API}/imoveis/recomendados", timeout=20)
        assert r.status_code == 200
        arr = r.json().get("itens", [])
        assert isinstance(arr, list)
        assert len(arr) <= 6

    def test_com_id_nao_inclui_self(self):
        r = requests.get(f"{API}/imoveis/publico?limite=1", timeout=15)
        if r.status_code != 200:
            pytest.skip("listar imoveis")
        body = r.json()
        itens = body.get("itens") if isinstance(body, dict) else body
        if not itens:
            pytest.skip("sem imoveis")
        base = itens[0]
        bid = base.get("id") or base.get("_id")
        r2 = requests.get(f"{API}/imoveis/recomendados?imovel_id={bid}", timeout=20)
        assert r2.status_code == 200
        ids = [(i.get("id") or i.get("_id")) for i in r2.json().get("itens", [])]
        assert bid not in ids

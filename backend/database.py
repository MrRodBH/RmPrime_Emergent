import os

from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

TEXTO_OU_NULO = ["string", "null"]
ID_OU_NULO = ["objectId", "null"]

VALIDADORES = {
    "users": {
        "bsonType": "object",
        "required": ["nome", "email", "senha_hash", "role", "ativo", "criado_em"],
        "properties": {
            "nome": {"bsonType": "string"},
            "email": {"bsonType": "string"},
            "senha_hash": {"bsonType": "string"},
            "role": {"enum": ["admin", "gestor", "corretor"]},
            "telefone": {"bsonType": TEXTO_OU_NULO},
            "foto": {"bsonType": TEXTO_OU_NULO},
            "ativo": {"bsonType": "bool"},
            "token_version": {"bsonType": ["int", "long"]},
            "criado_em": {"bsonType": "date"},
        },
    },
    "properties": {
        "bsonType": "object",
        "required": ["titulo", "tipo", "finalidade", "preco", "status", "criado_em"],
        "properties": {
            "titulo": {"bsonType": "string"},
            "descricao": {"bsonType": TEXTO_OU_NULO},
            "tipo": {"bsonType": "string"},
            "finalidade": {"enum": ["venda", "aluguel"]},
            "preco": {"bsonType": "number"},
            "condominio": {"bsonType": ["number", "null"]},
            "iptu": {"bsonType": ["number", "null"]},
            "endereco": {
                "bsonType": ["object", "null"],
                "properties": {
                    "logradouro": {"bsonType": TEXTO_OU_NULO},
                    "numero": {"bsonType": TEXTO_OU_NULO},
                    "complemento": {"bsonType": TEXTO_OU_NULO},
                    "bairro": {"bsonType": TEXTO_OU_NULO},
                    "cidade": {"bsonType": TEXTO_OU_NULO},
                    "estado": {"bsonType": TEXTO_OU_NULO},
                    "cep": {"bsonType": TEXTO_OU_NULO},
                    "lat": {"bsonType": ["number", "null"]},
                    "lng": {"bsonType": ["number", "null"]},
                },
            },
            "exibir_endereco_exato": {"bsonType": "bool"},
            "caracteristicas": {
                "bsonType": ["object", "null"],
                "properties": {
                    "quartos": {"bsonType": ["int", "long", "null"]},
                    "banheiros": {"bsonType": ["int", "long", "null"]},
                    "vagas": {"bsonType": ["int", "long", "null"]},
                    "area_m2": {"bsonType": ["number", "null"]},
                },
            },
            "lazer": {"bsonType": ["array", "null"], "items": {"bsonType": "string"}},
            "fotos": {"bsonType": ["array", "null"], "items": {"bsonType": "string"}},
            "videos": {"bsonType": ["array", "null"], "items": {"bsonType": "string"}},
            "status": {"enum": ["ativo", "inativo", "vendido"]},
            "slug": {"bsonType": TEXTO_OU_NULO},
            "destaque": {"bsonType": "bool"},
            "corretor_responsavel_id": {"bsonType": ID_OU_NULO},
            "criado_em": {"bsonType": "date"},
            "atualizado_em": {"bsonType": ["date", "null"]},
        },
    },
    "leads": {
        "bsonType": "object",
        "required": ["nome", "telefone", "origem", "etapa_crm", "consentimento_lgpd", "criado_em"],
        "properties": {
            "nome": {"bsonType": "string"},
            "telefone": {"bsonType": "string"},
            "email": {"bsonType": TEXTO_OU_NULO},
            "origem": {"enum": ["site", "landing_page", "agendamento"]},
            "imovel_id": {"bsonType": ID_OU_NULO},
            "mensagem": {"bsonType": TEXTO_OU_NULO},
            "consentimento_lgpd": {"bsonType": "bool"},
            "consentimento_em": {"bsonType": ["date", "null"]},
            "corretor_atribuido_id": {"bsonType": ID_OU_NULO},
            "etapa_crm": {
                "enum": ["Novo", "Conversando", "Visita", "Proposta", "Negócio Fechado", "Perdido", "Descartado"]
            },
            "motivo_descarte": {"bsonType": TEXTO_OU_NULO},
            "criado_em": {"bsonType": "date"},
        },
    },
    "activities": {
        "bsonType": "object",
        "required": ["lead_id", "tipo", "descricao", "autor_id", "data"],
        "properties": {
            "lead_id": {"bsonType": "objectId"},
            "tipo": {"bsonType": "string"},
            "descricao": {"bsonType": "string"},
            "autor_id": {"bsonType": "objectId"},
            "data": {"bsonType": "date"},
        },
    },
    "landing_pages": {
        "bsonType": "object",
        "required": ["slug", "imovel_id", "publicada"],
        "properties": {
            "slug": {"bsonType": "string"},
            "imovel_id": {"bsonType": "objectId"},
            "dominio_customizado": {"bsonType": TEXTO_OU_NULO},
            "conteudo": {"bsonType": ["object", "null"]},
            "publicada": {"bsonType": "bool"},
        },
    },
    "cms_content": {
        "bsonType": "object",
        "required": ["chave", "valor", "tipo", "atualizado_em"],
        "properties": {
            "chave": {"bsonType": "string"},
            "valor": {"bsonType": "string"},
            "tipo": {"bsonType": "string"},
            "atualizado_em": {"bsonType": "date"},
        },
    },
    "marketing_config": {
        "bsonType": "object",
        "properties": {
            "meta_pixel_id": {"bsonType": TEXTO_OU_NULO},
            "meta_capi_token": {"bsonType": TEXTO_OU_NULO},
            "google_ads_id": {"bsonType": TEXTO_OU_NULO},
            "script_cabecalho": {"bsonType": TEXTO_OU_NULO},
            "script_rodape": {"bsonType": TEXTO_OU_NULO},
        },
    },
    "bank_rates": {
        "bsonType": "object",
        "required": ["banco", "sistema", "taxa_aa", "fonte", "data_referencia"],
        "properties": {
            "banco": {"enum": ["CEF", "Itaú", "Bradesco", "Inter"]},
            "modalidade": {"bsonType": TEXTO_OU_NULO},
            "sistema": {"enum": ["SAC", "PRICE"]},
            "taxa_aa": {"bsonType": "number"},
            "fonte": {"enum": ["scraping", "manual"]},
            "data_referencia": {"bsonType": "date"},
            "atualizado_em": {"bsonType": ["date", "null"]},
        },
    },
    "scraping_log": {
        "bsonType": "object",
        "required": ["banco", "sucesso", "tentativa_em"],
        "properties": {
            "banco": {"bsonType": "string"},
            "sucesso": {"bsonType": "bool"},
            "detalhe": {"bsonType": TEXTO_OU_NULO},
            "tentativa_em": {"bsonType": "date"},
        },
    },
    "cron_runs": {
        "bsonType": "object",
        "required": ["run_id", "criado_em"],
        "properties": {
            "run_id": {"bsonType": "string"},
            "criado_em": {"bsonType": "date"},
        },
    },
    "posts": {
        "bsonType": "object",
        "required": ["titulo", "slug", "conteudo", "publicado", "criado_em"],
        "properties": {
            "titulo": {"bsonType": "string"},
            "slug": {"bsonType": "string"},
            "resumo": {"bsonType": TEXTO_OU_NULO},
            "conteudo": {"bsonType": "string"},
            "capa": {"bsonType": TEXTO_OU_NULO},
            "publicado": {"bsonType": "bool"},
            "criado_em": {"bsonType": "date"},
        },
    },
    "imobiliaria_config": {
        "bsonType": "object",
        "required": ["nome"],
        "properties": {
            "nome": {"bsonType": "string"},
            "logomarca": {"bsonType": TEXTO_OU_NULO},
            "telefone": {"bsonType": TEXTO_OU_NULO},
            "email_contato": {"bsonType": TEXTO_OU_NULO},
            "endereco": {"bsonType": TEXTO_OU_NULO},
            "corretor_padrao_id": {"bsonType": ID_OU_NULO},
            "redes_sociais": {"bsonType": ["object", "null"]},
            "emails_notificacao": {"bsonType": ["array", "null"], "items": {"bsonType": "string"}},
            "round_robin_ativo": {"bsonType": "bool"},
            "round_robin_posicao": {"bsonType": ["int", "long", "null"]},
            "motivos_descarte": {"bsonType": ["array", "null"], "items": {"bsonType": "string"}},
        },
    },
}


async def configurar_banco():
    existentes = await db.list_collection_names()
    for nome, esquema in VALIDADORES.items():
        if nome in existentes:
            await db.command("collMod", nome, validator={"$jsonSchema": esquema})
        else:
            await db.create_collection(nome, validator={"$jsonSchema": esquema})

    await db.users.create_index("email", unique=True)
    await db.properties.create_index("status")
    await db.properties.create_index("slug", unique=True, sparse=True)
    await db.properties.create_index("destaque")
    await db.posts.create_index("slug", unique=True)
    await db.properties.create_index("corretor_responsavel_id")
    await db.leads.create_index("corretor_atribuido_id")
    await db.leads.create_index("etapa_crm")
    await db.leads.create_index("imovel_id")
    await db.activities.create_index("lead_id")
    await db.landing_pages.create_index("slug", unique=True)
    await db.cms_content.create_index("chave", unique=True)
    await db.bank_rates.create_index([("banco", 1), ("data_referencia", -1)])
    await db.scraping_log.create_index([("banco", 1), ("tentativa_em", -1)])
    await db.cron_runs.create_index("run_id", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.password_reset_tokens.create_index("token_hash", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.login_attempts.create_index("email")
    await db.password_reset_requests.create_index("email")
    await db.password_reset_requests.create_index("created_at", expireAfterSeconds=900)

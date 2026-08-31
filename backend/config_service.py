from database import db

CONFIG_PADRAO = {
    "nome": "Minha Imobiliária",
    "logomarca": None,
    "telefone": None,
    "email_contato": None,
    "endereco": None,
    "redes_sociais": {},
    "emails_notificacao": [],
    "round_robin_ativo": True,
    "round_robin_posicao": -1,
    "corretor_padrao_id": None,
    "motivos_descarte": ["Sem interesse", "Sem resposta", "Fora do perfil", "Duplicado", "Dados inválidos"],
}


async def obter_config() -> dict:
    config = await db.imobiliaria_config.find_one({})
    if config is None:
        await db.imobiliaria_config.insert_one(dict(CONFIG_PADRAO))
        config = await db.imobiliaria_config.find_one({})
    return config

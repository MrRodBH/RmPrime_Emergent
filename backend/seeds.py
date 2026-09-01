import json
from datetime import datetime, timezone

from database import db
from utils_texto import slugify

IMG = "?auto=format&fit=crop&w=1200&q=80"
I1 = "https://images.unsplash.com/photo-1564078516393-cf04bd966897" + IMG
I2 = "https://images.unsplash.com/photo-1724582586529-62622e50c0b3" + IMG
I3 = "https://images.unsplash.com/photo-1688646953306-5ec93eab8c06" + IMG
I4 = "https://images.unsplash.com/photo-1665249934445-1de680641f50" + IMG
E1 = "https://images.unsplash.com/photo-1721815693498-cc28507c0ba2" + IMG
E2 = "https://images.unsplash.com/photo-1628012209120-d9db7abf7eab" + IMG
E3 = "https://images.unsplash.com/photo-1558661091-5cc1b64d0dc5" + IMG
E4 = "https://images.unsplash.com/photo-1698994705178-d244d73ea573" + IMG
B1 = "https://images.unsplash.com/photo-1722487631997-cf1e0f92c2c4" + IMG
B2 = "https://images.unsplash.com/photo-1741156386380-0236c72eb6f9" + IMG
B3 = "https://images.unsplash.com/photo-1564767609342-620cb19b2357" + IMG

POLITICA_PADRAO = """A sua privacidade é importante para nós. Esta Política de Privacidade explica, em linguagem clara, como coletamos, usamos e protegemos os seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).

Quais dados coletamos: quando você preenche um formulário em nosso site ou landing pages, coletamos nome, telefone e e-mail, além da mensagem enviada e do imóvel de interesse, quando houver.

Para que usamos: os dados são utilizados exclusivamente para que um de nossos corretores entre em contato com você, agende visitas e apresente imóveis do seu interesse.

Com quem compartilhamos: não vendemos nem compartilhamos seus dados com terceiros para fins de marketing. O acesso é restrito à equipe da imobiliária.

Seus direitos: você pode solicitar a qualquer momento a confirmação, a correção ou a exclusão dos seus dados pessoais, bem como revogar o consentimento, entrando em contato pelos nossos canais oficiais.

Segurança: adotamos medidas técnicas e organizacionais para proteger seus dados contra acessos não autorizados.

Esta política pode ser atualizada periodicamente. A versão vigente estará sempre disponível nesta página."""

FOOTER_PADRAO = (
    "Há mais de 15 anos realizando sonhos. Nossa equipe de corretores especializados "
    "acompanha você em todas as etapas: da busca ao financiamento, até a entrega das chaves."
)

DEPOIMENTOS_PADRAO = "\n".join(
    [
        "Mariana Souza :: Atendimento impecável do início ao fim. Encontramos nosso apartamento dos sonhos em duas semanas!",
        "Carlos Pereira :: A equipe cuidou de toda a burocracia do financiamento. Recomendo de olhos fechados.",
        "Fernanda Lima :: Vendi meu imóvel acima do valor que esperava. Profissionalismo raro hoje em dia.",
    ]
)


def _imovel(titulo, tipo, finalidade, preco, bairro, lat, lng, quartos, banheiros, vagas, area, fotos, lazer, destaque, descricao, cidade="Belo Horizonte", condominio=None, iptu=None, corretor_id=None):
    agora = datetime.now(timezone.utc)
    return {
        "titulo": titulo,
        "slug": slugify(titulo),
        "descricao": descricao,
        "tipo": tipo,
        "finalidade": finalidade,
        "preco": preco,
        "condominio": condominio,
        "iptu": iptu,
        "endereco": {
            "logradouro": "Rua Exemplo",
            "numero": "100",
            "complemento": None,
            "bairro": bairro,
            "cidade": cidade,
            "estado": "MG",
            "cep": "00000-000",
            "lat": lat,
            "lng": lng,
        },
        "exibir_endereco_exato": False,
        "caracteristicas": {"quartos": quartos, "banheiros": banheiros, "vagas": vagas, "area_m2": area},
        "lazer": lazer,
        "fotos": fotos,
        "videos": [],
        "status": "ativo",
        "destaque": destaque,
        "corretor_responsavel_id": corretor_id,
        "criado_em": agora,
        "atualizado_em": None,
    }


async def semear_site():
    from config_service import obter_config

    await obter_config()

    for chave, valor in [
        ("footer_texto", FOOTER_PADRAO),
        ("footer_endereco", "Av. do Contorno, 1000 — Belo Horizonte/MG"),
        ("politica_privacidade", POLITICA_PADRAO),
        ("depoimentos", DEPOIMENTOS_PADRAO),
    ]:
        if not await db.cms_content.find_one({"chave": chave}):
            await db.cms_content.insert_one(
                {"chave": chave, "valor": valor, "tipo": "texto", "atualizado_em": datetime.now(timezone.utc)}
            )

    if await db.properties.count_documents({}) == 0:
        corretor = await db.users.find_one({"role": "corretor", "ativo": True})
        corretor_id = corretor["_id"] if corretor else None
        imoveis = [
            _imovel(
                "Apartamento moderno de 3 quartos na Savassi", "Apartamento", "venda", 1250000,
                "Savassi", -19.9369, -43.9340, 3, 2, 2, 98, [I1, I2, I3],
                ["Piscina", "Academia", "Salão de festas", "Portaria 24h"], True,
                "Apartamento amplo e iluminado, com varanda gourmet e acabamento de alto padrão. "
                "No coração da Savassi, perto do Pátio Savassi, escolas e comércio completo.",
                condominio=1200, iptu=380, corretor_id=corretor_id,
            ),
            _imovel(
                "Casa contemporânea com piscina no Belvedere", "Casa", "venda", 2890000,
                "Belvedere", -19.9746, -43.9467, 4, 5, 3, 320, [E1, E3, I4],
                ["Piscina", "Churrasqueira", "Jardim", "Escritório"], True,
                "Casa de arquitetura contemporânea com pé-direito duplo, área gourmet integrada e "
                "piscina com deck. Bairro arborizado e tranquilo, com fácil acesso à Av. Raja Gabáglia e ao BH Shopping.",
                iptu=950, corretor_id=corretor_id,
            ),
            _imovel(
                "Studio completo e mobiliado no Funcionários", "Studio", "aluguel", 2800,
                "Funcionários", -19.9314, -43.9280, 1, 1, 1, 38, [I2, I4],
                ["Academia", "Coworking", "Lavanderia", "Portaria 24h"], True,
                "Studio mobiliado e decorado, pronto para morar. Condomínio com infraestrutura completa, "
                "a poucos minutos da Av. Afonso Pena e do Parque Municipal.",
                condominio=650, iptu=90, corretor_id=corretor_id,
            ),
            _imovel(
                "Cobertura duplex com vista panorâmica no Lourdes", "Cobertura", "venda", 4500000,
                "Lourdes", -19.9278, -43.9477, 4, 4, 4, 260, [I3, I4, E4],
                ["Piscina privativa", "Terraço gourmet", "Spa", "Portaria 24h"], True,
                "Cobertura duplex com vista definitiva para a Serra do Curral, terraço com piscina "
                "privativa e quatro suítes. Um dos endereços mais valorizados de Belo Horizonte.",
                condominio=3800, iptu=2100, corretor_id=corretor_id,
            ),
            _imovel(
                "Apartamento de 2 quartos no Buritis", "Apartamento", "venda", 780000,
                "Buritis", -19.9728, -43.9616, 2, 1, 1, 64, [I4, I1],
                ["Salão de festas", "Playground", "Portaria 24h"], False,
                "Ótima oportunidade no Buritis: apartamento funcional, andar alto, perto da "
                "Av. Mario Werneck e do comércio do bairro.",
                condominio=780, iptu=210, corretor_id=corretor_id,
            ),
            _imovel(
                "Casa geminada com quintal na Vila da Serra", "Casa", "aluguel", 4500,
                "Vila da Serra", -19.9850, -43.9025, 3, 2, 2, 180, [E2, E3],
                ["Quintal", "Churrasqueira", "Aceita pets"], False,
                "Casa geminada ampla com quintal, ideal para famílias. Nova Lima: região com comércio "
                "completo e fácil acesso à BR-040 e ao centro de Belo Horizonte.",
                cidade="Nova Lima", iptu=280, corretor_id=corretor_id,
            ),
        ]
        await db.properties.insert_many(imoveis)

    if await db.posts.count_documents({}) == 0:
        agora = datetime.now(timezone.utc)
        posts = [
            {
                "titulo": "SAC ou PRICE: qual sistema de financiamento escolher?",
                "slug": "sac-ou-price-qual-sistema-de-financiamento-escolher",
                "resumo": "Entenda de uma vez a diferença entre os dois sistemas de amortização e qual combina mais com o seu bolso.",
                "conteudo": "Na hora de financiar um imóvel, uma das decisões mais importantes é a escolha do sistema de amortização.\n\nNo Sistema de Amortização Constante (SAC), as parcelas começam mais altas e diminuem ao longo do tempo, pois a amortização do saldo devedor é fixa. No fim do contrato, o total de juros pago costuma ser menor.\n\nNa Tabela PRICE, a parcela é sempre a mesma do começo ao fim, o que facilita o planejamento mensal. Em compensação, o total de juros pagos é maior.\n\nRegra prática: se você consegue arcar com parcelas iniciais maiores, o SAC economiza dinheiro no longo prazo. Se prefere previsibilidade, a PRICE pode ser a melhor escolha.\n\nUse a nossa Calculadora de Financiamento para simular as duas opções com os seus números.",
                "capa": B1,
                "publicado": True,
                "criado_em": agora,
            },
            {
                "titulo": "5 sinais de que é hora de trocar de imóvel",
                "slug": "5-sinais-de-que-e-hora-de-trocar-de-imovel",
                "resumo": "A família cresceu, o trabalho mudou, o bairro já não atende? Veja os sinais mais comuns de que chegou a hora da mudança.",
                "conteudo": "Trocar de imóvel é uma decisão grande, mas alguns sinais tornam a escolha mais clara.\n\n1. A família mudou de tamanho: filhos que chegaram (ou saíram de casa) transformam as necessidades de espaço.\n\n2. O deslocamento virou um problema: horas no trânsito custam qualidade de vida todos os dias.\n\n3. O imóvel exige reformas constantes: quando a manutenção pesa, vender pode ser mais negócio.\n\n4. O bairro não acompanha mais seu estilo de vida: comércio, escolas e lazer importam.\n\n5. Seu patrimônio pode render mais: em alguns casos, vender e realocar o valor é a decisão mais inteligente.\n\nConverse com um de nossos corretores para avaliar o seu caso sem compromisso.",
                "capa": B2,
                "publicado": True,
                "criado_em": agora,
            },
            {
                "titulo": "Documentos necessários para comprar um imóvel",
                "slug": "documentos-necessarios-para-comprar-um-imovel",
                "resumo": "RG, CPF, comprovante de renda... Organize-se com antecedência e acelere a compra do seu imóvel.",
                "conteudo": "Comprar um imóvel envolve burocracia, mas se organizar com antecedência faz toda a diferença.\n\nDocumentos pessoais: RG, CPF, comprovante de estado civil e comprovante de residência.\n\nComprovação de renda: holerites dos últimos 3 meses, declaração de Imposto de Renda e extratos bancários. Autônomos devem reunir declaração do contador.\n\nDocumentos do imóvel: matrícula atualizada, certidões negativas dos vendedores e IPTU quitado.\n\nSe for financiar: o banco fará uma análise de crédito e uma avaliação do imóvel antes de liberar o contrato.\n\nNossa equipe acompanha você em cada etapa, da documentação ao registro em cartório.",
                "capa": B3,
                "publicado": True,
                "criado_em": agora,
            },
        ]
        await db.posts.insert_many(posts)

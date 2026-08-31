# PRD — Plataforma Imobiliária (Site + CMS + CRM + IA)

## Problema (declaração original)
Plataforma imobiliária para uso de UMA imobiliária com MÚLTIPLOS corretores (não
multi-tenant, sem venda de planos — pacote único: Site + CMS + CRM + IA). Interface
100% em português do Brasil, sem termos em inglês. Stack: React + TypeScript +
Tailwind + shadcn/ui + Lucide + Recharts; FastAPI + MongoDB (Motor); JWT próprio com
bcrypt.

## Personas
- **Administrador (dono):** acesso total, gestão de usuários e configurações críticas.
- **Gestor:** tudo, exceto criar/editar administradores e configurações críticas.
- **Corretor (editor):** CRUD dos próprios imóveis e leads atribuídos; sem configurações.

## Arquitetura
- Backend modular: `server.py` (app/seed), `database.py` (validators $jsonSchema +
  índices), `models.py` (Pydantic, PyObjectId/BaseDocument), `security.py` (bcrypt +
  JWT), `deps.py` (`obter_usuario_atual` + `exigir_papeis` — RBAC por endpoint,
  substituindo RLS), `routes_auth.py`, `routes_users.py`, `email_service.py`.
- Frontend TS: `AuthContext`, `ProtectedRoute` (guard por papel), `PainelLayout`
  (sidebar escura com espaço de logomarca em destaque h-24), páginas Login /
  EsqueciSenha / RedefinirSenha / Inicio / Usuarios, `ui-kit.ts` (re-exports tipados
  dos shadcn .jsx), `lib/api.ts` (axios + refresh automático em 401).
- Design: Luxury/Swiss (sidebar stone-950, conteúdo stone-50, Manrope + DM Sans),
  diretrizes em `/app/design_guidelines.json`.

## Implementado (Fase 1 — 31/08/2026)
- 9 coleções MongoDB com validators $jsonSchema + coleções de auth (TTL).
- Auth JWT (access 1h, refresh 7d, cookies httpOnly), brute-force lockout,
  esqueci/redefinir senha com e-mail via proxy Emergent.
- RBAC admin/gestor/corretor por dependência em cada endpoint; gestão de usuários.
- Testes: 24/24 backend + 19/19 frontend aprovados (iteration_1).

## Implementado (Fase 2 — 31/08/2026)
- **Site público completo** (layout com header configurável via CMS, drawer mobile,
  rodapé com redes sociais e textos editáveis): Início (busca avançada, destaques,
  depoimentos, carrossel "recomendados" com destaques recentes — IA na Fase 6),
  catálogo /imoveis (filtros tipo/finalidade/bairro/quartos/preço, grade/lista,
  ordenação, paginação), detalhe /imoveis/:slug (galeria, vídeo YouTube/arquivo,
  mapa Leaflet+OpenStreetMap sem chave — círculo de ~700m quando
  exibir_endereco_exato=falso, nunca pino exato; checklist de lazer; formulário de
  contato + agendamento de visita).
- **Captação de leads:** POST /api/leads público com consentimento LGPD obrigatório
  (checkbox vinculado à Política de Privacidade editável via CMS), etapa_crm="Novo",
  atividade criada no CRM, atribuição automática por round-robin atômico entre
  corretores ativos (ou usuário padrão configurável quando desligado).
- **Calculadora SAC/PRICE** em /financiamento (taxa de /api/calculadora/taxa, que lê
  bank_rates ou cai para taxa exemplo 10% a.a.; scraping real na Fase 6).
- **Blog via CMS** (/blog, /blog/:slug + CRUD no painel), **Contato** com mesmo fluxo
  de lead, **Política de Privacidade** editável.
- **Landing pages:** construtor básico no painel (imóvel, slug, título, subtítulo,
  texto, cor de destaque, publicada, domínio customizado) + página pública /lp/:slug;
  seção em Configurações explicando CNAME na Cloudflare em linguagem leiga.
- **Painel:** CRUD de Imóveis (corretor vê só os próprios), Blog, Landing Pages,
  Configurações (identidade/logomarca, redes sociais, textos CMS, round-robin).
- **SEO:** meta tags dinâmicas por imóvel/post (useSeo), JSON-LD RealEstateListing e
  Article, /api/sitemap.xml e /api/robots.txt dinâmicos, URLs amigáveis (slugs).
- **Acessibilidade:** aria-labels, navegação por teclado, alt em imagens, contraste.
- Seeds: 6 imóveis, 3 posts, textos CMS e config padrão da imobiliária.
- **Hardening pós-testes (iteration_2, 28/28 backend + fluxos frontend aprovados):**
  rate-limit de 20 leads/hora por IP em POST /api/leads; incremento do round-robin só
  quando ativo; lat/lng arredondados (~1 km) na API pública quando
  exibir_endereco_exato=false (logradouro/número nunca expostos); PUT /api/site/config
  retorna a config atualizada; link da Política de Privacidade mantido na mensagem de
  sucesso do formulário de lead.

## Implementado (Fase 3 — 31/08/2026)
- **Upload de fotos com object storage Emergent**: POST /api/uploads (auth, imagens até
  10 MB) + GET /api/arquivos/{path} público com cache; componente FotosUploader com
  drag-and-drop, múltiplos arquivos, reordenação (setas + arrastar) e remoção; URL manual
  como alternativa. Primeira foto = capa.
- **"Melhorar com IA"** na descrição do imóvel: botão DESABILITADO enquanto o campo está
  vazio; chama POST /api/ia/melhorar-descricao — **SIMULADO** (retorno de exemplo) até a
  Fase 6, sinalizado com {simulado: true}.
- **Preview do mapa** no formulário de imóvel, respeitando exibir_endereco_exato.
- **Construtor de LP por blocos configuráveis** (hero, características, texto, galeria,
  formulário) com toggles e reordenação; validação front + backend: bloco de formulário
  obrigatório; LP pública renderiza na ordem configurada.
- **CMS (/painel/conteudo)**: banner da home (título/subtítulo/imagem com preview),
  itens de menu, rodapé, redes sociais, depoimentos ("Nome :: Texto"), Política de
  Privacidade — tudo sem código, refletindo no site via GET /api/site/config.
- **Configurações**: logomarca com preview, e-mails de notificação (array validado com
  EmailStr), round-robin, atalho para gestão de usuários, guia Cloudflare.
- Textos de ajuda descritivos para leigos em todos os formulários do painel.
- Hardening pós-testes (iteration_3, 16/16 backend + fluxos frontend aprovados):
  validação server-side do bloco de formulário em LPs, EmailStr em emails_notificacao,
  mensagens 422 em PT-BR, import de ObjectId no topo.

## Backlog priorizado
- **P0 (Fase 3):** CRM Kanban de leads com etapas, activities, gestão dos leads
  recebidos; filtro backend por `corretor_atribuido_id` para role=corretor.
- **P1:** Editor visual avançado de landing pages, upload de mídia (object storage)
  para fotos de imóveis e logomarca.
- **P1:** Integrações de marketing (Meta Pixel/CAPI, Google Ads) e Resend.
- **P2 (Fase 6):** IA via Universal LLM Key (recomendação no carrossel, descrições,
  respostas a leads), scraping real das taxas dos 4 bancos (CEF/Itaú/Bradesco/Inter),
  dashboards com Recharts, domínio customizado efetivo de landing pages.

## Próximas tarefas
1. CRM Kanban: GET /api/leads (com filtro por papel), PATCH etapa, activities.
2. Upload de imagens para fotos de imóveis e logomarca (object storage).
3. Substituir placeholder "SUA LOGOMARCA" pelo asset real em Configurações.

## Observações
- Placeholder "SUA LOGOMARCA" (login/sidebar) é área intencional para o asset real —
  substituir na fase do CMS (`imobiliaria_config.logomarca`).
- Credenciais de teste: `/app/memory/test_credentials.md`.
- Roteiro de testes de auth: `/app/auth_testing.md`.

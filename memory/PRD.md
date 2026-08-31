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

## Implementado (Fase 4 — 31/08/2026)
- **CRM Kanban** (/painel/crm): 7 etapas (Novo, Conversando, Visita, Proposta,
  Negócio Fechado — enum migrado de "Fechado", Perdido, Descartado), drag-and-drop
  nativo com atualização otimista, contadores, busca server-side, cards acessíveis
  por teclado (Enter abre o drawer).
- **Descarte com motivo obrigatório** de lista configurável
  (imobiliaria_config.motivos_descarte, editável em Configurações); validação no
  backend (422 sem motivo ou motivo fora da lista).
- **RBAC no CRM**: GET/PATCH de leads filtrado por corretor_atribuido_id quando
  role=corretor (403 para lead alheio, verificado); reatribuição só admin/gestor.
- **E-mail via Resend (proxy Emergent)**: envio ao corretor responsável + e-mails de
  notificação configurados na criação do lead e na reatribuição; gate de segurança
  (_assert_safe_email) em todo envio; NÃO bloqueia o fluxo (erro vira log).
- **Drawer do lead**: abas Resumo (contato, imóvel, reatribuir), Atividades
  (timeline cronológica + registro manual de anotação/ligação/e-mail) e Insights de
  IA (painel preparado, exemplo de layout — IA real na Fase 6).
- Link direto para o card: /painel/crm?lead={id} (usado no e-mail).
- Hardening pós-testes (iteration_4, 26/26 backend + fluxos frontend aprovados):
  404 uniforme para corretor em lead alheio (anti-enumeração de IDs); mensagens 422
  em PT-BR na criação de atividades; refetch dos motivos de descarte ao abrir o
  diálogo; diálogo de descarte só fecha em sucesso; toast neutro ao reatribuir para
  o mesmo corretor; SheetTitle sr-only no loading do drawer (a11y); colunas do Kanban
  minmax 220px.

## Implementado (Fase 5 — 31/08/2026)
- **Dashboard gerencial** (Visão Geral, /painel) com Recharts: volume de leads por dia
  (AreaChart, dias zerados incluídos), funil por etapa (BarChart horizontal colorido),
  visitas agendadas x realizadas e propostas enviadas x fechadas (BarChart agrupado),
  4 KPIs, comparativo entre corretores (só admin/gestor).
- **Filtros:** período (7/30/90 dias ou todo) e corretor (só admin/gestor).
- **RBAC no endpoint** GET /api/dashboard/metricas: corretor forçado aos próprios
  leads (corretor_id ignorado, por_corretor=null); admin/gestor consolidam e filtram.
- **Tempo real:** auto-refresh a cada 30s + botão Atualizar + carimbo "Atualizado às".
- **Bloco "Insights de negócio com IA"** reservado na tela (badge Fase 6, exemplo).
- Testes: 13/13 backend + 100% frontend (iteration_5); tooltip do gráfico tornado
  robusto a rótulos não-ISO e limite do MVP documentado no endpoint.

## Backlog priorizado
- **P1:** Editor visual avançado de landing pages; upload de logomarca direto em
  Configurações (hoje via URL ou link de upload de imóvel).
- **P1:** Integrações de marketing (Meta Pixel/CAPI, Google Ads) e dashboards com
  Recharts (leads por etapa, origem, corretor).
- **P1:** Auditoria de falhas de e-mail (gravar activity quando envio falhar).
- **P2 (Fase 6):** IA real via Universal LLM Key (insights/sentimento no card do lead,
  melhoria de descrição, recomendação no carrossel), scraping real das taxas dos
  4 bancos (CEF/Itaú/Bradesco/Inter).

## Próximas tarefas
1. Dashboard com Recharts (funil, origem dos leads, produtividade por corretor).
2. Integrações de marketing: Meta Pixel/CAPI e Google Ads (marketing_config).
3. Fase 6: IA (insights de lead, melhoria de descrição, recomendações) e scraping
   de bank_rates.

## Observações
- Placeholder "SUA LOGOMARCA" (login/sidebar) é área intencional para o asset real —
  substituir na fase do CMS (`imobiliaria_config.logomarca`).
- Credenciais de teste: `/app/memory/test_credentials.md`.
- Roteiro de testes de auth: `/app/auth_testing.md`.

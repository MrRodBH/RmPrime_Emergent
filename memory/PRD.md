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

## Implementado (Fase 6 — 01/09/2026)
- **Marketing e Rastreamento** (/painel/marketing, só admin): Meta Pixel ID, token
  CAPI (campo senha), Google Tag ID, scripts customizados de cabeçalho/rodapé —
  tudo com instruções didáticas passo a passo em PT-BR e badges "Configurado".
- Backend `routes_marketing.py`: GET/PUT /api/marketing/config (só admin),
  GET /api/marketing/publico (nunca expõe o token CAPI), `disparar_capi_lead`
  (evento "Lead" na Graph API v21.0 com e-mail/telefone SHA-256, IP, user-agent).
- Deduplicação Pixel/CAPI: FormularioLead gera `evento_id` (UUID) por envio, dispara
  fbq("track","Lead",...,{eventID}) e envia o mesmo ID no POST /api/leads; backend
  grava `evento_id` no lead e o CAPI usa o mesmo `event_id` (BackgroundTask).
- Frontend `lib/tracking.ts` + `components/Rastreamento.tsx` (montado no App):
  injeta Pixel, gtag.js e scripts customizados; pageviews por rota (SPA); cliques
  em wa.me/tel:/mailto: viram evento "Contact"/"contact".
- Correções de compilação TS em tracking.ts (tipagem do stub fbq e textContent
  nullable). Testes manuais aprovados: RBAC (corretor 403), salvar/ler config,
  endpoint público sem token, criação de lead 201 com evento_id, login + tela
  Marketing renderizando com dados persistidos.

## Implementado (Fase 7 — 01/09/2026): IA real + taxas reais
- **IA via Chave Universal Emergent** (`ia_service.py`, streaming acumulado, timeout
  60s): modelo `gemini-2.5-flash` — o flash-lite NÃO está disponível na chave
  (erro "Invalid model name"), flash é a opção econômica mais próxima.
- **Melhorar descrição** (POST /api/ia/melhorar-descricao): recebe texto + campos
  estruturados (título, tipo, bairro, cidade, preço, quartos); prompt proíbe
  inventar fatos. ImovelDialog envia os campos do formulário.
- **Insights do lead** (GET /api/ia/insights-lead/{id}): JSON {sentimento, resumo,
  proximos_passos} a partir de mensagem + até 30 atividades; RBAC idêntico ao CRM
  (corretor 404 em lead alheio). Aba "Insights de IA" no drawer tem "Gerar análise".
- **Insights do dashboard** (GET /api/ia/insights-dashboard?dias=N): compara período
  com o anterior (volume, funil, origens, visitas/propostas/fechados), escopo do
  corretor quando aplicável; bloco na Visão Geral com "Gerar análise".
- **Recomendados por regra** (GET /api/imoveis/recomendados): semente = imóvel atual
  (ou imóveis com leads recentes/destaques); score bairro+3, tipo+2, preço±20%+2,
  quartos+1. Exibido como "Você também pode gostar" no detalhe do imóvel.
  NÃO alimenta o carrossel da home (decisão do usuário: home = destaques).
- **Taxas reais — Banco Central (Olinda taxaJuros/TaxasJurosMensalPorMes)**: sites
  dos bancos bloqueiam scraping (CEF 302, Itaú 403, Inter 404), então a fonte é a
  API oficial do BCB. Mapeamento: reguladas+TR → CEF MCMV; mercado+TR → CEF SBPE e
  demais bancos (modalidade null); data_referencia = 1º dia do mês de referência.
  Delete de fonte=scraping só ocorre se houver inserções (delete seguro).
- **Resiliência**: (a) calculadora usa última taxa válida e exibe "Taxa referente a
  dd/mm/aaaa"; (b) PUT /api/taxas/manual (admin/gestor) sobrepõe o automático;
  (c) GET /api/taxas/status-scraping (só admin) com sucesso/falha/data por banco;
  (d) POST /api/taxas/atualizar-agora (admin/gestor) dispara em background.
- **Cron**: `.emergent/crons.yml` diário "0 11 * * *" UTC (8h Brasília) →
  POST /api/cron/atualizar-taxas com Bearer WEBHOOK_CRON_SECRET (hmac.compare_digest,
  idempotência por run_id em cron_runs, ack imediato + BackgroundTasks).
- **Frontend**: FinanciamentoPage com seletor de banco (CEF padrão) + modalidade
  MCMV/SBPE (só CEF) + sistema; TaxasPage (/painel/taxas, admin/gestor) com tabela
  vigente, formulário manual, "Atualizar agora" e log de status; menu "Taxas".
- Testes: iteration_6 — 20/20 backend + 100% frontend.

## Implementado (Fase 7 — 01/09/2026): Publicação e domínio principal
- **Praça Belo Horizonte/Nova Lima (MG)**: seeds reescritos (6 imóveis demo em
  Savassi, Belvedere, Funcionários, Lourdes, Buritis e Vila da Serra/Nova Lima,
  coordenadas e textos de BH), footer_endereco "Av. do Contorno, 1000 — BH/MG",
  placeholders do frontend (HomePage "Ex.: Savassi", ImovelDialog "Buritis").
  Imóveis demo antigos de SP removidos do banco e resembrados via semear_site().
- **Guia de publicação em Configurações** (card-dominio-principal + card-dominio-lp):
  passo a passo didático completo — Etapa 1 troca de NS no Registro.br (NS são
  atribuídos pela Cloudflare por zona, visíveis em Overview; NS atuais estão no
  Lovable e precisam ser trocados), Etapa 2 domínio customizado no deploy da
  Emergent (rmprimeimoveis.com.br + www, padrão único sem www), Etapa 3 registros
  CNAME/A na Cloudflare (CNAME flattening na raiz, proxy ativo, SSL Full Strict,
  nunca Flexible), Etapa 4 checklist de validação (HTTPS, redirect www, /entrar,
  /lp/slug). Seção de LP separada para subdomínio de tráfego pago (opcional).
- **LPs permanecem em /lp/slug no domínio principal** (decisão do usuário).
- **CORS**: origens agora vêm de FRONTEND_URL + CORS_ORIGINS (env) + domínios de
  produção rmprimeimoveis.com.br (www e raiz) — aviso do deployment_agent resolvido.
- Deployment readiness: PASS (sem bloqueadores).
- PENDENTE (lado do usuário): enviar print do DNS da Cloudflare para conferência;
  executar troca de NS no Registro.br e vínculo do domínio no painel de deploy.

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
1. Aguardar instruções do usuário (ele disse que enviará novas instruções).
2. Backlog conhecido (P1/P2): editor visual avançado de LPs; upload de logomarca
   direto em Configurações; auditoria de falhas de e-mail.

## Observações
- Placeholder "SUA LOGOMARCA" (login/sidebar) é área intencional para o asset real —
  substituir na fase do CMS (`imobiliaria_config.logomarca`).
- Credenciais de teste: `/app/memory/test_credentials.md`.
- Roteiro de testes de auth: `/app/auth_testing.md`.

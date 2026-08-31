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
- 9 coleções MongoDB com validators $jsonSchema: users, properties, leads,
  activities, landing_pages, cms_content, marketing_config, bank_rates,
  imobiliaria_config + coleções de auth (login_attempts, password_reset_tokens,
  password_reset_requests com TTL).
- Auth JWT: login, logout, me, refresh (access 1h, refresh 7d, cookies httpOnly),
  brute-force lockout (5 tentativas/15 min, por IP X-Forwarded-For + e-mail),
  esqueci/redefinir senha (token sha256, uso único, 1h, invalida sessões via
  token_version, e-mail via proxy Emergent).
- RBAC: admin/gestor/corretor validado por dependência em cada endpoint; gestor não
  cria/edita admin; corretor sem acesso à gestão de usuários (403).
- Gestão de usuários: listar, buscar, criar, editar (incl. senha opcional),
  ativar/desativar com confirmação; seed idempotente de admin + gestor + corretor.
- Variáveis de fases futuras pré-criadas (RESEND_API_KEY, GOOGLE_MAPS_API_KEY,
  META_PIXEL_ID, META_CAPI_TOKEN, GOOGLE_ADS_ID) e documentadas no README.
- Testes: 24/24 backend + 19/19 frontend aprovados (iteration_1).

## Backlog priorizado
- **P0 (Fase 2):** CRUD de imóveis (galeria de fotos com ordem, endereço + lat/lng,
  corretor responsável), site público com listagem/detalhe do imóvel.
- **P0 (Fase 2):** CRM Kanban de leads com etapas, activities, round-robin de
  atribuição, filtro backend por `corretor_atribuido_id` para role=corretor.
- **P1:** CMS (cms_content), editor de landing pages, calculadora de financiamento
  com bank_rates (scraping/manual).
- **P1:** Integrações de marketing (Meta Pixel/CAPI, Google Ads) e Resend.
- **P2:** IA via Universal LLM Key (descrições de imóveis, respostas a leads),
  dashboards com Recharts, upload de mídia (object storage), domínio customizado de
  landing pages.

## Próximas tarefas
1. Modelos Pydantic + rotas `/api/imoveis` (CRUD com RBAC: corretor só os próprios).
2. Upload de fotos (object storage) e galeria ordenada.
3. Site público de vitrine + formulário de lead com consentimento LGPD.

## Observações
- Placeholder "SUA LOGOMARCA" (login/sidebar) é área intencional para o asset real —
  substituir na fase do CMS (`imobiliaria_config.logomarca`).
- Credenciais de teste: `/app/memory/test_credentials.md`.
- Roteiro de testes de auth: `/app/auth_testing.md`.

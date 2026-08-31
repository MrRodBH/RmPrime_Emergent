# Plataforma Imobiliária — Site + CMS + CRM + IA

Plataforma completa para UMA imobiliária com múltiplos corretores. Interface 100% em
português do Brasil.

## Stack

- **Frontend:** React + TypeScript, Tailwind CSS, shadcn/ui, Lucide React, Recharts
- **Backend:** FastAPI (Python) + MongoDB (Motor, async)
- **Autenticação:** JWT próprio (access token de 1h + refresh token de 7 dias) com hash
  bcrypt e cookies httpOnly

## Papéis (RBAC)

| Papel | Permissões |
|---|---|
| `admin` (Administrador) | Acesso total, inclusive configurações críticas e gestão de administradores |
| `gestor` (Gestor) | Tudo, exceto criar/editar administradores e configurações críticas de sistema/integrações |
| `corretor` (Corretor/Editor) | CRUD dos próprios imóveis e leads atribuídos a ele; sem acesso a configurações |

O controle é feito por **middleware/dependência no backend** (`exigir_papeis` em
`backend/deps.py`), validado em CADA endpoint sensível — substitui o RLS do Postgres.
Quando o CRM for implementado, toda query de leads será filtrada por
`corretor_atribuido_id` quando o usuário logado for `corretor`.

## Estrutura

```
/app
├── backend/
│   ├── server.py          # App FastAPI, seed de usuários, startup
│   ├── database.py        # Conexão MongoDB + validadores ($jsonSchema) + índices
│   ├── models.py          # Modelos Pydantic (PyObjectId/BaseDocument)
│   ├── security.py        # bcrypt + JWT (access 1h, refresh 7d) + cookies
│   ├── deps.py            # obter_usuario_atual + exigir_papeis (RBAC)
│   ├── routes_auth.py     # login, logout, me, refresh, esqueci/redefinir senha
│   ├── routes_users.py    # CRUD de usuários (admin/gestor)
│   └── email_service.py   # E-mail de redefinição de senha (proxy Emergent)
├── frontend/
│   └── src/
│       ├── App.tsx, index.js
│       ├── contexts/AuthContext.tsx
│       ├── components/ (ProtectedRoute, UsuarioDialog, ui/ shadcn)
│       ├── layouts/PainelLayout.tsx   # Sidebar + cabeçalho (espaço da logomarca)
│       ├── pages/ (Login, EsqueciSenha, RedefinirSenha, Inicio, Usuarios)
│       └── lib/api.ts                 # axios com cookies + refresh automático
└── README.md
```

## Variáveis de ambiente (backend/.env)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `MONGO_URL` | Sim | String de conexão do MongoDB (pré-configurada) |
| `DB_NAME` | Sim | Nome do banco (pré-configurada) |
| `JWT_SECRET` | Sim | Segredo para assinar os tokens JWT |
| `ADMIN_EMAIL` | Sim | E-mail do administrador inicial (seed idempotente) |
| `ADMIN_PASSWORD` | Sim | Senha do administrador inicial |
| `FRONTEND_URL` | Sim | Origem pública do frontend (CORS + link de redefinição de senha) |
| `EMERGENT_EMAIL_KEY` | Fase 1 | Chave do proxy de e-mail (redefinição de senha) |
| `EMAIL_FROM_NAME` | Fase 1 | Nome do remetente dos e-mails transacionais |
| `CORS_ORIGINS` | Sim | Origens permitidas (legado do template) |
| `RESEND_API_KEY` | Fase seguinte | E-mails transacionais gerais (notificações de leads etc.) |
| `GOOGLE_MAPS_API_KEY` | Fase seguinte | Mapas, autocomplete de endereço e geocodificação dos imóveis |
| `META_PIXEL_ID` | Fase seguinte | ID do Pixel da Meta (rastreamento de conversões) |
| `META_CAPI_TOKEN` | Fase seguinte | Token da Conversions API da Meta (eventos server-side) |
| `GOOGLE_ADS_ID` | Fase seguinte | ID de conversão do Google Ads |

As variáveis de fases futuras já estão criadas (vazias) em `backend/.env`.

### Inteligência Artificial (fases futuras)

As chamadas de IA usarão a **Universal LLM Key do Emergent** (integração nativa) —
não há gerenciamento de chave própria neste projeto.

## Credenciais de acesso

Ver `memory/test_credentials.md`.

## Rodando localmente

Os serviços são gerenciados pelo supervisor (hot reload ativo):

```bash
sudo supervisorctl restart backend   # após mudar .env ou instalar deps
sudo supervisorctl restart frontend
```

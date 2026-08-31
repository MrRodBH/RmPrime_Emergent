# Roteiro de testes de autenticação

Credenciais em `/app/memory/test_credentials.md`.

## 1. Verificação no MongoDB
```
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {senha_hash: 1})
```
Verificar: hash bcrypt começa com `$2b$`; índices em users.email (único),
login_attempts.identifier, login_attempts.email, password_reset_tokens.expires_at (TTL),
password_reset_tokens.token_hash (único), password_reset_requests.email,
password_reset_requests.created_at (TTL).

## 2. API
```
curl -c cookies.txt -X POST <API>/api/auth/login -H "Content-Type: application/json" -d '{"email":"rodolfovaz882@gmail.com","password":"Admin@123"}'
curl -b cookies.txt <API>/api/auth/me
```
Login deve retornar o usuário e definir cookies `access_token` + `refresh_token`. `/me` retorna o mesmo usuário.

## 3. Redefinição de senha

**Antes de tudo:** defina `FRONTEND_URL="http://localhost:3000"` em `/app/backend/.env` e
`sudo supervisorctl restart backend`. Isso faz o link de redefinição ser gravado no log do
backend (única forma de obter o token de teste). **Restaure o valor https e reinicie ao final.**

1. Crie uma conta de teste via gestão de usuários ou use `corretor.teste@imobiliaria.com.br`.
2. Paridade anti-enumeração: `forgot-password` para e-mail cadastrado e não cadastrado
   devem retornar status e corpo idênticos (`{"mensagem":"Se este e-mail estiver cadastrado..."}`).
   No mongosh, confirme que só o e-mail cadastrado gerou documento em `password_reset_tokens`
   com `token_hash` de 64 caracteres (token bruto nunca armazenado).
3. Complete a redefinição com o link do log: a nova senha entra, a antiga não, e reutilizar
   o mesmo link falha.
4. Throttle: 6 requisições de forgot-password para um e-mail novo — só as 5 primeiras criam
   token; todas as respostas HTTP seguem idênticas (200 genérico).
5. Bloqueio: erre o login 5 vezes (lockout de 15 min), redefina a senha e faça login com a
   nova senha — deve entrar imediatamente (o reset limpa o lockout por e-mail).

## 4. RBAC
- `corretor` acessando `GET /api/usuarios` → 403.
- `gestor` tentando criar/editar usuário com papel `admin` → 403.
- Usuário não autenticado → 401.

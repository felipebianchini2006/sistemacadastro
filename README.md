# sistemacadastro

Monorepo pnpm com frontend (Next.js App Router) e backend (Nest.js), mais pacotes compartilhados.

## Estrutura

- apps/web - Next.js (wizard e acompanhamento)
- apps/api - Nest.js (API e integrações)
- packages/shared - tipos, schemas zod e utils
- packages/eslint-config - config compartilhada (opcional)
- docs/architecture.md - ADRs, backlog e contratos

## Requisitos

- Node.js 20+ (testado com 22)
- pnpm
- Docker + Docker Compose

## Docker (stack completa)

Sube Web + API + Worker + Postgres + Redis + MinIO com um comando.

1. Opcional: copiar arquivo de variaveis para customizar URLs e segredos

```bash
copy .env.docker.example .env
```

2. Build e subida completa

```bash
docker compose up --build -d
```

3. Acompanhar logs

```bash
docker compose logs -f api web worker
```

4. Parar stack

```bash
docker compose down
```

Observacoes para VPS:

- Ajuste `NEXT_PUBLIC_API_BASE_URL` para a URL publica da API (ex: `http://SEU_IP:3001`).
- Ajuste `S3_PUBLIC_ENDPOINT` para a URL publica do MinIO (ex: `http://SEU_IP:9000`).
- Ajuste `CORS_ORIGINS` para a URL publica do Web (ex: `http://SEU_IP:3000`).
- A API executa `prisma migrate deploy` automaticamente ao iniciar o container.
- `postgres`, `redis` e console do `minio` ficam expostos apenas em `127.0.0.1` por padrao (hardening).

## Desenvolvimento local (sem container para apps)

1. Instalar dependencias

```bash
pnpm install
```

2. Subir apenas infraestrutura (Postgres, Redis, MinIO)

```bash
docker compose up -d postgres redis minio minio-init
```

3. Copiar envs das apps

```bash
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env
```

4. Rodar em modo dev

```bash
pnpm dev
```

## Scripts

- `pnpm dev` - sobe web e api em paralelo
- `pnpm build` - build de todos os pacotes
- `pnpm test` - testes (se houver)
- `pnpm lint` - lint em todos os pacotes
- `pnpm format` - prettier em todo o repo

## Portas default

- Web: http://localhost:3000
- API: http://localhost:3001
- Postgres: 5432
- Redis: 6379
- MinIO: http://localhost:9000 (console: 9001)

## Observacoes

- Ajuste as variaveis de ambiente conforme os provedores (Clicksign, Twilio, SendGrid etc.).
- O arquivo `packages/contracts/openapi.yaml` eh o contrato base da API.
- Swagger disponivel em `http://localhost:3001/docs` (quando a API estiver rodando).
- Colecao Postman em `docs/postman_collection.json`.

## ER Diagram (texto)

```
Proposal (1) ── (1) Person
Proposal (1) ── (1) Address
Proposal (1) ── (N) DocumentFile ── (N) OcrResult
Proposal (1) ── (N) SignatureEnvelope
Proposal (1) ── (N) Notification
Proposal (1) ── (N) StatusHistory
Proposal (1) ── (N) AuditLog
Proposal (1) ── (N) SocialAccount
Proposal (1) ── (N) BankAccount
Proposal (1) ── (1) TotvsSync

AdminUser (1) ── (N) AuditLog
AdminUser (N) ── (N) Role (via AdminUserRole)
Role (N) ── (N) Permission (via RolePermission)
```

Notas:

- `Proposal.protocol` eh humano e unico; acesso publico deve usar `Proposal.publicToken` (nao enumeravel).
- Campos sensiveis ficam em `*_Encrypted` com `*_Hash` para busca.

pnpm -C apps/api dev
pnpm -C apps/web dev
pnpm -C apps/worker dev

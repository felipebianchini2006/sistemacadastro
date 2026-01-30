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

## Setup

1. Instalar dependencias

```bash
pnpm install
```

2. Subir infraestrutura local (Postgres, Redis, MinIO)

```bash
docker compose up -d
```

3. Copiar envs

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

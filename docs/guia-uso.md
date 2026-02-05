# Guia de Uso (Iniciante) - Sistema de Cadastros Online

Este guia explica, passo a passo, como instalar, configurar e usar o sistema em ambiente local. Ele foi escrito para quem nunca rodou o projeto antes.

**Resumo do que existe no monorepo**

- `apps/web`: frontend (Next.js) que o usuario final e o backoffice acessam.
- `apps/api`: backend (Nest.js) com a API REST e integracoes.
- `apps/worker`: processador assincrono de filas (BullMQ).
- `packages/shared`: tipos, schemas e validadores compartilhados.

**Portas padrao**

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Postgres: `5432`
- Redis: `6379`
- MinIO: `http://localhost:9000` (console `9001`)

**Guia rapido (TL;DR)**

1. Instale Node 20+ e pnpm.
2. `pnpm install`
3. `docker compose up -d`
4. Copie os `.env.example` para `.env` e ajuste.
5. `pnpm -C apps/api db:migrate`
6. `pnpm -C apps/api db:seed`
7. `pnpm dev`

## Pre-requisitos

- Node.js 20+ (testado com 22)
- pnpm
- Docker + Docker Compose

## Instalacao do zero

1. Instale dependencias:

```bash
pnpm install
```

2. Suba a infraestrutura local (Postgres, Redis, MinIO):

```bash
docker compose up -d
```

3. Copie os arquivos de variaveis de ambiente:

```bash
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env
```

4. Ajuste as variaveis (veja a proxima secao).

5. Rode as migrations do banco:

```bash
pnpm -C apps/api db:migrate
```

6. Crie dados iniciais (admin e roles):

```bash
pnpm -C apps/api db:seed
```

7. Suba os servicos em modo dev:

```bash
pnpm dev
```

Se preferir rodar separadamente:

```bash
pnpm -C apps/api dev
pnpm -C apps/web dev
pnpm -C apps/worker dev
```

## Variaveis de ambiente

### Onde configurar

- API: `apps/api/.env`
- Web: `apps/web/.env`
- Worker: em desenvolvimento, ele le o mesmo `apps/api/.env` automaticamente.

### Como gerar a chave de criptografia

`DATA_ENCRYPTION_KEY` precisa ter 32 bytes em base64. Gere com Node:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Cole o resultado em `DATA_ENCRYPTION_KEY`.

### API (`apps/api/.env`) - minimo para rodar local

Este bloco costuma ser suficiente para desenvolvimento local com Docker:

```env
NODE_ENV=development
PORT=3001

DATABASE_URL=postgresql://sistemacadastro:123456@localhost:5432/sistemacadastro
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=dev-access-secret
JWT_REFRESH_SECRET=dev-refresh-secret
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

DATA_ENCRYPTION_KEY=<cole_a_chave_base64>

CORS_ORIGINS=http://localhost:3000
CORS_ALLOW_CREDENTIALS=true

CSRF_ENABLED=true
CSRF_COOKIE_NAME=csrf_token
CSRF_HEADER_NAME=x-csrf-token

ADMIN_SEED_EMAIL=admin@sistemacadastro.local
ADMIN_SEED_PASSWORD=Admin123!

S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minio
S3_SECRET_KEY=minio123
S3_BUCKET=sistemacadastro
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true

UPLOAD_PRESIGN_TTL_SECONDS=300
UPLOAD_MAX_SIZE_MB=10
UPLOAD_MIN_WIDTH=600
UPLOAD_MIN_HEIGHT=600
```

### API (`apps/api/.env`) - outras variaveis importantes

Use os valores do `apps/api/.env.example` e ajuste conforme o provedor. Abaixo esta a explicacao do que cada grupo faz.

**Seguranca e autenticacao**

| Variavel              | Para que serve                 | Observacao         |
| --------------------- | ------------------------------ | ------------------ |
| `JWT_ACCESS_SECRET`   | Assina o access token do admin | Trocar em producao |
| `JWT_REFRESH_SECRET`  | Assina o refresh token         | Trocar em producao |
| `JWT_ACCESS_TTL`      | Expiracao do access token      | Ex: `15m`          |
| `JWT_REFRESH_TTL`     | Expiracao do refresh token     | Ex: `7d`           |
| `DATA_ENCRYPTION_KEY` | Criptografia AES-256-GCM       | 32 bytes base64    |
| `KMS_KEY_ID`          | KMS para envelope encryption   | Opcional           |
| `KMS_REGION`          | Regiao do KMS                  | Opcional           |
| `KMS_ENDPOINT`        | Endpoint do KMS                | Opcional           |
| `VAULT_ADDR`          | HashiCorp Vault                | Opcional           |
| `VAULT_TOKEN`         | Token do Vault                 | Opcional           |

**CORS e CSRF**

| Variavel                 | Para que serve         | Observacao            |
| ------------------------ | ---------------------- | --------------------- |
| `CORS_ORIGINS`           | Origens permitidas     | Separe por virgula    |
| `CORS_ALLOW_CREDENTIALS` | Cookies em CORS        | `true` ou `false`     |
| `CSRF_ENABLED`           | Protecao CSRF no admin | `true` ou `false`     |
| `CSRF_COOKIE_NAME`       | Nome do cookie CSRF    | Padrao `csrf_token`   |
| `CSRF_HEADER_NAME`       | Header CSRF            | Padrao `x-csrf-token` |

**Storage S3 (MinIO em dev)**

| Variavel              | Para que serve | Observacao                     |
| --------------------- | -------------- | ------------------------------ |
| `S3_ENDPOINT`         | Endpoint do S3 | `http://localhost:9000` em dev |
| `S3_ACCESS_KEY`       | Access key     | MinIO: `minio`                 |
| `S3_SECRET_KEY`       | Secret key     | MinIO: `minio123`              |
| `S3_BUCKET`           | Bucket         | `sistemacadastro`              |
| `S3_REGION`           | Regiao         | `us-east-1`                    |
| `S3_FORCE_PATH_STYLE` | Path-style     | `true` no MinIO                |

**Uploads**

| Variavel                     | Para que serve | Observacao  |
| ---------------------------- | -------------- | ----------- |
| `UPLOAD_PRESIGN_TTL_SECONDS` | TTL do upload  | Em segundos |
| `UPLOAD_MAX_SIZE_MB`         | Tamanho maximo | Em MB       |
| `UPLOAD_MIN_WIDTH`           | Largura minima | Em px       |
| `UPLOAD_MIN_HEIGHT`          | Altura minima  | Em px       |

**Consentimento e privacidade**

| Variavel                 | Para que serve          | Observacao                    |
| ------------------------ | ----------------------- | ----------------------------- |
| `CONSENT_VERSION`        | Versao do consentimento | Atualize quando o texto mudar |
| `PRIVACY_POLICY_VERSION` | Versao da politica      | Atualize quando mudar         |

**Observabilidade**

| Variavel                      | Para que serve    | Observacao                |
| ----------------------------- | ----------------- | ------------------------- |
| `METRICS_ENABLED`             | Ativa `/metrics`  | `true` ou `false`         |
| `METRICS_PATH`                | Path das metricas | Ex: `/metrics`            |
| `OTEL_ENABLED`                | Ativa tracing     | `true` ou `false`         |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Endpoint OTLP     | Obrigatorio se OTEL ativo |

**Retencao e manutencao**

| Variavel                       | Para que serve        | Observacao            |
| ------------------------------ | --------------------- | --------------------- |
| `RETENTION_DAYS_DRAFTS`        | Rascunhos             | Em dias               |
| `RETENTION_DAYS_AUDIT_LOGS`    | Logs de auditoria     | Em dias               |
| `RETENTION_DAYS_NOTIFICATIONS` | Notificacoes          | Em dias               |
| `RETENTION_DAYS_DOCUMENTS`     | Documentos            | Em dias               |
| `BACKUP_COMMAND`               | Comando de backup     | Executado pelo worker |
| `BACKUP_CRON`                  | Agendamento do backup | Ex: `0 3 * * *`       |

**Assinatura (Clicksign)**

| Variavel                          | Para que serve                 | Observacao                             |
| --------------------------------- | ------------------------------ | -------------------------------------- |
| `CLICKSIGN_ACCESS_TOKEN`          | Token da Clicksign             | Obrigatorio para assinatura            |
| `CLICKSIGN_BASE_URL`              | URL base                       | `https://sandbox.clicksign.com` em dev |
| `CLICKSIGN_WEBHOOK_SECRET`        | Assinatura de webhook          | Trocar em producao                     |
| `CLICKSIGN_AUTH_METHOD`           | Metodo                         | `email`, `sms` ou `whatsapp`           |
| `SIGNATURE_DEADLINE_DAYS`         | Prazo para assinar             | Em dias                                |
| `SIGNATURE_INTERNAL_REQUIRED`     | Assinatura interna             | `true` ou `false`                      |
| `SIGNATURE_INTERNAL_SIGNER_NAME`  | Nome do signatario interno     | Se habilitado                          |
| `SIGNATURE_INTERNAL_SIGNER_EMAIL` | Email do signatario interno    | Se habilitado                          |
| `SIGNATURE_INTERNAL_SIGNER_PHONE` | Telefone do signatario interno | Se habilitado                          |

**OCR (Google Vision)**

| Variavel                      | Para que serve           | Observacao      |
| ----------------------------- | ------------------------ | --------------- |
| `GOOGLE_CLOUD_VISION_API_KEY` | Chave API (se usar REST) | Em prod use ADC |
| `OCR_MIN_WIDTH`               | Largura minima           | Em px           |
| `OCR_MIN_HEIGHT`              | Altura minima            | Em px           |
| `OCR_MIN_BYTES`               | Tamanho minimo           | Em bytes        |
| `OCR_DIVERGENCE_THRESHOLD`    | Divergencia aceitavel    | Ex: `0.2`       |

**Email (SendGrid)**

| Variavel                      | Para que serve          | Observacao             |
| ----------------------------- | ----------------------- | ---------------------- |
| `SENDGRID_API_KEY`            | API key                 | Obrigatorio para email |
| `SENDGRID_FROM`               | Remetente               | Ex: `no-reply@...`     |
| `SENDGRID_WEBHOOK_PUBLIC_KEY` | Webhook signature       | Trocar em producao     |
| `SENDGRID_TEMPLATE_*`         | Templates transacionais | IDs do SendGrid        |

**SMS/WhatsApp (Twilio)**

| Variavel                      | Para que serve    | Observacao                    |
| ----------------------------- | ----------------- | ----------------------------- |
| `TWILIO_ACCOUNT_SID`          | Conta Twilio      | Obrigatorio para SMS/WhatsApp |
| `TWILIO_AUTH_TOKEN`           | Token Twilio      | Obrigatorio                   |
| `TWILIO_FROM`                 | Numero principal  | Ex: `+1555...`                |
| `TWILIO_SMS_FROM`             | Numero SMS        | Opcional                      |
| `TWILIO_VERIFY_SERVICE_SID`   | Verify service    | Para OTP                      |
| `TWILIO_WHATSAPP_CONTENT_SID` | Template WhatsApp | Opcional                      |

**SLA e links publicos**

| Variavel                   | Para que serve                 | Observacao                                    |
| -------------------------- | ------------------------------ | --------------------------------------------- |
| `SLA_DAYS`                 | SLA geral                      | Em dias                                       |
| `MIGRATION_SLA_DAYS`       | SLA migracao                   | Em dias                                       |
| `SLA_DUE_SOON_HOURS`       | Aviso de SLA                   | Em horas                                      |
| `AUTO_ASSIGN_ANALYST`      | Atribuicao automatica          | `true` ou `false`                             |
| `PUBLIC_TRACKING_BASE_URL` | Link publico de acompanhamento | Em dev use `http://localhost:3000/acompanhar` |
| `PUBLIC_CADASTRO_BASE_URL` | Link publico de cadastro       | Em dev use `http://localhost:3000/cadastro`   |

**Notificacoes internas**

| Variavel                   | Para que serve | Observacao          |
| -------------------------- | -------------- | ------------------- |
| `TEAM_NOTIFICATION_EMAILS` | Emails do time | Separar por virgula |

**Push notifications (Web Push)**

| Variavel            | Para que serve      | Observacao             |
| ------------------- | ------------------- | ---------------------- |
| `VAPID_PUBLIC_KEY`  | Chave publica VAPID | Necessaria para push   |
| `VAPID_PRIVATE_KEY` | Chave privada VAPID | Necessaria para push   |
| `VAPID_SUBJECT`     | Contato VAPID       | Ex: `mailto:admin@...` |

**Integracao ERP (TOTVS)**

| Variavel               | Para que serve     | Observacao                  |
| ---------------------- | ------------------ | --------------------------- |
| `TOTVS_BASE_URL`       | URL base do TOTVS  | Obrigatorio para integracao |
| `TOTVS_TOKEN`          | Token              | Obrigatorio                 |
| `TOTVS_WEBHOOK_SECRET` | Assinatura webhook | Trocar em producao          |
| `TOTVS_TIMEOUT_MS`     | Timeout            | Em ms                       |
| `TOTVS_CONCURRENCY`    | Concorrencia       | Numero de jobs              |

**OAuth social (Spotify/YouTube/Facebook/Instagram)**

| Variavel                    | Para que serve     | Observacao                |
| --------------------------- | ------------------ | ------------------------- |
| `SOCIAL_OAUTH_STATE_SECRET` | Assina o state     | Trocar em producao        |
| `SOCIAL_STATE_TTL_MINUTES`  | TTL do state       | Em minutos                |
| `SOCIAL_REDIRECT_*`         | URLs de retorno    | Ajuste para o seu dominio |
| `SPOTIFY_CLIENT_ID`         | OAuth Spotify      | Opcional                  |
| `SPOTIFY_CLIENT_SECRET`     | OAuth Spotify      | Opcional                  |
| `SPOTIFY_REDIRECT_URI`      | Callback Spotify   | Obrigatorio se usar       |
| `YOUTUBE_CLIENT_ID`         | OAuth YouTube      | Opcional                  |
| `YOUTUBE_CLIENT_SECRET`     | OAuth YouTube      | Opcional                  |
| `YOUTUBE_REDIRECT_URI`      | Callback YouTube   | Obrigatorio se usar       |
| `FACEBOOK_APP_ID`           | OAuth Facebook     | Opcional                  |
| `FACEBOOK_APP_SECRET`       | OAuth Facebook     | Opcional                  |
| `FACEBOOK_REDIRECT_URI`     | Callback Facebook  | Obrigatorio se usar       |
| `INSTAGRAM_APP_ID`          | OAuth Instagram    | Opcional                  |
| `INSTAGRAM_APP_SECRET`      | OAuth Instagram    | Opcional                  |
| `INSTAGRAM_REDIRECT_URI`    | Callback Instagram | Obrigatorio se usar       |

### Web (`apps/web/.env`)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_CONSENT_VERSION=v1
NEXT_PUBLIC_PRIVACY_VERSION=v1
```

### Worker (`apps/worker`)

Em desenvolvimento, o worker le o `.env` da API automaticamente. Alguns ajustes especificos uteis:

| Variavel                              | Para que serve                     | Observacao                 |
| ------------------------------------- | ---------------------------------- | -------------------------- |
| `GOOGLE_APPLICATION_CREDENTIALS`      | Caminho do JSON da service account | Alternativa ao JSON inline |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | JSON da service account            | Util em dev                |
| `OCR_LIMITER_MAX`                     | Limite do rate                     | Padrao 10                  |
| `OCR_LIMITER_DURATION_MS`             | Janela do rate                     | Padrao 60000               |
| `OCR_CONCURRENCY`                     | Concorrencia                       | Padrao 2                   |
| `NOTIFICATION_CONCURRENCY`            | Concorrencia notificacoes          | Padrao 3                   |
| `WHATSAPP_REQUIRE_OPT_IN`             | Exigir opt-in                      | `true` ou `false`          |
| `SIGNATURE_CONCURRENCY`               | Concorrencia de assinatura         | Padrao 2                   |
| `VAPID_EMAIL`                         | Contato VAPID                      | Worker usa `VAPID_EMAIL`   |

Observacao: a API usa `VAPID_SUBJECT`, mas o worker espera `VAPID_EMAIL`. Se for usar push, defina os dois com o mesmo valor.

## Uso basico

### Acessos

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Swagger: `http://localhost:3001/docs`
- Health check: `http://localhost:3001/health`
- MinIO Console: `http://localhost:9001`

### Login no backoffice

Depois de rodar `pnpm -C apps/api db:seed`, voce pode usar:

- Email: `admin@sistemacadastro.local`
- Senha: `Admin123!`

Tambem sao criados usuarios de teste:

- `admin@email.com` / senha `12345678`
- `analista@email.com` / senha `12345678`

### Fluxo rapido de testes

1. Acesse `http://localhost:3000/cadastro`.
2. Crie uma proposta e envie documentos.
3. Abra o backoffice em `http://localhost:3000/admin` para acompanhar o status.

## Testes, lint e build

```bash
pnpm test
pnpm lint
pnpm format
pnpm build
```

Execucao por app:

```bash
pnpm -C apps/api test
pnpm -C apps/web test
pnpm -C apps/worker test
```

## Dicas e solucao de problemas

- Erro de conexao com banco: verifique se o `docker compose` esta rodando.
- Porta em uso: mude a porta no `.env` e reinicie.
- Upload falhando: confira `S3_*` e se o bucket `sistemacadastro` foi criado no MinIO.
- OCR nao funciona: confirme as credenciais do Google Vision no worker.
- Email/SMS nao chegam: revise chaves de SendGrid e Twilio.

## Links uteis no repositorio

- `docs/runbook.md`: operacoes e manutencao.
- `docs/architecture.md`: visao geral e decisoes de arquitetura.
- `docs/postman_collection.json`: colecao de endpoints.
- `apps/api/prisma/schema.prisma`: schema do banco.

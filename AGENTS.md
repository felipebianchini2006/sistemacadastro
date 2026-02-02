# AGENTS.md - Sistema de Cadastros Online

Este arquivo fornece informações essenciais sobre a arquitetura, tecnologias e convenções do projeto para agentes de codificação AI.

## Visão Geral do Projeto

**Sistema de Cadastros Online** é uma aplicação monorepo para cadastro online (mobile-first) com backoffice, OCR, assinatura eletrônica, integrações externas e conformidade com LGPD.

O projeto é organizado como um monorepo pnpm com três aplicações principais:

- **Web**: Interface do usuário (Next.js App Router)
- **API**: Backend REST (Nest.js)
- **Worker**: Processamento assíncrono de jobs (BullMQ)

## Stack Tecnológica

| Camada         | Tecnologia                                       |
| -------------- | ------------------------------------------------ |
| Frontend       | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend        | Nest.js 11, TypeScript                           |
| Banco de Dados | PostgreSQL 16, Prisma ORM                        |
| Filas          | BullMQ + Redis 7                                 |
| Storage        | S3-compatível (MinIO em dev, AWS S3 em prod)     |
| OCR            | Google Cloud Vision API                          |
| Assinatura     | Clicksign                                        |
| Email          | SendGrid                                         |
| SMS/WhatsApp   | Twilio                                           |
| ERP            | TOTVS (integração REST)                          |

## Estrutura do Monorepo

```
.
├── apps/
│   ├── api/              # Backend Nest.js (porta 3001)
│   │   ├── src/          # Código fonte organizado por módulos
│   │   ├── prisma/       # Schema e migrations do Prisma
│   │   └── test/         # Testes e2e
│   ├── web/              # Frontend Next.js (porta 3000)
│   │   ├── app/          # App Router (páginas e layouts)
│   │   ├── public/       # Assets estáticos
│   │   └── __tests__/    # Testes Jest
│   └── worker/           # Processador de jobs BullMQ
│       └── src/          # Workers e serviços
├── packages/
│   ├── shared/           # Tipos, schemas Zod e validadores
│   └── eslint-config/    # Configuração compartilhada do ESLint
├── docs/                 # Documentação (architecture.md, runbook.md, security-checklist.md)
└── docker-compose.yml    # Infraestrutura local (Postgres, Redis, MinIO)
```

## Comandos Principais

Todos os comandos são executados a partir da raiz do projeto usando pnpm:

```bash
# Instalar dependências
pnpm install

# Desenvolvimento (sobe web, api e worker em paralelo)
pnpm dev

# Desenvolvimento individual
pnpm -C apps/api dev        # API (Nest.js watch mode)
pnpm -C apps/web dev        # Web (Next.js dev server)
pnpm -C apps/worker dev     # Worker (ts-node)

# Build
pnpm build                  # Build de todos os pacotes

# Testes
pnpm test                   # Executa testes em todos os pacotes
pnpm -C apps/api test       # Testes da API (Jest)
pnpm -C apps/web test       # Testes do Web (Jest + Testing Library)

# Lint e Formatação
pnpm lint                   # ESLint em todos os pacotes
pnpm format                 # Prettier em todo o repo

# Banco de Dados (dentro de apps/api)
pnpm -C apps/api db:migrate # Executa migrations
pnpm -C apps/api db:seed    # Popula dados iniciais
```

## Setup de Desenvolvimento

### Pré-requisitos

- Node.js 20+ (testado com 22)
- pnpm
- Docker + Docker Compose

### Passos para Configuração

1. **Instalar dependências**:

   ```bash
   pnpm install
   ```

2. **Subir infraestrutura local**:

   ```bash
   docker compose up -d
   ```

   - Postgres: localhost:5432
   - Redis: localhost:6379
   - MinIO: http://localhost:9000 (console: 9001)

3. **Configurar variáveis de ambiente**:

   ```bash
   copy apps\api\.env.example apps\api\.env
   copy apps\web\.env.example apps\web\.env
   ```

   Ajuste as variáveis conforme necessário.

4. **Executar migrations**:

   ```bash
   pnpm -C apps/api db:migrate
   ```

5. **Iniciar desenvolvimento**:
   ```bash
   pnpm dev
   ```

## Arquitetura da API (Nest.js)

A API está organizada em módulos funcionais:

```
src/
├── admin/           # Endpoints do backoffice (gestão de propostas)
├── auth/            # Autenticação JWT para admin
├── common/          # Utilitários compartilhados (crypto, decorators, guards, filtros)
├── config/          # Configuração centralizada e validação de env vars
├── health/          # Health checks (NestJS Terminus)
├── jobs/            # Enfileiramento de jobs BullMQ
├── maintenance/     # Tarefas agendadas (cleanup, backups)
├── notifications/   # Notificações (OTP, email, SMS, webhooks)
├── observability/   # Métricas Prometheus e tracing OpenTelemetry
├── prisma/          # Serviço Prisma e health check
├── public/          # API pública (wizard, uploads, acompanhamento)
├── signature/       # Integração Clicksign e webhooks
├── storage/         # Serviço S3 (uploads e downloads)
└── totvs/           # Integração com ERP TOTVS
```

### Padrões da API

- **DTOs**: Validados com Zod (schemas definidos em `packages/shared`)
- **Autenticação**:
  - Pública: OTP via Twilio + token curto
  - Admin: JWT (access + refresh tokens) + RBAC
- **Respostas**: Formato Problem Details (RFC 7807)
- **Documentação**: Swagger em `/docs` quando a API está rodando

## Arquitetura do Worker

O worker processa jobs assíncronos via BullMQ:

```
src/
├── maintenance/     # Jobs de manutenção (cleanup, backups)
├── notifications/   # Envio de email, SMS, WhatsApp
├── ocr/             # Processamento OCR com Google Vision
├── services/        # Serviços auxiliares (crypto, storage, vision)
├── signature/       # Integração Clicksign
└── totvs/           # Sincronização com TOTVS
```

### Filas Principais

- `ocr.process`: Processamento de documentos
- `notify.email`, `notify.sms`, `notify.whatsapp`: Notificações
- `maintenance-jobs`: Cleanup e backups
- `totvs.sync`: Sincronização ERP

## Banco de Dados (Prisma)

### Modelos Principais

- **Proposal**: Proposta de cadastro (status workflow)
- **Person**: Dados pessoais (campos sensíveis criptografados)
- **Address**: Endereço
- **DocumentFile**: Arquivos enviados
- **OcrResult**: Resultados do OCR
- **SignatureEnvelope**: Envelopes de assinatura Clicksign
- **Notification**: Notificações enviadas
- **AdminUser**: Usuários do backoffice
- **AuditLog**: Logs de auditoria (LGPD)

### Convenções de Segurança

- Campos sensíveis são armazenados com sufixo `_Encrypted` e `_Hash`
- O `_Hash` é usado para busca (indexado)
- Criptografia via AES-256-GCM com `DATA_ENCRYPTION_KEY`
- Suporte a envelope encryption com AWS KMS

## Frontend (Next.js)

### Estrutura de Rotas (App Router)

```
app/
├── page.tsx                 # Landing page
├── layout.tsx               # Root layout
├── cadastro/                # Wizard de cadastro (4 etapas)
├── acompanhar/              # Página de acompanhamento por protocolo
├── privacidade/             # Política de privacidade
├── admin/                   # Backoffice
│   ├── login/               # Login admin
│   ├── page.tsx             # Dashboard
│   └── propostas/           # Gestão de propostas
│       └── [id]/            # Detalhe da proposta
├── components/              # Componentes compartilhados
│   └── ui/                  # Componentes de UI (button, etc.)
├── hooks/                   # Custom React hooks
└── lib/                     # Utilitários
```

### Convenções

- **Mobile-first**: Design responsivo focado em mobile
- **Componentes UI**: Baseados em shadcn/ui (quando aplicável)
- **Estado**: React hooks locais, dados via API
- **Formulários**: Autosave local e remoto

## Pacotes Compartilhados

### `@sistemacadastro/shared`

Contém código compartilhado entre frontend e backend:

```
src/
├── validators/      # Validadores (CPF, CEP, email, telefone)
└── index.ts         # Exportações principais e schemas Zod
```

### `@sistemacadastro/eslint-config`

Configuração compartilhada do ESLint usando flat config:

- `@eslint/js` (recommended)
- `typescript-eslint` (recommended)
- `eslint-config-prettier`

## Estilo de Código

### Prettier (`.prettierrc`)

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

### ESLint

- Configuração baseada em `@eslint/js` e `typescript-eslint`
- Prettier integrado para formatação
- Executa automaticamente em pre-commit via husky

### TypeScript

- Target: ES2022
- Module: ESNext
- ModuleResolution: Bundler
- `strict: true` em todos os projetos

## Testes

### API (Jest)

```bash
pnpm -C apps/api test         # Testes unitários
pnpm -C apps/api test:e2e     # Testes end-to-end
pnpm -C apps/api test:cov     # Cobertura
```

### Web (Jest + Testing Library)

```bash
pnpm -C apps/web test         # Testes com jsdom environment
```

### Worker (Jest)

```bash
pnpm -C apps/worker test      # Testes unitários
```

## Segurança

### Checklist Importante

- **Criptografia**: `DATA_ENCRYPTION_KEY` deve ter 32 bytes base64
- **Webhooks**: Verificação de assinatura habilitada (Clicksign, SendGrid, Twilio)
- **CORS**: Restrito via `CORS_ORIGINS`
- **CSRF**: Proteção ativada para rotas `/admin`
- **Rate Limiting**: Throttling aplicado via `@nestjs/throttler`
- **Headers**: `helmet()` habilitado

### Variáveis de Ambiente Sensíveis

- `DATA_ENCRYPTION_KEY`: Chave de criptografia de dados
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`: Segredos JWT
- `CLICKSIGN_WEBHOOK_SECRET`: Validação de webhooks
- `SENDGRID_WEBHOOK_PUBLIC_KEY`: Validação de webhooks
- `TWILIO_AUTH_TOKEN`: Validação de webhooks

## LGPD e Compliance

- **Consentimento**: Logado em `ConsentLog` com versão e timestamp
- **Retenção de dados** (configurável via env vars):
  - Drafts: 7 dias (`RETENTION_DAYS_DRAFTS`)
  - Audit logs: 365 dias (`RETENTION_DAYS_AUDIT_LOGS`)
  - Notificações: 180 dias (`RETENTION_DAYS_NOTIFICATIONS`)
  - Documentos: 365 dias (`RETENTION_DAYS_DOCUMENTS`)
- **PII**: Nunca logada em texto plano; campos sensíveis criptografados

## Observabilidade

- **Health Check**: `/health` (Terminus)
- **Métricas**: `/metrics` (Prometheus, quando `METRICS_ENABLED=true`)
- **Tracing**: OpenTelemetry (quando `OTEL_ENABLED=true`)
- **Logs**: Estruturados com Pino; PII redacionada

## Deploy e Operações

### Portas Padrão

- Web: 3000
- API: 3001
- Postgres: 5432
- Redis: 6379
- MinIO: 9000 (API), 9001 (Console)

### Manutenção

- **Backup**: Configurado via `BACKUP_COMMAND` e `BACKUP_CRON`
- **Cleanup**: Jobs automáticos removem dados expirados diariamente
- **Verificação**: Consulte `docs/runbook.md` para procedimentos operacionais

## Convenções de Nomenclatura

- **Arquivos**: kebab-case para arquivos (ex: `public.controller.ts`)
- **Classes**: PascalCase (ex: `PublicController`)
- **Métodos/Variáveis**: camelCase
- **Constantes**: UPPER_SNAKE_CASE para valores fixos
- **Banco**: snake_case para nomes de tabelas e colunas (Prisma converte automaticamente)

## Integrações Externas

### Clicksign (Assinatura)

- Criação de envelopes
- Webhooks para atualização de status
- Envio de links via WhatsApp

### Google Cloud Vision (OCR)

- Extração de texto de RG/CNH
- Comparação com dados digitados
- Score de confiança

### SendGrid (Email)

- Templates transacionais
- Webhooks de entrega

### Twilio (SMS/WhatsApp)

- OTP para acompanhamento
- Envio de links de assinatura

### TOTVS (ERP)

- Sincronização de propostas aprovadas
- Webhooks para atualizações

## Documentação Adicional

- `docs/architecture.md`: ADRs, backlog, contratos API, diagramas
- `docs/runbook.md`: Procedimentos operacionais
- `docs/security-checklist.md`: Checklist de segurança
- `apps/api/prisma/schema.prisma`: Schema completo do banco

## Notas para Desenvolvedores

1. **Migrations**: Sempre gerar migrations após alterar `schema.prisma`
2. **Env Vars**: Documentar novas variáveis em `.env.example`
3. **Shared Package**: Validadores e schemas Zod devem ir em `packages/shared`
4. **Jobs Assíncronos**: Operações longas (OCR, notificações) devem usar o worker
5. **Criptografia**: Usar `CryptoService` para dados sensíveis
6. **Auditoria**: Ações administrativas devem logar em `AuditLog`

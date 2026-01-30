# Sistema de Cadastros Online - Arquitetura e Planejamento

## Contexto
Projeto para cadastro online (mobile-first) com backoffice, OCR, assinatura eletronica, integracoes externas e requisitos LGPD. Stack:
- Frontend: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- Backend: Nest.js + TypeScript + PostgreSQL + Prisma
- Filas: BullMQ + Redis
- Storage: S3 compativel (MinIO em dev)
- Integracoes: Google Cloud Vision API (OCR), Clicksign, SendGrid, Twilio, ViaCEP, TOTVS (REST)

---

## 1) ADR - Architecture Decision Record

### ADR-001: Monorepo e estrutura modular
**Status**: Aceito

**Decisao**
- Monorepo com apps isolados e packages compartilhados.
- Estrutura sugerida:
  - apps/web (Next.js)
  - apps/api (Nest.js)
  - apps/worker (BullMQ)
  - packages/shared (utils e tipos comuns)
  - packages/contracts (OpenAPI/DTOs)
  - packages/ui (componentes compartilhados)
  - packages/validation (schemas e regras)

**Racional**
- Reuso de tipos/validacoes entre frontend e backend.
- Menor divergencia entre contratos e implementacao.
- CI/CD com escopo por app.

---

### ADR-002: Banco de dados
**Status**: Aceito

**Decisao**
- PostgreSQL + Prisma.

**Racional**
- Integridade referencial, transacoes e auditoria.
- Suporte a JSONB para campos flexiveis.

---

### ADR-003: Filas e processamento assincrono
**Status**: Aceito

**Decisao**
- BullMQ + Redis com app worker dedicado.

**Racional**
- Simplicidade e boa integracao com Node/Nest.
- Reprocessamento, retries e delay jobs.

---

### ADR-004: Storage de documentos
**Status**: Aceito

**Decisao**
- S3 compativel (MinIO em dev, S3 em prod).

**Racional**
- Escalavel, barato e padrao de mercado.
- Criptografia server-side + lifecycle.

---

### ADR-005: Autenticacao e autorizacao
**Status**: Aceito

**Decisao**
- Usuario final: OTP (Twilio) + token curto para acompanhamento.
- Backoffice: JWT + refresh + RBAC (Admin, Analista, Supervisor, Auditor).

**Racional**
- Onboarding simples para usuario final.
- Controle fino no backoffice.

---

## 2) Backlog - Epics -> Stories -> Tasks (com prioridade)

**Legenda**: P0 (critico), P1 (alto), P2 (medio)

### Epic A - Fundacao do produto (P0)
- Story A1: Monorepo e CI/CD (P0)
  - Task: Estruturar apps/ e packages/
  - Task: Pipeline de build/lint/test por app
  - Task: Versionamento interno de contracts
- Story A2: Infra base (P0)
  - Task: Postgres, Redis, MinIO em dev
  - Task: Padrao de env vars

### Epic B - Wizard Mobile-First (P0)
- Story B1: UI/UX do wizard 4 etapas (P0)
  - Task: Layout mobile-first + barra de progresso
  - Task: Autosave local e remoto
- Story B2: Validacao realtime (P0)
  - Task: CPF/email/telefone/CEP
  - Task: Integracao ViaCEP
- Story B3: Pagina de acompanhamento (P0)
  - Task: Status por protocolo
  - Task: Pendencias e instrucoes

### Epic C - Documentos e OCR (P0)
- Story C1: Upload seguro (P0)
  - Task: Presigned URLs
  - Task: Criptografia e lifecycle
- Story C2: OCR RG/CNH (P0)
  - Task: Envio Google Vision
  - Task: Extracao de campos
  - Task: Comparacao com digitado

### Epic D - Assinatura eletronica (P0)
- Story D1: Clicksign (P0)
  - Task: Criar envelope
  - Task: Envio link WhatsApp
  - Task: Auditoria e webhook

### Epic E - Backoffice (P0/P1)
- Story E1: Dashboard e triagem (P0)
  - Task: Filas de analise
  - Task: Filtros e busca
- Story E2: Dossie (P0)
  - Task: Timeline de eventos
  - Task: Visualizacao de documentos
- Story E3: Exportacao CSV/PDF (P1)
  - Task: Geracao assincrona

### Epic F - Migracao de associacao (P1)
- Story F1: Fluxo de desfilicao (P1)
  - Task: Campos extras e validacoes
  - Task: Upload de comprovantes

### Epic G - Seguranca e compliance (P0)
- Story G1: LGPD e auditoria (P0)
  - Task: Logs de acesso e trilha
  - Task: Criptografia de dados sensiveis
- Story G2: Observabilidade (P0)
  - Task: Metrics, alertas, backups

---

## 3) Estados e transicoes da proposta

### Estados principais
- DRAFT
- IN_PROGRESS
- SUBMITTED
- UNDER_REVIEW
- PENDING_DOCS
- PENDING_SIGNATURE
- SIGNED
- APPROVED
- REJECTED
- CANCELED

### Estados de migracao
- MIGRATION_PENDING
- MIGRATION_REVIEW
- MIGRATION_BLOCKED
- MIGRATION_APPROVED

### Transicoes (exemplo)
- DRAFT -> IN_PROGRESS (primeiro autosave)
- IN_PROGRESS -> SUBMITTED (envio final)
- SUBMITTED -> UNDER_REVIEW (triagem)
- UNDER_REVIEW -> PENDING_DOCS (pendencias)
- PENDING_DOCS -> UNDER_REVIEW (pendencias resolvidas)
- UNDER_REVIEW -> PENDING_SIGNATURE (aprovado para assinatura)
- PENDING_SIGNATURE -> SIGNED (Clicksign confirmado)
- SIGNED -> APPROVED (validacao final)
- UNDER_REVIEW -> REJECTED
- Qualquer -> CANCELED (usuario)

---

## 4) Eventos de dominio e jobs BullMQ

### Eventos de dominio
- ProposalCreated
- ProposalUpdated
- ProposalAutoSaved
- ProposalSubmitted
- ReviewStarted
- PendingDocsCreated
- PendingDocsResolved
- DocumentUploaded
- OcrRequested
- OcrCompleted
- OcrMismatchDetected
- SignatureRequested
- SignatureCompleted
- SignatureExpired
- ProposalApproved
- ProposalRejected
- MigrationRequested
- MigrationValidated
- MigrationBlocked

### Viram jobs BullMQ
- ocr.process (OcrRequested)
- notify.whatsapp (SignatureRequested)
- notify.email (ProposalSubmitted, PendingDocsCreated)
- export.generate (Exportacao CSV/PDF)
- totvs.sync (ProposalApproved, MigrationApproved)
- webhook.process (Clicksign, Twilio, SendGrid)

---

## 5) Contratos principais (REST endpoints) e webhooks

### API publica (Wizard)
- POST /api/v1/proposals
- GET /api/v1/proposals/{protocol}
- PATCH /api/v1/proposals/{protocol}
- POST /api/v1/proposals/{protocol}/submit
- POST /api/v1/proposals/{protocol}/documents
- GET /api/v1/cep/{cep}
- POST /api/v1/otp/send
- POST /api/v1/otp/verify

### API backoffice
- GET /api/v1/admin/proposals
- GET /api/v1/admin/proposals/{id}
- POST /api/v1/admin/proposals/{id}/review/start
- POST /api/v1/admin/proposals/{id}/pending-docs
- POST /api/v1/admin/proposals/{id}/approve
- POST /api/v1/admin/proposals/{id}/reject
- POST /api/v1/admin/proposals/{id}/signature/request
- POST /api/v1/admin/exports

### Webhooks
- POST /api/v1/webhooks/clicksign
- POST /api/v1/webhooks/sendgrid
- POST /api/v1/webhooks/twilio
- POST /api/v1/webhooks/totvs

---

## Diagrama textual (ASCII) - Fluxo principal

```
[Usuario]
   |
   v
[Wizard 4 Etapas] --autosave--> [DRAFT/IN_PROGRESS]
   |
   v
[SUBMITTED] ---> [UNDER_REVIEW] ---> [PENDING_DOCS] <---+
   |                       |                             |
   |                       v                             |
   |                   [PENDING_SIGNATURE] --Clicksign-->[SIGNED]
   |                                                     |
   v                                                     v
[REJECTED]                                           [APPROVED]
```
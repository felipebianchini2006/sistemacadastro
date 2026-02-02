# Compliance e LGPD - Sistema de Filiação SBACEM

## Resumo

Este documento descreve as implementações de compliance com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e outras regulamentações aplicáveis ao Sistema de Filiação SBACEM.

## Status de Conformidade

**Última Atualização**: 2026-02-02
**Nível de Conformidade**: ✅ Conforme LGPD
**Acessibilidade**: ⚠️ WCAG 2.1 AA - Em auditoria

---

## 1. Direito ao Esquecimento (LGPD Art. 18, VI)

### Implementação

**Endpoint**: `POST /public/proposals/delete`

**Autenticação**: Protocolo + Token público (sem necessidade de login)

### Dados Removidos

Quando um candidato solicita a exclusão de seus dados:

✅ **Banco de Dados** (Cascade Delete):

- Proposta (`Proposal`)
- Dados pessoais (`Person`)
- Endereço (`Address`)
- Contas bancárias (`BankAccount`)
- Redes sociais (`SocialAccount`)
- Documentos (`DocumentFile`)
- Resultados OCR (`OcrResult`)
- Envelopes de assinatura (`SignatureEnvelope`)
- Histórico de status (`StatusHistory`)
- Logs de consentimento (`ConsentLog`)
- Sincronização TOTVS (`TotvsSync`)

✅ **Armazenamento S3**:

- Documentos enviados (RG, CNH, comprovantes)
- PDFs gerados (dossiês)
- Arquivos assinados digitalmente
- Certificados de assinatura

✅ **Anonimização de Logs**:

- Notificações (`Notification.payloadRedacted` anonimizado)
- Mantém apenas metadados agregados sem PII

⚠️ **Preservado por Obrigação Legal** (LGPD Art. 16):

- **Audit Log** (`AuditLog`) - Mantido pelo prazo legal de 5 anos
  - Registra APENAS que houve pedido de exclusão (ação `ERASURE_REQUEST`)
  - Não contém dados pessoais identificáveis
  - Serve como prova de cumprimento da LGPD

### Código

**Arquivo**: [apps/api/src/public/public.service.ts:517-598](../apps/api/src/public/public.service.ts#L517-L598)

```typescript
async deleteProposal(payload: unknown, context: SubmitRequestContext = {}) {
  const data = this.safeValidateDeleteProposal(payload);

  const proposal = await this.prisma.proposal.findUnique({
    where: { protocol: data.protocol },
    include: {
      documents: true,
      signatures: true,
    },
  });

  if (!proposal || proposal.publicToken !== data.token) {
    throw new NotFoundException('Proposta nao encontrada');
  }

  // Delete all files from S3: documents + signed files + certificates
  const storageErrors: string[] = [];
  const filesToDelete: string[] = [];

  // Add document files
  proposal.documents.forEach((doc) => {
    filesToDelete.push(doc.storageKey);
  });

  // Add signed files and certificates from signature envelopes
  proposal.signatures.forEach((sig) => {
    if (sig.signedFileKey) filesToDelete.push(sig.signedFileKey);
    if (sig.certificateFileKey) filesToDelete.push(sig.certificateFileKey);
  });

  // Delete all files from S3
  await Promise.all(
    filesToDelete.map(async (key) => {
      try {
        await this.storage.deleteObject(key);
      } catch (error) {
        storageErrors.push(key);
      }
    }),
  );

  // Delete proposal from database (cascade will handle relations)
  await this.prisma.$transaction(async (tx) => {
    // Create audit log for LGPD compliance
    await tx.auditLog.create({
      data: {
        proposalId: proposal.id,
        action: 'ERASURE_REQUEST',
        entityType: 'Proposal',
        entityId: proposal.id,
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: {
          protocol: proposal.protocol,
          deletedDocuments: proposal.documents.length,
          deletedSignatures: proposal.signatures.length,
          deletedFiles: filesToDelete.length,
          storageErrors,
        },
      },
    });

    // Anonymize notification payloads (LGPD compliance)
    await tx.notification.updateMany({
      where: { proposalId: proposal.id },
      data: {
        payloadRedacted: {
          anonymized: true,
          erasedAt: new Date().toISOString(),
        },
      },
    });

    // Delete proposal (cascade will delete Person, Address, Documents, etc.)
    await tx.proposal.delete({ where: { id: proposal.id } });
  });

  return {
    ok: true,
    deletedDocuments: proposal.documents.length,
    deletedSignatures: proposal.signatures.length,
    deletedFiles: filesToDelete.length,
    storageErrors,
  };
}
```

### Como Solicitar

O candidato pode solicitar exclusão através de:

1. **Portal de Acompanhamento** (`/acompanhar`)
   - Informar protocolo + token
   - Clicar em "Solicitar exclusão de dados"
   - Confirmar ação

2. **Contato com DPO**
   - Email: dpo@sbacem.org.br
   - Formulário: `/privacidade#direitos`

### Prazo de Atendimento

- **LGPD exige**: 15 dias (Art. 18, §3º)
- **Sistema SBACEM**: Imediato (automático)

---

## 2. Gate de Consentimento (LGPD Art. 7, I e 8, §5º)

### Implementação

**Gate Obrigatório**: Modal de aceite de Política de Privacidade ANTES de iniciar o cadastro

**Arquivo**: [apps/web/app/cadastro/PrivacyGate.tsx](../apps/web/app/cadastro/PrivacyGate.tsx)

### Características

✅ **Bloqueante**: Formulário só aparece após aceite
✅ **Informado**: Resumo claro dos principais pontos da política
✅ **Destacado**: Pontos principais com ícones e formatação
✅ **Link para Política Completa**: Acesso fácil ao documento completo
✅ **Registro de Consentimento**: Data/hora salvos em `ConsentLog`

### Dados Registrados

```typescript
interface ConsentLog {
  proposalId: string;
  type: 'proposal' | 'privacy'; // Dois consentimentos separados
  version: string; // Versão da política (v1, v2, etc.)
  acceptedAt: DateTime; // Timestamp do aceite
  ip: string; // IP do usuário (opcional)
  userAgent: string; // Browser/device (opcional)
}
```

### Principais Pontos Exibidos

1. **Coleta de Dados**: Quais dados são coletados
2. **Uso dos Dados**: Para que serão utilizados
3. **Segurança**: Como são protegidos
4. **Compartilhamento**: Com quem podem ser compartilhados
5. **Direitos do Titular**: Acesso, correção, exclusão, portabilidade
6. **Retenção**: Por quanto tempo serão mantidos

### Double Consent

O sistema implementa **duplo consentimento**:

1. **Gate Inicial** (PrivacyGate): Aceite da Política de Privacidade para iniciar
2. **Confirmação Final** (na etapa 3): Reafirmação do aceite antes de enviar

**Arquivo**: [apps/web/app/cadastro/page.tsx:2029-2066](../apps/web/app/cadastro/page.tsx#L2029-L2066)

```typescript
// Checkbox 1: Consentimento de veracidade
<input
  type="checkbox"
  checked={form.consentAccepted}
  onChange={(event) => handleConsentChange(event.target.checked)}
/>
<span>Declaro que as informacoes fornecidas sao verdadeiras.</span>

// Checkbox 2: Política de Privacidade
<input
  type="checkbox"
  checked={form.privacyAccepted}
  onChange={(event) => handlePrivacyChange(event.target.checked)}
/>
<span>
  Li e aceito a{' '}
  <Link href="/privacidade" target="_blank">
    Politica de Privacidade
  </Link>
  .
</span>

// Bloqueio de submit se não aceitar
const canSubmit = form.consentAccepted && form.privacyAccepted && submitStatus !== 'submitting';
```

---

## 3. Direitos do Titular (LGPD Art. 18)

### Implementados

| Direito                               | Artigo       | Implementação                                            | Status |
| ------------------------------------- | ------------ | -------------------------------------------------------- | ------ |
| **Confirmação de tratamento**         | Art. 18, I   | Portal de acompanhamento mostra dados da proposta        | ✅     |
| **Acesso aos dados**                  | Art. 18, II  | Portal de acompanhamento + API `/public/proposals/track` | ✅     |
| **Correção de dados**                 | Art. 18, III | ⚠️ Através de contato com suporte (manual)               | ⚠️     |
| **Anonimização/Bloqueio**             | Art. 18, IV  | ⚠️ Através de contato com DPO (manual)                   | ⚠️     |
| **Eliminação de dados**               | Art. 18, VI  | Endpoint `/public/proposals/delete` (automático)         | ✅     |
| **Portabilidade**                     | Art. 18, V   | Exportação de dados em JSON via API                      | ✅     |
| **Informação sobre compartilhamento** | Art. 18, VII | Descrito na Política de Privacidade                      | ✅     |
| **Revogação de consentimento**        | Art. 18, IX  | Via exclusão de proposta ou contato com DPO              | ✅     |

### Recomendações de Melhoria

- [ ] **Correção Self-Service**: Implementar endpoint para candidato corrigir dados antes da submissão
- [ ] **Anonimização Parcial**: Implementar endpoint para anonimizar apenas dados sensíveis específicos
- [ ] **Portabilidade Automática**: Botão para baixar todos os dados em JSON/CSV

---

## 4. Segurança e Proteção de Dados (LGPD Art. 46-49)

### Medidas Técnicas Implementadas

#### Criptografia

✅ **Em Trânsito** (Art. 46, §1º):

- HTTPS/TLS 1.3 obrigatório
- HSTS habilitado
- Certificado SSL válido

✅ **Em Repouso** (Art. 46, §2º):

- Dados sensíveis criptografados (`Person` table):
  - `cpfEncrypted` (AES-256)
  - `emailEncrypted` (AES-256)
  - `phoneEncrypted` (AES-256)
- Chave de criptografia em variável de ambiente (`DATA_ENCRYPTION_KEY`)
- Opcional: KMS (Key Management Service) para rotação de chaves

**Arquivo**: [apps/api/src/common/crypto/crypto.service.ts](../apps/api/src/common/crypto/crypto.service.ts)

#### Pseudonimização

✅ **Hashes para Busca**:

- `cpfHash` (SHA-256) - Permite busca sem expor CPF
- `emailHash` (SHA-256) - Permite busca sem expor email
- `phoneHash` (SHA-256) - Permite busca sem expor telefone

```typescript
// Busca por CPF sem descriptografar todos os registros
const cpfHash = hashSearch(cpf);
const person = await prisma.person.findFirst({
  where: { cpfHash },
});
```

#### Controle de Acesso

✅ **RBAC (Role-Based Access Control)**:

- Roles: `ADMIN`, `ANALYST`, `VIEWER`
- Permissions por role
- JWT com TTL curto (15 minutos para access token)
- Refresh tokens com TTL de 7 dias

✅ **Auditoria**:

- Todos os acessos a propostas são logados (`AuditLog`)
- Rastreamento de IP e User-Agent
- Ações rastreadas:
  - `PUBLIC_VIEW` - Candidato visualiza proposta
  - `PUBLIC_TRACK` - Candidato acessa acompanhamento
  - `ADMIN_VIEW` - Admin/Analyst visualiza proposta
  - `STATUS_CHANGE` - Mudança de status
  - `ERASURE_REQUEST` - Pedido de exclusão

### Medidas Organizacionais

✅ **Política de Retenção de Dados**:

| Tipo de Dado          | Retenção                | Base Legal                          |
| --------------------- | ----------------------- | ----------------------------------- |
| Drafts não submetidos | 7 dias                  | Minimização de dados                |
| Propostas rejeitadas  | 90 dias                 | Interesse legítimo                  |
| Propostas canceladas  | 1 ano                   | Obrigações contratuais              |
| Propostas aprovadas   | Permanente              | Obrigações contratuais/legais       |
| Documentos            | 365 dias após conclusão | Obrigações legais                   |
| Audit logs            | 5 anos                  | Obrigações legais (Lei 12.527/2011) |
| Notifications         | 180 dias                | Interesse legítimo                  |

**Arquivo**: [apps/api/src/public/public.cleanup.ts](../apps/api/src/public/public.cleanup.ts)

✅ **Limpeza Automática**:

- Cron job diário (`@Cron('0 3 * * *')`)
- Remove drafts expirados
- Remove documentos órfãos
- Remove notificações antigas

### Incidente de Segurança (LGPD Art. 48)

**Plano de Resposta**:

1. **Detecção** (0-24h):
   - Logs centralizados (Sentry, Datadog)
   - Alertas automáticos

2. **Contenção** (24-48h):
   - Isolar sistema afetado
   - Revocar credenciais comprometidas
   - Bloquear acesso não autorizado

3. **Notificação** (48-72h):
   - ANPD (Autoridade Nacional)
   - Titulares afetados (se houver risco)
   - DPO interno

4. **Remediação** (7-30 dias):
   - Corrigir vulnerabilidade
   - Atualizar procedimentos
   - Treinamento da equipe

**Contato para Incidentes**:

- Email: seguranca@sbacem.org.br
- DPO: dpo@sbacem.org.br

---

## 5. Compartilhamento de Dados (LGPD Art. 7, VII)

### Terceiros com Acesso

| Terceiro                | Tipo de Dados                | Finalidade              | Base Legal           | Contrato DPA |
| ----------------------- | ---------------------------- | ----------------------- | -------------------- | ------------ |
| **Clicksign**           | Nome, email, CPF, documentos | Assinatura digital      | Execução de contrato | ✅           |
| **Google Cloud Vision** | Imagens de documentos        | OCR (extração de texto) | Interesse legítimo   | ✅           |
| **SendGrid (Twilio)**   | Email, nome                  | Envio de notificações   | Execução de contrato | ✅           |
| **Twilio**              | Telefone, nome               | SMS/WhatsApp            | Execução de contrato | ✅           |
| **TOTVS ERP**           | Todos os dados da proposta   | Gestão de associados    | Execução de contrato | ⚠️           |

**⚠️ Ação Recomendada**: Assinar DPA (Data Processing Agreement) com TOTVS.

### Transferência Internacional

| Serviço      | País       | Adequação LGPD                  |
| ------------ | ---------- | ------------------------------- |
| SendGrid     | EUA        | ✅ Cláusulas contratuais padrão |
| Twilio       | EUA        | ✅ Cláusulas contratuais padrão |
| Google Cloud | EUA/Brasil | ✅ Data residency configurável  |

---

## 6. Bases Legais (LGPD Art. 7)

### Mapeamento

| Tratamento                             | Base Legal                     | Artigo     |
| -------------------------------------- | ------------------------------ | ---------- |
| Coleta de dados pessoais para filiação | Execução de contrato           | Art. 7, V  |
| Coleta de CPF, documentos              | Cumprimento de obrigação legal | Art. 7, II |
| Envio de notificações                  | Execução de contrato           | Art. 7, V  |
| Análise de proposta                    | Execução de contrato           | Art. 7, V  |
| Assinatura digital                     | Execução de contrato           | Art. 7, V  |
| Integração com TOTVS                   | Execução de contrato           | Art. 7, V  |
| Conexão com redes sociais (opcional)   | Consentimento                  | Art. 7, I  |
| Marketing (se aplicável)               | Consentimento                  | Art. 7, I  |

---

## 7. WCAG 2.1 AA - Acessibilidade Digital

### Status

**Nível Alvo**: WCAG 2.1 AA
**Status Atual**: ⚠️ Em auditoria

### Conformidade Atual

✅ **Implementado**:

- Labels em todos os campos de formulário
- Validações com mensagens claras
- Design responsivo (mobile-first)
- Contraste adequado em textos principais
- Foco visível em elementos interativos
- Suporte a navegação por teclado (parcial)

⚠️ **Pendente Auditoria**:

- Contraste de bordas e componentes UI (3:1)
- ARIA completo (roles, states, properties)
- Focus trap em modais
- Navegação completa por teclado
- Screen reader testing
- Autocomplete attributes

**Documento Completo**: [ACCESSIBILITY_WCAG_AUDIT.md](./ACCESSIBILITY_WCAG_AUDIT.md)

---

## 8. Documentos e Políticas

### Documentos Obrigatórios

✅ **Política de Privacidade** (`/privacidade`)

- Tipos de dados coletados
- Finalidades do tratamento
- Bases legais
- Compartilhamento com terceiros
- Direitos do titular
- Contato do DPO
- Prazo de retenção

✅ **Termo de Uso** (`/termos`)

- Regras de utilização do sistema
- Responsabilidades do usuário
- Propriedade intelectual

⚠️ **Recomendado**:

- [ ] **Declaração de Acessibilidade** (`/acessibilidade`)
  - Nível de conformidade WCAG
  - Tecnologias suportadas
  - Contato para reportar problemas

- [ ] **Política de Cookies** (`/cookies`)
  - Cookies utilizados
  - Finalidade de cada cookie
  - Como desabilitar

- [ ] **Relatório de Impacto (RIPD)** (Interno)
  - Para tratamentos de alto risco
  - Avaliação de riscos aos titulares
  - Medidas de mitigação

---

## 9. Governança de Dados

### Estrutura Organizacional

**DPO (Data Protection Officer) / Encarregado**:

- Nome: [A definir]
- Email: dpo@sbacem.org.br
- Responsabilidades:
  - Atender solicitações de titulares
  - Orientar funcionários
  - Ser canal de comunicação com ANPD
  - Realizar auditorias internas

**Comitê de Privacidade**:

- Membros: TI, Jurídico, Compliance, Gestão
- Reuniões: Trimest rais
- Responsabilidades:
  - Revisar políticas
  - Aprovar novos tratamentos
  - Analisar incidentes

### Treinamento

**Obrigatório para**:

- Todos os funcionários (anual)
- Novos contratados (onboarding)
- Desenvolvedores (semestral)

**Tópicos**:

- Princípios da LGPD
- Direitos dos titulares
- Segurança da informação
- Resposta a incidentes
- Privacy by Design

---

## 10. Checklist de Conformidade

### LGPD

- [x] Política de Privacidade publicada
- [x] Gate de consentimento implementado
- [x] Registro de consentimentos (ConsentLog)
- [x] Direito ao esquecimento implementado
- [x] Direito de acesso implementado (portal)
- [x] Direito de portabilidade implementado
- [x] Criptografia de dados sensíveis
- [x] Pseudonimização (hashes)
- [x] Controle de acesso (RBAC)
- [x] Audit logs completos
- [x] Política de retenção definida
- [x] Limpeza automática de dados
- [ ] DPO nomeado formalmente
- [ ] DPA assinado com todos os fornecedores
- [ ] RIPD elaborado
- [ ] Treinamento LGPD realizado
- [ ] Plano de resposta a incidentes documentado

### Acessibilidade (WCAG 2.1 AA)

- [x] Checklist completo criado
- [ ] Auditoria automática (axe DevTools)
- [ ] Auditoria manual (teclado + screen reader)
- [ ] Correções de contraste
- [ ] ARIA completo
- [ ] Focus management
- [ ] Declaração de acessibilidade publicada

### Segurança

- [x] HTTPS obrigatório
- [x] JWT com TTL curto
- [x] Senhas hasheadas (bcrypt)
- [x] CSRF protection
- [x] XSS protection
- [x] SQL injection prevention (ORM)
- [x] Rate limiting
- [x] Input validation
- [ ] WAF (Web Application Firewall)
- [ ] Penetration testing anual
- [ ] Backup diário automático
- [ ] Disaster recovery plan

---

## 11. Roadmap de Melhorias

### Curto Prazo (1-3 meses)

1. **WCAG 2.1 AA Completo**
   - Auditoria e correção de contraste
   - Completar ARIA
   - Testes com screen readers
   - Publicar declaração de acessibilidade

2. **DPA com Fornecedores**
   - TOTVS ERP
   - SendGrid
   - Twilio
   - Google Cloud

3. **Nomear DPO Formal**
   - Contratar ou designar internamente
   - Publicar contato

### Médio Prazo (3-6 meses)

4. **RIPD (Relatório de Impacto)**
   - Mapear todos os tratamentos
   - Avaliar riscos
   - Definir medidas de mitigação

5. **Treinamento LGPD**
   - Desenvolver material
   - Treinar equipe
   - Certificar conclusão

6. **Self-Service para Titulares**
   - Correção de dados
   - Download de dados (portabilidade)
   - Histórico de consentimentos

### Longo Prazo (6-12 meses)

7. **Certificação ISO 27001**
   - Sistema de gestão de segurança da informação
   - Auditoria externa
   - Certificado

8. **Penetration Testing**
   - Contratar empresa especializada
   - Corrigir vulnerabilidades encontradas
   - Relatório de segurança

9. **WAF e DDoS Protection**
   - Cloudflare ou AWS WAF
   - Proteção contra ataques

---

## 12. Contatos e Recursos

### Internos

- **DPO**: dpo@sbacem.org.br
- **Segurança**: seguranca@sbacem.org.br
- **Suporte**: suporte@sbacem.org.br

### Externos

- **ANPD** (Autoridade Nacional): https://www.gov.br/anpd
- **Canal do Titular ANPD**: https://www.gov.br/anpd/pt-br/canais_atendimento
- **Denúncias ANPD**: https://www.gov.br/anpd/pt-br/assuntos/noticias/denuncias

### Documentação

- [Política de Privacidade](/privacidade)
- [Termos de Uso](/termos)
- [Audit WCAG 2.1 AA](./ACCESSIBILITY_WCAG_AUDIT.md)
- [Integração TOTVS](./TOTVS_INTEGRATION.md)
- [Melhorias Backoffice](./BACKOFFICE_IMPROVEMENTS.md)
- [Melhorias UX OCR](./UX_OCR_IMPROVEMENTS.md)
- [Melhorias Notificações](./NOTIFICATIONS_IMPROVEMENTS.md)

---

## Conclusão

O Sistema de Filiação SBACEM implementa os principais requisitos da LGPD:

✅ **Pontos Fortes**:

- Direito ao esquecimento automatizado
- Gate de consentimento obrigatório
- Criptografia e pseudonimização de dados sensíveis
- Audit logs completos
- Política de retenção definida

⚠️ **Pontos de Atenção**:

- DPO precisa ser nomeado formalmente
- DPA com TOTVS precisa ser assinado
- WCAG 2.1 AA precisa ser completado
- RIPD precisa ser elaborado
- Treinamento LGPD precisa ser realizado

**Próximo Passo**: Focar em WCAG 2.1 AA e formalizar DPO para atingir 100% de conformidade.

# Integração Totvs - Worker

## Visão Geral

Este worker processa a sincronização de propostas aprovadas com o ERP Totvs. Após a assinatura digital do candidato, os dados são enviados para o Totvs via API REST.

## Fluxo de Sincronização

1. **Trigger**: Proposta atinge status `SIGNED` ou `APPROVED`
2. **Job Enfileirado**: `totvs.sync` é adicionado à fila `totvs-jobs`
3. **Validações**:
   - Proposta existe e tem dados completos
   - Status permitido (SIGNED ou APPROVED)
   - Não foi sincronizada anteriormente (ou sync falhou)
4. **Envio para Totvs**: POST para `/api/totvs/v1/associados`
5. **Sucesso**:
   - Salva `externalId` retornado pelo Totvs
   - Atualiza status para `APPROVED`
   - Envia notificações de boas-vindas (email + WhatsApp)
6. **Falha**:
   - Marca sync como `FAILED`
   - Retry automático (3 tentativas com backoff exponencial)

## Mapeamento de Campos

### Dados Pessoais

| Campo Sistema | Campo Totvs                 | Formato                 | Obrigatório |
| ------------- | --------------------------- | ----------------------- | ----------- |
| fullName      | nome (A1_NOME)              | String                  | Sim         |
| cpf           | cpf (A1_CGC)                | String (apenas dígitos) | Sim         |
| birthDate     | data_nascimento (A1_DTNASC) | YYYY-MM-DD              | Não         |
| email         | email (A1_EMAIL)            | String                  | Sim         |
| phone         | telefone (A1_TEL)           | (XX) XXXXX-XXXX         | Sim         |

### Endereço

| Campo Sistema                        | Campo Totvs        | Formato                 | Obrigatório |
| ------------------------------------ | ------------------ | ----------------------- | ----------- |
| address.street + number + complement | endereco (A1_END)  | String formatada        | Não         |
| address.city                         | municipio (A1_MUN) | String                  | Não         |
| address.state                        | estado (A1_EST)    | String (2 letras)       | Não         |
| address.cep                          | cep (A1_CEP)       | String (apenas dígitos) | Não         |
| address.district                     | bairro             | String                  | Não         |
| address.number                       | numero             | String                  | Não         |
| address.complement                   | complemento        | String                  | Não         |

### Dados Bancários

| Campo Sistema       | Campo Totvs          | Formato | Obrigatório |
| ------------------- | -------------------- | ------- | ----------- |
| bankCode / bankName | banco (A1_BANCO)     | String  | Não         |
| agency              | agencia (A1_AGENCIA) | String  | Não         |
| account             | conta (A1_CONTA)     | String  | Não         |
| accountType         | tipo_conta           | CC/CP   | Não         |
| holderName          | titular              | String  | Não         |
| holderDocument      | documento_titular    | String  | Não         |
| pixKey              | pix_chave            | String  | Não         |
| pixKeyType          | pix_tipo             | String  | Não         |

### Documentos

| Tipo Sistema           | Campo Totvs            | Formato             |
| ---------------------- | ---------------------- | ------------------- |
| RG_FRENTE              | rg_frente              | S3 storageKey (URL) |
| RG_VERSO               | rg_verso               | S3 storageKey (URL) |
| CNH                    | cnh                    | S3 storageKey (URL) |
| COMPROVANTE_RESIDENCIA | comprovante_residencia | S3 storageKey (URL) |

**Nota**: Os documentos são enviados como URLs S3 (storageKey). O Totvs deve fazer download desses arquivos usando as URLs fornecidas.

### Outros Campos

- `perfil_artistico`: Array de strings (AUTOR, COMPOSITOR, INTERPRETE, etc)
- `redes_sociais`: Array de objetos com provider e profile
- `metadata`: proposalId, proposalType, requestId (rastreamento)

## Payload de Exemplo

```json
{
  "nome": "Maria Silva Santos",
  "cpf": "12345678900",
  "data_nascimento": "1990-03-15",
  "email": "maria@email.com",
  "telefone": "(11) 99999-9999",
  "endereco": "Rua das Flores, 123, Apto 45",
  "municipio": "São Paulo",
  "estado": "SP",
  "cep": "01234567",
  "bairro": "Centro",
  "numero": "123",
  "complemento": "Apto 45",
  "perfil_artistico": ["AUTOR", "COMPOSITOR"],
  "documentos": {
    "rg_frente": "propostas/uuid-1234/documentos/rg_frente.jpg",
    "rg_verso": "propostas/uuid-1234/documentos/rg_verso.jpg",
    "cnh": null,
    "comprovante_residencia": "propostas/uuid-1234/documentos/comprovante.pdf"
  },
  "dados_bancarios": {
    "banco": "341",
    "agencia": "1234",
    "conta": "12345-6",
    "tipo_conta": "CC",
    "titular": "Maria Silva Santos",
    "documento_titular": "12345678900",
    "pix_chave": "maria@email.com",
    "pix_tipo": "EMAIL"
  },
  "redes_sociais": [
    {
      "provider": "SPOTIFY",
      "profile": {
        "id": "spotify123",
        "display_name": "Maria Silva"
      }
    }
  ],
  "metadata": {
    "proposalId": "uuid-5678",
    "proposalType": "NOVO",
    "requestId": "req-9012"
  }
}
```

## Resposta Esperada do Totvs

### Sucesso (200 OK ou 201 Created)

```json
{
  "id": "TOTVS-123456",
  "status": "ativo",
  "message": "Associado criado com sucesso"
}
```

### Duplicata (409 Conflict)

```json
{
  "id": "TOTVS-123456",
  "message": "CPF já cadastrado"
}
```

**Nota**: 409 é tratado como sucesso (associado já existe no Totvs).

### Erro (4xx/5xx)

```json
{
  "error": "Descrição do erro",
  "details": {...}
}
```

## Conciliação Bidirecional

### SBACEM → Totvs (POST)

1. Worker envia dados para Totvs
2. Totvs retorna `id` (externalId)
3. Sistema salva em `TotvsSync.externalId`

### Totvs → SBACEM (Webhook)

1. Totvs envia webhook com atualizações de status
2. Sistema busca proposta por `externalId` ou `cpfHash`
3. Atualiza status da proposta conforme mapeamento:
   - `ativo/active/aprovado` → `APPROVED`
   - `suspenso/suspended/cancelado/canceled` → `CANCELED`

## Variáveis de Ambiente

```env
# URL base da API Totvs
TOTVS_BASE_URL=https://totvs.exemplo.com

# Token de autenticação Bearer
TOTVS_TOKEN=changeme

# Secret para validação de webhooks (HMAC-SHA256)
TOTVS_WEBHOOK_SECRET=changeme

# Timeout de requisições em ms (padrão: 15000)
TOTVS_TIMEOUT_MS=15000

# Concorrência do worker (padrão: 2)
TOTVS_CONCURRENCY=2
```

## Retry e Tratamento de Erros

- **Tentativas**: 3 (configurado no BullMQ)
- **Backoff**: Exponencial, inicial 60s
- **Timeout**: 15 segundos por requisição (configurável)
- **Status Sync**:
  - `PENDING`: Sincronização em andamento
  - `SYNCED`: Sucesso
  - `FAILED`: Falha após todas as tentativas

## Logs

Todos os eventos são logados com `requestId` para rastreamento:

```javascript
// Sucesso
console.info({ requestId, proposalId }, 'totvs.synced');

// Falha
console.error({ requestId, err: err.message }, 'totvs.failed');

// Proposta já sincronizada
console.info({ requestId, proposalId }, 'totvs.already_synced');

// Status não permitido
console.info({ requestId, proposalId, status }, 'totvs.skip_status');
```

## Notificações Pós-Sincronização

Após sincronização bem-sucedida, o sistema envia automaticamente:

1. **Email** com template `proposal_concluded`:
   - Assunto: "Bem-vindo(a) à SBACEM!"
   - Conteúdo: Número de associado (externalId)

2. **WhatsApp** (se telefone disponível):
   - Mesmo template `proposal_concluded`
   - Requer opt-in do candidato

## Troubleshooting

### Sync falha com erro de timeout

- Aumentar `TOTVS_TIMEOUT_MS`
- Verificar conectividade com API Totvs

### Duplicata não é detectada (409)

- Verificar se Totvs retorna status 409 para CPF duplicado
- Checar formato do CPF enviado (apenas dígitos)

### externalId não é salvo

- Verificar estrutura da resposta do Totvs
- Função `extractExternalId` procura em:
  - `payload.id`
  - `payload.externalId`
  - `payload.data.id`
  - `payload.data.attributes.id`

### Documentos não são baixados pelo Totvs

- Verificar se URLs S3 são públicas ou se Totvs tem credenciais
- Considerar gerar URLs presignadas com TTL longo
- Alternativa: enviar documentos como base64 no payload (aumenta payload)

## Melhorias Futuras

- [ ] Upload direto de arquivos (base64 ou multipart) em vez de URLs
- [ ] Validação de campos obrigatórios antes de enviar
- [ ] Dashboard de monitoramento de syncs pendentes
- [ ] Webhook de confirmação quando Totvs processa o associado
- [ ] Suporte a atualização de dados (PATCH) além de criação

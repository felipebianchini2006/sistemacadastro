# Audit de Acessibilidade WCAG 2.1 AA

## Resumo

Este documento descreve o checklist de conformidade com WCAG 2.1 nível AA (Web Content Accessibility Guidelines) para o Sistema de Filiação SBACEM.

## Status Atual

**Nível de Conformidade**: Em Auditoria
**Última Revisão**: 2026-02-02

---

## 1. Perceptível - Informação e componentes da interface devem ser apresentados de forma perceptível

### 1.1 Alternativas em Texto

| Critério                   | Nível | Status     | Notas                                                   |
| -------------------------- | ----- | ---------- | ------------------------------------------------------- |
| 1.1.1 Conteúdo Não Textual | A     | ⚠️ Revisar | Verificar se todas as imagens têm `alt` descritivo      |
| - Logos e ícones           | A     | ✅ OK      | Logos têm alt="Logo SBACEM"                             |
| - Ícones decorativos       | A     | ⚠️ Revisar | Garantir `aria-hidden="true"` em ícones SVG decorativos |
| - Ícones funcionais        | A     | ⚠️ Revisar | Verificar `aria-label` em botões com apenas ícones      |

**Ações Recomendadas**:

- [ ] Auditar todos os ícones SVG e adicionar `aria-hidden="true"` para decorativos
- [ ] Adicionar `aria-label` ou `title` em botões que usam apenas ícones
- [ ] Verificar imagens de documentos OCR têm descrições adequadas

### 1.2 Mídia Baseada em Tempo

| Critério                            | Nível | Status | Notas                           |
| ----------------------------------- | ----- | ------ | ------------------------------- |
| 1.2.1 Apenas Áudio e Apenas Vídeo   | A     | N/A    | Sistema não utiliza áudio/vídeo |
| 1.2.2 Legendas (Pré-gravadas)       | A     | N/A    | -                               |
| 1.2.3 Audiodescrição ou Alternativa | A     | N/A    | -                               |

### 1.3 Adaptável

| Critério                             | Nível | Status      | Notas                                                     |
| ------------------------------------ | ----- | ----------- | --------------------------------------------------------- |
| 1.3.1 Informação e Relações          | A     | ⚠️ Revisar  | Verificar estrutura semântica HTML                        |
| - Labels de formulário               | A     | ✅ OK       | Todos os inputs têm `<label>` associado                   |
| - Estrutura de cabeçalhos            | A     | ⚠️ Revisar  | Garantir hierarquia h1 > h2 > h3                          |
| - Tabelas de dados                   | A     | ⚠️ Revisar  | Verificar `<th>` com `scope` em tabelas do backoffice     |
| - Fieldsets e Legends                | A     | ⚠️ Pendente | Adicionar `<fieldset>` para grupos de campos relacionados |
| 1.3.2 Sequência Significativa        | A     | ✅ OK       | Ordem visual = ordem DOM                                  |
| 1.3.3 Características Sensoriais     | A     | ✅ OK       | Instruções não dependem apenas de forma/cor               |
| 1.3.4 Orientação                     | AA    | ✅ OK       | Sistema funciona em portrait e landscape                  |
| 1.3.5 Identificar Propósito do Input | AA    | ⚠️ Revisar  | Adicionar `autocomplete` em campos pessoais               |

**Ações Recomendadas**:

- [ ] Adicionar `autocomplete` em campos de formulário (name, email, tel, address-line1, etc.)
- [ ] Revisar hierarquia de cabeçalhos (h1 > h2 > h3)
- [ ] Adicionar `<fieldset>` e `<legend>` em seções de formulário (Dados Pessoais, Endereço, Banco)
- [ ] Verificar tabelas do backoffice têm `<th scope="col">` e `<th scope="row">`

### 1.4 Distinguível

| Critério                         | Nível | Status     | Notas                                                 |
| -------------------------------- | ----- | ---------- | ----------------------------------------------------- |
| 1.4.1 Uso de Cor                 | A     | ✅ OK      | Erros de validação usam texto + ícone, não apenas cor |
| 1.4.2 Controle de Áudio          | A     | N/A        | Não há áudio automático                               |
| 1.4.3 Contraste (Mínimo)         | AA    | ⚠️ Revisar | Verificar ratio 4.5:1 para texto, 3:1 para UI         |
| - Texto normal                   | AA    | ⚠️ Revisar | Verificar zinc-600 em fundo branco (≥4.5:1)           |
| - Texto grande                   | AA    | ✅ OK      | Títulos têm contraste suficiente                      |
| - Componentes UI                 | AA    | ⚠️ Revisar | Verificar bordas de inputs (zinc-300) têm 3:1         |
| - Botões desabilitados           | AA    | N/A        | Isentos (WCAG 1.4.3 exception)                        |
| 1.4.4 Redimensionar Texto        | AA    | ✅ OK      | Texto em rem/em, escalável                            |
| 1.4.5 Imagens de Texto           | AA    | ✅ OK      | Logo é exceção permitida                              |
| 1.4.10 Reflow                    | AA    | ✅ OK      | Design responsivo até 320px de largura                |
| 1.4.11 Contraste Não Textual     | AA    | ⚠️ Revisar | Verificar ícones e bordas têm 3:1                     |
| 1.4.12 Espaçamento de Texto      | AA    | ✅ OK      | Permite ajuste de line-height, letter-spacing         |
| 1.4.13 Conteúdo em Hover ou Foco | AA    | ⚠️ Revisar | Tooltips devem ser dismissable e hoverable            |

**Ações Recomendadas**:

- [ ] **Auditoria de Contraste**: Usar ferramenta (ex: Axe DevTools, WAVE) para verificar:
  - Texto zinc-600 (#52525b) em branco (#ffffff): ratio atual ~8.9:1 ✅
  - Texto zinc-500 (#71717a) em branco: ratio ~5.5:1 ✅
  - Borda zinc-300 (#d4d4d8) em branco: ratio ~1.3:1 ❌ (precisa 3:1)
  - Botão laranja #ff6b35 texto branco: ratio ~3.4:1 ⚠️ (precisa 4.5:1 para texto)
- [ ] Aumentar contraste de bordas de input ou torná-las mais escuras (zinc-400)
- [ ] Verificar se botão laranja com texto branco passa no contraste (ou usar texto mais escuro)
- [ ] Garantir tooltips/dropdowns fecham com ESC e permitem hover sem fechar

---

## 2. Operável - Componentes de interface e navegação devem ser operáveis

### 2.1 Acessível via Teclado

| Critério                  | Nível | Status     | Notas                                                   |
| ------------------------- | ----- | ---------- | ------------------------------------------------------- |
| 2.1.1 Teclado             | A     | ⚠️ Revisar | Verificar todos os controles são acessíveis via teclado |
| - Navegação entre campos  | A     | ✅ OK      | Tab funciona corretamente                               |
| - Dropdowns               | A     | ⚠️ Revisar | Verificar abertura com Enter/Space, navegação com setas |
| - Modals                  | A     | ⚠️ Revisar | Verificar foco é capturado dentro do modal              |
| - Checkboxes customizados | A     | ⚠️ Revisar | Verificar Space ativa/desativa                          |
| 2.1.2 Sem Trap de Teclado | A     | ⚠️ Revisar | Verificar modais permitem ESC para sair                 |
| 2.1.4 Atalhos de Teclado  | A     | N/A        | Não há atalhos de caractere único                       |

**Ações Recomendadas**:

- [ ] **Teste de Teclado Completo**: Navegar o formulário inteiro apenas com Tab/Shift+Tab/Enter/Space/Esc
- [ ] Implementar captura de foco em modais (PrivacyGate, CaptureGuidelines)
- [ ] Verificar dropdowns (AnalystSelector) permitem:
  - Enter/Space para abrir
  - Arrow Up/Down para navegar
  - Enter para selecionar
  - ESC para fechar
- [ ] Adicionar foco visível em todos os elementos interativos

### 2.2 Tempo Suficiente

| Critério                     | Nível | Status | Notas                                               |
| ---------------------------- | ----- | ------ | --------------------------------------------------- |
| 2.2.1 Ajuste de Tempo        | A     | ✅ OK  | Drafts têm TTL de 7 dias, suficiente                |
| 2.2.2 Pausar, Parar, Ocultar | A     | N/A    | Não há conteúdo em movimento/atualização automática |

### 2.3 Convulsões e Reações Físicas

| Critério                     | Nível | Status | Notas       |
| ---------------------------- | ----- | ------ | ----------- |
| 2.3.1 Três Flashes ou Abaixo | A     | ✅ OK  | Sem flashes |

### 2.4 Navegável

| Critério                           | Nível | Status      | Notas                                          |
| ---------------------------------- | ----- | ----------- | ---------------------------------------------- |
| 2.4.1 Bypass Blocks                | A     | ⚠️ Pendente | Adicionar link "Pular para conteúdo principal" |
| 2.4.2 Página Tem Título            | A     | ✅ OK       | Todas as páginas têm `<title>`                 |
| 2.4.3 Ordem de Foco                | A     | ⚠️ Revisar  | Verificar ordem lógica de foco                 |
| 2.4.4 Propósito do Link (Contexto) | A     | ⚠️ Revisar  | Links devem ter texto descritivo               |
| 2.4.5 Múltiplas Formas             | AA    | ✅ OK       | Menu de navegação disponível                   |
| 2.4.6 Cabeçalhos e Labels          | AA    | ✅ OK       | Labels descritivos                             |
| 2.4.7 Foco Visível                 | AA    | ⚠️ Revisar  | Verificar anel de foco em todos os elementos   |

**Ações Recomendadas**:

- [ ] Adicionar link "skip to main content" no topo da página
- [ ] Verificar foco visível (outline ou ring) em:
  - Inputs
  - Botões
  - Links
  - Checkboxes
  - Dropdowns
- [ ] Garantir que links têm texto descritivo (não "clique aqui")

### 2.5 Modalidades de Entrada

| Critério                       | Nível | Status     | Notas                                           |
| ------------------------------ | ----- | ---------- | ----------------------------------------------- |
| 2.5.1 Gestos de Ponteiro       | A     | ✅ OK      | Sem gestos complexos multi-touch                |
| 2.5.2 Cancelamento de Ponteiro | A     | ✅ OK      | Click handlers seguros                          |
| 2.5.3 Label no Nome            | A     | ⚠️ Revisar | Verificar aria-label coincide com label visível |
| 2.5.4 Ativação por Movimento   | A     | N/A        | Não há controles por movimento                  |

---

## 3. Compreensível - Informação e operação de interface devem ser compreensíveis

### 3.1 Legível

| Critério               | Nível | Status      | Notas                           |
| ---------------------- | ----- | ----------- | ------------------------------- |
| 3.1.1 Idioma da Página | A     | ⚠️ Pendente | Adicionar `<html lang="pt-BR">` |
| 3.1.2 Idioma de Partes | AA    | N/A         | Todo conteúdo em português      |

**Ações Recomendadas**:

- [ ] Adicionar `lang="pt-BR"` no elemento `<html>`

### 3.2 Previsível

| Critério                        | Nível | Status | Notas                                        |
| ------------------------------- | ----- | ------ | -------------------------------------------- |
| 3.2.1 Em Foco                   | A     | ✅ OK  | Foco não dispara mudanças inesperadas        |
| 3.2.2 Em Entrada                | A     | ✅ OK  | Input não submete formulário automaticamente |
| 3.2.3 Navegação Consistente     | AA    | ✅ OK  | Navegação consistente entre páginas          |
| 3.2.4 Identificação Consistente | AA    | ✅ OK  | Ícones e botões consistentes                 |

### 3.3 Assistência de Entrada

| Critério                         | Nível | Status | Notas                               |
| -------------------------------- | ----- | ------ | ----------------------------------- |
| 3.3.1 Identificação de Erro      | A     | ✅ OK  | Erros mostram mensagem clara        |
| 3.3.2 Labels ou Instruções       | A     | ✅ OK  | Todos os campos têm labels e hints  |
| 3.3.3 Sugestão de Erro           | AA    | ✅ OK  | Mensagens de erro sugerem correção  |
| 3.3.4 Prevenção de Erros (Legal) | AA    | ✅ OK  | Confirmação antes de enviar/deletar |

---

## 4. Robusto - Conteúdo deve ser robusto o suficiente para ser interpretado por tecnologias assistivas

### 4.1 Compatível

| Critério                  | Nível | Status      | Notas                                                  |
| ------------------------- | ----- | ----------- | ------------------------------------------------------ |
| 4.1.1 Parsing             | A     | ✅ OK       | HTML válido (React/Next.js garante)                    |
| 4.1.2 Nome, Função, Valor | A     | ⚠️ Revisar  | Verificar ARIA completo                                |
| 4.1.3 Mensagens de Status | AA    | ⚠️ Pendente | Adicionar `role="status"` em mensagens de sucesso/erro |

**Ações Recomendadas**:

- [ ] Adicionar atributos ARIA onde necessário:
  - `aria-label` em botões sem texto
  - `aria-describedby` em inputs com mensagens de erro
  - `aria-invalid="true"` em campos com erro
  - `aria-required="true"` em campos obrigatórios (já tem `required`, mas ARIA ajuda)
- [ ] Adicionar `role="status"` e `aria-live="polite"` em:
  - Mensagens de sucesso após submit
  - Mensagens de autosave
  - Notificações de OCR processado
- [ ] Adicionar `role="alert"` e `aria-live="assertive"` em:
  - Mensagens de erro críticas
  - Avisos de validação

---

## 5. Checklist de Componentes

### Componentes Críticos para Revisar

#### [apps/web/app/cadastro/page.tsx](../apps/web/app/cadastro/page.tsx)

- [ ] Adicionar `lang="pt-BR"` no HTML
- [ ] Adicionar `autocomplete` em todos os campos (name, email, tel, etc.)
- [ ] Envolver grupos de campos em `<fieldset>` com `<legend>`
- [ ] Adicionar `aria-invalid="true"` em campos com erro
- [ ] Adicionar `aria-describedby` apontando para mensagem de erro
- [ ] Adicionar `role="status"` em mensagem de autosave
- [ ] Adicionar `role="alert"` em mensagens de erro de submit
- [ ] Verificar contraste de texto laranja (#ff6b35)

#### [apps/web/app/cadastro/PrivacyGate.tsx](../apps/web/app/cadastro/PrivacyGate.tsx)

- [ ] Adicionar captura de foco (focus trap) dentro do modal
- [ ] Adicionar `role="dialog"` e `aria-modal="true"`
- [ ] Adicionar `aria-labelledby` apontando para o título
- [ ] Verificar ESC fecha o modal (atualmente não tem saída sem aceitar - IMPORTANTE)
- [ ] Adicionar botão "Fechar" ou permitir ESC para usuários que não querem continuar

#### [apps/web/app/cadastro/CaptureGuidelines.tsx](../apps/web/app/cadastro/CaptureGuidelines.tsx)

- [ ] Adicionar captura de foco
- [ ] Adicionar `role="dialog"` e `aria-modal="true"`
- [ ] Verificar ESC fecha o modal

#### [apps/web/app/admin/components/ProposalsTable.tsx](../apps/web/app/admin/components/ProposalsTable.tsx)

- [ ] Adicionar `<th scope="col">` em headers
- [ ] Adicionar `<th scope="row">` na primeira coluna (protocolo)
- [ ] Adicionar `aria-label` descritivo em checkboxes ("Selecionar proposta [protocolo]")
- [ ] Adicionar `aria-sort` em colunas ordenáveis

#### [apps/web/app/admin/components/BulkActions.tsx](../apps/web/app/admin/components/BulkActions.tsx)

- [ ] Adicionar `aria-expanded` no botão dropdown
- [ ] Adicionar `role="menu"` no dropdown
- [ ] Adicionar `role="menuitem"` nos itens
- [ ] Garantir navegação com setas funciona

#### [apps/web/app/admin/components/AnalystSelector.tsx](../apps/web/app/admin/components/AnalystSelector.tsx)

- [ ] Adicionar `role="combobox"` no botão
- [ ] Adicionar `aria-expanded` no botão
- [ ] Adicionar `role="listbox"` na lista
- [ ] Adicionar `role="option"` nos itens
- [ ] Adicionar `aria-selected="true"` no item selecionado
- [ ] Implementar navegação com Arrow Up/Down
- [ ] Adicionar busca tipográfica (type-ahead)

---

## 6. Ferramentas de Teste Recomendadas

### Automáticas

1. **axe DevTools** (Browser Extension)
   - Chrome/Firefox/Edge
   - Detecta automaticamente ~57% dos problemas WCAG
   - [Link](https://www.deque.com/axe/devtools/)

2. **WAVE** (Web Accessibility Evaluation Tool)
   - Browser extension
   - Visualização inline de problemas
   - [Link](https://wave.webaim.org/extension/)

3. **Lighthouse** (Chrome DevTools)
   - Já integrado no Chrome
   - Relatório de acessibilidade + performance

4. **Pa11y**
   - CLI tool para CI/CD
   - `npm install -g pa11y`
   - `pa11y https://localhost:3000/cadastro`

### Manuais

1. **Teste de Teclado**
   - Desconectar mouse
   - Navegar apenas com Tab/Shift+Tab/Enter/Space/Esc/Arrows
   - Verificar se todos os elementos são acessíveis

2. **Screen Reader**
   - **Windows**: NVDA (gratuito) ou JAWS
   - **macOS**: VoiceOver (built-in)
   - **Linux**: Orca
   - Testar navegação completa

3. **Contraste**
   - [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
   - Verificar texto e componentes UI

4. **Zoom/Resize**
   - Zoom até 200% (Ctrl/Cmd++)
   - Verificar nada quebra ou fica inacessível

---

## 7. Plano de Ação Prioritário

### Alta Prioridade (Bloqueante para Conformidade AA)

1. **Contraste de Cores**
   - Auditar e corrigir todos os ratios de contraste
   - Ferramenta: axe DevTools + WebAIM Contrast Checker
   - Tempo estimado: 2-4 horas

2. **ARIA Completo**
   - Adicionar aria-label, aria-describedby, aria-invalid
   - Adicionar roles em componentes customizados
   - Tempo estimado: 4-6 horas

3. **Navegação por Teclado**
   - Focus trap em modals
   - Navegação em dropdowns/comboboxes
   - Tempo estimado: 3-5 horas

4. **Idioma da Página**
   - Adicionar `lang="pt-BR"` no `<html>`
   - Tempo estimado: 5 minutos

### Média Prioridade

5. **Autocomplete**
   - Adicionar atributos autocomplete em campos
   - Tempo estimado: 1-2 horas

6. **Estrutura Semântica**
   - Fieldsets e legends
   - Hierarquia de cabeçalhos
   - Tempo estimado: 2-3 horas

7. **Skip Links**
   - Adicionar "Pular para conteúdo"
   - Tempo estimado: 30 minutos

### Baixa Prioridade (Melhorias)

8. **Mensagens de Status com ARIA Live**
   - role="status", role="alert"
   - Tempo estimado: 1-2 horas

9. **Tooltips Acessíveis**
   - Dismissable, hoverable
   - Tempo estimado: 1-2 horas

---

## 8. Certificação e Declaração

Após corrigir os itens acima, recomenda-se:

1. **Auditoria Externa** (opcional mas recomendado)
   - Contratar empresa especializada em acessibilidade
   - Obter Statement of Conformance

2. **Declaração de Acessibilidade**
   - Criar página `/acessibilidade` com:
     - Nível de conformidade (WCAG 2.1 AA)
     - Data da última auditoria
     - Problemas conhecidos (se houver)
     - Contato para reportar problemas
     - Tecnologias suportadas (screen readers, browsers)

3. **Monitoramento Contínuo**
   - Integrar axe-core no pipeline de CI/CD
   - Testes automatizados em cada PR

---

## Conclusão

O sistema tem uma base sólida de acessibilidade, mas precisa de ajustes para conformidade WCAG 2.1 AA completa:

**Pontos Fortes**:
✅ Formulários bem estruturados com labels
✅ Design responsivo
✅ Validações claras com mensagens descritivas
✅ Sem armadilhas de teclado óbvias

**Pontos de Atenção**:
⚠️ Contraste de cores (bordas, alguns textos)
⚠️ ARIA incompleto (roles, labels, states)
⚠️ Navegação por teclado em componentes customizados
⚠️ Focus trap em modals

**Prioridade**: Iniciar com auditoria de contraste e completar ARIA para atingir conformidade AA.

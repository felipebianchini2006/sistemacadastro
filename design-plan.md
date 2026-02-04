# 🎨 Plano de Design Visual Moderno - Sistema SBACEM

## Filiação Digital Mobile-First

---

## 📋 Visão Geral

Sistema de filiação digital 100% online com design moderno, mobile-first, validações em tempo real, OCR automático e assinatura digital integrada.

**Princípios de Design:**

- Mobile-First (Progressive Enhancement)
- Minimalismo Funcional
- Feedback Visual Instantâneo
- Micro-interações Suaves
- Acessibilidade WCAG 2.1 AA
- Performance Otimizada

---

# 📱 PARTE 1: FLUXO USUÁRIO/CANDIDATO (Cadastro)

## 🎨 1. Design System - Usuário

### 1.1 Paleta de Cores Moderna

```css
/* Cores Principais */
--primary: #0f766e; /* Teal Profissional - A��o Principal */
--primary-dark: #0b5f59; /* Hover/Active */
--primary-light: #5eead4; /* Backgrounds suaves */
--primary-soft: #ecfeff; /* Superf�cies leves */

/* Feedback Visual */
--success: #16a34a; /* Verde - Sucesso/V�lido */
--error: #dc2626; /* Vermelho - Erro/Inv�lido */
--warning: #d97706; /* �mbar - Aten��o */
--info: #2563eb; /* Azul - Informa��o */

/* Neutros (Tema Claro) */
--gray-50: #f8fafc;
--gray-100: #f1f5f9;
--gray-200: #e2e8f0;
--gray-300: #cbd5e1;
--gray-500: #64748b;
--gray-700: #334155;
--gray-900: #0f172a;

/* Dark Mode (Opcional) */
--bg-dark: #0b1120;
--surface-dark: #111827;
--text-dark: #e2e8f0;
```

### 1.2 Tipografia

```css
/* Font Stack */
font-family:
  'Sora',
  -apple-system,
  BlinkMacSystemFont,
  'Segoe UI',
  system-ui,
  sans-serif;

/* Escala Tipográfica (rem) */
--text-xs: 0.75rem; /* 12px */
--text-sm: 0.875rem; /* 14px */
--text-base: 1rem; /* 16px */
--text-lg: 1.125rem; /* 18px */
--text-xl: 1.25rem; /* 20px */
--text-2xl: 1.5rem; /* 24px */
--text-3xl: 1.875rem; /* 30px */
--text-4xl: 2.25rem; /* 36px */

/* Pesos */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### 1.3 Espaçamento & Grid

```css
/* Sistema de Espaçamento (8px base) */
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem; /* 8px */
--space-3: 0.75rem; /* 12px */
--space-4: 1rem; /* 16px */
--space-5: 1.25rem; /* 20px */
--space-6: 1.5rem; /* 24px */
--space-8: 2rem; /* 32px */
--space-10: 2.5rem; /* 40px */
--space-12: 3rem; /* 48px */

/* Raios de Borda */
--radius-sm: 0.375rem; /* 6px */
--radius-md: 0.5rem; /* 8px */
--radius-lg: 0.75rem; /* 12px */
--radius-xl: 1rem; /* 16px */
--radius-full: 9999px;

/* Sombras */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
```

---

## 🏗️ 2. Componentes - Fluxo de Cadastro

### 2.1 Tela Inicial (Landing)

```
┌─────────────────────────────────────┐
│                                     │
│         [Logo SBACEM]               │
│                                     │
│   Filiação Digital 100% Online      │
│   ─────────────────────────────     │
│   Rápido • Seguro • Digital         │
│                                     │
│   ✓ Cadastro em 10 minutos         │
│   ✓ Assinatura digital             │
│   ✓ Acompanhamento em tempo real   │
│                                     │
│   ┌─────────────────────────────┐  │
│   │  Iniciar Cadastro  →        │  │
│   └─────────────────────────────┘  │
│         (Botão Laranja)             │
│                                     │
│   Já sou filiado? Acompanhar       │
│                                     │
└─────────────────────────────────────┘
```

**Design:**

- Hero section com gradiente sutil
- Ilustração/animação minimalista
- CTA destacado (laranja coral)
- Micro-interação no botão (scale on hover)

---

### 2.2 ETAPA 1: Perfil Artístico

```
┌─────────────────────────────────────┐
│  [←]  Etapa 1 de 4          [●○○○]  │
├─────────────────────────────────────┤
│                                     │
│  Como você atua na música?          │
│  Selecione uma ou mais opções       │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  🎵 Autor(a) de Letras      │   │
│  │  Crio as palavras das músicas│   │
│  └─────────────────────────────┘   │
│         ↑ Selecionado (borda laranja)
│                                     │
│  ┌─────────────────────────────┐   │
│  │  🎼 Compositor(a)           │   │
│  │  Crio melodias e harmonias  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  🎤 Intérprete/Artista      │   │
│  │  Gravo e apresento músicas  │   │
│  └─────────────────────────────┘   │
│                                     │
│  [+ Ver mais opções ▼]             │
│                                     │
│  ┌─────────────────────────────┐   │
│  │        Continuar  →         │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**Melhorias Modernas:**

- Cards com glassmorphism sutil
- Ícones coloridos e expressivos
- Descrição curta em cada card
- Animação de seleção (scale + bounce)
- Expansão suave para "Outro"
- Haptic feedback (mobile)
- Botão fixo no bottom (mobile)

**Código Visual:**

```css
.profile-card {
  padding: 24px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-xl);
  transition: all 0.2s ease;
  cursor: pointer;
  min-height: 120px;
}

.profile-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--primary-light);
}

.profile-card.selected {
  border-color: var(--primary);
  background: linear-gradient(135deg, #fff5f0 0%, #ffffff 100%);
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
}
```

---

### 2.3 ETAPA 2: Dados Básicos

```
┌─────────────────────────────────────┐
│  [←]  Etapa 2 de 4          [●●○○]  │
│  ████████░░░░░░░░░░░░░░   50%       │
├─────────────────────────────────────┤
│                                     │
│  Seus dados pessoais                │
│  ─────────────────────────────────  │
│                                     │
│  Nome Completo                      │
│  ┌──────────────────────────────┐  │
│  │ Maria Silva Santos        ✓ │  │
│  └──────────────────────────────┘  │
│  Salvo agora • 14:23                │
│                                     │
│  CPF                                │
│  ┌──────────────────────────────┐  │
│  │ 123.456.789-00            ✓ │  │
│  └──────────────────────────────┘  │
│                                     │
│  Data de Nascimento                 │
│  ┌──────────────────────────────┐  │
│  │ 15/03/1990                  │  │
│  └──────────────────────────────┘  │
│  [Selecionar data 📅]               │
│                                     │
│  Celular (WhatsApp)                 │
│  ┌──────────────────────────────┐  │
│  │ (11) 99999-9999   [WhatsApp]│  │
│  └──────────────────────────────┘  │
│                                     │
│  E-mail                             │
│  ┌──────────────────────────────┐  │
│  │ maria@email.com              │  │
│  └──────────────────────────────┘  │
│  [Digite seu e-mail]                │
│                                     │
│  ┌─────────────────────────────┐   │
│  │        Continuar  →         │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**Melhorias Modernas:**

**1. Barra de Progresso Animada:**

```css
.progress-bar {
  height: 4px;
  background: var(--gray-200);
  position: relative;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary) 0%, var(--primary-dark) 100%);
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
```

**2. Input Fields Modernos:**

```css
.input-field {
  padding: 14px 16px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  transition: all 0.2s ease;
}

.input-field:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
}

.input-field.valid {
  border-color: var(--success);
  padding-right: 40px; /* espaço para ícone ✓ */
}

.input-field.invalid {
  border-color: var(--error);
  animation: shake 0.4s ease;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}
```

**3. Feedback Visual com Ícones:**

- ✓ Check verde animado (scale + fade in)
- ✗ X vermelho com shake
- Spinner durante validação assíncrona
- Texto de ajuda abaixo do campo

**4. Autosave Indicator:**

```
💾 Salvo agora • 14:23
```

- Fade in/out suave
- Timestamp atualizado
- Ícone animado de sincronização

**5. Máscaras Inteligentes:**

- CPF: formatação automática ao digitar
- Telefone: (00) 00000-0000
- Data: DD/MM/AAAA com date picker nativo mobile

**6. Progressive Disclosure (Mobile):**

- Mostrar 1-2 campos por tela em mobile < 480px
- Botão "Próximo campo" em vez de scroll
- Animação de slide horizontal entre campos

---

### 2.4 ETAPA 3: Documentos com OCR

```
┌─────────────────────────────────────┐
│  [←]  Etapa 3 de 4          [●●●○]  │
├─────────────────────────────────────┤
│                                     │
│  Envie seu documento com foto       │
│  RG ou CNH • Obrigatório            │
│  ─────────────────────────────────  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │         📷                  │   │
│  │                             │   │
│  │   Clique para tirar foto    │   │
│  │   ou enviar arquivo         │   │
│  │                             │   │
│  │   PNG, JPG ou PDF • max 10MB│   │
│  └─────────────────────────────┘   │
│         (Área de Drop)              │
│                                     │
│  💡 Dicas para melhor captura:      │
│  • Use boa iluminação natural       │
│  • Evite reflexos e sombras         │
│  • Centralize o documento           │
│  • Mantenha o foco nítido           │
│                                     │
└─────────────────────────────────────┘
```

**Após Upload - Preview com OCR:**

```
┌─────────────────────────────────────┐
│  [←]  Processando documento...      │
│  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░ 60%            │
├─────────────────────────────────────┤
│                                     │
│  [Imagem do Documento Preview]      │
│  ┌─────────────────────────────┐   │
│  │  [Thumbnail RG/CNH]         │   │
│  │         +                   │   │
│  │     Overlay OCR             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ✓ Dados extraídos automaticamente  │
│  ─────────────────────────────────  │
│                                     │
│  Nome Completo              [Editar]│
│  Maria Silva Santos            ✓    │
│                                     │
│  CPF                          [Editar]│
│  123.456.789-00                ✓    │
│                                     │
│  Data de Nascimento           [Editar]│
│  15/03/1990                    ✓    │
│                                     │
│  RG/CNH                       [Editar]│
│  12.345.678-9 SSP/SP           ✓    │
│                                     │
│  ⚠️ Dados conferem com Etapa 2?     │
│  ┌─────────────┐ ┌──────────────┐  │
│  │ Sim, confere │ │ Editar dados │  │
│  └─────────────┘ └──────────────┘  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Confirmar e Continuar  →   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ou  [Refazer Foto]                │
│                                     │
└─────────────────────────────────────┘
```

**Melhorias Modernas:**

**1. Upload Zone Interativa:**

```css
.upload-zone {
  border: 2px dashed var(--gray-300);
  border-radius: var(--radius-xl);
  padding: 48px 24px;
  text-align: center;
  transition: all 0.3s ease;
  background: var(--gray-50);
}

.upload-zone.dragover {
  border-color: var(--primary);
  background: rgba(255, 107, 53, 0.05);
  transform: scale(1.02);
}

.upload-zone:hover {
  border-color: var(--primary-light);
  background: var(--gray-100);
}
```

**2. Loading State Durante OCR:**

- Skeleton loader com shimmer effect
- Barra de progresso com % real
- Mensagem: "Extraindo informações do documento..."
- Animação de scan line sobre a imagem

**3. Preview com Overlay Interativo:**

- Lightbox para zoom na imagem
- Highlights nos campos detectados
- Confidence score visual (barra verde/amarela)
- Botão de edição inline por campo

**4. Validação Cruzada:**

```
⚠️ Atenção: CPF do documento difere do digitado
   Documento: 123.456.789-00
   Digitado:  987.654.321-00

   [Usar CPF do documento] [Manter digitado]
```

**5. Comprovante Opcional:**

```
┌─────────────────────────────────┐
│  Comprovante de Residência      │
│  (Opcional - pode pular)        │
│  ─────────────────────────────  │
│  ┌───────────────────────────┐ │
│  │  Enviar Comprovante       │ │
│  └───────────────────────────┘ │
│  ou                            │
│  [Pular esta etapa →]          │
└─────────────────────────────────┘
```

---

### 2.5 ETAPA 4: Confirmação e Envio

```
┌─────────────────────────────────────┐
│  [←]  Revisão Final         [●●●●]  │
├─────────────────────────────────────┤
│                                     │
│  Confira seus dados antes de enviar │
│  ─────────────────────────────────  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🎵 Perfil Artístico    [✏️] │   │
│  │ ─────────────────────────── │   │
│  │ • Autor(a) de Letras        │   │
│  │ • Compositor(a)             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 👤 Dados Pessoais      [✏️] │   │
│  │ ─────────────────────────── │   │
│  │ Maria Silva Santos          │   │
│  │ CPF: 123.456.789-00         │   │
│  │ 📧 maria@email.com          │   │
│  │ 📱 (11) 99999-9999         │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 📄 Documentos          [✏️] │   │
│  │ ─────────────────────────── │   │
│  │ ✓ RG 12.345.678-9 SSP/SP    │   │
│  │ ✓ Comprovante de Residência │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ☑ Declaro que as informações│   │
│  │   fornecidas são verdadeiras│   │
│  │   e estou ciente da Lei...  │   │
│  │   [Ver termos completos]    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  📤 Enviar para Análise     │   │
│  └─────────────────────────────┘   │
│         (Botão Laranja Grande)      │
│                                     │
└─────────────────────────────────────┘
```

**Melhorias Modernas:**

**1. Cards de Resumo Colapsáveis:**

```css
.summary-card {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
}

.summary-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.edit-button {
  padding: 8px 12px;
  background: var(--gray-100);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.edit-button:hover {
  background: var(--primary-light);
  color: white;
}
```

**2. Checkbox de Termos Melhorado:**

```css
.terms-checkbox {
  display: flex;
  align-items: start;
  gap: 12px;
  padding: 16px;
  background: var(--gray-50);
  border-radius: var(--radius-md);
  border: 2px solid var(--gray-200);
}

.terms-checkbox.checked {
  background: rgba(34, 197, 94, 0.05);
  border-color: var(--success);
}

.custom-checkbox {
  width: 24px;
  height: 24px;
  border: 2px solid var(--gray-300);
  border-radius: 6px;
  position: relative;
  transition: all 0.2s ease;
}

.custom-checkbox.checked {
  background: var(--success);
  border-color: var(--success);
}

.custom-checkbox.checked::after {
  content: '✓';
  position: absolute;
  color: white;
  font-weight: bold;
  animation: checkmark 0.3s ease;
}

@keyframes checkmark {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
```

**3. Botão de Envio com Estados:**

```css
.submit-button {
  width: 100%;
  padding: 16px 24px;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.submit-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.submit-button:active {
  transform: translateY(0);
}

.submit-button.loading {
  pointer-events: none;
  opacity: 0.7;
}

.submit-button.loading::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  to {
    left: 100%;
  }
}
```

---

### 2.6 Tela de Confirmação (Sucesso)

```
┌─────────────────────────────────────┐
│                                     │
│            ✅                       │
│      (Animação de Sucesso)          │
│                                     │
│    Proposta enviada com sucesso!    │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Seu número de protocolo:           │
│  ┌─────────────────────────────┐   │
│  │      #123456                │   │
│  └─────────────────────────────┘   │
│          [Copiar 📋]                │
│                                     │
│  Você receberá um e-mail de         │
│  confirmação em instantes.          │
│                                     │
│  Nossa equipe analisará sua proposta│
│  em até 3 dias úteis.               │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Acompanhar Proposta  →     │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Voltar ao início]                 │
│                                     │
└─────────────────────────────────────┘
```

**Melhorias Modernas:**

**1. Animação de Sucesso:**

- Confetti animation ou checkmark animado
- Lottie animation para celebração
- Haptic feedback (mobile)
- Sound effect sutil (opcional)

**2. Protocolo Copiável:**

```javascript
// Botão de copiar com feedback
<button onclick="copyProtocol()">Copiar 📋</button>;

function copyProtocol() {
  navigator.clipboard.writeText('#123456');
  // Toast: "Protocolo copiado!"
}
```

**3. Timeline de Próximos Passos:**

```
┌─────────────────────────────────┐
│  O que acontece agora?          │
│  ─────────────────────────────  │
│                                 │
│  1️⃣ Análise da equipe           │
│     (1-3 dias úteis)            │
│     ●───────────────            │
│                                 │
│  2️⃣ Envio do link de assinatura│
│     (após aprovação)            │
│                                 │
│  3️⃣ Assinatura digital          │
│     (válido por 7 dias)         │
│                                 │
│  4️⃣ Filiação concluída          │
│     Bem-vindo à SBACEM! 🎉      │
│                                 │
└─────────────────────────────────┘
```

---

### 2.7 Tela de Acompanhamento

```
┌─────────────────────────────────────┐
│  [←]  Acompanhar Proposta           │
├─────────────────────────────────────┤
│                                     │
│  Protocolo: #123456                 │
│  ─────────────────────────────────  │
│                                     │
│  Status Atual                       │
│  ┌─────────────────────────────┐   │
│  │  🔵 Aguardando Análise      │   │
│  │  Enviado em 25/01/2026      │   │
│  └─────────────────────────────┘   │
│                                     │
│  Linha do Tempo                     │
│  ─────────────────────────────────  │
│                                     │
│  ✅ 25/01 14:55                     │
│  │  Cadastro enviado               │
│  │                                 │
│  ●  26/01 (previsão)                │
│  │  Análise da equipe              │
│  │                                 │
│  ○  27/01 (previsão)                │
│     Link de assinatura              │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  📧 Enviar novamente por    │   │
│  │     e-mail                  │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**Melhorias Modernas:**

**1. Status Badge Animado:**

```css
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: rgba(59, 130, 246, 0.1);
  border: 2px solid var(--info);
  border-radius: var(--radius-full);
  font-weight: var(--font-medium);
}

.status-badge::before {
  content: '';
  width: 8px;
  height: 8px;
  background: var(--info);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}
```

**2. Timeline Visual Moderna:**

```css
.timeline {
  position: relative;
  padding-left: 32px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, var(--success) 0%, var(--gray-300) 100%);
}

.timeline-item {
  position: relative;
  margin-bottom: 24px;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: -24px;
  top: 4px;
  width: 16px;
  height: 16px;
  background: var(--success);
  border: 3px solid white;
  border-radius: 50%;
  box-shadow: 0 0 0 2px var(--success);
}

.timeline-item.pending::before {
  background: var(--gray-300);
  box-shadow: none;
}
```

**3. Notificações Push (PWA):**

- Solicitação de permissão de notificações
- Push quando status mudar
- Badge no ícone do app

---

## 📐 3. Layout Mobile-First

### 3.1 Breakpoints

```css
/* Mobile First Approach */
/* Base: 320px - 767px (mobile) */

@media (min-width: 768px) {
  /* Tablet */
}

@media (min-width: 1024px) {
  /* Desktop */
}

@media (min-width: 1280px) {
  /* Large Desktop */
}
```

### 3.2 Container System

```css
.container {
  width: 100%;
  padding: 0 16px;
  margin: 0 auto;
}

@media (min-width: 768px) {
  .container {
    max-width: 720px;
    padding: 0 24px;
  }
}

@media (min-width: 1024px) {
  .container {
    max-width: 960px;
    padding: 0 32px;
  }
}
```

### 3.3 Touch Targets

```css
/* Mínimo 44x44px para áreas tocáveis */
.button,
.link,
.input,
.card {
  min-height: 44px;
  min-width: 44px;
}

/* Espaçamento entre elementos interativos */
.interactive-element + .interactive-element {
  margin-top: 12px;
}
```

---

## 🎭 4. Micro-interações

### 4.1 Transições Suaves

```css
/* Transição global padrão */
* {
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease,
    opacity 0.2s ease;
}

/* Transições específicas */
.card {
  transition:
    transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.3s ease;
}

.button {
  transition: all 0.2s ease;
}
```

### 4.2 Animações de Entrada

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-in {
  animation: fadeInUp 0.5s ease;
}

/* Stagger animation para listas */
.list-item {
  animation: fadeInUp 0.5s ease;
}

.list-item:nth-child(1) {
  animation-delay: 0.1s;
}
.list-item:nth-child(2) {
  animation-delay: 0.2s;
}
.list-item:nth-child(3) {
  animation-delay: 0.3s;
}
```

### 4.3 Loading States

```css
/* Skeleton Loader */
.skeleton {
  background: linear-gradient(90deg, var(--gray-200) 25%, var(--gray-100) 50%, var(--gray-200) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Spinner */
.spinner {
  border: 3px solid var(--gray-200);
  border-top-color: var(--primary);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

---

## ♿ 5. Acessibilidade (WCAG 2.1 AA)

### 5.1 Contraste de Cores

```css
/* Garantir contraste mínimo 4.5:1 para texto normal */
/* Garantir contraste mínimo 3:1 para texto grande */

/* Texto sobre fundo claro */
color: var(--gray-900); /* #111827 sobre #FFFFFF = 18.32:1 ✓ */

/* Texto sobre fundo laranja */
.primary-text {
  color: white; /* #FFFFFF sobre #0f766e = 3.59:1 ✓ */
  font-weight: var(--font-semibold); /* Aumenta legibilidade */
}
```

### 5.2 Focus States

```css
/* Focus visível para navegação por teclado */
*:focus-visible {
  outline: 3px solid var(--primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* Skip to content link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--primary);
  color: white;
  padding: 8px 16px;
  text-decoration: none;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

### 5.3 ARIA Labels

```html
<!-- Exemplo de campo com ARIA -->
<label for="cpf-input" class="sr-only">CPF</label>
<input
  id="cpf-input"
  type="text"
  aria-label="CPF - Cadastro de Pessoa Física"
  aria-describedby="cpf-help"
  aria-invalid="false"
  aria-required="true"
/>
<span id="cpf-help" class="help-text"> Digite apenas números </span>

<!-- Loading state -->
<button aria-busy="true" aria-label="Enviando proposta">
  <span class="spinner" aria-hidden="true"></span>
  Enviando...
</button>
```

### 5.4 Screen Reader Only

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

# 👨‍💼 PARTE 2: BACKOFFICE (Admin)

## 🎨 6. Design System - Admin

### 6.1 Paleta de Cores - Status

```css
/* Status de Propostas */
--status-pending: #3b82f6; /* Azul - Aguardando Análise */
--status-analyzing: #f59e0b; /* Amarelo - Em Análise */
--status-document: #ef4444; /* Vermelho - Pendente Documento */
--status-signature: #a855f7; /* Roxo - Aguardando Assinatura ⭐ */
--status-signed: #22c55e; /* Verde - Assinado */
--status-completed: #16a34a; /* Verde Escuro - Concluído */
--status-rejected: #6b7280; /* Cinza - Reprovado */

/* SLA Colors */
--sla-good: #22c55e; /* 🟢 0-3 dias */
--sla-warning: #f59e0b; /* 🟡 4-7 dias */
--sla-critical: #ef4444; /* 🔴 8+ dias */

/* Action Colors */
--action-primary: #0f766e; /* Enviar para Assinatura */
--action-success: #22c55e; /* Aprovar */
--action-danger: #ef4444; /* Reprovar */
--action-secondary: #6b7280; /* Outras ações */
```

### 6.2 Layout Desktop-First (Backoffice)

```
┌────────────────────────────────────────────────┐
│  [Logo]  Dashboard  Propostas  Relatórios  👤 │ ← Header
├────┬───────────────────────────────────────────┤
│    │                                           │
│ 📊 │  DASHBOARD                                │
│ 📋 │  ─────────────────────────────────────   │
│ 📈 │                                           │
│ ⚙️  │  [KPI Cards]                             │
│    │                                           │
│    │  [Tabela de Propostas]                   │
│    │                                           │
│    │                                           │
└────┴───────────────────────────────────────────┘
 ↑ Sidebar
```

---

## 🏗️ 7. Componentes - Backoffice

### 7.1 Header & Sidebar

```
HEADER:
┌─────────────────────────────────────────────────┐
│  [☰] SBACEM    Dashboard    Propostas    [🔍]   │
│                                    [🔔3] [👤]   │
└─────────────────────────────────────────────────┘

SIDEBAR (Colapsável):
┌──────────────────┐
│  📊 Dashboard    │
│  📋 Propostas    │ ← Ativo
│  ✍️ Assinaturas  │
│  📈 Relatórios   │
│  👥 Equipe       │
│  ⚙️ Configurações│
│                  │
│  ───────────     │
│  [João Admin]    │
│  Administrador   │
│  [Sair]          │
└──────────────────┘
```

**Melhorias Modernas:**

```css
.sidebar {
  width: 240px;
  background: white;
  border-right: 1px solid var(--gray-200);
  position: fixed;
  height: 100vh;
  overflow-y: auto;
  transition: transform 0.3s ease;
}

.sidebar.collapsed {
  transform: translateX(-240px);
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  margin: 4px 8px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.sidebar-item:hover {
  background: var(--gray-100);
}

.sidebar-item.active {
  background: rgba(255, 107, 53, 0.1);
  color: var(--primary);
  font-weight: var(--font-semibold);
}

.sidebar-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  width: 3px;
  height: 100%;
  background: var(--primary);
}
```

---

### 7.2 Dashboard - KPI Cards

```
┌───────────────────────────────────────────────┐
│  Dashboard                          📅 Hoje   │
├───────────────────────────────────────────────┤
│                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ 🔵 124   │ │ 🟡 45    │ │ ⭐ 8      │     │
│  │ Aguardando│ │ Em       │ │ Aguardando│     │
│  │ Análise  │ │ Análise  │ │ Assinatura│     │
│  │ +12 hoje │ │ +3 hoje  │ │ Urgente!  │     │
│  └──────────┘ └──────────┘ └──────────┘     │
│                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ 🟢 890   │ │ 📊 94%   │ │ ⚡ 2.3d   │     │
│  │ Aprovados │ │ Taxa de  │ │ Tempo    │     │
│  │ no Mês   │ │ Conversão│ │ Médio    │     │
│  │ Meta: 1000│ │ ↑ 3%     │ │ ↓ 0.5d   │     │
│  └──────────┘ └──────────┘ └──────────┘     │
│                                               │
└───────────────────────────────────────────────┘
```

**Melhorias Modernas:**

```css
.kpi-card {
  background: white;
  border-radius: var(--radius-xl);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--gray-200);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.kpi-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: var(--status-pending); /* Cor dinâmica por status */
}

.kpi-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.kpi-value {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: var(--gray-900);
  margin: 8px 0;
}

.kpi-label {
  font-size: var(--text-sm);
  color: var(--gray-600);
  margin-bottom: 4px;
}

.kpi-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(34, 197, 94, 0.1);
  color: var(--success);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.kpi-badge.negative {
  background: rgba(239, 68, 68, 0.1);
  color: var(--error);
}
```

**Card Destaque - Aguardando Assinatura:**

```css
.kpi-card.urgent {
  border: 2px solid var(--status-signature);
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, white 100%);
  animation: pulse-border 2s ease-in-out infinite;
}

@keyframes pulse-border {
  0%,
  100% {
    border-color: var(--status-signature);
  }
  50% {
    border-color: rgba(168, 85, 247, 0.5);
  }
}

.kpi-card.urgent::after {
  content: '⭐';
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 24px;
  animation: star-pulse 1.5s ease-in-out infinite;
}

@keyframes star-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}
```

---

### 7.3 Tabela de Propostas Moderna

```
┌───────────────────────────────────────────────────────────────────────┐
│  Propostas                                               [+ Nova]      │
│  ───────────────────────────────────────────────────────────────      │
│                                                                        │
│  [🔍 Buscar por nome ou CPF...]  [Status ▼] [Data ▼] [Exportar CSV] │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Nome ▼  │ CPF     │ Tipo      │ Status     │ Data │ SLA │ ⋮   │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ Maria S │123...00│ Autor      │[🔵Aguard.] │25/01 │🟢  │  ⋮  │  │
│  │         │        │ Compositor │  Análise   │      │     │     │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ João P  │987...11│ Intérprete │[⭐Aguard.] │20/01 │🟡  │  ⋮  │  │
│  │         │        │            │  Assinatura│      │     │     │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ Ana L   │456...22│ Editor     │[🟢Assinado]│18/01 │🟢  │  ⋮  │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ Pedro M │789...33│ Produtor   │[🟡Em      ]│15/01 │🔴  │  ⋮  │  │
│  │         │        │            │  Análise   │      │     │     │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Mostrando 1-20 de 124         [← 1 2 3 ... 7 →]                     │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

**Melhorias Modernas:**

**1. Tabela Responsiva:**

```css
.table-container {
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table thead {
  background: var(--gray-50);
  border-bottom: 2px solid var(--gray-200);
}

.table th {
  padding: 16px;
  text-align: left;
  font-weight: var(--font-semibold);
  color: var(--gray-700);
  font-size: var(--text-sm);
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;
}

.table th:hover {
  background: var(--gray-100);
}

.table th.sortable::after {
  content: '⇅';
  margin-left: 8px;
  opacity: 0.3;
}

.table th.sorted-asc::after {
  content: '↑';
  opacity: 1;
}

.table th.sorted-desc::after {
  content: '↓';
  opacity: 1;
}

.table td {
  padding: 16px;
  border-bottom: 1px solid var(--gray-200);
  font-size: var(--text-sm);
}

.table tr {
  transition: background 0.2s ease;
}

.table tbody tr:hover {
  background: var(--gray-50);
}

/* Linha com destaque para assinatura pendente */
.table tr.urgent {
  background: rgba(168, 85, 247, 0.03);
}

.table tr.urgent:hover {
  background: rgba(168, 85, 247, 0.08);
}
```

**2. Status Badges Modernos:**

```css
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  white-space: nowrap;
}

/* Status específicos */
.status-badge.pending {
  background: rgba(59, 130, 246, 0.1);
  color: #1e40af;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.status-badge.analyzing {
  background: rgba(245, 158, 11, 0.1);
  color: #92400e;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.status-badge.signature {
  background: rgba(168, 85, 247, 0.1);
  color: #6b21a8;
  border: 1px solid rgba(168, 85, 247, 0.2);
  font-weight: var(--font-semibold);
  position: relative;
}

.status-badge.signature::before {
  content: '⭐';
  font-size: 10px;
}

.status-badge.signed {
  background: rgba(34, 197, 94, 0.1);
  color: #15803d;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.status-badge.completed {
  background: rgba(22, 163, 74, 0.1);
  color: #14532d;
  border: 1px solid rgba(22, 163, 74, 0.2);
}

.status-badge.rejected {
  background: rgba(107, 114, 128, 0.1);
  color: #374151;
  border: 1px solid rgba(107, 114, 128, 0.2);
}
```

**3. SLA Indicators:**

```css
.sla-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 16px;
}

.sla-indicator.good {
  background: rgba(34, 197, 94, 0.1);
}

.sla-indicator.warning {
  background: rgba(245, 158, 11, 0.1);
  animation: pulse-warning 2s ease-in-out infinite;
}

.sla-indicator.critical {
  background: rgba(239, 68, 68, 0.1);
  animation: pulse-critical 1s ease-in-out infinite;
}

@keyframes pulse-warning {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0);
  }
}

@keyframes pulse-critical {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
  }
}
```

**4. Busca e Filtros:**

```css
.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 300px;
  padding: 12px 16px 12px 40px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-lg);
  font-size: var(--text-base);
  background: url('data:image/svg+xml,...') no-repeat 12px center;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
}

.filter-button {
  padding: 12px 16px;
  background: white;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-button:hover {
  border-color: var(--primary);
  background: var(--gray-50);
}

.filter-button.active {
  border-color: var(--primary);
  background: rgba(255, 107, 53, 0.05);
  color: var(--primary);
  font-weight: var(--font-medium);
}
```

---

### 7.4 Menu de Ações (Dropdown)

```
┌──────────────────────────────────┐
│  📄 Ver Dossiê Completo          │
├──────────────────────────────────┤
│  📤 ENVIAR PARA ASSINATURA ⭐     │ ← Destaque laranja
├──────────────────────────────────┤
│  📎 Solicitar Documento          │
│  🔄 Reenviar Link Assinatura     │
│  ❌ Reprovar Proposta            │
├──────────────────────────────────┤
│  📜 Histórico de Alterações      │
└──────────────────────────────────┘
```

**Melhorias Modernas:**

```css
.dropdown-menu {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 8px;
  min-width: 280px;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--gray-200);
  z-index: 50;
  animation: dropdownFadeIn 0.2s ease;
}

@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--gray-100);
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background: var(--gray-50);
}

/* Ação principal - Enviar para Assinatura */
.dropdown-item.primary-action {
  background: linear-gradient(135deg, rgba(255, 107, 53, 0.05) 0%, rgba(255, 107, 53, 0.1) 100%);
  color: var(--primary);
  font-weight: var(--font-semibold);
  border-left: 4px solid var(--primary);
}

.dropdown-item.primary-action:hover {
  background: linear-gradient(135deg, rgba(255, 107, 53, 0.1) 0%, rgba(255, 107, 53, 0.15) 100%);
  transform: translateX(4px);
}

.dropdown-item.primary-action::after {
  content: '⭐';
  margin-left: auto;
  animation: star-pulse 1.5s ease-in-out infinite;
}

/* Ações destrutivas */
.dropdown-item.danger {
  color: var(--error);
}

.dropdown-item.danger:hover {
  background: rgba(239, 68, 68, 0.05);
}

/* Separador visual */
.dropdown-divider {
  height: 1px;
  background: var(--gray-200);
  margin: 4px 0;
}
```

**Botão Trigger:**

```css
.action-trigger {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--gray-500);
}

.action-trigger:hover {
  background: var(--gray-100);
  color: var(--gray-900);
}

.action-trigger.active {
  background: var(--gray-200);
  color: var(--primary);
}
```

---

### 7.5 Modal de Assinatura

```
┌──────────────────────────────────────────┐
│  📤 Enviar para Assinatura         [✕]   │
├──────────────────────────────────────────┤
│                                          │
│  Você está prestes a enviar o link de   │
│  assinatura digital para o candidato.   │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  👤 Candidato                      │ │
│  │  ─────────────────────────────────│ │
│  │  Maria Silva Santos               │ │
│  │  CPF: 123.456.789-00              │ │
│  │                                    │ │
│  │  📧 E-mail                         │ │
│  │  maria@email.com                  │ │
│  │                                    │ │
│  │  📱 Celular/WhatsApp              │ │
│  │  (11) 99999-9999                  │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ⏱️ O link de assinatura será válido    │
│     por 7 dias                           │
│                                          │
│  📨 O candidato receberá:                │
│  • E-mail com link de assinatura        │
│  • SMS/WhatsApp com link curto          │
│  • Lembrete após 3 dias (se não assinar)│
│                                          │
│  ☑️ Notificar equipe após assinatura    │
│                                          │
│  ┌──────────────┐  ┌──────────────────┐│
│  │   Cancelar   │  │ Confirmar Envio →││
│  └──────────────┘  └──────────────────┘│
│                         (Laranja)        │
│                                          │
└──────────────────────────────────────────┘
```

**Melhorias Modernas:**

```css
/* Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Modal */
.modal {
  background: white;
  border-radius: var(--radius-xl);
  max-width: 560px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid var(--gray-200);
}

.modal-title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--gray-500);
}

.modal-close:hover {
  background: var(--gray-100);
  color: var(--gray-900);
}

.modal-body {
  padding: 24px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 24px;
  border-top: 1px solid var(--gray-200);
  background: var(--gray-50);
}

/* Info Box */
.info-box {
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin: 16px 0;
}

.info-box-highlight {
  background: rgba(255, 107, 53, 0.05);
  border-color: rgba(255, 107, 53, 0.2);
  color: var(--gray-900);
}
```

**Botões do Modal:**

```css
.modal-button {
  padding: 12px 24px;
  border-radius: var(--radius-lg);
  font-weight: var(--font-medium);
  transition: all 0.2s ease;
  cursor: pointer;
}

.modal-button-primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
  box-shadow: var(--shadow-md);
}

.modal-button-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.modal-button-primary:active {
  transform: translateY(0);
}

.modal-button-secondary {
  background: white;
  border: 2px solid var(--gray-300);
  color: var(--gray-700);
}

.modal-button-secondary:hover {
  background: var(--gray-50);
  border-color: var(--gray-400);
}
```

---

### 7.6 Dossiê Completo

```
┌────────────────────────────────────────────────┐
│  [←] Voltar    DOSSIÊ COMPLETO                 │
├────────────────────────────────────────────────┤
│                                                │
│  Maria Silva Santos                            │
│  [🔵 Aguardando Análise]                       │
│  Protocolo: #123456 • Enviado em 25/01/2026   │
│                                                │
│  ┌───────────────────────────────────────────┐│
│  │  📤 Enviar para Assinatura  [✏️ Editar]  ││
│  └───────────────────────────────────────────┘│
│                                                │
├────────────────────────────────────────────────┤
│                                                │
│  📋 DADOS PESSOAIS                      [▼]   │
│  ───────────────────────────────────────────  │
│  Nome Completo: Maria Silva Santos             │
│  CPF: 123.456.789-00                          │
│  Data Nascimento: 15/03/1990 (36 anos)        │
│  E-mail: maria@email.com                      │
│  Celular: (11) 99999-9999                     │
│                                                │
│  🎵 PERFIL ARTÍSTICO                    [▼]   │
│  ───────────────────────────────────────────  │
│  ☑ Autor(a) de Letras                         │
│  ☑ Compositor(a) de Melodias                  │
│                                                │
│  📄 DOCUMENTOS                          [▼]   │
│  ───────────────────────────────────────────  │
│  ┌─────────────┐  ┌─────────────┐            │
│  │ [Thumb RG]  │  │[Thumb Comp.]│            │
│  │             │  │             │            │
│  │ RG          │  │ Comprovante │            │
│  │ 12.345.678-9│  │ Residência  │            │
│  │ SSP/SP      │  │             │            │
│  │ [Ver]  [⬇️]  │  │ [Ver]  [⬇️]  │            │
│  └─────────────┘  └─────────────┘            │
│                                                │
│  ✅ Dados OCR Verificados                     │
│  Nome: Confere ✓ | CPF: Confere ✓            │
│  Data Nasc: Confere ✓                         │
│                                                │
│  ✍️ ASSINATURA DIGITAL                  [▼]   │
│  ───────────────────────────────────────────  │
│  Status: Não assinado ainda                   │
│  [Enviar link de assinatura]                  │
│                                                │
│  📅 HISTÓRICO / TIMELINE                [▼]   │
│  ───────────────────────────────────────────  │
│  ● 25/01/2026 14:55                           │
│    Candidato enviou proposta                  │
│    IP: 192.168.1.100                          │
│                                                │
│  ● 25/01/2026 14:50                           │
│    OCR processado com sucesso                 │
│                                                │
│  ● 25/01/2026 14:32                           │
│    Cadastro iniciado                          │
│                                                │
└────────────────────────────────────────────────┘
```

**Melhorias Modernas:**

```css
/* Layout do Dossiê */
.dossier-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.dossier-header {
  background: white;
  padding: 24px;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  margin-bottom: 24px;
}

.dossier-title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  margin-bottom: 12px;
}

.dossier-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  color: var(--gray-600);
  font-size: var(--text-sm);
}

/* Seções Colapsáveis */
.section {
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  margin-bottom: 16px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
  border-bottom: 1px solid var(--gray-200);
}

.section-header:hover {
  background: var(--gray-50);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.section-toggle {
  width: 24px;
  height: 24px;
  transition: transform 0.3s ease;
}

.section.collapsed .section-toggle {
  transform: rotate(-90deg);
}

.section-body {
  padding: 24px;
  max-height: 1000px;
  overflow: hidden;
  transition:
    max-height 0.3s ease,
    padding 0.3s ease;
}

.section.collapsed .section-body {
  max-height: 0;
  padding: 0 24px;
}

/* Dados em Grid */
.data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.data-item {
  padding: 12px;
  background: var(--gray-50);
  border-radius: var(--radius-md);
}

.data-label {
  font-size: var(--text-xs);
  color: var(--gray-600);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.data-value {
  font-size: var(--text-base);
  color: var(--gray-900);
  font-weight: var(--font-medium);
}

/* Documentos Thumbnail */
.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.document-card {
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: 16px;
  text-align: center;
  transition: all 0.2s ease;
  cursor: pointer;
}

.document-card:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.document-thumbnail {
  width: 100%;
  height: 150px;
  background: var(--gray-100);
  border-radius: var(--radius-md);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.document-thumbnail img {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
}

.document-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 12px;
}

/* Timeline */
.timeline {
  position: relative;
  padding-left: 32px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: linear-gradient(to bottom, var(--primary) 0%, var(--gray-300) 100%);
}

.timeline-item {
  position: relative;
  margin-bottom: 32px;
  padding-bottom: 16px;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: -24px;
  top: 4px;
  width: 16px;
  height: 16px;
  background: var(--primary);
  border: 3px solid white;
  border-radius: 50%;
  box-shadow: 0 0 0 3px var(--primary-light);
}

.timeline-item:last-child::before {
  background: var(--gray-300);
  box-shadow: none;
}

.timeline-date {
  font-size: var(--text-sm);
  color: var(--gray-600);
  font-weight: var(--font-medium);
  margin-bottom: 4px;
}

.timeline-content {
  background: var(--gray-50);
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.timeline-meta {
  font-size: var(--text-xs);
  color: var(--gray-500);
  margin-top: 8px;
}
```

---

### 7.7 Notificações & Toast

```
/* Toast Notification */
┌─────────────────────────────────┐
│  ✅ Link de assinatura enviado! │
│  E-mail e SMS enviados para     │
│  maria@email.com                │
│                            [✕]  │
└─────────────────────────────────┘
```

**Melhorias Modernas:**

```css
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
}

.toast {
  background: white;
  padding: 16px 20px;
  border-radius: var(--radius-lg);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  border-left: 4px solid var(--success);
  display: flex;
  align-items: start;
  gap: 12px;
  animation: toastSlideIn 0.3s ease;
}

@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.toast.success {
  border-left-color: var(--success);
}
.toast.error {
  border-left-color: var(--error);
}
.toast.warning {
  border-left-color: var(--warning);
}
.toast.info {
  border-left-color: var(--info);
}

.toast-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.toast-content {
  flex: 1;
}

.toast-title {
  font-weight: var(--font-semibold);
  margin-bottom: 4px;
}

.toast-message {
  font-size: var(--text-sm);
  color: var(--gray-600);
}

.toast-close {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.2s ease;
  flex-shrink: 0;
}

.toast-close:hover {
  background: var(--gray-100);
}

/* Progress bar no toast */
.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: var(--success);
  animation: toastProgress 5s linear;
}

@keyframes toastProgress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
```

**Badge de Notificação:**

```css
.notification-badge {
  position: relative;
}

.notification-badge::after {
  content: attr(data-count);
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--error);
  color: white;
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  min-width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  border: 2px solid white;
  animation: notificationPop 0.4s ease;
}

@keyframes notificationPop {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
```

---

## 🎯 8. Performance & Otimização

### 8.1 Lazy Loading

```javascript
// Lazy load de componentes pesados
const DossierModal = lazy(() => import('./components/DossierModal'));
const ReportsPage = lazy(() => import('./pages/Reports'));

// Lazy loading de imagens
<img src="placeholder.jpg" data-src="document-large.jpg" loading="lazy" alt="Documento" />;
```

### 8.2 Virtualization

```javascript
// Para tabelas com muitas linhas
import { FixedSizeList } from 'react-window';

<FixedSizeList height={600} itemCount={proposals.length} itemSize={60} width="100%">
  {Row}
</FixedSizeList>;
```

### 8.3 Debounce em Buscas

```javascript
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 500);

useEffect(() => {
  if (debouncedSearch) {
    searchProposals(debouncedSearch);
  }
}, [debouncedSearch]);
```

---

## 🔒 9. LGPD & Privacidade

### 9.1 Privacy Gate (Antes do Cadastro)

```
┌─────────────────────────────────────┐
│  Proteção de Dados Pessoais         │
│  ─────────────────────────────────  │
│                                     │
│  A SBACEM respeita sua privacidade  │
│  e está em conformidade com a LGPD. │
│                                     │
│  Coletaremos os seguintes dados:    │
│  • Informações pessoais (nome, CPF) │
│  • Documentos com foto              │
│  • Dados de contato                 │
│  • Perfil artístico                 │
│                                     │
│  Seus dados serão utilizados para:  │
│  • Processo de filiação             │
│  • Gestão de direitos autorais     │
│  • Comunicação institucional        │
│                                     │
│  ☑ Li e aceito a Política de       │
│    Privacidade [Ver política]      │
│                                     │
│  ☑ Concordo com o tratamento dos   │
│    meus dados pessoais             │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Aceitar e Continuar  →     │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Não aceito]                       │
│                                     │
└─────────────────────────────────────┘
```

### 9.2 Dados Mascarados (Admin)

```javascript
// CPF mascarado: 123.***.***-00
const maskCPF = (cpf) => {
  return cpf.replace(/(\d{3})\d{6}(\d{2})/, '$1.***.***-$2');
};

// Conta bancária: ****5-6
const maskAccount = (account) => {
  return account.replace(/\d+(?=\d{2})/, '****');
};
```

---

## 📱 10. PWA (Progressive Web App)

### 10.1 Manifest

```json
{
  "name": "SBACEM Filiação Digital",
  "short_name": "SBACEM",
  "description": "Plataforma de filiação 100% online",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0f766e",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 10.2 Service Worker

```javascript
// Cache First para assets estáticos
// Network First para API calls
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    // Network first para dados dinâmicos
    event.respondWith(networkFirst(event.request));
  } else {
    // Cache first para assets
    event.respondWith(cacheFirst(event.request));
  }
});
```

---

## 🧪 11. Testes & Qualidade

### 11.1 Testes Visuais

- Snapshot testing de componentes críticos
- Visual regression testing (Percy, Chromatic)
- Lighthouse CI (performance, accessibility)

### 11.2 Checklist de UX

- [ ] Todos os botões têm min 44x44px
- [ ] Contraste de cores ≥ 4.5:1
- [ ] Focus states visíveis
- [ ] Loading states em todas as ações assíncronas
- [ ] Mensagens de erro claras e acionáveis
- [ ] Sucesso celebrado com feedback positivo
- [ ] Navegação por teclado funcional
- [ ] Screen reader friendly
- [ ] Touch gestures funcionais (swipe, pinch)

---

## 📦 12. Arquivos Críticos

```
src/
├── styles/
│   ├── design-system.css      # Variáveis CSS, cores, espaçamentos
│   ├── animations.css         # Animações e transições
│   └── utilities.css          # Classes utilitárias
├── components/
│   ├── Button.tsx             # Botões com estados
│   ├── Input.tsx              # Inputs com validação visual
│   ├── Card.tsx               # Cards genéricos
│   ├── Badge.tsx              # Status badges
│   ├── Modal.tsx              # Modais reutilizáveis
│   ├── Toast.tsx              # Notificações toast
│   └── Table.tsx              # Tabela responsiva
├── features/
│   ├── cadastro/
│   │   ├── Step1Profile.tsx   # Etapa 1: Perfil
│   │   ├── Step2Dados.tsx     # Etapa 2: Dados
│   │   ├── Step3Docs.tsx      # Etapa 3: Documentos
│   │   └── Step4Review.tsx    # Etapa 4: Revisão
│   └── backoffice/
│       ├── Dashboard.tsx      # Dashboard KPIs
│       ├── ProposalsTable.tsx # Tabela de propostas
│       ├── DossierView.tsx    # Dossiê completo
│       └── SignatureModal.tsx # Modal de assinatura
└── hooks/
    ├── useAutosave.ts         # Hook de autosave
    ├── useDebounce.ts         # Hook de debounce
    └── useMediaQuery.ts       # Hook de responsive
```

---

## ✅ 13. Verificação (Testing Plan)

### 13.1 Teste End-to-End (Usuário)

1. Acessar landing page
2. Clicar em "Iniciar Cadastro"
3. Selecionar perfil artístico (múltipla escolha)
4. Preencher dados básicos com autosave
5. Validar CPF em tempo real
6. Enviar foto de documento
7. Aguardar OCR e confirmar dados
8. Revisar resumo e enviar
9. Receber confirmação com protocolo
10. Acompanhar status

### 13.2 Teste End-to-End (Admin)

1. Login no backoffice
2. Visualizar dashboard com KPIs atualizados
3. Filtrar propostas por status "Aguardando Análise"
4. Abrir dossiê completo
5. Validar documentos
6. Clicar em "Enviar para Assinatura"
7. Confirmar envio no modal
8. Verificar mudança de status para "Aguardando Assinatura"
9. Verificar notificação toast de sucesso
10. Verificar atualização do KPI

### 13.3 Testes Visuais

- [ ] Responsividade em 375px, 768px, 1024px
- [ ] Dark mode (se implementado)
- [ ] Estados de hover, focus, active
- [ ] Animações suaves (sem jank)
- [ ] Loading states (skeleton, spinner)
- [ ] Navegação por teclado
- [ ] Leitura por screen reader

### 13.4 Performance

- [ ] Lighthouse score > 90 (performance)
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Cumulative Layout Shift < 0.1

---

## 🎉 Conclusão

Este plano de design visual moderno prioriza:

✅ **Mobile-First** - Progressive disclosure, touch-friendly
✅ **Performance** - Lazy loading, debounce, virtualization
✅ **Acessibilidade** - WCAG 2.1 AA, keyboard navigation
✅ **UX Moderna** - Micro-interações, feedback instantâneo
✅ **Consistência** - Design system robusto
✅ **LGPD** - Privacy gate, dados mascarados

**Stack Recomendado:**

- React 18+ / Next.js 14+
- Tailwind CSS
- Framer Motion (animações)
- React Hook Form + Zod
- PWA Support

**Próximos Passos:**

1. Aprovar design system (cores, tipografia, espaçamento)
2. Implementar componentes base (Button, Input, Card)
3. Desenvolver fluxo de cadastro (4 etapas)
4. Desenvolver backoffice (dashboard, tabela, dossiê)
5. Integrar OCR e assinatura digital
6. Testes e refinamento

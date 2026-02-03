import Link from 'next/link';

const HIGHLIGHTS = [
  'Cadastro em 10 minutos',
  'Assinatura digital integrada',
  'Acompanhamento em tempo real',
];

const STEPS = [
  {
    title: 'Perfil artistico',
    desc: 'Selecione sua area de atuacao e confirme os dados iniciais.',
  },
  {
    title: 'Dados pessoais',
    desc: 'Preenchimento com validacao em tempo real e autosave.',
  },
  {
    title: 'Documentos + OCR',
    desc: 'Envio guiado com leitura automatica e alertas de divergencia.',
  },
  {
    title: 'Revisao final',
    desc: 'Confirme todas as informacoes antes de concluir.',
  },
];

const FEATURES = [
  {
    title: 'Validacao instantanea',
    desc: 'CPF, email, telefone e CEP seguem as mesmas regras da API.',
  },
  {
    title: 'Autosave inteligente',
    desc: 'Persistencia local imediata e sincronizacao segura no backend.',
  },
  {
    title: 'OCR com alertas',
    desc: 'Divergencias sao exibidas assim que o documento e processado.',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen-dvh bg-soft-gradient px-4 py-12 sm:px-8 sm:py-16">
      <div className="page-shell flex flex-col gap-12">
        <header className="surface-glass p-8 shadow-[var(--shadow-xl)] sm:p-12">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--gray-500)]">
                Filiacao digital SBACEM
              </p>
              <h1 className="mt-4 text-4xl font-semibold text-[color:var(--gray-900)] sm:text-5xl">
                Filiacao 100% online, guiada e com verificacao automatica.
              </h1>
              <p className="mt-4 max-w-xl text-sm text-[color:var(--gray-500)] sm:text-base">
                Um fluxo mobile-first com validacoes em tempo real, OCR automatico e assinatura
                digital integrada para reduzir atrito e acelerar o processo.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/cadastro"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200/70 transition hover:bg-[var(--primary-dark)]"
                >
                  Iniciar cadastro
                </Link>
                <Link
                  href="/acompanhar"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--gray-700)] transition hover:border-[var(--gray-300)]"
                >
                  Ja sou filiado
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-4 text-sm text-[color:var(--gray-500)]">
                {HIGHLIGHTS.map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-[color:var(--primary)]">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                        <path
                          d="M5 13l4 4L19 7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-[var(--border)] bg-white/90 p-5 shadow-[var(--shadow-md)]"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
                    Beneficio
                  </p>
                  <h3 className="mt-3 text-base font-semibold text-[color:var(--gray-900)]">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm text-[color:var(--gray-500)]">{card.desc}</p>
                </div>
              ))}
              <div className="rounded-2xl border border-[var(--primary-light)] bg-orange-50 p-5 shadow-[var(--shadow-md)]">
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--primary)]">
                  Tempo medio
                </p>
                <h3 className="mt-3 text-3xl font-semibold text-[color:var(--gray-900)]">10 min</h3>
                <p className="mt-2 text-sm text-[color:var(--gray-500)]">
                  Do inicio ao envio da proposta, com autosave.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--gray-500)]">
                Como funciona
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-[color:var(--gray-900)]">
                Um fluxo simples em quatro etapas.
              </h2>
            </div>
            <Link
              href="/cadastro"
              className="text-sm font-semibold text-[color:var(--primary)] hover:text-[var(--primary-dark)]"
            >
              Ver etapas detalhadas
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <div
                key={step.title}
                className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-sm)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-[color:var(--primary)]">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-base font-semibold text-[color:var(--gray-900)]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-[color:var(--gray-500)]">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-[var(--border)] bg-white p-8 shadow-[var(--shadow-lg)]">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--gray-500)]">
              Privacidade e LGPD
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[color:var(--gray-900)]">
              Seus dados protegidos do inicio ao fim.
            </h2>
            <p className="mt-3 text-sm text-[color:var(--gray-500)]">
              Criptografia ponta a ponta, controle de acesso e logs de auditoria garantem total
              rastreabilidade e conformidade com a LGPD.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm text-[color:var(--gray-500)]">
              <span className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1">
                Criptografia AES-256
              </span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1">
                Webhooks assinados
              </span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1">
                Consentimento registrado
              </span>
            </div>
          </div>
          <div className="rounded-3xl border border-[var(--border)] bg-gradient-to-br from-white via-white to-orange-50 p-8 shadow-[var(--shadow-lg)]">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--gray-500)]">
              Acompanhar
            </p>
            <h3 className="mt-3 text-xl font-semibold text-[color:var(--gray-900)]">
              Ja enviou sua proposta?
            </h3>
            <p className="mt-2 text-sm text-[color:var(--gray-500)]">
              Consulte o status, receba alertas e finalize o fluxo quando necessario.
            </p>
            <Link
              href="/acompanhar"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--gray-700)] transition hover:border-[var(--gray-300)]"
            >
              Acessar acompanhamento
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

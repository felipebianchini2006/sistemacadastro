export default function PrivacyPage() {
  return (
    <div className="min-h-screen-dvh bg-soft-gradient px-4 py-10 sm:px-8">
      <div className="page-shell flex flex-col gap-6">
        <header className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-md)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--gray-500)]">
            LGPD
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[color:var(--gray-900)]">
            Politica de Privacidade
          </h1>
          <p className="mt-2 text-sm text-[color:var(--gray-500)]">
            Esta politica explica como tratamos seus dados pessoais no processo de filiacao.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)]">
            <h2 className="text-lg font-semibold text-[color:var(--gray-900)]">Dados coletados</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[color:var(--gray-500)]">
              <li>Dados de identificacao (nome, CPF, data de nascimento).</li>
              <li>Contato (email e telefone).</li>
              <li>Documentos enviados e resultados de OCR.</li>
              <li>Dados bancarios e redes sociais (opcional, quando informados).</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)]">
            <h2 className="text-lg font-semibold text-[color:var(--gray-900)]">Finalidades</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[color:var(--gray-500)]">
              <li>Processar sua proposta de filiacao.</li>
              <li>Validar informacoes e documentos.</li>
              <li>Gerenciar assinatura digital e integracao com o ERP.</li>
              <li>Comunicar o andamento da proposta.</li>
            </ul>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)]">
            <h2 className="text-lg font-semibold text-[color:var(--gray-900)]">Seus direitos</h2>
            <p className="mt-2 text-sm text-[color:var(--gray-500)]">
              Voce pode solicitar acesso, correcao ou exclusao dos seus dados pessoais. Para
              exclusao, utilize a opcao disponivel na pagina de acompanhamento.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-[color:var(--gray-500)]">
              <span className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1">
                Acesso
              </span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1">
                Correcao
              </span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1">
                Exclusao
              </span>
            </div>
          </div>
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)]">
            <h2 className="text-lg font-semibold text-[color:var(--gray-900)]">Contato</h2>
            <p className="mt-2 text-sm text-[color:var(--gray-500)]">
              Em caso de duvidas, entre em contato com o suporte da SBACEM.
            </p>
            <p className="mt-4 text-sm font-semibold text-[color:var(--primary)]">
              suporte@sistema-cadastro.com.br
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

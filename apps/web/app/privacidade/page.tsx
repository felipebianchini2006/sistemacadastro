export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-soft-gradient px-4 py-10 sm:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">LGPD</p>
          <h1 className="mt-3 text-3xl font-semibold text-zinc-900">Politica de Privacidade</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Esta politica explica como tratamos seus dados pessoais no processo de filiacao.
          </p>
        </header>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-zinc-900">Dados coletados</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-600">
            <li>Dados de identificacao (nome, CPF, data de nascimento).</li>
            <li>Contato (email e telefone).</li>
            <li>Documentos enviados e resultados de OCR.</li>
            <li>Dados bancarios e redes sociais (opcional, quando informados).</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-zinc-900">Finalidades</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-600">
            <li>Processar sua proposta de filiacao.</li>
            <li>Validar informacoes e documentos.</li>
            <li>Gerenciar assinatura digital e integracao com o ERP.</li>
            <li>Comunicar o andamento da proposta.</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-zinc-900">Seus direitos</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Voce pode solicitar acesso, correcao ou exclusao dos seus dados pessoais. Para exclusao,
            utilize a opcao disponivel na pagina de acompanhamento.
          </p>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-zinc-900">Contato</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Em caso de duvidas, entre em contato com o suporte da SBACEM.
          </p>
        </section>
      </div>
    </div>
  );
}

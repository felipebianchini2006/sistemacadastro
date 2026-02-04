import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen-dvh bg-soft-gradient">
      <div className="page-shell flex min-h-screen-dvh flex-col items-center justify-center py-16">
        <div className="w-full max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-[var(--shadow-md)]">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--gray-500)]">404</p>
          <h1 className="mt-3 text-2xl font-semibold text-[color:var(--gray-900)]">
            Pagina nao encontrada
          </h1>
          <p className="mt-3 text-sm text-[color:var(--gray-500)]">
            A pagina solicitada nao existe ou foi movida.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition hover:bg-[var(--primary-dark)]"
            >
              Voltar ao inicio
            </Link>
            <Link
              href="/acompanhar"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[color:var(--gray-700)] transition hover:border-[var(--primary)]"
            >
              Acompanhar cadastro
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

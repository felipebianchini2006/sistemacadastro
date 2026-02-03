'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="min-h-screen-dvh bg-soft-gradient">
        <div className="page-shell flex min-h-screen-dvh flex-col items-center justify-center py-16">
          <div className="surface-glass w-full max-w-xl rounded-3xl p-8 shadow-[var(--shadow-xl)]">
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--gray-500)]">
              Erro global
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-[color:var(--gray-900)]">
              Algo inesperado aconteceu
            </h1>
            <p className="mt-3 text-sm text-[color:var(--gray-500)]">
              Recarregue para tentar novamente ou aguarde alguns instantes.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white shadow-md shadow-orange-200/70 transition hover:bg-[var(--primary-dark)]"
              >
                Recarregar pagina
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

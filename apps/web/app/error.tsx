'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from './components/ui/button';

export default function Error({
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
    <div className="min-h-screen-dvh bg-soft-gradient">
      <div className="page-shell flex min-h-screen-dvh flex-col items-center justify-center py-16">
        <div className="w-full max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-[var(--shadow-md)]">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--gray-500)]">
            Ocorreu um problema
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-[color:var(--gray-900)]">
            Nao foi possivel carregar esta pagina
          </h1>
          <p className="mt-3 text-sm text-[color:var(--gray-500)]">
            Tente novamente ou volte para a pagina inicial. Se o erro persistir, nossa equipe pode
            ajudar.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => reset()}>Tentar novamente</Button>
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[color:var(--gray-700)] transition hover:border-[var(--primary)]"
            >
              Ir para inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

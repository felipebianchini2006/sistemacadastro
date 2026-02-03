import { Suspense } from 'react';
import ClientPage from './ClientPage';

export default function AcompanharPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen-dvh bg-soft-gradient px-4 py-10 sm:px-8">
          <div className="page-shell rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[color:var(--gray-500)]">
            Carregando...
          </div>
        </div>
      }
    >
      <ClientPage />
    </Suspense>
  );
}

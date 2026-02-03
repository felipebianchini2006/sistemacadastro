import { Suspense } from 'react';
import ClientPage from './ClientPage';

export default function AdminProposalsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen-dvh bg-soft-gradient px-6 py-10">
          <div className="mx-auto w-full max-w-6xl rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[color:var(--gray-500)]">
            Carregando...
          </div>
        </div>
      }
    >
      <ClientPage />
    </Suspense>
  );
}

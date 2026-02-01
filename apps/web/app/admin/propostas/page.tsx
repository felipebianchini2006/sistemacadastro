import { Suspense } from 'react';
import ClientPage from './ClientPage';

export default function AdminProposalsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-soft-gradient px-6 py-10">
          <div className="mx-auto w-full max-w-6xl rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
            Carregando...
          </div>
        </div>
      }
    >
      <ClientPage />
    </Suspense>
  );
}

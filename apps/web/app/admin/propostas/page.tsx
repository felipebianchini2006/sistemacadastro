import { Suspense } from 'react';
import ClientPage from './ClientPage';

export default function AdminProposalsPage() {
  return (
    <Suspense
      fallback={
        <div className="admin-theme admin-shell min-h-screen-dvh px-6 py-10">
          <div className="admin-panel mx-auto w-full max-w-6xl rounded-3xl p-6 text-sm text-[color:var(--gray-500)]">
            Carregando...
          </div>
        </div>
      }
    >
      <ClientPage />
    </Suspense>
  );
}

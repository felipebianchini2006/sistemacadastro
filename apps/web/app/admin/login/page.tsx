import { Suspense } from 'react';
import ClientPage from './ClientPage';

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="admin-theme admin-shell min-h-screen-dvh px-4 py-16">
          <div className="admin-panel mx-auto w-full max-w-md rounded-3xl p-8 text-sm text-[color:var(--gray-500)]">
            Carregando...
          </div>
        </div>
      }
    >
      <ClientPage />
    </Suspense>
  );
}

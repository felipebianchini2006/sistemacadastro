import { Suspense } from 'react';
import ClientPage from './ClientPage';

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen-dvh bg-soft-gradient px-4 py-16">
          <div className="mx-auto w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-sm text-[color:var(--gray-500)]">
            Carregando...
          </div>
        </div>
      }
    >
      <ClientPage />
    </Suspense>
  );
}

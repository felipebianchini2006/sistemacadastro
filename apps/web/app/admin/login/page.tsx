import { Suspense } from 'react';
import ClientPage from './ClientPage';

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-soft-gradient px-4 py-16">
          <div className="mx-auto w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500">
            Carregando...
          </div>
        </div>
      }
    >
      <ClientPage />
    </Suspense>
  );
}

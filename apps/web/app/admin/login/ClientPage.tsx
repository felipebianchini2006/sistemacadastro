'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { loginAdmin } from '../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export default function ClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/admin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loginAdmin(email, password);
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-theme admin-shell min-h-screen-dvh px-4 py-16">
      <div className="admin-panel mx-auto w-full max-w-md rounded-3xl p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--gray-500)]">
          Admin
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-[color:var(--gray-900)]">
          Entrar no painel
        </h1>
        <p className="mt-2 text-sm text-[color:var(--gray-500)]">
          Use seu email corporativo para acessar.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <Input
            label="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
          />
          <Input
            label="Senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            required
          />
          {error ? (
            <div className="rounded-2xl border border-[color:var(--error-border)] bg-[color:var(--error-soft)] px-4 py-3 text-sm text-[color:var(--error)]">
              {error}
            </div>
          ) : null}
          <Button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { loginAdmin } from '../lib/api';
import { Button } from '../../components/ui/button';

export default function AdminLoginPage() {
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
    <div className="min-h-screen bg-soft-gradient px-4 py-16">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Admin</p>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-900">Entrar no painel</h1>
        <p className="mt-2 text-sm text-zinc-500">Use seu email corporativo para acessar.</p>
        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <label className="flex flex-col gap-2 text-sm text-zinc-700">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-zinc-700">
            Senha
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              required
            />
          </label>
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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

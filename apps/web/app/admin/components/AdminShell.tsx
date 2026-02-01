'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getStoredAdminUser } from '../lib/auth';
import { logoutAdmin, adminFetchWithRefresh } from '../lib/api';
import { Button } from '../../components/ui/button';

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/propostas', label: 'Propostas' },
];

type ProposalSummary = { id: string; status: string };

export const AdminShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const user = getStoredAdminUser();
  const [submittedCount, setSubmittedCount] = useState(0);

  useEffect(() => {
    if (pathname?.startsWith('/admin/login')) return;
    adminFetchWithRefresh<ProposalSummary[]>('/admin/proposals?status=SUBMITTED')
      .then((items) => setSubmittedCount(items.length))
      .catch(() => {});
  }, [pathname]);

  if (pathname?.startsWith('/admin/login')) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-soft-gradient">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl">
        <aside className="hidden w-64 flex-col gap-6 border-r border-zinc-200 bg-white/80 p-6 backdrop-blur lg:flex">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Admin</p>
            <h2 className="mt-2 text-xl font-semibold text-zinc-900">Sistema Cadastro</h2>
          </div>
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              const badge =
                item.href === '/admin/propostas' && submittedCount > 0 ? submittedCount : null;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    isActive ? 'bg-emerald-600 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {item.label}
                  {badge ? (
                    <span
                      className={`ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                        isActive ? 'bg-white text-emerald-700' : 'bg-red-500 text-white'
                      }`}
                    >
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto rounded-2xl border border-zinc-200 bg-white p-4 text-xs text-zinc-500">
            <p className="font-semibold text-zinc-700">Logado como</p>
            <p className="mt-1 text-sm text-zinc-700">{user?.email ?? 'usuario'}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em]">
              {user?.roles?.join(', ') ?? '---'}
            </p>
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Admin</p>
              <h1 className="text-lg font-semibold text-zinc-900">Painel de controle</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-zinc-600 md:block">
                {user?.email ?? 'usuario'}
              </span>
              <Button
                variant="secondary"
                onClick={async () => {
                  await logoutAdmin();
                  router.push('/admin/login');
                }}
              >
                Sair
              </Button>
            </div>
          </header>

          <main className="flex-1 px-4 py-8 sm:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
};

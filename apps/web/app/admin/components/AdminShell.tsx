'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getStoredAdminUser } from '../lib/auth';
import { logoutAdmin, adminFetchWithRefresh } from '../lib/api';
import { Button } from '../../components/ui/button';

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/propostas', label: 'Propostas' },
  { href: '/admin/totvs', label: 'Totvs' },
];

type ProposalSummary = { id: string; status: string };

export const AdminShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const user = getStoredAdminUser();
  const [submittedCount, setSubmittedCount] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith('/admin/login')) return;
    adminFetchWithRefresh<ProposalSummary[]>('/admin/proposals?status=SUBMITTED')
      .then((items) => setSubmittedCount(items.length))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    )
      return;
    setPushSupported(true);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushEnabled(!!sub))
      .catch(() => {});
  }, []);

  const togglePush = useCallback(async () => {
    if (!pushSupported) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      if (pushEnabled) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await adminFetchWithRefresh('/admin/push/unsubscribe', {
            method: 'DELETE',
            body: { endpoint: sub.endpoint },
          });
          await sub.unsubscribe();
        }
        setPushEnabled(false);
      } else {
        const { publicKey } = await adminFetchWithRefresh<{ publicKey: string }>(
          '/admin/push/vapid-key',
        );
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey,
        });
        const json = sub.toJSON();
        await adminFetchWithRefresh('/admin/push/subscribe', {
          method: 'POST',
          body: {
            endpoint: sub.endpoint,
            keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
          },
        });
        setPushEnabled(true);
      }
    } catch {
      // Permission denied or API error
    }
  }, [pushEnabled, pushSupported]);

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
                  aria-current={isActive ? 'page' : undefined}
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
          <div className="mt-auto rounded-2xl border border-zinc-200 bg-white p-4 text-xs text-zinc-600">
            <p className="font-semibold text-zinc-700">Logado como</p>
            <p className="mt-1 text-sm text-zinc-700">{user?.email ?? 'usuario'}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em]">
              {user?.roles?.join(', ') ?? '---'}
            </p>
            {pushSupported ? (
              <button
                type="button"
                onClick={togglePush}
                className="mt-3 flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"
                aria-label={
                  pushEnabled ? 'Desativar notificacoes push' : 'Ativar notificacoes push'
                }
              >
                <span>Notificacoes push</span>
                <span
                  className={`inline-block h-3 w-3 rounded-full ${pushEnabled ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                  aria-hidden="true"
                />
              </button>
            ) : null}
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

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getStoredAdminUser } from '../lib/auth';
import { LayoutDashboard, FileText, Layers, RefreshCcw } from 'lucide-react';
import { logoutAdmin, adminFetchWithRefresh } from '../lib/api';
import { Button } from '../../components/ui/button';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/propostas', label: 'Propostas', icon: FileText },
  { href: '/admin/filas', label: 'Filas', icon: Layers },
  { href: '/admin/totvs', label: 'Totvs', icon: RefreshCcw },
] as const;

type ProposalSummary = { id: string; status: string };

export const AdminShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const user = getStoredAdminUser();
  const [submittedCount, setSubmittedCount] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith('/admin/login')) return;
    adminFetchWithRefresh<ProposalSummary[]>('/admin/proposals?status=SUBMITTED')
      .then((items) => setSubmittedCount(items.length))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    document.body.classList.add('admin-theme');
    return () => {
      document.body.classList.remove('admin-theme');
    };
  }, []);

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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
    <div className="admin-theme admin-shell min-h-screen-dvh">
      <div className="flex min-h-screen-dvh w-full min-w-0">
        {mobileOpen ? (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            aria-label="Fechar menu"
          />
        ) : null}
        <aside
          className={`admin-panel fixed inset-y-0 left-0 z-50 w-72 translate-x-0 p-6 transition-transform lg:hidden ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-hidden={!mobileOpen}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
                Admin
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[color:var(--gray-900)]">
                Sistema Cadastro
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[color:var(--gray-500)]"
              aria-label="Fechar menu"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6l-12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <nav className="mt-6 flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              const badge =
                item.href === '/admin/propostas' && submittedCount > 0 ? submittedCount : null;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`admin-nav-link flex items-center justify-between rounded-xl px-4 py-2 pl-7 text-sm font-semibold transition ${
                    isActive
                      ? 'is-active bg-[color:var(--primary-soft)] text-[color:var(--gray-900)]'
                      : 'text-[color:var(--gray-500)] hover:bg-[color:rgba(255,255,255,0.04)]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </span>
                  {badge ? (
                    <span
                      className={`ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                        isActive ? 'bg-[var(--primary)] text-white' : 'bg-[var(--error)] text-white'
                      }`}
                    >
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/70 p-4 text-xs text-[color:var(--gray-500)]">
            <p className="font-semibold text-[color:var(--gray-700)]">Logado como</p>
            <p className="mt-1 text-sm text-[color:var(--gray-700)]">{user?.email ?? 'usuario'}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
              {user?.roles?.join(', ') ?? '---'}
            </p>
            {pushSupported ? (
              <button
                type="button"
                onClick={togglePush}
                className="mt-3 flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[color:var(--gray-700)] hover:bg-[var(--muted)]"
                aria-label={
                  pushEnabled ? 'Desativar notificacoes push' : 'Ativar notificacoes push'
                }
              >
                <span>Notificacoes push</span>
                <span
                  className={`inline-block h-3 w-3 rounded-full ${pushEnabled ? 'bg-[color:var(--success)]' : 'bg-[var(--gray-300)]'}`}
                  aria-hidden="true"
                />
              </button>
            ) : null}
          </div>
        </aside>

        <aside className="admin-panel hidden w-60 flex-col gap-6 p-6 lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
              Admin
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[color:var(--gray-900)]">
              Sistema Cadastro
            </h2>
          </div>
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              const badge =
                item.href === '/admin/propostas' && submittedCount > 0 ? submittedCount : null;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`admin-nav-link flex items-center justify-between rounded-xl px-4 py-2 pl-7 text-sm font-semibold transition ${
                    isActive
                      ? 'is-active bg-[color:var(--primary-soft)] text-[color:var(--gray-900)]'
                      : 'text-[color:var(--gray-500)] hover:bg-[color:rgba(255,255,255,0.04)]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </span>
                  {badge ? (
                    <span
                      className={`ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                        isActive ? 'bg-[var(--primary)] text-white' : 'bg-[var(--error)] text-white'
                      }`}
                    >
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto rounded-2xl border border-[var(--border)] bg-[var(--muted)]/70 p-4 text-xs text-[color:var(--gray-500)]">
            <p className="font-semibold text-[color:var(--gray-700)]">Logado como</p>
            <p className="mt-1 text-sm text-[color:var(--gray-700)]">{user?.email ?? 'usuario'}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
              {user?.roles?.join(', ') ?? '---'}
            </p>
            {pushSupported ? (
              <button
                type="button"
                onClick={togglePush}
                className="mt-3 flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[color:var(--gray-700)] hover:bg-[var(--muted)]"
                aria-label={
                  pushEnabled ? 'Desativar notificacoes push' : 'Ativar notificacoes push'
                }
              >
                <span>Notificacoes push</span>
                <span
                  className={`inline-block h-3 w-3 rounded-full ${pushEnabled ? 'bg-[color:var(--success)]' : 'bg-[var(--gray-300)]'}`}
                  aria-hidden="true"
                />
              </button>
            ) : null}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="admin-panel sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
                Admin
              </p>
              <h1 className="text-lg font-semibold text-[color:var(--gray-900)]">
                Painel de controle
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[color:var(--gray-500)] lg:hidden"
                aria-label="Abrir menu"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                  <path
                    d="M4 7h16M4 12h16M4 17h16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <span className="hidden text-sm text-[color:var(--gray-500)] md:block">
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

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
};

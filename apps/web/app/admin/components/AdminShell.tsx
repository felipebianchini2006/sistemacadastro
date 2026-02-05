'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getStoredAdminUser, type AdminUser } from '../lib/auth';
import {
  Bell,
  FileText,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  RefreshCcw,
  Users,
  X,
} from 'lucide-react';
import { logoutAdmin, adminFetchWithRefresh } from '../lib/api';
import { cn } from '../../lib/utils';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/propostas', label: 'Propostas', icon: FileText },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
  { href: '/admin/filas', label: 'Filas', icon: Layers },
  { href: '/admin/totvs', label: 'Totvs', icon: RefreshCcw },
] as const;

type ProposalSummary = { id: string; status: string };

export const AdminShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
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
    setUser(getStoredAdminUser());
  }, []);

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

  const activeTitle = useMemo(() => {
    const found = navItems.find(
      (item) => pathname === item.href || pathname?.startsWith(`${item.href}/`),
    );
    return found?.label ?? 'Admin';
  }, [pathname]);

  const userInitials = useMemo(() => {
    const email = user?.email ?? '';
    if (!email) return 'AD';
    const base = email.split('@')[0]?.replace(/[^a-zA-Z0-9]+/g, ' ') ?? '';
    const parts = base.split(' ').filter(Boolean);
    if (parts.length === 0) return email.slice(0, 2).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [user?.email]);

  const userRoleLabel = useMemo(() => {
    if (!user?.roles?.length) return 'Admin';
    const map: Record<string, string> = {
      ADMIN: 'Admin',
      ANALYST: 'Analista',
      VIEWER: 'Visualizador',
    };
    return user.roles.map((role) => map[role] ?? role).join(', ');
  }, [user?.roles]);

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

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[color:var(--gray-900)]">Sistema Cadastro</p>
          <p className="mt-1 text-xs text-[color:var(--gray-500)]">Painel administrativo</p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[color:var(--gray-500)]"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
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
              className={cn('admin-nav-link', isActive && 'is-active')}
              onClick={onClose}
            >
              <span className="flex items-center gap-3">
                <Icon className="admin-nav-icon h-4 w-4" aria-hidden="true" />
                {item.label}
              </span>
              {badge ? (
                <span
                  className={cn(
                    'ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold',
                    isActive ? 'bg-white/20 text-white' : 'bg-[var(--error)] text-white',
                  )}
                >
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[var(--border)] pt-6">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--gray-50)] p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--gray-200)] text-xs font-bold text-[color:var(--gray-700)]">
            {userInitials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[color:var(--gray-900)]">
              {user?.email ?? 'admin@email.com'}
            </p>
            <p className="text-xs text-[color:var(--gray-500)]">{userRoleLabel}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {pushSupported ? (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-[color:var(--gray-500)]">
                <Bell className="h-4 w-4" aria-hidden="true" />
                Push
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={pushEnabled}
                onClick={togglePush}
                className={cn('admin-toggle', pushEnabled && 'is-on')}
                aria-label={
                  pushEnabled ? 'Desativar notificacoes push' : 'Ativar notificacoes push'
                }
              />
            </div>
          ) : null}

          <button
            type="button"
            onClick={async () => {
              await logoutAdmin();
              router.push('/admin/login');
            }}
            className="flex items-center gap-2 text-sm font-semibold text-[color:var(--gray-500)] hover:text-[color:var(--gray-900)]"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-theme admin-shell min-h-screen-dvh">
      <div className="flex min-h-screen-dvh w-full min-w-0">
        {mobileOpen ? (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            aria-label="Fechar menu"
          />
        ) : null}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-72 bg-[var(--card)] p-6 shadow-[var(--shadow-lg)] transition-transform lg:hidden',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          aria-hidden={!mobileOpen}
        >
          <SidebarContent onClose={() => setMobileOpen(false)} />
        </aside>

        <aside className="hidden w-64 flex-col border-r border-[var(--border)] bg-[var(--card)] px-5 py-6 lg:flex lg:h-screen lg:overflow-y-auto">
          <SidebarContent />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="admin-mobile-header flex items-center gap-3 px-4 py-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[color:var(--gray-500)]"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div>
              <p className="text-xs text-[color:var(--gray-500)]">Sistema Cadastro</p>
              <p className="text-sm font-semibold text-[color:var(--gray-900)]">{activeTitle}</p>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
};

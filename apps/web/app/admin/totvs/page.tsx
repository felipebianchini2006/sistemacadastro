'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminFetchWithRefresh } from '../lib/api';
import { KpiCard } from '../components/KpiCard';
import { StatusBadge } from '../../components/StatusBadge';
import { cn } from '../../lib/utils';

type TotvsStats = {
  pending: number;
  synced: number;
  failed: number;
  total: number;
  successRate: number;
  lastSyncAt: string | null;
  lastFailureAt: string | null;
};

type TotvsSync = {
  id: string;
  proposalId: string;
  protocol: string | null;
  candidateName: string | null;
  proposalStatus: string | null;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  externalId: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  PENDING: { label: 'Pendente', tone: 'warning' },
  SYNCED: { label: 'Sincronizado', tone: 'success' },
  FAILED: { label: 'Falhou', tone: 'danger' },
};

const formatDate = (iso: string | null) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('pt-BR');
};

const formatRelative = (iso: string | null) => {
  if (!iso) return '-';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Agora mesmo';
  if (minutes < 60) return `${minutes}min atras`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atras`;
  const days = Math.floor(hours / 24);
  return `${days}d atras`;
};

export default function TotvsMonitorPage() {
  const [stats, setStats] = useState<TotvsStats | null>(null);
  const [syncs, setSyncs] = useState<TotvsSync[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'SYNCED' | 'FAILED'>('ALL');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, syncsRes] = await Promise.all([
          adminFetchWithRefresh<TotvsStats>('/admin/totvs/stats'),
          adminFetchWithRefresh<TotvsSync[]>('/admin/totvs/recent'),
        ]);
        setStats(statsRes);
        setSyncs(syncsRes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar dados Totvs');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filtered = filter === 'ALL' ? syncs : syncs.filter((s) => s.status === filter);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[color:var(--gray-900)]">
            Monitoramento Totvs
          </h2>
          <p className="mt-1 text-sm text-[color:var(--gray-500)]">
            Acompanhe a sincronizacao com o ERP Totvs.
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--gray-700)] hover:text-[color:var(--gray-900)]"
        >
          <span aria-hidden="true">←</span> Voltar ao Dashboard
        </Link>
      </div>

      {error ? (
        <div className="rounded-2xl border border-[color:var(--error-border)] bg-[color:var(--error-soft)] px-4 py-3 text-sm text-[color:var(--error)]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="admin-card px-4 py-3 text-sm text-[color:var(--gray-500)]">
          Carregando dados...
        </div>
      ) : null}

      {stats ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Pendentes" value={stats.pending} tone="warning" />
            <KpiCard label="Sincronizados" value={stats.synced} tone="success" />
            <KpiCard label="Falhas" value={stats.failed} tone="danger" />
            <KpiCard
              label="Taxa de sucesso"
              value={`${(stats.successRate * 100).toFixed(1)}%`}
              hint={`Total: ${stats.total} sincronizacoes`}
              tone="info"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="admin-card p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
                Ultima sincronizacao com sucesso
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--gray-900)]">
                {formatRelative(stats.lastSyncAt)}
              </p>
              <p className="mt-1 text-xs text-[color:var(--gray-500)]">
                {formatDate(stats.lastSyncAt)}
              </p>
            </div>
            <div className="admin-card p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
                Ultima falha
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--gray-900)]">
                {stats.lastFailureAt ? formatRelative(stats.lastFailureAt) : 'Nenhuma'}
              </p>
              <p className="mt-1 text-xs text-[color:var(--gray-500)]">
                {formatDate(stats.lastFailureAt)}
              </p>
            </div>
          </div>

          {/* Status distribution bar */}
          <div className="admin-card p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
              Distribuicao de status
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-[color:var(--gray-600)]">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--success)]" />{' '}
                Sincronizados ({stats.synced})
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--warning)]" /> Pendentes (
                {stats.pending})
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--error)]" /> Falhas (
                {stats.failed})
              </span>
            </div>
            <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--gray-100)]">
              {stats.total > 0 ? (
                <>
                  {stats.synced > 0 ? (
                    <div
                      className="h-full bg-[color:var(--success)] transition-all"
                      style={{ width: `${(stats.synced / stats.total) * 100}%` }}
                      title={`Sincronizados: ${stats.synced}`}
                    />
                  ) : null}
                  {stats.pending > 0 ? (
                    <div
                      className="h-full bg-[color:var(--warning)] transition-all"
                      style={{ width: `${(stats.pending / stats.total) * 100}%` }}
                      title={`Pendentes: ${stats.pending}`}
                    />
                  ) : null}
                  {stats.failed > 0 ? (
                    <div
                      className="h-full bg-[color:var(--error)] transition-all"
                      style={{ width: `${(stats.failed / stats.total) * 100}%` }}
                      title={`Falhas: ${stats.failed}`}
                    />
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {/* Recent syncs table */}
      <div className="admin-card rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
            Sincronizacoes recentes
          </p>
          <div className="inline-flex flex-wrap rounded-full border border-[var(--border)] bg-[var(--gray-50)] p-1">
            {(['ALL', 'PENDING', 'SYNCED', 'FAILED'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold transition',
                  filter === f
                    ? 'bg-[var(--card)] text-[color:var(--gray-900)] shadow-[var(--shadow-sm)]'
                    : 'bg-transparent text-[color:var(--gray-500)] hover:text-[color:var(--gray-700)]',
                )}
              >
                {f === 'ALL' ? 'Todos' : (STATUS_LABELS[f]?.label ?? f)}
              </button>
            ))}
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="admin-table-wrap">
            <div className="admin-table-scroll">
              <table className="admin-table w-full text-left text-sm">
                <thead className="bg-[var(--gray-50)] text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Protocolo
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Candidato
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Status Sync
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Status Proposta
                    </th>
                    <th scope="col" className="px-4 py-3">
                      ID Externo
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Ultima Sync
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Atualizado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sync) => {
                    const statusInfo = STATUS_LABELS[sync.status] ?? {
                      label: sync.status,
                      tone: 'default',
                    };
                    return (
                      <tr key={sync.id} className="border-t border-[var(--border)]">
                        <td className="px-4 py-3 font-semibold text-[color:var(--gray-900)]">
                          {sync.protocol ? (
                            <Link
                              href={`/admin/propostas/${sync.proposalId}`}
                              className="hover:underline"
                            >
                              {sync.protocol}
                            </Link>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-[color:var(--gray-700)]">
                          {sync.candidateName ?? '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
                              statusInfo.tone === 'success' &&
                                'border-[color:var(--success-border)] bg-[color:var(--success-soft)] text-[color:var(--success)]',
                              statusInfo.tone === 'warning' &&
                                'border-[color:var(--warning-border)] bg-[color:var(--warning-soft)] text-[color:var(--warning)]',
                              statusInfo.tone === 'danger' &&
                                'border-[color:var(--error-border)] bg-[color:var(--error-soft)] text-[color:var(--error)]',
                            )}
                          >
                            <span
                              className={cn(
                                'h-2 w-2 rounded-full',
                                statusInfo.tone === 'success' && 'bg-[color:var(--success)]',
                                statusInfo.tone === 'warning' && 'bg-[color:var(--warning)]',
                                statusInfo.tone === 'danger' && 'bg-[color:var(--error)]',
                              )}
                              aria-hidden="true"
                            />
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {sync.proposalStatus ? <StatusBadge status={sync.proposalStatus} /> : '-'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[color:var(--gray-500)]">
                          {sync.externalId ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-[color:var(--gray-500)]">
                          {formatDate(sync.lastSyncAt)}
                        </td>
                        <td className="px-4 py-3 text-[color:var(--gray-500)]">
                          {formatRelative(sync.updatedAt)}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-sm text-[color:var(--gray-500)]"
                      >
                        Nenhuma sincronizacao encontrada.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 lg:hidden">
          {filtered.map((sync) => {
            const statusInfo = STATUS_LABELS[sync.status] ?? {
              label: sync.status,
              tone: 'default',
            };
            return (
              <div key={sync.id} className="admin-card rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--gray-900)]">
                      {sync.protocol ?? '-'}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--gray-500)]">
                      {sync.candidateName ?? '-'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold',
                      statusInfo.tone === 'success' &&
                        'border-[color:var(--success-border)] bg-[color:var(--success-soft)] text-[color:var(--success)]',
                      statusInfo.tone === 'warning' &&
                        'border-[color:var(--warning-border)] bg-[color:var(--warning-soft)] text-[color:var(--warning)]',
                      statusInfo.tone === 'danger' &&
                        'border-[color:var(--error-border)] bg-[color:var(--error-soft)] text-[color:var(--error)]',
                    )}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        statusInfo.tone === 'success' && 'bg-[color:var(--success)]',
                        statusInfo.tone === 'warning' && 'bg-[color:var(--warning)]',
                        statusInfo.tone === 'danger' && 'bg-[color:var(--error)]',
                      )}
                      aria-hidden="true"
                    />
                    {statusInfo.label}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-[color:var(--gray-500)]">
                  <div className="flex items-center justify-between">
                    <span>Status proposta</span>
                    {sync.proposalStatus ? (
                      <StatusBadge status={sync.proposalStatus} />
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>ID externo</span>
                    <span className="font-mono">{sync.externalId ?? '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Ultima sync</span>
                    <span>{formatDate(sync.lastSyncAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Atualizado</span>
                    <span>{formatRelative(sync.updatedAt)}</span>
                  </div>
                </div>

                {sync.protocol ? (
                  <Link
                    href={`/admin/propostas/${sync.proposalId}`}
                    className="mt-3 inline-flex text-xs font-semibold text-[color:var(--primary-dark)]"
                  >
                    Ver proposta
                  </Link>
                ) : null}
              </div>
            );
          })}
          {filtered.length === 0 ? (
            <div className="admin-card rounded-2xl px-4 py-6 text-center text-sm text-[color:var(--gray-500)]">
              Nenhuma sincronizacao encontrada.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

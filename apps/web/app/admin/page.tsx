'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { adminFetchWithRefresh } from './lib/api';
import { KpiCard } from './components/KpiCard';
import { SlaBuckets } from './components/SlaBuckets';
import { StatusBadge } from '../components/StatusBadge';

type ProposalHistory = { toStatus: string; createdAt: string };

type ProposalListItem = {
  id: string;
  protocol: string;
  status: string;
  type: string;
  createdAt: string;
  sla?: { startedAt?: string | null; dueAt?: string | null; breachedAt?: string | null };
  statusHistory?: ProposalHistory[];
};

const FINAL_STATUSES = new Set(['APPROVED', 'REJECTED', 'SIGNED']);

const average = (values: number[]) => {
  if (!values.length) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
};

const formatDurationHours = (ms: number) => {
  const hours = ms / (1000 * 60 * 60);
  return `${hours.toFixed(1)}h`;
};

export default function AdminDashboardPage() {
  const [items, setItems] = useState<ProposalListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await adminFetchWithRefresh<ProposalListItem[]>('/admin/proposals');
        setItems(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const metrics = useMemo(() => {
    const counts = items.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    }, {});

    const total = items.length || 1;
    const approved = (counts.APPROVED ?? 0) + (counts.SIGNED ?? 0);
    const rejected = counts.REJECTED ?? 0;
    const conversion = approved / total;

    const durations: number[] = [];
    items.forEach((item) => {
      if (!item.statusHistory?.length) return;
      const submitted = item.statusHistory.find((entry) => entry.toStatus === 'SUBMITTED');
      const final = [...item.statusHistory]
        .reverse()
        .find((entry) => FINAL_STATUSES.has(entry.toStatus));
      if (!submitted || !final) return;
      const diff = new Date(final.createdAt).getTime() - new Date(submitted.createdAt).getTime();
      if (diff > 0) durations.push(diff);
    });

    const avgMs = average(durations);

    const now = Date.now();
    const dueSoonLimit = now + 24 * 60 * 60 * 1000;
    let ok = 0;
    let warning = 0;
    let danger = 0;

    items.forEach((item) => {
      const dueAt = item.sla?.dueAt ? new Date(item.sla.dueAt).getTime() : null;
      const breached = item.sla?.breachedAt ? new Date(item.sla.breachedAt).getTime() : null;
      if (breached || (dueAt && dueAt < now)) {
        danger += 1;
        return;
      }
      if (dueAt && dueAt < dueSoonLimit) {
        warning += 1;
        return;
      }
      ok += 1;
    });

    return {
      counts,
      total,
      approved,
      rejected,
      conversion,
      avgMs,
      ok,
      warning,
      danger,
    };
  }, [items]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Dashboard</h2>
          <p className="mt-1 text-sm text-zinc-500">Resumo geral das propostas.</p>
        </div>
        <Link
          href="/admin/propostas"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm"
        >
          Ver propostas
        </Link>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
          Carregando KPIs...
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Aguardando analise" value={metrics.counts.SUBMITTED ?? 0} tone="info" />
        <KpiCard label="Em analise" value={metrics.counts.UNDER_REVIEW ?? 0} tone="warning" />
        <KpiCard
          label="Aguardando assinatura"
          value={metrics.counts.PENDING_SIGNATURE ?? 0}
          tone="purple"
        />
        <KpiCard label="Aprovados no mes" value={metrics.approved} tone="success" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <KpiCard
          label="Tempo medio de analise"
          value={metrics.avgMs ? formatDurationHours(metrics.avgMs) : '-'}
          hint="Baseado em propostas finalizadas"
        />
        <KpiCard
          label="Taxa de conversao"
          value={`${(metrics.conversion * 100).toFixed(1)}%`}
          hint={`Aprovadas: ${metrics.approved} | Reprovadas: ${metrics.rejected}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <SlaBuckets ok={metrics.ok} warning={metrics.warning} danger={metrics.danger} />
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Ultimas propostas</p>
          <div className="mt-4 grid gap-3">
            {items.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{item.protocol}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

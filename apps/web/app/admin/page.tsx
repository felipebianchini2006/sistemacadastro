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

const getWeekLabel = (date: Date) => {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return `${start.getDate().toString().padStart(2, '0')}/${(start.getMonth() + 1).toString().padStart(2, '0')}`;
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

  const weeklyData = useMemo(() => {
    const weeks = new Map<string, number>();
    const now = new Date();
    for (let i = 7; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      weeks.set(getWeekLabel(d), 0);
    }
    items.forEach((item) => {
      const label = getWeekLabel(new Date(item.createdAt));
      if (weeks.has(label)) {
        weeks.set(label, (weeks.get(label) ?? 0) + 1);
      }
    });
    return Array.from(weeks.entries()).map(([label, count]) => ({ label, count }));
  }, [items]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[color:var(--gray-900)]">Dashboard</h2>
          <p className="mt-1 text-sm text-[color:var(--gray-500)]">Resumo geral das propostas.</p>
        </div>
        <Link
          href="/admin/propostas"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--gray-700)] hover:text-[color:var(--gray-900)]"
        >
          Ver propostas <span aria-hidden="true">→</span>
        </Link>
      </div>

      {error ? (
        <div className="rounded-2xl border border-[color:var(--error-border)] bg-[color:var(--error-soft)] px-4 py-3 text-sm text-[color:var(--error)]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="admin-card px-4 py-3 text-sm text-[color:var(--gray-500)]">
          Carregando KPIs...
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Aguardando analise" value={metrics.counts.SUBMITTED ?? 0} tone="warning" />
        <KpiCard label="Em analise" value={metrics.counts.UNDER_REVIEW ?? 0} tone="info" />
        <KpiCard label="Aguardando assinatura" value={metrics.counts.PENDING_SIGNATURE ?? 0} />
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

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Weekly line chart */}
        <div className="admin-card p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
            Filiacoes por semana
          </p>
          <div className="mt-4">
            {(() => {
              const maxCount = Math.max(...weeklyData.map((d) => d.count), 1);
              const w = 280;
              const h = 120;
              const padX = 30;
              const padY = 10;
              const chartW = w - padX;
              const chartH = h - padY * 2;
              const step = chartW / Math.max(weeklyData.length - 1, 1);
              const points = weeklyData.map((d, i) => ({
                x: padX + i * step,
                y: padY + chartH - (d.count / maxCount) * chartH,
                ...d,
              }));
              const linePath = points
                .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`)
                .join(' ');
              const areaPath = `${linePath} L${points[points.length - 1]?.x ?? 0},${padY + chartH} L${padX},${padY + chartH} Z`;
              return (
                <svg
                  viewBox={`0 0 ${w} ${h + 20}`}
                  className="w-full"
                  aria-label="Grafico de filiacoes por semana"
                >
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--success)" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="var(--success)" stopOpacity="0.04" />
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill="url(#lineGrad)" />
                  <path
                    d={linePath}
                    fill="none"
                    stroke="var(--success)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {points.map((p) => (
                    <g key={p.label}>
                      <circle cx={p.x} cy={p.y} r="3" fill="var(--success)" />
                      <text
                        x={p.x}
                        y={p.y - 8}
                        textAnchor="middle"
                        className="fill-[color:var(--gray-500)]"
                        style={{ fontSize: '8px' }}
                      >
                        {p.count}
                      </text>
                      <text
                        x={p.x}
                        y={h + 14}
                        textAnchor="middle"
                        className="fill-[color:var(--gray-500)]"
                        style={{ fontSize: '7px' }}
                      >
                        {p.label}
                      </text>
                    </g>
                  ))}
                </svg>
              );
            })()}
          </div>
        </div>

        {/* SLA bar chart */}
        <div className="admin-card p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
            SLA: dentro/fora do prazo
          </p>
          <div className="mt-4 grid gap-3">
            {[
              {
                label: 'No prazo',
                value: metrics.ok,
                color: 'var(--success)',
                bg: 'bg-[color:var(--success-soft)]',
              },
              {
                label: 'Atencao',
                value: metrics.warning,
                color: 'var(--warning)',
                bg: 'bg-[color:var(--warning-soft)]',
              },
              {
                label: 'Estourado',
                value: metrics.danger,
                color: 'var(--error)',
                bg: 'bg-[color:var(--error-soft)]',
              },
            ].map((item) => {
              const max = Math.max(metrics.ok, metrics.warning, metrics.danger, 1);
              const pct = Math.round((item.value / max) * 100);
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs text-[color:var(--gray-500)]">
                    <span>{item.label}</span>
                    <span className="font-semibold text-[color:var(--gray-900)]">{item.value}</span>
                  </div>
                  <div className={`mt-1 h-3 w-full overflow-hidden rounded-full ${item.bg}`}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <SlaBuckets ok={metrics.ok} warning={metrics.warning} danger={metrics.danger} />
        <div className="admin-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
            Ultimas propostas
          </p>
          <div className="mt-4 grid gap-3">
            {items.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-[color:var(--gray-900)]">
                    {item.protocol}
                  </p>
                  <p className="text-xs text-[color:var(--gray-500)]">
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

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

const STATUS_CHART_LABELS: Record<string, { label: string; color: string }> = {
  SUBMITTED: { label: 'Aguardando', color: '#3B82F6' },
  UNDER_REVIEW: { label: 'Em analise', color: '#F59E0B' },
  PENDING_DOCS: { label: 'Pend. doc', color: '#EF4444' },
  PENDING_SIGNATURE: { label: 'Aguard. assin.', color: '#A855F7' },
  SIGNED: { label: 'Assinado', color: '#22C55E' },
  APPROVED: { label: 'Concluido', color: '#16A34A' },
  REJECTED: { label: 'Reprovado', color: '#6B7280' },
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

  const statusDistribution = useMemo(() => {
    const entries = Object.entries(metrics.counts)
      .filter(([status]) => STATUS_CHART_LABELS[status])
      .map(([status, count]) => ({
        status,
        count,
        label: STATUS_CHART_LABELS[status].label,
        color: STATUS_CHART_LABELS[status].color,
      }));
    return entries;
  }, [metrics.counts]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[color:var(--gray-900)]">Dashboard</h2>
          <p className="mt-1 text-sm text-[color:var(--gray-500)]">Resumo geral das propostas.</p>
        </div>
        <Link
          href="/admin/propostas"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[color:var(--gray-700)] shadow-sm"
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
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[color:var(--gray-500)]">
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

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Weekly line chart */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
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
                      <stop offset="0%" stopColor="#22C55E" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill="url(#lineGrad)" />
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#22C55E"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {points.map((p) => (
                    <g key={p.label}>
                      <circle cx={p.x} cy={p.y} r="3" fill="#22C55E" />
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

        {/* Status donut chart */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
            Status das propostas
          </p>
          <div className="mt-4 flex items-center gap-4">
            {(() => {
              const total = statusDistribution.reduce((s, d) => s + d.count, 0) || 1;
              const r = 44;
              const cx = 50;
              const cy = 50;
              const strokeW = 14;
              const circumference = 2 * Math.PI * r;
              let offset = 0;
              return (
                <>
                  <svg
                    viewBox="0 0 100 100"
                    className="h-28 w-28 shrink-0"
                    aria-label="Grafico de status"
                  >
                    {statusDistribution.map((d) => {
                      const pct = d.count / total;
                      const dashArray = `${pct * circumference} ${circumference}`;
                      const dashOffset = -offset * circumference;
                      offset += pct;
                      return (
                        <circle
                          key={d.status}
                          cx={cx}
                          cy={cy}
                          r={r}
                          fill="none"
                          stroke={d.color}
                          strokeWidth={strokeW}
                          strokeDasharray={dashArray}
                          strokeDashoffset={dashOffset}
                          transform={`rotate(-90 ${cx} ${cy})`}
                        />
                      );
                    })}
                    <text
                      x={cx}
                      y={cy + 3}
                      textAnchor="middle"
                      className="fill-[color:var(--gray-900)] font-semibold"
                      style={{ fontSize: '14px' }}
                    >
                      {items.length}
                    </text>
                  </svg>
                  <div className="grid gap-1 text-xs">
                    {statusDistribution.map((d) => (
                      <div key={d.status} className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="text-[color:var(--gray-500)]">{d.label}</span>
                        <span className="font-semibold text-[color:var(--gray-900)]">
                          {d.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* SLA bar chart */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
            SLA: dentro/fora do prazo
          </p>
          <div className="mt-4 grid gap-3">
            {[
              { label: 'No prazo', value: metrics.ok, color: '#22C55E', bg: 'bg-emerald-50' },
              { label: 'Atencao', value: metrics.warning, color: '#F59E0B', bg: 'bg-amber-50' },
              { label: 'Estourado', value: metrics.danger, color: '#EF4444', bg: 'bg-red-50' },
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
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-lg">
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

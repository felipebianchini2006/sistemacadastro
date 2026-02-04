'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminFetchWithRefresh } from '../lib/api';
import { cn } from '../../lib/utils';
import { AlertTriangle, CheckCircle2, Clock, PauseCircle, Play, XCircle } from 'lucide-react';

type QueueStats = {
  name: string;
  label: string;
  counts: Record<string, number>;
  isPaused: boolean;
};

type QueuesResponse = {
  queues: QueueStats[];
};

const COUNT_ORDER = ['waiting', 'active', 'delayed', 'failed', 'completed', 'paused'] as const;

const formatLabel = (key: string) => {
  switch (key) {
    case 'waiting':
      return 'Aguardando';
    case 'active':
      return 'Ativos';
    case 'delayed':
      return 'Atrasados';
    case 'failed':
      return 'Falhas';
    case 'completed':
      return 'Concluidos';
    case 'paused':
      return 'Pausados';
    default:
      return key;
  }
};

export default function ClientPage() {
  const [queues, setQueues] = useState<QueueStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetchWithRefresh<QueuesResponse>('/admin/queues');
      setQueues(response.queues ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar filas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    void load();
    timer = setInterval(load, 15000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [load]);

  const summary = useMemo(() => {
    return queues.reduce(
      (acc, queue) => {
        acc.waiting += queue.counts.waiting ?? 0;
        acc.active += queue.counts.active ?? 0;
        acc.delayed += queue.counts.delayed ?? 0;
        acc.failed += queue.counts.failed ?? 0;
        return acc;
      },
      { waiting: 0, active: 0, delayed: 0, failed: 0 },
    );
  }, [queues]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[color:var(--gray-900)]">
            Monitoramento de filas
          </h2>
          <p className="mt-1 text-sm text-[color:var(--gray-500)]">
            Indicadores de processamento em tempo quase real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[color:var(--gray-500)]">Atualiza a cada 15s</span>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-[36px] items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[color:var(--gray-700)]"
          >
            <RefreshIcon />
            Atualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Aguardando', value: summary.waiting, tone: 'warning' },
          { label: 'Ativos', value: summary.active, tone: 'info' },
          { label: 'Atrasados', value: summary.delayed, tone: 'danger' },
          { label: 'Falhas', value: summary.failed, tone: 'danger' },
        ].map((card) => (
          <div
            key={card.label}
            className={cn(
              'admin-card p-4',
              card.tone === 'warning' &&
                'border-[color:var(--warning-border)] bg-[var(--warning-soft)]',
              card.tone === 'info' && 'border-[color:var(--info-border)] bg-[var(--info-soft)]',
              card.tone === 'danger' && 'border-[color:var(--error-border)] bg-[var(--error-soft)]',
            )}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
              {card.label}
            </p>
            <p
              className={cn(
                'mt-2 text-2xl font-semibold',
                card.tone === 'warning' && 'text-[color:var(--warning)]',
                card.tone === 'info' && 'text-[color:var(--info)]',
                card.tone === 'danger' && 'text-[color:var(--error)]',
              )}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {error ? (
        <div className="rounded-2xl border border-[color:var(--error-border)] bg-[color:var(--error-soft)] px-4 py-3 text-sm text-[color:var(--error)]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[color:var(--gray-500)]">
          Carregando filas...
        </div>
      ) : null}

      <div className="grid gap-4">
        {queues.map((queue) => (
          <div key={queue.name} className="admin-card rounded-2xl p-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
                  {queue.name}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-[color:var(--gray-900)]">
                  {queue.label}
                </h3>
              </div>
              <span
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-semibold',
                  queue.isPaused
                    ? 'border-[color:var(--warning-border)] bg-[color:var(--warning-soft)] text-[color:var(--warning)]'
                    : 'border-[color:var(--success-border)] bg-[color:var(--success-soft)] text-[color:var(--success)]',
                )}
              >
                {queue.isPaused ? 'Pausada' : 'Ativa'}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 lg:grid-cols-6">
              {COUNT_ORDER.map((key) => {
                const Icon =
                  key === 'waiting'
                    ? Clock
                    : key === 'active'
                      ? Play
                      : key === 'delayed'
                        ? AlertTriangle
                        : key === 'failed'
                          ? XCircle
                          : key === 'completed'
                            ? CheckCircle2
                            : PauseCircle;
                const tone =
                  key === 'delayed'
                    ? 'warning'
                    : key === 'failed'
                      ? 'danger'
                      : key === 'completed'
                        ? 'success'
                        : 'default';
                return (
                  <div
                    key={key}
                    className={cn(
                      'admin-card-muted rounded-2xl border border-[var(--border)] p-3',
                      tone === 'warning' &&
                        'border-[color:var(--warning-border)] bg-[var(--warning-soft)]',
                      tone === 'danger' &&
                        'border-[color:var(--error-border)] bg-[var(--error-soft)]',
                      tone === 'success' &&
                        'border-[color:var(--success-border)] bg-[var(--success-soft)]',
                    )}
                  >
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatLabel(key)}
                    </div>
                    <p
                      className={cn(
                        'mt-2 text-lg font-semibold',
                        tone === 'danger' && 'text-[color:var(--error)]',
                        tone === 'warning' && 'text-[color:var(--warning)]',
                        tone === 'success' && 'text-[color:var(--success)]',
                        tone === 'default' && 'text-[color:var(--gray-900)]',
                      )}
                    >
                      {queue.counts[key] ?? 0}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
    <path
      d="M20 11a8 8 0 10-2.3 5.7M20 11V6m0 5h-5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

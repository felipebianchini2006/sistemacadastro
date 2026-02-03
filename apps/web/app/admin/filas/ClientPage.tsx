'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminFetchWithRefresh } from '../lib/api';
import { cn } from '../../lib/utils';

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

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
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
    };

    void load();
    timer = setInterval(load, 15000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

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
          <h2 className="text-2xl font-semibold text-zinc-900">Monitoramento de filas</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Indicadores de processamento em tempo quase real.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-xs text-zinc-500">
          Atualiza a cada 15s
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Aguardando', value: summary.waiting },
          { label: 'Ativos', value: summary.active },
          { label: 'Atrasados', value: summary.delayed },
          { label: 'Falhas', value: summary.failed },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{card.value}</p>
          </div>
        ))}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
          Carregando filas...
        </div>
      ) : null}

      <div className="grid gap-4">
        {queues.map((queue) => (
          <div key={queue.name} className="rounded-3xl border border-zinc-200 bg-white p-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{queue.name}</p>
                <h3 className="mt-1 text-lg font-semibold text-zinc-900">{queue.label}</h3>
              </div>
              <span
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-semibold',
                  queue.isPaused
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700',
                )}
              >
                {queue.isPaused ? 'Pausada' : 'Ativa'}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {COUNT_ORDER.map((key) => (
                <div key={key} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                    {formatLabel(key)}
                  </p>
                  <p
                    className={cn(
                      'mt-2 text-lg font-semibold',
                      key === 'failed' ? 'text-red-700' : 'text-zinc-900',
                    )}
                  >
                    {queue.counts[key] ?? 0}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

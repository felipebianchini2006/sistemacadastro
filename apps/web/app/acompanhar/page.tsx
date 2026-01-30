'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '../lib/api';
import { StatusBadge, STATUS_LABELS } from '../components/StatusBadge';
import { Timeline, type TimelineEntry } from '../components/Timeline';
import { PendingItems } from '../components/PendingItems';
import { Button } from '../components/ui/button';

type TrackingResponse = {
  proposalId?: string;
  protocol: string;
  status: string;
  timeline: TimelineEntry[];
  pending: string[];
  ocr: { at: string; data: Record<string, unknown> } | null;
};

const resolveStatusLabel = (status: string | null) => {
  if (!status) return null;
  return STATUS_LABELS[status] ?? status;
};

const resolveSuccessMessage = (status: string) => {
  if (status === 'SIGNED') return 'Contrato assinado com sucesso.';
  if (status === 'APPROVED') return 'Proposta aprovada. Estamos finalizando os proximos passos.';
  if (status === 'REJECTED') return 'Proposta reprovada. Caso tenha duvidas, fale com suporte.';
  return null;
};

export default function AcompanharPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const protocolParam = searchParams.get('protocolo') ?? '';
  const tokenParam = searchParams.get('token') ?? '';

  const [protocol, setProtocol] = useState(protocolParam);
  const [token, setToken] = useState(tokenParam);
  const [tracking, setTracking] = useState<TrackingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProtocol(protocolParam);
    setToken(tokenParam);
  }, [protocolParam, tokenParam]);

  useEffect(() => {
    const load = async () => {
      if (!protocolParam || !tokenParam) {
        setTracking(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch<TrackingResponse>(
          `/public/proposals/track?protocol=${protocolParam}&token=${tokenParam}`,
        );
        const timeline = response.timeline.map((entry) => ({
          ...entry,
          from: resolveStatusLabel(entry.from),
          to: resolveStatusLabel(entry.to) ?? entry.to,
        }));
        setTracking({ ...response, timeline });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao consultar protocolo.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [protocolParam, tokenParam]);

  const successMessage = useMemo(
    () => (tracking ? resolveSuccessMessage(tracking.status) : null),
    [tracking],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!protocol || !token) return;
    router.push(
      `/acompanhar?protocolo=${encodeURIComponent(protocol)}&token=${encodeURIComponent(token)}`,
    );
  };

  return (
    <div className="min-h-screen bg-soft-gradient px-4 py-10 sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Acompanhar
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-zinc-900">Status da sua proposta</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Informe seu protocolo e token de acompanhamento para ver o andamento.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="flex flex-col gap-2 text-sm text-zinc-600">
              Protocolo
              <input
                value={protocol}
                onChange={(event) => setProtocol(event.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                placeholder="000000"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-zinc-600">
              Token
              <input
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                placeholder="Token seguro"
              />
            </label>
            <div className="flex items-end">
              <Button type="submit">Consultar</Button>
            </div>
          </form>
          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </header>

        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
            Consultando protocolo...
          </div>
        ) : null}

        {tracking ? (
          <>
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Protocolo</p>
                  <p className="text-lg font-semibold text-zinc-900">{tracking.protocol}</p>
                </div>
                <StatusBadge status={tracking.status} />
              </div>
              {successMessage ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {successMessage}
                </div>
              ) : null}
              {tracking.status === 'PENDING_SIGNATURE' ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Assinatura pendente. Verifique seu email ou WhatsApp para acessar o link seguro.
                </div>
              ) : null}
            </section>

            <PendingItems
              items={tracking.pending}
              proposalId={tracking.proposalId}
              token={tokenParam}
            />

            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-zinc-900">Timeline</h3>
              <p className="mt-2 text-sm text-zinc-500">Historico de mudancas de status.</p>
              <div className="mt-4">
                <Timeline entries={tracking.timeline} />
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

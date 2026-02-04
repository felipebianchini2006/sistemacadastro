'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '../lib/api';
import { StatusBadge, STATUS_LABELS } from '../components/StatusBadge';
import { Timeline, type TimelineEntry } from '../components/Timeline';
import { PendingItems } from '../components/PendingItems';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

type TrackingResponse = {
  proposalId?: string;
  protocol: string;
  status: string;
  timeline: TimelineEntry[];
  pending: string[];
  ocr: { at: string; data: Record<string, unknown> } | null;
  socialAccounts?: Array<{ provider: string; connectedAt: string }>;
  bankAccount?: boolean;
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

const SOCIAL_PROVIDERS = [
  { id: 'SPOTIFY', label: 'Spotify' },
  { id: 'YOUTUBE', label: 'YouTube' },
  { id: 'INSTAGRAM', label: 'Instagram' },
  { id: 'FACEBOOK', label: 'Facebook' },
];

const buildApiUrl = (path: string) => {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  if (!base) return path;
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
};

export default function ClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const protocolParam = searchParams.get('protocolo') ?? searchParams.get('protocol') ?? '';
  const tokenParam = searchParams.get('token') ?? '';
  const errorParam = searchParams.get('erro');

  const [protocol, setProtocol] = useState(protocolParam);
  const [token, setToken] = useState(tokenParam);
  const [tracking, setTracking] = useState<TrackingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [otpPhone, setOtpPhone] = useState('');
  const [otpChannel, setOtpChannel] = useState<'sms' | 'whatsapp'>('sms');
  const [otpCode, setOtpCode] = useState('');
  const [otpStatus, setOtpStatus] = useState<'idle' | 'sending' | 'sent' | 'verifying'>('idle');
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'deleting' | 'done'>('idle');
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

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

  const connectedProviders = useMemo(() => {
    const providers = tracking?.socialAccounts?.map((item) => item.provider) ?? [];
    return new Set(providers);
  }, [tracking]);

  const handleConnect = (provider: string) => {
    if (!tracking?.proposalId || !tokenParam) return;
    const url = new URL(
      buildApiUrl('/public/social/authorize'),
      typeof window !== 'undefined' ? window.location.origin : undefined,
    );
    url.searchParams.set('provider', provider);
    url.searchParams.set('proposalId', tracking.proposalId);
    url.searchParams.set('token', tokenParam);
    window.location.href = url.toString();
  };

  const handleDisconnect = async (provider: string) => {
    if (!tracking?.proposalId || !tokenParam) return;
    setSocialError(null);
    try {
      await apiFetch('/public/social/disconnect', {
        method: 'POST',
        body: {
          provider,
          proposalId: tracking.proposalId,
          token: tokenParam,
        },
      });
      setTracking((prev) =>
        prev
          ? {
              ...prev,
              socialAccounts: prev.socialAccounts?.filter(
                (account) => account.provider !== provider,
              ),
            }
          : prev,
      );
    } catch (err) {
      setSocialError(err instanceof Error ? err.message : 'Falha ao desconectar');
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!protocol || !token) return;
    router.push(
      `/acompanhar?protocolo=${encodeURIComponent(protocol)}&token=${encodeURIComponent(token)}`,
    );
  };

  const handleSendOtp = async () => {
    if (!protocol || !otpPhone) return;
    setOtpStatus('sending');
    setOtpMessage(null);
    try {
      await apiFetch('/public/otp/send', {
        method: 'POST',
        body: {
          protocol,
          phone: otpPhone,
          channel: otpChannel,
        },
      });
      setOtpStatus('sent');
      setOtpMessage('Codigo enviado. Verifique seu celular.');
    } catch (err) {
      setOtpStatus('idle');
      setOtpMessage(err instanceof Error ? err.message : 'Falha ao enviar codigo');
    }
  };

  const handleVerifyOtp = async () => {
    if (!protocol || !otpPhone || !otpCode) return;
    setOtpStatus('verifying');
    setOtpMessage(null);
    try {
      const response = await apiFetch<{ token: string }>('/public/otp/verify', {
        method: 'POST',
        body: {
          protocol,
          phone: otpPhone,
          code: otpCode,
        },
      });
      setToken(response.token);
      router.push(
        `/acompanhar?protocolo=${encodeURIComponent(protocol)}&token=${encodeURIComponent(
          response.token,
        )}`,
      );
    } catch (err) {
      setOtpStatus('sent');
      setOtpMessage(err instanceof Error ? err.message : 'Codigo invalido');
    }
  };

  const handleDelete = async () => {
    if (!tracking?.protocol || !tokenParam) return;
    const confirmed = window.confirm(
      'Tem certeza? Esta acao remove seus dados pessoais e documentos de forma irreversivel.',
    );
    if (!confirmed) return;
    setDeleteStatus('deleting');
    setDeleteMessage(null);
    try {
      await apiFetch('/public/proposals/delete', {
        method: 'POST',
        body: {
          protocol: tracking.protocol,
          token: tokenParam,
        },
      });
      setDeleteStatus('done');
      setDeleteMessage('Solicitacao concluida. Seus dados foram removidos.');
      setTracking(null);
      setToken('');
      router.replace('/acompanhar');
    } catch (err) {
      setDeleteStatus('idle');
      setDeleteMessage(err instanceof Error ? err.message : 'Falha ao excluir dados');
    }
  };

  return (
    <div className="min-h-screen-dvh bg-soft-gradient px-4 py-10 sm:px-8">
      <div className="page-shell flex flex-col gap-6">
        <header className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-md)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--gray-500)]">
            Acompanhar
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[color:var(--gray-900)]">
            Status da sua proposta
          </h1>
          <p className="mt-2 text-sm text-[color:var(--gray-500)]">
            Informe seu protocolo e token de acompanhamento para ver o andamento.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              label="Protocolo"
              value={protocol}
              onChange={(event) => setProtocol(event.target.value)}
              placeholder="000000"
            />
            <Input
              label="Token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Token seguro"
            />
            <div className="flex items-end">
              <Button type="submit">Consultar</Button>
            </div>
          </form>
          {!token ? (
            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
              <p className="text-sm font-semibold text-[color:var(--gray-700)]">
                Receber token via codigo
              </p>
              <p className="mt-2 text-xs text-[color:var(--gray-500)]">
                Informe seu telefone para receber um codigo de confirmacao.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_200px]">
                <Input
                  label="Telefone"
                  value={otpPhone}
                  onChange={(event) => setOtpPhone(event.target.value)}
                  placeholder="(11) 91234-5678"
                />
                <label className="flex flex-col gap-2 text-sm text-[color:var(--gray-700)]">
                  Canal
                  <select
                    value={otpChannel}
                    onChange={(event) => setOtpChannel(event.target.value as 'sms' | 'whatsapp')}
                    className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                  >
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleSendOtp}
                  disabled={!protocol || !otpPhone || otpStatus === 'sending'}
                >
                  {otpStatus === 'sending' ? 'Enviando...' : 'Enviar codigo'}
                </Button>
                {otpStatus === 'sent' || otpStatus === 'verifying' ? (
                  <>
                    <Input
                      value={otpCode}
                      onChange={(event) => setOtpCode(event.target.value)}
                      className="w-40"
                      placeholder="Codigo"
                    />
                    <Button
                      variant="secondary"
                      onClick={handleVerifyOtp}
                      disabled={!otpCode || otpStatus === 'verifying'}
                    >
                      {otpStatus === 'verifying' ? 'Validando...' : 'Validar codigo'}
                    </Button>
                  </>
                ) : null}
              </div>
              {otpMessage ? (
                <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[color:var(--gray-500)]">
                  {otpMessage}
                </div>
              ) : null}
            </div>
          ) : null}
          {error || errorParam ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error ?? `Erro ao conectar rede social: ${errorParam}`}
            </div>
          ) : null}
        </header>

        {loading ? (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[color:var(--gray-500)]">
            Consultando protocolo...
          </div>
        ) : null}

        {tracking ? (
          <>
            <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-md)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
                    Protocolo
                  </p>
                  <p className="text-lg font-semibold text-[color:var(--gray-900)]">
                    {tracking.protocol}
                  </p>
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

            <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-md)]">
              <h3 className="text-lg font-semibold text-[color:var(--gray-900)]">Redes sociais</h3>
              <p className="mt-2 text-sm text-[color:var(--gray-500)]">
                Conecte suas redes para agilizar a avaliacao do seu perfil artistico.
              </p>
              {socialError ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {socialError}
                </div>
              ) : null}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {SOCIAL_PROVIDERS.map((provider) => {
                  const connected = connectedProviders.has(provider.id);
                  return (
                    <div
                      key={provider.id}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[color:var(--gray-700)]">
                          {provider.label}
                        </span>
                        <span
                          className={
                            connected
                              ? 'text-xs text-emerald-600'
                              : 'text-xs text-[color:var(--gray-500)]'
                          }
                        >
                          {connected ? 'Conectado' : 'Nao conectado'}
                        </span>
                      </div>
                      <div className="mt-3">
                        {connected ? (
                          <Button variant="ghost" onClick={() => handleDisconnect(provider.id)}>
                            Desconectar
                          </Button>
                        ) : (
                          <Button onClick={() => handleConnect(provider.id)}>Conectar</Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {tracking.bankAccount ? (
              <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-md)]">
                <h3 className="text-lg font-semibold text-[color:var(--gray-900)]">
                  Dados bancarios
                </h3>
                <p className="mt-2 text-sm text-[color:var(--gray-500)]">
                  Seus dados bancarios foram recebidos e serao usados para o cadastro.
                </p>
              </section>
            ) : null}

            <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-md)]">
              <h3 className="text-lg font-semibold text-[color:var(--gray-900)]">Timeline</h3>
              <p className="mt-2 text-sm text-[color:var(--gray-500)]">
                Historico de mudancas de status.
              </p>
              <div className="mt-4">
                <Timeline entries={tracking.timeline} />
              </div>
            </section>

            <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-md)]">
              <h3 className="text-lg font-semibold text-[color:var(--gray-900)]">Privacidade</h3>
              <p className="mt-2 text-sm text-[color:var(--gray-500)]">
                Voce pode solicitar a exclusao dos seus dados pessoais a qualquer momento.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={handleDelete}
                  disabled={deleteStatus === 'deleting'}
                >
                  {deleteStatus === 'deleting' ? 'Excluindo...' : 'Solicitar exclusao'}
                </Button>
              </div>
              {deleteMessage ? (
                <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm text-[color:var(--gray-500)]">
                  {deleteMessage}
                </div>
              ) : null}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

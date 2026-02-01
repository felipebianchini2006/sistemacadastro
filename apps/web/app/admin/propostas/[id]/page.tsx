'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { adminFetchWithRefresh } from '../../lib/api';
import { StatusBadge, STATUS_LABELS } from '../../../components/StatusBadge';
import { Timeline, type TimelineEntry } from '../../../components/Timeline';
import { PendingItems } from '../../../components/PendingItems';
import { Button } from '../../../components/ui/button';
import { can } from '../../lib/permissions';
import { getStoredAdminUser } from '../../lib/auth';
import { cn } from '../../../lib/utils';

const OCR_FIELDS = [
  { key: 'nome', label: 'Nome' },
  { key: 'cpf', label: 'CPF' },
  { key: 'rg', label: 'RG' },
  { key: 'cnh', label: 'CNH' },
  { key: 'data_emissao', label: 'Data emissao' },
  { key: 'data_validade', label: 'Data validade' },
  { key: 'orgao_emissor', label: 'Orgao emissor' },
  { key: 'uf', label: 'UF' },
];

type ProposalDetails = {
  id: string;
  protocol: string;
  status: string;
  type: string;
  createdAt: string;
  publicToken: string;
  person: {
    fullName: string;
    cpfMasked?: string | null;
    emailEncrypted?: string;
    phoneEncrypted?: string;
    birthDate?: string | null;
  } | null;
  address?: {
    cep?: string;
    street?: string;
    number?: string | null;
    complement?: string | null;
    district?: string;
    city?: string;
    state?: string;
  } | null;
  documents: Array<{
    id: string;
    type: string;
    fileName: string;
    contentType: string;
    size: number;
    createdAt: string;
  }>;
  signatures: Array<{
    id: string;
    status: string;
    provider: string;
    envelopeId: string;
    deadline?: string | null;
    link?: string | null;
    signedAt?: string | null;
    signerName: string;
    signerEmail: string;
    signerPhone?: string | null;
    signerIp?: string | null;
    signerUserAgent?: string | null;
    signerMethod?: string | null;
    signerGeo?: string | null;
    originalFileHash?: string | null;
    signedFileHash?: string | null;
    certificateFileHash?: string | null;
  }>;
  ocrResults: Array<{
    id: string;
    createdAt: string;
    rawText: string;
    structuredData: Record<string, unknown>;
  }>;
  statusHistory: Array<{
    fromStatus: string | null;
    toStatus: string;
    createdAt: string;
    reason?: string | null;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    createdAt: string;
    adminUserId: string;
    metadata?: Record<string, unknown>;
  }>;
  notifications: Array<{
    id: string;
    channel: string;
    status: string;
    providerMessageId?: string | null;
    createdAt: string;
  }>;
  assignedAnalyst?: { id: string; name: string; email: string } | null;
};

export default function AdminProposalDetailsPage() {
  const params = useParams();
  const proposalId = params?.id as string;
  const [details, setDetails] = useState<ProposalDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [analystId, setAnalystId] = useState('');
  const [missingItems, setMissingItems] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [sending, setSending] = useState(false);
  const [activeDoc, setActiveDoc] = useState<ProposalDetails['documents'][number] | null>(null);

  const user = getStoredAdminUser();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await adminFetchWithRefresh<ProposalDetails>(
          `/admin/proposals/${proposalId}`,
        );
        setDetails(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar dossie');
      } finally {
        setLoading(false);
      }
    };

    if (proposalId) {
      void load();
    }
  }, [proposalId]);

  const latestOcr = details?.ocrResults?.[0];
  const latestSignature = details?.signatures?.[0];
  const ocrComparison = useMemo(() => {
    if (!latestOcr || !details?.person) return [];

    return OCR_FIELDS.map((field) => {
      const ocrValue = latestOcr.structuredData?.[field.key];
      const expected =
        field.key === 'nome'
          ? details.person.fullName
          : field.key === 'cpf'
            ? (details.person.cpfMasked ?? undefined)
            : undefined;
      return {
        label: field.label,
        ocr: typeof ocrValue === 'string' ? ocrValue : ocrValue ? String(ocrValue) : '-',
        expected: expected ?? '-',
        match: undefined as boolean | undefined,
      };
    });
  }, [latestOcr, details]);

  const timelineEntries = useMemo<TimelineEntry[]>(() => {
    if (!details?.statusHistory) return [];
    return details.statusHistory.map((entry) => ({
      from: entry.fromStatus ? (STATUS_LABELS[entry.fromStatus] ?? entry.fromStatus) : null,
      to: STATUS_LABELS[entry.toStatus] ?? entry.toStatus,
      at: entry.createdAt,
      reason: entry.reason ?? undefined,
    }));
  }, [details]);

  const handleAction = async (action: () => Promise<unknown>) => {
    setSending(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await action();
      setActionMessage('Acao executada com sucesso.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Falha ao executar acao');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Dossie</p>
          <h2 className="text-2xl font-semibold text-zinc-900">
            {details?.protocol ?? 'Proposta'}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">{details?.person?.fullName ?? '-'}</p>
        </div>
        {details ? <StatusBadge status={details.status} /> : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
          Carregando dossie...
        </div>
      ) : null}

      {details ? (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="grid gap-6">
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-zinc-900">Dados</h3>
              <div className="mt-4 grid gap-3 text-sm text-zinc-600">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>Nome</span>
                  <span className="font-semibold text-zinc-900">
                    {details.person?.fullName ?? '-'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>CPF</span>
                  <span className="font-semibold text-zinc-900">
                    {details.person?.cpfMasked ?? '-'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>Tipo</span>
                  <span className="font-semibold text-zinc-900">{details.type}</span>
                </div>
                {details.address ? (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600">
                    <p className="font-semibold text-zinc-700">Endereco</p>
                    <p>
                      {details.address.street}, {details.address.number ?? 's/n'}
                    </p>
                    <p>
                      {details.address.district} - {details.address.city}/{details.address.state}
                    </p>
                    <p>CEP: {details.address.cep}</p>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-zinc-900">Documentos</h3>
              <div className="mt-4 grid gap-3">
                {details.documents.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                    Nenhum documento enviado.
                  </div>
                ) : (
                  details.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-zinc-900">{doc.fileName}</p>
                        <p className="text-xs text-zinc-500">
                          {doc.type} • {Math.round(doc.size / 1024)}kb
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500">
                          {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveDoc(doc)}
                          className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 hover:border-zinc-300"
                        >
                          Ver
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-zinc-900">OCR extraido</h3>
              {latestOcr ? (
                <div className="mt-4 grid gap-3 text-sm">
                  {ocrComparison.map((row) => (
                    <div
                      key={row.label}
                      className={cn(
                        'rounded-2xl border px-4 py-3',
                        row.match === false
                          ? 'border-amber-300 bg-amber-50 text-amber-800'
                          : 'border-zinc-200 bg-white text-zinc-600',
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-zinc-900">{row.label}</span>
                        <span className="text-xs text-zinc-500">OCR: {row.ocr}</span>
                      </div>
                      {row.expected ? (
                        <p className="mt-1 text-xs text-zinc-500">Digitado: {row.expected}</p>
                      ) : null}
                    </div>
                  ))}
                  <details className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
                    <summary className="cursor-pointer font-semibold">Texto completo</summary>
                    <pre className="mt-2 whitespace-pre-wrap text-[11px]">{latestOcr.rawText}</pre>
                  </details>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                  OCR ainda nao processado.
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-zinc-900">Timeline</h3>
              <div className="mt-4">
                <Timeline entries={timelineEntries} />
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-zinc-900">Audit trail</h3>
              <div className="mt-4 grid gap-3">
                {details.auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-zinc-900">{log.action}</span>
                      <span className="text-xs text-zinc-500">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    {log.metadata ? (
                      <pre className="mt-2 whitespace-pre-wrap text-xs text-zinc-500">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-6">
            <PendingItems
              items={details.status === 'PENDING_DOCS' ? ['Documentos pendentes'] : []}
              proposalId={details.id}
              token={details.publicToken}
            />

            {latestSignature ? (
              <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-zinc-900">Assinatura</h3>
                <div className="mt-4 grid gap-3 text-sm text-zinc-600">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>Status</span>
                    <span className="font-semibold text-zinc-900">
                      {STATUS_LABELS[latestSignature.status] ?? latestSignature.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>Envelope</span>
                    <span className="font-semibold text-zinc-900">
                      {latestSignature.envelopeId}
                    </span>
                  </div>
                  {latestSignature.signedAt ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>Assinado em</span>
                      <span className="font-semibold text-zinc-900">
                        {new Date(latestSignature.signedAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ) : null}
                  {latestSignature.signerIp ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>IP</span>
                      <span className="font-semibold text-zinc-900">
                        {latestSignature.signerIp}
                      </span>
                    </div>
                  ) : null}
                  {latestSignature.signerMethod ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>Metodo</span>
                      <span className="font-semibold text-zinc-900">
                        {latestSignature.signerMethod}
                      </span>
                    </div>
                  ) : null}
                  {latestSignature.originalFileHash ? (
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs">
                      <p className="font-semibold text-zinc-700">Hashes</p>
                      <p className="mt-2 break-all text-zinc-500">
                        Original: {latestSignature.originalFileHash}
                      </p>
                      {latestSignature.signedFileHash ? (
                        <p className="mt-2 break-all text-zinc-500">
                          Assinado: {latestSignature.signedFileHash}
                        </p>
                      ) : null}
                      {latestSignature.certificateFileHash ? (
                        <p className="mt-2 break-all text-zinc-500">
                          Certificado: {latestSignature.certificateFileHash}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-zinc-900">Acoes</h3>
              {actionMessage ? (
                <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {actionMessage}
                </div>
              ) : null}
              {actionError ? (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {actionError}
                </div>
              ) : null}

              <div className="mt-4 grid gap-3">
                {can(user?.roles, 'startReview') &&
                (details.status === 'SUBMITTED' || details.status === 'PENDING_DOCS') ? (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      handleAction(() =>
                        adminFetchWithRefresh(`/admin/proposals/${details.id}/review/start`, {
                          method: 'POST',
                        }),
                      )
                    }
                    disabled={sending}
                  >
                    Iniciar analise
                  </Button>
                ) : null}
                {can(user?.roles, 'approve') ? (
                  <Button
                    variant="accent"
                    onClick={() =>
                      handleAction(() =>
                        adminFetchWithRefresh(`/admin/proposals/${details.id}/approve`, {
                          method: 'POST',
                        }),
                      )
                    }
                    disabled={sending}
                  >
                    Enviar para assinatura
                  </Button>
                ) : null}

                {can(user?.roles, 'reject') ? (
                  <div className="rounded-2xl border border-zinc-200 p-4 text-sm text-zinc-600">
                    <p className="font-semibold text-zinc-700">Reprovar proposta</p>
                    <textarea
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                      rows={3}
                      placeholder="Motivo da reprova"
                    />
                    <Button
                      className="mt-3"
                      onClick={() =>
                        handleAction(() =>
                          adminFetchWithRefresh(`/admin/proposals/${details.id}/reject`, {
                            method: 'POST',
                            body: { reason: rejectReason },
                          }),
                        )
                      }
                      disabled={sending || !rejectReason}
                    >
                      Confirmar reprovacao
                    </Button>
                  </div>
                ) : null}

                {can(user?.roles, 'requestChanges') ? (
                  <div className="rounded-2xl border border-zinc-200 p-4 text-sm text-zinc-600">
                    <p className="font-semibold text-zinc-700">Solicitar documento adicional</p>
                    <input
                      value={missingItems}
                      onChange={(event) => setMissingItems(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                      placeholder="RG, comprovante..."
                    />
                    <Button
                      className="mt-3"
                      onClick={() =>
                        handleAction(() =>
                          adminFetchWithRefresh(`/admin/proposals/${details.id}/request-changes`, {
                            method: 'POST',
                            body: {
                              missingItems: missingItems
                                .split(',')
                                .map((item) => item.trim())
                                .filter(Boolean),
                            },
                          }),
                        )
                      }
                      disabled={sending || !missingItems}
                    >
                      Enviar solicitacao
                    </Button>
                  </div>
                ) : null}

                {can(user?.roles, 'assign') ? (
                  <div className="rounded-2xl border border-zinc-200 p-4 text-sm text-zinc-600">
                    <p className="font-semibold text-zinc-700">Atribuir analista</p>
                    <input
                      value={analystId}
                      onChange={(event) => setAnalystId(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                      placeholder="ID do analista"
                    />
                    <Button
                      className="mt-3"
                      onClick={() =>
                        handleAction(() =>
                          adminFetchWithRefresh(`/admin/proposals/${details.id}/assign`, {
                            method: 'POST',
                            body: { analystId },
                          }),
                        )
                      }
                      disabled={sending || !analystId}
                    >
                      Atribuir
                    </Button>
                  </div>
                ) : null}

                {can(user?.roles, 'resendSignature') ? (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      handleAction(() =>
                        adminFetchWithRefresh(
                          `/admin/proposals/${details.id}/resend-signature-link`,
                          {
                            method: 'POST',
                          },
                        ),
                      )
                    }
                    disabled={sending}
                  >
                    Reenviar assinatura
                  </Button>
                ) : null}

                {can(user?.roles, 'exportPdf') ? (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      handleAction(() =>
                        adminFetchWithRefresh(`/admin/proposals/${details.id}/export-pdf`, {
                          method: 'POST',
                        }),
                      )
                    }
                    disabled={sending}
                  >
                    Gerar PDF
                  </Button>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {activeDoc ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveDoc(null)}
        >
          <div
            className="w-full max-w-3xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Documento</p>
                <h3 className="text-lg font-semibold text-zinc-900">{activeDoc.fileName}</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {activeDoc.type} • {Math.round(activeDoc.size / 1024)}kb
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDoc(null)}
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 hover:border-zinc-300"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>Enviado em</span>
                <span className="font-semibold text-zinc-900">
                  {new Date(activeDoc.createdAt).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="mt-3 flex h-56 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white text-xs text-zinc-500">
                Pre-visualizacao disponivel apos integracao com o storage.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

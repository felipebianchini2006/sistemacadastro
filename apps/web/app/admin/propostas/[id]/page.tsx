'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { adminFetchWithRefresh } from '../../lib/api';
import { StatusBadge, STATUS_LABELS } from '../../../components/StatusBadge';
import { Timeline, type TimelineEntry } from '../../../components/Timeline';
import { PendingItems } from '../../../components/PendingItems';
import { Button } from '../../../components/ui/button';
import { can } from '../../lib/permissions';
import { getStoredAdminUser, type AdminUser } from '../../lib/auth';
import { cn } from '../../../lib/utils';

const OCR_FIELDS = [
  { key: 'nome', label: 'Nome' },
  { key: 'cpf', label: 'CPF' },
  { key: 'rg_cnh', label: 'RG/CNH' },
  { key: 'data_emissao', label: 'Data emissao' },
  { key: 'data_validade', label: 'Data validade' },
  { key: 'orgao_emissor', label: 'Orgao emissor' },
  { key: 'uf', label: 'UF' },
  { key: 'cep', label: 'CEP' },
  { key: 'endereco', label: 'Endereco' },
];

type ProfileRole = 'AUTOR' | 'COMPOSITOR' | 'INTERPRETE' | 'EDITORA' | 'PRODUTOR' | 'OUTRO';

const PROFILE_ROLE_LABELS: Record<ProfileRole, string> = {
  AUTOR: 'Autor(a)',
  COMPOSITOR: 'Compositor(a)',
  INTERPRETE: 'Interprete',
  EDITORA: 'Editora',
  PRODUTOR: 'Produtor(a)',
  OUTRO: 'Outro',
};

const resolveOcrValue = (data: Record<string, unknown> | null, key: string) => {
  if (!data) return '';
  const rawFields =
    data.fields && typeof data.fields === 'object'
      ? (data.fields as Record<string, unknown>)
      : data;
  const value = rawFields[key] ?? data[key];
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
};

type ProposalDetails = {
  id: string;
  protocol: string;
  status: string;
  type: string;
  createdAt: string;
  publicToken: string;
  profileRoles?: string[] | null;
  profileRoleOther?: string | null;
  migrationEntity?: string | null;
  migrationConfirmed?: boolean | null;
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
    heuristics?: Record<string, unknown>;
    documentFileId?: string;
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
  socialAccounts?: Array<{
    provider: string;
    connectedAt: string;
    profile?: Record<string, unknown> | null;
  }>;
  bankAccounts?: Array<{
    id: string;
    bankCode?: string | null;
    bankName?: string | null;
    accountType?: string | null;
    verificationStatus?: string | null;
    accountMasked?: string | null;
    agencyMasked?: string | null;
    holderName?: string | null;
    holderDocumentMasked?: string | null;
    pixKeyMasked?: string | null;
    pixKeyType?: string | null;
    createdAt?: string | null;
  }>;
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
  const [docViewUrl, setDocViewUrl] = useState<string | null>(null);
  const [docViewLoading, setDocViewLoading] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  type EditForm = {
    profileRoles: ProfileRole[];
    profileRoleOther: string;
    person: {
      fullName: string;
      email: string;
      phone: string;
      birthDate: string;
    };
    address: {
      cep: string;
      street: string;
      number: string;
      complement: string;
      district: string;
      city: string;
      state: string;
    };
  };
  type OcrEditForm = {
    id: string;
    documentType: string;
    nome: string;
    cpf: string;
    rg_cnh: string;
    data_emissao: string;
    data_validade: string;
    orgao_emissor: string;
    uf: string;
    cep: string;
    endereco: string;
  };
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [ocrEdit, setOcrEdit] = useState<OcrEditForm | null>(null);
  const [noteText, setNoteText] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageChannel, setMessageChannel] = useState<'EMAIL' | 'SMS' | 'WHATSAPP'>('EMAIL');

  useEffect(() => {
    setUser(getStoredAdminUser());
  }, []);

  const loadDetails = useCallback(async () => {
    if (!proposalId) return;
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
  }, [proposalId]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    if (!details || !details.person) return;
    setEditForm({
      profileRoles: (details.profileRoles as ProfileRole[] | null) ?? [],
      profileRoleOther: details.profileRoleOther ?? '',
      person: {
        fullName: details.person.fullName ?? '',
        email: '',
        phone: '',
        birthDate: details.person.birthDate ? details.person.birthDate.slice(0, 10) : '',
      },
      address: {
        cep: details.address?.cep ?? '',
        street: details.address?.street ?? '',
        number: details.address?.number ?? '',
        complement: details.address?.complement ?? '',
        district: details.address?.district ?? '',
        city: details.address?.city ?? '',
        state: details.address?.state ?? '',
      },
    });
  }, [details]);

  const openDoc = useCallback(
    (doc: ProposalDetails['documents'][number]) => {
      setActiveDoc(doc);
      setDocViewUrl(null);
      setDocViewLoading(true);
      adminFetchWithRefresh<{ url: string }>(
        `/admin/proposals/${proposalId}/documents/${doc.id}/view-url`,
      )
        .then((res) => setDocViewUrl(res.url))
        .catch(() => setDocViewUrl(null))
        .finally(() => setDocViewLoading(false));
    },
    [proposalId],
  );

  const expiredDocIds = useMemo(() => {
    const ids = new Set<string>();
    details?.ocrResults?.forEach((ocr) => {
      const heuristics = ocr.heuristics as { expired?: boolean } | undefined;
      if (heuristics?.expired && ocr.documentFileId) {
        ids.add(ocr.documentFileId);
      }
    });
    return ids;
  }, [details?.ocrResults]);

  const latestOcr = details?.ocrResults?.[0];
  const latestSignature = details?.signatures?.[0];

  useEffect(() => {
    if (!latestOcr) {
      setOcrEdit(null);
      return;
    }
    setOcrEdit((prev) => {
      if (prev && prev.id === latestOcr.id) return prev;
      const data = (latestOcr.structuredData as Record<string, unknown> | null) ?? null;
      return {
        id: latestOcr.id,
        documentType: resolveOcrValue(data, 'document_type'),
        nome: resolveOcrValue(data, 'nome'),
        cpf: resolveOcrValue(data, 'cpf'),
        rg_cnh: resolveOcrValue(data, 'rg_cnh'),
        data_emissao: resolveOcrValue(data, 'data_emissao'),
        data_validade: resolveOcrValue(data, 'data_validade'),
        orgao_emissor: resolveOcrValue(data, 'orgao_emissor'),
        uf: resolveOcrValue(data, 'uf'),
        cep: resolveOcrValue(data, 'cep'),
        endereco: resolveOcrValue(data, 'endereco'),
      } satisfies OcrEditForm;
    });
  }, [latestOcr]);

  const updateOcrEdit = (patch: Partial<OcrEditForm>) => {
    setOcrEdit((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const buildOcrPayload = (form: OcrEditForm) => {
    const entries: Record<string, string> = {
      nome: form.nome,
      cpf: form.cpf,
      rg_cnh: form.rg_cnh,
      data_emissao: form.data_emissao,
      data_validade: form.data_validade,
      orgao_emissor: form.orgao_emissor,
      uf: form.uf,
      cep: form.cep,
      endereco: form.endereco,
    };
    const fields: Record<string, string> = {};
    Object.entries(entries).forEach(([key, value]) => {
      const trimmed = value.trim();
      if (trimmed) fields[key] = trimmed;
    });

    return {
      documentType: form.documentType.trim() || undefined,
      fields: Object.keys(fields).length ? fields : undefined,
    };
  };

  const handleSaveOcr = () => {
    if (!ocrEdit || !details) return;
    const payload = buildOcrPayload(ocrEdit);
    return handleAction(async () => {
      await adminFetchWithRefresh(`/admin/proposals/${details.id}/ocr/update`, {
        method: 'POST',
        body: payload,
      });
      await loadDetails();
    });
  };
  const ocrComparison = useMemo(() => {
    const person = details?.person ?? null;
    if (!latestOcr || !person) return [];

    return OCR_FIELDS.map((field) => {
      const ocrValue = resolveOcrValue(
        (latestOcr.structuredData as Record<string, unknown> | null) ?? null,
        field.key,
      );
      const expected =
        field.key === 'nome'
          ? person.fullName
          : field.key === 'cpf'
            ? (person.cpfMasked ?? undefined)
            : undefined;
      return {
        label: field.label,
        ocr: ocrValue || '-',
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

  const migrationChecklist = useMemo(() => {
    if (!details || details.type !== 'MIGRACAO') return null;
    const docTypes = new Set(details.documents.map((doc) => doc.type));
    const hasRg = docTypes.has('RG_FRENTE') && docTypes.has('RG_VERSO');
    const hasCnh = docTypes.has('CNH');
    return [
      {
        label: 'Entidade anterior informada',
        ok: Boolean(details.migrationEntity && details.migrationEntity.trim()),
        value: details.migrationEntity ?? '',
      },
      {
        label: 'Confirmacao de migracao',
        ok: Boolean(details.migrationConfirmed),
      },
      {
        label: 'Declaracao de desfilicao enviada',
        ok: docTypes.has('DESFILIACAO'),
      },
      {
        label: 'Documento principal (RG ou CNH)',
        ok: hasRg || hasCnh,
      },
    ];
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

  const toggleRole = (role: ProfileRole) => {
    setEditForm((prev) => {
      if (!prev) return prev;
      const set = new Set(prev.profileRoles);
      if (set.has(role)) {
        set.delete(role);
      } else {
        set.add(role);
      }
      return { ...prev, profileRoles: Array.from(set) };
    });
  };

  const updateEditPerson = (patch: Partial<EditForm['person']>) => {
    setEditForm((prev) => {
      if (!prev) return prev;
      return { ...prev, person: { ...prev.person, ...patch } };
    });
  };

  const updateEditAddress = (patch: Partial<EditForm['address']>) => {
    setEditForm((prev) => {
      if (!prev) return prev;
      return { ...prev, address: { ...prev.address, ...patch } };
    });
  };

  const buildUpdatePayload = () => {
    if (!editForm) return null;
    const person = {
      fullName: editForm.person.fullName.trim() || undefined,
      email: editForm.person.email.trim() || undefined,
      phone: editForm.person.phone.trim() || undefined,
      birthDate: editForm.person.birthDate || undefined,
    };
    const address = {
      cep: editForm.address.cep.trim() || undefined,
      street: editForm.address.street.trim() || undefined,
      number: editForm.address.number.trim() || undefined,
      complement: editForm.address.complement.trim() || undefined,
      district: editForm.address.district.trim() || undefined,
      city: editForm.address.city.trim() || undefined,
      state: editForm.address.state.trim() || undefined,
    };
    const hasAddress = Object.values(address).some((value) => value);

    return {
      profileRoles: editForm.profileRoles,
      profileRoleOther: editForm.profileRoleOther.trim() || undefined,
      person,
      address: hasAddress ? address : undefined,
    };
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">Dossie</p>
          <h2 className="text-2xl font-semibold text-[color:var(--gray-900)]">
            {details?.protocol ?? 'Proposta'}
          </h2>
          <p className="mt-1 text-sm text-[color:var(--gray-500)]">
            {details?.person?.fullName ?? '-'}
          </p>
        </div>
        {details ? <StatusBadge status={details.status} /> : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-[color:var(--error-border)] bg-[color:var(--error-soft)] px-4 py-3 text-sm text-[color:var(--error)]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[color:var(--gray-500)]">
          Carregando dossie...
        </div>
      ) : null}

      {details ? (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="grid gap-6">
            <section className="admin-card rounded-2xl p-5">
              <h3 className="text-base font-semibold text-[color:var(--gray-900)]">Dados</h3>
              <div className="mt-4 grid gap-3 text-sm text-[color:var(--gray-500)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>Nome</span>
                  <span className="font-semibold text-[color:var(--gray-900)]">
                    {details.person?.fullName ?? '-'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>CPF</span>
                  <span className="font-semibold text-[color:var(--gray-900)]">
                    {details.person?.cpfMasked ?? '-'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>Tipo</span>
                  <span className="font-semibold text-[color:var(--gray-900)]">{details.type}</span>
                </div>
                {details.address ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4 text-xs text-[color:var(--gray-500)]">
                    <p className="font-semibold text-[color:var(--gray-700)]">Endereco</p>
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

            <section className="admin-card rounded-2xl p-5">
              <h3 className="text-base font-semibold text-[color:var(--gray-900)]">Documentos</h3>
              {expiredDocIds.size > 0 ? (
                <div className="mt-3 rounded-2xl border border-[color:var(--error-border)] bg-[color:var(--error-soft)] px-4 py-3 text-sm text-[color:var(--error)]">
                  <p className="font-semibold">Documento(s) vencido(s) detectado(s)</p>
                  <p className="mt-1 text-xs text-[color:var(--error)]">
                    {expiredDocIds.size} documento(s) com data de validade expirada. Solicite novo
                    documento ao candidato.
                  </p>
                </div>
              ) : null}
              <div className="mt-4 grid gap-3">
                {details.documents.length === 0 ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm text-[color:var(--gray-500)]">
                    Nenhum documento enviado.
                  </div>
                ) : (
                  details.documents.map((doc) => {
                    const isExpired = expiredDocIds.has(doc.id);
                    return (
                      <div
                        key={doc.id}
                        className={cn(
                          'flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-sm',
                          isExpired
                            ? 'border-[color:var(--error-border)] bg-[color:var(--error-soft)]'
                            : 'border-[var(--border)]',
                        )}
                      >
                        <div>
                          <p className="font-semibold text-[color:var(--gray-900)]">
                            {doc.fileName}
                          </p>
                          <p className="text-xs text-[color:var(--gray-500)]">
                            {doc.type} • {Math.round(doc.size / 1024)}kb
                          </p>
                          {isExpired ? (
                            <p className="mt-1 text-xs font-semibold text-[color:var(--error)]">
                              Documento vencido
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[color:var(--gray-500)]">
                            {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                          <button
                            type="button"
                            onClick={() => openDoc(doc)}
                            className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--gray-500)] hover:border-[var(--gray-300)]"
                          >
                            Ver
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {migrationChecklist ? (
              <section className="rounded-2xl border border-[color:var(--primary-light)] bg-[color:var(--primary-soft)] p-6 shadow-[var(--shadow-sm)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-[color:var(--gray-900)]">
                    Checklist de migracao
                  </h3>
                  <span className="rounded-full border border-[color:var(--primary-light)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[color:var(--primary-dark)]">
                    Migracao
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-sm">
                  {migrationChecklist.map((item) => (
                    <div
                      key={item.label}
                      className={cn(
                        'flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3',
                        item.ok
                          ? 'border-[color:var(--success-border)] bg-[color:var(--success-soft)] text-[color:var(--success)]'
                          : 'border-[color:var(--warning-border)] bg-[color:var(--warning-soft)] text-[color:var(--warning)]',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                          {item.ok ? 'OK' : 'Pendente'}
                        </span>
                        <span className="font-semibold text-[color:var(--gray-900)]">
                          {item.label}
                        </span>
                      </div>
                      {item.value ? (
                        <span className="text-xs text-[color:var(--gray-500)]">{item.value}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="admin-card rounded-2xl p-5">
              <h3 className="text-base font-semibold text-[color:var(--gray-900)]">OCR extraido</h3>
              {latestOcr ? (
                <div className="mt-4 grid gap-3 text-sm">
                  {ocrComparison.map((row) => (
                    <div
                      key={row.label}
                      className={cn(
                        'rounded-2xl border px-4 py-3',
                        row.match === false
                          ? 'border-[color:var(--warning-border)] bg-[color:var(--warning-soft)] text-[color:var(--warning)]'
                          : 'border-[var(--border)] bg-[var(--card)] text-[color:var(--gray-500)]',
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-[color:var(--gray-900)]">
                          {row.label}
                        </span>
                        <span className="text-xs text-[color:var(--gray-500)]">OCR: {row.ocr}</span>
                      </div>
                      {row.expected ? (
                        <p className="mt-1 text-xs text-[color:var(--gray-500)]">
                          Digitado: {row.expected}
                        </p>
                      ) : null}
                    </div>
                  ))}
                  <details className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-xs text-[color:var(--gray-500)]">
                    <summary className="cursor-pointer font-semibold">Texto completo</summary>
                    <pre className="mt-2 whitespace-pre-wrap text-[11px]">{latestOcr.rawText}</pre>
                  </details>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm text-[color:var(--gray-500)]">
                  OCR ainda nao processado.
                </div>
              )}

              {can(user?.roles, 'update') && ocrEdit ? (
                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--gray-900)]">
                        Editar OCR
                      </p>
                      <p className="text-xs text-[color:var(--gray-500)]">
                        Ajuste os dados extraidos pelo OCR antes de seguir o fluxo.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs text-[color:var(--gray-500)]">
                      Tipo de documento
                      <input
                        value={ocrEdit.documentType}
                        onChange={(event) => updateOcrEdit({ documentType: event.target.value })}
                        className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                        placeholder="RG ou CNH"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[color:var(--gray-500)]">
                      Nome
                      <input
                        value={ocrEdit.nome}
                        onChange={(event) => updateOcrEdit({ nome: event.target.value })}
                        className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[color:var(--gray-500)]">
                      CPF
                      <input
                        value={ocrEdit.cpf}
                        onChange={(event) => updateOcrEdit({ cpf: event.target.value })}
                        className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[color:var(--gray-500)]">
                      RG/CNH
                      <input
                        value={ocrEdit.rg_cnh}
                        onChange={(event) => updateOcrEdit({ rg_cnh: event.target.value })}
                        className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[color:var(--gray-500)]">
                      Data emissao
                      <input
                        value={ocrEdit.data_emissao}
                        onChange={(event) => updateOcrEdit({ data_emissao: event.target.value })}
                        className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                        placeholder="YYYY-MM-DD"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[color:var(--gray-500)]">
                      Data validade
                      <input
                        value={ocrEdit.data_validade}
                        onChange={(event) => updateOcrEdit({ data_validade: event.target.value })}
                        className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                        placeholder="YYYY-MM-DD"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[color:var(--gray-500)]">
                      Orgao emissor
                      <input
                        value={ocrEdit.orgao_emissor}
                        onChange={(event) => updateOcrEdit({ orgao_emissor: event.target.value })}
                        className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[color:var(--gray-500)]">
                      UF
                      <input
                        value={ocrEdit.uf}
                        onChange={(event) => updateOcrEdit({ uf: event.target.value })}
                        className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[color:var(--gray-500)]">
                      CEP
                      <input
                        value={ocrEdit.cep}
                        onChange={(event) => updateOcrEdit({ cep: event.target.value })}
                        className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[color:var(--gray-500)]">
                      Endereco
                      <input
                        value={ocrEdit.endereco}
                        onChange={(event) => updateOcrEdit({ endereco: event.target.value })}
                        className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                      />
                    </label>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Button variant="secondary" onClick={handleSaveOcr} disabled={sending}>
                      Salvar OCR
                    </Button>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="admin-card rounded-2xl p-5">
              <h3 className="text-base font-semibold text-[color:var(--gray-900)]">
                Redes sociais
              </h3>
              <div className="mt-4 grid gap-3 text-sm text-[color:var(--gray-500)]">
                {details.socialAccounts && details.socialAccounts.length > 0 ? (
                  details.socialAccounts.map((account) => (
                    <div
                      key={`${account.provider}-${account.connectedAt}`}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-[color:var(--gray-900)]">
                          {account.provider}
                        </span>
                        <span className="text-xs text-[color:var(--gray-500)]">
                          {new Date(account.connectedAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      {account.profile ? (
                        <pre className="mt-3 whitespace-pre-wrap text-xs text-[color:var(--gray-500)]">
                          {JSON.stringify(account.profile, null, 2)}
                        </pre>
                      ) : (
                        <p className="mt-2 text-xs text-[color:var(--gray-500)]">
                          Nenhum detalhe de perfil armazenado.
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm text-[color:var(--gray-500)]">
                    Nenhuma rede social conectada.
                  </div>
                )}
              </div>
            </section>

            <section className="admin-card rounded-2xl p-5">
              <h3 className="text-base font-semibold text-[color:var(--gray-900)]">
                Dados bancarios
              </h3>
              <div className="mt-4 grid gap-3 text-sm text-[color:var(--gray-500)]">
                {details.bankAccounts && details.bankAccounts.length > 0 ? (
                  details.bankAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-[color:var(--gray-900)]">
                          {account.bankName || account.bankCode || 'Banco'}
                        </span>
                        {account.accountType ? (
                          <span className="text-xs text-[color:var(--gray-500)]">
                            {account.accountType}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-[color:var(--gray-500)] sm:grid-cols-2">
                        <span>Agencia: {account.agencyMasked ?? '-'}</span>
                        <span>Conta: {account.accountMasked ?? '-'}</span>
                        <span>Titular: {account.holderName ?? '-'}</span>
                        <span>Documento: {account.holderDocumentMasked ?? '-'}</span>
                        <span>PIX: {account.pixKeyMasked ?? '-'}</span>
                        <span>PIX tipo: {account.pixKeyType ?? '-'}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm text-[color:var(--gray-500)]">
                    Nenhum dado bancario informado.
                  </div>
                )}
              </div>
            </section>

            <section className="admin-card rounded-2xl p-5">
              <h3 className="text-base font-semibold text-[color:var(--gray-900)]">Timeline</h3>
              <div className="mt-4">
                <Timeline entries={timelineEntries} />
              </div>
            </section>

            <section className="admin-card rounded-2xl p-5">
              <h3 className="text-base font-semibold text-[color:var(--gray-900)]">Audit trail</h3>
              <div className="mt-4 grid gap-3">
                {details.auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-[color:var(--gray-900)]">
                        {log.action}
                      </span>
                      <span className="text-xs text-[color:var(--gray-500)]">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    {log.metadata ? (
                      <pre className="mt-2 whitespace-pre-wrap text-xs text-[color:var(--gray-500)]">
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
              <section className="admin-card rounded-2xl p-5">
                <h3 className="text-base font-semibold text-[color:var(--gray-900)]">Assinatura</h3>
                <div className="mt-4 grid gap-3 text-sm text-[color:var(--gray-500)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>Status</span>
                    <span className="font-semibold text-[color:var(--gray-900)]">
                      {STATUS_LABELS[latestSignature.status] ?? latestSignature.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>Envelope</span>
                    <span className="font-semibold text-[color:var(--gray-900)]">
                      {latestSignature.envelopeId}
                    </span>
                  </div>
                  {latestSignature.signedAt ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>Assinado em</span>
                      <span className="font-semibold text-[color:var(--gray-900)]">
                        {new Date(latestSignature.signedAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ) : null}
                  {latestSignature.signerIp ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>IP</span>
                      <span className="font-semibold text-[color:var(--gray-900)]">
                        {latestSignature.signerIp}
                      </span>
                    </div>
                  ) : null}
                  {latestSignature.signerMethod ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>Metodo</span>
                      <span className="font-semibold text-[color:var(--gray-900)]">
                        {latestSignature.signerMethod}
                      </span>
                    </div>
                  ) : null}
                  {latestSignature.originalFileHash ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-3 text-xs">
                      <p className="font-semibold text-[color:var(--gray-700)]">Hashes</p>
                      <p className="mt-2 break-all text-[color:var(--gray-500)]">
                        Original: {latestSignature.originalFileHash}
                      </p>
                      {latestSignature.signedFileHash ? (
                        <p className="mt-2 break-all text-[color:var(--gray-500)]">
                          Assinado: {latestSignature.signedFileHash}
                        </p>
                      ) : null}
                      {latestSignature.certificateFileHash ? (
                        <p className="mt-2 break-all text-[color:var(--gray-500)]">
                          Certificado: {latestSignature.certificateFileHash}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {editForm && can(user?.roles, 'update') ? (
              <section className="admin-card rounded-2xl p-5">
                <h3 className="text-base font-semibold text-[color:var(--gray-900)]">
                  Editar dados
                </h3>
                <div className="mt-4 grid gap-3 text-sm text-[color:var(--gray-500)]">
                  <label className="grid gap-2">
                    Nome completo
                    <input
                      value={editForm.person.fullName}
                      onChange={(event) => updateEditPerson({ fullName: event.target.value })}
                      className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                    />
                  </label>
                  <label className="grid gap-2">
                    Email (deixe em branco para manter)
                    <input
                      value={editForm.person.email}
                      onChange={(event) => updateEditPerson({ email: event.target.value })}
                      className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                      type="email"
                    />
                  </label>
                  <label className="grid gap-2">
                    Telefone (deixe em branco para manter)
                    <input
                      value={editForm.person.phone}
                      onChange={(event) => updateEditPerson({ phone: event.target.value })}
                      className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                    />
                  </label>
                  <label className="grid gap-2">
                    Data nascimento
                    <input
                      value={editForm.person.birthDate}
                      onChange={(event) => updateEditPerson({ birthDate: event.target.value })}
                      className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                      type="date"
                    />
                  </label>
                </div>

                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
                    Perfil artistico
                  </p>
                  <div className="mt-3 grid gap-2">
                    {(Object.keys(PROFILE_ROLE_LABELS) as ProfileRole[]).map((role) => (
                      <label
                        key={role}
                        className="flex items-center gap-2 text-sm text-[color:var(--gray-700)]"
                      >
                        <input
                          type="checkbox"
                          checked={editForm.profileRoles.includes(role)}
                          onChange={() => toggleRole(role)}
                          className="h-4 w-4 rounded border-[var(--gray-300)] text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
                        />
                        <span>{PROFILE_ROLE_LABELS[role]}</span>
                      </label>
                    ))}
                  </div>
                  {editForm.profileRoles.includes('OUTRO') ? (
                    <input
                      value={editForm.profileRoleOther}
                      onChange={(event) =>
                        setEditForm({ ...editForm, profileRoleOther: event.target.value })
                      }
                      className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                      placeholder="Descreva a atuacao"
                    />
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 text-sm text-[color:var(--gray-500)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
                    Endereco
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={editForm.address.cep}
                      onChange={(event) => updateEditAddress({ cep: event.target.value })}
                      className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                      placeholder="CEP"
                    />
                    <input
                      value={editForm.address.street}
                      onChange={(event) => updateEditAddress({ street: event.target.value })}
                      className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                      placeholder="Rua"
                    />
                    <input
                      value={editForm.address.number}
                      onChange={(event) => updateEditAddress({ number: event.target.value })}
                      className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                      placeholder="Numero"
                    />
                    <input
                      value={editForm.address.complement}
                      onChange={(event) => updateEditAddress({ complement: event.target.value })}
                      className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                      placeholder="Complemento"
                    />
                    <input
                      value={editForm.address.district}
                      onChange={(event) => updateEditAddress({ district: event.target.value })}
                      className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                      placeholder="Bairro"
                    />
                    <input
                      value={editForm.address.city}
                      onChange={(event) => updateEditAddress({ city: event.target.value })}
                      className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                      placeholder="Cidade"
                    />
                    <input
                      value={editForm.address.state}
                      onChange={(event) => updateEditAddress({ state: event.target.value })}
                      className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                      placeholder="UF"
                    />
                  </div>
                </div>

                <Button
                  className="mt-4"
                  onClick={() => {
                    const payload = buildUpdatePayload();
                    if (!payload) return;
                    void handleAction(() =>
                      adminFetchWithRefresh(`/admin/proposals/${details.id}/update`, {
                        method: 'POST',
                        body: payload,
                      }),
                    );
                  }}
                  disabled={sending}
                >
                  Salvar alteracoes
                </Button>
              </section>
            ) : null}

            {can(user?.roles, 'note') ? (
              <section className="admin-card rounded-2xl p-5">
                <h3 className="text-base font-semibold text-[color:var(--gray-900)]">
                  Notas internas
                </h3>
                <textarea
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                  rows={3}
                  placeholder="Escreva uma nota interna"
                />
                <Button
                  className="mt-3"
                  onClick={() =>
                    handleAction(() =>
                      adminFetchWithRefresh(`/admin/proposals/${details.id}/notes`, {
                        method: 'POST',
                        body: { note: noteText },
                      }),
                    )
                  }
                  disabled={sending || !noteText.trim()}
                >
                  Adicionar nota
                </Button>
                {details.auditLogs
                  .filter((log) => log.action === 'NOTE')
                  .map((log) => (
                    <div
                      key={log.id}
                      className="mt-3 rounded-2xl border border-[var(--border)] p-3 text-xs"
                    >
                      <p className="font-semibold text-[color:var(--gray-700)]">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </p>
                      <pre className="mt-2 whitespace-pre-wrap text-[11px] text-[color:var(--gray-500)]">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  ))}
              </section>
            ) : null}

            {can(user?.roles, 'message') ? (
              <section className="admin-card rounded-2xl p-5">
                <h3 className="text-base font-semibold text-[color:var(--gray-900)]">
                  Mensagem ao candidato
                </h3>
                <label className="mt-3 flex flex-col gap-2 text-sm text-[color:var(--gray-500)]">
                  Canal
                  <select
                    value={messageChannel}
                    onChange={(event) =>
                      setMessageChannel(event.target.value as 'EMAIL' | 'SMS' | 'WHATSAPP')
                    }
                    className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                  >
                    <option value="EMAIL">Email</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="SMS">SMS</option>
                  </select>
                </label>
                {messageChannel === 'EMAIL' ? (
                  <label className="mt-3 flex flex-col gap-2 text-sm text-[color:var(--gray-500)]">
                    Assunto
                    <input
                      value={messageSubject}
                      onChange={(event) => setMessageSubject(event.target.value)}
                      className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                    />
                  </label>
                ) : null}
                <label className="mt-3 flex flex-col gap-2 text-sm text-[color:var(--gray-500)]">
                  Mensagem
                  <textarea
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                    rows={4}
                  />
                </label>
                <Button
                  className="mt-3"
                  onClick={() =>
                    handleAction(() =>
                      adminFetchWithRefresh(`/admin/proposals/${details.id}/message`, {
                        method: 'POST',
                        body: {
                          channel: messageChannel,
                          subject: messageSubject || undefined,
                          message: messageText,
                        },
                      }),
                    )
                  }
                  disabled={sending || !messageText.trim()}
                >
                  Enviar mensagem
                </Button>
              </section>
            ) : null}

            <section className="admin-card rounded-2xl p-5">
              <h3 className="text-base font-semibold text-[color:var(--gray-900)]">Acoes</h3>
              {actionMessage ? (
                <div className="mt-3 rounded-2xl border border-[color:var(--success-border)] bg-[color:var(--success-soft)] px-4 py-3 text-sm text-[color:var(--success)]">
                  {actionMessage}
                </div>
              ) : null}
              {actionError ? (
                <div className="mt-3 rounded-2xl border border-[color:var(--error-border)] bg-[color:var(--error-soft)] px-4 py-3 text-sm text-[color:var(--error)]">
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
                  <div className="rounded-2xl border border-[var(--border)] p-4 text-sm text-[color:var(--gray-500)]">
                    <p className="font-semibold text-[color:var(--gray-700)]">Reprovar proposta</p>
                    <textarea
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
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
                  <div className="rounded-2xl border border-[var(--border)] p-4 text-sm text-[color:var(--gray-500)]">
                    <p className="font-semibold text-[color:var(--gray-700)]">
                      Solicitar documento adicional
                    </p>
                    <input
                      value={missingItems}
                      onChange={(event) => setMissingItems(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
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
                  <div className="rounded-2xl border border-[var(--border)] p-4 text-sm text-[color:var(--gray-500)]">
                    <p className="font-semibold text-[color:var(--gray-700)]">Atribuir analista</p>
                    <input
                      value={analystId}
                      onChange={(event) => setAnalystId(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
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

                {can(user?.roles, 'reprocessTotvs') ? (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      handleAction(() =>
                        adminFetchWithRefresh(`/admin/proposals/${details.id}/totvs/reprocess`, {
                          method: 'POST',
                        }),
                      )
                    }
                    disabled={sending}
                  >
                    Reprocessar Totvs
                  </Button>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {activeDoc ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveDoc(null)}
        >
          <div
            className="admin-panel relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
                  Documento
                </p>
                <h3 className="text-base font-semibold text-[color:var(--gray-900)]">
                  {activeDoc.fileName}
                </h3>
                <p className="mt-1 text-xs text-[color:var(--gray-500)]">
                  {activeDoc.type} • {Math.round(activeDoc.size / 1024)}kb •{' '}
                  {new Date(activeDoc.createdAt).toLocaleString('pt-BR')}
                </p>
                {expiredDocIds.has(activeDoc.id) ? (
                  <p className="mt-1 text-xs font-semibold text-[color:var(--error)]">
                    Documento vencido
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setActiveDoc(null)}
                className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--gray-500)] hover:border-[var(--gray-300)]"
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5">
              {docViewLoading ? (
                <div className="flex h-64 items-center justify-center text-sm text-[color:var(--gray-500)]">
                  Carregando documento...
                </div>
              ) : docViewUrl ? (
                activeDoc.contentType.startsWith('image/') ? (
                  <div className="relative mx-auto h-[70vh] w-full max-w-4xl overflow-hidden rounded-xl bg-[var(--muted)]">
                    <Image
                      src={docViewUrl}
                      alt={activeDoc.fileName}
                      fill
                      sizes="(max-width: 1024px) 100vw, 70vw"
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                ) : activeDoc.contentType === 'application/pdf' ? (
                  <iframe
                    src={docViewUrl}
                    title={activeDoc.fileName}
                    className="h-[70vh] w-full rounded-xl border border-[var(--border)]"
                  />
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-[color:var(--gray-500)]">
                    <p>Formato nao suportado para pre-visualizacao.</p>
                    <a
                      href={docViewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[color:var(--gray-700)] hover:border-[var(--gray-300)]"
                    >
                      Baixar documento
                    </a>
                  </div>
                )
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-[color:var(--gray-500)]">
                  Nao foi possivel carregar o documento.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  normalizeCep,
  normalizeCpf,
  normalizeEmail,
  normalizePhone,
  normalizePhoneToE164,
} from '@sistemacadastro/shared';

import {
  useCepValidation,
  useCpfValidation,
  useEmailValidation,
  usePhoneValidation,
} from '../hooks/validation';
import { useViaCepAutofill } from '../hooks/useViaCep';
import { apiFetch } from '../lib/api';
import { InputMasked } from '../components/InputMasked';
import { ProgressBar } from '../components/ProgressBar';
import { StepLayout } from '../components/StepLayout';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

type ProfileRole = 'AUTOR' | 'COMPOSITOR' | 'INTERPRETE' | 'EDITORA';
type ProposalType = 'NOVO' | 'MIGRACAO';
type DocumentChoice = 'RG' | 'CNH';
type DocumentType = 'RG_FRENTE' | 'RG_VERSO' | 'CNH';

type DraftMeta = {
  draftId: string;
  draftToken: string;
  expiresAt?: string;
};

type UploadState = {
  documentId?: string;
  fileName?: string;
  status: 'idle' | 'uploading' | 'uploaded' | 'error';
  error?: string;
};

type DraftFormState = {
  profileRole: ProfileRole;
  proposalType: ProposalType;
  fullName: string;
  cpf: string;
  email: string;
  phone: string;
  birthDate: string;
  address: {
    cep: string;
    street: string;
    number: string;
    complement: string;
    district: string;
    city: string;
    state: string;
  };
  documentChoice: DocumentChoice;
  documents: {
    rgFront: UploadState;
    rgBack: UploadState;
    cnh: UploadState;
  };
};

type SubmissionState = {
  protocol: string;
  trackingToken: string;
  proposalId?: string;
};

type TrackingResponse = {
  status: string;
  pending: string[];
  ocr: { at: string; data: Record<string, unknown> } | null;
};

const STORAGE_KEY = 'cadastro-draft-v1';
const AUTO_SAVE_INTERVAL = 15000;

const steps = [
  { id: 'perfil', title: 'Perfil', subtitle: 'Quem esta solicitando' },
  { id: 'dados', title: 'Dados', subtitle: 'Informacoes pessoais' },
  { id: 'documentos', title: 'Docs', subtitle: 'Upload e OCR' },
  { id: 'revisao', title: 'Revisao', subtitle: 'Confirme tudo' },
];

const defaultForm: DraftFormState = {
  profileRole: 'AUTOR',
  proposalType: 'NOVO',
  fullName: '',
  cpf: '',
  email: '',
  phone: '',
  birthDate: '',
  address: {
    cep: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: '',
  },
  documentChoice: 'RG',
  documents: {
    rgFront: { status: 'idle' },
    rgBack: { status: 'idle' },
    cnh: { status: 'idle' },
  },
};

const safeTrim = (value: string) => value.trim();

const buildDraftPayload = (form: DraftFormState) => {
  const payload: Record<string, unknown> = {};

  if (safeTrim(form.fullName)) payload.fullName = safeTrim(form.fullName);
  if (safeTrim(form.cpf)) payload.cpf = normalizeCpf(form.cpf);
  if (safeTrim(form.email)) payload.email = normalizeEmail(form.email);
  if (safeTrim(form.phone)) {
    const phone = normalizePhoneToE164(form.phone);
    payload.phone = phone.e164 ?? normalizePhone(form.phone);
  }
  if (form.birthDate) payload.birthDate = form.birthDate;
  if (form.proposalType) payload.type = form.proposalType;

  const address = {
    cep: safeTrim(form.address.cep) ? normalizeCep(form.address.cep) : undefined,
    street: safeTrim(form.address.street) || undefined,
    number: safeTrim(form.address.number) || undefined,
    complement: safeTrim(form.address.complement) || undefined,
    district: safeTrim(form.address.district) || undefined,
    city: safeTrim(form.address.city) || undefined,
    state: safeTrim(form.address.state) || undefined,
  };

  const hasAddress = Object.values(address).some((value) => value);
  if (hasAddress) payload.address = address;

  return payload;
};

const resolveOcrField = (data: Record<string, unknown> | null, keys: string[]) => {
  if (!data) return '';
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return '';
};

const similarity = (a: string, b: string) => {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (!left && !right) return 1;
  if (!left || !right) return 0;
  const matrix: number[][] = Array.from({ length: left.length + 1 }, () => []);
  for (let i = 0; i <= left.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= right.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  const distance = matrix[left.length][right.length];
  return 1 - distance / Math.max(left.length, right.length);
};

const toDocTypeLabel = (choice: DocumentChoice) =>
  choice === 'RG' ? 'RG (frente e verso)' : 'CNH (documento unico)';

export default function CadastroPage() {
  const [hydrated, setHydrated] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<DraftFormState>(defaultForm);
  const [draftMeta, setDraftMeta] = useState<DraftMeta | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [submission, setSubmission] = useState<SubmissionState | null>(null);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>(
    'idle',
  );
  const [tracking, setTracking] = useState<TrackingResponse | null>(null);

  const dirtyRef = useRef(false);
  const lastPayloadRef = useRef('');

  const cpfValidation = useCpfValidation(form.cpf);
  const emailValidation = useEmailValidation(form.email);
  const phoneValidation = usePhoneValidation(form.phone);
  const cepValidation = useCepValidation(form.address.cep);
  const viaCep = useViaCepAutofill(cepValidation.normalized);

  useEffect(() => {
    if (viaCep.data) {
      setForm((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          street: viaCep.data?.street ?? prev.address.street,
          district: viaCep.data?.district ?? prev.address.district,
          city: viaCep.data?.city ?? prev.address.city,
          state: viaCep.data?.state ?? prev.address.state,
        },
      }));
      dirtyRef.current = true;
    }
  }, [viaCep.data]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as {
          form?: DraftFormState;
          draftMeta?: DraftMeta | null;
          stepIndex?: number;
        };
        if (parsed.form) setForm(parsed.form);
        if (parsed.draftMeta) setDraftMeta(parsed.draftMeta);
        if (typeof parsed.stepIndex === 'number') setStepIndex(parsed.stepIndex);
      } catch {
        // ignore corrupted storage
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, draftMeta, stepIndex }));
  }, [form, draftMeta, stepIndex, hydrated]);

  const updateForm = useCallback(
    (patch: Partial<DraftFormState>) => {
      setForm((prev) => ({ ...prev, ...patch }));
      dirtyRef.current = true;
    },
    [setForm],
  );

  const updateAddress = useCallback(
    (patch: Partial<DraftFormState['address']>) => {
      setForm((prev) => ({ ...prev, address: { ...prev.address, ...patch } }));
      dirtyRef.current = true;
    },
    [setForm],
  );

  const updateDocument = useCallback(
    (key: keyof DraftFormState['documents'], patch: Partial<UploadState>) => {
      setForm((prev) => ({
        ...prev,
        documents: {
          ...prev.documents,
          [key]: { ...prev.documents[key], ...patch },
        },
      }));
      dirtyRef.current = true;
    },
    [setForm],
  );

  const ensureDraft = useCallback(
    async (payload: Record<string, unknown>) => {
      if (draftMeta) return draftMeta;
      const response = await apiFetch<DraftMeta & { expiresAt: string }>('/public/drafts', {
        method: 'POST',
        body: { data: payload },
      });
      setDraftMeta({
        draftId: response.draftId,
        draftToken: response.draftToken,
        expiresAt: response.expiresAt,
      });
      return response;
    },
    [draftMeta],
  );

  const syncDraft = useCallback(
    async (force = false) => {
      const payload = buildDraftPayload(form);
      const serialized = JSON.stringify(payload);
      if (!force && serialized === lastPayloadRef.current) return;
      setSyncStatus('saving');
      try {
        const hadDraft = Boolean(draftMeta);
        const meta = await ensureDraft(payload);
        if (hadDraft) {
          await apiFetch(`/public/drafts/${meta.draftId}`, {
            method: 'PATCH',
            headers: { 'x-draft-token': meta.draftToken },
            body: { data: payload },
          });
        }
        lastPayloadRef.current = serialized;
        dirtyRef.current = false;
        setSyncStatus('saved');
      } catch {
        setSyncStatus('error');
      }
    },
    [form, draftMeta, ensureDraft],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (dirtyRef.current) {
        void syncDraft();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => window.clearInterval(timer);
  }, [syncDraft]);

  const handleBlur = () => {
    void syncDraft(true);
  };

  const handleUpload = async (
    docType: DocumentType,
    file: File,
    key: keyof DraftFormState['documents'],
  ) => {
    updateDocument(key, { status: 'uploading', error: undefined, fileName: file.name });
    try {
      const payload = buildDraftPayload(form);
      const meta = await ensureDraft(payload);
      const presign = await apiFetch<{
        uploadUrl: string;
        headers: Record<string, string>;
        documentId: string;
      }>('/public/uploads/presign', {
        method: 'POST',
        headers: { 'x-draft-token': meta.draftToken },
        body: {
          draftId: meta.draftId,
          draftToken: meta.draftToken,
          docType,
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
        },
      });

      await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: presign.headers,
        body: file,
      });

      updateDocument(key, {
        status: 'uploaded',
        documentId: presign.documentId,
      });
    } catch (error) {
      updateDocument(key, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Falha no upload',
      });
    }
  };

  const handleNext = async () => {
    await syncDraft(true);
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => setStepIndex((prev) => Math.max(prev - 1, 0));

  const submitProposal = async () => {
    setSubmitStatus('submitting');
    try {
      await syncDraft(true);
      const meta = await ensureDraft(buildDraftPayload(form));
      const response = await apiFetch<SubmissionState>('/public/proposals', {
        method: 'POST',
        body: { draftId: meta.draftId, draftToken: meta.draftToken },
      });
      setSubmission(response);
      setSubmitStatus('done');
      setDraftMeta(null);
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      setSubmitStatus('error');
    }
  };

  useEffect(() => {
    if (!submission) return;
    let attempts = 0;
    const poll = async () => {
      try {
        const response = await apiFetch<TrackingResponse>(
          `/public/proposals/track?protocol=${submission.protocol}&token=${submission.trackingToken}`,
        );
        setTracking(response);
        if (response.ocr?.data) return;
      } catch {
        // ignore
      }
      attempts += 1;
      if (attempts < 8) {
        setTimeout(poll, 15000);
      }
    };

    void poll();
  }, [submission]);

  const ocrAlert = useMemo(() => {
    const data = tracking?.ocr?.data ?? null;
    if (!data) return null;
    const name = resolveOcrField(data, ['nome', 'name', 'fullName']);
    const cpf = resolveOcrField(data, ['cpf', 'document', 'documento']);
    const nameScore = similarity(name, form.fullName);
    const cpfMatch = normalizeCpf(cpf) === normalizeCpf(form.cpf);
    const divergence = nameScore < 0.8 || (cpf && !cpfMatch);
    return {
      divergence,
      name,
      cpf,
    };
  }, [tracking, form.fullName, form.cpf]);

  const AddressFields = (
    <>
      <InputMasked
        label="CEP"
        value={form.address.cep}
        onChange={(value) => updateAddress({ cep: value })}
        onBlur={handleBlur}
        mask="cep"
        status={cepValidation.status}
        hint={viaCep.error ?? undefined}
        placeholder="00000-000"
      />
      <InputMasked
        label="Rua"
        value={form.address.street}
        onChange={(value) => updateAddress({ street: value })}
        onBlur={handleBlur}
        placeholder="Rua ou avenida"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <InputMasked
          label="Numero"
          value={form.address.number}
          onChange={(value) => updateAddress({ number: value })}
          onBlur={handleBlur}
          placeholder="123"
        />
        <InputMasked
          label="Complemento"
          value={form.address.complement}
          onChange={(value) => updateAddress({ complement: value })}
          onBlur={handleBlur}
          placeholder="Apto, bloco"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputMasked
          label="Bairro"
          value={form.address.district}
          onChange={(value) => updateAddress({ district: value })}
          onBlur={handleBlur}
        />
        <InputMasked
          label="Cidade"
          value={form.address.city}
          onChange={(value) => updateAddress({ city: value })}
          onBlur={handleBlur}
        />
      </div>
      <InputMasked
        label="UF"
        value={form.address.state}
        onChange={(value) => updateAddress({ state: value })}
        onBlur={handleBlur}
        placeholder="SP"
      />
    </>
  );

  return (
    <div className="min-h-screen bg-soft-gradient px-4 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-sheen" />
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_1.6fr]">
        <aside className="flex flex-col gap-6">
          <div className="rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-lg backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Cadastro digital
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-zinc-900">
              Vamos montar seu dossie com calma.
            </h1>
            <p className="mt-3 text-sm text-zinc-500">
              Tudo fica salvo automaticamente. Voce pode sair e continuar depois no mesmo
              dispositivo.
            </p>
            <div className="mt-6 flex flex-col gap-3 text-xs text-zinc-500">
              <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                <span>Autosave local</span>
                <span className="font-semibold text-emerald-600">Ativo</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                <span>Sincronizacao backend</span>
                <span className="font-semibold">
                  {syncStatus === 'saving'
                    ? 'Salvando...'
                    : syncStatus === 'saved'
                      ? 'Salvo'
                      : syncStatus === 'error'
                        ? 'Erro'
                        : 'Aguardando'}
                </span>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-zinc-700">Suporte rapido</h3>
            <p className="mt-2 text-sm text-zinc-500">
              Precisa de ajuda? Nossa equipe responde em ate 2 horas uteis.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                atendimento@sistemacadastro.com
              </span>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-600">
                +55 11 99999-9999
              </span>
            </div>
          </div>
        </aside>

        <main className="flex flex-col gap-6">
          <ProgressBar steps={steps} current={stepIndex} />

          {stepIndex === 0 ? (
            <StepLayout
              title="Seu perfil"
              description="Escolha o papel principal e o tipo de proposta."
              footer={
                <>
                  <Button onClick={handleNext}>Continuar</Button>
                </>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {(['AUTOR', 'COMPOSITOR', 'INTERPRETE', 'EDITORA'] as ProfileRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    className={cn(
                      'rounded-2xl border p-4 text-left transition',
                      form.profileRole === role
                        ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                        : 'border-zinc-200 bg-white hover:border-zinc-300',
                    )}
                    onClick={() => updateForm({ profileRole: role })}
                  >
                    <div className="text-sm font-semibold text-zinc-900">{role}</div>
                    <p className="mt-2 text-xs text-zinc-500">
                      Perfil principal para classificacao da solicitacao.
                    </p>
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Tipo de proposta
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(['NOVO', 'MIGRACAO'] as ProposalType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={cn(
                        'rounded-full px-4 py-2 text-sm font-semibold',
                        form.proposalType === type
                          ? 'bg-emerald-600 text-white'
                          : 'border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300',
                      )}
                      onClick={() => updateForm({ proposalType: type })}
                    >
                      {type === 'NOVO' ? 'Novo cadastro' : 'Migracao'}
                    </button>
                  ))}
                </div>
              </div>
            </StepLayout>
          ) : null}

          {stepIndex === 1 ? (
            <StepLayout
              title="Dados pessoais"
              description="Seus dados aparecem para nossa analise. Mantenha tudo atualizado."
              footer={
                <>
                  <Button variant="secondary" onClick={handleBack}>
                    Voltar
                  </Button>
                  <Button onClick={handleNext}>Continuar</Button>
                </>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <InputMasked
                  label="Nome completo"
                  value={form.fullName}
                  onChange={(value) => updateForm({ fullName: value })}
                  onBlur={handleBlur}
                  placeholder="Nome e sobrenome"
                />
                <InputMasked
                  label="CPF"
                  value={form.cpf}
                  onChange={(value) => updateForm({ cpf: value })}
                  onBlur={handleBlur}
                  mask="cpf"
                  status={cpfValidation.status}
                  hint={
                    cpfValidation.normalized
                      ? `Normalizado: ${cpfValidation.normalized}`
                      : undefined
                  }
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <InputMasked
                  label="Email"
                  value={form.email}
                  onChange={(value) => updateForm({ email: value })}
                  onBlur={handleBlur}
                  status={emailValidation.status}
                  hint={
                    emailValidation.normalized
                      ? `Normalizado: ${emailValidation.normalized}`
                      : undefined
                  }
                  placeholder="email@dominio.com"
                />
                <InputMasked
                  label="Telefone"
                  value={form.phone}
                  onChange={(value) => updateForm({ phone: value })}
                  onBlur={handleBlur}
                  mask="phone"
                  status={phoneValidation.status}
                  hint={
                    phoneValidation.e164
                      ? `E.164: ${phoneValidation.e164}`
                      : phoneValidation.ddd
                        ? `DDD: ${phoneValidation.ddd}`
                        : undefined
                  }
                  placeholder="(11) 91234-5678"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-zinc-700">
                  <span className="font-medium">Data de nascimento</span>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(event) => updateForm({ birthDate: event.target.value })}
                    onBlur={handleBlur}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:hidden">
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-zinc-700">
                    Endereco completo
                  </summary>
                  <div className="mt-4 grid gap-4">{AddressFields}</div>
                </details>
              </div>

              <div className="hidden rounded-2xl border border-zinc-200 bg-white p-4 sm:grid sm:gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-700">Endereco</h3>
                  <span className="text-xs text-zinc-500">
                    {viaCep.loading ? 'Consultando CEP...' : 'ViaCEP ativo'}
                  </span>
                </div>
                {AddressFields}
              </div>
            </StepLayout>
          ) : null}

          {stepIndex === 2 ? (
            <StepLayout
              title="Documentos"
              description="Envie fotos legiveis. O OCR compara com os dados informados."
              footer={
                <>
                  <Button variant="secondary" onClick={handleBack}>
                    Voltar
                  </Button>
                  <Button onClick={handleNext}>Continuar</Button>
                </>
              }
            >
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Documento principal
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(['RG', 'CNH'] as DocumentChoice[]).map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      className={cn(
                        'rounded-full px-4 py-2 text-sm font-semibold',
                        form.documentChoice === choice
                          ? 'bg-emerald-600 text-white'
                          : 'border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300',
                      )}
                      onClick={() => updateForm({ documentChoice: choice })}
                    >
                      {toDocTypeLabel(choice)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {form.documentChoice === 'RG' ? (
                  <>
                    <UploadCard
                      title="RG - frente"
                      state={form.documents.rgFront}
                      onSelect={(file) => handleUpload('RG_FRENTE', file, 'rgFront')}
                    />
                    <UploadCard
                      title="RG - verso"
                      state={form.documents.rgBack}
                      onSelect={(file) => handleUpload('RG_VERSO', file, 'rgBack')}
                    />
                  </>
                ) : (
                  <UploadCard
                    title="CNH"
                    state={form.documents.cnh}
                    onSelect={(file) => handleUpload('CNH', file, 'cnh')}
                  />
                )}
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-zinc-700">Dicas rapidas</h3>
                <ul className="mt-3 grid gap-2 text-sm text-zinc-500">
                  <li>- Use boa iluminacao e evite reflexos.</li>
                  <li>- Garanta que todos os cantos aparecam.</li>
                  <li>- Envie foto nitida, sem cortes.</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
                OCR status: {tracking?.ocr ? 'Processado' : 'Aguardando envio'}
              </div>
            </StepLayout>
          ) : null}

          {stepIndex === 3 ? (
            <StepLayout
              title="Revisao final"
              description="Confira tudo antes de enviar."
              tone="review"
              footer={
                <>
                  <Button variant="secondary" onClick={handleBack}>
                    Voltar
                  </Button>
                  <Button onClick={submitProposal} disabled={submitStatus === 'submitting'}>
                    {submitStatus === 'submitting' ? 'Enviando...' : 'Enviar proposta'}
                  </Button>
                </>
              }
            >
              <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-zinc-500">
                  <span>Resumo</span>
                  <span>{form.proposalType}</span>
                </div>
                <div className="grid gap-2">
                  <span className="font-semibold text-zinc-900">{form.fullName || 'Nome'}</span>
                  <span>{form.cpf || 'CPF'}</span>
                  <span>{form.email || 'Email'}</span>
                  <span>{form.phone || 'Telefone'}</span>
                  <span>{form.address.cep ? `CEP: ${form.address.cep}` : 'Endereco'}</span>
                </div>
              </div>

              {ocrAlert ? (
                <div
                  className={cn(
                    'rounded-2xl border p-5 text-sm',
                    ocrAlert.divergence
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-800',
                  )}
                >
                  <p className="font-semibold">
                    {ocrAlert.divergence ? 'Divergencia OCR detectada' : 'OCR sem divergencias'}
                  </p>
                  <p className="mt-2 text-xs">
                    OCR nome: {ocrAlert.name || 'N/A'} | OCR CPF: {ocrAlert.cpf || 'N/A'}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500">
                  OCR ainda nao processado. Assim que concluido, alertas aparecem aqui.
                </div>
              )}

              {submitStatus === 'done' && submission ? (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-sm text-emerald-800">
                  <p className="font-semibold">Proposta enviada com sucesso</p>
                  <p className="mt-2">
                    Protocolo: <span className="font-semibold">{submission.protocol}</span>
                  </p>
                  <p className="mt-1 text-xs text-emerald-700">
                    Acompanhe pelo backoffice ou pelo link de acompanhamento informado por email.
                  </p>
                </div>
              ) : null}

              {submitStatus === 'error' ? (
                <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                  Falha ao enviar. Revise os dados e tente novamente.
                </div>
              ) : null}
            </StepLayout>
          ) : null}
        </main>
      </div>
    </div>
  );
}

const UploadCard = ({
  title,
  state,
  onSelect,
}: {
  title: string;
  state: UploadState;
  onSelect: (file: File) => void;
}) => {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-zinc-700">{title}</h4>
          <p className="text-xs text-zinc-500">
            {state.status === 'uploaded'
              ? `Enviado: ${state.fileName ?? 'ok'}`
              : 'JPEG, PNG ou PDF'}
          </p>
        </div>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold',
            state.status === 'uploaded'
              ? 'bg-emerald-100 text-emerald-700'
              : state.status === 'uploading'
                ? 'bg-amber-100 text-amber-700'
                : state.status === 'error'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-zinc-100 text-zinc-600',
          )}
        >
          {state.status === 'uploaded'
            ? 'ok'
            : state.status === 'uploading'
              ? 'enviando'
              : state.status === 'error'
                ? 'erro'
                : 'pendente'}
        </span>
      </div>
      <label className="mt-4 flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500 hover:border-emerald-300">
        <input
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onSelect(file);
          }}
        />
        <span>Enviar arquivo ou usar camera</span>
        <span className="text-xs">Clique para selecionar</span>
      </label>
      {state.error ? <p className="mt-2 text-xs text-red-600">{state.error}</p> : null}
    </div>
  );
};

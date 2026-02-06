'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { MessageCircle } from 'lucide-react';
import { PrivacyGate } from './PrivacyGate';
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
import { apiFetch, apiUpload } from '../lib/api';
import { InputMasked } from '../components/InputMasked';
import { ProgressBar } from '../components/ProgressBar';
import { StepLayout } from '../components/StepLayout';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { maskCpf } from '../lib/masks';
import { SmartDocumentUpload } from './SmartDocumentUpload';

type ProfileRole = 'AUTOR' | 'COMPOSITOR' | 'INTERPRETE' | 'EDITORA' | 'PRODUTOR' | 'OUTRO';
type ProposalType = 'NOVO' | 'MIGRACAO';
type DocumentChoice = 'RG' | 'CNH';
type DocumentType =
  | 'RG_FRENTE'
  | 'RG_VERSO'
  | 'CNH'
  | 'DESFILIACAO'
  | 'COMPROVANTE_RESIDENCIA'
  | 'OUTROS';
type BankAccountType = 'CC' | 'CP';
type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA' | 'OUTRO';
type SocialProvider = 'SPOTIFY' | 'YOUTUBE' | 'INSTAGRAM' | 'FACEBOOK';

type SocialConnection = {
  provider: SocialProvider;
  connected: boolean;
  connectedAt?: string;
  profile?: Record<string, unknown>;
};

type DraftMeta = {
  draftId: string;
  draftToken: string;
  expiresAt?: string;
};

type UploadState = {
  documentId?: string;
  fileName?: string;
  previewUrl?: string;
  status: 'idle' | 'uploading' | 'uploaded' | 'error';
  error?: string;
};

type DraftFormState = {
  profileRoles: ProfileRole[];
  profileRoleOther: string;
  proposalType: ProposalType;
  migrationEntity: string;
  migrationConfirmed: boolean;
  fullName: string;
  cpf: string;
  email: string;
  phone: string;
  birthDate: string;
  consentAccepted: boolean;
  consentAt: string;
  privacyAccepted: boolean;
  privacyAt: string;
  address: {
    cep: string;
    street: string;
    number: string;
    complement: string;
    district: string;
    city: string;
    state: string;
  };
  bank: {
    bankCode: string;
    bankName: string;
    agency: string;
    account: string;
    accountType: BankAccountType | '';
    holderName: string;
    holderDocument: string;
    pixKey: string;
    pixKeyType: PixKeyType | '';
  };
  documentChoice: DocumentChoice;
  documents: {
    rgFront: UploadState;
    rgBack: UploadState;
    cnh: UploadState;
    desfiliacao: UploadState;
    residence: UploadState;
  };
  socialConnections: SocialConnection[];
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

type DraftOcrResult = {
  id: string;
  documentFileId?: string | null;
  structuredData: Record<string, unknown>;
  createdAt: string;
  heuristics?: Record<string, unknown> | null;
};

const STORAGE_KEY = 'cadastro-draft-v1';
const AUTO_SAVE_INTERVAL = 15000;
const CONSENT_VERSION = process.env.NEXT_PUBLIC_CONSENT_VERSION ?? 'v1';
const PRIVACY_VERSION = process.env.NEXT_PUBLIC_PRIVACY_VERSION ?? 'v1';
const buildTrackingUrl = (protocol: string, token: string) =>
  `/acompanhar?protocolo=${encodeURIComponent(protocol)}&token=${encodeURIComponent(token)}`;
const buildApiUrl = (path: string) => {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  if (!base) return path;
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
};

const readStoredDraft = () => {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as {
      form?: DraftFormState;
      draftMeta?: DraftMeta | null;
      stepIndex?: number;
    };
    if (!parsed.form) return null;
    return {
      form: parsed.form,
      draftMeta: parsed.draftMeta ?? null,
      stepIndex: parsed.stepIndex,
    };
  } catch {
    return null;
  }
};

const baseSteps = [
  { id: 'perfil', title: 'Perfil', subtitle: 'Quem esta solicitando' },
  { id: 'dados', title: 'Dados', subtitle: 'Informacoes pessoais' },
  { id: 'documentos', title: 'Docs', subtitle: 'Upload e OCR' },
  { id: 'redes', title: 'Redes', subtitle: 'Conecte suas redes' },
  { id: 'revisao', title: 'Revisao', subtitle: 'Confirme tudo' },
];

const migrationSteps = [
  { id: 'perfil', title: 'Perfil', subtitle: 'Quem esta solicitando' },
  { id: 'dados', title: 'Dados', subtitle: 'Informacoes pessoais' },
  { id: 'migracao', title: 'Migracao', subtitle: 'Entidade anterior' },
  { id: 'documentos', title: 'Docs', subtitle: 'Upload e OCR' },
  { id: 'redes', title: 'Redes', subtitle: 'Conecte suas redes' },
  { id: 'revisao', title: 'Revisao', subtitle: 'Confirme tudo' },
];

const MIGRATION_ENTITIES = ['ABRAMUS', 'AMAR', 'ASSIM', 'SOCINPRO', 'SICAM', 'UBC'] as const;

const defaultForm: DraftFormState = {
  profileRoles: [],
  profileRoleOther: '',
  proposalType: 'NOVO',
  migrationEntity: '',
  migrationConfirmed: false,
  fullName: '',
  cpf: '',
  email: '',
  phone: '',
  birthDate: '',
  consentAccepted: false,
  consentAt: '',
  privacyAccepted: false,
  privacyAt: '',
  address: {
    cep: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: '',
  },
  bank: {
    bankCode: '',
    bankName: '',
    agency: '',
    account: '',
    accountType: '',
    holderName: '',
    holderDocument: '',
    pixKey: '',
    pixKeyType: '',
  },
  documentChoice: 'RG',
  documents: {
    rgFront: { status: 'idle' },
    rgBack: { status: 'idle' },
    cnh: { status: 'idle' },
    desfiliacao: { status: 'idle' },
    residence: { status: 'idle' },
  },
  socialConnections: [],
};

const safeTrim = (value: string) => value.trim();
const isAdult = (value: string) => {
  if (!value) return false;
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return false;
  const adulthood = new Date(birth);
  adulthood.setFullYear(birth.getFullYear() + 18);
  return new Date() >= adulthood;
};
const formatDate = (value: string) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('pt-BR');
};
const normalizeDateInput = (value: string) => {
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return trimmed;
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${year}-${month}-${day}`;
  }
  return trimmed;
};

const buildDraftPayload = (form: DraftFormState) => {
  const payload: Record<string, unknown> = {};

  if (form.profileRoles.length > 0) payload.profileRoles = form.profileRoles;
  if (safeTrim(form.profileRoleOther)) payload.profileRoleOther = safeTrim(form.profileRoleOther);
  if (safeTrim(form.fullName)) payload.fullName = safeTrim(form.fullName);
  if (safeTrim(form.cpf)) payload.cpf = normalizeCpf(form.cpf);
  if (safeTrim(form.email)) payload.email = normalizeEmail(form.email);
  if (safeTrim(form.phone)) {
    const phone = normalizePhoneToE164(form.phone);
    payload.phone = phone.e164 ?? normalizePhone(form.phone);
  }
  if (form.birthDate) payload.birthDate = form.birthDate;
  if (form.proposalType) payload.type = form.proposalType;
  payload.documentChoice = form.documentChoice;
  if (safeTrim(form.migrationEntity)) payload.migrationEntity = safeTrim(form.migrationEntity);
  payload.migrationConfirmed = form.migrationConfirmed;
  payload.consent = {
    accepted: form.consentAccepted,
    version: CONSENT_VERSION,
    at: form.consentAccepted ? form.consentAt || new Date().toISOString() : undefined,
    privacyAccepted: form.privacyAccepted,
    privacyVersion: PRIVACY_VERSION,
    privacyAt: form.privacyAccepted ? form.privacyAt || new Date().toISOString() : undefined,
  };

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

  const bank = {
    bankCode: safeTrim(form.bank.bankCode) || undefined,
    bankName: safeTrim(form.bank.bankName) || undefined,
    agency: safeTrim(form.bank.agency) || undefined,
    account: safeTrim(form.bank.account) || undefined,
    accountType: form.bank.accountType || undefined,
    holderName: safeTrim(form.bank.holderName) || undefined,
    holderDocument: safeTrim(form.bank.holderDocument) || undefined,
    pixKey: safeTrim(form.bank.pixKey) || undefined,
    pixKeyType: form.bank.pixKeyType || undefined,
  };
  const hasBank = Object.values(bank).some((value) => value);
  if (hasBank) payload.bank = bank;

  return payload;
};

const resolveOcrField = (data: Record<string, unknown> | null, keys: string[]) => {
  if (!data) return '';
  const raw =
    typeof data.fields === 'object' && data.fields
      ? (data.fields as Record<string, unknown>)
      : data;
  for (const key of keys) {
    const value = raw[key];
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

const loadImageSize = (file: File) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);
    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      cleanup();
    };
    image.onerror = () => {
      cleanup();
      reject(new Error('Falha ao ler imagem'));
    };
    image.src = url;
  });

export function CadastroForm({ proposalType }: { proposalType: ProposalType }) {
  const [hydrated, setHydrated] = useState(false);
  const [privacyAcceptedGate, setPrivacyAcceptedGate] = useState(false);
  const [privacyGateReady, setPrivacyGateReady] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<DraftFormState>({ ...defaultForm, proposalType });
  const [draftMeta, setDraftMeta] = useState<DraftMeta | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [submission, setSubmission] = useState<SubmissionState | null>(null);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>(
    'idle',
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<TrackingResponse | null>(null);
  const [draftOcrResults, setDraftOcrResults] = useState<DraftOcrResult[]>([]);
  const [restoreDraft, setRestoreDraft] = useState<{
    form: DraftFormState;
    draftMeta?: DraftMeta | null;
    stepIndex?: number;
  } | null>(null);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [mobileFieldIndex, setMobileFieldIndex] = useState(0);
  const [migrationEntitySelection, setMigrationEntitySelection] = useState('');
  const [ocrConfirmed, setOcrConfirmed] = useState(false);
  const [socialCallbackError, setSocialCallbackError] = useState<string | null>(null);
  const [pendingSocialRefresh, setPendingSocialRefresh] = useState(false);
  const [showResidenceUpload, setShowResidenceUpload] = useState(false);

  const dirtyRef = useRef(false);
  const lastPayloadRef = useRef('');
  const previewUrlsRef = useRef<Set<string>>(new Set());

  const steps = useMemo(
    () => (proposalType === 'MIGRACAO' ? migrationSteps : baseSteps),
    [proposalType],
  );
  const currentStep = steps[stepIndex]?.id ?? steps[0]?.id;

  useEffect(() => {
    const stored = readStoredDraft();
    if (stored) {
      setRestoreDraft(stored);
      setShowRestorePrompt(true);
    } else {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPrivacyAcceptedGate(localStorage.getItem('privacy_gate_accepted') === 'true');
    setPrivacyGateReady(true);
  }, []);

  const cpfValidation = useCpfValidation(form.cpf);
  const emailValidation = useEmailValidation(form.email);
  const phoneValidation = usePhoneValidation(form.phone);
  const cepValidation = useCepValidation(form.address.cep);
  const viaCep = useViaCepAutofill(cepValidation.normalized);
  const resolvedAddress = useMemo(() => {
    if (!viaCep.data) return form.address;
    return {
      ...form.address,
      street: form.address.street || viaCep.data.street || '',
      district: form.address.district || viaCep.data.district || '',
      city: form.address.city || viaCep.data.city || '',
      state: form.address.state || viaCep.data.state || '',
    };
  }, [form.address, viaCep.data]);

  useEffect(() => {
    if (viaCep.data) {
      dirtyRef.current = true;
    }
  }, [viaCep.data]);

  useEffect(() => {
    if (!form.address.cep) {
      const residenceOcr = draftOcrResults.find((entry) => {
        const sd = entry.structuredData as { document_type?: string; fields?: { cep?: string } };
        return sd?.document_type === 'COMPROVANTE_RESIDENCIA' && sd?.fields?.cep;
      });
      if (residenceOcr) {
        const fields = (
          residenceOcr.structuredData as { fields?: { cep?: string; endereco?: string } }
        ).fields;
        if (fields?.cep) {
          setForm((prev) => ({
            ...prev,
            address: { ...prev.address, cep: fields.cep! },
          }));
          dirtyRef.current = true;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftOcrResults]);

  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, draftMeta, stepIndex }));
  }, [form, draftMeta, stepIndex, hydrated]);

  useEffect(() => {
    if (showResidenceUpload) return;
    if (form.documents.residence.status !== 'idle' || form.documents.residence.documentId) {
      setShowResidenceUpload(true);
    }
  }, [form.documents.residence.documentId, form.documents.residence.status, showResidenceUpload]);

  const updateForm = useCallback(
    (patch: Partial<DraftFormState>) => {
      setForm((prev) => ({ ...prev, ...patch }));
      dirtyRef.current = true;
    },
    [setForm],
  );

  const applyOcrToForm = useCallback(
    (ocrData?: Record<string, string>) => {
      if (!ocrData) return;
      const patch: Partial<DraftFormState> = {};
      if (ocrData.nome) {
        patch.fullName = ocrData.nome;
      }
      if (ocrData.cpf) {
        patch.cpf = maskCpf(ocrData.cpf);
      }
      if (ocrData.dataNascimento) {
        patch.birthDate = normalizeDateInput(ocrData.dataNascimento);
      }
      if (Object.keys(patch).length > 0) {
        updateForm(patch);
      }
    },
    [updateForm],
  );

  const toggleProfileRole = useCallback((role: ProfileRole) => {
    setForm((prev) => {
      const nextRoles = new Set(prev.profileRoles);
      if (nextRoles.has(role)) {
        nextRoles.delete(role);
      } else {
        nextRoles.add(role);
      }
      const roles = Array.from(nextRoles);
      return {
        ...prev,
        profileRoles: roles,
        profileRoleOther: roles.includes('OUTRO') ? prev.profileRoleOther : '',
      };
    });
    dirtyRef.current = true;
  }, []);

  const markTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const applyStoredDraft = useCallback(
    (stored: { form: DraftFormState; draftMeta?: DraftMeta | null; stepIndex?: number }) => {
      const parsedForm = stored.form as DraftFormState & { profileRole?: ProfileRole };
      const parsedDocs = parsedForm.documents ?? {};
      const parsedRoles =
        parsedForm.profileRoles ?? (parsedForm.profileRole ? [parsedForm.profileRole] : []);

      setForm({
        ...defaultForm,
        ...parsedForm,
        profileRoles: parsedRoles,
        profileRoleOther: parsedForm.profileRoleOther ?? '',
        address: {
          ...defaultForm.address,
          ...(parsedForm.address ?? {}),
        },
        bank: {
          ...defaultForm.bank,
          ...(parsedForm.bank ?? {}),
        },
        socialConnections: parsedForm.socialConnections ?? [],
        documents: {
          ...defaultForm.documents,
          ...parsedDocs,
          rgFront: {
            ...defaultForm.documents.rgFront,
            ...parsedDocs.rgFront,
            previewUrl: undefined,
          },
          rgBack: {
            ...defaultForm.documents.rgBack,
            ...parsedDocs.rgBack,
            previewUrl: undefined,
          },
          cnh: { ...defaultForm.documents.cnh, ...parsedDocs.cnh, previewUrl: undefined },
          desfiliacao: {
            ...defaultForm.documents.desfiliacao,
            ...parsedDocs.desfiliacao,
            previewUrl: undefined,
          },
          residence: {
            ...defaultForm.documents.residence,
            ...parsedDocs.residence,
            previewUrl: undefined,
          },
        },
      });

      if (stored.draftMeta) setDraftMeta(stored.draftMeta);
      if (typeof stored.stepIndex === 'number') {
        const nextSteps = proposalType === 'MIGRACAO' ? migrationSteps : baseSteps;
        const nextIndex = Math.min(stored.stepIndex, nextSteps.length - 1);
        setStepIndex(nextIndex);
        if (nextSteps[nextIndex]?.id === 'dados') {
          setMobileFieldIndex(0);
        }
      }
    },
    [setDraftMeta, setMobileFieldIndex],
  );

  const restoreFromStorage = () => {
    if (!restoreDraft) {
      setShowRestorePrompt(false);
      setHydrated(true);
      return;
    }
    applyStoredDraft(restoreDraft);
    setShowRestorePrompt(false);
    setHydrated(true);
  };

  const discardStoredDraft = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setRestoreDraft(null);
    setShowRestorePrompt(false);
    setHydrated(true);
  };

  const updateAddress = useCallback(
    (patch: Partial<DraftFormState['address']>) => {
      setForm((prev) => ({ ...prev, address: { ...prev.address, ...patch } }));
      dirtyRef.current = true;
    },
    [setForm],
  );

  const updateBank = useCallback(
    (patch: Partial<DraftFormState['bank']>) => {
      setForm((prev) => ({ ...prev, bank: { ...prev.bank, ...patch } }));
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

  const buildPayload = useCallback(
    () =>
      buildDraftPayload({
        ...form,
        address: resolvedAddress,
      }),
    [form, resolvedAddress],
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

  const ensureDraftForSocial = useCallback(
    () => ensureDraft(buildPayload()),
    [ensureDraft, buildPayload],
  );

  const ensureDraftForUploads = useCallback(
    () => ensureDraft(buildPayload()),
    [ensureDraft, buildPayload],
  );

  const refreshDraftSocial = useCallback(
    async (meta?: DraftMeta | null) => {
      const current = meta ?? draftMeta;
      if (!current) return;
      try {
        const response = await apiFetch<{ data?: Record<string, unknown> }>(
          `/public/drafts/${current.draftId}`,
          {
            headers: { 'x-draft-token': current.draftToken },
          },
        );
        const connections = Array.isArray(response.data?.socialConnections)
          ? response.data?.socialConnections
          : null;
        if (connections) {
          const normalized = connections.map((conn) => ({
            ...conn,
            connected: conn.connected ?? true,
          }));
          updateForm({ socialConnections: normalized as SocialConnection[] });
        }
      } catch (err) {
        setSocialCallbackError(
          err instanceof Error
            ? err.message
            : 'Nao foi possivel sincronizar as redes. Atualize a pagina.',
        );
      }
    },
    [draftMeta, updateForm],
  );

  const fetchDraftOcr = useCallback(
    async (meta: DraftMeta) => {
      try {
        const response = await apiFetch<{ results: DraftOcrResult[] }>(
          `/public/drafts/${meta.draftId}/ocr`,
          {
            headers: { 'x-draft-token': meta.draftToken },
          },
        );
        setDraftOcrResults(response.results ?? []);
        return response.results ?? [];
      } catch {
        return [];
      }
    },
    [setDraftOcrResults],
  );

  const pollDraftOcr = useCallback(
    (meta: DraftMeta, documentId?: string) => {
      let attempts = 0;
      const poll = async () => {
        const results = await fetchDraftOcr(meta);
        const hasMatch = documentId
          ? results.some((entry) => entry.documentFileId === documentId)
          : results.length > 0;
        if (hasMatch) return;
        attempts += 1;
        if (attempts < 6) {
          setTimeout(poll, 4000);
        }
      };
      void poll();
    },
    [fetchDraftOcr],
  );

  const syncDraft = useCallback(
    async (force = false) => {
      const payload = buildPayload();
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
        setLastSavedAt(new Date().toISOString());
      } catch {
        setSyncStatus('error');
      }
    },
    [buildPayload, draftMeta, ensureDraft],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const socialStatus = params.get('social');
    const socialError = params.get('erro');
    if (!socialStatus && !socialError) return;

    if (socialError) {
      setSocialCallbackError(
        `Nao foi possivel conectar a rede social (${socialError}). Tente novamente.`,
      );
      setPendingSocialRefresh(false);
    } else {
      setSocialCallbackError(null);
      setPendingSocialRefresh(true);
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('social');
    url.searchParams.delete('provider');
    url.searchParams.delete('erro');
    url.searchParams.delete('draftId');
    window.history.replaceState({}, '', url.toString());
  }, []);

  useEffect(() => {
    if (!pendingSocialRefresh || !draftMeta) return;
    void refreshDraftSocial(draftMeta).finally(() => {
      setPendingSocialRefresh(false);
    });
  }, [pendingSocialRefresh, draftMeta, refreshDraftSocial]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (dirtyRef.current) {
        void syncDraft();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => window.clearInterval(timer);
  }, [syncDraft]);

  const handleFieldBlur = (field?: string) => {
    if (field) markTouched(field);
    void syncDraft(true);
  };

  const handleUpload = async (
    docType: DocumentType,
    file: File,
    key: keyof DraftFormState['documents'],
  ) => {
    const previousPreview = form.documents[key]?.previewUrl;
    if (previousPreview) {
      URL.revokeObjectURL(previousPreview);
      previewUrlsRef.current.delete(previousPreview);
    }
    const previewUrl = URL.createObjectURL(file);
    previewUrlsRef.current.add(previewUrl);
    updateDocument(key, {
      status: 'uploading',
      error: undefined,
      fileName: file.name,
      previewUrl,
    });
    setOcrConfirmed(false);
    try {
      const useDirectUpload =
        typeof window !== 'undefined' && window.location.hostname.endsWith('.devtunnels.ms');
      const payload = buildPayload();
      const meta = await ensureDraft(payload);
      const isImage = file.type.startsWith('image/');
      const dimensions = isImage ? await loadImageSize(file) : null;

      // Validacao de legibilidade minima da imagem
      if (isImage && dimensions) {
        const minWidth = 600;
        const minHeight = 600;
        const minSize = 5 * 1024; // 5KB

        if (dimensions.width < minWidth || dimensions.height < minHeight) {
          throw new Error(
            `Imagem muito pequena (${dimensions.width}x${dimensions.height}px). Mínimo: ${minWidth}x${minHeight}px.`,
          );
        }

        if (file.size < minSize) {
          throw new Error(
            `Arquivo muito pequeno (${Math.round(file.size / 1024)}KB). Mínimo: ${Math.round(minSize / 1024)}KB. Tente uma foto de melhor qualidade.`,
          );
        }
      }
      let documentId: string;

      if (useDirectUpload) {
        const form = new FormData();
        form.append('file', file);
        form.append('draftId', meta.draftId);
        form.append('docType', docType);
        if (dimensions?.width) {
          form.append('imageWidth', String(dimensions.width));
        }
        if (dimensions?.height) {
          form.append('imageHeight', String(dimensions.height));
        }

        const direct = await apiUpload<{ documentId: string; storageKey: string }>(
          '/public/uploads/direct',
          {
            method: 'POST',
            headers: { 'x-draft-token': meta.draftToken },
            body: form,
          },
        );
        documentId = direct.documentId;
      } else {
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
            imageWidth: dimensions?.width,
            imageHeight: dimensions?.height,
          },
        });

        await fetch(presign.uploadUrl, {
          method: 'PUT',
          headers: presign.headers,
          body: file,
        });

        documentId = presign.documentId;
      }

      updateDocument(key, {
        status: 'uploaded',
        documentId,
      });

      if (['RG_FRENTE', 'CNH', 'COMPROVANTE_RESIDENCIA'].includes(docType)) {
        await apiFetch(`/public/drafts/${meta.draftId}/ocr`, {
          method: 'POST',
          headers: { 'x-draft-token': meta.draftToken },
        });
        pollDraftOcr(meta, documentId);
      }
    } catch (error) {
      updateDocument(key, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Falha no upload',
      });
    }
  };

  const clearDocument = (key: keyof DraftFormState['documents']) => {
    const previousPreview = form.documents[key]?.previewUrl;
    if (previousPreview) {
      URL.revokeObjectURL(previousPreview);
      previewUrlsRef.current.delete(previousPreview);
    }
    updateDocument(key, {
      status: 'idle',
      documentId: undefined,
      fileName: undefined,
      previewUrl: undefined,
      error: undefined,
    });
    setOcrConfirmed(false);
  };

  const handleNext = async () => {
    if (currentStep === 'perfil' && !profileStepValid) return;
    if (currentStep === 'dados' && !dataStepValid) return;
    if (currentStep === 'migracao' && !migrationStepValid) return;
    if (currentStep === 'documentos' && !documentsStepValid) return;
    await syncDraft(true);
    const nextIndex = Math.min(stepIndex + 1, steps.length - 1);
    setStepIndex(nextIndex);
    if (steps[nextIndex]?.id === 'dados') {
      setMobileFieldIndex(0);
    }
  };

  const handleBack = () => {
    const nextIndex = Math.max(stepIndex - 1, 0);
    setStepIndex(nextIndex);
    if (steps[nextIndex]?.id === 'dados') {
      setMobileFieldIndex(0);
    }
  };

  const submitProposal = async () => {
    setSubmitStatus('submitting');
    setSubmitError(null);
    try {
      await syncDraft(true);
      const meta = await ensureDraft(buildPayload());
      const response = await apiFetch<SubmissionState>('/public/proposals', {
        method: 'POST',
        body: { draftId: meta.draftId, draftToken: meta.draftToken },
      });
      setSubmission(response);
      setSubmitStatus('done');
      setDraftMeta(null);
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : null);
      setSubmitStatus('error');
    }
  };

  const handleConsentChange = (accepted: boolean) => {
    updateForm({
      consentAccepted: accepted,
      consentAt: accepted ? new Date().toISOString() : '',
    });
  };

  const handlePrivacyChange = (accepted: boolean) => {
    updateForm({
      privacyAccepted: accepted,
      privacyAt: accepted ? new Date().toISOString() : '',
    });
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

  const documentPreview = useMemo(() => {
    if (form.documentChoice === 'RG') {
      if (form.documents.rgFront.previewUrl) {
        return {
          key: 'rgFront',
          label: 'RG - frente',
          state: form.documents.rgFront,
          documentId: form.documents.rgFront.documentId,
        };
      }
      if (form.documents.rgBack.previewUrl) {
        return {
          key: 'rgBack',
          label: 'RG - verso',
          state: form.documents.rgBack,
          documentId: form.documents.rgBack.documentId,
        };
      }
      return null;
    }
    if (form.documents.cnh.previewUrl) {
      return {
        key: 'cnh',
        label: 'CNH',
        state: form.documents.cnh,
        documentId: form.documents.cnh.documentId,
      };
    }
    return null;
  }, [form.documentChoice, form.documents]);

  const previewOcrResult = useMemo(() => {
    if (!documentPreview?.documentId) return null;
    return (
      draftOcrResults.find((entry) => entry.documentFileId === documentPreview.documentId) ?? null
    );
  }, [draftOcrResults, documentPreview]);

  const ocrAlert = useMemo(() => {
    const data =
      tracking?.ocr?.data ?? (previewOcrResult?.structuredData as Record<string, unknown> | null);
    if (!data) return null;
    const name = resolveOcrField(data, ['nome', 'name', 'fullName']);
    const cpf = resolveOcrField(data, ['cpf', 'document', 'documento']);
    const heuristics = previewOcrResult?.heuristics as
      | {
          comparison?: {
            mismatch?: boolean;
            nameThreshold?: number;
            nameDivergence?: number;
            cpfMatches?: boolean;
          };
        }
      | undefined;
    if (heuristics?.comparison) {
      return {
        divergence: Boolean(heuristics.comparison.mismatch),
        name,
        cpf,
        threshold: heuristics.comparison.nameThreshold,
        divergenceScore: heuristics.comparison.nameDivergence,
      };
    }

    const nameScore = similarity(name, form.fullName);
    const cpfMatch = normalizeCpf(cpf) === normalizeCpf(form.cpf);
    const divergence = nameScore < 0.8 || (cpf && !cpfMatch);
    return {
      divergence,
      name,
      cpf,
    };
  }, [tracking?.ocr?.data, previewOcrResult, form.fullName, form.cpf]);

  const legibilityWarning = useMemo(() => {
    const heuristics = previewOcrResult?.heuristics as
      | { legibility?: { ok?: boolean } }
      | undefined;
    if (!heuristics?.legibility) return null;
    if (heuristics.legibility.ok === false) {
      return 'Imagem com baixa legibilidade. Tente refazer a foto.';
    }
    return null;
  }, [previewOcrResult]);

  const expiredWarning = useMemo(() => {
    const heuristics = previewOcrResult?.heuristics as { expired?: boolean } | undefined;
    if (heuristics?.expired) {
      return 'Documento vencido. Por favor, envie um documento dentro da validade.';
    }
    return null;
  }, [previewOcrResult]);

  const docTypeWarning = useMemo(() => {
    const heuristics = previewOcrResult?.heuristics as
      | { docType?: { detected?: string | null; uploaded?: string | null; mismatch?: boolean } }
      | undefined;
    if (!heuristics?.docType?.mismatch) return null;
    const detected = heuristics.docType.detected ?? 'desconhecido';
    const uploaded = heuristics.docType.uploaded ?? 'documento enviado';
    return `O OCR identificou ${detected}, mas o documento enviado foi ${uploaded}. Verifique se esta correto.`;
  }, [previewOcrResult]);

  const ocrPreviewFields = useMemo(() => {
    const data =
      tracking?.ocr?.data ?? (previewOcrResult?.structuredData as Record<string, unknown> | null);
    const name = resolveOcrField(data, ['nome', 'name', 'fullName']) || form.fullName;
    const cpf = resolveOcrField(data, ['cpf', 'document', 'documento']) || form.cpf;
    const birthDate =
      resolveOcrField(data, ['data_nascimento', 'birthDate', 'nascimento']) ||
      formatDate(form.birthDate);
    const docNumber = resolveOcrField(data, [
      'rg',
      'cnh',
      'rg_cnh',
      'numero_documento',
      'numero',
      'document_number',
    ]);
    const issueDate = resolveOcrField(data, ['data_emissao', 'issue_date']);
    const issuer = resolveOcrField(data, ['orgao_emissor', 'emissor', 'issuer']);

    return [
      { label: 'Nome', value: name || '-' },
      { label: 'CPF', value: cpf || '-' },
      { label: 'Nascimento', value: birthDate || '-' },
      { label: 'Documento', value: docNumber || '-' },
      { label: 'Emissao', value: issueDate || '-' },
      { label: 'Orgao emissor', value: issuer || '-' },
    ];
  }, [tracking?.ocr?.data, previewOcrResult, form.fullName, form.cpf, form.birthDate]);

  const otherRoleSelected = form.profileRoles.includes('OUTRO');
  const profileRoleOtherInvalid = otherRoleSelected && !form.profileRoleOther.trim();
  const profileRoleOtherErrorId = 'profile-role-other-error';
  const migrationEntityValue = form.migrationEntity.trim();
  const migrationEntityPreset =
    MIGRATION_ENTITIES.find(
      (entity) => entity.toLowerCase() === migrationEntityValue.toLowerCase(),
    ) ?? null;
  const migrationSelectValue = migrationEntityValue
    ? (migrationEntityPreset ?? '')
    : migrationEntitySelection;

  useEffect(() => {
    if (migrationEntityValue) {
      const nextSelection = migrationEntityPreset ?? '';
      if (migrationEntitySelection !== nextSelection) {
        setMigrationEntitySelection(nextSelection);
      }
      return;
    }
    if (migrationEntitySelection) {
      setMigrationEntitySelection('');
    }
  }, [migrationEntityValue, migrationEntityPreset, migrationEntitySelection]);
  const profileStepValid =
    form.profileRoles.length > 0 &&
    (!otherRoleSelected || Boolean(form.profileRoleOther.trim().length));
  const migrationStepValid =
    form.proposalType !== 'MIGRACAO' ||
    (Boolean(form.migrationEntity.trim().length) &&
      form.migrationConfirmed &&
      form.documents.desfiliacao.status === 'uploaded');
  const docsMainValid =
    form.documentChoice === 'RG'
      ? form.documents.rgFront.status === 'uploaded' && form.documents.rgBack.status === 'uploaded'
      : form.documents.cnh.status === 'uploaded';
  const documentsStepValid = docsMainValid;

  const requiredFieldStatus = (value: string, key: string, min = 1) => {
    if (!touched[key]) return 'idle';
    return value.trim().length >= min ? 'valid' : 'invalid';
  };

  const fullNameValid = form.fullName.trim().split(/\s+/).filter(Boolean).length >= 2;
  const birthDateValid = isAdult(form.birthDate);
  const addressRequiredValid =
    cepValidation.isValid &&
    resolvedAddress.street.trim().length >= 2 &&
    resolvedAddress.district.trim().length >= 2 &&
    resolvedAddress.city.trim().length >= 2 &&
    resolvedAddress.state.trim().length >= 2;
  const fullNameStatus = touched.fullName ? (fullNameValid ? 'valid' : 'invalid') : 'idle';
  const birthDateStatus = touched.birthDate ? (birthDateValid ? 'valid' : 'invalid') : 'idle';
  const cpfStatus = touched.cpf ? (form.cpf ? cpfValidation.status : 'invalid') : 'idle';
  const emailStatus = touched.email ? (form.email ? emailValidation.status : 'invalid') : 'idle';
  const phoneStatus = touched.phone ? (form.phone ? phoneValidation.status : 'invalid') : 'idle';
  const dataStepValid =
    fullNameValid &&
    birthDateValid &&
    cpfValidation.isValid &&
    emailValidation.isValid &&
    phoneValidation.isValid &&
    addressRequiredValid;

  const canSubmit =
    form.consentAccepted &&
    form.privacyAccepted &&
    submitStatus !== 'submitting' &&
    submitStatus !== 'done';

  const AddressFields = (
    <>
      <InputMasked
        label="CEP"
        value={resolvedAddress.cep}
        onChange={(value) => updateAddress({ cep: value })}
        onBlur={() => handleFieldBlur('address.cep')}
        mask="cep"
        status={cepValidation.status}
        showStatus={Boolean(touched['address.cep'])}
        hint={viaCep.error ?? undefined}
        placeholder="00000-000"
        autoComplete="postal-code"
        aria-required="true"
      />
      <InputMasked
        label="Rua"
        value={resolvedAddress.street}
        onChange={(value) => updateAddress({ street: value })}
        onBlur={() => handleFieldBlur('address.street')}
        status={requiredFieldStatus(resolvedAddress.street, 'address.street', 2)}
        showStatus={Boolean(touched['address.street'])}
        placeholder="Rua ou avenida"
        autoComplete="address-line1"
        aria-required="true"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <InputMasked
          label="Numero"
          value={resolvedAddress.number}
          onChange={(value) => updateAddress({ number: value })}
          onBlur={() => handleFieldBlur('address.number')}
          showStatus={false}
          placeholder="123"
          autoComplete="address-line2"
        />
        <InputMasked
          label="Complemento"
          value={resolvedAddress.complement}
          onChange={(value) => updateAddress({ complement: value })}
          onBlur={() => handleFieldBlur('address.complement')}
          showStatus={false}
          placeholder="Apto, bloco"
          autoComplete="address-line2"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputMasked
          label="Bairro"
          value={resolvedAddress.district}
          onChange={(value) => updateAddress({ district: value })}
          onBlur={() => handleFieldBlur('address.district')}
          status={requiredFieldStatus(resolvedAddress.district, 'address.district', 2)}
          showStatus={Boolean(touched['address.district'])}
          autoComplete="address-level3"
          aria-required="true"
        />
        <InputMasked
          label="Cidade"
          value={resolvedAddress.city}
          onChange={(value) => updateAddress({ city: value })}
          onBlur={() => handleFieldBlur('address.city')}
          status={requiredFieldStatus(resolvedAddress.city, 'address.city', 2)}
          showStatus={Boolean(touched['address.city'])}
          autoComplete="address-level2"
          aria-required="true"
        />
      </div>
      <InputMasked
        label="UF"
        value={resolvedAddress.state}
        onChange={(value) => updateAddress({ state: value })}
        onBlur={() => handleFieldBlur('address.state')}
        status={requiredFieldStatus(resolvedAddress.state, 'address.state', 2)}
        showStatus={Boolean(touched['address.state'])}
        placeholder="SP"
        autoComplete="address-level1"
        aria-required="true"
      />
    </>
  );

  const BankFields = (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputMasked
          label="Banco (codigo)"
          value={form.bank.bankCode}
          onChange={(value) => updateBank({ bankCode: value })}
          onBlur={() => handleFieldBlur('bank.bankCode')}
          showStatus={false}
          placeholder="341"
          autoComplete="off"
        />
        <InputMasked
          label="Banco (nome)"
          value={form.bank.bankName}
          onChange={(value) => updateBank({ bankName: value })}
          onBlur={() => handleFieldBlur('bank.bankName')}
          showStatus={false}
          placeholder="Itau"
          autoComplete="organization"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputMasked
          label="Agencia"
          value={form.bank.agency}
          onChange={(value) => updateBank({ agency: value })}
          onBlur={() => handleFieldBlur('bank.agency')}
          showStatus={false}
          placeholder="1234"
          autoComplete="off"
        />
        <InputMasked
          label="Conta"
          value={form.bank.account}
          onChange={(value) => updateBank({ account: value })}
          onBlur={() => handleFieldBlur('bank.account')}
          showStatus={false}
          placeholder="12345-6"
          autoComplete="off"
        />
      </div>
      <label className="flex flex-col gap-2 text-sm text-[color:var(--gray-700)]">
        <span className="font-medium">Tipo de conta</span>
        <select
          value={form.bank.accountType}
          onChange={(event) =>
            updateBank({
              accountType: event.target.value as BankAccountType | '',
            })
          }
          onBlur={() => handleFieldBlur('bank.accountType')}
          className="w-full rounded-xl border border-[var(--gray-300)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)] shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
          autoComplete="off"
        >
          <option value="">Selecione</option>
          <option value="CC">Conta corrente</option>
          <option value="CP">Conta poupanca</option>
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputMasked
          label="Titular"
          value={form.bank.holderName}
          onChange={(value) => updateBank({ holderName: value })}
          onBlur={() => handleFieldBlur('bank.holderName')}
          showStatus={false}
          placeholder="Nome do titular"
          autoComplete="name"
        />
        <InputMasked
          label="CPF/CNPJ titular"
          value={form.bank.holderDocument}
          onChange={(value) => updateBank({ holderDocument: value })}
          onBlur={() => handleFieldBlur('bank.holderDocument')}
          showStatus={false}
          placeholder="000.000.000-00"
          autoComplete="off"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputMasked
          label="Chave PIX"
          value={form.bank.pixKey}
          onChange={(value) => updateBank({ pixKey: value })}
          onBlur={() => handleFieldBlur('bank.pixKey')}
          showStatus={false}
          placeholder="email, CPF ou aleatoria"
          autoComplete="off"
        />
        <label className="flex flex-col gap-2 text-sm text-[color:var(--gray-700)]">
          <span className="font-medium">Tipo de chave</span>
          <select
            value={form.bank.pixKeyType}
            onChange={(event) =>
              updateBank({
                pixKeyType: event.target.value as PixKeyType | '',
              })
            }
            onBlur={() => handleFieldBlur('bank.pixKeyType')}
            className="w-full rounded-xl border border-[var(--gray-300)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)] shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
            autoComplete="off"
          >
            <option value="">Selecione</option>
            <option value="CPF">CPF</option>
            <option value="CNPJ">CNPJ</option>
            <option value="EMAIL">Email</option>
            <option value="TELEFONE">Telefone</option>
            <option value="ALEATORIA">Aleatoria</option>
            <option value="OUTRO">Outro</option>
          </select>
        </label>
      </div>
    </>
  );

  const mobileFields = [
    {
      key: 'fullName',
      content: (
        <InputMasked
          label="Nome completo"
          value={form.fullName}
          onChange={(value) => updateForm({ fullName: value })}
          onBlur={() => handleFieldBlur('fullName')}
          status={fullNameStatus}
          showStatus={Boolean(touched.fullName)}
          hint={touched.fullName && !fullNameValid ? 'Informe nome e sobrenome.' : undefined}
          placeholder="Maria Silva Santos"
          autoComplete="name"
          aria-required="true"
        />
      ),
    },
    {
      key: 'cpf',
      content: (
        <InputMasked
          label="CPF"
          value={form.cpf}
          onChange={(value) => updateForm({ cpf: value })}
          onBlur={() => handleFieldBlur('cpf')}
          mask="cpf"
          status={cpfStatus}
          showStatus={Boolean(touched.cpf)}
          hint={touched.cpf && cpfStatus === 'invalid' ? 'CPF invalido' : undefined}
          placeholder="000.000.000-00"
          autoComplete="off"
          aria-required="true"
        />
      ),
    },
    {
      key: 'birthDate',
      content: (
        <InputMasked
          label="Data de nascimento"
          type="date"
          value={form.birthDate}
          onChange={(value) => updateForm({ birthDate: value })}
          onBlur={() => handleFieldBlur('birthDate')}
          status={birthDateStatus}
          showStatus={Boolean(touched.birthDate)}
          hint={
            touched.birthDate && !birthDateValid ? 'Voce precisa ter 18 anos ou mais.' : undefined
          }
          autoComplete="bday"
          aria-required="true"
        />
      ),
    },
    {
      key: 'phone',
      content: (
        <InputMasked
          label="Celular (WhatsApp)"
          value={form.phone}
          onChange={(value) => updateForm({ phone: value })}
          onBlur={() => handleFieldBlur('phone')}
          mask="phone"
          status={phoneStatus}
          showStatus={Boolean(touched.phone)}
          hint={touched.phone && phoneStatus === 'invalid' ? 'Telefone invalido' : undefined}
          placeholder="(11) 91234-5678"
          leadingIcon={<MessageCircle className="h-4 w-4" />}
          leadingIconLabel="WhatsApp"
          autoComplete="tel"
          aria-required="true"
        />
      ),
    },
    {
      key: 'email',
      content: (
        <InputMasked
          label="E-mail"
          value={form.email}
          onChange={(value) => updateForm({ email: value })}
          onBlur={() => handleFieldBlur('email')}
          status={emailStatus}
          showStatus={Boolean(touched.email)}
          hint={touched.email && emailStatus === 'invalid' ? 'E-mail invalido' : undefined}
          placeholder="usuario@exemplo.com.br"
          autoComplete="email"
          aria-required="true"
        />
      ),
    },
  ];

  const roleOptions: Array<{ value: ProfileRole; label: string; description: string }> = [
    { value: 'AUTOR', label: 'Autor(a) de letras', description: 'Cria letras e poemas.' },
    {
      value: 'COMPOSITOR',
      label: 'Compositor(a) de melodias',
      description: 'Cria melodias e harmonias.',
    },
    { value: 'INTERPRETE', label: 'Interprete/Artista', description: 'Interpreta e performa.' },
    { value: 'EDITORA', label: 'Editor(a) musical', description: 'Edita e administra obras.' },
    { value: 'PRODUTOR', label: 'Produtor(a)', description: 'Produz e dirige gravacoes.' },
    { value: 'OUTRO', label: 'Outro', description: 'Descreva sua atuacao.' },
  ];

  const roleLabelMap = roleOptions.reduce<Record<ProfileRole, string>>(
    (acc, role) => {
      acc[role.value] = role.label;
      return acc;
    },
    {} as Record<ProfileRole, string>,
  );

  const profileSummary = form.profileRoles.length
    ? form.profileRoles
        .map((role) =>
          role === 'OUTRO' ? `Outro: ${form.profileRoleOther || '-'}` : roleLabelMap[role],
        )
        .join(', ')
    : 'Perfil artistico';

  const handlePrivacyGateAccept = () => {
    localStorage.setItem('privacy_gate_accepted', 'true');
    setPrivacyAcceptedGate(true);
  };
  const showPrivacyGate = privacyGateReady && !privacyAcceptedGate;

  return (
    <>
      {showPrivacyGate && <PrivacyGate onAccept={handlePrivacyGateAccept} />}
      <div className="min-h-screen-dvh bg-soft-gradient px-4 py-10 sm:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-sheen" />
        {showRestorePrompt ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-md)]">
              <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--gray-500)]">
                Retomar cadastro
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[color:var(--gray-900)]">
                Deseja continuar de onde parou?
              </h2>
              <p className="mt-2 text-sm text-[color:var(--gray-500)]">
                Encontramos um rascunho salvo neste dispositivo.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={restoreFromStorage}>Continuar</Button>
                <Button variant="secondary" onClick={discardStoredDraft}>
                  Comecar do zero
                </Button>
              </div>
            </div>
          </div>
        ) : null}
        <div className="page-shell flex justify-center">
          <main className="flex w-full max-w-3xl flex-col gap-6">
            <ProgressBar steps={steps} current={stepIndex} />

            {currentStep === 'perfil' ? (
              <StepLayout
                title="Como voce atua na musica?"
                description="Selecione todas as opcoes que se aplicam ao seu perfil artistico."
                footer={
                  <>
                    <Button onClick={handleNext} disabled={!profileStepValid}>
                      Continuar
                    </Button>
                  </>
                }
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {roleOptions.map((role) => {
                    const selected = form.profileRoles.includes(role.value);
                    return (
                      <button
                        key={role.value}
                        type="button"
                        className={cn(
                          'group min-h-[140px] rounded-3xl border p-5 text-left transition-all sm:min-h-[160px] sm:p-6',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary-soft)]',
                          selected
                            ? 'border-[var(--primary)] bg-[color:var(--primary-soft)] shadow-[var(--shadow-sm)]'
                            : 'border-[var(--border)] bg-[var(--card)] hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow',
                        )}
                        onClick={() => toggleProfileRole(role.value)}
                        aria-pressed={selected}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-[color:var(--gray-900)]">
                            {role.label}
                          </div>
                          <span
                            className={cn(
                              'flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold',
                              selected
                                ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                                : 'border-[var(--border)] bg-[var(--card)] text-[color:var(--gray-500)]',
                            )}
                            aria-hidden="true"
                          >
                            {selected ? '✓' : ''}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[color:var(--gray-500)]">
                          {role.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {form.profileRoles.length === 0 ? (
                  <p className="text-xs text-red-600" role="alert" aria-live="assertive">
                    Selecione pelo menos uma opcao para continuar.
                  </p>
                ) : null}

                {otherRoleSelected ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                    <label className="flex flex-col gap-2 text-sm text-[color:var(--gray-700)]">
                      <span className="font-medium">Descreva sua atuacao</span>
                      <input
                        value={form.profileRoleOther}
                        onChange={(event) => updateForm({ profileRoleOther: event.target.value })}
                        onBlur={() => handleFieldBlur('profileRoleOther')}
                        className="w-full rounded-xl border border-[var(--gray-300)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)] shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
                        placeholder="Ex: arranjador, tecnico de audio..."
                        aria-required={otherRoleSelected}
                        aria-invalid={profileRoleOtherInvalid}
                        aria-describedby={
                          profileRoleOtherInvalid ? profileRoleOtherErrorId : undefined
                        }
                      />
                    </label>
                    {profileRoleOtherInvalid ? (
                      <p
                        id={profileRoleOtherErrorId}
                        className="mt-2 text-xs text-red-600"
                        role="alert"
                        aria-live="assertive"
                      >
                        Informe sua atuacao para a opcao &quot;Outro&quot;.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
                    Tipo de proposta
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[color:var(--gray-900)]">
                    {proposalType === 'NOVO' ? 'Novo cadastro' : 'Migracao'}
                  </p>
                </div>
              </StepLayout>
            ) : null}

            {currentStep === 'dados' ? (
              <StepLayout
                title="Dados pessoais"
                description="Seus dados aparecem para nossa analise. Mantenha tudo atualizado."
                footer={
                  <>
                    <Button variant="secondary" onClick={handleBack}>
                      Voltar
                    </Button>
                    <Button onClick={handleNext} disabled={!dataStepValid}>
                      Continuar
                    </Button>
                  </>
                }
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {mobileFields.map((field, index) => (
                    <div
                      key={field.key}
                      className={cn('sm:block', mobileFieldIndex === index ? 'block' : 'hidden')}
                    >
                      {field.content}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-xs text-[color:var(--gray-500)] sm:hidden">
                  <Button
                    variant="ghost"
                    onClick={() => setMobileFieldIndex((prev) => Math.max(prev - 1, 0))}
                    disabled={mobileFieldIndex === 0}
                    className="px-3 py-1 text-xs"
                  >
                    Campo anterior
                  </Button>
                  <span className="text-[11px] uppercase tracking-[0.2em]">
                    Campo {mobileFieldIndex + 1} de {mobileFields.length}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setMobileFieldIndex((prev) => Math.min(prev + 1, mobileFields.length - 1))
                    }
                    disabled={mobileFieldIndex >= mobileFields.length - 1}
                    className="px-3 py-1 text-xs"
                  >
                    Proximo campo
                  </Button>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:hidden">
                  <details>
                    <summary className="cursor-pointer text-sm font-semibold text-[color:var(--gray-700)]">
                      Endereco completo
                    </summary>
                    <fieldset className="mt-4 grid gap-4">
                      <legend className="sr-only">Endereco completo</legend>
                      {AddressFields}
                    </fieldset>
                  </details>
                </div>

                <div className="hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:grid sm:gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[color:var(--gray-700)]">Endereco</h3>
                    <span className="text-xs text-[color:var(--gray-500)]">
                      {viaCep.loading ? 'Consultando CEP...' : 'ViaCEP ativo'}
                    </span>
                  </div>
                  <fieldset className="grid gap-4">
                    <legend className="sr-only">Endereco</legend>
                    {AddressFields}
                  </fieldset>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:hidden">
                  <details>
                    <summary className="cursor-pointer text-sm font-semibold text-[color:var(--gray-700)]">
                      Dados bancarios (opcional)
                    </summary>
                    <fieldset className="mt-4 grid gap-4">
                      <legend className="sr-only">Dados bancarios</legend>
                      {BankFields}
                    </fieldset>
                  </details>
                </div>

                <div className="hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:grid sm:gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[color:var(--gray-700)]">
                      Dados bancarios (opcional)
                    </h3>
                    <span className="text-xs text-[color:var(--gray-500)]">
                      Preencha apenas se desejar
                    </span>
                  </div>
                  <fieldset className="grid gap-4">
                    <legend className="sr-only">Dados bancarios</legend>
                    {BankFields}
                  </fieldset>
                </div>
              </StepLayout>
            ) : null}

            {currentStep === 'migracao' ? (
              <StepLayout
                title="Migracao"
                description="Informe a entidade anterior e envie a declaracao."
                footer={
                  <>
                    <Button variant="secondary" onClick={handleBack}>
                      Voltar
                    </Button>
                    <Button onClick={handleNext} disabled={!migrationStepValid}>
                      Continuar
                    </Button>
                  </>
                }
              >
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
                    Entidade anterior
                  </p>
                  <div className="mt-3 grid gap-3">
                    <label className="flex flex-col gap-2 text-sm text-[color:var(--gray-700)]">
                      <span className="font-medium">Selecione a entidade</span>
                      <select
                        value={migrationSelectValue}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setMigrationEntitySelection(nextValue);
                          updateForm({ migrationEntity: nextValue });
                        }}
                        onBlur={() => handleFieldBlur('migrationEntity')}
                        className="w-full rounded-xl border border-[var(--gray-300)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)] shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
                      >
                        <option value="">Selecione</option>
                        {MIGRATION_ENTITIES.map((entity) => (
                          <option key={entity} value={entity}>
                            {entity}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[color:var(--gray-500)]">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-[var(--gray-300)] text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
                      checked={form.migrationConfirmed}
                      onChange={(event) => updateForm({ migrationConfirmed: event.target.checked })}
                    />
                    <span>Confirmo que desejo migrar para a SBACEM.</span>
                  </label>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-800">
                    Modelo de declaracao de desfiliação
                  </p>
                  <p className="mt-1 text-xs text-blue-600">
                    Nao tem a declaracao? Baixe nosso modelo em PDF, preencha e assine.
                  </p>
                  <button
                    type="button"
                    onClick={() => downloadDesfilicaoTemplate()}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--card)] px-4 py-2 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-100 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Baixar modelo (PDF)
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <UploadCard
                    title="Declaracao de desfiliação"
                    state={form.documents.desfiliacao}
                    onSelect={(file) => handleUpload('DESFILIACAO', file, 'desfiliacao')}
                  />
                </div>

                {!form.migrationEntity.trim() ? (
                  <p className="text-xs text-red-600">Informe a entidade anterior.</p>
                ) : null}
                {!form.migrationConfirmed ? (
                  <p className="text-xs text-red-600">Confirme que deseja migrar para continuar.</p>
                ) : null}
                {form.documents.desfiliacao.status !== 'uploaded' ? (
                  <p className="text-xs text-red-600">Envie a declaracao de desfiliação.</p>
                ) : null}
              </StepLayout>
            ) : null}

            {currentStep === 'documentos' ? (
              <StepLayout
                title="Documentos"
                description="Envie fotos legiveis. O OCR compara com os dados informados."
                footer={
                  <>
                    <Button variant="secondary" onClick={handleBack}>
                      Voltar
                    </Button>
                    <Button onClick={handleNext} disabled={!documentsStepValid}>
                      Continuar
                    </Button>
                  </>
                }
              >
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
                    Documento principal
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(['RG', 'CNH'] as DocumentChoice[]).map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        className={cn(
                          'rounded-full px-4 py-2 text-sm font-semibold transition',
                          form.documentChoice === choice
                            ? 'bg-[var(--primary)] text-white shadow-[var(--shadow-sm)]'
                            : 'border border-[var(--border)] bg-[var(--card)] text-[color:var(--gray-500)] hover:border-[var(--primary)]',
                        )}
                        onClick={() => updateForm({ documentChoice: choice })}
                      >
                        {toDocTypeLabel(choice)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    Antes de enviar seu documento:
                  </p>
                  <ul className="mt-2 grid gap-1.5 text-sm text-amber-700">
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs">
                        1
                      </span>
                      Use boa iluminacao
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs">
                        2
                      </span>
                      Evite reflexos e sombras
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs">
                        3
                      </span>
                      Mantenha o documento legivel e centralizado
                    </li>
                  </ul>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {form.documentChoice === 'RG' ? (
                    <>
                      <SmartDocumentUpload
                        documentType="RG_FRENTE"
                        documentLabel="RG - Frente"
                        draftId={draftMeta?.draftId}
                        draftToken={draftMeta?.draftToken}
                        ensureDraft={ensureDraftForUploads}
                        onUploadComplete={(documentId, previewUrl, ocrData) => {
                          updateDocument('rgFront', {
                            status: 'uploaded',
                            documentId,
                            fileName: 'RG Frente',
                            previewUrl,
                          });
                          if (previewUrl) previewUrlsRef.current.add(previewUrl);
                          applyOcrToForm(ocrData);
                          if (draftMeta) {
                            void fetchDraftOcr(draftMeta);
                          }
                          if (ocrData) {
                            console.log('OCR data received for RG_FRENTE:', ocrData);
                          }
                        }}
                        onError={(error) => {
                          updateDocument('rgFront', {
                            status: 'error',
                            error,
                          });
                        }}
                        existingDocumentId={form.documents.rgFront.documentId}
                        existingPreviewUrl={form.documents.rgFront.previewUrl}
                      />
                      <SmartDocumentUpload
                        documentType="RG_VERSO"
                        documentLabel="RG - Verso"
                        draftId={draftMeta?.draftId}
                        draftToken={draftMeta?.draftToken}
                        ensureDraft={ensureDraftForUploads}
                        onUploadComplete={(documentId, previewUrl, ocrData) => {
                          updateDocument('rgBack', {
                            status: 'uploaded',
                            documentId,
                            fileName: 'RG Verso',
                            previewUrl,
                          });
                          if (previewUrl) previewUrlsRef.current.add(previewUrl);
                          if (draftMeta) {
                            void fetchDraftOcr(draftMeta);
                          }
                          if (ocrData) {
                            console.log('OCR data received for RG_VERSO:', ocrData);
                          }
                        }}
                        onError={(error) => {
                          updateDocument('rgBack', {
                            status: 'error',
                            error,
                          });
                        }}
                        existingDocumentId={form.documents.rgBack.documentId}
                        existingPreviewUrl={form.documents.rgBack.previewUrl}
                      />
                    </>
                  ) : (
                    <SmartDocumentUpload
                      documentType="CNH"
                      documentLabel="CNH"
                      draftId={draftMeta?.draftId}
                      draftToken={draftMeta?.draftToken}
                      ensureDraft={ensureDraftForUploads}
                      onUploadComplete={(documentId, previewUrl, ocrData) => {
                        updateDocument('cnh', {
                          status: 'uploaded',
                          documentId,
                          fileName: 'CNH',
                          previewUrl,
                        });
                        if (previewUrl) previewUrlsRef.current.add(previewUrl);
                        applyOcrToForm(ocrData);
                        if (draftMeta) {
                          void fetchDraftOcr(draftMeta);
                        }
                        if (ocrData) {
                          console.log('OCR data received for CNH:', ocrData);
                        }
                      }}
                      onError={(error) => {
                        updateDocument('cnh', {
                          status: 'error',
                          error,
                        });
                      }}
                      existingDocumentId={form.documents.cnh.documentId}
                      existingPreviewUrl={form.documents.cnh.previewUrl}
                    />
                  )}
                </div>

                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
                        Comprovante de residencia (opcional)
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--gray-500)]">
                        Adicione somente se solicitado.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowResidenceUpload((prev) => !prev)}
                      className="rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-xs font-semibold text-[color:var(--gray-700)] hover:border-[var(--primary)]"
                    >
                      {showResidenceUpload ? 'Ocultar' : 'Adicionar comprovante'}
                    </button>
                  </div>

                  {showResidenceUpload ? (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <SmartDocumentUpload
                        documentType="COMPROVANTE_RESIDENCIA"
                        documentLabel="Comprovante de Residencia"
                        draftId={draftMeta?.draftId}
                        draftToken={draftMeta?.draftToken}
                        ensureDraft={ensureDraftForUploads}
                        onUploadComplete={(documentId, previewUrl, ocrData) => {
                          updateDocument('residence', {
                            status: 'uploaded',
                            documentId,
                            fileName: 'Comprovante',
                            previewUrl,
                          });
                          if (previewUrl) previewUrlsRef.current.add(previewUrl);
                          if (draftMeta) {
                            void fetchDraftOcr(draftMeta);
                          }
                          if (ocrData) {
                            console.log('OCR data received for COMPROVANTE_RESIDENCIA:', ocrData);
                          }
                        }}
                        onError={(error) => {
                          updateDocument('residence', {
                            status: 'error',
                            error,
                          });
                        }}
                        existingDocumentId={form.documents.residence.documentId}
                        existingPreviewUrl={form.documents.residence.previewUrl}
                      />
                    </div>
                  ) : null}
                </div>

                {!docsMainValid ? (
                  <p className="text-xs text-red-600">
                    Envie o documento principal para continuar.
                  </p>
                ) : null}

                {documentPreview?.state.previewUrl ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
                          Previa OCR
                        </p>
                        <p className="text-sm font-semibold text-[color:var(--gray-900)]">
                          {documentPreview.label}
                        </p>
                      </div>
                      <span className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1 text-xs text-[color:var(--gray-500)]">
                        {previewOcrResult ? 'OCR processado' : 'OCR em processamento'}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                      <div className="relative min-h-[220px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--muted)] aspect-[4/3]">
                        <NextImage
                          src={documentPreview.state.previewUrl}
                          alt="Previa do documento enviado"
                          fill
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          className="object-cover"
                          unoptimized
                        />
                        <div className="absolute inset-x-3 bottom-3 rounded-xl bg-[var(--card)]/95 p-3 text-xs text-[color:var(--gray-500)] shadow">
                          <div className="grid gap-1">
                            {ocrPreviewFields.slice(0, 3).map((field) => (
                              <div key={field.label} className="flex items-center justify-between">
                                <span className="text-[color:var(--gray-500)]">{field.label}</span>
                                <span className="font-semibold text-[color:var(--gray-900)]">
                                  {field.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-3 text-xs text-[color:var(--gray-500)]">
                          <p className="font-semibold text-[color:var(--gray-700)]">
                            Dados extraidos
                          </p>
                          <div className="mt-2 grid gap-2">
                            {ocrPreviewFields.map((field) => (
                              <div key={field.label} className="flex items-center justify-between">
                                <span className="text-[color:var(--gray-500)]">{field.label}</span>
                                <span className="font-semibold text-[color:var(--gray-900)]">
                                  {field.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {ocrConfirmed ? (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                            Dados confirmados pelo candidato.
                          </div>
                        ) : null}
                        {legibilityWarning ? (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            {legibilityWarning}
                          </div>
                        ) : null}
                        {docTypeWarning ? (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            {docTypeWarning}
                          </div>
                        ) : null}
                        {expiredWarning ? (
                          <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                            {expiredWarning}
                          </div>
                        ) : null}
                        <div className="grid gap-2">
                          <Button variant="accent" onClick={() => setOcrConfirmed(true)}>
                            Confirmar dados
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setStepIndex(1);
                              setMobileFieldIndex(0);
                            }}
                          >
                            Editar manualmente
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              clearDocument(
                                documentPreview.key as keyof DraftFormState['documents'],
                              )
                            }
                          >
                            Refazer foto
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {ocrAlert?.divergence && previewOcrResult ? (
                  <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
                    <p className="font-semibold">
                      Divergencia detectada entre OCR e dados informados
                    </p>
                    <p className="mt-1 text-xs">
                      Os dados extraidos do documento nao conferem com os dados digitados na etapa
                      anterior. Verifique e corrija antes de continuar.
                    </p>
                    <div className="mt-2 grid gap-1 text-xs">
                      {ocrAlert.name ? (
                        <div className="flex items-center gap-2">
                          <span className="text-red-600">Nome OCR:</span>
                          <span className="font-semibold">{ocrAlert.name}</span>
                          <span className="text-red-600">vs</span>
                          <span className="font-semibold">{form.fullName || '(vazio)'}</span>
                        </div>
                      ) : null}
                      {ocrAlert.cpf ? (
                        <div className="flex items-center gap-2">
                          <span className="text-red-600">CPF OCR:</span>
                          <span className="font-semibold">{ocrAlert.cpf}</span>
                          <span className="text-red-600">vs</span>
                          <span className="font-semibold">{form.cpf || '(vazio)'}</span>
                        </div>
                      ) : null}
                    </div>
                    <Button
                      variant="secondary"
                      className="mt-3 text-xs"
                      onClick={() => {
                        setStepIndex(steps.findIndex((s) => s.id === 'dados'));
                        setMobileFieldIndex(0);
                      }}
                    >
                      Corrigir dados pessoais
                    </Button>
                  </div>
                ) : null}

                <div
                  className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-5 text-sm text-[color:var(--gray-500)]"
                  role="status"
                  aria-live="polite"
                >
                  OCR status:{' '}
                  {previewOcrResult
                    ? 'Processado com sucesso.'
                    : documentPreview
                      ? 'Imagem enviada. OCR em processamento.'
                      : 'Aguardando envio do documento.'}
                </div>
              </StepLayout>
            ) : null}

            {currentStep === 'redes' ? (
              <SocialConnectionsStep
                form={form}
                updateForm={updateForm}
                proposalId={submission?.proposalId}
                proposalToken={submission?.trackingToken}
                draftMeta={draftMeta}
                ensureDraft={ensureDraftForSocial}
                callbackError={socialCallbackError}
                onNext={handleNext}
                onBack={handleBack}
              />
            ) : null}

            {currentStep === 'revisao' ? (
              <StepLayout
                title="Revisao final"
                description="Confira tudo antes de enviar."
                tone="review"
                footer={
                  <>
                    <Button variant="secondary" onClick={handleBack}>
                      Voltar
                    </Button>
                    <Button variant="accent" onClick={submitProposal} disabled={!canSubmit}>
                      {submitStatus === 'done'
                        ? 'Enviado'
                        : submitStatus === 'submitting'
                          ? 'Enviando...'
                          : 'Enviar para analise'}
                    </Button>
                  </>
                }
              >
                <div className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-sm text-[color:var(--gray-500)]">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
                    <span>Resumo</span>
                    <span>{form.proposalType}</span>
                  </div>
                  <div className="grid gap-2">
                    <span className="text-xs text-[color:var(--gray-500)]">{profileSummary}</span>
                    {form.proposalType === 'MIGRACAO' ? (
                      <span className="text-xs text-[color:var(--gray-500)]">
                        Migracao: {form.migrationEntity || 'Entidade anterior'}
                      </span>
                    ) : null}
                    <span className="font-semibold text-[color:var(--gray-900)]">
                      {form.fullName || 'Nome'}
                    </span>
                    <span>{form.cpf || 'CPF'}</span>
                    <span>{form.email || 'Email'}</span>
                    <span>{form.phone || 'Telefone'}</span>
                    <span>{form.address.cep ? `CEP: ${form.address.cep}` : 'Endereco'}</span>
                    <span>
                      {form.bank.account
                        ? 'Dados bancarios informados'
                        : 'Dados bancarios opcionais'}
                    </span>
                    {form.socialConnections.filter((c) => c.connected).length > 0 ? (
                      <span>
                        Redes conectadas:{' '}
                        {form.socialConnections
                          .filter((c) => c.connected)
                          .map((c) => c.provider)
                          .join(', ')}
                      </span>
                    ) : (
                      <span className="text-[color:var(--gray-500)]">
                        Nenhuma rede social conectada
                      </span>
                    )}
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
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-sm text-[color:var(--gray-500)]">
                    OCR ainda nao processado. Assim que concluido, alertas aparecem aqui.
                  </div>
                )}

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-sm text-[color:var(--gray-500)]">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-[var(--gray-300)] text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
                      checked={form.consentAccepted}
                      onChange={(event) => handleConsentChange(event.target.checked)}
                    />
                    <span>Declaro que as informacoes fornecidas sao verdadeiras.</span>
                  </label>
                  <label className="mt-3 flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-[var(--gray-300)] text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
                      checked={form.privacyAccepted}
                      onChange={(event) => handlePrivacyChange(event.target.checked)}
                    />
                    <span>
                      Li e aceito a{' '}
                      <Link
                        href="/privacidade"
                        className="font-semibold text-[color:var(--primary)] underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Politica de Privacidade
                      </Link>
                      .
                    </span>
                  </label>
                  {!form.consentAccepted ? (
                    <p className="mt-2 text-xs text-amber-600">
                      Aceite o consentimento para enviar a proposta.
                    </p>
                  ) : null}
                  {!form.privacyAccepted ? (
                    <p className="mt-2 text-xs text-amber-600" role="alert" aria-live="assertive">
                      Aceite a politica de privacidade para enviar a proposta.
                    </p>
                  ) : null}
                </div>

                {submitStatus === 'done' && submission ? (
                  <div
                    className="rounded-3xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-900"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                      Proposta enviada com sucesso
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">
                          Protocolo
                        </p>
                        <p className="mt-1 text-3xl font-bold text-emerald-900">
                          {submission.protocol}
                        </p>
                      </div>
                      <Button
                        variant="accent"
                        onClick={() => {
                          if (typeof window === 'undefined') return;
                          window.location.assign(
                            buildTrackingUrl(submission.protocol, submission.trackingToken),
                          );
                        }}
                      >
                        Acompanhar
                      </Button>
                    </div>
                    <p className="mt-3 text-sm text-emerald-800">
                      Guarde este protocolo. Tambem enviamos o link de acompanhamento por email.
                    </p>
                  </div>
                ) : null}

                {submitStatus === 'error' ? (
                  <div
                    className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700"
                    role="alert"
                    aria-live="assertive"
                  >
                    {submitError ?? 'Falha ao enviar. Revise os dados e tente novamente.'}
                  </div>
                ) : null}
              </StepLayout>
            ) : null}
          </main>
        </div>

        {/* Floating autosave indicator - visible on mobile where sidebar is hidden */}
      </div>
    </>
  );
}

// Componente para etapa de Redes Sociais
type SocialConnectionsStepProps = {
  form: DraftFormState;
  updateForm: (patch: Partial<DraftFormState>) => void;
  proposalId?: string;
  proposalToken?: string;
  draftMeta?: DraftMeta | null;
  ensureDraft: () => Promise<DraftMeta>;
  callbackError?: string | null;
  onNext: () => void;
  onBack: () => void;
};

const SocialConnectionsStep = ({
  form,
  updateForm,
  proposalId,
  proposalToken,
  draftMeta,
  ensureDraft,
  callbackError,
  onNext,
  onBack,
}: SocialConnectionsStepProps) => {
  const [connecting, setConnecting] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socialProviders: Array<{
    id: SocialProvider;
    name: string;
    description: string;
    icon: string;
    color: string;
  }> = [
    {
      id: 'SPOTIFY',
      name: 'Spotify',
      description: 'Compartilhe seu perfil e top tracks',
      icon: '🎵',
      color: 'bg-green-500',
    },
    {
      id: 'YOUTUBE',
      name: 'YouTube',
      description: 'Conecte seu canal e estatísticas',
      icon: '📺',
      color: 'bg-red-500',
    },
    {
      id: 'INSTAGRAM',
      name: 'Instagram',
      description: 'Vincule seu perfil profissional',
      icon: '📷',
      color: 'bg-pink-500',
    },
    {
      id: 'FACEBOOK',
      name: 'Facebook',
      description: 'Conecte sua página de artista',
      icon: '👥',
      color: 'bg-blue-500',
    },
  ];

  const isConnected = (provider: SocialProvider) => {
    return form.socialConnections.some((conn) => conn.provider === provider && conn.connected);
  };

  const getConnection = (provider: SocialProvider) => {
    return form.socialConnections.find((conn) => conn.provider === provider);
  };

  const handleConnect = async (provider: SocialProvider) => {
    setConnecting(provider);
    setError(null);

    try {
      const url = new URL(
        buildApiUrl('/public/social/authorize'),
        typeof window !== 'undefined' ? window.location.origin : undefined,
      );
      url.searchParams.set('provider', provider.toLowerCase());

      if (proposalId && proposalToken) {
        url.searchParams.set('proposalId', proposalId);
        url.searchParams.set('token', proposalToken);
      } else {
        const meta = draftMeta ?? (await ensureDraft());
        url.searchParams.set('draftId', meta.draftId);
        url.searchParams.set('draftToken', meta.draftToken);
      }

      window.location.href = url.toString();
    } catch (err) {
      setConnecting(null);
      setError(err instanceof Error ? err.message : 'Nao foi possivel iniciar a conexao.');
    }
  };

  const handleDisconnect = async (provider: SocialProvider) => {
    setError(null);
    try {
      if (proposalId && proposalToken) {
        await apiFetch('/public/social/disconnect', {
          method: 'POST',
          body: {
            provider: provider.toLowerCase(),
            proposalId,
            token: proposalToken,
          },
        });
      } else if (draftMeta) {
        await apiFetch('/public/social/disconnect', {
          method: 'POST',
          body: {
            provider: provider.toLowerCase(),
            draftId: draftMeta.draftId,
            draftToken: draftMeta.draftToken,
          },
        });
      }

      updateForm({
        socialConnections: form.socialConnections.filter((conn) => conn.provider !== provider),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel desconectar a rede social.');
    }
  };

  const connectedCount = form.socialConnections.filter((c) => c.connected).length;

  return (
    <StepLayout
      title="Conecte suas redes sociais"
      description="Opcional: conecte seus perfis profissionais agora. Eles ficam vinculados ao seu cadastro quando voce enviar."
      footer={
        <>
          <Button variant="secondary" onClick={onBack}>
            Voltar
          </Button>
          <Button onClick={onNext}>Continuar</Button>
        </>
      }
    >
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
          Perfis conectados
        </p>
        <p className="mt-1 text-sm text-[color:var(--gray-500)]">
          {connectedCount === 0
            ? 'Nenhuma rede conectada ainda.'
            : `${connectedCount} ${connectedCount === 1 ? 'rede conectada' : 'redes conectadas'}`}
        </p>
        <p className="mt-2 text-xs text-[color:var(--gray-500)]">
          Pode conectar agora no rascunho ou depois no acompanhamento. Suas credenciais ficam
          seguras.
        </p>
      </div>

      {callbackError ? (
        <div
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
          aria-live="assertive"
        >
          {callbackError}
        </div>
      ) : null}

      {error ? (
        <div
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-4">
        {socialProviders.map((provider) => {
          const connected = isConnected(provider.id);
          const connection = getConnection(provider.id);

          return (
            <div
              key={provider.id}
              className={cn(
                'rounded-2xl border p-4 transition-all',
                connected
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : 'border-[var(--border)] bg-[var(--card)] hover:border-[color:var(--primary-light)]',
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full text-lg',
                      provider.color,
                      'text-white',
                    )}
                  >
                    {provider.icon}
                  </span>
                  <div>
                    <h4 className="font-semibold text-[color:var(--gray-900)]">{provider.name}</h4>
                    <p className="text-xs text-[color:var(--gray-500)]">{provider.description}</p>
                    {connected && connection?.connectedAt ? (
                      <p className="mt-1 text-xs text-emerald-600">
                        Conectado em {new Date(connection.connectedAt).toLocaleDateString('pt-BR')}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div>
                  {connected ? (
                    <button
                      type="button"
                      onClick={() => handleDisconnect(provider.id)}
                      className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[color:var(--gray-500)] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                    >
                      Desconectar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConnect(provider.id)}
                      disabled={connecting === provider.id}
                      className={cn(
                        'rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
                        connecting === provider.id
                          ? 'bg-[var(--muted)] text-[color:var(--gray-500)] cursor-wait'
                          : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]',
                      )}
                    >
                      {connecting === provider.id ? 'Conectando...' : 'Conectar'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4 text-xs text-[color:var(--gray-500)]">
        <p className="font-semibold text-[color:var(--gray-700)]">Por que conectar?</p>
        <ul className="mt-2 grid gap-1">
          <li>• Enriquece seu perfil artístico na SBACEM</li>
          <li>• Ajuda na validação da sua atuação profissional</li>
          <li>• Pode agilizar a análise da sua proposta</li>
          <li>• Seus dados são protegidos e você pode desconectar a qualquer momento</li>
        </ul>
      </div>
    </StepLayout>
  );
};

// Função para gerar e baixar template de desfiliação
const downloadDesfilicaoTemplate = () => {
  const link = document.createElement('a');
  link.href = '/templates/declaracao-desfilicao.pdf';
  link.download = 'declaracao-desfilicao.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const UploadCard = ({
  title,
  state,
  onSelect,
  description,
}: {
  title: string;
  state: UploadState;
  onSelect: (file: File) => void;
  description?: string;
}) => {
  const [showGuidelines, setShowGuidelines] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTakePhoto = () => {
    setShowGuidelines(true);
  };

  const handleProceedToCamera = () => {
    setShowGuidelines(false);
    fileInputRef.current?.click();
  };

  return (
    <>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-[color:var(--gray-700)]">{title}</h4>
            <p className="text-xs text-[color:var(--gray-500)]">
              {state.status === 'uploaded'
                ? `Enviado: ${state.fileName ?? 'ok'}`
                : 'JPEG, PNG ou PDF'}
            </p>
            {description ? (
              <p className="mt-1 text-xs text-[color:var(--gray-500)]">{description}</p>
            ) : null}
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
                    : 'bg-[var(--muted)] text-[color:var(--gray-500)]',
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
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-dashed border-[var(--gray-300)] bg-[var(--muted)] px-4 py-6 text-center text-sm text-[color:var(--gray-500)]">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
            Como enviar
          </span>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleTakePhoto}
              className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[var(--gray-300)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[color:var(--gray-700)] hover:border-[var(--primary)] hover:bg-[color:var(--primary-soft)]"
            >
              Tirar foto
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onSelect(file);
              }}
            />
            <label className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[var(--gray-300)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[color:var(--gray-700)] hover:border-[var(--primary)] hover:bg-[color:var(--primary-soft)]">
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onSelect(file);
                }}
              />
              Enviar arquivo
            </label>
          </div>
        </div>
        {state.error ? <p className="mt-2 text-xs text-red-600">{state.error}</p> : null}
      </div>

      {showGuidelines && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card)] p-6 shadow-[var(--shadow-md)]">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[color:var(--gray-900)]">
                Prepare-se para capturar
              </h3>
              <p className="mt-1 text-sm text-[color:var(--gray-500)]">
                Siga essas dicas para garantir uma foto de qualidade
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--primary-soft)]">
                  <span className="text-sm font-bold text-[color:var(--primary)]">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-[color:var(--gray-900)]">Use boa iluminação</h4>
                  <p className="text-sm text-[color:var(--gray-500)]">
                    Fotografe em local bem iluminado, preferencialmente com luz natural
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--primary-soft)]">
                  <span className="text-sm font-bold text-[color:var(--primary)]">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-[color:var(--gray-900)]">
                    Evite reflexos e sombras
                  </h4>
                  <p className="text-sm text-[color:var(--gray-500)]">
                    Não use flash e evite superfícies que reflitam luz
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--primary-soft)]">
                  <span className="text-sm font-bold text-[color:var(--primary)]">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-[color:var(--gray-900)]">
                    Mantenha o documento legível
                  </h4>
                  <p className="text-sm text-[color:var(--gray-500)]">
                    Certifique-se de que todos os textos estão nítidos e centralizados
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => setShowGuidelines(false)}
                className="min-h-[44px] rounded-xl border border-[var(--gray-300)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[color:var(--gray-700)] hover:bg-[var(--muted)]"
              >
                Cancelar
              </button>
              <button
                onClick={handleProceedToCamera}
                className="min-h-[44px] rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)]"
              >
                Entendi, tirar foto
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
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

type ProfileRole = 'AUTOR' | 'COMPOSITOR' | 'INTERPRETE' | 'EDITORA' | 'PRODUTOR' | 'OUTRO';
type ProposalType = 'NOVO' | 'MIGRACAO';
type DocumentChoice = 'RG' | 'CNH';
type DocumentType = 'RG_FRENTE' | 'RG_VERSO' | 'CNH' | 'DESFILIACAO' | 'COMPROVANTE_RESIDENCIA';
type BankAccountType = 'CC' | 'CP';
type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA' | 'OUTRO';

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
  { id: 'revisao', title: 'Revisao', subtitle: 'Confirme tudo' },
];

const migrationSteps = [
  { id: 'perfil', title: 'Perfil', subtitle: 'Quem esta solicitando' },
  { id: 'dados', title: 'Dados', subtitle: 'Informacoes pessoais' },
  { id: 'migracao', title: 'Migracao', subtitle: 'Entidade anterior' },
  { id: 'documentos', title: 'Docs', subtitle: 'Upload e OCR' },
  { id: 'revisao', title: 'Revisao', subtitle: 'Confirme tudo' },
];

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

export default function CadastroPage() {
  const initialRestore = useMemo(() => readStoredDraft(), []);
  const [hydrated, setHydrated] = useState(!initialRestore);
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<DraftFormState>(defaultForm);
  const [draftMeta, setDraftMeta] = useState<DraftMeta | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [submission, setSubmission] = useState<SubmissionState | null>(null);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>(
    'idle',
  );
  const [tracking, setTracking] = useState<TrackingResponse | null>(null);
  const [draftOcrResults, setDraftOcrResults] = useState<DraftOcrResult[]>([]);
  const [restoreDraft, setRestoreDraft] = useState<{
    form: DraftFormState;
    draftMeta?: DraftMeta | null;
    stepIndex?: number;
  } | null>(initialRestore);
  const [showRestorePrompt, setShowRestorePrompt] = useState(Boolean(initialRestore));
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [mobileFieldIndex, setMobileFieldIndex] = useState(0);
  const [ocrConfirmed, setOcrConfirmed] = useState(false);

  const dirtyRef = useRef(false);
  const lastPayloadRef = useRef('');
  const previewUrlsRef = useRef<Set<string>>(new Set());

  const steps = useMemo(
    () => (form.proposalType === 'MIGRACAO' ? migrationSteps : baseSteps),
    [form.proposalType],
  );
  const currentStep = steps[stepIndex]?.id ?? steps[0]?.id;

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

  const updateForm = useCallback(
    (patch: Partial<DraftFormState>) => {
      setForm((prev) => ({ ...prev, ...patch }));
      dirtyRef.current = true;
    },
    [setForm],
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
        const nextSteps = parsedForm.proposalType === 'MIGRACAO' ? migrationSteps : baseSteps;
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
      const payload = buildPayload();
      const meta = await ensureDraft(payload);
      const isImage = file.type.startsWith('image/');
      const dimensions = isImage ? await loadImageSize(file) : null;
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

      updateDocument(key, {
        status: 'uploaded',
        documentId: presign.documentId,
      });

      if (['RG_FRENTE', 'CNH', 'COMPROVANTE_RESIDENCIA'].includes(docType)) {
        await apiFetch(`/public/drafts/${meta.draftId}/ocr`, {
          method: 'POST',
          headers: { 'x-draft-token': meta.draftToken },
        });
        pollDraftOcr(meta, presign.documentId);
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
      if (typeof window !== 'undefined') {
        window.location.assign(
          `/acompanhar?protocolo=${encodeURIComponent(response.protocol)}&token=${encodeURIComponent(
            response.trackingToken,
          )}`,
        );
      }
    } catch {
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

  const handleProposalTypeSelect = (type: ProposalType) => {
    updateForm({ proposalType: type });
    const nextSteps = type === 'MIGRACAO' ? migrationSteps : baseSteps;
    const nextIndex = Math.min(stepIndex, nextSteps.length - 1);
    setStepIndex(nextIndex);
    if (nextSteps[nextIndex]?.id === 'dados') {
      setMobileFieldIndex(0);
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

  const canSubmit = form.consentAccepted && form.privacyAccepted && submitStatus !== 'submitting';

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
      />
      <InputMasked
        label="Rua"
        value={resolvedAddress.street}
        onChange={(value) => updateAddress({ street: value })}
        onBlur={() => handleFieldBlur('address.street')}
        status={requiredFieldStatus(resolvedAddress.street, 'address.street', 2)}
        showStatus={Boolean(touched['address.street'])}
        placeholder="Rua ou avenida"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <InputMasked
          label="Numero"
          value={resolvedAddress.number}
          onChange={(value) => updateAddress({ number: value })}
          onBlur={() => handleFieldBlur('address.number')}
          showStatus={false}
          placeholder="123"
        />
        <InputMasked
          label="Complemento"
          value={resolvedAddress.complement}
          onChange={(value) => updateAddress({ complement: value })}
          onBlur={() => handleFieldBlur('address.complement')}
          showStatus={false}
          placeholder="Apto, bloco"
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
        />
        <InputMasked
          label="Cidade"
          value={resolvedAddress.city}
          onChange={(value) => updateAddress({ city: value })}
          onBlur={() => handleFieldBlur('address.city')}
          status={requiredFieldStatus(resolvedAddress.city, 'address.city', 2)}
          showStatus={Boolean(touched['address.city'])}
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
        />
        <InputMasked
          label="Banco (nome)"
          value={form.bank.bankName}
          onChange={(value) => updateBank({ bankName: value })}
          onBlur={() => handleFieldBlur('bank.bankName')}
          showStatus={false}
          placeholder="Itau"
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
        />
        <InputMasked
          label="Conta"
          value={form.bank.account}
          onChange={(value) => updateBank({ account: value })}
          onBlur={() => handleFieldBlur('bank.account')}
          showStatus={false}
          placeholder="12345-6"
        />
      </div>
      <label className="flex flex-col gap-2 text-sm text-zinc-700">
        <span className="font-medium">Tipo de conta</span>
        <select
          value={form.bank.accountType}
          onChange={(event) =>
            updateBank({
              accountType: event.target.value as BankAccountType | '',
            })
          }
          onBlur={() => handleFieldBlur('bank.accountType')}
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm"
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
        />
        <InputMasked
          label="CPF/CNPJ titular"
          value={form.bank.holderDocument}
          onChange={(value) => updateBank({ holderDocument: value })}
          onBlur={() => handleFieldBlur('bank.holderDocument')}
          showStatus={false}
          placeholder="000.000.000-00"
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
        />
        <label className="flex flex-col gap-2 text-sm text-zinc-700">
          <span className="font-medium">Tipo de chave</span>
          <select
            value={form.bank.pixKeyType}
            onChange={(event) =>
              updateBank({
                pixKeyType: event.target.value as PixKeyType | '',
              })
            }
            onBlur={() => handleFieldBlur('bank.pixKeyType')}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm"
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

  return (
    <div className="min-h-screen bg-soft-gradient px-4 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-sheen" />
      {showRestorePrompt ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Retomar cadastro</p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">
              Deseja continuar de onde parou?
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
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
                      ? 'Salvo agora mesmo'
                      : syncStatus === 'error'
                        ? 'Erro'
                        : 'Aguardando'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                <span>Ultimo salvamento</span>
                <span className="font-semibold">
                  {lastSavedAt
                    ? new Date(lastSavedAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
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
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-200',
                        selected
                          ? 'border-[#ff6b35] bg-orange-50 shadow-lg shadow-orange-100/70'
                          : 'border-zinc-200 bg-white hover:-translate-y-0.5 hover:border-[#ff6b35]/60 hover:shadow',
                      )}
                      onClick={() => toggleProfileRole(role.value)}
                      aria-pressed={selected}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-zinc-900">{role.label}</div>
                        <span
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold',
                            selected
                              ? 'border-[#ff6b35] bg-[#ff6b35] text-white'
                              : 'border-zinc-200 bg-white text-zinc-400',
                          )}
                          aria-hidden="true"
                        >
                          {selected ? '✓' : ''}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">{role.description}</p>
                    </button>
                  );
                })}
              </div>

              {form.profileRoles.length === 0 ? (
                <p className="text-xs text-red-600">
                  Selecione pelo menos uma opcao para continuar.
                </p>
              ) : null}

              {otherRoleSelected ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <label className="flex flex-col gap-2 text-sm text-zinc-700">
                    <span className="font-medium">Descreva sua atuacao</span>
                    <input
                      value={form.profileRoleOther}
                      onChange={(event) => updateForm({ profileRoleOther: event.target.value })}
                      onBlur={() => handleFieldBlur('profileRoleOther')}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
                      placeholder="Ex: arranjador, tecnico de audio..."
                    />
                  </label>
                  {otherRoleSelected && !form.profileRoleOther.trim() ? (
                    <p className="mt-2 text-xs text-red-600">
                      Informe sua atuacao para a opcao &quot;Outro&quot;.
                    </p>
                  ) : null}
                </div>
              ) : null}

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
                        'rounded-full px-4 py-2 text-sm font-semibold transition',
                        form.proposalType === type
                          ? 'bg-[#ff6b35] text-white shadow shadow-orange-200/70'
                          : 'border border-zinc-200 bg-white text-zinc-600 hover:border-[#ff6b35]/60',
                      )}
                      onClick={() => handleProposalTypeSelect(type)}
                    >
                      {type === 'NOVO' ? 'Novo cadastro' : 'Migracao'}
                    </button>
                  ))}
                </div>
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

              <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-500 sm:hidden">
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

              <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:hidden">
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-zinc-700">
                    Dados bancarios (opcional)
                  </summary>
                  <div className="mt-4 grid gap-4">{BankFields}</div>
                </details>
              </div>

              <div className="hidden rounded-2xl border border-zinc-200 bg-white p-4 sm:grid sm:gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-700">
                    Dados bancarios (opcional)
                  </h3>
                  <span className="text-xs text-zinc-500">Preencha apenas se desejar</span>
                </div>
                {BankFields}
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
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Entidade anterior
                </p>
                {(() => {
                  const preset = ['Abramus', 'UBC'];
                  const isCustom =
                    form.migrationEntity.length > 0 && !preset.includes(form.migrationEntity);
                  return (
                    <>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {['Abramus', 'UBC', 'Outras'].map((entity) => (
                          <button
                            key={entity}
                            type="button"
                            className={cn(
                              'rounded-full px-4 py-2 text-sm font-semibold transition',
                              entity === 'Outras'
                                ? isCustom
                                  ? 'bg-[#ff6b35] text-white shadow shadow-orange-200/70'
                                  : 'border border-zinc-200 bg-white text-zinc-600 hover:border-[#ff6b35]/60'
                                : form.migrationEntity === entity
                                  ? 'bg-[#ff6b35] text-white shadow shadow-orange-200/70'
                                  : 'border border-zinc-200 bg-white text-zinc-600 hover:border-[#ff6b35]/60',
                            )}
                            onClick={() =>
                              updateForm({ migrationEntity: entity === 'Outras' ? '' : entity })
                            }
                          >
                            {entity}
                          </button>
                        ))}
                      </div>
                      {isCustom || form.migrationEntity === '' ? (
                        <input
                          value={form.migrationEntity}
                          onChange={(event) => updateForm({ migrationEntity: event.target.value })}
                          onBlur={() => handleFieldBlur('migrationEntity')}
                          className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                          placeholder="Informe a entidade"
                        />
                      ) : null}
                    </>
                  );
                })()}
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-zinc-300 text-orange-500 focus:ring-orange-200"
                    checked={form.migrationConfirmed}
                    onChange={(event) => updateForm({ migrationConfirmed: event.target.checked })}
                  />
                  <span>Confirmo que desejo migrar para a SBACEM.</span>
                </label>
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
                        'rounded-full px-4 py-2 text-sm font-semibold transition',
                        form.documentChoice === choice
                          ? 'bg-[#ff6b35] text-white shadow shadow-orange-200/70'
                          : 'border border-zinc-200 bg-white text-zinc-600 hover:border-[#ff6b35]/60',
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
                <UploadCard
                  title="Comprovante de residencia (opcional)"
                  state={form.documents.residence}
                  onSelect={(file) => handleUpload('COMPROVANTE_RESIDENCIA', file, 'residence')}
                />
              </div>

              {!docsMainValid ? (
                <p className="text-xs text-red-600">Envie o documento principal para continuar.</p>
              ) : null}

              {documentPreview?.state.previewUrl ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Previa OCR</p>
                      <p className="text-sm font-semibold text-zinc-900">{documentPreview.label}</p>
                    </div>
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
                      {previewOcrResult ? 'OCR processado' : 'OCR em processamento'}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                      <img
                        src={documentPreview.state.previewUrl}
                        alt="Previa do documento enviado"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-x-3 bottom-3 rounded-xl bg-white/90 p-3 text-xs text-zinc-600 shadow">
                        <div className="grid gap-1">
                          {ocrPreviewFields.slice(0, 3).map((field) => (
                            <div key={field.label} className="flex items-center justify-between">
                              <span className="text-zinc-500">{field.label}</span>
                              <span className="font-semibold text-zinc-900">{field.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
                        <p className="font-semibold text-zinc-700">Dados extraidos</p>
                        <div className="mt-2 grid gap-2">
                          {ocrPreviewFields.map((field) => (
                            <div key={field.label} className="flex items-center justify-between">
                              <span className="text-zinc-500">{field.label}</span>
                              <span className="font-semibold text-zinc-900">{field.value}</span>
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
                            clearDocument(documentPreview.key as keyof DraftFormState['documents'])
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

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600">
                OCR status:{' '}
                {previewOcrResult
                  ? 'Processado com sucesso.'
                  : documentPreview
                    ? 'Imagem enviada. OCR em processamento.'
                    : 'Aguardando envio do documento.'}
              </div>
            </StepLayout>
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
                    {submitStatus === 'submitting' ? 'Enviando...' : 'Enviar para analise'}
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
                  <span className="text-xs text-zinc-500">{profileSummary}</span>
                  {form.proposalType === 'MIGRACAO' ? (
                    <span className="text-xs text-zinc-500">
                      Migracao: {form.migrationEntity || 'Entidade anterior'}
                    </span>
                  ) : null}
                  <span className="font-semibold text-zinc-900">{form.fullName || 'Nome'}</span>
                  <span>{form.cpf || 'CPF'}</span>
                  <span>{form.email || 'Email'}</span>
                  <span>{form.phone || 'Telefone'}</span>
                  <span>{form.address.cep ? `CEP: ${form.address.cep}` : 'Endereco'}</span>
                  <span>
                    {form.bank.account ? 'Dados bancarios informados' : 'Dados bancarios opcionais'}
                  </span>
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

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-zinc-300 text-orange-500 focus:ring-orange-200"
                    checked={form.consentAccepted}
                    onChange={(event) => handleConsentChange(event.target.checked)}
                  />
                  <span>Declaro que as informacoes fornecidas sao verdadeiras.</span>
                </label>
                <label className="mt-3 flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-zinc-300 text-orange-500 focus:ring-orange-200"
                    checked={form.privacyAccepted}
                    onChange={(event) => handlePrivacyChange(event.target.checked)}
                  />
                  <span>
                    Li e aceito a{' '}
                    <Link
                      href="/privacidade"
                      className="font-semibold text-orange-600 underline"
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
                  <p className="mt-2 text-xs text-amber-600">
                    Aceite a politica de privacidade para enviar a proposta.
                  </p>
                ) : null}
              </div>

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

      {/* Floating autosave indicator - visible on mobile where sidebar is hidden */}
      {hydrated && !showRestorePrompt ? (
        <div className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 lg:hidden">
          <div
            className={cn(
              'flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium shadow-lg backdrop-blur transition-all',
              syncStatus === 'saving'
                ? 'border-amber-200 bg-amber-50/90 text-amber-700'
                : syncStatus === 'saved'
                  ? 'border-emerald-200 bg-emerald-50/90 text-emerald-700'
                  : syncStatus === 'error'
                    ? 'border-red-200 bg-red-50/90 text-red-700'
                    : 'border-zinc-200 bg-white/90 text-zinc-500',
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                syncStatus === 'saving'
                  ? 'animate-pulse bg-amber-500'
                  : syncStatus === 'saved'
                    ? 'bg-emerald-500'
                    : syncStatus === 'error'
                      ? 'bg-red-500'
                      : 'bg-zinc-400',
              )}
            />
            {syncStatus === 'saving'
              ? 'Salvando...'
              : syncStatus === 'saved'
                ? `Salvo ${
                    lastSavedAt
                      ? new Date(lastSavedAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'agora'
                  }`
                : syncStatus === 'error'
                  ? 'Erro ao salvar'
                  : 'Autosave ativo'}
          </div>
        </div>
      ) : null}
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
      <div className="mt-4 flex flex-col gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Como enviar
        </span>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:border-orange-200 hover:bg-orange-50">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onSelect(file);
              }}
            />
            Tirar foto
          </label>
          <label className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:border-orange-200 hover:bg-orange-50">
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
  );
};

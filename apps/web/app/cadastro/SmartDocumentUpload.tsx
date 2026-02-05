'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Camera, FileSearch, Upload } from 'lucide-react';
import dynamic from 'next/dynamic';
import { CaptureGuidelines } from './CaptureGuidelines';
import { ImageQualityAlert } from './ImageQualityAlert';
import type { OcrPreviewData } from './OcrPreview';
import {
  validateImageBasics,
  validateImageComplete,
  shouldWarnUser,
  type ImageValidationResult,
} from '../lib/imageValidation';
import { apiFetch, apiUpload } from '../lib/api';

const OcrPreview = dynamic(() => import('./OcrPreview').then((mod) => mod.OcrPreview), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[color:var(--gray-500)]">
      Carregando preview do OCR...
    </div>
  ),
});

type UploadFlow =
  | 'idle'
  | 'show-guidelines'
  | 'validate-quality'
  | 'quality-alert'
  | 'processing-ocr'
  | 'show-preview';

interface SmartDocumentUploadProps {
  documentType: 'RG_FRENTE' | 'RG_VERSO' | 'CNH' | 'COMPROVANTE_RESIDENCIA';
  documentLabel: string;
  draftId?: string;
  draftToken?: string;
  ensureDraft?: () => Promise<{ draftId: string; draftToken: string }>;
  onUploadComplete: (
    documentId: string,
    previewUrl: string,
    ocrData?: Record<string, string>,
  ) => void;
  onError: (error: string) => void;
  existingDocumentId?: string;
  existingPreviewUrl?: string;
}

type DraftOcrResult = {
  id: string;
  documentFileId?: string | null;
  structuredData: Record<string, unknown>;
  score?: number | null;
  heuristics?: Record<string, unknown> | null;
};

type UploadPresignResponse = {
  documentId: string;
  storageKey: string;
  uploadUrl: string;
  expiresIn: number;
  method: 'PUT';
  headers: Record<string, string>;
};

export function SmartDocumentUpload({
  documentType,
  documentLabel,
  draftId,
  draftToken,
  ensureDraft,
  onUploadComplete,
  onError,
  existingDocumentId,
  existingPreviewUrl,
}: SmartDocumentUploadProps) {
  const [flow, setFlow] = useState<UploadFlow>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [ocrPreviewData, setOcrPreviewData] = useState<OcrPreviewData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [validationMeta, setValidationMeta] = useState<ImageValidationResult['metadata'] | null>(
    null,
  );
  const [uploadedDraftInfo, setUploadedDraftInfo] = useState<{
    draftId: string;
    draftToken: string;
    documentId: string;
  } | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCaptureClick = () => {
    // Mostrar orientações antes de capturar
    setFlow('show-guidelines');
  };

  const handleGuidelinesProceed = () => {
    setFlow('idle');
    // Acionar input file com capture
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleGuidelinesCancel = () => {
    setFlow('idle');
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFlow('validate-quality');

    // Validar qualidade da imagem
    try {
      const validation = await validateImageComplete(file, { checkQuality: true });
      setValidationMeta(validation.metadata);

      if (shouldWarnUser(validation)) {
        setValidationWarnings(validation.warnings);
        setValidationErrors(validation.errors);
        setFlow('quality-alert');
      } else {
        // Qualidade OK, processar diretamente
        await processUpload(file, validation.metadata);
      }
    } catch (error) {
      console.error('Erro ao validar imagem:', error);
      onError('Erro ao validar imagem. Tente novamente.');
      setFlow('idle');
    }

    // Limpar input para permitir selecionar o mesmo arquivo novamente
    event.target.value = '';
  };

  const handleQualityAlertProceed = async () => {
    if (!selectedFile) return;
    setFlow('processing-ocr');
    await processUpload(selectedFile, validationMeta ?? undefined);
  };

  const handleQualityAlertCancel = () => {
    setSelectedFile(null);
    setValidationWarnings([]);
    setValidationErrors([]);
    setFlow('idle');
  };

  const processUpload = async (file: File, metadata?: ImageValidationResult['metadata']) => {
    setIsProcessing(true);
    setFlow('processing-ocr');

    try {
      let resolvedDraftId = draftId ?? '';
      let resolvedDraftToken = draftToken ?? '';
      if ((!resolvedDraftId || !resolvedDraftToken) && ensureDraft) {
        const meta = await ensureDraft();
        resolvedDraftId = meta.draftId;
        resolvedDraftToken = meta.draftToken;
      }
      if (!resolvedDraftId || !resolvedDraftToken) {
        throw new Error('Draft nao inicializado');
      }

      const useDirectUpload =
        typeof window !== 'undefined' && window.location.hostname.endsWith('.devtunnels.ms');

      let resolvedMeta = metadata ?? null;
      if (file.type.startsWith('image/') && (!resolvedMeta?.width || !resolvedMeta?.height)) {
        const basic = await validateImageBasics(file);
        resolvedMeta = basic.metadata;
      }

      let documentId: string;
      if (useDirectUpload) {
        const form = new FormData();
        form.append('file', file);
        form.append('draftId', resolvedDraftId);
        form.append('docType', documentType);
        if (resolvedMeta?.width) {
          form.append('imageWidth', String(resolvedMeta.width));
        }
        if (resolvedMeta?.height) {
          form.append('imageHeight', String(resolvedMeta.height));
        }

        const direct = await apiUpload<{ documentId: string; storageKey: string }>(
          '/public/uploads/direct',
          {
            method: 'POST',
            headers: {
              'x-draft-token': resolvedDraftToken,
            },
            body: form,
          },
        );
        documentId = direct.documentId;
        setCurrentDocumentId(direct.documentId);
      } else {
        const contentType = file.type || 'application/octet-stream';
        const presign = await apiFetch<UploadPresignResponse>('/public/uploads/presign', {
          method: 'POST',
          headers: {
            'x-draft-token': resolvedDraftToken,
          },
          body: {
            draftId: resolvedDraftId,
            docType: documentType,
            fileName: file.name,
            contentType,
            size: file.size,
            imageWidth: resolvedMeta?.width,
            imageHeight: resolvedMeta?.height,
          },
        });

        setCurrentDocumentId(presign.documentId);

        const uploadResponse = await fetch(presign.uploadUrl, {
          method: presign.method ?? 'PUT',
          headers: presign.headers,
          body: file,
        });

        if (!uploadResponse.ok) {
          const raw = await uploadResponse.text().catch(() => '');
          const detail = raw.replace(/\s+/g, ' ').trim();
          const message = detail
            ? `Upload rejeitado (${uploadResponse.status}): ${detail.slice(0, 240)}`
            : `Falha no upload do arquivo (${uploadResponse.status})`;
          throw new Error(message);
        }

        documentId = presign.documentId;
      }

      const previewUrl = URL.createObjectURL(file);
      setLocalPreviewUrl(previewUrl);

      setUploadedDraftInfo({
        draftId: resolvedDraftId,
        draftToken: resolvedDraftToken,
        documentId,
      });

      setIsProcessing(false);
      onUploadComplete(documentId, previewUrl);
      setFlow('idle');
    } catch (error) {
      console.error('Erro no upload:', error);
      onError(error instanceof Error ? error.message : 'Erro ao fazer upload');
      setIsProcessing(false);
      setFlow('idle');
    }
  };

  const buildOcrPreviewData = (
    docType: string,
    imageUrl: string,
    ocrResult: DraftOcrResult,
  ): OcrPreviewData => {
    const structured = (ocrResult.structuredData ?? {}) as Record<string, unknown>;
    const fields =
      structured.fields && typeof structured.fields === 'object'
        ? (structured.fields as Record<string, unknown>)
        : structured;

    const resolve = (key: string) => {
      const value = fields[key];
      return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
    };

    if (docType === 'RG_FRENTE' || docType === 'RG_VERSO') {
      return {
        imageUrl,
        documentType: 'RG',
        fields: {
          nome: resolve('nome')
            ? { label: 'Nome Completo', value: resolve('nome')!, editable: true }
            : undefined,
          cpf: resolve('cpf')
            ? { label: 'CPF', value: resolve('cpf')!, editable: true }
            : undefined,
          rg: resolve('rg_cnh')
            ? { label: 'RG', value: resolve('rg_cnh')!, editable: true }
            : undefined,
          dataEmissao: resolve('data_emissao')
            ? { label: 'Data de Emissão', value: resolve('data_emissao')!, editable: true }
            : undefined,
          orgaoEmissor: resolve('orgao_emissor')
            ? { label: 'Órgão Emissor', value: resolve('orgao_emissor')!, editable: true }
            : undefined,
          uf: resolve('uf') ? { label: 'UF', value: resolve('uf')!, editable: true } : undefined,
        },
        overallConfidence: typeof ocrResult.score === 'number' ? ocrResult.score : undefined,
      };
    }

    if (docType === 'CNH') {
      return {
        imageUrl,
        documentType: 'CNH',
        fields: {
          nome: resolve('nome')
            ? { label: 'Nome Completo', value: resolve('nome')!, editable: true }
            : undefined,
          cpf: resolve('cpf')
            ? { label: 'CPF', value: resolve('cpf')!, editable: true }
            : undefined,
          cnh: resolve('rg_cnh')
            ? { label: 'Número da CNH', value: resolve('rg_cnh')!, editable: true }
            : undefined,
          dataEmissao: resolve('data_emissao')
            ? { label: 'Data de Emissão', value: resolve('data_emissao')!, editable: true }
            : undefined,
          orgaoEmissor: resolve('orgao_emissor')
            ? { label: 'Órgão Emissor', value: resolve('orgao_emissor')!, editable: true }
            : undefined,
        },
        overallConfidence: typeof ocrResult.score === 'number' ? ocrResult.score : undefined,
      };
    }

    return {
      imageUrl,
      documentType: 'COMPROVANTE_RESIDENCIA',
      fields: {
        endereco: resolve('endereco')
          ? { label: 'Endereço', value: resolve('endereco')!, editable: true }
          : undefined,
        cep: resolve('cep') ? { label: 'CEP', value: resolve('cep')!, editable: true } : undefined,
      },
      overallConfidence: typeof ocrResult.score === 'number' ? ocrResult.score : undefined,
    };
  };

  const pollDraftOcr = async (
    draftIdValue: string,
    draftTokenValue: string,
    documentId: string,
  ) => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await apiFetch<{ results: DraftOcrResult[] }>(
        `/public/drafts/${draftIdValue}/ocr`,
        {
          headers: {
            'x-draft-token': draftTokenValue,
          },
        },
      );
      const match = response.results?.find((entry) => entry.documentFileId === documentId);
      if (match) return match;
      await new Promise((resolve) => setTimeout(resolve, 4000));
    }
    return null;
  };

  const buildOcrPayload = (preview: OcrPreviewData, edits?: Record<string, string>) => {
    const payload: Record<string, string> = {};
    const pick = (key: keyof OcrPreviewData['fields']) => {
      const original = preview.fields[key]?.value ?? null;
      const value = edits?.[key] ?? original;
      if (typeof value === 'string' && value.trim().length > 0) {
        payload[key] = value.trim();
      }
    };
    pick('nome');
    pick('cpf');
    pick('rg');
    pick('cnh');
    pick('dataNascimento');
    pick('dataEmissao');
    pick('orgaoEmissor');
    pick('uf');
    pick('endereco');
    pick('cep');
    return payload;
  };

  const handleOcrConfirm = async (editedFields?: Record<string, string>) => {
    const previewUrl = existingPreviewUrl ?? localPreviewUrl ?? '';
    const documentId = currentDocumentId ?? existingDocumentId ?? '';
    const payload = ocrPreviewData ? buildOcrPayload(ocrPreviewData, editedFields) : editedFields;
    onUploadComplete(documentId, previewUrl, payload);
    setFlow('idle');
    setOcrPreviewData(null);
  };

  const handleOcrRetake = () => {
    if (localPreviewUrl && !existingPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }
    setLocalPreviewUrl(null);
    setCurrentDocumentId(null);
    setOcrPreviewData(null);
    setFlow('idle');
  };

  const handleTriggerOcr = async () => {
    if (!uploadedDraftInfo) return;
    const { draftId: di, draftToken: dt, documentId: docId } = uploadedDraftInfo;

    setOcrError(null);
    setIsProcessing(true);
    setFlow('processing-ocr');

    try {
      await apiFetch(`/public/drafts/${di}/ocr`, {
        method: 'POST',
        headers: { 'x-draft-token': dt },
      });

      const ocrResult = await pollDraftOcr(di, dt, docId);
      if (ocrResult) {
        const previewUrl = existingPreviewUrl ?? localPreviewUrl ?? '';
        const previewData = buildOcrPreviewData(documentType, previewUrl, ocrResult);
        setOcrPreviewData(previewData);
        setIsProcessing(false);
        setFlow('show-preview');
      } else {
        setIsProcessing(false);
        setOcrError('Nao foi possivel extrair dados do documento. Tente novamente.');
        setFlow('idle');
      }
    } catch {
      setIsProcessing(false);
      setOcrError('Erro ao processar OCR. Tente novamente.');
      setFlow('idle');
    }
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload buttons */}
      {flow === 'idle' && (
        <div className="space-y-3">
          {(existingPreviewUrl ?? localPreviewUrl) ? (
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600">
                  <svg
                    className="h-4 w-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-green-900">Documento enviado</span>
              </div>
              <div className="relative h-32 w-full max-w-[240px] overflow-hidden rounded-lg bg-[var(--card)]/80">
                <Image
                  src={existingPreviewUrl ?? localPreviewUrl ?? ''}
                  alt={documentLabel}
                  fill
                  sizes="(max-width: 640px) 70vw, 240px"
                  className="object-contain"
                  unoptimized
                />
              </div>
              {uploadedDraftInfo && documentType !== 'COMPROVANTE_RESIDENCIA' && (
                <button
                  type="button"
                  onClick={handleTriggerOcr}
                  className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  <FileSearch className="h-4 w-4" aria-hidden="true" />
                  Ler documento com OCR (opcional)
                </button>
              )}
              {ocrError && <p className="mt-2 text-xs text-red-600">{ocrError}</p>}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-[var(--gray-300)] bg-[var(--muted)] p-6 text-center">
              <p className="text-sm text-[color:var(--gray-500)]">Nenhum documento enviado</p>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleCaptureClick}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)]"
            >
              <Camera className="h-5 w-5" aria-hidden="true" />
              Tirar Foto
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-[var(--gray-300)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[color:var(--gray-700)] hover:bg-[var(--muted)]"
            >
              <Upload className="h-5 w-5" aria-hidden="true" />
              Escolher Arquivo
            </button>
          </div>
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && flow === 'processing-ocr' && !ocrPreviewData && (
        <div className="flex items-center justify-center gap-3 rounded-xl bg-blue-50 px-4 py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <span className="text-sm font-medium text-blue-900">Processando... aguarde</span>
        </div>
      )}

      {/* Modals */}
      {flow === 'show-guidelines' && (
        <CaptureGuidelines
          documentType={documentLabel}
          onProceed={handleGuidelinesProceed}
          onCancel={handleGuidelinesCancel}
        />
      )}

      {flow === 'quality-alert' && (
        <ImageQualityAlert
          warnings={validationWarnings}
          errors={validationErrors}
          onProceed={handleQualityAlertProceed}
          onCancel={handleQualityAlertCancel}
        />
      )}

      {flow === 'show-preview' && ocrPreviewData && (
        <OcrPreview
          data={ocrPreviewData}
          onConfirm={handleOcrConfirm}
          onRetake={handleOcrRetake}
          isProcessing={isProcessing}
        />
      )}
    </>
  );
}

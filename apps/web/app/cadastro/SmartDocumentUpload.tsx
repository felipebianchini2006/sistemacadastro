'use client';

import { useState, useRef } from 'react';
import { Camera, Upload } from 'lucide-react';
import { CaptureGuidelines } from './CaptureGuidelines';
import { ImageQualityAlert } from './ImageQualityAlert';
import { OcrPreview, OcrPreviewData } from './OcrPreview';
import { validateImageComplete, shouldWarnUser } from '../lib/imageValidation';

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
  draftId: string;
  draftToken: string;
  onUploadComplete: (documentId: string, ocrData?: Record<string, unknown>) => void;
  onError: (error: string) => void;
  existingDocumentId?: string;
  existingPreviewUrl?: string;
}

export function SmartDocumentUpload({
  documentType,
  documentLabel,
  draftId,
  draftToken,
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

      if (shouldWarnUser(validation)) {
        setValidationWarnings(validation.warnings);
        setValidationErrors(validation.errors);
        setFlow('quality-alert');
      } else {
        // Qualidade OK, processar diretamente
        await processUpload(file);
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
    await processUpload(selectedFile);
  };

  const handleQualityAlertCancel = () => {
    setSelectedFile(null);
    setValidationWarnings([]);
    setValidationErrors([]);
    setFlow('idle');
  };

  const processUpload = async (file: File) => {
    setIsProcessing(true);
    setFlow('processing-ocr');

    try {
      // 1. Solicitar presigned URL
      const presignResponse = await fetch(`/api/public/drafts/${draftId}/uploads/presigned-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${draftToken}`,
        },
        body: JSON.stringify({
          docType: documentType,
          fileName: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      if (!presignResponse.ok) {
        throw new Error('Falha ao obter URL de upload');
      }

      const { uploadUrl, key, documentId } = await presignResponse.json();

      // 2. Upload direto para S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Falha no upload do arquivo');
      }

      // 3. Criar preview local
      const previewUrl = URL.createObjectURL(file);

      // 4. Solicitar OCR (se aplicável)
      if (documentType !== 'COMPROVANTE_RESIDENCIA') {
        const ocrResponse = await fetch(`/api/public/drafts/${draftId}/ocr`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${draftToken}`,
          },
          body: JSON.stringify({
            documentFileId: documentId,
            documentType: documentType,
          }),
        });

        if (ocrResponse.ok) {
          const ocrData = await ocrResponse.json();

          // Montar dados para preview
          const previewData = buildOcrPreviewData(documentType, previewUrl, ocrData);
          setOcrPreviewData(previewData);
          setIsProcessing(false);
          setFlow('show-preview');
          return;
        }
      }

      // Se não tem OCR ou falhou, completar direto
      setIsProcessing(false);
      onUploadComplete(documentId);
      setFlow('idle');
    } catch (error) {
      console.error('Erro no upload:', error);
      onError(error instanceof Error ? error.message : 'Erro ao fazer upload');
      setIsProcessing(false);
      setFlow('idle');
    }
  };

  const buildOcrPreviewData = (docType: string, imageUrl: string, ocrData: any): OcrPreviewData => {
    const structured = ocrData.structuredData || {};

    if (docType === 'RG_FRENTE' || docType === 'RG_VERSO') {
      return {
        imageUrl,
        documentType: 'RG',
        fields: {
          nome: structured.nome
            ? {
                label: 'Nome Completo',
                value: structured.nome,
                editable: true,
                confidence: structured.nomeConfidence,
              }
            : undefined,
          cpf: structured.cpf
            ? {
                label: 'CPF',
                value: structured.cpf,
                editable: true,
                confidence: structured.cpfConfidence,
              }
            : undefined,
          rg: structured.rg
            ? {
                label: 'RG',
                value: structured.rg,
                editable: true,
                confidence: structured.rgConfidence,
              }
            : undefined,
          dataNascimento: structured.dataNascimento
            ? {
                label: 'Data de Nascimento',
                value: structured.dataNascimento,
                editable: true,
                confidence: structured.dataNascimentoConfidence,
              }
            : undefined,
          orgaoEmissor: structured.orgaoEmissor
            ? {
                label: 'Órgão Emissor',
                value: structured.orgaoEmissor,
                editable: true,
                confidence: structured.orgaoEmissorConfidence,
              }
            : undefined,
          uf: structured.uf
            ? {
                label: 'UF',
                value: structured.uf,
                editable: true,
                confidence: structured.ufConfidence,
              }
            : undefined,
        },
        overallConfidence: structured.overallConfidence,
      };
    }

    if (docType === 'CNH') {
      return {
        imageUrl,
        documentType: 'CNH',
        fields: {
          nome: structured.nome
            ? {
                label: 'Nome Completo',
                value: structured.nome,
                editable: true,
                confidence: structured.nomeConfidence,
              }
            : undefined,
          cpf: structured.cpf
            ? {
                label: 'CPF',
                value: structured.cpf,
                editable: true,
                confidence: structured.cpfConfidence,
              }
            : undefined,
          cnh: structured.cnh
            ? {
                label: 'Número da CNH',
                value: structured.cnh,
                editable: true,
                confidence: structured.cnhConfidence,
              }
            : undefined,
          dataNascimento: structured.dataNascimento
            ? {
                label: 'Data de Nascimento',
                value: structured.dataNascimento,
                editable: true,
                confidence: structured.dataNascimentoConfidence,
              }
            : undefined,
          dataEmissao: structured.dataEmissao
            ? {
                label: 'Data de Emissão',
                value: structured.dataEmissao,
                editable: false,
                confidence: structured.dataEmissaoConfidence,
              }
            : undefined,
        },
        overallConfidence: structured.overallConfidence,
      };
    }

    // Fallback genérico
    return {
      imageUrl,
      documentType: 'COMPROVANTE_RESIDENCIA',
      fields: {},
    };
  };

  const handleOcrConfirm = async (editedFields?: Record<string, string>) => {
    // TODO: Se houver campos editados, enviar atualização para o backend
    if (editedFields && ocrPreviewData) {
      console.log('Campos editados pelo usuário:', editedFields);
      // Aqui você pode fazer um PATCH para atualizar o OCR no backend
    }

    // Finalizar upload
    if (ocrPreviewData) {
      onUploadComplete(existingDocumentId || '', ocrPreviewData.fields as any);
    }
    setFlow('idle');
    setOcrPreviewData(null);
  };

  const handleOcrRetake = () => {
    setOcrPreviewData(null);
    setFlow('idle');
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
          {existingPreviewUrl ? (
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600">
                  <svg
                    className="h-4 w-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
              <img
                src={existingPreviewUrl}
                alt={documentLabel}
                className="h-32 w-auto rounded-lg object-contain"
              />
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
              <p className="text-sm text-zinc-600">Nenhum documento enviado</p>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleCaptureClick}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#ff6b35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ff5722]"
            >
              <Camera className="h-5 w-5" />
              Tirar Foto
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              <Upload className="h-5 w-5" />
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

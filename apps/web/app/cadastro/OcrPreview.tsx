'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CheckCircle, XCircle, Edit2, Camera, Loader2 } from 'lucide-react';

export type OcrField = {
  label: string;
  value: string | null;
  confidence?: number;
  editable: boolean;
};

export type OcrPreviewData = {
  imageUrl: string;
  documentType: 'RG' | 'CNH' | 'COMPROVANTE_RESIDENCIA';
  fields: {
    nome?: OcrField;
    cpf?: OcrField;
    rg?: OcrField;
    cnh?: OcrField;
    dataNascimento?: OcrField;
    dataEmissao?: OcrField;
    orgaoEmissor?: OcrField;
    uf?: OcrField;
    endereco?: OcrField;
    cep?: OcrField;
  };
  overallConfidence?: number;
};

interface OcrPreviewProps {
  data: OcrPreviewData;
  onConfirm: (editedFields?: Record<string, string>) => void;
  onRetake: () => void;
  isProcessing?: boolean;
}

export function OcrPreview({ data, onConfirm, onRetake, isProcessing = false }: OcrPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const handleFieldEdit = (fieldKey: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [fieldKey]: value }));
  };

  const handleConfirm = () => {
    onConfirm(Object.keys(editedValues).length > 0 ? editedValues : undefined);
  };

  const getFieldValue = (fieldKey: string, originalValue: string | null) => {
    return editedValues[fieldKey] ?? originalValue ?? '';
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-[color:var(--gray-500)]';
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence?: number) => {
    if (!confidence || confidence < 0.7) {
      return <XCircle className="h-5 w-5 text-red-500" aria-hidden="true" />;
    }
    if (confidence < 0.9) {
      return <CheckCircle className="h-5 w-5 text-yellow-500" aria-hidden="true" />;
    }
    return <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />;
  };

  const documentTitle = {
    RG: 'RG (Registro Geral)',
    CNH: 'CNH (Carteira de Motorista)',
    COMPROVANTE_RESIDENCIA: 'Comprovante de Residência',
  }[data.documentType];

  const overlayItems = Object.values(data.fields)
    .filter((field) => field?.value)
    .map((field, index) => ({
      key: `${field?.label ?? 'campo'}-${index}`,
      label: field?.label ?? '',
      value: field?.value ?? '',
    }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-auto rounded-2xl bg-[var(--card)] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ocr-preview-title"
        aria-describedby="ocr-preview-description"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--card)] border-b border-[var(--border)] px-6 py-4">
          <h2 id="ocr-preview-title" className="text-xl font-bold text-[color:var(--gray-900)]">
            {documentTitle}
          </h2>
          <p id="ocr-preview-description" className="mt-1 text-sm text-[color:var(--gray-500)]">
            Confira os dados extraídos e confirme se estão corretos
          </p>
          {data.overallConfidence && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-[color:var(--gray-500)]">Confiança geral:</span>
              <span
                className={`text-sm font-semibold ${getConfidenceColor(data.overallConfidence)}`}
              >
                {(data.overallConfidence * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>

        <div className="p-6">
          {/* Image Preview */}
          <div className="relative mb-6 h-72 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--muted)] sm:h-80 md:h-96">
            <Image
              src={data.imageUrl}
              alt="Documento capturado"
              fill
              sizes="(max-width: 768px) 100vw, 70vw"
              className="object-contain"
              unoptimized
            />
            {overlayItems.length > 0 ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4">
                <div className="flex flex-wrap gap-2 text-[11px] text-white">
                  {overlayItems.map((item) => (
                    <span
                      key={item.key}
                      className="rounded-full border border-white/20 bg-white/10 px-2 py-1 backdrop-blur"
                    >
                      <span className="font-semibold">{item.label}:</span> {item.value}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Processing State */}
          {isProcessing && (
            <div className="mb-6 flex items-center justify-center gap-3 rounded-xl bg-blue-50 px-4 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" aria-hidden="true" />
              <span className="text-sm font-medium text-blue-900">Processando OCR... aguarde</span>
            </div>
          )}

          {/* Extracted Fields */}
          {!isProcessing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[color:var(--gray-900)]">
                  Dados extraídos
                </h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-[color:var(--primary)] hover:bg-[color:var(--primary-soft)]"
                >
                  <Edit2 className="h-4 w-4" aria-hidden="true" />
                  {isEditing ? 'Cancelar edição' : 'Editar manualmente'}
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(data.fields).map(([fieldKey, field]) => {
                  if (!field) return null;

                  const currentValue = getFieldValue(fieldKey, field.value);
                  const isFieldEdited = editedValues[fieldKey] !== undefined;

                  return (
                    <div
                      key={fieldKey}
                      className={`rounded-xl border p-4 transition-colors ${
                        isFieldEdited
                          ? 'border-[color:var(--primary-light)] bg-[color:var(--primary-soft)]'
                          : 'border-[var(--border)] bg-[var(--card)]'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-sm font-medium text-[color:var(--gray-700)]">
                          {field.label}
                        </label>
                        {getConfidenceIcon(field.confidence)}
                      </div>

                      {isEditing && field.editable ? (
                        <input
                          type="text"
                          value={currentValue}
                          onChange={(e) => handleFieldEdit(fieldKey, e.target.value)}
                          className="w-full rounded-lg border border-[var(--gray-300)] px-3 py-2 text-sm font-mono focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
                        />
                      ) : (
                        <p className="text-base font-mono text-[color:var(--gray-900)]">
                          {currentValue || (
                            <span className="text-[color:var(--gray-500)] italic">
                              Não detectado
                            </span>
                          )}
                        </p>
                      )}

                      {field.confidence && (
                        <p className={`mt-1 text-xs ${getConfidenceColor(field.confidence)}`}>
                          Confiança: {(field.confidence * 100).toFixed(0)}%
                        </p>
                      )}

                      {isFieldEdited && (
                        <p className="mt-1 text-xs text-[color:var(--primary)] font-medium">
                          ✏️ Editado manualmente
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-[var(--card)] border-t border-[var(--border)] px-6 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={onRetake}
              disabled={isProcessing}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[color:var(--gray-700)] hover:bg-[var(--muted)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="h-5 w-5" aria-hidden="true" />
              Refazer Foto
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="h-5 w-5" aria-hidden="true" />
              Confirmar Dados
            </button>
          </div>

          {Object.keys(editedValues).length > 0 && (
            <p className="mt-3 text-center text-xs text-[color:var(--gray-500)]">
              {Object.keys(editedValues).length} campo(s) editado(s) manualmente
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

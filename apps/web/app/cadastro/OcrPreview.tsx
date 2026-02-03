'use client';

import { useState } from 'react';
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
    if (!confidence) return 'text-zinc-400';
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence?: number) => {
    if (!confidence || confidence < 0.7) return <XCircle className="h-5 w-5 text-red-500" />;
    if (confidence < 0.9) return <CheckCircle className="h-5 w-5 text-yellow-500" />;
    return <CheckCircle className="h-5 w-5 text-green-500" />;
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
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-zinc-200 px-6 py-4">
          <h2 className="text-xl font-bold text-zinc-900">{documentTitle}</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Confira os dados extraídos e confirme se estão corretos
          </p>
          {data.overallConfidence && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-zinc-600">Confiança geral:</span>
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
          <div className="relative mb-6 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
            <img
              src={data.imageUrl}
              alt="Documento capturado"
              className="w-full h-auto object-contain max-h-96"
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
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Processando OCR... aguarde</span>
            </div>
          )}

          {/* Extracted Fields */}
          {!isProcessing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900">Dados extraídos</h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-50"
                >
                  <Edit2 className="h-4 w-4" />
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
                          ? 'border-orange-300 bg-orange-50'
                          : 'border-zinc-200 bg-white'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-sm font-medium text-zinc-700">{field.label}</label>
                        {getConfidenceIcon(field.confidence)}
                      </div>

                      {isEditing && field.editable ? (
                        <input
                          type="text"
                          value={currentValue}
                          onChange={(e) => handleFieldEdit(fieldKey, e.target.value)}
                          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                        />
                      ) : (
                        <p className="text-base font-mono text-zinc-900">
                          {currentValue || (
                            <span className="text-zinc-400 italic">Não detectado</span>
                          )}
                        </p>
                      )}

                      {field.confidence && (
                        <p className={`mt-1 text-xs ${getConfidenceColor(field.confidence)}`}>
                          Confiança: {(field.confidence * 100).toFixed(0)}%
                        </p>
                      )}

                      {isFieldEdited && (
                        <p className="mt-1 text-xs text-orange-600 font-medium">
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
        <div className="sticky bottom-0 bg-white border-t border-zinc-200 px-6 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={onRetake}
              disabled={isProcessing}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="h-5 w-5" />
              Refazer Foto
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#ff6b35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ff5722] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="h-5 w-5" />
              Confirmar Dados
            </button>
          </div>

          {Object.keys(editedValues).length > 0 && (
            <p className="mt-3 text-center text-xs text-zinc-600">
              {Object.keys(editedValues).length} campo(s) editado(s) manualmente
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { AlertTriangle, X } from 'lucide-react';

interface ImageQualityAlertProps {
  warnings: string[];
  errors: string[];
  onProceed: () => void;
  onCancel: () => void;
}

export function ImageQualityAlert({
  warnings,
  errors,
  onProceed,
  onCancel,
}: ImageQualityAlertProps) {
  const hasErrors = errors.length > 0;
  const severity = hasErrors ? 'error' : 'warning';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--card)] p-6 shadow-[var(--shadow-md)]">
        <div className="mb-4 flex items-start gap-3">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
              hasErrors ? 'bg-red-100' : 'bg-yellow-100'
            }`}
          >
            {hasErrors ? (
              <X className="h-6 w-6 text-red-600" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-yellow-600" aria-hidden="true" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-[color:var(--gray-900)]">
              {hasErrors ? 'Imagem inválida' : 'Atenção: Qualidade da imagem'}
            </h3>
            <p className="mt-1 text-sm text-[color:var(--gray-500)]">
              {hasErrors
                ? 'A imagem não atende aos requisitos mínimos'
                : 'Detectamos possíveis problemas com a qualidade da imagem'}
            </p>
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mb-4 rounded-xl bg-red-50 p-4">
            <h4 className="mb-2 text-sm font-semibold text-red-900">Problemas encontrados:</h4>
            <ul className="space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-sm text-red-700">
                  • {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mb-4 rounded-xl bg-yellow-50 p-4">
            <h4 className="mb-2 text-sm font-semibold text-yellow-900">Avisos:</h4>
            <ul className="space-y-1">
              {warnings.map((warning, index) => (
                <li key={index} className="text-sm text-yellow-700">
                  • {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions */}
        <div className="mb-6 rounded-xl bg-blue-50 p-4">
          <h4 className="mb-2 text-sm font-semibold text-blue-900">Dicas:</h4>
          <ul className="space-y-1 text-sm text-blue-700">
            <li>• Use boa iluminação natural ou artificial</li>
            <li>• Evite reflexos e sombras sobre o documento</li>
            <li>• Mantenha a câmera estável e focada</li>
            <li>• Certifique-se de que o documento está completo na foto</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            onClick={onCancel}
            className="min-h-[44px] rounded-xl bg-[var(--card)] border-2 border-[var(--gray-300)] px-4 py-2 text-sm font-semibold text-[color:var(--gray-700)] hover:bg-[var(--muted)]"
          >
            Tirar nova foto
          </button>
          {!hasErrors && (
            <button
              onClick={onProceed}
              className="min-h-[44px] rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600"
            >
              Prosseguir assim mesmo
            </button>
          )}
        </div>

        {hasErrors && (
          <p className="mt-3 text-center text-xs text-red-600 font-medium">
            A imagem não pode ser usada devido aos erros acima
          </p>
        )}
      </div>
    </div>
  );
}

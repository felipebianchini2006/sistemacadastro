'use client';

import { useEffect, useRef, useState } from 'react';

interface CaptureGuidelinesProps {
  documentType: string;
  onProceed: () => void;
  onCancel: () => void;
}

export function CaptureGuidelines({ documentType, onProceed, onCancel }: CaptureGuidelinesProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      previousFocusRef.current?.focus();
    };
  }, []);

  const getFocusableElements = () => {
    if (!dialogRef.current) return [];
    return Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      ),
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = getFocusableElements();
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl bg-[var(--card)] p-6 shadow-[var(--shadow-md)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-guidelines-title"
        aria-describedby="capture-guidelines-description"
        tabIndex={-1}
      >
        <div className="mb-4">
          <h3
            id="capture-guidelines-title"
            className="text-lg font-bold text-[color:var(--gray-900)]"
          >
            Prepare-se para capturar {documentType}
          </h3>
          <p
            id="capture-guidelines-description"
            className="mt-1 text-sm text-[color:var(--gray-500)]"
          >
            Siga essas dicas para garantir uma foto de qualidade
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--primary-soft)]">
              <svg
                className="h-4 w-4 text-[color:var(--primary)]"
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
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
                />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-[color:var(--gray-900)]">Use boa iluminação</h4>
              <p className="text-sm text-[color:var(--gray-500)]">
                Fotografe em um local bem iluminado, preferencialmente com luz natural
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--primary-soft)]">
              <svg
                className="h-4 w-4 text-[color:var(--primary)]"
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
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
              <svg
                className="h-4 w-4 text-[color:var(--primary)]"
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
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

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--primary-soft)]">
              <svg
                className="h-4 w-4 text-[color:var(--primary)]"
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
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-[color:var(--gray-900)]">
                Capture o documento inteiro
              </h4>
              <p className="text-sm text-[color:var(--gray-500)]">
                Inclua todas as bordas do documento na foto
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button
            onClick={onCancel}
            ref={cancelButtonRef}
            className="min-h-[44px] rounded-xl border border-[var(--gray-300)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[color:var(--gray-700)] hover:bg-[var(--muted)]"
          >
            Cancelar
          </button>
          <button
            onClick={onProceed}
            className="min-h-[44px] rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)]"
          >
            Entendi, tirar foto
          </button>
        </div>
      </div>
    </div>
  );
}

interface CaptureGuidelinesWrapperProps {
  children: (props: { showGuidelines: (docType: string) => void }) => React.ReactNode;
}

export function CaptureGuidelinesWrapper({ children }: CaptureGuidelinesWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [documentType, setDocumentType] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const showGuidelines = (docType: string, action: () => void) => {
    setDocumentType(docType);
    setPendingAction(() => action);
    setIsOpen(true);
  };

  const handleProceed = () => {
    setIsOpen(false);
    if (pendingAction) {
      pendingAction();
    }
    setPendingAction(null);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setPendingAction(null);
  };

  return (
    <>
      {children({ showGuidelines: (docType: string) => showGuidelines(docType, () => {}) })}
      {isOpen && (
        <CaptureGuidelines
          documentType={documentType}
          onProceed={handleProceed}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}

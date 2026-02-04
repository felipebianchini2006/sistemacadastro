'use client';

import { useEffect, useId } from 'react';
import { cn } from '../../lib/utils';

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export const Modal = ({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  className,
}: ModalProps) => {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-xl)]',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id={titleId} className="text-lg font-semibold text-[color:var(--gray-900)]">
              {title}
            </h3>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-[color:var(--gray-500)]">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] text-[color:var(--gray-500)] transition hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]"
            aria-label="Fechar modal"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6l-12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="mt-5">{children}</div>
        {footer ? <div className="mt-6 flex flex-wrap items-center gap-3">{footer}</div> : null}
      </div>
    </div>
  );
};

'use client';

import { cn } from '../../lib/utils';

type ToastTone = 'success' | 'error' | 'warning' | 'info';

type ToastProps = {
  title: string;
  message?: string;
  tone?: ToastTone;
  onClose?: () => void;
};

const toneClasses: Record<ToastTone, string> = {
  success: 'border-[color:var(--success)]',
  error: 'border-[color:var(--error)]',
  warning: 'border-[color:var(--warning)]',
  info: 'border-[color:var(--info)]',
};

export const Toast = ({ title, message, tone = 'success', onClose }: ToastProps) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    aria-live={tone === 'error' ? 'assertive' : 'polite'}
    aria-atomic="true"
    className={cn(
      'relative flex items-start gap-3 rounded-2xl border-l-4 bg-[var(--card)] p-4 shadow-[var(--shadow-md)]',
      toneClasses[tone],
    )}
  >
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--muted)] text-[color:var(--gray-700)]">
      <span className="text-xs font-semibold">{tone.toUpperCase().slice(0, 2)}</span>
    </div>
    <div className="flex-1">
      <p className="text-sm font-semibold text-[color:var(--gray-900)]">{title}</p>
      {message ? <p className="mt-1 text-xs text-[color:var(--gray-500)]">{message}</p> : null}
    </div>
    {onClose ? (
      <button
        type="button"
        onClick={onClose}
        className="flex h-11 w-11 items-center justify-center rounded-full text-[color:var(--gray-500)] transition hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]"
        aria-label="Fechar notificacao"
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
    ) : null}
    <span
      className={cn(
        'toast-progress absolute bottom-0 left-0 h-1 rounded-full',
        tone === 'success' && 'bg-[color:var(--success)]',
        tone === 'error' && 'bg-[color:var(--error)]',
        tone === 'warning' && 'bg-[color:var(--warning)]',
        tone === 'info' && 'bg-[color:var(--info)]',
      )}
    />
  </div>
);

export const ToastContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="toast-container" role="region" aria-live="polite" aria-label="Notificacoes">
    {children}
  </div>
);

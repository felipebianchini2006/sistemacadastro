'use client';

import { cn } from '../lib/utils';

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  IN_PROGRESS: 'Em andamento',
  SUBMITTED: 'Aguardando analise',
  UNDER_REVIEW: 'Em analise',
  PENDING_DOCS: 'Pendente documento',
  PENDING_SIGNATURE: 'Aguardando assinatura',
  SIGNED: 'Assinado',
  APPROVED: 'Filiacao concluida',
  REJECTED: 'Reprovado',
  CANCELED: 'Cancelada',
};

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED:
    'bg-[color:var(--info-soft)] text-[color:var(--info)] border-[color:var(--info-border)]',
  UNDER_REVIEW:
    'bg-[color:var(--warning-soft)] text-[color:var(--warning)] border-[color:var(--warning-border)]',
  PENDING_DOCS:
    'bg-[color:var(--error-soft)] text-[color:var(--error)] border-[color:var(--error-border)]',
  PENDING_SIGNATURE:
    'bg-[color:var(--primary-soft)] text-[color:var(--primary-dark)] border-[color:var(--primary-light)]',
  SIGNED:
    'bg-[color:var(--success-soft)] text-[color:var(--success)] border-[color:var(--success-border)]',
  APPROVED:
    'bg-[color:var(--success-soft)] text-[color:var(--success)] border-[color:var(--success-border)]',
  REJECTED: 'bg-[var(--gray-100)] text-[color:var(--gray-700)] border-[var(--border)]',
  CANCELED: 'bg-[var(--gray-100)] text-[color:var(--gray-700)] border-[var(--border)]',
  DRAFT: 'bg-[var(--gray-100)] text-[color:var(--gray-700)] border-[var(--border)]',
  IN_PROGRESS: 'bg-[var(--gray-100)] text-[color:var(--gray-700)] border-[var(--border)]',
};

export const StatusBadge = ({ status }: { status: string }) => {
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em]',
        STATUS_STYLES[status] ??
          'bg-[var(--gray-100)] text-[color:var(--gray-700)] border-[var(--border)]',
      )}
    >
      {label}
    </span>
  );
};

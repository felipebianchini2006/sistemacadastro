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
    'bg-[color:var(--purple-soft)] text-[color:var(--purple)] border-[color:var(--purple-border)]',
  SIGNED:
    'bg-[color:var(--success-soft)] text-[color:var(--success)] border-[color:var(--success-border)]',
  APPROVED:
    'bg-[color:rgba(22,163,74,0.12)] text-[color:var(--success-strong)] border-[color:rgba(22,163,74,0.3)]',
  REJECTED:
    'bg-[color:var(--status-muted-soft)] text-[color:var(--status-muted)] border-[color:var(--status-muted-border)]',
  CANCELED:
    'bg-[color:var(--status-muted-soft)] text-[color:var(--status-muted)] border-[color:var(--status-muted-border)]',
  DRAFT:
    'bg-[color:var(--status-muted-soft)] text-[color:var(--status-muted)] border-[color:var(--status-muted-border)]',
  IN_PROGRESS:
    'bg-[color:var(--status-muted-soft)] text-[color:var(--status-muted)] border-[color:var(--status-muted-border)]',
};

export const StatusBadge = ({ status }: { status: string }) => {
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold',
        STATUS_STYLES[status] ??
          'bg-[var(--gray-100)] text-[color:var(--gray-700)] border-[var(--border)]',
      )}
    >
      {label}
    </span>
  );
};

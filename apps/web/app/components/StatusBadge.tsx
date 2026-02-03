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
  SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
  UNDER_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING_DOCS: 'bg-red-50 text-red-700 border-red-200',
  PENDING_SIGNATURE: 'bg-purple-50 text-purple-700 border-purple-200',
  SIGNED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  APPROVED: 'bg-green-50 text-green-700 border-green-200',
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

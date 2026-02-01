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
  SUBMITTED: 'bg-blue-100 text-blue-700 border-blue-200',
  UNDER_REVIEW: 'bg-amber-100 text-amber-700 border-amber-200',
  PENDING_DOCS: 'bg-red-100 text-red-700 border-red-200',
  PENDING_SIGNATURE: 'bg-purple-100 text-purple-700 border-purple-200',
  SIGNED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  APPROVED: 'bg-green-100 text-green-700 border-green-200',
  REJECTED: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  CANCELED: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  DRAFT: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  IN_PROGRESS: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

export const StatusBadge = ({ status }: { status: string }) => {
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em]',
        STATUS_STYLES[status] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200',
      )}
    >
      {label}
    </span>
  );
};

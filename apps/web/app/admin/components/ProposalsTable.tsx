'use client';

import Link from 'next/link';
import { StatusBadge } from '../../components/StatusBadge';
import { cn } from '../../lib/utils';

export type ProposalListItem = {
  id: string;
  protocol: string;
  status: string;
  type: string;
  createdAt: string;
  person: { fullName: string; cpfMasked: string | null } | null;
  sla?: { startedAt?: string | null; dueAt?: string | null; breachedAt?: string | null };
  assignedAnalyst?: { id: string; name: string; email: string } | null;
  statusHistory?: Array<{ toStatus: string; createdAt: string }>;
};

export type SortField =
  | 'protocol'
  | 'fullName'
  | 'cpf'
  | 'status'
  | 'type'
  | 'createdAt'
  | 'sla'
  | 'analyst';
export type SortDir = 'asc' | 'desc';
export type SortState = { field: SortField; dir: SortDir };

const hasRecentUpdate = (proposal: ProposalListItem) => {
  const history = proposal.statusHistory;
  if (!history?.length) return false;
  const last = history[history.length - 1];
  if (last.toStatus !== 'SUBMITTED') return false;
  const age = Date.now() - new Date(last.createdAt).getTime();
  return age < 48 * 60 * 60 * 1000;
};

const resolveSla = (proposal: ProposalListItem) => {
  const now = Date.now();
  const breachedAt = proposal.sla?.breachedAt ? new Date(proposal.sla.breachedAt).getTime() : null;
  if (breachedAt) {
    return { label: '8+ dias', tone: 'danger' as const };
  }

  const startedAt = proposal.sla?.startedAt ?? proposal.createdAt;
  const startedMs = startedAt ? new Date(startedAt).getTime() : now;
  const days = Math.max(0, Math.floor((now - startedMs) / (1000 * 60 * 60 * 24)));

  if (days >= 8) return { label: '8+ dias', tone: 'danger' as const };
  if (days >= 4) return { label: '4-7 dias', tone: 'warning' as const };
  return { label: '0-3 dias', tone: 'ok' as const };
};

const SortIcon = ({ field, sort }: { field: SortField; sort?: SortState }) => {
  if (sort?.field !== field) {
    return (
      <span className="ml-1 opacity-30" aria-hidden="true">
        &#8597;
      </span>
    );
  }
  return (
    <span className="ml-1 text-[color:var(--primary)]" aria-hidden="true">
      {sort.dir === 'asc' ? '\u25B2' : '\u25BC'}
    </span>
  );
};

type SortableHeader = { field: SortField; label: string };

const HEADERS: SortableHeader[] = [
  { field: 'protocol', label: 'Protocolo' },
  { field: 'fullName', label: 'Nome' },
  { field: 'cpf', label: 'CPF' },
  { field: 'status', label: 'Status' },
  { field: 'type', label: 'Tipo' },
  { field: 'createdAt', label: 'Criada' },
  { field: 'sla', label: 'SLA' },
  { field: 'analyst', label: 'Analista' },
];

export const ProposalsTable = ({
  items,
  sort,
  onSort,
  selectedIds,
  onSelectAll,
  onSelectOne,
}: {
  items: ProposalListItem[];
  sort?: SortState;
  onSort?: (field: SortField) => void;
  selectedIds?: Set<string>;
  onSelectAll?: (checked: boolean) => void;
  onSelectOne?: (id: string, checked: boolean) => void;
}) => {
  const hasSelection = selectedIds && selectedIds.size > 0;
  const allSelected =
    selectedIds && items.length > 0 && items.every((item) => selectedIds.has(item.id));
  const someSelected =
    selectedIds && items.some((item) => selectedIds.has(item.id)) && !allSelected;
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-lg">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--muted)] text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
          <tr>
            {onSelectAll && (
              <th scope="col" className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected ?? false;
                  }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-[var(--border)] text-[color:var(--primary)] focus:ring-[color:var(--primary-light)]"
                  aria-label="Selecionar todas as propostas"
                />
              </th>
            )}
            {HEADERS.map((header) => {
              const ariaSortValue =
                sort?.field === header.field
                  ? sort.dir === 'asc'
                    ? ('ascending' as const)
                    : ('descending' as const)
                  : ('none' as const);
              return (
                <th
                  key={header.field}
                  scope="col"
                  aria-sort={ariaSortValue}
                  className="cursor-pointer select-none px-4 py-3 hover:text-[color:var(--gray-700)]"
                  tabIndex={0}
                  role="columnheader"
                  onClick={() => onSort?.(header.field)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSort?.(header.field);
                    }
                  }}
                >
                  {header.label}
                  <SortIcon field={header.field} sort={sort} />
                </th>
              );
            })}
            <th scope="col" className="px-4 py-3 text-right">
              Acoes
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((proposal) => {
            const sla = resolveSla(proposal);
            const updated = hasRecentUpdate(proposal);
            return (
              <tr
                key={proposal.id}
                className={cn(
                  'border-t border-[var(--border)]',
                  updated && 'bg-blue-50/50',
                  selectedIds?.has(proposal.id) && 'bg-orange-50/30',
                )}
              >
                {onSelectOne && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds?.has(proposal.id) ?? false}
                      onChange={(e) => onSelectOne(proposal.id, e.target.checked)}
                      className="h-4 w-4 cursor-pointer rounded border-[var(--border)] text-[color:var(--primary)] focus:ring-[color:var(--primary-light)]"
                      aria-label={`Selecionar proposta ${proposal.protocol}`}
                    />
                  </td>
                )}
                <td className="px-4 py-3 font-semibold text-[color:var(--gray-900)]">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/propostas/${proposal.id}`} className="hover:underline">
                      {proposal.protocol}
                    </Link>
                    {updated ? (
                      <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        Atualizado
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-[color:var(--gray-700)]">
                  {proposal.person?.fullName ?? '-'}
                </td>
                <td className="px-4 py-3 text-[color:var(--gray-500)]">
                  {proposal.person?.cpfMasked ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={proposal.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[color:var(--gray-500)]">{proposal.type}</span>
                    {proposal.type === 'MIGRACAO' ? (
                      <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-orange-700">
                        Migracao
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-[color:var(--gray-500)]">
                  {new Date(proposal.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold',
                      sla.tone === 'ok' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                      sla.tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-700',
                      sla.tone === 'danger' && 'border-red-200 bg-red-50 text-red-700',
                    )}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        sla.tone === 'ok' && 'bg-emerald-500',
                        sla.tone === 'warning' && 'bg-amber-500',
                        sla.tone === 'danger' && 'bg-red-500',
                      )}
                      aria-hidden="true"
                    />
                    {sla.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-[color:var(--gray-500)]">
                  {proposal.assignedAnalyst?.name ?? 'Nao atribuido'}
                </td>
                <td className="px-4 py-3 text-right">
                  <details className="relative inline-block text-left">
                    <summary
                      className="cursor-pointer rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--gray-500)] hover:border-[var(--gray-300)]"
                      aria-label="Abrir menu de acoes"
                    >
                      ⋮
                    </summary>
                    <div className="absolute right-0 z-10 mt-2 w-48 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 text-xs shadow-lg">
                      <Link
                        href={`/admin/propostas/${proposal.id}`}
                        className="block rounded-xl px-3 py-2 text-[color:var(--gray-700)] hover:bg-[var(--muted)]"
                      >
                        Ver dossie
                      </Link>
                      {(proposal.status === 'SUBMITTED' || proposal.status === 'UNDER_REVIEW') && (
                        <Link
                          href={`/admin/propostas/${proposal.id}?action=signature`}
                          className="mt-1 block rounded-xl px-3 py-2 font-semibold text-orange-700 hover:bg-orange-50"
                        >
                          Enviar para assinatura
                        </Link>
                      )}
                      <Link
                        href={`/admin/propostas/${proposal.id}?action=request`}
                        className="mt-1 block rounded-xl px-3 py-2 text-[color:var(--gray-700)] hover:bg-[var(--muted)]"
                      >
                        Solicitar documento
                      </Link>
                      <Link
                        href={`/admin/propostas/${proposal.id}?action=reject`}
                        className="mt-1 block rounded-xl px-3 py-2 text-red-600 hover:bg-red-50"
                      >
                        Reprovar proposta
                      </Link>
                      {proposal.status === 'PENDING_SIGNATURE' && (
                        <Link
                          href={`/admin/propostas/${proposal.id}?action=resend`}
                          className="mt-1 block rounded-xl px-3 py-2 text-[color:var(--gray-700)] hover:bg-[var(--muted)]"
                        >
                          Reenviar link
                        </Link>
                      )}
                    </div>
                  </details>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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

const RowActionsMenu = ({
  proposal,
  buttonLabel,
  buttonClassName,
}: {
  proposal: ProposalListItem;
  buttonLabel: string;
  buttonClassName: string;
}) => {
  const [open, setOpen] = useState(false);
  const [positioned, setPositioned] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button || !menu) return;

    const buttonRect = button.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const margin = 8;
    let top = buttonRect.top - menuRect.height - margin;
    if (top < margin) {
      top = margin;
    }
    let left = buttonRect.right - menuRect.width;
    if (left < margin) left = margin;
    const maxLeft = window.innerWidth - menuRect.width - margin;
    if (left > maxLeft) left = maxLeft;

    setCoords({ top, left });
    setPositioned(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    setPositioned(false);
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    const handleReposition = () => updatePosition();
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [open, updatePosition]);

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={buttonClassName}
      >
        {buttonLabel}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            ref={menuRef}
            className="fixed z-50 w-48 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 text-xs shadow-[var(--shadow-md)]"
            style={{
              top: coords.top,
              left: coords.left,
              visibility: positioned ? 'visible' : 'hidden',
            }}
          >
            <Link
              href={`/admin/propostas/${proposal.id}`}
              className="block rounded-xl px-3 py-2 text-[color:var(--gray-700)] hover:bg-[var(--muted)]"
              onClick={() => setOpen(false)}
            >
              Ver dossie
            </Link>
            {(proposal.status === 'SUBMITTED' || proposal.status === 'UNDER_REVIEW') && (
              <Link
                href={`/admin/propostas/${proposal.id}?action=signature`}
                className="mt-1 block rounded-xl px-3 py-2 font-semibold text-[color:var(--primary-dark)] hover:bg-[color:var(--primary-soft)]"
                onClick={() => setOpen(false)}
              >
                Enviar para assinatura
              </Link>
            )}
            <Link
              href={`/admin/propostas/${proposal.id}?action=request`}
              className="mt-1 block rounded-xl px-3 py-2 text-[color:var(--gray-700)] hover:bg-[var(--muted)]"
              onClick={() => setOpen(false)}
            >
              Solicitar documento
            </Link>
            <Link
              href={`/admin/propostas/${proposal.id}?action=reject`}
              className="mt-1 block rounded-xl px-3 py-2 text-[color:var(--error)] hover:bg-[color:var(--error-soft)]"
              onClick={() => setOpen(false)}
            >
              Reprovar proposta
            </Link>
            {proposal.status === 'PENDING_SIGNATURE' && (
              <Link
                href={`/admin/propostas/${proposal.id}?action=resend`}
                className="mt-1 block rounded-xl px-3 py-2 text-[color:var(--gray-700)] hover:bg-[var(--muted)]"
                onClick={() => setOpen(false)}
              >
                Reenviar link
              </Link>
            )}
          </div>
        </>
      ) : null}
    </div>
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
    <div className="grid gap-3">
      {onSelectAll ? (
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gray-500)] lg:hidden">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected ?? false;
            }}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-[var(--border)] text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
            aria-label="Selecionar todas as propostas"
          />
          Selecionar todas
        </label>
      ) : null}

      <div className="admin-card hidden rounded-2xl lg:block">
        <div className="admin-table-wrap">
          <div className="admin-table-scroll">
            <table className="admin-table w-full text-left text-sm">
              <thead className="bg-[var(--gray-50)] text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
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
                        className="h-4 w-4 cursor-pointer rounded border-[var(--border)] text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
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
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={onSelectAll ? HEADERS.length + 2 : HEADERS.length + 1}
                      className="px-6 py-10 text-center text-sm text-[color:var(--gray-500)]"
                    >
                      Nenhuma proposta encontrada com os filtros atuais.
                    </td>
                  </tr>
                ) : null}
                {items.map((proposal) => {
                  const sla = resolveSla(proposal);
                  const updated = hasRecentUpdate(proposal);
                  return (
                    <tr
                      key={proposal.id}
                      className={cn(
                        'border-t border-[var(--border)] content-visibility-auto',
                        updated && 'bg-[color:var(--info-soft)]',
                        selectedIds?.has(proposal.id) && 'bg-[color:var(--primary-soft)]',
                      )}
                    >
                      {onSelectOne && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds?.has(proposal.id) ?? false}
                            onChange={(e) => onSelectOne(proposal.id, e.target.checked)}
                            className="h-4 w-4 cursor-pointer rounded border-[var(--border)] text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
                            aria-label={`Selecionar proposta ${proposal.protocol}`}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 font-semibold text-[color:var(--gray-900)]">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/propostas/${proposal.id}`}
                            className="hover:underline"
                          >
                            {proposal.protocol}
                          </Link>
                          {updated ? (
                            <span className="rounded-full bg-[color:var(--info)] px-2 py-0.5 text-[10px] font-bold text-white">
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
                            <span className="rounded-full border border-[color:var(--primary-light)] bg-[color:var(--primary-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[color:var(--primary-dark)]">
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
                            sla.tone === 'ok' &&
                              'border-[color:var(--success-border)] bg-[color:var(--success-soft)] text-[color:var(--success)]',
                            sla.tone === 'warning' &&
                              'border-[color:var(--warning-border)] bg-[color:var(--warning-soft)] text-[color:var(--warning)]',
                            sla.tone === 'danger' &&
                              'border-[color:var(--error-border)] bg-[color:var(--error-soft)] text-[color:var(--error)]',
                          )}
                        >
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full',
                              sla.tone === 'ok' && 'bg-[color:var(--success)]',
                              sla.tone === 'warning' && 'bg-[color:var(--warning)]',
                              sla.tone === 'danger' && 'bg-[color:var(--error)]',
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
                        <RowActionsMenu
                          proposal={proposal}
                          buttonLabel="⋮"
                          buttonClassName="cursor-pointer rounded-full border border-[var(--border)] bg-[var(--gray-50)] px-3 py-1 text-xs font-semibold text-[color:var(--gray-500)] hover:border-[var(--gray-300)]"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:hidden">
        {items.length === 0 ? (
          <div className="admin-card rounded-2xl p-6 text-center text-sm text-[color:var(--gray-500)]">
            Nenhuma proposta encontrada com os filtros atuais.
          </div>
        ) : null}
        {items.map((proposal) => {
          const sla = resolveSla(proposal);
          const updated = hasRecentUpdate(proposal);
          return (
            <div
              key={proposal.id}
              className={cn(
                'admin-card rounded-2xl p-4',
                updated && 'border-[color:var(--info-border)] bg-[color:var(--info-soft)]',
                selectedIds?.has(proposal.id) && 'border-[color:var(--primary)]',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/propostas/${proposal.id}`}
                      className="text-sm font-semibold text-[color:var(--gray-900)]"
                    >
                      {proposal.protocol}
                    </Link>
                    {updated ? (
                      <span className="rounded-full bg-[color:var(--info)] px-2 py-0.5 text-[10px] font-bold text-white">
                        Atualizado
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-[color:var(--gray-700)]">
                    {proposal.person?.fullName ?? '-'}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--gray-500)]">
                    {proposal.person?.cpfMasked ?? '-'}
                  </p>
                </div>
                {onSelectOne ? (
                  <input
                    type="checkbox"
                    checked={selectedIds?.has(proposal.id) ?? false}
                    onChange={(e) => onSelectOne(proposal.id, e.target.checked)}
                    className="mt-1 h-4 w-4 cursor-pointer rounded border-[var(--border)] text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
                    aria-label={`Selecionar proposta ${proposal.protocol}`}
                  />
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={proposal.status} />
                <span className="text-xs text-[color:var(--gray-500)]">{proposal.type}</span>
                {proposal.type === 'MIGRACAO' ? (
                  <span className="rounded-full border border-[color:var(--primary-light)] bg-[color:var(--primary-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[color:var(--primary-dark)]">
                    Migracao
                  </span>
                ) : null}
              </div>

              <div className="mt-3 grid gap-2 text-xs text-[color:var(--gray-500)]">
                <div className="flex items-center justify-between">
                  <span>Criada</span>
                  <span>{new Date(proposal.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Analista</span>
                  <span>{proposal.assignedAnalyst?.name ?? 'Nao atribuido'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>SLA</span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[11px] font-semibold',
                      sla.tone === 'ok' &&
                        'border-[color:var(--success-border)] bg-[color:var(--success-soft)] text-[color:var(--success)]',
                      sla.tone === 'warning' &&
                        'border-[color:var(--warning-border)] bg-[color:var(--warning-soft)] text-[color:var(--warning)]',
                      sla.tone === 'danger' &&
                        'border-[color:var(--error-border)] bg-[color:var(--error-soft)] text-[color:var(--error)]',
                    )}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        sla.tone === 'ok' && 'bg-[color:var(--success)]',
                        sla.tone === 'warning' && 'bg-[color:var(--warning)]',
                        sla.tone === 'danger' && 'bg-[color:var(--error)]',
                      )}
                      aria-hidden="true"
                    />
                    {sla.label}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <Link
                  href={`/admin/propostas/${proposal.id}`}
                  className="text-xs font-semibold text-[color:var(--primary-dark)]"
                >
                  Ver dossie
                </Link>
                <RowActionsMenu
                  proposal={proposal}
                  buttonLabel="Acoes"
                  buttonClassName="cursor-pointer rounded-full border border-[var(--border)] bg-[var(--gray-50)] px-3 py-1 text-xs font-semibold text-[color:var(--gray-500)]"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

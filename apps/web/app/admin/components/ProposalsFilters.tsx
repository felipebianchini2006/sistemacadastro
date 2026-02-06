'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

export type ProposalFilters = {
  status?: string[];
  type?: string;
  sla?: string;
  dateFrom?: string;
  dateTo?: string;
  text?: string;
  profileRoles?: string[];
};

const statusOptions = [
  { value: 'SUBMITTED', label: 'Aguardando analise' },
  { value: 'UNDER_REVIEW', label: 'Em analise' },
  { value: 'PENDING_DOCS', label: 'Pendente documento' },
  { value: 'PENDING_SIGNATURE', label: 'Aguardando assinatura' },
  { value: 'SIGNED', label: 'Assinado' },
  { value: 'APPROVED', label: 'Filiacao concluida' },
  { value: 'REJECTED', label: 'Reprovado' },
];

const typeOptions = [
  { value: '', label: 'Todos' },
  { value: 'NOVO', label: 'Novo' },
  { value: 'MIGRACAO', label: 'Migracao' },
];

const slaOptions = [
  { value: '', label: 'Todos' },
  { value: 'OK', label: 'Verde' },
  { value: 'DUE_SOON', label: 'Amarelo' },
  { value: 'BREACHED', label: 'Vermelho' },
];

const profileRoleOptions = [
  { value: 'AUTOR', label: 'Autor' },
  { value: 'COMPOSITOR', label: 'Compositor' },
  { value: 'INTERPRETE', label: 'Interprete' },
  { value: 'EDITORA', label: 'Editora' },
  { value: 'PRODUTOR', label: 'Produtor' },
  { value: 'OUTRO', label: 'Outro' },
];

export const ProposalsFilters = ({
  filters,
  onChange,
  onClear,
}: {
  filters: ProposalFilters;
  onChange: (filters: ProposalFilters) => void;
  onClear: () => void;
}) => {
  const memoFilters = useMemo(() => ({ ...filters }), [filters]);
  const [searchText, setSearchText] = useState(memoFilters.text ?? '');
  const [sheetOpen, setSheetOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(searchText, 500);
  const selectedStatuses = memoFilters.status ?? [];
  const selectedProfileRoles = memoFilters.profileRoles ?? [];
  const toggleProfileRole = (value: string) => {
    const next = new Set(selectedProfileRoles);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    const list = Array.from(next);
    onChange({ ...memoFilters, profileRoles: list.length ? list : undefined });
  };
  const toggleStatus = (value: string) => {
    const next = new Set(selectedStatuses);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    const list = Array.from(next);
    onChange({ ...memoFilters, status: list.length ? list : undefined });
  };

  useEffect(() => {
    setSearchText(memoFilters.text ?? '');
  }, [memoFilters.text]);

  useEffect(() => {
    const current = memoFilters.text ?? '';
    if (debouncedSearch === current) return;
    onChange({ ...memoFilters, text: debouncedSearch || undefined });
  }, [debouncedSearch, memoFilters, onChange]);

  const formatDateShort = (value?: string) => {
    if (!value) return '';
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return value;
    return `${day}/${month}`;
  };

  const typeLabel = typeOptions.find((option) => option.value === memoFilters.type)?.label;
  const slaLabel = slaOptions.find((option) => option.value === memoFilters.sla)?.label;

  const chips = useMemo(() => {
    const list: Array<{ key: string; label: string; onRemove: () => void }> = [];
    selectedStatuses.forEach((status) => {
      const label = statusOptions.find((option) => option.value === status)?.label ?? status;
      list.push({
        key: `status-${status}`,
        label,
        onRemove: () => toggleStatus(status),
      });
    });
    if (memoFilters.type) {
      list.push({
        key: 'type',
        label: `Tipo: ${typeLabel ?? memoFilters.type}`,
        onRemove: () => onChange({ ...memoFilters, type: undefined }),
      });
    }
    if (memoFilters.sla) {
      list.push({
        key: 'sla',
        label: `SLA: ${slaLabel ?? memoFilters.sla}`,
        onRemove: () => onChange({ ...memoFilters, sla: undefined }),
      });
    }
    if (memoFilters.dateFrom || memoFilters.dateTo) {
      list.push({
        key: 'period',
        label: `Periodo: ${formatDateShort(memoFilters.dateFrom) || '--'} - ${
          formatDateShort(memoFilters.dateTo) || '--'
        }`,
        onRemove: () => onChange({ ...memoFilters, dateFrom: undefined, dateTo: undefined }),
      });
    }
    if (memoFilters.text) {
      list.push({
        key: 'text',
        label: `Busca: ${memoFilters.text}`,
        onRemove: () => onChange({ ...memoFilters, text: undefined }),
      });
    }
    selectedProfileRoles.forEach((role) => {
      const label = profileRoleOptions.find((option) => option.value === role)?.label ?? role;
      list.push({
        key: `role-${role}`,
        label: `Perfil: ${label}`,
        onRemove: () => toggleProfileRole(role),
      });
    });
    return list;
  }, [
    memoFilters,
    onChange,
    selectedStatuses,
    selectedProfileRoles,
    toggleStatus,
    toggleProfileRole,
    typeLabel,
    slaLabel,
  ]);

  return (
    <div className="admin-card rounded-2xl p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="admin-search flex-1">
            <Search className="h-4 w-4" aria-hidden="true" />
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Buscar por nome ou CPF..."
            />
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[color:var(--gray-700)]"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filtros
            </button>
          </div>

          <div className="hidden flex-wrap items-center gap-2 md:flex">
            <select
              value={memoFilters.type ?? ''}
              onChange={(event) =>
                onChange({ ...memoFilters, type: event.target.value || undefined })
              }
              className="admin-field w-40"
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={memoFilters.sla ?? ''}
              onChange={(event) =>
                onChange({ ...memoFilters, sla: event.target.value || undefined })
              }
              className="admin-field w-36"
            >
              {slaOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <details className="relative">
              <summary className="admin-field flex cursor-pointer items-center justify-between gap-3">
                Perfil artista
                <ChevronDown className="h-4 w-4 text-[color:var(--gray-500)]" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-md)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
                  Tipo de artista
                </p>
                <div className="mt-3 grid gap-2">
                  {profileRoleOptions.map((option) => {
                    const checked = selectedProfileRoles.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition',
                          checked
                            ? 'border-[color:var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--gray-900)]'
                            : 'border-[var(--border)] bg-transparent text-[color:var(--gray-700)] hover:bg-[var(--gray-50)]',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProfileRole(option.value)}
                          className="h-4 w-4 rounded border-[var(--gray-300)] text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </details>
            <details className="relative">
              <summary className="admin-field flex cursor-pointer items-center justify-between gap-3">
                Status
                <ChevronDown className="h-4 w-4 text-[color:var(--gray-500)]" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-md)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
                  Status
                </p>
                <div className="mt-3 grid gap-2">
                  {statusOptions.map((option) => {
                    const checked = selectedStatuses.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition',
                          checked
                            ? 'border-[color:var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--gray-900)]'
                            : 'border-[var(--border)] bg-transparent text-[color:var(--gray-700)] hover:bg-[var(--gray-50)]',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStatus(option.value)}
                          className="h-4 w-4 rounded border-[var(--gray-300)] text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-4 grid gap-2">
                  <label className="text-xs text-[color:var(--gray-500)]">
                    Data inicial
                    <input
                      type="date"
                      value={memoFilters.dateFrom ?? ''}
                      onChange={(event) =>
                        onChange({ ...memoFilters, dateFrom: event.target.value || undefined })
                      }
                      className="admin-field mt-2"
                    />
                  </label>
                  <label className="text-xs text-[color:var(--gray-500)]">
                    Data final
                    <input
                      type="date"
                      value={memoFilters.dateTo ?? ''}
                      onChange={(event) =>
                        onChange({ ...memoFilters, dateTo: event.target.value || undefined })
                      }
                      className="admin-field mt-2"
                    />
                  </label>
                </div>
              </div>
            </details>
            <Button variant="secondary" onClick={onClear}>
              Limpar
            </Button>
          </div>
        </div>

        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span key={chip.key} className="admin-chip">
                {chip.label}
                <button type="button" onClick={chip.onRemove} aria-label="Remover filtro">
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {sheetOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/30 p-4 md:hidden"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="w-full rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-xl)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
                  Filtros
                </p>
                <h3 className="text-lg font-semibold text-[color:var(--gray-900)]">Propostas</h3>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[color:var(--gray-500)]"
                aria-label="Fechar filtros"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 grid gap-4">
              <fieldset className="flex flex-col gap-2 text-sm text-[color:var(--gray-500)]">
                <legend className="font-medium text-[color:var(--gray-700)]">Status</legend>
                <div className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--gray-50)] p-3">
                  {statusOptions.map((option) => {
                    const checked = selectedStatuses.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition',
                          checked
                            ? 'border-[color:var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--gray-900)]'
                            : 'border-[var(--border)] bg-transparent text-[color:var(--gray-700)]',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStatus(option.value)}
                          className="h-4 w-4 rounded border-[var(--gray-300)] text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <label className="flex flex-col gap-2 text-sm text-[color:var(--gray-500)]">
                Tipo
                <select
                  value={memoFilters.type ?? ''}
                  onChange={(event) =>
                    onChange({ ...memoFilters, type: event.target.value || undefined })
                  }
                  className="admin-field"
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-[color:var(--gray-500)]">
                SLA
                <select
                  value={memoFilters.sla ?? ''}
                  onChange={(event) =>
                    onChange({ ...memoFilters, sla: event.target.value || undefined })
                  }
                  className="admin-field"
                >
                  {slaOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="flex flex-col gap-2 text-sm text-[color:var(--gray-500)]">
                <legend className="font-medium text-[color:var(--gray-700)]">Perfil artista</legend>
                <div className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--gray-50)] p-3">
                  {profileRoleOptions.map((option) => {
                    const checked = selectedProfileRoles.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition',
                          checked
                            ? 'border-[color:var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--gray-900)]'
                            : 'border-[var(--border)] bg-transparent text-[color:var(--gray-700)]',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProfileRole(option.value)}
                          className="h-4 w-4 rounded border-[var(--gray-300)] text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <label className="flex flex-col gap-2 text-sm text-[color:var(--gray-500)]">
                Data inicial
                <input
                  type="date"
                  value={memoFilters.dateFrom ?? ''}
                  onChange={(event) =>
                    onChange({ ...memoFilters, dateFrom: event.target.value || undefined })
                  }
                  className="admin-field"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-[color:var(--gray-500)]">
                Data final
                <input
                  type="date"
                  value={memoFilters.dateTo ?? ''}
                  onChange={(event) =>
                    onChange({ ...memoFilters, dateTo: event.target.value || undefined })
                  }
                  className="admin-field"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button variant="secondary" className="flex-1" onClick={onClear}>
                Limpar
              </Button>
              <Button className="flex-1" onClick={() => setSheetOpen(false)}>
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

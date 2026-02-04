'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const debouncedSearch = useDebouncedValue(searchText, 500);
  const selectedStatuses = memoFilters.status ?? [];
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

  return (
    <div className="admin-card rounded-3xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-[color:var(--gray-900)]">Filtros</h3>
        <Button variant="secondary" onClick={onClear} className="w-full sm:w-auto">
          Limpar
        </Button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <fieldset className="flex flex-col gap-2 text-sm text-[color:var(--gray-500)]">
          <legend className="font-medium text-[color:var(--gray-700)]">Status</legend>
          <div className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/60 p-3 sm:grid-cols-2">
            {statusOptions.map((option) => {
              const checked = selectedStatuses.includes(option.value);
              return (
                <label
                  key={option.value}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition',
                    checked
                      ? 'border-[color:var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--gray-900)]'
                      : 'border-[var(--border)] bg-transparent text-[color:var(--gray-700)] hover:bg-[color:rgba(255,255,255,0.04)]',
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
            onChange={(event) => onChange({ ...memoFilters, sla: event.target.value || undefined })}
            className="admin-field"
          >
            {slaOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
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
        <label className="flex flex-col gap-2 text-sm text-[color:var(--gray-500)]">
          Busca
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Nome ou CPF"
            className="admin-field"
          />
        </label>
      </div>
    </div>
  );
};

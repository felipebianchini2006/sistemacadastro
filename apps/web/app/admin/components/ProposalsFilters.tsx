'use client';

import { useMemo } from 'react';
import { Button } from '../../components/ui/button';

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

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-zinc-900">Filtros</h3>
        <Button variant="secondary" onClick={onClear}>
          Limpar
        </Button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <fieldset className="flex flex-col gap-2 text-sm text-zinc-600">
          <legend className="font-medium text-zinc-700">Status</legend>
          <div className="grid gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            {statusOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(option.value)}
                  onChange={() => toggleStatus(option.value)}
                  className="h-4 w-4 rounded border-zinc-300 text-orange-500 focus:ring-orange-200"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-2 text-sm text-zinc-600">
          Tipo
          <select
            value={memoFilters.type ?? ''}
            onChange={(event) =>
              onChange({ ...memoFilters, type: event.target.value || undefined })
            }
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-zinc-600">
          SLA
          <select
            value={memoFilters.sla ?? ''}
            onChange={(event) => onChange({ ...memoFilters, sla: event.target.value || undefined })}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            {slaOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-zinc-600">
          Data inicial
          <input
            type="date"
            value={memoFilters.dateFrom ?? ''}
            onChange={(event) =>
              onChange({ ...memoFilters, dateFrom: event.target.value || undefined })
            }
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-zinc-600">
          Data final
          <input
            type="date"
            value={memoFilters.dateTo ?? ''}
            onChange={(event) =>
              onChange({ ...memoFilters, dateTo: event.target.value || undefined })
            }
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-zinc-600">
          Busca
          <input
            value={memoFilters.text ?? ''}
            onChange={(event) =>
              onChange({ ...memoFilters, text: event.target.value || undefined })
            }
            placeholder="Nome ou CPF"
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
          />
        </label>
      </div>
    </div>
  );
};

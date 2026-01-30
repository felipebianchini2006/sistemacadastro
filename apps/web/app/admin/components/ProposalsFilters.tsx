'use client';

import { useMemo } from 'react';
import { Button } from '../../components/ui/button';

export type ProposalFilters = {
  status?: string;
  type?: string;
  sla?: string;
  dateFrom?: string;
  dateTo?: string;
  text?: string;
};

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'SUBMITTED', label: 'Recebida' },
  { value: 'UNDER_REVIEW', label: 'Em analise' },
  { value: 'PENDING_DOCS', label: 'Pendencia docs' },
  { value: 'PENDING_SIGNATURE', label: 'Pendencia assinatura' },
  { value: 'APPROVED', label: 'Aprovada' },
  { value: 'REJECTED', label: 'Reprovada' },
  { value: 'SIGNED', label: 'Assinada' },
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

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-zinc-900">Filtros</h3>
        <Button variant="secondary" onClick={onClear}>
          Limpar
        </Button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm text-zinc-600">
          Status
          <select
            value={memoFilters.status ?? ''}
            onChange={(event) =>
              onChange({ ...memoFilters, status: event.target.value || undefined })
            }
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
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

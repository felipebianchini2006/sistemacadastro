'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminFetchWithRefresh } from '../lib/api';
import { ProposalsFilters, type ProposalFilters } from '../components/ProposalsFilters';
import { ProposalsTable, type ProposalListItem } from '../components/ProposalsTable';
import { Pagination } from '../components/Pagination';
import { Button } from '../../components/ui/button';

const PAGE_SIZE = 20;

const buildQuery = (filters: ProposalFilters) => {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.type) params.set('type', filters.type);
  if (filters.sla) params.set('sla', filters.sla);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.text) params.set('text', filters.text);
  return params.toString();
};

const downloadCsv = (items: ProposalListItem[]) => {
  const header = ['Protocolo', 'Status', 'Tipo', 'Nome', 'CPF', 'Criada', 'Analista'];
  const rows = items.map((item) => [
    item.protocol,
    item.status,
    item.type,
    item.person?.fullName ?? '',
    item.person?.cpfMasked ?? '',
    new Date(item.createdAt).toISOString(),
    item.assignedAnalyst?.name ?? '',
  ]);

  const lines = [header, ...rows]
    .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([lines], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'propostas.csv';
  link.click();
  URL.revokeObjectURL(url);
};

export default function AdminProposalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ProposalFilters>({
    status: searchParams.get('status') ?? undefined,
    type: searchParams.get('type') ?? undefined,
    sla: searchParams.get('sla') ?? undefined,
    dateFrom: searchParams.get('dateFrom') ?? undefined,
    dateTo: searchParams.get('dateTo') ?? undefined,
    text: searchParams.get('text') ?? undefined,
  });
  const [items, setItems] = useState<ProposalListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const query = useMemo(() => buildQuery(filters), [filters]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await adminFetchWithRefresh<ProposalListItem[]>(
          query ? `/admin/proposals?${query}` : '/admin/proposals',
        );
        setItems(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar propostas');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [query]);

  useEffect(() => {
    const params = new URLSearchParams(query);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    router.replace(qs ? `/admin/propostas?${qs}` : '/admin/propostas');
  }, [page, query, router]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Propostas</h2>
          <p className="mt-1 text-sm text-zinc-500">Consulte, filtre e exporte.</p>
        </div>
        <Button variant="secondary" onClick={() => downloadCsv(items)}>
          Exportar CSV
        </Button>
      </div>

      <ProposalsFilters
        filters={filters}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
        onClear={() => {
          setFilters({});
          setPage(1);
        }}
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
          Carregando propostas...
        </div>
      ) : null}

      <ProposalsTable items={pageItems} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

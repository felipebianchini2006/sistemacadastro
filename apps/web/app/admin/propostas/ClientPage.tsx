'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminFetchWithRefresh } from '../lib/api';
import { ProposalsFilters, type ProposalFilters } from '../components/ProposalsFilters';
import { BulkActions } from '../components/BulkActions';
import { AnalystSelector, type Analyst } from '../components/AnalystSelector';
import {
  ProposalsTable,
  type ProposalListItem,
  type SortField,
  type SortState,
} from '../components/ProposalsTable';
import { ProposalsTableSkeleton } from '../components/ProposalsTableSkeleton';
import { Pagination } from '../components/Pagination';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { ChevronDown } from 'lucide-react';

const PAGE_SIZE = 20;
const SERVER_SORT_FIELDS = new Set<SortField>([
  'createdAt',
  'protocol',
  'status',
  'type',
  'fullName',
]);

const buildApiQuery = (
  filters: ProposalFilters,
  sort?: SortState,
  page?: number,
  pageSize?: number,
) => {
  const params = new URLSearchParams();
  if (filters.status?.length) params.set('status', filters.status.join(','));
  if (filters.type) params.set('type', filters.type);
  if (filters.sla) params.set('sla', filters.sla);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.text) params.set('text', filters.text);
  if (filters.profileRoles?.length) params.set('profileRoles', filters.profileRoles.join(','));
  if (sort && SERVER_SORT_FIELDS.has(sort.field)) {
    params.set('sortBy', sort.field);
    params.set('sortDir', sort.dir);
  }
  if (page) params.set('page', String(page));
  if (pageSize) params.set('pageSize', String(pageSize));
  return params.toString();
};

const buildUrlQuery = (filters: ProposalFilters) => {
  const params = new URLSearchParams();
  if (filters.status?.length) params.set('status', filters.status.join(','));
  if (filters.type) params.set('type', filters.type);
  if (filters.sla) params.set('sla', filters.sla);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.text) params.set('text', filters.text);
  if (filters.profileRoles?.length) params.set('profileRoles', filters.profileRoles.join(','));
  return params.toString();
};

const normalizeDigits = (value?: string | null) => (value ? value.replace(/\D/g, '') : '');

const resolveSlaScore = (proposal: ProposalListItem) => {
  const now = Date.now();
  const breachedAt = proposal.sla?.breachedAt ? new Date(proposal.sla.breachedAt).getTime() : null;
  if (breachedAt) return { rank: 2, days: 999 };

  const startedAt = proposal.sla?.startedAt ?? proposal.createdAt;
  const startedMs = startedAt ? new Date(startedAt).getTime() : now;
  const days = Math.max(0, Math.floor((now - startedMs) / (1000 * 60 * 60 * 24)));

  if (days >= 8) return { rank: 2, days };
  if (days >= 4) return { rank: 1, days };
  return { rank: 0, days };
};

const resolveSortValue = (item: ProposalListItem, field: SortField) => {
  if (field === 'protocol') return item.protocol;
  if (field === 'fullName') return item.person?.fullName ?? '';
  if (field === 'cpf') return normalizeDigits(item.person?.cpfMasked);
  if (field === 'status') return item.status;
  if (field === 'type') return item.type;
  if (field === 'createdAt') return new Date(item.createdAt).getTime();
  if (field === 'analyst') return item.assignedAnalyst?.name ?? '';
  if (field === 'sla') {
    const score = resolveSlaScore(item);
    return score.rank * 1000 + score.days;
  }
  return '';
};

const sortItems = (items: ProposalListItem[], sort?: SortState) => {
  if (!sort) return items;
  const list = [...items];
  const direction = sort.dir === 'asc' ? 1 : -1;
  list.sort((a, b) => {
    const valueA = resolveSortValue(a, sort.field);
    const valueB = resolveSortValue(b, sort.field);
    if (valueA === '' || valueA === null || valueA === undefined) return 1;
    if (valueB === '' || valueB === null || valueB === undefined) return -1;
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return (valueA - valueB) * direction;
    }
    return (
      String(valueA).localeCompare(String(valueB), 'pt-BR', {
        sensitivity: 'base',
        numeric: true,
      }) * direction
    );
  });
  return list;
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

const downloadExcel = (items: ProposalListItem[]) => {
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

  const escapeXml = (val: string) =>
    val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const headerCells = header
    .map((h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`)
    .join('');
  const headerRow = `<Row ss:StyleID="header">${headerCells}</Row>`;

  const dataRows = rows
    .map((row) => {
      const cells = row
        .map((val) => `<Cell><Data ss:Type="String">${escapeXml(String(val))}</Data></Cell>`)
        .join('');
      return `<Row>${cells}</Row>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal"/>
    <Style ss:ID="header">
      <Font ss:Bold="1"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Propostas">
    <Table>
      ${headerRow}
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'propostas.xls';
  link.click();
  URL.revokeObjectURL(url);
};

type BulkStatus = 'UNDER_REVIEW' | 'PENDING_DOCS' | 'REJECTED' | 'CANCELED';
type ProposalListResponse = {
  items: ProposalListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export default function ClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status') ?? '';
  const parsedStatus = statusParam
    ? statusParam
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : undefined;
  const [filters, setFilters] = useState<ProposalFilters>({
    status: parsedStatus,
    type: searchParams.get('type') ?? undefined,
    sla: searchParams.get('sla') ?? undefined,
    dateFrom: searchParams.get('dateFrom') ?? undefined,
    dateTo: searchParams.get('dateTo') ?? undefined,
    text: searchParams.get('text') ?? undefined,
    profileRoles: searchParams.get('profileRoles')
      ? searchParams
          .get('profileRoles')!
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      : undefined,
  });
  const [items, setItems] = useState<ProposalListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [sort, setSort] = useState<SortState>({ field: 'createdAt', dir: 'desc' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const [assignAnalystId, setAssignAnalystId] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState<BulkStatus>('UNDER_REVIEW');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkMissingItems, setBulkMissingItems] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const apiQuery = useMemo(
    () => buildApiQuery(filters, sort, page, PAGE_SIZE),
    [filters, sort, page],
  );
  const urlQuery = useMemo(() => buildUrlQuery(filters), [filters]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await adminFetchWithRefresh<ProposalListResponse>(
          apiQuery ? `/admin/proposals?${apiQuery}` : '/admin/proposals',
        );
        setItems(response.items ?? []);
        setTotal(response.total ?? 0);
        const totalPages = Math.max(1, Math.ceil((response.total ?? 0) / PAGE_SIZE));
        if (page > totalPages) {
          setPage(totalPages);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar propostas');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [apiQuery]);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const available = new Set(items.map((item) => item.id));
      const next = new Set(Array.from(prev).filter((id) => available.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  useEffect(() => {
    const params = new URLSearchParams(urlQuery);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    router.replace(qs ? `/admin/propostas?${qs}` : '/admin/propostas');
  }, [page, urlQuery, router]);

  const tableItems = useMemo(() => {
    if (!sort || SERVER_SORT_FIELDS.has(sort.field)) return items;
    return sortItems(items, sort);
  }, [items, sort]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSort = useCallback((field: SortField) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
    setPage(1);
  }, []);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds],
  );

  const openAssignModal = async () => {
    setBulkError(null);
    setAssignAnalystId(null);
    setShowAssignModal(true);
    try {
      const response = await adminFetchWithRefresh<{ analysts: Analyst[] }>('/admin/analysts');
      setAnalysts(response.analysts ?? []);
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Falha ao carregar analistas');
    }
  };

  const openStatusModal = () => {
    setBulkError(null);
    setBulkStatus('UNDER_REVIEW');
    setBulkReason('');
    setBulkMissingItems('');
    setShowStatusModal(true);
  };

  const handleBulkAssign = async () => {
    if (!assignAnalystId) {
      setBulkError('Selecione um analista');
      return;
    }
    setBulkLoading(true);
    setBulkError(null);
    try {
      await adminFetchWithRefresh('/admin/proposals/bulk/assign', {
        method: 'POST',
        body: {
          proposalIds: Array.from(selectedIds),
          analystId: assignAnalystId,
        },
      });
      setShowAssignModal(false);
      setSelectedIds(new Set());
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Falha ao atribuir propostas');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkStatus = async () => {
    setBulkLoading(true);
    setBulkError(null);
    try {
      const payload: Record<string, unknown> = {
        proposalIds: Array.from(selectedIds),
        status: bulkStatus,
      };
      if (bulkStatus === 'REJECTED') {
        const reason = bulkReason.trim();
        if (!reason) {
          setBulkError('Informe o motivo da reprovacao');
          setBulkLoading(false);
          return;
        }
        payload.reason = reason;
      }
      if (bulkStatus === 'PENDING_DOCS') {
        const missingItems = bulkMissingItems
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        if (missingItems.length === 0) {
          setBulkError('Informe os documentos pendentes');
          setBulkLoading(false);
          return;
        }
        payload.missingItems = missingItems;
      }
      await adminFetchWithRefresh('/admin/proposals/bulk/status', {
        method: 'POST',
        body: payload,
      });
      setShowStatusModal(false);
      setSelectedIds(new Set());
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Falha ao atualizar status');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[color:var(--gray-900)]">Propostas</h2>
          <p className="mt-1 text-sm text-[color:var(--gray-500)]">Consulte, filtre e exporte.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <details className="relative">
            <summary className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[color:var(--gray-700)]">
              Exportar
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-48 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-[var(--shadow-md)]">
              <button
                type="button"
                onClick={(event) => {
                  downloadCsv(tableItems);
                  (
                    event.currentTarget.closest('details') as HTMLDetailsElement | null
                  )?.removeAttribute('open');
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-[color:var(--gray-700)] hover:bg-[var(--gray-50)]"
              >
                Exportar CSV
              </button>
              <button
                type="button"
                onClick={(event) => {
                  downloadExcel(tableItems);
                  (
                    event.currentTarget.closest('details') as HTMLDetailsElement | null
                  )?.removeAttribute('open');
                }}
                className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-[color:var(--gray-700)] hover:bg-[var(--gray-50)]"
              >
                Exportar Excel
              </button>
            </div>
          </details>
        </div>
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

      <BulkActions
        selectedCount={selectedIds.size}
        onAssign={openAssignModal}
        onChangeStatus={openStatusModal}
        onExport={() => downloadCsv(selectedItems)}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      <div aria-live="polite" role="status">
        {error ? (
          <div
            className="rounded-2xl border border-[color:var(--error-border)] bg-[color:var(--error-soft)] px-4 py-3 text-sm text-[color:var(--error)]"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {loading && items.length > 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[color:var(--gray-500)]">
            Atualizando propostas...
          </div>
        ) : null}
      </div>

      {loading && items.length === 0 ? (
        <ProposalsTableSkeleton />
      ) : (
        <ProposalsTable
          items={tableItems}
          sort={sort}
          onSort={handleSort}
          selectedIds={selectedIds}
          onSelectAll={(checked) => {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (checked) {
                tableItems.forEach((item) => next.add(item.id));
              } else {
                tableItems.forEach((item) => next.delete(item.id));
              }
              return next;
            });
          }}
          onSelectOne={(id, checked) => {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (checked) {
                next.add(id);
              } else {
                next.delete(id);
              }
              return next;
            });
          }}
        />
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal
        open={showAssignModal}
        title="Atribuir analista"
        description={`Selecione um analista para ${selectedIds.size} ${
          selectedIds.size === 1 ? 'proposta' : 'propostas'
        }.`}
        onClose={() => setShowAssignModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAssignModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBulkAssign} disabled={bulkLoading}>
              {bulkLoading ? 'Salvando...' : 'Atribuir'}
            </Button>
          </>
        }
      >
        <AnalystSelector
          value={assignAnalystId ?? undefined}
          analysts={analysts}
          onChange={(value) => setAssignAnalystId(value)}
        />
        {bulkError ? (
          <div className="mt-3 rounded-xl border border-[color:var(--error-border)] bg-[color:var(--error-soft)] px-3 py-2 text-xs text-[color:var(--error)]">
            {bulkError}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={showStatusModal}
        title="Alterar status"
        description={`Atualize o status de ${selectedIds.size} ${
          selectedIds.size === 1 ? 'proposta' : 'propostas'
        }.`}
        onClose={() => setShowStatusModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBulkStatus} disabled={bulkLoading}>
              {bulkLoading ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <label className="text-sm text-[color:var(--gray-700)]">
            Status
            <select
              value={bulkStatus}
              onChange={(event) => setBulkStatus(event.target.value as BulkStatus)}
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
            >
              <option value="UNDER_REVIEW">Em analise</option>
              <option value="PENDING_DOCS">Pendente documento</option>
              <option value="REJECTED">Reprovada</option>
              <option value="CANCELED">Cancelada</option>
            </select>
          </label>

          {bulkStatus === 'PENDING_DOCS' ? (
            <label className="text-sm text-[color:var(--gray-700)]">
              Documentos pendentes
              <input
                value={bulkMissingItems}
                onChange={(event) => setBulkMissingItems(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                placeholder="RG frente, comprovante de residencia"
              />
            </label>
          ) : null}

          {bulkStatus === 'REJECTED' ? (
            <label className="text-sm text-[color:var(--gray-700)]">
              Motivo
              <textarea
                value={bulkReason}
                onChange={(event) => setBulkReason(event.target.value)}
                className="mt-2 min-h-[96px] w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                placeholder="Explique o motivo da reprovação"
              />
            </label>
          ) : null}
        </div>
        {bulkError ? (
          <div className="mt-3 rounded-xl border border-[color:var(--error-border)] bg-[color:var(--error-soft)] px-3 py-2 text-xs text-[color:var(--error)]">
            {bulkError}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

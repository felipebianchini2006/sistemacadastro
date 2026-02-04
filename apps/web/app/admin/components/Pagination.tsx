'use client';

import { Button } from '../../components/ui/button';

export const Pagination = ({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="admin-card flex flex-col gap-3 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs text-[color:var(--gray-500)]">
        Pagina {page} de {totalPages}
      </span>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <Button
          variant="secondary"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="w-full sm:w-auto"
        >
          Anterior
        </Button>
        <Button
          variant="secondary"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="w-full sm:w-auto"
        >
          Proxima
        </Button>
      </div>
    </div>
  );
};

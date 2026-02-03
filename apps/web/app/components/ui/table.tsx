'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export const TableContainer = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('w-full overflow-x-auto', className)} {...props} />
);

export const Table = ({ className, ...props }: HTMLAttributes<HTMLTableElement>) => (
  <table className={cn('w-full text-left text-sm', className)} {...props} />
);

export const TableHead = ({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) => (
  <th
    scope="col"
    className={cn(
      'px-4 py-3 text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]',
      className,
    )}
    {...props}
  />
);

export const TableRow = ({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('border-t border-[var(--border)]', className)} {...props} />
);

export const TableCell = ({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-4 py-3 text-[color:var(--gray-700)]', className)} {...props} />
);

export const TableHeader = ({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn('bg-[var(--muted)]', className)} {...props} />
);

export const TableBody = ({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn('bg-[var(--card)]', className)} {...props} />
);

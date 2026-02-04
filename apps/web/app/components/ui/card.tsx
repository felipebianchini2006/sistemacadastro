'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: 'default' | 'glass' | 'muted';
};

export const Card = ({ className, tone = 'default', ...props }: CardProps) => (
  <div
    className={cn(
      'rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)]',
      tone === 'glass' && 'surface-glass',
      tone === 'muted' && 'bg-[var(--muted)]',
      className,
    )}
    {...props}
  />
);

export const CardHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-2 p-6', className)} {...props} />
);

export const CardTitle = ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-lg font-semibold text-[color:var(--gray-900)]', className)} {...props} />
);

export const CardDescription = ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-[color:var(--gray-500)]', className)} {...props} />
);

export const CardContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-6 pt-0', className)} {...props} />
);

export const CardFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-wrap items-center gap-3 p-6 pt-0', className)} {...props} />
);

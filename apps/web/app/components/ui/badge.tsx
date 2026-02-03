'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type BadgeTone = 'default' | 'success' | 'warning' | 'error' | 'info';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const toneStyles: Record<BadgeTone, string> = {
  default: 'border-[var(--border)] bg-[var(--gray-100)] text-[color:var(--gray-700)]',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  error: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
};

export const Badge = ({ className, tone = 'default', ...props }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]',
      toneStyles[tone],
      className,
    )}
    {...props}
  />
);

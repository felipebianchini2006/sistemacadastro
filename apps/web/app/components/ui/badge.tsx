'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type BadgeTone = 'default' | 'success' | 'warning' | 'error' | 'info';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const toneStyles: Record<BadgeTone, string> = {
  default: 'border-[var(--border)] bg-[var(--muted)] text-[color:var(--gray-700)]',
  success:
    'border-[color:var(--success-border)] bg-[color:var(--success-soft)] text-[color:var(--success)]',
  warning:
    'border-[color:var(--warning-border)] bg-[color:var(--warning-soft)] text-[color:var(--warning)]',
  error:
    'border-[color:var(--error-border)] bg-[color:var(--error-soft)] text-[color:var(--error)]',
  info: 'border-[color:var(--info-border)] bg-[color:var(--info-soft)] text-[color:var(--info)]',
};

export const Badge = ({ className, tone = 'default', ...props }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
      toneStyles[tone],
      className,
    )}
    {...props}
  />
);

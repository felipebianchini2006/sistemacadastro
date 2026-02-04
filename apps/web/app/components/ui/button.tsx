'use client';

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent';
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' &&
          'bg-[var(--primary)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-dark)]',
        variant === 'secondary' &&
          'border border-[var(--border)] bg-[var(--card)] text-[color:var(--gray-700)] hover:border-[color:var(--primary)] hover:text-[color:var(--gray-900)]',
        variant === 'ghost' &&
          'bg-transparent text-[color:var(--gray-700)] hover:bg-[var(--muted)]',
        variant === 'accent' &&
          'bg-[var(--primary)] text-white shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)]',
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = 'Button';

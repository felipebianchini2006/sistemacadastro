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
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary-light)] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' &&
          'bg-[var(--primary)] text-white shadow-md shadow-orange-200/70 hover:bg-[var(--primary-dark)]',
        variant === 'secondary' &&
          'border border-[var(--border)] bg-white text-[color:var(--gray-700)] hover:border-[var(--gray-300)]',
        variant === 'ghost' &&
          'bg-transparent text-[color:var(--gray-700)] hover:bg-[var(--gray-100)]',
        variant === 'accent' &&
          'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white shadow-lg shadow-orange-200/70 hover:from-[var(--primary-dark)] hover:to-[#d94f20]',
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = 'Button';

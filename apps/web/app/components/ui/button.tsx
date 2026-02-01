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
        'inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition',
        'focus:outline-none focus:ring-2 focus:ring-emerald-200',
        variant === 'primary' &&
          'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200/60',
        variant === 'secondary' &&
          'border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300',
        variant === 'ghost' && 'bg-transparent text-zinc-600 hover:bg-zinc-100',
        variant === 'accent' &&
          'bg-[#ff6b35] text-white shadow-md shadow-orange-200/70 hover:bg-[#e85f2f] focus:ring-orange-200',
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = 'Button';

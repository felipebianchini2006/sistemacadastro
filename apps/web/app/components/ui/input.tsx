'use client';

import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/utils';

type InputStatus = 'default' | 'valid' | 'invalid';

type InputProps = ComponentPropsWithoutRef<'input'> & {
  label?: string;
  hint?: string;
  status?: InputStatus;
};

const baseInput =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)] shadow-sm placeholder:text-[color:var(--gray-500)]';

const focusInput =
  'focus-visible:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary-soft)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]';

const statusClasses: Record<InputStatus, string> = {
  default: '',
  valid: 'border-[color:var(--success)] focus-visible:ring-[color:rgba(22,163,74,0.2)]',
  invalid:
    'border-[color:var(--error)] focus-visible:ring-[color:rgba(220,38,38,0.2)] animate-[shake_0.4s_ease]',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, status = 'default', id, className, ...props }, ref) => {
    const inputId = id ?? (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
    const hintId = hint && inputId ? `${inputId}-hint` : undefined;

    const field = (
      <input
        {...props}
        ref={ref}
        id={inputId}
        className={cn(baseInput, focusInput, statusClasses[status], className)}
        aria-invalid={status === 'invalid'}
        aria-describedby={hintId}
      />
    );

    if (!label) return field;

    return (
      <label htmlFor={inputId} className="flex flex-col gap-2 text-sm text-[color:var(--gray-700)]">
        <span className="font-medium">{label}</span>
        {field}
        {hint ? (
          <span
            id={hintId}
            className={cn(
              'text-xs',
              status === 'invalid' ? 'text-[color:var(--error)]' : 'text-[color:var(--gray-500)]',
            )}
          >
            {hint}
          </span>
        ) : null}
      </label>
    );
  },
);

Input.displayName = 'Input';

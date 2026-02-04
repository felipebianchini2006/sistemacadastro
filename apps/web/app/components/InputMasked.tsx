'use client';

import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '../lib/utils';
import { maskCep, maskCpf, maskPhone } from '../lib/masks';

export type InputMask = 'cpf' | 'phone' | 'cep';
export type FieldStatus = 'idle' | 'valid' | 'invalid';

type InputMaskedProps = Omit<ComponentPropsWithoutRef<'input'>, 'onChange' | 'value'> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mask?: InputMask;
  status?: FieldStatus;
  hint?: string;
  showStatus?: boolean;
  leadingIcon?: ReactNode;
  leadingIconLabel?: string;
};

const StatusDot = ({ status }: { status?: FieldStatus }) => {
  const base =
    'inline-flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold';
  if (status === 'valid') {
    return (
      <span className={cn(base, 'bg-[color:var(--success)] text-white')} aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (status === 'invalid') {
    return (
      <span className={cn(base, 'bg-[color:var(--error)] text-white')} aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <path
            d="M6 6l12 12M18 6l-12 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }
  return (
    <span
      className={cn(base, 'bg-[var(--gray-100)] text-[color:var(--gray-500)]')}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      </svg>
    </span>
  );
};

const applyMask = (value: string, mask?: InputMask) => {
  if (!mask) return value;
  if (mask === 'cpf') return maskCpf(value);
  if (mask === 'phone') return maskPhone(value);
  if (mask === 'cep') return maskCep(value);
  return value;
};

export const InputMasked = forwardRef<HTMLInputElement, InputMaskedProps>(
  (
    {
      label,
      value,
      onChange,
      mask,
      status,
      hint,
      showStatus = true,
      leadingIcon,
      leadingIconLabel,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? `input-${label.replace(/\s+/g, '-').toLowerCase()}`;
    const hasIcon = Boolean(leadingIcon);

    return (
      <label htmlFor={inputId} className="flex flex-col gap-2 text-sm text-[color:var(--gray-700)]">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            {hasIcon ? (
              <span
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--primary)]"
                aria-label={leadingIconLabel}
                aria-hidden={leadingIconLabel ? undefined : true}
                role={leadingIconLabel ? 'img' : undefined}
              >
                {leadingIcon}
              </span>
            ) : null}
            <input
              {...props}
              ref={ref}
              id={inputId}
              value={value}
              onChange={(event) => onChange(applyMask(event.target.value, mask))}
              className={cn(
                'w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)] shadow-sm placeholder:text-[color:var(--gray-500)]',
                'focus-visible:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary-soft)]',
                status === 'invalid' &&
                  'border-[color:var(--error)] focus-visible:ring-[color:rgba(220,38,38,0.2)] animate-[shake_0.4s_ease]',
                status === 'valid' &&
                  'border-[color:var(--success)] focus-visible:ring-[color:rgba(22,163,74,0.2)]',
                hasIcon && 'pl-10',
                className,
              )}
              aria-invalid={status === 'invalid'}
              aria-required={props.required ? true : undefined}
              aria-describedby={hint ? `${inputId}-hint` : undefined}
            />
          </div>
          {showStatus ? <StatusDot status={status} /> : null}
        </div>
        {hint ? (
          <span
            id={`${inputId}-hint`}
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

InputMasked.displayName = 'InputMasked';

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
      <span className={cn(base, 'bg-[#22C55E] text-white')} aria-hidden="true">
        ???
      </span>
    );
  }
  if (status === 'invalid') {
    return (
      <span className={cn(base, 'bg-[#EF4444] text-white')} aria-hidden="true">
        ???
      </span>
    );
  }
  return (
    <span className={cn(base, 'bg-zinc-200 text-zinc-500')} aria-hidden="true">
      ???
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
      <label htmlFor={inputId} className="flex flex-col gap-2 text-sm text-zinc-700">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            {hasIcon ? (
              <span
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600"
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
                'w-full rounded-xl border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm',
                'focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-200',
                status === 'invalid' && 'border-red-300 focus:ring-red-200',
                status === 'valid' && 'border-emerald-300 focus:ring-emerald-200',
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
            className={cn('text-xs', status === 'invalid' ? 'text-red-600' : 'text-zinc-500')}
          >
            {hint}
          </span>
        ) : null}
      </label>
    );
  },
);

InputMasked.displayName = 'InputMasked';

'use client';

import { cn } from '../lib/utils';

export type ProgressStep = {
  id: string;
  title: string;
  subtitle?: string;
};

export const ProgressBar = ({ steps, current }: { steps: ProgressStep[]; current: number }) => {
  const progress = Math.max(0, Math.min(steps.length - 1, current));
  const percent = steps.length > 1 ? (progress / (steps.length - 1)) * 100 : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
        <span>Cadastro</span>
        <span>
          Etapa {current + 1} de {steps.length}
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-[var(--gray-200)]">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-[var(--primary)] transition-all duration-300"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={steps.length - 1}
          aria-valuenow={current}
          aria-label={`Progresso do cadastro: etapa ${current + 1} de ${steps.length}`}
        />
      </div>
      <div className="grid gap-2 text-xs text-[color:var(--gray-500)] sm:grid-cols-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              'rounded-lg border px-3 py-2',
              index === current
                ? 'border-[var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--gray-900)]'
                : index < current
                  ? 'border-[color:var(--primary-light)] bg-[var(--card)] text-[color:var(--gray-700)]'
                  : 'border-[var(--border)] bg-[var(--card)]',
            )}
            data-testid={`progress-step-${index}`}
          >
            <div className="font-semibold">{step.title}</div>
            {step.subtitle ? <div className="text-[11px]">{step.subtitle}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
};

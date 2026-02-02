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
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-zinc-600">
        <span>Cadastro</span>
        <span>
          Etapa {current + 1} de {steps.length}
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-zinc-200">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-[#ff6b35] transition-all duration-300"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={steps.length - 1}
          aria-valuenow={current}
          aria-label={`Progresso do cadastro: etapa ${current + 1} de ${steps.length}`}
        />
      </div>
      <div className="grid gap-2 text-xs text-zinc-600 sm:grid-cols-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              'rounded-lg border px-3 py-2',
              index === current
                ? 'border-[#ff6b35] bg-orange-50 text-orange-700'
                : index < current
                  ? 'border-orange-200 bg-white text-orange-700'
                  : 'border-zinc-200 bg-white',
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

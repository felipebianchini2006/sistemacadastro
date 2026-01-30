import { cn } from '../lib/utils';

export const StepLayout = ({
  title,
  description,
  children,
  footer,
  tone = 'default',
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  tone?: 'default' | 'review';
}) => {
  return (
    <section
      className={cn(
        'rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg sm:p-8',
        tone === 'review' && 'bg-gradient-to-br from-white via-white to-emerald-50',
      )}
    >
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-zinc-900">{title}</h2>
        {description ? <p className="text-sm text-zinc-500">{description}</p> : null}
      </header>
      <div className="mt-6 grid gap-6">{children}</div>
      {footer ? <div className="mt-8 flex flex-wrap items-center gap-3">{footer}</div> : null}
    </section>
  );
};

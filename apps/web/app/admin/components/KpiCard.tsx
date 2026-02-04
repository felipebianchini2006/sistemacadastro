import { cn } from '../../lib/utils';

export const KpiCard = ({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
}) => {
  const valueTone = cn(
    tone === 'info' && 'text-[color:var(--info)]',
    tone === 'purple' && 'text-[color:var(--purple)]',
    tone === 'success' && 'text-[color:var(--success-strong)]',
    tone === 'warning' && 'text-[color:var(--warning)]',
    tone === 'danger' && 'text-[color:var(--error)]',
  );
  return (
    <div
      className={cn(
        'admin-card p-4',
        tone === 'info' && 'border-[color:var(--info-border)] bg-[color:var(--info-soft)]',
        tone === 'purple' && 'border-[color:var(--purple-border)] bg-[color:var(--purple-soft)]',
        tone === 'success' && 'border-[color:var(--success-border)] bg-[color:var(--success-soft)]',
        tone === 'warning' && 'border-[color:var(--warning-border)] bg-[color:var(--warning-soft)]',
        tone === 'danger' && 'border-[color:var(--error-border)] bg-[color:var(--error-soft)]',
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--gray-500)]">{label}</p>
      <p className={cn('mt-2 text-2xl font-semibold text-[color:var(--gray-900)]', valueTone)}>
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-[color:var(--gray-500)]">{hint}</p> : null}
    </div>
  );
};

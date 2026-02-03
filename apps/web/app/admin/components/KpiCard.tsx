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
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-md)]',
        tone === 'info' && 'border-blue-200 bg-blue-50',
        tone === 'purple' && 'border-purple-200 bg-purple-50',
        tone === 'success' && 'border-emerald-200 bg-emerald-50',
        tone === 'warning' && 'border-amber-200 bg-amber-50',
        tone === 'danger' && 'border-red-200 bg-red-50',
      )}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[color:var(--gray-900)]">{value}</p>
      {hint ? <p className="mt-2 text-xs text-[color:var(--gray-500)]">{hint}</p> : null}
    </div>
  );
};

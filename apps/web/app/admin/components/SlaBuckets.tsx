export const SlaBuckets = ({
  ok,
  warning,
  danger,
}: {
  ok: number;
  warning: number;
  danger: number;
}) => {
  return (
    <div className="admin-card rounded-2xl p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">SLA</p>
      <div className="mt-4 grid gap-3 text-sm">
        <div className="flex items-center justify-between rounded-xl border border-[color:var(--success-border)] bg-[color:var(--success-soft)] px-4 py-2 text-[color:var(--success)]">
          <span>Dentro do prazo</span>
          <span className="font-semibold">{ok}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[color:var(--warning-border)] bg-[color:var(--warning-soft)] px-4 py-2 text-[color:var(--warning)]">
          <span>Proximo do limite</span>
          <span className="font-semibold">{warning}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[color:var(--error-border)] bg-[color:var(--error-soft)] px-4 py-2 text-[color:var(--error)]">
          <span>Estourado</span>
          <span className="font-semibold">{danger}</span>
        </div>
      </div>
    </div>
  );
};

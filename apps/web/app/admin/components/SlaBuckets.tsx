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
      <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--gray-500)]">
        Resumo SLA
      </p>
      <div className="mt-4 grid gap-3 text-sm">
        <div className="flex items-center justify-between rounded-xl border border-[color:var(--success-border)] bg-[color:var(--success-soft)] px-4 py-2 text-[color:var(--success)]">
          <span>Dentro do prazo</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[color:var(--success)]">
            {ok}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[color:var(--warning-border)] bg-[color:var(--warning-soft)] px-4 py-2 text-[color:var(--warning)]">
          <span>Proximo do limite</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[color:var(--warning)]">
            {warning}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[color:var(--error-border)] bg-[color:var(--error-soft)] px-4 py-2 text-[color:var(--error)]">
          <span>Fora do prazo</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[color:var(--error)]">
            {danger}
          </span>
        </div>
      </div>
    </div>
  );
};

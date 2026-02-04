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
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]">
      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gray-500)]">SLA</p>
      <div className="mt-4 grid gap-3 text-sm">
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-800">
          <span>Dentro do prazo</span>
          <span className="font-semibold">{ok}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-amber-800">
          <span>Proximo do limite</span>
          <span className="font-semibold">{warning}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-red-700">
          <span>Estourado</span>
          <span className="font-semibold">{danger}</span>
        </div>
      </div>
    </div>
  );
};

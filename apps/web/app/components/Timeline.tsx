'use client';

export type TimelineEntry = {
  from: string | null;
  to: string;
  at: string;
  reason?: string | null;
};

export const Timeline = ({ entries }: { entries: TimelineEntry[] }) => {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-sm text-[color:var(--gray-500)]">
        Nenhum evento registrado ainda.
      </div>
    );
  }

  return (
    <ol className="grid gap-4">
      {entries.map((entry, index) => (
        <li
          key={`${entry.at}-${index}`}
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-[color:var(--gray-900)]">{entry.to}</div>
            <div className="text-xs text-[color:var(--gray-500)]">
              {new Date(entry.at).toLocaleString('pt-BR')}
            </div>
          </div>
          {entry.reason ? (
            <p className="mt-2 text-sm text-[color:var(--gray-500)]">{entry.reason}</p>
          ) : null}
          {entry.from ? (
            <p className="mt-2 text-xs text-[color:var(--gray-500)]">De: {entry.from}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
};

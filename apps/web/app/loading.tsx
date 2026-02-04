export default function Loading() {
  return (
    <div className="min-h-screen-dvh bg-soft-gradient">
      <div className="page-shell flex min-h-screen-dvh flex-col items-center justify-center py-16">
        <div
          className="w-full max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-md)]"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-2xl bg-[var(--primary-soft)]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 animate-pulse rounded-full bg-[var(--gray-200)]" />
              <div className="h-3 w-1/2 animate-pulse rounded-full bg-[var(--gray-200)]" />
            </div>
          </div>
          <div className="mt-6 grid gap-3">
            <div className="h-12 w-full animate-pulse rounded-2xl bg-[var(--gray-100)]" />
            <div className="h-12 w-full animate-pulse rounded-2xl bg-[var(--gray-100)]" />
            <div className="h-12 w-4/5 animate-pulse rounded-2xl bg-[var(--gray-100)]" />
          </div>
          <p className="mt-6 text-sm text-[color:var(--gray-500)]">Carregando interface...</p>
        </div>
      </div>
    </div>
  );
}

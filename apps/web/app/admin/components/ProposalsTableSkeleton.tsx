import { Skeleton } from '../../components/ui/skeleton';

export const ProposalsTableSkeleton = ({ rows = 6 }: { rows?: number }) => (
  <div className="grid gap-3">
    <div className="admin-card hidden rounded-2xl lg:block">
      <div className="admin-table-wrap">
        <div className="admin-table-scroll">
          <div className="bg-[var(--muted)] px-4 py-3">
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="grid gap-2 p-4">
            {Array.from({ length: rows }).map((_, index) => (
              <div
                key={`row-${index}`}
                className="grid items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-3 sm:grid-cols-[140px_1.6fr_120px_120px_100px_110px_120px_160px_80px]"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    <div className="grid gap-3 lg:hidden">
      {Array.from({ length: Math.min(rows, 4) }).map((_, index) => (
        <div key={`card-${index}`} className="admin-card rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-3 w-40" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="mt-3 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

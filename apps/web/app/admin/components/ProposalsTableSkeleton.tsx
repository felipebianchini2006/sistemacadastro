import { Skeleton } from '../../components/ui/skeleton';

export const ProposalsTableSkeleton = ({ rows = 6 }: { rows?: number }) => (
  <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-lg">
    <div className="bg-[var(--muted)] px-4 py-3">
      <Skeleton className="h-4 w-40" />
    </div>
    <div className="grid gap-2 p-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={`row-${index}`}
          className="grid items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-3 sm:grid-cols-[140px_1.6fr_120px_120px_100px_110px_120px_160px_80px]"
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
);

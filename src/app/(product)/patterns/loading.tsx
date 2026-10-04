import { Skeleton } from "@/components/ui/Skeleton";
import { SkeletonPageHeader } from "@/components/motion";

export default function PatternsLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <SkeletonPageHeader />

      {/* Filter tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      {/* Pattern cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded-lg shrink-0" />
              <Skeleton className="h-5 w-2/3 rounded-md" />
            </div>
            <Skeleton className="h-3 w-full rounded-sm" />
            <Skeleton className="h-3 w-4/5 rounded-sm" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-18 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

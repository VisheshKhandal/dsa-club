import { Skeleton } from "@/components/ui/Skeleton";
import { SkeletonPageHeader } from "@/components/motion";

export default function CompaniesLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <SkeletonPageHeader />

      {/* Search / filter */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>

      {/* Company cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-xl shrink-0" />
              <Skeleton className="h-5 w-28 rounded-md" />
            </div>
            <Skeleton className="h-3 w-full rounded-sm" />
            <Skeleton className="h-3 w-2/3 rounded-sm" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

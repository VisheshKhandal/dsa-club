import { Skeleton } from "@/components/ui/Skeleton";
import { SkeletonPageHeader } from "@/components/motion";

export default function AchievementsLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <SkeletonPageHeader />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-2 text-center">
            <Skeleton className="h-8 w-12 rounded-md mx-auto" />
            <Skeleton className="h-3 w-20 rounded-sm mx-auto" />
          </div>
        ))}
      </div>

      {/* Achievement badges grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 flex items-start gap-4">
            <Skeleton className="size-12 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-3 w-full rounded-sm" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

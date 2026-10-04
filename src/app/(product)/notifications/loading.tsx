import { Skeleton } from "@/components/ui/Skeleton";
import { SkeletonPageHeader } from "@/components/motion";

export default function NotificationsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SkeletonPageHeader />

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 flex-1 rounded-lg" />
      </div>

      {/* Notification items */}
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <Skeleton className="size-8 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-1/2 rounded-sm" />
            </div>
            <Skeleton className="h-3 w-12 rounded-sm shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

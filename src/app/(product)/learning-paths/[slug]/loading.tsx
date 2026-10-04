import { Skeleton } from "@/components/ui/Skeleton";
import { SkeletonPageHeader } from "@/components/motion";

export default function LearningPathDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <SkeletonPageHeader />

      {/* Path progress bar */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-48 rounded-md" />
          <Skeleton className="h-4 w-16 rounded-sm" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>

      {/* Roadmap nodes */}
      <div className="space-y-4 pl-6 border-l-2 border-white/[0.06]">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="relative rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-2">
            <div className="absolute -left-[31px] top-5">
              <Skeleton className="size-5 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-16 rounded-sm" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-5 w-2/3 rounded-md" />
            <Skeleton className="h-3 w-full rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

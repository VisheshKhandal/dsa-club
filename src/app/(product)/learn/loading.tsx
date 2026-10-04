import { Skeleton } from "@/components/ui/Skeleton";

function SkeletonBlock({ className }: { className?: string }) {
  return <Skeleton className={className} />;
}

export default function LearnLoading() {
  return (
    <div className="space-y-10 pb-4">
      {/* Hero skeleton */}
      <SkeletonBlock className="h-[160px] rounded-[20px]" />

      {/* Path tracker skeleton */}
      <div className="space-y-3">
        <SkeletonBlock className="h-5 w-48" />
        <SkeletonBlock className="h-8 w-64" />
        <SkeletonBlock className="h-2 w-full rounded-full" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonBlock key={i} className="h-7 w-24 rounded-full" />
          ))}
        </div>
      </div>

      {/* Up Next skeleton */}
      <div className="space-y-2">
        <SkeletonBlock className="h-5 w-28 mb-4" />
        {[1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="h-16 rounded-[12px]" />
        ))}
      </div>

      {/* Curriculum tabs skeleton */}
      <div className="space-y-3">
        <SkeletonBlock className="h-10 w-full rounded-none border-b" />
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonBlock key={i} className="h-[58px] rounded-[12px]" />
        ))}
      </div>
    </div>
  );
}

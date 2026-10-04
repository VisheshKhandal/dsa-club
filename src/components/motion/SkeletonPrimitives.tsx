import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export function SkeletonBlock({ className }: { className?: string }) {
  return <Skeleton className={className} />;
}

export function SkeletonPageHeader({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <Skeleton className="h-3 w-24 rounded-md" />
      <Skeleton className="h-8 w-64 max-w-full rounded-lg" />
      <Skeleton className="h-4 w-96 max-w-full rounded-md" />
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6", className)}>
      <Skeleton className="h-4 w-32 rounded-md mb-3" />
      <Skeleton className="h-6 w-48 rounded-lg mb-4" />
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}

export function SkeletonList({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
        >
          <div className="space-y-2 min-w-0 flex-1">
            <Skeleton className="h-4 w-1/3 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-sm" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden", className)}>
      {/* Table Header */}
      <div className="flex items-center justify-between border-b border-white/[0.07] p-4 bg-white/[0.015]">
        <Skeleton className="h-3.5 w-24 rounded-md" />
        <Skeleton className="h-3.5 w-16 rounded-md" />
        <Skeleton className="h-3.5 w-20 rounded-md" />
      </div>
      {/* Rows */}
      <div className="divide-y divide-white/[0.05]">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center justify-between p-4 gap-4">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-2/5 rounded-md" />
              <Skeleton className="h-3 w-1/4 rounded-sm" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonMission({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto max-w-6xl space-y-8", className)}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16 rounded-md" />
        <span className="text-white/20">/</span>
        <Skeleton className="h-4 w-24 rounded-md" />
        <span className="text-white/20">/</span>
        <Skeleton className="h-4 w-36 rounded-md" />
      </div>

      {/* Hero card */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 rounded-lg" />
          <Skeleton className="h-4 w-52 rounded-md" />
        </div>
        <div className="w-full sm:w-72 space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-28 rounded-sm" />
            <Skeleton className="h-3 w-10 rounded-sm" />
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-2 flex-1 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Sidebar + Content */}
      <div className="grid gap-8 lg:grid-cols-[260px_1fr] items-start">
        {/* Sidebar stages */}
        <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="flex justify-between items-center mb-2 px-1">
            <Skeleton className="h-3 w-20 rounded-sm" />
            <Skeleton className="h-3 w-8 rounded-sm" />
          </div>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 p-1">
              <Skeleton className="size-6 rounded-full shrink-0" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-3 w-28 rounded-md" />
                <Skeleton className="h-2 w-14 rounded-sm" />
              </div>
            </div>
          ))}
          <div className="pt-3 border-t border-white/[0.06]">
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3 w-24 rounded-sm" />
              <Skeleton className="h-5 w-48 rounded-md" />
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-5/6 rounded-md" />
            <Skeleton className="h-4 w-4/6 rounded-md" />
          </div>
          <Skeleton className="h-36 w-full rounded-xl" />
          <div className="flex justify-between pt-4 border-t border-white/[0.06]">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonProgress({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto max-w-5xl space-y-8", className)}>
      <SkeletonPageHeader />

      {/* Summary stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-2">
            <Skeleton className="h-3 w-20 rounded-sm" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
        ))}
      </div>

      {/* Progress rings / metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 flex items-center gap-6">
          <Skeleton className="size-16 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-3 w-48 rounded-sm" />
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 flex items-center gap-6">
          <Skeleton className="size-16 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-3 w-48 rounded-sm" />
          </div>
        </div>
      </div>

      {/* Topic breakdown list */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 space-y-4">
        <Skeleton className="h-4 w-32 rounded-md mb-2" />
        <SkeletonList rows={4} />
      </div>
    </div>
  );
}

export function SkeletonDashboard({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto max-w-6xl space-y-8 pb-16", className)}>
      {/* Personal Context skeleton */}
      <div className="border-b border-white/[0.08] pb-8 pt-2 sm:pb-10 flex flex-col sm:flex-row justify-between gap-5 sm:items-end">
        <div className="space-y-3 flex-1">
          <Skeleton className="h-3 w-24 rounded-sm" />
          <Skeleton className="h-9 w-72 max-w-full rounded-lg" />
          <Skeleton className="h-4 w-96 max-w-full rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>

      {/* Today's Mission skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-16 rounded-sm" />
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>
        <div className="rounded-2xl border border-purple-500/20 bg-[#120826]/60 p-6 sm:p-8 space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-3.5 w-28 rounded-full" />
            <Skeleton className="h-3.5 w-20 rounded-full" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-3 flex-1">
              <Skeleton className="h-7 w-2/3 rounded-md" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-2 w-48 rounded-full" />
                <Skeleton className="h-3 w-16 rounded-sm" />
              </div>
            </div>
            <Skeleton className="h-11 w-44 rounded-xl shrink-0" />
          </div>
        </div>
      </div>

      {/* Today's Plan skeleton */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <Skeleton className="h-3 w-24 rounded-sm" />
            <Skeleton className="h-5 w-44 rounded-md" />
          </div>
          <Skeleton className="h-7 w-32 rounded-lg" />
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-3 divide-y divide-white/[0.05]">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 py-3 px-2">
              <Skeleton className="size-7 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-20 rounded-sm" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
              </div>
              <Skeleton className="size-4 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Snapshot + Revision 2-column split */}
      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6 space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-32 rounded-sm" />
            <Skeleton className="h-3.5 w-24 rounded-sm" />
          </div>
          <Skeleton className="h-10 w-24 rounded-lg" />
          <div className="grid grid-cols-3 gap-3 border-y border-white/[0.07] py-4">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="flex items-center gap-4 pt-2">
            <Skeleton className="size-16 rounded-full shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-3 w-40 rounded-sm" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[#120c19] p-5 sm:p-6 space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-24 rounded-sm" />
            <Skeleton className="h-3.5 w-16 rounded-sm" />
          </div>
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
      </div>

      {/* Weekly rhythm footer */}
      <div className="border-t border-white/[0.08] pt-5">
        <Skeleton className="h-3 w-20 rounded-sm mb-3" />
        <div className="flex gap-8">
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-5 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonLearningPath({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto max-w-5xl space-y-8", className)}>
      <SkeletonPageHeader />
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-48 rounded-md" />
          <Skeleton className="h-4 w-16 rounded-sm" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-3">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <Skeleton className="h-3 w-full rounded-sm" />
            <Skeleton className="h-3 w-2/3 rounded-sm" />
            <Skeleton className="h-8 w-24 rounded-lg pt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonRevisionQueue({ className }: { className?: string }) {
  return (
    <div className={cn("max-w-2xl mx-auto space-y-8", className)}>
      <SkeletonPageHeader />
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 flex-1 rounded-lg" />
      </div>
      {/* Queue items */}
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <Skeleton className="h-3 w-20 rounded-sm" />
              <Skeleton className="h-5 w-48 rounded-md" />
              <Skeleton className="h-3 w-32 rounded-sm" />
            </div>
            <Skeleton className="h-8 w-28 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

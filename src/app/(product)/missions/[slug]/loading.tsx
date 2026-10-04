import { SkeletonBlock } from "@/components/product/ui";

export default function MissionDetailLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16 pt-1 animate-in fade-in duration-150">
      {/* Editorial Header Skeleton */}
      <div className="space-y-3 pt-1 border-b border-(--color-border) pb-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-4 w-16 rounded-md" />
          <SkeletonBlock className="h-4 w-4 rounded-md" />
          <SkeletonBlock className="h-4 w-28 rounded-md" />
          <div className="ml-auto flex gap-2">
            <SkeletonBlock className="h-6 w-24 rounded-full" />
            <SkeletonBlock className="h-6 w-20 rounded-full" />
          </div>
        </div>

        {/* Title and Progress */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1">
          <div className="space-y-2 flex-1">
            <SkeletonBlock className="h-4 w-32 rounded-full" />
            <SkeletonBlock className="h-8 w-64 sm:w-96 rounded-lg" />
          </div>
          <SkeletonBlock className="h-6 w-28 rounded-md" />
        </div>
      </div>

      {/* 2-Column Guided Reader Layout */}
      <div className="flex flex-col lg:flex-row items-start gap-8">
        {/* Left Sticky Outline Skeleton (~240px) */}
        <div className="hidden lg:block w-[240px] shrink-0 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) p-4 space-y-4">
          <div className="flex justify-between border-b border-(--color-border) pb-2.5">
            <SkeletonBlock className="h-3 w-24 rounded-md" />
            <SkeletonBlock className="h-3 w-10 rounded-md" />
          </div>

          <div className="space-y-3 pt-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <SkeletonBlock className="size-6 rounded-full shrink-0" />
                <div className="space-y-1 flex-1">
                  <SkeletonBlock className="h-3 w-3/4 rounded-md" />
                  <SkeletonBlock className="h-2 w-12 rounded-full" />
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-(--color-border) pt-3 space-y-2">
            <SkeletonBlock className="h-3 w-28 rounded-md" />
            <SkeletonBlock className="h-3 w-20 rounded-md" />
          </div>
        </div>

        {/* Main Reader Skeleton (~800-950px, Dominant) */}
        <div className="min-w-0 flex-1 max-w-3xl space-y-6">
          <SkeletonBlock className="h-0.5 w-full rounded-full" />

          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-28 rounded-full" />
            <SkeletonBlock className="h-8 w-2/3 rounded-lg" />
          </div>

          {/* Paragraphs */}
          <div className="space-y-3 pt-2">
            <SkeletonBlock className="h-4 w-full rounded-md" />
            <SkeletonBlock className="h-4 w-11/12 rounded-md" />
            <SkeletonBlock className="h-4 w-4/5 rounded-md" />
          </div>

          {/* Visualization / Diagram area */}
          <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) p-8 flex flex-col items-center justify-center space-y-3">
            <SkeletonBlock className="h-12 w-12 rounded-full" />
            <SkeletonBlock className="h-4 w-48 rounded-md" />
          </div>

          {/* Key Insight Callout Skeleton */}
          <div className="border-l-3 border-(--color-purple) bg-(--color-surface-1) p-4 rounded-r-md space-y-2">
            <SkeletonBlock className="h-3 w-24 rounded-md" />
            <SkeletonBlock className="h-4 w-full rounded-md" />
          </div>

          {/* Further Paragraphs */}
          <div className="space-y-3 pt-2">
            <SkeletonBlock className="h-4 w-full rounded-md" />
            <SkeletonBlock className="h-4 w-5/6 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

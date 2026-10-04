import { SkeletonBlock } from "@/components/product/ui";

export default function TopicDetailLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-12 pt-1 animate-in fade-in duration-150">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <SkeletonBlock className="h-4 w-16 rounded-md" />
        <SkeletonBlock className="h-4 w-4 rounded-md" />
        <SkeletonBlock className="h-4 w-28 rounded-md" />
      </div>

      {/* Compact Editorial Hero Skeleton */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex gap-2">
              <SkeletonBlock className="h-5 w-16 rounded-(--radius-badge)" />
              <SkeletonBlock className="h-4 w-20 rounded-md" />
            </div>
            <SkeletonBlock className="h-8 w-64 sm:w-80 rounded-lg" />
            <SkeletonBlock className="h-4 w-full max-w-xl rounded-md" />
          </div>
          <SkeletonBlock className="h-9 w-36 rounded-(--radius-btn)" />
        </div>

        {/* Metric Row Skeleton */}
        <div className="pt-2 border-b border-(--color-border) pb-3 flex items-baseline gap-6">
          <SkeletonBlock className="h-6 w-24 rounded-md" />
          <SkeletonBlock className="h-4 w-64 rounded-md" />
        </div>
      </div>

      {/* Tab Switcher Skeleton */}
      <div className="flex items-center gap-4 border-b border-(--color-border) pb-0 pt-1">
        <SkeletonBlock className="h-8 w-24 rounded-t-md" />
        <SkeletonBlock className="h-8 w-24 rounded-t-md" />
      </div>

      <div className="space-y-10">
        {/* Row 1: Current Learning (≈65%) + Topic Snapshot (≈35%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between border-b border-(--color-border) pb-2.5">
              <SkeletonBlock className="h-4 w-36 rounded-md" />
              <SkeletonBlock className="h-4 w-24 rounded-md" />
            </div>
            <SkeletonBlock className="h-6 w-64 rounded-md" />
            <SkeletonBlock className="h-1 w-full rounded-full" />
            <div className="flex gap-2">
              <SkeletonBlock className="h-5 w-24 rounded-md" />
              <SkeletonBlock className="h-5 w-24 rounded-md" />
              <SkeletonBlock className="h-5 w-24 rounded-md" />
            </div>
            <div className="border-l-3 border-(--color-purple) bg-(--color-surface-1) p-4 rounded-r-md space-y-2">
              <SkeletonBlock className="h-4 w-32 rounded-md" />
              <SkeletonBlock className="h-3 w-48 rounded-md" />
            </div>
          </div>

          <div className="lg:col-span-4 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) p-5 space-y-4">
            <div className="border-b border-(--color-border) pb-2.5">
              <SkeletonBlock className="h-4 w-32 rounded-md" />
            </div>
            <SkeletonBlock className="h-6 w-20 rounded-md" />
            <div className="divide-y divide-(--color-border)">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="py-2 flex items-center justify-between">
                  <SkeletonBlock className="h-4 w-28 rounded-md" />
                  <SkeletonBlock className="h-4 w-16 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Practice Problems (≈70%) + Pattern Recognition (≈30%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between border-b border-(--color-border) pb-2.5">
              <SkeletonBlock className="h-4 w-28 rounded-md" />
              <SkeletonBlock className="h-4 w-20 rounded-md" />
            </div>
            <div className="divide-y divide-(--color-border) border-b border-(--color-border)">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="py-3.5 px-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 flex-1">
                    <SkeletonBlock className="h-4 w-4 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <SkeletonBlock className="h-4 w-48 rounded-md" />
                      <SkeletonBlock className="h-3 w-24 rounded-md" />
                    </div>
                  </div>
                  <SkeletonBlock className="h-5 w-16 rounded-md shrink-0" />
                </div>
              ))}
            </div>
            <SkeletonBlock className="h-4 w-36 rounded-md" />
          </div>

          <div className="lg:col-span-4 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-(--color-border) pb-2.5">
              <SkeletonBlock className="h-4 w-36 rounded-md" />
              <SkeletonBlock className="h-4 w-20 rounded-md" />
            </div>
            <div className="divide-y divide-(--color-border)">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="py-2.5 space-y-1">
                  <div className="flex justify-between items-center">
                    <SkeletonBlock className="h-4 w-32 rounded-md" />
                    <SkeletonBlock className="h-4 w-12 rounded-md" />
                  </div>
                  <SkeletonBlock className="h-1 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Explore Related Skeleton */}
      <div className="pt-6 border-t border-(--color-border) space-y-3">
        <SkeletonBlock className="h-4 w-40 rounded-md" />
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <SkeletonBlock key={i} className="h-8 w-32 rounded-(--radius-btn)" />
          ))}
        </div>
      </div>
    </div>
  );
}

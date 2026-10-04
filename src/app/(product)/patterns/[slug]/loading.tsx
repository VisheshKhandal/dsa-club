import { SkeletonBlock } from "@/components/product/ui";

export default function PatternDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20 pt-2 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-8 w-24 rounded-lg" />
          <SkeletonBlock className="h-5 w-20 rounded-full" />
        </div>
        <SkeletonBlock className="h-8 w-32 rounded-lg" />
      </div>

      {/* Pattern Hero Summary Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-(--color-surface-1) p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-4 w-24 rounded-full" />
          <SkeletonBlock className="h-4 w-16 rounded-full" />
        </div>
        <SkeletonBlock className="h-9 w-2/3 rounded-xl" />
        <div className="space-y-2 pt-2">
          <SkeletonBlock className="h-4 w-full rounded-md" />
          <SkeletonBlock className="h-4 w-4/5 rounded-md" />
          <SkeletonBlock className="h-4 w-3/5 rounded-md" />
        </div>
      </div>

      {/* Problem list in this pattern */}
      <div className="space-y-3 pt-4">
        <SkeletonBlock className="h-6 w-44 rounded-md" />
        <div className="grid gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="space-y-2">
                <SkeletonBlock className="h-5 w-48 rounded-md" />
                <SkeletonBlock className="h-3 w-32 rounded-full" />
              </div>
              <SkeletonBlock className="h-8 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

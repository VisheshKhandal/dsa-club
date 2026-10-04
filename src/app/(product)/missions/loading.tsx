import { SkeletonBlock } from "@/components/product/ui";

export default function MissionsLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-16 pt-1 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="space-y-2 border-b border-white/[0.06] pb-6">
        <SkeletonBlock className="h-8 w-48 rounded-lg" />
        <SkeletonBlock className="h-4 w-96 rounded-md" />
      </div>

      {/* 3 Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <SkeletonBlock className="size-11 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <SkeletonBlock className="h-6 w-12 rounded-md" />
              <SkeletonBlock className="h-3 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Current Focus Mission Card */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
        <div className="flex gap-2">
          <SkeletonBlock className="h-6 w-24 rounded-lg" />
          <SkeletonBlock className="h-6 w-20 rounded-lg" />
        </div>
        <SkeletonBlock className="h-4 w-32 rounded-md" />
        <SkeletonBlock className="h-7 w-2/3 rounded-lg" />
        <SkeletonBlock className="h-2 w-full max-w-md rounded-full" />
      </div>

      {/* Missions Grid */}
      <div className="space-y-4">
        <SkeletonBlock className="h-5 w-40 rounded-md" />
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
              <div className="flex justify-between items-center">
                <SkeletonBlock className="h-4 w-24 rounded-md" />
                <SkeletonBlock className="h-4 w-16 rounded-full" />
              </div>
              <SkeletonBlock className="h-5 w-3/4 rounded-md" />
              <SkeletonBlock className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

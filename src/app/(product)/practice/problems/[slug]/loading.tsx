import { SkeletonBlock } from "@/components/product/ui";

export default function ProblemDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20 pt-2 animate-in fade-in duration-150">
      {/* Top back navigation and badges */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-8 w-24 rounded-lg" />
          <SkeletonBlock className="h-5 w-16 rounded-full" />
          <SkeletonBlock className="h-5 w-28 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-8 w-28 rounded-lg" />
          <SkeletonBlock className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      {/* 4-Phase Progress Bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <SkeletonBlock className="h-3 w-16 rounded-full" />
            <SkeletonBlock className="h-4 w-24 rounded-md" />
          </div>
        ))}
      </div>

      {/* Main Problem Workspace Shell */}
      <div className="rounded-2xl border border-white/[0.08] bg-(--color-surface-1) p-6 sm:p-8 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-4 w-20 rounded-full" />
            <SkeletonBlock className="h-4 w-32 rounded-full" />
          </div>
          <SkeletonBlock className="h-8 w-3/4 rounded-xl" />
          <div className="space-y-2 pt-2">
            <SkeletonBlock className="h-4 w-full rounded-md" />
            <SkeletonBlock className="h-4 w-5/6 rounded-md" />
            <SkeletonBlock className="h-4 w-4/6 rounded-md" />
          </div>
        </div>

        {/* Interactive guidance / hints block */}
        <div className="rounded-xl border border-purple-500/10 bg-purple-500/[0.02] p-5 space-y-3">
          <SkeletonBlock className="h-4 w-36 rounded-md" />
          <SkeletonBlock className="h-10 w-full rounded-lg" />
        </div>

        {/* Bottom CTA bar */}
        <div className="flex items-center justify-between border-t border-white/[0.06] pt-5">
          <SkeletonBlock className="h-9 w-32 rounded-xl" />
          <SkeletonBlock className="h-9 w-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

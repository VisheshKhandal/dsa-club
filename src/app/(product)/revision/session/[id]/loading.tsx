import { SkeletonBlock } from "@/components/product/ui";

export default function RevisionSessionLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20 pt-4 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
        <SkeletonBlock className="h-8 w-24 rounded-lg" />
        <SkeletonBlock className="h-4 w-28 rounded-full" />
      </div>

      {/* Spaced repetition flashcard container */}
      <div className="rounded-2xl border border-white/[0.08] bg-(--color-surface-1) p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-5 w-24 rounded-full" />
          <SkeletonBlock className="h-4 w-16 rounded-full" />
        </div>

        <SkeletonBlock className="h-8 w-3/4 rounded-xl" />

        <div className="space-y-3 pt-2">
          <SkeletonBlock className="h-4 w-full rounded-md" />
          <SkeletonBlock className="h-4 w-5/6 rounded-md" />
          <SkeletonBlock className="h-4 w-4/6 rounded-md" />
        </div>

        {/* Hints / Solution block */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-2">
          <SkeletonBlock className="h-4 w-32 rounded-md" />
          <SkeletonBlock className="h-6 w-full rounded-lg" />
        </div>

        {/* Grade response buttons (Again, Hard, Good, Easy) */}
        <div className="grid grid-cols-4 gap-2 pt-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonBlock key={i} className="h-11 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

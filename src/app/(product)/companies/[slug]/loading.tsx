import { Skeleton } from "@/components/ui/Skeleton";
import { SkeletonPageHeader, SkeletonList } from "@/components/motion";

export default function CompanyDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20 rounded-md" />
        <span className="text-white/20">/</span>
        <Skeleton className="h-4 w-32 rounded-md" />
      </div>

      {/* Company hero */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-2xl shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-48 rounded-lg" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      </div>

      {/* Preparation tracks */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-36 rounded-md" />
        <SkeletonList rows={5} />
      </div>
    </div>
  );
}

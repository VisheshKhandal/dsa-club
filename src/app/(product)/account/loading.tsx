import { Skeleton } from "@/components/ui/Skeleton";

export default function AccountLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Profile header */}
      <div className="flex items-center gap-5">
        <Skeleton className="size-16 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>
      </div>

      {/* Form sections */}
      {Array.from({ length: 3 }, (_, section) => (
        <div key={section} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 space-y-4">
          <Skeleton className="h-5 w-32 rounded-md" />
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-20 rounded-sm" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

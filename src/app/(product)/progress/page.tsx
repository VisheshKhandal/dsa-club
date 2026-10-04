import { Suspense } from "react";
import { ProgressView } from "@/components/product/data-views";
import { getCachedProductSnapshot } from "@/features/product/services/product.service";
import { requireUserId } from "@/lib/auth-guard";
import { SkeletonProgress } from "@/components/product/ui";

async function ProgressDataLoader({ userId }: { userId: string }) {
  const data = await getCachedProductSnapshot(userId, { includeTopicExplanations: true });
  return <ProgressView data={data} />;
}

export default async function ProgressPage() {
  const userId = await requireUserId();
  return (
    <Suspense fallback={<SkeletonProgress />}>
      <ProgressDataLoader userId={userId} />
    </Suspense>
  );
}


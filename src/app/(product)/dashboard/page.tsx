import { Suspense } from "react";
import { DashboardView } from "@/components/product/data-views";
import { getCachedProductSnapshot } from "@/features/product/services/product.service";
import { requireUserId } from "@/lib/auth-guard";
import { SkeletonDashboard } from "@/components/product/ui";

async function DashboardDataLoader({ userId }: { userId: string }) {
  const data = await getCachedProductSnapshot(userId);
  return <DashboardView data={data} />;
}

export default async function DashboardPage() {
  const userId = await requireUserId();

  return (
    <Suspense fallback={<SkeletonDashboard />}>
      <DashboardDataLoader userId={userId} />
    </Suspense>
  );
}

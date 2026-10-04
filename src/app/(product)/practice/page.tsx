import { Suspense } from "react";
import { PracticeView } from "@/components/product/data-views";
import { getCachedPracticeData } from "@/features/product/services/product.service";
import { requireUserId } from "@/lib/auth-guard";
import { SkeletonPractice } from "@/components/product/ui";

async function PracticeDataLoader({ userId }: { userId: string }) {
  const problems = await getCachedPracticeData(userId);
  return <PracticeView problems={problems} />;
}

export default async function PracticePage() {
  const userId = await requireUserId();
  return (
    <Suspense fallback={<SkeletonPractice />}>
      <PracticeDataLoader userId={userId} />
    </Suspense>
  );
}


import { Suspense } from "react";
import { redirect } from "next/navigation";
import { RevisionView } from "@/components/product/data-views";
import { getCachedProductSnapshot } from "@/features/product/services/product.service";
import { requireUserId } from "@/lib/auth-guard";
import { SkeletonRevision } from "@/components/product/ui";

async function RevisionDataLoader({ userId }: { userId: string }) {
  const data = await getCachedProductSnapshot(userId);
  return <RevisionView data={data} />;
}

export default async function RevisionPage({
  searchParams,
}: {
  searchParams?: Promise<{ id?: string }>;
}) {
  const userId = await requireUserId();
  const sp = searchParams ? await searchParams : {};
  if (sp?.id) {
    redirect(`/revision/session/${sp.id}`);
  }

  return (
    <Suspense fallback={<SkeletonRevision />}>
      <RevisionDataLoader userId={userId} />
    </Suspense>
  );
}

import { Suspense } from "react";
import { Metadata } from "next";
import { getCachedLearnData } from "@/features/product/services/product.service";
import { requireUserId } from "@/lib/auth-guard";
import { TopicsCatalogView } from "@/components/product/topics-catalog-view";
import LearnLoading from "../loading";

export const metadata: Metadata = {
  title: "Concept Topics | DSA Club",
  description: "Explore the complete DSA concept taxonomy, from foundational intuition to algorithmic mastery.",
};

async function TopicsDataLoader({ userId }: { userId: string }) {
  const data = await getCachedLearnData(userId);
  return <TopicsCatalogView topics={(data?.topics ?? []) as any} />;
}

export default async function TopicsCatalogPage() {
  const userId = await requireUserId();
  return (
    <Suspense fallback={<LearnLoading />}>
      <TopicsDataLoader userId={userId} />
    </Suspense>
  );
}

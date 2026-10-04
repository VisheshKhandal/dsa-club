import { Metadata } from "next";
import { requireUserId } from "@/lib/auth-guard";
import { getCachedLearningPathsData } from "@/features/product/services/product.service";
import { LearningPathsListView } from "@/components/product/learning-paths-view";

export const metadata: Metadata = {
  title: "Learning Paths | DSA Club",
  description: "Curated, structured curricula to take you from foundational intuition to algorithmic mastery.",
};

export default async function LearningPathsCatalogPage() {
  const userId = await requireUserId();
  const paths = await getCachedLearningPathsData(userId);

  return <LearningPathsListView paths={paths as any} />;
}

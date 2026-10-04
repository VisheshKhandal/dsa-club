import { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth-guard";
import { getCachedLearningPathDetailData } from "@/features/product/services/product.service";
import { LearningPathDetailView } from "@/components/product/learning-paths-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Learning Path | DSA Club`,
    description: `Structured progression curriculum on ${slug}`,
  };
}

export default async function LearningPathDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, userId] = await Promise.all([params, requireUserId()]);
  const path = await getCachedLearningPathDetailData(slug, userId);

  if (!path) {
    notFound();
  }

  return <LearningPathDetailView path={path as any} />;
}

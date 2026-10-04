import { Suspense } from "react";
import { TopicDetailView } from "@/components/product/topic-detail-view";
import { getCachedTopicDetailData } from "@/features/product/services/product.service";
import { requireUserId } from "@/lib/auth-guard";
import { resolveLearningPathContext } from "@/features/learning-paths/services/learning-path-continuity.service";
import TopicDetailLoading from "./loading";

async function TopicDataLoader({
  userId,
  slug,
  query,
}: {
  userId: string;
  slug: string;
  query?: { [key: string]: string | string[] | undefined };
}) {
  const pathSlug = typeof query?.path === "string" ? query.path : undefined;
  const stageParam = typeof query?.stage === "string" ? query.stage : undefined;
  const isFromPath = query?.source === "learning-path" || Boolean(pathSlug);

  const [data, learningPathContext] = await Promise.all([
    getCachedTopicDetailData(userId, slug),
    isFromPath && pathSlug
      ? resolveLearningPathContext({
          userId,
          pathSlug,
          stageOrder: stageParam,
          currentResource: { kind: "topic", slug },
        })
      : Promise.resolve(null),
  ]);

  return <TopicDetailView data={data} learningPathContext={learningPathContext} />;
}

export default async function TopicDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ slug }, query, userId] = await Promise.all([
    params,
    searchParams ? searchParams : Promise.resolve({} as { [key: string]: string | undefined }),
    requireUserId(),
  ]);

  return (
    <Suspense fallback={<TopicDetailLoading />}>
      <TopicDataLoader userId={userId} slug={slug} query={query} />
    </Suspense>
  );
}

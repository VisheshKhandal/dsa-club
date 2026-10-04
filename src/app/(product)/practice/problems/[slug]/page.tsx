import { notFound } from "next/navigation";
import { ProblemDetailView } from "@/components/product/data-views";
import { getProblemDetailData } from "@/features/product/services/product.service";
import { requireUserId } from "@/lib/auth-guard";
import { resolveLearningPathContext } from "@/features/learning-paths/services/learning-path-continuity.service";

export default async function ProblemPage({
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

  const pathSlug = typeof query?.path === "string" ? query.path : undefined;
  const stageParam = typeof query?.stage === "string" ? query.stage : undefined;
  const isFromPath = query?.source === "learning-path" || Boolean(pathSlug);

  const [data, learningPathContext] = await Promise.all([
    getProblemDetailData(userId, slug),
    isFromPath && pathSlug
      ? resolveLearningPathContext({
          userId,
          pathSlug,
          stageOrder: stageParam,
          currentResource: { kind: "problem", slug },
        })
      : Promise.resolve(null),
  ]);

  if (!data || !data.problem) {
    notFound();
  }

  return (
    <ProblemDetailView
      problem={data.problem}
      nextProblem={data.nextProblem}
      learningPathContext={learningPathContext}
    />
  );
}

import { notFound } from "next/navigation";
import { MissionModel } from "@/features/content/models/content.model";
import { MissionProgressModel } from "@/features/learning/models/learning.model";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireUserId } from "@/lib/auth-guard";
import { Types } from "mongoose";
import { LearningEngine } from "@/features/platform/engines/learning.engine";
import { MissionWorkspace } from "@/components/learning/mission-workspace";
import { getCachedMissionBySlug } from "@/features/content/services/curriculum-cache";
import { resolveLearningPathContext } from "@/features/learning-paths/services/learning-path-continuity.service";

export default async function MissionDetailsPage({
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

  await connectToDatabase();
  const uid = new Types.ObjectId(userId);

  const pathSlug = typeof query?.path === "string" ? query.path : undefined;
  const stageParam = typeof query?.stage === "string" ? query.stage : undefined;
  const isFromPath = query?.source === "learning-path" || Boolean(pathSlug);

  let mission = await getCachedMissionBySlug(slug);
  if (!mission) {
    mission = await MissionModel.findOne({ slug, isPublished: true }).populate("topicId patternId").lean();
  }
  if (!mission) {
    notFound();
  }

  const [progressDoc, learningPathContext] = await Promise.all([
    MissionProgressModel.findOne({ userId: uid, missionId: mission._id }).lean(),
    isFromPath && pathSlug
      ? resolveLearningPathContext({
          userId,
          pathSlug,
          stageOrder: stageParam,
          currentResource: { kind: "mission", slug },
        })
      : Promise.resolve(null),
  ]);

  const { stages, activeStageKey, progress } = await LearningEngine.getMissionStages(
    userId,
    String(mission._id),
    mission as any,
    progressDoc as any
  );

  return (
    <MissionWorkspace
      missionTitle={mission.title as string}
      missionId={String(mission._id)}
      topicName={String((mission.topicId as Record<string, unknown> | null)?.name ?? "Topic")}
      topicSlug={String((mission.topicId as Record<string, unknown> | null)?.slug ?? "")}
      stages={stages}
      activeStageKey={activeStageKey}
      initialStageKey={typeof query?.step === "string" ? query.step : undefined}
      progress={progress}
      learningPathContext={learningPathContext}
    />
  );
}

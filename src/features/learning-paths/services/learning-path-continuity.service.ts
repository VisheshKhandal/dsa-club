import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ProblemAttemptModel, MissionProgressModel } from "@/features/learning/models/learning.model";
import { getCachedLearningPathBySlug } from "@/features/content/services/curriculum-cache";
import type {
  LearningPathContext,
  LearningPathContextItem,
  LearningPathNextItem,
  LearningPathNextStage,
  LearningPathStageStats,
  ResumePointResult,
  StageItemKind,
} from "../types/learning-path-continuity.types";

function id(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && "_id" in (v as any)) return String((v as any)._id);
  return String(v);
}

export function normalizeStageTitle(title: string): string {
  if (!title) return "";
  return title.replace(/^Stage\s+\d+\s*:\s*/i, "").trim();
}

interface ResolveResumePointParams {
  userId: string;
  pathSlug: string;
  stageOrder?: number;
}

interface ResolveContextParams {
  userId: string;
  pathSlug: string;
  stageOrder?: number | string;
  currentResource: {
    kind: StageItemKind;
    slug: string;
  };
}

/**
 * Centralized Resume Point Resolver.
 * Determines the next unresolved item in the learning journey.
 * Order of resolution within stage: Problems (unsolved) -> Missions (incomplete).
 * If all items in stage are resolved, advances to next stage or signals path completion.
 */
export async function resolveResumePoint({
  userId,
  pathSlug,
  stageOrder,
}: ResolveResumePointParams): Promise<ResumePointResult | null> {
  if (!pathSlug || !userId) return null;

  await connectToDatabase();
  const rawPath = await getCachedLearningPathBySlug(pathSlug);
  if (!rawPath) return null;

  const uid = new Types.ObjectId(userId);
  const stages = (((rawPath as any).stages ?? []) as any[]).slice().sort(
    (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)
  );
  if (stages.length === 0) return null;

  // Collect all problem IDs & mission IDs across all stages of this path
  const allProblemIds: Types.ObjectId[] = [];
  const allMissionIds: Types.ObjectId[] = [];

  for (const st of stages) {
    for (const p of st.problemIds ?? []) {
      const pid = id(p);
      if (pid && Types.ObjectId.isValid(pid)) allProblemIds.push(new Types.ObjectId(pid));
    }
    for (const m of st.missionIds ?? []) {
      const mid = id(m);
      if (mid && Types.ObjectId.isValid(mid)) allMissionIds.push(new Types.ObjectId(mid));
    }
  }

  // Bounded parallel queries (only for items in this learning path)
  const [solvedAttempts, missionProgressList] = await Promise.all([
    allProblemIds.length > 0
      ? ProblemAttemptModel.find({
          userId: uid,
          problemId: { $in: allProblemIds },
          status: "solved",
        })
          .select("problemId")
          .lean()
      : [],
    allMissionIds.length > 0
      ? MissionProgressModel.find({
          userId: uid,
          missionId: { $in: allMissionIds },
        })
          .select("missionId progress status")
          .lean()
      : [],
  ]);

  const solvedProblemIds = new Set(
    (solvedAttempts as any[]).map((doc) => id(doc.problemId))
  );
  const missionProgressMap = new Map(
    (missionProgressList as any[]).map((doc) => [id(doc.missionId), doc])
  );

  // Compute completion stats for each stage
  const stageStatsList = stages.map((st, sIdx) => {
    const problems = (st.problemIds ?? []).map((p: any) => {
      const pId = id(p);
      return {
        id: pId,
        slug: String(p.slug ?? pId),
        title: String(p.title ?? "Problem"),
        isSolved: solvedProblemIds.has(pId),
      };
    });

    const missions = (st.missionIds ?? []).map((m: any) => {
      const mId = id(m);
      const prog = missionProgressMap.get(mId);
      const isCompleted =
        prog?.status === "completed" || Number(prog?.progress ?? 0) >= 100;
      return {
        id: mId,
        slug: String(m.slug ?? mId),
        title: String(m.title ?? "Mission"),
        isCompleted,
      };
    });

    const totalTrackable = problems.length + missions.length;
    const completedTrackable =
      problems.filter((p: any) => p.isSolved).length +
      missions.filter((m: any) => m.isCompleted).length;
    const progress =
      totalTrackable > 0
        ? Math.round((completedTrackable / totalTrackable) * 100)
        : 100;
    const isCompleted = progress >= 100;

    return {
      stage: st,
      stageIndex: sIdx,
      order: Number(st.order ?? sIdx + 1),
      title: normalizeStageTitle(String(st.title ?? `Stage ${sIdx + 1}`)),
      problems,
      missions,
      progress,
      isCompleted,
    };
  });

  // Determine active stage
  let activeStageMeta = stageStatsList[0];
  if (typeof stageOrder === "number" && !isNaN(stageOrder)) {
    const matched = stageStatsList.find(
      (s) => s.order === stageOrder || s.stageIndex + 1 === stageOrder
    );
    if (matched) activeStageMeta = matched;
  } else {
    const firstIncomplete = stageStatsList.find((s) => !s.isCompleted);
    activeStageMeta = firstIncomplete ?? stageStatsList[stageStatsList.length - 1];
  }

  const currentStageIdx = activeStageMeta.stageIndex;
  const isAllStagesComplete = stageStatsList.every((s) => s.isCompleted);

  // Determine next item in current active stage
  let nextItem: LearningPathNextItem | null = null;
  let nextStageInfo: LearningPathNextStage | null = null;

  const nextUnsolvedProblem = activeStageMeta.problems.find((p: any) => !p.isSolved);
  const nextIncompleteMission = activeStageMeta.missions.find((m: any) => !m.isCompleted);

  if (nextUnsolvedProblem) {
    nextItem = {
      kind: "problem",
      id: nextUnsolvedProblem.id,
      slug: nextUnsolvedProblem.slug,
      title: nextUnsolvedProblem.title,
      url: `/practice/problems/${nextUnsolvedProblem.slug}?path=${pathSlug}&stage=${activeStageMeta.order}&source=learning-path`,
      buttonLabel: `Continue Stage →`,
    };
  } else if (nextIncompleteMission) {
    nextItem = {
      kind: "mission",
      id: nextIncompleteMission.id,
      slug: nextIncompleteMission.slug,
      title: nextIncompleteMission.title,
      url: `/missions/${nextIncompleteMission.slug}?path=${pathSlug}&stage=${activeStageMeta.order}&source=learning-path`,
      buttonLabel: `Continue Mission →`,
    };
  } else if (currentStageIdx < stages.length - 1) {
    // Current stage complete -> Advance to next stage
    const nextSt = stageStatsList[currentStageIdx + 1];
    nextStageInfo = {
      order: nextSt.order,
      title: nextSt.title,
      url: `/learning-paths/${pathSlug}?stage=${nextSt.order}`,
    };
    nextItem = {
      kind: "stage",
      title: `Stage ${nextSt.order}: ${nextSt.title}`,
      url: `/learning-paths/${pathSlug}?stage=${nextSt.order}`,
      buttonLabel: `Continue to Stage ${nextSt.order} →`,
    };
  } else {
    // Whole path completed
    nextItem = {
      kind: "path_completed",
      title: "All Stages Completed",
      url: `/learning-paths/${pathSlug}`,
      buttonLabel: "Review Learning Path",
    };
  }

  return {
    pathId: id((rawPath as any)._id),
    pathSlug: String((rawPath as any).slug),
    pathTitle: String((rawPath as any).title),
    stageOrder: activeStageMeta.order,
    stageTitle: activeStageMeta.title,
    totalStages: stages.length,
    stageProgress: activeStageMeta.progress,
    isStageCompleted: activeStageMeta.isCompleted,
    isPathCompleted: isAllStagesComplete,
    nextItem,
    nextStage: nextStageInfo,
  };
}

/**
 * Resolves the full LearningPathContext for a specific resource page.
 * Provides "You Are Here" orientation, stage progress metrics, and dynamic continuation.
 */
export async function resolveLearningPathContext({
  userId,
  pathSlug,
  stageOrder,
  currentResource,
}: ResolveContextParams): Promise<LearningPathContext | null> {
  if (!pathSlug || !userId || !currentResource?.slug) return null;

  await connectToDatabase();
  const rawPath = await getCachedLearningPathBySlug(pathSlug);
  if (!rawPath) return null;

  const stages = (((rawPath as any).stages ?? []) as any[]).slice().sort(
    (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)
  );
  if (stages.length === 0) return null;

  const parsedStageOrder = Number(stageOrder);
  let matchedStageIdx = 0;
  if (!isNaN(parsedStageOrder)) {
    const idx = stages.findIndex(
      (s, i) => Number(s.order ?? 0) === parsedStageOrder || i + 1 === parsedStageOrder
    );
    if (idx >= 0) matchedStageIdx = idx;
  }

  const stage = stages[matchedStageIdx];
  const stageNum = Number(stage.order ?? matchedStageIdx + 1);
  const stageTitle = normalizeStageTitle(String(stage.title ?? `Stage ${stageNum}`));

  const stageProblemIds = (stage.problemIds ?? []).map((p: any) => id(p)).filter(Boolean);
  const stageMissionIds = (stage.missionIds ?? []).map((m: any) => id(m)).filter(Boolean);

  const uid = new Types.ObjectId(userId);

  // Bounded parallel query for this stage's items only
  const [solvedAttempts, missionProgressList] = await Promise.all([
    stageProblemIds.length > 0
      ? ProblemAttemptModel.find({
          userId: uid,
          problemId: { $in: stageProblemIds.map((pid: string) => new Types.ObjectId(pid)) },
          status: "solved",
        })
          .select("problemId")
          .lean()
      : [],
    stageMissionIds.length > 0
      ? MissionProgressModel.find({
          userId: uid,
          missionId: { $in: stageMissionIds.map((mid: string) => new Types.ObjectId(mid)) },
        })
          .select("missionId progress status")
          .lean()
      : [],
  ]);

  const solvedProblemIds = new Set(
    (solvedAttempts as any[]).map((doc) => id(doc.problemId))
  );
  const missionProgressMap = new Map(
    (missionProgressList as any[]).map((doc) => [id(doc.missionId), doc])
  );

  const stageProblems = (stage.problemIds ?? []).map((p: any, pIdx: number) => {
    const pId = id(p);
    return {
      id: pId,
      slug: String(p.slug ?? pId),
      title: String(p.title ?? "Problem"),
      isSolved: solvedProblemIds.has(pId),
      position: pIdx + 1,
    };
  });

  const stageMissions = (stage.missionIds ?? []).map((m: any, mIdx: number) => {
    const mId = id(m);
    const prog = missionProgressMap.get(mId);
    const isCompleted =
      prog?.status === "completed" || Number(prog?.progress ?? 0) >= 100;
    return {
      id: mId,
      slug: String(m.slug ?? mId),
      title: String(m.title ?? "Mission"),
      isCompleted,
      position: mIdx + 1,
    };
  });

  const stageTopics = (stage.topicIds ?? []).map((t: any, tIdx: number) => {
    const tId = id(t);
    return {
      id: tId,
      slug: String(t.slug ?? tId),
      title: String(t.name ?? t.title ?? "Topic"),
      position: tIdx + 1,
    };
  });

  const stagePatterns = (stage.patternIds ?? []).map((pt: any, ptIdx: number) => {
    const ptId = id(pt);
    return {
      id: ptId,
      slug: String(pt.slug ?? ptId),
      title: String(pt.name ?? pt.title ?? "Pattern"),
      position: ptIdx + 1,
    };
  });

  // Determine current item spatial context
  let currentItem: LearningPathContextItem = {
    kind: currentResource.kind,
    id: "",
    slug: currentResource.slug,
    title: "",
    position: 1,
    totalInKind: 1,
    isCompleted: false,
  };

  if (currentResource.kind === "problem") {
    const prob = stageProblems.find((p: any) => p.slug === currentResource.slug);
    currentItem = {
      kind: "problem",
      id: prob?.id ?? "",
      slug: currentResource.slug,
      title: prob?.title ?? "Problem",
      position: prob ? prob.position : 1,
      totalInKind: stageProblems.length,
      isCompleted: prob?.isSolved ?? false,
    };
  } else if (currentResource.kind === "mission") {
    const mis = stageMissions.find((m: any) => m.slug === currentResource.slug);
    currentItem = {
      kind: "mission",
      id: mis?.id ?? "",
      slug: currentResource.slug,
      title: mis?.title ?? "Mission",
      position: mis ? mis.position : 1,
      totalInKind: stageMissions.length,
      isCompleted: mis?.isCompleted ?? false,
    };
  } else if (currentResource.kind === "topic") {
    const top = stageTopics.find((t: any) => t.slug === currentResource.slug);
    currentItem = {
      kind: "topic",
      id: top?.id ?? "",
      slug: currentResource.slug,
      title: top?.title ?? "Topic",
      position: top ? top.position : 1,
      totalInKind: stageTopics.length,
      isCompleted: true,
    };
  } else if (currentResource.kind === "pattern") {
    const pat = stagePatterns.find((p: any) => p.slug === currentResource.slug);
    currentItem = {
      kind: "pattern",
      id: pat?.id ?? "",
      slug: currentResource.slug,
      title: pat?.title ?? "Pattern",
      position: pat ? pat.position : 1,
      totalInKind: stagePatterns.length,
      isCompleted: true,
    };
  }

  // Calculate stage progress
  const solvedProblemsCount = stageProblems.filter((p: any) => p.isSolved).length;
  const completedMissionsCount = stageMissions.filter((m: any) => m.isCompleted).length;
  const totalTrackable = stageProblems.length + stageMissions.length;
  const completedTrackable = solvedProblemsCount + completedMissionsCount;
  const stageProgress =
    totalTrackable > 0
      ? Math.round((completedTrackable / totalTrackable) * 100)
      : 100;
  const isStageCompleted = stageProgress >= 100;

  const stageStats: LearningPathStageStats = {
    totalProblems: stageProblems.length,
    solvedProblems: solvedProblemsCount,
    totalMissions: stageMissions.length,
    completedMissions: completedMissionsCount,
    totalItems: totalTrackable,
    completedItems: completedTrackable,
  };

  // Determine dynamic next item
  let nextItem: LearningPathNextItem | null = null;
  let nextStageInfo: LearningPathNextStage | null = null;

  // Find next unresolved problem in this stage
  const nextProblem = stageProblems.find(
    (p: any) => !p.isSolved && p.slug !== (currentItem.isCompleted ? "" : currentResource.slug)
  ) ?? stageProblems.find((p: any) => !p.isSolved);

  const nextMission = stageMissions.find(
    (m: any) => !m.isCompleted && m.slug !== (currentItem.isCompleted ? "" : currentResource.slug)
  ) ?? stageMissions.find((m: any) => !m.isCompleted);

  if (nextProblem) {
    nextItem = {
      kind: "problem",
      id: nextProblem.id,
      slug: nextProblem.slug,
      title: nextProblem.title,
      url: `/practice/problems/${nextProblem.slug}?path=${pathSlug}&stage=${stageNum}&source=learning-path`,
      buttonLabel: `Continue Stage →`,
    };
  } else if (nextMission) {
    nextItem = {
      kind: "mission",
      id: nextMission.id,
      slug: nextMission.slug,
      title: nextMission.title,
      url: `/missions/${nextMission.slug}?path=${pathSlug}&stage=${stageNum}&source=learning-path`,
      buttonLabel: `Continue Mission →`,
    };
  } else if (matchedStageIdx < stages.length - 1) {
    const nextSt = stages[matchedStageIdx + 1];
    const nextStOrder = Number(nextSt.order ?? matchedStageIdx + 2);
    const nextStTitle = normalizeStageTitle(String(nextSt.title ?? `Stage ${nextStOrder}`));
    nextStageInfo = {
      order: nextStOrder,
      title: nextStTitle,
      url: `/learning-paths/${pathSlug}?stage=${nextStOrder}`,
    };
    nextItem = {
      kind: "stage",
      title: `Stage ${nextStOrder}: ${nextStTitle}`,
      url: `/learning-paths/${pathSlug}?stage=${nextStOrder}`,
      buttonLabel: `Continue to Stage ${nextStOrder} →`,
    };
  } else {
    nextItem = {
      kind: "path_completed",
      title: "All Stages Completed",
      url: `/learning-paths/${pathSlug}`,
      buttonLabel: "Review Learning Path",
    };
  }

  return {
    pathId: id((rawPath as any)._id),
    pathSlug: String((rawPath as any).slug),
    pathTitle: String((rawPath as any).title),
    stageOrder: stageNum,
    stageTitle,
    totalStages: stages.length,
    stageProgress,
    isStageCompleted,
    isPathCompleted: isStageCompleted && matchedStageIdx === stages.length - 1,
    currentItem,
    stageStats,
    nextItem,
    backToStageUrl: `/learning-paths/${pathSlug}?stage=${stageNum}`,
    backToStageLabel: `Back to Stage ${stageNum}`,
    nextStage: nextStageInfo,
  };
}

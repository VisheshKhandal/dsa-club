import { PatternModel, ProblemModel, MissionModel } from "@/features/content/models/content.model";
import {
  PatternMasteryModel,
  BookmarkModel,
  ReflectionLogModel,
  PatternRecognitionAttemptModel,
  ProblemAttemptModel,
} from "@/features/learning/models/learning.model";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireUserId } from "@/lib/auth-guard";
import { Types } from "mongoose";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PatternDetailView } from "@/components/product/pattern-detail-view";
import PatternDetailLoading from "./loading";

import {
  getCachedPatternBySlug,
  getCachedPublishedPatterns,
  getCachedPublishedMissions,
} from "@/features/content/services/curriculum-cache";
import { resolveLearningPathContext } from "@/features/learning-paths/services/learning-path-continuity.service";


async function PatternDataLoader({
  slug,
  userId,
  query,
}: {
  slug: string;
  userId: string;
  query?: { [key: string]: string | string[] | undefined };
}) {
  await connectToDatabase();
  const uid = new Types.ObjectId(userId);

  const pathSlug = typeof query?.path === "string" ? query.path : undefined;
  const stageParam = typeof query?.stage === "string" ? query.stage : undefined;
  const isFromPath = query?.source === "learning-path" || Boolean(pathSlug);


  let pattern = await getCachedPatternBySlug(slug);
  if (!pattern) {
    pattern = await PatternModel.findOne({ slug, isPublished: true })
      .populate("topicId")
      .lean();
  }

  if (!pattern) notFound();

  const patternId = pattern._id as Types.ObjectId;

  const [problems, mastery, reflections, bookmark, recognitionAttempts, siblingPatterns, allMissions] = await Promise.all([
    ProblemModel.find({ patternIds: patternId, isPublished: true })
      .select("_id slug title summary difficulty source sourceUrl patternIds qualityScore")
      .sort({ qualityScore: -1 })
      .lean(),
    PatternMasteryModel.findOne({ userId: uid, patternId }).lean(),
    ReflectionLogModel.find({
      userId: uid,
      entityType: "pattern",
      $or: [{ entityId: patternId }],
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    BookmarkModel.findOne({ userId: uid, entityType: "pattern", entityId: patternId }).lean(),
    PatternRecognitionAttemptModel.find({ userId: uid, expectedPatternId: patternId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    getCachedPublishedPatterns(),
    getCachedPublishedMissions(),
  ]);

  const relatedMissions = (allMissions as any[]).filter(
    (m: any) => String(m.patternId?._id ?? m.patternId) === String(patternId)
  );

  const problemIds = (problems as any[]).map((p) => p._id);
  const problemAttempts = problemIds.length > 0
    ? await ProblemAttemptModel.find({ userId: uid, problemId: { $in: problemIds } })
        .select("problemId status createdAt")
        .sort({ createdAt: -1 })
        .lean()
    : [];

  const attemptMap = new Map<string, string>();
  for (const a of problemAttempts as any[]) {
    const pid = String(a.problemId);
    if (!attemptMap.has(pid)) {
      attemptMap.set(pid, String(a.status));
    } else if (a.status === "solved") {
      attemptMap.set(pid, "solved");
    }
  }

  function id(v: unknown) {
    return String(v);
  }
  function difficulty(v: unknown) {
    const t = String(v ?? "easy");
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  const topicDoc = pattern.topicId as Record<string, unknown> | null;
  const masteryDoc = mastery as any;

  const problemsSolvedCount = (problems as any[]).filter((p) => attemptMap.get(id(p._id)) === "solved").length;
  const hasAttemptedProblems = problemAttempts.length > 0;
  const allProblemsSolved = problems.length > 0 && problemsSolvedCount === problems.length;

  const dto = {
    id: id(pattern._id),
    slug: String(pattern.slug),
    name: String(pattern.name),
    description: String(pattern.description),
    whenToUse: String((pattern as any).whenToUse ?? ""),
    mentalModel: String((pattern as any).mentalModel ?? ""),
    variations: (((pattern as any).variations ?? []) as string[]).filter(Boolean),
    difficulty: difficulty(pattern.difficulty),
    topic: {
      name: String(topicDoc?.name ?? "General"),
      slug: String(topicDoc?.slug ?? ""),
    },
    keywords: ((pattern.signalKeywords ?? []) as string[]).filter(Boolean),
    progress: Number(masteryDoc?.masteryScore ?? 0),
    mastery: {
      recognitionScore: Number(masteryDoc?.recognitionScore ?? 0),
      applicationScore: Number(masteryDoc?.applicationScore ?? 0),
      transferScore: Number(masteryDoc?.transferScore ?? 0),
      totalAttempts: Number(masteryDoc?.totalAttempts ?? 0),
      successfulAttempts: Number(masteryDoc?.successfulAttempts ?? 0),
    },
    bookmarked: !!bookmark,
    problemsSolvedCount,
    hasAttemptedProblems,
    allProblemsSolved,
    problems: (problems as any[]).map((p) => {
      const pId = id(p._id);
      const rawStatus = attemptMap.get(pId);
      const attemptStatus: "solved" | "started" | "not_started" =
        rawStatus === "solved" ? "solved" : rawStatus === "started" ? "started" : "not_started";
      return {
        id: pId,
        slug: String(p.slug),
        title: String(p.title),
        summary: String(p.summary ?? ""),
        difficulty: difficulty(p.difficulty),
        source: String(p.source),
        sourceUrl: String(p.sourceUrl ?? ""),
        patternIds: ((p.patternIds ?? []) as any[]).map(id),
        attemptStatus,
      };
    }),
    relatedMissions: (relatedMissions as any[]).map((m) => ({
      id: id(m._id),
      slug: String(m.slug),
      title: String(m.title),
    })),
    reflections: (reflections as any[]).map((r) => ({
      id: id(r._id),
      content: String(r.content),
      selfRating: Number(r.selfRating ?? 0),
      createdAt: new Date(r.createdAt as Date).toISOString(),
    })),
    recognitionHistory: (recognitionAttempts as any[]).map((a) => ({
      id: id(a._id),
      isCorrect: Boolean(a.isCorrect),
      reasoning: String(a.reasoning ?? ""),
      signalIdentified: String(a.signalIdentified ?? ""),
      durationSeconds: Number(a.durationSeconds ?? 0),
      createdAt: new Date(a.createdAt as Date).toISOString(),
    })),
    allPatterns: (siblingPatterns as any[]).map((p) => ({
      id: id(p._id),
      name: String(p.name),
      slug: String(p.slug),
    })),
  };

  const learningPathContext = isFromPath && pathSlug
    ? await resolveLearningPathContext({
        userId,
        pathSlug,
        stageOrder: stageParam,
        currentResource: { kind: "pattern", slug },
      })
    : null;

  return <PatternDetailView pattern={dto} learningPathContext={learningPathContext} />;
}

export default async function PatternDetailPage({
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
    <Suspense fallback={<PatternDetailLoading />}>
      <PatternDataLoader slug={slug} userId={userId} query={query} />
    </Suspense>
  );
}


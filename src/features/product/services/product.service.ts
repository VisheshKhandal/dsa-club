import { Types } from "mongoose";
import { startOfDay, subDays } from "date-fns";
import { unstable_cache, revalidateTag } from "next/cache";
import { connectToDatabase } from "@/lib/db/mongodb";
import { CompanyModel, CompanyPatternModel, CompanyProblemModel, LearningPathModel, MissionModel, PatternModel, ProblemModel, TopicModel } from "@/features/content/models/content.model";
import { BookmarkModel, LearningSessionModel, MissionProgressModel, PatternMasteryModel, PatternRecognitionAttemptModel, ProblemAttemptModel, ReflectionLogModel, RoadmapModel, RoadmapTemplateModel, TopicProgressModel } from "@/features/learning/models/learning.model";
import { AchievementModel, ActivityEventModel, DailyPlanModel, NotificationModel, RevisionHistoryModel, RevisionQueueModel, UserAchievementModel, UserStatisticsModel } from "@/features/intelligence/models/intelligence.model";
import { PlanTaskModel } from "@/features/intelligence/models/plan-task.model";
import { LearningEventModel } from "@/features/intelligence/models/learning-event.model";
import { UserTopicProgressModel } from "@/features/intelligence/models/user-topic-progress.model";
import { UserModel, UserProfileModel } from "@/features/identity/models/user.model";
import { buildPracticeRecommendations } from "./learning-loop.selectors";
import { searchMongoProvider } from "@/features/platform/services/search.service";
import { resolveStageMissions } from "@/features/roadmaps/services/roadmap-mission-resolver.service";
import { resolveUserActivePlan } from "@/features/intelligence/services/plan-migration.service";
import { resolveCurrentPlanDay, resolveLearningExecutionSnapshot } from "@/features/intelligence/services/learning-execution-snapshot";
import { aggregateActivityMetrics } from "./activity-aggregator";
import { resolveAuthoritativeLearningAction } from "@/features/intelligence/decisions/decision-selector";
import { getSharedLearnerGlobalProgress } from "@/features/progress/services/shared-progress.service";
import type { DashboardDTO, DashboardTopicEvidence } from "../types/dashboard-dto.types";
// ── Static imports (moved from dynamic imports inside request path) ──
import * as ProgressServiceModule from "@/features/progress/services/progress.service";
import * as ProgressEngineModule from "@/features/platform/engines/progress.engine";
import * as RecommendationEngineModule from "@/features/platform/engines/recommendation.engine";
import { calculateLevelFromXp } from "./gamification.service";
import {
  getCachedPublishedTopics,
  getCachedTopicBySlug,
  getCachedPublishedPatterns,
  getCachedActiveCompanies,
  getCachedRoadmapTemplate,
  getCachedLearningPaths,
  getCachedPublishedMissions,
  getCachedPublishedProblems,
  getCachedProblemBySlug,
} from "@/features/content/services/curriculum-cache";

type LeanDoc = Record<string, unknown> & { _id: unknown };
type AnyDoc = Record<string, any>;

function id(value: unknown) {
  return String(value);
}

function asObjectId(value: string) {
  return new Types.ObjectId(value);
}

const _istDateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dateKey(date: Date | string) {
  try {
    return _istDateFmt.format(new Date(date));
  } catch {
    return new Date(date).toISOString().slice(0, 10);
  }
}

export function normalizeStageTitle(title: string): string {
  if (!title) return "";
  return title.replace(/^Stage\s+\d+\s*:\s*/i, "").trim();
}

function difficulty(value: unknown) {
  const text = String(value ?? "easy");
  return text.charAt(0).toUpperCase() + text.slice(1).replace("_", " ");
}

async function resolveRevisionTargets(revisions: AnyDoc[]) {
  const idsByType = revisions.reduce((acc, item) => {
    const type = String(item.entityType);
    if (!acc[type]) acc[type] = [];
    acc[type].push(item.entityId);
    return acc;
  }, {} as Record<string, unknown[]>);

  const [topics, patterns, problems, missions] = await Promise.all([
    idsByType.topic?.length ? TopicModel.find({ _id: { $in: idsByType.topic } }).select("slug name difficulty").lean() : [],
    idsByType.pattern?.length ? PatternModel.find({ _id: { $in: idsByType.pattern } }).select("slug name difficulty").lean() : [],
    idsByType.problem?.length ? ProblemModel.find({ _id: { $in: idsByType.problem } }).select("slug title difficulty source sourceUrl").lean() : [],
    idsByType.mission?.length ? MissionModel.find({ _id: { $in: idsByType.mission } }).select("slug title difficulty estimatedMinutes").lean() : [],
  ]);

  const targets = new Map<string, { title: string; href: string; detail: string; externalUrl?: string }>();
  for (const topic of topics as AnyDoc[]) targets.set(id(topic._id), { title: String(topic.name), href: `/learn/topics/${topic.slug}`, detail: difficulty(topic.difficulty) });
  for (const pattern of patterns as AnyDoc[]) targets.set(id(pattern._id), { title: String(pattern.name), href: `/patterns/${pattern.slug}`, detail: difficulty(pattern.difficulty) });
  for (const problem of problems as AnyDoc[]) targets.set(id(problem._id), { title: String(problem.title), href: `/practice/problems/${problem.slug}`, detail: `${difficulty(problem.difficulty)} · ${String(problem.source ?? "practice")}`, externalUrl: String(problem.sourceUrl ?? "") });
  for (const mission of missions as AnyDoc[]) targets.set(id(mission._id), { title: String(mission.title), href: `/missions/${mission.slug}`, detail: `${difficulty(mission.difficulty)} · ${Number(mission.estimatedMinutes ?? 0)} min` });
  return targets;
}

function missionIdFromProgress(item: AnyDoc) {
  const mission = item.missionId as LeanDoc | string | undefined;
  return typeof mission === "object" && mission?._id ? id(mission._id) : id(mission);
}

async function findDashboardMission(
  executionSnapshot: any,
  roadmap: AnyDoc | null | undefined,
  progressDocs: AnyDoc[]
) {
  const progressByMission = new Map(progressDocs.map((item) => [missionIdFromProgress(item), item]));

  // 1. Current learner's active plan and current plan day
  const todayTasks = (executionSnapshot?.todayTasks || []) as AnyDoc[];
  const planMissionTask = todayTasks.find(
    (t: AnyDoc) => (t.entityType === "mission" || String(t.targetUrl || "").includes("/missions/")) && t.status !== "completed"
  );
  if (planMissionTask) {
    let missionDoc = null;
    if (planMissionTask.entityId) {
      missionDoc = await MissionModel.findById(planMissionTask.entityId).populate("topicId patternId").lean();
    } else if (planMissionTask.targetUrl) {
      const slugMatch = String(planMissionTask.targetUrl).match(/\/missions\/([a-z0-9-]+)/);
      if (slugMatch?.[1]) {
        missionDoc = await MissionModel.findOne({ slug: slugMatch[1], isPublished: true }).populate("topicId patternId").lean();
      }
    }
    if (missionDoc && (missionDoc as any).isPublished) {
      const prog = progressByMission.get(id((missionDoc as any)._id)) ?? null;
      if (prog?.status !== "completed") {
        return { activeStage: null, activeMission: missionDoc, activeMissionProgress: prog };
      }
    }
  }

  // If plan day has an active topic, check if an incomplete mission exists under that topic
  if (executionSnapshot?.currentPlanDay?.topicSlug) {
    const dayTopicSlug = executionSnapshot.currentPlanDay.topicSlug;
    const topicDoc = await TopicModel.findOne({ slug: dayTopicSlug }).lean();
    if (topicDoc) {
      const topicMissions = await MissionModel.find({ topicId: (topicDoc as any)._id, isPublished: true })
        .populate("topicId patternId")
        .sort({ order: 1, createdAt: 1 })
        .lean();
      if (topicMissions.length) {
        const nextInTopic = (topicMissions as AnyDoc[]).find((m) => progressByMission.get(id(m._id))?.status !== "completed");
        if (nextInTopic) {
          return { activeStage: null, activeMission: nextInTopic, activeMissionProgress: progressByMission.get(id(nextInTopic._id)) ?? null };
        }
      }
    }
  }

  // 2. Learner's selected learning path and its configured stage/mission order
  const stages = [...((roadmap?.stages ?? []) as AnyDoc[])].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
  const activeStage = stages.find((stage) => stage.status === "active") ?? stages.find((stage) => stage.status !== "completed");

  const stageMissions = (await resolveStageMissions(activeStage)) as AnyDoc[];
  const stageMissionIds = stageMissions.map((mission: AnyDoc) => id(mission._id));
  if (stageMissionIds.length) {
    const completed = new Set(progressDocs.filter((item) => item.status === "completed").map(missionIdFromProgress));
    const byId = new Map((stageMissions as AnyDoc[]).map((mission) => [id(mission._id), mission]));
    const inProgressInStage = stageMissionIds.find((mId) => progressByMission.get(mId)?.status === "in_progress");
    const nextMissionId = inProgressInStage ?? stageMissionIds.find((missionId: string) => byId.has(missionId) && !completed.has(missionId));
    if (nextMissionId) return { activeStage, activeMission: byId.get(nextMissionId), activeMissionProgress: progressByMission.get(nextMissionId) ?? null };
  }

  // 3. A valid in-progress mission or task
  const inProgress = progressDocs.find((item) => item.status === "in_progress");
  if (inProgress) {
    const mission = await MissionModel.findById(missionIdFromProgress(inProgress)).populate("topicId patternId").lean();
    if (mission?.isPublished) return { activeStage: null, activeMission: mission, activeMissionProgress: inProgress };
  }

  for (const stage of stages.filter((item) => item.status !== "completed")) {
    const nextStageMissions = await resolveStageMissions(stage);
    const mission = (nextStageMissions as AnyDoc[]).find((candidate: AnyDoc) => progressByMission.get(id(candidate._id))?.status !== "completed");
    if (mission) {
      return { activeStage: stage, activeMission: mission, activeMissionProgress: progressByMission.get(id(mission._id)) ?? null };
    }
  }

  // 4. The next incomplete mission according to explicit foundational curriculum order and prerequisite relationships
  const publishedMissions = (await getCachedPublishedMissions()) as AnyDoc[];
  if (publishedMissions.length) {
    const nextCurriculumMission = publishedMissions.find((m) => progressByMission.get(id(m._id))?.status !== "completed");
    if (nextCurriculumMission) {
      return { activeStage: null, activeMission: nextCurriculumMission, activeMissionProgress: progressByMission.get(id(nextCurriculumMission._id)) ?? null };
    }
  }

  // 5. A clear choose-a-path/choose-a-topic empty state when no reliable learner context exists
  return { activeStage: null, activeMission: null, activeMissionProgress: null };
}

export function toDTO<T>(
  obj: T,
  ancestors = new Set<object>(),
  memo = new WeakMap<object, any>()
): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (obj instanceof Date) return obj.toISOString() as any;

  if (
    obj instanceof Types.ObjectId ||
    (obj as any)._bsontype === 'ObjectID' ||
    (obj as any)._bsontype === 'ObjectId'
  ) {
    return obj.toString() as any;
  }

  // Prevent infinite recursion on true circular object references (active in ancestor call stack)
  if (ancestors.has(obj as object)) {
    return null as any;
  }

  // Return memoized DTO for shared DAG references (non-cyclical duplicates)
  if (memo.has(obj as object)) {
    return memo.get(obj as object);
  }

  let target: any = obj;
  // If target has a Mongoose toObject() method, call it to get plain representation
  if (typeof target.toObject === 'function') {
    try {
      const converted = target.toObject();
      if (converted && typeof converted === 'object') {
        target = converted;
        if (ancestors.has(target)) return null as any;
        if (memo.has(target)) return memo.get(target);
      }
    } catch {
      // fallback to original target
    }
  } else if (target._doc && typeof target._doc === 'object') {
    target = target._doc;
    if (ancestors.has(target)) return null as any;
    if (memo.has(target)) return memo.get(target);
  }

  if (target instanceof Date) return target.toISOString() as any;
  if (
    target instanceof Types.ObjectId ||
    target._bsontype === 'ObjectID' ||
    target._bsontype === 'ObjectId'
  ) {
    return target.toString() as any;
  }

  ancestors.add(obj as object);
  if (target !== obj) ancestors.add(target);

  try {
    if (Array.isArray(target)) {
      const resArr = target.map((item) => toDTO(item, ancestors, memo));
      memo.set(obj as object, resArr);
      if (target !== obj) memo.set(target, resArr);
      return resArr as any;
    }

    const res: Record<string, any> = {};
    for (const key of Object.keys(target)) {
      if (
        key.startsWith('$') ||
        key === '_doc' ||
        key === 'schema' ||
        key === '__v' ||
        key === 'db' ||
        key === 'model' ||
        key === 'ownerDocument' ||
        key === 'collection' ||
        key === 'connection' ||
        key === 'session'
      ) {
        continue;
      }
      res[key] = toDTO(target[key], ancestors, memo);
    }
    memo.set(obj as object, res);
    if (target !== obj) memo.set(target, res);
    return res as any;
  } finally {
    ancestors.delete(obj as object);
    if (target !== obj) ancestors.delete(target);
  }
}

export async function getProductSnapshot(
  userId: string,
  options?: { includeTopicExplanations?: boolean }
) {
  await connectToDatabase();
  const uid = asObjectId(userId);
  const past28DaysDate = subDays(startOfDay(new Date()), 27);
  const [
    user,
    profile,
    roadmap,
    statsDoc,
    topicProgress,
    missionProgress,
    dueRevisions,
    achievements,
    notifications,
    sessions,
    weeklyAttempts,
    weeklyRevisions,
    recentAttempts,
    completedReviews,
    patternMastery,
    activePlanResult,
    completedPlanTasks,
    learningEvents,
    userTopicProgress,
    globalProgress,
  ] = await Promise.all([
    UserModel.findById(uid).lean(),
    UserProfileModel.findOne({ userId: uid }).populate("targetCompanyIds knownTopicIds").lean(),
    RoadmapModel.findOne({ userId: uid, status: "active" }).sort({ updatedAt: -1 }).lean(),
    UserStatisticsModel.findOne({ userId: uid }).lean(),
    TopicProgressModel.find({ userId: uid }).populate("topicId").lean(),
    MissionProgressModel.find({ userId: uid }).populate("missionId").sort({ updatedAt: -1 }).lean(),
    RevisionQueueModel.find({ userId: uid, state: { $in: ["due", "scheduled"] }, dueAt: { $lte: new Date() } }).sort({ priority: -1, dueAt: 1 }).limit(8).lean(),
    UserAchievementModel.find({ userId: uid }).populate("achievementId").sort({ unlockedAt: -1 }).limit(6).lean(),
    NotificationModel.find({ userId: uid, status: { $ne: "archived" } }).sort({ scheduledAt: -1 }).limit(8).lean(),
    // Only fetch the 3 fields needed for activityHistory chart
    LearningSessionModel.find({ userId: uid, startedAt: { $gte: past28DaysDate } })
      .select("startedAt endedAt focusedSeconds")
      .lean(),
    // Fetch fields needed for weekly attempt stats and activity minutes
    ProblemAttemptModel.find({ userId: uid, createdAt: { $gte: past28DaysDate } })
      .select("createdAt status durationSeconds problemId")
      .lean(),
    // Only fetch the date field needed for revision count
    RevisionHistoryModel.find({ userId: uid, reviewedAt: { $gte: past28DaysDate } })
      .select("reviewedAt")
      .lean(),
    // recentAttempts: fetch only needed fields + populate only title/slug from problem
    ProblemAttemptModel.find({ userId: uid })
      .select("status strategy hintsUsed createdAt problemId")
      .populate({ path: "problemId", select: "title slug" })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean(),
    RevisionHistoryModel.countDocuments({ userId: uid }),
    PatternMasteryModel.find({ userId: uid }).populate("patternId topicId").lean(),
    resolveLearningExecutionSnapshot(userId).catch(() => null),
    // Fetch completed daily plan tasks in past 28 days with attribution and evidence
    PlanTaskModel.find({ userId: uid, status: "completed", completedAt: { $gte: past28DaysDate } })
      .select("completedAt actualMinutes estimatedMinutes entityType entityId evidence taskKey")
      .lean(),
    // Fetch learning events in past 28 days with correlation links
    LearningEventModel.find({ userId: uid, occurredAt: { $gte: past28DaysDate } })
      .select("occurredAt eventType payload planTaskId sessionId problemId idempotencyKey")
      .lean(),
    // Fetch canonical CQRS UserTopicProgress projections
    UserTopicProgressModel.find({ userId: uid }).lean().catch(() => []),
    // Authoritative Shared Global Progress (PROG-001, DASH-001, READY-001)
    getSharedLearnerGlobalProgress(uid).catch(() => null),
  ]);

  const progressDocs = missionProgress as AnyDoc[];
  const topicProgressDocs = topicProgress as AnyDoc[];
  const userTopicProgressDocs = (userTopicProgress as AnyDoc[]) || [];
  const profileDoc = profile as AnyDoc | null;
  const revisionDocs = dueRevisions as AnyDoc[];
  const achievementDocs = achievements as AnyDoc[];

  const executionSnapshot = activePlanResult as any;
  const mappedActivePlan = executionSnapshot?.activePlan || null;
  const notificationDocs = notifications as AnyDoc[];
  const sessionDocs = sessions as AnyDoc[];
  const attemptDocs = recentAttempts as AnyDoc[];
  const weeklyAttemptDocs = weeklyAttempts as AnyDoc[];
  const weeklyRevisionDocs = weeklyRevisions as AnyDoc[];
  const planTaskDocs = (completedPlanTasks as AnyDoc[]) || [];
  const eventDocs = (learningEvents as AnyDoc[]) || [];
  const revisionTargets = await resolveRevisionTargets(revisionDocs);
  const { activeStage, activeMission, activeMissionProgress } = await findDashboardMission(executionSnapshot, roadmap as AnyDoc | null, progressDocs);
  const completedMissions = progressDocs.filter((item: AnyDoc) => item.status === "completed").length;
  const completedTopics = topicProgressDocs.filter((item: AnyDoc) => item.state === "solid" || item.state === "mastered").length;
  const totalFocusedMinutes = sessionDocs.reduce((sum: number, session: AnyDoc) => sum + Math.round(Number(session.focusedSeconds ?? 0) / 60), 0);
  
  // ── Truthful 28-day Activity Metrics with Activity Identity Deduplication ──
  const activityMetrics = aggregateActivityMetrics({
    sessionDocs: sessionDocs as AnyDoc[],
    attemptDocs: weeklyAttemptDocs as AnyDoc[],
    planTaskDocs: planTaskDocs as AnyDoc[],
    eventDocs: eventDocs as AnyDoc[],
    revisionDocs: weeklyRevisionDocs as AnyDoc[],
    currentStreakDays: Number(statsDoc?.currentStreakDays ?? executionSnapshot?.streak?.currentStreakDays ?? 0),
    bestStreakDays: Number(statsDoc?.longestStreak ?? statsDoc?.bestStreak ?? 0),
    targetDailyMinutes: Number(profileDoc?.dailyMinutes ?? 45),
    totalSolvedProblems: Number(globalProgress?.distinctSolvedProblems ?? statsDoc?.solvedProblems ?? (weeklyAttemptDocs.filter((a: AnyDoc) => a.status === "solved").length)),
  });

  const activityHistory = activityMetrics.activityHistory;
  const weeklyActivity = activityHistory.slice(-7);
  const effectiveStreak = activityMetrics.currentStreakDays;

  let mappedActiveMission = null;
  if (activeMission) {
    const amTopic = activeMission.topicId as LeanDoc | null;
    const completedStepKeys = new Set(((activeMissionProgress?.completedStepKeys ?? []) as string[]).map(String));
    const missionSteps = ((activeMission.steps ?? []) as AnyDoc[]);
    const nextStage = missionSteps.find((step) => !completedStepKeys.has(String(step.key))) ?? null;
    const currentStageIndex = nextStage
      ? Math.max(0, missionSteps.findIndex((step) => String(step.key) === String(nextStage.key)))
      : missionSteps.length;
    const pathTitle = roadmap ? String((roadmap as AnyDoc).title ?? (activeStage ? (activeStage as AnyDoc).title : "Learning Path")) : (activeStage ? String((activeStage as AnyDoc).title) : null);
    mappedActiveMission = {
      id: id(activeMission._id),
      slug: String(activeMission.slug),
      title: String(activeMission.title),
      topic: String(amTopic?.name ?? "Learning"),
      topicSlug: String(amTopic?.slug ?? ""),
      progress: Number(activeMissionProgress?.progress ?? 0),
      status: String(activeMissionProgress?.status ?? "not_started"),
      estimatedMinutes: Number(activeMission.estimatedMinutes ?? 45),
      totalSteps: missionSteps.length,
      completedSteps: completedStepKeys.size,
      currentStageNumber: Math.min(currentStageIndex + 1, missionSteps.length),
      stageTitle: nextStage ? String(nextStage.title ?? nextStage.kind ?? "Concept") : "Complete",
      stageKind: nextStage ? String(nextStage.kind ?? "concept") : "completed",
      learningPathContext: pathTitle,
      startedAt: activeMissionProgress?.startedAt ? new Date(activeMissionProgress.startedAt as Date).toISOString() : null,
      nextStage: nextStage ? { key: String(nextStage.key), kind: String(nextStage.kind), title: String(nextStage.title ?? nextStage.kind) } : null,
      journey: missionSteps.map((step, index) => {
        const rawTitle = String(step.title ?? step.kind ?? `Step ${index + 1}`);
        const cleanTitle = rawTitle.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        return {
          key: String(step.key),
          title: cleanTitle,
          kind: String(step.kind ?? "learning"),
          state: completedStepKeys.has(String(step.key)) ? "completed" : index === currentStageIndex ? "current" : "upcoming",
        };
      }),
    };
  }

  // Dynamic context sentence for Hero (answering "Where am I?")
  let contextSentence = "Your next learning step is ready.";
  if (mappedActiveMission) {
    const currentTopicDoc = topicProgressDocs.find(t => {
      const topic = t.topicId as LeanDoc | null;
      return topic?.name === mappedActiveMission?.topic;
    });
    const topicStartedAt = (activeMissionProgress?.startedAt as Date | undefined) || (currentTopicDoc?.createdAt as Date | undefined);
    if (topicStartedAt) {
      const daysDiff = Math.max(1, Math.ceil((Date.now() - new Date(topicStartedAt).getTime()) / (1000 * 60 * 60 * 24)));
      contextSentence = `You're ${daysDiff} ${daysDiff === 1 ? "day" : "days"} into ${mappedActiveMission.topic}. Here's today's plan.`;
    } else if (mappedActiveMission.status === "in_progress") {
      contextSentence = `You're in the middle of ${mappedActiveMission.topic}. Here's today's plan.`;
    } else if (mappedActiveMission.topic && mappedActiveMission.topic !== "Learning") {
      contextSentence = `Ready to dive into ${mappedActiveMission.topic}. Here's today's plan.`;
    }
  }

  // ---------------------------------------------------------
  // Deterministic Resume Point Resolution
  // Priority: active session -> genuine in-progress draft (unsolved) -> in-progress mission -> unfinished attempt
  // Solved problems NEVER trigger a "draft" resume banner.
  // ---------------------------------------------------------
  const solvedProblemIdSet = new Set(
    attemptDocs
      .filter((a: AnyDoc) => a.status === "solved")
      .map((a: AnyDoc) => id(a.problemId?._id ?? a.problemId))
  );

  const activeSession = sessionDocs.find((s: AnyDoc) => !s.endedAt || (s.startedAt && Date.now() - new Date(s.startedAt as Date).getTime() < 2 * 60 * 60 * 1000));
  const draftAttempt = attemptDocs.find((a: AnyDoc) => {
    if (a.status !== "started") return false;
    const pid = id(a.problemId?._id ?? a.problemId);
    if (solvedProblemIdSet.has(pid)) return false;
    const createdTime = a.createdAt ? new Date(a.createdAt as Date).getTime() : 0;
    return Date.now() - createdTime < 24 * 60 * 60 * 1000;
  });
  const inProgressMission = mappedActiveMission && mappedActiveMission.status === "in_progress" && mappedActiveMission.nextStage ? mappedActiveMission : null;
  const latestAttempt = attemptDocs[0] ?? null;

  let resumePoint = null;
  if (activeSession) {
    const draftProblem = draftAttempt?.problemId as LeanDoc | null;
    const targetHref = draftProblem?.slug
      ? `/practice/problems/${draftProblem.slug}`
      : inProgressMission?.slug
      ? `/missions/${inProgressMission.slug}`
      : mappedActivePlan?.topicSlug
      ? `/practice?topic=${mappedActivePlan.topicSlug}`
      : "/practice";
    resumePoint = {
      type: "session" as const,
      title: "Active Study Session",
      subtitle: `${Math.round(Number(activeSession.focusedSeconds ?? 0) / 60)} min focused so far`,
      href: targetHref,
      lastActiveAt: activeSession.startedAt ? new Date(activeSession.startedAt as Date).toISOString() : new Date().toISOString(),
      stage: "Focus in progress",
      draftStatus: "in_progress",
    };
  } else if (draftAttempt) {
    const p = draftAttempt.problemId as LeanDoc | null;
    resumePoint = {
      type: "problem" as const,
      title: String(p?.title ?? "Practice Problem"),
      subtitle: "In-progress practice · Continue solving",
      href: p?.slug ? `/practice/problems/${p.slug}` : "/practice",
      lastActiveAt: draftAttempt.createdAt ? new Date(draftAttempt.createdAt as Date).toISOString() : new Date().toISOString(),
      stage: "In progress",
      draftStatus: "started",
    };
  } else if (inProgressMission) {
    resumePoint = {
      type: "mission" as const,
      title: inProgressMission.title,
      subtitle: `Step ${inProgressMission.currentStageNumber} of ${inProgressMission.totalSteps} · ${inProgressMission.progress}% complete`,
      href: `/missions/${inProgressMission.slug}`,
      lastActiveAt: inProgressMission.startedAt ?? new Date().toISOString(),
      stage: inProgressMission.nextStage?.title ?? "Mission Step",
      draftStatus: "step_in_progress",
    };
  } else if (latestAttempt && latestAttempt.status !== "solved") {
    const p = latestAttempt.problemId as LeanDoc | null;
    resumePoint = {
      type: "problem" as const,
      title: String(p?.title ?? "Practice Problem"),
      subtitle: "Attempted • Ready to finish",
      href: p?.slug ? `/practice/problems/${p.slug}` : "/practice",
      lastActiveAt: latestAttempt.createdAt ? new Date(latestAttempt.createdAt as Date).toISOString() : new Date().toISOString(),
      stage: "Attempted",
      draftStatus: String(latestAttempt.status ?? "attempted"),
    };
  }

  const mappedDueRevisions = revisionDocs.map((item: AnyDoc) => {
    const target = revisionTargets.get(id(item.entityId));
    const entityType = String(item.entityType);
    const estimatedMinutes = Number(item.priority ?? 0) > 3 ? 7 : (entityType === "pattern" ? 6 : 5);
    return {
      id: id(item._id),
      entityType,
      entityId: id(item.entityId),
      itemType: entityType,
      conceptName: target?.title ?? (item.conceptName || `Review ${entityType}`),
      href: `/revision/session/${id(item._id)}`,
      sourceHref: target?.externalUrl ?? "",
      detail: target?.detail ?? "Spaced repetition",
      estimatedMinutes,
      dueAt: new Date(item.dueAt as Date).toISOString(),
      priority: Number(item.priority ?? 0),
      state: String(item.state)
    };
  });
  const totalRevisionMinutes = mappedDueRevisions.reduce((sum, item) => sum + item.estimatedMinutes, 0);

  let nextScheduledRevision = null;
  if (mappedDueRevisions.length === 0) {
    try {
      const nextDoc = await RevisionQueueModel.findOne({ userId: uid, state: "scheduled", dueAt: { $gt: new Date() } }).sort({ dueAt: 1 }).lean();
      if (nextDoc) {
        const targetMap = await resolveRevisionTargets([nextDoc]);
        const target = targetMap.get(id(nextDoc.entityId));
        nextScheduledRevision = {
          id: id(nextDoc._id),
          entityType: String(nextDoc.entityType),
          conceptName: target?.title ?? (nextDoc.conceptName || `Review ${nextDoc.entityType}`),
          dueAt: new Date(nextDoc.dueAt as Date).toISOString(),
          estimatedMinutes: Number(nextDoc.priority ?? 0) > 3 ? 7 : 5,
        };
      }
    } catch {
      // safe fallback if mock or db query throws
    }
  }

  // Real Weekly Summary computation (last 7 days)
  const completedMissionsThisWeek = progressDocs.filter((item: AnyDoc) => {
    if (item.status !== "completed") return false;
    const date = item.completedAt ? new Date(item.completedAt as Date) : item.updatedAt ? new Date(item.updatedAt as Date) : null;
    return date ? date >= subDays(startOfDay(new Date()), 6) : false;
  }).length;
  const problemsSolvedThisWeek = weeklyAttemptDocs.filter((a: AnyDoc) => a.status === "solved").length;
  const problemsAttemptedThisWeek = weeklyAttemptDocs.length;
  const revisionsCompletedThisWeek = weeklyRevisionDocs.length;
  const studySessionsThisWeek = sessionDocs.filter((s: AnyDoc) => {
    const d = s.startedAt ? new Date(s.startedAt as Date) : null;
    return d ? d >= subDays(startOfDay(new Date()), 6) : false;
  }).length;
  const activeDaysThisWeek = activityHistory.slice(-7).filter((d) => d.actualMinutes > 0 || d.problemsSolved > 0).length;

  const weeklySummary = {
    missions: completedMissionsThisWeek,
    problems: problemsSolvedThisWeek > 0 ? problemsSolvedThisWeek : problemsAttemptedThisWeek,
    revisions: revisionsCompletedThisWeek,
    studySessions: studySessionsThisWeek,
    activeDays: activeDaysThisWeek,
  };

  // Interview Imminent check (within 14 days)
  let interviewImminent = null;
  if (profileDoc?.targetDate) {
    const targetDate = new Date(profileDoc.targetDate as Date);
    const diffDays = Math.ceil((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 14) {
      const primaryCompany = ((profileDoc?.targetCompanyIds ?? [])[0] as LeanDoc | undefined);
      interviewImminent = {
        daysRemaining: diffDays,
        companyName: primaryCompany?.name ? String(primaryCompany.name) : null,
        companySlug: primaryCompany?.slug ? String(primaryCompany.slug) : null,
      };
    }
  }

  const activeTopicSlug = String(
    executionSnapshot?.activePlan?.topicSlug ||
    mappedActiveMission?.topicSlug ||
    "dsa-fundamentals"
  );
  const activeTopicName = String(
    executionSnapshot?.activePlan?.topicName ||
    mappedActiveMission?.topic ||
    "DSA Fundamentals"
  );

  // Actionable focus areas (up to 3 weak topics with explicit cross-topic labeling)
  const actionableWeakTopics = topicProgressDocs
    .filter((t: AnyDoc) => {
      const mastery = Number(t.masteryScore ?? 0);
      return mastery > 0 && mastery < 50;
    })
    .sort((a: AnyDoc, b: AnyDoc) => {
      const aSlug = String((a.topicId as LeanDoc)?.slug || a.slug || "");
      const bSlug = String((b.topicId as LeanDoc)?.slug || b.slug || "");
      const aMatch = aSlug.toLowerCase() === activeTopicSlug.toLowerCase() ? 0 : 1;
      const bMatch = bSlug.toLowerCase() === activeTopicSlug.toLowerCase() ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return Number(a.masteryScore ?? 0) - Number(b.masteryScore ?? 0);
    })
    .slice(0, 3)
    .map((t: AnyDoc) => {
      const topic = t.topicId as LeanDoc | null;
      const slug = String(topic?.slug ?? t.slug ?? "");
      const baseName = String(topic?.name ?? t.name ?? "Topic");
      const isCrossTopic = slug.toLowerCase() !== activeTopicSlug.toLowerCase();
      return {
        name: isCrossTopic ? `Cross-topic foundation: ${baseName}` : baseName,
        slug,
        href: slug ? `/learn/topics/${slug}` : `/learn`,
        mastery: Number(t.masteryScore ?? 0),
        type: "topic" as const,
      };
    });

  const focusAreas = actionableWeakTopics.length > 0
    ? actionableWeakTopics
    : [];

  const targetCompanies = ((profileDoc?.targetCompanyIds ?? []) as LeanDoc[])
    .filter((c) => Boolean(c?.name))
    .map((c) => ({ name: String(c.name), slug: String(c.slug ?? "") }));
  const primaryTargetCompany = targetCompanies[0] ?? null;

  const hasLearningHistory = progressDocs.length > 0 || attemptDocs.length > 0 || completedReviews > 0;
  const isNewUser = !hasLearningHistory && (profileDoc?.onboarding?.status !== "completed");
  const hasActiveRoadmap = Boolean(roadmap || profileDoc?.activeRoadmapId);

  // ── PHASE A: Practice Recommendations (fast — uses preloaded data) ────────
  // Provides adaptive recommendation candidates scored by Evidence Loop
  // dueProblemRevisions derived from already-fetched revisionDocs — no extra DB call.
  const dueProblemRevisionsDerived = revisionDocs.filter(
    (r: AnyDoc) => r.entityType === "problem" && r.state === "due"
  );
  const practiceRecs = await buildPracticeRecommendations(uid, 3, {
    attempts: attemptDocs as any[],
    topicProgressDocs: topicProgressDocs as any[],   // eliminates duplicate TopicProgress query
    patternMasteryDocs: patternMastery as any[],      // eliminates PatternMastery query (656ms fix!)
    dueProblemRevisions: dueProblemRevisionsDerived,  // derived from revisionDocs — no extra DB call
    userTopicProgressDocs: userTopicProgressDocs as any[], // canonical CQRS projection evidence
  }).catch(() => [] as any[]);

  const hasActivePlan = Boolean(
    executionSnapshot?.activePlan &&
    executionSnapshot.activePlan.status === "active"
  );
  const learningMode: "plan_led" | "self_paced" =
    (profileDoc?.preferences?.learningMode as any) ||
    (hasActivePlan ? "plan_led" : "self_paced");

  // ── PHASE B: Intelligence & Authoritative Next Action in PARALLEL ─────────
  const [intelligenceSummary, topicExplanations, unifiedSelection] = await Promise.all([
    ProgressServiceModule.generateProgressSummary(
      uid,
      { topicsProgress: topicProgressDocs, dueRevisions: revisionDocs },
      { asyncWrite: true }
    ).catch(() => ({
      overallMastery: 0, strongTopics: [], weakTopics: [], patternsNeedingRevision: [],
      recentImprovement: "", revisionNeeds: "Queue is clear",
      interviewReadinessSignal: "Getting Started", recommendedNextAction: "Start learning."
    })),
    options?.includeTopicExplanations
      ? (async () => {
          const topicIds = topicProgressDocs
            .map((item) => (item.topicId as LeanDoc)?._id ?? item.topicId)
            .filter(Boolean);
          const batchMap = await ProgressEngineModule.ProgressEngine.explainTopicsProgressBatch(uid, topicIds).catch(() => new Map());
          return topicProgressDocs.map((item) => {
            const tid = String((item.topicId as LeanDoc)?._id ?? item.topicId);
            return batchMap.get(tid) || null;
          });
        })().catch(() => topicProgressDocs.map(() => null))
      : Promise.resolve(topicProgressDocs.map(() => null)),
    resolveAuthoritativeLearningAction({
      userId: uid,
      surface: "dashboard",
      mode: learningMode,
      persistDecision: false, // Never persist decisions on routine dashboard reads
      activePlan: executionSnapshot?.activePlan || null,
      currentPlanDay: executionSnapshot?.currentPlanDay || null,
      todayTasks: executionSnapshot?.todayTasks || [],
      dueRevisions: mappedDueRevisions,
      activeSession: activeSession || null,
      draftAttempt: draftAttempt || null,
      activeMission: mappedActiveMission,
      practiceRecs,
      topicMasteryScore: Number(executionSnapshot?.semanticProgress?.masteryPercent ?? 0),
    }),
  ]);

  const authoritativePrimaryAction = unifiedSelection.primaryAction;
  const authoritativeSecondaryAction = unifiedSelection.secondaryAction;

  // Assemble final candidate list from the single authoritative primary action
  const recommendationCandidates: any[] = [];
  if (authoritativePrimaryAction) {
    recommendationCandidates.push({
      rank: 1,
      entityType: authoritativePrimaryAction.entityType ?? authoritativePrimaryAction.type,
      entityId: authoritativePrimaryAction.entityId ?? authoritativePrimaryAction.id,
      reason: authoritativePrimaryAction.reason,
      score: 1000,
      label: authoritativePrimaryAction.ctaLabel,
      title: authoritativePrimaryAction.title,
      href: authoritativePrimaryAction.href,
      explanation: authoritativePrimaryAction.reason,
      estimatedMinutes: authoritativePrimaryAction.estimatedDurationMinutes,
      phase: authoritativePrimaryAction.type === "revision" ? "REVISE" : authoritativePrimaryAction.type === "mission" ? "LEARN" : "PRACTICE",
    });
  }
  const primaryEntityId = authoritativePrimaryAction?.entityId || authoritativePrimaryAction?.id;
  let rank = 2;
  for (const rec of practiceRecs) {
    const p = rec.problem as Record<string, any>;
    const entityId = String(p._id);
    if (entityId === primaryEntityId) continue;
    recommendationCandidates.push({
      rank: rank++,
      entityType: "problem",
      entityId,
      reason: rec.revisionIntent ? "revision_due" : "weakness_repair",
      score: rec.score,
      label: rec.revisionIntent ? "Re-attempt Problem" : "Solve Problem",
      title: String(p.title),
      href: `/practice/problems/${p.slug}`,
      explanation: rec.reason,
      estimatedMinutes: Number(p.estimatedMinutes ?? 25),
      phase: "PRACTICE",
      weakTopic: rec.weakTopic,
      weakPattern: rec.weakPattern,
    });
  }

  // Build Today's Plan: up to 4 prioritised items from real DB evidence
  const todaysPlan = recommendationCandidates.slice(0, 4).map((candidate: any) => ({
    rank: candidate.rank,
    phase: candidate.phase,
    label: candidate.label,
    title: candidate.title,
    href: candidate.href,
    reason: candidate.explanation,
    estimatedMinutes: candidate.estimatedMinutes,
    entityType: candidate.entityType,
    weakTopic: candidate.weakTopic ?? null,
    weakPattern: candidate.weakPattern ?? null,
  }));

  // Unify focusAction for backward compatibility
  const focusAction = authoritativePrimaryAction
    ? {
        id: authoritativePrimaryAction.id,
        taskId: authoritativePrimaryAction.taskId,
        actionKey: authoritativePrimaryAction.actionKey,
        title: authoritativePrimaryAction.title,
        href: authoritativePrimaryAction.href,
        reason: authoritativePrimaryAction.reason,
        estimatedMinutes: authoritativePrimaryAction.estimatedDurationMinutes,
        phase: authoritativePrimaryAction.type,
        entityType: authoritativePrimaryAction.entityType || authoritativePrimaryAction.type,
        label: authoritativePrimaryAction.ctaLabel,
        planRelation: authoritativePrimaryAction.sourceProvenance,
        isCrossTopic: authoritativePrimaryAction.isCrossTopic,
        relationshipLabel: authoritativePrimaryAction.relationshipLabel,
        ctaState: authoritativePrimaryAction.ctaState,
      }
    : (todaysPlan.length > 0 ? todaysPlan[0] : null);

  // Daily Goal computation (read-only, from today's entry in activityHistory)
  const todayActivity = activityHistory[activityHistory.length - 1];
  const studiedMinutes = todayActivity?.actualMinutes ?? 0;
  const goalMinutes = Math.max(15, Number(profileDoc?.dailyMinutes ?? 45));
  const problemsSolvedToday = todayActivity?.problemsSolved ?? 0;
  const dailyGoalPercentage = Math.min(100, Math.round((studiedMinutes / goalMinutes) * 100));
  const dailyGoal = {
    studiedMinutes,
    goalMinutes,
    problemsSolvedToday,
    percentage: dailyGoalPercentage,
    status: dailyGoalPercentage >= 100 ? "completed" : studiedMinutes > 0 ? "in_progress" : "not_started",
  };

  // Gamification: Precomputed XP read from statistics document
  const gamification = calculateLevelFromXp(Number(statsDoc?.totalXp ?? 0));

  // Compute breakdown stats for Interview Readiness Evidence
  const solvedAttempts = attemptDocs.filter((attempt: AnyDoc) => attempt.status === "solved");
  const independentSolves = solvedAttempts.filter((a: AnyDoc) => a.strategy === "independent").length;
  const hintAssistedSolves = solvedAttempts.filter((a: AnyDoc) => a.strategy === "hint_assisted").length;

  // Construct deduplicated recent evidence (latest 5 milestones)
  const seenEvidenceKeys = new Set<string>();
  const rawEvidence: Array<{
    id: string;
    key: string;
    type: "problem_solve" | "hint_solve" | "mission_stage" | "pattern_recognition" | "revision";
    title: string;
    subtitle: string;
    badge: string;
    badgeVariant: "emerald" | "blue" | "purple" | "amber";
    href?: string;
    timestamp: string;
  }> = [];

  for (const attempt of attemptDocs) {
    const problem = attempt.problemId as LeanDoc | null;
    const problemTitle = String(problem?.title ?? "Practice Problem");
    const problemSlug = problem?.slug ? String(problem.slug) : null;
    const key = `problem:${problemSlug || problemTitle}`;

    if (seenEvidenceKeys.has(key)) continue;
    seenEvidenceKeys.add(key);

    const isSolved = attempt.status === "solved";
    const isIndependent = attempt.strategy === "independent";
    const hintsUsed = Number(attempt.hintsUsed || 0);

    if (isSolved && isIndependent) {
      rawEvidence.push({
        id: String(attempt._id),
        key,
        type: "problem_solve",
        title: `Solved ${problemTitle} Independently`,
        subtitle: `Optimal solve with 0 hints • Verified solution`,
        badge: "Independent",
        badgeVariant: "emerald",
        href: problemSlug ? `/practice/problems/${problemSlug}` : `/practice`,
        timestamp: attempt.createdAt ? new Date(attempt.createdAt as Date).toISOString() : new Date().toISOString(),
      });
    } else if (isSolved) {
      rawEvidence.push({
        id: String(attempt._id),
        key,
        type: "hint_solve",
        title: `Solved ${problemTitle} with Hints`,
        subtitle: `Guided step-by-step • ${hintsUsed > 0 ? `${hintsUsed} hint${hintsUsed > 1 ? "s" : ""} used` : "Assisted solve"}`,
        badge: "Guided Solve",
        badgeVariant: "blue",
        href: problemSlug ? `/practice/problems/${problemSlug}` : `/practice`,
        timestamp: attempt.createdAt ? new Date(attempt.createdAt as Date).toISOString() : new Date().toISOString(),
      });
    } else {
      rawEvidence.push({
        id: String(attempt._id),
        key,
        type: "problem_solve",
        title: `Attempted ${problemTitle}`,
        subtitle: `Explored problem framing and patterns`,
        badge: "Attempted",
        badgeVariant: "purple",
        href: problemSlug ? `/practice/problems/${problemSlug}` : `/practice`,
        timestamp: attempt.createdAt ? new Date(attempt.createdAt as Date).toISOString() : new Date().toISOString(),
      });
    }
  }

  for (const mp of progressDocs) {
    if (mp.status === "completed") {
      const mission = mp.missionId as LeanDoc | null;
      if (!mission) continue;
      const key = `mission:${mission.slug || mission.title}`;
      if (seenEvidenceKeys.has(key)) continue;
      seenEvidenceKeys.add(key);

      rawEvidence.push({
        id: String(mp._id),
        key,
        type: "mission_stage",
        title: `Completed Mission: ${String(mission.title)}`,
        subtitle: `Mastered core concepts and interactive challenges`,
        badge: "Mission Complete",
        badgeVariant: "purple",
        href: mission.slug ? `/missions/${mission.slug}` : `/learn`,
        timestamp: mp.updatedAt ? new Date(mp.updatedAt as Date).toISOString() : new Date().toISOString(),
      });
    }
  }

  rawEvidence.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const recentEvidence = rawEvidence.slice(0, 5);

  // 6-axis Radar Chart calculation
  const findTopicMastery = (term: string) => {
    const doc = topicProgressDocs.find((t: AnyDoc) => {
      const topic = t.topicId as LeanDoc | null;
      const slug = String(topic?.slug ?? "").toLowerCase();
      const name = String(topic?.name ?? "").toLowerCase();
      return slug.includes(term) || name.includes(term);
    });
    return Number(doc?.masteryScore ?? 0);
  };

  const arraysScore = findTopicMastery("array");
  const treesScore = findTopicMastery("tree");
  const dpScore = findTopicMastery("dynamic") || findTopicMastery("dp");
  const graphsScore = findTopicMastery("graph");
  const patternsScore = Number(
    statsDoc?.patternRecognitionScore ?? (
      topicProgressDocs.length > 0
        ? Math.round(topicProgressDocs.reduce((s: number, t: AnyDoc) => s + (t.patternRecognitionScore || 0), 0) / topicProgressDocs.length)
        : 0
    )
  );
  const totalSolved = solvedAttempts.length;
  const problemSolvingScore = totalSolved > 0
    ? Math.min(100, Math.round((independentSolves / Math.max(1, totalSolved)) * 60 + Math.min(40, totalSolved * 10)))
    : 0;

  const radarMetrics = {
    arrays: arraysScore,
    trees: treesScore,
    dp: dpScore,
    graphs: graphsScore,
    patterns: patternsScore,
    problemSolving: problemSolvingScore,
    totalEvidence: arraysScore + treesScore + dpScore + graphsScore + patternsScore + problemSolvingScore,
  };

  // ── Build Canonical Dashboard DTO (Version 2) ─────────────────────────────

  // Topic-scoped evidence: Authoritative dashboard contract
  // 1. Mastery percentage: The 7-dimension weighted rubric from TopicProgressModel (AssessmentEngine)
  // is the authoritative evaluation contract (understanding missions = 20%, problem solving = 35%, etc.).
  // If TopicProgressModel exists and has been assessed, use it. Otherwise fall back to UserTopicProgress projection.
  // 2. Solved count: Solved count strictly counts verified problem solves (TopicProgress.solvedCount or
  // UserTopicProgress.independentSolveCount), NEVER generic task completions.
  const activeTopicProgressDoc = topicProgressDocs.find((t: AnyDoc) => {
    const topic = t.topicId as LeanDoc | null;
    const s = String(topic?.slug ?? "").toLowerCase();
    const n = String(topic?.name ?? "").toLowerCase();
    return s === activeTopicSlug.toLowerCase() || n === activeTopicName.toLowerCase();
  });

  const activeUserTopicProjection = userTopicProgressDocs.find((p: AnyDoc) => {
    const s = String(p.topicSlug ?? "").toLowerCase();
    return s === activeTopicSlug.toLowerCase();
  });

  const topicSolvedCount = activeTopicProgressDoc?.solvedCount !== undefined && activeTopicProgressDoc.solvedCount !== null
    ? Number(activeTopicProgressDoc.solvedCount)
    : (activeUserTopicProjection?.independentSolveCount !== undefined && activeUserTopicProjection.independentSolveCount !== null
      ? Number(activeUserTopicProjection.independentSolveCount)
      : null);

  const topicMasteryPercent = activeTopicProgressDoc?.masteryScore !== undefined && activeTopicProgressDoc.masteryScore !== null
    ? Number(activeTopicProgressDoc.masteryScore)
    : (activeUserTopicProjection?.masteryScore !== undefined && activeUserTopicProjection.masteryScore !== null
      ? Number(activeUserTopicProjection.masteryScore)
      : null);

  const hasVerifiedEvidence = Boolean(
    (topicSolvedCount !== null && topicSolvedCount > 0) ||
    (topicMasteryPercent !== null && topicMasteryPercent > 0)
  );

  // Real checkpoint: only if current plan day or stage is explicitly marked as checkpoint
  const isRealCheckpoint = Boolean(executionSnapshot?.currentPlanDay?.isCheckpointDay);
  const checkpoint = isRealCheckpoint
    ? {
        title: String(executionSnapshot.currentPlanDay.title || `Day ${executionSnapshot.currentPlanDay.dayIndex} Checkpoint`),
        focus: String(executionSnapshot.currentPlanDay.focus || "Milestone assessment"),
        isCheckpointDay: true,
        dayIndex: Number(executionSnapshot.currentPlanDay.dayIndex),
      }
    : null;

  // Real progression stages: ONLY from actual plan days, never quartile or generic synthesis
  const rawPlanDays = executionSnapshot?.planDays || [];
  const planStages = rawPlanDays.map((d: any) => ({
    id: String(d.id),
    title: String(d.title),
    dayIndex: Number(d.dayIndex),
    status: d.dayIndex < (executionSnapshot?.currentPlanDay?.dayIndex || 1)
      ? ("completed" as const)
      : d.dayIndex === (executionSnapshot?.currentPlanDay?.dayIndex || 1)
      ? ("current" as const)
      : ("upcoming" as const),
    isCheckpoint: Boolean(d.isCheckpointDay),
  }));

  const dashboardActivePlan = executionSnapshot?.activePlan ? {
    id: String(executionSnapshot.activePlan.id),
    status: executionSnapshot.activePlan.status as "active" | "paused" | "completed" | "archived",
    cycleNumber: Number(executionSnapshot.activePlan.cycleNumber || 1),
    totalDays: Number(executionSnapshot.activePlan.totalDays || rawPlanDays.length),
    currentDayIndex: Number(executionSnapshot.activePlan.currentDayIndex || 1),
    dayTitle: String(executionSnapshot.activePlan.dayTitle || ""),
    dayFocus: String(executionSnapshot.activePlan.dayFocus || ""),
    topicName: String(executionSnapshot.activePlan.topicName || ""),
    topicSlug: String(executionSnapshot.activePlan.topicSlug || ""),
    targetDailyMinutes: Number(executionSnapshot.activePlan.dailyMinutes || 45),
    tasksCount: Number(executionSnapshot.todayProgress?.totalTasks || 0),
    completedTasksCount: Number(executionSnapshot.todayProgress?.completedTasks || 0),
    isDayComplete: Boolean(executionSnapshot.todayProgress?.isDayComplete),
    stages: planStages,
  } : null;

  const dashboardReviewQueue = {
    dueCount: mappedDueRevisions.length,
    estimatedTotalMinutes: totalRevisionMinutes,
    items: mappedDueRevisions.slice(0, 5).map((r: any) => ({
      id: String(r.id),
      entityType: String(r.entityType),
      conceptName: String(r.conceptName),
      detail: String(r.detail),
      href: String(r.href),
      estimatedMinutes: Number(r.estimatedMinutes),
      priority: Number(r.priority),
      dueAt: String(r.dueAt),
    })),
    isClear: mappedDueRevisions.length === 0,
  };

  // Topic-scoped mission counts
  const activeTopicIdStr = String((activeTopicProgressDoc?.topicId as LeanDoc)?._id ?? "");
  const completedMissionsInTopic = progressDocs.filter((p: AnyDoc) => {
    if (p.status !== "completed") return false;
    const mission = p.missionId as LeanDoc | null;
    const mTopicSlug = String((mission?.topicId as LeanDoc)?.slug ?? "");
    const mTopicId = String((mission?.topicId as LeanDoc)?._id ?? mission?.topicId ?? "");
    return mTopicSlug.toLowerCase() === activeTopicSlug.toLowerCase() || (activeTopicIdStr && mTopicId === activeTopicIdStr);
  }).length;

  const publishedMissionsList = (await getCachedPublishedMissions()) as AnyDoc[];
  const totalMissionsInTopic = Math.max(1, publishedMissionsList.filter((m: AnyDoc) => {
    const mTopicSlug = String((m.topicId as LeanDoc)?.slug ?? "");
    const mTopicId = String((m.topicId as LeanDoc)?._id ?? m.topicId ?? "");
    return mTopicSlug.toLowerCase() === activeTopicSlug.toLowerCase() || (activeTopicIdStr && mTopicId === activeTopicIdStr);
  }).length);

  const isFullMastery = Boolean(topicSolvedCount !== null && topicSolvedCount > 0);
  const evidenceLabel = isFullMastery
    ? `${topicMasteryPercent}% topic mastery`
    : topicMasteryPercent !== null && topicMasteryPercent > 0
    ? `${topicMasteryPercent}% rubric evidence`
    : "Not enough evidence yet";

  const evidenceExplanation = isFullMastery
    ? `Based on verified independent problem solves and practice in ${activeTopicName}.`
    : topicMasteryPercent !== null && topicMasteryPercent > 0
    ? `${completedMissionsInTopic} of ${totalMissionsInTopic} foundational missions completed (contributes 20% understanding rubric weight). Practice problems required for problem-solving mastery.`
    : "Complete scheduled missions and practice problems to establish topic evidence.";

  const dashboardTopicEvidence: DashboardTopicEvidence = {
    topicName: activeTopicName,
    topicSlug: activeTopicSlug,
    topicSolvedCount,
    topicMasteryPercent,
    hasVerifiedEvidence,
    checkpoint,
    hasRealCheckpoint: isRealCheckpoint,
    focusAreas,
    evidenceLabel,
    evidenceExplanation,
    isFullMastery,
    missionsCompletedCount: completedMissionsInTopic,
    missionsTotalCount: totalMissionsInTopic,
    formulaVersion: "rubric-v1",
  };

  const dashboardActivityMetrics = {
    todayFocusedMinutes: activityMetrics.todayFocusedMinutes,
    todayTargetMinutes: activityMetrics.todayTargetMinutes,
    todaySolvesCount: activityMetrics.todaySolvesCount,
    todayAttemptsCount: activityMetrics.todayAttemptsCount,
    currentStreakDays: activityMetrics.currentStreakDays,
    bestStreakDays: activityMetrics.bestStreakDays,
    totalActiveDays: activityMetrics.totalActiveDays,
    totalFocusedHours: activityMetrics.totalFocusedHours,
    totalSolvedProblems: activityMetrics.totalSolvedProblems,
    activityHistory: activityMetrics.activityHistory,
  };

  const rawRoadmapSource = profileDoc?.roadmapSource;
  const normalizedRoadmapSource: "starter" | "customized" | "onboarding" =
    rawRoadmapSource === "personalized" || rawRoadmapSource === "customized"
      ? "customized"
      : rawRoadmapSource === "onboarding"
      ? "onboarding"
      : "starter";

  const bonusRec = practiceRecs.find((rec: any) => {
    const p = rec.problem as Record<string, any>;
    return p && String(p._id) !== primaryEntityId;
  }) || practiceRecs[0];

  const bonusChallenge = bonusRec?.problem ? {
    id: String((bonusRec.problem as any)._id),
    title: String((bonusRec.problem as any).title),
    slug: String((bonusRec.problem as any).slug),
    difficulty: (String((bonusRec.problem as any).difficulty || "medium").toLowerCase()) as "easy" | "medium" | "hard",
    estimatedMinutes: Number((bonusRec.problem as any).estimatedMinutes || 25),
    reason: bonusRec.reason || "Targeted practice challenge to reinforce pattern recognition.",
    href: `/practice/problems/${(bonusRec.problem as any).slug}?from=plan`,
    patterns: Array.isArray((bonusRec.problem as any).patterns) ? (bonusRec.problem as any).patterns : [],
  } : null;

  const dashboardDTO: DashboardDTO = {
    version: 2,
    learner: {
      name: String(user?.name ?? "DSA Club Member"),
      firstName: String(user?.name ?? "Member").split(" ")[0],
      onboardingStatus: (profileDoc?.onboarding?.status as any) || (isNewUser ? "in_progress" : "completed"),
      roadmapSource: normalizedRoadmapSource,
    },
    contextStatusText: contextSentence,
    learningMode,
    activePlan: dashboardActivePlan,
    primaryAction: authoritativePrimaryAction,
    secondaryAction: authoritativeSecondaryAction,
    reviewQueue: dashboardReviewQueue,
    topicEvidence: dashboardTopicEvidence,
    activityMetrics: dashboardActivityMetrics,
    interviewContext: interviewImminent ? {
      isImminent: true,
      daysRemaining: interviewImminent.daysRemaining,
      companyName: interviewImminent.companyName,
      companySlug: interviewImminent.companySlug,
    } : null,
    bonusChallenge: bonusChallenge ? toDTO(bonusChallenge) : null,
  };

  return {
    dashboardDTO: toDTO(dashboardDTO),
    user: toDTO({ name: String(user?.name ?? "DSA Club member"), email: String(user?.email ?? "") }),
    profile: toDTO(profile),
    roadmap: toDTO(roadmap),
    activeStage: toDTO(activeStage),
    activeMission: toDTO(mappedActiveMission),
    activePlan: toDTO(mappedActivePlan),
    focusAction: toDTO(focusAction),
    progressMetrics: toDTO(executionSnapshot?.semanticProgress || null),
    contextSentence: toDTO(contextSentence),
    weeklySummary: toDTO(weeklySummary),
    totalRevisionMinutes: toDTO(totalRevisionMinutes),
    interviewImminent: toDTO(interviewImminent),
    focusAreas: toDTO(focusAreas),
    primaryTargetCompany: toDTO(primaryTargetCompany),
    isNewUser: toDTO(isNewUser),
    hasActiveRoadmap: toDTO(hasActiveRoadmap),
    onboardingSkipped: Boolean(profileDoc?.onboarding?.status === "skipped" || profileDoc?.roadmapSource === "starter"),
    roadmapSource: String(profileDoc?.roadmapSource ?? "starter"),
    intelligenceSummary: toDTO(intelligenceSummary),
    todaysPlan: toDTO(todaysPlan),
    dashboardFocus: toDTO({
      today: focusAction?.title ?? mappedActiveMission?.title ?? "Choose your next DSA topic",
      targetCompanies: ((profileDoc?.targetCompanyIds ?? []) as LeanDoc[]).map((company) => String(company.name ?? "")).filter(Boolean),
      currentStage: activeStage ? {
        key: String((activeStage as AnyDoc).key ?? ""),
        title: String((activeStage as AnyDoc).title ?? "Current stage"),
        status: String((activeStage as AnyDoc).status ?? "active"),
      } : null,
      currentMission: mappedActiveMission ? {
        title: mappedActiveMission.title,
        href: `/missions/${mappedActiveMission.slug}`,
        progress: mappedActiveMission.progress,
        status: mappedActiveMission.status,
      } : null,
      strengths: (intelligenceSummary.strongTopics ?? []).slice(0, 3),
      weaknesses: (intelligenceSummary.weakTopics ?? []).slice(0, 3),
    }),
    stats: toDTO({
      totalFocusedMinutes: Number(globalProgress?.totalFocusedMinutes ?? statsDoc?.totalFocusedMinutes ?? totalFocusedMinutes),
      solvedProblems: Number(globalProgress?.distinctSolvedProblems ?? statsDoc?.solvedProblems ?? 0),
      attemptedProblems: Number(globalProgress?.distinctAttemptedProblems ?? statsDoc?.attemptedProblems ?? 0),
      currentStreakDays: effectiveStreak,
      overallMasteryScore: Number(globalProgress?.overallMasteryScore ?? intelligenceSummary.overallMastery),
      interviewReadinessScore: Number(globalProgress?.interviewReadinessScore ?? intelligenceSummary.overallMastery),
      consistencyScore: Number(globalProgress?.consistencyScore ?? (effectiveStreak > 0 ? Math.min(100, effectiveStreak * 20) : 0)),
      revisionRetentionScore: Number(statsDoc?.revisionRetentionScore ?? 0),
      // DashboardView expectations
      masteryScore: Number(globalProgress?.overallMasteryScore ?? intelligenceSummary.overallMastery),
      currentStreak: effectiveStreak,
      problemsSolved: Number(globalProgress?.distinctSolvedProblems ?? statsDoc?.solvedProblems ?? 0),
      readinessScore: Number(globalProgress?.interviewReadinessScore ?? intelligenceSummary.overallMastery),
      studyTimeHours: Math.round(Number(globalProgress?.totalFocusedMinutes ?? statsDoc?.totalFocusedMinutes ?? totalFocusedMinutes) / 60),
      independentSolves: Number(globalProgress?.independentSolves ?? independentSolves),
      hintAssistedSolves: Number(globalProgress?.assistedSolves ?? hintAssistedSolves),
      patternAccuracy: patternsScore,
      topicsMastered: completedTopics,
    }),
    counts: toDTO({ completedMissions, completedTopics, dueRevisions: dueRevisions.length, completedReviews }),
    topicProgress: toDTO(topicProgressDocs.map((item: AnyDoc, index: number) => {
      const topic = item.topicId as LeanDoc | null;
      const mastery = Number(item.masteryScore ?? 0);
      const isUnassessed = mastery === 0 && (!item.attempts || item.attempts === 0) && (!item.state || item.state === "unseen");
      return { 
        id: id(topic?._id ?? item.topicId), 
        topicId: id(topic?._id ?? item.topicId),
        slug: String(topic?.slug ?? id(item.topicId)), 
        title: String(topic?.name ?? "Untitled topic"), 
        topicName: String(topic?.name ?? "Untitled topic"),
        progress: mastery, 
        mastery: mastery,
        masteryPercent: mastery,
        confidence: Number(item.confidenceScore ?? 0), 
        difficulty: difficulty(topic?.difficulty), 
        state: String(item.state ?? "unseen"),
        displayState: isUnassessed ? "not_assessed" : "in_progress",
        explainable: topicExplanations[index] || null
      };
    })),
    missionProgress: toDTO(progressDocs.map((item: AnyDoc) => {
      const mission = item.missionId as LeanDoc | null;
      return { id: id(mission?._id ?? item.missionId), slug: String(mission?.slug ?? id(item.missionId)), title: String(mission?.title ?? "Untitled mission"), progress: Number(item.progress ?? 0), status: String(item.status ?? "not_started") };
    })),
    dueRevisions: toDTO(mappedDueRevisions),
    achievements: toDTO(achievementDocs.map((item: AnyDoc) => {
      const achievement = item.achievementId as LeanDoc | null;
      return { id: id(item._id), title: String(achievement?.title ?? "Achievement"), description: String(achievement?.description ?? ""), unlockedAt: new Date(item.unlockedAt as Date).toISOString() };
    })),
    notifications: toDTO(notificationDocs.map((item: AnyDoc) => ({
      id: id(item._id),
      type: String(item.type ?? "system"),
      priority: String(item.priority ?? "informational"),
      groupKey: item.groupKey ? String(item.groupKey) : null,
      actionLabel: item.actionLabel ? String(item.actionLabel) : null,
      title: String(item.title),
      body: String(item.body),
      status: String(item.status),
      deepLink: String(item.deepLink ?? "/notifications"),
      scheduledAt: item.scheduledAt ? new Date(item.scheduledAt as Date).toISOString() : new Date().toISOString(),
      readAt: item.readAt ? new Date(item.readAt as Date).toISOString() : null,
    }))),
    weeklyActivity: toDTO(weeklyActivity),
    activityHistory: toDTO(activityHistory),
    resumePoint: toDTO(resumePoint),
    gamification: toDTO(gamification),
    dailyGoal: toDTO(dailyGoal),
    radarMetrics: toDTO(radarMetrics),
    recentEvidence: toDTO(recentEvidence),
    nextScheduledRevision: toDTO(nextScheduledRevision),
  };
}

/**
 * Cached version of getProductSnapshot using Next.js unstable_cache.
 * Caches per user for 300 seconds (5 minutes) with on-demand tag-based invalidation.
 */
export async function getCachedProductSnapshot(
  userId: string,
  options?: { includeTopicExplanations?: boolean }
) {
  const includeExplanations = Boolean(options?.includeTopicExplanations);
  if (typeof unstable_cache === "function") {
    const cachedLoader = unstable_cache(
      async (uid: string, expl: boolean) => getProductSnapshot(uid, { includeTopicExplanations: expl }),
      [`user-snapshot-${userId}-${includeExplanations}`],
      {
        revalidate: 300,
        tags: [`dashboard-${userId}`, `snapshot-${userId}`],
      }
    );
    return cachedLoader(userId, includeExplanations);
  }
  return getProductSnapshot(userId, options);
}

/**
 * Invalidates the cached dashboard and snapshot data for a specific user across all product subpages.
 */
export function revalidateDashboardCache(userId: string) {
  try {
    if (typeof revalidateTag === "function") {
      revalidateTag(`dashboard-${userId}`);
      revalidateTag(`snapshot-${userId}`);
      revalidateTag(`learn-${userId}`);
      revalidateTag(`user-topics-${userId}`);
      revalidateTag(`learning-paths-${userId}`);
      revalidateTag(`companies-${userId}`);
      revalidateTag(`patterns-${userId}`);
      revalidateTag(`practice-${userId}`);
    }
  } catch {
    // Graceful fallback outside Next.js request context
  }
}

/**
 * Cached version of getLearnData using Next.js unstable_cache.
 * Caches per user for 300 seconds (5 minutes) with on-demand tag-based invalidation.
 */
export async function getCachedLearnData(userId: string) {
  if (typeof unstable_cache === "function") {
    const cachedLoader = unstable_cache(
      async (uid: string) => getLearnData(uid),
      [`user-learn-${userId}`],
      {
        revalidate: 300,
        tags: [`learn-${userId}`, `snapshot-${userId}`],
      }
    );
    return cachedLoader(userId);
  }
  return getLearnData(userId);
}

/**
 * Invalidates the cached learn and missions data for a specific user.
 */
export function revalidateLearnCache(userId: string) {
  try {
    if (typeof revalidateTag === "function") {
      revalidateTag(`learn-${userId}`);
      revalidateTag(`snapshot-${userId}`);
    }
  } catch {
    // Graceful fallback outside Next.js request context
  }
}

export async function getLearnData(userId: string) {
  await connectToDatabase();
  const uid = asObjectId(userId);
  const [topics, missions, progress, missionProgress, activeRoadmap, publishedTemplate, learningPaths, solvedAttempts] = await Promise.all([
    getCachedPublishedTopics(),
    getCachedPublishedMissions(),
    TopicProgressModel.find({ userId: uid }).lean(),
    MissionProgressModel.find({ userId: uid }).lean(),
    RoadmapModel.findOne({ userId: uid, status: "active" }).sort({ updatedAt: -1 }).lean(),
    getCachedRoadmapTemplate(),
    getCachedLearningPaths(),
    ProblemAttemptModel.find({ userId: uid, status: "solved" }).select("problemId").lean(),
  ]);
  const progressByTopic = new Map((progress as AnyDoc[]).map((item: AnyDoc) => [id(item.topicId), item]));
  const progressByMission = new Map((missionProgress as AnyDoc[]).map((item: AnyDoc) => [id(item.missionId), item]));
  const template = (publishedTemplate ?? activeRoadmap) as AnyDoc | null;
  const completedMissionIds = new Set((missionProgress as AnyDoc[]).filter((item: AnyDoc) => item.status === "completed").map((item: AnyDoc) => id(item.missionId)));
  const solvedProblemIds = new Set((solvedAttempts as AnyDoc[]).map((item: AnyDoc) => id(item.problemId)));
  const topicSlugById = new Map((topics as AnyDoc[]).map((topic: AnyDoc) => [id(topic._id), String(topic.slug)]));
  const missionSlugById = new Map((missions as AnyDoc[]).map((mission: AnyDoc) => [id(mission._id), String(mission.slug)]));
  const graphNodes = ((template?.nodes ?? []) as AnyDoc[]).map((node: AnyDoc, index: number) => {
    const completed = node.type === "mission" && node.refId ? completedMissionIds.has(id(node.refId)) : false;
    const href =
      node.type === "topic" && node.refId && topicSlugById.has(id(node.refId)) ? `/learn/topics/${topicSlugById.get(id(node.refId))}` :
      node.type === "mission" && node.refId && missionSlugById.has(id(node.refId)) ? `/missions/${missionSlugById.get(id(node.refId))}` :
      undefined;
    return {
      id: String(node.key),
      type: "studentRoadmap",
      position: node.position ?? { x: 120, y: 80 + index * 140 },
      data: {
        title: String(node.title),
        type: String(node.type),
        description: String(node.description ?? ""),
        state: completed ? "completed" : index === 0 ? "current" : index < 3 ? "available" : "locked",
        href,
      },
    };
  });
  const graphEdges = ((template?.edges ?? []) as AnyDoc[]).map((edge: AnyDoc) => ({ id: String(edge.key), source: String(edge.source), target: String(edge.target), type: "smoothstep", animated: true }));

  // Build Learning Path cards with per-user progress
  const mappedPaths = (learningPaths as AnyDoc[]).map((path: AnyDoc) => {
    const rawStages = ((path.stages ?? []) as AnyDoc[]).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
    let totalTrackable = 0, completedTrackable = 0;
    const stages = rawStages.map((stage, sIdx) => {
      const stageProblems = ((stage.problemIds ?? []) as LeanDoc[]);
      const stageMissions = ((stage.missionIds ?? []) as LeanDoc[]);
      const solvedCount = stageProblems.filter((p) => solvedProblemIds.has(id(p._id))).length;
      const completedMisCount = stageMissions.filter((m) => {
        const prog = progressByMission.get(id(m._id));
        return prog?.status === "completed" || Number(prog?.progress ?? 0) >= 100;
      }).length;
      const t = stageProblems.length + stageMissions.length;
      const c = solvedCount + completedMisCount;
      totalTrackable += t;
      completedTrackable += c;
      const sp = t > 0 ? Math.round((c / t) * 100) : 0;
      return {
        order: Number(stage.order ?? sIdx),
        title: String(stage.title),
        progress: sp,
        status: sp >= 100 ? "completed" : sp > 0 ? "in_progress" : "not_started",
        missionCount: stageMissions.length,
        problemCount: stageProblems.length,
      };
    });
    const overallProgress = totalTrackable > 0 ? Math.round((completedTrackable / totalTrackable) * 100) : 0;
    const pathStatus = overallProgress >= 100 ? "completed" : overallProgress > 0 ? "in_progress" : "not_started";
    const currentStageIdx = stages.findIndex((s) => s.status !== "completed");
    const currentStage = stages[currentStageIdx !== -1 ? currentStageIdx : stages.length - 1] ?? null;
    return {
      id: id(path._id),
      slug: String(path.slug),
      title: String(path.title),
      description: String(path.description ?? ""),
      difficulty: difficulty(path.difficulty),
      minutes: Number(path.estimatedMinutes ?? 0),
      isFeatured: Boolean(path.isFeatured),
      stageCount: stages.length,
      progress: overallProgress,
      status: pathStatus,
      currentStageIndex: currentStageIdx !== -1 ? currentStageIdx : stages.length - 1,
      currentStageTitle: currentStage?.title ?? "",
      stages,
    };
  });

  // Active path = the one in-progress, else featured, else first
  const selectedPath = mappedPaths.find((p) => p.status === "in_progress") ??
    mappedPaths.find((p) => p.isFeatured) ??
    mappedPaths[0] ??
    null;
  const activePath = selectedPath ? { ...selectedPath } : null;

  // Derive hero mission: current in-progress OR next not-started
  const mappedMissions = (missions as AnyDoc[]).map((mission: AnyDoc) => {
    const item = progressByMission.get(id(mission._id));
    const topic = mission.topicId as LeanDoc | null;
    return {
      id: id(mission._id),
      slug: String(mission.slug),
      title: String(mission.title),
      topic: String(topic?.name ?? "Learning"),
      progress: Number(item?.progress ?? 0),
      duration: `${mission.estimatedMinutes} min`,
      minutes: Number(mission.estimatedMinutes ?? 0),
      difficulty: difficulty(mission.difficulty),
      status: String(item?.status ?? "not_started"),
    };
  });

  const selectedMission =
    mappedMissions.find((m) => m.status === "in_progress") ??
    mappedMissions.find((m) => m.status === "not_started") ??
    null;
  const heroMission = selectedMission ? { ...selectedMission } : null;

  // Up Next: next 3 items after hero mission, not completed
  const upNext = mappedMissions
    .filter((m) => m.status !== "completed" && m.id !== heroMission?.id)
    .slice(0, 3)
    .map((m) => ({ ...m }));

  return toDTO({
    roadmap: { title: String(template?.name ?? "Learning journey"), nodes: graphNodes, edges: graphEdges },
    topics: (topics as AnyDoc[]).map((topic: AnyDoc) => {
      const item = progressByTopic.get(id(topic._id));
      return { id: id(topic._id), slug: String(topic.slug), title: String(topic.name), description: String(topic.description), difficulty: difficulty(topic.difficulty), progress: Number(item?.masteryScore ?? 0), confidence: Number(item?.confidenceScore ?? 0), minutes: Number(topic.estimatedMinutes ?? 0), patterns: [] as string[] };
    }),
    missions: mappedMissions,
    activePath,
    heroMission,
    upNext,
    featuredPaths: mappedPaths.filter(Boolean),
  });
}

function buildMissionStages(mission: AnyDoc, progress: AnyDoc | undefined) {
  const completedKeys = new Set<string>((progress?.completedStepKeys ?? []) as string[]);
  const steps = (mission.steps ?? []) as Array<{ key: string; kind: string }>;
  let activeFound = false;
  return steps.map((step) => {
    let status: "completed" | "active" | "locked" = "locked";
    if (completedKeys.has(step.key)) {
      status = "completed";
    } else if (!activeFound) {
      status = "active";
      activeFound = true;
    }
    return { key: step.key, kind: String(step.kind), status };
  });
}

export async function getTopicDetailData(userId: string, slug: string) {
  await connectToDatabase();
  const uid = asObjectId(userId);

  const [cachedTopic, allTopics, allPatterns, allMissions] = await Promise.all([
    getCachedTopicBySlug(slug),
    getCachedPublishedTopics(),
    getCachedPublishedPatterns(),
    getCachedPublishedMissions(),
  ]);

  const topic = (cachedTopic || await TopicModel.findOne({ slug, isPublished: true }).lean()) as AnyDoc | null;
  if (!topic) return null;

  const topicIdStr = id(topic._id);
  const patterns = (allPatterns as AnyDoc[]).filter(
    (p: AnyDoc) => String(p.topicId?._id ?? p.topicId) === topicIdStr
  );
  const missions = (allMissions as AnyDoc[]).filter(
    (m: AnyDoc) => String(m.topicId?._id ?? m.topicId) === topicIdStr
  );
  const relatedTopics = (allTopics as AnyDoc[])
    .filter((t: AnyDoc) => id(t._id) !== topicIdStr)
    .slice(0, 4);

  const patternIds = patterns.map((p: AnyDoc) => p._id);
  const missionIds = missions.map((m: AnyDoc) => m._id);
  const relatedTopicIds = relatedTopics.map((t: AnyDoc) => t._id);

  const [
    topicProgress,
    problems,
    reflections,
    revisions,
    revisionCount,
    patternMastery,
    missionProgress,
    relatedProgress,
  ] = await Promise.all([
    TopicProgressModel.findOne({ userId: uid, topicId: topic._id }).lean(),
    ProblemModel.find({ topicIds: topic._id, isPublished: true })
      .populate({ path: "patternIds", select: "_id name slug" })
      .select("_id slug title summary difficulty patternIds qualityScore")
      .sort({ qualityScore: -1 })
      .lean(),
    ReflectionLogModel.find({ userId: uid, $or: [{ topicId: topic._id }, { entityType: "topic", entityId: topic._id }] }).sort({ createdAt: -1 }).limit(4).lean(),
    RevisionQueueModel.find({ userId: uid, entityType: "topic", entityId: topic._id, state: { $in: ["due", "scheduled"] } }).sort({ dueAt: 1 }).limit(5).lean(),
    RevisionQueueModel.countDocuments({ userId: uid, entityType: "topic", entityId: topic._id, state: { $in: ["due", "scheduled"] } }),
    patternIds.length ? PatternMasteryModel.find({ userId: uid, patternId: { $in: patternIds } }).lean() : [],
    missionIds.length ? MissionProgressModel.find({ userId: uid, missionId: { $in: missionIds } }).lean() : [],
    relatedTopicIds.length ? TopicProgressModel.find({ userId: uid, topicId: { $in: relatedTopicIds } }).lean() : [],
  ]);

  const problemIds = (problems as AnyDoc[]).map((p: AnyDoc) => p._id);
  const attempts = problemIds.length
    ? await ProblemAttemptModel.find({ userId: uid, problemId: { $in: problemIds } })
        .select("problemId status selfConfidence createdAt")
        .sort({ createdAt: -1 })
        .lean()
    : [];

  const attemptsByProblem = new Map((attempts as AnyDoc[]).map((attempt: AnyDoc) => [id(attempt.problemId), attempt]));
  const progressByMission = new Map((missionProgress as AnyDoc[]).map((item: AnyDoc) => [id(item.missionId), item]));
  const masteryByPattern = new Map((patternMastery as AnyDoc[]).map((item: AnyDoc) => [id(item.patternId), item]));
  const progressByTopic = new Map((relatedProgress as AnyDoc[]).map((item: AnyDoc) => [id(item.topicId), item]));

  const mappedMissions = (missions as AnyDoc[]).map((mission: AnyDoc) => {
    const item = progressByMission.get(id(mission._id));
    const stages = buildMissionStages(mission, item);
    const activeStage = stages.find((stage) => stage.status === "active") ?? stages.find((stage) => stage.status === "completed");
    return {
      id: id(mission._id),
      slug: String(mission.slug),
      title: String(mission.title),
      description: String(mission.description),
      difficulty: difficulty(mission.difficulty),
      minutes: Number(mission.estimatedMinutes ?? 0),
      progress: Number(item?.progress ?? 0),
      status: String(item?.status ?? "not_started"),
      completedSteps: ((item?.completedStepKeys ?? []) as string[]).length,
      totalSteps: ((mission.steps ?? []) as unknown[]).length,
      stages,
      activeStageKind: activeStage?.kind ?? null,
    };
  });

  const mappedPatterns = (patterns as AnyDoc[]).map((pattern: AnyDoc) => {
    const item = masteryByPattern.get(id(pattern._id));
    const progress = Number(item?.masteryScore ?? 0);
    return {
      id: id(pattern._id),
      name: String(pattern.name),
      slug: String(pattern.slug),
      difficulty: difficulty(pattern.difficulty),
      description: String(pattern.description),
      progress,
      status: progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "not_started",
    };
  });

  const mappedProblems = (problems as AnyDoc[]).map((problem: AnyDoc) => {
    const attempt = attemptsByProblem.get(id(problem._id));
    const pattern = Array.isArray(problem.patternIds) ? problem.patternIds[0] as LeanDoc | undefined : undefined;
    return {
      id: id(problem._id),
      slug: String(problem.slug),
      title: String(problem.title),
      summary: String(problem.summary),
      difficulty: difficulty(problem.difficulty),
      pattern: String(pattern?.name ?? "General"),
      status: String(attempt?.status ?? "not_started"),
      confidence: Number(attempt?.selfConfidence ? Number(attempt.selfConfidence) * 20 : 0),
    };
  });

  const solvedProblems = mappedProblems.filter((p) => p.status === "solved").length;
  const patternsCompleted = mappedPatterns.filter((p) => p.status === "completed").length;
  const missionsCompleted = mappedMissions.filter((m) => m.status === "completed").length;

  return toDTO({
    topic: {
      id: id(topic._id),
      slug: String(topic.slug),
      title: String(topic.name),
      description: String(topic.description),
      difficulty: difficulty(topic.difficulty),
      minutes: Number(topic.estimatedMinutes ?? 0),
      progress: Number((topicProgress as AnyDoc | null)?.masteryScore ?? 0),
      confidence: Number((topicProgress as AnyDoc | null)?.confidenceScore ?? 0),
      state: String((topicProgress as AnyDoc | null)?.state ?? "not_started"),
      solvedCount: Number((topicProgress as AnyDoc | null)?.solvedCount ?? 0) || solvedProblems,
      attempts: Number((topicProgress as AnyDoc | null)?.attempts ?? 0),
      lastStudiedAt: (topicProgress as AnyDoc | null)?.lastStudiedAt ? new Date((topicProgress as AnyDoc).lastStudiedAt as Date).toISOString() : "",
      lastSolvedAt: (topicProgress as AnyDoc | null)?.lastSolvedAt ? new Date((topicProgress as AnyDoc).lastSolvedAt as Date).toISOString() : "",
    },
    counts: {
      problems: mappedProblems.length,
      solvedProblems,
      patterns: mappedPatterns.length,
      patternsCompleted,
      missions: mappedMissions.length,
      missionsCompleted,
      revisionsDue: revisionCount,
    },
    patterns: mappedPatterns,
    missions: mappedMissions,
    problems: mappedProblems,
    reflections: (reflections as AnyDoc[]).map((reflection: AnyDoc) => ({ id: id(reflection._id), content: String(reflection.content), selfRating: Number(reflection.selfRating ?? 0), createdAt: new Date(reflection.createdAt as Date).toISOString() })),
    revisions: (revisions as AnyDoc[]).map((revision: AnyDoc) => ({ id: id(revision._id), state: String(revision.state), dueAt: new Date(revision.dueAt as Date).toISOString(), priority: Number(revision.priority ?? 0) })),
    relatedTopics: (relatedTopics as AnyDoc[]).map((related: AnyDoc) => {
      const item = progressByTopic.get(id(related._id));
      return {
        id: id(related._id),
        slug: String(related.slug),
        title: String(related.name),
        description: String(related.description),
        difficulty: difficulty(related.difficulty),
        progress: Number(item?.masteryScore ?? 0),
      };
    }),
  });
}

/**
 * Cached version of getTopicDetailData using Next.js unstable_cache.
 * Caches per user + topic slug for 300 seconds (5 minutes) with on-demand tag-based invalidation.
 */
export async function getCachedTopicDetailData(userId: string, slug: string) {
  if (typeof unstable_cache === "function") {
    const cachedLoader = unstable_cache(
      async (uid: string, s: string) => getTopicDetailData(uid, s),
      [`user-topic-${userId}-${slug}`],
      {
        revalidate: 300,
        tags: [`topic-${userId}-${slug}`, `user-topics-${userId}`, `snapshot-${userId}`],
      }
    );
    return cachedLoader(userId, slug);
  }
  return getTopicDetailData(userId, slug);
}

/**
 * Invalidates the cached topic data for a specific user.
 */
export function revalidateTopicCache(userId: string, slug?: string) {
  try {
    if (typeof revalidateTag === "function") {
      if (slug) {
        revalidateTag(`topic-${userId}-${slug}`);
      }
      revalidateTag(`user-topics-${userId}`);
      revalidateTag(`snapshot-${userId}`);
    }
  } catch {
    // Graceful fallback outside Next.js request context
  }
}

export async function getLearningPathsData(userId: string) {
  await connectToDatabase();
  const uid = asObjectId(userId);
  const [paths, missionProgress, solvedAttempts] = await Promise.all([
    LearningPathModel.find({ isPublished: true })
      .sort({ isFeatured: -1, updatedAt: -1 })
      .populate("stages.topicIds stages.patternIds stages.problemIds stages.missionIds")
      .lean(),
    MissionProgressModel.find({ userId: uid }).lean(),
    ProblemAttemptModel.find({ userId: uid, status: "solved" }).select("problemId").lean(),
  ]);

  const progressByMission = new Map((missionProgress as AnyDoc[]).map((item: AnyDoc) => [id(item.missionId), item]));
  const solvedProblemIds = new Set((solvedAttempts as AnyDoc[]).map((item: AnyDoc) => id(item.problemId)));

  return toDTO((paths as AnyDoc[]).map((path: AnyDoc) => {
    const rawStages = ((path.stages ?? []) as AnyDoc[]).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));

    let totalProblemsCount = 0;
    let totalSolvedProblemsCount = 0;
    let totalMissionsCount = 0;
    let totalCompletedMissionsCount = 0;

    const stages = rawStages.map((stage, sIdx) => {
      const stageProblems = ((stage.problemIds ?? []) as LeanDoc[]).map((problem) => {
        const probId = id(problem._id);
        const isSolved = solvedProblemIds.has(probId);
        return {
          id: probId,
          slug: String(problem.slug ?? probId),
          title: String(problem.title ?? "Untitled problem"),
          difficulty: difficulty(problem.difficulty),
          sourceUrl: String(problem.sourceUrl ?? ""),
          isSolved,
        };
      });

      const stageMissions = ((stage.missionIds ?? []) as LeanDoc[]).map((mission) => {
        const misId = id(mission._id);
        const misProg = progressByMission.get(misId);
        const progressVal = Number(misProg?.progress ?? 0);
        const isCompleted = misProg?.status === "completed" || progressVal >= 100;
        return {
          id: misId,
          slug: String(mission.slug ?? misId),
          title: String(mission.title ?? "Untitled mission"),
          progress: progressVal,
          status: String(misProg?.status ?? "not_started"),
          isCompleted,
        };
      });

      const solvedCount = stageProblems.filter((p) => p.isSolved).length;
      const completedMisCount = stageMissions.filter((m) => m.isCompleted).length;
      const totalTrackable = stageProblems.length + stageMissions.length;
      const completedTrackable = solvedCount + completedMisCount;

      totalProblemsCount += stageProblems.length;
      totalSolvedProblemsCount += solvedCount;
      totalMissionsCount += stageMissions.length;
      totalCompletedMissionsCount += completedMisCount;

      const stageProgress = totalTrackable > 0 ? Math.round((completedTrackable / totalTrackable) * 100) : 0;
      const stageStatus = stageProgress >= 100 ? "completed" : stageProgress > 0 ? "in_progress" : "not_started";

      return {
        order: Number(stage.order ?? sIdx),
        title: normalizeStageTitle(String(stage.title)),
        description: String(stage.description ?? ""),
        minutes: Number(stage.estimatedMinutes ?? 0),
        progress: stageProgress,
        status: stageStatus,
        topics: ((stage.topicIds ?? []) as LeanDoc[]).map((topic) => ({
          id: id(topic._id),
          name: String(topic.name ?? ""),
          slug: String(topic.slug ?? id(topic._id)),
        })),
        patterns: ((stage.patternIds ?? []) as LeanDoc[]).map((pattern) => ({
          id: id(pattern._id),
          name: String(pattern.name ?? ""),
          slug: String(pattern.slug ?? id(pattern._id)),
        })),
        problems: stageProblems,
        missions: stageMissions,
      };
    });

    const totalTrackable = totalProblemsCount + totalMissionsCount;
    const completedTrackable = totalSolvedProblemsCount + totalCompletedMissionsCount;
    const overallProgress = totalTrackable > 0 ? Math.round((completedTrackable / totalTrackable) * 100) : 0;
    const pathStatus = overallProgress >= 100 ? "completed" : overallProgress > 0 ? "in_progress" : "not_started";

    const currentStage = stages.find((s) => s.progress < 100) || stages[stages.length - 1] || null;
    const currentStageIdx = currentStage ? stages.indexOf(currentStage) : 0;
    let nextItemUrl = `/learning-paths/${path.slug}`;
    let nextItemTitle = "";

    if (currentStage) {
      const nextProblem = currentStage.problems.find((p) => !p.isSolved);
      const nextMission = currentStage.missions.find((m) => !m.isCompleted);
      if (nextProblem) {
        nextItemUrl = `/practice/problems/${nextProblem.slug}`;
        nextItemTitle = nextProblem.title;
      } else if (nextMission) {
        nextItemUrl = `/missions/${nextMission.slug}`;
        nextItemTitle = nextMission.title;
      }
    }

    return {
      id: id(path._id),
      slug: String(path.slug),
      title: String(path.title),
      description: String(path.description),
      coverImage: String(path.coverImage ?? ""),
      difficulty: difficulty(path.difficulty),
      minutes: Number(path.estimatedMinutes ?? 0),
      audience: String(path.audience ?? ""),
      tags: Array.isArray(path.tags) ? path.tags.map(String) : [],
      isFeatured: Boolean(path.isFeatured),
      progress: overallProgress,
      status: pathStatus,
      totalProblems: totalProblemsCount,
      solvedProblems: totalSolvedProblemsCount,
      totalMissions: totalMissionsCount,
      completedMissions: totalCompletedMissionsCount,
      currentStageIndex: currentStageIdx,
      currentStageTitle: currentStage ? currentStage.title : "",
      nextItemUrl,
      nextItemTitle,
      stages,
    };
  }));
}

export async function getLearningPathDetailData(slug: string, userId: string) {
  await connectToDatabase();
  const uid = asObjectId(userId);
  const [path, missionProgress, solvedAttempts] = await Promise.all([
    LearningPathModel.findOne({ slug, isPublished: true })
      .populate("stages.topicIds stages.patternIds stages.problemIds stages.missionIds")
      .lean(),
    MissionProgressModel.find({ userId: uid }).lean(),
    ProblemAttemptModel.find({ userId: uid, status: "solved" }).select("problemId").lean(),
  ]);

  if (!path) return null;

  const progressByMission = new Map((missionProgress as AnyDoc[]).map((item: AnyDoc) => [id(item.missionId), item]));
  const solvedProblemIds = new Set((solvedAttempts as AnyDoc[]).map((item: AnyDoc) => id(item.problemId)));

  const rawStages = (((path as AnyDoc).stages ?? []) as AnyDoc[]).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));

  let totalProblemsCount = 0;
  let totalSolvedProblemsCount = 0;
  let totalMissionsCount = 0;
  let totalCompletedMissionsCount = 0;

  const stages = rawStages.map((stage, sIdx) => {
    const stageProblems = ((stage.problemIds ?? []) as LeanDoc[]).map((problem) => {
      const probId = id(problem._id);
      const isSolved = solvedProblemIds.has(probId);
      return {
        id: probId,
        slug: String(problem.slug ?? probId),
        title: String(problem.title ?? "Untitled problem"),
        difficulty: difficulty(problem.difficulty),
        sourceUrl: String(problem.sourceUrl ?? ""),
        isSolved,
      };
    });

    const stageMissions = ((stage.missionIds ?? []) as LeanDoc[]).map((mission) => {
      const misId = id(mission._id);
      const misProg = progressByMission.get(misId);
      const progressVal = Number(misProg?.progress ?? 0);
      const isCompleted = misProg?.status === "completed" || progressVal >= 100;
      return {
        id: misId,
        slug: String(mission.slug ?? misId),
        title: String(mission.title ?? "Untitled mission"),
        progress: progressVal,
        status: String(misProg?.status ?? "not_started"),
        isCompleted,
      };
    });

    const solvedCount = stageProblems.filter((p) => p.isSolved).length;
    const completedMisCount = stageMissions.filter((m) => m.isCompleted).length;
    const totalTrackable = stageProblems.length + stageMissions.length;
    const completedTrackable = solvedCount + completedMisCount;

    totalProblemsCount += stageProblems.length;
    totalSolvedProblemsCount += solvedCount;
    totalMissionsCount += stageMissions.length;
    totalCompletedMissionsCount += completedMisCount;

    const stageProgress = totalTrackable > 0 ? Math.round((completedTrackable / totalTrackable) * 100) : 0;
    const stageStatus = stageProgress >= 100 ? "completed" : stageProgress > 0 ? "in_progress" : "not_started";

      return {
        order: Number(stage.order ?? sIdx),
        title: normalizeStageTitle(String(stage.title)),
        description: String(stage.description ?? ""),
        minutes: Number(stage.estimatedMinutes ?? 0),
        progress: stageProgress,
        status: stageStatus,
        topics: ((stage.topicIds ?? []) as LeanDoc[]).map((topic) => ({
          id: id(topic._id),
          name: String(topic.name ?? ""),
          slug: String(topic.slug ?? id(topic._id)),
        })),
        patterns: ((stage.patternIds ?? []) as LeanDoc[]).map((pattern) => ({
          id: id(pattern._id),
          name: String(pattern.name ?? ""),
          slug: String(pattern.slug ?? id(pattern._id)),
        })),
        problems: stageProblems,
        missions: stageMissions,
      };
    });

    const totalTrackable = totalProblemsCount + totalMissionsCount;
    const completedTrackable = totalSolvedProblemsCount + totalCompletedMissionsCount;
    const overallProgress = totalTrackable > 0 ? Math.round((completedTrackable / totalTrackable) * 100) : 0;
    const pathStatus = overallProgress >= 100 ? "completed" : overallProgress > 0 ? "in_progress" : "not_started";

    const currentStage = stages.find((s) => s.progress < 100) || stages[stages.length - 1] || null;
    const currentStageIdx = currentStage ? stages.indexOf(currentStage) : 0;
    let nextItemUrl = `/learning-paths/${(path as AnyDoc).slug}`;
    let nextItemTitle = "";

    if (currentStage) {
      const nextProblem = currentStage.problems.find((p) => !p.isSolved);
      const nextMission = currentStage.missions.find((m) => !m.isCompleted);
      if (nextProblem) {
        nextItemUrl = `/practice/problems/${nextProblem.slug}`;
        nextItemTitle = nextProblem.title;
      } else if (nextMission) {
        nextItemUrl = `/missions/${nextMission.slug}`;
        nextItemTitle = nextMission.title;
      }
    }

    return toDTO({
      id: id((path as AnyDoc)._id),
      slug: String((path as AnyDoc).slug),
      title: String((path as AnyDoc).title),
      description: String((path as AnyDoc).description),
      coverImage: String((path as AnyDoc).coverImage ?? ""),
      difficulty: difficulty((path as AnyDoc).difficulty),
      minutes: Number((path as AnyDoc).estimatedMinutes ?? 0),
      audience: String((path as AnyDoc).audience ?? ""),
      tags: Array.isArray((path as AnyDoc).tags) ? (path as AnyDoc).tags.map(String) : [],
      isFeatured: Boolean((path as AnyDoc).isFeatured),
      progress: overallProgress,
      status: pathStatus,
      totalProblems: totalProblemsCount,
      solvedProblems: totalSolvedProblemsCount,
      totalMissions: totalMissionsCount,
      completedMissions: totalCompletedMissionsCount,
      currentStageIndex: currentStageIdx,
      currentStageTitle: currentStage ? currentStage.title : "",
      nextItemUrl,
      nextItemTitle,
      stages,
    });
}

/**
 * Cached version of getLearningPathsData using Next.js unstable_cache.
 * Caches per user for 300 seconds (5 minutes) with on-demand tag-based invalidation.
 */
export async function getCachedLearningPathsData(userId: string) {
  if (typeof unstable_cache === "function") {
    const cachedLoader = unstable_cache(
      async (uid: string) => getLearningPathsData(uid),
      [`user-learning-paths-${userId}`],
      {
        revalidate: 300,
        tags: [`learning-paths-${userId}`, `snapshot-${userId}`],
      }
    );
    return cachedLoader(userId);
  }
  return getLearningPathsData(userId);
}

/**
 * Cached version of getLearningPathDetailData using Next.js unstable_cache.
 * Caches per user + slug for 300 seconds (5 minutes) with on-demand tag-based invalidation.
 */
export async function getCachedLearningPathDetailData(slug: string, userId: string) {
  if (typeof unstable_cache === "function") {
    const cachedLoader = unstable_cache(
      async (s: string, uid: string) => getLearningPathDetailData(s, uid),
      [`user-learning-path-${userId}-${slug}`],
      {
        revalidate: 300,
        tags: [`learning-path-${userId}-${slug}`, `learning-paths-${userId}`, `snapshot-${userId}`],
      }
    );
    return cachedLoader(slug, userId);
  }
  return getLearningPathDetailData(slug, userId);
}

export async function getPatternSheetsData(userId: string) {
  await connectToDatabase();
  const uid = asObjectId(userId);
  const [patterns, problems, mastery, bookmarks] = await Promise.all([
    PatternModel.find({ isPublished: true }).populate("topicId").sort({ difficulty: 1, name: 1 }).lean(),
    ProblemModel.find({ isPublished: true }).select("slug title difficulty source patternIds").lean(),
    PatternMasteryModel.find({ userId: uid }).lean(),
    BookmarkModel.find({ userId: uid, entityType: "pattern" }).lean(),
  ]);
  const masteryByPattern = new Map((mastery as AnyDoc[]).map((item: AnyDoc) => [id(item.patternId), item]));
  const bookmarked = new Set((bookmarks as AnyDoc[]).map((item: AnyDoc) => id(item.entityId)));
  return toDTO((patterns as AnyDoc[]).map((pattern: AnyDoc) => {
    const item = masteryByPattern.get(id(pattern._id));
    const relatedProblems = (problems as AnyDoc[])
      .filter((problem: AnyDoc) => ((problem.patternIds ?? []) as unknown[]).map(id).includes(id(pattern._id)))
      .map((problem: AnyDoc) => ({ slug: String(problem.slug), title: String(problem.title), difficulty: difficulty(problem.difficulty) }));
    const progress = Number(item?.masteryScore ?? 0);
    return {
      id: id(pattern._id),
      slug: String(pattern.slug),
      name: String(pattern.name),
      description: String(pattern.description),
      whenToUse: String(pattern.whenToUse ?? ""),
      mentalModel: String(pattern.mentalModel ?? ""),
      difficulty: difficulty(pattern.difficulty),
      topic: String((pattern.topicId as LeanDoc | null)?.name ?? "General"),
      keywords: ((pattern.signalKeywords ?? []) as string[]).filter(Boolean),
      progress,
      status: progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "not_started",
      bookmarked: bookmarked.has(id(pattern._id)),
      problemCount: relatedProblems.length,
      problems: relatedProblems,
    };
  }));
}

/**
 * Cached version of getPatternSheetsData using Next.js unstable_cache.
 * Caches per user for 300 seconds (5 minutes) with on-demand tag-based invalidation.
 */
export async function getCachedPatternSheetsData(userId: string) {
  if (typeof unstable_cache === "function") {
    const cachedLoader = unstable_cache(
      async (uid: string) => getPatternSheetsData(uid),
      [`user-patterns-${userId}`],
      {
        revalidate: 300,
        tags: [`patterns-${userId}`, `snapshot-${userId}`],
      }
    );
    return cachedLoader(userId);
  }
  return getPatternSheetsData(userId);
}

export async function getPracticeData(userId: string) {
  await connectToDatabase();
  const uid = asObjectId(userId);
  const problems = (await getCachedPublishedProblems()) as AnyDoc[];
  const [attempts, bookmarks, reflections, practiceRecommendations, allPatterns, recognitionAttempts] = await Promise.all([
    ProblemAttemptModel.find({ userId: uid })
      .select("problemId selfConfidence status durationSeconds codeLanguage perceivedDifficulty strategy hintsUsed createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    BookmarkModel.find({ userId: uid, entityType: "problem" }).select("entityId").lean(),
    ReflectionLogModel.find({ userId: uid, entityType: "problem" }).select("entityId content selfRating createdAt").sort({ createdAt: -1 }).lean(),
    buildPracticeRecommendations(uid, 3, { problems }),
    getCachedPublishedPatterns(),
    PatternRecognitionAttemptModel.find({ userId: uid, problemId: { $ne: null } })
      .select("problemId isCorrect selectedPatternId reasoning signalIdentified createdAt")
      .sort({ createdAt: -1 })
      .lean(),
  ]);
  const attemptByProblem = new Map((attempts as AnyDoc[]).map((item: AnyDoc) => [id(item.problemId), item]));
  const reflectionByProblem = new Map((reflections as AnyDoc[]).map((item: AnyDoc) => [id(item.entityId), item]));
  const recognitionByProblem = new Map((recognitionAttempts as AnyDoc[]).map((item: AnyDoc) => [id(item.problemId), item]));
  const patternNameById = new Map((allPatterns as AnyDoc[]).map((pattern: AnyDoc) => [id(pattern._id), String(pattern.name)]));
  const bookmarked = new Set((bookmarks as AnyDoc[]).map((item: AnyDoc) => id(item.entityId)));
  const mappedProblems = (problems as AnyDoc[]).map((problem: AnyDoc) => {
    const attempt = attemptByProblem.get(id(problem._id));
    const pattern = Array.isArray(problem.patternIds) ? problem.patternIds[0] as LeanDoc | undefined : undefined;
    const topics = Array.isArray(problem.topicIds) ? (problem.topicIds as LeanDoc[]).map((topic) => String(topic.name ?? "")).filter(Boolean) : [];
    const companies = Array.isArray(problem.companyIds) ? (problem.companyIds as LeanDoc[]).map((company) => String(company.name ?? "")).filter(Boolean) : [];
    const tags = ((problem.tags ?? []) as string[]).filter(Boolean);
    const reflection = reflectionByProblem.get(id(problem._id));
    return {
      id: id(problem._id),
      slug: String(problem.slug),
      title: String(problem.title),
      summary: String(problem.summary),
      thinkingDirection: String(problem.thinkingDirection ?? ""),
      dryRunPrompt: String(problem.dryRunPrompt ?? ""),
      hints: ((problem.hints ?? []) as AnyDoc[])
        .map((hint: AnyDoc) => ({ level: Number(hint.level ?? 1), title: String(hint.title ?? ""), content: String(hint.content ?? "") }))
        .filter((hint) => hint.content)
        .sort((a, b) => a.level - b.level),
      commonMistakes: ((problem.commonMistakes ?? []) as string[]).filter(Boolean),
      source: String(problem.source),
      sourceUrl: String(problem.sourceUrl ?? ""),
      difficulty: difficulty(problem.difficulty),
      pattern: String(pattern?.name ?? "General"),
      patternDetail: pattern ? {
        id: id(pattern._id),
        slug: String(pattern.slug ?? ""),
        name: String(pattern.name ?? "General"),
        description: String(pattern.description ?? ""),
        whenToUse: String(pattern.whenToUse ?? ""),
        mentalModel: String(pattern.mentalModel ?? ""),
        variations: ((pattern.variations ?? []) as string[]).filter(Boolean),
        signalKeywords: ((pattern.signalKeywords ?? []) as string[]).filter(Boolean),
      } : null,
      allPatterns: (allPatterns as AnyDoc[]).map((pattern: AnyDoc) => ({ id: id(pattern._id), name: String(pattern.name), slug: String(pattern.slug) })),
      expectedPatternIds: Array.isArray(problem.patternIds) ? (problem.patternIds as LeanDoc[]).map((pattern) => id(pattern._id ?? pattern)) : [],
      latestRecognition: recognitionByProblem.get(id(problem._id)) ? {
        isCorrect: Boolean(recognitionByProblem.get(id(problem._id))?.isCorrect),
        selectedPatternName: patternNameById.get(id(recognitionByProblem.get(id(problem._id))?.selectedPatternId)) ?? "Selected pattern",
        reasoning: String(recognitionByProblem.get(id(problem._id))?.reasoning ?? ""),
        signalIdentified: String(recognitionByProblem.get(id(problem._id))?.signalIdentified ?? ""),
        createdAt: recognitionByProblem.get(id(problem._id))?.createdAt ? new Date(recognitionByProblem.get(id(problem._id))?.createdAt as Date).toISOString() : "",
      } : null,
      confidence: Number(attempt?.selfConfidence ? Number(attempt.selfConfidence) * 20 : 0),
      status: String(attempt?.status ?? "not_started"),
      durationSeconds: Number(attempt?.durationSeconds ?? 0),
      codeLanguage: String(attempt?.codeLanguage ?? ""),
      perceivedDifficulty: Number(attempt?.perceivedDifficulty ?? 0),
      strategy: String(attempt?.strategy ?? ""),
      hintsUsed: Number(attempt?.hintsUsed ?? 0),
      lastAttemptAt: attempt?.createdAt ? new Date(attempt.createdAt as Date).toISOString() : "",
      bookmarked: bookmarked.has(id(problem._id)),
      topics,
      companies,
      tags,
      estimatedMinutes: Number(problem.estimatedMinutes ?? 0),
      reflection: String(reflection?.content ?? ""),
      reflectionRating: Number(reflection?.selfRating ?? 3),
      learningGoal: tags.length ? `Recognize when ${tags.join(", ")} point toward ${String(pattern?.name ?? "this pattern")}.` : `Understand the ${String(pattern?.name ?? "core")} pattern behind this problem.`,
    };
  });
  const problemsById = new Map(mappedProblems.map((problem: AnyDoc) => [id(problem.id), problem]));
  return toDTO({
    problems: mappedProblems,
    recommendations: practiceRecommendations
      .map((recommendation: any) => {
        const problem = problemsById.get(id(recommendation.problem._id));
        return problem ? { ...problem, recommendationReason: recommendation.reason, recommendationScore: recommendation.score, reasonCodes: recommendation.reasonCodes, weakTopic: recommendation.weakTopic, weakPattern: recommendation.weakPattern, revisionIntent: recommendation.revisionIntent } : null;
      })
      .filter(Boolean),
  });
}

/**
 * Cached version of getPracticeData using Next.js unstable_cache.
 * Caches per user for 300 seconds (5 minutes) with on-demand tag-based invalidation.
 */
export async function getCachedPracticeData(userId: string) {
  if (typeof unstable_cache === "function") {
    const cachedLoader = unstable_cache(
      async (uid: string) => getPracticeData(uid),
      [`user-practice-${userId}`],
      {
        revalidate: 300,
        tags: [`practice-${userId}`, `snapshot-${userId}`],
      }
    );
    return cachedLoader(userId);
  }
  return getPracticeData(userId);
}

export async function getProblemDetailData(userId: string, slug: string) {
  await connectToDatabase();
  const uid = asObjectId(userId);

  const problem = await ProblemModel.findOne({ slug, isPublished: true })
    .populate({ path: "patternIds", select: "_id name slug description whenToUse mentalModel variations signalKeywords" })
    .populate({ path: "topicIds", select: "_id name slug" })
    .populate({ path: "companyIds", select: "_id name slug" })
    .lean() as AnyDoc | null;

  if (!problem) return null;

  const primaryPatternId = Array.isArray(problem.patternIds) && problem.patternIds.length > 0
    ? (problem.patternIds[0]._id ?? problem.patternIds[0])
    : null;

  const [attempt, bookmark, reflection, recognitionAttempt, allPatterns, allProblems] = await Promise.all([
    ProblemAttemptModel.findOne({ userId: uid, problemId: problem._id })
      .select("problemId selfConfidence status durationSeconds codeLanguage perceivedDifficulty strategy hintsUsed createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    BookmarkModel.findOne({ userId: uid, entityType: "problem", entityId: problem._id })
      .select("entityId")
      .lean(),
    ReflectionLogModel.findOne({ userId: uid, entityType: "problem", entityId: problem._id })
      .select("entityId content selfRating createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    PatternRecognitionAttemptModel.findOne({ userId: uid, problemId: problem._id })
      .select("problemId isCorrect selectedPatternId reasoning signalIdentified createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    getCachedPublishedPatterns(),
    getCachedPublishedProblems(),
  ]);

  const nextProblemDoc = (allProblems as AnyDoc[]).find((p) => {
    if (String(p._id) === String(problem._id)) return false;
    if (!primaryPatternId) return true;
    return ((p.patternIds ?? []) as AnyDoc[]).some((pat) => String(pat._id ?? pat) === String(primaryPatternId));
  }) ?? (allProblems as AnyDoc[]).find((p) => String(p._id) !== String(problem._id)) ?? null;

  const patternNameById = new Map((allPatterns as AnyDoc[]).map((pattern: AnyDoc) => [id(pattern._id), String(pattern.name)]));
  const pattern = Array.isArray(problem.patternIds) ? problem.patternIds[0] as LeanDoc | undefined : undefined;
  const topics = Array.isArray(problem.topicIds) ? (problem.topicIds as LeanDoc[]).map((t) => String(t.name ?? "")).filter(Boolean) : [];
  const companies = Array.isArray(problem.companyIds) ? (problem.companyIds as LeanDoc[]).map((c) => String(c.name ?? "")).filter(Boolean) : [];
  const tags = ((problem.tags ?? []) as string[]).filter(Boolean);

  const mappedProblem = {
    id: id(problem._id),
    slug: String(problem.slug),
    title: String(problem.title),
    summary: String(problem.summary),
    thinkingDirection: String(problem.thinkingDirection ?? ""),
    dryRunPrompt: String(problem.dryRunPrompt ?? ""),
    hints: ((problem.hints ?? []) as AnyDoc[])
      .map((hint: AnyDoc) => ({ level: Number(hint.level ?? 1), title: String(hint.title ?? ""), content: String(hint.content ?? "") }))
      .filter((hint) => hint.content)
      .sort((a, b) => a.level - b.level),
    commonMistakes: ((problem.commonMistakes ?? []) as string[]).filter(Boolean),
    source: String(problem.source),
    sourceUrl: String(problem.sourceUrl ?? ""),
    difficulty: difficulty(problem.difficulty),
    pattern: String(pattern?.name ?? "General"),
    patternDetail: pattern ? {
      id: id(pattern._id),
      slug: String(pattern.slug ?? ""),
      name: String(pattern.name ?? "General"),
      description: String(pattern.description ?? ""),
      whenToUse: String(pattern.whenToUse ?? ""),
      mentalModel: String(pattern.mentalModel ?? ""),
      variations: ((pattern.variations ?? []) as string[]).filter(Boolean),
      signalKeywords: ((pattern.signalKeywords ?? []) as string[]).filter(Boolean),
    } : null,
    allPatterns: (allPatterns as AnyDoc[]).map((p: AnyDoc) => ({ id: id(p._id), name: String(p.name), slug: String(p.slug) })),
    expectedPatternIds: Array.isArray(problem.patternIds) ? (problem.patternIds as LeanDoc[]).map((p) => id(p._id ?? p)) : [],
    latestRecognition: recognitionAttempt ? {
      isCorrect: Boolean(recognitionAttempt.isCorrect),
      selectedPatternName: patternNameById.get(id(recognitionAttempt.selectedPatternId)) ?? "Selected pattern",
      reasoning: String(recognitionAttempt.reasoning ?? ""),
      signalIdentified: String(recognitionAttempt.signalIdentified ?? ""),
      createdAt: recognitionAttempt.createdAt ? new Date(recognitionAttempt.createdAt as Date).toISOString() : "",
    } : null,
    confidence: Number(attempt?.selfConfidence ? Number(attempt.selfConfidence) * 20 : 0),
    status: String(attempt?.status ?? "not_started"),
    durationSeconds: Number(attempt?.durationSeconds ?? 0),
    codeLanguage: String(attempt?.codeLanguage ?? ""),
    perceivedDifficulty: Number(attempt?.perceivedDifficulty ?? 0),
    strategy: String(attempt?.strategy ?? ""),
    hintsUsed: Number(attempt?.hintsUsed ?? 0),
    lastAttemptAt: attempt?.createdAt ? new Date(attempt.createdAt as Date).toISOString() : "",
    bookmarked: Boolean(bookmark),
    topics,
    companies,
    tags,
    estimatedMinutes: Number(problem.estimatedMinutes ?? 0),
    reflection: String(reflection?.content ?? ""),
    reflectionRating: Number(reflection?.selfRating ?? 3),
    learningGoal: tags.length ? `Recognize when ${tags.join(", ")} point toward ${String(pattern?.name ?? "this pattern")}.` : `Understand the ${String(pattern?.name ?? "core")} pattern behind this problem.`,
  };

  const nextProblem = nextProblemDoc ? {
    id: id((nextProblemDoc as AnyDoc)._id),
    slug: String((nextProblemDoc as AnyDoc).slug),
    title: String((nextProblemDoc as AnyDoc).title),
    summary: String((nextProblemDoc as AnyDoc).summary ?? ""),
    difficulty: difficulty((nextProblemDoc as AnyDoc).difficulty),
    pattern: String(pattern?.name ?? "General"),
    status: "not_started",
  } : null;

  return toDTO({
    problem: mappedProblem,
    nextProblem,
  });
}

export async function getCompanyPrepWorkspaceData(userId: string, slug: string) {
  await connectToDatabase();
  const uid = asObjectId(userId);
  const company = await CompanyModel.findOne({ slug, isActive: true }).lean();
  if (!company) return null;

  const [companyPatterns, companyProblems, patternMastery, problemAttempts] = await Promise.all([
    CompanyPatternModel.find({ companyId: company._id }).populate("patternId").lean(),
    CompanyProblemModel.find({ companyId: company._id }).populate({ path: "problemId", populate: { path: "patternIds" } }).lean(),
    PatternMasteryModel.find({ userId: uid }).lean(),
    ProblemAttemptModel.find({ userId: uid }).lean()
  ]);

  const masteryByPattern = new Map((patternMastery as AnyDoc[]).map((m: AnyDoc) => [id(m.patternId), m]));
  const attemptByProblem = new Map((problemAttempts as AnyDoc[]).map((a: AnyDoc) => [id(a.problemId), a]));

  const mappedPatterns = (companyPatterns as AnyDoc[]).map((cp: AnyDoc) => {
    const pattern = cp.patternId as LeanDoc | null;
    const mastery = masteryByPattern.get(id(pattern?._id));
    const progress = Number(mastery?.masteryScore ?? 0);
    return {
      id: id(pattern?._id),
      slug: String(pattern?.slug ?? ""),
      name: String(pattern?.name ?? ""),
      difficulty: difficulty(pattern?.difficulty),
      description: String(pattern?.description ?? ""),
      relevanceScore: Number(cp.relevanceScore ?? 0),
      frequency: String(cp.frequency ?? "medium"),
      progress,
      status: progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "not_started"
    };
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);

  const mappedProblems = (companyProblems as AnyDoc[]).map((cp: AnyDoc) => {
    const problem = cp.problemId as LeanDoc | null;
    const attempt = attemptByProblem.get(id(problem?._id));
    const pattern = Array.isArray(problem?.patternIds) && problem.patternIds.length > 0 ? problem.patternIds[0] as LeanDoc : null;
    return {
      id: id(problem?._id),
      slug: String(problem?.slug ?? ""),
      title: String(problem?.title ?? ""),
      difficulty: difficulty(problem?.difficulty),
      pattern: String(pattern?.name ?? "General"),
      status: String(attempt?.status ?? "not_started")
    };
  });

  const patternIds = (companyPatterns as AnyDoc[]).map(cp => (cp.patternId as LeanDoc)?._id).filter(Boolean);
  const missions = patternIds.length ? await MissionModel.find({ patternId: { $in: patternIds }, isPublished: true }).populate("topicId patternId").lean() : [];
  const missionProgress = await MissionProgressModel.find({ userId: uid, missionId: { $in: (missions as AnyDoc[]).map(m => m._id) } }).lean();
  const progressByMission = new Map((missionProgress as AnyDoc[]).map((m: AnyDoc) => [id(m.missionId), m]));
  const mappedMissions = (missions as AnyDoc[]).map(mission => {
    const topic = mission.topicId as LeanDoc | null;
    const progress = progressByMission.get(id(mission._id));
    return {
      id: id(mission._id),
      slug: String(mission.slug),
      title: String(mission.title),
      topic: String(topic?.name ?? "Learning"),
      progress: Number(progress?.progress ?? 0),
      duration: `${mission.estimatedMinutes} min`,
      difficulty: difficulty(mission.difficulty),
      status: String(progress?.status ?? "not_started")
    };
  });

  const topics = Array.from(new Set(mappedMissions.map(m => m.topic))).filter(Boolean).slice(0, 5);
  
  let totalMastery = 0;
  mappedPatterns.forEach(p => totalMastery += p.progress * p.relevanceScore);
  const totalRelevance = mappedPatterns.reduce((sum, p) => sum + p.relevanceScore, 0);
  const readiness = totalRelevance > 0 ? Math.round(totalMastery / totalRelevance) : 0;

  return toDTO({
    id: id(company._id),
    slug: String(company.slug),
    name: String(company.name),
    description: String(company.description ?? ""),
    interviewProcess: String(company.interviewProcess ?? ""),
    readiness,
    focus: topics.length ? topics : ["Algorithms", "Data Structures"],
    patterns: mappedPatterns,
    problems: mappedProblems,
    missions: mappedMissions
  });
}

/**
 * Cached version of getCompanyPrepWorkspaceData using Next.js unstable_cache.
 * Caches per user + slug for 300 seconds (5 minutes) with on-demand tag-based invalidation.
 */
export async function getCachedCompanyPrepWorkspaceData(userId: string, slug: string) {
  if (typeof unstable_cache === "function") {
    const cachedLoader = unstable_cache(
      async (uid: string, s: string) => getCompanyPrepWorkspaceData(uid, s),
      [`user-company-workspace-${userId}-${slug}`],
      {
        revalidate: 300,
        tags: [`company-${userId}-${slug}`, `companies-${userId}`, `snapshot-${userId}`],
      }
    );
    return cachedLoader(userId, slug);
  }
  return getCompanyPrepWorkspaceData(userId, slug);
}

export function mapCompanyCategory(tier?: string, tags?: string[]): string {
  const normalizedTier = String(tier ?? "").toLowerCase();
  const lowerTags = (tags ?? []).map((t) => String(t).toLowerCase());

  if (
    lowerTags.includes("faang") ||
    lowerTags.includes("big-tech") ||
    lowerTags.includes("big tech") ||
    normalizedTier === "big_tech"
  ) {
    return "FAANG / Big Tech";
  }
  if (lowerTags.includes("fintech") || lowerTags.includes("finance")) {
    return "Fintech";
  }
  if (lowerTags.includes("enterprise") || lowerTags.includes("b2b")) {
    return "Enterprise / SaaS";
  }
  if (normalizedTier === "product") {
    return "Product Tech";
  }
  if (normalizedTier === "growth") {
    return "High-Growth Scaleup";
  }
  if (normalizedTier === "startup") {
    return "Early-Stage Startup";
  }
  return "Technology";
}

export type CompanyPrepDTO = {
  id: string;
  slug: string;
  name: string;
  logo?: string;
  category: string;
  patterns: string[];
  problemCount: number;
  sets: number;
  readiness: number;
  focus: string[];
  isTargetCompany: boolean;
  hasContent: boolean;
  description?: string;
  status: "not_started" | "in_progress" | "completed";
};

export type CompanyPrepPageData = {
  companies: CompanyPrepDTO[];
  targetCompany: { id: string; name: string; slug: string } | null;
  hasAnyCompanyContent: boolean;
};

export async function getCompanyPrepPageData(userId?: string): Promise<CompanyPrepPageData> {
  await connectToDatabase();

  const companies = (await getCachedActiveCompanies()) as AnyDoc[];
  const companyIds = companies.map((c) => c._id);
  const uid = userId ? asObjectId(userId) : null;

  const [profileDoc, allCompanyPatterns, allCompanyProblems, patternMasteries] = await Promise.all([
    uid
      ? (UserProfileModel.findOne({ userId: uid }).populate("targetCompanyIds").lean() as Promise<AnyDoc | null>)
      : Promise.resolve(null),
    companyIds.length
      ? CompanyPatternModel.find({ companyId: { $in: companyIds } }).populate("patternId").lean()
      : [],
    companyIds.length ? CompanyProblemModel.find({ companyId: { $in: companyIds } }).lean() : [],
    uid ? PatternMasteryModel.find({ userId: uid }).lean() : [],
  ]);

  let targetCompany: { id: string; name: string; slug: string } | null = null;
  if (uid) {
    try {
      const targetCompanies = ((profileDoc?.targetCompanyIds ?? []) as LeanDoc[])
        .map((c) => ({ id: id(c._id), name: String(c.name ?? ""), slug: String(c.slug ?? "") }))
        .filter((c) => Boolean(c.id && c.name));

      if (targetCompanies.length > 0) {
        targetCompany = targetCompanies[0];
      } else {
        const roadmap = (await RoadmapModel.findOne({ userId: uid, status: "active" })
          .populate("inputs.targetCompanyIds")
          .lean()) as AnyDoc | null;
        const roadmapCompanies = ((roadmap?.inputs?.targetCompanyIds ?? []) as LeanDoc[])
          .map((c) => ({ id: id(c._id), name: String(c.name ?? ""), slug: String(c.slug ?? "") }))
          .filter((c) => Boolean(c.id && c.name));
        if (roadmapCompanies.length > 0) {
          targetCompany = roadmapCompanies[0];
        }
      }
    } catch {
      // fallback gracefully if profile query fails or mocks differ
    }
  }

  const patternsByCompany = new Map<string, AnyDoc[]>();
  for (const cp of allCompanyPatterns as AnyDoc[]) {
    const cid = id(cp.companyId);
    const existing = patternsByCompany.get(cid) ?? [];
    existing.push(cp);
    patternsByCompany.set(cid, existing);
  }

  const problemsByCompany = new Map<string, AnyDoc[]>();
  for (const cp of allCompanyProblems as AnyDoc[]) {
    const cid = id(cp.companyId);
    const existing = problemsByCompany.get(cid) ?? [];
    existing.push(cp);
    problemsByCompany.set(cid, existing);
  }

  const masteryByPattern = new Map(
    (patternMasteries as AnyDoc[]).map((m: AnyDoc) => [id(m.patternId), m])
  );

  const mappedCompanies: CompanyPrepDTO[] = companies.map((company: AnyDoc) => {
    const cid = id(company._id);
    const cPatterns = patternsByCompany.get(cid) ?? [];
    const cProblems = problemsByCompany.get(cid) ?? [];

    const patternNames = cPatterns
      .map((cp) => String((cp.patternId as LeanDoc)?.name ?? ""))
      .filter(Boolean);

    const problemCount = cProblems.length;
    const sets = problemCount > 0 ? Math.max(1, Math.ceil(problemCount / 4)) : 0;
    const hasContent = patternNames.length > 0 || problemCount > 0;
    const category = mapCompanyCategory(company.tier, company.tags);

    let totalMastery = 0;
    let totalRelevance = 0;
    for (const cp of cPatterns) {
      const patternIdStr = id((cp.patternId as LeanDoc)?._id);
      const mastery = masteryByPattern.get(patternIdStr);
      const progress = Number(mastery?.masteryScore ?? 0);
      const relevance = Number(cp.relevanceScore ?? 1);
      totalMastery += progress * relevance;
      totalRelevance += relevance;
    }
    const readiness = totalRelevance > 0 ? Math.round(totalMastery / totalRelevance) : 0;
    const status: "not_started" | "in_progress" | "completed" =
      readiness >= 80 ? "completed" : readiness > 0 ? "in_progress" : "not_started";

    const isTargetCompany = Boolean(
      targetCompany &&
        (targetCompany.slug === String(company.slug) || targetCompany.id === cid)
    );

    return {
      id: cid,
      slug: String(company.slug),
      name: String(company.name),
      logo: String(company.logo ?? ""),
      category,
      patterns: patternNames.slice(0, 5),
      problemCount,
      sets,
      readiness,
      focus: patternNames.length > 0 ? patternNames.slice(0, 4) : [category],
      isTargetCompany,
      hasContent,
      description: String(company.description ?? ""),
      status,
    };
  });

  // Prioritize target company first if present
  if (targetCompany) {
    mappedCompanies.sort((a, b) => {
      if (a.isTargetCompany) return -1;
      if (b.isTargetCompany) return 1;
      return 0;
    });
  }

  const hasAnyCompanyContent = mappedCompanies.some((c) => c.hasContent);

  return toDTO({
    companies: mappedCompanies,
    targetCompany,
    hasAnyCompanyContent,
  });
}

/**
 * Cached version of getCompanyPrepPageData using Next.js unstable_cache.
 * Caches per user for 300 seconds (5 minutes) with on-demand tag-based invalidation.
 */
export async function getCachedCompanyPrepPageData(userId?: string): Promise<CompanyPrepPageData> {
  const uidKey = userId || "anonymous";
  if (typeof unstable_cache === "function") {
    const cachedLoader = unstable_cache(
      async (uid?: string) => getCompanyPrepPageData(uid),
      [`user-company-prep-${uidKey}`],
      {
        revalidate: 300,
        tags: [`companies-${uidKey}`, `snapshot-${uidKey}`],
      }
    );
    return cachedLoader(userId);
  }
  return getCompanyPrepPageData(userId);
}

export async function getCompanyData(userId?: string) {
  const pageData = await getCompanyPrepPageData(userId);
  return pageData.companies;
}

export async function getSearchData(query: string) {
  return toDTO((await searchMongoProvider(query, 25)).results);
}

export async function getNotifications(userId: string, status?: "unread" | "read" | "archived", type?: string, limit = 50) {
  await connectToDatabase();
  const uid = asObjectId(userId);
  const query: Record<string, any> = status ? { userId: uid, status } : { userId: uid, status: { $ne: "archived" } };
  if (type) query.type = type;
  const docs = await NotificationModel.find(query).sort({ scheduledAt: -1 }).limit(limit).lean();
  return toDTO(docs.map((item: AnyDoc) => ({
    id: id(item._id),
    type: String(item.type ?? "system"),
    priority: String(item.priority ?? "informational"),
    groupKey: item.groupKey ? String(item.groupKey) : null,
    actionLabel: item.actionLabel ? String(item.actionLabel) : null,
    title: String(item.title),
    body: String(item.body),
    status: String(item.status),
    deepLink: String(item.deepLink ?? "/notifications"),
    scheduledAt: item.scheduledAt ? new Date(item.scheduledAt as Date).toISOString() : new Date().toISOString(),
    readAt: item.readAt ? new Date(item.readAt as Date).toISOString() : null,
  })));
}

export async function getAchievements(userId: string) {
  await connectToDatabase();
  return toDTO(await UserAchievementModel.find({ userId: asObjectId(userId) }).populate("achievementId").sort({ unlockedAt: -1 }).lean());
}

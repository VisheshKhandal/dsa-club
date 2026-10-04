"use server";

import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import { z } from "zod";
import { addDays } from "date-fns";
import { requireUserId } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db/mongodb";
import { MissionModel, PatternModel, ProblemModel, TopicModel } from "@/features/content/models/content.model";
import { BookmarkModel, LearningSessionModel, MissionProgressModel, PatternMasteryModel, PatternRecognitionAttemptModel, ProblemAttemptModel, ReflectionLogModel, RoadmapModel, TopicProgressModel, QuizAttemptModel, PracticeSessionModel, LearningCommandModel } from "@/features/learning/models/learning.model";
import { ActivityEventModel, NotificationModel, RevisionQueueModel, RevisionHistoryModel, UserStatisticsModel, AssessmentResultModel, DailyPlanModel, UserAchievementModel, RecommendationModel, RecommendationEventModel, LearningDeliveryModel } from "@/features/intelligence/models/intelligence.model";
import { PlanModel } from "@/features/intelligence/models/plan.model";
import { PlanDayModel } from "@/features/intelligence/models/plan-day.model";
import { PlanTaskModel } from "@/features/intelligence/models/plan-task.model";
import { LearningEventModel } from "@/features/intelligence/models/learning-event.model";
import { UserTopicProgressModel } from "@/features/intelligence/models/user-topic-progress.model";
import { UserModel, UserProfileModel } from "@/features/identity/models/user.model";
import { recordRevision } from "@/features/revision/services/revision.service";
import { generateProgressSummary, recomputeTopicProgress } from "@/features/progress/services/progress.service";
import { LearningEngine } from "@/features/platform/engines/learning.engine";
import { revalidateDashboardCache } from "@/features/product/services/product.service";
import { awardXpIdempotent } from "@/features/product/services/gamification.service";
import { recordLearningEvent } from "@/features/intelligence/services/learning-event.service";
import { resolveGenuineTopicSlug } from "@/features/intelligence/planning/topic-catalog";
import { executePracticeSubmission, executeReviewSubmission, getCommandReceipt } from "@/features/learning/services/learning-command.service";
import { getOrCreatePracticeSession, startFreshAttempt, recordAttemptHintReveal, updateSessionTimerState } from "@/features/learning/services/practice-session.service";
import { TrackEnrollmentModel } from "@/features/intelligence/models/track.model";
import { CheckpointAttemptModel } from "@/features/intelligence/models/checkpoint-item.model";
import { CheckpointSessionModel } from "@/features/intelligence/models/checkpoint-session.model";
import { InterviewDrillModel } from "@/features/learning/models/interview-drill.model";
import { JourneyModel } from "@/features/intelligence/models/journey.model";
import { MistakeRepairModel } from "@/features/intelligence/models/mistake-repair.model";
import { IntelligenceDecisionModel } from "@/features/intelligence/models/intelligence-decision.model";

const objectIdSchema = z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid id");
const missionStepSchema = z.object({ missionId: objectIdSchema, stepKey: z.string().min(1).max(80) });
const reflectionSchema = z.object({ entityType: z.enum(["mission", "problem", "topic", "pattern"]), entityId: objectIdSchema, content: z.string().trim().min(10).max(5000), selfRating: z.coerce.number().int().min(1).max(5) });
const attemptSchema = z.object({
  problemId: objectIdSchema,
  status: z.enum(["started", "solved", "abandoned"]),
  strategy: z.enum(["independent", "hint_assisted", "editorial_assisted", "revisited"]).default("independent"),
  durationSeconds: z.coerce.number().int().min(0).default(0),
  durationProvenance: z.enum(["measured", "reported", "unknown"]).optional(),
  hintsUsed: z.coerce.number().int().min(0).default(0),
  hintsRevealedLevels: z.array(z.number()).optional(),
  editorialViewed: z.boolean().optional(),
  aiAssisted: z.boolean().optional(),
  selfConfidence: z.coerce.number().int().min(1).max(5).default(3),
  perceivedDifficulty: z.coerce.number().int().min(1).max(5).default(3),
  codeLanguage: z.string().max(40).optional().nullable(),
  commandId: z.string().optional(),
  sessionId: z.string().optional(),
  planTaskId: z.string().optional(),
  reflection: z.string().optional(),
});
const reviewSchema = z.object({
  queueId: objectIdSchema,
  grade: z.coerce.number().int().min(0).max(5),
  confidence: z.coerce.number().int().min(1).max(5),
  responseSeconds: z.coerce.number().int().min(0).default(0),
  recallText: z.string().optional(),
  quizAnswer: z.string().nullable().optional(),
  patternNotes: z.string().optional(),
  dryRunDone: z.boolean().optional(),
  summary: z.string().optional(),
  commandId: z.string().optional(),
  planTaskId: z.string().optional(),
  assisted: z.boolean().optional(),
  hintsUsed: z.coerce.number().int().min(0).optional(),
  solutionViewed: z.boolean().optional(),
});
const profileSchema = z.object({ name: z.string().min(1).max(80), currentLevel: z.enum(["absolute_beginner", "beginner", "intermediate", "advanced"]), primaryLanguage: z.enum(["cpp", "java", "python", "javascript", "typescript", "go", "rust"]), dailyMinutes: z.coerce.number().int().min(15).max(720), goals: z.string().min(1).max(120), reminderEnabled: z.coerce.boolean().default(false), reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), difficultyPreference: z.enum(["adaptive", "gentle", "stretch"]).optional() });

function oid(value: string) {
  return new Types.ObjectId(value);
}

async function upsertStats(userId: Types.ObjectId, patch: Record<string, unknown>) {
  await UserStatisticsModel.findOneAndUpdate({ userId }, { $set: patch, $setOnInsert: { userId } }, { upsert: true, new: true, setDefaultsOnInsert: true });
}

async function scheduleRevisionItem(userId: Types.ObjectId, entityType: "topic" | "pattern" | "problem" | "mission", entityId: Types.ObjectId, source: "mission" | "attempt" | "recommendation" | "manual", daysFromNow = 1, priority = 50) {
  const newDueAt = addDays(new Date(), daysFromNow);
  const existing = await RevisionQueueModel.findOne({ userId, entityType, entityId });
  if (existing) {
    const isAlreadyDue = existing.dueAt && existing.dueAt.getTime() <= Date.now();
    const isDueSooner = existing.dueAt && existing.dueAt.getTime() < newDueAt.getTime();
    if (isAlreadyDue || isDueSooner) {
      await RevisionQueueModel.updateOne(
        { _id: existing._id },
        {
          $set: {
            state: isAlreadyDue ? "due" : existing.state,
            priority: Math.max(existing.priority, priority),
          },
        }
      );
      return;
    }
  }

  await RevisionQueueModel.findOneAndUpdate(
    { userId, entityType, entityId },
    {
      $set: { state: "scheduled", dueAt: newDueAt, priority },
      $setOnInsert: { userId, entityType, entityId, source }
    },
    { upsert: true }
  );
}

async function refreshLearnerState(userId: Types.ObjectId, topicIds: Array<Types.ObjectId | unknown> = []) {
  const uniqueTopicIds = [...new Set(topicIds.filter(Boolean).map((topicId) => String(topicId)))].filter((topicId) => Types.ObjectId.isValid(topicId));
  for (const topicId of uniqueTopicIds) {
    await recomputeTopicProgress(userId, new Types.ObjectId(topicId));
  }
  await generateProgressSummary(userId).catch(() => null);
  revalidateDashboardCache(String(userId));
}

export async function completeMissionStepAction(input: unknown) {
  const userId = await requireUserId();
  const parsed = missionStepSchema.parse(input);
  
  await LearningEngine.completeStage(userId, parsed.missionId, parsed.stepKey);

  await connectToDatabase();
  const uid = oid(userId);
  await ActivityEventModel.updateOne(
    { userId: uid, idempotencyKey: `mission-step:${parsed.missionId}:${parsed.stepKey}` },
    { $setOnInsert: { userId: uid, idempotencyKey: `mission-step:${parsed.missionId}:${parsed.stepKey}`, type: "mission_step_completed", entityType: "mission", entityId: oid(parsed.missionId), occurredAt: new Date(), payload: { stepKey: parsed.stepKey } } },
    { upsert: true }
  );
  const mission = await MissionModel.findById(parsed.missionId).select("slug").lean();
  const missionForStats = await MissionModel.findById(parsed.missionId).select("topicId").lean();
  await awardXpIdempotent(uid, `mission-step:${parsed.missionId}:${parsed.stepKey}`, 50, "mission", parsed.missionId);
  await refreshLearnerState(uid, missionForStats?.topicId ? [missionForStats.topicId] : []);

  revalidatePath("/dashboard");
  revalidatePath("/plan");
  revalidatePath("/intelligence");
  revalidatePath("/missions");
  if (mission?.slug) revalidatePath(`/missions/${mission.slug}`);
}

export async function restartMissionAction(missionId: string) {
  const userId = await requireUserId();
  
  if (!Types.ObjectId.isValid(missionId)) {
    throw new Error("Invalid mission ID");
  }

  await LearningEngine.restartMission(userId, missionId);

  await connectToDatabase();
  const uid = oid(userId);
  await ActivityEventModel.create({ 
    userId: uid, 
    idempotencyKey: `mission-restart:${missionId}:${Date.now()}`, 
    type: "mission_restarted", 
    entityType: "mission", 
    entityId: oid(missionId), 
    occurredAt: new Date() 
  });

  revalidatePath("/dashboard");
  revalidatePath("/plan");
  revalidatePath("/intelligence");
  revalidatePath("/missions");
  revalidatePath(`/missions/${missionId}`);
}

export async function recordMissionOpenAction(input: unknown) {
  const userId = oid(await requireUserId());
  const parsed = z.object({
    missionId: objectIdSchema,
  }).parse(input);

  await connectToDatabase();
  const mission = await MissionModel.findById(parsed.missionId).select("slug topicId").lean();
  if (!mission) return { ok: false, message: "Mission not found" };

  const primaryTopicId = mission.topicId ?? null;
  const genuineTopicSlug = await resolveGenuineTopicSlug(primaryTopicId);

  await recordLearningEvent({
    userId,
    eventType: "task_started",
    idempotencyKey: `mission-open:${userId}:${parsed.missionId}:${new Date().toISOString().slice(0, 10)}`,
    missionId: oid(parsed.missionId),
    topicId: primaryTopicId ? oid(primaryTopicId) : undefined,
    topicSlug: genuineTopicSlug,
    payload: {
      sourceSurface: "workspace",
      resumed: false,
    },
  }).catch(() => {});

  const { syncTaskStartIfScheduled } = await import("@/features/intelligence/services/learning-lifecycle.service");
  await syncTaskStartIfScheduled({
    userId,
    entityType: "mission",
    entityId: parsed.missionId,
    entitySlug: mission.slug,
    sourceSurface: "workspace",
  }).catch(() => {});

  try {
    revalidatePath("/plan");
    revalidatePath("/dashboard");
    revalidatePath("/intelligence");
  } catch {}

  return { ok: true, message: "Recorded" };
}

export async function finishMissionAction(input: unknown) {
  const userId = await requireUserId();
  const parsed = z.object({
    missionId: objectIdSchema,
    stepKey: z.string().optional(),
  }).parse(input);

  await connectToDatabase();
  const uid = oid(userId);
  const mid = oid(parsed.missionId);

  // If a stepKey was passed, complete that stage first
  if (parsed.stepKey) {
    try {
      await LearningEngine.completeStage(userId, parsed.missionId, parsed.stepKey);
    } catch {}
  }

  // Ensure all steps in MissionProgress are completed so status is permanently marked completed
  const mission = await MissionModel.findById(mid).lean() as any;
  if (mission?.steps && Array.isArray(mission.steps)) {
    const allStepKeys = mission.steps.map((s: any) => s.key).filter(Boolean);
    await MissionProgressModel.updateOne(
      { userId: uid, missionId: mid },
      {
        $addToSet: { completedStepKeys: { $each: allStepKeys } },
        $set: { status: "completed", progress: 100, completedAt: new Date() },
      },
      { upsert: true }
    );
  }

  // Authoritatively complete the mission in LearningEngine and reconcile plan tasks
  await LearningEngine.completeMission(userId, parsed.missionId);

  const { reconcileMissionCompletion } = await import("@/features/intelligence/services/learning-lifecycle.service");
  const reconcileResult = await reconcileMissionCompletion({
    userId: uid,
    missionId: mid,
    evidence: {
      score: 100,
      completedAt: new Date(),
    },
  });

  // Award XP and refresh learner stats
  await awardXpIdempotent(uid, `mission-finished:${parsed.missionId}`, 100, "mission", parsed.missionId).catch(() => {});
  if (mission?.topicId) {
    await refreshLearnerState(uid, [mission.topicId]).catch(() => {});
  }

  try {
    revalidatePath("/dashboard");
    revalidatePath("/plan");
    revalidatePath("/intelligence");
    revalidatePath("/missions");
    if (mission?.slug) revalidatePath(`/missions/${mission.slug}`);
  } catch {}

  return {
    ok: true,
    reconciled: reconcileResult.isOnPlan,
    dayAdvanced: reconcileResult.dayAdvanced,
    nextDayIndex: reconcileResult.nextDayIndex,
  };
}

export async function saveReflectionAction(input: unknown) {
  const userId = oid(await requireUserId());
  const parsed = reflectionSchema.parse(input);
  await connectToDatabase();
  let topicId = parsed.entityType === "topic" ? oid(parsed.entityId) : null;
  let problemAttemptId = null;
  if (parsed.entityType === "problem") {
    const [problem, latestAttempt] = await Promise.all([
      ProblemModel.findById(parsed.entityId).select("topicIds").lean(),
      ProblemAttemptModel.findOne({ userId, problemId: oid(parsed.entityId) }).sort({ createdAt: -1 }).select("_id").lean(),
    ]);
    topicId = (problem?.topicIds ?? [])[0] as Types.ObjectId | null;
    problemAttemptId = latestAttempt?._id ?? null;
  }
  await ReflectionLogModel.create({ userId, topicId, problemAttemptId, entityType: parsed.entityType, entityId: oid(parsed.entityId), promptVersion: parsed.entityType === "problem" ? "problem-learning-v1" : "reflection-v1", content: parsed.content, selfRating: parsed.selfRating });
  if (parsed.entityType === "mission") await MissionProgressModel.findOneAndUpdate({ userId, missionId: oid(parsed.entityId) }, { $set: { reflection: parsed.content }, $setOnInsert: { userId, missionId: oid(parsed.entityId) } }, { upsert: true });
  await scheduleRevisionItem(userId, parsed.entityType, oid(parsed.entityId), "manual", 1, 40);
  const topicIds: unknown[] = [];
  if (parsed.entityType === "problem") {
    const problem = await ProblemModel.findById(parsed.entityId).select("slug topicIds").lean();
    topicIds.push(...(problem?.topicIds ?? []));
    if (problem?.slug) revalidatePath(`/practice/problems/${problem.slug}`);
  }
  if (parsed.entityType === "pattern") {
    const pattern = await PatternModel.findById(parsed.entityId).select("slug topicId").lean();
    if (pattern?.topicId) topicIds.push(pattern.topicId);
    if (pattern?.slug) revalidatePath(`/patterns/${pattern.slug}`);
  }
  if (parsed.entityType === "mission") {
    const mission = await MissionModel.findById(parsed.entityId).select("topicId slug").lean();
    if (mission?.topicId) topicIds.push(mission.topicId);
    if (mission?.slug) revalidatePath(`/missions/${mission.slug}`);
  }
  if (parsed.entityType === "topic") topicIds.push(oid(parsed.entityId));
  await refreshLearnerState(userId, topicIds);

  const { reconcileTaskCompletion } = await import("@/features/intelligence/services/learning-lifecycle.service");
  await reconcileTaskCompletion({
    userId,
    entityType: "reflection",
    entityId: parsed.entityId,
    evidence: {
      passed: true,
      score: parsed.selfRating * 20,
      reflectionAnswer: parsed.content,
    },
    runKey: `reflection-${parsed.entityId}-${Date.now()}`,
  }).catch(() => {});

  revalidatePath("/");
  return { ok: true, message: "Saved" };
}

export async function recordProblemAttemptAction(input: unknown) {
  const userId = oid(await requireUserId());
  const parsed = attemptSchema.parse(input);
  await connectToDatabase();
  
  const commandId = parsed.commandId || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : new Types.ObjectId().toString());

  const result = await executePracticeSubmission({
    userId,
    commandId,
    sessionId: parsed.sessionId,
    problemId: parsed.problemId,
    status: parsed.status,
    strategy: parsed.strategy,
    durationSeconds: parsed.durationSeconds,
    durationProvenance: parsed.durationProvenance,
    hintsUsed: parsed.hintsUsed,
    hintsRevealedLevels: parsed.hintsRevealedLevels,
    editorialViewed: parsed.editorialViewed,
    aiAssisted: parsed.aiAssisted,
    selfConfidence: parsed.selfConfidence,
    perceivedDifficulty: parsed.perceivedDifficulty,
    codeLanguage: parsed.codeLanguage,
    reflection: parsed.reflection,
    planTaskId: parsed.planTaskId,
  });

  const problemQuery = ProblemModel.findById(parsed.problemId);
  const problem = (problemQuery && typeof (problemQuery as any).select === "function")
    ? await (problemQuery as any).select("slug").lean()
    : (problemQuery && typeof (problemQuery as any).lean === "function")
    ? await (problemQuery as any).lean()
    : await problemQuery;
  revalidateDashboardCache(String(userId));
  revalidatePath("/practice");
  revalidatePath("/progress");
  if (problem?.slug) revalidatePath(`/practice/problems/${problem.slug}`);
  revalidatePath("/dashboard");

  if (!result.ok) {
    return {
      ok: false,
      conflict: Boolean(result.conflict),
      status: result.status || (result.conflict ? 409 : 500),
      error: result.error || "Submission failed",
      message: result.error || "Submission failed",
      receipt: result.receipt,
    };
  }

  return { ok: true, message: "Saved", receipt: result.receipt };
}

export async function toggleBookmarkAction(input: unknown) {
  const userId = oid(await requireUserId());
  const parsed = z.object({ entityType: z.enum(["topic", "pattern", "problem", "mission", "resource"]), entityId: objectIdSchema }).parse(input);
  await connectToDatabase();
  const query = { userId, entityType: parsed.entityType, entityId: oid(parsed.entityId) };
  const existing = await BookmarkModel.findOne(query).lean();
  if (existing) await BookmarkModel.deleteOne(query);
  else await BookmarkModel.create(query);
  revalidateDashboardCache(String(userId));
  revalidatePath("/");
}

export async function recordRevisionAction(input: unknown) {
  const userId = oid(await requireUserId());
  const parsed = reviewSchema.parse(input);
  await connectToDatabase();

  const commandId = parsed.commandId || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : new Types.ObjectId().toString());

  const result = await executeReviewSubmission({
    userId,
    commandId,
    queueId: parsed.queueId,
    grade: parsed.grade as 0 | 1 | 2 | 3 | 4 | 5,
    confidence: parsed.confidence,
    responseSeconds: parsed.responseSeconds,
    recallText: parsed.recallText,
    quizAnswer: parsed.quizAnswer,
    patternNotes: parsed.patternNotes,
    dryRunDone: parsed.dryRunDone,
    summary: parsed.summary,
    planTaskId: parsed.planTaskId,
    assisted: parsed.assisted,
    hintsUsed: parsed.hintsUsed,
    solutionViewed: parsed.solutionViewed,
  });

  revalidateDashboardCache(String(userId));
  revalidatePath("/revision");
  revalidatePath("/dashboard");

  if (!result.ok) {
    return {
      ok: false,
      conflict: Boolean(result.conflict),
      status: result.status || (result.conflict ? 409 : 500),
      error: result.error || "Review submission failed",
      message: result.error || "Review submission failed",
      receipt: result.receipt,
    };
  }

  return { ok: true, message: "Review completed", receipt: result.receipt };
}

export async function updateProfileAction(input: unknown) {
  const userId = oid(await requireUserId());
  const parsed = profileSchema.parse(input);
  await connectToDatabase();
  await UserModel.findByIdAndUpdate(userId, { $set: { name: parsed.name } });
  await UserProfileModel.findOneAndUpdate(
    { userId },
    {
      $set: {
        currentLevel: parsed.currentLevel,
        primaryLanguage: parsed.primaryLanguage,
        dailyMinutes: parsed.dailyMinutes,
        goals: [parsed.goals],
        "preferences.reminderEnabled": parsed.reminderEnabled,
        "preferences.reminderTime": parsed.reminderTime,
        ...(parsed.difficultyPreference ? { "preferences.difficultyPreference": parsed.difficultyPreference } : {}),
      },
      $setOnInsert: { userId }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  revalidatePath("/profile");
  revalidatePath("/settings");
  revalidatePath("/account");
  revalidatePath("/dashboard");
}

export async function updateNotificationAction(input: unknown) {
  const userId = oid(await requireUserId());
  const parsed = z.object({ notificationId: objectIdSchema, status: z.enum(["read", "unread", "archived"]) }).parse(input);
  await connectToDatabase();
  await NotificationModel.updateOne({ _id: oid(parsed.notificationId), userId }, { $set: { status: parsed.status, readAt: parsed.status === "read" ? new Date() : null } });
  revalidatePath("/notifications");
}

export async function startLearningSessionAction(input: unknown) {
  const userId = oid(await requireUserId());
  const parsed = z.object({ plannedMinutes: z.coerce.number().int().min(1).max(720), topicId: objectIdSchema.optional(), missionId: objectIdSchema.optional() }).parse(input);
  await connectToDatabase();
  const session = await LearningSessionModel.create({ userId, plannedMinutes: parsed.plannedMinutes, topicId: parsed.topicId ? oid(parsed.topicId) : null, missionId: parsed.missionId ? oid(parsed.missionId) : null, startedAt: new Date(), focusedSeconds: 0 });
  await recordLearningEvent({
    userId,
    eventType: "session_started",
    idempotencyKey: `session-start:${session._id}`,
    payload: {
      plannedMinutes: parsed.plannedMinutes,
    },
  }).catch(() => {});
  revalidateDashboardCache(String(userId));
  revalidatePath("/dashboard");
}

export async function recordCompletedFocusSessionAction(input: {
  plannedMinutes: number;
  focusedSeconds: number;
  missionId?: string;
  topicId?: string;
}) {
  const userId = oid(await requireUserId());
  await connectToDatabase();
  const session = await LearningSessionModel.create({
    userId,
    plannedMinutes: Math.max(1, input.plannedMinutes || 25),
    focusedSeconds: Math.max(0, input.focusedSeconds || 0),
    missionId: input.missionId && Types.ObjectId.isValid(input.missionId) ? oid(input.missionId) : null,
    topicId: input.topicId && Types.ObjectId.isValid(input.topicId) ? oid(input.topicId) : null,
    startedAt: new Date(Date.now() - Math.max(0, input.focusedSeconds || 0) * 1000),
    endedAt: new Date(),
  });
  const minutes = Math.max(1, Math.round((input.focusedSeconds || 0) / 60));
  await recordLearningEvent({
    userId,
    eventType: "session_completed",
    idempotencyKey: `session-end:${session._id}`,
    payload: {
      plannedMinutes: input.plannedMinutes,
      focusedSeconds: input.focusedSeconds,
      actualMinutes: minutes,
    },
  }).catch(() => {});
  await awardXpIdempotent(userId, `session:${session._id}`, minutes * 2, "session", session._id);
  revalidateDashboardCache(String(userId));
  revalidatePath("/dashboard");
  return { ok: true, sessionId: String(session._id) };
}

const recognitionSchema = z.object({
  problemId: objectIdSchema,
  expectedPatternId: objectIdSchema,
  selectedPatternId: objectIdSchema,
  reasoning: z.string().min(5).max(1000),
  signalIdentified: z.string().max(500).default(""),
  durationSeconds: z.coerce.number().int().min(0).default(0),
});
const problemRecognitionSchema = recognitionSchema.omit({ expectedPatternId: true });
const missionPatternRecognitionSchema = z.object({
  missionId: objectIdSchema,
  stepKey: z.string().min(1).max(80),
  selectedPatternId: z.string().optional().nullable().default(""),
  reasoning: z.string().trim().min(10).max(1000),
  signalIdentified: z.string().trim().max(500).default("").optional(),
  durationSeconds: z.coerce.number().int().min(0).default(0),
});
const missionPracticeSchema = z.object({
  missionId: objectIdSchema,
  stepKey: z.string().min(1).max(80),
  status: z.enum(["solved", "abandoned"]),
  strategy: z.enum(["independent", "hint_assisted", "editorial_assisted", "revisited"]).default("independent"),
  durationSeconds: z.coerce.number().int().min(0).default(0),
  selfConfidence: z.coerce.number().int().min(1).max(5),
  perceivedDifficulty: z.coerce.number().int().min(1).max(5),
  codeLanguage: z.string().max(40).optional(),
  reflection: z.string().trim().min(10).max(5000),
});
const missionMasterySchema = z.object({
  missionId: objectIdSchema,
  stepKey: z.string().min(1).max(80),
  conceptRecall: z.string().min(20).max(1200),
  patternUnderstanding: z.string().min(20).max(1200),
  approach: z.string().min(20).max(1200),
  complexity: z.string().min(10).max(800),
  edgeCases: z.string().min(10).max(800),
  confidence: z.coerce.number().int().min(1).max(5),
});

async function getMissionStage(missionId: string, stepKey: string, expectedKind: string) {
  const mission = await MissionModel.findById(missionId).select("slug topicId patternId steps").lean();
  if (!mission) throw new Error("Mission not found");
  const step = ((mission.steps ?? []) as Array<{ key: string; kind: string; targetId?: Types.ObjectId | null }>).find((candidate) => candidate.key === stepKey);
  if (!step || step.kind !== expectedKind) throw new Error(`${expectedKind.replace("_", " ")} stage not found`);
  return { mission, step };
}

export async function recordPatternRecognitionAction(input: unknown) {
  const userId = oid(await requireUserId());
  const parsed = recognitionSchema.parse(input);
  await connectToDatabase();

  const isCorrect = parsed.expectedPatternId === parsed.selectedPatternId;

  // Store the attempt
  await PatternRecognitionAttemptModel.create({
    userId,
    problemId: oid(parsed.problemId),
    expectedPatternId: oid(parsed.expectedPatternId),
    selectedPatternId: oid(parsed.selectedPatternId),
    isCorrect,
    reasoning: parsed.reasoning,
    signalIdentified: parsed.signalIdentified,
    durationSeconds: parsed.durationSeconds,
  });

  // Update pattern mastery from real evidence
  const patternId = oid(parsed.expectedPatternId);
  const pattern = await PatternModel.findById(patternId).select("topicId slug").lean();
  const topicId = pattern?.topicId ?? null;

  // Get all attempts for this user+pattern to compute scores from evidence
  const allAttempts = await PatternRecognitionAttemptModel.find({
    userId,
    expectedPatternId: patternId,
  }).lean();

  const total = allAttempts.length;
  const correct = allAttempts.filter((a: any) => a.isCorrect).length;
  const recognitionScore = Math.round((correct / Math.max(total, 1)) * 100);

  // Recent performance weighting (last 5 attempts matter more)
  const recent = allAttempts.slice(-5);
  const recentCorrect = recent.filter((a: any) => a.isCorrect).length;
  const applicationScore = Math.round((recentCorrect / Math.max(recent.length, 1)) * 100);

  // Overall mastery = weighted blend
  const masteryScore = Math.round(recognitionScore * 0.5 + applicationScore * 0.5);

  await PatternMasteryModel.findOneAndUpdate(
    { userId, patternId },
    {
      $set: {
        topicId: topicId,
        recognitionScore,
        applicationScore,
        masteryScore,
        totalAttempts: total,
        successfulAttempts: correct,
        lastPracticedAt: new Date(),
      },
      $setOnInsert: { userId, patternId, transferScore: 0 },
    },
    { upsert: true, new: true }
  );

  // Update topic progress patternRecognitionScore
  if (topicId) {
    await TopicProgressModel.findOneAndUpdate(
      { userId, topicId },
      {
        $set: { patternRecognitionScore: recognitionScore, lastStudiedAt: new Date() },
        $setOnInsert: { userId, topicId },
      },
      { upsert: true }
    );
    await recomputeTopicProgress(userId, topicId as Types.ObjectId);
  }

  // Schedule revision if struggling
  if (!isCorrect) {
    await scheduleRevisionItem(userId, "pattern", patternId, "attempt", 1, 70);
  }
  if (topicId) await refreshLearnerState(userId, [topicId]);

  revalidatePath("/patterns");
  if (pattern?.slug) revalidatePath(`/patterns/${pattern.slug}`);
  revalidatePath("/progress");
  revalidatePath("/dashboard");

  return { ok: true, message: isCorrect ? "Correct!" : "Incorrect", isCorrect, recognitionScore, masteryScore };
}

export async function recordProblemPatternRecognitionAction(input: unknown) {
  const userId = oid(await requireUserId());
  const parsed = problemRecognitionSchema.parse(input);
  await connectToDatabase();

  const problem = await ProblemModel.findOne({ _id: oid(parsed.problemId), isPublished: true })
    .select("slug topicIds patternIds")
    .lean();
  if (!problem) throw new Error("Problem not found");

  const expectedPatternIds = ((problem.patternIds ?? []) as Types.ObjectId[]).map((patternId) => String(patternId));
  if (!expectedPatternIds.length) throw new Error("Problem has no linked pattern");

  const selectedPattern = await PatternModel.findOne({ _id: oid(parsed.selectedPatternId), isPublished: true })
    .select("topicId slug")
    .lean();
  if (!selectedPattern) throw new Error("Selected pattern is not available");

  const isCorrect = expectedPatternIds.includes(parsed.selectedPatternId);
  const expectedPatternId = oid(isCorrect ? parsed.selectedPatternId : expectedPatternIds[0]);

  await PatternRecognitionAttemptModel.create({
    userId,
    problemId: oid(parsed.problemId),
    expectedPatternId,
    selectedPatternId: oid(parsed.selectedPatternId),
    isCorrect,
    reasoning: parsed.reasoning,
    signalIdentified: parsed.signalIdentified,
    durationSeconds: parsed.durationSeconds,
  });

  const allAttempts = await PatternRecognitionAttemptModel.find({
    userId,
    expectedPatternId,
  }).sort({ createdAt: 1 }).lean();
  const total = allAttempts.length;
  const correct = allAttempts.filter((attempt: any) => attempt.isCorrect).length;
  const recent = allAttempts.slice(-5);
  const recentCorrect = recent.filter((attempt: any) => attempt.isCorrect).length;
  const previousRecent = allAttempts.slice(-10, -5);
  const previousCorrect = previousRecent.filter((attempt: any) => attempt.isCorrect).length;
  const recognitionScore = Math.round((correct / Math.max(total, 1)) * 100);
  const applicationScore = Math.round((recentCorrect / Math.max(recent.length, 1)) * 100);
  const previousScore = previousRecent.length ? Math.round((previousCorrect / previousRecent.length) * 100) : null;
  const masteryScore = Math.round(recognitionScore * 0.5 + applicationScore * 0.5);
  const weaknessStreak = recent.length >= 3 && recent.slice(-3).every((attempt: any) => !attempt.isCorrect);
  const trend = weaknessStreak ? "repeated_weakness" : previousScore !== null && applicationScore > previousScore ? "improving_mastery" : isCorrect ? "correct_recognition" : "incorrect_recognition";

  await PatternMasteryModel.findOneAndUpdate(
    { userId, patternId: expectedPatternId },
    {
      $set: {
        topicId: (problem.topicIds ?? [])[0] ?? selectedPattern.topicId,
        recognitionScore,
        applicationScore,
        masteryScore,
        totalAttempts: total,
        successfulAttempts: correct,
        lastPracticedAt: new Date(),
      },
      $setOnInsert: { userId, patternId: expectedPatternId, transferScore: 0 },
    },
    { upsert: true, new: true }
  );

  await ActivityEventModel.create({
    userId,
    idempotencyKey: `problem-pattern-recognition:${parsed.problemId}:${Date.now()}`,
    type: "pattern_recognition_attempted",
    entityType: "problem",
    entityId: oid(parsed.problemId),
    occurredAt: new Date(),
    payload: { selectedPatternId: parsed.selectedPatternId, expectedPatternIds, isCorrect, trend },
  });

  // Emit canonical immutable LearningEvent for pattern prediction
  const patTopicId = (problem.topicIds ?? [])[0] ?? selectedPattern.topicId;
  const genuinePatTopicSlug = await resolveGenuineTopicSlug(patTopicId);
  let actualPatternSlug = selectedPattern.slug;
  if (expectedPatternId) {
    try {
      const q = PatternModel.findById(expectedPatternId);
      const doc = q && typeof (q as any).select === "function" ? await (q as any).select("slug").lean() : await q;
      if (doc && (doc as any).slug) {
        actualPatternSlug = (doc as any).slug;
      }
    } catch {}
  }

  await recordLearningEvent({
    userId,
    eventType: "pattern_prediction_submitted",
    idempotencyKey: `pattern-prediction:${parsed.problemId}:${Date.now()}`,
    problemId: oid(parsed.problemId),
    topicId: patTopicId ? oid(patTopicId) : undefined,
    topicSlug: genuinePatTopicSlug,
    payload: {
      predictedPatternSlug: selectedPattern.slug,
      actualPatternSlug,
      isCorrect,
      confidence: 3,
      secondsBeforeAttempt: parsed.durationSeconds,
    },
  }).catch(() => {});

  if (!isCorrect || weaknessStreak) await scheduleRevisionItem(userId, "pattern", expectedPatternId, "attempt", 1, weaknessStreak ? 80 : 70);
  await refreshLearnerState(userId, problem.topicIds ?? []);

  if (isCorrect) {
    const { reconcileTaskCompletion } = await import("@/features/intelligence/services/learning-lifecycle.service");
    await reconcileTaskCompletion({
      userId,
      entityType: "pattern",
      entityId: expectedPatternId,
      evidence: {
        passed: true,
        score: recognitionScore,
        durationSeconds: parsed.durationSeconds,
      },
      runKey: `pattern-${parsed.problemId}-${Date.now()}`,
    }).catch(() => {});
  }
  revalidatePath("/practice");
  revalidatePath(`/practice/problems/${problem.slug}`);
  revalidatePath("/patterns");
  revalidatePath("/progress");
  revalidatePath("/dashboard");

  return { ok: true, message: isCorrect ? "Correct recognition" : "Incorrect recognition", isCorrect, recognitionScore, masteryScore, trend };
}

export async function recordProblemOpenAction(input: unknown) {
  const userId = oid(await requireUserId());
  const parsed = z.object({
    problemId: objectIdSchema,
    sessionId: z.string().optional(),
  }).parse(input);

  await connectToDatabase();
  const problem = await ProblemModel.findById(parsed.problemId).select("slug topicIds").lean();
  if (!problem) return { ok: false, message: "Problem not found" };

  const primaryTopicId = (problem.topicIds ?? [])[0] ?? null;
  const genuineTopicSlug = await resolveGenuineTopicSlug(primaryTopicId);

  // Stable daily/session idempotency key to prevent rerenders and prefetch from inflating counts
  const sessionKey = parsed.sessionId || new Date().toISOString().slice(0, 10);
  const idempotencyKey = `problem-open:${userId}:${parsed.problemId}:${sessionKey}`;

  await recordLearningEvent({
    userId,
    eventType: "task_started",
    idempotencyKey,
    problemId: oid(parsed.problemId),
    topicId: primaryTopicId ? oid(primaryTopicId) : undefined,
    topicSlug: genuineTopicSlug,
    payload: {
      sourceSurface: "workspace",
      resumed: false,
    },
  }).catch(() => {});

  const { syncTaskStartIfScheduled } = await import("@/features/intelligence/services/learning-lifecycle.service");
  await syncTaskStartIfScheduled({
    userId,
    entityType: "problem",
    entityId: parsed.problemId,
    entitySlug: problem.slug,
    sourceSurface: "workspace",
  }).catch(() => {});

  return { ok: true, message: "Recorded" };
}

export async function recordHintRevealedAction(input: unknown) {
  const userId = oid(await requireUserId());
  const parsed = z.object({
    problemId: objectIdSchema,
    hintLevel: z.coerce.number().int().min(1).max(10),
    hintId: z.string().optional(),
  }).parse(input);

  await connectToDatabase();
  const session = await recordAttemptHintReveal(userId, parsed.problemId, parsed.hintLevel);

  return { ok: true, message: "Hint reveal recorded", session };
}

export async function getOrCreatePracticeSessionAction(input: {
  problemId: string;
  planTaskId?: string;
  planDayId?: string;
  planId?: string;
  planDayIndex?: number;
  sourceSurface?: "workspace" | "plan" | "recommendation";
}) {
  const userId = await requireUserId();
  const session = await getOrCreatePracticeSession({
    userId,
    problemId: input.problemId,
    sourceSurface: input.sourceSurface,
    planContext: (input.planTaskId || input.planId || input.planDayId)
      ? {
          planId: input.planId,
          planDayId: input.planDayId,
          planTaskId: input.planTaskId,
        }
      : undefined,
  });
  return { ok: true, session };
}

export async function startFreshAttemptAction(input: {
  problemId: string;
  planTaskId?: string;
  planContext?: {
    planId?: string | null;
    planDayId?: string | null;
    planTaskId?: string | null;
    planVersion?: number | null;
  } | null;
}) {
  const userId = await requireUserId();
  const session = await startFreshAttempt(userId, input.problemId, {
    planTaskId: input.planTaskId,
    planContext: input.planContext,
  });
  return { ok: true, session };
}

export async function updateSessionTimerAction(input: {
  problemId: string;
  elapsedSeconds: number;
  timerState: "running" | "paused" | "stopped";
}) {
  const userId = await requireUserId();
  await updateSessionTimerState(userId, input.problemId, {
    accumulatedSeconds: input.elapsedSeconds,
    isRunning: input.timerState === "running",
    provenance: input.elapsedSeconds > 0 ? "measured" : "unknown",
  });
  return { ok: true };
}

export async function getCommandReceiptAction(commandId: string) {
  const userId = await requireUserId();
  const receipt = await getCommandReceipt(userId, commandId);
  return { ok: true, receipt };
}

export async function completeMissionPatternStageAction(input: unknown) {
  const userId = oid(await requireUserId());
  const parsed = missionPatternRecognitionSchema.parse(input);
  await connectToDatabase();

  const { mission, step } = await getMissionStage(parsed.missionId, parsed.stepKey, "pattern");

  const rawExpectedPatternId = step.targetId ?? mission.patternId;
  const hasValidExpectedTarget = Boolean(
    rawExpectedPatternId && Types.ObjectId.isValid(String(rawExpectedPatternId))
  );

  let expectedPattern: any = null;
  if (hasValidExpectedTarget) {
    expectedPattern = await PatternModel.findOne({
      _id: rawExpectedPatternId,
      isPublished: true,
      topicId: mission.topicId,
    }).select("slug topicId").lean();
  }

  const hasValidSelectedPattern = Boolean(
    parsed.selectedPatternId && Types.ObjectId.isValid(String(parsed.selectedPatternId))
  );

  let selectedPattern: any = null;
  if (hasValidSelectedPattern) {
    selectedPattern = await PatternModel.exists({
      _id: oid(parsed.selectedPatternId!),
      isPublished: true,
      topicId: mission.topicId,
    });
  }

  const expectedPatternId = expectedPattern ? expectedPattern._id : null;
  const selectedPatternId = selectedPattern ? oid(parsed.selectedPatternId!) : null;
  const isCorrect = expectedPatternId
    ? String(expectedPatternId) === String(selectedPatternId)
    : true;

  await PatternRecognitionAttemptModel.create({
    userId,
    problemId: null,
    missionId: oid(parsed.missionId),
    stepKey: parsed.stepKey,
    expectedPatternId: expectedPatternId ?? null,
    selectedPatternId: selectedPatternId ?? null,
    isCorrect,
    reasoning: parsed.reasoning,
    signalIdentified: parsed.signalIdentified ?? "",
    durationSeconds: parsed.durationSeconds ?? 0,
  });

  let recognitionScore = 100;
  let masteryScore = 100;

  if (expectedPatternId) {
    const allAttempts = await PatternRecognitionAttemptModel.find({
      userId,
      expectedPatternId,
    }).sort({ createdAt: 1 }).lean();
    const total = allAttempts.length;
    const correct = allAttempts.filter((attempt: any) => attempt.isCorrect).length;
    recognitionScore = Math.round((correct / Math.max(total, 1)) * 100);
    const recent = allAttempts.slice(-5);
    const recentCorrect = recent.filter((attempt: any) => attempt.isCorrect).length;
    const applicationScore = Math.round((recentCorrect / Math.max(recent.length, 1)) * 100);
    masteryScore = Math.round(recognitionScore * 0.5 + applicationScore * 0.5);

    await PatternMasteryModel.findOneAndUpdate(
      { userId, patternId: expectedPatternId },
      {
        $set: {
          topicId: mission.topicId,
          recognitionScore,
          applicationScore,
          masteryScore,
          totalAttempts: total,
          successfulAttempts: correct,
          lastPracticedAt: new Date(),
        },
        $setOnInsert: { userId, patternId: expectedPatternId, transferScore: 0 },
      },
      { upsert: true, new: true }
    );

    if (!isCorrect) {
      await scheduleRevisionItem(userId, "pattern", expectedPatternId as Types.ObjectId, "attempt", 1, 70);
    }
  }

  await LearningEngine.completeStage(String(userId), parsed.missionId, parsed.stepKey);
  await ActivityEventModel.updateOne(
    { userId, idempotencyKey: `mission-pattern-stage:${parsed.missionId}:${parsed.stepKey}` },
    {
      $setOnInsert: {
        userId,
        idempotencyKey: `mission-pattern-stage:${parsed.missionId}:${parsed.stepKey}`,
        type: "pattern_recognition_attempted",
        entityType: "mission",
        entityId: oid(parsed.missionId),
        occurredAt: new Date(),
        payload: { stepKey: parsed.stepKey, expectedPatternId: expectedPatternId ? String(expectedPatternId) : null, reasoning: parsed.reasoning },
      },
    },
    { upsert: true }
  );

  await refreshLearnerState(userId, [mission.topicId]);
  revalidatePath(`/missions/${mission.slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/progress");
  if (expectedPattern?.slug) revalidatePath(`/patterns/${expectedPattern.slug}`);

  return { ok: true, isCorrect, message: "Pattern recognition response saved.", recognitionScore, masteryScore };
}

export async function completeMissionPracticeStageAction(input: unknown) {
  const userId = oid(await requireUserId());
  const parsed = missionPracticeSchema.parse(input);
  await connectToDatabase();

  const { mission, step } = await getMissionStage(parsed.missionId, parsed.stepKey, "practice");
  const hasProblemTarget = Boolean(step.targetId && Types.ObjectId.isValid(String(step.targetId)));

  let problem: any = null;
  let attempt: any = null;

  if (hasProblemTarget) {
    problem = await ProblemModel.findOne({
      _id: step.targetId,
      isPublished: true,
      topicIds: mission.topicId,
    }).select("slug topicIds patternIds").lean();

    if (problem) {
      attempt = await ProblemAttemptModel.create({
        userId,
        problemId: step.targetId,
        status: parsed.status,
        strategy: parsed.strategy,
        durationSeconds: parsed.durationSeconds,
        hintsUsed: 0,
        selfConfidence: parsed.selfConfidence,
        perceivedDifficulty: parsed.perceivedDifficulty,
        codeLanguage: parsed.codeLanguage ?? null,
        startedAt: new Date(),
        completedAt: new Date(),
      });
    }
  }

  await ReflectionLogModel.create({
    userId,
    topicId: mission.topicId,
    problemAttemptId: attempt?._id ?? null,
    entityType: hasProblemTarget ? "problem" : "mission",
    entityId: hasProblemTarget ? step.targetId : oid(parsed.missionId),
    promptVersion: "mission-practice-v1",
    content: parsed.reflection,
    selfRating: parsed.selfConfidence,
  });

  if (hasProblemTarget) {
    const [attemptedProblemIds, solvedProblemIds] = await Promise.all([
      ProblemAttemptModel.distinct("problemId", { userId }),
      ProblemAttemptModel.distinct("problemId", { userId, status: "solved" }),
    ]);
    await UserStatisticsModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          attemptedProblems: attemptedProblemIds.length,
          solvedProblems: solvedProblemIds.length,
          ...(parsed.status === "solved" ? { lastSolvedProblemId: step.targetId } : {}),
        },
        $setOnInsert: { userId },
      },
      { upsert: true }
    );

    if (parsed.status === "solved") {
      await scheduleRevisionItem(userId, "problem", step.targetId as Types.ObjectId, "attempt", 1, 55);
    }
  }

  await LearningEngine.completeStage(String(userId), parsed.missionId, parsed.stepKey);
  await ActivityEventModel.updateOne(
    { userId, idempotencyKey: `mission-practice-stage:${parsed.missionId}:${parsed.stepKey}` },
    { $setOnInsert: { userId, idempotencyKey: `mission-practice-stage:${parsed.missionId}:${parsed.stepKey}`, type: "mission_step_completed", entityType: "mission", entityId: oid(parsed.missionId), occurredAt: new Date(), payload: { stepKey: parsed.stepKey, problemId: step.targetId ? String(step.targetId) : null, status: parsed.status } } },
    { upsert: true }
  );
  await refreshLearnerState(userId, [mission.topicId, ...(problem?.topicIds ?? [])]);
  revalidatePath(`/missions/${mission.slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/progress");
  if (problem?.slug) revalidatePath(`/practice/problems/${problem.slug}`);

  return { ok: true, message: "Practice evidence saved." };
}

export async function completeMissionMasteryStageAction(input: unknown) {
  const userId = oid(await requireUserId());
  const parsed = missionMasterySchema.parse(input);
  await connectToDatabase();

  const { mission } = await getMissionStage(parsed.missionId, parsed.stepKey, "mastery");
  const content = [
    `Concept recall:\n${parsed.conceptRecall}`,
    `Pattern understanding:\n${parsed.patternUnderstanding}`,
    `Approach:\n${parsed.approach}`,
    `Time/space complexity:\n${parsed.complexity}`,
    `Edge cases:\n${parsed.edgeCases}`,
  ].join("\n\n");
  const sectionScores = [
    parsed.conceptRecall.length >= 80 ? 20 : 12,
    parsed.patternUnderstanding.length >= 80 ? 20 : 12,
    parsed.approach.length >= 80 ? 20 : 12,
    parsed.complexity.length >= 40 ? 20 : 12,
    parsed.edgeCases.length >= 40 ? 20 : 12,
  ];
  const qualityScore = Math.min(100, Math.round(sectionScores.reduce((sum, score) => sum + score, 0) * (0.75 + parsed.confidence * 0.05)));

  await ReflectionLogModel.create({
    userId,
    topicId: mission.topicId,
    problemAttemptId: null,
    entityType: "mission",
    entityId: oid(parsed.missionId),
    promptVersion: "mission-mastery-v1",
    content,
    selfRating: parsed.confidence,
    qualityScore,
  });

  if (mission.patternId) {
    await PatternMasteryModel.findOneAndUpdate(
      { userId, patternId: mission.patternId },
      {
        $set: { topicId: mission.topicId, lastPracticedAt: new Date() },
        $setOnInsert: { userId, patternId: mission.patternId, recognitionScore: 0, applicationScore: 0, transferScore: 0, masteryScore: 0, successfulAttempts: 0, totalAttempts: 0 },
      },
      { upsert: true }
    );
  }

  await MissionProgressModel.findOneAndUpdate(
    { userId, missionId: oid(parsed.missionId) },
    { $set: { reflection: content }, $setOnInsert: { userId, missionId: oid(parsed.missionId) } },
    { upsert: true }
  );
  await LearningEngine.completeStage(String(userId), parsed.missionId, parsed.stepKey);
  await scheduleRevisionItem(userId, "mission", oid(parsed.missionId), "mission", 1, 50);
  await refreshLearnerState(userId, [mission.topicId]);
  await ActivityEventModel.updateOne(
    { userId, idempotencyKey: `mission-mastery-stage:${parsed.missionId}:${parsed.stepKey}` },
    { $setOnInsert: { userId, idempotencyKey: `mission-mastery-stage:${parsed.missionId}:${parsed.stepKey}`, type: "mission_step_completed", entityType: "mission", entityId: oid(parsed.missionId), occurredAt: new Date(), payload: { stepKey: parsed.stepKey, qualityScore, confidence: parsed.confidence } } },
    { upsert: true }
  );
  revalidatePath(`/missions/${mission.slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/progress");

  return { ok: true, message: "Mastery evidence saved.", qualityScore };
}

export async function updateUserSettingsAction(input: Record<string, unknown>) {
  const userId = oid(await requireUserId());
  await connectToDatabase();
  
  // Cleanly merge preferences into profile
  const profile = await UserProfileModel.findOne({ userId });
  const existingPrefs = profile?.preferences || {};
  const mergedPrefs = { ...existingPrefs, ...input };

  await UserProfileModel.findOneAndUpdate(
    { userId },
    {
      $set: {
        preferences: mergedPrefs,
      },
      $setOnInsert: { userId },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  revalidatePath("/settings");
  revalidatePath("/account");
  revalidatePath("/dashboard");
  return { ok: true, preferences: mergedPrefs };
}

export async function resetLearningDataAction(confirmationPhrase: string) {
  if (confirmationPhrase?.trim() !== "RESET") {
    throw new Error("Confirmation phrase must be RESET to proceed.");
  }
  const userId = oid(await requireUserId());
  await connectToDatabase();

  // Atomically increment user's learningEpoch so any pre-reset background worker operations are fenced out
  const updatedUser = await UserModel.findByIdAndUpdate(
    userId,
    { $inc: { learningEpoch: 1 } },
    { new: true }
  );
  const newEpoch = updatedUser?.learningEpoch ?? 2;
  const oldEpochMax = newEpoch - 1;

  // Complete reset of all learning progress, history, events, and evidence collections
  // Fenced by epoch (learningEpoch <= oldEpochMax) to prevent deleting concurrent new-epoch work
  await Promise.all([
    // Core attempts, sessions, commands, outbox deliveries
    ProblemAttemptModel.deleteMany({ userId, learningEpoch: { $lte: oldEpochMax } }),
    PracticeSessionModel.deleteMany({ userId, learningEpoch: { $lte: oldEpochMax } }),
    LearningSessionModel.deleteMany({ userId }),
    LearningCommandModel.deleteMany({ userId, learningEpoch: { $lte: oldEpochMax } }),
    LearningDeliveryModel.deleteMany({ userId, learningEpoch: { $lte: oldEpochMax } }),
    LearningEventModel.deleteMany({ userId, learningEpoch: { $lte: oldEpochMax } }),
    ReflectionLogModel.deleteMany({ userId }),

    // Patterns and mastery
    PatternMasteryModel.deleteMany({ userId }),
    PatternRecognitionAttemptModel.deleteMany({ userId }),

    // Curriculum progress
    TopicProgressModel.deleteMany({ userId }),
    UserTopicProgressModel.deleteMany({ userId, learningEpoch: { $lte: oldEpochMax } }),
    MissionProgressModel.deleteMany({ userId }),
    RoadmapModel.deleteMany({ userId }),
    UserProfileModel.updateOne({ userId }, { $set: { activeRoadmapId: null } }),

    // Revisions
    RevisionQueueModel.deleteMany({ userId }),
    RevisionHistoryModel.deleteMany({ userId, learningEpoch: { $lte: oldEpochMax } }),

    // Intelligent plans and assessments
    PlanModel.deleteMany({ userId }),
    PlanDayModel.deleteMany({ userId }),
    PlanTaskModel.deleteMany({ userId }),
    DailyPlanModel.deleteMany({ userId }),
    AssessmentResultModel.deleteMany({ userId }),
    QuizAttemptModel.deleteMany({ userId }),
    RecommendationModel.deleteMany({ userId }),
    RecommendationEventModel.deleteMany({ userId }),

    // Advanced & Higher-value architectures (Tracks, Checkpoints, Drills, Repairs, Journeys, Decisions)
    TrackEnrollmentModel.deleteMany({ userId, learningEpoch: { $lte: oldEpochMax } }),
    CheckpointAttemptModel.deleteMany({ userId, learningEpoch: { $lte: oldEpochMax } }),
    CheckpointSessionModel.deleteMany({ userId, learningEpoch: { $lte: oldEpochMax } }),
    InterviewDrillModel.deleteMany({ userId, learningEpoch: { $lte: oldEpochMax } }),
    JourneyModel.deleteMany({ userId, learningEpoch: { $lte: oldEpochMax } }),
    MistakeRepairModel.deleteMany({ userId, learningEpoch: { $lte: oldEpochMax } }),
    IntelligenceDecisionModel.deleteMany({ userId, learningEpoch: { $lte: oldEpochMax } }),

    // Activity, gamification, bookmarks, notifications
    ActivityEventModel.deleteMany({ userId }),
    UserAchievementModel.deleteMany({ userId }),
    BookmarkModel.deleteMany({ userId }),
    NotificationModel.deleteMany({ userId }),

    // Reset user statistics with canonical schema field names
    UserStatisticsModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          solvedProblems: 0,
          attemptedProblems: 0,
          completedMissions: 0,
          currentStreakDays: 0,
          longestStreakDays: 0,
          totalFocusedMinutes: 0,
          weeklyCompletedDays: 0,
          totalXp: 0,
          lastActiveDate: null,
          lastSolvedProblemId: null,
          learningEpoch: newEpoch,
        },
        $setOnInsert: { userId },
      },
      { upsert: true }
    ),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/progress");
  revalidatePath("/revision");
  revalidatePath("/missions");
  revalidatePath("/practice");
  revalidatePath("/account");
  revalidatePath("/plan");
  revalidatePath("/tracks");
  revalidatePath("/checkpoints");
  revalidatePath("/intelligence");

  return { ok: true, message: "All learning data, streaks, and drill attempts have been reset.", epoch: newEpoch };
}

export async function exportUserDataAction() {
  const userId = oid(await requireUserId());
  await connectToDatabase();

  const [user, profile, stats, attempts, mastery, revisions, practiceSessions] = await Promise.all([
    UserModel.findById(userId).select("-password -passwordHash -salt -resetPasswordToken").lean(),
    UserProfileModel.findOne({ userId }).lean(),
    UserStatisticsModel.findOne({ userId }).lean(),
    ProblemAttemptModel.find({ userId }).select("-__v").sort({ createdAt: -1 }).lean(),
    PatternMasteryModel.find({ userId }).select("-__v").lean(),
    RevisionQueueModel.find({ userId }).select("-__v").lean(),
    PracticeSessionModel.find({ userId }).select("-__v").sort({ createdAt: -1 }).lean(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    account: {
      id: user?._id?.toString(),
      name: user?.name,
      email: user?.email,
      role: user?.role,
      status: user?.status,
      learningEpoch: user?.learningEpoch ?? 1,
      createdAt: (user as any)?.createdAt,
    },
    profile: {
      currentLevel: profile?.currentLevel,
      primaryLanguage: profile?.primaryLanguage,
      dailyMinutes: profile?.dailyMinutes,
      goals: profile?.goals,
      preferences: profile?.preferences,
    },
    statistics: stats,
    attemptsCount: attempts.length,
    attempts: attempts.slice(0, 100).map((a: any) => ({
      id: String(a._id),
      problemId: String(a.problemId),
      status: a.status,
      strategy: a.strategy,
      durationSeconds: a.durationSeconds,
      durationProvenance: a.durationProvenance ?? "unknown",
      outcomeSource: a.outcomeSource ?? "learner_reported",
      hintsUsed: a.hintsUsed,
      hintsRevealedLevels: a.hintsRevealedLevels ?? [],
      editorialViewed: Boolean(a.editorialViewed),
      aiAssisted: Boolean(a.aiAssisted),
      selfConfidence: a.selfConfidence,
      perceivedDifficulty: a.perceivedDifficulty,
      startedAt: a.startedAt,
      completedAt: a.completedAt,
    })),
    practiceSessionsCount: practiceSessions.length,
    patternsMastered: mastery.length,
    revisionQueueCount: revisions.length,
  };
}

export async function deleteAccountAction(confirmationPhrase: string) {
  if (confirmationPhrase?.trim() !== "DELETE") {
    throw new Error("Confirmation phrase must be DELETE to proceed.");
  }
  const userId = oid(await requireUserId());
  await connectToDatabase();

  await UserModel.findByIdAndUpdate(userId, {
    $set: {
      status: "deleted",
      deletedAt: new Date(),
    },
  });

  revalidatePath("/");
  return { ok: true, message: "Account marked as deleted." };
}


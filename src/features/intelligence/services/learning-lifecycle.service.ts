import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { MissionModel, ProblemModel, PatternModel, TopicModel } from "@/features/content/models/content.model";
import { MissionProgressModel } from "@/features/learning/models/learning.model";
import { PlanTaskModel } from "@/features/intelligence/models/plan-task.model";
import { LearningEventModel } from "@/features/intelligence/models/learning-event.model";
import { recordLearningEvent } from "@/features/intelligence/services/learning-event.service";
import { advancePlanDayIfComplete, invalidateUserPlanCaches } from "@/features/intelligence/actions/plan-actions";
import { resolveCurrentPlanDay } from "@/features/intelligence/services/learning-execution-snapshot";
import { resolveUserActivePlan } from "@/features/intelligence/services/plan-migration.service";
import { recomputeTopicProgress } from "@/features/progress/services/progress.service";
import { revalidateDashboardCache } from "@/features/product/services/product.service";
import { revalidatePath } from "next/cache";
import {
  resolveTaskRequirement,
  evaluateTaskCompletion,
} from "./completion-evaluator";

export type SupportedLearningEntityType =
  | "mission"
  | "problem"
  | "pattern"
  | "revision"
  | "reflection"
  | "checkpoint";

export interface ReconcileTaskCompletionParams {
  userId: string | Types.ObjectId;
  entityType: SupportedLearningEntityType;
  entityId: string | Types.ObjectId;
  entitySlug?: string | null;
  evidence?: {
    score?: number;
    qualityScore?: number;
    passed?: boolean;
    durationSeconds?: number;
    actualMinutes?: number;
    hintsUsed?: number;
    strategy?: string;
    independentSolve?: boolean;
    reflectionAnswer?: string;
    problemAttemptId?: string | Types.ObjectId;
    missionSubmissionId?: string | Types.ObjectId;
  };
  runKey?: string;
}

export interface ReconcileTaskCompletionResult {
  success: boolean;
  isOnPlan: boolean;
  planTaskId?: string;
  alreadyCompleted?: boolean;
  dayAdvanced?: boolean;
  nextDayIndex?: number;
  error?: string;
}

export interface SyncTaskStartParams {
  userId: string | Types.ObjectId;
  entityType: SupportedLearningEntityType;
  entityId: string | Types.ObjectId;
  entitySlug?: string | null;
  sourceSurface?: string;
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * 1. EXPLICIT INTENTIONAL START LIFECYCLE
 * ══════════════════════════════════════════════════════════════════════════════
 * Called ONLY from explicit learner actions (clicking CTA, clicking Start on board,
 * or entering an active challenge). NEVER triggered by GET, prefetch, or server render.
 */
export async function syncTaskStartIfScheduled(
  params: SyncTaskStartParams
): Promise<{
  matchedTask: boolean;
  taskId?: string;
  status?: string;
}> {
  await connectToDatabase();
  const userObjectId =
    params.userId instanceof Types.ObjectId ? params.userId : new Types.ObjectId(params.userId);
  const entityObjectId =
    params.entityId instanceof Types.ObjectId ? params.entityId : new Types.ObjectId(params.entityId);

  // 1. Authorize: fetch user's active plan
  const activePlanResult = await resolveUserActivePlan(userObjectId.toString());
  const { plan, days, tasks } = activePlanResult;
  if (!plan || plan.status !== "active") {
    return { matchedTask: false };
  }

  // 2. Resolve current actionable day
  const currentPlanDay = resolveCurrentPlanDay(plan, days, new Date(), plan.timezone);
  if (!currentPlanDay) {
    return { matchedTask: false };
  }

  const currentDayId = String(currentPlanDay._id);
  let targetSlug = params.entitySlug ? String(params.entitySlug) : null;
  if (!targetSlug) {
    try {
      if (params.entityType === "mission") {
        const m = await MissionModel.findById(entityObjectId).select("slug").lean();
        if (m?.slug) targetSlug = m.slug;
      } else if (params.entityType === "problem") {
        const p = await ProblemModel.findById(entityObjectId).select("slug").lean();
        if (p?.slug) targetSlug = p.slug;
      }
    } catch {}
  }

  // 3. Match task on current day by exact entityType and canonical identity
  const matchingTask = tasks.find((t: any) => {
    if (String(t.planDayId) !== currentDayId) return false;
    if (t.entityType !== params.entityType) return false;
    // 1. Exact canonical entity identity match
    if (t.entityId && String(t.entityId) === String(entityObjectId)) return true;
    // 2. Slug match against targetUrl
    if (targetSlug && String(t.targetUrl || "").includes(`/${targetSlug}`)) return true;
    // 3. Topic-scoped or daily match for abstract tasks (reflections/checkpoints) where entityId is null
    if (!t.entityId && (params.entityType === "reflection" || params.entityType === "checkpoint")) {
      return true;
    }
    return false;
  });

  if (!matchingTask) {
    return { matchedTask: false };
  }

  // If already completed or in_progress, do not restart or emit duplicate start
  if (matchingTask.status === "completed") {
    return { matchedTask: true, taskId: String(matchingTask._id), status: "completed" };
  }

  if (matchingTask.status === "in_progress") {
    return { matchedTask: true, taskId: String(matchingTask._id), status: "in_progress" };
  }

  // Atomically update task to in_progress
  await PlanTaskModel.updateOne(
    { _id: matchingTask._id, status: "pending" },
    { $set: { status: "in_progress", startedAt: new Date() } }
  );

  // Record idempotent task_started event correlated with planTaskId and entity
  const eventPayload: Record<string, any> = {
    sourceSurface: params.sourceSurface || "workspace",
    resumed: false,
  };

  const specificEventProps: Record<string, any> = {};
  if (params.entityType === "mission") specificEventProps.missionId = entityObjectId;
  if (params.entityType === "problem") specificEventProps.problemId = entityObjectId;

  await recordLearningEvent({
    userId: userObjectId,
    eventType: "task_started",
    idempotencyKey: `task-started-${matchingTask._id}`,
    planId: plan._id as Types.ObjectId,
    planDayId: currentPlanDay._id as Types.ObjectId,
    planTaskId: matchingTask._id as Types.ObjectId,
    topicId: matchingTask.topicId as Types.ObjectId | undefined,
    topicSlug: matchingTask.topicSlug || undefined,
    ...specificEventProps,
    payload: eventPayload,
  }).catch(() => {});

  await invalidateUserPlanCaches(userObjectId.toString());

  return {
    matchedTask: true,
    taskId: String(matchingTask._id),
    status: "in_progress",
  };
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * 2. UNIVERSAL TASK COMPLETION & RECONCILIATION LIFECYCLE
 * ══════════════════════════════════════════════════════════════════════════════
 * Single authoritative completion service for ALL learning entities:
 * missions, problems, revisions, patterns, reflections, checkpoints.
 */
export async function reconcileTaskCompletion(
  params: ReconcileTaskCompletionParams
): Promise<ReconcileTaskCompletionResult> {
  await connectToDatabase();
  const userObjectId =
    params.userId instanceof Types.ObjectId ? params.userId : new Types.ObjectId(params.userId);
  const entityObjectId =
    params.entityId instanceof Types.ObjectId ? params.entityId : new Types.ObjectId(params.entityId);

  const runKey = params.runKey || "default";

  // 1. Authorize: fetch user's active plan
  const activePlanResult = await resolveUserActivePlan(userObjectId.toString());
  const { plan, days, tasks } = activePlanResult;
  const isPlanActive = Boolean(plan && plan.status === "active");

  // 2. Identify target topic for evidence recomputation
  let resolvedTopicId: Types.ObjectId | null = null;
  let resolvedTopicSlug: string | null = null;
  let resolvedEntitySlug: string | null = null;

  try {
    if (params.entityType === "mission") {
      const m = await MissionModel.findById(entityObjectId).select("topicId slug").lean();
      if (m?.slug) {
        resolvedEntitySlug = m.slug;
      }
      if (m?.topicId) {
        resolvedTopicId = m.topicId as Types.ObjectId;
        const top = await TopicModel.findById(m.topicId).select("slug").lean();
        resolvedTopicSlug = top?.slug || null;
      }
    } else if (params.entityType === "problem") {
      const p = await ProblemModel.findById(entityObjectId).select("topicIds slug").lean();
      if (p?.slug) {
        resolvedEntitySlug = p.slug;
      }
      if (p?.topicIds?.[0]) {
        resolvedTopicId = p.topicIds[0] as Types.ObjectId;
        const top = await TopicModel.findById(p.topicIds[0]).select("slug").lean();
        resolvedTopicSlug = top?.slug || null;
      }
    } else if (params.entityType === "pattern") {
      const pat = await PatternModel.findById(entityObjectId).select("topicId slug").lean();
      if (pat?.slug) {
        resolvedEntitySlug = pat.slug;
      }
      if (pat?.topicId) {
        resolvedTopicId = pat.topicId as Types.ObjectId;
        const top = await TopicModel.findById(pat.topicId).select("slug").lean();
        resolvedTopicSlug = top?.slug || null;
      }
    }
  } catch {}

  // 3. Resolve current plan day and matching task (if on an active plan)
  let currentPlanDay: any = null;
  let matchingTask: any = null;

  if (isPlanActive && plan) {
    currentPlanDay = resolveCurrentPlanDay(plan, days, new Date(), plan.timezone);
    if (currentPlanDay) {
      const currentDayId = String(currentPlanDay._id);
      const targetSlug = params.entitySlug || resolvedEntitySlug || null;

      matchingTask = tasks.find((t: any) => {
        if (String(t.planDayId) !== currentDayId) return false;
        if (t.entityType !== params.entityType) return false;
        // 1. Exact canonical entity identity match
        if (t.entityId && String(t.entityId) === String(entityObjectId)) return true;
        // 2. Slug match against targetUrl
        if (targetSlug && String(t.targetUrl || "").includes(`/${targetSlug}`)) return true;
        // 3. Topic-scoped or daily match for abstract tasks (reflections/checkpoints) where entityId is null
        if (!t.entityId && (params.entityType === "reflection" || params.entityType === "checkpoint")) {
          if (resolvedTopicId && t.topicId && String(t.topicId) === String(resolvedTopicId)) return true;
          if (!t.topicId) return true;
        }
        return false;
      });
    }
  }

  let dayAdvanced = false;
  let nextDayIndex: number | undefined;

  // ══════════════════════════════════════════════════════════════════════════
  // BRANCH A: ON-PLAN TASK
  // ══════════════════════════════════════════════════════════════════════════
  if (matchingTask && isPlanActive && plan && currentPlanDay) {
    const isAlreadyCompleted = matchingTask.status === "completed";

    if (isAlreadyCompleted) {
      // Self-healing retry check: verify canonical LearningEvent exists
      const existingEvent = await LearningEventModel.findOne({
        userId: userObjectId,
        eventType: "task_completed",
        planTaskId: matchingTask._id,
      }).lean();

      if (!existingEvent) {
        // Repair missing event
        const minutesSpent = params.evidence?.durationSeconds
          ? Math.round(params.evidence.durationSeconds / 60)
          : Number(matchingTask.actualMinutes || 0);

        const repairProps: Record<string, any> = {};
        if (params.entityType === "mission") repairProps.missionId = entityObjectId;
        if (params.entityType === "problem") repairProps.problemId = entityObjectId;

        await recordLearningEvent({
          userId: userObjectId,
          eventType: "task_completed",
          idempotencyKey: `repair-task-completed-${matchingTask._id}`,
          planId: plan._id as Types.ObjectId,
          planDayId: (matchingTask.planDayId as Types.ObjectId) || (currentPlanDay._id as Types.ObjectId),
          planTaskId: matchingTask._id as Types.ObjectId,
          topicId: (matchingTask.topicId as Types.ObjectId) || resolvedTopicId || undefined,
          topicSlug: matchingTask.topicSlug || resolvedTopicSlug || undefined,
          ...repairProps,
          payload: {
            minutesSpent,
            score: params.evidence?.score ?? (params.evidence?.passed !== false ? 100 : 0),
            passed: params.evidence?.passed !== false,
            independentSolve: Boolean(params.evidence?.independentSolve),
            hintsUsed: params.evidence?.hintsUsed,
            reflectionAnswer: params.evidence?.reflectionAnswer,
            problemAttemptId: params.evidence?.problemAttemptId ? String(params.evidence.problemAttemptId) : undefined,
          },
        }).catch(() => {});
      }

      // Check if day is ready to advance (repairs interrupted day advancement)
      const advanceResult = await advancePlanDayIfComplete({
        planDayId: (matchingTask.planDayId as Types.ObjectId) || (currentPlanDay._id as Types.ObjectId),
        planId: plan._id as Types.ObjectId,
        userObjectId,
      });

      await invalidateUserPlanCaches(userObjectId.toString());
      revalidateDashboardCache(userObjectId.toString());

      return {
        success: true,
        isOnPlan: true,
        planTaskId: String(matchingTask._id),
        alreadyCompleted: true,
        dayAdvanced: Boolean(advanceResult.dayAdvanced),
        nextDayIndex: advanceResult.nextDayIndex,
      };
    }

    // Task not yet complete: Transition task to completed only if evidence qualifies
    // Truthful tracked duration only: 0 if untracked, never invent estimated duration
    const actualMinutes = params.evidence?.actualMinutes
      ? Number(params.evidence.actualMinutes)
      : params.evidence?.durationSeconds
      ? Math.round(params.evidence.durationSeconds / 60)
      : 0;

    const evidenceObj = {
      problemAttemptId: params.evidence?.problemAttemptId ? new Types.ObjectId(params.evidence.problemAttemptId) : undefined,
      missionSubmissionId: params.evidence?.missionSubmissionId ? new Types.ObjectId(params.evidence.missionSubmissionId) : undefined,
      score: params.evidence?.score ?? (params.evidence?.passed !== false ? 100 : 0),
      passed: params.evidence?.passed !== false,
      reflectionAnswer: params.evidence?.reflectionAnswer,
    };

    const requirement = resolveTaskRequirement(matchingTask);
    const evalResult = evaluateTaskCompletion(requirement, {
      passed: params.evidence?.passed !== false,
      score: params.evidence?.score,
      strategy: params.evidence?.strategy,
      hintsUsed: params.evidence?.hintsUsed,
      reflectionAnswer: params.evidence?.reflectionAnswer,
      isAttemptSubmitted: Boolean(params.evidence?.problemAttemptId || params.evidence?.missionSubmissionId),
      isReviewCompleted: params.entityType === "revision",
      isReflectionSubmitted: params.entityType === "reflection",
    });

    if (!evalResult.qualifies) {
      await PlanTaskModel.updateOne(
        { _id: matchingTask._id, status: { $ne: "completed" } },
        {
          $set: {
            status: "in_progress",
            actualMinutes,
            evidence: evidenceObj,
          },
        }
      );
      return {
        success: true,
        isOnPlan: true,
        planTaskId: String(matchingTask._id),
        alreadyCompleted: false,
        dayAdvanced: false,
      };
    }

    await PlanTaskModel.findOneAndUpdate(
      {
        _id: matchingTask._id,
        status: { $ne: "completed" },
      },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
          actualMinutes,
          evidence: evidenceObj,
        },
      },
      { new: true }
    );

    // Record canonical LearningEvent correlated with planTaskId and specific entity
    const eventSpecificProps: Record<string, any> = {};
    if (params.entityType === "mission") eventSpecificProps.missionId = entityObjectId;
    if (params.entityType === "problem") eventSpecificProps.problemId = entityObjectId;

    await recordLearningEvent({
      userId: userObjectId,
      eventType: "task_completed",
      idempotencyKey: `task-completed-${matchingTask._id}-${runKey}`,
      planId: plan._id as Types.ObjectId,
      planDayId: currentPlanDay._id as Types.ObjectId,
      planTaskId: matchingTask._id as Types.ObjectId,
      topicId: (matchingTask.topicId as Types.ObjectId) || resolvedTopicId || undefined,
      topicSlug: matchingTask.topicSlug || resolvedTopicSlug || undefined,
      ...eventSpecificProps,
      payload: {
        minutesSpent: actualMinutes,
        score: params.evidence?.score ?? (params.evidence?.passed !== false ? 100 : 0),
        passed: params.evidence?.passed !== false,
        independentSolve: Boolean(params.evidence?.independentSolve),
        hintsUsed: params.evidence?.hintsUsed,
        reflectionAnswer: params.evidence?.reflectionAnswer,
        problemAttemptId: params.evidence?.problemAttemptId ? String(params.evidence.problemAttemptId) : undefined,
        missionSubmissionId: params.evidence?.missionSubmissionId ? String(params.evidence.missionSubmissionId) : undefined,
      },
    }).catch(() => {});

    // Advance day only if all required tasks for today are finished
    const advanceResult = await advancePlanDayIfComplete({
      planDayId: currentPlanDay._id as Types.ObjectId,
      planId: plan._id as Types.ObjectId,
      userObjectId,
    });
    dayAdvanced = Boolean(advanceResult.dayAdvanced);
    nextDayIndex = advanceResult.nextDayIndex;

  } else {
    // ══════════════════════════════════════════════════════════════════════════
    // BRANCH B: OFF-PLAN OR SELF-PACED TASK
    // ══════════════════════════════════════════════════════════════════════════
    // Strictly preserve plan mode: do NOT touch any active plan tasks, do NOT switch mode.
    const actualMinutes = params.evidence?.durationSeconds
      ? Math.round(params.evidence.durationSeconds / 60)
      : 0;

    const offPlanSpecificProps: Record<string, any> = {};
    if (params.entityType === "mission") offPlanSpecificProps.missionId = entityObjectId;
    if (params.entityType === "problem") offPlanSpecificProps.problemId = entityObjectId;

    await recordLearningEvent({
      userId: userObjectId,
      eventType: "task_completed",
      idempotencyKey: `complete-offplan-${params.entityType}-${userObjectId}-${entityObjectId}-${runKey}`,
      topicId: resolvedTopicId || undefined,
      topicSlug: resolvedTopicSlug || undefined,
      ...offPlanSpecificProps,
      payload: {
        minutesSpent: actualMinutes,
        independentSolve: Boolean(params.evidence?.independentSolve),
        hintsUsed: params.evidence?.hintsUsed,
        score: params.evidence?.score ?? (params.evidence?.passed !== false ? 100 : 0),
        passed: params.evidence?.passed !== false,
        reflectionAnswer: params.evidence?.reflectionAnswer,
      },
    }).catch(() => {});
  }

  // 4. Recompute topic progress if topic is known
  if (resolvedTopicId) {
    await recomputeTopicProgress(userObjectId, resolvedTopicId).catch(() => {});
  }

  // 5. Invalidate caches across the product
  await invalidateUserPlanCaches(userObjectId.toString());
  try {
    revalidateDashboardCache(userObjectId.toString());
    revalidatePath("/dashboard");
    revalidatePath("/plan");
    revalidatePath("/practice");
    revalidatePath("/missions");
    revalidatePath("/progress");
    revalidatePath("/revision");
  } catch {}

  return {
    success: true,
    isOnPlan: Boolean(matchingTask),
    planTaskId: matchingTask ? String(matchingTask._id) : undefined,
    dayAdvanced,
    nextDayIndex,
  };
}

/**
 * Backwards compatibility delegation for mission-specific callers.
 */
export async function syncMissionStartIfScheduled(params: {
  userId: string | Types.ObjectId;
  missionId: string | Types.ObjectId;
}) {
  return syncTaskStartIfScheduled({
    userId: params.userId,
    entityType: "mission",
    entityId: params.missionId,
  });
}

export async function reconcileMissionCompletion(params: {
  userId: string | Types.ObjectId;
  missionId: string | Types.ObjectId;
  evidence?: {
    score?: number;
    qualityScore?: number;
    reflectionAnswer?: string;
    durationSeconds?: number;
    completedAt?: Date;
  };
  runKey?: string;
}) {
  return reconcileTaskCompletion({
    userId: params.userId,
    entityType: "mission",
    entityId: params.missionId,
    evidence: params.evidence,
    runKey: params.runKey,
  });
}

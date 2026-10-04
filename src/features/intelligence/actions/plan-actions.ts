"use server";

import { Types, type ClientSession } from "mongoose";
import { addDays } from "date-fns";
import { revalidateTag, revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db/mongodb";
import { TopicModel, MissionModel, ProblemModel } from "@/features/content/models/content.model";
import { UserStatisticsModel, RevisionQueueModel } from "../models/intelligence.model";
import { PlanModel } from "../models/plan.model";
import { PlanDayModel } from "../models/plan-day.model";
import { PlanTaskModel } from "../models/plan-task.model";
import { IntelligenceDecisionModel } from "../models/intelligence-decision.model";
import { LearningEventModel } from "../models/learning-event.model";
import { generateCanonicalPlan, buildDayBlueprint } from "../planning/canonical-planner";
import { validateTopicAvailability } from "../planning/availability-validator";
import { normalizeTopicSlug } from "../planning/topic-catalog";
import {
  resolvePlanActivity,
  resolveTopicDocForSlug,
  materializeTasksForPlanDay,
} from "../services/plan-content-resolver";
import {
  activateCanonicalPlanForUser,
  resolveUserActivePlan,
} from "../services/plan-migration.service";
import { resolveCurrentPlanDay } from "../services/learning-execution-snapshot";
import {
  authorizePlanTaskCommand,
  PlanAuthorizationError,
} from "../services/plan-task-authorizer";
import { recordLearningEvent } from "../services/learning-event.service";
import { ProblemAttemptModel } from "@/features/learning/models/learning.model";
import {
  resolveTaskRequirement,
  evaluateTaskCompletion,
  type TaskCompletionEvidence,
} from "../services/completion-evaluator";
import type { PlannerInput, PlanRelation } from "../types/intelligence.types";

function formatDateKey(date: Date, timezone = "Asia/Kolkata"): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export async function invalidateUserPlanCaches(userId: string) {
  try {
    revalidateTag(`snapshot-${userId}`);
    revalidateTag(`plan-${userId}`);
    revalidateTag(`intelligence-${userId}`);
    revalidateTag(`dashboard-${userId}`);
    revalidateTag(`user-snapshot-${userId}-true`);
    revalidateTag(`user-snapshot-${userId}-false`);
    revalidateTag(`learn-${userId}`);
    revalidateTag(`practice-${userId}`);
    revalidatePath("/dashboard");
    revalidatePath("/intelligence");
    revalidatePath("/plan");
    revalidatePath("/missions");
  } catch {
    // Non-blocking in test or headless environments
  }
}

/**
 * Pure diff preview comparison between learner's current plan and proposed inputs.
 * Zero database mutations occur.
 */
export async function createPlanPreviewAction(input: PlannerInput) {
  const userId = await requireUserId();
  await connectToDatabase();
  const userObjectId = new Types.ObjectId(userId);

  const activePlan = await PlanModel.findOne({
    userId: userObjectId,
    status: { $in: ["active", "paused"] },
  }).lean();

  const cycleNumber = activePlan?.cycleNumber || 1;
  const proposedBlueprint = generateCanonicalPlan(input, cycleNumber);
  const availability = await validateTopicAvailability(
    proposedBlueprint.primaryTopicSlug,
    input.knownTopicSlugs ?? []
  );

  const currentTopicSlug =
    (activePlan?.snapshots as any)?.primaryTopicSlug ||
    (activePlan?.snapshots?.estimatedScheduleSnapshot?.[0] as any)?.topicSlug ||
    "";
  const topicChanged = !currentTopicSlug ||
    normalizeTopicSlug(currentTopicSlug) !==
    normalizeTopicSlug(proposedBlueprint.primaryTopicSlug);

  const diff = {
    minutesDiff: input.dailyMinutes - (activePlan?.dailyMinutes || 45),
    durationDiff: proposedBlueprint.totalDays - (activePlan?.totalDays || 21),
    topicChanged,
    retainProgressEligible: !topicChanged,
  };

  return {
    success: true,
    hasActivePlan: !!activePlan,
    currentPlan: activePlan
      ? {
          totalDays: activePlan.totalDays,
          dailyMinutes: activePlan.dailyMinutes,
          status: activePlan.status,
          cycleNumber: activePlan.cycleNumber,
          goal: activePlan.goal,
        }
      : null,
    proposedBlueprint,
    diff,
    availability,
  };
}

/**
 * Activates a new canonical plan, archiving any current active plan and materializing Day 1.
 */
export async function activatePlanAction(
  input: PlannerInput,
  source: "onboarding" | "customized" | "starter" | "recalibrated" = "customized"
) {
  const userId = await requireUserId();
  const blueprint = generateCanonicalPlan(input);

  const activated = await activateCanonicalPlanForUser({
    userId,
    blueprint,
    input,
    source,
  });

  // Record an explainable intelligence decision for activating this plan
  await IntelligenceDecisionModel.create({
    userId: new Types.ObjectId(userId),
    planId: activated.plan._id,
    planDayId: activated.days[0]?._id || null,
    surface: "recalibration",
    decisionType: "retargeting",
    selectedAction: {
      actionKey: activated.tasks[0]?.taskKey || "day-1-start",
      actionType: "mission",
      title: activated.tasks[0]?.title || "Begin Day 1 Session",
      estimatedMinutes: activated.tasks[0]?.estimatedMinutes || input.dailyMinutes,
      planRelation: "planned_today",
      targetUrl: activated.tasks[0]?.targetUrl || "/intelligence?tab=today",
    },
    primaryReason: `Plan activated with focus on ${blueprint.primaryTopicSlug} (${blueprint.totalDays}-day cycle, ${input.dailyMinutes}m/day).`,
    secondaryReasons: [
      `Curriculum workload structured across ${blueprint.stages.length} milestone stages.`,
      `Day 1 sessions ready for immediate execution.`,
    ],
    signals: {
      planDayIndex: 1,
      streakDays: 0,
      recoveryTriggered: false,
    },
    aiExplanation: {
      fallbackUsed: true,
    },
  });

  await recordLearningEvent({
    userId: new Types.ObjectId(userId),
    eventType: "plan_activated",
    idempotencyKey: `activate-${activated.plan._id}`,
    planId: activated.plan._id as Types.ObjectId,
    topicSlug: blueprint.primaryTopicSlug,
    payload: {
      source,
      totalDays: blueprint.totalDays,
      dailyMinutes: input.dailyMinutes,
    },
  }).catch(() => {});

  invalidateUserPlanCaches(userId);

  return {
    success: true,
    planId: String(activated.plan._id),
  };
}

/**
 * Helper to advance day status and materialize next day tasks atomically
 * when all required tasks for a day are complete.
 */
export async function advancePlanDayIfComplete(params: {
  planDayId: Types.ObjectId;
  planId: Types.ObjectId;
  userObjectId: Types.ObjectId;
  session?: ClientSession;
}): Promise<{
  dayAdvanced: boolean;
  nextDayIndex?: number;
  materializationWarning?: string;
  isRetryable?: boolean;
}> {
  const sessionOpt = params.session ? { session: params.session } : undefined;
  const remainingRequired = await PlanTaskModel.countDocuments(
    {
      planDayId: params.planDayId,
      required: true,
      status: { $in: ["pending", "in_progress"] },
    },
    sessionOpt
  );

  if (remainingRequired > 0) {
    return { dayAdvanced: false };
  }

  // Atomically update day status to completed to prevent double advancement races
  const currentDay = await PlanDayModel.findOneAndUpdate(
    {
      _id: params.planDayId,
      status: { $ne: "completed" },
    },
    {
      $set: {
        status: "completed",
        completedAt: new Date(),
      },
    },
    { new: true, ...(params.session ? { session: params.session } : {}) }
  );

  let activeDay = currentDay;
  if (!activeDay) {
    const existingCurrentDay = await PlanDayModel.findById(params.planDayId);
    if (!existingCurrentDay) return { dayAdvanced: false };

    const planCheck = await PlanModel.findById(params.planId);
    if (!planCheck) return { dayAdvanced: false };

    const nextIndexCheck = existingCurrentDay.dayIndex + 1;
    if (nextIndexCheck <= planCheck.totalDays) {
      const nextDayCheck = await PlanDayModel.findOne({
        planId: planCheck._id,
        dayIndex: nextIndexCheck,
      });
      const nextTasksCount = nextDayCheck
        ? await PlanTaskModel.countDocuments({ planDayId: nextDayCheck._id })
        : 0;
      if (!nextDayCheck || nextTasksCount === 0) {
        // Interrupted state: next day was not fully materialized. Repair it!
        activeDay = existingCurrentDay;
      } else {
        return { dayAdvanced: false };
      }
    } else {
      return { dayAdvanced: false };
    }
  }

  const plan = await PlanModel.findById(params.planId);
  if (!plan) {
    return { dayAdvanced: false };
  }

  const nextIndex = activeDay.dayIndex + 1;

  if (nextIndex <= plan.totalDays) {
    let nextDay = await PlanDayModel.findOne({
      planId: plan._id,
      dayIndex: nextIndex,
    });

    const blueprintSnapshot = plan.snapshots?.estimatedScheduleSnapshot?.find(
      (d: { dayIndex: number }) => d.dayIndex === nextIndex
    );

    const inputForRecompute: PlannerInput = {
      ...(plan.snapshots.inputSnapshot as PlannerInput),
      dailyProblems: (plan.snapshots.inputSnapshot as any)?.dailyProblems || (plan as any).dailyProblems || 2,
    };

    const recomputedBlueprint = generateCanonicalPlan(
      inputForRecompute,
      plan.cycleNumber
    );

    const nextBlueprintDay =
      blueprintSnapshot ||
      recomputedBlueprint.estimatedSchedule.find((d) => d.dayIndex === nextIndex) ||
      buildDayBlueprint({
        dayIndex: nextIndex,
        stages: recomputedBlueprint.stages,
        dailyMinutes: plan.dailyMinutes,
        dailyProblems: (plan as any).dailyProblems || 2,
      });

    const dayTopicSlug =
      (nextBlueprintDay as any)?.topicSlug || activeDay.topicSlug || "";
    let topicDoc = await resolveTopicDocForSlug(dayTopicSlug);
    if (!topicDoc && activeDay.topicId && dayTopicSlug === activeDay.topicSlug) {
      topicDoc = {
        _id: activeDay.topicId as Types.ObjectId,
        slug: activeDay.topicSlug,
        name: activeDay.topicName,
      };
    }
    const dayTopicName =
      topicDoc?.name || (nextBlueprintDay as any)?.topicName || activeDay.topicName || "Topic";

    if (!nextDay) {
      const dayDate = new Date(plan.startDate.getTime() + (nextIndex - 1) * 86400000);

      nextDay = await PlanDayModel.create({
        planId: plan._id,
        userId: params.userObjectId,
        dayIndex: nextIndex,
        dateKey: formatDateKey(dayDate, plan.timezone || "Asia/Kolkata"),
        status: "available",
        phase: nextBlueprintDay.phase || "guided_practice",
        title: nextBlueprintDay.title || `Day ${nextIndex}`,
        focus: nextBlueprintDay.focus || currentDay.focus,
        topicId: topicDoc?._id || currentDay.topicId || null,
        topicSlug: dayTopicSlug,
        topicName: dayTopicName,
        targetMinutes: plan.dailyMinutes,
        actualMinutes: 0,
        startedAt: new Date(),
        completedAt: null,
        isBufferDay: Boolean((nextBlueprintDay as any).isReviewOrCheckpoint),
        isCheckpointDay: nextIndex % 7 === 0,
      });
    } else if (nextDay.status !== "completed") {
      nextDay.status = "available";
      nextDay.startedAt = new Date();
      if (!nextDay.topicId && (topicDoc?._id || currentDay.topicId)) {
        nextDay.topicId = (topicDoc?._id || currentDay.topicId) as Types.ObjectId;
      }
      await nextDay.save();
    }

    const existingTasksCount = await PlanTaskModel.countDocuments({
      planDayId: nextDay._id,
    });

    let materializationWarning: string | undefined;
    let isRetryable = false;

    if (existingTasksCount === 0) {
      const activities =
        (nextBlueprintDay as any).suggestedActivities &&
        (nextBlueprintDay as any).suggestedActivities.length > 0
          ? (nextBlueprintDay as any).suggestedActivities
          : buildDayBlueprint({
              dayIndex: nextIndex,
              stages: recomputedBlueprint.stages,
              dailyMinutes: plan.dailyMinutes,
            }).suggestedActivities;

      const tasksToInsert = await Promise.all(
        activities.map((act: any, idx: number) =>
          resolvePlanActivity({
            activity: act,
            topicSlug: dayTopicSlug,
            dayIndex: nextIndex,
            activityIndex: idx,
            planId: plan._id as Types.ObjectId,
            planDayId: nextDay!._id as Types.ObjectId,
            userId: params.userObjectId,
            topicDoc,
          })
        )
      );

      try {
        await PlanTaskModel.insertMany(tasksToInsert, { ordered: false });
      } catch (err: any) {
        const isDuplicateKey =
          err?.code === 11000 ||
          (err?.writeErrors &&
            Array.isArray(err.writeErrors) &&
            err.writeErrors.every((we: any) => we.code === 11000));
        if (!isDuplicateKey) {
          console.error("Non-duplicate error during next-day task insertion:", err);
          materializationWarning =
            "Next-day tasks could not be fully generated. Please refresh or retry.";
          isRetryable = true;
        }
      }
    }

    return {
      dayAdvanced: true,
      nextDayIndex: nextIndex,
      materializationWarning,
      isRetryable,
    };
  } else {
    // Cycle completed!
    plan.status = "completed";
    plan.completedAt = new Date();
    await plan.save();

    await IntelligenceDecisionModel.create({
      userId: params.userObjectId,
      planId: plan._id,
      surface: "completion_eval",
      decisionType: "plan_completion",
      selectedAction: {
        actionKey: "plan-cycle-completion",
        actionType: "checkpoint",
        title: "Cycle Completed",
        estimatedMinutes: 0,
        planRelation: "outside_plan",
        targetUrl: "/intelligence?tab=overview",
      },
      primaryReason: `Congratulations! You completed all ${plan.totalDays} days of Cycle ${plan.cycleNumber}.`,
      secondaryReasons: [
        "Mastery checkpoints recorded.",
        "Next cycle ready for planning.",
      ],
      signals: {
        planDayIndex: plan.totalDays,
        recoveryTriggered: false,
      },
      aiExplanation: {
        fallbackUsed: true,
      },
    }).catch(() => {});

    return { dayAdvanced: false };
  }
}

/**
 * Starts a specific plan task, verifying active plan ownership, actionable day membership,
 * and transitioning task status to in_progress.
 */
export async function startPlanTaskAction(taskId: string, idempotencyKey?: string) {
  const userId = await requireUserId();
  const auth = await authorizePlanTaskCommand({
    userId,
    taskId,
    command: "start",
  });

  if (auth.task.status === "in_progress") {
    return { success: true, alreadyStarted: true };
  }

  await PlanTaskModel.updateOne(
    { _id: auth.taskObjectId, userId: auth.userObjectId },
    { $set: { status: "in_progress", startedAt: new Date() } }
  );

  // Record immutable LearningEvent for task start
  await recordLearningEvent({
    userId: auth.userObjectId,
    eventType: "task_started",
    idempotencyKey: idempotencyKey || `start-${taskId}`,
    missionId: auth.task.entityType === "mission" && auth.task.entityId ? (auth.task.entityId as Types.ObjectId) : null,
    planId: auth.plan._id as Types.ObjectId,
    planDayId: auth.task.planDayId,
    planTaskId: auth.taskObjectId,
    topicId: auth.task.topicId,
    topicSlug: auth.task.topicSlug,
    problemId: auth.task.entityType === "problem" && auth.task.entityId ? (auth.task.entityId as Types.ObjectId) : null,
    payload: {
      sourceSurface: "today_board",
    },
  });

  await invalidateUserPlanCaches(userId);
  return { success: true, started: true };
}

/**
 * Completes a specific plan task with evidence, checks if the day is finished,
 * advances the schedule to Day K+1, and materializes Day K+1 tasks if applicable.
 */
export async function completePlanTaskAction(
  taskId: string,
  evidence?: {
    problemAttemptId?: string;
    missionSubmissionId?: string;
    score?: number;
    passed?: boolean;
    reflectionAnswer?: string;
  },
  idempotencyKey?: string
) {
  const userId = await requireUserId();
  const auth = await authorizePlanTaskCommand({
    userId,
    taskId,
    command: "complete",
  });

  if (auth.isAlreadyCompleted) {
    // Self-healing retry check: verify event and repair day advancement/caches if interrupted
    const existingEvent = await LearningEventModel.findOne({
      userId: auth.userObjectId,
      eventType: "task_completed",
      planTaskId: auth.taskObjectId,
    }).lean();

    if (!existingEvent) {
      await recordLearningEvent({
        userId: auth.userObjectId,
        eventType: "task_completed",
        idempotencyKey: idempotencyKey || `repair-complete-${taskId}`,
        missionId: auth.task.entityType === "mission" && auth.task.entityId ? (auth.task.entityId as Types.ObjectId) : null,
        planId: auth.plan._id as Types.ObjectId,
        planDayId: auth.task.planDayId,
        planTaskId: auth.taskObjectId,
        topicId: auth.task.topicId,
        topicSlug: auth.task.topicSlug,
        problemId: auth.task.entityType === "problem" && auth.task.entityId ? (auth.task.entityId as Types.ObjectId) : null,
        payload: {
          minutesSpent: Number(auth.task.actualMinutes || 0),
          independentSolve: evidence?.passed !== false,
          score: evidence?.score,
          passed: evidence?.passed ?? true,
          reflectionAnswer: evidence?.reflectionAnswer,
          problemAttemptId: evidence?.problemAttemptId,
          missionSubmissionId: evidence?.missionSubmissionId,
        },
      }).catch(() => {});
    }

    const advanceResult = await advancePlanDayIfComplete({
      planDayId: auth.task.planDayId,
      planId: auth.plan._id as Types.ObjectId,
      userObjectId: auth.userObjectId,
    });

    await invalidateUserPlanCaches(userId);

    return {
      success: true,
      alreadyCompleted: true,
      dayAdvanced: advanceResult.dayAdvanced,
      nextDayIndex: advanceResult.nextDayIndex,
    };
  }

  // Canonical completion evaluation (PLAN-002)
  const requirement = resolveTaskRequirement(auth.task);

  let attemptDoc: any = null;
  if (evidence?.problemAttemptId && Types.ObjectId.isValid(evidence.problemAttemptId)) {
    attemptDoc = await ProblemAttemptModel.findOne({
      _id: new Types.ObjectId(evidence.problemAttemptId),
      userId: auth.userObjectId,
    }).lean();
  } else if (auth.task.entityType === "problem" && auth.task.entityId) {
    attemptDoc = await ProblemAttemptModel.findOne({
      problemId: auth.task.entityId,
      userId: auth.userObjectId,
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  const isMission = auth.task.entityType === "mission" || auth.task.phase === "learn";
  const evalEvidence: TaskCompletionEvidence = {
    passed: attemptDoc
      ? attemptDoc.status === "solved"
      : (evidence?.passed ?? (isMission ? true : undefined)),
    score: evidence?.score ?? (attemptDoc?.status === "solved" ? 100 : (isMission ? 100 : undefined)),
    strategy: attemptDoc?.strategy,
    hintsUsed: attemptDoc?.hintsUsed,
    editorialViewed: attemptDoc?.editorialViewed,
    aiAssisted: attemptDoc?.aiAssisted,
    reflectionAnswer: evidence?.reflectionAnswer || attemptDoc?.reflection,
    isAttemptSubmitted: Boolean(
      attemptDoc ||
      evidence?.problemAttemptId ||
      evidence?.missionSubmissionId ||
      evidence?.passed !== undefined ||
      isMission
    ),
    isReviewCompleted:
      auth.task.entityType === "revision"
        ? Boolean(evidence?.passed || (evidence?.score !== undefined && evidence.score >= 0))
        : false,
    isReflectionSubmitted: Boolean(evidence?.reflectionAnswer?.trim()),
  };

  const evalResult = evaluateTaskCompletion(requirement, evalEvidence);
  if (!evalResult.qualifies) {
    return {
      success: false,
      error: `TASK_REQUIREMENT_UNMET: ${evalResult.reason}`,
      requirement: evalResult.requirement,
    };
  }

  const evidenceObj = evidence
    ? {
        problemAttemptId: evidence.problemAttemptId ? new Types.ObjectId(evidence.problemAttemptId) : (attemptDoc ? attemptDoc._id : undefined),
        missionSubmissionId: evidence.missionSubmissionId ? new Types.ObjectId(evidence.missionSubmissionId) : undefined,
        score: evalEvidence.score,
        passed: evalEvidence.passed,
        reflectionAnswer: evalEvidence.reflectionAnswer,
      }
    : (attemptDoc
      ? {
          problemAttemptId: attemptDoc._id,
          score: attemptDoc.status === "solved" ? 100 : 0,
          passed: attemptDoc.status === "solved",
          reflectionAnswer: attemptDoc.reflection,
        }
      : undefined);

  const task = await PlanTaskModel.findOneAndUpdate(
    {
      _id: auth.taskObjectId,
      userId: auth.userObjectId,
      status: { $ne: "completed" },
    },
    {
      $set: {
        status: "completed",
        completedAt: new Date(),
        ...(evidenceObj ? { evidence: evidenceObj } : {}),
      },
    },
    { new: true }
  );

  if (!task) {
    const advanceResult = await advancePlanDayIfComplete({
      planDayId: auth.task.planDayId,
      planId: auth.plan._id as Types.ObjectId,
      userObjectId: auth.userObjectId,
    });
    await invalidateUserPlanCaches(userId);
    return {
      success: true,
      alreadyCompleted: true,
      dayAdvanced: advanceResult.dayAdvanced,
      nextDayIndex: advanceResult.nextDayIndex,
    };
  }

  // Record immutable LearningEvent for task completion (truthful tracked duration only)
  // If actualMinutes is already set (e.g. from an explicit attempt/measured timer), preserve it.
  // If fallback wall-clock time is used, cap it realistically at estimatedMinutes * 2 or max 120m to prevent inflated stats.
  const rawElapsed = auth.task.startedAt
    ? Math.round((Date.now() - new Date(auth.task.startedAt).getTime()) / 60000)
    : 0;
  const estimatedCap = Math.max(120, Number(auth.task.estimatedMinutes || 45) * 2);
  const cappedElapsed = Math.min(Math.max(1, rawElapsed), estimatedCap);
  const minutesSpent = Number(auth.task.actualMinutes || 0) > 0
    ? Number(auth.task.actualMinutes)
    : (auth.task.startedAt ? cappedElapsed : 0);

  if (typeof (PlanTaskModel as any).updateOne === "function") {
    await PlanTaskModel.updateOne(
      { _id: auth.taskObjectId, actualMinutes: { $in: [0, null] } },
      { $set: { actualMinutes: minutesSpent } }
    );
  }

  await recordLearningEvent({
    userId: auth.userObjectId,
    eventType: "task_completed",
    idempotencyKey: idempotencyKey || `complete-${taskId}`,
    missionId: auth.task.entityType === "mission" && auth.task.entityId ? (auth.task.entityId as Types.ObjectId) : null,
    planId: auth.plan._id as Types.ObjectId,
    planDayId: task.planDayId,
    planTaskId: auth.taskObjectId,
    topicId: auth.task.topicId,
    topicSlug: auth.task.topicSlug,
    problemId: auth.task.entityType === "problem" && auth.task.entityId ? (auth.task.entityId as Types.ObjectId) : null,
    payload: {
      minutesSpent,
      independentSolve: attemptDoc
        ? attemptDoc.status === "solved" &&
          attemptDoc.strategy === "independent" &&
          Number(attemptDoc.hintsUsed || 0) === 0 &&
          !attemptDoc.editorialViewed &&
          !attemptDoc.aiAssisted
        : evidence?.passed !== false,
      score: evalEvidence.score,
      passed: evalEvidence.passed ?? true,
      reflectionAnswer: evalEvidence.reflectionAnswer,
      problemAttemptId: evidenceObj?.problemAttemptId ? String(evidenceObj.problemAttemptId) : undefined,
      missionSubmissionId: evidenceObj?.missionSubmissionId ? String(evidenceObj.missionSubmissionId) : undefined,
    },
  });

  // If this task was a mission, also ensure MissionProgress is marked complete
  if (auth.task.entityType === "mission" && auth.task.entityId) {
    try {
      const { LearningEngine } = await import("@/features/platform/engines/learning.engine");
      await LearningEngine.completeMission(String(auth.userObjectId), String(auth.task.entityId));
    } catch {
      // Non-blocking fallback if mission is already complete or not found
    }
  }

  const advanceResult = await advancePlanDayIfComplete({
    planDayId: task.planDayId,
    planId: auth.plan._id as Types.ObjectId,
    userObjectId: auth.userObjectId,
  });

  // Dynamically update user statistics and schedule spaced retention review
  try {
    const isProblem = auth.task.entityType === "problem";
    const isPassed = evidence?.passed !== false;
    const earnedXp = isProblem && isPassed ? 100 : 50;

    const statsPatch: Record<string, any> = {
      $inc: {
        totalFocusedMinutes: minutesSpent,
        totalXp: earnedXp,
      },
      $set: {
        lastActivityDateKey: formatDateKey(new Date(), auth.plan?.timezone || "Asia/Kolkata"),
      },
      $setOnInsert: {
        userId: auth.userObjectId,
        currentStreakDays: 1,
        longestStreak: 1,
      },
    };

    // Only increment problem stats if not already accounted for by a ProblemAttempt
    if (isProblem && !evidence?.problemAttemptId) {
      statsPatch.$inc.attemptedProblems = 1;
      if (isPassed) {
        statsPatch.$inc.solvedProblems = 1;
      }
    }

    await UserStatisticsModel.findOneAndUpdate(
      { userId: auth.userObjectId },
      statsPatch,
      { upsert: true }
    );

    // If it is a problem or revision task, schedule it into RevisionQueueModel
    if (auth.task.entityId && (auth.task.entityType === "problem" || auth.task.phase === "practice" || auth.task.phase === "revise")) {
      await RevisionQueueModel.findOneAndUpdate(
        {
          userId: auth.userObjectId,
          entityType: auth.task.entityType === "mission" ? "mission" : "problem",
          entityId: auth.task.entityId,
        },
        {
          $set: {
            state: "scheduled",
            dueAt: addDays(new Date(), 1),
            priority: 10,
          },
          $setOnInsert: {
            userId: auth.userObjectId,
            entityType: auth.task.entityType === "mission" ? "mission" : "problem",
            entityId: auth.task.entityId,
            source: "attempt",
          },
        },
        { upsert: true }
      );
    }
  } catch {
    // Non-blocking for analytics and retention queue updates
  }

  await invalidateUserPlanCaches(userId);

  return {
    success: true,
    dayAdvanced: advanceResult.dayAdvanced,
    nextDayIndex: advanceResult.nextDayIndex,
    materializationWarning: advanceResult.materializationWarning,
    retryable: advanceResult.isRetryable ? true : undefined,
  };
}

/**
 * Pauses an active plan, recording the pause timestamp and reason.
 */
export async function pausePlanAction(
  reason: "break" | "exam" | "vacation" | "manual" = "manual",
  idempotencyKey?: string
) {
  const userId = await requireUserId();
  await connectToDatabase();
  const userObjectId = new Types.ObjectId(userId);

  const plan = await PlanModel.findOne({
    userId: userObjectId,
    status: "active",
  });

  if (!plan) {
    throw new Error("No active plan found to pause");
  }

  plan.status = "paused";
  plan.pausePeriods.push({
    startedAt: new Date(),
    reason,
  });
  await plan.save();

  await recordLearningEvent({
    userId: userObjectId,
    eventType: "plan_paused",
    idempotencyKey: idempotencyKey || `pause-${plan._id}-${plan.pausePeriods.length}`,
    planId: plan._id as Types.ObjectId,
    payload: {
      reason,
    },
  });

  await invalidateUserPlanCaches(userId);

  return { success: true };
}

/**
 * Resumes a paused plan, calculating paused duration and shifting the target completion date.
 */
export async function resumePlanAction(idempotencyKey?: string) {
  const userId = await requireUserId();
  await connectToDatabase();
  const userObjectId = new Types.ObjectId(userId);

  const plan = await PlanModel.findOne({
    userId: userObjectId,
    status: "paused",
  });

  if (!plan) {
    throw new Error("No paused plan found to resume");
  }

  const now = new Date();
  if (plan.pausePeriods.length > 0) {
    const lastPause = plan.pausePeriods[plan.pausePeriods.length - 1];
    if (!lastPause.endedAt) {
      lastPause.endedAt = now;
      const pauseDurationDays = Math.ceil(
        (now.getTime() - new Date(lastPause.startedAt).getTime()) / 86400000
      );
      plan.pausedDaysCount = (plan.pausedDaysCount || 0) + Math.max(0, pauseDurationDays);
      if (plan.targetCompletionDate) {
        plan.targetCompletionDate = new Date(
          new Date(plan.targetCompletionDate).getTime() + pauseDurationDays * 86400000
        );
      }
    }
  }

  plan.status = "active";
  await plan.save();

  await recordLearningEvent({
    userId: userObjectId,
    eventType: "plan_resumed",
    idempotencyKey: idempotencyKey || `resume-${plan._id}-${plan.pausePeriods.length}`,
    planId: plan._id as Types.ObjectId,
    payload: {
      pausedDaysDuration: plan.pausedDaysCount || 0,
    },
  });

  await invalidateUserPlanCaches(userId);

  return { success: true };
}

/**
 * Permanently stops/archives an active or paused plan.
 * The learner enters self-paced practice mode. Unlike pause, this cannot be resumed
 * from the exact stopped point; a new structured plan must be created from scratch.
 */
export async function stopPlanAction(
  reason: string = "Learner opted for self-paced practice",
  idempotencyKey?: string
) {
  const userId = await requireUserId();
  await connectToDatabase();
  const userObjectId = new Types.ObjectId(userId);

  const plan = await PlanModel.findOne({
    userId: userObjectId,
    status: { $in: ["active", "paused"] },
  });

  if (!plan) {
    throw new Error("No active or paused plan found to stop");
  }

  plan.status = "archived";
  plan.archivedAt = new Date();
  await plan.save();

  await recordLearningEvent({
    userId: userObjectId,
    eventType: "plan_paused",
    idempotencyKey: idempotencyKey || `stop-${plan._id}-${Date.now()}`,
    planId: plan._id as Types.ObjectId,
    payload: {
      reason: `Plan stopped: ${reason}`,
    },
  }).catch(() => {});

  await invalidateUserPlanCaches(userId);

  return { success: true };
}

/**
 * Prepares and executes an explicit recovery adjustment for missed days or struggles.
 * Follows zero-GET-mutation guarantee: only invoked via explicit user button click.
 */
export async function prepareRecoveryAction(selectedOptionKey: string) {
  const userId = await requireUserId();
  await connectToDatabase();
  const userObjectId = new Types.ObjectId(userId);

  const plan = await PlanModel.findOne({
    userId: userObjectId,
    status: "active",
  });

  if (!plan) {
    throw new Error("No active plan found for recovery");
  }

  const currentAvailableDay = await PlanDayModel.findOne({
    planId: plan._id,
    status: { $in: ["available", "in_progress", "missed"] },
  }).sort({ dayIndex: 1 });

  if (!currentAvailableDay) {
    return { success: true, message: "No recovery action required." };
  }

  if (selectedOptionKey === "add_buffer_day") {
    // Convert current day into a catch-up buffer day
    currentAvailableDay.isBufferDay = true;
    currentAvailableDay.title = `Catch-up Buffer · ${currentAvailableDay.topicName}`;
    currentAvailableDay.focus = "Review previous concepts and catch up on pending practice.";
    currentAvailableDay.status = "available";
    await currentAvailableDay.save();
  } else if (selectedOptionKey === "restart_topic") {
    // Re-lock subsequent days and re-start topic Day 1
    currentAvailableDay.status = "available";
    currentAvailableDay.actualMinutes = 0;
    await currentAvailableDay.save();
  }

  await invalidateUserPlanCaches(userId);

  return { success: true, optionApplied: selectedOptionKey };
}

/**
 * Allows a user to skip an unavailable or optional plan task cleanly,
 * recording the skip reason and checking if the day is ready to advance.
 */
export async function skipPlanTaskAction(
  taskId: string,
  reason?: string,
  idempotencyKey?: string
) {
  const userId = await requireUserId();
  const auth = await authorizePlanTaskCommand({
    userId,
    taskId,
    command: "skip",
  });

  if (auth.task.status === "skipped") {
    return { success: true, dayAdvanced: false };
  }

  const task = await PlanTaskModel.findOneAndUpdate(
    {
      _id: auth.taskObjectId,
      userId: auth.userObjectId,
      status: { $in: ["pending", "in_progress", "unavailable"] },
    },
    {
      $set: {
        status: "skipped",
        completedAt: new Date(),
        "evidence.reflectionAnswer": reason || "Skipped by learner",
      },
    },
    { new: true }
  );

  if (!task) {
    return { success: true, dayAdvanced: false };
  }

  // Record immutable LearningEvent for task skip
  await recordLearningEvent({
    userId: auth.userObjectId,
    eventType: "task_skipped",
    idempotencyKey: idempotencyKey || `skip-${taskId}`,
    planId: auth.plan._id as Types.ObjectId,
    planDayId: task.planDayId,
    planTaskId: auth.taskObjectId,
    topicId: auth.task.topicId,
    topicSlug: auth.task.topicSlug,
    payload: {
      reason: reason || "Skipped by learner",
    },
  });

  const advanceResult = await advancePlanDayIfComplete({
    planDayId: task.planDayId,
    planId: auth.plan._id as Types.ObjectId,
    userObjectId: auth.userObjectId,
  });

  await invalidateUserPlanCaches(userId);

  return {
    success: true,
    dayAdvanced: advanceResult.dayAdvanced,
    nextDayIndex: advanceResult.nextDayIndex,
    materializationWarning: advanceResult.materializationWarning,
    retryable: advanceResult.isRetryable ? true : undefined,
  };
}

/**
 * On-demand action to materialize tasks for the user's current actionable plan day.
 * Ensures that if a day has 0 tasks, the canonical blueprint tasks are immediately generated.
 */
export async function materializeCurrentDayTasksAction() {
  const userId = await requireUserId();
  await connectToDatabase();

  const activeResult = await resolveUserActivePlan(userId);
  const { plan, days } = activeResult;

  if (!plan) {
    return { success: false, error: "No active plan found." };
  }

  const currentDay = resolveCurrentPlanDay(plan, days, new Date(), plan.timezone);
  if (!currentDay) {
    return { success: false, error: "No active day found." };
  }

  const tasks = await materializeTasksForPlanDay({
    plan,
    day: currentDay,
    userId,
  });

  if (currentDay.status === "available" || currentDay.status === "locked") {
    await PlanDayModel.findByIdAndUpdate(currentDay._id, {
      status: "in_progress",
      startedAt: new Date(),
    }).catch(() => {});
  }

  await invalidateUserPlanCaches(userId);

  return { success: true, count: tasks.length };
}

/**
 * Quick recalibration for "Less time today?":
 * Adjusts today's planned target minutes and updates the plan's dailyMinutes,
 * recording an explainable decision without corrupting completed days or event history.
 */
export async function recalibrateTodayMinutesAction(newMinutes: number) {
  const userId = await requireUserId();
  await connectToDatabase();
  const userObjectId = new Types.ObjectId(userId);

  const plan = await PlanModel.findOne({
    userId: userObjectId,
    status: "active",
  });

  if (!plan) {
    throw new Error("No active plan found to recalibrate.");
  }

  plan.dailyMinutes = newMinutes;
  await plan.save();

  // Find active or available day to update its targetMinutes
  const currentDay = await PlanDayModel.findOne({
    planId: plan._id,
    userId: userObjectId,
    status: { $in: ["available", "in_progress"] },
  }).sort({ dayIndex: 1 });

  if (currentDay) {
    currentDay.targetMinutes = newMinutes;
    await currentDay.save();
  }

  await IntelligenceDecisionModel.create({
    userId: userObjectId,
    planId: plan._id,
    planDayId: currentDay?._id || null,
    surface: "recalibration",
    decisionType: "retargeting",
    selectedAction: {
      actionKey: "recalibrate-time",
      actionType: "checkpoint",
      title: `Recalibrated to ${newMinutes} minutes`,
      estimatedMinutes: newMinutes,
      planRelation: "planned_today",
      targetUrl: "/intelligence?tab=today",
    },
    primaryReason: `Daily planned time adjusted to ${newMinutes} minutes for Day ${currentDay?.dayIndex ?? 1}.`,
    secondaryReasons: [
      `Target minutes updated to match current available time.`,
      `Progress and streak records preserved.`,
    ],
    signals: {
      planDayIndex: currentDay?.dayIndex ?? 1,
      recoveryTriggered: false,
    },
    aiExplanation: {
      fallbackUsed: true,
    },
  }).catch(() => {});

  await invalidateUserPlanCaches(userId);
  return { success: true, targetMinutes: newMinutes };
}

/**
 * Safely reschedules an unfinished plan task.
 * Marks the task as skipped for today with an audit reason,
 * preserves retention by queueing the entity into RevisionQueueModel,
 * logs a learning event, and advances the day if all required tasks are resolved.
 */
export async function reschedulePlanTaskAction(
  taskId: string,
  reason: string = "Rescheduled to future session"
) {
  const userId = await requireUserId();
  const auth = await authorizePlanTaskCommand({
    userId,
    taskId,
    command: "skip",
  });

  if (auth.task.status === "completed") {
    throw new Error("Cannot reschedule an already completed task.");
  }

  const task = await PlanTaskModel.findOneAndUpdate(
    {
      _id: auth.taskObjectId,
      userId: auth.userObjectId,
      status: { $in: ["pending", "in_progress", "unavailable"] },
    },
    {
      $set: {
        status: "skipped",
        completedAt: new Date(),
        "evidence.reflectionAnswer": `Rescheduled: ${reason}`,
      },
    },
    { new: true }
  );

  if (!task) {
    return { success: true, dayAdvanced: false };
  }

  // Queue into RevisionQueue for spaced retrieval so knowledge is not lost
  if (task.entityId && (task.entityType === "problem" || task.entityType === "mission" || task.entityType === "revision")) {
    await RevisionQueueModel.findOneAndUpdate(
      {
        userId: auth.userObjectId,
        entityType: task.entityType === "mission" ? "mission" : "problem",
        entityId: task.entityId,
      },
      {
        $set: {
          state: "scheduled",
          dueAt: addDays(new Date(), 1),
          priority: 8,
        },
        $setOnInsert: {
          userId: auth.userObjectId,
          entityType: task.entityType === "mission" ? "mission" : "problem",
          entityId: task.entityId,
          source: "attempt",
        },
      },
      { upsert: true }
    ).catch(() => {});
  }

  await recordLearningEvent({
    userId: auth.userObjectId,
    eventType: "task_skipped",
    idempotencyKey: `reschedule-${taskId}-${Date.now()}`,
    planId: auth.plan._id as Types.ObjectId,
    planDayId: task.planDayId,
    planTaskId: auth.taskObjectId,
    topicId: task.topicId,
    topicSlug: task.topicSlug,
    payload: {
      reason: `Rescheduled: ${reason}`,
    },
  }).catch(() => {});

  const advanceResult = await advancePlanDayIfComplete({
    planDayId: task.planDayId,
    planId: auth.plan._id as Types.ObjectId,
    userObjectId: auth.userObjectId,
  });

  await invalidateUserPlanCaches(userId);

  return {
    success: true,
    dayAdvanced: advanceResult.dayAdvanced,
    nextDayIndex: advanceResult.nextDayIndex,
  };
}

/**
 * Allows the learner to intentionally unlock and start tomorrow's plan day early
 * after completing today's daily milestones.
 * Transitions next day's status to 'in_progress' and materializes its tasks.
 */
export async function startNextDayEarlyAction() {
  const userId = await requireUserId();
  await connectToDatabase();
  const userObjectId = new Types.ObjectId(userId);

  const activePlan = await PlanModel.findOne({
    userId: userObjectId,
    status: "active",
  });
  if (!activePlan) return { success: false, error: "No active plan found" };

  // Find the highest completed day index
  const completedDays = await PlanDayModel.find({
    planId: activePlan._id,
    userId: userObjectId,
    status: "completed",
  }).sort({ dayIndex: -1 }).lean();

  const lastCompletedIndex = completedDays.length > 0 ? completedDays[0].dayIndex : 0;
  const nextDayIndex = lastCompletedIndex + 1;

  if (nextDayIndex > activePlan.totalDays) {
    return { success: false, error: "All days in plan are already completed" };
  }

  // Find or materialize next day
  let nextDay = await PlanDayModel.findOne({
    planId: activePlan._id,
    userId: userObjectId,
    dayIndex: nextDayIndex,
  });

  const tz = activePlan.timezone || "Asia/Kolkata";
  const todayDateKey = formatDateKey(new Date(), tz);

  if (!nextDay) {
    const blueprintSnapshot = activePlan.snapshots?.estimatedScheduleSnapshot?.find(
      (d: any) => d.dayIndex === nextDayIndex
    );
    nextDay = await PlanDayModel.create({
      planId: activePlan._id,
      userId: userObjectId,
      dayIndex: nextDayIndex,
      dateKey: todayDateKey,
      status: "in_progress",
      phase: blueprintSnapshot?.phase || "guided_practice",
      title: blueprintSnapshot?.title || `Day ${nextDayIndex}`,
      focus: blueprintSnapshot?.focus || "Daily practice",
      topicId: activePlan.topicId || null,
      topicSlug: activePlan.topicSlug || "",
      topicName: activePlan.topicName || "Topic",
      targetMinutes: activePlan.dailyMinutes || 45,
      actualMinutes: 0,
      startedAt: new Date(),
      completedAt: null,
      isBufferDay: Boolean(blueprintSnapshot?.isReviewOrCheckpoint),
      isCheckpointDay: nextDayIndex % 7 === 0,
    });
  } else {
    nextDay.status = "in_progress";
    nextDay.startedAt = new Date();
    await nextDay.save();
  }

  // Ensure tasks are materialized for this day
  await materializeTasksForPlanDay({
    plan: activePlan,
    day: nextDay,
    userId: userObjectId,
  });

  await invalidateUserPlanCaches(userId);

  return {
    success: true,
    dayIndex: nextDayIndex,
  };
}


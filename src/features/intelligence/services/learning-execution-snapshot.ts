import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { PlanModel, type IPlanDocument } from "../models/plan.model";
import { PlanDayModel, type IPlanDayDocument } from "../models/plan-day.model";
import { PlanTaskModel, type IPlanTaskDocument } from "../models/plan-task.model";
import { UserStatisticsModel } from "../models/intelligence.model";
import { UserTopicProgressModel } from "../models/user-topic-progress.model";
import { TopicProgressModel } from "@/features/learning/models/learning.model";
import { TopicModel } from "@/features/content/models/content.model";
import { resolveUserActivePlan } from "./plan-migration.service";
import type { SemanticProgressMetrics } from "../types/intelligence.types";

export interface PlanDayLike {
  _id?: Types.ObjectId | string;
  id?: string;
  dayIndex?: number;
  dateKey?: string;
  status?: string;
  phase?: string;
  title?: string;
  focus?: string;
  topicSlug?: string;
  topicName?: string;
  targetMinutes?: number;
  actualMinutes?: number;
  isBufferDay?: boolean;
  isCheckpointDay?: boolean;
  [key: string]: any;
}

export interface LearningExecutionSnapshot {
  snapshotVersion: 2;
  semanticProgress: SemanticProgressMetrics;
  activePlan: {
    id: string;
    status: string;
    source: string;
    cycleNumber: number;
    totalDays: number;
    currentDayIndex: number;
    cyclePacePercent: number;
    todayTaskCompletionPercent: number;
    cycleTaskCompletionPercent: number;
    masteryPercent: number;
    topicConfidenceScore: number;
    topicState: string;
    topicDisplayState: "not_assessed" | "in_progress" | "mastered";
    dayStatus: string;
    dayTitle: string;
    dayFocus: string;
    topicSlug: string;
    topicName: string;
    dailyMinutes: number;
    tasksCount: number;
    completedTasksCount: number;
    startDate: string;
    targetCompletionDate?: string | null;
  } | null;
  currentPlanDay: {
    id: string;
    dayIndex: number;
    dateKey: string;
    status: string;
    phase: string;
    title: string;
    focus: string;
    topicSlug: string;
    topicName: string;
    targetMinutes: number;
    actualMinutes: number;
    isBufferDay: boolean;
    isCheckpointDay: boolean;
  } | null;
  todayTasks: Array<{
    id: string;
    planDayId: string;
    planId?: string;
    dayIndex: number;
    taskKey: string;
    title: string;
    phase: string;
    entityType: string;
    entityId: string | null;
    topicId?: string | null;
    topicSlug?: string;
    topicName?: string;
    topicAlignment?: "aligned" | "cross_topic_bridge" | "mismatched" | "unavailable";
    order: number;
    required: boolean;
    estimatedMinutes: number;
    status: string;
    planRelation: string;
    targetUrl: string | null;
    reflectionPrompt: string | null;
  }>;
  primaryTodayAction: {
    taskId?: string;
    actionKey: string;
    title: string;
    href: string;
    planRelation: string;
    estimatedMinutes: number;
    planDayIndex: number;
    label: string;
    phase: string;
    entityType: string;
    required: boolean;
    whyThisIsNext?: string;
    afterCompletionOutcome?: string;
  } | null;
  todayProgress: {
    totalTasks: number;
    completedTasks: number;
    requiredTasks: number;
    completedRequiredTasks: number;
    percentComplete: number;
    isDayComplete: boolean;
  };
  scheduleProgress: {
    currentDayIndex: number;
    totalDays: number;
    percentComplete: number;
  };
  cycleEvidenceProgress: {
    totalTasks: number;
    completedTasks: number;
    percentComplete: number;
  };
  streak: number;
  duePlanRevisions: any[];
  planDays?: Array<{
    id: string;
    dayIndex: number;
    title: string;
    status: string;
    isCheckpointDay: boolean;
    focus: string;
  }>;
  availabilityWarnings: string[];
  fallbackState: {
    usedStarterFallback: boolean;
    reason?: string;
  };
}

/**
 * Compatibility adapter for reading semantic progress metrics from any snapshot or plan payload.
 * Safely adapts legacy snapshots (version 1 or unversioned) to SemanticProgressMetrics v2,
 * ensuring no NaN, crashes, or missing fields occur across client/server boundaries.
 */
export function adaptSnapshotToSemanticProgress(snapshot: any): SemanticProgressMetrics {
  if (snapshot?.semanticProgress && snapshot?.snapshotVersion === 2) {
    return snapshot.semanticProgress;
  }

  const activePlan = snapshot?.activePlan;
  const currentPlanDay = snapshot?.currentPlanDay;
  const currentDayIndex = Number(activePlan?.currentDayIndex ?? currentPlanDay?.dayIndex ?? 1);
  const totalDays = Number(activePlan?.totalDays ?? 21);
  const cyclePacePercent = Math.min(100, Math.round((currentDayIndex / Math.max(1, totalDays)) * 100));

  const todayTasks = Array.isArray(snapshot?.todayTasks) ? snapshot.todayTasks : [];
  const todayTasksCount = todayTasks.length;
  const todayCompletedTasksCount = todayTasks.filter((t: any) => t.status === "completed").length;
  const todayTaskCompletionPercent =
    snapshot?.todayProgress?.percentComplete ??
    (todayTasksCount > 0 ? Math.round((todayCompletedTasksCount / todayTasksCount) * 100) : 0);

  const isDayComplete = Boolean(
    snapshot?.todayProgress?.isDayComplete ??
    (todayTasksCount > 0 && todayCompletedTasksCount === todayTasksCount)
  );

  const cycleTasksCount = Number(snapshot?.cycleEvidenceProgress?.totalTasks ?? activePlan?.tasksCount ?? 0);
  const cycleCompletedTasksCount = Number(snapshot?.cycleEvidenceProgress?.completedTasks ?? activePlan?.completedTasksCount ?? 0);
  const cycleTaskCompletionPercent =
    snapshot?.cycleEvidenceProgress?.percentComplete ??
    (cycleTasksCount > 0 ? Math.round((cycleCompletedTasksCount / cycleTasksCount) * 100) : 0);

  const masteryPercent = Number(activePlan?.masteryPercent ?? snapshot?.topicProgress?.masteryScore ?? 0);
  const topicState = (activePlan?.topicState ?? snapshot?.topicProgress?.state ?? "unseen") as SemanticProgressMetrics["topicState"];
  const topicConfidenceScore = Number(activePlan?.topicConfidenceScore ?? snapshot?.topicProgress?.confidenceScore ?? 0);
  const topicDisplayState = (activePlan?.topicDisplayState ?? (masteryPercent > 0 ? "in_progress" : "not_assessed")) as SemanticProgressMetrics["topicDisplayState"];

  return {
    snapshotVersion: 2,
    cyclePacePercent,
    currentDayIndex,
    totalDays,
    todayTaskCompletionPercent,
    todayTasksCount,
    todayCompletedTasksCount,
    isDayComplete,
    cycleTaskCompletionPercent,
    cycleTasksCount,
    cycleCompletedTasksCount,
    masteryPercent,
    topicConfidenceScore,
    topicState,
    topicDisplayState,
    provenance: {
      paceSource: "schedule_position",
      todaySource: "today_tasks",
      cycleSource: "cycle_tasks",
      masterySource: snapshot?.topicProgress ? "topic_evidence" : "legacy_migration",
      masteryScoreDirect: masteryPercent,
      confidenceScoreDirect: topicConfidenceScore,
      planDayIndex: currentDayIndex,
      totalDays,
    },
  };
}

export { resolveCurrentPlanDay } from "./plan-content-resolver";
import { resolveCurrentPlanDay } from "./plan-content-resolver";

/**
 * Resolves the single authoritative learning execution snapshot for a user.
 * Guarantees that Dashboard and /intelligence route observe the exact same state,
 * current day, today tasks, semantic progress metrics, and primary action.
 */
export async function resolveLearningExecutionSnapshot(
  userId: string,
  now: Date = new Date()
): Promise<LearningExecutionSnapshot> {
  await connectToDatabase();
  const userObjectId = new Types.ObjectId(userId);

  const [activePlanResult, userStats] = await Promise.all([
    resolveUserActivePlan(userId),
    UserStatisticsModel.findOne({ userId: userObjectId }).lean(),
  ]);

  const { plan, days, tasks, wasMigrated } = activePlanResult;

  const streak = Number(userStats?.currentStreakDays ?? 0);

  if (!plan) {
    const emptySemantic: SemanticProgressMetrics = {
      snapshotVersion: 2,
      cyclePacePercent: 0,
      currentDayIndex: 1,
      totalDays: 21,
      todayTaskCompletionPercent: 0,
      todayTasksCount: 0,
      todayCompletedTasksCount: 0,
      isDayComplete: false,
      cycleTaskCompletionPercent: 0,
      cycleTasksCount: 0,
      cycleCompletedTasksCount: 0,
      masteryPercent: 0,
      topicConfidenceScore: 0,
      topicState: "unseen",
      topicDisplayState: "not_assessed",
      provenance: {
        paceSource: "schedule_position",
        todaySource: "today_tasks",
        cycleSource: "cycle_tasks",
        masterySource: "legacy_migration",
      },
    };

    return {
      snapshotVersion: 2,
      semanticProgress: emptySemantic,
      activePlan: null,
      currentPlanDay: null,
      todayTasks: [],
      primaryTodayAction: null,
      todayProgress: {
        totalTasks: 0,
        completedTasks: 0,
        requiredTasks: 0,
        completedRequiredTasks: 0,
        percentComplete: 0,
        isDayComplete: false,
      },
      scheduleProgress: {
        currentDayIndex: 1,
        totalDays: 21,
        percentComplete: 0,
      },
      cycleEvidenceProgress: {
        totalTasks: 0,
        completedTasks: 0,
        percentComplete: 0,
      },
      streak,
      duePlanRevisions: [],
      planDays: [],
      availabilityWarnings: [],
      fallbackState: {
        usedStarterFallback: false,
        reason: "No active plan found",
      },
    };
  }

  // Authoritative Current Day Resolution
  const currentPlanDay = resolveCurrentPlanDay(plan, days, now, plan.timezone);

  // Authoritative Today Tasks Resolution (strict identity filtering: matches planDayId and planId)
  const currentDayId = currentPlanDay?._id ? String(currentPlanDay._id) : null;
  const currentDayIndex = currentPlanDay?.dayIndex ?? 1;
  const planIdStr = String(plan._id);
  const currentDayTopicIdStr = currentPlanDay?.topicId ? String(currentPlanDay.topicId) : null;
  const currentDayTopicSlug = currentPlanDay?.topicSlug || "";

  const availabilityWarnings: string[] = [];

  const rawTodayTasks = tasks.filter((t) => {
    if (!currentDayId) return false;
    return String(t.planDayId) === currentDayId && String(t.planId) === planIdStr;
  });

  const todayTasks = rawTodayTasks.map((t) => {
    const taskTopicIdStr = t.topicId ? String(t.topicId) : currentDayTopicIdStr;
    const taskTopicSlug = t.topicSlug || currentDayTopicSlug;
    const taskTopicName = t.topicName || currentPlanDay?.topicName || "Topic";

    // Strict validation: Ensure task topic strictly corresponds to current plan day topic
    const isTopicMismatched =
      (taskTopicIdStr && currentDayTopicIdStr && taskTopicIdStr !== currentDayTopicIdStr) ||
      (t.topicSlug && currentDayTopicSlug && t.topicSlug !== currentDayTopicSlug) ||
      t.validationStatus === "mismatched";

    const alignment = isTopicMismatched
      ? ("mismatched" as const)
      : (t.validationStatus as "aligned" | "cross_topic_bridge" | "mismatched" | "unavailable") || "aligned";

    const isUnavailable = isTopicMismatched || t.status === "unavailable" || alignment === "unavailable";
    const status = isUnavailable ? "unavailable" : t.status;
    const required = isUnavailable ? false : (t.required !== false);

    if (isTopicMismatched) {
      availabilityWarnings.push(`Task "${t.title}" topic does not match the active day topic.`);
    }

    return {
      id: String(t._id),
      planDayId: String(t.planDayId),
      planId: planIdStr,
      dayIndex: t.dayIndex,
      taskKey: t.taskKey,
      title: t.title,
      phase: t.phase,
      entityType: t.entityType,
      entityId: t.entityId ? String(t.entityId) : null,
      topicId: taskTopicIdStr,
      topicSlug: taskTopicSlug,
      topicName: taskTopicName,
      topicAlignment: alignment,
      order: t.order,
      required,
      estimatedMinutes: t.estimatedMinutes || 20,
      status,
      planRelation: t.planRelation || "planned_today",
      targetUrl: t.targetUrl
        ? (t.targetUrl.startsWith("/problems/") ? `/practice${t.targetUrl}` : t.targetUrl)
        : null,
      reflectionPrompt: t.reflectionPrompt || null,
    };
  });

  // Progress semantics
  const totalTasks = todayTasks.length;
  const completedTasks = todayTasks.filter((t) => t.status === "completed").length;
  const requiredTasks = todayTasks.filter((t) => t.required);
  const completedRequiredTasks = requiredTasks.filter((t) => t.status === "completed").length;
  const isDayComplete = requiredTasks.length > 0 && completedRequiredTasks === requiredTasks.length;
  const percentComplete = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalDays = Number(plan.totalDays || 21);
  const schedulePercent = Math.min(100, Math.round((currentDayIndex / totalDays) * 100));

  const totalCycleTasks = tasks.length;
  const completedCycleTasks = tasks.filter((t) => t.status === "completed").length;
  const cyclePercent = totalCycleTasks > 0 ? Math.round((completedCycleTasks / totalCycleTasks) * 100) : 0;

  // Single Authoritative Next Action — strictly disallow mismatched or unavailable tasks
  let primaryTodayAction: LearningExecutionSnapshot["primaryTodayAction"] = null;

  const nextPendingRequired = todayTasks.find(
    (t) => t.required && (t.status === "pending" || t.status === "in_progress") && t.topicAlignment !== "mismatched"
  );
  const nextPendingOptional = todayTasks.find(
    (t) => !t.required && (t.status === "pending" || t.status === "in_progress") && t.topicAlignment !== "mismatched"
  );

  const selectedTask = nextPendingRequired || nextPendingOptional;

  if (selectedTask) {
    let whyThisIsNext = "";
    if (selectedTask.planRelation === "plan_revision") {
      whyThisIsNext = "Scheduled spaced retention to reinforce pattern mastery before introducing new algorithms.";
    } else if (selectedTask.phase === "learn") {
      whyThisIsNext = `Introduces mental models and key invariants for ${selectedTask.topicName || "this topic"} before code implementation.`;
    } else if (selectedTask.phase === "practice") {
      whyThisIsNext = `Focuses on core implementation mechanics and invariant recognition for ${selectedTask.topicName || "the active pattern"}.`;
    } else if (selectedTask.phase === "revise") {
      whyThisIsNext = `Challenges edge-case handling and retention patterns for ${selectedTask.topicName || "this pattern"} under timed conditions.`;
    } else if (selectedTask.phase === "reflect") {
      whyThisIsNext = `Synthesizes pattern heuristics and reflection takeaways for ${selectedTask.topicName || "the active topic"}.`;
    } else {
      whyThisIsNext = currentPlanDay?.focus || "Daily focus task to progress through your active study plan.";
    }

    const remainingTasksAfterThis = todayTasks.filter(
      (t) => t.id !== selectedTask.id && (t.status === "pending" || t.status === "in_progress")
    );
    let afterCompletionOutcome = "";
    if (remainingTasksAfterThis.length > 0) {
      const nextTask = remainingTasksAfterThis[0];
      afterCompletionOutcome = `Unlocks next task: "${nextTask.title}" (${remainingTasksAfterThis.length} remaining today).`;
    } else {
      const nextDay = Math.min(totalDays, currentDayIndex + 1);
      afterCompletionOutcome = `Finishes Day ${currentDayIndex} tasks · Advances schedule to Day ${nextDay}.`;
    }

    primaryTodayAction = {
      taskId: selectedTask.id,
      actionKey: selectedTask.taskKey,
      title: selectedTask.title,
      href: selectedTask.targetUrl
        ? (selectedTask.targetUrl.startsWith("/problems/") ? `/practice${selectedTask.targetUrl}` : selectedTask.targetUrl)
        : "/intelligence?tab=today",
      planRelation: selectedTask.planRelation,
      estimatedMinutes: selectedTask.estimatedMinutes,
      planDayIndex: currentDayIndex,
      label:
        selectedTask.status === "in_progress"
          ? "Continue task"
          : "Start task",
      phase: selectedTask.phase,
      entityType: selectedTask.entityType,
      required: selectedTask.required,
      whyThisIsNext,
      afterCompletionOutcome,
    };
  } else if (isDayComplete) {
    primaryTodayAction = {
      actionKey: `day_${currentDayIndex}_completed`,
      title: `Day ${currentDayIndex} Complete · Ready for Day ${Math.min(totalDays, currentDayIndex + 1)}`,
      href: "/intelligence?tab=today",
      planRelation: "planned_today",
      estimatedMinutes: 0,
      planDayIndex: currentDayIndex,
      label: "Start next task",
      phase: "checkpoint",
      entityType: "checkpoint",
      required: false,
      whyThisIsNext: `All required tasks for Day ${currentDayIndex} are complete!`,
      afterCompletionOutcome: `Day ${currentDayIndex} recorded · Ready for Day ${Math.min(totalDays, currentDayIndex + 1)}.`,
    };
  }

  // Topic mastery lookup for the plan's topic without silent arrays fallback
  const planTopicSlug = currentPlanDay?.topicSlug || (plan.snapshots as any)?.primaryTopicSlug || "";
  if (!planTopicSlug) {
    availabilityWarnings.push("Current plan topic identity is missing.");
  }
  const planTopicDoc = planTopicSlug
    ? await TopicModel.findOne({ slug: planTopicSlug }).select("_id slug name").lean()
    : null;
  const [topicProgressDoc, userTopicProgressDoc, dueTopicRevisions] = await Promise.all([
    planTopicDoc
      ? TopicProgressModel.findOne({ userId: userObjectId, topicId: planTopicDoc._id }).lean()
      : null,
    planTopicSlug
      ? UserTopicProgressModel.findOne({ userId: userObjectId, topicSlug: planTopicSlug }).lean()
      : null,
    UserTopicProgressModel.find({
      userId: userObjectId,
      reviewDueAt: { $lte: now },
    }).lean(),
  ]);

  const masteryScore = Number(userTopicProgressDoc?.masteryScore ?? topicProgressDoc?.masteryScore ?? 0);
  const confidenceScore = Number(
    userTopicProgressDoc?.averageConfidence
      ? Math.round(userTopicProgressDoc.averageConfidence * 20)
      : topicProgressDoc?.confidenceScore ?? 0
  );
  const topicState = (
    userTopicProgressDoc?.masteryScore !== undefined
      ? userTopicProgressDoc.masteryScore >= 80 ? "mastered" : userTopicProgressDoc.masteryScore > 0 ? "in_progress" : "unseen"
      : topicProgressDoc?.state ?? "unseen"
  ) as SemanticProgressMetrics["topicState"];
  const topicAttempts = Number(userTopicProgressDoc?.attemptedCount ?? topicProgressDoc?.attempts ?? 0);
  const hasEvidence = topicAttempts > 0 || masteryScore > 0;
  const topicDisplayState = !hasEvidence ? "not_assessed" : (masteryScore >= 80 ? "mastered" : "in_progress");

  const duePlanRevisions = (dueTopicRevisions || []).map((r: any) => ({
    topicSlug: r.topicSlug,
    masteryScore: r.masteryScore,
    reviewDueAt: r.reviewDueAt,
    estimatedMinutes: 15,
    title: `Retention Review: ${r.topicSlug}`,
    targetUrl: `/revision?topic=${r.topicSlug}`,
  }));

  const semanticProgress: SemanticProgressMetrics = {
    snapshotVersion: 2,
    cyclePacePercent: schedulePercent,
    currentDayIndex,
    totalDays,
    todayTaskCompletionPercent: percentComplete,
    todayTasksCount: totalTasks,
    todayCompletedTasksCount: completedTasks,
    isDayComplete,
    cycleTaskCompletionPercent: cyclePercent,
    cycleTasksCount: totalCycleTasks,
    cycleCompletedTasksCount: completedCycleTasks,
    masteryPercent: masteryScore,
    topicConfidenceScore: confidenceScore,
    topicState,
    topicDisplayState,
    provenance: {
      paceSource: "schedule_position",
      todaySource: "today_tasks",
      cycleSource: "cycle_tasks",
      masterySource: "topic_evidence",
    },
  };

  const mappedActivePlan = {
    id: String(plan._id),
    status: plan.status,
    source: plan.source,
    cycleNumber: Number(plan.cycleNumber || 1),
    totalDays,
    currentDayIndex,
    cyclePacePercent: schedulePercent,
    todayTaskCompletionPercent: percentComplete,
    cycleTaskCompletionPercent: cyclePercent,
    masteryPercent: masteryScore,
    topicConfidenceScore: confidenceScore,
    topicState,
    topicDisplayState: topicDisplayState as "not_assessed" | "in_progress" | "mastered",
    dayStatus: currentPlanDay ? String(currentPlanDay.status) : "available",
    dayTitle: currentPlanDay ? String(currentPlanDay.title) : `Day ${currentDayIndex}`,
    dayFocus: currentPlanDay ? String(currentPlanDay.focus) : "Core practice",
    topicSlug: currentPlanDay?.topicSlug
      ? String(currentPlanDay.topicSlug)
      : String((plan.snapshots as any)?.primaryTopicSlug || ""),
    topicName: currentPlanDay?.topicName
      ? String(currentPlanDay.topicName)
      : String((plan.snapshots as any)?.estimatedScheduleSnapshot?.[0]?.topicName || "Unassigned Topic"),
    dailyMinutes: Number(plan.dailyMinutes || 45),
    tasksCount: tasks.length,
    completedTasksCount: completedCycleTasks,
    startDate: plan.startDate ? new Date(plan.startDate).toISOString() : new Date().toISOString(),
    targetCompletionDate: plan.targetCompletionDate
      ? new Date(plan.targetCompletionDate).toISOString()
      : null,
  };

  const mappedCurrentPlanDay = currentPlanDay
    ? {
        id: String(currentPlanDay._id || (currentPlanDay as any).id),
        dayIndex: currentPlanDay.dayIndex,
        dateKey: currentPlanDay.dateKey,
        status: currentPlanDay.status,
        phase: currentPlanDay.phase,
        title: currentPlanDay.title,
        focus: currentPlanDay.focus,
        topicSlug: currentPlanDay.topicSlug,
        topicName: currentPlanDay.topicName,
        targetMinutes: currentPlanDay.targetMinutes,
        actualMinutes: currentPlanDay.actualMinutes || 0,
        isBufferDay: Boolean(currentPlanDay.isBufferDay),
        isCheckpointDay: Boolean(currentPlanDay.isCheckpointDay),
      }
    : null;

  return {
    snapshotVersion: 2,
    semanticProgress,
    activePlan: mappedActivePlan,
    currentPlanDay: mappedCurrentPlanDay,
    todayTasks,
    primaryTodayAction,
    todayProgress: {
      totalTasks,
      completedTasks,
      requiredTasks: requiredTasks.length,
      completedRequiredTasks,
      percentComplete,
      isDayComplete,
    },
    scheduleProgress: {
      currentDayIndex,
      totalDays,
      percentComplete: schedulePercent,
    },
    cycleEvidenceProgress: {
      totalTasks: totalCycleTasks,
      completedTasks: completedCycleTasks,
      percentComplete: cyclePercent,
    },
    streak,
    duePlanRevisions,
    planDays: (days || []).map((d: any) => ({
      id: String(d._id || d.id),
      dayIndex: Number(d.dayIndex || 1),
      title: String(d.title || `Day ${d.dayIndex || 1}`),
      status: String(d.status || "upcoming"),
      isCheckpointDay: Boolean(d.isCheckpointDay),
      focus: String(d.focus || ""),
    })),
    availabilityWarnings,
    fallbackState: {
      usedStarterFallback: wasMigrated,
      reason: wasMigrated ? "Plan created from user profile/roadmap state" : undefined,
    },
  };
}

import { CURRICULUM } from "@/features/onboarding/planning/curriculum-rules";
import type { IPlanDocument } from "../models/plan.model";
import type { IPlanDayDocument } from "../models/plan-day.model";
import type { IPlanTaskDocument } from "../models/plan-task.model";

export interface CycleCompletionSummary {
  planId: string;
  cycleNumber: number;
  totalDays: number;
  completedDaysCount: number;
  completionPercentage: number;
  isEligibleForCompletion: boolean;
  totalFocusedMinutes: number;
  problemsSolvedCount: number;
  recommendedNextTopicSlug: string;
  recommendedNextTopicName: string;
  readinessSummary: string;
}

/**
 * Pure evaluation function that assesses whether a learner has satisfied the
 * requirements of their active plan cycle, calculating workload evidence and
 * recommending the next curriculum progression step.
 */
export function evaluatePlanCycleCompletion(params: {
  plan: IPlanDocument | Record<string, any>;
  days: Array<IPlanDayDocument | Record<string, any>>;
  tasks: Array<IPlanTaskDocument | Record<string, any>>;
}): CycleCompletionSummary {
  const { plan, days, tasks } = params;

  const totalDays = Number(plan.totalDays || 21);
  const completedDaysCount = days.filter((d) => d.status === "completed").length;
  const completionPercentage = Math.min(100, Math.round((completedDaysCount / totalDays) * 100));

  const requiredTasks = tasks.filter((t) => t.required);
  const completedRequiredTasks = requiredTasks.filter((t) => t.status === "completed");

  const requiredTaskRatio =
    requiredTasks.length > 0 ? completedRequiredTasks.length / requiredTasks.length : 0;

  // Eligible if all days completed or at least 90% of all required tasks completed
  const isEligibleForCompletion =
    completedDaysCount >= totalDays ||
    (completedDaysCount >= totalDays - 1 && requiredTaskRatio >= 0.85);

  const totalFocusedMinutes = days.reduce(
    (sum, d) => sum + (Number(d.actualMinutes) || 0),
    0
  );

  const problemsSolvedCount = tasks.filter(
    (t) => t.entityType === "problem" && t.status === "completed"
  ).length;

  // Resolve current topic slug and look up next sequential curriculum topic
  const currentTopicSlug =
    days[0]?.topicSlug || (plan.snapshots?.estimatedScheduleSnapshot?.[0]?.topicSlug as string) || "arrays";

  const currentTopicIndex = CURRICULUM.findIndex((t) => t.slug === currentTopicSlug);
  const nextCurriculumTopic =
    currentTopicIndex >= 0 && currentTopicIndex < CURRICULUM.length - 1
      ? CURRICULUM[currentTopicIndex + 1]
      : CURRICULUM[0];

  const readinessSummary = isEligibleForCompletion
    ? `Cycle ${plan.cycleNumber || 1} completed! Practice coverage completed for ${days[0]?.topicName || "the current topic"}. Ready to advance to ${nextCurriculumTopic.name} (retention not yet assessed).`
    : `Cycle ${plan.cycleNumber || 1} is in progress (${completedDaysCount} of ${totalDays} days completed). Complete remaining sessions to advance to ${nextCurriculumTopic.name}.`;

  return {
    planId: String(plan._id || plan.id),
    cycleNumber: Number(plan.cycleNumber || 1),
    totalDays,
    completedDaysCount,
    completionPercentage,
    isEligibleForCompletion,
    totalFocusedMinutes,
    problemsSolvedCount,
    recommendedNextTopicSlug: nextCurriculumTopic.slug,
    recommendedNextTopicName: nextCurriculumTopic.name,
    readinessSummary,
  };
}

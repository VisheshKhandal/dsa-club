import type { DailyMilestone, LearningPhase } from "./milestone-phase.types";
import { getTopicLearningProfile } from "./topic-learning-profiles";
import type { PlannedTopicStage } from "./roadmap-preview.types";

export type MilestoneGenerationContext = {
  primaryStage: PlannedTopicStage;
  subsequentStages?: PlannedTopicStage[];
  experienceLevel?: "beginner" | "intermediate" | "advanced";
  dailyMinutes?: number;
  learningGoal?: string;
  targetCompanyLabel?: string;
};

/**
 * Generates 7 authentic, pedagogically structured daily milestones
 * tailored to the learner's actual starting topic and learning profile.
 */
export function generateWeeklyMilestones(ctx: MilestoneGenerationContext): DailyMilestone[] {
  const primaryProfile = getTopicLearningProfile(ctx.primaryStage.slug, ctx.primaryStage.name);
  const targetCompany = ctx.targetCompanyLabel;
  const milestones: DailyMilestone[] = [];

  // Check if primary topic spans the entire 7 days or if secondary topics are visited
  const primaryDaysCount = Math.min(6, ctx.primaryStage.plannedDays);

  // Day 1: Orientation & Invariants
  milestones.push({
    dayNumber: 1,
    dayLabel: "Day 1",
    topicName: primaryProfile.name,
    topicSlug: primaryProfile.slug,
    phase: "orientation",
    title: `Understand ${primaryProfile.coreConcepts[0] ?? "fundamentals"} and ${primaryProfile.coreConcepts[1] ?? "invariants"}`,
    focus: `Visual memory model and ${primaryProfile.name} mental foundations`,
    isFirstDay: true,
    isReviewOrCheckpoint: false,
  });

  // Day 2: Mechanics & Core Operations
  milestones.push({
    dayNumber: 2,
    dayLabel: "Day 2",
    topicName: primaryProfile.name,
    topicSlug: primaryProfile.slug,
    phase: "mechanics",
    title: `Master ${primaryProfile.operations[0] ?? "core operations"}`,
    focus: `Invariant maintenance and boundary condition handling in ${primaryProfile.name}`,
    isFirstDay: false,
    isReviewOrCheckpoint: false,
  });

  // Day 3: Pattern Recognition (Primary Pattern)
  milestones.push({
    dayNumber: 3,
    dayLabel: "Day 3",
    topicName: primaryProfile.name,
    topicSlug: primaryProfile.slug,
    phase: "pattern_recognition",
    title: `Recognize ${primaryProfile.patterns[0] ?? "core pattern"} conditions`,
    focus: `Identifying clues, triggers, and invariant states in ${primaryProfile.name}`,
    isFirstDay: false,
    isReviewOrCheckpoint: false,
  });

  // Day 4: Pattern Extension / Secondary Pattern or Bridge
  milestones.push({
    dayNumber: 4,
    dayLabel: "Day 4",
    topicName: primaryProfile.name,
    topicSlug: primaryProfile.slug,
    phase: "guided_practice",
    title: primaryProfile.patterns[1]
      ? `Apply ${primaryProfile.patterns[1]} reasoning`
      : `Connect ${primaryProfile.name} to ${primaryProfile.bridges[0] ?? "auxiliary techniques"}`,
    focus: primaryProfile.bridges[0]
      ? `Bridge ${primaryProfile.name} with ${primaryProfile.bridges[0]} for performance`
      : `Pattern variations and edge-case navigation`,
    isFirstDay: false,
    isReviewOrCheckpoint: false,
  });

  // Day 5: Independent / Targeted Practice
  milestones.push({
    dayNumber: 5,
    dayLabel: "Day 5",
    topicName: primaryProfile.name,
    topicSlug: primaryProfile.slug,
    phase: "independent_practice",
    title: targetCompany
      ? `Guided ${primaryProfile.name} practice (${targetCompany} focus)`
      : `Guided ${primaryProfile.name} pattern practice`,
    focus: `Targeted problem solving with hints and complexity analysis`,
    isFirstDay: false,
    isReviewOrCheckpoint: false,
  });

  // Day 6: Synthesis & Trade-offs
  milestones.push({
    dayNumber: 6,
    dayLabel: "Day 6",
    topicName: primaryProfile.name,
    topicSlug: primaryProfile.slug,
    phase: "synthesis",
    title: `Compare and select ${primaryProfile.name} patterns`,
    focus: `Technique trade-offs, space-time complexities, and anti-patterns`,
    isFirstDay: false,
    isReviewOrCheckpoint: false,
  });

  // Day 7: Spaced Repetition & Retention Checkpoint
  milestones.push({
    dayNumber: 7,
    dayLabel: "Day 7",
    topicName: primaryProfile.name,
    topicSlug: primaryProfile.slug,
    phase: "review",
    title: "Weekly retention checkpoint & flexible review",
    focus: primaryProfile.reviewFocus || "Active recall, review due queue, and buffer day",
    isFirstDay: false,
    isReviewOrCheckpoint: true,
  });

  return milestones;
}

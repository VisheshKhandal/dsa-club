import type { Types } from "mongoose";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type PreferredLanguage = "cpp" | "java" | "python" | "javascript";
export type LearningGoal = "internship" | "placement" | "switch" | "foundation" | "interview" | "not_sure";
export type DifficultyPreference = "adaptive" | "standard" | "challenging";
export type PlanStatus = "draft" | "active" | "paused" | "completed" | "archived";
export type PlanSource = "onboarding" | "customized" | "starter" | "recalibrated";

export type PlanDayStatus = "locked" | "available" | "in_progress" | "completed" | "missed" | "deferred";
export type PlanDayPhase =
  | "orientation"
  | "mechanics"
  | "pattern_recognition"
  | "guided_practice"
  | "independent_practice"
  | "synthesis"
  | "review";

export type PlanTaskStatus = "pending" | "in_progress" | "completed" | "skipped" | "unavailable";
export type PlanRelation =
  | "planned_today"
  | "plan_revision"
  | "plan_recovery"
  | "plan_extension"
  | "outside_plan";

export interface PausePeriod {
  startedAt: Date;
  endedAt?: Date;
  reason?: "break" | "exam" | "vacation" | "manual";
}

export interface PlannerInput {
  experienceLevel: ExperienceLevel;
  companySlugs: string[];
  customCompany?: string;
  dailyMinutes: number;
  language: PreferredLanguage;
  focusTopicSlugs?: string[];
  primaryTopicSlug?: string;
  knownTopicSlugs?: string[];
  learningGoal: LearningGoal;
  difficultyPreference?: DifficultyPreference;
  dailyProblems?: number;
  timezone?: string;
  studyDaysPerWeek?: number;
  availableDaysOfWeek?: number[];
  targetInterviewDate?: string;
  catchUpPreference?: "rebalance_forward" | "accelerate" | "buffer_day";
  unavailableDates?: string[];
}

export interface AvailabilityResult {
  status: "ready" | "partial_content" | "content_unavailable" | "blocked_by_prerequisite";
  topicId?: string;
  topicSlug: string;
  topicName: string;
  availableMissionsCount: number;
  availableProblemsCount: number;
  prerequisiteGaps: Array<{ slug: string; name: string }>;
  userActionOptions: Array<{ key: string; label: string; description: string }>;
}

export interface DayBlueprint {
  dayIndex: number;
  title: string;
  focus: string;
  phase: PlanDayPhase;
  topicSlug: string;
  topicName: string;
  plannedMinutes: number;
  isFirstDay: boolean;
  isReviewOrCheckpoint: boolean;
  suggestedActivities: Array<{
    taskKey: string;
    entityType: "mission" | "problem" | "pattern" | "revision" | "reflection" | "checkpoint";
    title: string;
    phase: "learn" | "practice" | "revise" | "reflect" | "checkpoint";
    required: boolean;
    estimatedMinutes: number;
    reflectionPrompt?: string;
  }>;
}

export interface PlanBlueprint {
  primaryTopicSlug: string;
  focusTopicSlugs: string[];
  totalDays: number;
  cycleNumber: number;
  dailyMinutes: number;
  weeklySchedule?: DayBlueprint[];
  estimatedSchedule: DayBlueprint[];
  stages: Array<{
    slug: string;
    name: string;
    order: number;
    difficulty: "easy" | "medium" | "hard";
    estimatedMinutes: number;
    plannedDays: number;
    startDay: number;
    endDay: number;
  }>;
}

export interface SemanticProgressMetrics {
  snapshotVersion: 2;
  cyclePacePercent: number;
  currentDayIndex: number;
  totalDays: number;
  todayTaskCompletionPercent: number;
  todayTasksCount: number;
  todayCompletedTasksCount: number;
  isDayComplete: boolean;
  cycleTaskCompletionPercent: number;
  cycleTasksCount: number;
  cycleCompletedTasksCount: number;
  masteryPercent: number;
  topicConfidenceScore: number;
  topicState: "unseen" | "learning" | "revising" | "solid" | "mastered";
  topicDisplayState: "not_assessed" | "in_progress" | "mastered";
  provenance?: {
    paceSource: "schedule_position";
    todaySource: "today_tasks";
    cycleSource: "cycle_tasks";
    masterySource: "topic_evidence" | "legacy_migration";
    masteryScoreDirect?: number;
    confidenceScoreDirect?: number;
    planDayIndex?: number;
    totalDays?: number;
  };
}

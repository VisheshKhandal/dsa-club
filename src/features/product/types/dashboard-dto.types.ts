/**
 * Canonical typed Dashboard DTO contract.
 *
 * Defines the single authoritative data contract for the DSA Club dashboard body.
 * Strictly separates:
 * - Actual learner evidence (verified problem solves, stopwatch study sessions, completed reviews)
 * - Schedule metadata (plan days, total days, stages)
 * - Estimates (explicitly labeled with isEstimate: true)
 * - Missing/unsupported states (represented as null/empty rather than invented defaults)
 */

export type PrimaryActionType =
  | "problem"
  | "mission"
  | "revision"
  | "reflection"
  | "checkpoint"
  | "learn"
  | "setup";

export type PrimaryActionProvenance =
  | "in_progress_task"
  | "in_flight_draft"
  | "active_session"
  | "required_plan_task"
  | "due_review"
  | "optional_plan_task"
  | "self_paced_recommendation"
  | "roadmap_continuity"
  | "setup";

export type PrimaryActionCtaState =
  | "start"
  | "resume"
  | "day_complete"
  | "paused"
  | "setup";

export interface DashboardPrimaryAction {
  id: string;
  actionKey: string;
  type: PrimaryActionType;
  title: string;
  href: string;
  topicName: string;
  topicSlug: string;
  isCrossTopic: boolean;
  relationshipLabel: string | null;
  estimatedDurationMinutes: number;
  isDurationEstimate: true;
  reason: string;
  sourceProvenance: PrimaryActionProvenance;
  afterCompletionOutcome: string;
  ctaLabel: string;
  ctaState: PrimaryActionCtaState;
  planDayIndex?: number;
  taskId?: string;
  entityId?: string | null;
  entityType?: string;
  timeBudgetExceeded?: boolean;
  timeBudgetAvailableMinutes?: number;
  timeBudgetAlternative?: {
    title: string;
    href: string;
    estimatedMinutes: number;
    reason: string;
  } | null;
  reasonCodes?: string[];
}

export interface DashboardSecondaryAction {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  type: "session" | "problem" | "mission" | "review";
  lastActiveAt?: string;
  provenance: "draft_attempt" | "active_session" | "due_review";
  isTimeBudgetAlternative?: boolean;
}

export interface PlanStageSpineNode {
  id: string;
  title: string;
  dayIndex: number;
  status: "completed" | "current" | "upcoming";
  isCheckpoint: boolean;
}

export interface DashboardActivePlan {
  id: string;
  status: "active" | "paused" | "completed" | "archived";
  cycleNumber: number;
  totalDays: number;
  currentDayIndex: number;
  dayTitle: string;
  dayFocus: string;
  topicName: string;
  topicSlug: string;
  targetDailyMinutes: number;
  tasksCount: number;
  completedTasksCount: number;
  isDayComplete: boolean;
  /** Real progression stages from plan blueprint. Empty array if unsupported. */
  stages: PlanStageSpineNode[];
}

export interface DashboardReviewQueueItem {
  id: string;
  entityType: string;
  conceptName: string;
  detail: string;
  href: string;
  estimatedMinutes: number;
  priority: number;
  dueAt: string;
}

export interface DashboardReviewQueue {
  dueCount: number;
  estimatedTotalMinutes: number;
  items: DashboardReviewQueueItem[];
  isClear: boolean;
}

export interface DashboardTopicEvidence {
  topicName: string;
  topicSlug: string;
  /** Actual verified solves in the active topic. null if no topic-scoped solves exist. */
  topicSolvedCount: number | null;
  /** Actual topic mastery percentage. null if unassessed. */
  topicMasteryPercent: number | null;
  hasVerifiedEvidence: boolean;
  /** Real checkpoint data. null if today/cycle has no active checkpoint. */
  checkpoint: {
    title: string;
    focus: string;
    isCheckpointDay: boolean;
    dayIndex: number;
  } | null;
  hasRealCheckpoint: boolean;
  focusAreas: Array<{
    name: string;
    slug: string;
    href: string;
    mastery: number;
  }>;
  /** Explainable rubric & evidence provenance */
  evidenceLabel?: string;
  evidenceExplanation?: string;
  isFullMastery?: boolean;
  missionsCompletedCount?: number;
  missionsTotalCount?: number;
  formulaVersion?: string;
}

export interface DailyActivityPoint {
  date: string;
  dateKey: string;
  dayOfWeek: number;
  actualMinutes: number;
  /** Legacy mapped alias for consumers expecting minutes */
  minutes: number;
  problemsSolved: number;
  problemsAttempted: number;
  revisionsDone: number;
  missionsCompleted?: number;
  activityScore: number;
}

export interface DashboardActivityMetrics {
  todayFocusedMinutes: number;
  todayTargetMinutes: number;
  todaySolvesCount: number;
  todayAttemptsCount: number;
  todayMissionsCount?: number;
  currentStreakDays: number;
  bestStreakDays: number;
  totalActiveDays: number;
  totalFocusedHours: number;
  totalSolvedProblems: number;
  activityHistory: DailyActivityPoint[];
}

export interface DashboardInterviewContext {
  isImminent: boolean;
  daysRemaining: number;
  companyName: string | null;
  companySlug: string | null;
}

export interface DashboardBonusChallenge {
  id: string;
  title: string;
  slug: string;
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number;
  reason?: string;
  href: string;
  patterns?: string[];
}

export interface DashboardDTO {
  version: 2;
  learner: {
    name: string;
    firstName: string;
    onboardingStatus: "completed" | "skipped" | "in_progress";
    roadmapSource: "starter" | "customized" | "onboarding";
  };
  contextStatusText: string;
  learningMode?: "plan_led" | "self_paced";
  activePlan: DashboardActivePlan | null;
  primaryAction: DashboardPrimaryAction;
  secondaryAction: DashboardSecondaryAction | null;
  reviewQueue: DashboardReviewQueue;
  topicEvidence: DashboardTopicEvidence;
  activityMetrics: DashboardActivityMetrics;
  interviewContext: DashboardInterviewContext | null;
  bonusChallenge?: DashboardBonusChallenge | null;
}

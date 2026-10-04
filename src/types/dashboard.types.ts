export interface NextSessionData {
  id?: string;
  planId?: string;
  topicId?: string;
  topicName: string;
  topicSlug: string;
  planDay: number;
  totalDays: number;
  cycleNumber: number;
  title: string;
  subtitle?: string;
  whyThisIsNext: string;
  afterCompletionOutcome?: string;
  estimatedMinutes: number;
  status: "not_started" | "in_progress" | "review_due" | "retry" | "blocked" | "completed";
  primaryAction: {
    label: string;
    href: string;
  };
  sessionProgress: {
    completedTasks: number;
    totalTasks: number;
  };
  planRelation?: "planned_today" | "plan_revision" | "plan_recovery" | "plan_extension" | "outside_plan";
}

export interface PlanSpineStage {
  id: string;
  label: string;
  shortLabel?: string;
  state: "completed" | "current" | "upcoming";
  isCheckpoint?: boolean;
  dayNumber?: number;
  href?: string;
}

export interface PlanSpineData {
  planTitle: string;
  currentDay: number;
  totalDays: number;
  stages: PlanSpineStage[];
  checkpointSummary?: string;
  planHref: string;
}

export interface ReviewQueueItem {
  id: string;
  conceptName: string;
  itemType?: string;
  difficulty?: "easy" | "medium" | "hard";
  estimatedMinutes: number;
  href: string;
  priority?: number;
  reason?: string;
  dueAt?: string;
}

export interface GoalCheckpointData {
  planId?: string;
  topicName: string;
  checkpointTitle: string;
  checkpointDescription: string;
  patternsReliableCount: number;
  patternsTotalCount: number;
  recentEvidence: {
    solvesCycle: number;
    reviewsCycle: number;
    retriesCycle: number;
  };
  checkpointHref: string;
  actionLabel: string;
}

export interface ActivityHistoryDay {
  date: string;
  dateKey: string;
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  minutes: number;
  problemsSolved: number;
  problemsAttempted: number;
  revisionsDone: number;
  activityScore: number;
}

export interface ConsistencySummaryData {
  windowDays: number;
  activeDaysCount: number;
  totalMinutes: number;
  totalSolved: number;
  currentStreak: number;
  bestStreak: number;
  activityHistory: ActivityHistoryDay[];
}

export interface ProgressProofData {
  currentPath: string;
  planProgressText: string;
  sessionsThisWeek: number;
  dueReviewsCount: number;
  streak: number;
  bestStreak: number;
  readinessScore: number;
  readinessLabel: "Building" | "Practicing" | "Strong";
}

export interface AlternativeRouteItem {
  id: string;
  label: string;
  description: string;
  href: string;
  iconName: "compass" | "search" | "shuffle" | "refresh" | "bookOpen";
}

export interface DashboardCockpitModel {
  user: {
    name?: string;
    email?: string;
  };
  contextSentence: string;
  activePlan: any | null;
  nextSession: NextSessionData;
  planSpine: PlanSpineData;
  reviewQueue: {
    dueItems: ReviewQueueItem[];
    totalDueCount: number;
    totalMinutes: number;
  };
  goalCheckpoint: GoalCheckpointData;
  progressProof: ProgressProofData;
  consistency: ConsistencySummaryData;
  alternativeRoutes: AlternativeRouteItem[];
}

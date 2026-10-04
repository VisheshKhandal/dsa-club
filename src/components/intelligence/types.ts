export interface IntelligenceViewProps {
  plan: {
    id: string;
    status: "draft" | "active" | "paused" | "completed" | "archived";
    source: string;
    cycleNumber: number;
    totalDays: number;
    startDate: string;
    targetCompletionDate?: string | null;
    goal: string;
    experienceLevel: string;
    language: string;
    dailyMinutes: number;
    difficultyPreference: string;
    timezone: string;
    pausedDaysCount: number;
    cyclePacePercent?: number;
    todayTaskCompletionPercent?: number;
    cycleTaskCompletionPercent?: number;
    masteryPercent?: number;
    topicConfidenceScore?: number;
    topicDisplayState?: "not_assessed" | "in_progress" | "mastered";
    snapshots?: {
      availabilitySnapshot?: {
        status: string;
        availableMissionsCount: number;
        availableProblemsCount: number;
      };
      estimatedScheduleSnapshot?: Array<{
        dayIndex: number;
        title: string;
        focus: string;
        phase: string;
      }>;
    };
  } | null;
  days: Array<{
    id: string;
    dayIndex: number;
    dateKey: string;
    status: "locked" | "available" | "in_progress" | "completed" | "missed" | "deferred";
    phase: string;
    title: string;
    focus: string;
    topicSlug: string;
    topicName: string;
    targetMinutes: number;
    actualMinutes: number;
    isBufferDay: boolean;
    isCheckpointDay: boolean;
  }>;
  tasks: Array<{
    id: string;
    planDayId: string;
    dayIndex: number;
    taskKey: string;
    title: string;
    phase: string;
    entityType: string;
    entityId?: string | null;
    topicId?: string | null;
    topicSlug?: string | null;
    topicName?: string | null;
    topicAlignment?: "aligned" | "cross_topic_bridge" | "mismatched" | "unavailable";
    order: number;
    required: boolean;
    estimatedMinutes: number;
    status: "pending" | "in_progress" | "completed" | "skipped" | "unavailable";
    planRelation: string;
    targetUrl?: string | null;
    reflectionPrompt?: string | null;
  }>;
  decisions: Array<{
    id: string;
    surface: string;
    decisionType: string;
    selectedAction: {
      actionKey: string;
      title: string;
      targetUrl: string;
      estimatedMinutes: number;
    };
    primaryReason: string;
    secondaryReasons: string[];
    createdAt: string;
  }>;
  initialTab?: "overview" | "today" | "week" | "manage";
  stats?: {
    currentStreakDays: number;
    totalFocusedMinutes: number;
    solvedProblems: number;
  };
  snapshot?: any;
  topicProblems?: Array<{
    id: string;
    slug: string;
    title: string;
    difficulty: string;
    patterns: string[];
    companies: string[];
    estimatedMinutes: number;
    isSolved: boolean;
  }>;
  activeTopicName?: string;
  activeTopicSlug?: string;
  completedDaysCount?: number;
}

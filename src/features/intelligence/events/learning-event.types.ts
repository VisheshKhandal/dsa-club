import type { Types } from "mongoose";

/**
 * All canonical learning event types across the learner lifecycle.
 * In Phase 2, events are immutable facts that record what actually happened.
 */
export const LEARNING_EVENT_TYPES = [
  // 1. Task Lifecycle
  "task_started",
  "task_completed",
  "task_skipped",

  // 2. Problem Solving & Scaffolding
  "problem_attempted",
  "hint_requested",
  "hint_revealed",

  // 3. Metacognition & Self-Evaluation
  "pattern_prediction_submitted",
  "confidence_submitted",
  "reflection_submitted",

  // 4. Spaced Review & Retention
  "review_started",
  "review_completed",
  "transfer_attempt_completed",
  "checkpoint_attempted",

  // 5. Plan Lifecycle
  "plan_created",
  "plan_activated",
  "plan_paused",
  "plan_resumed",
  "plan_recalibrated",

  // 6. Focus Sessions
  "session_started",
  "session_completed",
] as const;

export type LearningEventType = (typeof LEARNING_EVENT_TYPES)[number];

export type LearningEventSource = "browser" | "server" | "system" | "migration";

/**
 * Type-safe payload mappings for every LearningEventType.
 * Ensures compile-time safety when emitting or reducing events.
 */
export interface LearningEventPayloadMap {
  task_started: {
    sourceSurface?: "dashboard" | "today_board" | "workspace" | "recovery_prompt";
    resumed?: boolean;
  };
  task_completed: {
    minutesSpent: number;
    independentSolve: boolean;
    hintsUsed?: number;
    score?: number;
    passed?: boolean;
    reflectionAnswer?: string;
    problemAttemptId?: string;
    missionSubmissionId?: string;
  };
  task_skipped: {
    reason: string;
    unavailable?: boolean;
  };
  problem_attempted: {
    attemptNumber: number;
    passed: boolean;
    testCasesPassed?: number;
    totalTestCases?: number;
    language?: string;
    codeLengthBytes?: number;
    executionTimeMs?: number;
    minutesSpent?: number;
    strategy?: string;
    hintsUsed?: number;
    selfConfidence?: number;
  };
  hint_requested: {
    hintLevel: number; // 1 = Conceptual Nudge, 2 = Pattern Approach, 3 = Pseudo-code / Code snippet
    category?: "algorithm" | "edge_case" | "syntax" | "optimization";
    secondsSinceTaskStart?: number;
  };
  hint_revealed: {
    hintLevel: number;
    hintId?: string;
    totalHintsRevealed?: number;
  };
  pattern_prediction_submitted: {
    predictedPatternSlug: string;
    actualPatternSlug?: string;
    isCorrect?: boolean;
    confidence: 1 | 2 | 3 | 4 | 5;
    secondsBeforeAttempt?: number;
  };
  confidence_submitted: {
    timing: "pre_attempt" | "post_attempt" | "review";
    confidenceScore: 1 | 2 | 3 | 4 | 5;
    perceivedDifficulty?: "easy" | "fair" | "hard" | "brutal";
  };
  reflection_submitted: {
    confidenceLevel?: 1 | 2 | 3 | 4 | 5;
    keyTakeaway: string;
    mistakeIdentified?: string;
    invariantExplained?: string;
    needsFollowupReview?: boolean;
  };
  review_started: {
    reviewIntervalDays: number;
    isOverdue: boolean;
  };
  review_completed: {
    grade: number; // 0 to 5 (SuperMemo / spaced repetition grade)
    responseSeconds: number;
    recalledSuccessfully: boolean;
    nextIntervalDays: number;
    reviewAttemptId?: string;
    topicSlug?: string;
    assisted?: boolean;
    hintsUsed?: number;
  };
  transfer_attempt_completed: {
    parentProblemId?: string;
    transferProblemId: string;
    passed: boolean;
    independentSolve: boolean;
    minutesSpent: number;
  };
  checkpoint_attempted: {
    itemKey: string;
    itemVersion?: string;
    capability: string;
    isCorrect: boolean;
    score: number;
    itemType: string;
    reviewStatus: string;
    isProvisional: boolean;
    demonstratedIndependence?: boolean;
  };
  plan_created: {
    goal: string;
    totalDays: number;
    primaryTopicSlug?: string;
  };
  plan_activated: {
    cycleNumber?: number;
    activationKey?: string;
    source?: string;
    totalDays?: number;
    dailyMinutes?: number;
  };
  plan_paused: {
    reason: string;
  };
  plan_resumed: {
    pausedDaysDuration: number;
  };
  plan_recalibrated: {
    previousDayIndex: number;
    newDayIndex: number;
    recalibrationReason: string;
  };
  session_started: {
    plannedMinutes?: number;
  };
  session_completed: {
    plannedMinutes?: number;
    focusedSeconds?: number;
    actualMinutes?: number;
  };
}

/**
 * Generic shape of an in-memory or persisted LearningEvent.
 */
export interface ILearningEvent<T extends LearningEventType = LearningEventType> {
  _id?: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  eventType: T;
  occurredAt: Date;
  occurredAtTimezone: string;
  receivedAt?: Date;
  learningEpoch?: number;
  idempotencyKey: string;
  schemaVersion: number;
  source: LearningEventSource;
  correlationId?: string | null;

  // Contextual references
  planId?: Types.ObjectId | string | null;
  planDayId?: Types.ObjectId | string | null;
  planTaskId?: Types.ObjectId | string | null;
  topicId?: Types.ObjectId | string | null;
  topicSlug?: string | null;
  problemId?: Types.ObjectId | string | null;
  missionId?: Types.ObjectId | string | null;
  sessionId?: string | null;

  // Structured payload
  payload: T extends keyof LearningEventPayloadMap ? LearningEventPayloadMap[T] : Record<string, unknown>;
}

/**
 * Data Transfer Object for creating a new LearningEvent.
 */
export interface CreateLearningEventDTO<T extends LearningEventType = LearningEventType> {
  userId: string | Types.ObjectId;
  learningEpoch?: number;
  eventType: T;
  idempotencyKey: string;
  occurredAt?: Date;
  occurredAtTimezone?: string;
  source?: LearningEventSource;
  correlationId?: string;

  // Optional contextual references
  planId?: string | Types.ObjectId | null;
  planDayId?: string | Types.ObjectId | null;
  planTaskId?: string | Types.ObjectId | null;
  topicId?: string | Types.ObjectId | null;
  topicSlug?: string | null;
  problemId?: string | Types.ObjectId | null;
  missionId?: string | Types.ObjectId | null;
  sessionId?: string | null;

  // Payload for this specific event type
  payload: T extends keyof LearningEventPayloadMap ? LearningEventPayloadMap[T] : Record<string, unknown>;
}

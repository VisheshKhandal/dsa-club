/**
 * TaskEvidenceState
 *
 * Deterministic evidence state accumulated across all events for a specific plan task.
 * Computed purely from the event stream:
 * reduce(previousState, event) => nextState
 */
export interface TaskEvidenceState {
  entityId?: string;
  planTaskId: string;
  status: "not_started" | "in_progress" | "completed" | "skipped";
  startedAt: Date | null;
  completedAt: Date | null;
  skippedAt: Date | null;

  // Time metrics
  totalMinutesSpent: number;

  // Problem-solving mechanics
  attemptCount: number;
  successfulAttempts: number;
  failedAttempts: number;

  // Scaffolding & Hints
  hintCount: number;
  highestHintLevel: number;
  hintsRevealed: number[];
  independentSolve: boolean;

  // Metacognition & Self-Evaluation
  preConfidence: number | null;
  postConfidence: number | null;
  reflectionAnswer: string | null;
  reflectionTakeaway: string | null;

  patternPrediction: {
    predicted: string | null;
    actual: string | null;
    isCorrect: boolean | null;
    confidence: number | null;
  } | null;

  // Audit and replay tracking
  lastEventId: string | null;
  lastEventType: string | null;
  lastEventOccurredAt: Date | null;
  processedEventCount: number;
}

import type { ILearningEvent } from "../events/learning-event.types";
import type { TaskEvidenceState } from "./task-evidence.types";

/**
 * Creates a clean baseline TaskEvidenceState for a specific task.
 */
export function createInitialTaskEvidenceState(
  entityId: string,
  planTaskId?: string
): TaskEvidenceState {
  return {
    entityId,
    planTaskId: planTaskId ?? entityId,
    status: "not_started",
    startedAt: null,
    completedAt: null,
    skippedAt: null,
    totalMinutesSpent: 0,
    attemptCount: 0,
    successfulAttempts: 0,
    failedAttempts: 0,
    hintCount: 0,
    highestHintLevel: 0,
    hintsRevealed: [],
    independentSolve: true, // Optimistically true until hints or external help are used
    preConfidence: null,
    postConfidence: null,
    reflectionAnswer: null,
    reflectionTakeaway: null,
    patternPrediction: null,
    lastEventId: null,
    lastEventType: null,
    lastEventOccurredAt: null,
    processedEventCount: 0,
  };
}

/**
 * Pure reducer function for task evidence.
 *
 * Guaranteed Properties:
 * 1. 100% Deterministic: Same (state, event) always produces identical output.
 * 2. Pure: No side effects, no mutations, no database access, no network calls.
 * 3. Immutable: Always returns a new state object.
 */
export function reduceTaskEvidence(
  state: TaskEvidenceState,
  event: ILearningEvent<any>
): TaskEvidenceState {
  const occurredAt = new Date(event.occurredAt);
  const next: TaskEvidenceState = {
    ...state,
    hintsRevealed: [...state.hintsRevealed],
    patternPrediction: state.patternPrediction ? { ...state.patternPrediction } : null,
    lastEventId: String(event._id ?? event.idempotencyKey ?? "evt"),
    lastEventType: event.eventType,
    lastEventOccurredAt: occurredAt,
    processedEventCount: state.processedEventCount + 1,
  };

  switch (event.eventType) {
    case "task_started": {
      if (next.status === "not_started") {
        next.status = "in_progress";
      }
      if (!next.startedAt) {
        next.startedAt = occurredAt;
      }
      break;
    }

    case "problem_attempted": {
      next.attemptCount += 1;
      const passed = Boolean(event.payload?.passed);
      if (passed) {
        next.successfulAttempts += 1;
      } else {
        next.failedAttempts += 1;
      }
      if (next.status === "not_started") {
        next.status = "in_progress";
      }
      if (!next.startedAt) {
        next.startedAt = occurredAt;
      }
      break;
    }

    case "hint_requested":
    case "hint_revealed": {
      const hintLevel = Number(event.payload?.hintLevel ?? 1);
      if (!next.hintsRevealed.includes(hintLevel)) {
        next.hintsRevealed.push(hintLevel);
        next.hintsRevealed.sort((a, b) => a - b);
      }
      // Single consistent counting rule: hintCount strictly tracks unique hint levels used
      // eliminating double-counting between hint_revealed and hint_requested
      next.hintCount = next.hintsRevealed.length;
      next.highestHintLevel = Math.max(next.highestHintLevel, hintLevel);
      // Critical invariant: Once a hint is requested/revealed, independentSolve is permanently disqualified
      next.independentSolve = false;
      if (next.status === "not_started") {
        next.status = "in_progress";
      }
      break;
    }

    case "pattern_prediction_submitted": {
      next.patternPrediction = {
        predicted: String(event.payload?.predictedPatternSlug ?? null),
        actual: event.payload?.actualPatternSlug ? String(event.payload.actualPatternSlug) : null,
        isCorrect: typeof event.payload?.isCorrect === "boolean" ? event.payload.isCorrect : null,
        confidence: Number(event.payload?.confidence ?? null),
      };
      break;
    }

    case "confidence_submitted": {
      const timing = event.payload?.timing;
      const score = Number(event.payload?.confidenceScore ?? 0);
      if (timing === "pre_attempt") {
        next.preConfidence = score;
      } else {
        next.postConfidence = score;
      }
      break;
    }

    case "reflection_submitted": {
      if (event.payload?.keyTakeaway) {
        next.reflectionTakeaway = String(event.payload.keyTakeaway);
      }
      if (event.payload?.confidenceLevel) {
        next.postConfidence = Number(event.payload.confidenceLevel);
      }
      break;
    }

    case "task_completed": {
      next.status = "completed";
      next.completedAt = occurredAt;
      const minutes = Number(event.payload?.minutesSpent ?? 0);
      next.totalMinutesSpent += minutes;

      // Independent solve requires NO hints were used AND explicit completion payload confirmed it
      const payloadIndependent = event.payload?.independentSolve !== false;
      next.independentSolve = next.hintCount === 0 && payloadIndependent;

      if (event.payload?.reflectionAnswer) {
        next.reflectionAnswer = String(event.payload.reflectionAnswer);
      }
      break;
    }

    case "task_skipped": {
      next.status = "skipped";
      next.skippedAt = occurredAt;
      if (event.payload?.reason) {
        next.reflectionAnswer = String(event.payload.reason);
      }
      break;
    }

    default:
      // Other events (e.g. plan lifecycle events) do not alter task-level evidence
      break;
  }

  return next;
}

/**
 * Replays an entire stream of events for a task chronologically to rebuild
 * the current TaskEvidenceState from first principles.
 */
export function reduceTaskEvidenceStream(
  events: ILearningEvent<any>[],
  initialState?: TaskEvidenceState
): TaskEvidenceState {
  if (!events || events.length === 0) {
    return initialState ?? createInitialTaskEvidenceState("unknown");
  }

  // 1. Determine task ID
  const firstTaskId =
    events.find((e) => e.planTaskId)?.planTaskId?.toString() ??
    initialState?.planTaskId ??
    "unknown";

  const baseline = initialState ?? createInitialTaskEvidenceState(firstTaskId);

  // 2. Sort chronologically by occurredAt, using _id as stable tie-breaker
  const sorted = [...events].sort((a, b) => {
    const diff = new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
    if (diff !== 0) return diff;
    return String(a._id ?? a.idempotencyKey).localeCompare(String(b._id ?? b.idempotencyKey));
  });

  // 3. Fold over all events
  return sorted.reduce<TaskEvidenceState>((state, event) => {
    return reduceTaskEvidence(state, event);
  }, baseline);
}

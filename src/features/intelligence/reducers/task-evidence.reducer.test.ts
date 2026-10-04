import { describe, expect, it } from "vitest";
import {
  createInitialTaskEvidenceState,
  reduceTaskEvidence,
  reduceTaskEvidenceStream,
} from "./task-evidence.reducer";
import type { ILearningEvent } from "../events/learning-event.types";

describe("Module 4: Pure Task Evidence Reducer", () => {
  const taskId = "task-linked-list-1";
  const userId = "user-123";

  // Helper to build typed event mock
  function buildMockEvent(
    eventType: any,
    occurredAt: string,
    payload: any = {},
    idempotencyKey = `evt-${Date.now()}`
  ): ILearningEvent<any> {
    return {
      userId,
      planTaskId: taskId,
      eventType,
      occurredAt: new Date(occurredAt),
      occurredAtTimezone: "UTC",
      receivedAt: new Date(),
      idempotencyKey,
      schemaVersion: 1,
      source: "browser",
      payload,
    };
  }

  // ── 1. INITIAL STATE FACTORY ──
  it("creates a clean baseline TaskEvidenceState with optimistic independentSolve", () => {
    const state = createInitialTaskEvidenceState(taskId);

    expect(state.planTaskId).toBe(taskId);
    expect(state.status).toBe("not_started");
    expect(state.startedAt).toBeNull();
    expect(state.completedAt).toBeNull();
    expect(state.totalMinutesSpent).toBe(0);
    expect(state.attemptCount).toBe(0);
    expect(state.hintCount).toBe(0);
    expect(state.independentSolve).toBe(true);
    expect(state.processedEventCount).toBe(0);
  });

  // ── 2. STATE TRANSITIONS ──
  it("transitions status to in_progress on task_started", () => {
    const initial = createInitialTaskEvidenceState(taskId);
    const event = buildMockEvent("task_started", "2026-09-28T10:00:00Z");

    const state = reduceTaskEvidence(initial, event);

    expect(state.status).toBe("in_progress");
    expect(state.startedAt?.toISOString()).toBe("2026-09-28T10:00:00.000Z");
    expect(state.processedEventCount).toBe(1);
    expect(state.lastEventType).toBe("task_started");
  });

  it("increments attempt counts accurately on problem_attempted", () => {
    const initial = createInitialTaskEvidenceState(taskId);

    const failEvent = buildMockEvent("problem_attempted", "2026-09-28T10:05:00Z", {
      passed: false,
      attemptNumber: 1,
    });
    const state1 = reduceTaskEvidence(initial, failEvent);
    expect(state1.attemptCount).toBe(1);
    expect(state1.failedAttempts).toBe(1);
    expect(state1.successfulAttempts).toBe(0);

    const passEvent = buildMockEvent("problem_attempted", "2026-09-28T10:12:00Z", {
      passed: true,
      attemptNumber: 2,
    });
    const state2 = reduceTaskEvidence(state1, passEvent);
    expect(state2.attemptCount).toBe(2);
    expect(state2.failedAttempts).toBe(1);
    expect(state2.successfulAttempts).toBe(1);
  });

  it("permanently marks independentSolve: false when a hint is requested", () => {
    const initial = createInitialTaskEvidenceState(taskId);

    const hint1 = buildMockEvent("hint_requested", "2026-09-28T10:06:00Z", {
      hintLevel: 1,
    });
    const state1 = reduceTaskEvidence(initial, hint1);
    expect(state1.hintCount).toBe(1);
    expect(state1.highestHintLevel).toBe(1);
    expect(state1.hintsRevealed).toEqual([1]);
    expect(state1.independentSolve).toBe(false);

    const hint2 = buildMockEvent("hint_requested", "2026-09-28T10:08:00Z", {
      hintLevel: 2,
    });
    const state2 = reduceTaskEvidence(state1, hint2);
    expect(state2.hintCount).toBe(2);
    expect(state2.highestHintLevel).toBe(2);
    expect(state2.hintsRevealed).toEqual([1, 2]);
    expect(state2.independentSolve).toBe(false);
  });

  it("records pattern prediction and confidence metrics", () => {
    const initial = createInitialTaskEvidenceState(taskId);

    const predEvent = buildMockEvent("pattern_prediction_submitted", "2026-09-28T10:02:00Z", {
      predictedPatternSlug: "fast-slow-pointers",
      actualPatternSlug: "fast-slow-pointers",
      isCorrect: true,
      confidence: 4,
    });
    const state1 = reduceTaskEvidence(initial, predEvent);
    expect(state1.patternPrediction).toEqual({
      predicted: "fast-slow-pointers",
      actual: "fast-slow-pointers",
      isCorrect: true,
      confidence: 4,
    });

    const confEvent = buildMockEvent("confidence_submitted", "2026-09-28T10:03:00Z", {
      timing: "pre_attempt",
      confidenceScore: 3,
    });
    const state2 = reduceTaskEvidence(state1, confEvent);
    expect(state2.preConfidence).toBe(3);
  });

  it("completes task with independent solve preserved when NO hints were used", () => {
    const initial = createInitialTaskEvidenceState(taskId);
    const start = buildMockEvent("task_started", "2026-09-28T10:00:00Z");
    const complete = buildMockEvent("task_completed", "2026-09-28T10:20:00Z", {
      minutesSpent: 20,
      independentSolve: true,
      reflectionAnswer: "Completed without hints.",
    });

    const state = reduceTaskEvidenceStream([start, complete], initial);
    expect(state.status).toBe("completed");
    expect(state.totalMinutesSpent).toBe(20);
    expect(state.independentSolve).toBe(true);
    expect(state.completedAt?.toISOString()).toBe("2026-09-28T10:20:00.000Z");
    expect(state.reflectionAnswer).toBe("Completed without hints.");
  });

  // ── 3. FULL CHRONOLOGICAL STREAM REPLAY ──
  it("accurately folds a full lifecycle event stream into complete evidence state", () => {
    const events: ILearningEvent<any>[] = [
      buildMockEvent("task_started", "2026-09-28T10:00:00Z"),
      buildMockEvent("pattern_prediction_submitted", "2026-09-28T10:02:00Z", {
        predictedPatternSlug: "two-pointers",
        isCorrect: true,
        confidence: 4,
      }),
      buildMockEvent("problem_attempted", "2026-09-28T10:08:00Z", { passed: false }),
      buildMockEvent("hint_requested", "2026-09-28T10:10:00Z", { hintLevel: 1 }),
      buildMockEvent("problem_attempted", "2026-09-28T10:18:00Z", { passed: true }),
      buildMockEvent("task_completed", "2026-09-28T10:20:00Z", {
        minutesSpent: 20,
        independentSolve: false, // Hint was used
      }),
      buildMockEvent("reflection_submitted", "2026-09-28T10:22:00Z", {
        keyTakeaway: "Pointer bounds must be strictly checked before moving.",
        confidenceLevel: 5,
      }),
    ];

    const result = reduceTaskEvidenceStream(events);

    expect(result.status).toBe("completed");
    expect(result.totalMinutesSpent).toBe(20);
    expect(result.attemptCount).toBe(2);
    expect(result.failedAttempts).toBe(1);
    expect(result.successfulAttempts).toBe(1);
    expect(result.hintCount).toBe(1);
    expect(result.highestHintLevel).toBe(1);
    expect(result.independentSolve).toBe(false);
    expect(result.patternPrediction?.predicted).toBe("two-pointers");
    expect(result.postConfidence).toBe(5);
    expect(result.reflectionTakeaway).toBe("Pointer bounds must be strictly checked before moving.");
    expect(result.processedEventCount).toBe(7);
  });

  // ── 4. DETERMINISM & SHUFFLED REPLAY TEST ──
  it("produces 100% identical state regardless of incoming array order by auto-sorting chronologically", () => {
    const e1 = buildMockEvent("task_started", "2026-09-28T10:00:00Z");
    const e2 = buildMockEvent("hint_requested", "2026-09-28T10:05:00Z", { hintLevel: 1 });
    const e3 = buildMockEvent("problem_attempted", "2026-09-28T10:10:00Z", { passed: true });
    const e4 = buildMockEvent("task_completed", "2026-09-28T10:15:00Z", { minutesSpent: 15 });

    const chronological = [e1, e2, e3, e4];
    const shuffled = [e3, e1, e4, e2]; // Out of order

    const stateFromOrdered = reduceTaskEvidenceStream(chronological);
    const stateFromShuffled = reduceTaskEvidenceStream(shuffled);

    expect(stateFromShuffled).toEqual(stateFromOrdered);
  });

  // ── 5. IMMUTABILITY OF INPUT STATE ──
  it("does not mutate previous state object during reduceTaskEvidence", () => {
    const initial = createInitialTaskEvidenceState(taskId);
    Object.freeze(initial); // Throws if code attempts to mutate initial directly

    const event = buildMockEvent("task_started", "2026-09-28T10:00:00Z");
    expect(() => reduceTaskEvidence(initial, event)).not.toThrow();
  });
});

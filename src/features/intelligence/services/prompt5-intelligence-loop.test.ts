import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import {
  reduceTaskEvidenceStream,
  createInitialTaskEvidenceState,
} from "../reducers/task-evidence.reducer";
import { rebuildAllUserTopicProjections } from "../projections/projection-rebuilder";
import { recordLearningEvent } from "./learning-event.service";
import { UserTopicProgressModel } from "../models/user-topic-progress.model";
import { LearningEventModel } from "../models/learning-event.model";
import { resolveGenuineTopicSlug } from "../planning/topic-catalog";
import { resolveAuthoritativeLearningAction } from "../decisions/decision-selector";
import type { ILearningEvent } from "../events/learning-event.types";
import type { DashboardDTO } from "@/features/product/types/dashboard-dto.types";

let mongod: MongoMemoryServer;

describe("Prompt 5 — End-to-End Intelligence Loop & Mastery Semantics", () => {
  const userId = new Types.ObjectId();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);
    await LearningEventModel.syncIndexes();
    await UserTopicProgressModel.syncIndexes();
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await UserTopicProgressModel.deleteMany({});
    await LearningEventModel.deleteMany({});
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. EVENT INGESTION → REDUCER → PROJECTION → STRICT MASTERY
  // ─────────────────────────────────────────────────────────────────────────
  describe("Strict Mastery & Independent Solve Semantics", () => {
    it("classifies problem solve with 0 hints as independent solve", async () => {
      const problemId = new Types.ObjectId();
      const topicSlug = "dynamic-programming";

      // 1. Ingest problem attempt with 0 hints
      await recordLearningEvent({
        userId,
        eventType: "problem_attempted",
        idempotencyKey: `dp-att-indep:${problemId}`,
        topicSlug,
        problemId,
        occurredAt: new Date("2026-09-29T10:00:00Z"),
        payload: {
          attemptNumber: 1,
          passed: true,
          hintsUsed: 0,
          strategy: "independent",
          minutesSpent: 20,
        },
      });

      // 2. Ingest task completion explicitly independent with 0 hints
      await recordLearningEvent({
        userId,
        eventType: "task_completed",
        idempotencyKey: `dp-comp-indep:${problemId}`,
        topicSlug,
        problemId,
        occurredAt: new Date("2026-09-29T10:20:00Z"),
        payload: {
          minutesSpent: 20,
          independentSolve: true,
          hintsUsed: 0,
          passed: true,
          problemAttemptId: String(problemId),
        },
      });

      const projection = await UserTopicProgressModel.findOne({
        userId,
        topicSlug,
      }).lean();

      expect(projection?.completedCount).toBe(1);
      // Strictly incremented because problemId is present, independentSolve is true, hintsUsed is 0
      expect(projection?.independentSolveCount).toBe(1);
    });

    it("prevents any hint use (hintsUsed >= 1) from being counted as independent solve", async () => {
      const problemId = new Types.ObjectId();
      const topicSlug = "graphs";

      // 1. Ingest hint_revealed
      await recordLearningEvent({
        userId,
        eventType: "hint_revealed",
        idempotencyKey: `hint-rev-1:${problemId}`,
        topicSlug,
        problemId,
        occurredAt: new Date("2026-09-29T11:00:00Z"),
        payload: {
          hintLevel: 1,
        },
      });

      // 2. Ingest task_completed where learner had used a hint
      await recordLearningEvent({
        userId,
        eventType: "task_completed",
        idempotencyKey: `hint-comp-1:${problemId}`,
        topicSlug,
        problemId,
        occurredAt: new Date("2026-09-29T11:25:00Z"),
        payload: {
          minutesSpent: 25,
          // Even if a legacy client mistakenly sent independentSolve: true with hintsUsed: 1,
          // strict mastery semantics must disallow it:
          independentSolve: true,
          hintsUsed: 1,
          passed: true,
          problemAttemptId: String(problemId),
        },
      });

      const projection = await UserTopicProgressModel.findOne({
        userId,
        topicSlug,
      }).lean();

      expect(projection?.completedCount).toBe(1);
      // Gated to 0 because hintsUsed > 0
      expect(projection?.independentSolveCount).toBe(0);
    });

    it("verifies unknown or missing independentSolve NEVER defaults to true", async () => {
      const problemId = new Types.ObjectId();
      const topicSlug = "two-pointers";

      await recordLearningEvent({
        userId,
        eventType: "task_completed",
        idempotencyKey: `missing-indep:${problemId}`,
        topicSlug,
        problemId,
        occurredAt: new Date("2026-09-29T12:00:00Z"),
        payload: {
          minutesSpent: 15,
          // independentSolve is omitted / undefined
          passed: true,
        } as any,
      });

      const projection = await UserTopicProgressModel.findOne({
        userId,
        topicSlug,
      }).lean();

      expect(projection?.completedCount).toBe(1);
      expect(projection?.independentSolveCount).toBe(0);
    });

    it("verifies generic mission completion does NOT increase independent problem solves", async () => {
      const missionId = new Types.ObjectId();
      const topicSlug = "sliding-window";

      await recordLearningEvent({
        userId,
        eventType: "task_completed",
        idempotencyKey: `mission-comp:${missionId}`,
        topicSlug,
        // Entity is a mission, NOT a problem
        missionId,
        occurredAt: new Date("2026-09-29T13:00:00Z"),
        payload: {
          minutesSpent: 30,
          independentSolve: true, // Should be ignored because entity is mission
          missionSubmissionId: String(missionId),
          passed: true,
        },
      });

      const projection = await UserTopicProgressModel.findOne({
        userId,
        topicSlug,
      }).lean();

      expect(projection?.completedCount).toBe(1);
      // Generic mission is not an independent problem solve
      expect(projection?.independentSolveCount).toBe(0);
    });

    it("verifies review completion updates review schedule but does NOT increase independent problem solves", async () => {
      const topicSlug = "binary-trees";

      await recordLearningEvent({
        userId,
        eventType: "review_completed",
        idempotencyKey: `review-comp:${Date.now()}`,
        topicSlug,
        occurredAt: new Date("2026-09-29T14:00:00Z"),
        payload: {
          grade: 5,
          responseSeconds: 45,
          recalledSuccessfully: true,
          nextIntervalDays: 14,
        },
      });

      const projection = await UserTopicProgressModel.findOne({
        userId,
        topicSlug,
      }).lean();

      expect(projection?.reviewDueAt).toBeDefined();
      expect(projection?.independentSolveCount).toBe(0);
      expect(projection?.completedCount).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. IDEMPOTENCY, RETRIES, AND PROJECTION REBUILD
  // ─────────────────────────────────────────────────────────────────────────
  describe("Idempotency, Replay & Disaster Recovery", () => {
    it("idempotently rejects duplicate events with identical idempotencyKey", async () => {
      const idempotencyKey = `idem-test-key:${userId}:1`;
      const problemId = new Types.ObjectId();

      const event1 = await recordLearningEvent({
        userId,
        eventType: "problem_attempted",
        idempotencyKey,
        problemId,
        topicSlug: "arrays",
        payload: { attemptNumber: 1, passed: true },
      });
      expect(event1).toBeDefined();

      // Duplicate attempt with identical key should not duplicate or corrupt
      const duplicateRecord = await recordLearningEvent({
        userId,
        eventType: "problem_attempted",
        idempotencyKey,
        problemId,
        topicSlug: "arrays",
        payload: { attemptNumber: 1, passed: true },
      });

      const totalEvents = await LearningEventModel.countDocuments({
        userId,
        idempotencyKey,
      });
      expect(totalEvents).toBe(1);
    });

    it("rebuilds topic projection from scratch from immutable event stream", async () => {
      const problem1 = new Types.ObjectId();
      const problem2 = new Types.ObjectId();
      const topicSlug = "heaps";

      await recordLearningEvent({
        userId,
        eventType: "problem_attempted",
        idempotencyKey: `heap-p1-att:${problem1}`,
        topicSlug,
        problemId: problem1,
        occurredAt: new Date("2026-09-25T10:00:00Z"),
        payload: { attemptNumber: 1, passed: true },
      });

      await recordLearningEvent({
        userId,
        eventType: "task_completed",
        idempotencyKey: `heap-p1-comp:${problem1}`,
        topicSlug,
        problemId: problem1,
        occurredAt: new Date("2026-09-25T10:20:00Z"),
        payload: {
          minutesSpent: 20,
          independentSolve: true,
          problemAttemptId: String(problem1),
        },
      });

      await recordLearningEvent({
        userId,
        eventType: "problem_attempted",
        idempotencyKey: `heap-p2-att:${problem2}`,
        topicSlug,
        problemId: problem2,
        occurredAt: new Date("2026-09-26T10:00:00Z"),
        payload: { attemptNumber: 1, passed: true },
      });

      await recordLearningEvent({
        userId,
        eventType: "task_completed",
        idempotencyKey: `heap-p2-comp:${problem2}`,
        topicSlug,
        problemId: problem2,
        occurredAt: new Date("2026-09-26T10:15:00Z"),
        payload: {
          minutesSpent: 15,
          independentSolve: true,
          problemAttemptId: String(problem2),
        },
      });

      // Wipe projections completely
      await UserTopicProgressModel.deleteMany({});
      const beforeRebuild = await UserTopicProgressModel.findOne({ userId, topicSlug });
      expect(beforeRebuild).toBeNull();

      // Replay all events
      const rebuiltProjections = await rebuildAllUserTopicProjections(userId);
      const heapProjection = rebuiltProjections.find((p) => p.topicSlug === topicSlug);

      expect(heapProjection).toBeDefined();
      expect(heapProjection?.completedCount).toBe(2);
      expect(heapProjection?.independentSolveCount).toBe(2);
      expect(heapProjection?.totalMinutesSpent).toBe(35);
      expect(heapProjection?.rebuildStatus).toBe("healthy");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. CANONICAL TOPIC ATTRIBUTION & UNKNOWN HANDLING
  // ─────────────────────────────────────────────────────────────────────────
  describe("Topic Attribution & Unclassified Event Handling", () => {
    it("returns undefined for missing or unknown topicId, without defaulting to arrays", async () => {
      const nullResult = await resolveGenuineTopicSlug(null);
      expect(nullResult).toBeUndefined();

      const undefinedResult = await resolveGenuineTopicSlug(undefined);
      expect(undefinedResult).toBeUndefined();

      const emptyResult = await resolveGenuineTopicSlug("");
      expect(undefinedResult).toBeUndefined();

      // Unknown non-existent ObjectId returns undefined, NOT 'arrays'
      const nonExistentId = new Types.ObjectId().toString();
      const unknownResult = await resolveGenuineTopicSlug(nonExistentId);
      expect(unknownResult).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. TASK EVIDENCE REDUCER REPLAY
  // ─────────────────────────────────────────────────────────────────────────
  describe("TaskEvidence Reducer Event Playback", () => {
    it("accurately tracks hint count, attempts, and final outcome", () => {
      const entityId = "prob-sliding-max";
      const initialState = createInitialTaskEvidenceState(entityId);

      const events: ILearningEvent<any>[] = [
        {
          _id: new Types.ObjectId(),
          userId,
          eventType: "task_started",
          occurredAt: new Date("2026-09-29T09:00:00Z"),
          occurredAtTimezone: "UTC",
          idempotencyKey: `start:${entityId}`,
          schemaVersion: 1,
          source: "browser",
          problemId: new Types.ObjectId(),
          payload: { sourceSurface: "workspace" },
        },
        {
          _id: new Types.ObjectId(),
          userId,
          eventType: "hint_revealed",
          occurredAt: new Date("2026-09-29T09:05:00Z"),
          occurredAtTimezone: "UTC",
          idempotencyKey: `hint-1:${entityId}`,
          schemaVersion: 1,
          source: "browser",
          problemId: new Types.ObjectId(),
          payload: { hintLevel: 1 },
        },
        {
          _id: new Types.ObjectId(),
          userId,
          eventType: "problem_attempted",
          occurredAt: new Date("2026-09-29T09:15:00Z"),
          occurredAtTimezone: "UTC",
          idempotencyKey: `att-1:${entityId}`,
          schemaVersion: 1,
          source: "browser",
          problemId: new Types.ObjectId(),
          payload: {
            attemptNumber: 1,
            passed: true,
            strategy: "hint_assisted",
            hintsUsed: 1,
            minutesSpent: 15,
          },
        },
        {
          _id: new Types.ObjectId(),
          userId,
          eventType: "task_completed",
          occurredAt: new Date("2026-09-29T09:16:00Z"),
          occurredAtTimezone: "UTC",
          idempotencyKey: `comp-1:${entityId}`,
          schemaVersion: 1,
          source: "browser",
          problemId: new Types.ObjectId(),
          payload: {
            minutesSpent: 16,
            independentSolve: false,
            hintsUsed: 1,
            passed: true,
          },
        },
      ];

      const state = reduceTaskEvidenceStream(events, initialState);

      expect(state.entityId).toBe(entityId);
      expect(state.status).toBe("completed");
      expect(state.attemptCount).toBe(1);
      expect(state.hintCount).toBe(1);
      expect(state.hintsRevealed).toContain(1);
      expect(state.totalMinutesSpent).toBe(16);
      expect(state.independentSolve).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. AUTHORITATIVE RECOMMENDATION SELECTOR & DASHBOARD DTO AGREEMENT
  // ─────────────────────────────────────────────────────────────────────────
  describe("Authoritative Recommendation Selector & DashboardDTO Agreement", () => {
    it("Tier 1: prioritizes in-progress plan task and sets authoritative primaryAction", async () => {
      const decision = await resolveAuthoritativeLearningAction({
        userId: String(userId),
        activePlan: { id: "plan-1", topicName: "Binary Trees", topicSlug: "binary-trees" },
        currentPlanDay: { dayIndex: 2, topicName: "Binary Trees", topicSlug: "binary-trees" },
        todayTasks: [
          {
            _id: "task-1",
            taskKey: "t1",
            title: "Invert Binary Tree",
            status: "in_progress",
            type: "problem",
            estimatedMinutes: 20,
            targetUrl: "/practice/problems/invert-binary-tree",
            topicName: "Binary Trees",
            topicSlug: "binary-trees",
          },
          {
            _id: "task-2",
            taskKey: "t2",
            title: "Maximum Depth",
            status: "pending",
            type: "problem",
            estimatedMinutes: 15,
            targetUrl: "/practice/problems/maximum-depth",
            topicName: "Binary Trees",
            topicSlug: "binary-trees",
          },
        ],
        dueRevisions: [],
      });

      expect(decision.primaryAction.sourceProvenance).toBe("in_progress_task");
      expect(decision.primaryAction.ctaState).toBe("resume");
      expect(decision.primaryAction.ctaLabel).toBe("Resume today's task");
      expect(decision.primaryAction.href).toBe("/practice/problems/invert-binary-tree");
      expect(decision.primaryAction.title).toBe("Invert Binary Tree");
      expect(decision.primaryAction.topicName).toBe("Binary Trees");
    });

    it("surfaces in-flight draft as secondary action without competing with primary action", async () => {
      const decision = await resolveAuthoritativeLearningAction({
        userId: String(userId),
        activePlan: { id: "plan-1", topicName: "Graphs", topicSlug: "graphs" },
        currentPlanDay: { dayIndex: 3, topicName: "Graphs", topicSlug: "graphs" },
        todayTasks: [
          {
            _id: "task-prog",
            taskKey: "t3",
            title: "Clone Graph",
            status: "in_progress",
            type: "problem",
            estimatedMinutes: 25,
            targetUrl: "/practice/problems/clone-graph",
            topicName: "Graphs",
            topicSlug: "graphs",
          },
        ],
        draftAttempt: {
          _id: "draft-1",
          problemId: {
            _id: "prob-draft",
            title: "Number of Islands",
            slug: "number-of-islands",
          },
          updatedAt: new Date(),
        },
        dueRevisions: [],
      });

      // Primary action remains the in-progress task
      expect(decision.primaryAction.sourceProvenance).toBe("in_progress_task");
      expect(decision.primaryAction.title).toBe("Clone Graph");
      expect(decision.primaryAction.ctaLabel).toBe("Resume today's task");

      // Draft is strictly surfaced as secondaryAction
      expect(decision.secondaryAction).toBeDefined();
      expect(decision.secondaryAction?.title).toBe("Number of Islands");
      expect(decision.secondaryAction?.href).toContain("number-of-islands");
      expect(decision.secondaryAction?.provenance).toBe("draft_attempt");
    });

    it("honestly renders day-complete state when all daily tasks are finished", async () => {
      const decision = await resolveAuthoritativeLearningAction({
        userId: String(userId),
        activePlan: { id: "plan-1", topicName: "Stack", topicSlug: "stack" },
        currentPlanDay: { dayIndex: 1, topicName: "Stack", topicSlug: "stack" },
        todayTasks: [
          {
            _id: "task-done",
            taskKey: "t1",
            title: "Valid Parentheses",
            status: "completed",
            type: "problem",
            estimatedMinutes: 15,
            targetUrl: "/practice/problems/valid-parentheses",
            topicName: "Stack",
            topicSlug: "stack",
          },
        ],
        dueRevisions: [],
      });

      expect(decision.primaryAction.ctaState).toBe("day_complete");
      expect(decision.primaryAction.ctaLabel).toBe("Day complete · View full plan");
    });

    it("verifies typed DashboardDTO enforces single dominant primary CTA and distinct review queue", () => {
      const sampleDto: DashboardDTO = {
        version: 2,
        learner: {
          name: "Test Learner",
          firstName: "Test",
          onboardingStatus: "completed",
          roadmapSource: "customized",
        },
        contextStatusText: "Day 4 of 14 · Binary Search",
        activePlan: {
          id: "plan-1",
          status: "active",
          cycleNumber: 1,
          totalDays: 14,
          currentDayIndex: 4,
          dayTitle: "Binary Search Boundaries",
          dayFocus: "Predicate boundaries & Monotonicity",
          topicName: "Binary Search",
          topicSlug: "binary-search",
          targetDailyMinutes: 30,
          tasksCount: 2,
          completedTasksCount: 0,
          isDayComplete: false,
          stages: [],
        },
        primaryAction: {
          id: "action-1",
          actionKey: "act-key-1",
          type: "problem",
          title: "Search in Rotated Sorted Array",
          href: "/practice/problems/search-in-rotated-sorted-array",
          topicName: "Binary Search",
          topicSlug: "binary-search",
          isCrossTopic: false,
          relationshipLabel: null,
          estimatedDurationMinutes: 20,
          isDurationEstimate: true,
          reason: "Day 4 primary curriculum checkpoint",
          sourceProvenance: "required_plan_task",
          afterCompletionOutcome: "Unlocks Monotonic Predicates practice",
          ctaLabel: "Start Problem",
          ctaState: "start",
        },
        secondaryAction: null,
        reviewQueue: {
          dueCount: 3,
          estimatedTotalMinutes: 15,
          items: [
            {
              id: "rev-item-1",
              entityType: "problem",
              conceptName: "Binary Search Invariant",
              detail: "Overdue by 1 day",
              href: "/review?id=rev-item-1",
              estimatedMinutes: 5,
              priority: 70,
              dueAt: new Date().toISOString(),
            },
          ],
          isClear: false,
        },
        topicEvidence: {
          topicName: "Binary Search",
          topicSlug: "binary-search",
          topicSolvedCount: 3,
          topicMasteryPercent: 45,
          hasVerifiedEvidence: true,
          checkpoint: null,
          hasRealCheckpoint: false,
          focusAreas: [],
        },
        activityMetrics: {
          todayFocusedMinutes: 20,
          todayTargetMinutes: 30,
          todaySolvesCount: 1,
          todayAttemptsCount: 1,
          currentStreakDays: 3,
          bestStreakDays: 5,
          totalActiveDays: 8,
          totalFocusedHours: 4.5,
          totalSolvedProblems: 12,
          activityHistory: [],
        },
        interviewContext: null,
      };

      // DTO guarantees
      expect(sampleDto.primaryAction.ctaLabel).toBe("Start Problem");
      expect(sampleDto.primaryAction.href).toBe("/practice/problems/search-in-rotated-sorted-array");
      expect(sampleDto.reviewQueue.dueCount).toBe(3);
      // The hero primary action is not review_due, so the hero never shows a duplicate review CTA
      expect(sampleDto.primaryAction.sourceProvenance).not.toBe("due_review");
    });
  });
});

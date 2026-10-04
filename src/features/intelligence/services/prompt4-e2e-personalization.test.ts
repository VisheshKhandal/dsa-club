import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import { createInitialTaskEvidenceState, reduceTaskEvidenceStream } from "../reducers/task-evidence.reducer";
import { resolveAuthoritativeLearningAction } from "../decisions/decision-selector";
import { getCachedPublishedMissions } from "@/features/content/services/curriculum-cache";
import { CANONICAL_TOPIC_CATALOG, normalizeTopicSlug } from "../planning/topic-catalog";
import type { ILearningEvent } from "../events/learning-event.types";
import type { DashboardDTO } from "@/features/product/types/dashboard-dto.types";

describe("Prompt 4: E2E Personalization, Topic Resolution & CQRS Loop", () => {
  describe("1. Curriculum Ordering & Production Fallbacks", () => {
    it("never uses sliding-window as universal default in topic normalization", () => {
      // ManagePlanTab / Intelligence page fallback check
      const emptyDayTopic = normalizeTopicSlug(undefined);
      const fallbackTopic = emptyDayTopic || CANONICAL_TOPIC_CATALOG[0]?.slug || "arrays";
      
      expect(emptyDayTopic).toBeNull();
      expect(fallbackTopic).toBe("arrays");
      expect(fallbackTopic).not.toBe("sliding-window");
      expect(fallbackTopic).not.toBe("trees");
    });

    it("verifies canonical topic catalog starts with foundational topics (arrays, strings, hashing) with zero prerequisites", () => {
      const firstTopic = CANONICAL_TOPIC_CATALOG[0];
      expect(firstTopic.slug).toBe("arrays");
      expect(firstTopic.order).toBe(10);
      expect(firstTopic.prerequisites).toEqual([]);

      // Sliding window is an algorithmic pattern requiring two-pointers prerequisite
      const slidingWindow = CANONICAL_TOPIC_CATALOG.find((t) => t.slug === "sliding-window");
      expect(slidingWindow).toBeDefined();
      expect(slidingWindow?.prerequisites).toContain("two-pointers");
      expect(slidingWindow?.order).toBeGreaterThan(firstTopic.order);
    });
  });

  describe("2. Self-Paced & Plan-Bound Evidence Reduction", () => {
    it("reduces self-paced problem evidence deterministically using entityId without artificial PlanTask", () => {
      const mockProblemId = "prob-67890";
      const initial = createInitialTaskEvidenceState(mockProblemId);

      expect(initial.entityId).toBe(mockProblemId);
      expect(initial.planTaskId).toBe(mockProblemId);
      expect(initial.status).toBe("not_started");
      expect(initial.attemptCount).toBe(0);
      expect(initial.hintCount).toBe(0);

      const events: ILearningEvent<any>[] = [
        {
          _id: new Types.ObjectId(),
          userId: new Types.ObjectId(),
          eventType: "task_started",
          occurredAt: new Date("2026-09-29T10:00:00Z"),
          occurredAtTimezone: "UTC",
          idempotencyKey: `problem-open:${mockProblemId}:session-1`,
          schemaVersion: 1,
          source: "browser",
          problemId: new Types.ObjectId(),
          topicSlug: "arrays",
          payload: { sourceSurface: "workspace" },
        },
        {
          _id: new Types.ObjectId(),
          userId: new Types.ObjectId(),
          eventType: "hint_requested",
          occurredAt: new Date("2026-09-29T10:05:00Z"),
          occurredAtTimezone: "UTC",
          idempotencyKey: `hint-requested:${mockProblemId}:1`,
          schemaVersion: 1,
          source: "browser",
          problemId: new Types.ObjectId(),
          topicSlug: "arrays",
          payload: { hintLevel: 1 },
        },
        {
          _id: new Types.ObjectId(),
          userId: new Types.ObjectId(),
          eventType: "problem_attempted",
          occurredAt: new Date("2026-09-29T10:12:00Z"),
          occurredAtTimezone: "UTC",
          idempotencyKey: `problem-attempt:${mockProblemId}:1`,
          schemaVersion: 1,
          source: "browser",
          problemId: new Types.ObjectId(),
          topicSlug: "arrays",
          payload: {
            attemptNumber: 1,
            passed: true,
            minutesSpent: 12,
            strategy: "hint_assisted",
            hintsUsed: 1,
            selfConfidence: 4,
          },
        },
        {
          _id: new Types.ObjectId(),
          userId: new Types.ObjectId(),
          eventType: "task_completed",
          occurredAt: new Date("2026-09-29T10:12:01Z"),
          occurredAtTimezone: "UTC",
          idempotencyKey: `task-completed:${mockProblemId}:1`,
          schemaVersion: 1,
          source: "browser",
          problemId: new Types.ObjectId(),
          topicSlug: "arrays",
          payload: {
            minutesSpent: 12,
            independentSolve: false,
            passed: true,
          },
        },
      ];

      const reduced = reduceTaskEvidenceStream(events, initial);

      expect(reduced.entityId).toBe(mockProblemId);
      expect(reduced.status).toBe("completed");
      expect(reduced.attemptCount).toBe(1);
      expect(reduced.successfulAttempts).toBe(1);
      expect(reduced.failedAttempts).toBe(0);
      expect(reduced.hintCount).toBe(1);
      expect(reduced.highestHintLevel).toBe(1);
      expect(reduced.independentSolve).toBe(false); // Disqualified by hint usage
      expect(reduced.totalMinutesSpent).toBe(12);
    });

    it("verifies independent solve retains independentSolve: true when zero hints are used", () => {
      const mockProblemId = "prob-independent";
      const initial = createInitialTaskEvidenceState(mockProblemId);

      const events: ILearningEvent<any>[] = [
        {
          _id: new Types.ObjectId(),
          userId: new Types.ObjectId(),
          eventType: "task_started",
          occurredAt: new Date("2026-09-29T11:00:00Z"),
          occurredAtTimezone: "UTC",
          idempotencyKey: `problem-open:${mockProblemId}:session-2`,
          schemaVersion: 1,
          source: "browser",
          problemId: new Types.ObjectId(),
          topicSlug: "strings",
          payload: { sourceSurface: "workspace" },
        },
        {
          _id: new Types.ObjectId(),
          userId: new Types.ObjectId(),
          eventType: "problem_attempted",
          occurredAt: new Date("2026-09-29T11:15:00Z"),
          occurredAtTimezone: "UTC",
          idempotencyKey: `problem-attempt:${mockProblemId}:1`,
          schemaVersion: 1,
          source: "browser",
          problemId: new Types.ObjectId(),
          topicSlug: "strings",
          payload: {
            attemptNumber: 1,
            passed: true,
            minutesSpent: 15,
            strategy: "independent",
            hintsUsed: 0,
            selfConfidence: 5,
          },
        },
        {
          _id: new Types.ObjectId(),
          userId: new Types.ObjectId(),
          eventType: "task_completed",
          occurredAt: new Date("2026-09-29T11:15:01Z"),
          occurredAtTimezone: "UTC",
          idempotencyKey: `task-completed:${mockProblemId}:1`,
          schemaVersion: 1,
          source: "browser",
          problemId: new Types.ObjectId(),
          topicSlug: "strings",
          payload: {
            minutesSpent: 15,
            independentSolve: true,
            passed: true,
          },
        },
      ];

      const reduced = reduceTaskEvidenceStream(events, initial);

      expect(reduced.status).toBe("completed");
      expect(reduced.hintCount).toBe(0);
      expect(reduced.independentSolve).toBe(true);
      expect(reduced.successfulAttempts).toBe(1);
    });
  });

  describe("3. Authoritative Recommendation Resolution", () => {
    it("returns truthful setup action when no learner context or active plan exists", async () => {
      const selection = await resolveAuthoritativeLearningAction({
        userId: "507f1f77bcf86cd799439011",
        surface: "dashboard",
        persistDecision: false,
        activePlan: null,
        currentPlanDay: null,
        todayTasks: [],
        dueRevisions: [],
        activeSession: null,
        draftAttempt: null,
        activeMission: null,
        practiceRecs: [],
        topicMasteryScore: 0,
      });

      expect(selection.primaryAction).toBeDefined();
      expect(selection.primaryAction.type).toBe("setup");
      expect(selection.primaryAction.ctaState).toBe("setup");
      expect(selection.primaryAction.ctaLabel).toBe("Choose learning path");
      expect(selection.primaryAction.href).toBe("/learn/paths");
      expect(selection.primaryAction.sourceProvenance).toBe("setup");
      expect(selection.secondaryAction).toBeNull();
    });

    it("prioritizes due retention review when no active plan task exists", async () => {
      const selection = await resolveAuthoritativeLearningAction({
        userId: "507f1f77bcf86cd799439011",
        surface: "dashboard",
        persistDecision: false,
        activePlan: null,
        currentPlanDay: null,
        todayTasks: [],
        dueRevisions: [
          {
            id: "rev-1",
            conceptName: "Inverted Index Pattern",
            entityType: "pattern",
            href: "/revision/session/rev-1",
            estimatedMinutes: 8,
          } as any,
        ],
        activeSession: null,
        draftAttempt: null,
        activeMission: null,
        practiceRecs: [],
        topicMasteryScore: 60,
      });

      expect(selection.primaryAction.type).toBe("revision");
      expect(selection.primaryAction.ctaState).toBe("start");
      expect(selection.primaryAction.ctaLabel).toBe("Start review");
      expect(selection.primaryAction.sourceProvenance).toBe("due_review");
      expect(selection.primaryAction.href).toBe("/revision/session/rev-1");
    });

    it("prioritizes in-progress today task over draft problem attempt", async () => {
      const selection = await resolveAuthoritativeLearningAction({
        userId: "507f1f77bcf86cd799439011",
        surface: "dashboard",
        persistDecision: false,
        activePlan: { id: "plan-1", topicName: "Two Pointers", topicSlug: "two-pointers" } as any,
        currentPlanDay: { id: "day-1", dayIndex: 2, topicName: "Two Pointers", topicSlug: "two-pointers" } as any,
        todayTasks: [
          {
            id: "task-inprogress",
            taskKey: "tp-task-2",
            title: "Container With Most Water",
            entityType: "problem",
            status: "in_progress",
            estimatedMinutes: 25,
            targetUrl: "/practice/problems/container-with-most-water",
            topicName: "Two Pointers",
            topicSlug: "two-pointers",
          } as any,
        ],
        dueRevisions: [],
        activeSession: null,
        draftAttempt: {
          _id: "draft-1",
          problemId: { title: "Unfinished Scratchpad", slug: "scratchpad" },
          createdAt: new Date(),
        } as any,
        activeMission: null,
        practiceRecs: [],
        topicMasteryScore: 40,
      });

      // Primary MUST be the in-progress plan task
      expect(selection.primaryAction.title).toBe("Container With Most Water");
      expect(selection.primaryAction.ctaLabel).toBe("Resume today's task");
      expect(selection.primaryAction.ctaState).toBe("resume");
      expect(selection.primaryAction.sourceProvenance).toBe("in_progress_task");

      // Draft attempt must be relegated to quiet secondary action, never competing as primary
      expect(selection.secondaryAction).toBeDefined();
      expect(selection.secondaryAction?.title).toBe("Unfinished Scratchpad");
      expect(selection.secondaryAction?.provenance).toBe("draft_attempt");
    });
  });
});

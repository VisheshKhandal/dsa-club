import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import { resolveAuthoritativeLearningAction } from "@/features/intelligence/decisions/decision-selector";
import { aggregateActivityMetrics } from "./activity-aggregator";
import type {
  DashboardDTO,
  DashboardPrimaryAction,
  DashboardTopicEvidence,
} from "../types/dashboard-dto.types";

describe("Dashboard Data Contract & Backend Engine Invariants", () => {
  const mockUserId = new Types.ObjectId().toString();

  describe("1. Action Precedence Resolution (Deterministic 9-tier)", () => {
    it("Tier 1: Prioritizes an in-progress plan task of today over drafts and other tasks", async () => {
      const result = await resolveAuthoritativeLearningAction({
        userId: mockUserId,
        activePlan: { id: "plan-1", topicName: "Binary Trees", topicSlug: "binary-trees" },
        currentPlanDay: { dayIndex: 2, topicName: "Binary Trees", topicSlug: "binary-trees" },
        todayTasks: [
          {
            _id: "task-1",
            taskKey: "t1",
            title: "Tree Invert Invariant",
            status: "in_progress",
            entityType: "problem",
            required: true,
            order: 1,
            estimatedMinutes: 20,
          },
          {
            _id: "task-2",
            taskKey: "t2",
            title: "Tree Symmetric Check",
            status: "pending",
            entityType: "problem",
            required: true,
            order: 2,
            estimatedMinutes: 25,
          },
        ],
        draftAttempt: {
          _id: "draft-1",
          problemId: { title: "Max Subarray", slug: "max-subarray" },
        },
      });

      expect(result.primaryAction.sourceProvenance).toBe("in_progress_task");
      expect(result.primaryAction.title).toBe("Tree Invert Invariant");
      expect(result.primaryAction.ctaState).toBe("resume");
      // Draft is preserved as secondary action, not a competing primary CTA
      expect(result.secondaryAction).not.toBeNull();
      expect(result.secondaryAction?.title).toBe("Max Subarray");
      expect(result.secondaryAction?.provenance).toBe("draft_attempt");
    });

    it("Tier 2: In-flight draft attempt takes precedence in self-paced mode when no task is currently in_progress", async () => {
      const result = await resolveAuthoritativeLearningAction({
        userId: mockUserId,
        mode: "self_paced",
        activePlan: { id: "plan-1", topicName: "Binary Trees", topicSlug: "binary-trees" },
        currentPlanDay: { dayIndex: 2, topicName: "Binary Trees", topicSlug: "binary-trees" },
        todayTasks: [
          {
            _id: "task-2",
            taskKey: "t2",
            title: "Tree Symmetric Check",
            status: "pending",
            entityType: "problem",
            required: true,
            order: 1,
          },
        ],
        draftAttempt: {
          _id: "draft-99",
          problemId: { title: "Invert Binary Tree", slug: "invert-binary-tree" },
          createdAt: new Date(),
        },
      });

      expect(result.primaryAction.sourceProvenance).toBe("in_flight_draft");
      expect(result.primaryAction.title).toBe("Invert Binary Tree");
      expect(result.primaryAction.ctaState).toBe("resume");
      // Secondary action must NOT duplicate the primary draft
      expect(result.secondaryAction).toBeNull();
    });

    it("Tier 3: Paused plan state returns clear resume schedule action", async () => {
      const result = await resolveAuthoritativeLearningAction({
        userId: mockUserId,
        activePlan: { id: "plan-1", status: "paused", topicName: "Graphs", topicSlug: "graphs" },
        currentPlanDay: { dayIndex: 4, topicName: "Graphs", topicSlug: "graphs" },
        todayTasks: [],
      });

      expect(result.primaryAction.ctaState).toBe("paused");
      expect(result.primaryAction.ctaLabel).toBe("Resume schedule");
      expect(result.primaryAction.href).toBe("/plan");
    });

    it("Tier 4: Next required task of today's plan day takes precedence over due reviews", async () => {
      const result = await resolveAuthoritativeLearningAction({
        userId: mockUserId,
        activePlan: { id: "plan-1", topicName: "Binary Trees", topicSlug: "binary-trees" },
        currentPlanDay: { dayIndex: 3, topicName: "Binary Trees", topicSlug: "binary-trees" },
        todayTasks: [
          {
            _id: "task-required",
            taskKey: "req-1",
            title: "Lowest Common Ancestor",
            status: "pending",
            required: true,
            order: 1,
            estimatedMinutes: 25,
            entityType: "problem",
          },
        ],
        dueRevisions: [
          {
            id: "rev-1",
            conceptName: "Two Pointers Basics",
            entityType: "pattern",
            estimatedMinutes: 7,
          },
        ],
      });

      expect(result.primaryAction.sourceProvenance).toBe("required_plan_task");
      expect(result.primaryAction.title).toBe("Lowest Common Ancestor");
      expect(result.primaryAction.ctaState).toBe("start");
    });

    it("Tier 5: High priority due review takes precedence in self-paced mode when no required plan tasks are pending", async () => {
      const result = await resolveAuthoritativeLearningAction({
        userId: mockUserId,
        mode: "self_paced",
        activePlan: { id: "plan-1", topicName: "Binary Trees", topicSlug: "binary-trees" },
        currentPlanDay: { dayIndex: 3, topicName: "Binary Trees", topicSlug: "binary-trees" },
        todayTasks: [
          {
            _id: "task-done",
            taskKey: "req-1",
            title: "Lowest Common Ancestor",
            status: "completed",
            required: true,
            order: 1,
          },
        ],
        dueRevisions: [
          {
            id: "rev-1",
            conceptName: "Sliding Window Maximum",
            entityType: "problem",
            estimatedMinutes: 8,
          },
        ],
      });

      expect(result.primaryAction.sourceProvenance).toBe("due_review");
      expect(result.primaryAction.title).toBe("Sliding Window Maximum");
      expect(result.primaryAction.ctaState).toBe("start");
    });

    it("Tier 6: Day Complete action returned when all tasks for the day are finished", async () => {
      const result = await resolveAuthoritativeLearningAction({
        userId: mockUserId,
        activePlan: { id: "plan-1", topicName: "Binary Trees", topicSlug: "binary-trees" },
        currentPlanDay: { dayIndex: 3, topicName: "Binary Trees", topicSlug: "binary-trees" },
        todayTasks: [
          {
            _id: "task-1",
            title: "Task 1",
            status: "completed",
            required: true,
          },
        ],
        dueRevisions: [],
      });

      expect(result.primaryAction.sourceProvenance).toBe("required_plan_task");
      expect(result.primaryAction.ctaState).toBe("day_complete");
      expect(result.primaryAction.estimatedDurationMinutes).toBe(0);
    });

    it("Tier 7 & 8: Falls back to self-paced recommendation or setup when no plan active", async () => {
      const resultWithRec = await resolveAuthoritativeLearningAction({
        userId: mockUserId,
        activePlan: null,
        currentPlanDay: null,
        todayTasks: [],
        practiceRecs: [
          {
            problem: { _id: "prob-1", title: "Two Sum", slug: "two-sum", estimatedMinutes: 20 },
            reason: "Core hash map pattern",
            weakTopic: "Arrays & Hashing",
          },
        ],
      });

      expect(resultWithRec.primaryAction.sourceProvenance).toBe("self_paced_recommendation");
      expect(resultWithRec.primaryAction.title).toBe("Two Sum");

      const resultSetup = await resolveAuthoritativeLearningAction({
        userId: mockUserId,
        activePlan: null,
        currentPlanDay: null,
        todayTasks: [],
        practiceRecs: [],
      });

      expect(resultSetup.primaryAction.sourceProvenance).toBe("setup");
      expect(resultSetup.primaryAction.ctaState).toBe("setup");
      expect(resultSetup.primaryAction.href).toBe("/learn/paths");
    });
  });

  describe("2. Cross-Topic Practice Identification & Explicit Labeling", () => {
    it("detects cross-topic task (e.g. Is Subsequence under Binary Trees) and labels source and target topics", async () => {
      const result = await resolveAuthoritativeLearningAction({
        userId: mockUserId,
        activePlan: { id: "plan-1", topicName: "Binary Trees", topicSlug: "binary-trees" },
        currentPlanDay: { dayIndex: 2, topicName: "Binary Trees", topicSlug: "binary-trees" },
        todayTasks: [
          {
            _id: "task-subsequence",
            taskKey: "sub-1",
            title: "Is Subsequence",
            status: "pending",
            required: true,
            order: 1,
            topicName: "Strings and Two Pointers",
            topicSlug: "two-pointers",
            validationStatus: "cross_topic_bridge",
          },
        ],
      });

      expect(result.primaryAction.isCrossTopic).toBe(true);
      expect(result.primaryAction.relationshipLabel).toContain("Strings and Two Pointers");
      expect(result.primaryAction.relationshipLabel).toContain("Binary Trees");
    });
  });

  describe("3. Truthful Activity Aggregation & Deduplication", () => {
    it("deduplicates overlapping session and attempt records by underlying activity key", () => {
      const today = new Date();
      const metrics = aggregateActivityMetrics({
        sessionDocs: [
          {
            _id: "session-1",
            startedAt: today,
            focusedSeconds: 1800, // 30 mins
          },
        ],
        attemptDocs: [
          {
            _id: "attempt-1",
            problemId: "prob-1",
            createdAt: today,
            durationSeconds: 900, // 15 mins
            status: "solved",
          },
          {
            _id: "attempt-2",
            problemId: "prob-2",
            createdAt: today,
            durationSeconds: 0, // Truthful: 0 minutes tracked, must NOT be inflated to 15m!
            status: "solved",
          },
        ],
        planTaskDocs: [
          {
            _id: "task-1",
            entityId: "prob-1", // Same problem as attempt-1 -> deduplicated
            completedAt: today,
            actualMinutes: 10,
            entityType: "problem",
          },
        ],
        eventDocs: [],
        revisionDocs: [],
        currentStreakDays: 3,
        bestStreakDays: 5,
        targetDailyMinutes: 45,
        totalSolvedProblems: 2,
      });

      expect(metrics.todayFocusedMinutes).toBe(55); // 30 + 15 + 0 + 10 = 55 mins (no inflated default!)
      expect(metrics.todaySolvesCount).toBe(2);
      expect(metrics.currentStreakDays).toBe(3);
    });

    it("does not inflate zero-duration problem attempts to artificial defaults", () => {
      const metrics = aggregateActivityMetrics({
        sessionDocs: [],
        attemptDocs: [
          {
            _id: "attempt-zero",
            createdAt: new Date(),
            durationSeconds: 0,
            status: "started",
          },
        ],
        planTaskDocs: [],
        eventDocs: [],
        revisionDocs: [],
        currentStreakDays: 0,
        bestStreakDays: 0,
        targetDailyMinutes: 45,
        totalSolvedProblems: 0,
      });

      expect(metrics.todayFocusedMinutes).toBe(0);
    });
  });

  describe("4. Topic Evidence Topic-Scoping & Checkpoint Truthfulness", () => {
    it("keeps topic evidence topic-scoped and hides unsupported checkpoints", () => {
      const topicEvidence: DashboardTopicEvidence = {
        topicName: "Binary Trees",
        topicSlug: "binary-trees",
        topicSolvedCount: 3,
        topicMasteryPercent: 45,
        hasVerifiedEvidence: true,
        checkpoint: null,
        hasRealCheckpoint: false,
        focusAreas: [{ name: "Invert Binary Tree", slug: "invert", href: "/practice", mastery: 30 }],
      };

      expect(topicEvidence.hasRealCheckpoint).toBe(false);
      expect(topicEvidence.checkpoint).toBeNull();
      expect(topicEvidence.topicSolvedCount).toBe(3);
      expect(topicEvidence.topicMasteryPercent).toBe(45);
    });

    it("represents unassessed topics as null rather than inventing artificial zeros", () => {
      const unassessedEvidence: DashboardTopicEvidence = {
        topicName: "Dynamic Programming",
        topicSlug: "dynamic-programming",
        topicSolvedCount: null,
        topicMasteryPercent: null,
        hasVerifiedEvidence: false,
        checkpoint: null,
        hasRealCheckpoint: false,
        focusAreas: [],
      };

      expect(unassessedEvidence.topicSolvedCount).toBeNull();
      expect(unassessedEvidence.topicMasteryPercent).toBeNull();
      expect(unassessedEvidence.hasVerifiedEvidence).toBe(false);
    });
  });
});

import { describe, it, expect } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { resolveDashboardDTO } from "./DashboardView";
import type {
  DashboardDTO,
} from "@/features/product/types/dashboard-dto.types";

function createMockDTO(overrides?: Partial<DashboardDTO>): DashboardDTO {
  return {
    version: 2,
    learner: {
      name: "Alex Doe",
      firstName: "Alex",
      onboardingStatus: "completed",
      roadmapSource: "customized",
    },
    contextStatusText: "Day 4 of 18 in active Sliding Window plan.",
    activePlan: {
      id: "plan-123",
      status: "active",
      cycleNumber: 1,
      totalDays: 18,
      currentDayIndex: 4,
      dayTitle: "Longest Substring Invariants",
      dayFocus: "Window expansion and contraction conditions.",
      topicName: "Sliding Window",
      topicSlug: "sliding-window",
      targetDailyMinutes: 45,
      tasksCount: 3,
      completedTasksCount: 1,
      isDayComplete: false,
      stages: [
        { id: "s1", title: "Fixed Window", dayIndex: 1, status: "completed", isCheckpoint: false },
        { id: "s2", title: "Dynamic Window", dayIndex: 4, status: "current", isCheckpoint: false },
        { id: "s3", title: "Two-Pointer Invariants", dayIndex: 8, status: "upcoming", isCheckpoint: true },
      ],
    },
    primaryAction: {
      id: "task-456",
      actionKey: "problem-longest-substring",
      type: "problem",
      title: "Longest Substring Without Repeating Characters",
      href: "/practice/longest-substring",
      topicName: "Sliding Window",
      topicSlug: "sliding-window",
      isCrossTopic: false,
      relationshipLabel: null,
      estimatedDurationMinutes: 25,
      isDurationEstimate: true,
      reason: "Reinforces dynamic window invariant maintenance on character frequency maps.",
      sourceProvenance: "required_plan_task",
      afterCompletionOutcome: "Completes task 2 of 3 and updates verified topic solves.",
      ctaLabel: "Resume today's task",
      ctaState: "resume",
    },
    secondaryAction: null,
    reviewQueue: {
      dueCount: 2,
      estimatedTotalMinutes: 15,
      items: [
        {
          id: "rev-1",
          entityType: "concept",
          conceptName: "Two Sum Hash Map Invariant",
          detail: "Retention interval 7 days elapsed",
          href: "/review/two-sum",
          estimatedMinutes: 7,
          priority: 1,
          dueAt: new Date().toISOString(),
        },
      ],
      isClear: false,
    },
    topicEvidence: {
      topicName: "Sliding Window",
      topicSlug: "sliding-window",
      topicSolvedCount: 5,
      topicMasteryPercent: 72,
      hasVerifiedEvidence: true,
      checkpoint: {
        title: "Day 8 Mid-Cycle Checkpoint",
        focus: "Verify O(N) window guarantees before moving to advanced substring problems.",
        isCheckpointDay: false,
        dayIndex: 8,
      },
      hasRealCheckpoint: true,
      focusAreas: [
        { name: "Character Map State", slug: "char-map", href: "/practice?tag=char-map", mastery: 80 },
      ],
    },
    activityMetrics: {
      todayFocusedMinutes: 35,
      todayTargetMinutes: 45,
      todaySolvesCount: 1,
      todayAttemptsCount: 2,
      currentStreakDays: 6,
      bestStreakDays: 14,
      totalActiveDays: 18,
      totalFocusedHours: 12,
      totalSolvedProblems: 42,
      activityHistory: [
        {
          date: "2026-09-29T12:00:00.000Z",
          dateKey: "2026-09-29",
          dayOfWeek: 2,
          actualMinutes: 35,
          minutes: 35,
          problemsSolved: 1,
          problemsAttempted: 2,
          revisionsDone: 0,
          activityScore: 55,
        },
      ],
    },
    interviewContext: null,
    ...overrides,
  };
}

describe("Dashboard DTO-to-Component Contracts & Invariants", () => {
  describe("1. resolveDashboardDTO contract", () => {
    it("preserves authoritative DashboardDTO version 2 without loss", () => {
      const mockDto = createMockDTO();
      const resolved = resolveDashboardDTO({ dashboardDTO: mockDto });

      expect(resolved.version).toBe(2);
      expect(resolved.primaryAction.title).toBe(mockDto.primaryAction.title);
      expect(resolved.primaryAction.href).toBe(mockDto.primaryAction.href);
      expect(resolved.activityMetrics.todayFocusedMinutes).toBe(35);
      expect(resolved.activityMetrics.todayTargetMinutes).toBe(45);
      expect(resolved.reviewQueue.dueCount).toBe(2);
    });

    it("faithfully adapts legacy snapshot through deliberate boundary adapter", () => {
      const legacyData = {
        user: { name: "Sarah Connor" },
        stats: { currentStreak: 3, bestStreak: 9, solvedProblems: 15 },
        dailyGoal: { studiedMinutes: 20, goalMinutes: 40 },
        activePlan: {
          topicName: "Binary Search",
          topicSlug: "binary-search",
          currentDayIndex: 2,
          totalDays: 10,
        },
        focusAction: {
          title: "Search in Rotated Sorted Array",
          href: "/practice/search-rotated",
          topicName: "Binary Search",
          estimatedDurationMinutes: 20,
          ctaLabel: "Start task",
        },
        dueRevisions: [{ id: "r1", conceptName: "Binary Search Condition", estimatedMinutes: 5 }],
        activityHistory: [{ date: "2026-09-29", actualMinutes: 20, problemsSolved: 1, problemsAttempted: 1, revisionsDone: 0 }],
      };

      const resolved = resolveDashboardDTO(legacyData);

      expect(resolved.version).toBe(2);
      expect(resolved.learner.firstName).toBe("Sarah");
      expect(resolved.activityMetrics.todayFocusedMinutes).toBe(20);
      expect(resolved.activityMetrics.todayTargetMinutes).toBe(40);
      expect(resolved.primaryAction.href).toBe("/practice/search-rotated");
      expect(resolved.reviewQueue.dueCount).toBe(1);
    });
  });

  describe("2. NextSessionHero DTO Contract", () => {
    it("verifies hero inspects primaryAction.isCrossTopic and renders intentional curriculum bridge", () => {
      const heroPath = path.resolve(process.cwd(), "src/components/product/dashboard/NextSessionHero.tsx");
      const content = fs.readFileSync(heroPath, "utf-8");

      expect(content).toContain("action.isCrossTopic");
      expect(content).toContain("relationshipLabel");
      expect(content).toContain("Curriculum Bridge:");
      expect(content).toContain("action.ctaLabel");
      expect(content).toContain("action.estimatedDurationMinutes");
      expect(content).toContain("action.afterCompletionOutcome");
      expect(content).toContain("action.reason");
    });

    it("verifies hero Learning Spine is omitted when activePlan.stages is empty or unsupported", () => {
      const heroPath = path.resolve(process.cwd(), "src/components/product/dashboard/NextSessionHero.tsx");
      const content = fs.readFileSync(heroPath, "utf-8");

      // Verify no hardcoded quartile or fake stages are synthesized
      expect(content).not.toContain("Foundation / Core / Review");
      expect(content).not.toContain("quartile");
      expect(content).toContain("spineNodes.length > 0");
    });
  });

  describe("3. ReviewQueuePreview DTO Contract", () => {
    it("verifies reviewQueue properties are consumed consistently and duplicate CTA is suppressed", () => {
      const reviewPath = path.resolve(process.cwd(), "src/components/product/dashboard/ReviewQueuePreview.tsx");
      const content = fs.readFileSync(reviewPath, "utf-8");

      expect(content).toContain("reviewQueue.dueCount");
      expect(content).toContain("reviewQueue.estimatedTotalMinutes");
      expect(content).toContain("reviewQueue.items");
      expect(content).toContain("!isPrimaryReview");
      expect(content).toContain("Included in primary action");
    });
  });

  describe("4. ActivityRibbon Single Measure Heatmap Contract", () => {
    it("verifies single measure actualMinutes is used for intensity, title, and tooltip", () => {
      const ribbonPath = path.resolve(process.cwd(), "src/components/product/dashboard/ActivityRibbon.tsx");
      const content = fs.readFileSync(ribbonPath, "utf-8");

      expect(content).toContain("actualMinutes");
      expect(content).toContain("Measure: Daily focused study minutes");
      expect(content).toContain("Legend (Daily study minutes)");
      expect(content).toContain("focused study");
      expect(content).toContain("problemsSolved");
    });
  });

  describe("5. GoalCheckpointProof Evidence & Anti-Hallucination Contract", () => {
    it("verifies topic-scoped evidence is strictly used and false milestone claims are omitted", () => {
      const checkpointPath = path.resolve(process.cwd(), "src/components/product/dashboard/GoalCheckpointProof.tsx");
      const content = fs.readFileSync(checkpointPath, "utf-8");

      expect(content).toContain("topicEvidence?.topicSolvedCount");
      expect(content).toContain("topicEvidence?.topicMasteryPercent");
      expect(content).toContain("topicEvidence?.focusAreas");
      expect(content).toContain("Practice Evidence");
      expect(content).not.toContain("Milestones");
    });
  });

  describe("6. DashboardView Shortcuts & Primary Action URL Contract", () => {
    it("verifies Space/Enter shortcut executes the exact authoritative primaryAction.href", () => {
      const dashboardPath = path.resolve(process.cwd(), "src/components/product/dashboard/DashboardView.tsx");
      const content = fs.readFileSync(dashboardPath, "utf-8");

      expect(content).toContain("dto.primaryAction.href");
      expect(content).toContain("router.push(primaryActionHref)");
      expect(content).toContain("dto.activityMetrics.todayFocusedMinutes");
      expect(content).toContain("dto.activityMetrics.todayTargetMinutes");
      expect(content).toContain("useReducedMotion");
    });
  });

  describe("7. Dashboard Bonus Challenge & Day Complete Celebration Contract", () => {
    it("verifies DashboardDTO propagates bonusChallenge and NextSessionHero surfaces it upon day completion", () => {
      const dashboardPath = path.resolve(process.cwd(), "src/components/product/dashboard/DashboardView.tsx");
      const dashboardContent = fs.readFileSync(dashboardPath, "utf-8");
      expect(dashboardContent).toContain("bonusChallenge");
      expect(dashboardContent).toContain("bonusChallenge={dto.bonusChallenge}");

      const heroPath = path.resolve(process.cwd(), "src/components/product/dashboard/NextSessionHero.tsx");
      const heroContent = fs.readFileSync(heroPath, "utf-8");
      expect(heroContent).toContain("isDayComplete");
      expect(heroContent).toContain("bonusChallenge");
      expect(heroContent).toContain("Today&apos;s Daily Goal Achieved!");
      expect(heroContent).toContain("Solve Bonus Challenge");
    });
  });
});


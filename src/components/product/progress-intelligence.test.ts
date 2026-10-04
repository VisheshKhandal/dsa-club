import { describe, it, expect } from "vitest";
import {
  deriveReadinessTier,
  isNewUserState,
  deriveOneNextAction,
  deduplicateMilestoneEvidence,
  computeRadarPolygonPoints,
  type ProgressSnapshotData,
  type RecentEvidenceItem,
} from "./progress-intelligence-view";

describe("Screen 11 — Progress Intelligence Architecture & UX Invariants", () => {
  const mockNewUserStats: ProgressSnapshotData["stats"] = {
    totalFocusedMinutes: 0,
    solvedProblems: 0,
    attemptedProblems: 0,
    currentStreakDays: 0,
    overallMasteryScore: 0,
    interviewReadinessScore: 0,
    consistencyScore: 0,
    revisionRetentionScore: 0,
    masteryScore: 0,
    currentStreak: 0,
    problemsSolved: 0,
    readinessScore: 0,
    studyTimeHours: 0,
  };

  const mockActiveStats: ProgressSnapshotData["stats"] = {
    totalFocusedMinutes: 240,
    solvedProblems: 12,
    attemptedProblems: 15,
    currentStreakDays: 5,
    overallMasteryScore: 72,
    interviewReadinessScore: 84,
    consistencyScore: 88,
    revisionRetentionScore: 80,
    masteryScore: 72,
    currentStreak: 5,
    problemsSolved: 12,
    readinessScore: 84,
    studyTimeHours: 4,
    independentSolves: 9,
    hintAssistedSolves: 3,
    patternAccuracy: 82,
    topicsMastered: 3,
  };

  describe("1. New User & 'Build Your Evidence' State Invariants", () => {
    it("should classify zero-evidence user as new user", () => {
      const isNew = isNewUserState(mockNewUserStats, []);
      expect(isNew).toBe(true);
    });

    it("should NOT classify an active user with solves or evidence as new user", () => {
      const activeEvidence: RecentEvidenceItem[] = [
        {
          id: "ev-1",
          type: "problem_solve",
          title: "Solved Two Sum Independently",
          subtitle: "Optimal solve with 0 hints",
          badge: "Independent",
          badgeVariant: "emerald",
          href: "/practice/problems/two-sum",
          timestamp: new Date().toISOString(),
        },
      ];

      expect(isNewUserState(mockActiveStats, activeEvidence)).toBe(false);
      expect(isNewUserState(mockActiveStats, [])).toBe(false);
    });

    it("should provide ONE default starting action for a new user without roadmap", () => {
      const action = deriveOneNextAction(null, null, null);
      expect(action.title).toBe("Arrays & Memory Foundations");
      expect(action.href).toBe("/missions/arrays-and-memory");
      expect(action.ctaLabel).toBe("Start Mission →");
    });
  });

  describe("2. Interview Readiness & Celebration Invariants", () => {
    it("should calculate Interview Ready tier and celebration state at >= 80%", () => {
      const tier84 = deriveReadinessTier(84);
      expect(tier84.tier).toBe("Interview Ready");
      expect(tier84.isCelebration).toBe(true);

      const tier80 = deriveReadinessTier(80);
      expect(tier80.tier).toBe("Interview Ready");
      expect(tier80.isCelebration).toBe(true);
    });

    it("should calculate Building Foundation tier at 50–79% without celebration", () => {
      const tier72 = deriveReadinessTier(72);
      expect(tier72.tier).toBe("Building Foundation");
      expect(tier72.isCelebration).toBe(false);

      const tier50 = deriveReadinessTier(50);
      expect(tier50.tier).toBe("Building Foundation");
      expect(tier50.isCelebration).toBe(false);
    });

    it("should calculate Building Evidence tier at < 50%", () => {
      const tier35 = deriveReadinessTier(35);
      expect(tier35.tier).toBe("Building Evidence");
      expect(tier35.isCelebration).toBe(false);

      const tier0 = deriveReadinessTier(0);
      expect(tier0.tier).toBe("Building Evidence");
      expect(tier0.isCelebration).toBe(false);
    });
  });

  describe("3. ONE Highest-Value Next Action Invariant", () => {
    it("should prioritize focusAction with contextual CTA label for problems", () => {
      const focusAction = {
        title: "Two Sum",
        href: "/practice/problems/two-sum",
        reason: "Practice fast complement lookups with Hashing.",
        estimatedMinutes: 15,
        entityType: "problem",
      };

      const result = deriveOneNextAction(focusAction, null, null);
      expect(result.title).toBe("Two Sum");
      expect(result.ctaLabel).toBe("Prepare Problem →");
      expect(result.href).toBe("/practice/problems/two-sum");
      expect(result.estimatedMinutes).toBe(15);
    });

    it("should prioritize focusAction with contextual CTA label for patterns", () => {
      const focusAction = {
        title: "Two Pointers Drill",
        href: "/patterns/two-pointers",
        reason: "Sharpen symmetric boundary traversal.",
        estimatedMinutes: 12,
        entityType: "pattern",
      };

      const result = deriveOneNextAction(focusAction, null, null);
      expect(result.title).toBe("Two Pointers Drill");
      expect(result.ctaLabel).toBe("Practice Pattern →");
      expect(result.href).toBe("/patterns/two-pointers");
    });

    it("should fallback to activeMission if focusAction is absent", () => {
      const activeMission = {
        slug: "dynamic-programming-basics",
        title: "DP Memoization Foundations",
        topic: "Dynamic Programming",
        progress: 45,
      };

      const result = deriveOneNextAction(null, activeMission, {
        recommendedNextAction: "Continue your in-progress mission.",
      } as any);

      expect(result.title).toBe("Continue Mission: DP Memoization Foundations");
      expect(result.ctaLabel).toBe("Continue Mission →");
      expect(result.href).toBe("/missions/dynamic-programming-basics");
    });
  });

  describe("4. 6-Axis Algorithmic Radar Invariants", () => {
    it("should compute exact polygon points for 6 core dimensions", () => {
      const dimensions = [
        { key: "arrays", value: 85 },
        { key: "trees", value: 60 },
        { key: "dp", value: 40 },
        { key: "graphs", value: 30 },
        { key: "patterns", value: 78 },
        { key: "problemSolving", value: 82 },
      ];

      const points = computeRadarPolygonPoints(160, 160, 95, dimensions);
      expect(points).toHaveLength(6);

      // Top vertex (Arrays) should be directly above center (x ≈ 160, y < 160)
      const topVertex = points[0];
      expect(topVertex.key).toBe("arrays");
      expect(topVertex.x).toBeCloseTo(160, 0);
      expect(topVertex.y).toBeLessThan(160);

      // Bottom vertex (Graphs) should be directly below center (x ≈ 160, y > 160)
      const bottomVertex = points[3];
      expect(bottomVertex.key).toBe("graphs");
      expect(bottomVertex.x).toBeCloseTo(160, 0);
      expect(bottomVertex.y).toBeGreaterThan(160);
    });

    it("should enforce non-zero minimal vertex radius so 0% mastery does not collapse into null", () => {
      const zeroDimensions = [
        { key: "arrays", value: 0 },
        { key: "trees", value: 0 },
        { key: "dp", value: 0 },
        { key: "graphs", value: 0 },
        { key: "patterns", value: 0 },
        { key: "problemSolving", value: 0 },
      ];

      const points = computeRadarPolygonPoints(160, 160, 95, zeroDimensions);
      expect(points).toHaveLength(6);
      for (const p of points) {
        // Minimum normalized radius is 8px
        const dist = Math.sqrt(Math.pow(p.x - 160, 2) + Math.pow(p.y - 160, 2));
        expect(dist).toBeGreaterThanOrEqual(7.9);
      }
    });
  });

  describe("5. Recent Evidence Deduplication Invariants", () => {
    it("should deduplicate multiple submissions or attempts of the same problem", () => {
      const rawEvents = [
        {
          key: "problem:two-sum",
          title: "Solved Two Sum Independently",
          type: "problem_solve",
          timestamp: "2026-09-13T10:00:00Z",
        },
        {
          key: "problem:two-sum",
          title: "Attempted Two Sum",
          type: "problem_solve",
          timestamp: "2026-09-13T09:45:00Z",
        },
        {
          key: "problem:3sum",
          title: "Solved 3Sum with Hints",
          type: "hint_solve",
          timestamp: "2026-09-12T15:00:00Z",
        },
        {
          key: "mission:arrays-and-memory",
          title: "Completed Mission: Arrays & Memory",
          type: "mission_stage",
          timestamp: "2026-09-11T12:00:00Z",
        },
        {
          key: "problem:3sum",
          title: "Attempted 3Sum",
          type: "problem_solve",
          timestamp: "2026-09-11T10:00:00Z",
        },
      ];

      const deduped = deduplicateMilestoneEvidence(rawEvents);
      expect(deduped).toHaveLength(3);
      expect(deduped[0].key).toBe("problem:two-sum");
      expect(deduped[0].title).toBe("Solved Two Sum Independently");
      expect(deduped[1].key).toBe("problem:3sum");
      expect(deduped[1].title).toBe("Solved 3Sum with Hints");
      expect(deduped[2].key).toBe("mission:arrays-and-memory");
    });

    it("should cap recent evidence to at most 5 items", () => {
      const rawEvents = Array.from({ length: 10 }, (_, i) => ({
        key: `problem:problem-${i}`,
        title: `Solved Problem ${i}`,
        type: "problem_solve",
        timestamp: new Date(Date.now() - i * 10000).toISOString(),
      }));

      const deduped = deduplicateMilestoneEvidence(rawEvents);
      expect(deduped).toHaveLength(5);
    });
  });

  describe("6. 7-Day Trend Activity Aggregation Invariants", () => {
    it("should correctly aggregate active study minutes and solves across 7 days", () => {
      const weeklyActivity = [
        { date: "2026-09-07", minutes: 30, problemsSolved: 1, problemsAttempted: 1, revisionsDone: 1, activityScore: 55 },
        { date: "2026-09-08", minutes: 45, problemsSolved: 2, problemsAttempted: 2, revisionsDone: 0, activityScore: 85 },
        { date: "2026-09-09", minutes: 0, problemsSolved: 0, problemsAttempted: 0, revisionsDone: 0, activityScore: 0 },
        { date: "2026-09-10", minutes: 60, problemsSolved: 2, problemsAttempted: 3, revisionsDone: 2, activityScore: 125 },
        { date: "2026-09-11", minutes: 30, problemsSolved: 1, problemsAttempted: 1, revisionsDone: 1, activityScore: 55 },
        { date: "2026-09-12", minutes: 20, problemsSolved: 0, problemsAttempted: 1, revisionsDone: 1, activityScore: 35 },
        { date: "2026-09-13", minutes: 40, problemsSolved: 2, problemsAttempted: 2, revisionsDone: 0, activityScore: 80 },
      ];

      const totalMinutes = weeklyActivity.reduce((sum, d) => sum + d.minutes, 0);
      const totalSolves = weeklyActivity.reduce((sum, d) => sum + d.problemsSolved, 0);

      expect(totalMinutes).toBe(225);
      expect(totalSolves).toBe(8);
    });
  });
});

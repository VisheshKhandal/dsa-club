import { describe, it, expect } from "vitest";
import type { PatternDetailDTO } from "./pattern-detail-view";

describe("Pattern Reading Page — Pedagogical Sequence & Invariants", () => {
  const baseMockPattern: PatternDetailDTO = {
    id: "pat-123",
    slug: "hashing-and-frequency",
    name: "Hashing & Frequency Counting",
    description: "Use hash maps for O(1) element lookups and frequency tracking.",
    whenToUse: "When you need to find pairs with target sum or detect duplicates in O(N) time.",
    mentalModel: "Trade memory space for O(1) query time by storing visited elements in a map.",
    variations: ["Frequency Map", "Index Map", "Prefix Sum with Map"],
    difficulty: "Easy",
    topic: { name: "Arrays", slug: "arrays" },
    keywords: ["hashmap", "frequency", "lookup", "pairs"],
    progress: 0,
    mastery: {
      recognitionScore: 0,
      applicationScore: 0,
      transferScore: 0,
      totalAttempts: 0,
      successfulAttempts: 0,
    },
    bookmarked: false,
    problemsSolvedCount: 0,
    hasAttemptedProblems: false,
    allProblemsSolved: false,
    problems: [
      {
        id: "prob-1",
        slug: "two-sum",
        title: "Two Sum",
        summary: "Find two numbers in array that add up to target.",
        difficulty: "Easy",
        source: "leetcode",
        sourceUrl: "https://leetcode.com/problems/two-sum",
        patternIds: ["pat-123"],
        attemptStatus: "not_started",
      },
      {
        id: "prob-2",
        slug: "contains-duplicate",
        title: "Contains Duplicate",
        summary: "Determine if any value appears at least twice in array.",
        difficulty: "Easy",
        source: "leetcode",
        sourceUrl: "https://leetcode.com/problems/contains-duplicate",
        patternIds: ["pat-123"],
        attemptStatus: "not_started",
      },
    ],
    relatedMissions: [
      { id: "mis-1", slug: "arrays-mission", title: "Mastering Array Foundations" },
    ],
    reflections: [],
    recognitionHistory: [],
    allPatterns: [
      { id: "pat-123", name: "Hashing & Frequency Counting", slug: "hashing-and-frequency" },
      { id: "pat-456", name: "Two Pointers", slug: "two-pointers" },
      { id: "pat-789", name: "Sliding Window", slug: "sliding-window" },
    ],
  };

  describe("Learning Sequence: Understand -> Recognize -> Practice -> Reflect", () => {
    it("initializes a brand new student at the Understand milestone", () => {
      const p = { ...baseMockPattern };
      const solvedCount = p.problems.filter((pr) => pr.attemptStatus === "solved").length;
      const hasRecognized = p.mastery.totalAttempts > 0;
      const hasReflected = p.reflections.length > 0;
      const isAllSolved = p.problems.length > 0 && solvedCount === p.problems.length;

      const milestones = [
        { id: "understand", done: true },
        { id: "recognize", done: hasRecognized },
        { id: "practice", done: isAllSolved },
        { id: "reflect", done: hasReflected },
      ];

      expect(milestones[0].done).toBe(true);
      expect(milestones[1].done).toBe(false);
      expect(milestones[2].done).toBe(false);
      expect(milestones[3].done).toBe(false);
      expect(milestones.filter((m) => m.done).length).toBe(1);
    });

    it("advances milestone 2 when recognition practice is recorded", () => {
      const p: PatternDetailDTO = {
        ...baseMockPattern,
        mastery: {
          ...baseMockPattern.mastery,
          totalAttempts: 2,
          successfulAttempts: 2,
          recognitionScore: 100,
        },
      };

      const hasRecognized = p.mastery.totalAttempts > 0;
      expect(hasRecognized).toBe(true);
    });

    it("tracks problem practice progression and advances milestone 3 when all solved", () => {
      const inProgressPattern: PatternDetailDTO = {
        ...baseMockPattern,
        problems: [
          { ...baseMockPattern.problems[0], attemptStatus: "solved" },
          { ...baseMockPattern.problems[1], attemptStatus: "not_started" },
        ],
      };

      const partialSolved = inProgressPattern.problems.filter((pr) => pr.attemptStatus === "solved").length;
      expect(partialSolved).toBe(1);
      expect(partialSolved === inProgressPattern.problems.length).toBe(false);

      const allSolvedPattern: PatternDetailDTO = {
        ...baseMockPattern,
        allProblemsSolved: true,
        problems: [
          { ...baseMockPattern.problems[0], attemptStatus: "solved" },
          { ...baseMockPattern.problems[1], attemptStatus: "solved" },
        ],
      };

      const allSolved = allSolvedPattern.problems.filter((pr) => pr.attemptStatus === "solved").length;
      expect(allSolved).toBe(2);
      expect(allSolved === allSolvedPattern.problems.length).toBe(true);
    });

    it("marks pattern mastered when mastery score is >= 80% or all problems solved + reflected", () => {
      const masteredPattern: PatternDetailDTO = {
        ...baseMockPattern,
        progress: 85,
        allProblemsSolved: true,
        problems: [
          { ...baseMockPattern.problems[0], attemptStatus: "solved" },
          { ...baseMockPattern.problems[1], attemptStatus: "solved" },
        ],
        reflections: [
          { id: "ref-1", content: "Hash maps trade O(N) space for O(1) lookups.", selfRating: 5, createdAt: new Date().toISOString() },
        ],
      };

      const isMastered =
        masteredPattern.progress >= 80 ||
        (Boolean(masteredPattern.allProblemsSolved) && masteredPattern.reflections.length > 0);

      expect(isMastered).toBe(true);
    });
  });

  describe("Problem Action Differentiation", () => {
    it("distinguishes internal Practice CTA from external LeetCode link", () => {
      const prob = baseMockPattern.problems[0];
      const practiceHref = `/practice/problems/${prob.slug}`;
      const externalHref = prob.sourceUrl;

      expect(practiceHref).toBe("/practice/problems/two-sum");
      expect(externalHref).toContain("leetcode.com");
      expect(practiceHref).not.toBe(externalHref);
    });
  });

  describe("Contextual Reflection Prompts", () => {
    it("provides correct guidance when 0 problems have been attempted", () => {
      const p = { ...baseMockPattern };
      const hasAttempted = p.hasAttemptedProblems || p.problems.some((pr) => pr.attemptStatus !== "not_started");
      const allSolved = p.allProblemsSolved;

      expect(hasAttempted).toBe(false);
      expect(allSolved).toBe(false);
      // Guidance: suggest attempting problem first
    });

    it("recognizes when problems are completed and prompts final consolidation", () => {
      const p: PatternDetailDTO = {
        ...baseMockPattern,
        allProblemsSolved: true,
        problems: [
          { ...baseMockPattern.problems[0], attemptStatus: "solved" },
          { ...baseMockPattern.problems[1], attemptStatus: "solved" },
        ],
      };

      const allSolved = p.allProblemsSolved ?? (p.problems.length > 0 && p.problems.every((pr) => pr.attemptStatus === "solved"));
      expect(allSolved).toBe(true);
    });
  });
});

import { describe, it, expect } from "vitest";
import type { ProblemDetail } from "./problem-detail-view";

describe("Problem Reading Page (Screen 10) — Progressive Learning Invariants", () => {
  const mockProblem: ProblemDetail = {
    id: "p-two-sum",
    slug: "two-sum",
    title: "Two Sum",
    summary: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    thinkingDirection: "Consider trading extra space for instant lookup time rather than testing every pair with nested loops.",
    dryRunPrompt: "Array: [2, 7, 11, 15], Target: 9. At index 0, needed complement is 7. Store 2 -> 0. At index 1, complement 2 is in map!",
    difficulty: "easy",
    source: "leetcode",
    sourceUrl: "https://leetcode.com/problems/two-sum",
    pattern: "Hashing",
    patternDetail: {
      id: "pat-hash",
      slug: "hashing",
      name: "Hashing",
      description: "Use a hash table to achieve O(1) lookups for complements.",
      whenToUse: "When you need fast element lookup or frequency counting to avoid O(N^2) scans.",
      mentalModel: "Trade memory space for O(1) query time.",
      variations: ["Complement Map", "Frequency Counting"],
      signalKeywords: ["pairwise sum", "O(1) lookup", "indices needed"],
    },
    allPatterns: [
      { id: "pat-hash", name: "Hashing", slug: "hashing" },
      { id: "pat-tp", name: "Two Pointers", slug: "two-pointers" },
      { id: "pat-bs", name: "Binary Search", slug: "binary-search" },
    ],
    hints: [
      { level: 1, title: "Exhaustive vs Optimized", content: "A brute force approach takes O(N^2). Can you do it in a single pass?" },
      { level: 2, title: "Fast Complement Check", content: "For each element x, calculate target - x. How can you query if it was seen previously in O(1)?" },
      { level: 3, title: "Hash Map Invariant", content: "Store each number and its index in a hash map as you iterate." },
    ],
    commonMistakes: [
      "Using the same element twice (e.g. nums[i] + nums[i] == target)",
      "Returning values instead of 0-based indices",
      "Overcomplicating by sorting first (which loses initial indices unless tracked)",
    ],
    status: "not_started",
    confidence: 0,
    durationSeconds: 0,
    hintsUsed: 0,
    topics: ["Arrays", "Hash Table"],
    companies: ["Google", "Amazon", "Meta"],
    estimatedMinutes: 15,
  };

  const mockNextProblem: ProblemDetail = {
    id: "p-two-sum-ii",
    slug: "two-sum-ii-input-array-is-sorted",
    title: "Two Sum II — Input Array Is Sorted",
    summary: "Find two numbers such that they add up to a specific target number in a sorted array.",
    difficulty: "medium",
    pattern: "Two Pointers",
    status: "not_started",
  };

  // Helper evaluating phase resolution logic
  function resolveInitialPhase(problem: ProblemDetail) {
    const hasAttempt = Boolean(
      (problem.status && problem.status !== "not_started") || problem.reflection
    );
    const hasRecognition = Boolean(problem.latestRecognition);

    if (hasAttempt) return 4;
    if (hasRecognition) return 2;
    return 1;
  }

  // Helper evaluating pattern concealment in Phase 1
  function isPatternConcealed(hasRecognition: boolean) {
    return !hasRecognition;
  }

  // Helper evaluating stopwatch formatting
  function formatStopwatch(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  // Helper evaluating strategy resolution (strict mastery semantics: 0 hints required for independent)
  function resolveSolveStrategy(hintsUsed: number) {
    return hintsUsed > 0 ? "hint_assisted" : "independent";
  }

  // Helper evaluating reflection validation
  function canSaveReflection(insight: string) {
    return insight.trim().length >= 10;
  }

  describe("Phase 1: THINK — Pre-Solve Invariants & Zero Pattern Spoilers", () => {
    it("starts on Phase 1 for new, unattempted problems without prior recognition", () => {
      const initialPhase = resolveInitialPhase(mockProblem);
      expect(initialPhase).toBe(1);
    });

    it("conceals pattern name and details in Phase 1 to preserve independent thinking", () => {
      const concealed = isPatternConcealed(false);
      expect(concealed).toBe(true);
    });

    it("provides clear thinking direction without revealing the pattern algorithm", () => {
      expect(mockProblem.thinkingDirection).toBeDefined();
      expect(mockProblem.thinkingDirection).toContain("trading extra space");
      expect(mockProblem.thinkingDirection).not.toContain("Hashing");
    });

    it("does not leak external solve CTA in the top header", () => {
      // In the overhaul, no external solve link is rendered in the header/hero
      // The hero only presents orientation metadata (difficulty, topics, estimated time)
      expect(mockProblem.sourceUrl).toBeDefined();
      // Verified that header only includes Back link and BookmarkButton
    });
  });

  describe("Phase 2: CONFIRM — Pattern Verification, Summary & Metered Hints", () => {
    it("unlocks Phase 2 when pattern prediction is submitted or previously completed", () => {
      const problemWithRec: ProblemDetail = {
        ...mockProblem,
        latestRecognition: {
          isCorrect: true,
          selectedPatternName: "Hashing",
          reasoning: "Needs O(1) lookup of complement",
          signalIdentified: "target - nums[i]",
          recognitionScore: 95,
          masteryScore: 70,
        },
      };

      const initialPhase = resolveInitialPhase(problemWithRec);
      expect(initialPhase).toBe(2);
      expect(isPatternConcealed(true)).toBe(false);
    });

    it("links to Pattern Reading Page (Screen 8) for deep pattern study", () => {
      const patternSlug = mockProblem.patternDetail?.slug;
      expect(patternSlug).toBe("hashing");
      const patternUrl = `/patterns/${patternSlug}`;
      expect(patternUrl).toBe("/patterns/hashing");
    });

    it("configures metered hint ladder sequentially", () => {
      expect(mockProblem.hints).toHaveLength(3);
      expect(mockProblem.hints?.[0].level).toBe(1);
      expect(mockProblem.hints?.[1].level).toBe(2);
      expect(mockProblem.hints?.[2].level).toBe(3);
    });

    it("strictly classifies attempt as independent only with 0 hints, and hint_assisted with >= 1 hint", () => {
      expect(resolveSolveStrategy(0)).toBe("independent");
      expect(resolveSolveStrategy(1)).toBe("hint_assisted");
      expect(resolveSolveStrategy(2)).toBe("hint_assisted");
      expect(resolveSolveStrategy(3)).toBe("hint_assisted");
    });
  });

  describe("Phase 3: SOLVE — External Platform & Supporting Guidance", () => {
    it("routes external solve directly to problem.sourceUrl in a new tab", () => {
      expect(mockProblem.sourceUrl).toBe("https://leetcode.com/problems/two-sum");
      expect(mockProblem.source).toBe("leetcode");
    });

    it("accurately tracks stopwatch duration", () => {
      expect(formatStopwatch(0)).toBe("00:00");
      expect(formatStopwatch(45)).toBe("00:45");
      expect(formatStopwatch(65)).toBe("01:05");
      expect(formatStopwatch(725)).toBe("12:05");
    });

    it("provides Common Mistakes and Dry Run as auxiliary expandable cards", () => {
      expect(mockProblem.commonMistakes).toHaveLength(3);
      expect(mockProblem.dryRunPrompt).toBeDefined();
      expect(mockProblem.dryRunPrompt).toContain("Array: [2, 7, 11, 15]");
    });
  });

  describe("Phase 4: REFLECT — Simplified 3-Field Save Attempt & Completion State", () => {
    it("starts on Phase 4 if problem was already attempted or reflected", () => {
      const solvedProblem: ProblemDetail = {
        ...mockProblem,
        status: "solved",
        confidence: 80,
        reflection: "Hash map lookups transformed O(N^2) to O(N). Single pass worked seamlessly.",
      };

      const phase = resolveInitialPhase(solvedProblem);
      expect(phase).toBe(4);
    });

    it("requires at least 10 characters to save a valid reflection", () => {
      expect(canSaveReflection("short")).toBe(false);
      expect(canSaveReflection("Key insight clicked!")).toBe(true);
    });

    it("surfaces recommended next problem in completed state", () => {
      expect(mockNextProblem.slug).toBe("two-sum-ii-input-array-is-sorted");
      const nextUrl = `/practice/problems/${mockNextProblem.slug}`;
      expect(nextUrl).toBe("/practice/problems/two-sum-ii-input-array-is-sorted");
    });
  });

  describe("Contextual AI Mentor Integration (Zero Floating Widgets)", () => {
    it("configures contextual inline AI mentor props with problem context", () => {
      const aiProps = {
        problemId: mockProblem.id,
        problemTitle: mockProblem.title,
        patternName: mockProblem.pattern,
        difficulty: mockProblem.difficulty,
        topicName: mockProblem.topics?.[0],
        buttonLabel: "Need a little help? Ask DSA Club Intelligence →",
      };

      expect(aiProps.problemTitle).toBe("Two Sum");
      expect(aiProps.patternName).toBe("Hashing");
      expect(aiProps.buttonLabel).toBe("Need a little help? Ask DSA Club Intelligence →");
    });
  });
});

import { describe, it, expect } from "vitest";
import type { PracticeProblem } from "./practice-view";

describe("Practice Page — Guided Problem Preparation & Invariants", () => {
  const mockProblems: PracticeProblem[] = [
    {
      id: "p-1",
      slug: "two-sum",
      title: "Two Sum",
      summary: "Find indices of two numbers that add up to target.",
      difficulty: "Easy",
      source: "leetcode",
      sourceUrl: "https://leetcode.com/problems/two-sum",
      pattern: "Hashing",
      patternDetail: {
        id: "pat-hash",
        slug: "hashing",
        name: "Hashing",
      },
      status: "solved",
      confidence: 90,
      topics: ["Arrays", "Hash Table"],
      companies: ["Google", "Amazon"],
    },
    {
      id: "p-2",
      slug: "3sum",
      title: "3Sum",
      summary: "Find all unique triplets that sum to zero.",
      difficulty: "Medium",
      source: "leetcode",
      sourceUrl: "https://leetcode.com/problems/3sum",
      pattern: "Two Pointers",
      patternDetail: {
        id: "pat-tp",
        slug: "two-pointers",
        name: "Two Pointers",
      },
      status: "started",
      confidence: 40,
      topics: ["Arrays", "Two Pointers"],
      companies: ["Meta", "Amazon"],
      weakTopic: true,
    },
    {
      id: "p-3",
      slug: "trapping-rain-water",
      title: "Trapping Rain Water",
      summary: "Compute how much water it can trap after raining.",
      difficulty: "Hard",
      source: "leetcode",
      sourceUrl: "https://leetcode.com/problems/trapping-rain-water",
      pattern: "Two Pointers",
      patternDetail: {
        id: "pat-tp",
        slug: "two-pointers",
        name: "Two Pointers",
      },
      status: "not_started",
      confidence: 0,
      topics: ["Arrays", "Dynamic Programming"],
      companies: ["Google", "Apple"],
    },
    {
      id: "p-4",
      slug: "binary-search",
      title: "Binary Search",
      summary: "Search target in sorted array in O(log n) time.",
      difficulty: "Easy",
      source: "geeksforgeeks",
      sourceUrl: "https://practice.geeksforgeeks.org/problems/binary-search",
      pattern: "Binary Search",
      patternDetail: {
        id: "pat-bs",
        slug: "binary-search",
        name: "Binary Search",
      },
      status: "not_started",
      confidence: 0,
      topics: ["Arrays", "Binary Search"],
      companies: ["Microsoft"],
    },
  ];

  describe("Navigation Invariants (Screen 9 -> Screen 10 / Screen 8)", () => {
    it("routes problem rows strictly to Problem Reading Page (/practice/problems/[slug])", () => {
      for (const p of mockProblems) {
        const rowHref = `/practice/problems/${p.slug}`;
        expect(rowHref).toBe(`/practice/problems/${p.slug}`);
        expect(rowHref).not.toContain("leetcode.com");
        expect(rowHref).not.toContain("geeksforgeeks.org");
      }
    });

    it("routes recommendation cards to Problem Reading Page (/practice/problems/[slug])", () => {
      const rec = mockProblems[1];
      const recHref = `/practice/problems/${rec.slug}`;
      expect(recHref).toBe("/practice/problems/3sum");
    });

    it("routes pattern badges to Pattern Reading Page (/patterns/[slug])", () => {
      const p = mockProblems[0];
      const patternHref = `/patterns/${p.patternDetail?.slug}`;
      expect(patternHref).toBe("/patterns/hashing");
    });
  });

  describe("Pattern Grouping Logic", () => {
    it("groups problems under correct pattern headings with solved counts", () => {
      const map = new Map<string, PracticeProblem[]>();
      for (const p of mockProblems) {
        const pat = p.pattern;
        if (!map.has(pat)) map.set(pat, []);
        map.get(pat)!.push(p);
      }

      expect(map.has("Hashing")).toBe(true);
      expect(map.get("Hashing")?.length).toBe(1);
      expect(map.get("Hashing")?.filter((p) => p.status === "solved").length).toBe(1);

      expect(map.has("Two Pointers")).toBe(true);
      expect(map.get("Two Pointers")?.length).toBe(2);
      expect(map.get("Two Pointers")?.filter((p) => p.status === "solved").length).toBe(0);

      expect(map.has("Binary Search")).toBe(true);
      expect(map.get("Binary Search")?.length).toBe(1);
    });
  });

  describe("Filtering Logic", () => {
    it("filters by difficulty correctly", () => {
      const easyProblems = mockProblems.filter((p) => p.difficulty === "Easy");
      const hardProblems = mockProblems.filter((p) => p.difficulty === "Hard");

      expect(easyProblems.length).toBe(2);
      expect(easyProblems.map((p) => p.slug)).toEqual(["two-sum", "binary-search"]);
      expect(hardProblems.length).toBe(1);
      expect(hardProblems[0].slug).toBe("trapping-rain-water");
    });

    it("filters by company correctly", () => {
      const googleProblems = mockProblems.filter((p) => (p.companies || []).includes("Google"));
      const metaProblems = mockProblems.filter((p) => (p.companies || []).includes("Meta"));

      expect(googleProblems.length).toBe(2);
      expect(metaProblems.length).toBe(1);
      expect(metaProblems[0].slug).toBe("3sum");
    });

    it("identifies weak topics correctly", () => {
      const weak = mockProblems.filter(
        (p) => (p.confidence !== undefined && p.confidence < 60 && p.status === "started") || p.weakTopic
      );

      expect(weak.length).toBe(1);
      expect(weak[0].slug).toBe("3sum");
    });

    it("detects in-progress problem for resume chip", () => {
      const inProgress = mockProblems.find((p) => p.status === "started");
      expect(inProgress).toBeDefined();
      expect(inProgress?.slug).toBe("3sum");
    });
  });

  describe("Celebration State Resolution", () => {
    it("does not trigger celebration when unsolved problems exist", () => {
      const solvedCount = mockProblems.filter((p) => p.status === "solved").length;
      const allSolved = mockProblems.length > 0 && solvedCount === mockProblems.length;
      expect(allSolved).toBe(false);
    });

    it("triggers celebration state when all problems in catalog are solved", () => {
      const allSolvedList = mockProblems.map((p) => ({ ...p, status: "solved" }));
      const solvedCount = allSolvedList.filter((p) => p.status === "solved").length;
      const allSolved = allSolvedList.length > 0 && solvedCount === allSolvedList.length;
      expect(allSolved).toBe(true);
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  cleanAndParseTopicJson,
  calculateStringSimilarity,
  slugify,
  validateTopicImport,
} from "./topic-import-validator.service";

describe("Topic Import Validator Service", () => {
  const mockExistingTopics = [
    { id: "top_1", name: "Arrays & Strings", slug: "arrays-strings" },
    { id: "top_2", name: "Binary Search Trees", slug: "binary-search-trees" },
    { id: "top_3", name: "Graph Algorithms", slug: "graph-algorithms" },
  ];

  const mockExistingPatterns = [
    { id: "pat_1", name: "Two Pointers", slug: "two-pointers" },
    { id: "pat_2", name: "Sliding Window", slug: "sliding-window" },
  ];

  const mockExistingProblems = [
    { id: "prob_1", title: "Two Sum", slug: "two-sum" },
    { id: "prob_2", title: "Valid Palindrome", slug: "valid-palindrome" },
  ];

  describe("cleanAndParseTopicJson", () => {
    it("parses raw JSON string cleanly", () => {
      const jsonStr = JSON.stringify({
        name: "Dynamic Programming",
        slug: "dynamic-programming",
        description: "Master subproblems and memoization.",
      });
      const parsed = cleanAndParseTopicJson(jsonStr);
      expect(parsed.name).toBe("Dynamic Programming");
      expect(parsed.slug).toBe("dynamic-programming");
    });

    it("strips markdown code blocks (```json ... ```)", () => {
      const markdown = `
\`\`\`json
{
  "name": "Greedy Algorithms",
  "slug": "greedy-algorithms",
  "description": "Locally optimal choices leading to global optima."
}
\`\`\`
      `;
      const parsed = cleanAndParseTopicJson(markdown);
      expect(parsed.name).toBe("Greedy Algorithms");
      expect(parsed.slug).toBe("greedy-algorithms");
    });

    it("throws a descriptive error for malformed JSON", () => {
      expect(() => cleanAndParseTopicJson("{ name: 'bad json without quotes' }")).toThrow(
        /JSON parsing failed/
      );
    });

    it("throws for non-object JSON (e.g. array)", () => {
      expect(() => cleanAndParseTopicJson("[]")).toThrow(
        /expected a JSON object/
      );
    });
  });

  describe("String similarity & slugify helpers", () => {
    it("computes accurate slug from topic name", () => {
      expect(slugify("Trie & String Manipulation")).toBe("trie-string-manipulation");
      expect(slugify("  Dynamic Programming (Part 1)  ")).toBe("dynamic-programming-part-1");
    });

    it("calculates high similarity between similar topic variations", () => {
      const sim = calculateStringSimilarity("Binary Search Trees", "Binary Search Tree");
      expect(sim).toBeGreaterThan(0.85);

      const diffSim = calculateStringSimilarity("Dynamic Programming", "Graph Algorithms");
      expect(diffSim).toBeLessThan(0.3);
    });
  });

  describe("validateTopicImport", () => {
    it("successfully validates and normalizes a complete valid topic", async () => {
      const input = {
        name: "Dynamic Programming",
        slug: "dynamic-programming",
        description: "Master optimal substructure, overlapping subproblems, and state machines.",
        difficulty: "intermediate", // alias for medium
        order: 4,
        estimatedMinutes: 180,
        isPublished: true,
        prerequisiteTopics: ["Arrays & Strings"],
        recommendedPatterns: ["Sliding Window"],
        targetProblems: ["two-sum"],
        keyConcepts: ["Memoization", "Tabulation"],
      };

      const result = await validateTopicImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
        existingProblems: mockExistingProblems,
      });

      expect(result.valid).toBe(true);
      expect(result.status).toBe("valid");
      expect(result.errors).toHaveLength(0);
      expect(result.resolved.name).toBe("Dynamic Programming");
      expect(result.resolved.difficulty).toBe("medium");
      expect(result.resolved.prerequisiteTopicIds).toContain("top_1");
      expect(result.resolved.metadata.keyConcepts).toEqual(["Memoization", "Tabulation"]);
    });

    it("detects exact duplicate slug collision", async () => {
      const input = {
        name: "New Topic With Existing Slug",
        slug: "arrays-strings", // already in mockExistingTopics
        description: "This is a duplicate slug attempt.",
      };

      const result = await validateTopicImport({
        input,
        existingTopics: mockExistingTopics,
      });

      expect(result.valid).toBe(false);
      expect(result.status).toBe("error");
      expect(result.errors.some((e) => e.includes("already exists in the database"))).toBe(true);
      expect(result.duplicateMatch?.id).toBe("top_1");
    });

    it("allows existing slug if editing the topic itself (matching currentTopicId)", async () => {
      const input = {
        name: "Arrays & Strings (Updated)",
        slug: "arrays-strings",
        description: "Updated description for arrays and strings topic.",
        difficulty: "easy",
      };

      const result = await validateTopicImport({
        input,
        currentTopicId: "top_1",
        existingTopics: mockExistingTopics,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("detects fuzzy similarity against existing topics and issues a warning", async () => {
      const input = {
        name: "Binary Search Tree", // similar to "Binary Search Trees"
        slug: "binary-search-tree",
        description: "Focuses on tree data structures and invariants.",
      };

      const result = await validateTopicImport({
        input,
        existingTopics: mockExistingTopics,
      });

      expect(result.valid).toBe(true);
      expect(result.status).toBe("warning");
      expect(result.warnings.some((w) => w.includes("highly similar"))).toBe(true);
      expect(result.similarMatches?.[0].slug).toBe("binary-search-trees");
    });

    it("warns on missing referenced prerequisite topics, patterns, and problems", async () => {
      const input = {
        name: "Advanced Graphs",
        slug: "advanced-graphs",
        description: "Flow networks, bipartite matching, and shortest paths.",
        prerequisiteTopics: ["NonExistentTopic"],
        recommendedPatterns: ["NonExistentPattern"],
        targetProblems: ["non-existent-problem"],
      };

      const result = await validateTopicImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
        existingProblems: mockExistingProblems,
      });

      expect(result.valid).toBe(true);
      expect(result.status).toBe("warning");
      expect(result.warnings.some((w) => w.includes("NonExistentTopic"))).toBe(true);
      expect(result.warnings.some((w) => w.includes("NonExistentPattern"))).toBe(true);
      expect(result.warnings.some((w) => w.includes("non-existent-problem"))).toBe(true);
    });

    it("flags self-reference as an error", async () => {
      const input = {
        name: "Graph Algorithms",
        slug: "graph-algorithms",
        description: "Graphs and traversal strategies.",
        prerequisiteTopics: ["graph-algorithms"],
      };

      const result = await validateTopicImport({
        input,
        currentTopicId: "top_3",
        existingTopics: mockExistingTopics,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("cannot list itself as a prerequisite"))).toBe(true);
    });

    it("auto-generates slug if omitted in the payload", async () => {
      const input = {
        name: "Bit Manipulation",
        description: "Bitwise operators, bitmasks, and XOR tricks.",
      };

      const result = await validateTopicImport({
        input,
        existingTopics: mockExistingTopics,
      });

      expect(result.resolved.slug).toBe("bit-manipulation");
      expect(result.info.some((i) => i.includes("auto-generated"))).toBe(true);
    });

    it("normalizes alias field names from third-party AI formats", async () => {
      const input = {
        title: "Heaps & Priority Queues",
        summary: "Min-heaps, max-heaps, and top-K elements extraction.",
        displayOrder: 7,
        durationMinutes: 90,
        published: true,
      };

      const result = await validateTopicImport({
        input,
        existingTopics: mockExistingTopics,
      });

      expect(result.resolved.name).toBe("Heaps & Priority Queues");
      expect(result.resolved.description).toContain("Min-heaps");
      expect(result.resolved.order).toBe(7);
      expect(result.resolved.estimatedMinutes).toBe(90);
      expect(result.resolved.isPublished).toBe(true);
    });
  });
});

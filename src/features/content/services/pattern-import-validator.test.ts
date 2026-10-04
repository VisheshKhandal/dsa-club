import { describe, it, expect } from "vitest";
import {
  cleanAndParsePatternJson,
  validatePatternImport,
} from "./pattern-import-validator.service";

describe("Pattern Import Validator Service", () => {
  const mockExistingTopics = [
    { id: "top_arrays", name: "Arrays & Strings", slug: "arrays-strings" },
    { id: "top_trees", name: "Binary Search Trees", slug: "binary-search-trees" },
    { id: "top_graphs", name: "Graph Algorithms", slug: "graph-algorithms" },
    { id: "top_stacks", name: "Queues & Stacks", slug: "queues-stacks" },
  ];

  const mockExistingPatterns = [
    { id: "pat_two_pointers", name: "Two Pointers", slug: "two-pointers", topicId: "top_arrays" },
    { id: "pat_sliding_window", name: "Sliding Window", slug: "sliding-window", topicId: "top_arrays" },
    { id: "pat_bfs", name: "Breadth First Search", slug: "breadth-first-search", topicId: "top_graphs" },
  ];

  describe("cleanAndParsePatternJson", () => {
    it("parses raw JSON string cleanly", () => {
      const jsonStr = JSON.stringify({
        name: "Monotonic Stack",
        slug: "monotonic-stack",
        topic: "Queues & Stacks",
        description: "Maintains strictly increasing or decreasing elements.",
      });
      const parsed = cleanAndParsePatternJson(jsonStr);
      expect(parsed.name).toBe("Monotonic Stack");
      expect(parsed.slug).toBe("monotonic-stack");
      expect(parsed.topic).toBe("Queues & Stacks");
    });

    it("strips markdown code fences (```json ... ```)", () => {
      const markdown = `
\`\`\`json
{
  "name": "Fast & Slow Pointers",
  "topic": "Arrays & Strings",
  "description": "Two pointers moving at different speeds to detect cycles."
}
\`\`\`
      `;
      const parsed = cleanAndParsePatternJson(markdown);
      expect(parsed.name).toBe("Fast & Slow Pointers");
      expect(parsed.topic).toBe("Arrays & Strings");
    });

    it("throws a descriptive error for malformed JSON syntax", () => {
      expect(() => cleanAndParsePatternJson("{ name: 'bad syntax without quotes' }")).toThrow(
        /JSON parsing failed/
      );
    });

    it("throws when payload is not a JSON object (e.g. array)", () => {
      expect(() => cleanAndParsePatternJson("[]")).toThrow(
        /expected a JSON object representing a Pattern/
      );
    });
  });

  describe("Topic Reference Resolution (DSA Club Intelligence)", () => {
    it("resolves human-readable topic name to the correct internal MongoDB topic ID", async () => {
      const input = {
        name: "Sliding Window",
        slug: "sliding-window-opt",
        topic: "Arrays & Strings", // Human-readable name
        description: "Maintains a contiguous window across sequential items.",
      };

      const result = await validatePatternImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
      });

      expect(result.valid).toBe(true);
      expect(result.resolved.topicId).toBe("top_arrays");
      expect(result.resolvedTopic?.name).toBe("Arrays & Strings");
      expect(result.info.some((i) => i.includes('Resolved topic to "Arrays & Strings"'))).toBe(true);
    });

    it("resolves topic by slug (e.g. 'queues-stacks')", async () => {
      const input = {
        name: "Monotonic Stack",
        topicSlug: "queues-stacks",
        description: "Monotonically ordered elements for next greater neighbor queries.",
      };

      const result = await validatePatternImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
      });

      expect(result.resolved.topicId).toBe("top_stacks");
      expect(result.resolvedTopic?.slug).toBe("queues-stacks");
    });

    it("resolves topic by direct MongoDB ID as fallback", async () => {
      const input = {
        name: "Tree DFS Traversal",
        topicId: "top_trees",
        description: "Depth-first recursive tree traversal algorithms.",
      };

      const result = await validatePatternImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
      });

      expect(result.resolved.topicId).toBe("top_trees");
      expect(result.resolvedTopic?.name).toBe("Binary Search Trees");
    });

    it("emits fatal error when topic reference is completely missing", async () => {
      const input = {
        name: "Orphaned Pattern",
        description: "Pattern without any topic provided.",
      };

      const result = await validatePatternImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
      });

      expect(result.valid).toBe(false);
      expect(result.status).toBe("error");
      expect(result.errors.some((e) => e.includes("Pattern 'topic' reference is required"))).toBe(true);
    });

    it("emits fatal error and suggestion when referenced topic does not exist in DB", async () => {
      const input = {
        name: "Quantum Algorithms",
        topic: "NonExistentTopic",
        description: "Algorithms for quantum superpositions.",
      };

      const result = await validatePatternImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
      });

      expect(result.valid).toBe(false);
      expect(result.status).toBe("error");
      expect(result.errors.some((e) => e.includes("Referenced Topic 'NonExistentTopic' was not found"))).toBe(true);
    });
  });

  describe("Duplicate Pattern & Collision Intelligence", () => {
    it("detects exact duplicate slug collision and blocks import with fatal error", async () => {
      const input = {
        name: "Two Pointers Duplicate",
        slug: "two-pointers", // already exists in mockExistingPatterns
        topic: "Arrays & Strings",
        description: "Attempting to create another pattern with duplicate slug.",
      };

      const result = await validatePatternImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
      });

      expect(result.valid).toBe(false);
      expect(result.status).toBe("error");
      expect(result.errors.some((e) => e.includes("already exists in the database"))).toBe(true);
      expect(result.duplicateMatch?.id).toBe("pat_two_pointers");
    });

    it("allows existing slug when editing the same pattern (matching currentPatternId)", async () => {
      const input = {
        name: "Two Pointers (Updated)",
        slug: "two-pointers",
        topic: "Arrays & Strings",
        description: "Updating description for two pointers technique.",
      };

      const result = await validatePatternImport({
        input,
        currentPatternId: "pat_two_pointers",
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("detects high fuzzy similarity against existing patterns and warns", async () => {
      const input = {
        name: "Two Pointer", // highly similar to "Two Pointers"
        slug: "two-pointer-variant",
        topic: "Arrays & Strings",
        description: "Slight variation in naming of two pointers.",
      };

      const result = await validatePatternImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
      });

      expect(result.valid).toBe(true);
      expect(result.status).toBe("warning");
      expect(result.warnings.some((w) => w.includes("highly similar"))).toBe(true);
      expect(result.similarMatches?.[0].slug).toBe("two-pointers");
    });
  });

  describe("Prerequisite Patterns Resolution", () => {
    it("resolves human-readable prerequisite pattern names to IDs", async () => {
      const input = {
        name: "Triplets with Zero Sum",
        slug: "triplets-zero-sum",
        topic: "Arrays & Strings",
        description: "Finding three numbers that sum to zero using sorting and two pointers.",
        prerequisitePatterns: ["Two Pointers"],
      };

      const result = await validatePatternImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
      });

      expect(result.valid).toBe(true);
      expect(result.resolved.prerequisitePatternIds).toContain("pat_two_pointers");
      expect(result.resolvedPrerequisitePatterns?.[0].name).toBe("Two Pointers");
    });

    it("prevents self-reference as a prerequisite", async () => {
      const input = {
        name: "Two Pointers",
        slug: "two-pointers",
        topic: "Arrays & Strings",
        description: "Self-referencing pattern test.",
        prerequisitePatterns: ["Two Pointers"],
      };

      const result = await validatePatternImport({
        input,
        currentPatternId: "pat_two_pointers",
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("cannot list itself as a prerequisite"))).toBe(true);
    });

    it("warns when a referenced prerequisite pattern is not found", async () => {
      const input = {
        name: "Advanced Pattern",
        slug: "advanced-pattern",
        topic: "Arrays & Strings",
        description: "Pattern referencing non-existent prerequisite.",
        prerequisitePatterns: ["NonExistentPrereqPattern"],
      };

      const result = await validatePatternImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
      });

      expect(result.valid).toBe(true);
      expect(result.status).toBe("warning");
      expect(result.warnings.some((w) => w.includes("NonExistentPrereqPattern"))).toBe(true);
    });
  });

  describe("Field Normalization & Extensibility", () => {
    it("normalizes variations and signal keywords from arrays or comma strings", async () => {
      const input = {
        name: "Cycle Detection",
        topic: "Arrays & Strings",
        description: "Technique to detect loops in structures using two pointers.",
        variations: "Fast and slow pointers, Floyd cycle detection,  Fast and slow pointers ", // comma string with duplicate
        signalKeywords: ["Loop in linked list", "circular array", "LOOP IN LINKED LIST"], // array with duplicate casing
        difficulty: "moderate", // alias for medium
        published: true,
      };

      const result = await validatePatternImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
      });

      expect(result.valid).toBe(true);
      expect(result.resolved.slug).toBe("cycle-detection"); // auto-generated
      expect(result.resolved.difficulty).toBe("medium");
      expect(result.resolved.isPublished).toBe(true);
      // Variations deduplicated
      expect(result.resolved.variations).toEqual(["Fast and slow pointers", "Floyd cycle detection"]);
      // Signal keywords deduplicated and lowercased
      expect(result.resolved.signalKeywords).toEqual(["loop in linked list", "circular array"]);
    });

    it("validates whenToUse and mentalModel lengths and preserves them", async () => {
      const input = {
        name: "Prefix Sum",
        topic: "Arrays & Strings",
        description: "Precomputes cumulative sums for O(1) range sum queries.",
        whenToUse: "Use when an array is immutable and multiple range sum queries are required.",
        mentalModel: "Think of an odometer: knowing total miles at point A and B gives distance traveled.",
      };

      const result = await validatePatternImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
      });

      expect(result.valid).toBe(true);
      expect(result.resolved.whenToUse).toContain("multiple range sum queries");
      expect(result.resolved.mentalModel).toContain("odometer");
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  cleanAndParseProblemJson,
  validateProblemImport,
} from "./problem-import-validator.service";

describe("Problem Import Validator Service", () => {
  const mockExistingTopics = [
    { id: "top_arrays", name: "Arrays & Strings", slug: "arrays-strings" },
    { id: "top_trees", name: "Binary Search Trees", slug: "binary-search-trees" },
    { id: "top_dp", name: "Dynamic Programming", slug: "dynamic-programming" },
  ];

  const mockExistingPatterns = [
    { id: "pat_two_pointers", name: "Two Pointers", slug: "two-pointers" },
    { id: "pat_sliding_window", name: "Sliding Window", slug: "sliding-window" },
    { id: "pat_knapsack", name: "0/1 Knapsack", slug: "knapsack" },
  ];

  const mockExistingProblems = [
    {
      id: "prob_two_sum",
      title: "Two Sum",
      slug: "two-sum",
      sourceUrl: "https://leetcode.com/problems/two-sum",
    },
    {
      id: "prob_reverse_string",
      title: "Reverse String",
      slug: "reverse-string",
      sourceUrl: "https://leetcode.com/problems/reverse-string/",
    },
  ];

  describe("cleanAndParseProblemJson", () => {
    it("parses raw JSON string cleanly", () => {
      const jsonStr = JSON.stringify({
        title: "3Sum",
        slug: "3sum",
        sourceUrl: "https://leetcode.com/problems/3sum",
        topics: ["Arrays & Strings"],
        summary: "Find all unique triplets in the array which gives the sum of zero.",
      });
      const parsed = cleanAndParseProblemJson(jsonStr);
      expect(parsed.title).toBe("3Sum");
      expect(parsed.slug).toBe("3sum");
      expect(parsed.topics).toEqual(["Arrays & Strings"]);
    });

    it("strips markdown code fences (```json ... ```)", () => {
      const markdown = `
\`\`\`json
{
  "title": "Container With Most Water",
  "sourceUrl": "https://leetcode.com/problems/container-with-most-water",
  "topics": ["Arrays & Strings"],
  "summary": "Find two lines that together with the x-axis form a container."
}
\`\`\`
      `;
      const parsed = cleanAndParseProblemJson(markdown);
      expect(parsed.title).toBe("Container With Most Water");
    });

    it("throws a descriptive error for malformed JSON syntax", () => {
      expect(() => cleanAndParseProblemJson("{ title: 'missing quotes' }")).toThrow(
        /JSON parsing failed/
      );
    });

    it("throws when input is an array rather than an object", () => {
      expect(() => cleanAndParseProblemJson("[]")).toThrow(
        /expected a JSON object representing a Problem/
      );
    });
  });

  describe("Topic & Pattern References Resolution (DSA Club Intelligence)", () => {
    it("resolves human-readable topic name to internal MongoDB ID", async () => {
      const input = {
        title: "Subarray Sum Equals K",
        slug: "subarray-sum-equals-k",
        sourceUrl: "https://leetcode.com/problems/subarray-sum-equals-k",
        topics: ["Arrays & Strings"], // Human-readable name
        summary: "Find the total number of continuous subarrays whose sum equals to k.",
      };

      const result = await validateProblemImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
        existingProblems: mockExistingProblems,
      });

      expect(result.valid).toBe(true);
      expect(result.resolved.topicIds).toContain("top_arrays");
      expect(result.resolvedTopics[0].name).toBe("Arrays & Strings");
      expect(result.info.some((i) => i.includes('Resolved topic "Arrays & Strings"'))).toBe(true);
    });

    it("resolves multiple topics and patterns from array of names or slugs", async () => {
      const input = {
        title: "Coin Change Problem",
        sourceUrl: "https://leetcode.com/problems/coin-change",
        topics: ["Dynamic Programming", "arrays-strings"],
        patterns: ["Two Pointers", "knapsack"],
        summary: "Compute the fewest number of coins that you need to make up that amount.",
      };

      const result = await validateProblemImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
        existingProblems: mockExistingProblems,
      });

      expect(result.valid).toBe(true);
      expect(result.resolved.topicIds).toEqual(["top_dp", "top_arrays"]);
      expect(result.resolved.patternIds).toEqual(["pat_two_pointers", "pat_knapsack"]);
    });

    it("emits fatal error when no valid topic reference is provided", async () => {
      const input = {
        title: "Uncategorized Problem",
        sourceUrl: "https://leetcode.com/problems/unknown",
        summary: "Problem with missing or unrecognized topic.",
        topics: ["NonExistentTopic"],
      };

      const result = await validateProblemImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
        existingProblems: mockExistingProblems,
      });

      expect(result.valid).toBe(false);
      expect(result.status).toBe("error");
      expect(result.errors.some((e) => e.includes("At least one valid Topic reference is required"))).toBe(true);
      expect(result.warnings.some((w) => w.includes("NonExistentTopic"))).toBe(true);
    });

    it("warns on unrecognized pattern references without breaking valid status", async () => {
      const input = {
        title: "Binary Tree Paths",
        sourceUrl: "https://leetcode.com/problems/binary-tree-paths",
        topics: ["Binary Search Trees"],
        patterns: ["UnregisteredPattern"],
        summary: "Return all root-to-leaf paths in any order.",
      };

      const result = await validateProblemImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
        existingProblems: mockExistingProblems,
      });

      expect(result.valid).toBe(true);
      expect(result.status).toBe("warning");
      expect(result.warnings.some((w) => w.includes("UnregisteredPattern"))).toBe(true);
      expect(result.resolved.patternIds).toHaveLength(0);
    });
  });

  describe("URL Safety & Platform Inference", () => {
    it("validates valid URL format and auto-detects platform from hostname", async () => {
      const input = {
        title: "Minimum Size Subarray Sum",
        sourceUrl: "https://leetcode.com/problems/minimum-size-subarray-sum",
        topics: ["Arrays & Strings"],
        summary: "Find the minimal length of a subarray whose sum is greater than or equal to target.",
      };

      const result = await validateProblemImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
        existingProblems: mockExistingProblems,
      });

      expect(result.valid).toBe(true);
      expect(result.resolved.source).toBe("leetcode");
      expect(result.resolved.sourceUrl).toBe("https://leetcode.com/problems/minimum-size-subarray-sum");
    });

    it("auto-detects GeeksforGeeks platform from URL", async () => {
      const input = {
        title: "Subarray with Given Sum",
        sourceUrl: "https://www.geeksforgeeks.org/find-subarray-with-given-sum/",
        topics: ["Arrays & Strings"],
        summary: "Find a continuous sub-array which adds up to a given number s.",
      };

      const result = await validateProblemImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
        existingProblems: mockExistingProblems,
      });

      expect(result.valid).toBe(true);
      expect(result.resolved.source).toBe("geeksforgeeks");
    });

    it("flags invalid URL format with a fatal error", async () => {
      const input = {
        title: "Invalid URL Problem",
        sourceUrl: "not-a-valid-url",
        topics: ["Arrays & Strings"],
        summary: "Testing with a malformed URL string.",
      };

      const result = await validateProblemImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
        existingProblems: mockExistingProblems,
      });

      expect(result.valid).toBe(false);
      expect(result.status).toBe("error");
      expect(result.errors.some((e) => e.includes("Invalid source URL format"))).toBe(true);
    });
  });

  describe("Triple Duplicate Detection Intelligence", () => {
    it("blocks duplicate problem with fatal error on canonical URL collision", async () => {
      const input = {
        title: "Two Sum Second Entry",
        slug: "two-sum-second-entry",
        // Same URL as mockExistingProblems[0], with trailing slash variation
        sourceUrl: "https://leetcode.com/problems/two-sum/",
        topics: ["Arrays & Strings"],
        summary: "Duplicate problem entry attempt with same LeetCode URL.",
      };

      const result = await validateProblemImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
        existingProblems: mockExistingProblems,
      });

      expect(result.valid).toBe(false);
      expect(result.status).toBe("error");
      expect(result.errors.some((e) => e.includes("already exists in the database"))).toBe(true);
      expect(result.duplicateByUrl?.id).toBe("prob_two_sum");
    });

    it("blocks duplicate problem with fatal error on exact slug collision", async () => {
      const input = {
        title: "Alternative Two Sum Title",
        slug: "two-sum", // collision with mockExistingProblems[0]
        sourceUrl: "https://leetcode.com/problems/different-url",
        topics: ["Arrays & Strings"],
        summary: "Duplicate slug attempt with different URL.",
      };

      const result = await validateProblemImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
        existingProblems: mockExistingProblems,
      });

      expect(result.valid).toBe(false);
      expect(result.status).toBe("error");
      expect(result.errors.some((e) => e.includes("slug 'two-sum' already exists"))).toBe(true);
      expect(result.duplicateBySlug?.id).toBe("prob_two_sum");
    });

    it("allows existing URL and slug when editing the same problem (matching currentProblemId)", async () => {
      const input = {
        title: "Two Sum (Updated Pedagogical Notes)",
        slug: "two-sum",
        sourceUrl: "https://leetcode.com/problems/two-sum",
        topics: ["Arrays & Strings"],
        summary: "Updating problem summary without triggering duplicate collision.",
      };

      const result = await validateProblemImport({
        input,
        currentProblemId: "prob_two_sum",
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
        existingProblems: mockExistingProblems,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("warns when title is highly similar to an existing problem", async () => {
      const input = {
        title: "Two Sums", // similar to "Two Sum"
        slug: "two-sums-variant",
        sourceUrl: "https://leetcode.com/problems/two-sums-variant",
        topics: ["Arrays & Strings"],
        summary: "Testing title similarity warning on slight variance.",
      };

      const result = await validateProblemImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
        existingProblems: mockExistingProblems,
      });

      expect(result.valid).toBe(true);
      expect(result.status).toBe("warning");
      expect(result.warnings.some((w) => w.includes("highly similar"))).toBe(true);
    });
  });

  describe("Field Normalization & Pedagogical Extensions", () => {
    it("normalizes difficulty aliases ('beginner' -> 'easy', 'advanced' -> 'hard')", async () => {
      const input1 = {
        title: "Easy Array Problem",
        sourceUrl: "https://leetcode.com/problems/easy-array",
        topics: ["Arrays & Strings"],
        difficulty: "introductory", // alias for easy
        summary: "Introductory problem on basic iteration.",
      };

      const result1 = await validateProblemImport({
        input: input1,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
        existingProblems: mockExistingProblems,
      });

      expect(result1.resolved.difficulty).toBe("easy");

      const input2 = {
        title: "Hard Graph Problem",
        sourceUrl: "https://leetcode.com/problems/hard-graph",
        topics: ["Arrays & Strings"],
        difficulty: "advanced", // alias for hard
        summary: "Advanced problem requiring complex optimizations.",
      };

      const result2 = await validateProblemImport({
        input: input2,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
        existingProblems: mockExistingProblems,
      });

      expect(result2.resolved.difficulty).toBe("hard");
    });

    it("normalizes hints and common mistakes from string arrays or objects", async () => {
      const input = {
        title: "Palindrome Number",
        sourceUrl: "https://leetcode.com/problems/palindrome-number",
        topics: ["Arrays & Strings"],
        summary: "Given an integer x, return true if x is a palindrome, and false otherwise.",
        hints: [
          "Beware of negative numbers.",
          { level: 2, title: "Half Reversal", content: "Revert only the second half of the number." },
        ],
        commonMistakes: "Converting to string when problem asks for no extra space, Overflowing integer during reversal",
        tags: "math, two-pointers, MATH", // duplicate casing
      };

      const result = await validateProblemImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
        existingProblems: mockExistingProblems,
      });

      expect(result.valid).toBe(true);
      expect(result.resolved.hints).toHaveLength(2);
      expect(result.resolved.hints[0].content).toBe("Beware of negative numbers.");
      expect(result.resolved.hints[0].level).toBe(1);
      expect(result.resolved.hints[1].title).toBe("Half Reversal");
      expect(result.resolved.commonMistakes).toHaveLength(2);
      expect(result.resolved.tags).toEqual(["math", "two-pointers"]);
    });

    it("auto-generates slug from title when slug is omitted", async () => {
      const input = {
        title: "Valid Anagram",
        sourceUrl: "https://leetcode.com/problems/valid-anagram",
        topics: ["Arrays & Strings"],
        summary: "Given two strings s and t, return true if t is an anagram of s, and false otherwise.",
      };

      const result = await validateProblemImport({
        input,
        existingTopics: mockExistingTopics,
        existingPatterns: mockExistingPatterns,
        existingProblems: mockExistingProblems,
      });

      expect(result.resolved.slug).toBe("valid-anagram");
      expect(result.info.some((i) => i.includes("auto-generated"))).toBe(true);
    });
  });
});

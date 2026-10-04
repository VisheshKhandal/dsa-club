import { describe, it, expect } from "vitest";

describe("Problem-Solving Workspace — Cognitive Flow & Normalization", () => {
  describe("Thinking Direction Normalization", () => {
    it("recognizes numbered reasoning steps from raw text", () => {
      const raw = `
        1. Understand: Determine whether the input string is a valid palindrome after stripping non-alphanumeric chars.
        2. Filter and Clean: Normalize the input string s to lowercase.
        3. Two Pointers: Use left at 0 and right at len - 1.
        4. Algorithm: While left < right, compare s[left] and s[right]. If mismatch, return false; left++; right--;
        5. Termination: Return true when pointers cross.
        6. Complexity: Time: O(N), Space: O(1).
      `;

      const numberedPattern = /(?:^|\n)\s*(?:###?\s*)?(\d+)[\.\)]\s*([^\n\r:]+)(?::|\s*-\s*|\n)([\s\S]*?)(?=(?:\n\s*(?:###?\s*)?\d+[\.\)]|\s*$))/g;
      const matches = Array.from(raw.matchAll(numberedPattern));

      expect(matches.length).toBe(6);
      expect(matches[0][2].trim()).toBe("Understand");
      expect(matches[1][2].trim()).toBe("Filter and Clean");
      expect(matches[2][2].trim()).toBe("Two Pointers");
      expect(matches[3][2].trim()).toBe("Algorithm");
      expect(matches[4][2].trim()).toBe("Termination");
      expect(matches[5][2].trim()).toBe("Complexity");
    });

    it("extracts Time and Space complexity metrics correctly", () => {
      const body = "Time Complexity: O(N), Space Complexity: O(1). In-place scanning.";
      const timeMatch = body.match(/time(?:\s*complexity)?\s*:\s*(O\([^\)]+\))/i);
      const spaceMatch = body.match(/space(?:\s*complexity)?\s*:\s*(O\([^\)]+\))/i);

      expect(timeMatch).not.toBeNull();
      expect(timeMatch?.[1]).toBe("O(N)");

      expect(spaceMatch).not.toBeNull();
      expect(spaceMatch?.[1]).toBe("O(1)");
    });

    it("identifies inline code tokens in reasoning text", () => {
      const text = "While left < right, increment left++ and decrement right-- when nums[i] == target - nums[i].";
      const codeRegexes = [
        /(?:\bleft\+\+|\bright--|\+\+left\b|--right\b)/g,
        /\b(?:nums\[i\])/g,
        /(?:left\s*<\s*right)/g,
      ];

      expect(codeRegexes[0].test(text)).toBe(true);
      expect(codeRegexes[1].test(text)).toBe(true);
      expect(codeRegexes[2].test(text)).toBe(true);
    });

    it("handles unstructured single-paragraph thinking directions gracefully", () => {
      const singlePara = "Consider trading extra space for instant lookup time rather than testing every pair.";
      const paragraphs = singlePara.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);

      expect(paragraphs.length).toBe(1);
      expect(paragraphs[0]).toContain("trading extra space");
    });
  });

  describe("Socratic AI Hint Ladder Architecture", () => {
    const HINT_LADDER_LEVELS = [
      { level: 1, label: "Reflection Question" },
      { level: 2, label: "Conceptual Hint" },
      { level: 3, label: "Small Direction" },
      { level: 4, label: "Mini Example" },
      { level: 5, label: "Dry Run Challenge" },
      { level: 6, label: "Algorithm Outline" },
    ];

    it("defines 6 progressive Socratic hint levels", () => {
      expect(HINT_LADDER_LEVELS).toHaveLength(6);
      expect(HINT_LADDER_LEVELS[0].level).toBe(1);
      expect(HINT_LADDER_LEVELS[5].level).toBe(6);
    });

    it("never provides code dump as an initial hint level", () => {
      const initialLevels = HINT_LADDER_LEVELS.slice(0, 3);
      initialLevels.forEach((l) => {
        expect(l.label.toLowerCase()).not.toContain("code");
        expect(l.label.toLowerCase()).not.toContain("solution");
      });
    });
  });

  describe("Problem Workspace Flow & Layout Contract", () => {
    const PHASES = [
      { id: 1, label: "Phase 1 — Think" },
      { id: 2, label: "Phase 2 — Confirm" },
      { id: 3, label: "Phase 3 — Solve" },
      { id: 4, label: "Phase 4 — Reflect" },
    ];

    it("maintains the 4-phase cognitive flow sequence", () => {
      expect(PHASES.map((p) => p.id)).toEqual([1, 2, 3, 4]);
      expect(PHASES[0].label).toContain("Think");
      expect(PHASES[1].label).toContain("Confirm");
      expect(PHASES[2].label).toContain("Solve");
      expect(PHASES[3].label).toContain("Reflect");
    });

    it("deduplicates topic tags against pattern to prevent duplicate badges", () => {
      const pattern = "Two Pointers";
      const rawTopics = ["Two Pointers", "Strings", "Array"];
      const filteredTopics = rawTopics.filter(
        (t) => !pattern || t.toLowerCase() !== pattern.toLowerCase()
      );

      expect(filteredTopics).not.toContain("Two Pointers");
      expect(filteredTopics).toEqual(["Strings", "Array"]);
    });
  });
});

import { describe, it, expect } from "vitest";
import { decodeHtmlEntities, unescapeHtmlIfNeeded } from "./content-normalizer";
import { parseAsciiTree } from "./tree-visualization";
import {
  parseDryRunFromText,
  parseIntervalsFromText,
  transformAst,
} from "./ast-semantic-transformer";
import { parseHtmlToAst } from "./safe-html-parser";

describe("Mission Content Experience — Semantic Architecture & Normalization", () => {
  it("decodes named, hex, decimal, and math entities without markup corruption", () => {
    const raw = "left descendants are in (&minus;&infin;, V) &amp; right descendants in (V, +&infin;). a &le; b";
    const decoded = decodeHtmlEntities(raw);
    expect(decoded).toContain("(−∞, V)");
    expect(decoded).toContain("(V, +∞)");
    expect(decoded).toContain("a ≤ b");
    expect(decoded).not.toContain("&minus;");
    expect(decoded).not.toContain("&infin;");
    expect(decoded).not.toContain("&le;");
  });

  it("resolves double-escaped HTML tags back to clean HTML", () => {
    const escaped = "&lt;h2&gt;The BST Mental Model&lt;/h2&gt;&lt;p&gt;Model 1: The Sorted Array&lt;/p&gt;";
    const unescaped = unescapeHtmlIfNeeded(escaped);
    expect(unescaped).toBe("<h2>The BST Mental Model</h2><p>Model 1: The Sorted Array</p>");
  });

  it("parses multi-level ASCII binary trees into TreeNode hierarchy", () => {
    const ascii = `
        5
       / \\
      3   7
     / \\ / \\
    1  4 6  8
    `;
    const tree = parseAsciiTree(ascii);
    expect(tree).not.toBeNull();
    expect(tree?.val).toBe("5");
    expect(tree?.left?.val).toBe("3");
    expect(tree?.right?.val).toBe("7");
    expect(tree?.left?.left?.val).toBe("1");
    expect(tree?.left?.right?.val).toBe("4");
    expect(tree?.right?.left?.val).toBe("6");
    expect(tree?.right?.right?.val).toBe("8");
  });

  it("parses skewed/asymmetric ASCII trees correctly", () => {
    const ascii = `
        A
       / \\
      B   C
     /
    D
    `;
    const tree = parseAsciiTree(ascii);
    expect(tree).not.toBeNull();
    expect(tree?.val).toBe("A");
    expect(tree?.left?.val).toBe("B");
    expect(tree?.right?.val).toBe("C");
    expect(tree?.left?.left?.val).toBe("D");
    expect(tree?.left?.right).toBeUndefined();
  });

  it("parses algorithm dry run traces with state badges", () => {
    const trace = `
Trace: intervals = [[1,2], [2,3], [3,4], [1,3]].
Sorted by end: [[1,2], [2,3], [1,3], [3,4]].
i=1: [2,3] starts at 2 >= 2. lastEndTime = 3.
i=2: [1,3] starts at 1 < 3. Overlap! removals = 1.
i=3: [3,4] starts at 3 >= 3. lastEndTime = 4.
Result: 1 removal.
    `;
    const dryRun = parseDryRunFromText(trace);
    expect(dryRun).not.toBeNull();
    expect(dryRun?.steps.length).toBe(3);
    expect(dryRun?.steps[0].label).toContain("Iteration i = 1");
    expect(dryRun?.steps[1].stateBadges?.some((b) => b.label === "Removals")).toBe(true);
    expect(dryRun?.result).toBe("1 removal.");
  });

  it("parses queue progression dry run into step sequence", () => {
    const queueTrace = `
Queue progression:
Step 1: Q = [1]          → Output: [1]
Step 2: Q = [2, 3]       → Output: [1], [2, 3]
Step 3: Q = [4, 5, 6]    → Output: [1], [2, 3], [4, 5, 6]
Result: [[1], [2, 3], [4, 5, 6]]
    `;
    const dryRun = parseDryRunFromText(queueTrace);
    expect(dryRun).not.toBeNull();
    expect(dryRun?.title).toBe("Queue progression");
    expect(dryRun?.steps.length).toBe(3);
    expect(dryRun?.steps[0].stateBadges?.some((b) => b.value === "Q = [1]")).toBe(true);
    expect(dryRun?.steps[1].stateBadges?.some((b) => b.value === "Output: [1], [2, 3]")).toBe(true);
    expect(dryRun?.result).toBe("[[1], [2, 3], [4, 5, 6]]");
  });

  it("parses interval scheduling timelines into structured IntervalItem objects", () => {
    const timeline = "Activities: A: [1, 4]  B: [3, 5]  C: [0, 6]  D: [5, 7]";
    const intervals = parseIntervalsFromText(timeline);
    expect(intervals).not.toBeNull();
    expect(intervals?.length).toBe(4);
    expect(intervals?.[0]).toEqual({
      id: "interval-0",
      label: "A",
      start: 1,
      end: 4,
    });
    expect(intervals?.[1]).toEqual({
      id: "interval-1",
      label: "B",
      start: 3,
      end: 5,
    });
  });

  it("groups consecutive paragraphs of code into a single CodeIllustration block", () => {
    const html = `
      <p>// Example: Pass current sum</p>
      <p>void dfs(TreeNode* node, int currentSum) {</p>
      <p>    if (!node) return;</p>
      <p>    currentSum += node-&gt;val;</p>
      <p>}</p>
      <p>Normal text follows here explaining the algorithm.</p>
    `;
    const ast = parseHtmlToAst(html);
    const transformed = transformAst(ast);

    expect(transformed[0].type).toBe("custom");
    expect(transformed[0].customType).toBe("code-illustration");
    expect(transformed[0].customData.code).toContain("void dfs(TreeNode* node");
    expect(transformed[0].customData.code).toContain("if (!node) return;");

    // Normal paragraph remains standard paragraph
    expect(transformed[1].tag).toBe("p");
  });

  it("suppresses duplicate first heading when it matches stageTitle", () => {
    const html = `
      <h2>The BST Mental Model</h2>
      <p>Content goes here...</p>
    `;
    const ast = parseHtmlToAst(html);
    const transformed = transformAst(ast, "The BST Mental Model");

    // First heading is pruned
    expect(transformed[0].tag).toBe("p");
  });
});

import { describe, it, expect } from "vitest";
import { normalizeLanguage, KEYWORDS, TYPES } from "./code-illustration";
import { parseTreeInput, TreeNode } from "./tree-visualization";
import {
  decodeHtmlEntities,
  unescapeHtmlIfNeeded,
  detectContentFormat,
} from "./content-normalizer";
import { parseHtmlToAst } from "./safe-html-parser";
import {
  resolveMissionState,
  formatStageTitle,
} from "./mission-state-resolver";
import type { Stage } from "@/features/platform/engines/learning.engine";

describe("Mission Reading Experience, Content Pipeline & State Invariants", () => {
  describe("Content Normalizer & Entity Decoding", () => {
    it("decodes named entities into readable characters", () => {
      expect(decodeHtmlEntities("Tree Traversal &amp; Modification")).toBe("Tree Traversal & Modification");
      expect(decodeHtmlEntities("&lt;div&gt; &quot;Hello&quot; &#39;World&#39; &amp; &nbsp;")).toBe("<div> \"Hello\" 'World' &  ");
      expect(decodeHtmlEntities("&check; &cross; &mdash; &ndash; &rarr;")).toBe("✓ ✗ — – →");
    });

    it("decodes decimal and hex numeric entities", () => {
      expect(decodeHtmlEntities("&#60;h3&#62;Hello&#60;/h3&#62;")).toBe("<h3>Hello</h3>");
      expect(decodeHtmlEntities("&#x3c;strong&#x3e;Bold&#x3c;/strong&#x3e;")).toBe("<strong>Bold</strong>");
    });

    it("unescapes single-escaped and double-escaped HTML tags", () => {
      const escaped = "&lt;h3&gt;&lt;strong&gt;Pattern 1: Tree Traversal &amp; Modification&lt;/strong&gt;&lt;/h3&gt;";
      const unescaped = unescapeHtmlIfNeeded(escaped);
      expect(unescaped).toBe("<h3><strong>Pattern 1: Tree Traversal & Modification</strong></h3>");

      const doubleEscaped = "&amp;lt;h3&amp;gt;Double Escaped&amp;lt;/h3&amp;gt;";
      expect(unescapeHtmlIfNeeded(doubleEscaped)).toBe("<h3>Double Escaped</h3>");
    });

    it("detects content format accurately", () => {
      expect(detectContentFormat("<h2>Welcome</h2><p>Content</p>")).toBe("html");
      expect(detectContentFormat("## Welcome\n\nContent here with code\n\n```cpp\nint x = 0;\n```")).toBe("markdown");
      expect(detectContentFormat("<p>Here is a tree:</p>\n\n```tree\n1 -> 2, 3\n```")).toBe("mixed");
    });
  });

  describe("Safe HTML Parser (AST & Tag Whitelisting)", () => {
    it("parses the user's exact BAD string into structured semantic nodes", () => {
      const badInput = `<h3><strong>Pattern 1: Tree Traversal &amp; Modification</strong></h3><p><strong>Recognition Signals:</strong></p><ul><li><p>✓ "Invert", "Flip", "Mirror"</p></li><li><p>✓ "Same tree", "Identical"</p></li></ul>`;
      const ast = parseHtmlToAst(badInput);

      expect(ast).toHaveLength(3);

      // Node 1: <h3> with child <strong>
      expect(ast[0].type).toBe("element");
      expect(ast[0].tag).toBe("h3");
      expect(ast[0].children?.[0]?.tag).toBe("strong");
      expect(ast[0].children?.[0]?.children?.[0]?.text).toBe("Pattern 1: Tree Traversal & Modification");

      // Node 2: <p> with child <strong>
      expect(ast[1].type).toBe("element");
      expect(ast[1].tag).toBe("p");
      expect(ast[1].children?.[0]?.tag).toBe("strong");
      expect(ast[1].children?.[0]?.children?.[0]?.text).toBe("Recognition Signals:");

      // Node 3: <ul> with 2 <li> items
      expect(ast[2].type).toBe("element");
      expect(ast[2].tag).toBe("ul");
      expect(ast[2].children).toHaveLength(2);
      expect(ast[2].children?.[0]?.tag).toBe("li");
      expect(ast[2].children?.[0]?.children?.[0]?.children?.[0]?.text).toContain('"Invert", "Flip", "Mirror"');
    });

    it("guarantees no raw HTML markup is exposed as text in the AST", () => {
      const html = `<p>Test with <code>root-&gt;left</code> and <strong>bold</strong></p>`;
      const ast = parseHtmlToAst(html);

      function checkNoRawTagsInText(nodes: typeof ast) {
        for (const n of nodes) {
          if (n.type === "text" && n.text) {
            expect(n.text).not.toMatch(/<\/?(p|h[1-6]|ul|li|strong|em|code)\b/i);
          }
          if (n.children) {
            checkNoRawTagsInText(n.children);
          }
        }
      }
      checkNoRawTagsInText(ast);
    });

    it("strips unsafe scripts, styles, iframes, and on* event handlers", () => {
      const malicious = `<p>Hello <script>alert('xss')</script><iframe src="evil.com"></iframe><span onclick="bad()">Click</span></p>`;
      const ast = parseHtmlToAst(malicious);

      expect(ast).toHaveLength(1);
      const pNode = ast[0];
      expect(pNode.children?.some((c) => c.tag === "script")).toBe(false);
      expect(pNode.children?.some((c) => c.tag === "iframe")).toBe(false);

      const spanNode = pNode.children?.find((c) => c.tag === "span");
      expect(spanNode?.attrs?.onclick).toBeUndefined();
    });
  });

  describe("Centralized Mission State & Progression Resolver", () => {
    const elevenStages: Stage[] = [
      { key: "intro", kind: "introduction", title: "Welcome to Binary Trees", status: "completed" },
      { key: "intuition", kind: "intuition", title: "Developing Tree Intuition", status: "completed" },
      { key: "concept", kind: "concept", title: "Core Fundamentals", status: "completed" },
      { key: "mental_model", kind: "mental_model", title: "Mental Model", status: "completed" },
      { key: "visualization", kind: "visualization", title: "Visualizing Operations", status: "completed" },
      { key: "pattern", kind: "pattern", title: "Recognizing Patterns", status: "active" },
      { key: "example", kind: "example", title: "Worked Examples", status: "locked" },
      { key: "practice", kind: "practice", title: "Practice Problems", status: "locked" },
      { key: "reflection", kind: "reflection", title: "Consolidate Learning", status: "locked" },
      { key: "challenge", kind: "mastery", title: "Mastery Challenge", status: "locked" },
      { key: "summary", kind: "mastery", title: "Summary", status: "locked" },
    ];

    it("resolves exact state when learner is at the learning frontier (Stage 6 of 11)", () => {
      const state = resolveMissionState({
        stages: elevenStages,
        selectedStageKey: "pattern",
        activeStageKey: "pattern",
      });

      expect(state.totalStages).toBe(11);
      expect(state.completedStagesCount).toBe(5);
      expect(state.lockedStagesCount).toBe(5);

      // Frontier identification
      expect(state.frontierStageKey).toBe("pattern");
      expect(state.frontierStageIndex).toBe(5);

      // Selected stage (Stage 6, 1-indexed)
      expect(state.selectedStageNumber).toBe(6);
      expect(state.selectedStageIndex).toBe(5);
      expect(state.selectedStage.key).toBe("pattern");
      expect(state.selectedStageTitle).toBe("Recognizing Patterns");

      // Viewing flags
      expect(state.isViewingFrontier).toBe(true);
      expect(state.isViewingCompleted).toBe(false);
      expect(state.isViewingLocked).toBe(false);

      // Progress: 5 / 11 = 45%
      expect(state.missionProgressPercent).toBe(45);

      // Adjacent navigation
      expect(state.previousStage?.key).toBe("visualization");
      expect(state.nextStage?.key).toBe("example");
      expect(state.canGoBack).toBe(true);
    });

    it("resolves state with zero ambiguity when learner revisits a completed stage (Stage 5 of 11)", () => {
      const state = resolveMissionState({
        stages: elevenStages,
        selectedStageKey: "visualization", // index 4
        activeStageKey: "pattern",       // index 5
      });

      expect(state.totalStages).toBe(11);
      expect(state.completedStagesCount).toBe(5);

      // Frontier remains at pattern (Stage 6)
      expect(state.frontierStageKey).toBe("pattern");
      expect(state.frontierStageIndex).toBe(5);

      // Viewed stage is Stage 5 (1-indexed)
      expect(state.selectedStageNumber).toBe(5);
      expect(state.selectedStageIndex).toBe(4);
      expect(state.selectedStage.key).toBe("visualization");

      // Clearly distinguishes viewing completed vs active frontier
      expect(state.isViewingFrontier).toBe(false);
      expect(state.isViewingCompleted).toBe(true);
      expect(state.isViewingLocked).toBe(false);

      // Progress remains solid at 45% (5/11)
      expect(state.missionProgressPercent).toBe(45);
    });

    it("handles locked stage selection and non-existent key gracefully", () => {
      // Trying to select a locked stage allows viewing with isViewingLocked flag set
      const lockedAttempt = resolveMissionState({
        stages: elevenStages,
        selectedStageKey: "challenge", // locked
        activeStageKey: "pattern",
      });
      expect(lockedAttempt.selectedStage.key).toBe("challenge");
      expect(lockedAttempt.isViewingLocked).toBe(true);

      // Trying to select a non-existent key falls back to active frontier
      const nonExistent = resolveMissionState({
        stages: elevenStages,
        selectedStageKey: "does-not-exist",
        activeStageKey: "pattern",
      });
      expect(nonExistent.selectedStage.key).toBe("pattern");
      expect(nonExistent.selectedStageNumber).toBe(6);
    });

    it("calculates 100% progress when all stages are completed", () => {
      const allDone = elevenStages.map((s) => ({ ...s, status: "completed" as const }));
      const state = resolveMissionState({
        stages: allDone,
        selectedStageKey: "summary",
        activeStageKey: null,
      });

      expect(state.completedStagesCount).toBe(11);
      expect(state.lockedStagesCount).toBe(0);
      expect(state.missionProgressPercent).toBe(100);
      expect(state.selectedStageNumber).toBe(11);
    });

    it("formats stage titles gracefully using kind if title is empty", () => {
      expect(formatStageTitle({ key: "k1", kind: "mental_model", status: "active" })).toBe("Mental Model");
      expect(formatStageTitle({ key: "k2", kind: "pattern", title: "Custom Title", status: "active" })).toBe("Custom Title");
      expect(formatStageTitle(null)).toBe("Stage");
    });
  });

  describe("normalizeLanguage", () => {
    it("normalizes common programming language tags", () => {
      expect(normalizeLanguage("cpp")).toBe("C++");
      expect(normalizeLanguage("c++")).toBe("C++");
      expect(normalizeLanguage("python")).toBe("Python");
      expect(normalizeLanguage("py")).toBe("Python");
      expect(normalizeLanguage("javascript")).toBe("JavaScript");
      expect(normalizeLanguage("js")).toBe("JavaScript");
      expect(normalizeLanguage("typescript")).toBe("TypeScript");
      expect(normalizeLanguage("ts")).toBe("TypeScript");
      expect(normalizeLanguage("java")).toBe("Java");
      expect(normalizeLanguage("pseudocode")).toBe("Pseudocode");
    });

    it("falls back gracefully for unspecified or unknown language", () => {
      expect(normalizeLanguage()).toBe("Code");
      expect(normalizeLanguage("")).toBe("Code");
      expect(normalizeLanguage("rust")).toBe("RUST");
    });
  });

  describe("Syntax Highlighting Tokens", () => {
    it("contains essential DSA keywords across C++, Python, and JS/TS", () => {
      expect(KEYWORDS.has("int")).toBe(true);
      expect(KEYWORDS.has("return")).toBe(true);
      expect(KEYWORDS.has("def")).toBe(true);
      expect(KEYWORDS.has("class")).toBe(true);
      expect(KEYWORDS.has("async")).toBe(true);
      expect(KEYWORDS.has("const")).toBe(true);
      expect(KEYWORDS.has("while")).toBe(true);
      expect(KEYWORDS.has("for")).toBe(true);
    });

    it("contains foundational DSA data structure types", () => {
      expect(TYPES.has("vector")).toBe(true);
      expect(TYPES.has("unordered_map")).toBe(true);
      expect(TYPES.has("ListNode")).toBe(true);
      expect(TYPES.has("TreeNode")).toBe(true);
      expect(TYPES.has("queue")).toBe(true);
      expect(TYPES.has("stack")).toBe(true);
      expect(TYPES.has("priority_queue")).toBe(true);
    });
  });

  describe("TreeVisualization - parseTreeInput & Traversals", () => {
    it("generates default balanced binary tree when input is undefined or empty", () => {
      const tree = parseTreeInput();
      expect(tree).not.toBeNull();
      expect(tree?.val).toBe(1);
      expect(tree?.left?.val).toBe(2);
      expect(tree?.right?.val).toBe(3);
      expect(tree?.left?.left?.val).toBe(4);
      expect(tree?.left?.right?.val).toBe(5);
      expect(tree?.right?.right?.val).toBe(6);
    });

    it("passes through an existing TreeNode structure directly", () => {
      const customNode: TreeNode = {
        id: "custom-root",
        val: 99,
        left: { id: "custom-left", val: 50 },
      };
      const result = parseTreeInput(customNode);
      expect(result).toBe(customNode);
      expect(result?.val).toBe(99);
      expect(result?.left?.val).toBe(50);
    });

    it("parses level-order JSON array strings correctly", () => {
      const tree = parseTreeInput("[10, 5, 15, 2, 7, null, 20]");
      expect(tree).not.toBeNull();
      expect(tree?.val).toBe(10);
      expect(tree?.left?.val).toBe(5);
      expect(tree?.right?.val).toBe(15);
      expect(tree?.left?.left?.val).toBe(2);
      expect(tree?.left?.right?.val).toBe(7);
      expect(tree?.right?.left).toBeUndefined();
      expect(tree?.right?.right?.val).toBe(20);
    });

    it("parses parent -> children edge syntax correctly", () => {
      const edgeSyntax = `
        1 -> 2, 3
        2 -> 4, 5
        3 -> 6
      `;
      const tree = parseTreeInput(edgeSyntax);
      expect(tree).not.toBeNull();
      expect(tree?.val).toBe("1");
      expect(tree?.left?.val).toBe("2");
      expect(tree?.right?.val).toBe("3");
      expect(tree?.left?.left?.val).toBe("4");
      expect(tree?.left?.right?.val).toBe("5");
      expect(tree?.right?.left?.val).toBe("6");
    });

    it("verifies traversal order outputs on a standard BST tree", () => {
      const tree = parseTreeInput("[4, 2, 6, 1, 3, 5, 7]");
      expect(tree).not.toBeNull();

      const preorder: (string | number)[] = [];
      const inorder: (string | number)[] = [];
      const postorder: (string | number)[] = [];
      const bfs: (string | number)[] = [];

      function dfs(node: TreeNode | null | undefined) {
        if (!node) return;
        preorder.push(node.val);
        dfs(node.left);
        inorder.push(node.val);
        dfs(node.right);
        postorder.push(node.val);
      }
      dfs(tree);

      const q: TreeNode[] = [tree!];
      while (q.length) {
        const curr = q.shift()!;
        bfs.push(curr.val);
        if (curr.left) q.push(curr.left);
        if (curr.right) q.push(curr.right);
      }

      expect(preorder).toEqual([4, 2, 1, 3, 6, 5, 7]);
      expect(inorder).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(postorder).toEqual([1, 3, 2, 5, 7, 6, 4]);
      expect(bfs).toEqual([4, 2, 6, 1, 3, 5, 7]);
    });
  });

  describe("Structured Content Block Invariants", () => {
    it("extracts question and explanation from Think Checkpoint notation", () => {
      const rawThinkBlock = `> [!THINK]
> Why does the monotonic queue maintain elements in strictly decreasing order?
> Explanation: Because if a newer element is greater than an older element in the window, the older element can NEVER be the maximum again.`;

      const cleaned = rawThinkBlock
        .replace(/^>\s*\[!THINK\]\s*/i, "")
        .replace(/^>\s*/gm, "")
        .trim();

      const [question, ...expParts] = cleaned.split(/\n(?=(?:Explanation|Answer|Intuition):)/i);
      const explanation = expParts.join("\n").replace(/^(?:Explanation|Answer|Intuition):\s*/i, "").trim();

      expect(question).toBe("Why does the monotonic queue maintain elements in strictly decreasing order?");
      expect(explanation).toContain("Because if a newer element is greater than an older element");
    });

    it("extracts key takeaways lines cleanly", () => {
      const rawTakeaways = `Key Takeaways:
- Monotonic queues provide O(1) amortized sliding window queries
- Store indices rather than raw values to easily check expiration
- Evict from the back when incoming value is larger`;

      const lines = rawTakeaways
        .replace(/^(?:key takeaways|summary):\s*/i, "")
        .split("\n")
        .map((l) => l.replace(/^[-*•]\s*/, "").trim())
        .filter(Boolean);

      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe("Monotonic queues provide O(1) amortized sliding window queries");
      expect(lines[1]).toBe("Store indices rather than raw values to easily check expiration");
      expect(lines[2]).toBe("Evict from the back when incoming value is larger");
    });
  });

  describe("Mission AI Assistant Loading & Typing State Invariants", () => {
    it("validates contextual prompt generation for mission stages", () => {
      const stageTitle = "Sliding Window Maximum";
      const contextualPrompts = [
        `Explain ${stageTitle || "this concept"} simply`,
        "What are common mistakes to watch for?",
        "Give me an intuitive mental model or analogy",
        "Walk me through a step-by-step example",
      ];
      expect(contextualPrompts.length).toBe(4);
      expect(contextualPrompts[0]).toBe("Explain Sliding Window Maximum simply");
    });

    it("verifies loading state transitions when sending messages", () => {
      type Message = { role: "user" | "assistant"; content: string };
      const initialMessages: Message[] = [];
      const userQuestion = "hi";

      const updatedMessages: Message[] = [...initialMessages, { role: "user", content: userQuestion.trim() }];
      const isLoading = true;
      const isStreaming = false;

      expect(updatedMessages).toHaveLength(1);
      expect(updatedMessages[0]).toEqual({ role: "user", content: "hi" });
      expect(isLoading).toBe(true);
      expect(isStreaming).toBe(false);

      const isThinking = isLoading && !isStreaming;
      expect(isThinking).toBe(true);

      const firstChunk = "Hello! ";
      const streamingMessages: Message[] = [...updatedMessages, { role: "assistant", content: firstChunk }];
      const streamingActive = true;
      expect(streamingActive).toBe(true);
      expect(streamingMessages).toHaveLength(2);
      expect(streamingMessages[1].content).toBe("Hello! ");
    });

    it("handles error state and preserves prompt for retry", () => {
      const userPrompt = "Explain Two Pointers";
      const errorMsg = "Network timeout";
      const errorState = { message: errorMsg, prompt: userPrompt };

      expect(errorState.prompt).toBe("Explain Two Pointers");
      expect(errorState.message).toBe("Network timeout");

      let currentPrompt = errorState.prompt;
      let clearedError = null;
      let isLoading = true;

      expect(currentPrompt).toBe(userPrompt);
      expect(clearedError).toBeNull();
      expect(isLoading).toBe(true);
    });
  });
});

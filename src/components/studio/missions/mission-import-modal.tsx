"use client";

import { useState } from "react";
import { X, Sparkles, Copy, Check, Upload, Download, BookOpen, AlertCircle } from "lucide-react";
import { ActionButton, StudioTextarea } from "@/components/studio/ui";

type StepInput = {
  key: string;
  kind: "introduction" | "intuition" | "concept" | "mental_model" | "visualization" | "pattern" | "example" | "practice" | "reflection" | "mastery";
  content: string;
  targetId?: string | null;
  required?: boolean;
  weight?: number;
};

export type MissionImportData = {
  slug?: string;
  title?: string;
  description?: string;
  topicId?: string;
  patternId?: string | null;
  estimatedMinutes?: number;
  difficulty?: "beginner" | "easy" | "medium" | "hard";
  steps?: StepInput[];
};

interface MissionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: MissionImportData) => void;
  currentForm: any;
  selectedTopicName?: string;
}

const PRESETS: Record<string, MissionImportData> = {
  "bst": {
    title: "Mastering Binary Search Trees — From Fundamentals to Advanced Operations",
    description: "A comprehensive mission covering BST fundamentals, core operations, traversal patterns, and interview-ready problem patterns. From the BST property to k-th smallest, LCA, and BST iterators.",
    difficulty: "medium",
    estimatedMinutes: 60,
    steps: [
      {
        key: "Welcome to Binary Search Trees",
        kind: "introduction",
        content: "<h2>Welcome to Binary Search Trees</h2><p>A <strong>Binary Search Tree (BST)</strong> is one of the most powerful and elegant data structures in computer science. It combines the efficiency of binary search with the flexibility of a linked list, giving you O(log n) average-time lookups, insertions, and deletions on an ordered collection of data.</p><p>In this mission, you will build a deep, intuitive understanding of BSTs — from how they store data, to how traversal algorithms reveal their structure, to advanced operations like balancing and rebalancing. By the end, you will be able to recognize BST problems in interviews and implement solutions with confidence.</p><h3>What You Will Learn</h3><ul><li>The structural rules that define a valid BST</li><li>Core operations: search, insert, delete</li><li>Tree traversal patterns (in-order, pre-order, post-order)</li><li>How BST properties enable efficient algorithms</li><li>Common BST interview problems and their patterns</li></ul>",
        required: true,
        weight: 0.07,
      },
      {
        key: "Developing BST Intuition",
        kind: "intuition",
        content: "<h2>Why Binary Search Trees?</h2><p>Imagine you have a sorted phone book. If you want to find someone, you do not start from page 1 — you open to the middle, decide whether to go left or right, and repeat. <strong>This is exactly how a BST works.</strong></p><p>A BST is a binary tree where every node satisfies one simple rule: <em>all values in the left subtree are smaller than the node, and all values in the right subtree are larger.</em></p><blockquote><p>A BST is a self-organizing, searchable sorted structure. Every lookup is a series of binary decisions.</p></blockquote>",
        required: true,
        weight: 0.09,
      },
      {
        key: "BST Fundamentals Deep Dive",
        kind: "concept",
        content: "<h2>Binary Search Tree: Core Concepts</h2><h3>BST Property</h3><p>For every node N in a BST:</p><ul><li>Every node in N's <strong>left subtree</strong> has a value strictly less than N's value.</li><li>Every node in N's <strong>right subtree</strong> has a value strictly greater than N's value.</li></ul><h3>Core Operations</h3><h4>Search — O(log n) average</h4><pre><code>def search(root, target):\n  if not root or root.val == target:\n    return root\n  if target < root.val:\n    return search(root.left, target)\n  return search(root.right, target)</code></pre>",
        required: true,
        weight: 0.10,
      },
      {
        key: "The BST Mental Model",
        kind: "mental_model",
        content: "<h2>The BST Mental Model</h2><h3>Model 1: The Sorted Array in Tree Form</h3><p>An in-order traversal of a BST always produces a <strong>sorted sequence</strong>. If you ever need to think about what a BST represents, imagine its in-order traversal.</p><h3>Model 2: Each Node Is a Range Gate</h3><p>When you are at a node with value V, you know implicitly that left descendants are in (-infinity, V) and right descendants are in (V, +infinity).</p>",
        required: true,
        weight: 0.09,
      },
      {
        key: "Visualizing BST Operations",
        kind: "visualization",
        content: "<h2>Visualizing BST Operations</h2><h3>Inserting Values: [5, 3, 7, 1, 4, 6, 8]</h3><pre><code>        5\n       / \\\n      3   7\n     / \\ / \\\n    1  4 6  8</code></pre><p>In-Order Traversal: 1, 3, 4, 5, 6, 7, 8 (always sorted!)</p>",
        required: true,
        weight: 0.09,
      },
      {
        key: "Recognizing BST Problem Patterns",
        kind: "pattern",
        content: "<h2>Recognizing BST Problem Patterns</h2><h3>Pattern 1: BST Validity Check (min/max window)</h3><h3>Pattern 2: K-th Smallest / Largest (in-order traversal)</h3><h3>Pattern 3: Lowest Common Ancestor (guide by value comparison)</h3><h3>Pattern 4: BST Iterator (stack-based simulated traversal)</h3>",
        required: true,
        weight: 0.10,
      },
      {
        key: "Worked-Through BST Examples",
        kind: "example",
        content: "<h2>Worked Examples</h2><h3>Example 1: Validate Binary Search Tree (LeetCode 98)</h3><pre><code>def isValidBST(root, lo=float('-inf'), hi=float('inf')):\n  if not root: return True\n  if root.val <= lo or root.val >= hi: return False\n  return isValidBST(root.left, lo, root.val) and isValidBST(root.right, root.val, hi)</code></pre>",
        required: true,
        weight: 0.09,
      },
      {
        key: "Hands-On BST Practice Problems",
        kind: "practice",
        content: "<h2>Practice Problems</h2><ol><li><strong>LeetCode 98 — Validate Binary Search Tree</strong></li><li><strong>LeetCode 230 — Kth Smallest Element in a BST</strong></li><li><strong>LeetCode 235 — Lowest Common Ancestor of a BST</strong></li><li><strong>LeetCode 450 — Delete Node in a BST</strong></li></ol>",
        required: true,
        weight: 0.14,
      },
      {
        key: "Consolidate Your Learning",
        kind: "reflection",
        content: "<h2>Consolidate Your Learning</h2><p>Reflect on how the BST property enables binary-search performance on dynamic data, and how in-order traversal connects trees to sorted arrays.</p>",
        required: true,
        weight: 0.10,
      },
      {
        key: "Mastery Challenge: BST Iterator",
        kind: "mastery",
        content: "<h2>Mastery Challenge</h2><p>Implement an iterator for a BST that returns integers in sorted order with O(h) memory, where h is the tree height.</p>",
        required: true,
        weight: 0.10,
      },
      {
        key: "Summary & Key Takeaways",
        kind: "mastery",
        content: "<h2>Summary: Binary Search Trees</h2><p>BSTs combine binary search efficiency with linked list dynamism. Always leverage in-order traversal and min/max window validation.</p>",
        required: false,
        weight: 0.03,
      },
    ],
  },
};

export function MissionImportModal({
  isOpen,
  onClose,
  onImport,
  currentForm,
  selectedTopicName,
}: MissionImportModalProps) {
  const [tab, setTab] = useState<"ai" | "presets" | "export">("ai");
  const [rawJson, setRawJson] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);

  if (!isOpen) return null;

  const topicName = selectedTopicName || "Data Structures & Algorithms";

  const aiPromptTemplate = `You are a DSA Curriculum Architect. Create an interactive 11-stage learning mission for the topic: "${topicName}".

Return ONLY a JSON object (inside \`\`\`json markdown or raw JSON) following this exact schema:
{
  "title": "Mastering ${topicName} — From Fundamentals to Advanced Patterns",
  "description": "Comprehensive guide covering ${topicName} core concepts, intuition, mental models, patterns, and interview problems.",
  "difficulty": "medium",
  "estimatedMinutes": 60,
  "steps": [
    {
      "key": "Welcome to ${topicName}",
      "kind": "introduction",
      "content": "<h2>Welcome</h2><p>Rich educational text (at least 50 words)...</p>",
      "required": true,
      "weight": 0.07
    },
    { "key": "Developing Intuition", "kind": "intuition", "content": "<h2>Intuition</h2><p>...</p>", "required": true, "weight": 0.09 },
    { "key": "Core Concepts & Fundamentals", "kind": "concept", "content": "<h2>Concepts</h2><p>...</p><pre><code>code here</code></pre>", "required": true, "weight": 0.10 },
    { "key": "Mental Model & Visual Framework", "kind": "mental_model", "content": "<h2>Mental Model</h2><p>...</p>", "required": true, "weight": 0.09 },
    { "key": "Visualizing Operations", "kind": "visualization", "content": "<h2>Visualization</h2><pre>ASCII diagram or steps</pre>", "required": true, "weight": 0.09 },
    { "key": "Recognizing Problem Patterns", "kind": "pattern", "content": "<h2>Patterns</h2><p>Pattern 1, Pattern 2...</p>", "required": true, "weight": 0.10 },
    { "key": "Worked-Through Examples", "kind": "example", "content": "<h2>Worked Example</h2><pre><code>solution code</code></pre>", "required": true, "weight": 0.09 },
    { "key": "Hands-On Practice Problems", "kind": "practice", "content": "<h2>Practice Problems</h2><ol><li>LeetCode 1...</li></ol>", "required": true, "weight": 0.14 },
    { "key": "Consolidate Your Learning", "kind": "reflection", "content": "<h2>Reflection</h2><p>Questions to check understanding...</p>", "required": true, "weight": 0.10 },
    { "key": "Mastery Challenge", "kind": "mastery", "content": "<h2>Challenge</h2><p>Harder challenge problem...</p>", "required": true, "weight": 0.10 },
    { "key": "Summary & Key Takeaways", "kind": "mastery", "content": "<h2>Summary</h2><p>Key takeaways cheat sheet...</p>", "required": false, "weight": 0.03 }
  ]
}`;

  function handleCopyPrompt() {
    navigator.clipboard.writeText(aiPromptTemplate);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  }

  function handleCopyExport() {
    const exportData = {
      title: currentForm.title,
      slug: currentForm.slug,
      description: currentForm.description,
      difficulty: currentForm.difficulty,
      estimatedMinutes: currentForm.estimatedMinutes,
      steps: currentForm.steps.map(({ id, ...s }: any) => s),
    };
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2500);
  }

  function handleApplyImport() {
    setParseError(null);
    let cleaned = rawJson.trim();
    if (!cleaned) {
      setParseError("Please paste JSON content first.");
      return;
    }

    // Strip markdown code fences if present (```json ... ```)
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      cleaned = match[1].trim();
    }

    try {
      const parsed = JSON.parse(cleaned);
      let payload: MissionImportData = {};

      if (Array.isArray(parsed)) {
        // Just an array of steps
        payload = { steps: parsed };
      } else if (typeof parsed === "object" && parsed !== null) {
        payload = parsed;
      } else {
        throw new Error("Invalid JSON format: expected an object or array of steps.");
      }

      if (payload.steps && !Array.isArray(payload.steps)) {
        throw new Error("steps must be an array");
      }

      onImport(payload);
      onClose();
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse JSON.");
    }
  }

  function handleLoadPreset(key: string) {
    const preset = PRESETS[key];
    if (preset) {
      onImport(preset);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-purple-500/20 bg-[rgba(15,8,30,0.95)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-500/15 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Smart Mission Importer & Generator</h2>
              <p className="text-xs text-purple-300/70">Quickly create full 11-stage missions without tedious manual typing</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-purple-300/60 hover:bg-purple-500/10 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-purple-500/10 bg-[rgba(10,5,20,0.5)] px-6 pt-2">
          <button
            type="button"
            onClick={() => setTab("ai")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
              tab === "ai"
                ? "border-purple-400 text-purple-200"
                : "border-transparent text-purple-300/50 hover:text-purple-200"
            }`}
          >
            <Sparkles size={13} /> AI Prompt & JSON Import
          </button>
          <button
            type="button"
            onClick={() => setTab("presets")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
              tab === "presets"
                ? "border-purple-400 text-purple-200"
                : "border-transparent text-purple-300/50 hover:text-purple-200"
            }`}
          >
            <BookOpen size={13} /> Built-in Presets
          </button>
          <button
            type="button"
            onClick={() => setTab("export")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
              tab === "export"
                ? "border-purple-400 text-purple-200"
                : "border-transparent text-purple-300/50 hover:text-purple-200"
            }`}
          >
            <Download size={13} /> Export Current Mission
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          {tab === "ai" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-200">
                    Step 1: Generate full mission with ChatGPT / Claude / Gemini
                  </span>
                  <ActionButton
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPrompt}
                    className="h-7 text-xs"
                  >
                    {copiedPrompt ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    {copiedPrompt ? "Copied Prompt!" : `Copy AI Prompt for "${topicName}"`}
                  </ActionButton>
                </div>
                <p className="text-[11px] text-purple-300/70">
                  Click the button above to copy a customized prompt. Paste it into any AI tool. The AI will output a structured JSON with all 11 stages and formatted HTML content.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-purple-200">
                  Step 2: Paste AI-generated JSON below
                </label>
                <StudioTextarea
                  rows={8}
                  placeholder='Paste JSON here (e.g. { "title": "...", "steps": [...] })'
                  value={rawJson}
                  onChange={(e) => setRawJson(e.target.value)}
                  className="font-mono text-xs"
                />
                {parseError && (
                  <div className="flex items-center gap-2 text-xs text-red-400">
                    <AlertCircle size={14} />
                    <span>{parseError}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "presets" && (
            <div className="space-y-3">
              <p className="text-xs text-purple-300/70">
                Choose a pre-written curriculum blueprint to instantly populate all 11 stages:
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-purple-500/20 bg-purple-500/10 p-4 hover:border-purple-500/40 transition-colors">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Binary Search Trees (BST)</h4>
                    <p className="text-xs text-purple-300/70">11 complete pedagogical stages with theory, diagrams, and code.</p>
                  </div>
                  <ActionButton size="sm" onClick={() => handleLoadPreset("bst")}>
                    Load Preset
                  </ActionButton>
                </div>
              </div>
            </div>
          )}

          {tab === "export" && (
            <div className="space-y-3">
              <p className="text-xs text-purple-300/70">
                Backup or copy the current mission draft as raw JSON:
              </p>
              <pre className="max-h-60 overflow-y-auto rounded-xl border border-purple-500/20 bg-[rgba(8,3,18,0.7)] p-4 text-[11px] font-mono text-purple-200">
                {JSON.stringify({
                  title: currentForm.title,
                  slug: currentForm.slug,
                  description: currentForm.description,
                  difficulty: currentForm.difficulty,
                  estimatedMinutes: currentForm.estimatedMinutes,
                  steps: currentForm.steps.map(({ id, ...s }: any) => s),
                }, null, 2)}
              </pre>
              <ActionButton onClick={handleCopyExport} className="w-full">
                {copiedExport ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copiedExport ? "Copied JSON to Clipboard!" : "Copy JSON to Clipboard"}
              </ActionButton>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-purple-500/15 bg-[rgba(10,5,20,0.5)] px-6 py-3">
          <ActionButton variant="outline" size="sm" onClick={onClose}>
            Cancel
          </ActionButton>
          {tab === "ai" && (
            <ActionButton size="sm" onClick={handleApplyImport} disabled={!rawJson.trim()}>
              <Upload size={13} /> Apply & Populate Mission
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  );
}

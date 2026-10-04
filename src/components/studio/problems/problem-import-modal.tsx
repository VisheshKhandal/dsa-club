"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import {
  X,
  Sparkles,
  Copy,
  Check,
  Upload,
  Download,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  FolderGit2,
  ExternalLink,
  GitBranch,
  Lightbulb,
  Clock,
} from "lucide-react";
import { ActionButton, StudioTextarea } from "@/components/studio/ui";
import {
  ProblemDifficulty,
  ProblemSource,
  ProblemHint,
  ProblemValidationResult,
  cleanAndParseProblemJson,
} from "@/features/content/services/problem-import.types";

export type ProblemImportData = {
  title: string;
  slug: string;
  summary: string;
  source: ProblemSource;
  sourceUrl: string;
  externalId: string;
  topicIds: string[];
  patternIds: string[];
  difficulty: ProblemDifficulty;
  estimatedMinutes: number;
  qualityScore: number;
  thinkingDirection: string;
  dryRunPrompt: string;
  hints: ProblemHint[];
  commonMistakes: string[];
  tags: string[];
  isPublished: boolean;
};

interface ProblemImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: ProblemImportData) => void;
  currentForm: any;
  currentProblemId?: string | null;
  availableTopics?: Array<{ id: string; name: string }>;
  availablePatterns?: Array<{ id: string; name: string }>;
}

const PROBLEM_PRESETS: Record<string, { label: string; platform: string; difficulty: string; topicHint: string; data: any }> = {
  two_sum: {
    label: "Two Sum",
    platform: "LeetCode #1",
    difficulty: "easy",
    topicHint: "Arrays & Strings",
    data: {
      title: "Two Sum",
      slug: "two-sum",
      source: "leetcode",
      sourceUrl: "https://leetcode.com/problems/two-sum",
      externalId: "1",
      difficulty: "easy",
      estimatedMinutes: 20,
      topics: ["Arrays & Strings"],
      patterns: ["Two Pointers"],
      summary: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
      thinkingDirection: "Consider the complement needed for each element: target - nums[i]. Instead of checking all pairs in O(N^2), track previously seen elements in a hash table or use two pointers on a sorted copy.",
      dryRunPrompt: "Trace nums = [2, 7, 11, 15], target = 9. First element 2 looks for complement 7. Since 7 is found, indices [0, 1] are returned immediately.",
      hints: [
        { level: 1, title: "Complement Search", content: "A brute force approach checks every pair, which is O(n^2). What data structure enables O(1) lookups?" },
        { level: 2, title: "Hash Map Cache", content: "Store each number and its index in a hash map as you iterate through the array. Check if target - num already exists in the map." },
      ],
      commonMistakes: [
        "Using the same element twice (e.g. when target is 6 and array contains one 3)",
        "Returning element values instead of their original 0-indexed positions",
      ],
      tags: ["array", "hash-table", "two-pointers"],
      isPublished: false,
    },
  },
  longest_substring: {
    label: "Longest Substring Without Repeating Characters",
    platform: "LeetCode #3",
    difficulty: "medium",
    topicHint: "Arrays & Strings",
    data: {
      title: "Longest Substring Without Repeating Characters",
      slug: "longest-substring-without-repeating-characters",
      source: "leetcode",
      sourceUrl: "https://leetcode.com/problems/longest-substring-without-repeating-characters",
      externalId: "3",
      difficulty: "medium",
      estimatedMinutes: 35,
      topics: ["Arrays & Strings"],
      patterns: ["Sliding Window"],
      summary: "Given a string s, find the length of the longest substring without duplicate characters.",
      thinkingDirection: "Use a sliding window with left and right boundaries. As right expands, record the character index. If a duplicate is encountered inside the current window, contract the left pointer past the previous occurrence.",
      dryRunPrompt: "For s = 'abcabcbb', window expands to 'abc' (len 3). When next 'a' appears, advance left pointer past the first 'a' to index 1.",
      hints: [
        { level: 1, title: "Window Boundaries", content: "Maintain a sliding window [left, right] of unique characters." },
        { level: 2, title: "Last Seen Map", content: "Keep a map from character to its most recent index. When a duplicate is seen, jump left to max(left, lastSeen[c] + 1)." },
      ],
      commonMistakes: [
        "Jumping the left pointer backwards when encountering an old occurrence outside the active window",
        "Not updating the maximum length on every valid expansion",
      ],
      tags: ["hash-table", "string", "sliding-window"],
      isPublished: false,
    },
  },
  trapping_rain_water: {
    label: "Trapping Rain Water",
    platform: "LeetCode #42",
    difficulty: "hard",
    topicHint: "Arrays & Strings",
    data: {
      title: "Trapping Rain Water",
      slug: "trapping-rain-water",
      source: "leetcode",
      sourceUrl: "https://leetcode.com/problems/trapping-rain-water",
      externalId: "42",
      difficulty: "hard",
      estimatedMinutes: 45,
      topics: ["Arrays & Strings"],
      patterns: ["Two Pointers", "Monotonic Stack"],
      summary: "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
      thinkingDirection: "The water trapped above bar i is determined by min(maxLeft, maxRight) - height[i]. Two pointers moving inwards allow tracking boundaries in O(1) auxiliary space.",
      dryRunPrompt: "For height = [0,1,0,2,1,0,1,3,2,1,2,1], track leftMax and rightMax from both ends. Whichever boundary is shorter determines the water trapped at that step.",
      hints: [
        { level: 1, title: "Boundary Invariant", content: "Water height at position i is bounded by the minimum of the highest wall to its left and right." },
        { level: 2, title: "Two Pointers Optimization", content: "Advance the pointer with the smaller maximum wall. Because the other wall is guaranteed to be taller, the current boundary is the limiting factor." },
      ],
      commonMistakes: [
        "Confusing bar height with water capacity above the bar",
        "Failing to account for zero-capacity plateaus",
      ],
      tags: ["array", "two-pointers", "dynamic-programming", "monotonic-stack"],
      isPublished: false,
    },
  },
  coin_change: {
    label: "Coin Change",
    platform: "LeetCode #322",
    difficulty: "medium",
    topicHint: "Dynamic Programming",
    data: {
      title: "Coin Change",
      slug: "coin-change",
      source: "leetcode",
      sourceUrl: "https://leetcode.com/problems/coin-change",
      externalId: "322",
      difficulty: "medium",
      estimatedMinutes: 40,
      topics: ["Dynamic Programming"],
      patterns: ["0/1 Knapsack", "State Machine DP"],
      summary: "You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money. Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.",
      thinkingDirection: "This is an unbounded knapsack problem. Define dp[i] as the minimum coins needed for amount i. dp[i] = min(dp[i - c] + 1) for all c in coins where c <= i.",
      dryRunPrompt: "With coins = [1, 2, 5] and amount = 11, dp[11] = min(dp[10]+1, dp[9]+1, dp[6]+1). dp[11] resolves to 3 (5 + 5 + 1).",
      hints: [
        { level: 1, title: "Subproblem Formulation", content: "Can you solve for amount 0, 1, 2... up to amount? Each state depends on previous amounts minus coin denominations." },
        { level: 2, title: "Initialization", content: "Initialize dp array with infinity (or amount + 1) and set dp[0] = 0." },
      ],
      commonMistakes: [
        "Using a greedy approach (e.g. always picking largest coin), which fails for denominations like [1, 3, 4] for amount 6",
        "Integer overflow when using INT_MAX instead of amount + 1 for sentinel infinity values",
      ],
      tags: ["array", "dynamic-programming", "breadth-first-search"],
      isPublished: false,
    },
  },
};

export function ProblemImportModal({
  isOpen,
  onClose,
  onImport,
  currentForm,
  currentProblemId,
  availableTopics = [],
  availablePatterns = [],
}: ProblemImportModalProps) {
  const [tab, setTab] = useState<"ai" | "presets" | "export">("ai");
  const [rawJson, setRawJson] = useState("");
  const [customTitle, setCustomTitle] = useState(currentForm?.title || "");
  const [customTopic, setCustomTopic] = useState("");
  const [customPattern, setCustomPattern] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);

  // Intelligence Validation state
  const [validationResult, setValidationResult] = useState<ProblemValidationResult | null>(null);
  const [isValidating, startValidating] = useTransition();
  const [validationError, setValidationError] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (currentForm?.title && !customTitle) {
      setCustomTitle(currentForm.title);
    }
    if (currentForm?.topicIds?.length > 0 && !customTopic && availableTopics.length > 0) {
      const matched = availableTopics.find((t) => t.id === currentForm.topicIds[0]);
      if (matched) setCustomTopic(matched.name);
    }
    if (currentForm?.patternIds?.length > 0 && !customPattern && availablePatterns.length > 0) {
      const matched = availablePatterns.find((p) => p.id === currentForm.patternIds[0]);
      if (matched) setCustomPattern(matched.name);
    }
  }, [currentForm, customTitle, customTopic, customPattern, availableTopics, availablePatterns]);

  const targetTitle = customTitle.trim() || "Two Sum";
  const targetTopic = customTopic.trim() || "Arrays & Strings";
  const targetPattern = customPattern.trim() || "Two Pointers";

  const aiPromptTemplate = `You are a Senior Algorithm & Competitive Programming Content Architect at DSA Club.
Generate a comprehensive problem curriculum specification for the practice problem: "${targetTitle}".
This problem belongs under Topic: "${targetTopic}" and Pattern: "${targetPattern}".

Output ONLY a single valid JSON object (enclosed in \`\`\`json markdown or raw JSON) strictly matching this schema:

{
  "title": "${targetTitle}",
  "slug": "${targetTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}",
  "source": "leetcode",
  "sourceUrl": "https://leetcode.com/problems/${targetTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}",
  "externalId": "1",
  "difficulty": "easy | medium | hard",
  "estimatedMinutes": 30,
  "topics": [
    "${targetTopic}"
  ],
  "patterns": [
    "${targetPattern}"
  ],
  "summary": "Clear, complete 2-4 sentence problem statement describing inputs, desired outputs, constraints, and objective.",
  "thinkingDirection": "Step-by-step thinking framework guiding the student from brute force toward the optimal algorithm.",
  "dryRunPrompt": "Concrete trace through a small sample input demonstrating pointer movements or state table updates.",
  "hints": [
    {
      "level": 1,
      "title": "Initial Observation",
      "content": "First progressive hint pointing out the core algorithmic bottleneck."
    },
    {
      "level": 2,
      "title": "Optimal Strategy",
      "content": "Second hint revealing the optimal data structure or pointer technique."
    }
  ],
  "commonMistakes": [
    "Common pitfall 1 (e.g. edge cases, off-by-one errors)",
    "Common pitfall 2 (e.g. integer overflow, duplicate handling)"
  ],
  "tags": ["array", "hash-table", "two-pointers"],
  "isPublished": false
}

Important:
- "topics" and "patterns" must use human-readable names or slugs (e.g. "${targetTopic}"). Do NOT invent MongoDB IDs.
- "difficulty" must be one of: "easy", "medium", "hard".
- "sourceUrl" must be a valid http or https URL.
- Return ONLY the JSON object. Do not include introductory text or chat commentary.`;

  // Trigger deterministic intelligence validation
  const runValidation = (jsonString: string) => {
    setValidationError(null);
    if (!jsonString.trim()) {
      setValidationResult(null);
      return;
    }

    startValidating(async () => {
      try {
        // Step 1: Immediate client parse for quick feedback
        cleanAndParseProblemJson(jsonString);

        // Step 2: Server-side deterministic DB validation
        const res = await fetch("/api/studio/problems/validate-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            json: jsonString,
            currentProblemId,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server validation failed (${res.status})`);
        }

        const data: ProblemValidationResult = await res.json();
        setValidationResult(data);
      } catch (err: any) {
        setValidationError(err.message || "Failed to validate JSON.");
        setValidationResult(null);
      }
    });
  };

  const handleJsonChange = (val: string) => {
    setRawJson(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      runValidation(val);
    }, 300);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(aiPromptTemplate);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleCopyExport = () => {
    const exportData = {
      title: currentForm.title,
      slug: currentForm.slug,
      source: currentForm.source,
      sourceUrl: currentForm.sourceUrl,
      externalId: currentForm.externalId,
      difficulty: currentForm.difficulty,
      estimatedMinutes: currentForm.estimatedMinutes,
      qualityScore: currentForm.qualityScore,
      summary: currentForm.summary,
      thinkingDirection: currentForm.thinkingDirection,
      dryRunPrompt: currentForm.dryRunPrompt,
      hints: currentForm.hints,
      commonMistakes: currentForm.commonMistakes,
      tags: currentForm.tags,
      topicIds: currentForm.topicIds,
      patternIds: currentForm.patternIds,
      isPublished: currentForm.isPublished,
    };
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2500);
  };

  const handleApply = () => {
    if (!validationResult || !validationResult.valid) return;

    onImport({
      title: validationResult.resolved.title,
      slug: validationResult.resolved.slug,
      summary: validationResult.resolved.summary,
      source: validationResult.resolved.source,
      sourceUrl: validationResult.resolved.sourceUrl,
      externalId: validationResult.resolved.externalId,
      topicIds: validationResult.resolved.topicIds,
      patternIds: validationResult.resolved.patternIds,
      difficulty: validationResult.resolved.difficulty,
      estimatedMinutes: validationResult.resolved.estimatedMinutes,
      qualityScore: validationResult.resolved.qualityScore,
      thinkingDirection: validationResult.resolved.thinkingDirection,
      dryRunPrompt: validationResult.resolved.dryRunPrompt,
      hints: validationResult.resolved.hints,
      commonMistakes: validationResult.resolved.commonMistakes,
      tags: validationResult.resolved.tags,
      isPublished: validationResult.resolved.isPublished,
    });
    onClose();
  };

  const handleLoadPreset = (presetKey: string) => {
    const preset = PROBLEM_PRESETS[presetKey];
    if (preset) {
      const jsonStr = JSON.stringify(preset.data, null, 2);
      setRawJson(jsonStr);
      runValidation(jsonStr);
      setTab("ai");
    }
  };

  if (!isOpen) return null;

  const canApply = validationResult !== null && validationResult.valid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl rounded-2xl border border-purple-500/20 bg-[rgba(15,8,30,0.96)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-500/15 px-5 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">AI Problem Import & Generator</h2>
              <p className="text-xs text-purple-300/70">
                Generate practice problems via ChatGPT/Claude/Gemini with DSA Club Intelligence validation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-purple-300/60 hover:bg-purple-500/10 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-purple-500/10 bg-[rgba(10,5,20,0.5)] px-4 sm:px-6 pt-1">
          <button
            type="button"
            onClick={() => setTab("ai")}
            className={`flex items-center gap-2 border-b-2 px-3 sm:px-4 py-2 text-xs font-medium transition-colors ${
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
            className={`flex items-center gap-2 border-b-2 px-3 sm:px-4 py-2 text-xs font-medium transition-colors ${
              tab === "presets"
                ? "border-purple-400 text-purple-200"
                : "border-transparent text-purple-300/50 hover:text-purple-200"
            }`}
          >
            <BookOpen size={13} /> Problem Presets
          </button>
          <button
            type="button"
            onClick={() => setTab("export")}
            className={`flex items-center gap-2 border-b-2 px-3 sm:px-4 py-2 text-xs font-medium transition-colors ${
              tab === "export"
                ? "border-purple-400 text-purple-200"
                : "border-transparent text-purple-300/50 hover:text-purple-200"
            }`}
          >
            <Download size={13} /> Export Current Problem
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1 scrollbar-thin">
          {tab === "ai" && (
            <div className="space-y-4">
              {/* Step 1: Copy AI Prompt Card */}
              <div className="rounded-xl border border-purple-500/25 bg-gradient-to-br from-purple-500/[0.08] to-purple-900/[0.03] p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-purple-200 block">
                      Step 1: Copy Customized AI Prompt
                    </span>
                    <span className="text-[11px] text-purple-300/70 block">
                      Customize problem title, topic, and pattern hints:
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Title (e.g. Two Sum)"
                      className="h-8 rounded-lg border border-purple-500/30 bg-black/40 px-2.5 text-xs text-white placeholder:text-purple-300/40 outline-none focus:border-purple-400 max-w-[130px]"
                    />
                    <input
                      type="text"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      placeholder="Topic (e.g. Arrays & Strings)"
                      className="h-8 rounded-lg border border-purple-500/30 bg-black/40 px-2.5 text-xs text-white placeholder:text-purple-300/40 outline-none focus:border-purple-400 max-w-[130px]"
                    />
                    <input
                      type="text"
                      value={customPattern}
                      onChange={(e) => setCustomPattern(e.target.value)}
                      placeholder="Pattern (e.g. Two Pointers)"
                      className="h-8 rounded-lg border border-purple-500/30 bg-black/40 px-2.5 text-xs text-white placeholder:text-purple-300/40 outline-none focus:border-purple-400 max-w-[130px]"
                    />
                    <ActionButton
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPrompt}
                      className="h-8 text-xs shrink-0 border-purple-400/40 bg-purple-500/20 text-purple-200 hover:bg-purple-500/30"
                    >
                      {copiedPrompt ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      {copiedPrompt ? "Copied Prompt!" : "Copy AI Prompt"}
                    </ActionButton>
                  </div>
                </div>

                <p className="text-[11px] text-purple-300/70 leading-relaxed">
                  Paste the copied prompt into <strong>ChatGPT</strong>, <strong>Claude</strong>, or <strong>Gemini</strong>. Copy the returned JSON and paste it below. DSA Club consumes zero AI tokens.
                </p>
              </div>

              {/* Step 2: Paste JSON */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-purple-200">
                    Step 2: Paste AI-Generated JSON
                  </label>
                  {rawJson && (
                    <button
                      type="button"
                      onClick={() => {
                        setRawJson("");
                        setValidationResult(null);
                        setValidationError(null);
                      }}
                      className="text-[11px] text-purple-300/50 hover:text-purple-200 underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <StudioTextarea
                  rows={6}
                  placeholder='Paste JSON here (e.g. { "title": "Two Sum", "sourceUrl": "https://leetcode.com/problems/two-sum", "topics": ["Arrays & Strings"], "difficulty": "easy" })'
                  value={rawJson}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  className="font-mono text-xs bg-black/40 border-purple-500/20 text-purple-100 placeholder:text-purple-300/30"
                />

                {validationError && (
                  <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/[0.08] p-3 text-xs text-rose-300">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}
              </div>

              {/* Step 3: DSA Club Intelligence Validation Summary */}
              {rawJson.trim() && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-purple-200">
                      Step 3: Preview & Intelligence Validation
                    </span>
                    {isValidating && (
                      <span className="flex items-center gap-1.5 text-[11px] text-purple-300">
                        <RefreshCw size={11} className="animate-spin" />
                        Validating against database...
                      </span>
                    )}
                  </div>

                  {validationResult && (
                    <div className="space-y-3">
                      {/* Status Banner */}
                      <div
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          validationResult.status === "valid"
                            ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-300"
                            : validationResult.status === "warning"
                            ? "border-amber-400/30 bg-amber-500/[0.08] text-amber-300"
                            : "border-rose-400/30 bg-rose-500/[0.08] text-rose-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {validationResult.status === "valid" ? (
                            <CheckCircle2 size={16} className="text-emerald-400" />
                          ) : validationResult.status === "warning" ? (
                            <AlertTriangle size={16} className="text-amber-400" />
                          ) : (
                            <AlertCircle size={16} className="text-rose-400" />
                          )}
                          <span className="text-xs font-semibold">
                            {validationResult.status === "valid"
                              ? "DSA Club Intelligence: Ready to Import ✓"
                              : validationResult.status === "warning"
                              ? "DSA Club Intelligence: Warnings detected (Review below)"
                              : "DSA Club Intelligence: Fatal validation errors"}
                          </span>
                        </div>

                        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border border-current">
                          {validationResult.status}
                        </span>
                      </div>

                      {/* Issues and Intelligence Breakdown */}
                      {(validationResult.errors.length > 0 ||
                        validationResult.warnings.length > 0 ||
                        validationResult.info.length > 0) && (
                        <div className="rounded-xl border border-white/[0.08] bg-black/30 p-3.5 space-y-2 text-xs">
                          {/* Errors */}
                          {validationResult.errors.map((err, i) => (
                            <div key={`err-${i}`} className="flex items-start gap-2 text-rose-300">
                              <span className="shrink-0 text-rose-400 font-bold">✗</span>
                              <span>{err}</span>
                            </div>
                          ))}

                          {/* Warnings */}
                          {validationResult.warnings.map((warn, i) => (
                            <div key={`warn-${i}`} className="flex items-start gap-2 text-amber-300">
                              <span className="shrink-0 text-amber-400 font-bold">⚠</span>
                              <span>{warn}</span>
                            </div>
                          ))}

                          {/* Info */}
                          {validationResult.info.map((inf, i) => (
                            <div key={`inf-${i}`} className="flex items-start gap-2 text-emerald-300">
                              <span className="shrink-0 text-emerald-400 font-bold">✓</span>
                              <span>{inf}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Compact Problem Card Preview */}
                      {validationResult.resolved && (
                        <div className="rounded-xl border border-purple-400/20 bg-purple-500/[0.04] p-4 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">
                                {validationResult.resolved.title || "(Untitled Problem)"}
                              </h4>
                              {validationResult.resolved.slug && (
                                <span className="rounded-md border border-purple-400/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-mono text-purple-200">
                                  {validationResult.resolved.slug}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="rounded-md border border-white/20 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-purple-200 capitalize">
                                {validationResult.resolved.source}
                                {validationResult.resolved.externalId ? ` #${validationResult.resolved.externalId}` : ""}
                              </span>
                              <span className="rounded-full bg-purple-400/15 border border-purple-400/30 px-2.5 py-0.5 text-[10px] font-semibold text-purple-200 capitalize">
                                {validationResult.resolved.difficulty}
                              </span>
                              <span className="text-[11px] text-purple-300/60 flex items-center gap-1">
                                <Clock size={11} />
                                {validationResult.resolved.estimatedMinutes}m
                              </span>
                            </div>
                          </div>

                          {/* Source URL link */}
                          {validationResult.resolved.sourceUrl && (
                            <div className="flex items-center gap-1.5 text-[11px] text-cyan-300/90 font-mono break-all">
                              <ExternalLink size={11} className="shrink-0 text-cyan-400" />
                              <a
                                href={validationResult.resolved.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline"
                              >
                                {validationResult.resolved.sourceUrl}
                              </a>
                            </div>
                          )}

                          <p className="text-xs text-purple-200/80 leading-relaxed line-clamp-3">
                            {validationResult.resolved.summary || "(No summary provided)"}
                          </p>

                          {/* Topics & Patterns Badges */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {validationResult.resolvedTopics.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] uppercase font-semibold text-purple-300/50 flex items-center gap-1">
                                  <FolderGit2 size={10} /> Topics:
                                </span>
                                {validationResult.resolvedTopics.map((t) => (
                                  <span
                                    key={t.id}
                                    className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] text-cyan-200 font-medium"
                                  >
                                    {t.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            {validationResult.resolvedPatterns.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] uppercase font-semibold text-purple-300/50 flex items-center gap-1">
                                  <GitBranch size={10} /> Patterns:
                                </span>
                                {validationResult.resolvedPatterns.map((p) => (
                                  <span
                                    key={p.id}
                                    className="rounded-md border border-purple-400/30 bg-purple-500/15 px-2 py-0.5 text-[10px] text-purple-200 font-medium"
                                  >
                                    {p.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Hints & Mistakes count pills */}
                          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-purple-300/70">
                            {validationResult.resolved.hints.length > 0 && (
                              <span className="flex items-center gap-1 rounded bg-black/30 px-2 py-0.5 border border-white/[0.04]">
                                <Lightbulb size={11} className="text-amber-400" />
                                {validationResult.resolved.hints.length} Hint{validationResult.resolved.hints.length === 1 ? "" : "s"}
                              </span>
                            )}
                            {validationResult.resolved.commonMistakes.length > 0 && (
                              <span className="flex items-center gap-1 rounded bg-black/30 px-2 py-0.5 border border-white/[0.04]">
                                ⚠️ {validationResult.resolved.commonMistakes.length} Pitfall{validationResult.resolved.commonMistakes.length === 1 ? "" : "s"}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "presets" && (
            <div className="space-y-3">
              <p className="text-xs text-purple-300/70">
                Choose a pre-built DSA coding problem blueprint to inspect and auto-populate all fields:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(PROBLEM_PRESETS).map(([key, preset]) => (
                  <div
                    key={key}
                    className="flex flex-col justify-between rounded-xl border border-purple-500/20 bg-purple-500/[0.06] p-4 hover:border-purple-400/40 hover:bg-purple-500/[0.1] transition"
                  >
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white">{preset.label}</h4>
                        <span className="text-[10px] rounded-full border border-purple-400/20 bg-purple-500/10 px-2 py-0.5 text-purple-300 capitalize">
                          {preset.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-purple-300/70">
                        <span className="text-cyan-300">{preset.platform}</span>
                        <span>•</span>
                        <span>{preset.topicHint}</span>
                      </div>
                      <p className="text-xs text-purple-300/70 line-clamp-2">
                        {preset.data.summary}
                      </p>
                    </div>

                    <ActionButton
                      size="sm"
                      variant="outline"
                      onClick={() => handleLoadPreset(key)}
                      className="w-full justify-center text-xs h-8 border-purple-400/30 text-purple-200 hover:bg-purple-500/20"
                    >
                      <span>Load Blueprint</span>
                      <ArrowRight size={12} className="ml-1" />
                    </ActionButton>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "export" && (
            <div className="space-y-3">
              <p className="text-xs text-purple-300/70">
                Backup or copy the current problem definition as standard JSON:
              </p>
              <pre className="max-h-60 overflow-y-auto rounded-xl border border-purple-500/20 bg-[rgba(8,3,18,0.7)] p-4 text-[11px] font-mono text-purple-200 scrollbar-thin">
                {JSON.stringify(
                  {
                    title: currentForm.title,
                    slug: currentForm.slug,
                    source: currentForm.source,
                    sourceUrl: currentForm.sourceUrl,
                    externalId: currentForm.externalId,
                    difficulty: currentForm.difficulty,
                    estimatedMinutes: currentForm.estimatedMinutes,
                    qualityScore: currentForm.qualityScore,
                    summary: currentForm.summary,
                    thinkingDirection: currentForm.thinkingDirection,
                    dryRunPrompt: currentForm.dryRunPrompt,
                    hints: currentForm.hints,
                    commonMistakes: currentForm.commonMistakes,
                    tags: currentForm.tags,
                    topicIds: currentForm.topicIds,
                    patternIds: currentForm.patternIds,
                    isPublished: currentForm.isPublished,
                  },
                  null,
                  2
                )}
              </pre>
              <ActionButton onClick={handleCopyExport} className="w-full">
                {copiedExport ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copiedExport ? "Copied JSON to Clipboard!" : "Copy JSON to Clipboard"}
              </ActionButton>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-purple-500/15 bg-[rgba(10,5,20,0.5)] px-5 py-3 sm:px-6">
          <ActionButton variant="outline" size="sm" onClick={onClose}>
            Cancel
          </ActionButton>

          {tab === "ai" && (
            <ActionButton
              size="sm"
              onClick={handleApply}
              disabled={!canApply || isValidating}
              className="bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-md disabled:opacity-40"
            >
              <Upload size={13} /> Apply & Populate Problem
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  );
}

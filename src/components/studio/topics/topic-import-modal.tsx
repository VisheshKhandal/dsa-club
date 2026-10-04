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
  Clock,
  Layers,
  ArrowRight,
} from "lucide-react";
import { ActionButton, StudioTextarea } from "@/components/studio/ui";
import {
  TopicDifficulty,
  TopicValidationResult,
  cleanAndParseTopicJson,
} from "@/features/content/services/topic-import.types";

export type TopicImportData = {
  name: string;
  slug: string;
  description: string;
  difficulty: TopicDifficulty;
  order: number;
  estimatedMinutes: number;
  isPublished: boolean;
  prerequisiteTopicIds?: string[];
  metadata?: {
    keyConcepts?: string[];
    recommendedPatterns?: string[];
    targetProblems?: string[];
    learningObjectives?: string[];
    tags?: string[];
  };
};

interface TopicImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: TopicImportData) => void;
  currentForm: any;
  currentTopicId?: string | null;
}

const TOPIC_PRESETS: Record<string, { label: string; description: string; data: any }> = {
  dp: {
    label: "Dynamic Programming",
    description: "Optimal substructure, memoization tables, and space-optimized tabulation.",
    data: {
      name: "Dynamic Programming",
      slug: "dynamic-programming",
      description: "Master optimal substructure, overlapping subproblems, memoization tables, and space-optimized tabulation patterns.",
      difficulty: "medium",
      order: 6,
      estimatedMinutes: 180,
      isPublished: false,
      prerequisiteTopics: ["Recursion", "Arrays & Strings"],
      keyConcepts: ["Overlapping Subproblems", "Optimal Substructure", "State Transitions", "Space Optimization"],
      recommendedPatterns: ["0/1 Knapsack", "Longest Common Subsequence", "State Machine DP"],
      targetProblems: ["climbing-stairs", "coin-change", "longest-increasing-subsequence"],
    },
  },
  graphs: {
    label: "Graph Algorithms & Traversal",
    description: "Adjacency representations, BFS, DFS, topological sorting, and shortest paths.",
    data: {
      name: "Graph Algorithms & Traversal",
      slug: "graph-algorithms",
      description: "Comprehensive study of graph structures, BFS queue explorations, recursive DFS, cycle detection, topological sorting, and Dijkstra shortest paths.",
      difficulty: "hard",
      order: 8,
      estimatedMinutes: 210,
      isPublished: false,
      prerequisiteTopics: ["Trees", "Queues & Stacks"],
      keyConcepts: ["Adjacency List", "Breadth-First Search", "Depth-First Search", "Topological Sort", "Shortest Path"],
      recommendedPatterns: ["Topological Sort", "Shortest Path BFS", "Union Find"],
      targetProblems: ["number-of-islands", "course-schedule", "network-delay-time"],
    },
  },
  sliding_window: {
    label: "Sliding Window & Two Pointers",
    description: "Contiguous subarray scans, expanding/shrinking windows, and convergent pointers.",
    data: {
      name: "Sliding Window & Two Pointers",
      slug: "sliding-window-two-pointers",
      description: "Linear array and string scan optimizations, contiguous subarray windows, dynamic shrinking conditions, and meeting-in-the-middle pointer techniques.",
      difficulty: "easy",
      order: 2,
      estimatedMinutes: 90,
      isPublished: false,
      prerequisiteTopics: ["Arrays & Strings"],
      keyConcepts: ["Fixed Window Size", "Dynamic Shrinking Window", "Opposite Direction Pointers", "Fast & Slow Pointers"],
      recommendedPatterns: ["Sliding Window", "Two Pointers"],
      targetProblems: ["longest-substring-without-repeating-characters", "container-with-most-water"],
    },
  },
  trees: {
    label: "Binary Trees & BSTs",
    description: "Hierarchical trees, in-order/pre-order traversals, search invariants, and BST iterators.",
    data: {
      name: "Binary Trees & BSTs",
      slug: "binary-trees-bst",
      description: "Hierarchical recursive data structures, depth-first and breadth-first tree traversals, BST ordering invariants, Lowest Common Ancestor, and balancing fundamentals.",
      difficulty: "medium",
      order: 4,
      estimatedMinutes: 120,
      isPublished: false,
      prerequisiteTopics: ["Recursion"],
      keyConcepts: ["Tree Traversals", "BST Invariant", "Lowest Common Ancestor", "Tree Height & Depth"],
      recommendedPatterns: ["Tree Inorder Traversal", "Tree BFS Level Order", "Tree Postorder DFS"],
      targetProblems: ["validate-binary-search-tree", "lowest-common-ancestor-of-a-bst"],
    },
  },
};

export function TopicImportModal({
  isOpen,
  onClose,
  onImport,
  currentForm,
  currentTopicId,
}: TopicImportModalProps) {
  const [tab, setTab] = useState<"ai" | "presets" | "export">("ai");
  const [rawJson, setRawJson] = useState("");
  const [customTopicName, setCustomTopicName] = useState(currentForm?.name || "");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);

  // Intelligence Validation state
  const [validationResult, setValidationResult] = useState<TopicValidationResult | null>(null);
  const [isValidating, startValidating] = useTransition();
  const [validationError, setValidationError] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (currentForm?.name && !customTopicName) {
      setCustomTopicName(currentForm.name);
    }
  }, [currentForm?.name, customTopicName]);

  const topicPromptTarget = customTopicName.trim() || "Dynamic Programming";

  const aiPromptTemplate = `You are a Senior Computer Science Curriculum Architect at DSA Club.
Generate a comprehensive, structured curriculum specification for the topic: "${topicPromptTarget}".

Output ONLY a single valid JSON object (enclosed in \`\`\`json markdown or raw JSON) strictly matching this schema:

{
  "name": "${topicPromptTarget}",
  "slug": "${topicPromptTarget.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}",
  "description": "2-4 sentence overview explaining what learners will understand, core mathematical/logical invariants, and how this topic is applied in coding interviews.",
  "difficulty": "beginner | easy | medium | hard | advanced",
  "order": 1,
  "estimatedMinutes": 120,
  "isPublished": false,
  "prerequisiteTopics": [
    "Arrays & Strings"
  ],
  "keyConcepts": [
    "Core Concept 1",
    "Core Concept 2",
    "Core Concept 3"
  ],
  "recommendedPatterns": [
    "Algorithmic Pattern 1",
    "Algorithmic Pattern 2"
  ],
  "targetProblems": [
    "canonical-leetcode-slug-1",
    "canonical-leetcode-slug-2"
  ],
  "learningObjectives": [
    "Identify when this technique is applicable",
    "Analyze time and space complexity trade-offs"
  ],
  "tags": ["core-dsa", "interview-prep"]
}

Important:
- "difficulty" must be one of: "beginner", "easy", "medium", "hard", "advanced".
- "estimatedMinutes" must be an integer between 15 and 600.
- Ensure the description is clear, technical, and educational (between 40 and 800 characters).
- Return ONLY the JSON object. Do not include introductory text or chat pleasantries.`;

  // Trigger deterministic intelligence validation
  const runValidation = (jsonString: string) => {
    setValidationError(null);
    if (!jsonString.trim()) {
      setValidationResult(null);
      return;
    }

    startValidating(async () => {
      try {
        // First, check basic client parse to give instant feedback
        cleanAndParseTopicJson(jsonString);

        // Then execute server-side deterministic DB validation
        const res = await fetch("/api/studio/topics/validate-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            json: jsonString,
            currentTopicId,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server validation failed (${res.status})`);
        }

        const data: TopicValidationResult = await res.json();
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
      name: currentForm.name,
      slug: currentForm.slug,
      description: currentForm.description,
      difficulty: currentForm.difficulty,
      order: currentForm.order,
      estimatedMinutes: currentForm.estimatedMinutes,
      isPublished: currentForm.isPublished,
    };
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2500);
  };

  const handleApply = () => {
    if (!validationResult || !validationResult.valid) return;

    onImport({
      name: validationResult.resolved.name,
      slug: validationResult.resolved.slug,
      description: validationResult.resolved.description,
      difficulty: validationResult.resolved.difficulty,
      order: validationResult.resolved.order,
      estimatedMinutes: validationResult.resolved.estimatedMinutes,
      isPublished: validationResult.resolved.isPublished,
      prerequisiteTopicIds: validationResult.resolved.prerequisiteTopicIds,
      metadata: validationResult.resolved.metadata,
    });
    onClose();
  };

  const handleLoadPreset = (presetKey: string) => {
    const preset = TOPIC_PRESETS[presetKey];
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
              <h2 className="text-base font-semibold text-white">AI Topic Import & Generator</h2>
              <p className="text-xs text-purple-300/70">
                Generate topic definitions via ChatGPT/Claude/Gemini with DSA Club Intelligence validation
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
            <BookOpen size={13} /> Curriculum Presets
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
            <Download size={13} /> Export Current Topic
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
                      Target topic name for curriculum prompt:
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customTopicName}
                      onChange={(e) => setCustomTopicName(e.target.value)}
                      placeholder="e.g. Dynamic Programming"
                      className="h-8 rounded-lg border border-purple-500/30 bg-black/40 px-2.5 text-xs text-white placeholder:text-purple-300/40 outline-none focus:border-purple-400 max-w-[180px]"
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
                  Paste the copied prompt into <strong>ChatGPT</strong>, <strong>Claude</strong>, or <strong>Gemini</strong>. Copy the returned JSON and paste it below.
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
                  placeholder='Paste JSON here (e.g. { "name": "Dynamic Programming", "description": "...", "difficulty": "medium" })'
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

                      {/* Compact Topic Card Preview */}
                      {validationResult.resolved && (
                        <div className="rounded-xl border border-purple-400/20 bg-purple-500/[0.04] p-4 space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">
                                {validationResult.resolved.name}
                              </h4>
                              <span className="rounded-md border border-purple-400/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-mono text-purple-200">
                                {validationResult.resolved.slug}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="rounded-full bg-cyan-400/10 border border-cyan-400/20 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-300 capitalize">
                                {validationResult.resolved.difficulty}
                              </span>
                              <span className="text-[11px] text-purple-300/60 flex items-center gap-1">
                                <Clock size={11} />
                                {validationResult.resolved.estimatedMinutes}m
                              </span>
                              <span className="text-[11px] text-purple-300/60 flex items-center gap-1">
                                <Layers size={11} />
                                Order: {validationResult.resolved.order}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-purple-200/80 leading-relaxed line-clamp-2">
                            {validationResult.resolved.description}
                          </p>

                          {/* Prerequisites Pill Display */}
                          {validationResult.resolved.prerequisiteTopicNames?.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-[10px] uppercase font-semibold text-purple-300/50">
                                Prerequisites:
                              </span>
                              {validationResult.resolved.prerequisiteTopicNames.map((name) => (
                                <span
                                  key={name}
                                  className="rounded-md border border-purple-400/20 bg-purple-400/10 px-2 py-0.5 text-[10px] text-purple-200"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Key Concepts Preview */}
                          {validationResult.resolved.metadata?.keyConcepts?.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <span className="text-[10px] uppercase font-semibold text-purple-300/50">
                                Concepts:
                              </span>
                              {validationResult.resolved.metadata.keyConcepts.map((concept) => (
                                <span
                                  key={concept}
                                  className="rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-0.5 text-[10px] text-purple-100/70"
                                >
                                  {concept}
                                </span>
                              ))}
                            </div>
                          )}
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
                Choose a pre-built DSA curriculum blueprint to inspect and auto-populate all topic fields:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(TOPIC_PRESETS).map(([key, preset]) => (
                  <div
                    key={key}
                    className="flex flex-col justify-between rounded-xl border border-purple-500/20 bg-purple-500/[0.06] p-4 hover:border-purple-400/40 hover:bg-purple-500/[0.1] transition"
                  >
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white">{preset.label}</h4>
                        <span className="text-[10px] rounded-full border border-purple-400/20 bg-purple-500/10 px-2 py-0.5 text-purple-300 capitalize">
                          {preset.data.difficulty}
                        </span>
                      </div>
                      <p className="text-xs text-purple-300/70 line-clamp-2">
                        {preset.description}
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
                Backup or copy the current topic definition as standard JSON:
              </p>
              <pre className="max-h-60 overflow-y-auto rounded-xl border border-purple-500/20 bg-[rgba(8,3,18,0.7)] p-4 text-[11px] font-mono text-purple-200 scrollbar-thin">
                {JSON.stringify(
                  {
                    name: currentForm.name,
                    slug: currentForm.slug,
                    description: currentForm.description,
                    difficulty: currentForm.difficulty,
                    order: currentForm.order,
                    estimatedMinutes: currentForm.estimatedMinutes,
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
              <Upload size={13} /> Apply & Populate Topic
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  );
}

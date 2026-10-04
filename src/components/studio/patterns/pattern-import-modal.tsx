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
  Layers,
  ArrowRight,
  FolderGit2,
  KeyRound,
  Compass,
} from "lucide-react";
import { ActionButton, StudioTextarea } from "@/components/studio/ui";
import {
  PatternDifficulty,
  PatternValidationResult,
  cleanAndParsePatternJson,
} from "@/features/content/services/pattern-import.types";

export type PatternImportData = {
  name: string;
  slug: string;
  topicId: string;
  description: string;
  whenToUse: string;
  mentalModel: string;
  variations: string[];
  signalKeywords: string[];
  prerequisitePatternIds: string[];
  difficulty: PatternDifficulty;
  isPublished: boolean;
};

interface PatternImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: PatternImportData) => void;
  currentForm: any;
  currentPatternId?: string | null;
  availableTopics?: Array<{ id: string; name: string }>;
}

const PATTERN_PRESETS: Record<string, { label: string; description: string; topicHint: string; data: any }> = {
  sliding_window: {
    label: "Sliding Window",
    description: "Contiguous subarray/substring optimizations with fixed or dynamically shrinking window boundaries.",
    topicHint: "Arrays & Strings",
    data: {
      name: "Sliding Window",
      slug: "sliding-window",
      topic: "Arrays & Strings",
      description: "A linear scan optimization technique that maintains a contiguous subset of elements satisfying problem constraints, converting O(N^2) brute force subarray scans into O(N) operations.",
      whenToUse: "Use when the problem asks for the longest, shortest, or target contiguous subarray or substring matching specific criteria (e.g., maximum sum, at most k distinct elements, no repeating characters).",
      mentalModel: "Imagine an expandable telescope looking at an array: expand the right side to incorporate new elements until constraint is broken, then contract the left side until valid again.",
      variations: [
        "Fixed-size window (e.g. max sum subarray of size k)",
        "Dynamic expanding/shrinking window (e.g. longest substring without repeats)",
        "Dynamic window with auxiliary hash map counter",
      ],
      signalKeywords: [
        "contiguous subarray",
        "longest substring",
        "fixed length k",
        "consecutive elements",
        "window sum",
      ],
      prerequisitePatterns: ["Two Pointers"],
      difficulty: "medium",
      isPublished: false,
    },
  },
  two_pointers: {
    label: "Two Pointers (Convergent & Divergent)",
    description: "Opposite directional or meeting-in-the-middle index traversal on sorted linear structures.",
    topicHint: "Arrays & Strings",
    data: {
      name: "Two Pointers",
      slug: "two-pointers",
      topic: "Arrays & Strings",
      description: "Coordinates two separate pointers traversing one or more sequences to compare elements, check symmetry, or identify target pairs without nested loop overhead.",
      whenToUse: "Use when dealing with sorted arrays to find pairs or triplets, partitioning elements in-place, or verifying palindromes and symmetrical constraints.",
      mentalModel: "Picture two inspectors starting at opposite ends of a row walking toward the center, deciding who takes the next step based on the sum or condition.",
      variations: [
        "Opposite-directional pointers (left and right moving inward)",
        "Equi-directional fast and slow pointers",
        "Dual-array merging pointers (sorted merge)",
      ],
      signalKeywords: [
        "sorted array",
        "find pair with sum",
        "palindrome verification",
        "in-place removal",
        "three sum",
      ],
      prerequisitePatterns: [],
      difficulty: "easy",
      isPublished: false,
    },
  },
  monotonic_stack: {
    label: "Monotonic Stack",
    description: "Maintains strictly increasing or decreasing elements to resolve nearest greater/smaller queries in O(N).",
    topicHint: "Queues & Stacks",
    data: {
      name: "Monotonic Stack",
      slug: "monotonic-stack",
      topic: "Queues & Stacks",
      description: "A stack variation that maintains elements in monotonically increasing or decreasing order, allowing O(1) determination of the nearest greater or smaller neighbor for every array element.",
      whenToUse: "Use when a problem asks for the 'next greater element', 'previous smaller element', largest rectangular area in a histogram, or trapping rainwater.",
      mentalModel: "Think of people standing in a line where taller people block the view of shorter people behind them; when someone taller arrives, shorter candidates are popped from visibility.",
      variations: [
        "Monotonic increasing stack (find previous/next smaller element)",
        "Monotonic decreasing stack (find previous/next greater element)",
        "Circular array monotonic stack traversal",
      ],
      signalKeywords: [
        "next greater element",
        "previous smaller element",
        "histogram largest rectangle",
        "daily temperatures",
        "trapping water",
      ],
      prerequisitePatterns: [],
      difficulty: "medium",
      isPublished: false,
    },
  },
  fast_slow_pointers: {
    label: "Fast & Slow Pointers (Floyd's Cycle)",
    description: "Two pointers moving at different speeds to detect cycles or pinpoint the midpoint of dynamic structures.",
    topicHint: "Linked Lists",
    data: {
      name: "Fast & Slow Pointers",
      slug: "fast-slow-pointers",
      topic: "Linked Lists",
      description: "Also known as the Tortoise and Hare algorithm, it uses two pointers traversing at differing relative speeds (e.g. 1x and 2x) to identify loops, cycles, and midpoints in O(N) time and O(1) space.",
      whenToUse: "Use when inspecting linked lists or cyclic sequences for loop detection, cycle entry point discovery, or finding the middle node without pre-calculating total length.",
      mentalModel: "Two runners on a track: on a circular loop, the faster runner will eventually lap and collide with the slower runner; on a linear straightaway, the faster runner finishes first.",
      variations: [
        "Cycle detection (Floyd's cycle test)",
        "Finding cycle starting node",
        "Middle of linked list",
        "Happy number sequence cycle",
      ],
      signalKeywords: [
        "linked list cycle",
        "detect loop",
        "middle node",
        "circular reference",
        "constant space",
      ],
      prerequisitePatterns: ["Two Pointers"],
      difficulty: "medium",
      isPublished: false,
    },
  },
};

export function PatternImportModal({
  isOpen,
  onClose,
  onImport,
  currentForm,
  currentPatternId,
  availableTopics = [],
}: PatternImportModalProps) {
  const [tab, setTab] = useState<"ai" | "presets" | "export">("ai");
  const [rawJson, setRawJson] = useState("");
  const [customPatternName, setCustomPatternName] = useState(currentForm?.name || "");
  const [customTopicName, setCustomTopicName] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);

  // Intelligence Validation state
  const [validationResult, setValidationResult] = useState<PatternValidationResult | null>(null);
  const [isValidating, startValidating] = useTransition();
  const [validationError, setValidationError] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (currentForm?.name && !customPatternName) {
      setCustomPatternName(currentForm.name);
    }
    if (currentForm?.topicId && !customTopicName && availableTopics.length > 0) {
      const matched = availableTopics.find((t) => t.id === currentForm.topicId);
      if (matched) setCustomTopicName(matched.name);
    }
  }, [currentForm, customPatternName, customTopicName, availableTopics]);

  const patternTarget = customPatternName.trim() || "Sliding Window";
  const topicTarget = customTopicName.trim() || "Arrays & Strings";

  const aiPromptTemplate = `You are a Senior Algorithm & Data Structures Curriculum Architect at DSA Club.
Generate a comprehensive, structured pattern specification for the algorithmic pattern: "${patternTarget}".
This pattern belongs under the curriculum topic: "${topicTarget}".

Output ONLY a single valid JSON object (enclosed in \`\`\`json markdown or raw JSON) strictly matching this schema:

{
  "name": "${patternTarget}",
  "slug": "${patternTarget.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}",
  "topic": "${topicTarget}",
  "description": "Comprehensive 2-4 sentence explanation of the algorithmic technique, core invariant, time/space complexity optimization, and why it is essential.",
  "whenToUse": "Actionable conditions and interview problem triggers describing precisely when to consider this pattern.",
  "mentalModel": "A clear conceptual intuition, physical analogy, or visualization that helps learners quickly internalize the strategy.",
  "variations": [
    "Variation 1 (e.g. Fixed-size window)",
    "Variation 2 (e.g. Dynamically expanding/shrinking window)"
  ],
  "signalKeywords": [
    "keyword 1",
    "keyword 2",
    "keyword 3"
  ],
  "prerequisitePatterns": [
    "Two Pointers"
  ],
  "difficulty": "beginner | easy | medium | hard | advanced",
  "isPublished": false
}

Important Instructions:
- "topic" should be the human-readable Topic name or slug (e.g. "${topicTarget}"). Do NOT invent MongoDB IDs.
- "difficulty" must be one of: "beginner", "easy", "medium", "hard", "advanced".
- "description" should be between 30 and 1500 characters.
- Return ONLY the JSON object. Do not include introductory or concluding chat remarks.`;

  // Trigger deterministic intelligence validation
  const runValidation = (jsonString: string) => {
    setValidationError(null);
    if (!jsonString.trim()) {
      setValidationResult(null);
      return;
    }

    startValidating(async () => {
      try {
        // Step 1: Immediate client parse for fast feedback
        cleanAndParsePatternJson(jsonString);

        // Step 2: Server-side deterministic DB validation
        const res = await fetch("/api/studio/patterns/validate-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            json: jsonString,
            currentPatternId,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server validation failed (${res.status})`);
        }

        const data: PatternValidationResult = await res.json();
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
      topicId: currentForm.topicId,
      description: currentForm.description,
      whenToUse: currentForm.whenToUse,
      mentalModel: currentForm.mentalModel,
      variations: currentForm.variations,
      signalKeywords: currentForm.signalKeywords,
      prerequisitePatternIds: currentForm.prerequisitePatternIds,
      difficulty: currentForm.difficulty,
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
      topicId: validationResult.resolved.topicId,
      description: validationResult.resolved.description,
      whenToUse: validationResult.resolved.whenToUse,
      mentalModel: validationResult.resolved.mentalModel,
      variations: validationResult.resolved.variations,
      signalKeywords: validationResult.resolved.signalKeywords,
      prerequisitePatternIds: validationResult.resolved.prerequisitePatternIds,
      difficulty: validationResult.resolved.difficulty,
      isPublished: validationResult.resolved.isPublished,
    });
    onClose();
  };

  const handleLoadPreset = (presetKey: string) => {
    const preset = PATTERN_PRESETS[presetKey];
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
              <h2 className="text-base font-semibold text-white">AI Pattern Import & Generator</h2>
              <p className="text-xs text-purple-300/70">
                Generate pattern specifications externally via ChatGPT/Claude/Gemini with DSA Club Intelligence validation
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
            <BookOpen size={13} /> Pattern Presets
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
            <Download size={13} /> Export Current Pattern
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
                      Customize pattern & target topic context:
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={customPatternName}
                      onChange={(e) => setCustomPatternName(e.target.value)}
                      placeholder="Pattern (e.g. Sliding Window)"
                      className="h-8 rounded-lg border border-purple-500/30 bg-black/40 px-2.5 text-xs text-white placeholder:text-purple-300/40 outline-none focus:border-purple-400 max-w-[150px]"
                    />
                    <input
                      type="text"
                      value={customTopicName}
                      onChange={(e) => setCustomTopicName(e.target.value)}
                      placeholder="Topic (e.g. Arrays & Strings)"
                      className="h-8 rounded-lg border border-purple-500/30 bg-black/40 px-2.5 text-xs text-white placeholder:text-purple-300/40 outline-none focus:border-purple-400 max-w-[150px]"
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
                  placeholder='Paste JSON here (e.g. { "name": "Sliding Window", "topic": "Arrays & Strings", "description": "...", "difficulty": "medium" })'
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

                      {/* Compact Pattern Card Preview */}
                      {validationResult.resolved && (
                        <div className="rounded-xl border border-purple-400/20 bg-purple-500/[0.04] p-4 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">
                                {validationResult.resolved.name || "(Unnamed Pattern)"}
                              </h4>
                              {validationResult.resolved.slug && (
                                <span className="rounded-md border border-purple-400/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-mono text-purple-200">
                                  {validationResult.resolved.slug}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 text-xs">
                              {validationResult.resolvedTopic && (
                                <span className="flex items-center gap-1 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium text-cyan-200">
                                  <FolderGit2 size={10} />
                                  Topic: {validationResult.resolvedTopic.name}
                                </span>
                              )}
                              <span className="rounded-full bg-purple-400/15 border border-purple-400/30 px-2.5 py-0.5 text-[10px] font-semibold text-purple-200 capitalize">
                                {validationResult.resolved.difficulty}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-purple-200/80 leading-relaxed line-clamp-3">
                            {validationResult.resolved.description || "(No description provided)"}
                          </p>

                          {/* When to Use preview */}
                          {validationResult.resolved.whenToUse && (
                            <div className="text-[11px] text-purple-300/80 rounded-lg bg-black/20 p-2.5 border border-white/[0.04] space-y-0.5">
                              <span className="font-semibold text-purple-200 flex items-center gap-1">
                                <Compass size={11} className="text-purple-400" /> When to Use:
                              </span>
                              <p className="line-clamp-2">{validationResult.resolved.whenToUse}</p>
                            </div>
                          )}

                          {/* Variations Tags */}
                          {validationResult.resolved.variations?.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <span className="text-[10px] uppercase font-semibold text-purple-300/50 flex items-center gap-1">
                                <Layers size={10} /> Variations:
                              </span>
                              {validationResult.resolved.variations.map((v, i) => (
                                <span
                                  key={i}
                                  className="rounded-md border border-purple-400/20 bg-purple-400/10 px-2 py-0.5 text-[10px] text-purple-200"
                                >
                                  {v}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Signal Keywords Tags */}
                          {validationResult.resolved.signalKeywords?.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <span className="text-[10px] uppercase font-semibold text-purple-300/50 flex items-center gap-1">
                                <KeyRound size={10} /> Signals:
                              </span>
                              {validationResult.resolved.signalKeywords.map((kw, i) => (
                                <span
                                  key={i}
                                  className="rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-0.5 text-[10px] text-purple-100/70"
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Prerequisite Patterns */}
                          {validationResult.resolvedPrerequisitePatterns &&
                            validationResult.resolvedPrerequisitePatterns.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <span className="text-[10px] uppercase font-semibold text-purple-300/50">
                                  Prerequisites:
                                </span>
                                {validationResult.resolvedPrerequisitePatterns.map((pat) => (
                                  <span
                                    key={pat.id}
                                    className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200"
                                  >
                                    {pat.name}
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
                Choose a pre-built DSA algorithmic pattern blueprint to inspect and auto-populate all fields:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(PATTERN_PRESETS).map(([key, preset]) => (
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
                      <span className="text-[10px] font-mono text-cyan-300 block">
                        Topic: {preset.topicHint}
                      </span>
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
                Backup or copy the current pattern definition as standard JSON:
              </p>
              <pre className="max-h-60 overflow-y-auto rounded-xl border border-purple-500/20 bg-[rgba(8,3,18,0.7)] p-4 text-[11px] font-mono text-purple-200 scrollbar-thin">
                {JSON.stringify(
                  {
                    name: currentForm.name,
                    slug: currentForm.slug,
                    topicId: currentForm.topicId,
                    description: currentForm.description,
                    whenToUse: currentForm.whenToUse,
                    mentalModel: currentForm.mentalModel,
                    variations: currentForm.variations,
                    signalKeywords: currentForm.signalKeywords,
                    prerequisitePatternIds: currentForm.prerequisitePatternIds,
                    difficulty: currentForm.difficulty,
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
              <Upload size={13} /> Apply & Populate Pattern
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  );
}

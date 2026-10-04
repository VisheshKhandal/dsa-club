"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Sparkles,
  Copy,
  Check,
  Upload,
  Database,
  FileJson,
  ClipboardList,
  Eye,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  BookOpen,
  Boxes,
  Code2,
  Target,
  Search,
  Zap,
} from "lucide-react";
import { ActionButton, StudioTextarea, StudioInput } from "@/components/studio/ui";

// ─── Types ───────────────────────────────────────────────────────────────────

type CatalogItem = {
  id: string;
  slug: string;
  name: string;
  sourceUrl?: string;
  difficulty?: string;
  isPublished?: boolean;
};

type ResolvedRef = {
  id: string;
  slug: string;
  name: string;
  confidence: string;
  matchedVia: string;
};

type CandidateRef = {
  id: string;
  slug: string;
  name: string;
  score: number;
  matchedVia: string;
};

type UnresolvedRef = {
  input: { slug?: string; title?: string; name?: string; url?: string; sourceUrl?: string };
  candidates: CandidateRef[];
};

type ResolvedStage = {
  title: string;
  description: string;
  estimatedMinutes: number;
  topics: { resolved: ResolvedRef[]; unresolved: UnresolvedRef[] };
  patterns: { resolved: ResolvedRef[]; unresolved: UnresolvedRef[] };
  problems: { resolved: ResolvedRef[]; unresolved: UnresolvedRef[] };
  missions: { resolved: ResolvedRef[]; unresolved: UnresolvedRef[] };
};

type ResolutionReport = {
  pathMeta: {
    title: string;
    slug: string;
    description: string;
    difficulty: string;
    estimatedMinutes: number;
    audience: string;
    tags: string[];
  };
  stages: ResolvedStage[];
  summary: {
    totalTopics: number;
    resolvedTopics: number;
    totalPatterns: number;
    resolvedPatterns: number;
    totalProblems: number;
    resolvedProblems: number;
    totalMissions: number;
    resolvedMissions: number;
    totalUnresolved: number;
  };
};

type Tab = "prompt" | "catalog" | "import" | "report" | "preview";

// ─── Exported type for parent integration ────────────────────────────────────

export type LearningPathImportResult = {
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  estimatedMinutes: number;
  audience: string;
  tags: string[];
  stages: {
    title: string;
    description: string;
    estimatedMinutes: number;
    topicIds: string[];
    patternIds: string[];
    problemIds: string[];
    missionIds: string[];
  }[];
};

interface LearningPathImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPopulate: (data: LearningPathImportResult) => void;
}

// ─── AI Prompt Template ──────────────────────────────────────────────────────

const AI_PROMPT_TEMPLATE = `You are a DSA Curriculum Architect. Generate a complete Learning Path JSON for a DSA Club platform.

The Learning Path has STAGES, and each stage references existing content from the database:
- Topics (by slug)
- Patterns (by slug)
- Problems (by slug or LeetCode URL)
- Missions (by slug)

Return ONLY a JSON object (inside \`\`\`json markdown or raw JSON) following this EXACT schema:

{
  "title": "Complete DSA Mastery Path",
  "slug": "complete-dsa-mastery",
  "description": "A comprehensive learning path covering all major DSA topics from basics to advanced.",
  "difficulty": "medium",
  "estimatedMinutes": 6000,
  "audience": "Aspiring software engineers preparing for technical interviews",
  "tags": ["dsa", "interview-prep", "algorithms"],
  "stages": [
    {
      "title": "Stage 1: Arrays & Hashing Fundamentals",
      "description": "Master array manipulation and hash-based techniques.",
      "estimatedMinutes": 480,
      "topics": [
        { "slug": "arrays-and-hashing" },
        { "slug": "hash-tables" }
      ],
      "patterns": [
        { "slug": "two-pointer" },
        { "slug": "sliding-window" }
      ],
      "problems": [
        { "slug": "two-sum", "url": "https://leetcode.com/problems/two-sum/" },
        { "slug": "contains-duplicate", "url": "https://leetcode.com/problems/contains-duplicate/" },
        { "title": "Group Anagrams", "url": "https://leetcode.com/problems/group-anagrams/" }
      ],
      "missions": [
        { "slug": "mastering-arrays" }
      ]
    },
    {
      "title": "Stage 2: Two Pointers & Sliding Window",
      "description": "Learn efficient scanning techniques for sorted and sequential data.",
      "estimatedMinutes": 360,
      "topics": [
        { "slug": "two-pointers" }
      ],
      "patterns": [
        { "slug": "two-pointer" },
        { "slug": "sliding-window" }
      ],
      "problems": [
        { "slug": "valid-palindrome" },
        { "slug": "container-with-most-water" },
        { "slug": "longest-substring-without-repeating-characters" }
      ],
      "missions": []
    }
  ]
}

RULES:
1. Each stage must have a descriptive title and description.
2. Reference content by slug (lowercase-hyphenated). Use LeetCode URLs for problems when possible.
3. Include 3-8 problems per stage, ordered by difficulty.
4. Include 5-15 stages for a comprehensive path.
5. estimatedMinutes should be realistic (each problem ~20-45min, each topic ~60-120min).
6. Return ONLY valid JSON. No explanations outside the JSON block.`;

// ─── Component ───────────────────────────────────────────────────────────────

export function LearningPathImportModal({
  isOpen,
  onClose,
  onPopulate,
}: LearningPathImportModalProps) {
  const [tab, setTab] = useState<Tab>("prompt");
  const [rawJson, setRawJson] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [report, setReport] = useState<ResolutionReport | null>(null);

  // Catalog state
  const [catalog, setCatalog] = useState<{
    topics: CatalogItem[];
    patterns: CatalogItem[];
    problems: CatalogItem[];
    missions: CatalogItem[];
  } | null>(null);
  const [promptCatalog, setPromptCatalog] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogType, setCatalogType] = useState<"topics" | "patterns" | "problems" | "missions">("topics");

  // Copy feedback states
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedCombined, setCopiedCombined] = useState(false);
  const [copiedCatalog, setCopiedCatalog] = useState(false);

  // Disambiguation: stage-level overrides (key: "stage-{idx}-{type}-{inputIdx}" => selected candidate id)
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  // Stage expansion state for report view
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set());

  const toggleStageExpand = (idx: number) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  // ─── Fetch catalog on tab switch ─────────────────────────────────────────

  const fetchCatalog = useCallback(async () => {
    if (catalog) return; // already loaded
    setCatalogLoading(true);
    try {
      const res = await fetch("/api/studio/learning-paths/catalog");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCatalog(data.catalog);
      setPromptCatalog(data.promptCatalog || "");
    } catch {
      // silent
    } finally {
      setCatalogLoading(false);
    }
  }, [catalog]);

  useEffect(() => {
    if (isOpen && (tab === "catalog" || tab === "prompt")) {
      void fetchCatalog();
    }
  }, [isOpen, tab, fetchCatalog]);

  if (!isOpen) return null;

  // ─── Copy handlers ──────────────────────────────────────────────────────

  function handleCopyPrompt() {
    navigator.clipboard.writeText(AI_PROMPT_TEMPLATE);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  }

  function handleCopyCombined() {
    const combined = AI_PROMPT_TEMPLATE + "\n\n---\n\nHere is the existing content catalog from our database. Use ONLY these slugs/URLs:\n\n" + promptCatalog;
    navigator.clipboard.writeText(combined);
    setCopiedCombined(true);
    setTimeout(() => setCopiedCombined(false), 2500);
  }

  function handleCopyCatalog() {
    navigator.clipboard.writeText(promptCatalog);
    setCopiedCatalog(true);
    setTimeout(() => setCopiedCatalog(false), 2500);
  }

  // ─── Validate & Resolve JSON ──────────────────────────────────────────

  async function handleValidateAndResolve() {
    setParseError(null);
    let cleaned = rawJson.trim();
    if (!cleaned) {
      setParseError("Please paste JSON content first.");
      return;
    }

    // Strip markdown code fences
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      cleaned = match[1].trim();
    }

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      setParseError("Invalid JSON syntax. Check for trailing commas, missing quotes, or other JSON formatting issues.");
      return;
    }

    if (!parsed || typeof parsed !== "object") {
      setParseError("Expected a JSON object with 'stages' array.");
      return;
    }

    if (!Array.isArray(parsed.stages) || parsed.stages.length === 0) {
      setParseError("JSON must include a non-empty 'stages' array. Each stage should have topics, patterns, problems, and missions.");
      return;
    }

    // Call resolve API
    setResolving(true);
    try {
      const res = await fetch("/api/studio/learning-paths/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setParseError(data.error || "Server validation failed.");
        return;
      }
      setReport(data.report);
      setOverrides({});
      setExpandedStages(new Set());
      setTab("report");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Network error during resolution.");
    } finally {
      setResolving(false);
    }
  }

  // ─── Apply override (select a candidate for an unresolved item) ───────

  function applyOverride(key: string, candidate: CandidateRef) {
    setOverrides((prev) => ({ ...prev, [key]: candidate.id }));
    // Also update the report to move the item from unresolved to resolved
    if (!report) return;
    const parts = key.split("-"); // e.g., "stage-0-problems-1"
    const stageIdx = parseInt(parts[1]);
    const type = parts[2] as "topics" | "patterns" | "problems" | "missions";
    const itemIdx = parseInt(parts[3]);

    const updatedStages = [...report.stages];
    const stage = { ...updatedStages[stageIdx] };
    const group = { ...stage[type] };
    const unresolvedItem = group.unresolved[itemIdx];
    if (!unresolvedItem) return;

    // Move to resolved
    group.resolved = [
      ...group.resolved,
      {
        id: candidate.id,
        slug: candidate.slug,
        name: candidate.name,
        confidence: "medium",
        matchedVia: `manual-${candidate.matchedVia}`,
      },
    ];
    group.unresolved = group.unresolved.filter((_, i) => i !== itemIdx);
    stage[type] = group;
    updatedStages[stageIdx] = stage;

    const summary = { ...report.summary };
    const totalKey = `total${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof summary;
    const resolvedKey = `resolved${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof summary;
    (summary[resolvedKey] as number)++;
    summary.totalUnresolved = Math.max(0, summary.totalUnresolved - 1);

    setReport({ ...report, stages: updatedStages, summary });
  }

  // ─── Build final result and populate ──────────────────────────────────

  function handlePopulate() {
    if (!report) return;
    const result: LearningPathImportResult = {
      title: report.pathMeta.title,
      slug: report.pathMeta.slug,
      description: report.pathMeta.description,
      difficulty: report.pathMeta.difficulty,
      estimatedMinutes: report.pathMeta.estimatedMinutes,
      audience: report.pathMeta.audience,
      tags: report.pathMeta.tags,
      stages: report.stages.map((stage) => ({
        title: stage.title,
        description: stage.description,
        estimatedMinutes: stage.estimatedMinutes,
        topicIds: stage.topics.resolved.map((r) => r.id),
        patternIds: stage.patterns.resolved.map((r) => r.id),
        problemIds: stage.problems.resolved.map((r) => r.id),
        missionIds: stage.missions.resolved.map((r) => r.id),
      })),
    };
    onPopulate(result);
    onClose();
  }

  // ─── Catalog filtered items ───────────────────────────────────────────

  const filteredCatalogItems = catalog
    ? catalog[catalogType].filter((item) => {
        if (!catalogSearch) return true;
        const q = catalogSearch.toLowerCase();
        return (
          item.slug.includes(q) ||
          item.name.toLowerCase().includes(q) ||
          (item.sourceUrl || "").toLowerCase().includes(q)
        );
      })
    : [];

  // ─── Summary stats for report ─────────────────────────────────────────

  const totalResolved = report
    ? report.summary.resolvedTopics + report.summary.resolvedPatterns + report.summary.resolvedProblems + report.summary.resolvedMissions
    : 0;
  const totalItems = report
    ? report.summary.totalTopics + report.summary.totalPatterns + report.summary.totalProblems + report.summary.totalMissions
    : 0;

  // ─── Tab config ───────────────────────────────────────────────────────

  const tabs: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: "prompt", icon: <Sparkles size={13} />, label: "AI Prompt" },
    { key: "catalog", icon: <Database size={13} />, label: "Catalog" },
    { key: "import", icon: <FileJson size={13} />, label: "Import JSON" },
    { key: "report", icon: <ClipboardList size={13} />, label: "Report" },
    { key: "preview", icon: <Eye size={13} />, label: "Preview" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl border border-purple-500/20 bg-[rgba(15,8,30,0.95)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-500/15 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/25 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
              <Sparkles size={17} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Smart Learning Path Importer
              </h2>
              <p className="text-xs text-purple-300/70">
                AI-powered import with deterministic reference resolution
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-purple-300/60 hover:bg-purple-500/10 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-purple-500/10 bg-[rgba(10,5,20,0.5)] px-6 pt-2 overflow-x-auto scrollbar-none">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              disabled={
                (t.key === "report" && !report) ||
                (t.key === "preview" && !report)
              }
              className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                tab === t.key
                  ? "border-purple-400 text-purple-200"
                  : (t.key === "report" || t.key === "preview") && !report
                  ? "border-transparent text-purple-300/25 cursor-not-allowed"
                  : "border-transparent text-purple-300/50 hover:text-purple-200"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-4 flex-1 scrollbar-thin">
          {/* ═══ TAB: AI PROMPT ═══ */}
          {tab === "prompt" && (
            <div className="space-y-4">
              {/* Step 1: Copy prompt */}
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-purple-200">
                    Step 1: Copy the AI prompt
                  </span>
                </div>
                <p className="text-[11px] text-purple-300/70 leading-relaxed">
                  This prompt instructs ChatGPT / Claude / Gemini to generate a
                  complete Learning Path JSON with stages, topics, patterns,
                  problems, and missions. Copy it, paste into any AI tool, and
                  get back structured JSON.
                </p>
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPrompt}
                    className="h-8 text-xs"
                  >
                    {copiedPrompt ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                    {copiedPrompt ? "Copied!" : "Copy AI Prompt"}
                  </ActionButton>
                  <ActionButton
                    size="sm"
                    onClick={handleCopyCombined}
                    disabled={!promptCatalog && !catalogLoading}
                    className="h-8 text-xs"
                  >
                    {copiedCombined ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Zap size={12} />
                    )}
                    {copiedCombined
                      ? "Copied!"
                      : catalogLoading
                      ? "Loading catalog..."
                      : "Copy Prompt + Catalog (Recommended)"}
                  </ActionButton>
                </div>
              </div>

              {/* Step 2: Prompt preview */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-purple-200">
                  Prompt Preview
                </label>
                <pre className="max-h-48 overflow-y-auto rounded-xl border border-purple-500/15 bg-[rgba(8,3,18,0.7)] p-4 text-[11px] font-mono text-purple-200/80 whitespace-pre-wrap leading-relaxed scrollbar-thin">
                  {AI_PROMPT_TEMPLATE}
                </pre>
              </div>

              {/* Step 3: Quick guide */}
              <div className="rounded-xl border border-purple-500/15 bg-[rgba(8,3,18,0.4)] p-4 space-y-2">
                <span className="text-xs font-semibold text-purple-200">
                  Workflow
                </span>
                <div className="grid gap-2 text-[11px] text-purple-300/70">
                  <div className="flex items-start gap-2">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-[10px] font-bold text-purple-300 border border-purple-500/20">
                      1
                    </span>
                    <span>
                      Copy the prompt (with catalog for best results) and paste
                      into ChatGPT / Claude / Gemini
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-[10px] font-bold text-purple-300 border border-purple-500/20">
                      2
                    </span>
                    <span>
                      Copy the AI&apos;s generated JSON output
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-[10px] font-bold text-purple-300 border border-purple-500/20">
                      3
                    </span>
                    <span>
                      Go to the <strong>Import JSON</strong> tab, paste, and
                      click &quot;Validate &amp; Resolve&quot;
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-[10px] font-bold text-purple-300 border border-purple-500/20">
                      4
                    </span>
                    <span>
                      Review the resolution report, fix unresolved items, then
                      populate the form
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB: CATALOG ═══ */}
          {tab === "catalog" && (
            <div className="space-y-4">
              {catalogLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-purple-300/60 text-sm">
                  <Loader2 size={24} className="animate-spin text-purple-400" />
                  <span>Loading content catalog...</span>
                </div>
              ) : catalog ? (
                <>
                  {/* Counts summary */}
                  <div className="grid grid-cols-4 gap-2">
                    {(
                      [
                        { key: "topics" as const, label: "Topics", icon: <BookOpen size={14} />, count: catalog.topics.length },
                        { key: "patterns" as const, label: "Patterns", icon: <Boxes size={14} />, count: catalog.patterns.length },
                        { key: "problems" as const, label: "Problems", icon: <Code2 size={14} />, count: catalog.problems.length },
                        { key: "missions" as const, label: "Missions", icon: <Target size={14} />, count: catalog.missions.length },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setCatalogType(item.key)}
                        className={`rounded-xl border p-3 text-center transition-all ${
                          catalogType === item.key
                            ? "border-purple-500/40 bg-purple-500/15 shadow-[0_0_8px_rgba(168,85,247,0.15)]"
                            : "border-purple-500/15 bg-[rgba(10,5,20,0.5)] hover:border-purple-500/25"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5 text-purple-300 mb-1">
                          {item.icon}
                        </div>
                        <div className="text-lg font-bold text-white tabular-nums">{item.count}</div>
                        <div className="text-[10px] text-purple-300/60 uppercase tracking-wide">{item.label}</div>
                      </button>
                    ))}
                  </div>

                  {/* Search & list */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-2.5 text-purple-400/60" />
                    <StudioInput
                      placeholder={`Search ${catalogType}...`}
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>

                  <div className="max-h-64 overflow-y-auto rounded-xl border border-purple-500/15 bg-[rgba(8,3,18,0.5)] divide-y divide-purple-500/10 scrollbar-thin">
                    {filteredCatalogItems.length === 0 ? (
                      <div className="p-6 text-center text-xs text-purple-300/40">
                        No {catalogType} found
                      </div>
                    ) : (
                      filteredCatalogItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between px-3.5 py-2 text-xs hover:bg-purple-500/5 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-purple-100 truncate block">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-purple-300/50 font-mono">
                              {item.slug}
                              {item.sourceUrl && (
                                <> • {item.sourceUrl}</>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {item.difficulty && (
                              <span className="rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-300 border border-purple-500/15 capitalize">
                                {item.difficulty}
                              </span>
                            )}
                            {item.isPublished ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Published" />
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Draft" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <ActionButton
                    onClick={handleCopyCatalog}
                    className="w-full"
                    size="sm"
                  >
                    {copiedCatalog ? (
                      <Check size={13} className="text-emerald-400" />
                    ) : (
                      <Copy size={13} />
                    )}
                    {copiedCatalog
                      ? "Catalog Copied!"
                      : "Copy Catalog to Clipboard"}
                  </ActionButton>
                </>
              ) : (
                <div className="py-8 text-center text-xs text-purple-300/50">
                  Failed to load catalog. Try refreshing.
                </div>
              )}
            </div>
          )}

          {/* ═══ TAB: IMPORT JSON ═══ */}
          {tab === "import" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-purple-200">
                  Paste AI-generated Learning Path JSON
                </label>
                <p className="text-[11px] text-purple-300/60">
                  Accepts raw JSON or JSON inside{" "}
                  <code className="rounded bg-purple-500/15 px-1 py-0.5 text-purple-200 text-[10px]">
                    ```json
                  </code>{" "}
                  code fences. The system will automatically strip markdown formatting.
                </p>
                <StudioTextarea
                  rows={12}
                  placeholder={`{\n  "title": "Complete DSA Mastery Path",\n  "stages": [\n    {\n      "title": "Stage 1: Arrays",\n      "topics": [{ "slug": "arrays" }],\n      "problems": [{ "url": "https://leetcode.com/problems/two-sum/" }]\n    }\n  ]\n}`}
                  value={rawJson}
                  onChange={(e) => setRawJson(e.target.value)}
                  className="font-mono text-xs"
                />
                {parseError && (
                  <div className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                    <AlertCircle
                      size={14}
                      className="shrink-0 mt-0.5 text-rose-400"
                    />
                    <span>{parseError}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ TAB: REPORT ═══ */}
          {tab === "report" && report && (
            <div className="space-y-4">
              {/* Summary pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Topics", resolved: report.summary.resolvedTopics, total: report.summary.totalTopics, icon: <BookOpen size={12} /> },
                  { label: "Patterns", resolved: report.summary.resolvedPatterns, total: report.summary.totalPatterns, icon: <Boxes size={12} /> },
                  { label: "Problems", resolved: report.summary.resolvedProblems, total: report.summary.totalProblems, icon: <Code2 size={12} /> },
                  { label: "Missions", resolved: report.summary.resolvedMissions, total: report.summary.totalMissions, icon: <Target size={12} /> },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`rounded-xl border p-3 text-center ${
                      stat.resolved === stat.total && stat.total > 0
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : stat.total === 0
                        ? "border-purple-500/15 bg-[rgba(10,5,20,0.5)]"
                        : "border-amber-500/30 bg-amber-500/10"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 text-purple-300/60 mb-1">
                      {stat.icon}
                    </div>
                    <div className="text-sm font-bold text-white tabular-nums">
                      {stat.resolved === stat.total && stat.total > 0 ? "✓ " : stat.total > stat.resolved ? "⚠ " : ""}
                      {stat.resolved}/{stat.total}
                    </div>
                    <div className="text-[10px] text-purple-300/60 uppercase tracking-wide">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Overall status */}
              <div
                className={`rounded-xl border p-3 text-center text-xs font-medium ${
                  report.summary.totalUnresolved === 0
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-500/25 bg-amber-500/10 text-amber-300"
                }`}
              >
                {report.summary.totalUnresolved === 0
                  ? `✓ All ${totalResolved} references resolved successfully! Ready to populate.`
                  : `⚠ ${report.summary.totalUnresolved} item(s) need review. ${totalResolved}/${totalItems} resolved.`}
              </div>

              {/* Stage-by-stage breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-purple-200 uppercase tracking-wider">
                  Stage Breakdown
                </h4>
                {report.stages.map((stage, stageIdx) => {
                  const stageTotal =
                    stage.topics.resolved.length + stage.topics.unresolved.length +
                    stage.patterns.resolved.length + stage.patterns.unresolved.length +
                    stage.problems.resolved.length + stage.problems.unresolved.length +
                    stage.missions.resolved.length + stage.missions.unresolved.length;
                  const stageResolved =
                    stage.topics.resolved.length + stage.patterns.resolved.length +
                    stage.problems.resolved.length + stage.missions.resolved.length;
                  const stageUnresolved = stageTotal - stageResolved;
                  const isExpanded = expandedStages.has(stageIdx);

                  return (
                    <div
                      key={stageIdx}
                      className="rounded-xl border border-purple-500/15 bg-[rgba(12,6,24,0.5)] overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleStageExpand(stageIdx)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-purple-500/5 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isExpanded ? (
                            <ChevronDown size={14} className="text-purple-400 shrink-0" />
                          ) : (
                            <ChevronRight size={14} className="text-purple-400 shrink-0" />
                          )}
                          <span className="rounded-md bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-mono font-bold text-purple-300 border border-purple-500/20 shrink-0">
                            S{stageIdx + 1}
                          </span>
                          <span className="text-xs font-medium text-white truncate">
                            {stage.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${
                              stageUnresolved === 0
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                            }`}
                          >
                            {stageResolved}/{stageTotal}
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-purple-500/10 px-4 py-3 space-y-3">
                          {(["topics", "patterns", "problems", "missions"] as const).map((type) => {
                            const group = stage[type];
                            if (group.resolved.length === 0 && group.unresolved.length === 0) return null;
                            const typeIcon = type === "topics" ? <BookOpen size={11} /> : type === "patterns" ? <Boxes size={11} /> : type === "problems" ? <Code2 size={11} /> : <Target size={11} />;
                            return (
                              <div key={type} className="space-y-1.5">
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-200 capitalize">
                                  {typeIcon} {type}
                                  <span className="text-purple-300/50 font-normal">
                                    ({group.resolved.length} resolved
                                    {group.unresolved.length > 0 && `, ${group.unresolved.length} unresolved`})
                                  </span>
                                </div>
                                {/* Resolved items */}
                                {group.resolved.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {group.resolved.map((ref) => (
                                      <span
                                        key={ref.id}
                                        className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200"
                                        title={`${ref.slug} (${ref.matchedVia})`}
                                      >
                                        <Check size={9} className="text-emerald-400" />
                                        <span className="max-w-[120px] truncate">{ref.name}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {/* Unresolved items with candidates */}
                                {group.unresolved.map((item, itemIdx) => (
                                  <div
                                    key={itemIdx}
                                    className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 space-y-2"
                                  >
                                    <div className="flex items-center gap-1.5 text-[11px] text-amber-300">
                                      <AlertCircle size={11} className="text-amber-400" />
                                      <span className="font-medium">
                                        Could not resolve:{" "}
                                        <code className="rounded bg-amber-500/15 px-1 text-amber-200">
                                          {item.input.title || item.input.name || item.input.slug || item.input.url || "unknown"}
                                        </code>
                                      </span>
                                    </div>
                                    {item.candidates.length > 0 ? (
                                      <div className="space-y-1">
                                        <span className="text-[10px] text-purple-300/50">
                                          Top candidates:
                                        </span>
                                        {item.candidates.map((candidate) => (
                                          <div
                                            key={candidate.id}
                                            className="flex items-center justify-between rounded-md border border-purple-500/15 bg-[rgba(10,5,20,0.6)] px-2.5 py-1.5 hover:border-purple-500/30 transition-colors"
                                          >
                                            <div className="min-w-0 flex-1">
                                              <span className="text-[11px] text-purple-100 font-medium truncate block">
                                                {candidate.name}
                                              </span>
                                              <span className="text-[9px] text-purple-300/50 font-mono">
                                                {candidate.slug} • {candidate.score}% match
                                              </span>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                applyOverride(
                                                  `stage-${stageIdx}-${type}-${itemIdx}`,
                                                  candidate
                                                )
                                              }
                                              className="shrink-0 rounded-md bg-purple-500/15 px-2 py-1 text-[10px] font-medium text-purple-200 hover:bg-purple-500/25 border border-purple-500/20 transition-colors"
                                            >
                                              Select
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-purple-300/40 italic">
                                        No candidates found in database. This item will be skipped.
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ TAB: PREVIEW ═══ */}
          {tab === "preview" && report && (
            <div className="space-y-4">
              {/* Path metadata */}
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4 space-y-2">
                <h3 className="text-base font-bold text-white">
                  {report.pathMeta.title}
                </h3>
                <p className="text-xs text-purple-300/70 leading-relaxed">
                  {report.pathMeta.description}
                </p>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  <span className="rounded-md bg-purple-500/15 px-2 py-0.5 text-purple-200 border border-purple-500/20 capitalize">
                    {report.pathMeta.difficulty}
                  </span>
                  <span className="rounded-md bg-purple-500/15 px-2 py-0.5 text-purple-200 border border-purple-500/20">
                    {report.pathMeta.estimatedMinutes} min
                  </span>
                  {report.pathMeta.audience && (
                    <span className="rounded-md bg-purple-500/15 px-2 py-0.5 text-purple-200 border border-purple-500/20">
                      {report.pathMeta.audience}
                    </span>
                  )}
                  {report.pathMeta.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-purple-500/10 px-2 py-0.5 text-purple-300/70 border border-purple-500/15"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Visual stage overview */}
              <div className="space-y-2">
                {report.stages.map((stage, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-purple-500/15 bg-[rgba(12,6,24,0.5)] p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-purple-300 border border-purple-500/25">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-white">
                        {stage.title}
                      </span>
                      <span className="text-[10px] text-purple-300/50 ml-auto">
                        {stage.estimatedMinutes} min
                      </span>
                    </div>
                    {stage.description && (
                      <p className="text-[10px] text-purple-300/60 leading-relaxed pl-7">
                        {stage.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 pl-7">
                      {stage.topics.resolved.map((r) => (
                        <span key={r.id} className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[9px] text-blue-200 border border-blue-500/20">
                          📘 {r.name}
                        </span>
                      ))}
                      {stage.patterns.resolved.map((r) => (
                        <span key={r.id} className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[9px] text-violet-200 border border-violet-500/20">
                          🧩 {r.name}
                        </span>
                      ))}
                      {stage.problems.resolved.map((r) => (
                        <span key={r.id} className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[9px] text-cyan-200 border border-cyan-500/20">
                          💻 {r.name}
                        </span>
                      ))}
                      {stage.missions.resolved.map((r) => (
                        <span key={r.id} className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] text-amber-200 border border-amber-500/20">
                          🎯 {r.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total summary */}
              <div className="rounded-xl border border-purple-500/15 bg-[rgba(10,5,20,0.5)] p-3 text-center text-xs text-purple-300/70">
                {report.stages.length} stages •{" "}
                {totalResolved} content items •{" "}
                ~{Math.round(report.pathMeta.estimatedMinutes / 60)} hours total
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-purple-500/15 bg-[rgba(10,5,20,0.5)] px-6 py-3">
          <ActionButton variant="outline" size="sm" onClick={onClose}>
            Cancel
          </ActionButton>
          <div className="flex items-center gap-2">
            {tab === "import" && (
              <ActionButton
                size="sm"
                onClick={handleValidateAndResolve}
                disabled={!rawJson.trim() || resolving}
              >
                {resolving ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Upload size={13} />
                )}
                {resolving ? "Resolving..." : "Validate & Resolve"}
              </ActionButton>
            )}
            {tab === "report" && report && (
              <>
                <ActionButton
                  variant="outline"
                  size="sm"
                  onClick={() => setTab("import")}
                >
                  ← Back to JSON
                </ActionButton>
                <ActionButton
                  size="sm"
                  onClick={() => setTab("preview")}
                >
                  Preview →
                </ActionButton>
              </>
            )}
            {tab === "preview" && report && (
              <>
                <ActionButton
                  variant="outline"
                  size="sm"
                  onClick={() => setTab("report")}
                >
                  ← Back to Report
                </ActionButton>
                <ActionButton size="sm" onClick={handlePopulate}>
                  <Sparkles size={13} />
                  Populate Learning Path
                </ActionButton>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

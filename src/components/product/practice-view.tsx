"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  Layers,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { DifficultyBadge, ButtonLink } from "@/components/product/ui";
import { cn } from "@/lib/utils";

export type PracticeProblem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  thinkingDirection?: string;
  dryRunPrompt?: string;
  difficulty: string;
  source: string;
  sourceUrl?: string;
  pattern: string;
  patternDetail?: {
    id: string;
    slug: string;
    name: string;
    description?: string;
    whenToUse?: string;
    mentalModel?: string;
    variations?: string[];
    signalKeywords?: string[];
  } | null;
  allPatterns?: { id: string; name: string; slug: string }[];
  confidence?: number;
  status: string; // "not_started" | "started" | "solved" | "abandoned"
  durationSeconds?: number;
  topics?: string[];
  companies?: string[];
  tags?: string[];
  recommendationReason?: string;
  recommendationScore?: number;
  weakTopic?: boolean;
  weakPattern?: boolean;
  revisionIntent?: string;
};

export type PracticeViewProps = {
  problems: PracticeProblem[] | {
    problems: PracticeProblem[];
    recommendations?: (PracticeProblem | any)[] | null;
  };
};

/* ── Source Badge ────────────────────────────────────────── */

export function SourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const s = source.toLowerCase();
  if (s.includes("leetcode")) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
        LeetCode
      </span>
    );
  }
  if (s.includes("geeksforgeeks") || s.includes("gfg")) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
        GFG
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border-subtle,#24313B)] bg-[var(--bg-app,#0B0F14)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted,#71807C)] capitalize">
      {source}
    </span>
  );
}

/* ── Status Indicator ───────────────────────────────────── */

export function StatusIndicator({ status }: { status: string }) {
  const isSolved = status === "solved";
  const isInProgress = status === "started";

  if (isSolved) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
        <Check size={11} strokeWidth={3} /> Solved
      </span>
    );
  }

  if (isInProgress) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
        <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" /> In Progress
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle,#24313B)] bg-[var(--bg-app,#0B0F14)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--text-muted,#71807C)]">
      <span className="size-1.5 rounded-full border border-[var(--border-strong,#33424D)]" /> Not Started
    </span>
  );
}

/* ── Problem List Row ───────────────────────────────────── */

export function ProblemListRow({
  problem,
  onPatternClick,
}: {
  problem: PracticeProblem;
  onPatternClick?: (patternName: string) => void;
}) {
  const router = useRouter();
  const isSolved = problem.status === "solved";
  const isInProgress = problem.status === "started";
  const patternSlug = problem.patternDetail?.slug;

  return (
    <div
      onClick={() => router.push(`/practice/problems/${problem.slug}`)}
      className={cn(
        "group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-xl border p-4 cursor-pointer transition-all duration-150 focus-within:ring-2 focus-within:ring-[var(--focus-ring,#D8FF9D)]",
        isSolved
          ? "border-[var(--border-subtle,#24313B)]/60 bg-[var(--bg-surface,#121922)]/50 opacity-75 hover:opacity-100 hover:border-[var(--border-subtle,#24313B)]"
          : isInProgress
          ? "border-amber-400/35 bg-[var(--bg-surface-raised,#17212B)] hover:border-amber-400/50"
          : "border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface,#121922)] hover:border-[var(--border-strong,#33424D)] hover:bg-[var(--bg-surface-raised,#17212B)]"
      )}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {/* Status indicator node */}
        <div className="mt-0.5 shrink-0">
          {isSolved ? (
            <div className="grid size-6 place-items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Check size={12} strokeWidth={3} />
            </div>
          ) : isInProgress ? (
            <div className="grid size-6 place-items-center rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-400">
              <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
            </div>
          ) : (
            <div className="grid size-6 place-items-center rounded-full border border-[var(--border-subtle,#24313B)] text-[var(--text-muted,#71807C)] text-[10px] font-mono">
              ○
            </div>
          )}
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-[var(--text-primary,#F3F6F4)] transition-colors group-hover:text-[var(--accent-lime,#B7F36B)]">
              {problem.title}
            </h3>
            <DifficultyBadge difficulty={problem.difficulty as any} />
            <SourceBadge source={problem.source} />

            {/* Pattern Badge */}
            {problem.pattern && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (patternSlug) {
                    router.push(`/patterns/${patternSlug}`);
                  } else if (onPatternClick) {
                    onPatternClick(problem.pattern);
                  }
                }}
                className="rounded-md border border-[var(--border-subtle,#24313B)] bg-[var(--bg-app,#0B0F14)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-secondary,#A8B4B0)] hover:text-[var(--accent-lime,#B7F36B)] hover:border-[var(--accent-lime,#B7F36B)]/40 transition-colors"
                title={`Explore ${problem.pattern} pattern`}
              >
                {problem.pattern}
              </button>
            )}

            <StatusIndicator status={problem.status} />

            {(problem.companies ?? []).slice(0, 2).map((comp) => (
              <span
                key={comp}
                className="hidden md:inline-block rounded-md border border-[var(--border-subtle,#24313B)] bg-[var(--bg-app,#0B0F14)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted,#71807C)]"
              >
                {comp}
              </span>
            ))}
          </div>

          {problem.summary && (
            <p className="text-xs text-[var(--text-secondary,#A8B4B0)] line-clamp-1 leading-relaxed">
              {problem.summary}
            </p>
          )}
        </div>
      </div>

      {/* Action button */}
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
        {isInProgress ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/10 border border-amber-400/30 px-3.5 py-1.5 text-xs font-bold text-amber-300">
            Resume <ArrowRight size={12} />
          </span>
        ) : isSolved ? (
          <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle,#24313B)] bg-[var(--bg-app,#0B0F14)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted,#71807C)] group-hover:text-[var(--text-primary,#F3F6F4)]">
            Review solve
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-lime,#B7F36B)] text-[#0B0F14] px-3.5 py-1.5 text-xs font-bold transition-all group-hover:bg-[var(--accent-lime-dark,#6B9B36)] shadow-xs">
            Solve problem <ArrowRight size={12} />
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Recommended Problem Card with Rationale ───────────────── */

export function RecommendedProblemCard({
  problem,
}: {
  problem: PracticeProblem;
}) {
  const patternSlug = problem.patternDetail?.slug;
  const reasonText =
    problem.recommendationReason ||
    (problem.weakTopic
      ? "Weak area needing immediate repetition"
      : "Active curriculum milestone requirement");

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-[var(--border-strong,#33424D)] bg-[var(--bg-surface-raised,#17212B)] p-5 transition-all duration-150 hover:border-[var(--accent-lime,#B7F36B)]/40 shadow-sm">
      {/* Top Reason Eyebrow */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-lime,#B7F36B)]/30 bg-[var(--accent-lime,#B7F36B)]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-lime,#B7F36B)]">
          <Sparkles size={10} />
          {problem.weakTopic ? "Weak Area Focus" : "Recommended for You"}
        </span>
        <SourceBadge source={problem.source} />
      </div>

      {/* Content */}
      <div className="space-y-2 flex-1 mb-4">
        <div className="flex items-center justify-between gap-2">
          {problem.pattern && (
            <Link
              href={patternSlug ? `/patterns/${patternSlug}` : `/patterns`}
              className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-teal,#58D6C0)] hover:underline"
            >
              {problem.pattern}
            </Link>
          )}
          <DifficultyBadge difficulty={problem.difficulty as any} />
        </div>

        <h3 className="text-base font-bold text-[var(--text-primary,#F3F6F4)] leading-snug">
          {problem.title}
        </h3>

        <p className="text-xs text-[var(--text-secondary,#A8B4B0)] line-clamp-2 leading-relaxed">
          {problem.summary}
        </p>

        {/* Explainable Rationale */}
        <div className="pt-1 text-[11px] text-[var(--accent-amber,#F2B84B)] bg-amber-400/5 border border-amber-400/15 rounded-lg p-2 leading-relaxed">
          <strong>Why:</strong> {reasonText}
        </div>
      </div>

      {/* Action */}
      <div className="pt-3 border-t border-[var(--border-subtle,#24313B)] flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-[var(--text-muted,#71807C)]">
          <Clock size={12} /> ~15-20 min
        </div>
        <Link
          href={`/practice/problems/${problem.slug}`}
          prefetch={false}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-lime,#B7F36B)] px-4 py-2 text-xs font-bold text-[#0B0F14] hover:bg-[var(--accent-lime-dark,#6B9B36)] transition-all shadow-sm"
        >
          Prepare & Solve <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

/* ── Pattern Group Accordion ────────────────────────────── */

export function PatternGroup({
  patternName,
  patternSlug,
  problems,
  defaultExpanded = false,
}: {
  patternName: string;
  patternSlug?: string;
  problems: PracticeProblem[];
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const shouldReduceMotion = useReducedMotion();

  const solvedCount = problems.filter((p) => p.status === "solved").length;
  const inProgressCount = problems.filter((p) => p.status === "started").length;
  const allSolved = problems.length > 0 && solvedCount === problems.length;

  return (
    <div className="rounded-xl border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface,#121922)] overflow-hidden">
      {/* Pattern Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between gap-3 p-4 cursor-pointer hover:bg-[var(--bg-surface-raised,#17212B)] transition-colors select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--bg-app,#0B0F14)] border border-[var(--border-subtle,#24313B)] text-[var(--accent-lime,#B7F36B)]">
            <Layers size={14} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--text-primary,#F3F6F4)] leading-snug">
                {patternName}
              </h3>
              {patternSlug && (
                <Link
                  href={`/patterns/${patternSlug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] font-semibold text-[var(--accent-teal,#58D6C0)] hover:underline"
                >
                  Study pattern →
                </Link>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-muted,#71807C)]">
              {problems.length} problem{problems.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Solved Ratio Badge */}
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums border",
              allSolved
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : inProgressCount > 0
                ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                : "border-[var(--border-subtle,#24313B)] bg-[var(--bg-app,#0B0F14)] text-[var(--text-muted,#71807C)]"
            )}
          >
            {solvedCount} / {problems.length} solved
          </span>

          <span className="text-[var(--text-muted,#71807C)]">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </div>

      {/* Collapsible problem list */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={shouldReduceMotion ? undefined : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[var(--border-subtle,#24313B)] p-3 space-y-2.5"
          >
            {problems.map((problem) => (
              <ProblemListRow key={problem.slug} problem={problem} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main Practice View ─────────────────────────────────── */

export function PracticeView({ problems: practiceData }: PracticeViewProps) {
  const problems = Array.isArray(practiceData) ? practiceData : practiceData.problems;
  const rawRecommendations = Array.isArray(practiceData) ? [] : (practiceData.recommendations ?? []).filter(Boolean);

  // Filter state
  const [search, setSearch] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("All");
  const [filterTopic, setFilterTopic] = useState<string>("All");
  const [filterPattern, setFilterPattern] = useState<string>("All");
  const [filterCompany, setFilterCompany] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterWeak, setFilterWeak] = useState<boolean>(false);
  const [groupByPattern, setGroupByPattern] = useState<boolean>(false);
  const [showDrawer, setShowDrawer] = useState<boolean>(false);

  // Extract unique filters
  const topics = useMemo(
    () => ["All", ...Array.from(new Set(problems.flatMap((p) => p.topics || []).filter(Boolean)))].sort(),
    [problems]
  );
  const patterns = useMemo(
    () => ["All", ...Array.from(new Set(problems.map((p) => p.pattern).filter(Boolean)))].sort(),
    [problems]
  );
  const companies = useMemo(
    () => ["All", ...Array.from(new Set(problems.flatMap((p) => p.companies || []).filter(Boolean)))].sort(),
    [problems]
  );
  const difficulties = ["All", "Easy", "Medium", "Hard"];
  const statuses = ["All", "Solved", "In Progress", "Not Started"];

  // Filtered problems computation
  const filteredProblems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return problems.filter((p) => {
      if (q) {
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesSummary = (p.summary || "").toLowerCase().includes(q);
        const matchesPattern = (p.pattern || "").toLowerCase().includes(q);
        const matchesTopic = (p.topics || []).some((t) => t.toLowerCase().includes(q));
        const matchesCompany = (p.companies || []).some((c) => c.toLowerCase().includes(q));
        if (!matchesTitle && !matchesSummary && !matchesPattern && !matchesTopic && !matchesCompany) {
          return false;
        }
      }
      if (filterDifficulty !== "All" && p.difficulty !== filterDifficulty) return false;
      if (filterTopic !== "All" && !(p.topics || []).includes(filterTopic)) return false;
      if (filterPattern !== "All" && p.pattern !== filterPattern) return false;
      if (filterCompany !== "All" && !(p.companies || []).includes(filterCompany)) return false;
      if (filterStatus === "Solved" && p.status !== "solved") return false;
      if (filterStatus === "In Progress" && p.status !== "started") return false;
      if (filterStatus === "Not Started" && p.status !== "not_started") return false;
      if (filterWeak && (p.confidence !== undefined && p.confidence >= 60 || p.status === "not_started" || p.status === "solved") && !p.weakTopic) {
        return false;
      }
      return true;
    });
  }, [problems, search, filterDifficulty, filterTopic, filterPattern, filterCompany, filterStatus, filterWeak]);

  // Pattern Groups
  const patternGroups = useMemo(() => {
    const map = new Map<string, PracticeProblem[]>();
    for (const p of filteredProblems) {
      const pat = p.pattern || "General";
      if (!map.has(pat)) map.set(pat, []);
      map.get(pat)!.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredProblems]);

  // Metrics
  const solvedCount = problems.filter((p) => p.status === "solved").length;
  const inProgressProblem = problems.find((p) => p.status === "started");
  const allSolved = problems.length > 0 && solvedCount === problems.length;

  const isFiltering =
    search.trim() !== "" ||
    filterDifficulty !== "All" ||
    filterTopic !== "All" ||
    filterPattern !== "All" ||
    filterCompany !== "All" ||
    filterStatus !== "All" ||
    filterWeak;

  const activeFilterCount =
    (filterDifficulty !== "All" ? 1 : 0) +
    (filterTopic !== "All" ? 1 : 0) +
    (filterPattern !== "All" ? 1 : 0) +
    (filterCompany !== "All" ? 1 : 0) +
    (filterStatus !== "All" ? 1 : 0) +
    (filterWeak ? 1 : 0);

  function resetFilters() {
    setSearch("");
    setFilterDifficulty("All");
    setFilterTopic("All");
    setFilterPattern("All");
    setFilterCompany("All");
    setFilterStatus("All");
    setFilterWeak(false);
  }

  const recommendations = useMemo(() => {
    return rawRecommendations.slice(0, 3);
  }, [rawRecommendations]);

  return (
    <div className="space-y-8 pb-16">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--border-subtle,#24313B)] pb-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--accent-lime,#B7F36B)] font-semibold mb-1">
            Problem Library
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary,#F3F6F4)]">
            Practice
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary,#A8B4B0)] max-w-xl leading-relaxed">
            Guided problem-solving mapped to algorithmic patterns. Discover the right problem with transparent recommendation rationale.
          </p>
        </div>

        {/* Progress Tracker / Resume Problem Action */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {inProgressProblem ? (
            <Link
              href={`/practice/problems/${inProgressProblem.slug}`}
              prefetch={false}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/35 bg-amber-400/10 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-400/20 transition-all"
            >
              <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
              Resume: {inProgressProblem.title} →
            </Link>
          ) : null}

          <div className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface-raised,#17212B)] px-3.5 py-2 text-xs">
            <span className="text-[var(--text-muted,#71807C)]">Solved:</span>
            <strong className="text-emerald-400 font-mono tabular-nums">
              {solvedCount} / {problems.length}
            </strong>
            <span className="text-[var(--border-subtle,#24313B)]">|</span>
            <span className="text-[var(--accent-lime,#B7F36B)] font-bold font-mono tabular-nums">
              {Math.round((solvedCount / (problems.length || 1)) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Recommended Section (3 items with reasoning) ── */}
      {recommendations.length > 0 && !isFiltering && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-[var(--accent-lime,#B7F36B)]" />
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--accent-lime,#B7F36B)]">
                Recommended For You
              </h2>
            </div>
            <span className="text-xs text-[var(--text-muted,#71807C)]">
              Personalized based on active path, pattern drills, and retention needs
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((prob) => (
              <RecommendedProblemCard key={prob.slug} problem={prob} />
            ))}
          </div>
        </section>
      )}

      {/* ── Problem Discovery & Filtering ── */}
      <div className="space-y-4">
        {/* Streamlined Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface,#121922)] p-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted,#71807C)] pointer-events-none" />
            <input
              type="search"
              placeholder="Search problems by title, topic, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--border-subtle,#24313B)] bg-[var(--bg-app,#0B0F14)] pl-8 pr-3 text-xs text-[var(--text-primary,#F3F6F4)] placeholder:text-[var(--text-muted,#71807C)] outline-none focus:border-[var(--accent-lime,#B7F36B)]/50 transition-colors"
            />
          </div>

          <div className="hidden sm:block w-px h-5 bg-[var(--border-subtle,#24313B)]" />

          {/* Quick Difficulty Pills */}
          <div className="flex items-center gap-1">
            {difficulties.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setFilterDifficulty(d)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all",
                  filterDifficulty === d
                    ? "bg-[var(--accent-lime,#B7F36B)] text-[#0B0F14]"
                    : "text-[var(--text-secondary,#A8B4B0)] hover:text-[var(--text-primary,#F3F6F4)]"
                )}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="hidden md:block w-px h-5 bg-[var(--border-subtle,#24313B)]" />

          {/* Weak Topics Toggle */}
          <button
            type="button"
            onClick={() => setFilterWeak(!filterWeak)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all border",
              filterWeak
                ? "border-amber-400/40 bg-amber-400/15 text-amber-300"
                : "border-[var(--border-subtle,#24313B)] bg-[var(--bg-app,#0B0F14)] text-[var(--text-muted,#71807C)] hover:text-[var(--text-primary,#F3F6F4)]"
            )}
          >
            <Flame size={12} className={filterWeak ? "text-amber-400" : "opacity-40"} />
            Weak Topics
          </button>

          {/* Group / Flat Toggle */}
          <button
            type="button"
            onClick={() => setGroupByPattern(!groupByPattern)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all border",
              groupByPattern
                ? "border-[var(--accent-lime,#B7F36B)]/40 bg-[var(--accent-lime,#B7F36B)]/15 text-[var(--accent-lime,#B7F36B)] shadow-xs"
                : "border-[var(--border-subtle,#24313B)] bg-[var(--bg-app,#0B0F14)] text-[var(--text-muted,#71807C)] hover:text-[var(--text-primary,#F3F6F4)]"
            )}
            title={groupByPattern ? "Switch to standard flat list" : "Group problems by algorithmic pattern"}
          >
            <Layers size={12} className={groupByPattern ? "text-[var(--accent-lime,#B7F36B)]" : ""} />
            <span>{groupByPattern ? "Grouped by Pattern" : "Group by Pattern"}</span>
          </button>

          {/* Advanced Filter Drawer Trigger */}
          <button
            type="button"
            onClick={() => setShowDrawer(!showDrawer)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-semibold border transition-all ml-auto",
              activeFilterCount > 0 || showDrawer
                ? "border-[var(--accent-lime,#B7F36B)]/40 bg-[var(--accent-lime,#B7F36B)]/10 text-[var(--accent-lime,#B7F36B)]"
                : "border-[var(--border-subtle,#24313B)] bg-[var(--bg-app,#0B0F14)] text-[var(--text-secondary,#A8B4B0)] hover:text-[var(--text-primary,#F3F6F4)]"
            )}
          >
            <SlidersHorizontal size={12} />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
        </div>

        {/* Expandable Advanced Filter Panel */}
        <AnimatePresence>
          {showDrawer && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="rounded-xl border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface,#121922)] p-4 space-y-4"
            >
              <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary,#F3F6F4)] border-b border-[var(--border-subtle,#24313B)] pb-2">
                <span>Filter By Topic, Pattern & Target Company</span>
                {isFiltering && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-[11px] text-[var(--accent-lime,#B7F36B)] hover:underline"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Topic Filter */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted,#71807C)]">
                    Topic
                  </label>
                  <select
                    className="h-8 w-full rounded-lg border border-[var(--border-subtle,#24313B)] bg-[var(--bg-app,#0B0F14)] px-2.5 text-xs text-[var(--text-primary,#F3F6F4)] outline-none focus:border-[var(--accent-lime,#B7F36B)]"
                    value={filterTopic}
                    onChange={(e) => setFilterTopic(e.target.value)}
                  >
                    {topics.map((t) => (
                      <option key={t} value={t}>
                        {t === "All" ? "All Topics" : t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pattern Filter */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted,#71807C)]">
                    Pattern
                  </label>
                  <select
                    className="h-8 w-full rounded-lg border border-[var(--border-subtle,#24313B)] bg-[var(--bg-app,#0B0F14)] px-2.5 text-xs text-[var(--text-primary,#F3F6F4)] outline-none focus:border-[var(--accent-lime,#B7F36B)]"
                    value={filterPattern}
                    onChange={(e) => setFilterPattern(e.target.value)}
                  >
                    {patterns.map((p) => (
                      <option key={p} value={p}>
                        {p === "All" ? "All Patterns" : p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Company Filter */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted,#71807C)]">
                    Company
                  </label>
                  <select
                    className="h-8 w-full rounded-lg border border-[var(--border-subtle,#24313B)] bg-[var(--bg-app,#0B0F14)] px-2.5 text-xs text-[var(--text-primary,#F3F6F4)] outline-none focus:border-[var(--accent-lime,#B7F36B)]"
                    value={filterCompany}
                    onChange={(e) => setFilterCompany(e.target.value)}
                  >
                    {companies.map((c) => (
                      <option key={c} value={c}>
                        {c === "All" ? "All Companies" : c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted,#71807C)]">
                    Status
                  </label>
                  <select
                    className="h-8 w-full rounded-lg border border-[var(--border-subtle,#24313B)] bg-[var(--bg-app,#0B0F14)] px-2.5 text-xs text-[var(--text-primary,#F3F6F4)] outline-none focus:border-[var(--accent-lime,#B7F36B)]"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s === "All" ? "All Statuses" : s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Filters Pill Row */}
        {isFiltering && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[var(--text-muted,#71807C)] text-[11px]">Filtered by:</span>
            {search && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface-raised,#17212B)] px-2 py-0.5 text-[var(--text-primary,#F3F6F4)]">
                &ldquo;{search}&rdquo;
                <button type="button" onClick={() => setSearch("")} className="hover:text-white">
                  <X size={10} />
                </button>
              </span>
            )}
            {filterDifficulty !== "All" && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface-raised,#17212B)] px-2 py-0.5 text-[var(--text-primary,#F3F6F4)]">
                Difficulty: {filterDifficulty}
                <button type="button" onClick={() => setFilterDifficulty("All")} className="hover:text-white">
                  <X size={10} />
                </button>
              </span>
            )}
            {filterTopic !== "All" && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface-raised,#17212B)] px-2 py-0.5 text-[var(--text-primary,#F3F6F4)]">
                Topic: {filterTopic}
                <button type="button" onClick={() => setFilterTopic("All")} className="hover:text-white">
                  <X size={10} />
                </button>
              </span>
            )}
            {filterPattern !== "All" && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface-raised,#17212B)] px-2 py-0.5 text-[var(--text-primary,#F3F6F4)]">
                Pattern: {filterPattern}
                <button type="button" onClick={() => setFilterPattern("All")} className="hover:text-white">
                  <X size={10} />
                </button>
              </span>
            )}
            {filterCompany !== "All" && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface-raised,#17212B)] px-2 py-0.5 text-[var(--text-primary,#F3F6F4)]">
                Company: {filterCompany}
                <button type="button" onClick={() => setFilterCompany("All")} className="hover:text-white">
                  <X size={10} />
                </button>
              </span>
            )}
            {filterStatus !== "All" && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface-raised,#17212B)] px-2 py-0.5 text-[var(--text-primary,#F3F6F4)]">
                Status: {filterStatus}
                <button type="button" onClick={() => setFilterStatus("All")} className="hover:text-white">
                  <X size={10} />
                </button>
              </span>
            )}
            {filterWeak && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-amber-300">
                Weak Topics Only
                <button type="button" onClick={() => setFilterWeak(false)} className="hover:text-white">
                  <X size={10} />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={resetFilters}
              className="text-[11px] font-semibold text-[var(--accent-lime,#B7F36B)] hover:underline ml-1"
            >
              Clear all
            </button>
          </div>
        )}

        {/* ── Problem Results ── */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted,#71807C)]">
            <span>
              Showing <strong className="text-[var(--text-primary,#F3F6F4)] font-mono">{filteredProblems.length}</strong> problem{filteredProblems.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filteredProblems.length > 0 ? (
            groupByPattern && !filterPattern.includes("All") ? (
              /* Flat list if filtered to single pattern */
              <div className="space-y-2.5">
                {filteredProblems.map((prob) => (
                  <ProblemListRow key={prob.slug} problem={prob} onPatternClick={setFilterPattern} />
                ))}
              </div>
            ) : groupByPattern ? (
              /* Grouped by Pattern */
              <div className="space-y-4">
                {patternGroups.map(([patName, groupProbs]) => {
                  const patternSlug = groupProbs[0]?.patternDetail?.slug;
                  return (
                    <PatternGroup
                      key={patName}
                      patternName={patName}
                      patternSlug={patternSlug}
                      problems={groupProbs}
                    />
                  );
                })}
              </div>
            ) : (
              /* Flat List */
              <div className="space-y-2.5">
                {filteredProblems.map((prob) => (
                  <ProblemListRow key={prob.slug} problem={prob} onPatternClick={setFilterPattern} />
                ))}
              </div>
            )
          ) : (
            /* Contextual Empty state */
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-subtle,#24313B)] p-12 text-center bg-[var(--bg-surface,#121922)]">
              <Search size={24} className="text-[var(--text-muted,#71807C)] mb-3 opacity-40" />
              <h3 className="text-sm font-bold text-[var(--text-primary,#F3F6F4)]">No problems match these filters</h3>
              <p className="text-xs text-[var(--text-secondary,#A8B4B0)] max-w-sm mt-1">
                Try expanding your search, clearing active difficulty or topic filters, or resetting all filters.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-lime,#B7F36B)] px-4 py-2 text-xs font-bold text-[#0B0F14] hover:bg-[var(--accent-lime-dark,#6B9B36)] transition-all shadow-sm"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── All Problems Mastered Celebration State ── */}
      {allSolved && (
        <div className="rounded-2xl border border-emerald-500/30 bg-[var(--bg-surface-raised,#17212B)] p-8 text-center space-y-3">
          <div className="grid size-14 place-items-center rounded-2xl border border-emerald-400/40 bg-emerald-500/20 mx-auto text-emerald-300 shadow-sm">
            <Trophy size={28} />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary,#F3F6F4)]">All Practice Problems Solved! 🎉</h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary,#A8B4B0)] max-w-md mx-auto leading-relaxed">
            You&apos;ve completed all {problems.length} problems in the library. Strengthen your skills by tackling company interview sets or reviewing spaced repetition flashcards.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <ButtonLink href="/interview" variant="primary">
              Explore Interview Prep →
            </ButtonLink>
            <ButtonLink href="/learn" variant="secondary">
              Review Learning Paths
            </ButtonLink>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Layers3,
  ArrowRight,
  Play,
  CheckCircle2,
  Clock,
  BookOpen,
  Search,
  ChevronRight,
  Check,
  ArrowLeft,
  Sparkles,
  Compass,
  ExternalLink,
  GitBranch,
  Target,
  Circle,
  Flame,
  Star,
  Trophy,
  Map,
  LayoutList,
  Lock,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  PageHeader,
  Surface,
  ProgressTrack,
  DifficultyBadge,
  ButtonLink,
} from "@/components/product/ui";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────────

export type StageProblem = {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  sourceUrl?: string;
  isSolved: boolean;
};

export type StageMission = {
  id: string;
  slug: string;
  title: string;
  progress: number;
  status: string;
  isCompleted: boolean;
};

export type LearningPathStage = {
  order: number;
  title: string;
  description: string;
  minutes: number;
  progress: number;
  status: "not_started" | "in_progress" | "completed";
  topics: { id: string; name: string; slug: string }[];
  patterns: { id: string; name: string; slug: string }[];
  problems: StageProblem[];
  missions: StageMission[];
};

export type LearningPathItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage?: string;
  difficulty: string;
  minutes: number;
  audience?: string;
  tags: string[];
  isFeatured?: boolean;
  progress: number;
  status: "not_started" | "in_progress" | "completed";
  totalProblems: number;
  solvedProblems: number;
  totalMissions: number;
  completedMissions: number;
  currentStageIndex: number;
  currentStageTitle: string;
  nextItemUrl: string;
  nextItemTitle: string;
  stages: LearningPathStage[];
};

// ── Helper: Stage Title Normalization ───────────────────────────────────────

export function normalizeStageTitle(title: string): string {
  if (!title) return "";
  return title.replace(/^Stage\s+\d+\s*:\s*/i, "").trim();
}

// ── Reusable Component: TagChip ─────────────────────────────────────────────

export function TagChip({ tag, className }: { tag: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-purple-200/70 transition-colors hover:border-purple-400/30 hover:text-purple-100",
        className
      )}
    >
      #{tag}
    </span>
  );
}

// ── Reusable Component: StageTracker ─────────────────────────────────────────

export function StageTracker({
  stages,
  activeStageIndex,
  isPathCompleted,
  className,
}: {
  stages: LearningPathStage[];
  activeStageIndex: number;
  isPathCompleted: boolean;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (!stages || stages.length === 0) return null;

  return (
    <div className={cn("w-full py-1", className)}>
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {stages.map((stage, idx) => {
          const isCompleted = isPathCompleted || idx < activeStageIndex || stage.status === "completed";
          const isCurrent = !isPathCompleted && idx === activeStageIndex;
          const cleanTitle = normalizeStageTitle(stage.title);

          return (
            <div key={idx} className="flex-1 flex items-center">
              {/* Node container */}
              <div className="relative group/step flex flex-col items-center flex-1">
                {/* Visual Step Indicator */}
                <div
                  className={cn(
                    "relative flex size-7 sm:size-8 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-200",
                    isCompleted
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                      : isCurrent
                      ? "bg-[var(--accent-lime,#B7F36B)] text-[#0B0F14] border-2 border-[var(--accent-lime,#B7F36B)] ring-2 ring-[var(--accent-lime,#B7F36B)]/30 shadow-[0_0_12px_rgba(183,243,107,0.35)]"
                      : "bg-[var(--bg-surface-raised,#17212B)] text-[var(--text-muted,#71807C)] border border-[var(--border-subtle,#24313B)]"
                  )}
                >
                  {isCompleted ? (
                    <Check size={13} className="stroke-[2.5]" />
                  ) : isCurrent ? (
                    <>
                      <span>{idx + 1}</span>
                      {/* Active pulsing ring */}
                      <motion.span
                        className="absolute -inset-1 rounded-full border border-[var(--accent-lime,#B7F36B)]/40"
                        animate={shouldReduceMotion ? {} : { scale: [1, 1.25, 1], opacity: [0.7, 0, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </>
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Stage Title / Caption below node */}
                <span
                  className={cn(
                    "mt-1.5 hidden sm:block text-[10px] text-center truncate max-w-[85px] leading-tight transition-colors",
                    isCurrent
                      ? "font-semibold text-[var(--accent-lime,#B7F36B)]"
                      : isCompleted
                      ? "text-emerald-300/70"
                      : "text-[var(--text-muted,#71807C)]"
                  )}
                  title={`Stage ${idx + 1}: ${cleanTitle}`}
                >
                  {cleanTitle}
                </span>

                {/* Tooltip on hover */}
                <div className="pointer-events-none absolute bottom-full mb-2 hidden flex-col items-center whitespace-nowrap rounded-lg border border-[var(--border-strong,#33424D)] bg-[var(--bg-surface-raised,#17212B)] px-2.5 py-1.5 text-[10px] opacity-0 shadow-xl backdrop-blur-md transition-all group-hover/step:opacity-100 sm:flex z-20">
                  <span className="font-semibold text-white">Stage {idx + 1}: {cleanTitle}</span>
                  <span className="text-[9px] text-[var(--text-muted,#71807C)]">
                    {isCompleted ? "Completed" : isCurrent ? "Current Stage" : "Upcoming"}
                  </span>
                </div>
              </div>

              {/* Connecting progress line (between nodes) */}
              {idx < stages.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-1 rounded transition-colors",
                    isCompleted
                      ? "bg-emerald-500/50"
                      : isCurrent
                      ? "bg-gradient-to-r from-purple-500/50 to-white/10"
                      : "bg-white/[0.07]"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Reusable Component: LearningPathCard ──────────────────────────────────────

export function LearningPathCard({
  path,
  isFeaturedActive = false,
}: {
  path: LearningPathItem;
  isFeaturedActive?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const stages = path.stages ?? [];
  const hoursEst = Math.round(path.minutes / 60);

  // Single unified source of truth for active stage
  const activeStageIndex = useMemo(() => {
    if (stages.length === 0) return 0;
    const idx = stages.findIndex((s) => s.progress < 100);
    return idx >= 0 ? idx : stages.length - 1;
  }, [stages]);

  const activeStage = stages[activeStageIndex];
  const cleanActiveStageTitle = activeStage ? normalizeStageTitle(activeStage.title) : "";
  const isCompleted = path.status === "completed" || path.progress >= 100;
  const isInProgress = !isCompleted && path.progress > 0;

  const detailUrl = `/learning-paths/${path.slug}`;
  // Continue stage directs student to active item, with fallback to path detail
  const continueUrl = path.nextItemUrl || detailUrl;

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl border p-5 sm:p-6 transition duration-200 hover:-translate-y-0.5",
        isInProgress
          ? "border-[var(--accent-lime,#B7F36B)]/40 bg-[var(--bg-surface-raised,#17212B)] shadow-sm"
          : isCompleted
          ? "border-emerald-500/25 bg-[var(--bg-surface,#121922)]/70"
          : "border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface,#121922)] hover:border-[var(--border-strong,#33424D)]"
      )}
    >
      {/* Header: Title, Badges, Time */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <DifficultyBadge difficulty={path.difficulty} />
            {isInProgress ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--accent-lime,#B7F36B)]/30 bg-[var(--accent-lime,#B7F36B)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-lime,#B7F36B)]">
                <span className="size-1.5 rounded-full bg-[var(--accent-lime,#B7F36B)] animate-pulse" />
                In Progress
              </span>
            ) : isCompleted ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                <CheckCircle2 size={11} className="text-emerald-400" />
                Completed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle,#24313B)] bg-[var(--bg-app,#0B0F14)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted,#71807C)]">
                Not Started
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted,#71807C)]">
            <Clock size={12} className="text-[var(--accent-amber,#F2B84B)]" />
            <span>{hoursEst > 0 ? `~${hoursEst} hrs` : `${path.minutes} mins`}</span>
          </div>
        </div>

        <div>
          <h3 className="text-base sm:text-lg font-bold leading-snug text-[var(--text-primary,#F3F6F4)] group-hover:text-[var(--accent-lime,#B7F36B)] transition-colors">
            <Link href={detailUrl} className="hover:underline underline-offset-4">
              {path.title}
            </Link>
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary,#A8B4B0)] line-clamp-2">
            {path.description || "Structured progression path designed for systematic mastery."}
          </p>
        </div>
      </div>

      {/* Stage Progression & Horizontal Stage Tracker */}
      <div className="mt-4 pt-4 border-t border-[var(--border-subtle,#24313B)] space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="text-[var(--text-primary,#F3F6F4)] font-semibold">
              {isCompleted
                ? `All ${stages.length} Stages Completed`
                : `Stage ${activeStageIndex + 1} of ${stages.length}`}
            </span>
            {!isCompleted && cleanActiveStageTitle && (
              <>
                <span className="text-[var(--text-muted,#71807C)]">•</span>
                <span className="text-[var(--text-secondary,#A8B4B0)] truncate max-w-[170px] sm:max-w-[240px]">
                  {cleanActiveStageTitle}
                </span>
              </>
            )}
          </div>
          <span className="font-bold tabular-nums text-[var(--accent-lime,#B7F36B)] text-xs font-mono">
            {path.progress}%
          </span>
        </div>

        <ProgressTrack
          value={path.progress}
          color={isCompleted ? "emerald" : "purple"}
          height="thin"
        />

        {/* Horizontal 5-Stage Tracker */}
        {stages.length > 0 && (
          <div className="pt-2">
            <StageTracker
              stages={stages}
              activeStageIndex={activeStageIndex}
              isPathCompleted={isCompleted}
            />
          </div>
        )}
      </div>

      {/* Tags / Topics */}
      {path.tags && path.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {path.tags.slice(0, 4).map((tag) => (
            <TagChip key={tag} tag={tag} />
          ))}
        </div>
      )}

      {/* CTAs */}
      <div className="mt-5 pt-4 border-t border-[var(--border-subtle,#24313B)] flex flex-wrap items-center justify-between gap-3">
        {isInProgress ? (
          <div className="flex-1 sm:flex-none">
            <Link
              href={continueUrl}
              className="focus-ring inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[var(--accent-lime,#B7F36B)] px-4 py-2.5 text-xs font-bold text-[#0B0F14] hover:bg-[var(--accent-lime-dark,#6B9B36)] transition shadow-sm"
            >
              <Play size={13} className="fill-current" />
              <span>
                Continue: Stage {activeStageIndex + 1}
                {cleanActiveStageTitle ? ` — ${cleanActiveStageTitle.slice(0, 24)}${cleanActiveStageTitle.length > 24 ? "…" : ""}` : ""}
              </span>
            </Link>
          </div>
        ) : isCompleted ? (
          <Link
            href={detailUrl}
            className="focus-ring inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
          >
            <CheckCircle2 size={13} className="text-emerald-400" />
            <span>Review Curriculum</span>
          </Link>
        ) : (
          <Link
            href={detailUrl}
            className="focus-ring inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[var(--accent-lime,#B7F36B)] px-4 py-2.5 text-xs font-bold text-[#0B0F14] hover:bg-[var(--accent-lime-dark,#6B9B36)] transition shadow-sm"
          >
            <span>Start Learning</span>
            <ArrowRight size={13} />
          </Link>
        )}

        <Link
          href={detailUrl}
          className="text-xs font-medium text-[var(--text-secondary,#A8B4B0)] hover:text-white transition-colors ml-auto flex items-center gap-1"
        >
          <span>Curriculum Details</span>
          <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  );
}

// ── Reusable Component: EmptyState ──────────────────────────────────────────

export function EmptyState({
  title = "Start your first path",
  description = "Explore structured step-by-step learning tracks carefully curated from foundational patterns to interview mastery.",
  onAction,
  actionLabel = "Start your first path",
}: {
  title?: string;
  description?: string;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <Surface className="py-14 text-center space-y-4 max-w-lg mx-auto">
      <div className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-purple-500/15 border border-purple-500/20 text-purple-300">
        <Layers3 size={28} />
        <span className="absolute -top-1 -right-1 size-3 rounded-full bg-cyan-400/80 animate-ping" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-purple-100/60 max-w-sm mx-auto">
          {description}
        </p>
      </div>
      {onAction && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onAction}
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:opacity-95"
          >
            <Compass size={14} />
            {actionLabel}
          </button>
        </div>
      )}
    </Surface>
  );
}

// ── Reusable Component: FilterTabs ──────────────────────────────────────────

export function FilterTabs({
  tab,
  setTab,
  search,
  setSearch,
  difficultyFilter,
  setDifficultyFilter,
  totalCount,
  inProgressCount,
  completedCount,
}: {
  tab: "all" | "in_progress" | "completed";
  setTab: (t: "all" | "in_progress" | "completed") => void;
  search: string;
  setSearch: (s: string) => void;
  difficultyFilter: string;
  setDifficultyFilter: (d: string) => void;
  totalCount: number;
  inProgressCount: number;
  completedCount: number;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
      <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.02] p-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => setTab("all")}
          className={cn(
            "rounded-lg py-1.5 px-3 transition-colors",
            tab === "all"
              ? "bg-purple-500/20 text-purple-100 font-semibold shadow-sm"
              : "text-purple-100/50 hover:text-white"
          )}
        >
          All Tracks <span className="text-[10px] opacity-70">({totalCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("in_progress")}
          className={cn(
            "rounded-lg py-1.5 px-3 transition-colors",
            tab === "in_progress"
              ? "bg-purple-500/20 text-purple-100 font-semibold shadow-sm"
              : "text-purple-100/50 hover:text-white"
          )}
        >
          In Progress <span className="text-[10px] opacity-70">({inProgressCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("completed")}
          className={cn(
            "rounded-lg py-1.5 px-3 transition-colors",
            tab === "completed"
              ? "bg-purple-500/20 text-purple-100 font-semibold shadow-sm"
              : "text-purple-100/50 hover:text-white"
          )}
        >
          Completed <span className="text-[10px] opacity-70">({completedCount})</span>
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="relative flex-1 sm:w-60">
          <Search size={14} className="absolute left-3 top-2.5 text-purple-100/40" />
          <input
            type="text"
            placeholder="Filter by title or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-purple-100/35 focus:outline-none focus:border-purple-400/50"
          />
        </div>

        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400/50"
        >
          <option value="all" className="bg-[#0b0514]">All Difficulties</option>
          <option value="beginner" className="bg-[#0b0514]">Beginner</option>
          <option value="easy" className="bg-[#0b0514]">Easy</option>
          <option value="medium" className="bg-[#0b0514]">Medium</option>
          <option value="hard" className="bg-[#0b0514]">Hard</option>
          <option value="advanced" className="bg-[#0b0514]">Advanced</option>
        </select>
      </div>
    </div>
  );
}

// ── Component 1: Learning Paths List View (Screen 4) ────────────────────────

export function LearningPathsListView({ paths }: { paths: LearningPathItem[] }) {
  const [tab, setTab] = useState<"all" | "in_progress" | "completed">("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [search, setSearch] = useState("");

  const inProgressPaths = useMemo(
    () => paths.filter((p) => p.progress > 0 && p.progress < 100),
    [paths]
  );
  const completedPaths = useMemo(
    () => paths.filter((p) => p.progress >= 100),
    [paths]
  );
  const notStartedPaths = useMemo(
    () => paths.filter((p) => p.progress === 0),
    [paths]
  );

  const inProgressCount = inProgressPaths.length;
  const completedCount = completedPaths.length;
  const showFilters = paths.length > 6;

  // Filtered list when search/filter bar is active
  const filteredPaths = useMemo(() => {
    if (!showFilters) return paths;

    return paths.filter((path) => {
      if (tab === "in_progress" && (path.progress === 0 || path.progress >= 100)) return false;
      if (tab === "completed" && path.progress < 100) return false;
      if (difficultyFilter !== "all" && path.difficulty.toLowerCase() !== difficultyFilter.toLowerCase()) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = path.title.toLowerCase().includes(q);
        const matchDesc = path.description.toLowerCase().includes(q);
        const matchTags = path.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchTags) return false;
      }
      return true;
    });
  }, [paths, tab, difficultyFilter, search, showFilters]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Breadcrumb (Navigation to /learn) ── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-purple-200/50">
        <Link href="/learn" className="hover:text-white transition-colors flex items-center gap-1.5">
          <ArrowLeft size={13} />
          <span>Back to Learn</span>
        </Link>
      </nav>

      {/* ── Page Header ── */}
      <PageHeader
        eyebrow="Structured Curricula"
        title="Learning Paths"
        description="Step-by-step learning tracks carefully curated to take you from foundational intuition to company interview mastery."
      />

      {/* ── Contextual Status Message (Replacing old 4-stat bar) ── */}
      <div className="flex items-center gap-2.5 rounded-xl border border-purple-400/20 bg-purple-500/[0.05] px-4 py-3 text-xs text-purple-200 shadow-sm backdrop-blur-sm">
        <span className="relative flex size-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex rounded-full size-2 bg-cyan-400" />
        </span>
        <span className="font-medium">
          {inProgressCount === 1 ? (
            <>You have <strong className="text-white font-semibold">1 path in progress</strong>.</>
          ) : inProgressCount > 1 ? (
            <>You have <strong className="text-white font-semibold">{inProgressCount} paths in progress</strong>.</>
          ) : completedCount === paths.length && paths.length > 0 ? (
            <>All <strong className="text-white font-semibold">{completedCount} learning paths completed</strong>! Continue practicing to maintain mastery.</>
          ) : (
            <>You haven&apos;t started any paths yet. Select a structured track below to begin.</>
          )}
        </span>
      </div>

      {/* ── Filters (Only prominent when catalog > 6 paths) ── */}
      {showFilters && (
        <FilterTabs
          tab={tab}
          setTab={setTab}
          search={search}
          setSearch={setSearch}
          difficultyFilter={difficultyFilter}
          setDifficultyFilter={setDifficultyFilter}
          totalCount={paths.length}
          inProgressCount={inProgressCount}
          completedCount={completedCount}
        />
      )}

      {/* ── Paths Display Hierarchy ── */}
      {paths.length === 0 ? (
        <EmptyState />
      ) : showFilters ? (
        /* Flat filtered grid when catalog is large */
        filteredPaths.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {filteredPaths.map((path) => (
              <LearningPathCard key={path.id} path={path} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No matching paths found"
            description="Try clearing your search query or switching filters to view available curricula."
            onAction={() => {
              setTab("all");
              setSearch("");
              setDifficultyFilter("all");
            }}
            actionLabel="Clear Filters"
          />
        )
      ) : (
        /* Structured Hierarchy (Small catalog <= 6 paths) */
        <div className="space-y-8">
          {/* Primary: Active / In-Progress Paths */}
          {inProgressPaths.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-purple-400 animate-pulse" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-purple-200/90">
                  Current Learning Focus
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-5">
                {inProgressPaths.map((path) => (
                  <LearningPathCard key={path.id} path={path} isFeaturedActive={true} />
                ))}
              </div>
            </section>
          )}

          {/* Secondary: Available Paths to Start */}
          {notStartedPaths.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-purple-200/60">
                {inProgressPaths.length > 0 ? "Available Tracks" : "Explore Structured Tracks"}
              </h2>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {notStartedPaths.map((path) => (
                  <LearningPathCard key={path.id} path={path} />
                ))}
              </div>
            </section>
          )}

          {/* Supporting: Completed Paths */}
          {completedPaths.length > 0 && (
            <section className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-300/80">
                  Completed Curricula
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {completedPaths.map((path) => (
                  <LearningPathCard key={path.id} path={path} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helper: Format Stage Description (Max 2 sentences) ──────────────────────

function formatStageDescription(desc: string): string {
  if (!desc) return "";
  const trimmed = desc.trim();
  const sentences = trimmed.match(/[^.!?]+[.!?]+(?:\s|$)/g);
  if (sentences && sentences.length >= 2) {
    return (sentences[0] + sentences[1]).trim();
  }
  return trimmed;
}

// ── Stage Status Icon ──────────────────────────────────────────────────────

function StageStatusIcon({
  status,
  isCurrent,
  isLocked,
  stageNumber,
}: {
  status: "completed" | "in_progress" | "not_started";
  isCurrent: boolean;
  isLocked: boolean;
  stageNumber: number;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (status === "completed") {
    return (
      <motion.div
        initial={shouldReduceMotion ? false : { scale: 0.75, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/20 border-2 border-emerald-400/70 shrink-0 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]"
      >
        <Check size={14} className="stroke-[2.5]" />
      </motion.div>
    );
  }

  if (isCurrent) {
    return (
      <div className="relative w-8 h-8 rounded-full flex items-center justify-center bg-blue-500/25 border-2 border-blue-400 shrink-0 shadow-[0_0_14px_rgba(59,130,246,0.45)]">
        <span className="text-[11px] font-bold text-blue-100">{stageNumber}</span>
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-[#090312] animate-pulse" />
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.03] border-2 border-white/[0.08] shrink-0 text-white/30">
        <Lock size={12} />
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.04] border-2 border-white/[0.10] shrink-0 text-white/40">
      <span className="text-[11px] font-bold">{stageNumber}</span>
    </div>
  );
}

// ── Sticky Sidebar Roadmap (~280px Desktop) ────────────────────────────────

function StageSidebar({
  stages,
  currentStageIndex,
  selectedStageIdx,
  onSelectStage,
}: {
  stages: LearningPathStage[];
  currentStageIndex: number;
  selectedStageIdx: number;
  onSelectStage: (index: number) => void;
}) {
  return (
    <nav className="space-y-2" aria-label="Stage roadmap">
      {stages.map((stage, idx) => {
        const isCompleted = stage.status === "completed" || stage.progress >= 100;
        const isCurrent = idx === currentStageIndex && !isCompleted;
        const isLocked = !isCompleted && !isCurrent && idx > currentStageIndex;
        const isSelected = idx === selectedStageIdx;

        const solvedCount = stage.problems.filter((p) => p.isSolved).length;
        const completedMissionsCount = stage.missions.filter((m) => m.isCompleted).length;

        return (
          <button
            key={stage.order}
            type="button"
            onClick={() => onSelectStage(idx)}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-150 border",
              isSelected
                ? isCurrent
                  ? "bg-blue-500/15 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                  : isCompleted
                  ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                  : "bg-white/[0.07] border-white/20"
                : isCurrent
                ? "bg-blue-500/5 border-blue-500/25 hover:bg-blue-500/10"
                : isLocked
                ? "hover:bg-white/[0.02] border-transparent opacity-70 hover:opacity-90"
                : "hover:bg-white/[0.04] border-transparent"
            )}
          >
            <StageStatusIcon
              status={isCompleted ? "completed" : stage.status}
              isCurrent={isCurrent}
              isLocked={isLocked}
              stageNumber={idx + 1}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-100/40">
                  Stage {idx + 1}
                </span>
                {isCurrent && (
                  <span className="rounded-full bg-blue-500/20 border border-blue-400/40 px-1.5 py-0.2 text-[9px] font-semibold text-blue-300">
                    Current
                  </span>
                )}
                {isCompleted && (
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-300">
                    Done
                  </span>
                )}
              </div>
              <p
                className={cn(
                  "text-xs font-semibold leading-snug break-words mt-0.5",
                  isCompleted
                    ? "text-emerald-300/90"
                    : isCurrent
                    ? "text-blue-100 font-bold"
                    : isLocked
                    ? "text-white/40"
                    : isSelected
                    ? "text-white"
                    : "text-purple-100/70"
                )}
              >
                {stage.title}
              </p>
              <div className="text-[11px] mt-1 tabular-nums flex flex-wrap items-center gap-x-1.5 text-white/40">
                {isCompleted ? (
                  <span className="text-emerald-400 font-medium">✓ {solvedCount}/{stage.problems.length} solved</span>
                ) : isLocked ? (
                  <span className="text-white/30 flex items-center gap-1"><Lock size={10} /> Locked</span>
                ) : (
                  <>
                    <span className={cn(isCurrent ? "text-blue-300 font-medium" : "text-white/50")}>
                      {solvedCount}/{stage.problems.length} problems
                    </span>
                    {stage.missions.length > 0 && (
                      <>
                        <span className="text-white/20">·</span>
                        <span className={cn(isCurrent ? "text-blue-300 font-medium" : "text-white/50")}>
                          {completedMissionsCount}/{stage.missions.length} missions
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            {isSelected && (
              <ChevronRight
                size={14}
                className={cn(
                  "shrink-0 mt-1",
                  isCurrent ? "text-blue-400" : isCompleted ? "text-emerald-400" : "text-white/50"
                )}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

// ── Stage Content Panel ────────────────────────────────────────────────────

function StageContentPanel({
  stage,
  stageNumber,
  isCurrent,
  isCompleted,
  isLocked,
  unlockedAfterNumber,
  unlockedAfterTitle,
  onJumpToCurrentStage,
  pathSlug,
}: {
  stage: LearningPathStage;
  stageNumber: number;
  isCurrent: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  unlockedAfterNumber?: number;
  unlockedAfterTitle?: string;
  onJumpToCurrentStage: () => void;
  pathSlug: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const continuityParams = `?path=${encodeURIComponent(pathSlug)}&stage=${stageNumber}&source=learning-path`;

  // Next incomplete item in this stage
  const nextProblem = stage.problems.find((p) => !p.isSolved);
  const nextMission = stage.missions.find((m) => !m.isCompleted);
  const nextItemHref = nextProblem
    ? `/practice/problems/${nextProblem.slug}${continuityParams}`
    : nextMission
    ? `/missions/${nextMission.slug}${continuityParams}`
    : null;
  const nextItemLabel = nextProblem?.title ?? nextMission?.title ?? "";


  const solvedProblemsCount = stage.problems.filter((p) => p.isSolved).length;
  const completedMissionsCount = stage.missions.filter((m) => m.isCompleted).length;
  const shortDesc = formatStageDescription(stage.description);

  const hasContent =
    stage.topics.length > 0 ||
    stage.patterns.length > 0 ||
    stage.problems.length > 0 ||
    stage.missions.length > 0;

  return (
    <motion.div
      key={stageNumber}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* ── Stage Header ── */}
      <div
        className={cn(
          "rounded-2xl p-6 border transition-colors",
          isCompleted
            ? "border-emerald-500/25 bg-emerald-950/15"
            : isCurrent
            ? "border-blue-500/35 bg-blue-950/20 shadow-[0_0_35px_rgba(59,130,246,0.1)]"
            : isLocked
            ? "border-white/[0.06] bg-white/[0.015]"
            : "border-white/[0.08] bg-white/[0.02]"
        )}
      >
        <div className="space-y-4">
          {/* Header Badges & Title */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-100/50">
                Stage {stageNumber}
              </span>
              {isCurrent && (
                <span className="rounded-full bg-blue-500/20 border border-blue-400/40 px-2.5 py-0.5 text-[10px] font-semibold text-blue-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Current Stage
                </span>
              )}
              {isCompleted && (
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300 flex items-center gap-1">
                  <Check size={10} className="stroke-[2.5]" /> Completed
                </span>
              )}
              {isLocked && (
                <span className="rounded-full bg-white/[0.06] border border-white/[0.1] px-2.5 py-0.5 text-[10px] font-semibold text-white/50 flex items-center gap-1">
                  <Lock size={10} /> Locked
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">{stage.title}</h2>
            {shortDesc && (
              <p className="text-sm text-purple-100/70 leading-relaxed max-w-2xl">{shortDesc}</p>
            )}
          </div>

          {/* Horizontal Mini-Stats Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {stage.problems.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-1.5">
                <Target size={14} className="text-blue-400 shrink-0" />
                <span className="text-xs text-white/50">Problems:</span>
                <span className="text-xs font-bold text-white tabular-nums">
                  {solvedProblemsCount}/{stage.problems.length}
                </span>
              </div>
            )}
            {stage.missions.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-1.5">
                <Flame size={14} className="text-orange-400 shrink-0" />
                <span className="text-xs text-white/50">Missions:</span>
                <span className="text-xs font-bold text-white tabular-nums">
                  {completedMissionsCount}/{stage.missions.length}
                </span>
              </div>
            )}
            {stage.topics.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-1.5">
                <BookOpen size={14} className="text-purple-400 shrink-0" />
                <span className="text-xs text-white/50">Topics:</span>
                <span className="text-xs font-bold text-white tabular-nums">{stage.topics.length}</span>
              </div>
            )}
          </div>

          {/* Stage Progress Bar */}
          {(stage.problems.length > 0 || stage.missions.length > 0) && (
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-100/50">Stage Progress</span>
                <span className={cn("font-bold tabular-nums", isCompleted ? "text-emerald-300" : "text-blue-300")}>
                  {stage.progress}%
                </span>
              </div>
              <ProgressTrack
                value={stage.progress}
                color={isCompleted ? "emerald" : "cyan"}
                height="thin"
              />
            </div>
          )}

          {/* Primary Continue CTA (One clear action) */}
          {isCurrent && !isCompleted && nextItemHref && (
            <div className="pt-3 border-t border-blue-500/20 flex flex-wrap items-center gap-4">
              <ButtonLink
                href={nextItemHref}
                variant="primary"
                size="md"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-[0_4px_20px_rgba(59,130,246,0.35)] transition-all hover:-translate-y-0.5"
              >
                <Play size={14} className="fill-current" />
                Continue Stage →
              </ButtonLink>
              {nextItemLabel && (
                <span className="text-xs text-purple-100/50 truncate max-w-sm">
                  Next: <span className="text-white font-medium">{nextItemLabel}</span>
                </span>
              )}
            </div>
          )}

          {/* Completed Banner */}
          {isCompleted && (
            <div className="pt-3 border-t border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-300">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>Stage complete — all problems solved and missions finished. Content remains fully accessible for practice.</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Stage Locked Notice ── */}
      {isLocked && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-white/40">
            <Lock size={20} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-white">Stage {stageNumber} is Locked</h3>
            <p className="text-xs text-purple-100/60 max-w-md mx-auto leading-relaxed">
              {unlockedAfterNumber && unlockedAfterTitle
                ? `Complete Stage ${unlockedAfterNumber} (${unlockedAfterTitle}) to unlock these topics, problems, and missions.`
                : "Complete the active stage to unlock this content."}
            </p>
          </div>
          <button
            type="button"
            onClick={onJumpToCurrentStage}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white transition-colors shadow-sm"
          >
            Go to Current Stage (Stage {unlockedAfterNumber ?? 1}) →
          </button>
        </div>
      )}

      {/* ── Empty State ── */}
      {!hasContent && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-8 text-center">
          <LayoutList size={28} className="mx-auto text-purple-400/30 mb-3" />
          <p className="text-sm text-purple-100/40">No content has been added to this stage yet.</p>
        </div>
      )}

      {/* ── Topics ── */}
      {stage.topics.length > 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-3.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/15 border border-purple-500/20">
              <BookOpen size={14} className="text-purple-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">Topics</h3>
            <span className="ml-auto text-xs text-purple-100/40">
              {stage.topics.length} {stage.topics.length === 1 ? "topic" : "topics"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {stage.topics.map((topic) => (
              <Link
                key={topic.id}
                href={`/learn/topics/${topic.slug}${continuityParams}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-xs text-purple-200 hover:bg-purple-500/20 hover:border-purple-400/40 transition-all duration-150 group"
              >
                <BookOpen size={11} className="text-purple-400" />
                {topic.name}
                <ExternalLink size={10} className="text-purple-400/50 group-hover:text-purple-300 ml-0.5 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Patterns ── */}
      {stage.patterns.length > 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-3.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/20">
              <GitBranch size={14} className="text-fuchsia-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">Patterns</h3>
            <span className="ml-auto text-xs text-purple-100/40">
              {stage.patterns.length} {stage.patterns.length === 1 ? "pattern" : "patterns"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {stage.patterns.map((pattern) => (
              <Link
                key={pattern.id}
                href={`/patterns/${pattern.slug}${continuityParams}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-1.5 text-xs text-fuchsia-200 hover:bg-fuchsia-500/20 hover:border-fuchsia-400/40 transition-all duration-150 group"
              >
                <GitBranch size={11} className="text-fuchsia-400" />
                {pattern.name}
                <ExternalLink size={10} className="text-fuchsia-400/50 group-hover:text-fuchsia-300 ml-0.5 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Problems ── */}
      {stage.problems.length > 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-3.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/20">
              <Target size={14} className="text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">Problems</h3>
            <span className="ml-auto text-xs text-purple-100/40">
              {solvedProblemsCount}/{stage.problems.length} solved
            </span>
          </div>
          <div className="space-y-2">
            {stage.problems.map((problem) => (
              <div
                key={problem.id}
                className={cn(
                  "group flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border transition-all duration-150",
                  problem.isSolved
                    ? "border-emerald-500/20 bg-emerald-950/10 hover:bg-emerald-950/20"
                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-blue-500/30"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {problem.isSolved ? (
                    <CheckCircle2 size={17} className="text-emerald-400 shrink-0" />
                  ) : (
                    <Circle size={17} className="text-white/20 group-hover:text-blue-400/60 transition-colors shrink-0" />
                  )}
                  <div className="min-w-0">
                    <Link
                      href={isLocked ? "#" : `/practice/problems/${problem.slug}${continuityParams}`}
                      onClick={isLocked ? (e) => e.preventDefault() : undefined}
                      className={cn(
                        "text-xs sm:text-sm font-medium hover:text-blue-300 transition-colors flex items-center gap-1.5",
                        problem.isSolved ? "text-white/70" : "text-white",
                        isLocked && "pointer-events-none text-white/50"
                      )}
                    >
                      <span className="truncate">{problem.title}</span>
                      {!isLocked && (
                        <ArrowUpRight size={13} className="text-white/30 opacity-0 group-hover:opacity-100 group-hover:text-blue-400 transition-all shrink-0" />
                      )}
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <DifficultyBadge difficulty={problem.difficulty as any} />
                  {problem.sourceUrl && (
                    <a
                      href={problem.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-white/30 hover:text-white/80 transition-colors"
                      title="External source"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                  {isLocked ? (
                    <span className="text-[11px] text-white/30 flex items-center gap-1 px-2 py-1">
                      <Lock size={11} /> Locked
                    </span>
                  ) : (
                    <ButtonLink
                      href={`/practice/problems/${problem.slug}${continuityParams}`}
                      variant={problem.isSolved ? "ghost" : "primary"}
                      size="sm"
                      className={cn(
                        !problem.isSolved && "bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                      )}
                    >
                      {problem.isSolved ? "Review" : "Solve →"}
                    </ButtonLink>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Missions ── */}
      {stage.missions.length > 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-3.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-500/15 border border-orange-500/20">
              <Flame size={14} className="text-orange-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">Missions</h3>
            <span className="ml-auto text-xs text-purple-100/40">
              {completedMissionsCount}/{stage.missions.length} completed
            </span>
          </div>
          <div className="space-y-2">
            {stage.missions.map((mission) => (
              <div
                key={mission.id}
                className={cn(
                  "group flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border transition-all duration-150",
                  mission.isCompleted
                    ? "border-emerald-500/20 bg-emerald-950/10 hover:bg-emerald-950/20"
                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-orange-500/30"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {mission.isCompleted ? (
                    <CheckCircle2 size={17} className="text-emerald-400 shrink-0" />
                  ) : mission.progress > 0 ? (
                    <Flame size={17} className="text-orange-400 shrink-0 animate-pulse" />
                  ) : (
                    <Circle size={17} className="text-white/20 group-hover:text-orange-400/60 transition-colors shrink-0" />
                  )}
                  <div className="min-w-0">
                    <Link
                      href={isLocked ? "#" : `/missions/${mission.slug}${continuityParams}`}
                      onClick={isLocked ? (e) => e.preventDefault() : undefined}
                      className={cn(
                        "text-xs sm:text-sm font-medium text-white hover:text-orange-300 transition-colors flex items-center gap-1.5",
                        isLocked && "pointer-events-none text-white/50"
                      )}
                    >
                      <span className="truncate">{mission.title}</span>
                      {!isLocked && (
                        <ArrowUpRight size={13} className="text-white/30 opacity-0 group-hover:opacity-100 group-hover:text-orange-400 transition-all shrink-0" />
                      )}
                    </Link>
                    {mission.progress > 0 && !mission.isCompleted && (
                      <p className="text-[11px] text-orange-300/70 mt-0.5">{mission.progress}% in progress</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  {mission.progress > 0 && !mission.isCompleted && (
                    <span className="text-xs font-semibold text-orange-300 tabular-nums">
                      {mission.progress}%
                    </span>
                  )}
                  {isLocked ? (
                    <span className="text-[11px] text-white/30 flex items-center gap-1 px-2 py-1">
                      <Lock size={11} /> Locked
                    </span>
                  ) : (
                    <ButtonLink
                      href={`/missions/${mission.slug}${continuityParams}`}
                      variant={mission.isCompleted ? "ghost" : "primary"}
                      size="sm"
                      className={cn(
                        !mission.isCompleted && "bg-orange-600 hover:bg-orange-500 text-white shadow-sm hover:shadow-md transition-all active:scale-95"
                      )}
                    >
                      {mission.isCompleted ? "Review" : mission.progress > 0 ? "Resume →" : "Launch →"}
                    </ButtonLink>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Component 2: Learning Path Detail & Stage Journey View ──────────────────

export function LearningPathDetailView({ path }: { path: LearningPathItem }) {
  const searchParams = useSearchParams();
  const stageQueryParam = searchParams.get("stage");

  const defaultStageIndex = Math.max(
    0,
    Math.min(path.stages.length - 1, path.currentStageIndex ?? 0)
  );

  const initialStageIdx = useMemo(() => {
    if (stageQueryParam) {
      const parsed = Number(stageQueryParam);
      if (!isNaN(parsed)) {
        const idx = path.stages.findIndex(
          (s, i) => s.order === parsed || i + 1 === parsed
        );
        if (idx >= 0) return idx;
      }
    }
    return defaultStageIndex;
  }, [stageQueryParam, path.stages, defaultStageIndex]);

  const [selectedStageIdx, setSelectedStageIdx] = useState<number>(initialStageIdx);
  const currentStageIndex = defaultStageIndex;

  const contentRef = useRef<HTMLDivElement>(null);

  const activeStage = path.stages[selectedStageIdx] ?? path.stages[0];
  const activeStageNumber = selectedStageIdx + 1;
  const hoursEst = Math.round(path.minutes / 60);

  const isCompletedStage = activeStage
    ? activeStage.status === "completed" || activeStage.progress >= 100
    : false;
  const isCurrentStage = selectedStageIdx === currentStageIndex && !isCompletedStage;
  const isLockedStage = !isCompletedStage && !isCurrentStage && selectedStageIdx > currentStageIndex;

  const previousStage = selectedStageIdx > 0 ? path.stages[selectedStageIdx - 1] : null;

  const handleSelectStage = (idx: number) => {
    setSelectedStageIdx(idx);
    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleJumpToCurrentStage = () => {
    setSelectedStageIdx(currentStageIndex);
    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const isAllCompleted = path.status === "completed" || path.progress >= 100;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-1.5 text-xs text-purple-100/50">
        <Link href="/learning-paths" className="hover:text-white transition-colors flex items-center gap-1">
          <ArrowLeft size={12} />
          Learning Paths
        </Link>
        <ChevronRight size={12} className="text-white/20" />
        <span className="text-purple-200 font-medium truncate max-w-[220px] sm:max-w-md">{path.title}</span>
      </div>

      {/* ── Hero Banner ── */}
      <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
        {/* Cover image blurred bg */}
        {path.coverImage && !path.coverImage.startsWith("C:") && !path.coverImage.startsWith("file:") && (
          <div className="absolute inset-0 z-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={path.coverImage} alt="" className="w-full h-full object-cover blur-md opacity-15 scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#090312] via-[#090312]/90 to-[#090312]/60" />
          </div>
        )}
        {/* Ambient glow */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-purple-900/20 via-transparent to-black/30 pointer-events-none" />

        <div className="relative z-10 p-6 sm:p-8 space-y-5">
          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-2">
            <DifficultyBadge difficulty={path.difficulty as any} />
            <span className="rounded-md border border-white/10 bg-black/40 px-2.5 py-0.5 text-xs font-medium text-purple-200">
              {path.stages?.length ?? 0} Stages
            </span>
            <span className="rounded-md border border-white/10 bg-black/40 px-2.5 py-0.5 text-xs font-medium text-purple-200 flex items-center gap-1">
              <Clock size={12} className="text-purple-300" />
              {hoursEst > 0 ? `~${hoursEst} Hours` : `${path.minutes} mins`}
            </span>
            {path.audience && (
              <span className="rounded-md border border-white/10 bg-black/40 px-2.5 py-0.5 text-xs font-medium text-purple-300/80">
                {path.audience}
              </span>
            )}
            {path.isFeatured && (
              <span className="rounded-md border border-amber-400/30 bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-200 flex items-center gap-1">
                <Star size={11} className="fill-amber-400 text-amber-400" /> Featured
              </span>
            )}
          </div>

          {/* Title & description */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">{path.title}</h1>
            <p className="text-sm sm:text-base leading-relaxed text-purple-100/65 max-w-3xl">
              {path.description || "Master core algorithms and data structures through this structured curriculum."}
            </p>
          </div>

          {/* Contextual Progress (Encouraging, not leading with raw low %) */}
          <div className="pt-4 border-t border-white/[0.07] space-y-2.5 max-w-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-white">
                {path.solvedProblems} {path.solvedProblems === 1 ? "problem" : "problems"} solved
                <span className="text-purple-100/40 font-normal"> · </span>
                Stage {currentStageIndex + 1} of {path.stages.length}
                {isAllCompleted ? " · Completed" : " in progress"}
              </span>
              <span className="text-purple-100/40 tabular-nums">
                {path.stages.filter((s) => s.status === "completed" || s.progress >= 100).length}/{path.stages.length} stages done
              </span>
            </div>
            <ProgressTrack
              value={path.progress}
              color={isAllCompleted ? "emerald" : "purple"}
              height="thin"
            />
          </div>
        </div>
      </div>

      {/* ── Path Completion Celebration Banner ── */}
      {isAllCompleted && (
        <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-950/30 via-emerald-900/10 to-teal-950/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Trophy size={28} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">🎉 Curriculum Completed!</h2>
              <p className="text-sm text-emerald-300/80 mt-0.5">
                You&apos;ve completed all {path.stages.length} stages and solved {path.solvedProblems} problems in <strong>{path.title}</strong>.
              </p>
            </div>
          </div>
          <ButtonLink
            href="/learning-paths"
            variant="secondary"
            size="md"
            className="shrink-0 border-emerald-500/30 hover:border-emerald-400/50 text-emerald-200"
          >
            Explore Next Learning Path <ArrowRight size={14} />
          </ButtonLink>
        </div>
      )}

      {/* ── Tablet Horizontally Scrollable Stage Tabs (hidden on desktop & mobile) ── */}
      <div className="hidden md:flex lg:hidden items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/[0.06]">
        {path.stages.map((stage, idx) => {
          const isCompleted = stage.status === "completed" || stage.progress >= 100;
          const isCurrent = idx === currentStageIndex && !isCompleted;
          const isLocked = !isCompleted && !isCurrent && idx > currentStageIndex;
          const isSelected = idx === selectedStageIdx;

          return (
            <button
              key={stage.order}
              type="button"
              onClick={() => handleSelectStage(idx)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium shrink-0 border transition-all",
                isSelected
                  ? isCurrent
                    ? "bg-blue-500/15 border-blue-500/40 text-white shadow-sm"
                    : isCompleted
                    ? "bg-emerald-500/15 border-emerald-500/40 text-white shadow-sm"
                    : "bg-white/[0.08] border-white/20 text-white"
                  : "bg-white/[0.02] border-white/[0.08] text-purple-100/60 hover:bg-white/[0.05] hover:text-white"
              )}
            >
              <StageStatusIcon
                status={isCompleted ? "completed" : stage.status}
                isCurrent={isCurrent}
                isLocked={isLocked}
                stageNumber={idx + 1}
              />
              <span className="whitespace-nowrap font-semibold">Stage {idx + 1}: {stage.title}</span>
            </button>
          );
        })}
      </div>

      {/* ── Mobile Stage Dropdown Selector (hidden on tablet & desktop) ── */}
      <div className="md:hidden space-y-1.5">
        <label htmlFor="mobile-stage-select" className="text-[11px] font-semibold text-purple-100/50 uppercase tracking-wider block">
          Current Stage
        </label>
        <div className="relative">
          <select
            id="mobile-stage-select"
            value={selectedStageIdx}
            onChange={(e) => handleSelectStage(Number(e.target.value))}
            className="w-full appearance-none rounded-xl border border-white/[0.12] bg-[#120824] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-400 pr-10"
          >
            {path.stages.map((stage, idx) => {
              const isCompleted = stage.status === "completed" || stage.progress >= 100;
              const isCurrent = idx === currentStageIndex && !isCompleted;
              const isLocked = !isCompleted && !isCurrent && idx > currentStageIndex;
              const tag = isCompleted ? "✓ Done" : isCurrent ? "● Current" : isLocked ? "🔒 Locked" : "";
              return (
                <option key={stage.order} value={idx} className="bg-[#0e061a] text-white">
                  Stage {idx + 1}: {stage.title} {tag ? `(${tag})` : ""}
                </option>
              );
            })}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300/50 pointer-events-none" />
        </div>
      </div>

      {/* ── Two-Panel Layout (Desktop ~280px sidebar, 1fr content) ── */}
      <div ref={contentRef} className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 scroll-mt-6">
        {/* Left: Sticky Roadmap (Desktop only) */}
        <aside className="hidden lg:block lg:sticky lg:top-4 lg:self-start w-full">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-white/[0.06]">
              <Map size={14} className="text-purple-400" />
              <span className="text-xs font-semibold text-purple-200 uppercase tracking-wider">Curriculum Roadmap</span>
            </div>
            <StageSidebar
              stages={path.stages}
              currentStageIndex={currentStageIndex}
              selectedStageIdx={selectedStageIdx}
              onSelectStage={handleSelectStage}
            />
          </div>
        </aside>

        {/* Right: Active Stage Content Panel */}
        <main className="min-w-0">
          {activeStage ? (
            <StageContentPanel
              stage={activeStage}
              stageNumber={activeStageNumber}
              isCurrent={isCurrentStage}
              isCompleted={isCompletedStage}
              isLocked={isLockedStage}
              unlockedAfterNumber={previousStage ? selectedStageIdx : undefined}
              unlockedAfterTitle={previousStage ? previousStage.title : undefined}
              onJumpToCurrentStage={handleJumpToCurrentStage}
              pathSlug={path.slug}
            />
          ) : (
            <Surface className="py-12 text-center">
              <Layers3 size={32} className="mx-auto text-purple-400/30 mb-3" />
              <p className="text-sm text-purple-100/40">Select a stage from the roadmap to view its content.</p>
            </Surface>
          )}

          {/* Prev / Next stage navigation */}
          {path.stages.length > 1 && (
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  if (selectedStageIdx > 0) handleSelectStage(selectedStageIdx - 1);
                }}
                disabled={selectedStageIdx === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-xs text-purple-200 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft size={13} /> Previous Stage
              </button>
              <span className="text-xs text-purple-100/40 font-medium">
                Stage {activeStageNumber} of {path.stages.length}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (selectedStageIdx < path.stages.length - 1) handleSelectStage(selectedStageIdx + 1);
                }}
                disabled={selectedStageIdx === path.stages.length - 1}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-xs text-purple-200 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next Stage <ChevronRight size={13} />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

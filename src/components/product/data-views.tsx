"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpen, Brain, Briefcase, Calendar, CheckCircle2, ChevronRight, ChevronDown, Clock, ExternalLink, FileText, Flame, Search, Sparkles, Target, Trophy, X, Zap } from "lucide-react";
import {
  ButtonLink,
  CompanyCard,
  DifficultyBadge,
  EmptySlate,
  MasteryRing,
  MissionRow,
  PageHeader,
  ProblemRow,
  ProgressTrack,
  SectionLabel,
  StatTile,
  StatusBadge,
  Surface,
  TopicRow,
  WeeklyChart,
} from "./ui";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { RevisionReviewForm, ProblemAttemptForm, ProblemPatternRecognitionForm, ProfileForm, ReflectionForm } from "./forms";
import { NotificationsPageView } from "@/components/notifications/notifications-page-view";
import { AIMentorPanel } from "./ai-mentor";
import { ProgressiveHintLadder } from "./progressive-hint-ladder";

/* ── Animation variants ──────────────────────────────── */
const STAGGER_CONTAINER: any = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const FADE_UP_ITEM: any = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } },
};

export { DashboardView } from "./dashboard/DashboardView";

/* ── Learn View ──────────────────────────────────────── */
export function LearnView({ data }: { data: any }) {
  const { topics, missions } = data;
  const activeMission = missions.find((m: any) => m.status === "in_progress") ?? null;
  const completedMissions = missions.filter((m: any) => m.status === "completed");
  const availableMissions = missions.filter((m: any) => m.status !== "in_progress" && m.status !== "completed");

  // Group missions by topic for the curriculum section
  const missionsByTopic = missions.reduce((acc: Record<string, any[]>, m: any) => {
    const key = m.topic ?? "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {} as Record<string, any[]>);

  // Compute per-topic status from topic progress + missions
  const topicsWithStatus = topics.map((topic: any) => {
    const topicMissions = missionsByTopic[topic.title] ?? [];
    const hasMissionInProgress = topicMissions.some((m: any) => m.status === "in_progress");
    const allMissionsDone = topicMissions.length > 0 && topicMissions.every((m: any) => m.status === "completed");
    let status = "not_started";
    if (topic.progress >= 100 || allMissionsDone) status = "completed";
    else if (topic.progress > 0 || hasMissionInProgress) status = "in_progress";
    return { ...topic, status, topicMissions };
  });

  const inProgressTopics = topicsWithStatus.filter((t: any) => t.status === "in_progress");
  const completedTopics = topicsWithStatus.filter((t: any) => t.status === "completed");
  const notStartedTopics = topicsWithStatus.filter((t: any) => t.status === "not_started");

  const totalProgress = topics.length > 0
    ? Math.round(topics.reduce((s: number, t: any) => s + (t.progress ?? 0), 0) / topics.length)
    : 0;

  return (
    <div className="space-y-10">
      {/* Page Header with overall progress */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <p className="label-xs text-purple-300/70 mb-2">Learning Workspace</p>
          <h1 className="heading-display text-white">Learn</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-purple-100/48">
            Master DSA through structured missions. Every topic, every pattern, evidence-backed.
          </p>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-purple-300/50 mb-1">Curriculum</p>
            <p className="text-2xl font-bold text-white">{completedTopics.length}<span className="text-sm text-purple-300/40">/{topics.length}</span></p>
            <p className="text-[10px] text-purple-100/40">topics done</p>
          </div>
          <MasteryRing value={totalProgress} size="md" label="avg" />
        </div>
      </div>

      {/* ── Active Mission Resume ── */}
      {activeMission && (
        <motion.section initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <p className="label-xs text-cyan-300/70 mb-3">Continue where you left off</p>
          <Link href={`/missions/${activeMission.slug}`} className="group block focus:outline-none">
            <div className="relative overflow-hidden rounded-[20px] border border-cyan-500/30 bg-gradient-to-br from-cyan-500/[0.07] via-cyan-400/[0.04] to-purple-500/[0.04] p-7 transition-all hover:border-cyan-400/50 hover:shadow-[0_8px_32px_rgba(34,211,238,0.12)]">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-400/0 via-cyan-400/60 to-cyan-400/0 opacity-60 group-hover:opacity-100 transition-opacity" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex h-5 items-center rounded-full bg-cyan-400/20 border border-cyan-400/30 px-2 text-[9px] font-bold uppercase tracking-widest text-cyan-300">In Progress</span>
                    <span className="text-xs text-purple-100/50">{activeMission.topic}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-100 transition-colors">{activeMission.title}</h2>
                  <div className="flex items-center gap-3 max-w-xs">
                    <div className="flex-1"><ProgressTrack value={activeMission.progress} color="cyan" /></div>
                    <span className="text-sm font-bold text-cyan-300">{activeMission.progress}%</span>
                  </div>
                </div>
                <div className="shrink-0">
                  <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-cyan-500 px-6 text-sm font-semibold text-white shadow-[0_0_20px_rgba(34,211,238,0.3)] transition group-hover:bg-cyan-400">
                    Resume Mission <ArrowRight size={16} />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </motion.section>
      )}

      {/* ── Curriculum Track ── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="label-xs text-purple-300/70 mb-1">Curriculum</p>
            <h2 className="text-[15px] font-semibold text-white">Topic Progression</h2>
          </div>
          <div className="flex items-center gap-4 text-xs text-purple-100/45">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-400/80" /> Done</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-cyan-400/80" /> Active</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-purple-400/40" /> Available</span>
          </div>
        </div>

        <motion.div className="space-y-2" variants={STAGGER_CONTAINER} initial="hidden" animate="show">
          {topicsWithStatus.map((topic: any, index: number) => {
            const statusBorder = topic.status === "completed"
              ? "border-emerald-500/25 bg-emerald-500/[0.05] hover:border-emerald-400/40 hover:bg-emerald-500/[0.08]"
              : topic.status === "in_progress"
              ? "border-cyan-500/25 bg-cyan-500/[0.05] hover:border-cyan-400/40 hover:bg-cyan-500/[0.08]"
              : "border-white/[0.06] bg-white/[0.02] hover:border-purple-400/25 hover:bg-purple-400/[0.04]";
            const stepClass = topic.status === "completed"
              ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300"
              : topic.status === "in_progress"
              ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-300"
              : "border-purple-400/25 bg-purple-400/10 text-purple-300/60";
            const indexLabel = topic.status === "completed" ? "✓" : String(index + 1);
            const trackColor = topic.status === "in_progress" ? "cyan" : topic.status === "completed" ? "emerald" : "purple";

            return (
              <motion.div key={topic.slug} variants={FADE_UP_ITEM}>
                <Link href={`/learn/topics/${topic.slug}`} className="group block focus:outline-none rounded-[14px]">
                  <div className={`flex items-center gap-4 rounded-[14px] border px-5 py-4 transition-all ${statusBorder}`}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-colors ${stepClass}`}>
                      {indexLabel}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-white group-hover:text-purple-100 transition-colors">{topic.title}</span>
                        <DifficultyBadge difficulty={topic.difficulty} />
                        {topic.status === "in_progress" && <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-300 bg-cyan-400/10 border border-cyan-400/20 rounded px-1.5 py-0.5">Active</span>}
                        {topic.status === "completed" && <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 rounded px-1.5 py-0.5">Done</span>}
                      </div>
                      {topic.progress > 0 && (
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="w-24 sm:w-36"><ProgressTrack value={topic.progress} height="thin" color={trackColor as any} /></div>
                          <span className="text-[10px] font-medium text-purple-100/40 tabular-nums">{topic.progress}%</span>
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      {topic.minutes > 0 && <span className="hidden sm:block text-xs text-purple-100/35">{topic.minutes}m</span>}
                      {topic.topicMissions.length > 0 && (
                        <span className="text-xs text-purple-100/35">
                          {topic.topicMissions.filter((m: any) => m.status === "completed").length}/{topic.topicMissions.length} missions
                        </span>
                      )}
                      <ArrowRight size={14} className="text-purple-100/25 transition-all group-hover:text-purple-300 group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ── Missions Panel ── */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="label-xs text-purple-300/70 mb-1">Missions</p>
            <h2 className="text-[15px] font-semibold text-white">Available Missions</h2>
          </div>
          <span className="text-xs text-purple-300/40">{completedMissions.length}/{missions.length} completed</span>
        </div>

        {missions.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {missions.map((mission: any) => {
              const isCompleted = mission.status === "completed";
              const isActive = mission.status === "in_progress";
              return (
                <Link key={mission.slug} href={`/missions/${mission.slug}`} className="group block focus:outline-none">
                  <div className={`h-full flex flex-col gap-3 rounded-[16px] border p-5 transition-all ${
                    isActive ? "border-cyan-500/30 bg-cyan-500/[0.05] hover:border-cyan-400/50"
                    : isCompleted ? "border-emerald-500/20 bg-emerald-500/[0.03] hover:border-emerald-400/35"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-purple-400/25 hover:bg-purple-400/[0.04]"
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium text-purple-100/40 mb-1">{mission.topic}</p>
                        <h3 className="text-sm font-semibold text-white leading-snug group-hover:text-purple-100 transition-colors line-clamp-2">{mission.title}</h3>
                      </div>
                      <StatusBadge status={isCompleted ? "completed" : isActive ? "in_progress" : "not_started"} />
                    </div>
                    {mission.progress > 0 && <ProgressTrack value={mission.progress} height="thin" color={isActive ? "cyan" : "emerald"} />}
                    <div className="flex items-center justify-between mt-auto pt-1">
                      <div className="flex items-center gap-3">
                        <DifficultyBadge difficulty={mission.difficulty} />
                        <span className="text-[10px] text-purple-100/35">{mission.duration}</span>
                      </div>
                      <span className={`text-xs font-semibold transition-opacity ${isActive ? "text-cyan-400" : isCompleted ? "text-emerald-400" : "text-purple-400/70"}`}>
                        {isActive ? "Resume →" : isCompleted ? "Review →" : "Start →"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptySlate context="mission" />
        )}
      </section>
    </div>
  );
}


/* ── Progress View ───────────────────────────────────── */
export { ProgressIntelligenceView as ProgressView } from "./progress-intelligence-view";


/* ── Revision View ───────────────────────────────────── */
export { RevisionView } from "./revision-view";


/* ── Practice View ───────────────────────────────────── */
export { PracticeView } from "./practice-view";

/* ── Companies View ──────────────────────────────────── */
export { CompanyPrepView as CompaniesView } from "./company-prep-view";

/* ── Reconstructed Views ─────────────────────────────── */
export function LearningPathsView({ paths }: { paths: any[] }) {
  return (
    <div className="space-y-8">
      <PageHeader title="Learning Paths" description="Structured paths to master specific domains." />
      {paths.length > 0 ? (
        <div className="grid gap-4">
          {paths.map(path => (
            <Surface key={path.id}>
              <h3 className="text-lg font-semibold text-white">{path.title}</h3>
              <p className="text-sm text-purple-100/50 mt-1">{path.description}</p>
              <div className="mt-4"><ProgressTrack value={path.progress} /></div>
            </Surface>
          ))}
        </div>
      ) : <EmptySlate title="No paths" description="No learning paths available." />}
    </div>
  );
}

export function NotificationsView({ notifications }: { notifications?: any[] }) {
  return <NotificationsPageView initialNotifications={notifications} />;
}

// ── Pattern Category Mapping ──────────────────────────────────────────────────

const PATTERN_CATEGORIES = [
  {
    id: "problem-solving",
    label: "Problem Solving Patterns",
    description: "Core techniques for breaking down and solving algorithmic problems efficiently.",
    slugs: ["two-pointers", "sliding-window", "binary-search", "prefix-sum", "hashing", "fast-slow-pointers", "two-sum", "greedy", "recursion", "backtracking", "divide-and-conquer"],
  },
  {
    id: "linear",
    label: "Linear Data Structures",
    description: "Patterns that operate on arrays, stacks, queues, and linked lists.",
    slugs: ["stack", "queue", "monotonic-stack", "linked-list", "array-manipulation", "sorting", "kadane", "cyclic-sort"],
  },
  {
    id: "trees-graphs",
    label: "Trees & Graphs",
    description: "Traversal and manipulation of hierarchical and network structures.",
    slugs: ["dfs", "bfs", "tree-traversal", "binary-search-tree", "graph", "topological-sort", "union-find", "segment-tree", "trie", "tree"],
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Optimization techniques and complex problem-reduction strategies.",
    slugs: ["dynamic-programming", "memoization", "bit-manipulation", "math", "number-theory", "string", "matrix", "dp"],
  },
] as const;

function assignCategory(pattern: { slug: string; name: string }): string {
  const slug = String(pattern.slug ?? "").toLowerCase();
  const name = String(pattern.name ?? "").toLowerCase();
  for (const cat of PATTERN_CATEGORIES) {
    if ((cat.slugs as readonly string[]).some(s => slug.includes(s) || name.includes(s.replace(/-/g, " ")))) return cat.id;
  }
  return "general";
}

function getRecommendedPatterns(patterns: any[], count = 3): any[] {
  const inProg = patterns.filter(p => p.status === "in_progress").sort((a, b) => Number(b.progress) - Number(a.progress));
  const easyNew = patterns.filter(p => p.status === "not_started" && p.difficulty === "Easy");
  const medNew  = patterns.filter(p => p.status === "not_started" && p.difficulty === "Medium");
  const seen = new Set<string>();
  return [...inProg, ...easyNew, ...medNew].filter(p => !seen.has(p.id) && seen.add(p.id)).slice(0, count);
}

// ── Compact Pattern Card ──────────────────────────────────────────────────────

function PatternCard({ pattern, highlighted = false }: { pattern: any; highlighted?: boolean }) {
  const progress = Number(pattern.progress ?? 0);
  const problemCount = Number(pattern.problemCount ?? (pattern.problems as unknown[] | undefined)?.length ?? 0);
  const keywords = ((pattern.keywords ?? []) as string[]).slice(0, 3);
  const isCompleted = pattern.status === "completed";
  const isInProgress = pattern.status === "in_progress";

  const oneLineSummary = (() => {
    const desc = String(pattern.description ?? "");
    const first = desc.match(/^[^.!?]+[.!?]*/)?.[0] ?? desc;
    return first.length > 110 ? first.slice(0, 107) + "…" : first;
  })();

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl border transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)]",
        highlighted
          ? "border-[var(--accent-lime,#B7F36B)]/40 bg-gradient-to-br from-[var(--accent-lime,#B7F36B)]/[0.07] via-white/[0.02] to-transparent hover:border-[var(--accent-lime,#B7F36B)]/65 hover:shadow-[0_12px_32px_rgba(183,243,107,0.15)]"
          : isCompleted
          ? "border-emerald-500/25 bg-emerald-950/10 hover:border-emerald-400/40"
          : "border-white/[0.08] bg-[#0C1017]/90 hover:border-[var(--accent-lime,#B7F36B)]/40 hover:bg-[#111622]"
      )}
    >
      {highlighted && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full border border-[var(--accent-lime,#B7F36B)]/35 bg-[var(--accent-lime,#B7F36B)]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--accent-lime,#B7F36B)]">
          <Sparkles size={9} /> High ROI
        </div>
      )}

      <Link
        href={`/patterns/${pattern.slug}`}
        className={cn("flex flex-1 flex-col p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-lime,#B7F36B)]/50 rounded-t-2xl", highlighted && "pt-7")}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[var(--accent-lime,#B7F36B)]/80 mb-1 truncate">
              {pattern.topic || "ALGORITHM PATTERN"}
            </p>
            <h3 className={cn("text-sm font-bold leading-snug transition-colors", isCompleted ? "text-emerald-200" : "text-white group-hover:text-[var(--accent-lime,#B7F36B)]")}>
              {pattern.name}
            </h3>
          </div>
          <DifficultyBadge difficulty={pattern.difficulty} />
        </div>

        {/* One-line description */}
        <p className="text-xs leading-relaxed text-(--color-text-muted) line-clamp-2 mb-3">{oneLineSummary}</p>

        {/* Tags row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3 min-h-[22px]">
          {keywords.map((kw) => (
            <span key={kw} className="rounded-md border border-white/[0.07] bg-white/[0.02] px-2 py-0.5 text-[10px] text-white/70">{kw}</span>
          ))}
          {problemCount > 0 && (
            <span className="rounded-md border border-cyan-400/25 bg-cyan-400/[0.08] px-2 py-0.5 text-[10px] font-semibold text-cyan-300 ml-auto">
              {problemCount} problem{problemCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="mt-auto space-y-1 pt-2 border-t border-white/[0.04]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40">
              {isCompleted ? "Mastered" : isInProgress ? "In progress" : "Not started"}
            </span>
            <span className={cn("text-[10px] font-bold tabular-nums", isCompleted ? "text-emerald-300" : isInProgress ? "text-[var(--accent-lime,#B7F36B)]" : "text-white/30")}>
              {progress > 0 ? `${progress}%` : "—"}
            </span>
          </div>
          <ProgressTrack value={progress} height="thin" color={isCompleted ? "emerald" : "lime"} />
        </div>
      </Link>

      {/* Footer CTA */}
      <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5 rounded-b-2xl">
        <div className="flex items-center gap-1.5">
          {isCompleted
            ? <CheckCircle2 size={12} className="text-emerald-400" />
            : isInProgress
            ? <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-lime,#B7F36B)] animate-pulse" />
            : <span className="w-1.5 h-1.5 rounded-full border border-white/20" />
          }
          <span className="text-[10px] text-white/40">
            {isCompleted ? "Mastered" : isInProgress ? "In progress" : "Not started"}
          </span>
        </div>
        <Link
          href={`/patterns/${pattern.slug}`}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-150 hover:-translate-y-px active:translate-y-0",
            isCompleted
              ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
              : highlighted
              ? "bg-[var(--accent-lime,#B7F36B)] text-[#0B0F14] hover:bg-[var(--accent-lime,#B7F36B)]/90"
              : "bg-white/[0.05] text-white hover:bg-[var(--accent-lime,#B7F36B)] hover:text-[#0B0F14]"
          )}
        >
          {isCompleted ? "Review" : "Study"} <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  );
}

// ── Category Group ────────────────────────────────────────────────────────────

function PatternCategoryGroup({
  category,
  patterns,
}: {
  category: { id: string; label: string; description: string; slugs: readonly string[] | string[] };
  patterns: any[];
}) {
  if (!patterns.length) return null;
  return (
    <section id={`cat-${category.id}`} className="space-y-4 scroll-mt-20">
      <div className="flex items-end justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[var(--accent-lime,#B7F36B)]" />
            <h2 className="text-base font-bold text-white tracking-tight">{category.label}</h2>
          </div>
          <p className="text-xs text-(--color-text-muted) mt-1">{category.description}</p>
        </div>
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-white/40 px-2 py-0.5 rounded-md border border-white/[0.08] bg-white/[0.02]">
          {patterns.length} pattern{patterns.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {patterns.map(p => <PatternCard key={p.id} pattern={p} />)}
      </div>
    </section>
  );
}

// ── All Mastered Celebration ──────────────────────────────────────────────────

function AllMasteredCelebration({ count }: { count: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-900/20 via-transparent to-transparent px-8 py-16 text-center"
    >
      <div className="mb-4 grid size-16 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15">
        <Trophy size={28} className="text-emerald-300" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">All Patterns Mastered 🎉</h2>
      <p className="text-sm text-(--color-text-muted) max-w-xs leading-relaxed mb-6">
        You&apos;ve mastered all {count} published patterns. An exceptional achievement — keep reinforcing with problems.
      </p>
      <ButtonLink href="/practice" variant="primary">
        Practice Problems <ArrowRight size={14} className="ml-1" />
      </ButtonLink>
    </motion.div>
  );
}

// ── PatternSheetsView ─────────────────────────────────────────────────────────

export function PatternSheetsView({ patterns }: { patterns: any[] }) {
  const shouldReduceMotion = useReducedMotion();
  const [search, setSearch] = useState("");
  const [activeDifficulty, setActiveDifficulty] = useState("All");
  const [activeCategory, setActiveCategory] = useState("all");

  const patternsWithCat = useMemo(
    () => patterns.map(p => ({ ...p, _cat: assignCategory(p) })),
    [patterns]
  );

  const patternsByCategory = useMemo(() => {
    const result: Record<string, any[]> = { general: [] };
    for (const cat of PATTERN_CATEGORIES) result[cat.id] = [];
    for (const p of patternsWithCat) (result[p._cat] ?? result.general).push(p);
    return result;
  }, [patternsWithCat]);

  const recommended = useMemo(() => getRecommendedPatterns(patternsWithCat, 3), [patternsWithCat]);
  const recommendedIds = useMemo(() => new Set(recommended.map(p => p.id)), [recommended]);

  const masteredCount   = patterns.filter(p => p.status === "completed").length;
  const inProgressCount = patterns.filter(p => p.status === "in_progress").length;
  const totalProblems   = patterns.reduce((s, p) => s + Number(p.problemCount ?? (p.problems as any[] | undefined)?.length ?? 0), 0);
  const allMastered     = patterns.length > 0 && masteredCount === patterns.length;

  const isFiltering = search.trim() !== "" || activeCategory !== "all" || activeDifficulty !== "All";

  const filteredPatterns = useMemo(() => {
    const q = search.toLowerCase().trim();
    return patternsWithCat.filter(p => {
      if (q && !p.name.toLowerCase().includes(q) && !((p.keywords ?? []) as string[]).some((k: string) => k.toLowerCase().includes(q))) return false;
      if (activeCategory !== "all" && p._cat !== activeCategory) return false;
      if (activeDifficulty !== "All" && p.difficulty !== activeDifficulty) return false;
      return true;
    });
  }, [patternsWithCat, search, activeCategory, activeDifficulty]);

  if (patterns.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-lime,#B7F36B)] mb-1">Pattern Hub</p>
          <h1 className="text-2xl font-bold text-white">Patterns</h1>
        </div>
        <EmptySlate title="No patterns yet" description="No published patterns available yet." />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* ── Futuristic Header & KPI Metrics ── */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="size-2 rounded-full bg-[var(--accent-lime,#B7F36B)] animate-pulse" />
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[var(--accent-lime,#B7F36B)]">
                Algorithmic Pattern Hub
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Patterns Library
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-(--color-text-muted) max-w-xl leading-relaxed">
              Master the recurring structural invariants and mental models behind high-frequency coding interview problems.
            </p>
          </div>
        </div>

        {/* High-tech KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>Cataloged</span>
              <Brain size={14} className="text-[var(--accent-lime,#B7F36B)]" />
            </div>
            <div className="text-2xl font-bold text-white tabular-nums tracking-tight">
              {patterns.length}
            </div>
            <p className="text-[11px] text-white/40">Patterns across {PATTERN_CATEGORIES.length} categories</p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>Problems</span>
              <Target size={14} className="text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white tabular-nums tracking-tight">
              {totalProblems}
            </div>
            <p className="text-[11px] text-white/40">Target interview problems</p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-400/80">
              <span>Mastered</span>
              <Trophy size={14} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-300 tabular-nums tracking-tight">
              {masteredCount}
            </div>
            <p className="text-[11px] text-emerald-400/60">
              {patterns.length > 0 ? Math.round((masteredCount / patterns.length) * 100) : 0}% completion
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--accent-lime,#B7F36B)]/20 bg-[var(--accent-lime,#B7F36B)]/[0.03] p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-[var(--accent-lime,#B7F36B)]/80">
              <span>In Training</span>
              <Zap size={14} className="text-[var(--accent-lime,#B7F36B)]" />
            </div>
            <div className="text-2xl font-bold text-[var(--accent-lime,#B7F36B)] tabular-nums tracking-tight">
              {inProgressCount}
            </div>
            <p className="text-[11px] text-white/40">Active pattern loops</p>
          </div>
        </div>
      </div>

      {/* ── Category Tabs & Filter Toolbar ── */}
      <div className="space-y-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-white/[0.06]">
          {[
            { id: "all", label: "All Patterns", count: patterns.length },
            ...PATTERN_CATEGORIES.map(c => ({
              id: c.id,
              label: c.label,
              count: (patternsByCategory[c.id] ?? []).length,
            })),
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-150",
                activeCategory === tab.id
                  ? "bg-[var(--accent-lime,#B7F36B)] text-[#0B0F14] shadow-[0_0_16px_rgba(183,243,107,0.25)] font-bold"
                  : "text-(--color-text-muted) hover:text-white hover:bg-white/[0.05]"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "text-[10px] rounded-full px-1.5 py-0.2 font-mono tabular-nums",
                activeCategory === tab.id ? "bg-black/20 text-black font-bold" : "bg-white/[0.08] text-white/50"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5">
          {/* Search input */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            <input
              type="search"
              placeholder="Search patterns or keywords..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] pl-8 pr-3 text-xs text-white placeholder:text-white/30 outline-none focus:border-[var(--accent-lime,#B7F36B)]/60 focus:ring-1 focus:ring-[var(--accent-lime,#B7F36B)]/20 transition-colors"
            />
          </div>

          <div className="hidden sm:block w-px h-5 bg-white/[0.08]" />

          {/* Difficulty pills */}
          {["All", "Easy", "Medium", "Hard"].map(d => (
            <button
              key={d}
              onClick={() => setActiveDifficulty(d)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all duration-150",
                activeDifficulty === d
                  ? "bg-white/[0.12] text-white border border-white/[0.2]"
                  : "text-white/50 hover:text-white"
              )}
            >
              {d}
            </button>
          ))}

          {isFiltering && (
            <button
              onClick={() => { setSearch(""); setActiveDifficulty("All"); setActiveCategory("all"); }}
              className="ml-auto flex items-center gap-1 text-[11px] text-white/40 hover:text-white transition-colors"
            >
              <X size={12} /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* All mastered celebration */}
      {allMastered && !isFiltering && <AllMasteredCelebration count={patterns.length} />}

      {/* High-Yield Starting Patterns — default view only */}
      {!isFiltering && !allMastered && recommended.length > 0 && activeCategory === "all" && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-[var(--accent-lime,#B7F36B)]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent-lime,#B7F36B)]">
              High-Yield Starting Patterns
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map(p => <PatternCard key={p.id} pattern={p} highlighted />)}
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {isFiltering || activeCategory !== "all" ? (
          <motion.div
            key={`filtered-${activeCategory}`}
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="space-y-3"
          >
            <p className="text-[11px] text-(--color-text-muted)">
              Showing {filteredPatterns.length} pattern{filteredPatterns.length !== 1 ? "s" : ""}
            </p>
            {filteredPatterns.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPatterns.map(p => (
                  <PatternCard key={p.id} pattern={p} highlighted={recommendedIds.has(p.id)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] py-14 text-center">
                <Search size={20} className="text-white/30 mb-3" />
                <p className="text-sm font-semibold text-white/70">No patterns match this selection</p>
                <button
                  onClick={() => { setSearch(""); setActiveDifficulty("All"); setActiveCategory("all"); }}
                  className="mt-3 rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs text-[var(--accent-lime,#B7F36B)] hover:bg-white/[0.04] transition-colors"
                >
                  Reset all filters
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="categorized"
            initial={shouldReduceMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-10"
          >
            {PATTERN_CATEGORIES.map(cat => (
              <PatternCategoryGroup
                key={cat.id}
                category={cat}
                patterns={patternsByCategory[cat.id] ?? []}
              />
            ))}
            {(patternsByCategory.general ?? []).length > 0 && (
              <PatternCategoryGroup
                key="general"
                category={{ id: "general", label: "General", description: "Other patterns.", slugs: [] }}
                patterns={patternsByCategory.general}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { ProblemDetailView } from "./problem-detail-view";


export function ProfileView({ data, title }: { data: any, title?: string }) {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <PageHeader title={title || "Profile & Settings"} description="Manage your preferences and goals." />
      <Surface>
        <ProfileForm profile={data.profile} user={data.user} />
      </Surface>
    </div>
  );
}

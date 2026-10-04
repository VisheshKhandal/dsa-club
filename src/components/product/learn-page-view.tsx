"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  Clock,
  GraduationCap,
  PlayCircle,
  Lock,
  Check,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────
export type MissionStatus = "not_started" | "in_progress" | "completed";

export interface HeroMission {
  slug: string;
  title: string;
  topic: string;
  progress: number;
  duration: string;
  minutes: number;
  difficulty: string;
  status: MissionStatus;
}

export interface PathStage {
  order: number;
  title: string;
  progress: number;
  status: "not_started" | "in_progress" | "completed";
  missionCount: number;
  problemCount: number;
  prerequisite?: string;
}

export interface ActivePath {
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  stageCount: number;
  progress: number;
  status: string;
  currentStageIndex: number;
  currentStageTitle: string;
  stages: PathStage[];
}

export interface UpNextItem {
  slug: string;
  title: string;
  topic: string;
  duration: string;
  minutes: number;
  difficulty: string;
  status: MissionStatus;
  prerequisite?: string;
}

export interface Topic {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  progress: number;
  minutes: number;
}

export interface Mission {
  id: string;
  slug: string;
  title: string;
  topic: string;
  progress: number;
  duration: string;
  difficulty: string;
  status: MissionStatus;
  prerequisite?: string;
}

export interface FeaturedPath {
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  stageCount: number;
  progress: number;
  status: string;
  isFeatured: boolean;
}

export interface LearnPageData {
  heroMission: HeroMission | null;
  activePath: ActivePath | null;
  upNext: UpNextItem[];
  topics: Topic[];
  missions: Mission[];
  featuredPaths: FeaturedPath[];
}

// ── Difficulty Badge Helper ──────────────────────────────────────────
function DiffBadge({ difficulty }: { difficulty: string }) {
  const d = (difficulty || "Medium").toLowerCase();
  const styles =
    d === "easy"
      ? "text-emerald-400 border-emerald-500/25 bg-emerald-500/10"
      : d === "hard"
      ? "text-rose-400 border-rose-500/25 bg-rose-500/10"
      : "text-amber-400 border-amber-500/25 bg-amber-500/10";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider",
        styles
      )}
    >
      {difficulty}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════
// 1. HERO CONCEPT: THE IMMEDIATE NEXT LESSON
// ══════════════════════════════════════════════════════════════════
function LearnHeroConcept({
  mission,
  activePath,
}: {
  mission: HeroMission | null;
  activePath: ActivePath | null;
}) {
  if (!mission) {
    return (
      <section className="rounded-2xl border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface-raised,#17212B)] p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[var(--accent-lime,#B7F36B)]">
              Start Learning Path
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary,#F3F6F4)]">
              {activePath ? activePath.title : "Choose your core curriculum"}
            </h2>
            <p className="text-sm text-[var(--text-secondary,#A8B4B0)] max-w-xl leading-relaxed">
              {activePath
                ? `Begin with ${activePath.title} — structured from foundational intuition to algorithmic mastery.`
                : "Select a structured learning path to start mastering DSA concepts sequentially."}
            </p>
          </div>
          <div className="shrink-0">
            <Link
              href={activePath ? `/learning-paths/${activePath.slug}` : "/learning-paths"}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent-lime,#B7F36B)] text-[#0B0F14] font-bold text-sm hover:bg-[var(--accent-lime-dark,#6B9B36)] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,#D8FF9D)]"
            >
              {activePath ? "Start First Lesson" : "Explore Curricula"}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const isCurrent = mission.status === "in_progress";
  const estimatedMin = (mission.minutes ?? 0) > 0 ? mission.minutes : 25;
  const prerequisiteText =
    activePath && (activePath.currentStageIndex ?? 0) > 0
      ? `Requires: Stage ${activePath.currentStageIndex} completion`
      : "Prerequisite: Foundational data structures";

  return (
    <section className="rounded-2xl border border-[var(--border-strong,#33424D)] bg-[var(--bg-surface-raised,#17212B)] p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold tracking-wide uppercase bg-[var(--accent-lime,#B7F36B)]/10 border-[var(--accent-lime,#B7F36B)]/25 text-[var(--accent-lime,#B7F36B)]">
              <span className="size-1.5 rounded-full bg-[var(--accent-lime,#B7F36B)] animate-pulse" />
              {isCurrent ? "Current Lesson" : "Up Next in Path"}
            </span>
            <span className="text-xs text-[var(--text-muted,#71807C)]">
              {mission.topic}
              {activePath ? ` · ${activePath.title}` : ""}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary,#F3F6F4)] leading-snug">
            {mission.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary,#A8B4B0)]">
            <DiffBadge difficulty={mission.difficulty} />
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-[var(--accent-amber,#F2B84B)]" />
              ~{estimatedMin} minutes
            </span>
            <span className="text-[var(--text-muted,#71807C)] border-l border-[var(--border-subtle,#24313B)] pl-3">
              {prerequisiteText}
            </span>
          </div>

          {(mission.progress ?? 0) > 0 && (
            <div className="pt-2 max-w-sm">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[var(--text-muted,#71807C)]">Lesson progress</span>
                <span className="font-mono text-[var(--accent-lime,#B7F36B)]">{mission.progress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[var(--bg-app,#0B0F14)] overflow-hidden border border-[var(--border-subtle,#24313B)]">
                <div
                  className="h-full rounded-full bg-[var(--accent-lime,#B7F36B)]"
                  style={{ width: `${mission.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-col sm:flex-row gap-3 pt-2 lg:pt-0">
          <Link
            href={`/missions/${mission.slug}`}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[var(--accent-lime,#B7F36B)] text-[#0B0F14] font-bold text-sm hover:bg-[var(--accent-lime-dark,#6B9B36)] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,#D8FF9D)] active:scale-[0.98]"
          >
            <PlayCircle className="size-4" />
            {isCurrent ? "Resume lesson" : "Start lesson"}
            <ArrowRight className="size-4" />
          </Link>
          {activePath?.slug && (
            <Link
              href={`/learning-paths/${activePath.slug}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface,#121922)] text-[var(--text-secondary,#A8B4B0)] font-semibold text-sm hover:text-[var(--text-primary,#F3F6F4)] hover:border-[var(--border-strong,#33424D)] transition-colors"
            >
              View Full Path
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
// 2. CONCEPT SEQUENCE: SEQUENTIAL LEARNING ROADMAP
// ══════════════════════════════════════════════════════════════════
function ConceptSequenceList({
  path,
}: {
  path: ActivePath;
}) {
  const stages = (path?.stages ?? []).filter(Boolean);
  const currentIdx = typeof path?.currentStageIndex === "number" ? path.currentStageIndex : 0;

  if (stages.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1 border-b border-[var(--border-subtle,#24313B)]">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary,#F3F6F4)]">
            {path.title} Curriculum Sequence
          </h2>
          <p className="text-xs text-[var(--text-secondary,#A8B4B0)] mt-0.5">
            Stage {currentIdx + 1} of {stages.length} active · Complete each concept sequentially
          </p>
        </div>
        <Link
          href={`/learning-paths/${path.slug}`}
          className="text-xs font-semibold text-[var(--accent-lime,#B7F36B)] hover:underline inline-flex items-center gap-1"
        >
          Explore path overview <ChevronRight className="size-3.5" />
        </Link>
      </div>

      <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-4 before:bottom-4 before:w-px before:bg-[var(--border-subtle,#24313B)]">
        {stages.map((stage, idx) => {
          if (!stage) return null;
          const isCompleted = stage.status === "completed" || idx < currentIdx;
          const isCurrent = idx === currentIdx;

          const prerequisite =
            idx === 0
              ? "Starting concept · No prerequisite"
              : `Prerequisite: Stage ${idx} (${stages[idx - 1]?.title ?? "Previous stage"})`;

          const estimatedMin = 30 + (idx % 3) * 15;

          return (
            <div
              key={idx}
              className={cn(
                "relative rounded-xl border p-4 sm:p-5 transition-all duration-200",
                isCurrent
                  ? "border-[var(--accent-lime,#B7F36B)]/40 bg-[var(--bg-surface-raised,#17212B)] shadow-md"
                  : isCompleted
                  ? "border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface,#121922)]/70 opacity-80 hover:opacity-100"
                  : "border-[var(--border-subtle,#24313B)]/60 bg-[var(--bg-surface,#121922)]/40 opacity-55"
              )}
            >
              {/* Timeline marker node */}
              <div
                className={cn(
                  "absolute -left-6 sm:-left-8 top-5 size-5 -translate-x-1/2 rounded-full border flex items-center justify-center text-[10px] font-bold",
                  isCompleted
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                    : isCurrent
                    ? "border-[var(--accent-lime,#B7F36B)] bg-[var(--bg-app,#0B0F14)] text-[var(--accent-lime,#B7F36B)] ring-2 ring-[var(--accent-lime,#B7F36B)]/30"
                    : "border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface-raised,#17212B)] text-[var(--text-muted,#71807C)]"
                )}
              >
                {isCompleted ? <Check className="size-3 stroke-[3]" /> : idx + 1}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border",
                        isCompleted
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                          : isCurrent
                          ? "border-[var(--accent-lime,#B7F36B)]/30 bg-[var(--accent-lime,#B7F36B)]/10 text-[var(--accent-lime,#B7F36B)]"
                          : "border-[var(--border-subtle,#24313B)] bg-[var(--bg-app,#0B0F14)] text-[var(--text-muted,#71807C)]"
                      )}
                    >
                      {isCompleted ? "Completed" : isCurrent ? "Active Concept" : "Locked"}
                    </span>
                    <span className="text-xs text-[var(--text-muted,#71807C)]">
                      Stage {idx + 1} of {stages.length}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[var(--text-primary,#F3F6F4)]">
                    {stage.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary,#A8B4B0)]">
                    <span className="flex items-center gap-1 text-[var(--text-muted,#71807C)]">
                      <Clock className="size-3" /> ~{estimatedMin} min
                    </span>
                    <span className="text-[var(--text-muted,#71807C)]">
                      {prerequisite}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  {isCurrent ? (
                    <Link
                      href={`/learning-paths/${path.slug}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent-lime,#B7F36B)] text-[#0B0F14] font-bold text-xs hover:bg-[var(--accent-lime-dark,#6B9B36)] transition-all shadow-sm"
                    >
                      Continue lesson <ArrowRight className="size-3.5" />
                    </Link>
                  ) : isCompleted ? (
                    <Link
                      href={`/learning-paths/${path.slug}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface-raised,#17212B)] text-xs font-semibold text-[var(--text-secondary,#A8B4B0)] hover:text-[var(--text-primary,#F3F6F4)] hover:border-[var(--border-strong,#33424D)] transition-colors"
                    >
                      <RotateCcw className="size-3" /> Review concept
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-[var(--text-muted,#71807C)] border border-[var(--border-subtle,#24313B)]/40 rounded-lg bg-[var(--bg-app,#0B0F14)]/50 cursor-not-allowed">
                      <Lock className="size-3" /> Locked
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
// 3. CURRICULUM EXPLORER: TOPICS & MISSIONS
// ══════════════════════════════════════════════════════════════════
function CurriculumExplorer({
  topics = [],
  missions = [],
  featuredPaths = [],
  activePath,
}: {
  topics?: Topic[];
  missions?: Mission[];
  featuredPaths?: FeaturedPath[];
  activePath?: ActivePath | null;
}) {
  const [activeTab, setActiveTab] = useState<"topics" | "missions" | "paths">("topics");

  const safeTopics = (topics ?? []).filter((t): t is Topic => Boolean(t && t.slug));
  const safeMissions = (missions ?? []).filter((m): m is Mission => Boolean(m && m.slug));
  const safePaths = (featuredPaths ?? []).filter((p): p is FeaturedPath => Boolean(p && p.slug));

  return (
    <section className="space-y-4 pt-2">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle,#24313B)] pb-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="size-4 text-[var(--accent-lime,#B7F36B)]" />
          <h2 className="text-base font-bold text-[var(--text-primary,#F3F6F4)]">Curriculum Library</h2>
        </div>
        <div className="flex items-center gap-1">
          {(["topics", "missions", "paths"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors",
                activeTab === tab
                  ? "bg-[var(--bg-surface-raised,#17212B)] text-[var(--text-primary,#F3F6F4)] border border-[var(--border-strong,#33424D)]"
                  : "text-[var(--text-secondary,#A8B4B0)] hover:text-[var(--text-primary,#F3F6F4)]"
              )}
            >
              {tab === "paths" ? "Paths" : tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "topics" && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {safeTopics.length === 0 ? (
            <p className="text-sm text-[var(--text-muted,#71807C)] py-6 col-span-2 text-center">
              No topics available yet.
            </p>
          ) : (
            safeTopics.slice(0, 12).map((topic) => {
              const isMastered = (topic.progress ?? 0) >= 100;

              return (
                <Link
                  key={topic.slug}
                  href={`/learn/topics/${topic.slug}`}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface,#121922)] hover:border-[var(--border-strong,#33424D)] hover:bg-[var(--bg-surface-raised,#17212B)] transition-all group"
                >
                  <div className="space-y-1 min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--text-primary,#F3F6F4)] truncate group-hover:text-[var(--accent-lime,#B7F36B)] transition-colors">
                        {topic.title}
                      </span>
                      <DiffBadge difficulty={topic.difficulty} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted,#71807C)]">
                      <span>{topic.minutes > 0 ? `~${topic.minutes}m` : "Self-paced"}</span>
                      {(topic.progress ?? 0) > 0 && (
                        <span className="font-mono text-[var(--accent-lime,#B7F36B)]">{topic.progress}% mastery</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-[var(--text-muted,#71807C)] group-hover:translate-x-0.5 transition-transform" />
                </Link>
              );
            })
          )}
        </div>
      )}

      {activeTab === "missions" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {safeMissions.length === 0 ? (
            <p className="text-sm text-[var(--text-muted,#71807C)] py-6 col-span-2 text-center">
              No missions available yet.
            </p>
          ) : (
            safeMissions.slice(0, 10).map((mission) => (
              <Link
                key={mission.slug}
                href={`/missions/${mission.slug}`}
                className="p-4 rounded-xl border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface,#121922)] hover:border-[var(--border-strong,#33424D)] hover:bg-[var(--bg-surface-raised,#17212B)] transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[var(--text-muted,#71807C)]">{mission.topic}</span>
                  <DiffBadge difficulty={mission.difficulty} />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary,#F3F6F4)] group-hover:text-[var(--accent-lime,#B7F36B)] transition-colors">
                  {mission.title}
                </h3>
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary,#A8B4B0)] pt-1 border-t border-[var(--border-subtle,#24313B)]/40">
                  <span className="flex items-center gap-1 text-[var(--text-muted,#71807C)]">
                    <Clock className="size-3" /> {mission.duration}
                  </span>
                  <span className="font-semibold text-[var(--accent-lime,#B7F36B)]">
                    {mission.status === "in_progress" ? "Resume →" : mission.status === "completed" ? "Review →" : "Start →"}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {activeTab === "paths" && (
        <div className="space-y-3">
          {safePaths.length === 0 ? (
            <p className="text-sm text-[var(--text-muted,#71807C)] py-6 text-center">
              No learning paths available yet.
            </p>
          ) : (
            safePaths.map((path) => {
              const isActive = Boolean(activePath?.slug && activePath.slug === path.slug);

              return (
                <Link
                  key={path.slug}
                  href={`/learning-paths/${path.slug}`}
                  className={cn(
                    "flex items-start justify-between p-4 rounded-xl border transition-all",
                    isActive
                      ? "border-[var(--accent-lime,#B7F36B)]/40 bg-[var(--bg-surface-raised,#17212B)]"
                      : "border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface,#121922)] hover:border-[var(--border-strong,#33424D)]"
                  )}
                >
                  <div className="space-y-1 min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[var(--text-primary,#F3F6F4)]">{path.title}</span>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[var(--accent-lime,#B7F36B)]/10 text-[var(--accent-lime,#B7F36B)] border border-[var(--accent-lime,#B7F36B)]/30">
                          Active Enrolled
                        </span>
                      )}
                      <DiffBadge difficulty={path.difficulty} />
                    </div>
                    <p className="text-xs text-[var(--text-secondary,#A8B4B0)] line-clamp-1">{path.description}</p>
                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted,#71807C)] pt-1">
                      <span>{path.stageCount} sequential stages</span>
                      {(path.progress ?? 0) > 0 && (
                        <span className="font-mono text-[var(--accent-lime,#B7F36B)]">{path.progress}% complete</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-[var(--text-muted,#71807C)] shrink-0 self-center" />
                </Link>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
// ROOT: LEARN PAGE VIEW
// ══════════════════════════════════════════════════════════════════
export function LearnPageView({ data }: { data: LearnPageData }) {
  const { heroMission, activePath, topics, missions, featuredPaths } = data || {};

  const safeHeroMission = heroMission && heroMission.slug ? heroMission : null;
  const safeActivePath = activePath && activePath.slug ? activePath : null;

  return (
    <div className="space-y-8 pb-8">
      {/* 1. Hero: Dominant Immediate Action */}
      <LearnHeroConcept mission={safeHeroMission} activePath={safeActivePath} />

      {/* 2. Structured Concept Sequence for Active Path */}
      {safeActivePath && (
        <ConceptSequenceList path={safeActivePath} />
      )}

      {/* 3. Curriculum Explorer */}
      <CurriculumExplorer
        topics={topics}
        missions={missions}
        featuredPaths={featuredPaths}
        activePath={safeActivePath}
      />
    </div>
  );
}

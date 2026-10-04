"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen, Brain, CheckCircle2, Clock, LucideIcon, RefreshCw, Target, TrendingUp, Trophy } from "lucide-react";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import type { Difficulty } from "@/lib/app-data";

/* ── Types ──────────────────────────────────────────── */
export type MissionStatus = "locked" | "not_started" | "in_progress" | "needs_revision" | "mastered" | "retained" | "completed";

/* ── Backward compat aliases (used in mission-workspace, etc.) ─ */
export { Surface as Card };

/* ── Surface ────────────────────────────────────────── */
export function Surface({
  children,
  className,
  level = "default",
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  level?: "default" | "elevated" | "inset";
  interactive?: boolean;
}) {
  const base = "rounded-[14px] p-5 sm:p-6";
  const levels = {
    default: "bg-(--bg-surface,#121922) border border-(--border-subtle,#24313B) shadow-xs dark:shadow-none text-(--text-primary,#F3F6F4)",
    elevated: "bg-(--bg-surface-raised,#17212B) border border-(--border-strong,#33424D) shadow-sm dark:shadow-none text-(--text-primary,#F3F6F4)",
    inset: "bg-(--bg-app,#0B0F14) border border-(--border-subtle,#24313B) text-(--text-primary,#F3F6F4)",
  };
  return (
    <section
      className={clsx(
        base,
        levels[level],
        interactive && "motion-card cursor-pointer hover:border-[var(--accent-lime,#B7F36B)]/40 hover:bg-(--bg-surface-hover,#1B2732)",
        className
      )}
    >
      {children}
    </section>
  );
}



/* ── Button / Link ──────────────────────────────────── */
export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  className?: string;
}) {
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-9 px-4 text-sm" };
  return (
    <Link
      href={href}
      className={clsx(
        "focus-ring pressable inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,#D8FF9D)]",
        sizes[size],
        variant === "primary" &&
          "bg-[var(--accent-lime,#B7F36B)] text-[#0B0F14] font-bold shadow-sm hover:bg-[var(--accent-lime-dark,#6B9B36)] hover:-translate-y-0.5",
        variant === "secondary" &&
          "border border-(--border-subtle,#24313B) bg-(--bg-surface-raised,#17212B) text-(--text-primary,#F3F6F4) hover:border-(--border-strong,#33424D) hover:bg-(--bg-surface-hover,#1B2732)",
        variant === "ghost" &&
          "text-(--text-secondary,#A8B4B0) hover:text-(--text-primary,#F3F6F4) hover:bg-(--bg-surface-hover,#1B2732)",
        variant === "danger" &&
          "border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/20",
        className
      )}
    >
      {children}
    </Link>
  );
}

/* ── Page header ─────────────────────────────────────── */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="font-mono text-xs uppercase tracking-wider mb-2 text-[var(--accent-lime,#B7F36B)] font-semibold">{eyebrow}</p>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-(--text-primary,#F3F6F4)">{title}</h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-(--text-secondary,#A8B4B0)">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

/* ── Section label ───────────────────────────────────── */
export function SectionLabel({
  eyebrow,
  title,
  action,
  accent = false,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={clsx("mb-5 flex items-end justify-between gap-4", accent && "border-l-2 border-[var(--accent-lime,#B7F36B)] pl-3")}>
      <div>
        {eyebrow && <p className="font-mono text-xs uppercase tracking-wider mb-1 text-[var(--accent-lime,#B7F36B)] font-semibold">{eyebrow}</p>}
        <h2 className="text-[16px] font-semibold tracking-tight text-(--text-primary,#F3F6F4)">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/* Keep old name working */
export function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return <SectionLabel eyebrow={eyebrow} title={title} action={action} />;
}

/* ── Mastery ring (animated) ────────────────────────── */
export function MasteryRing({
  value,
  label,
  size = "md",
  animate: shouldAnimate = false,
}: {
  value: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const degrees = Math.round(clamped * 3.6);
  const sizes = { sm: "size-16", md: "size-20", lg: "size-28" };
  const innerSizes = { sm: "size-[52px] text-sm", md: "size-[66px] text-base", lg: "size-[90px] text-xl" };
  return (
    <div
      className={clsx("grid shrink-0 place-items-center rounded-full", sizes[size])}
      style={{
        background: `conic-gradient(var(--accent-lime,#B7F36B) 0deg, var(--accent-teal,#58D6C0) ${degrees}deg, rgba(255,255,255,0.06) ${degrees}deg)`,
      }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={clsx("grid place-items-center rounded-full bg-(--bg-surface,#121922) text-center shadow-xs dark:shadow-none", innerSizes[size])}>
        <strong className="font-bold text-(--text-primary,#F3F6F4) leading-none tabular-nums font-mono">{clamped}%</strong>
        {label && <span className="mt-0.5 text-[8px] uppercase tracking-wider text-(--text-muted,#71807C)">{label}</span>}
      </div>
    </div>
  );
}

/* Keep old name working */
export function ProgressRing({ value, label }: { value: number; label?: string }) {
  return <MasteryRing value={value} label={label} />;
}

/* ── Progress track (animated) ───────────────────────── */
export function ProgressTrack({
  value,
  height = "default",
  color = "lime",
}: {
  value: number;
  height?: "thin" | "default";
  color?: "lime" | "purple" | "cyan" | "emerald" | "amber";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const heights = { thin: "h-1", default: "h-1.5" };
  const gradients = {
    lime: "from-[var(--accent-lime,#B7F36B)] to-emerald-400",
    purple: "from-[var(--accent-lime,#B7F36B)] to-[var(--accent-teal,#58D6C0)]",
    cyan: "from-cyan-400 to-teal-300",
    emerald: "from-emerald-400 to-teal-300",
    amber: "from-amber-400 to-yellow-300",
  };
  return (
    <div className={clsx("overflow-hidden rounded-full bg-(--bg-surface-raised,#17212B) border border-(--border-subtle,#24313B)/40", heights[height])}>
      <motion.div
        className={clsx("h-full rounded-full bg-gradient-to-r", gradients[color])}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

/* Keep old name working */
export function ProgressBar({ value }: { value: number }) {
  return <ProgressTrack value={value} />;
}

/* ── Status badge ────────────────────────────────────── */
const STATUS_STYLES: Record<string, { text: string; dot: string; label: string }> = {
  locked:         { text: "border-(--color-border) text-(--color-text-muted) bg-(--color-surface-2)", dot: "bg-(--color-text-muted)", label: "Locked" },
  not_started:    { text: "border-(--color-purple)/20 text-(--color-text-secondary) bg-(--color-purple-subtle)", dot: "bg-(--color-purple)", label: "Not started" },
  in_progress:    { text: "border-cyan-500/25 text-cyan-600 dark:text-cyan-300 bg-cyan-500/10", dot: "bg-cyan-500", label: "In progress" },
  needs_revision: { text: "border-amber-500/25 text-amber-600 dark:text-amber-300 bg-amber-500/10", dot: "bg-amber-500", label: "Needs revision" },
  mastered:       { text: "border-emerald-500/25 text-emerald-600 dark:text-emerald-300 bg-emerald-500/10", dot: "bg-emerald-500", label: "Mastered" },
  retained:       { text: "border-emerald-500/25 text-emerald-600 dark:text-emerald-200 bg-emerald-500/10", dot: "bg-emerald-500", label: "Retained" },
  completed:      { text: "border-emerald-500/25 text-emerald-600 dark:text-emerald-300 bg-emerald-500/10", dot: "bg-emerald-500", label: "Completed" },
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES["not_started"];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", style.text)}>
      <span className={clsx("size-1.5 rounded-full shrink-0", style.dot)} />
      {style.label}
    </span>
  );
}

/* ── Difficulty badge ────────────────────────────────── */
export function DifficultyBadge({ difficulty }: { difficulty: Difficulty | string }) {
  const tone =
    difficulty === "Hard" || difficulty === "Advanced"
      ? "border-rose-400/22 text-rose-300 bg-rose-400/[0.07]"
      : difficulty === "Medium"
      ? "border-amber-400/22 text-amber-300 bg-amber-400/[0.07]"
      : "border-emerald-400/22 text-emerald-300 bg-emerald-400/[0.07]";
  const dot =
    difficulty === "Hard" || difficulty === "Advanced" ? "bg-rose-400" : difficulty === "Medium" ? "bg-amber-400" : "bg-emerald-400";
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", tone)}>
      <span className={clsx("size-1.5 rounded-full shrink-0", dot)} />
      {difficulty}
    </span>
  );
}

/* Keep old name working */
export function DifficultyChip({ difficulty }: { difficulty: Difficulty }) {
  return <DifficultyBadge difficulty={difficulty} />;
}

/* ── Stat tile ───────────────────────────────────────── */
export function StatTile({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={13} className="text-purple-300/70 shrink-0" />}
        <p className="text-xs font-medium text-purple-100/45">{label}</p>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-white">{value}</p>
      {delta && (
        <p className="flex items-center gap-1 text-xs text-purple-100/45">
          <TrendingUp size={10} className="text-purple-300/60 shrink-0" />
          {delta}
        </p>
      )}
    </div>
  );
}

/* Keep old stat card working */
export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta: string;
  icon: LucideIcon;
}) {
  return (
    <Surface>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-purple-100/45">{label}</p>
        {Icon && (
          <span className="grid size-8 place-items-center rounded-lg border border-purple-300/18 bg-purple-300/[0.07] text-purple-300">
            <Icon size={14} />
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-purple-100/45">
        <TrendingUp size={10} className="text-purple-300/60 shrink-0" />
        {delta}
      </p>
    </Surface>
  );
}

/* ── Mission row ─────────────────────────────────────── */
export function MissionRow({
  mission,
}: {
  mission: {
    slug: string;
    title: string;
    topic: string;
    progress: number;
    duration: string;
    difficulty: string;
    status: string;
  };
}) {
  return (
    <Link
      href={`/missions/${mission.slug}`}
      className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 transition hover:border-purple-300/20 hover:bg-white/[0.035]"
    >
      <div className="min-w-0 flex-1 grid gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="label-xs text-purple-300/65">{mission.topic}</p>
          <DifficultyBadge difficulty={mission.difficulty as Difficulty} />
        </div>
        <h3 className="text-sm font-semibold text-white leading-snug">{mission.title}</h3>
        <div className="flex items-center gap-3">
          <div className="w-24 sm:w-32"><ProgressTrack value={mission.progress} height="thin" /></div>
          <span className="text-xs text-purple-100/40 tabular-nums">{mission.progress}%</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <StatusBadge status={mission.status} />
        <ArrowUpRight size={14} className="text-purple-100/30 transition group-hover:text-purple-300" />
      </div>
    </Link>
  );
}

/* Keep old name working */
export function MissionCard({ mission }: { mission: { slug: string; title: string; topic: string; progress: number; duration: string; difficulty: Difficulty; status: string } }) {
  return <MissionRow mission={mission} />;
}

/* ── Topic row ───────────────────────────────────────── */
export function TopicRow({
  topic,
}: {
  topic: {
    slug: string;
    title: string;
    description?: string;
    progress: number;
    difficulty: string;
    minutes?: number;
  };
}) {
  return (
    <Link
      href={`/learn/topics/${topic.slug}`}
      className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 transition hover:border-purple-300/20 hover:bg-white/[0.035]"
    >
      <div className="min-w-0 flex-1 grid gap-1.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">{topic.title}</h3>
          <DifficultyBadge difficulty={topic.difficulty as Difficulty} />
        </div>
        {topic.description && (
          <p className="text-xs text-purple-100/40 line-clamp-1">{topic.description}</p>
        )}
        <div className="flex items-center gap-3">
          <div className="w-28 sm:w-40"><ProgressTrack value={topic.progress} height="thin" /></div>
          <span className="text-xs text-purple-100/40 tabular-nums">
            {topic.progress > 0 ? `${topic.progress}%` : "Not started"}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {topic.minutes ? <span className="text-xs text-purple-100/35">{topic.minutes}m</span> : null}
        <ArrowUpRight size={14} className="text-purple-100/30 transition group-hover:text-purple-300" />
      </div>
    </Link>
  );
}

/* Keep old name working */
export function TopicCard({ topic }: { topic: { slug: string; title: string; progress: number; difficulty: Difficulty; patterns: string[]; minutes: number } }) {
  return <TopicRow topic={topic} />;
}

/* ── Problem row ─────────────────────────────────────── */
export function ProblemRow({
  problem,
}: {
  problem: {
    slug: string;
    title: string;
    source?: string;
    difficulty: string;
    pattern: string;
    confidence?: number;
    status?: string;
  };
}) {
  return (
    <Link
      href={`/practice/problems/${problem.slug}`}
      className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.03]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-white leading-snug">{problem.title}</h3>
          <DifficultyBadge difficulty={problem.difficulty as Difficulty} />
        </div>
        <p className="mt-1 text-xs text-purple-100/40">
          {problem.pattern}{problem.source ? ` · ${problem.source}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {problem.status && <StatusBadge status={problem.status} />}
        <ArrowUpRight size={14} className="text-purple-100/30 transition group-hover:text-cyan-300" />
      </div>
    </Link>
  );
}

/* Keep old name working */
export function ProblemCard({ problem }: { problem: { slug: string; title: string; source: string; difficulty: Difficulty; pattern: string; confidence: number } }) {
  return <ProblemRow problem={{ ...problem, status: undefined }} />;
}

/* ── Company card ────────────────────────────────────── */
export function CompanyCard({
  company,
}: {
  company: { slug: string; name: string; readiness: number; focus: string[]; sets: number };
}) {
  return (
    <Link
      href={`/companies/${company.slug}`}
      className="group flex flex-col gap-4 rounded-[14px] border border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-purple-300/20 hover:bg-white/[0.04]"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{company.name}</h3>
          <p className="mt-1 text-xs text-purple-100/40">{company.sets} problem sets</p>
        </div>
        <MasteryRing value={company.readiness} size="sm" />
      </div>
      <p className="text-xs text-purple-100/40 line-clamp-2">{company.focus.join(" · ")}</p>
    </Link>
  );
}

/* ── Confidence meter ────────────────────────────────── */
export function ConfidenceMeter({ value }: { value: number }) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <ProgressTrack value={value} />
      <span className="w-9 shrink-0 text-right text-[11px] font-medium text-purple-100/45">{value}%</span>
    </div>
  );
}

/* ── Empty slate ─────────────────────────────────────── */
const EMPTY_SLATE_CONFIGS = {
  mission: {
    icon: Target,
    title: "No active mission",
    description: "Publish missions and attach them to the active roadmap stage to start the learning flow.",
    iconColor: "text-purple-300",
    borderColor: "border-purple-400/20",
    bgColor: "bg-purple-400/[0.06]",
  },
  revision: {
    icon: RefreshCw,
    title: "Revision queue is clear",
    description: "You have no items due for review right now. Great work — come back after completing more missions.",
    iconColor: "text-emerald-300",
    borderColor: "border-emerald-400/20",
    bgColor: "bg-emerald-400/[0.06]",
  },
  practice: {
    icon: Brain,
    title: "No problems yet",
    description: "Published practice problems will appear here once added to the content library.",
    iconColor: "text-cyan-300",
    borderColor: "border-cyan-400/20",
    bgColor: "bg-cyan-400/[0.06]",
  },
  progress: {
    icon: TrendingUp,
    title: "No activity recorded",
    description: "Complete missions and solve problems to see your progress signals here.",
    iconColor: "text-purple-300",
    borderColor: "border-purple-400/20",
    bgColor: "bg-purple-400/[0.06]",
  },
  default: {
    icon: CheckCircle2,
    title: "Nothing here yet",
    description: "Content will appear here once it is published or created.",
    iconColor: "text-emerald-300",
    borderColor: "border-emerald-400/20",
    bgColor: "bg-emerald-400/[0.06]",
  },
  content: {
    icon: BookOpen,
    title: "No content found",
    description: "Published content from the admin studio will appear here.",
    iconColor: "text-purple-300",
    borderColor: "border-purple-400/20",
    bgColor: "bg-purple-400/[0.06]",
  },
  achievement: {
    icon: Trophy,
    title: "No achievements yet",
    description: "Complete learning milestones and missions to unlock achievements.",
    iconColor: "text-amber-300",
    borderColor: "border-amber-400/20",
    bgColor: "bg-amber-400/[0.06]",
  },
  time: {
    icon: Clock,
    title: "No sessions recorded",
    description: "Start a learning session to track your focus time.",
    iconColor: "text-cyan-300",
    borderColor: "border-cyan-400/20",
    bgColor: "bg-cyan-400/[0.06]",
  },
} as const;

export function EmptySlate({
  context = "default",
  title,
  description,
  action,
}: {
  context?: keyof typeof EMPTY_SLATE_CONFIGS;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const config = EMPTY_SLATE_CONFIGS[context] ?? EMPTY_SLATE_CONFIGS["default"];
  const Icon = config.icon;
  return (
    <div className="grid min-h-44 place-items-center rounded-[14px] border border-dashed border-white/[0.08] bg-white/[0.01] p-8 text-center">
      <div>
        <div className={clsx("mx-auto grid size-11 place-items-center rounded-2xl border", config.borderColor, config.bgColor)}>
          <Icon className={config.iconColor} size={20} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-white">{title ?? config.title}</h3>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-purple-100/42">{description ?? config.description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}

/* Keep old name working */
export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <EmptySlate title={title} description={description} action={action} />;
}

/* ── Skeleton block ──────────────────────────────────── */
export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={clsx("skeleton rounded-xl", className)} />;
}

/* ── Skeleton layouts ────────────────────────────────── */
export function SkeletonDashboard() {
  return (
    <div className="mx-auto max-w-[1240px] space-y-6 pb-12">
      {/* Zone 1: Context Header skeleton */}
      <div className="border-b border-(--border-subtle)/60 pb-4 pt-1 flex flex-col sm:flex-row justify-between gap-3 sm:items-center">
        <div className="space-y-2 flex-1">
          <SkeletonBlock className="h-7 w-60 rounded-lg" />
          <SkeletonBlock className="h-4 w-80 max-w-full rounded-md" />
        </div>
        <div className="flex gap-2">
          <SkeletonBlock className="h-8 w-28 rounded-lg" />
          <SkeletonBlock className="h-8 w-24 rounded-lg" />
          <SkeletonBlock className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      {/* Zone 2: Next Session Hero skeleton */}
      <div className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-6 sm:p-7 space-y-5">
        <div className="flex justify-between items-center">
          <SkeletonBlock className="h-5 w-44 rounded-full" />
          <SkeletonBlock className="h-4 w-32 rounded-md" />
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 flex-1 min-w-0">
            <SkeletonBlock className="h-8 w-3/4 max-w-md rounded-lg" />
            <SkeletonBlock className="h-4 w-full max-w-lg rounded-md" />
            <SkeletonBlock className="h-3 w-4/5 max-w-md rounded-md" />
          </div>
          <div className="flex gap-3 shrink-0">
            <SkeletonBlock className="h-11 w-36 rounded-xl" />
            <SkeletonBlock className="h-11 w-24 rounded-xl" />
          </div>
        </div>
        <div className="pt-2 border-t border-(--border-subtle)/60 space-y-2">
          <div className="flex justify-between">
            <SkeletonBlock className="h-3 w-20 rounded-md" />
            <SkeletonBlock className="h-3 w-24 rounded-md" />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <SkeletonBlock className="h-1.5 rounded-full" />
            <SkeletonBlock className="h-1.5 rounded-full" />
            <SkeletonBlock className="h-1.5 rounded-full" />
          </div>
        </div>
      </div>

      {/* Zone 3: Compact Progress Strip skeleton */}
      <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-3 sm:p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonBlock className="size-8 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1">
                <SkeletonBlock className="h-2.5 w-16 rounded-md" />
                <SkeletonBlock className="h-4 w-24 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Zone 4 & 5: Bento Row (Plan Spine + Review Queue) skeleton */}
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-(--border-subtle)/60">
            <SkeletonBlock className="h-4 w-40 rounded-md" />
            <SkeletonBlock className="h-4 w-24 rounded-md" />
          </div>
          <div className="flex items-center justify-between gap-3 pt-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <SkeletonBlock className="size-8 rounded-full" />
                <SkeletonBlock className="h-2.5 w-14 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-5 space-y-3">
          <div className="flex justify-between items-center pb-3 border-b border-(--border-subtle)/60">
            <SkeletonBlock className="h-4 w-28 rounded-md" />
            <SkeletonBlock className="h-4 w-16 rounded-full" />
          </div>
          <div className="space-y-2 pt-1">
            <SkeletonBlock className="h-14 rounded-lg" />
            <SkeletonBlock className="h-14 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Zone 6: Goal Checkpoint skeleton */}
      <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-5 flex flex-col lg:flex-row justify-between gap-4">
        <div className="space-y-2 flex-1">
          <SkeletonBlock className="h-3 w-32 rounded-md" />
          <SkeletonBlock className="h-5 w-64 rounded-md" />
          <SkeletonBlock className="h-3.5 w-96 max-w-full rounded-md" />
        </div>
        <SkeletonBlock className="h-9 w-40 rounded-xl shrink-0" />
      </div>

      {/* Zone 7: Activity Ribbon skeleton */}
      <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-5 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-(--border-subtle)/60">
          <SkeletonBlock className="h-4 w-48 rounded-md" />
          <SkeletonBlock className="h-5 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-7 gap-2 pt-1">
          {[...Array(28)].map((_, i) => (
            <SkeletonBlock key={i} className="aspect-square rounded-md" />
          ))}
        </div>
      </div>

      {/* Zone 8: Alternative Routes skeleton */}
      <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-4 space-y-3">
        <SkeletonBlock className="h-3.5 w-40 rounded-md" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[...Array(4)].map((_, i) => (
            <SkeletonBlock key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <SkeletonBlock key={i} className="h-16" />
      ))}
    </div>
  );
}

export function SkeletonProgress() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-end border-b border-(--color-border) pb-8 pt-2">
        <div className="space-y-2.5">
          <SkeletonBlock className="h-3 w-28 rounded-full" />
          <SkeletonBlock className="h-8 w-64 rounded-lg" />
          <SkeletonBlock className="h-4 w-80 rounded-md" />
        </div>
        <div className="flex gap-2">
          <SkeletonBlock className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-(--color-border) bg-(--color-surface-1) p-5 space-y-3">
            <SkeletonBlock className="h-3 w-20 rounded-full" />
            <SkeletonBlock className="h-7 w-16 rounded-md" />
            <SkeletonBlock className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rounded-2xl border border-(--color-border) bg-(--color-surface-1) p-6 space-y-4">
          <SkeletonBlock className="h-4 w-36 rounded-md" />
          <div className="h-64 flex items-center justify-center">
            <SkeletonBlock className="size-48 rounded-full" />
          </div>
        </div>
        <div className="lg:col-span-7 rounded-2xl border border-(--color-border) bg-(--color-surface-1) p-6 space-y-4">
          <SkeletonBlock className="h-4 w-40 rounded-md" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <SkeletonBlock key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonPractice() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-end border-b border-(--color-border) pb-6 pt-2">
        <div className="space-y-2">
          <SkeletonBlock className="h-3 w-24 rounded-full" />
          <SkeletonBlock className="h-8 w-56 rounded-lg" />
          <SkeletonBlock className="h-4 w-72 rounded-md" />
        </div>
        <div className="flex gap-2">
          <SkeletonBlock className="h-9 w-28 rounded-xl" />
          <SkeletonBlock className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      <div className="rounded-2xl border border-(--color-border) bg-(--color-surface-1) p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <SkeletonBlock className="h-10 w-full md:w-80 rounded-xl" />
        <div className="flex gap-2 w-full md:w-auto">
          <SkeletonBlock className="h-9 w-24 rounded-lg" />
          <SkeletonBlock className="h-9 w-24 rounded-lg" />
          <SkeletonBlock className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      <div className="space-y-2.5">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="rounded-xl border border-(--color-border) bg-(--color-surface-1) p-4 flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <SkeletonBlock className="h-4.5 w-1/3 rounded-md" />
              <div className="flex gap-2">
                <SkeletonBlock className="h-3 w-16 rounded-full" />
                <SkeletonBlock className="h-3 w-20 rounded-full" />
              </div>
            </div>
            <SkeletonBlock className="h-8 w-20 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonRevision() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <div className="flex justify-between items-end border-b border-(--color-border) pb-6 pt-2">
        <div className="space-y-2">
          <SkeletonBlock className="h-3 w-20 rounded-full" />
          <SkeletonBlock className="h-8 w-48 rounded-lg" />
          <SkeletonBlock className="h-4 w-64 rounded-md" />
        </div>
        <SkeletonBlock className="h-9 w-32 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-(--color-border) bg-(--color-surface-1) p-5 space-y-2">
            <SkeletonBlock className="h-3 w-20 rounded-full" />
            <SkeletonBlock className="h-8 w-14 rounded-md" />
          </div>
        ))}
      </div>

      <div className="space-y-3 pt-2">
        {[...Array(4)].map((_, i) => (
          <SkeletonBlock key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/* ── Weekly activity chart ───────────────────────────── */
type ActivityDay = {
  date?: string;
  activityScore?: number;
  minutes?: number;
  problemsSolved?: number;
  problemsAttempted?: number;
  revisionsDone?: number;
};

export function WeeklyChart({ data }: { data: (number | ActivityDay)[] }) {
  const days = ["M", "T", "W", "T", "F", "S", "S"];

  // Normalize: accept either plain numbers (legacy) or rich activity objects
  const normalized: ActivityDay[] = data.map((d) =>
    typeof d === "number"
      ? { activityScore: d, minutes: d }
      : d
  );

  const scores = normalized.map((d) => d.activityScore ?? d.minutes ?? 0);
  const maxScore = Math.max(...scores, 1);
  const hasActivity = scores.some((s) => s > 0);

  if (!hasActivity) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
        <div className="text-purple-300/40 text-sm font-medium">No activity yet this week</div>
        <div className="text-purple-100/30 text-xs max-w-[220px] leading-relaxed">
          Solve problems, complete missions, or do revision to track your daily activity.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-36 items-end gap-1.5 group/chart">
      {normalized.map((day, index) => {
        const score = day.activityScore ?? day.minutes ?? 0;
        const pct = Math.round((score / maxScore) * 100);
        const label = day.date
          ? new Date(day.date).toLocaleDateString("en-US", { weekday: "short" }).charAt(0)
          : days[index] ?? "?";

        const tooltipParts: string[] = [];
        if ((day.minutes ?? 0) > 0) tooltipParts.push(`${day.minutes}m study`);
        if ((day.problemsSolved ?? 0) > 0) tooltipParts.push(`${day.problemsSolved} solved`);
        if ((day.revisionsDone ?? 0) > 0) tooltipParts.push(`${day.revisionsDone} reviews`);
        const tooltip = tooltipParts.length > 0 ? tooltipParts.join(" · ") : "No activity";

        return (
          <div key={index} className="relative flex flex-1 flex-col items-center gap-1.5 group/bar" title={tooltip}>
            {/* Hover tooltip */}
            {score > 0 && (
              <div className="absolute bottom-full mb-2 hidden group-hover/bar:block z-10 pointer-events-none">
                <div className="rounded-lg bg-[#1a0d2e] border border-purple-400/20 px-2 py-1.5 text-[10px] font-medium text-purple-100/80 whitespace-nowrap shadow-lg">
                  {tooltip}
                </div>
              </div>
            )}
            <motion.div
              className={clsx(
                "w-full min-h-[3px] rounded-md transition-opacity",
                score > 0
                  ? "bg-gradient-to-t from-purple-600 to-fuchsia-300 opacity-85 shadow-[0_0_10px_rgba(168,85,247,0.12)] group-hover/bar:opacity-100 group-hover/bar:shadow-[0_0_16px_rgba(168,85,247,0.25)]"
                  : "bg-white/[0.05]"
              )}
              style={{ height: `${Math.max(score > 0 ? 8 : 3, pct)}%` }}
              initial={{ height: "3%" }}
              animate={{ height: `${Math.max(score > 0 ? 8 : 3, pct)}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: index * 0.05 }}
            />
            <span className={clsx("text-[9px] font-medium", score > 0 ? "text-purple-100/50" : "text-purple-100/22")}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Mission stage timeline ──────────────────────────── */
export function MissionStageTimeline({
  stages,
}: {
  stages: Array<{ key: string; kind: string; status: "completed" | "active" | "locked" }>;
}) {
  return (
    <div className="space-y-0">
      {stages.map((stage, index) => {
        const isLast = index === stages.length - 1;
        const stateColors = {
          completed: { dot: "bg-emerald-400 border-emerald-400/50", line: "bg-emerald-400/30", text: "text-emerald-300" },
          active:    { dot: "bg-cyan-400 border-cyan-400/50 shadow-[0_0_8px_rgba(34,211,238,0.5)]", line: "bg-white/[0.07]", text: "text-cyan-200" },
          locked:    { dot: "bg-white/[0.08] border-white/[0.1]", line: "bg-white/[0.07]", text: "text-purple-100/35" },
        };
        const colors = stateColors[stage.status];
        return (
          <div key={stage.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={clsx("size-2.5 shrink-0 rounded-full border", colors.dot)} />
              {!isLast && <div className={clsx("mt-1 w-px flex-1", colors.line)} style={{ minHeight: "24px" }} />}
            </div>
            <p className={clsx("pb-4 text-xs font-medium capitalize leading-tight", colors.text)}>
              {stage.kind.replace("_", " ")}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ── Timeline ────────────────────────────────────────── */
export function Timeline({ items }: { items: string[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item} className="flex gap-3">
          <div className="flex flex-col items-center gap-1">
            <span className="grid size-5 shrink-0 place-items-center rounded-full border border-purple-400/25 bg-purple-400/[0.07] text-[9px] font-bold text-purple-300">
              {index + 1}
            </span>
            {index < items.length - 1 && <span className="w-px flex-1 bg-white/[0.06]" style={{ minHeight: "12px" }} />}
          </div>
          <p className="pb-2 text-xs leading-5 text-purple-100/52">{item}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Product Page Layout ─────────────────────────────── */
export function ProductPage({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-8 pb-10">
      <PageHeader title={title} description={description} />
      {children}
    </div>
  );
}

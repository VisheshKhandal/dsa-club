"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Flame, ArrowRight, Clock, Target, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ClubIntelligenceCardProps {
  activePlan: {
    id: string;
    status: string;
    cycleNumber: number;
    totalDays: number;
    currentDayIndex: number;
    cyclePacePercent?: number;
    todayTaskCompletionPercent?: number;
    cycleTaskCompletionPercent?: number;
    masteryPercent?: number;
    topicDisplayState?: "not_assessed" | "in_progress" | "mastered";
    dayStatus: string;
    dayTitle: string;
    dayFocus: string;
    topicSlug: string;
    topicName: string;
    dailyMinutes: number;
    tasksCount: number;
    completedTasksCount: number;
  } | null;
  focusAction?: {
    title: string;
    href: string;
    planRelation?: string;
    estimatedMinutes?: number;
    planDayIndex?: number;
    label?: string;
    whyThisIsNext?: string;
    afterCompletionOutcome?: string;
  } | null;
  progressMetrics?: any;
  streakDays: number;
}

export function ClubIntelligenceCard({
  activePlan,
  focusAction,
  progressMetrics,
  streakDays,
}: ClubIntelligenceCardProps) {
  const planDay = progressMetrics?.currentDayIndex ?? activePlan?.currentDayIndex ?? 1;
  const totalDays = progressMetrics?.totalDays ?? activePlan?.totalDays ?? 21;
  const cyclePacePercent =
    progressMetrics?.cyclePacePercent ??
    activePlan?.cyclePacePercent ??
    Math.min(100, Math.round((planDay / totalDays) * 100));
  const completedTasks = progressMetrics?.todayCompletedTasksCount ?? activePlan?.completedTasksCount ?? 0;
  const totalTasks = progressMetrics?.todayTasksCount ?? activePlan?.tasksCount ?? 0;
  const masteryPercent = progressMetrics?.masteryPercent ?? activePlan?.masteryPercent ?? 0;
  const isNotAssessed =
    progressMetrics?.topicDisplayState === "not_assessed" ||
    activePlan?.topicDisplayState === "not_assessed" ||
    (masteryPercent === 0 && !progressMetrics?.topicDisplayState && !activePlan?.topicDisplayState);

  // Dedicated empty / self-paced state when no active plan exists
  if (!activePlan) {
    if (focusAction?.title && focusAction?.href) {
      return (
        <div className="relative overflow-hidden rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-5 sm:p-6 shadow-sm hover:border-(--accent-lime)/40 transition-all">
          <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-(--accent-lime)/5 blur-3xl" aria-hidden="true" />
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-(--accent-lime)/30 bg-(--accent-lime)/10 px-2.5 py-0.5 text-xs font-semibold text-(--accent-lime)">
                  <Sparkles className="size-3.5" aria-hidden />
                  Self-Paced Practice
                </span>
                <span className="text-xs text-(--text-muted)">
                  Today's Next Action · Practice at your own pace
                </span>
              </div>
              <Link
                href="/intelligence?tab=manage"
                className="text-xs font-medium text-(--text-secondary) hover:text-(--accent-lime) transition-colors"
              >
                Create structured plan →
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-(--text-muted)">
                  <Clock className="size-3.5" />
                  <span>About {focusAction?.estimatedMinutes ?? 25} minutes</span>
                  <span>·</span>
                  <span className="text-(--accent-lime)">Recommended Problem</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-(--text-primary)">
                  {focusAction.title}
                </h3>
                <p className="text-xs sm:text-sm text-(--text-secondary) max-w-xl">
                  {focusAction.whyThisIsNext || (focusAction as any)?.reason || "Highest value practice step based on your recent activity."}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href={focusAction.href.startsWith("/problems/") ? `/practice${focusAction.href}` : focusAction.href}
                  className="inline-flex items-center gap-2 rounded-xl bg-(--accent-lime) px-5 py-2.5 text-sm font-semibold text-black hover:bg-(--accent-lime-hover) transition-all shadow-sm"
                >
                  <span>Solve in Editor</span>
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative overflow-hidden rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-(--accent-lime)/30 bg-(--accent-lime)/10 px-2.5 py-0.5 text-xs font-semibold text-(--accent-lime)">
              <Sparkles className="size-3.5" aria-hidden />
              Study Plan
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-(--text-primary)">
              No Active Learning Plan
            </h2>
            <p className="text-xs sm:text-sm text-(--text-secondary) max-w-xl">
              Calibrate your target goals, company focus, and daily pace to generate an authoritative study plan with daily structured tasks.
            </p>
          </div>
          <Link
            href="/intelligence?tab=manage"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-(--accent-lime) px-5 py-2.5 text-sm font-semibold text-black hover:bg-(--accent-lime-hover) transition-all shrink-0"
          >
            <span>Create my plan</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Dedicated paused state when plan is paused
  if (activePlan.status === "paused") {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                <Sparkles className="size-3.5" aria-hidden />
                Plan Paused
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-(--text-primary)">
                Schedule Paused at Day {planDay} of {totalDays}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-xl">
                Your daily tasks and target completion dates are frozen. Resume your plan whenever you're ready to continue tracking evidence.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/intelligence?tab=manage"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-(--accent-lime) px-5 py-2.5 text-sm font-semibold text-black hover:bg-(--accent-lime-hover) transition-all shrink-0"
              >
                <span>Resume plan</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          {focusAction?.title && (
            <div className="mt-2 pt-4 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                  Exploratory Next Action (Self-Paced)
                </div>
                <div className="text-sm font-bold text-(--text-primary)">
                  {focusAction.title}
                </div>
                <div className="text-xs text-zinc-400">
                  About {focusAction?.estimatedMinutes ?? 25} minutes · Solve freely without schedule pressure
                </div>
              </div>
              {focusAction.href && (
                <Link
                  href={focusAction.href.startsWith("/problems/") ? `/practice${focusAction.href}` : focusAction.href}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/30 transition-all shrink-0"
                >
                  <span>Solve in Editor</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const planRelation = focusAction?.planRelation || "planned_today";
  const relationLabel =
    planRelation === "planned_today"
      ? "Planned Today"
      : planRelation === "plan_revision"
      ? "In-Plan Review"
      : planRelation === "plan_recovery"
      ? "Recovery Action"
      : planRelation === "plan_extension"
      ? "Cycle Extension"
      : "Outside Plan";

  const relationBadgeColor =
    planRelation === "planned_today"
      ? "bg-(--accent-lime)/15 text-(--accent-lime) border-(--accent-lime)/30"
      : planRelation === "plan_revision"
      ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
      : planRelation === "plan_recovery"
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-zinc-800 text-zinc-300 border-zinc-700";

  const whyThisIsNextText =
    focusAction?.whyThisIsNext ||
    (focusAction as any)?.reason ||
    activePlan?.dayFocus ||
    "Your plan is building foundational problem patterns before moving to advanced algorithms.";

  const afterFinishOutcomeText =
    focusAction?.afterCompletionOutcome ||
    (totalTasks > completedTasks + 1
      ? "Unlocks the next task in today's session."
      : `Completes Day ${planDay} tasks and advances cycle schedule.`);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-5 sm:p-6",
        "transition-all duration-200 hover:border-(--accent-lime)/40 shadow-sm"
      )}
    >
      {/* Background Ambient Glow */}
      <div
        className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-(--accent-lime)/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-4">
        {/* Top Header: System Label, Metrics, and Link */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-(--accent-lime)/30 bg-(--accent-lime)/10 px-2.5 py-0.5 text-xs font-semibold text-(--accent-lime)">
              <Sparkles className="size-3.5" aria-hidden />
              Next up
            </span>
            <span className="text-xs text-(--text-muted)">
              Cycle {activePlan?.cycleNumber ?? 1} · Powered by Club Intelligence
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Plan Day vs Streak Day distinction */}
            <div className="flex items-center gap-2 rounded-lg border border-(--border-subtle) bg-(--bg-surface-raised) px-2.5 py-1 text-xs">
              <span className="font-semibold text-(--text-primary)">
                Plan Day {planDay} of {totalDays}
              </span>
              <span className="text-zinc-600">·</span>
              <span className="inline-flex items-center gap-1 text-(--accent-lime) font-medium">
                <Flame className="size-3 text-(--accent-lime)" aria-hidden />
                {streakDays > 0 ? `${streakDays}d streak` : "1d streak"}
              </span>
            </div>

            <Link
              href="/intelligence?tab=today"
              className="inline-flex items-center gap-1 text-xs font-semibold text-(--text-secondary) hover:text-(--accent-lime) transition-colors"
            >
              View Full Plan <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>

        {/* Middle Content: Next Up Task Details — Answers What, Why, How Long, What happens after */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
                  relationBadgeColor
                )}
              >
                {relationLabel}
              </span>
              <span className="text-xs text-(--text-muted) flex items-center gap-1">
                <Target className="size-3 text-(--text-muted)" />
                {activePlan?.topicName ?? "DSA Fundamentals"}
              </span>
              <span className="text-xs text-(--text-muted) flex items-center gap-1">
                <Clock className="size-3 text-(--text-muted)" />
                About {focusAction?.estimatedMinutes ?? activePlan?.dailyMinutes ?? 30} minutes
              </span>
            </div>

            {/* 1. What do I do? */}
            <h2 className="text-base sm:text-xl font-bold text-(--text-primary) truncate">
              {focusAction?.title || activePlan?.dayTitle || "Today's Structured Session"}
            </h2>

            {/* 2. Why do I do it? */}
            <p className="text-xs sm:text-sm text-(--text-secondary) line-clamp-2">
              <strong className="text-(--text-primary) font-medium">Why this is next:</strong>{" "}
              {whyThisIsNextText}
            </p>

            {/* 4. What happens after I finish? */}
            <p className="text-xs text-(--text-muted) flex items-center gap-1 pt-0.5">
              <strong className="text-(--text-secondary) font-medium">After finish:</strong>{" "}
              <span>{afterFinishOutcomeText}</span>
            </p>
          </div>

          {/* Primary Action Button (Start task CTA) */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={focusAction?.href || "/intelligence?tab=today"}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold",
                "bg-(--accent-lime) text-black hover:bg-(--accent-lime-hover) transition-all active:scale-[0.98] shadow-sm"
              )}
            >
              <span>{focusAction?.label || "Start task"}</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        {/* Schedule Calendar Pace & Evidence Separation */}
        <div className="pt-2 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-(--text-muted)">
            <span>
              {totalTasks > 0 ? (
                <>
                  Today Status: <strong className="text-(--text-primary) font-semibold">{completedTasks} of {totalTasks} tasks complete</strong>
                  {totalTasks > completedTasks ? ` · ~${Math.max(0, (focusAction?.estimatedMinutes || 20) * (totalTasks - completedTasks))}m remaining` : " · All today's tasks complete!"}
                </>
              ) : (
                `Plan Position: Day ${planDay} of ${totalDays}`
              )}
            </span>
            <span
              className="font-tabular font-medium text-(--text-secondary)"
              title="Calendar schedule timeline pace (Day / Total Days)"
            >
              Day {planDay}/{totalDays} ({cyclePacePercent}% cycle pace)
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-(--bg-surface-raised)">
            <div
              className="h-full rounded-full bg-gradient-to-r from-(--accent-lime) to-emerald-400 transition-all duration-300"
              style={{ width: `${cyclePacePercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5">
            <span>Calendar position · Not topic mastery</span>
            <span className={cn(isNotAssessed ? "text-zinc-500 italic" : "text-(--accent-lime) font-medium")}>
              {isNotAssessed ? "Topic Mastery: Not assessed yet" : `Topic Mastery: ${masteryPercent}%`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

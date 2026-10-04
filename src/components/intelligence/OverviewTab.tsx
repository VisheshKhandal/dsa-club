"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Layers,
  Target,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Info,
  Check,
  History,
  Sliders,
  Flag,
  HelpCircle,
} from "lucide-react";
import { useReducedMotion } from "framer-motion";
import type { IntelligenceViewProps } from "./types";
import { PLAN_GRAMMAR } from "./plan-visual-grammar";
import { cn } from "@/lib/utils";

// Helper for human-readable dates
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr || "";
  }
}

interface CurriculumStage {
  id: string;
  stageNumber: number;
  title: string;
  focus: string;
  startDay: number;
  endDay: number;
  stageDays: IntelligenceViewProps["days"];
  status: "completed" | "current" | "upcoming";
  hasCheckpoint: boolean;
  checkpointDayIndex: number;
  isCheckpointPassed: boolean;
  completedDaysCount: number;
}

interface PlanHistoryEvent {
  id: string;
  date: string;
  title: string;
  category: "recalibration" | "milestone" | "calibration" | "pause" | "adaptation";
  categoryLabel: string;
  badgeClass: string;
  summary: string;
  whyChanged: string;
  details?: string[];
}

export function OverviewTab(props: IntelligenceViewProps) {
  const {
    plan,
    days = [],
    tasks = [],
    decisions = [],
    snapshot,
    completedDaysCount = 0,
    activeTopicName = "DSA Fundamentals",
  } = props;

  const shouldReduceMotion = useReducedMotion();

  // Active day resolution
  const currentAvailableDay =
    snapshot?.currentPlanDay ||
    days.find((d) => d.status === "in_progress") ||
    days.find((d) => d.status === "available") ||
    days[0];

  const totalDays = plan?.totalDays || days.length || 18;
  const currentDayIndex = currentAvailableDay?.dayIndex ?? 1;

  // Real completed days count
  const actualCompletedDays = useMemo(() => {
    if (typeof completedDaysCount === "number" && completedDaysCount > 0) {
      return completedDaysCount;
    }
    return days.filter((d) => d.status === "completed").length;
  }, [days, completedDaysCount]);

  const planProgressPercent = Math.min(100, Math.round((actualCompletedDays / totalDays) * 100));

  // Today's tasks resolution
  const todayTasks: any[] =
    snapshot?.todayTasks && snapshot.todayTasks.length > 0
      ? snapshot.todayTasks
      : tasks.filter((t) => currentAvailableDay && t.planDayId === currentAvailableDay.id);

  const todayTasksCount = todayTasks.length;
  const todayCompletedCount = todayTasks.filter((t: any) => t.status === "completed").length;
  const todayTaskCompletionPercent =
    todayTasksCount > 0 ? Math.round((todayCompletedCount / todayTasksCount) * 100) : 0;
  const isTodayComplete = todayTasksCount > 0 && todayCompletedCount === todayTasksCount;

  // Primary action recommendation
  const primaryAction =
    snapshot?.primaryTodayAction || (decisions.length > 0 ? decisions[0].selectedAction : null);

  // Schedule Health computation
  const isPlanPaused = plan?.status === "paused";
  const incompletePastDays = useMemo(() => {
    return days.filter((d) => d.dayIndex < currentDayIndex && d.status !== "completed");
  }, [days, currentDayIndex]);

  const isScheduleAhead = actualCompletedDays > currentDayIndex;

  const scheduleHealthState = useMemo(() => {
    if (isPlanPaused) {
      return {
        status: "paused" as const,
        label: "Plan Paused",
        badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-300",
        description: "Timer is frozen; resume in Manage tab.",
      };
    }
    if (incompletePastDays.length >= 2) {
      return {
        status: "at_risk" as const,
        label: `At Risk · ${incompletePastDays.length}d Drift`,
        badgeClass: "border-red-500/30 bg-red-500/10 text-red-300",
        description: `${incompletePastDays.length} past milestones need rebalancing.`,
      };
    }
    if (incompletePastDays.length === 1) {
      return {
        status: "behind" as const,
        label: "Behind by 1 Day",
        badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-300",
        description: "1 pending past session; rebalance recommended.",
      };
    }
    if (isScheduleAhead) {
      return {
        status: "ahead" as const,
        label: "Ahead of Pace",
        badgeClass: "border-(--accent-lime)/30 bg-(--accent-lime)/10 text-(--accent-lime)",
        description: "Executing ahead of target calibration.",
      };
    }
    return {
      status: "on_track" as const,
      label: "On Track",
      badgeClass: "border-teal-500/30 bg-teal-500/10 text-teal-300",
      description: "Pacing aligned with daily sprint target.",
    };
  }, [isPlanPaused, incompletePastDays.length, isScheduleAhead]);

  // Schedule-derived Finish Forecast Date
  const forecastFinishDate = useMemo(() => {
    const slipDays = incompletePastDays.length;
    const pausedDays = plan?.pausedDaysCount || 0;

    if (plan?.targetCompletionDate) {
      try {
        const baseTarget = new Date(plan.targetCompletionDate);
        if (!isNaN(baseTarget.getTime())) {
          const forecasted = new Date(baseTarget.getTime() + (slipDays + pausedDays) * 86400000);
          return formatDate(forecasted.toISOString());
        }
      } catch {}
    }

    if (plan?.startDate) {
      try {
        const start = new Date(plan.startDate);
        if (!isNaN(start.getTime())) {
          const remainingDays = Math.max(0, totalDays - actualCompletedDays);
          const forecasted = new Date(Date.now() + remainingDays * 86400000);
          return formatDate(forecasted.toISOString());
        }
      } catch {}
    }

    return `Day ${totalDays} Target`;
  }, [plan?.startDate, plan?.targetCompletionDate, plan?.pausedDaysCount, totalDays, actualCompletedDays, incompletePastDays.length]);

  // Dynamic Curriculum Stages resolution
  const stages: CurriculumStage[] = useMemo(() => {
    const stageCount = Math.max(1, Math.ceil(totalDays / 7));
    const result: CurriculumStage[] = [];

    const stageDefaults: Record<number, { title: string; defaultFocus: string }> = {
      1: {
        title: "Foundations & Memory Invariants",
        defaultFocus: "Core pointer semantics, memory invariants, and basic problem framing.",
      },
      2: {
        title: "Pattern Recognition & Application",
        defaultFocus: "Dynamic state expansion, frequency window sizing, and dual constraints.",
      },
      3: {
        title: "Edge Cases & Synthesis",
        defaultFocus: "Multi-pass integration, boundary conditions, and timed synthesis.",
      },
      4: {
        title: "Speed Drills & Final Polish",
        defaultFocus: "Timed execution drills, space optimization, and mock interview consolidation.",
      },
    };

    for (let s = 1; s <= stageCount; s++) {
      const startDay = (s - 1) * 7 + 1;
      const endDay = Math.min(totalDays, s * 7);
      const stageDays = days.filter((d) => d.dayIndex >= startDay && d.dayIndex <= endDay);

      const stageCompletedDays = stageDays.filter((d) => d.status === "completed").length;
      const allDaysCompleted = stageDays.length > 0 && stageCompletedDays === stageDays.length;
      const isCurrentStage = currentDayIndex >= startDay && currentDayIndex <= endDay;

      let status: CurriculumStage["status"] = "upcoming";
      if (allDaysCompleted && currentDayIndex > endDay) {
        status = "completed";
      } else if (isCurrentStage) {
        status = "current";
      } else if (currentDayIndex > endDay) {
        status = "completed";
      }

      // Checkpoint resolution
      const checkpoint =
        stageDays.find((d) => d.isCheckpointDay || d.dayIndex % 7 === 0 || d.dayIndex === endDay) ||
        stageDays[stageDays.length - 1];
      const checkpointDayIndex = checkpoint?.dayIndex ?? endDay;
      const isCheckpointPassed = Boolean(checkpoint && checkpoint.status === "completed");

      // Dynamic title & focus from real days if available
      const sampleDay = stageDays[0];
      const stageTitle =
        sampleDay?.topicName && stageCount > 1 && sampleDay.topicName !== activeTopicName
          ? sampleDay.topicName
          : stageDefaults[s]?.title || `Stage ${s} Mastery`;

      const stageFocus =
        sampleDay?.focus || stageDefaults[s]?.defaultFocus || "Core pattern invariants and scheduled consolidation.";

      result.push({
        id: `stage-${s}`,
        stageNumber: s,
        title: stageTitle,
        focus: stageFocus,
        startDay,
        endDay,
        stageDays,
        status,
        hasCheckpoint: Boolean(checkpoint),
        checkpointDayIndex,
        isCheckpointPassed,
        completedDaysCount: stageCompletedDays,
      });
    }

    return result;
  }, [totalDays, days, currentDayIndex, activeTopicName]);

  const activeStage = stages.find((s) => s.status === "current") || stages[0];
  const activeStageNumber = activeStage?.stageNumber ?? 1;

  // Next upcoming checkpoint resolution
  const nextCheckpointDay = useMemo(() => {
    const upcoming = days.find(
      (d) =>
        (d.isCheckpointDay || d.dayIndex % 7 === 0) &&
        d.dayIndex >= currentDayIndex &&
        d.status !== "completed"
    );
    if (upcoming) return upcoming;
    const futureCheckpoint = days.find(
      (d) => (d.isCheckpointDay || d.dayIndex % 7 === 0) && d.dayIndex >= currentDayIndex
    );
    if (futureCheckpoint) return futureCheckpoint;
    return days.find((d) => d.isCheckpointDay || d.dayIndex % 7 === 0) || days[days.length - 1];
  }, [days, currentDayIndex]);

  const checkpointDaysAway = nextCheckpointDay
    ? Math.max(0, nextCheckpointDay.dayIndex - currentDayIndex)
    : 0;

  // Look-Ahead Schedule: Next 3 Days
  const upcomingThreeDays = useMemo(() => {
    return days.filter((d) => d.dayIndex > currentDayIndex).slice(0, 3);
  }, [days, currentDayIndex]);

  // Plan History & Recalibrations Synthesis
  const historyEvents: PlanHistoryEvent[] = useMemo(() => {
    const list: PlanHistoryEvent[] = [];

    // 1. Log real recalibration decisions
    decisions.forEach((dec) => {
      const isRecalibration =
        dec.surface === "recalibration" ||
        dec.decisionType?.toLowerCase().includes("recalibrat") ||
        dec.decisionType?.toLowerCase().includes("rebalance");

      list.push({
        id: `decision-${dec.id}`,
        date: formatDate(dec.createdAt),
        title: dec.selectedAction?.title || (isRecalibration ? "Schedule Recalibration" : "Policy Guidance"),
        category: isRecalibration ? "recalibration" : "adaptation",
        categoryLabel: isRecalibration ? "Recalibration" : "Adaptive Policy",
        badgeClass: isRecalibration
          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
          : "border-sky-500/30 bg-sky-500/10 text-sky-300",
        summary: dec.primaryReason,
        whyChanged: dec.primaryReason,
        details: dec.secondaryReasons && dec.secondaryReasons.length > 0 ? dec.secondaryReasons : undefined,
      });
    });

    // 2. Pause events if applicable
    if (plan && plan.pausedDaysCount > 0) {
      list.push({
        id: "plan-pause-event",
        date: formatDate(plan.startDate),
        title: `Pace Adjusted (${plan.pausedDaysCount} Paused Days)`,
        category: "pause",
        categoryLabel: "Timeline Shift",
        badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-300",
        summary: "Curriculum schedule shifted to preserve mastery without pacing penalties.",
        whyChanged:
          "Plan timer was frozen during break intervals. Milestones shifted forward so daily study workload remained steady.",
      });
    }

    // 3. Completed Checkpoint Milestones
    days
      .filter((d) => (d.isCheckpointDay || d.dayIndex % 7 === 0) && d.status === "completed")
      .forEach((chk) => {
        list.push({
          id: `checkpoint-passed-${chk.dayIndex}`,
          date: formatDate(chk.dateKey),
          title: `Stage Checkpoint Passed · Day ${chk.dayIndex}`,
          category: "milestone",
          categoryLabel: "Milestone Verified",
          badgeClass: "border-teal-500/30 bg-teal-500/10 text-teal-300",
          summary: `Retention checkpoint successfully consolidated for ${chk.topicName || activeTopicName}.`,
          whyChanged:
            "Spaced repetition decay analysis validated pattern recognition and conceptual invariant retention.",
        });
      });

    // 4. Initial Calibration
    if (plan) {
      list.push({
        id: "initial-plan-calibration",
        date: formatDate(plan.startDate),
        title: `Cycle ${plan.cycleNumber} Initial Calibration`,
        category: "calibration",
        categoryLabel: "Plan Generated",
        badgeClass: "border-(--accent-lime)/30 bg-(--accent-lime)/10 text-(--accent-lime)",
        summary: `Curriculum calibrated for ${plan.experienceLevel} level and ${plan.goal} track.`,
        whyChanged: `Calibrated baseline starting point targeting ${plan.dailyMinutes}m daily allocation across ${totalDays} structured days with ${plan.difficultyPreference} difficulty curve.`,
        details: [
          `Goal: ${plan.goal}`,
          `Target Focus: ${plan.dailyMinutes} minutes / day`,
          `Language: ${plan.language}`,
          `Difficulty Profile: ${plan.difficultyPreference}`,
        ],
      });
    }

    return list;
  }, [decisions, plan, days, totalDays, activeTopicName]);

  if (!plan) {
    return (
      <div className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-8 text-center space-y-3 w-full">
        <Sparkles className="mx-auto size-10 text-(--accent-lime) mb-2" />
        <h3 className="text-lg font-semibold text-(--text-primary)">No Active Learning Plan</h3>
        <p className="mt-1 text-sm text-(--text-secondary) max-w-md mx-auto">
          Activate a structured plan to align your daily DSA practice with your interview targets.
        </p>
        <Link
          href="/intelligence?tab=manage"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-(--accent-lime) px-4 py-2 text-sm font-semibold text-black hover:bg-(--accent-lime-hover) transition-all"
        >
          Create my plan <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      {/* ── 1. PLAN MAP HERO COCKPIT ── */}
      <div className="relative overflow-hidden rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-6 sm:p-7 shadow-sm">
        <div
          className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-(--accent-lime)/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col gap-6">
          {/* Header Metadata Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-(--accent-lime)/30 bg-(--accent-lime)/10 px-3 py-0.5 text-xs font-semibold text-(--accent-lime)">
                  <Sparkles className="size-3.5" />
                  Cycle {plan.cycleNumber} · {plan.status.toUpperCase()}
                </span>
                <span className="text-xs text-(--text-muted)">
                  Started {formatDate(plan.startDate)}
                </span>
                <span className="rounded-full border border-(--border-subtle) bg-(--bg-surface-raised) px-2.5 py-0.5 text-[11px] font-medium text-(--text-muted)">
                  {totalDays}-Day Sprint
                </span>
              </div>

              <h2 className="mt-2.5 text-xl sm:text-2xl font-bold tracking-tight text-(--text-primary)">
                {activeTopicName} Plan Map
              </h2>
              <p className="mt-1 text-sm text-(--text-secondary) max-w-xl">
                Current Focus: {currentAvailableDay?.focus || "Foundational concepts and memory structures for advanced patterns."}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) px-3.5 py-2 text-right">
                <div className="text-[10px] font-medium text-(--text-muted) uppercase tracking-wider">
                  Target Pace
                </div>
                <div className="text-sm font-semibold text-(--text-primary)">
                  {plan.dailyMinutes}m / day
                </div>
              </div>

              <Link
                href="/intelligence?tab=manage"
                className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) hover:border-(--accent-lime)/40 p-2 text-(--text-muted) hover:text-(--text-primary) transition-colors"
                title="Adjust Plan Settings"
                aria-label="Adjust Plan Settings"
              >
                <Sliders className="size-4.5" />
              </Link>
            </div>
          </div>

          {/* 4 CORE SITUATIONAL METRIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-(--border-subtle)/60">
            {/* 1. Current Position */}
            <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) p-3.5 space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                Current Position
              </div>
              <div className="text-sm sm:text-base font-bold text-(--text-primary) flex items-center gap-1.5">
                <span
                  className={cn(
                    "size-2 rounded-full bg-(--accent-lime) shrink-0",
                    !shouldReduceMotion && "animate-pulse"
                  )}
                />
                <span>Day {currentDayIndex} of {totalDays}</span>
              </div>
              <div className="text-[11px] text-(--text-secondary) truncate">
                Stage {activeStageNumber} · {activeStage?.title || "Active Stage"}
              </div>
            </div>

            {/* 2. Schedule Health */}
            <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) p-3.5 space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                Schedule Health
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold",
                    scheduleHealthState.badgeClass
                  )}
                >
                  {scheduleHealthState.status === "on_track" && <Check className="size-3" />}
                  {scheduleHealthState.status === "ahead" && <Sparkles className="size-3" />}
                  {(scheduleHealthState.status === "behind" || scheduleHealthState.status === "at_risk") && (
                    <AlertTriangle className="size-3" />
                  )}
                  {scheduleHealthState.label}
                </span>
              </div>
              <div className="text-[11px] text-(--text-secondary) truncate">
                {incompletePastDays.length > 0 ? (
                  <Link
                    href="/intelligence?tab=manage"
                    className="text-amber-400 hover:underline font-medium inline-flex items-center gap-0.5"
                  >
                    <span>Rebalance Schedule</span>
                    <ArrowRight className="size-3" />
                  </Link>
                ) : (
                  scheduleHealthState.description
                )}
              </div>
            </div>

            {/* 3. Expected Completion (Schedule-Derived Forecast) */}
            <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) p-3.5 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                <span>Finish Forecast</span>
                <details className="group relative inline-block">
                  <summary
                    className="cursor-pointer text-(--text-muted) hover:text-(--text-primary) list-none inline-flex items-center"
                    title="How finish date is forecast"
                  >
                    <Info className="size-3" />
                  </summary>
                  <div className="absolute right-0 bottom-full mb-1 z-30 w-52 rounded-xl bg-(--bg-surface) p-2.5 border border-(--border-subtle) text-[11px] text-(--text-secondary) shadow-xl normal-case">
                    Derived from your daily pace ({plan.dailyMinutes}m/day), remaining curriculum days, and schedule health slip.
                  </div>
                </details>
              </div>
              <div className="text-sm sm:text-base font-bold text-(--text-primary) flex items-center gap-1.5">
                <Calendar className="size-3.5 text-sky-400 shrink-0" />
                <span className="truncate">{forecastFinishDate}</span>
              </div>
              <div className="text-[11px] text-(--text-secondary) truncate">
                {incompletePastDays.length > 0
                  ? `Includes ${incompletePastDays.length}d slip buffer`
                  : `${totalDays - actualCompletedDays} days remaining`}
              </div>
            </div>

            {/* 4. Curriculum Progress */}
            <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) p-3.5 space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                Curriculum Progress
              </div>
              <div className="text-sm sm:text-base font-bold text-teal-400 flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 shrink-0" />
                <span>{actualCompletedDays} of {totalDays} Days ({planProgressPercent}%)</span>
              </div>
              <div className="text-[11px] text-(--text-secondary) truncate">
                {stages.filter((s) => s.status === "completed").length} of {stages.length} stages mastered
              </div>
            </div>
          </div>

          {/* OVERALL CURRICULUM SPRINT TRACK */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-(--text-muted)">
              <span className="font-medium text-(--text-secondary)">Sprint Progression Track</span>
              <span className="font-semibold text-teal-400">{planProgressPercent}% complete</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-(--bg-surface-raised)">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 via-emerald-400 to-(--accent-lime) transition-all duration-300"
                style={{ width: `${planProgressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. COMPACT CURRENT POSITION CARD (DEMOTED NEXT ACTION) ── */}
      <div className="rounded-2xl border border-(--accent-lime)/30 bg-gradient-to-r from-(--accent-lime)/10 via-(--bg-surface) to-(--bg-surface) p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="size-10 rounded-xl bg-(--accent-lime)/20 border border-(--accent-lime)/40 flex items-center justify-center shrink-0 text-(--accent-lime) mt-0.5">
            <Target className="size-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-bold text-(--accent-lime) uppercase tracking-wider text-[10px] bg-(--accent-lime)/20 px-2 py-0.5 rounded">
                Current Position
              </span>
              <span className="text-(--text-muted)">
                Day {currentDayIndex} of {totalDays} · {currentAvailableDay?.topicName || activeTopicName}
              </span>
              <span className="text-[11px] text-teal-400 font-medium">
                {todayCompletedCount}/{todayTasksCount} tasks done
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-(--text-primary) truncate">
              {isTodayComplete
                ? `Day ${currentDayIndex} Completed! Preview Next Sessions`
                : primaryAction?.title || currentAvailableDay?.title || `Execute Day ${currentDayIndex} Practice`}
            </h4>
            <p className="text-xs text-(--text-secondary) line-clamp-1">
              {isTodayComplete
                ? "Core milestones verified for today. You can inspect upcoming days or practice extra vault challenges."
                : currentAvailableDay?.focus || "Core invariant modeling and pattern recognition tasks."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
          <Link
            href={isTodayComplete ? "/intelligence?tab=week" : "/intelligence?tab=today"}
            className="inline-flex items-center gap-2 rounded-xl bg-(--accent-lime) px-4 py-2.5 text-xs font-bold text-black hover:bg-(--accent-lime-hover) transition-all shadow-sm"
          >
            <span>{isTodayComplete ? "View Next Days" : "Resume Today's Plan"}</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* ── 3. SCHEDULE RISK CALLOUT (IF SLIPPED OR PAUSED) ── */}
      {(incompletePastDays.length > 0 || isPlanPaused) && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-300">
                {isPlanPaused
                  ? "Study Plan Currently Paused"
                  : `Schedule Recalibration Recommended (${incompletePastDays.length} Slipped Day${incompletePastDays.length > 1 ? "s" : ""})`}
              </h4>
              <p className="text-xs text-amber-200/80 mt-0.5 max-w-xl leading-relaxed">
                {isPlanPaused
                  ? "Progress tracking is paused. Reactivate your plan or adjust settings in the Manage tab."
                  : `You have ${incompletePastDays.length} incomplete past day${incompletePastDays.length > 1 ? "s" : ""}. Rebalancing adjusts upcoming deadlines to protect your learning pace.`}
              </p>
            </div>
          </div>
          <Link
            href="/intelligence?tab=manage"
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/20 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 shrink-0 transition-colors"
          >
            <Sliders className="size-3.5" />
            <span>Adjust Plan / Rebalance</span>
          </Link>
        </div>
      )}

      {/* ── 4. CONNECTED CURRICULUM & STAGE MAP ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-(--text-primary) flex items-center gap-2">
              <Layers className="size-4.5 text-(--accent-lime)" />
              <span>Curriculum & Stage Map</span>
            </h3>
            <p className="text-xs text-(--text-muted) mt-0.5">
              Progressive milestone roadmap from initial invariant grounding to full interview synthesis.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-(--text-muted)">
              Stage {activeStageNumber} of {stages.length} Active
            </span>
          </div>
        </div>

        {/* STAGES MAP (CONNECTED HORIZONTAL/VERTICAL FLOW) */}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stages.map((stg, idx) => {
              const isCompleted = stg.status === "completed";
              const isCurrent = stg.status === "current";
              const isUpcoming = stg.status === "upcoming";

              const stageDaysCount = stg.stageDays.length;
              const stageProgress =
                stageDaysCount > 0 ? Math.round((stg.completedDaysCount / stageDaysCount) * 100) : 0;

              return (
                <div
                  key={stg.id}
                  className={cn(
                    "relative flex flex-col justify-between rounded-2xl border p-5 transition-all",
                    isCompleted && "border-teal-500/30 bg-teal-950/15 shadow-2xs",
                    isCurrent && "border-(--accent-lime) bg-(--accent-lime)/10 ring-1 ring-(--accent-lime)/40 shadow-md",
                    isUpcoming && "border-(--border-subtle) bg-(--bg-surface) opacity-75"
                  )}
                >
                  {/* Top Stage Header */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-(--text-muted)">
                        Stage {stg.stageNumber} · Days {stg.startDay}–{stg.endDay}
                      </span>

                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                          <Check className="size-3" />
                          <span>Completed</span>
                        </span>
                      )}

                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-(--accent-lime) bg-(--accent-lime)/20 px-2 py-0.5 rounded-full border border-(--accent-lime)/30">
                          <span
                            className={cn(
                              "size-1.5 rounded-full bg-(--accent-lime)",
                              !shouldReduceMotion && "animate-pulse"
                            )}
                          />
                          <span>Active Stage</span>
                        </span>
                      )}

                      {isUpcoming && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-(--text-muted) bg-(--bg-surface-raised) px-2 py-0.5 rounded-full border border-(--border-subtle)">
                          <Lock className="size-3" />
                          <span>Upcoming</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-(--text-primary)">{stg.title}</h4>
                      <p className="text-xs text-(--text-secondary) mt-1 leading-relaxed">
                        {stg.focus}
                      </p>
                    </div>

                    {/* EMBEDDED "YOU ARE HERE" MARKER */}
                    {isCurrent && (
                      <div className="rounded-xl border border-(--accent-lime)/40 bg-(--accent-lime)/15 p-2.5 flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <span className="relative flex size-2.5">
                            <span
                              className={cn(
                                "absolute inline-flex h-full w-full rounded-full bg-(--accent-lime) opacity-75",
                                !shouldReduceMotion && "animate-ping"
                              )}
                            />
                            <span className="relative inline-flex rounded-full size-2.5 bg-(--accent-lime)" />
                          </span>
                          <span className="text-xs font-bold text-(--accent-lime) tracking-wide">
                            YOU ARE HERE · Day {currentDayIndex}
                          </span>
                        </div>
                        <span className="text-[11px] text-(--accent-lime)/90 font-medium">
                          {stg.completedDaysCount} of {stageDaysCount}d done
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stage Bottom Milestone & Progress */}
                  <div className="mt-4 pt-3 border-t border-(--border-subtle)/50 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-(--text-muted)">Stage Progress</span>
                      <span className="font-semibold text-(--text-primary)">
                        {stg.completedDaysCount} / {stageDaysCount} Days ({stageProgress}%)
                      </span>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-(--bg-surface-raised)">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          isCompleted && "bg-teal-400",
                          isCurrent && "bg-(--accent-lime)",
                          isUpcoming && "bg-zinc-600"
                        )}
                        style={{ width: `${stageProgress}%` }}
                      />
                    </div>

                    {/* Stage Checkpoint Gate indicator */}
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-(--text-muted) flex items-center gap-1">
                        <ShieldCheck className="size-3 text-sky-400" />
                        <span>Day {stg.checkpointDayIndex} Checkpoint Gate</span>
                      </span>
                      <span
                        className={cn(
                          "font-medium",
                          stg.isCheckpointPassed
                            ? "text-teal-400"
                            : isCurrent
                            ? "text-sky-300"
                            : "text-(--text-muted)"
                        )}
                      >
                        {stg.isCheckpointPassed ? "Passed" : isCurrent ? "Target Gate" : "Locked"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 5. CONNECTED WHAT'S COMING NEXT (CHECKPOINT & UPCOMING DAYS) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-(--text-muted) flex items-center gap-2">
            <Calendar className="size-4 text-sky-400" />
            <span>Curriculum Progression · What&apos;s Coming Next</span>
          </h3>
          <Link
            href="/intelligence?tab=week"
            className="text-xs font-semibold text-zinc-400 hover:text-(--text-primary) transition-colors flex items-center gap-1"
          >
            <span>Full 7-Day Schedule</span>
            <ChevronRight className="size-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Next Scheduled Checkpoint */}
          <div className="rounded-2xl border border-sky-500/25 bg-(--bg-surface) p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-(--text-primary)">
                <ShieldCheck className="size-4 text-sky-400" />
                <span>Next Scheduled Checkpoint Gate</span>
              </div>
              <span className="text-xs font-semibold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                {checkpointDaysAway === 0 ? "Due Today" : `${checkpointDaysAway} days away`}
              </span>
            </div>

            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-sky-300 uppercase tracking-wide">
                  Day {nextCheckpointDay?.dayIndex ?? 7} · {nextCheckpointDay?.title || "Retention Checkpoint"}
                </span>
                <span className="text-[11px] text-sky-400 font-medium">Stage Gate</span>
              </div>
              <p className="text-xs text-(--text-secondary) leading-relaxed">
                {nextCheckpointDay?.focus || "Weekly retention checkpoint, review due queue, and pattern consolidation."}
              </p>
            </div>

            <details className="group pt-1">
              <summary className="text-[11px] font-semibold text-sky-400/90 hover:text-sky-300 cursor-pointer flex items-center justify-between">
                <span>How does the checkpoint gate work?</span>
                <ChevronDown className="size-3 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-xs text-(--text-muted) leading-relaxed">
                At each 7-day checkpoint, the algorithm calculates spaced repetition retention curves, reviews queued problems, and validates mastery before unlocking subsequent stage milestones.
              </p>
            </details>
          </div>

          {/* Look-Ahead: Next 3 Days Preview */}
          <div className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-(--text-primary)">
                <Calendar className="size-4 text-zinc-400" />
                <span>Next Days Ahead</span>
              </div>
              <span className="text-xs text-(--text-muted)">
                {upcomingThreeDays.length} sessions queued
              </span>
            </div>

            {upcomingThreeDays.length === 0 ? (
              <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) p-6 text-xs text-(--text-muted) text-center space-y-1">
                <div className="font-semibold text-(--text-primary)">Cycle Sprints Complete</div>
                <div>You are nearing the final days of this learning cycle!</div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingThreeDays.map((d) => (
                  <div
                    key={d.dayIndex}
                    className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) p-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-zinc-300">Day {d.dayIndex}</span>
                        <span className="text-[10px] uppercase font-semibold text-(--text-muted) bg-(--bg-surface) px-1.5 py-0.5 rounded">
                          {String(d.phase).replace("_", " ")}
                        </span>
                        {d.isCheckpointDay && (
                          <span className="text-[10px] uppercase font-semibold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
                            Checkpoint
                          </span>
                        )}
                      </div>
                      <p className="text-(--text-primary) font-medium truncate mt-0.5">{d.title}</p>
                    </div>
                    <span className="text-[11px] text-(--text-muted) shrink-0 font-medium">
                      {d.targetMinutes || 45}m
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 6. PLAN HISTORY & RECALIBRATIONS TIMELINE ── */}
      <div className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-(--text-primary)">
            <History className="size-4 text-(--accent-lime)" />
            <span>Plan History & Recalibrations</span>
          </div>
          <span className="text-xs text-(--text-muted)">
            {historyEvents.length} curriculum event{historyEvents.length > 1 ? "s" : ""} recorded
          </span>
        </div>

        <p className="text-xs text-(--text-muted)">
          Human-readable audit trail of schedule adjustments, algorithm recalibrations, and verified milestone gates.
        </p>

        {/* Timeline List */}
        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-(--border-subtle)">
          {historyEvents.map((evt) => (
            <div key={evt.id} className="relative group">
              {/* Timeline Node Dot */}
              <div
                className={cn(
                  "absolute -left-[1.625rem] top-1.5 size-3 rounded-full border-2 border-(--bg-surface)",
                  evt.category === "milestone" && "bg-teal-400",
                  evt.category === "recalibration" && "bg-amber-400",
                  evt.category === "calibration" && "bg-(--accent-lime)",
                  evt.category === "pause" && "bg-amber-500",
                  evt.category === "adaptation" && "bg-sky-400"
                )}
              />

              <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-(--text-primary)">{evt.title}</span>
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        evt.badgeClass
                      )}
                    >
                      {evt.categoryLabel}
                    </span>
                  </div>
                  <span className="text-[11px] text-(--text-muted) font-mono">{evt.date}</span>
                </div>

                <p className="text-xs text-(--text-secondary) leading-relaxed">
                  {evt.summary}
                </p>

                {/* Disclosure: "Why did this change?" */}
                <details className="group/details pt-1 border-t border-(--border-subtle)/40">
                  <summary className="text-[11px] font-medium text-(--accent-lime) hover:underline cursor-pointer flex items-center gap-1 select-none">
                    <span>Why did this change?</span>
                    <ChevronDown className="size-3 transition-transform duration-200 group-open/details:rotate-180" />
                  </summary>
                  <div className="mt-2 pl-3 border-l-2 border-(--accent-lime)/30 text-xs text-(--text-secondary) space-y-1">
                    <p>{evt.whyChanged}</p>
                    {evt.details && evt.details.length > 0 && (
                      <div className="pt-1 space-y-0.5">
                        {evt.details.map((detail, idx) => (
                          <div key={idx} className="text-[11px] text-(--text-muted)">
                            • {detail}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

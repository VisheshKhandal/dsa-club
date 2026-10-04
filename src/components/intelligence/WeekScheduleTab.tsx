"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
  Pause,
  ShieldCheck,
  Check,
  Flame,
  Compass,
  Target,
} from "lucide-react";
import type { IntelligenceViewProps } from "./types";
import { PLAN_GRAMMAR } from "./plan-visual-grammar";
import { cn } from "@/lib/utils";

function formatDateLabel(dateKey?: string, isToday = false): string {
  if (!dateKey) return "";
  try {
    const parts = dateKey.split("-").map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const formatted = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      return isToday ? `Today · ${formatted}` : formatted;
    }
  } catch {}
  return dateKey;
}

function getEstimatedDateLabel(startDateStr?: string | null, dayIndex = 1, isToday = false): string {
  if (!startDateStr) return "";
  try {
    const start = new Date(startDateStr);
    const d = new Date(start.getTime() + (dayIndex - 1) * 86400000);
    const formatted = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return isToday ? `Today · ${formatted}` : formatted;
  } catch {
    return "";
  }
}

function getPhaseGroup(day: {
  isCheckpointDay?: boolean;
  isBufferDay?: boolean;
  dayIndex: number;
  phase?: string;
}) {
  if (day.isCheckpointDay || day.isBufferDay || day.dayIndex % 7 === 0 || day.phase === "review") {
    return {
      id: "checkpoint",
      title: "Spaced Retention Checkpoint",
      badge: "Stage 3 · Retention",
      color: "sky" as const,
    };
  }
  if (day.phase === "orientation" || day.phase === "mechanics") {
    return {
      id: "foundations",
      title: "Foundations & Memory Invariants",
      badge: "Stage 1 · Foundations",
      color: "teal" as const,
    };
  }
  return {
    id: "practice",
    title: "Pattern Recognition & Practice",
    badge: "Stage 2 · Practice",
    color: "lime" as const,
  };
}

export function WeekScheduleTab({
  plan,
  days,
  tasks = [],
  snapshot,
  activeTopicName = "",
  completedDaysCount = 0,
}: IntelligenceViewProps) {
  const currentAvailableDay = snapshot?.currentPlanDay || (
    days.find((d) => d.status === "in_progress") ||
    days.find((d) => d.status === "available") ||
    days[0]
  );

  const currentDayIndex = currentAvailableDay?.dayIndex ?? 1;
  const totalDays = plan?.totalDays || 18;
  const userDailyMinutes = plan?.dailyMinutes || 45;

  // Chunk all days into 7-day sprint weeks
  const weeks = useMemo(() => {
    const result: Array<{
      weekNumber: number;
      label: string;
      rangeLabel: string;
      days: typeof days;
      isCompleted: boolean;
      isActive: boolean;
    }> = [];

    const totalWeeks = Math.ceil(totalDays / 7);
    for (let w = 0; w < totalWeeks; w++) {
      const startDay = w * 7 + 1;
      const endDay = Math.min(totalDays, (w + 1) * 7);
      const weekDays = days.filter((d) => d.dayIndex >= startDay && d.dayIndex <= endDay);

      const isCompleted = weekDays.length > 0 && weekDays.every((d) => d.status === "completed");
      const isActive = weekDays.some((d) => d.dayIndex === currentDayIndex);

      result.push({
        weekNumber: w + 1,
        label: `Week ${w + 1}`,
        rangeLabel: `Days ${startDay}–${endDay}`,
        days: weekDays,
        isCompleted,
        isActive,
      });
    }
    return result;
  }, [days, totalDays, currentDayIndex]);

  // Default selected week: contains currentDayIndex, or first incomplete
  const initialWeekIndex = useMemo(() => {
    const activeIdx = weeks.findIndex((w) => w.isActive);
    if (activeIdx !== -1) return activeIdx;
    const firstIncomplete = weeks.findIndex((w) => !w.isCompleted);
    return firstIncomplete !== -1 ? firstIncomplete : 0;
  }, [weeks]);

  const [selectedWeekIndex, setSelectedWeekIndex] = useState(initialWeekIndex);

  // Sync if current active week changes
  React.useEffect(() => {
    const activeIdx = weeks.findIndex((w) => w.isActive);
    if (activeIdx !== -1) {
      setSelectedWeekIndex(activeIdx);
    }
  }, [weeks]);

  const selectedWeek = weeks[selectedWeekIndex] || weeks[0];
  const isSelectedWeekComplete = selectedWeek?.isCompleted;

  // Day expansion states: Today is expanded by default; others compressed
  const [expandedDayIndices, setExpandedDayIndices] = useState<Set<number>>(
    () => new Set(currentAvailableDay ? [currentAvailableDay.dayIndex] : [1])
  );

  if (!plan || days.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto py-6 space-y-6 animate-in fade-in duration-200">
        {/* Sleek, non-card-heavy container */}
        <div className="relative overflow-hidden rounded-3xl border border-(--border-subtle) bg-(--bg-surface) p-6 sm:p-9 shadow-sm">
          {/* Subtle ambient lighting */}
          <div
            className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-(--accent-lime)/10 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -left-20 -bottom-20 size-72 rounded-full bg-teal-500/10 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative z-10 space-y-6">
            {/* Status indicator badge */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-(--accent-lime)/30 bg-(--accent-lime)/10 px-3 py-1 text-xs font-semibold text-(--accent-lime)">
                <Compass className="size-3.5" />
                <span>Starter Path · Self-Paced Practice</span>
              </span>
              <span className="text-xs text-(--text-muted)">
                Flexible Exploration Mode
              </span>
            </div>

            {/* Headline and friendly explanation */}
            <div className="space-y-2 max-w-2xl">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-(--text-primary)">
                Weekly Schedule Unlocks with a Structured Plan
              </h2>
              <p className="text-sm text-(--text-secondary) leading-relaxed">
                You are currently exploring problems on your Starter Path at your own pace without rigid calendar deadlines. When you want a daily 7-day schedule with spaced-repetition checkpoints and interview milestone dates, activate a Structured Plan anytime.
              </p>
            </div>

            {/* Visual Sprint Flow (What a 7-day schedule looks like - sleek and lightweight) */}
            <div className="space-y-2.5 pt-1 pb-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-(--text-muted) flex items-center gap-2">
                <Calendar className="size-3.5 text-(--accent-lime)" />
                <span>How a 7-Day Sprint Works</span>
              </div>

              {/* Minimal horizontal node flow */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {[
                  { day: "Day 1", phase: "Foundations", tag: "Memory & Basics", color: "border-teal-500/30 bg-teal-500/10 text-teal-300" },
                  { day: "Day 2", phase: "Core Patterns", tag: "Pattern Mechanics", color: "border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-secondary)" },
                  { day: "Day 3", phase: "Deep Practice", tag: "Medium Problems", color: "border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-secondary)" },
                  { day: "Day 4", phase: "Edge Cases", tag: "Invariants & Bounds", color: "border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-secondary)" },
                  { day: "Day 5", phase: "Speed Run", tag: "Timed Execution", color: "border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-secondary)" },
                  { day: "Day 6", phase: "Consolidation", tag: "Cross-Topic Bridge", color: "border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-secondary)" },
                  { day: "Day 7", phase: "Checkpoint", tag: "Spaced Retention Gate", color: "border-sky-500/40 bg-sky-500/15 text-sky-300 font-semibold" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-xl border p-2.5 flex flex-col justify-between gap-1 text-xs transition-colors",
                      item.color
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold opacity-75">{item.day}</span>
                      {idx === 6 && <ShieldCheck className="size-3 text-sky-400" />}
                    </div>
                    <div className="font-semibold text-[11px] truncate">{item.phase}</div>
                    <div className="text-[10px] opacity-70 truncate">{item.tag}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3 Streamlined Highlights (NOT clunky cards, sleek flex row) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-(--border-subtle)/60">
              <div className="flex items-start gap-2.5 text-xs text-(--text-secondary)">
                <div className="size-7 rounded-lg bg-(--accent-lime)/10 border border-(--accent-lime)/20 flex items-center justify-center shrink-0 text-(--accent-lime) mt-0.5">
                  <Clock className="size-3.5" />
                </div>
                <div>
                  <div className="font-bold text-(--text-primary)">Predictable Daily Pace</div>
                  <div className="text-[11px] text-(--text-muted) mt-0.5">1–3 problems matched to your study minutes per day.</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs text-(--text-secondary)">
                <div className="size-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 text-sky-400 mt-0.5">
                  <ShieldCheck className="size-3.5" />
                </div>
                <div>
                  <div className="font-bold text-(--text-primary)">7-Day Spaced Checkpoints</div>
                  <div className="text-[11px] text-(--text-muted) mt-0.5">Automated review days prevent forgetting earlier patterns.</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs text-(--text-secondary)">
                <div className="size-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0 text-teal-400 mt-0.5">
                  <Target className="size-3.5" />
                </div>
                <div>
                  <div className="font-bold text-(--text-primary)">Target Interview Forecast</div>
                  <div className="text-[11px] text-(--text-muted) mt-0.5">Calculates exact finish dates calibrated to your interviews.</div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/intelligence?tab=manage"
                className="inline-flex items-center gap-2 rounded-xl bg-(--accent-lime) px-5 py-2.5 text-xs font-bold text-black hover:bg-(--accent-lime-hover) transition-all shadow-md cursor-pointer active:scale-[0.99]"
              >
                <span>Create Structured Plan</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/intelligence?tab=today"
                className="inline-flex items-center gap-2 rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) px-4 py-2.5 text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary) hover:border-(--border-strong) transition-all cursor-pointer"
              >
                <span>Continue Today&apos;s Practice</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const toggleDayExpansion = (dayIndex: number) => {
    setExpandedDayIndices((prev) => {
      const next = new Set(prev);
      if (next.has(dayIndex)) {
        next.delete(dayIndex);
      } else {
        next.add(dayIndex);
      }
      return next;
    });
  };

  // Schedule Health computation
  const isPlanPaused = plan.status === "paused";
  const incompletePastDays = days.filter(
    (d) => d.dayIndex < currentDayIndex && d.status !== "completed"
  );
  const missedDay = incompletePastDays[0] || null;
  const isScheduleOnTrack = !isPlanPaused && incompletePastDays.length === 0;

  // Next Checkpoint computation
  const checkpointDays = days.filter((d) => d.isCheckpointDay || d.dayIndex % 7 === 0 || d.dayIndex === totalDays);
  const nextCheckpoint =
    checkpointDays.find((d) => d.dayIndex >= currentDayIndex) ||
    checkpointDays[checkpointDays.length - 1] || { dayIndex: Math.min(totalDays, 7) };

  const daysUntilCheckpoint = nextCheckpoint.dayIndex - currentDayIndex;

  // Selected week checkpoint day (Day 7, Day 14, etc.)
  const weekCheckpointDay =
    selectedWeek.days.find((d) => d.isCheckpointDay || d.dayIndex % 7 === 0) ||
    selectedWeek.days[selectedWeek.days.length - 1];

  const completedDaysInWeek = selectedWeek.days.filter((d) => d.status === "completed").length;

  return (
    <div className="space-y-6 w-full">
      {/* ── 5-SECOND SITUATIONAL AWARENESS STRIP ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Current Position */}
        <div className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-3.5 space-y-1 shadow-2xs">
          <div className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider">
            Current Position
          </div>
          <div className="text-sm sm:text-base font-bold text-(--text-primary) flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-(--accent-lime) animate-pulse shrink-0" />
            <span>Day {currentDayIndex} of {totalDays}</span>
          </div>
          <div className="text-[11px] text-(--text-secondary) truncate">
            {formatDateLabel(currentAvailableDay?.dateKey, true) ||
              getEstimatedDateLabel(plan.startDate, currentDayIndex, true)}
          </div>
        </div>

        {/* 2. Schedule Health */}
        <div className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-3.5 space-y-1 shadow-2xs">
          <div className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider">
            Schedule Health
          </div>
          <div className="text-sm sm:text-base font-bold flex items-center gap-1.5">
            {isScheduleOnTrack ? (
              <>
                <CheckCircle2 className="size-4 text-teal-400 shrink-0" />
                <span className="text-teal-400">On Track</span>
              </>
            ) : isPlanPaused ? (
              <>
                <Pause className="size-4 text-amber-400 shrink-0" />
                <span className="text-amber-400">Paused</span>
              </>
            ) : (
              <>
                <AlertTriangle className="size-4 text-amber-400 shrink-0" />
                <span className="text-amber-400">Attention</span>
              </>
            )}
          </div>
          <div className="text-[11px] text-(--text-secondary) truncate">
            {isScheduleOnTrack
              ? `${completedDaysCount || days.filter((d) => d.status === "completed").length} days on pace`
              : isPlanPaused
              ? "Streak frozen safely"
              : `Day ${missedDay?.dayIndex} pending solve`}
          </div>
        </div>

        {/* 3. Next Checkpoint */}
        <div className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-3.5 space-y-1 shadow-2xs">
          <div className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider">
            Next Checkpoint
          </div>
          <div className="text-sm sm:text-base font-bold text-sky-400 flex items-center gap-1.5">
            <RotateCcw className="size-4 shrink-0" />
            <span>Day {nextCheckpoint.dayIndex}</span>
          </div>
          <div className="text-[11px] text-(--text-secondary) truncate">
            {daysUntilCheckpoint > 0
              ? `In ${daysUntilCheckpoint} ${daysUntilCheckpoint === 1 ? "day" : "days"} (Review)`
              : daysUntilCheckpoint === 0
              ? "Active today"
              : "Checkpoint cleared"}
          </div>
        </div>

        {/* 4. Week Completion */}
        <div className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-3.5 space-y-1 shadow-2xs">
          <div className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider flex items-center justify-between">
            <span>Week Progress</span>
            <span className="text-(--text-secondary)">{completedDaysInWeek}/{selectedWeek.days.length}</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-(--text-primary)">
            {Math.round((completedDaysInWeek / Math.max(1, selectedWeek.days.length)) * 100)}%
          </div>
          <div className="w-full bg-(--bg-surface-raised) h-1.5 rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-(--accent-lime) rounded-full transition-all duration-300"
              style={{
                width: `${Math.round((completedDaysInWeek / Math.max(1, selectedWeek.days.length)) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── ATTENTION / RECALIBRATION CALLOUT (IF PAST DAY MISSED) ── */}
      {!isScheduleOnTrack && missedDay && (
        <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3">
            <div className="size-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="size-4" />
            </div>
            <div>
              <span className="font-bold text-amber-300 text-sm">
                Schedule Attention · Day {missedDay.dayIndex} Incomplete
              </span>
              <p className="text-(--text-secondary) mt-0.5 leading-relaxed">
                Your execution schedule is holding at Day {missedDay.dayIndex}. You can complete it on your board or recalibrate your plan to shift remaining milestones forward.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <Link
              href="/intelligence?tab=today"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-(--accent-lime) text-black font-bold hover:bg-(--accent-lime-hover) transition-all text-xs"
            >
              <span>Solve Day {missedDay.dayIndex}</span>
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/intelligence?tab=manage"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-(--border-subtle) bg-(--bg-surface) text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-raised) transition-all text-xs font-semibold"
            >
              <span>Recalibrate</span>
            </Link>
          </div>
        </div>
      )}

      {/* ── COMPACT WEEK RAIL ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl border border-(--border-subtle) bg-(--bg-surface) overflow-x-auto no-scrollbar shadow-2xs">
          {weeks.map((week, idx) => {
            const isSelected = selectedWeekIndex === idx;
            return (
              <button
                key={week.weekNumber}
                type="button"
                onClick={() => setSelectedWeekIndex(idx)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-180 cursor-pointer",
                  isSelected
                    ? "bg-(--accent-lime) text-black shadow-xs font-bold"
                    : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-raised)"
                )}
              >
                {week.isCompleted ? (
                  <CheckCircle2
                    className={cn("size-3.5 shrink-0", isSelected ? "text-black" : "text-teal-400")}
                  />
                ) : week.isActive ? (
                  <span
                    className={cn(
                      "size-2 rounded-full shrink-0",
                      isSelected ? "bg-black animate-pulse" : "bg-(--accent-lime) animate-pulse"
                    )}
                  />
                ) : (
                  <Lock className={cn("size-3 shrink-0", isSelected ? "text-black" : "text-zinc-500")} />
                )}
                <span>{week.label}</span>
                <span className={cn("text-[10px]", isSelected ? "text-black/75" : "text-(--text-muted)")}>
                  ({week.rangeLabel})
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Config Link (Kept subtle & secondary) */}
        <Link
          href="/intelligence?tab=manage"
          className="text-xs text-(--text-muted) hover:text-(--text-secondary) transition-colors flex items-center gap-1"
        >
          <span>Pace: {userDailyMinutes}m/day</span>
          <ChevronRight className="size-3" />
        </Link>
      </div>

      {/* ── CONNECTED 7-DAY VISUAL LEARNING TIMELINE ── */}
      <div className="space-y-4 pt-1">
        <div className="relative pl-6 sm:pl-8 space-y-3">
          {/* Continuous Connected Spine */}
          <div
            className="absolute left-2.5 sm:left-3.5 top-3 bottom-3 w-0.5 bg-(--border-subtle)/70"
            aria-hidden="true"
          />

          {selectedWeek.days.map((day, idx) => {
            const isCurrent = currentDayIndex === day.dayIndex;
            const isCompleted = day.status === "completed";
            const isMissed = !isCompleted && day.dayIndex < currentDayIndex;
            const isCheckpoint =
              day.isCheckpointDay || day.isBufferDay || day.dayIndex % 7 === 0 || day.phase === "review";
            const isLocked = day.status === "locked";
            const isExpanded = expandedDayIndices.has(day.dayIndex);

            // Phase group header: show when phase category changes
            const currentPhaseGroup = getPhaseGroup(day);
            const prevPhaseGroup = idx > 0 ? getPhaseGroup(selectedWeek.days[idx - 1]) : null;
            const showPhaseHeader = idx === 0 || currentPhaseGroup.id !== prevPhaseGroup?.id;

            // Date label
            const dateLabel =
              formatDateLabel(day.dateKey, isCurrent) ||
              getEstimatedDateLabel(plan.startDate, day.dayIndex, isCurrent);

            // Workload Capacity Check
            const dayTarget = day.targetMinutes || userDailyMinutes;
            const isOverCapacity = dayTarget > userDailyMinutes;
            const overMinutes = dayTarget - userDailyMinutes;

            // Day tasks from real props or snapshot
            const dayTasks = tasks.filter((t) => t.planDayId === day.id || t.dayIndex === day.dayIndex);
            const blueprintSnapshot = plan.snapshots?.estimatedScheduleSnapshot?.find(
              (d) => d.dayIndex === day.dayIndex
            );
            const displayTitle = dayTasks[0]?.title || blueprintSnapshot?.title || day.title;

            return (
              <React.Fragment key={day.id || day.dayIndex}>
                {/* Visual Stage / Phase Group Divider */}
                {showPhaseHeader && (
                  <div className="pt-2 pb-1 relative -left-4 sm:-left-6 flex items-center gap-2">
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                        currentPhaseGroup.color === "sky"
                          ? PLAN_GRAMMAR.revision.badge
                          : currentPhaseGroup.color === "teal"
                          ? PLAN_GRAMMAR.completed.badge
                          : PLAN_GRAMMAR.current.badge
                      )}
                    >
                      {currentPhaseGroup.badge}
                    </span>
                    <span className="text-xs font-semibold text-(--text-secondary) truncate">
                      {currentPhaseGroup.title}
                    </span>
                    <div className="flex-1 h-px bg-(--border-subtle)/50" />
                  </div>
                )}

                {/* Day Timeline Row */}
                <div className="relative group">
                  {/* Spine Node */}
                  <div
                    className={cn(
                      "absolute -left-6 sm:-left-8 top-3.5 size-5 sm:size-6 rounded-full flex items-center justify-center border transition-all duration-180 z-10",
                      isCurrent
                        ? "bg-(--accent-lime) border-(--accent-lime) text-black ring-4 ring-(--accent-lime)/20 scale-110 shadow-xs"
                        : isCompleted
                        ? "bg-teal-500/20 border-teal-500/40 text-teal-400"
                        : isMissed
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                        : isCheckpoint
                        ? "bg-sky-500/20 border-sky-500/40 text-sky-400"
                        : "bg-(--bg-surface-raised) border-(--border-subtle) text-zinc-500"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="size-3 sm:size-3.5 stroke-[2.5]" />
                    ) : isCurrent ? (
                      <span className="size-2 rounded-full bg-black animate-pulse" />
                    ) : isMissed ? (
                      <AlertTriangle className="size-3" />
                    ) : isCheckpoint ? (
                      <RotateCcw className="size-3 text-sky-400" />
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-400">{day.dayIndex}</span>
                    )}
                  </div>

                  {/* Day Card */}
                  <div
                    onClick={() => toggleDayExpansion(day.dayIndex)}
                    className={cn(
                      "rounded-2xl border transition-all duration-180 text-left cursor-pointer overflow-hidden",
                      isCurrent
                        ? "border-(--accent-lime) bg-(--bg-surface) shadow-sm ring-1 ring-(--accent-lime)/30"
                        : isCompleted
                        ? "border-teal-500/25 bg-teal-950/10 hover:border-teal-500/40"
                        : isMissed
                        ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
                        : isCheckpoint
                        ? "border-sky-500/30 bg-sky-500/5 hover:border-sky-500/50"
                        : "border-(--border-subtle) bg-(--bg-surface) hover:border-(--border-subtle)/80"
                    )}
                  >
                    {/* Header Row: Always visible */}
                    <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        {/* Day & Date Tag */}
                        <div className="flex flex-col shrink-0">
                          <span
                            className={cn(
                              "font-mono text-xs font-bold leading-none",
                              isCurrent
                                ? "text-(--accent-lime)"
                                : isCompleted
                                ? "text-teal-300"
                                : isMissed
                                ? "text-amber-300"
                                : isCheckpoint
                                ? "text-sky-300"
                                : "text-(--text-primary)"
                            )}
                          >
                            Day {day.dayIndex}
                          </span>
                          {dateLabel && (
                            <span className="text-[10px] text-(--text-muted) mt-0.5">
                              {dateLabel.replace("Today · ", "")}
                            </span>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="h-6 w-px bg-(--border-subtle)/60 shrink-0 hidden sm:block" />

                        {/* Title & Stage */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-semibold text-(--text-muted) uppercase tracking-wider">
                              {day.topicName || activeTopicName}
                            </span>
                            {isOverCapacity && (
                              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[9px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                                Over capacity (+{overMinutes}m)
                              </span>
                            )}
                          </div>
                          <h4
                            className={cn(
                              "text-xs sm:text-sm font-semibold truncate mt-0.5",
                              isCurrent
                                ? "text-(--text-primary) font-bold"
                                : isCompleted
                                ? "text-zinc-300"
                                : "text-(--text-primary)"
                            )}
                          >
                            {displayTitle}
                          </h4>
                        </div>
                      </div>

                      {/* Right Action & State Pill */}
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {/* Duration Pill */}
                        <span className="text-[11px] text-(--text-muted) flex items-center gap-1">
                          <Clock className="size-3 text-zinc-500" />
                          <span>{dayTarget}m</span>
                        </span>

                        {/* Status Badge */}
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 border border-teal-500/30 text-teal-300">
                            <Check className="size-2.5 stroke-[2.5]" />
                            <span className="hidden sm:inline">Completed</span>
                          </span>
                        ) : isCurrent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-(--accent-lime)/20 border border-(--accent-lime)/40 text-(--accent-lime)">
                            <span className="size-1.5 rounded-full bg-(--accent-lime) animate-pulse" />
                            <span>Today</span>
                          </span>
                        ) : isMissed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                            Attention
                          </span>
                        ) : isCheckpoint ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 border border-sky-500/30 text-sky-300">
                            Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-(--bg-surface-raised) border border-(--border-subtle) text-zinc-400">
                            Upcoming
                          </span>
                        )}

                        {/* Expand/Collapse Chevron */}
                        <div className="p-1 text-(--text-muted) hover:text-(--text-primary)">
                          {isExpanded ? (
                            <ChevronUp className="size-3.5 transition-transform duration-180" />
                          ) : (
                            <ChevronDown className="size-3.5 transition-transform duration-180" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Details Tray (Smooth 180ms CSS transition) */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 space-y-3 border-t border-(--border-subtle)/50 bg-(--bg-surface-raised)/30 text-xs">
                        {/* Focus description */}
                        {day.focus && (
                          <p className="text-(--text-secondary) leading-relaxed text-[11px] sm:text-xs">
                            {day.focus}
                          </p>
                        )}

                        {/* Real Day Tasks Breakdown */}
                        {dayTasks.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-(--text-muted)">
                              Scheduled Activities ({dayTasks.length})
                            </span>
                            <div className="space-y-1">
                              {dayTasks.map((t) => {
                                const isTaskDone = t.status === "completed";
                                return (
                                  <div
                                    key={t.id || t.taskKey}
                                    className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-(--bg-surface) border border-(--border-subtle)/60 text-[11px]"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {isTaskDone ? (
                                        <CheckCircle2 className="size-3.5 text-teal-400 shrink-0" />
                                      ) : (
                                        <span className="size-3.5 rounded-full border border-zinc-500 shrink-0" />
                                      )}
                                      <span
                                        className={cn(
                                          "truncate",
                                          isTaskDone ? "text-zinc-400 line-through" : "text-(--text-primary)"
                                        )}
                                      >
                                        {t.title}
                                      </span>
                                    </div>
                                    <span className="text-zinc-500 text-[10px] shrink-0">
                                      {t.estimatedMinutes}m
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Over-Capacity Notice */}
                        {isOverCapacity && (
                          <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 leading-relaxed">
                            💡 Workload ({dayTarget}m) exceeds your default {userDailyMinutes}m daily target due to consolidated retrieval activities scheduled for this milestone.
                          </div>
                        )}

                        {/* Action CTA Row */}
                        <div className="pt-2 flex items-center justify-between gap-2 border-t border-(--border-subtle)/40">
                          {isCurrent ? (
                            <Link
                              href="/intelligence?tab=today"
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-(--accent-lime) text-black font-bold text-xs hover:bg-(--accent-lime-hover) transition-all shadow-xs"
                            >
                              <span>Open Today&apos;s Board</span>
                              <ArrowRight className="size-3.5" />
                            </Link>
                          ) : isMissed ? (
                            <Link
                              href="/intelligence?tab=today"
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition-all shadow-xs"
                            >
                              <span>Resume Day {day.dayIndex}</span>
                              <ArrowRight className="size-3.5" />
                            </Link>
                          ) : (
                            <span className="text-[11px] text-(--text-muted)">
                              {isCompleted ? "Day verified and recorded" : "Scheduled milestone"}
                            </span>
                          )}

                          <span className="text-[10px] font-mono text-zinc-500 uppercase">
                            Phase: {day.phase || "practice"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── VISUAL RETENTION CHECKPOINT CARD (REAL SCHEDULED WORKLOAD) ── */}
      {weekCheckpointDay && (
        <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/20 via-(--bg-surface) to-(--bg-surface) p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="size-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm sm:text-base font-bold text-(--text-primary)">
                    {selectedWeek.label} Retention Checkpoint · Day {weekCheckpointDay.dayIndex}
                  </h4>
                  {weekCheckpointDay.status === "completed" ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-teal-500/15 border border-teal-500/30 text-teal-300">
                      <Check className="size-2.5" />
                      Retention Verified
                    </span>
                  ) : weekCheckpointDay.dayIndex === currentDayIndex ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-(--accent-lime)/15 border border-(--accent-lime)/30 text-(--accent-lime)">
                      Active Today
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-sky-500/15 border border-sky-500/30 text-sky-300">
                      Scheduled Checkpoint
                    </span>
                  )}
                </div>
                <p className="text-xs text-(--text-secondary) mt-0.5">
                  Consolidated spaced retrieval testing memory decay curves for {weekCheckpointDay.topicName || activeTopicName}.
                </p>
              </div>
            </div>

            <div className="shrink-0 self-start sm:self-auto">
              <span className="text-xs font-mono font-semibold text-sky-300 bg-sky-500/10 border border-sky-500/25 px-2.5 py-1 rounded-xl">
                ~{weekCheckpointDay.targetMinutes || userDailyMinutes}m review workload
              </span>
            </div>
          </div>

          {/* 7-Day Sprint Progression Track leading to the Checkpoint Gate */}
          <div className="space-y-1.5 pt-1 border-t border-(--border-subtle)/50">
            <div className="flex items-center justify-between text-[11px] text-(--text-muted)">
              <span>Pre-Checkpoint Sprint Continuity</span>
              <span>{completedDaysInWeek} of {selectedWeek.days.length} days completed</span>
            </div>
            <div
              className="grid gap-1.5 sm:gap-2"
              style={{ gridTemplateColumns: `repeat(${selectedWeek.days.length}, minmax(0, 1fr))` }}
            >
              {selectedWeek.days.map((d, pIdx) => {
                const isStepDone = d.status === "completed";
                const isStepCurrent = d.dayIndex === currentDayIndex;
                const isStepCheckpoint = pIdx === selectedWeek.days.length - 1;

                return (
                  <div
                    key={d.dayIndex}
                    className={cn(
                      "h-2 rounded-full transition-all duration-180",
                      isStepDone
                        ? "bg-teal-400"
                        : isStepCurrent
                        ? "bg-(--accent-lime) animate-pulse ring-2 ring-(--accent-lime)/30"
                        : isStepCheckpoint
                        ? "bg-sky-500/30 border border-sky-400/50"
                        : "bg-(--bg-surface-raised)"
                    )}
                    title={`Day ${d.dayIndex}: ${d.status}`}
                  />
                );
              })}
            </div>
          </div>

          {/* 3 Micro-Metrics for Real Workload */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
            <div className="rounded-xl border border-(--border-subtle)/60 bg-(--bg-surface)/60 p-2.5 space-y-0.5">
              <span className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider">
                Consolidation Focus
              </span>
              <p className="font-semibold text-(--text-primary) truncate">
                {weekCheckpointDay.topicName || activeTopicName}
              </p>
            </div>

            <div className="rounded-xl border border-(--border-subtle)/60 bg-(--bg-surface)/60 p-2.5 space-y-0.5">
              <span className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider">
                Retrieval Strategy
              </span>
              <p className="font-semibold text-(--text-primary)">
                Weak Cues & Invariants
              </p>
            </div>

            <div className="rounded-xl border border-(--border-subtle)/60 bg-(--bg-surface)/60 p-2.5 space-y-0.5">
              <span className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider">
                Cadence
              </span>
              <p className="font-semibold text-(--text-primary)">
                Every 7 Execution Days
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

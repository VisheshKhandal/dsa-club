"use client";

import React, { useMemo, useState, useRef } from "react";
import { format, parseISO, getDay } from "date-fns";
import { Calendar, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DailyActivityPoint } from "@/features/product/types/dashboard-dto.types";

export interface DailyActivityItem {
  date: string;
  dateKey: string;
  dayOfWeek?: number;
  actualMinutes?: number;
  minutes?: number; // legacy alias
  problemsSolved: number;
  problemsAttempted: number;
  revisionsDone: number;
  activityScore?: number;
}

export interface ActivityRibbonProps {
  activityHistory?: (DailyActivityPoint | DailyActivityItem)[];
  streakDays?: number;
  todayFocusedMinutes?: number;
  todayTargetMinutes?: number;
  className?: string;
}

function getDayActualMinutes(item: DailyActivityPoint | DailyActivityItem | undefined): number {
  if (!item) return 0;
  return Number(item.actualMinutes ?? (item as any).minutes ?? 0);
}

export function ActivityRibbon({
  activityHistory = [],
  streakDays = 0,
  todayFocusedMinutes,
  todayTargetMinutes,
  className,
}: ActivityRibbonProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Take latest 28 days
  const rawDays = useMemo(() => {
    if (activityHistory.length >= 28) return activityHistory.slice(-28);
    return activityHistory;
  }, [activityHistory]);

  const [selectedDay, setSelectedDay] = useState<(DailyActivityPoint | DailyActivityItem) | null>(() => {
    return rawDays.length > 0 ? rawDays[rawDays.length - 1] : null;
  });

  // Single authoritative measure: actual focused study minutes
  const totalFocusedMinutes = useMemo(() => {
    return rawDays.reduce((sum, d) => sum + getDayActualMinutes(d), 0);
  }, [rawDays]);

  const activeDaysCount = useMemo(() => {
    return rawDays.filter((d) => getDayActualMinutes(d) > 0).length;
  }, [rawDays]);

  const totalSolved = useMemo(() => {
    return rawDays.reduce((sum, d) => sum + (d.problemsSolved || 0), 0);
  }, [rawDays]);

  // Explicit date period label
  const periodLabel = useMemo(() => {
    if (rawDays.length === 0) return "Past 28 Days";
    try {
      const start = format(parseISO(rawDays[0].date), "MMM d");
      const end = format(parseISO(rawDays[rawDays.length - 1].date), "MMM d");
      return `Past 28 Days (${start} – ${end})`;
    } catch {
      return "Past 28 Days";
    }
  }, [rawDays]);

  // ISO Day Index (Mon = 0, Sun = 6)
  const getIsoDayIndex = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      const day = getDay(d); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      return day === 0 ? 6 : day - 1;
    } catch {
      return 0;
    }
  };

  // Group raw days with true Monday-Sunday calendar alignment
  const gridCells = useMemo(() => {
    if (rawDays.length === 0) return [];

    const firstDay = rawDays[0];
    const leadingPadCount = getIsoDayIndex(firstDay.date);

    const leadingPad: Array<{ id: string; isPad: true }> = Array.from(
      { length: leadingPadCount },
      (_, i) => ({
        id: `pad-lead-${i}`,
        isPad: true,
      })
    );

    const activeCells = rawDays.map((d) => ({
      ...d,
      id: d.dateKey || d.date,
      isPad: false as const,
    }));

    const totalCells = leadingPad.length + activeCells.length;
    const trailingPadCount = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    const trailingPad: Array<{ id: string; isPad: true }> = Array.from(
      { length: trailingPadCount },
      (_, i) => ({
        id: `pad-trail-${i}`,
        isPad: true,
      })
    );

    return [...leadingPad, ...activeCells, ...trailingPad];
  }, [rawDays]);

  // Single authoritative intensity: evaluates focused study minutes strictly
  // Scale matches documented legend: 0m, 1-15m, 16-30m, 31-60m, 60m+
  const getIntensityClass = (item: DailyActivityPoint | DailyActivityItem) => {
    const mins = getDayActualMinutes(item);
    if (mins <= 0) {
      return "bg-(--bg-surface-raised) border-(--border-subtle) hover:border-(--border-strong)";
    }
    if (mins <= 15) {
      return "bg-(--accent-lime)/20 border-(--accent-lime)/30 hover:bg-(--accent-lime)/35";
    }
    if (mins <= 30) {
      return "bg-(--accent-lime)/45 border-(--accent-lime)/55 hover:bg-(--accent-lime)/65";
    }
    if (mins <= 60) {
      return "bg-(--accent-lime)/75 border-(--accent-lime)/85 hover:bg-(--accent-lime)/85";
    }
    return "bg-(--accent-lime) border-(--accent-lime)";
  };

  // Formatted duration
  const hours = Math.floor(totalFocusedMinutes / 60);
  const mins = totalFocusedMinutes % 60;
  const formattedDuration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <div
      ref={containerRef}
      className={cn(
        "@container rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-5 sm:p-6 space-y-4",
        className
      )}
    >
      {/* Header with explicit period and single-measure summary metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-(--border-subtle)/60">
        <div>
          <h3 className="text-sm font-bold text-(--text-primary)">
            Consistency & Practice Rhythm
          </h3>
          <p className="text-[11px] text-(--text-muted)">
            {periodLabel} · Measure: Daily focused study minutes
          </p>
        </div>

        {/* Metric summary pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-(--border-subtle) bg-(--bg-surface-raised) px-2.5 py-1 text-xs font-medium text-(--text-secondary)">
            <Clock className="size-3 text-(--accent-lime)" />
            <strong className="font-tabular text-(--text-primary)">{formattedDuration}</strong> focused
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-(--border-subtle) bg-(--bg-surface-raised) px-2.5 py-1 text-xs font-medium text-(--text-secondary)">
            <CheckCircle2 className="size-3 text-emerald-400" />
            <strong className="font-tabular text-(--text-primary)">{totalSolved}</strong> solved
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-(--border-subtle) bg-(--bg-surface-raised) px-2.5 py-1 text-xs font-medium text-(--text-secondary)">
            <Calendar className="size-3 text-(--text-muted)" />
            <strong className="font-tabular text-(--text-primary)">{activeDaysCount}</strong> of 28 active days
          </span>
        </div>
      </div>

      {/* Grid container with container-aware responsiveness (inspector moves below heatmap when narrow) */}
      <div className="flex flex-col @lg:flex-row @lg:items-center justify-between gap-5 pt-1">
        <div className="shrink-0">
          {/* Weekday Labels (Mon to Sun) */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold text-(--text-muted) pb-1">
            <span>M</span>
            <span>T</span>
            <span>W</span>
            <span>T</span>
            <span>F</span>
            <span>S</span>
            <span>S</span>
          </div>

          {/* 7-column Calendar Cells (Max 24px) */}
          <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label="28-day activity calendar">
            {gridCells.map((cell) => {
              if (cell.isPad) {
                return (
                  <div
                    key={cell.id}
                    className="size-5 sm:size-6 rounded-md bg-(--bg-surface-raised)/20 border border-transparent"
                    aria-hidden="true"
                  />
                );
              }

              const item = cell as DailyActivityPoint | DailyActivityItem;
              const isSelected = selectedDay?.dateKey === item.dateKey;
              const actualMins = getDayActualMinutes(item);
              const label = `${format(parseISO(item.date), "MMMM d")}: ${actualMins}m focused study, ${
                item.problemsSolved
              } solved`;

              return (
                <button
                  key={cell.id}
                  type="button"
                  tabIndex={0}
                  aria-label={label}
                  onClick={() => setSelectedDay(item)}
                  onFocus={() => setSelectedDay(item)}
                  onMouseEnter={() => setSelectedDay(item)}
                  className={cn(
                    "size-5 sm:size-6 rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-(--accent-lime)",
                    isSelected && "ring-2 ring-white/70 scale-105",
                    getIntensityClass(item)
                  )}
                />
              );
            })}
          </div>
        </div>

        {/* Selected Day Inspector — Reveals actual focused minutes as primary measure with separate solve/attempt/review facts */}
        <div className="flex-1 rounded-lg border border-(--border-subtle) bg-(--bg-surface-raised) p-3 text-xs min-h-[76px] flex flex-col justify-center">
          {selectedDay ? (
            <div className="space-y-1">
              <p className="font-semibold text-(--text-primary)">
                {format(parseISO(selectedDay.date), "EEEE, MMMM d, yyyy")}
              </p>
              <div className="text-(--text-secondary) text-[11px] leading-relaxed">
                {getDayActualMinutes(selectedDay) > 0 ||
                selectedDay.problemsSolved > 0 ||
                selectedDay.problemsAttempted > 0 ||
                selectedDay.revisionsDone > 0 ? (
                  <span>
                    <strong className="text-(--text-primary)">{getDayActualMinutes(selectedDay)}m</strong> focused study
                    {selectedDay.problemsSolved > 0 && (
                      <span> · <strong className="text-emerald-400">{selectedDay.problemsSolved}</strong> {selectedDay.problemsSolved === 1 ? "problem" : "problems"} solved</span>
                    )}
                    {selectedDay.problemsAttempted > selectedDay.problemsSolved && (
                      <span> · <strong className="text-white/80">{selectedDay.problemsAttempted}</strong> attempted</span>
                    )}
                    {selectedDay.revisionsDone > 0 && (
                      <span> · <strong className="text-amber-400">{selectedDay.revisionsDone}</strong> {selectedDay.revisionsDone === 1 ? "review" : "reviews"} completed</span>
                    )}
                  </span>
                ) : (
                  <span className="text-(--text-muted)">0m focused study · No activity recorded on this date</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-(--text-muted)">
              Select or hover any day in the grid to inspect focused study time and problem activity.
            </p>
          )}
        </div>
      </div>

      {/* Explicit Legend with Documented Units & Single Measure */}
      <div className="pt-2 border-t border-(--border-subtle)/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-(--text-muted)">
        <span>Legend (Daily study minutes)</span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-xs bg-(--bg-surface-raised) border border-(--border-subtle)" />
            0m
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-xs bg-(--accent-lime)/20 border border-(--accent-lime)/30" />
            1–15m
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-xs bg-(--accent-lime)/45 border border-(--accent-lime)/55" />
            16–30m
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-xs bg-(--accent-lime)/75 border border-(--accent-lime)/85" />
            31–60m
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-xs bg-(--accent-lime) border border-(--accent-lime)" />
            60m+
          </span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState, useRef } from "react";
import { format, parseISO } from "date-fns";
import { Flame, Calendar } from "lucide-react";

export interface DailyActivityItem {
  date: string;
  dateKey: string;
  minutes: number;
  problemsSolved: number;
  problemsAttempted: number;
  revisionsDone: number;
  activityScore: number;
}

interface ActivityHeatmapProps {
  activityHistory?: DailyActivityItem[];
  streakDays?: number;
  embedded?: boolean;
}

export function ActivityHeatmap({ activityHistory = [], streakDays = 0, embedded = false }: ActivityHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredDay, setHoveredDay] = useState<DailyActivityItem | null>(null);
  const [hoveredPos, setHoveredPos] = useState<{ x: number; y: number } | null>(null);

  // Ensure exactly 28 days
  const days = useMemo(() => {
    if (activityHistory.length >= 28) return activityHistory.slice(-28);
    return activityHistory;
  }, [activityHistory]);

  const activeDaysCount = useMemo(() => {
    return days.filter((d) => d.activityScore > 0).length;
  }, [days]);

  const totalMinutes = useMemo(() => {
    return days.reduce((sum, d) => sum + (d.minutes || 0), 0);
  }, [days]);

  const totalSolved = useMemo(() => {
    return days.reduce((sum, d) => sum + (d.problemsSolved || 0), 0);
  }, [days]);

  const getIntensityClass = (score: number) => {
    if (score <= 0) return "bg-(--bg-surface-raised) border border-(--border-subtle) hover:border-(--border-subtle)/80";
    if (score < 25) return "bg-(--accent-lime)/20 border border-(--accent-lime)/30 hover:bg-(--accent-lime)/35 hover:scale-105 shadow-[0_0_8px_rgba(200,255,0,0.08)]";
    if (score < 60) return "bg-(--accent-lime)/60 border border-(--accent-lime)/70 hover:bg-(--accent-lime)/75 hover:scale-105 shadow-[0_0_12px_rgba(200,255,0,0.18)]";
    return "bg-(--accent-lime) border border-(--accent-lime) hover:scale-105 shadow-[0_0_16px_rgba(200,255,0,0.3)]";
  };

  return (
    <div className={embedded ? "p-4 sm:p-5" : "rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-5 sm:p-6 transition-all"}>
      <div className={`flex flex-wrap items-center justify-between gap-3 pb-4 ${embedded ? "" : "border-b border-(--border-subtle)"}`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-(--accent-lime)">Consistency Matrix</p>
          <h3 className="mt-0.5 text-base sm:text-lg font-bold text-(--text-primary)">28-Day Activity</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-(--accent-amber)/30 bg-(--accent-amber)/10 px-2.5 py-1 text-xs font-semibold text-(--accent-amber)">
            <Flame size={12} className="text-(--accent-amber)" />
            {streakDays > 0 ? `${streakDays}d streak` : "0d streak"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-(--border-subtle) bg-(--bg-surface-raised) px-2.5 py-1 text-xs font-medium text-(--text-secondary)">
            <Calendar size={12} className="text-(--accent-lime)" />
            {activeDaysCount}/28d
          </span>
        </div>
      </div>

      {/* Grid Container with Custom Floating Tooltip */}
      <div ref={containerRef} className="relative mt-4 flex flex-col items-center sm:items-start">
        {/* Floating Custom Tooltip */}
        {hoveredDay && hoveredPos && (
          <div
            className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full pb-2 transition-all duration-150"
            style={{ left: hoveredPos.x, top: hoveredPos.y }}
          >
            <div className="rounded-xl border border-(--accent-lime)/40 bg-(--bg-surface-raised)/95 px-3 py-2 text-center shadow-2xl backdrop-blur-md whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
              <p className="text-xs font-bold text-(--accent-lime)">
                {format(parseISO(hoveredDay.date), "EEEE, MMM d")}
              </p>
              <p className="mt-0.5 text-[11px] text-(--text-secondary)">
                {hoveredDay.activityScore > 0 ? (
                  <span>
                    <strong className="text-(--text-primary) font-semibold">{hoveredDay.minutes}m</strong> focused ·{" "}
                    <strong className="text-emerald-400 font-semibold">{hoveredDay.problemsSolved}</strong> solved ·{" "}
                    <strong className="text-amber-400 font-semibold">{hoveredDay.revisionsDone}</strong> revised
                  </span>
                ) : (
                  <span className="text-(--text-muted)">No activity logged</span>
                )}
              </p>
              {/* Arrow */}
              <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-(--bg-surface-raised)/95" />
            </div>
          </div>
        )}

        {/* Compact Heatmap Grid: 7 days x 4 weeks */}
        <div className="inline-block">
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-semibold text-(--text-muted)">
            <span className="w-6 sm:w-7">M</span>
            <span className="w-6 sm:w-7">T</span>
            <span className="w-6 sm:w-7">W</span>
            <span className="w-6 sm:w-7">T</span>
            <span className="w-6 sm:w-7">F</span>
            <span className="w-6 sm:w-7">S</span>
            <span className="w-6 sm:w-7">S</span>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {days.map((item) => (
              <div
                key={item.dateKey || item.date}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const parentRect = containerRef.current?.getBoundingClientRect() || rect;
                  setHoveredDay(item);
                  setHoveredPos({
                    x: rect.left - parentRect.left + rect.width / 2,
                    y: rect.top - parentRect.top,
                  });
                }}
                onMouseLeave={() => {
                  setHoveredDay(null);
                  setHoveredPos(null);
                }}
                className={`size-6 sm:size-7 rounded-[6px] transition-all duration-150 cursor-pointer ${getIntensityClass(
                  item.activityScore
                )}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Inspector Strip */}
      <div className="mt-4 min-h-7 rounded-lg border border-(--border-subtle) bg-(--bg-surface-raised) px-3 py-1.5 text-xs text-(--text-secondary) flex items-center justify-between">
        {hoveredDay ? (
          <>
            <span className="font-semibold text-(--text-primary)">
              {format(parseISO(hoveredDay.date), "EEE, MMM d")}
            </span>
            <span className="text-[11px] text-(--text-muted)">
              {hoveredDay.activityScore > 0 ? (
                <>
                  <strong className="text-(--accent-lime)">{hoveredDay.minutes}m</strong> focused ·{" "}
                  <strong className="text-emerald-400">{hoveredDay.problemsSolved}</strong> solved ·{" "}
                  <strong className="text-amber-400">{hoveredDay.revisionsDone}</strong> revised
                </>
              ) : (
                "No activity on this day"
              )}
            </span>
          </>
        ) : (
          <div className="flex items-center justify-between w-full text-[11px] text-(--text-muted)">
            <span>Hover to inspect activity</span>
            <span className="flex items-center gap-1.5">
              <span>Less</span>
              <span className="size-2 rounded-xs bg-(--bg-surface-raised) border border-(--border-subtle)" />
              <span className="size-2 rounded-xs bg-(--accent-lime)/20 border border-(--accent-lime)/30" />
              <span className="size-2 rounded-xs bg-(--accent-lime)/60 border border-(--accent-lime)/70" />
              <span className="size-2 rounded-xs bg-(--accent-lime) border border-(--accent-lime)" />
              <span>More</span>
            </span>
          </div>
        )}
      </div>

      {/* Compact Summary Metrics */}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-(--border-subtle) pt-3 text-center text-xs">
        <div>
          <p className="text-sm font-bold text-(--text-primary)">{Math.round((totalMinutes / 60) * 10) / 10}h</p>
          <p className="text-[10px] uppercase tracking-wide text-(--text-muted)">Focused Time</p>
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-400">{totalSolved}</p>
          <p className="text-[10px] uppercase tracking-wide text-(--text-muted)">Solved</p>
        </div>
        <div>
          <p className="text-sm font-bold text-(--accent-lime)">{activeDaysCount} d</p>
          <p className="text-[10px] uppercase tracking-wide text-(--text-muted)">Active Days</p>
        </div>
      </div>
    </div>
  );
}

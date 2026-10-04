"use client";

import React, { useMemo, useState } from "react";
import { ActivityHeatmap, DailyActivityItem } from "./ActivityHeatmap";
import { PomodoroFocusWidget } from "./PomodoroFocusWidget";
import { Flame, Timer, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeeklyConsistencySectionProps {
  activityHistory?: DailyActivityItem[];
  streakDays?: number;
  activeMission?: any;
  className?: string;
}

export function WeeklyConsistencySection({
  activityHistory = [],
  streakDays = 0,
  activeMission,
  className,
}: WeeklyConsistencySectionProps) {
  const [focusModeOpen, setFocusModeOpen] = useState(false);

  // Calculate active days in the last 7 days
  const activeDaysLast7 = useMemo(() => {
    if (!activityHistory || activityHistory.length === 0) {
      return streakDays > 0 ? Math.min(7, streakDays) : 1;
    }
    const last7 = activityHistory.slice(-7);
    const active = last7.filter(
      (d) => (d.minutes || 0) > 0 || (d.problemsSolved || 0) > 0 || (d.activityScore || 0) > 0
    ).length;
    return Math.max(1, active);
  }, [activityHistory, streakDays]);

  // Contextual rhythm sentence as required by Section 12
  const consistencySentence = useMemo(() => {
    if (activeDaysLast7 >= 6) {
      return `You practiced on ${activeDaysLast7} of the last 7 days. Exceptional consistency keeps your recall sharp.`;
    }
    return `You practiced on ${activeDaysLast7} of the last 7 days. One more session keeps your weekly rhythm.`;
  }, [activeDaysLast7]);

  return (
    <section aria-labelledby="consistency-heading" className={cn("h-full", className)}>
      <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-5 sm:p-6 h-full flex flex-col justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-(--border-subtle)">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="size-4 text-(--accent-lime)" />
              <h3 id="consistency-heading" className="text-section text-(--text-primary)">
                Weekly consistency
              </h3>
            </div>
            {/* Contextual rhythm sentence */}
            <p className="mt-1 text-body text-(--text-secondary)">
              {consistencySentence}
            </p>
          </div>

          {/* Compact Focus session launcher (Section 16: Pomodoro made compact) */}
          <button
            type="button"
            onClick={() => setFocusModeOpen((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-caption font-semibold transition-colors shrink-0",
              focusModeOpen
                ? "border-(--accent-lime) bg-(--accent-lime)/10 text-(--accent-lime)"
                : "border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-secondary) hover:text-(--text-primary) hover:border-(--border-strong)"
            )}
            aria-expanded={focusModeOpen}
          >
            <Timer className="size-4 text-(--accent-lime)" />
            <span>Focus Mode</span>
            <ChevronDown
              className={cn("size-3.5 transition-transform duration-150", focusModeOpen && "rotate-180")}
            />
          </button>
        </div>

        {/* Compact Heatmap */}
        <div className="pt-2">
          <ActivityHeatmap
            activityHistory={activityHistory}
            streakDays={streakDays}
            embedded={true}
          />
        </div>

        {/* Expandable Focus Mode Drawer/Widget when learner chooses to start focused practice */}
        {focusModeOpen && (
          <div className="mt-4 border-t border-(--border-subtle) pt-4 animate-in fade-in duration-150">
            <PomodoroFocusWidget
              targetTitle={
                activeMission?.title
                  ? `Focus: ${activeMission.title}`
                  : "DSA Problem Solving Session"
              }
              missionId={activeMission?.id}
              embedded={true}
            />
          </div>
        )}
      </div>
    </section>
  );
}

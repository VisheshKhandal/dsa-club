"use client";

import React from "react";
import Link from "next/link";
import { Check, Circle, ArrowRight, Milestone, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PlanSpineNode {
  id: string;
  title: string;
  dayIndex?: number;
  status: "completed" | "current" | "upcoming";
  isCheckpoint?: boolean;
}

export interface PlanSpineStripProps {
  activePlan?: {
    topicName?: string;
    currentDayIndex?: number;
    totalDays?: number;
    cycleNumber?: number;
  } | null;
  activeMission?: {
    topic?: string;
    totalSteps?: number;
    currentStageNumber?: number;
    journey?: Array<{ key: string; title: string; state: string }>;
  } | null;
}

export function PlanSpineStrip({ activePlan, activeMission }: PlanSpineStripProps) {
  const currentDay = activePlan?.currentDayIndex || 1;
  const totalDays = activePlan?.totalDays || 18;
  const topicName = activePlan?.topicName || activeMission?.topic || "DSA Fundamentals";

  // Derive 5 visual spine nodes around the current point
  const spineNodes: PlanSpineNode[] = React.useMemo(() => {
    if (activePlan) {
      // 5-stage progression across the cycle
      const stages = [
        { id: "s1", title: "Foundations & Invariants", targetDay: 1 },
        { id: "s2", title: "Fixed Window Patterns", targetDay: Math.max(2, Math.round(totalDays * 0.25)) },
        { id: "s3", title: "Dynamic / Variable Windows", targetDay: Math.max(3, Math.round(totalDays * 0.5)) },
        { id: "s4", title: "Mixed Constraints & Edge-Cases", targetDay: Math.max(4, Math.round(totalDays * 0.75)) },
        { id: "s5", title: "Milestone Assessment Checkpoint", targetDay: totalDays, isCheckpoint: true },
      ];

      return stages.map((s) => {
        let status: "completed" | "current" | "upcoming" = "upcoming";
        if (currentDay > s.targetDay) {
          status = "completed";
        } else if (
          currentDay === s.targetDay ||
          (currentDay < s.targetDay && stages.findIndex((x) => x.id === s.id) === stages.findIndex((x) => x.targetDay >= currentDay))
        ) {
          status = "current";
        }
        return {
          id: s.id,
          title: s.title,
          dayIndex: s.targetDay,
          status,
          isCheckpoint: s.isCheckpoint,
        };
      });
    }

    if (activeMission?.journey && activeMission.journey.length > 0) {
      return activeMission.journey.slice(0, 5).map((step, idx) => ({
        id: step.key || `step-${idx}`,
        title: step.title,
        dayIndex: idx + 1,
        status: (step.state === "completed" ? "completed" : step.state === "current" ? "current" : "upcoming") as any,
        isCheckpoint: idx === activeMission.journey!.length - 1,
      }));
    }

    // Default 5-stage spine
    return [
      { id: "1", title: "Core Basics", dayIndex: 1, status: "completed" },
      { id: "2", title: "Fixed Traversal", dayIndex: 2, status: "completed" },
      { id: "3", title: "Variable Constraints", dayIndex: 3, status: "current" },
      { id: "4", title: "Complex Windows", dayIndex: 4, status: "upcoming" },
      { id: "5", title: "Checkpoint", dayIndex: 5, status: "upcoming", isCheckpoint: true },
    ];
  }, [activePlan, activeMission, currentDay, totalDays]);

  return (
    <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-(--border-subtle)/70">
        <div className="flex items-center gap-2">
          <div className="grid size-6 place-items-center rounded-md bg-(--accent-lime)/10 text-(--accent-lime)">
            <Milestone className="size-3.5" />
          </div>
          <span className="text-xs font-semibold tracking-wider uppercase text-(--text-muted)">
            Learning Spine · {topicName}
          </span>
          <span className="rounded-full bg-(--bg-surface-raised) border border-(--border-subtle) px-2 py-0.5 text-[11px] font-medium text-(--text-secondary)">
            Day {currentDay} of {totalDays}
          </span>
        </div>

        <Link
          href="/plan"
          className="group inline-flex items-center gap-1 text-xs font-medium text-(--accent-lime) hover:underline self-start sm:self-auto"
        >
          <span>View full plan</span>
          <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Horizontal Progression Nodes */}
      <div className="mt-4 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center justify-between min-w-[540px] gap-2">
          {spineNodes.map((node, index) => {
            const isCompleted = node.status === "completed";
            const isCurrent = node.status === "current";
            const isLast = index === spineNodes.length - 1;

            return (
              <React.Fragment key={node.id}>
                {/* Node Item */}
                <div className="flex flex-col items-center text-center max-w-[110px] group">
                  <div
                    className={cn(
                      "grid size-8 place-items-center rounded-full border transition-all duration-200",
                      isCompleted &&
                        "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
                      isCurrent &&
                        "border-(--accent-lime) bg-(--accent-lime)/20 text-(--accent-lime) shadow-[0_0_12px_rgba(183,243,107,0.35)] scale-110",
                      !isCompleted &&
                        !isCurrent &&
                        "border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-muted)"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="size-4 stroke-[2.5]" />
                    ) : isCurrent ? (
                      <div className="size-2 rounded-full bg-(--accent-lime) animate-pulse" />
                    ) : (
                      <span className="text-[11px] font-bold">{index + 1}</span>
                    )}
                  </div>

                  <p
                    className={cn(
                      "mt-2 text-[11px] line-clamp-2 leading-tight transition-colors",
                      isCurrent
                        ? "font-bold text-(--text-primary)"
                        : isCompleted
                        ? "font-medium text-(--text-secondary)"
                        : "text-(--text-muted)"
                    )}
                  >
                    {node.title}
                  </p>
                </div>

                {/* Connector Line */}
                {!isLast && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 rounded-full transition-colors",
                      isCompleted ? "bg-emerald-500/40" : "bg-(--border-subtle)"
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { Check, Clock, Lock, Menu, X, PlayCircle } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { Stage } from "@/features/platform/engines/learning.engine";
import type { ResolvedMissionState } from "./mission-state-resolver";
import { formatStageTitle } from "./mission-state-resolver";
import { RestartMissionButton } from "@/components/product/forms";
import { cn } from "@/lib/utils";

export interface MissionOutlineProps {
  state: ResolvedMissionState;
  onSelectStage: (stageKey: string) => void;
  missionId: string;
  className?: string;
}

function getEstimatedMinutes(stage: Stage): number {
  switch (stage.kind) {
    case "introduction":
      return 2;
    case "intuition":
      return 3;
    case "concept":
    case "mental_model":
      return 4;
    case "visualization":
      return 3;
    case "pattern":
    case "example":
      return 5;
    case "practice":
      return 15;
    case "reflection":
      return 3;
    case "mastery":
      return 5;
    default:
      return 3;
  }
}

export function MissionOutline({
  state,
  onSelectStage,
  missionId,
  className,
}: MissionOutlineProps) {
  const shouldReduceMotion = useReducedMotion();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const {
    stages,
    totalStages,
    completedStagesCount,
    selectedStageKey,
    selectedStageNumber,
    frontierStageKey,
  } = state;

  const remainingMinutes = stages
    .filter((s) => s.status !== "completed")
    .reduce((acc, s) => acc + getEstimatedMinutes(s), 0);

  const outlineContent = (
    <div className="space-y-4">
      {/* ── Outline Header ── */}
      <div className="flex items-center justify-between px-1 border-b border-(--color-border) pb-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-(--color-text-muted)">
          Mission Outline
        </h2>
        <span className="text-xs font-semibold tabular-nums text-(--color-text-secondary)">
          {completedStagesCount} / {totalStages} completed
        </span>
      </div>

      {/* ── Vertical Connected Stage Rail ── */}
      <nav aria-label="Mission Stages Outline" className="relative space-y-1">
        {/* Subtle vertical connector guide line */}
        <div className="absolute left-[15px] top-3.5 bottom-3.5 w-[1.5px] bg-(--color-border)" aria-hidden="true" />

        {stages.map((stage, idx) => {
          const isSelected = stage.key === selectedStageKey;
          const isFrontier = stage.key === frontierStageKey;
          const isCompleted = stage.status === "completed";
          const isLocked = stage.status === "locked";
          const estMin = getEstimatedMinutes(stage);
          const stageTitle = formatStageTitle(stage);

          // Status Badge Label
          let statusLabel = "Upcoming";
          if (isSelected && isFrontier) statusLabel = "Viewing · Current";
          else if (isSelected && isCompleted) statusLabel = "Viewing · Review";
          else if (isSelected) statusLabel = "Viewing";
          else if (isCompleted) statusLabel = "Completed";
          else if (isFrontier) statusLabel = "Next Up";
          else if (isLocked) statusLabel = "Locked";

          return (
            <div key={stage.key} className="relative z-10">
              <button
                type="button"
                disabled={isLocked}
                onClick={() => {
                  onSelectStage(stage.key);
                  setMobileDrawerOpen(false);
                }}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-(--radius-btn) p-2 text-left transition-colors duration-150 focus-ring",
                  isSelected
                    ? "bg-(--color-surface-2) text-(--color-text-primary) font-semibold shadow-2xs border border-(--color-border)"
                    : isLocked
                    ? "cursor-not-allowed opacity-35 hover:bg-transparent"
                    : "hover:bg-(--color-surface-1) text-(--color-text-secondary) hover:text-(--color-text-primary)"
                )}
              >
                {/* Status Indicator Node */}
                <div
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                    isSelected
                      ? "border-cyan-400 bg-cyan-500/15 text-cyan-300 ring-2 ring-cyan-400/25"
                      : isCompleted
                      ? "border-emerald-400 bg-emerald-500/10 text-emerald-400"
                      : isFrontier
                      ? "border-cyan-400/70 bg-cyan-500/10 text-cyan-300"
                      : isLocked
                      ? "border-(--color-border) bg-(--color-surface-2) text-(--color-text-muted)"
                      : "border-(--color-border) bg-(--color-surface-1) text-(--color-text-muted)"
                  )}
                >
                  {isCompleted ? (
                    <Check size={11} className="stroke-[2.5]" />
                  ) : isFrontier ? (
                    <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  ) : isLocked ? (
                    <Lock size={10} />
                  ) : (
                    <span className="size-1.5 rounded-full bg-(--color-border)" />
                  )}
                </div>

                {/* Stage Metadata */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-xs leading-snug">
                      {stageTitle}
                    </p>
                    <span className="shrink-0 text-[10px] text-(--color-text-muted) tabular-nums">
                      ~{estMin}m
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] uppercase font-bold tracking-wider",
                      isSelected
                        ? "text-cyan-300 font-extrabold"
                        : isCompleted
                        ? "text-emerald-400/80"
                        : isFrontier
                        ? "text-cyan-400"
                        : "text-(--color-text-muted)"
                    )}
                  >
                    {statusLabel}
                  </span>
                </div>
              </button>
            </div>
          );
        })}
      </nav>

      {/* ── Summary Footer ── */}
      <div className="border-t border-(--color-border) pt-3 px-1 text-xs space-y-2">
        <div className="flex items-center gap-1.5 text-(--color-text-muted)">
          <Clock size={13} className="text-cyan-400 shrink-0" />
          <span>
            Remaining: <strong className="font-semibold text-(--color-text-primary)">~{remainingMinutes} min</strong>
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-(--color-text-muted)">
          <span>{totalStages - completedStagesCount} stages left</span>
          <RestartMissionButton missionId={missionId} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile/Tablet Drawer Trigger ── */}
      <div className="lg:hidden w-full">
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="flex w-full items-center justify-between rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) px-4 py-2.5 text-xs font-semibold text-(--color-text-primary) shadow-2xs hover:bg-(--color-surface-2) transition-colors"
        >
          <div className="flex items-center gap-2">
            <Menu size={14} className="text-(--color-purple)" />
            <span>Mission Outline</span>
            <span className="text-(--color-text-muted) font-normal">
              (Stage {selectedStageNumber} of {totalStages})
            </span>
          </div>
          <span className="text-cyan-400 font-bold tabular-nums">
            {completedStagesCount}/{totalStages}
          </span>
        </button>
      </div>

      {/* ── Mobile Slide-Over Sheet Drawer ── */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex justify-start">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Mission Outline Drawer"
              initial={shouldReduceMotion ? undefined : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={shouldReduceMotion ? undefined : { x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="relative z-10 h-full w-full max-w-xs bg-(--color-bg) p-5 border-r border-(--color-border) shadow-2xl overflow-y-auto"
            >
              <div className="flex justify-end pb-2">
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Close outline"
                  className="p-1 rounded-md text-(--color-text-muted) hover:text-(--color-text-primary)"
                >
                  <X size={18} />
                </button>
              </div>
              {outlineContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Desktop Sticky Outline Rail ── */}
      <aside className={cn("hidden lg:block sticky top-0 self-start w-[260px] shrink-0", className)}>
        <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) p-4 shadow-2xs max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin">
          {outlineContent}
        </div>
      </aside>
    </>
  );
}

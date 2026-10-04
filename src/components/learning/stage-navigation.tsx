"use client";

import React from "react";
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from "lucide-react";
import type { ResolvedMissionState } from "./mission-state-resolver";
import { cn } from "@/lib/utils";

export interface StageNavigationProps {
  state: ResolvedMissionState;
  onPreviousStage: () => void;
  onNextStage: () => void;
  isInteractiveIncomplete?: boolean;
  pendingTransition?: boolean;
  className?: string;
}

export function StageNavigation({
  state,
  onPreviousStage,
  onNextStage,
  isInteractiveIncomplete = false,
  pendingTransition = false,
  className,
}: StageNavigationProps) {
  const {
    selectedStageNumber,
    totalStages,
    selectedStageTitle,
    canGoBack,
    selectedStageIndex,
  } = state;

  const isLastStage = selectedStageIndex === totalStages - 1;

  return (
    <div
      className={cn(
        "w-full border-t border-(--color-border) bg-(--color-surface-1)/95 px-4 py-3 sm:px-8 backdrop-blur-xl shadow-lg pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]",
        className
      )}
    >
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
        {/* Previous Stage */}
        <button
          type="button"
          onClick={onPreviousStage}
          disabled={!canGoBack || pendingTransition}
          className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-(--radius-btn) border border-(--color-border) bg-(--color-surface-2) px-3 text-xs font-semibold text-(--color-text-secondary) hover:bg-(--color-surface-3) hover:text-(--color-text-primary) transition-colors disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowLeft size={13} />
          <span className="hidden sm:inline">Previous Stage</span>
          <span className="sm:hidden">Back</span>
        </button>

        {/* Center: Stage Context (Matches Header and Outline exactly) */}
        <div className="flex items-center gap-1.5 text-xs text-(--color-text-muted)">
          <span className="font-semibold text-(--color-text-primary)">Stage {selectedStageNumber}</span>
          <span>of</span>
          <span>{totalStages}</span>
          <span className="hidden md:inline">·</span>
          <span className="hidden md:inline font-medium text-cyan-400 truncate max-w-[240px]">
            {selectedStageTitle}
          </span>
        </div>

        {/* Next Stage / Finish Mission */}
        <button
          type="button"
          onClick={onNextStage}
          disabled={isInteractiveIncomplete || pendingTransition}
          title={isInteractiveIncomplete ? "Complete the exercise above to advance" : undefined}
          className={cn(
            "focus-ring inline-flex h-9 items-center gap-1.5 rounded-(--radius-btn) px-4 text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0",
            isLastStage
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
              : "bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500"
          )}
        >
          {pendingTransition ? (
            <span className="inline-flex items-center gap-1.5">
              <LoaderCircle size={13} className="animate-spin" />
              <span>Advancing...</span>
            </span>
          ) : isLastStage ? (
            <>
              <span>Finish Mission</span>
              <Check size={13} className="stroke-[2.5]" />
            </>
          ) : (
            <>
              <span>Next Stage</span>
              <ArrowRight size={13} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

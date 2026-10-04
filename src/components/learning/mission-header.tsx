"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  ChevronRight,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { ResolvedMissionState } from "./mission-state-resolver";
import type { LearningPathContext } from "@/features/learning-paths/types/learning-path-continuity.types";
import { cn } from "@/lib/utils";

export interface MissionHeaderProps {
  missionTitle: string;
  topicName?: string;
  topicSlug?: string;
  state: ResolvedMissionState;
  learningPathContext?: LearningPathContext | null;
  focusMode?: boolean;
  isFromPlan?: boolean;
  onToggleFocusMode?: () => void;
  onOpenAI?: () => void;
}

export function MissionHeader({
  missionTitle,
  topicName,
  topicSlug,
  state,
  learningPathContext,
  focusMode = false,
  isFromPlan = false,
  onToggleFocusMode,
  onOpenAI,
}: MissionHeaderProps) {
  const {
    selectedStageNumber,
    totalStages,
    completedStagesCount,
    missionProgressPercent,
  } = state;

  return (
    <header className="space-y-2 border-b border-(--color-border) pb-3">
      {/* ── Semantic Breadcrumb & Secondary Actions ── */}
      <nav
        aria-label="Mission navigation breadcrumb"
        className="flex items-center gap-1.5 text-xs text-(--color-text-muted)"
      >
        {isFromPlan ? (
          <>
            <Link
              href="/plan"
              className="group flex items-center gap-1.5 font-medium text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
            >
              <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
              <span>Study Plan</span>
            </Link>
            <ChevronRight size={11} className="text-(--color-border)" />
            <span className="font-semibold text-(--color-text-primary) truncate max-w-xs sm:max-w-md">
              {missionTitle}
            </span>
          </>
        ) : learningPathContext ? (
          <>
            <Link
              href={learningPathContext.backToStageUrl}
              className="group flex items-center gap-1.5 font-medium text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
            >
              <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
              <span>Learning Path Stage {learningPathContext.stageOrder}</span>
            </Link>
            <ChevronRight size={11} className="text-(--color-border)" />
            <span className="font-semibold text-(--color-text-primary) truncate max-w-xs sm:max-w-md">
              {missionTitle}
            </span>
          </>
        ) : (
          <>
            <Link
              href="/learn"
              className="group flex items-center gap-1.5 font-medium text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
            >
              <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
              <span>Learn</span>
            </Link>
            <ChevronRight size={11} className="text-(--color-border)" />
            {topicSlug && topicName && (
              <>
                <Link
                  href={`/learn/topics/${topicSlug}`}
                  className="hover:text-(--color-text-primary) transition-colors"
                >
                  {topicName}
                </Link>
                <ChevronRight size={11} className="text-(--color-border)" />
              </>
            )}
            <span className="font-semibold text-(--color-text-primary) truncate max-w-xs sm:max-w-md">
              {missionTitle}
            </span>
          </>
        )}

        {/* Action Controls (Focus Mode & AI Assistant Trigger) */}
        <div className="ml-auto flex items-center gap-2">
          {onOpenAI && (
            <button
              type="button"
              onClick={onOpenAI}
              aria-label="Ask DSA Club Intelligence"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-(--radius-badge) text-xs font-semibold bg-(--color-purple-subtle) text-(--color-purple) hover:bg-(--color-purple-subtle)/80 transition-colors border border-(--color-purple)/20 focus-ring"
            >
              <Brain size={13} />
              <span className="hidden sm:inline">Ask Intelligence</span>
            </button>
          )}

          {onToggleFocusMode && (
            <button
              type="button"
              onClick={onToggleFocusMode}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-(--radius-badge) text-xs font-medium transition-colors border focus-ring",
                focusMode
                  ? "bg-(--color-purple-subtle) text-(--color-purple) border-(--color-purple)/30"
                  : "bg-transparent text-(--color-text-muted) hover:text-(--color-text-primary) border-(--color-border)"
              )}
              title={focusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
              aria-label={focusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
            >
              {focusMode ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              <span className="hidden sm:inline">{focusMode ? "Exit Focus" : "Focus Mode"}</span>
            </button>
          )}
        </div>
      </nav>

      {/* ── Compact Mission Title + Inline Progress ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-(--color-text-primary) leading-tight truncate">
            {missionTitle}
          </h1>
          <span className="hidden sm:inline-flex items-center gap-1 shrink-0 rounded-full bg-cyan-400/10 px-2 py-0.5 text-[11px] font-bold text-cyan-300 border border-cyan-400/20">
            Stage {selectedStageNumber}/{totalStages}
          </span>
        </div>

        {/* Inline Progress */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-24 sm:w-32 h-1.5 rounded-full bg-(--color-surface-2) overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${missionProgressPercent}%` }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums text-(--color-text-primary)">
            {missionProgressPercent}%
          </span>
          <span className="hidden md:inline text-[11px] text-(--color-text-muted)">
            ({completedStagesCount}/{totalStages})
          </span>
        </div>
      </div>
    </header>
  );
}

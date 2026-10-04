"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Lock,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import { DifficultyBadge, StatusBadge } from "@/components/product/ui";
import { BookmarkButton } from "@/components/product/forms";
import type { LearningPathContext } from "@/features/learning-paths/types/learning-path-continuity.types";
import { cn } from "@/lib/utils";

export interface ProblemWorkspaceHeaderProps {
  problemId: string;
  title: string;
  summary: string;
  difficulty?: string;
  status?: string;
  estimatedMinutes?: number;
  pattern?: string;
  patternSlug?: string;
  hasRecognition?: boolean;
  topics?: string[];
  bookmarked?: boolean;
  learningPathContext?: LearningPathContext | null;
  onOpenIntelligence?: () => void;
  className?: string;

  // Compact timer controls
  timerSeconds?: number;
  isTimerRunning?: boolean;
  onToggleTimer?: () => void;
  onResetTimer?: () => void;

  // Integrated secondary metadata
  activePhase?: number;
  sourceLabel?: string;
}

export function ProblemWorkspaceHeader({
  problemId,
  title,
  summary,
  difficulty = "medium",
  status = "not_started",
  estimatedMinutes,
  pattern,
  patternSlug = "",
  hasRecognition = false,
  topics = [],
  bookmarked = false,
  learningPathContext,
  onOpenIntelligence,
  className,
  timerSeconds,
  isTimerRunning = false,
  onToggleTimer,
  onResetTimer,
  activePhase,
  sourceLabel,
}: ProblemWorkspaceHeaderProps) {
  const searchParams = useSearchParams();
  const isFromPlan = searchParams?.get("from") === "plan" || searchParams?.get("source") === "plan";

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const phaseLabel =
    activePhase === 1
      ? "Think"
      : activePhase === 2
      ? "Confirm"
      : activePhase === 3
      ? "Solve"
      : activePhase === 4
      ? "Reflect"
      : "";

  return (
    <div className={cn("space-y-4 pb-3 border-b border-(--color-border)", className)}>
      {/* ── Top Navigation & Context Breadcrumb ── */}
      <nav aria-label="Breadcrumb" className="flex items-center justify-between gap-4 min-w-0">
        <div className="flex items-center gap-2 text-xs text-(--color-text-muted) font-medium min-w-0">
          {isFromPlan ? (
            <>
              <Link
                href="/plan"
                className="flex items-center gap-1.5 hover:text-(--color-text-primary) transition group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-lime)] rounded shrink-0 font-medium"
              >
                <ArrowLeft size={13} className="transition group-hover:-translate-x-0.5 text-[var(--accent-lime,#B7F36B)]" />
                <span>Study Plan</span>
              </Link>
              <span className="text-white/20">/</span>
              <span className="text-white truncate max-w-[180px] sm:max-w-none font-semibold">
                {title}
              </span>
            </>
          ) : learningPathContext ? (
            <>
              <Link
                href={learningPathContext.backToStageUrl}
                className="flex items-center gap-1.5 hover:text-(--color-text-primary) transition group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-lime)] rounded shrink-0 font-medium"
              >
                <ArrowLeft size={13} className="transition group-hover:-translate-x-0.5 text-[var(--accent-lime,#B7F36B)]" />
                <span>Stage {learningPathContext.stageOrder}</span>
              </Link>
              <span className="text-white/20">/</span>
              <span className="text-white/70 font-medium shrink-0">Problems</span>
              <span className="text-white/20">/</span>
              <span className="text-white truncate max-w-[180px] sm:max-w-none font-semibold">
                {title}
              </span>
            </>
          ) : (
            <>
              <Link
                href="/practice"
                className="flex items-center gap-1.5 hover:text-(--color-text-primary) transition group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-lime)] rounded shrink-0 font-medium"
              >
                <ArrowLeft size={13} className="transition group-hover:-translate-x-0.5 text-[var(--accent-lime,#B7F36B)]" />
                <span>Practice</span>
              </Link>
              <span className="text-white/20">/</span>
              <span className="text-white/70 shrink-0">Problems</span>
              <span className="text-white/20">/</span>
              <span className="text-white truncate max-w-[180px] sm:max-w-none font-semibold">
                {title}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Compact Unobtrusive Session Timer Tool */}
          {typeof timerSeconds === "number" && onToggleTimer && (
            <div className="flex items-center gap-1.5 rounded-xl border border-(--color-border) bg-white/[0.03] px-2.5 py-1 text-xs">
              <Clock size={12} className="text-[var(--accent-lime,#B7F36B)] shrink-0" />
              <span className="font-mono font-semibold text-white tracking-wider">
                {formatTimer(timerSeconds)}
              </span>
              <button
                type="button"
                onClick={onToggleTimer}
                className={cn(
                  "p-1 rounded-md transition",
                  isTimerRunning
                    ? "text-amber-300 hover:bg-amber-500/20"
                    : "text-[var(--accent-lime,#B7F36B)] hover:bg-[var(--accent-lime,#B7F36B)]/20"
                )}
                title={isTimerRunning ? "Pause timer" : "Start timer"}
              >
                {isTimerRunning ? <Pause size={11} /> : <Play size={11} className="fill-current" />}
              </button>
              {onResetTimer && (
                <button
                  type="button"
                  onClick={onResetTimer}
                  className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition"
                  title="Reset timer"
                >
                  <RotateCcw size={10} />
                </button>
              )}
            </div>
          )}

          {onOpenIntelligence && (
            <button
              type="button"
              onClick={onOpenIntelligence}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--accent-lime,#B7F36B)]/35 bg-[var(--accent-lime,#B7F36B)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--accent-lime,#B7F36B)] hover:bg-[var(--accent-lime,#B7F36B)]/20 transition shadow-sm"
              title="Open DSA Club Intelligence"
            >
              <Sparkles size={13} className="text-[var(--accent-lime,#B7F36B)]" />
              <span className="hidden sm:inline">DSA Club Intelligence</span>
              <span className="sm:hidden">Intelligence</span>
            </button>
          )}

          <BookmarkButton entityType="problem" entityId={problemId} active={bookmarked} />
        </div>
      </nav>

      {/* ── Problem Title & Metadata ── */}
      <div className="space-y-3">
        {/* Concise Badge Row */}
        <div className="flex flex-wrap items-center gap-2.5">
          <DifficultyBadge difficulty={difficulty} />
          <StatusBadge status={status} />

          {/* Topic Tags (excluding pattern to prevent duplication) */}
          {topics
            .filter((topic) => !pattern || topic.toLowerCase() !== pattern.toLowerCase())
            .slice(0, 2)
            .map((topic) => (
              <span
                key={topic}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 text-xs text-white/60 font-medium"
              >
                {topic}
              </span>
            ))}
        </div>

        {/* Title and Summary */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white break-words">
            {title}
          </h1>
          <p className="mt-2 text-sm sm:text-base leading-relaxed text-(--color-text-muted) max-w-4xl">
            {summary}
          </p>
        </div>

        {/* Integrated Secondary Typographic Metadata Row (Replaces Overview Card) */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-(--color-text-muted) pt-1 border-t border-white/[0.04]">
          {activePhase && (
            <span className="font-semibold text-white">
              Phase {activePhase} {phaseLabel ? `· ${phaseLabel}` : ""}
            </span>
          )}
          <span className="text-white/20">·</span>
          <span className="capitalize font-medium text-white/90">{difficulty}</span>
          {hasRecognition && pattern ? (
            <>
              <span className="text-white/20">·</span>
              <span className="text-[var(--accent-lime,#B7F36B)] font-medium">{pattern}</span>
            </>
          ) : null}
          {sourceLabel && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-white/80">{sourceLabel}</span>
            </>
          )}
          {estimatedMinutes ? (
            <>
              <span className="text-white/20">·</span>
              <span className="font-mono text-white/60">~{estimatedMinutes} min</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

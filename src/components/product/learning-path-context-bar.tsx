"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Flame,
  GitBranch,
  LoaderCircle,
  Sparkles,
  Target,
} from "lucide-react";
import { ProgressTrack } from "@/components/product/ui";
import { cn } from "@/lib/utils";
import type { LearningPathContext } from "@/features/learning-paths/types/learning-path-continuity.types";

interface LearningPathContextBarProps {
  context: LearningPathContext | null | undefined;
  className?: string;
}

export function LearningPathContextBar({
  context,
  className,
}: LearningPathContextBarProps) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const [clickedTarget, setClickedTarget] = useState<string | null>(null);

  if (!context) return null;

  const {
    pathTitle,
    stageOrder,
    stageTitle,
    totalStages,
    stageProgress,
    isStageCompleted,
    currentItem,
    stageStats,
    nextItem,
    backToStageUrl,
    backToStageLabel,
  } = context;

  function handleContinueNavigation(url: string) {
    setClickedTarget(url);
    startTransition(() => {
      router.push(url);
    });
  }

  const kindIcon = {
    problem: <Target size={12} className="text-blue-400" />,
    topic: <BookOpen size={12} className="text-purple-400" />,
    pattern: <GitBranch size={12} className="text-fuchsia-400" />,
    mission: <Flame size={12} className="text-orange-400" />,
  }[currentItem.kind];

  const kindLabel = {
    problem: "Problem",
    topic: "Topic",
    pattern: "Pattern",
    mission: "Mission",
  }[currentItem.kind];

  return (
    <aside
      aria-label="Learning Path Context"
      className={cn(
        "relative rounded-2xl border border-purple-500/25 bg-gradient-to-r from-[#120824]/95 via-[#0d0619]/95 to-[#160a2b]/95 p-3.5 sm:px-5 sm:py-3 text-white shadow-[0_4px_24px_rgba(139,92,246,0.12)] backdrop-blur-xl transition-all",
        className
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* ── Left Column: Semantic Back & Path / Stage Identity ── */}
        <div className="flex min-w-0 items-center gap-3">
          {/* Deterministic Semantic Back to Stage */}
          <Link
            href={backToStageUrl}
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-purple-200 transition-all hover:border-purple-400/40 hover:bg-purple-500/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            title={backToStageLabel}
          >
            <ArrowLeft
              size={13}
              className="transition-transform group-hover:-translate-x-0.5"
            />
            <span className="hidden sm:inline">{backToStageLabel}</span>
            <span className="sm:hidden">Stage</span>
          </Link>

          <div className="h-5 w-[1px] bg-white/[0.08] hidden sm:block shrink-0" />

          {/* Path & Stage Breadcrumb */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] text-purple-200/70">
              <span className="font-semibold text-purple-100 truncate max-w-[180px] sm:max-w-xs">
                {pathTitle}
              </span>
              <ChevronRight size={10} className="text-white/25 shrink-0" />
              <span className="shrink-0 text-purple-300">
                Stage {stageOrder} of {totalStages}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs font-bold text-white">
              {stageTitle}
            </p>
          </div>
        </div>

        {/* ── Right Column: You Are Here & Dynamic Continue CTA ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end shrink-0 pt-2 border-t border-white/[0.06] md:border-t-0 md:pt-0">
          {/* "You Are Here" pill + Stage Progress */}
          <div className="flex items-center gap-3">
            {/* Spatial Location Indicator */}
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-white/80">
              {kindIcon}
              <span>
                {kindLabel} {currentItem.position} of {currentItem.totalInKind}
              </span>
              {currentItem.isCompleted && (
                <CheckCircle2 size={11} className="text-emerald-400 shrink-0 ml-0.5" />
              )}
            </div>

            {/* Mini Progress Track */}
            <div className="hidden sm:flex flex-col items-end gap-1 w-28">
              <div className="flex items-center justify-between text-[10px] text-purple-200/60 w-full">
                <span>Stage Progress</span>
                <span className="font-bold tabular-nums text-white">
                  {stageStats.completedItems}/{stageStats.totalItems}
                </span>
              </div>
              <ProgressTrack
                value={stageProgress}
                color={isStageCompleted ? "emerald" : "cyan"}
                height="thin"
              />
            </div>
          </div>

          {/* Dynamic Continue Button */}
          {nextItem && (
            <button
              type="button"
              onClick={() => handleContinueNavigation(nextItem.url)}
              disabled={isNavigating}
              className={cn(
                "focus-ring inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50",
                isStageCompleted
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20"
                  : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/25"
              )}
            >
              {isNavigating && clickedTarget === nextItem.url ? (
                <>
                  <LoaderCircle size={13} className="animate-spin" />
                  <span>Loading…</span>
                </>
              ) : (
                <>
                  <span>{nextItem.buttonLabel}</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

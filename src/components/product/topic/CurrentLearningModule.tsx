"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Compass,
  Flame,
  Lock,
  Play,
  Sparkles,
} from "lucide-react";
import { ProgressTrack } from "@/components/product/ui";
import { cn } from "@/lib/utils";
import type { TopicDetailData } from "@/components/product/topic-detail-view";

interface CurrentLearningModuleProps {
  data: TopicDetailData;
  missions?: TopicDetailData["missions"];
}

function deduplicateStageKinds(
  stages: Array<{ key: string; kind: string; status: "completed" | "active" | "locked" }>
): Array<{ key: string; kind: string; label: string; status: "completed" | "active" | "locked" }> {
  const kindCount: Record<string, number> = {};
  stages.forEach((s) => {
    kindCount[s.kind] = (kindCount[s.kind] || 0) + 1;
  });
  const kindSeen: Record<string, number> = {};
  return stages.map((s) => {
    const isDuplicate = kindCount[s.kind] > 1;
    kindSeen[s.kind] = (kindSeen[s.kind] || 0) + 1;
    const label = isDuplicate
      ? `${s.kind.replace(/_/g, " ")} ${kindSeen[s.kind]}`
      : s.kind.replace(/_/g, " ");
    return { ...s, label: label.replace(/\b\w/g, (c) => c.toUpperCase()) };
  });
}

import { resolveTopicAction } from "./topic-action-resolver";
import { GitBranch, Target } from "lucide-react";

export function CurrentLearningModule({ data, missions: missionsProp }: CurrentLearningModuleProps) {
  const missions = missionsProp ?? data?.missions ?? [];

  if (!missions.length) {
    return (
      <div className="py-6 border-b border-(--color-border) space-y-2 text-center">
        <Sparkles size={18} className="mx-auto text-(--color-purple)/50" />
        <h3 className="text-sm font-semibold text-(--color-text-primary)">No Active Mission</h3>
        <p className="text-xs text-(--color-text-muted) max-w-sm mx-auto">
          This topic does not have a mission attached yet. You can solve practice problems and master patterns directly below.
        </p>
      </div>
    );
  }

  const activeMission =
    missions.find((m) => m.status === "in_progress") ??
    missions.find((m) => m.status !== "completed") ??
    missions[0];

  const isCompleted = activeMission.status === "completed";
  const isInProgress = activeMission.status === "in_progress";
  const dedupedStages = deduplicateStageKinds(activeMission.stages);

  const resolved = data
    ? resolveTopicAction(data)
    : {
        spotlight: {
          eyebrow: isCompleted ? "Current Step · ✓ All Stages Completed" : "Current Step",
          title: isCompleted ? "All stages mastered" : "Core Concept",
          description: isCompleted
            ? "Reinforce your knowledge through practice or review the mission concepts."
            : "Understand foundational intuition and problem patterns before moving forward.",
          actionLabel: isCompleted ? "Review Mission" : "Continue Learning →",
          actionHref: `/missions/${activeMission.slug}`,
          actionIcon: isCompleted ? ("book-open" as const) : ("play" as const),
          isMissionComplete: isCompleted,
          isTopicMastered: false,
          secondaryAction: undefined as { label: string; href: string } | undefined,
        },
      };

  return (
    <section aria-labelledby="current-learning-heading" className="space-y-4">
      {/* ── Section Title & Progress Badge ── */}
      <div className="flex items-center justify-between gap-3 border-b border-(--color-border) pb-2.5">
        <div className="flex items-center gap-2">
          <Flame size={15} className="text-(--color-purple)" />
          <h2
            id="current-learning-heading"
            className="text-xs font-bold uppercase tracking-wider text-(--color-text-muted)"
          >
            Current Learning
          </h2>
        </div>

        <div className="text-xs font-semibold tabular-nums text-(--color-text-secondary)">
          <span>{activeMission.completedSteps}</span>
          <span className="text-(--color-text-muted)">/</span>
          <span>{activeMission.totalSteps} steps completed</span>
        </div>
      </div>

      {/* ── Mission Title & Overview Progress ── */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Link
            href={`/missions/${activeMission.slug}`}
            className="text-lg sm:text-xl font-bold text-(--color-text-primary) hover:text-(--color-purple) transition-colors inline-flex items-center gap-1.5 group"
          >
            <span>{activeMission.title}</span>
            <ArrowUpRight
              size={15}
              className="opacity-40 group-hover:opacity-100 group-hover:text-(--color-purple) transition-all"
            />
          </Link>

          <span className="text-xs font-bold tabular-nums text-(--color-text-muted)">
            {activeMission.progress}%
          </span>
        </div>

        <ProgressTrack
          value={activeMission.progress}
          color={isCompleted ? "emerald" : isInProgress ? "cyan" : "purple"}
          height="thin"
        />
      </div>

      {/* ── Connected Learning Journey Timeline ── */}
      {dedupedStages.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-(--color-text-muted)">
            Mission Journey
          </p>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {dedupedStages.map((stage, idx) => {
              const isStageCompleted = stage.status === "completed";
              const isStageActive = stage.status === "active";

              return (
                <React.Fragment key={stage.key}>
                  <div
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-colors",
                      isStageCompleted
                        ? "text-emerald-400"
                        : isStageActive
                        ? "text-cyan-300 font-semibold"
                        : "text-(--color-text-muted)"
                    )}
                  >
                    {isStageCompleted ? (
                      <Check size={12} className="text-emerald-400 stroke-[2.5]" />
                    ) : isStageActive ? (
                      <span className="size-2 rounded-full bg-cyan-400 ring-2 ring-cyan-400/30 animate-pulse" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-(--color-border)" />
                    )}
                    <span>{stage.label}</span>
                  </div>

                  {idx < dedupedStages.length - 1 && (
                    <ChevronRight size={11} className="text-(--color-border) shrink-0" aria-hidden="true" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Current Step Focus Spotlight (Visually Quiet Highlighted Strip) ── */}
      <div
        className={cn(
          "border-l-3 bg-(--color-surface-1) pl-4 sm:pl-5 pr-4 py-4 rounded-r-(--radius-card) flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs",
          resolved.spotlight.isTopicMastered
            ? "border-emerald-500"
            : resolved.spotlight.isMissionComplete
            ? "border-blue-500"
            : "border-(--color-purple)"
        )}
      >
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                resolved.spotlight.isTopicMastered
                  ? "text-emerald-400"
                  : resolved.spotlight.isMissionComplete
                  ? "text-blue-400"
                  : "text-(--color-purple)"
              )}
            >
              {resolved.spotlight.eyebrow}
            </span>
          </div>
          <p className="text-sm sm:text-base font-bold text-(--color-text-primary) truncate">
            {resolved.spotlight.title}
          </p>
          <p className="text-xs text-(--color-text-secondary) leading-relaxed max-w-xl">
            {resolved.spotlight.description}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
          <Link
            href={resolved.spotlight.actionHref}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-(--radius-btn) text-xs font-semibold text-white shadow-sm shrink-0 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0",
              resolved.spotlight.actionIcon === "book-open"
                ? "bg-(--color-surface-2) hover:bg-(--color-surface-3) text-(--color-text-primary) border border-(--color-border)"
                : resolved.spotlight.actionIcon === "target"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
                : resolved.spotlight.actionIcon === "git-branch"
                ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
                : isInProgress
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
                : "bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500"
            )}
          >
            {resolved.spotlight.actionIcon === "book-open" ? (
              <>
                <BookOpen size={13} />
                <span>{resolved.spotlight.actionLabel}</span>
              </>
            ) : resolved.spotlight.actionIcon === "target" ? (
              <>
                <Target size={13} />
                <span>{resolved.spotlight.actionLabel}</span>
              </>
            ) : resolved.spotlight.actionIcon === "git-branch" ? (
              <>
                <GitBranch size={13} />
                <span>{resolved.spotlight.actionLabel}</span>
              </>
            ) : (
              <>
                <Play size={12} className="fill-current" />
                <span>{resolved.spotlight.actionLabel}</span>
              </>
            )}
          </Link>

          {resolved.spotlight.secondaryAction && (
            <Link
              href={resolved.spotlight.secondaryAction.href}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-(--color-text-muted) hover:text-(--color-text-primary) transition-colors"
            >
              <BookOpen size={12} />
              <span>{resolved.spotlight.secondaryAction.label}</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { Target, ArrowRight, ShieldCheck, TrendingUp, Milestone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardTopicEvidence } from "@/features/product/types/dashboard-dto.types";

export interface GoalCheckpointProofProps {
  topicEvidence?: DashboardTopicEvidence | null;
  activePlan?: {
    topicName?: string;
    topicSlug?: string;
    currentDayIndex?: number;
    totalDays?: number;
    masteryPercent?: number;
  } | null;
  activeMission?: any;
  stats?: any;
  focusAreas?: Array<{ name: string; slug?: string }>; // legacy fallback
  className?: string;
}

export function GoalCheckpointProof({
  topicEvidence,
  activePlan,
  activeMission,
  stats,
  className,
}: GoalCheckpointProofProps) {
  // Hide unsupported checkpoint content when no real checkpoint and no verified topic evidence
  const hasRealCheckpoint = Boolean(topicEvidence?.hasRealCheckpoint && topicEvidence?.checkpoint);
  const hasVerifiedEvidence = Boolean(topicEvidence?.hasVerifiedEvidence);

  if (!hasRealCheckpoint && !hasVerifiedEvidence) {
    return null;
  }

  const currentTopic = topicEvidence?.topicName || activePlan?.topicName || "DSA Fundamentals";
  const topicSlug = topicEvidence?.topicSlug || activePlan?.topicSlug || "dsa";

  // Topic-scoped evidence: never use global stats or invent milestone claims without real data
  const topicSolvedCount = topicEvidence?.topicSolvedCount ?? null;
  const topicMasteryPercent = topicEvidence?.topicMasteryPercent ?? null;
  const topicFocusAreas = topicEvidence?.focusAreas ?? [];

  const headerTag = hasRealCheckpoint
    ? `Goal Checkpoint · ${currentTopic}`
    : `Topic Evidence · ${currentTopic}`;

  // Factual title: strictly avoids claiming "milestones" unless a verified checkpoint milestone exists
  const headerTitle = hasRealCheckpoint
    ? topicEvidence!.checkpoint!.title
    : `${currentTopic} Practice Evidence`;

  const headerDescription = hasRealCheckpoint
    ? topicEvidence!.checkpoint!.focus
    : `Verified practice and pattern recognition in ${currentTopic}. Independent solves demonstrate core invariant mastery.`;

  // Real plan checkpoint links directly to the plan day
  const actionHref = hasRealCheckpoint
    ? `/plan?day=${topicEvidence!.checkpoint!.dayIndex}`
    : `/progress?topic=${topicSlug}`;

  const actionLabel = hasRealCheckpoint ? "View checkpoint in plan" : "View topic evidence";

  return (
    <div
      className={cn(
        "rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-5 sm:p-6 transition-colors",
        className
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="grid size-6 place-items-center rounded-md bg-(--accent-teal)/10 text-(--accent-teal)">
              {hasRealCheckpoint ? <Milestone className="size-3.5" /> : <Target className="size-3.5" />}
            </div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-(--accent-teal)">
              {headerTag}
            </h3>
          </div>

          <h4 className="text-base font-bold text-(--text-primary)">
            {headerTitle}
          </h4>

          <p className="text-xs sm:text-sm text-(--text-secondary) leading-relaxed">
            {headerDescription}
          </p>

          {/* Factual Evidence Badges: Topic-Scoped Evidence Only */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
            {topicSolvedCount !== null && topicSolvedCount > 0 && (
              <span
                className="inline-flex items-center gap-1.5 rounded-md bg-(--bg-surface-raised) border border-(--border-subtle) px-2.5 py-1 text-[11px] font-medium text-(--text-secondary)"
                title={`Verified problem solves in ${currentTopic}`}
              >
                <TrendingUp className="size-3 text-(--accent-lime)" />
                <strong className="text-(--text-primary)">{topicSolvedCount}</strong> verified in {currentTopic}
              </span>
            )}

            {topicMasteryPercent !== null && topicMasteryPercent > 0 && (
              <span
                className="inline-flex items-center gap-1.5 rounded-md bg-(--bg-surface-raised) border border-(--border-subtle) px-2.5 py-1 text-[11px] font-medium text-(--text-secondary)"
                title={topicEvidence?.evidenceExplanation || `Assessed topic evidence in ${currentTopic}`}
              >
                <ShieldCheck className="size-3 text-(--accent-teal)" />
                <strong className="text-(--text-primary)">{topicMasteryPercent}%</strong>{" "}
                {topicEvidence?.evidenceLabel
                  ? topicEvidence.evidenceLabel.replace(`${topicMasteryPercent}% `, "")
                  : (topicSolvedCount && topicSolvedCount > 0 ? "topic mastery" : "rubric evidence")}
              </span>
            )}

            {/* Explainable mission foundation badge when no problem solves yet */}
            {(!topicSolvedCount || topicSolvedCount === 0) && (topicEvidence?.missionsCompletedCount ?? 0) > 0 && (
              <span
                className="inline-flex items-center gap-1.5 rounded-md bg-(--bg-surface-raised) border border-(--border-subtle) px-2.5 py-1 text-[11px] font-medium text-(--text-secondary)"
                title={topicEvidence?.evidenceExplanation || "Foundational mission completed. Solve practice problems to advance mastery."}
              >
                <Target className="size-3 text-(--accent-lime)" />
                <strong className="text-(--text-primary)">{topicEvidence?.missionsCompletedCount} of {topicEvidence?.missionsTotalCount}</strong> missions completed · practice needed
              </span>
            )}

            {topicFocusAreas.length > 0 && (
              <span className="text-[11px] text-(--text-muted)">
                Focus: <strong className="text-(--accent-amber)">{topicFocusAreas[0].name}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Action Link to Real Milestone/Evidence */}
        <div className="shrink-0 self-start lg:self-auto">
          <Link
            href={actionHref}
            className="group inline-flex items-center gap-1.5 rounded-lg border border-(--border-subtle) bg-(--bg-surface-raised) px-3.5 py-2 text-xs font-semibold text-(--text-primary) transition-colors hover:border-(--accent-teal)/50 hover:bg-(--bg-surface-hover)"
          >
            <span>{actionLabel}</span>
            <ArrowRight className="size-3.5 text-(--text-muted) transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-(--text-primary)" />
          </Link>
        </div>
      </div>
    </div>
  );
}

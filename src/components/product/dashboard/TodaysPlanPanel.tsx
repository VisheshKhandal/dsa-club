"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, Compass, Sparkles, ChevronDown, CheckCircle2 } from "lucide-react";
import { ButtonPrimary } from "@/components/ui/Button";
import { SegmentedProgress } from "@/components/ui/SegmentedProgress";
import { cn } from "@/lib/utils";

interface TodaysPlanPanelProps {
  activeMission: any | null;
  currentStage?: number;
  totalStages?: number;
  completedStages?: number;
  missionHref: string;
  pathHref?: string;
  rationale?: string[];
  onActionClick?: () => void;
}

export function TodaysPlanPanel({
  activeMission,
  currentStage = 1,
  totalStages = 4,
  completedStages = 0,
  missionHref,
  pathHref = "/learning-paths",
  rationale = [],
  onActionClick,
}: TodaysPlanPanelProps) {
  const [whyOpen, setWhyOpen] = useState(false);

  // Fallback for new users with no active mission yet
  if (!activeMission) {
    return (
      <section
        aria-labelledby="today-heading"
        className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface-raised) p-6 sm:p-8"
      >
        <div className="flex items-center gap-2 text-label text-(--accent-lime)">
          <Compass className="size-3.5" />
          <span>Today’s plan</span>
        </div>
        <h2 id="today-heading" className="mt-2 text-section text-(--text-primary)">
          Ready to set your learning path?
        </h2>
        <p className="mt-1.5 max-w-xl text-body text-(--text-secondary)">
          Pick a structured path to begin daily guided practice, spaced revision, and measurable skill growth.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link href="/learning-paths">
            <ButtonPrimary size="md">
              <span>Choose a learning path</span>
              <ArrowRight className="size-4 ml-1" />
            </ButtonPrimary>
          </Link>
          <Link
            href="/practice"
            className="text-caption text-(--text-muted) hover:text-(--text-primary) transition-colors"
          >
            Or browse problem catalog →
          </Link>
        </div>
      </section>
    );
  }

  const topicName = activeMission.topic || "Data Structures";
  const missionTitle = activeMission.title || "Core Patterns & Invariants";
  const fullTitle = `${topicName}: ${missionTitle}`;
  const objective =
    activeMission.description ||
    activeMission.nextStage?.title ||
    `Understand fundamental ${topicName.toLowerCase()} traversal and invariants, then solve two guided problems.`;
  const estimatedTime = Number(activeMission.estimatedMinutes || 35);
  const totalSteps = Math.max(1, totalStages);
  const completedSteps = Math.max(0, Math.min(totalSteps, completedStages));
  const skillName = activeMission.topic || "Algorithmic Analysis";

  return (
    <section
      aria-labelledby="today-heading"
      className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface-raised) p-6 sm:p-7 shadow-xs"
    >
      {/* Top Header Tag */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-(--accent-lime)" aria-hidden />
          <span className="text-label text-(--accent-lime)">Today’s plan</span>
        </div>
        {rationale.length > 0 && (
          <button
            type="button"
            onClick={() => setWhyOpen((v) => !v)}
            aria-expanded={whyOpen}
            className="inline-flex items-center gap-1.5 text-caption text-(--text-muted) hover:text-(--text-primary) transition-colors"
          >
            <Sparkles className="size-3 text-(--accent-amber)" />
            <span>Why this plan?</span>
            <ChevronDown
              className={cn("size-3 transition-transform duration-150", whyOpen && "rotate-180")}
            />
          </button>
        )}
      </div>

      {/* Title & Objective */}
      <div className="mt-3">
        <h2
          id="today-heading"
          className="text-section sm:text-page-title text-(--text-primary) tracking-tight"
        >
          {fullTitle}
        </h2>
        <p className="mt-1.5 max-w-2xl text-body text-(--text-secondary) leading-relaxed">
          {objective}
        </p>
      </div>

      {/* Contextual Rationale (Expandable) */}
      {whyOpen && rationale.length > 0 && (
        <div className="mt-3.5 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-3 text-caption text-(--text-secondary) space-y-1">
          {rationale.map((reason, idx) => (
            <p key={idx} className="flex items-start gap-2">
              <span className="text-(--accent-lime) font-bold">✓</span>
              <span>{reason}</span>
            </p>
          ))}
        </div>
      )}

      {/* Metadata Row: Estimated Time · Segmented Progress · Skill */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-(--border-subtle) pt-4">
        {/* Metric 1: Time */}
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-(--bg-surface) border border-(--border-subtle) text-(--text-secondary)">
            <Clock3 className="size-4" />
          </div>
          <div>
            <p className="text-caption text-(--text-muted)">Estimated time</p>
            <p className="font-tabular text-sm font-semibold text-(--text-primary)">
              {estimatedTime} min
            </p>
          </div>
        </div>

        {/* Metric 2: Segmented Step Progress */}
        <div className="sm:col-span-1 flex flex-col justify-center">
          <SegmentedProgress
            totalSteps={totalSteps}
            completedSteps={completedSteps}
            label={`${completedSteps} of ${totalSteps} steps complete`}
            size="sm"
          />
        </div>

        {/* Metric 3: Target Skill */}
        <div className="flex items-center gap-2.5 sm:justify-end">
          <div className="text-left sm:text-right">
            <p className="text-caption text-(--text-muted)">Core skill</p>
            <p className="text-sm font-semibold text-(--text-primary) truncate">
              {skillName}
            </p>
          </div>
        </div>
      </div>

      {/* Action Footer: Dominant Lime CTA + Secondary Path Link */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <Link href={missionHref} onClick={onActionClick}>
            <ButtonPrimary size="md" className="px-5 py-2.5">
              <span>Continue learning</span>
              <ArrowRight className="size-4 ml-1" />
            </ButtonPrimary>
          </Link>
          <Link
            href={pathHref}
            className="text-caption font-semibold text-(--text-secondary) hover:text-(--text-primary) transition-colors px-2 py-1.5"
          >
            View path →
          </Link>
        </div>

        <p className="text-caption text-(--text-muted) hidden sm:block">
          Step {Math.min(completedSteps + 1, totalSteps)}: next checkpoint ready
        </p>
      </div>
    </section>
  );
}

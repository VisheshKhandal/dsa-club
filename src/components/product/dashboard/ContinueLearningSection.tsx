"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ButtonSecondary } from "@/components/ui/Button";

interface ContinueLearningSectionProps {
  activePlan?: any | null;
  activeMission: any | null;
  missionHref: string;
  nextStepTitle?: string;
  currentCheckpoint?: string;
}

export function ContinueLearningSection({
  activePlan,
  activeMission,
  missionHref,
  nextStepTitle,
  currentCheckpoint,
}: ContinueLearningSectionProps) {
  const hasPlan = Boolean(activePlan);
  const topicName = activePlan?.topicName || activeMission?.topic || "Data Structures";
  const lessonTitle =
    nextStepTitle ||
    (activePlan
      ? `Active Focus: ${activePlan.topicName} · Day ${activePlan.currentDayIndex || 1}`
      : activeMission?.nextStage?.title ||
        activeMission?.title ||
        "Daily Practice Session");
  const checkpointText =
    currentCheckpoint ||
    activePlan?.dayFocus ||
    activeMission?.nextStage?.description ||
    "Explore supplementary problems and missions outside your scheduled plan.";

  const actionButtonText = hasPlan
    ? "Browse catalog"
    : `Continue ${topicName.toLowerCase()} practice`;

  const actionHref = hasPlan ? "/learn" : missionHref;

  return (
    <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-5 sm:p-6 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-(--accent-lime)" />
            <h3 className="text-section text-(--text-primary)">
              {hasPlan ? "Self-paced catalog" : "Continue learning"}
            </h3>
          </div>
          <Badge variant={hasPlan ? "not-started" : "active"}>
            {hasPlan ? "Outside Active Plan" : topicName}
          </Badge>
        </div>

        <div className="mt-4 rounded-lg bg-(--bg-surface-raised) border border-(--border-subtle) p-4">
          <p className="text-caption text-(--text-muted)">
            {hasPlan ? "Supplementary Catalog" : "Current checkpoint"}
          </p>
          <h4 className="mt-1 text-card-title text-(--text-primary)">
            {lessonTitle}
          </h4>
          <p className="mt-1 text-body text-(--text-secondary) leading-relaxed">
            {checkpointText}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between pt-2">
        <Link href={actionHref}>
          <ButtonSecondary size="sm" className="gap-2">
            <span>{actionButtonText}</span>
            <ArrowRight className="size-3.5" />
          </ButtonSecondary>
        </Link>
        <Link
          href="/learn"
          className="text-caption text-(--text-muted) hover:text-(--text-primary) transition-colors inline-flex items-center gap-0.5"
        >
          <span>All topics</span>
          <ChevronRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

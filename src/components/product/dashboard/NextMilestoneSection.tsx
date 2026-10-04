"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Target, AlertCircle, Compass } from "lucide-react";
import { ButtonSecondary } from "@/components/ui/Button";

interface FocusArea {
  name: string;
  slug?: string;
  href?: string;
  mastery?: number;
}

interface NextMilestoneSectionProps {
  activePlan?: any | null;
  activeMission?: any;
  focusAreas?: FocusArea[];
  nextMilestoneText?: string;
}

export function NextMilestoneSection({
  activePlan,
  activeMission,
  focusAreas = [],
  nextMilestoneText,
}: NextMilestoneSectionProps) {
  const currentTopic = activePlan?.topicName || activeMission?.topic || "DSA Fundamentals";
  const milestoneDescription =
    nextMilestoneText ||
    (activePlan
      ? `Progress through your ${currentTopic} schedule to unlock advanced curriculum stages.`
      : activeMission
      ? `Complete 3 more ${currentTopic.toLowerCase()} problems to unlock advanced path milestones.`
      : "Complete your next milestone to advance your interview readiness.");

  const visibleFocusAreas = focusAreas.slice(0, 3);

  return (
    <section aria-labelledby="milestone-heading" className="mt-6">
      <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2">
              <Target className="size-4 text-(--accent-lime)" />
              <h3 id="milestone-heading" className="text-section text-(--text-primary)">
                Your next milestone
              </h3>
            </div>

            {/* Milestone statement */}
            <p className="text-body text-(--text-secondary) font-medium leading-relaxed">
              {milestoneDescription}
            </p>

            {/* Skills needing another pass (transformed from generic 'Focus areas') */}
            {visibleFocusAreas.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-caption text-(--text-muted)">
                  Skills needing another pass:
                </span>
                {visibleFocusAreas.map((area, idx) => (
                  <Link
                    key={area.slug || area.name || idx}
                    href={area.href || `/practice?topic=${area.slug || area.name}`}
                    className="inline-flex items-center gap-1 rounded-full border border-(--border-subtle) bg-(--bg-surface-raised) px-2.5 py-0.5 text-caption font-medium text-(--text-secondary) hover:border-(--accent-amber) hover:text-(--accent-amber) transition-colors"
                  >
                    <span>{area.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Primary Action */}
          <div className="shrink-0 pt-2 sm:pt-0">
            <Link href={activePlan ? "/intelligence?tab=week" : "/practice"}>
              <ButtonSecondary size="md" className="gap-2 w-full sm:w-auto">
                <span>{activePlan ? "View week schedule" : "See recommended problems"}</span>
                <ArrowRight className="size-4" />
              </ButtonSecondary>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

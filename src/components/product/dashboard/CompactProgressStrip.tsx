"use client";

import React from "react";
import Link from "next/link";
import { Compass, Calendar, RefreshCw, Flame, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface CompactProgressStripProps {
  currentPath?: string;
  thisWeekSessions?: number;
  dueReviewsCount?: number;
  bestStreakDays?: number;
  readinessScore?: number;
}

export function CompactProgressStrip({
  currentPath = "DSA Fundamentals",
  thisWeekSessions = 0,
  dueReviewsCount = 0,
  bestStreakDays = 1,
  readinessScore = 0,
}: CompactProgressStripProps) {
  // Interpretable qualitative status instead of opaque percentage
  const getReadinessStatus = (score: number) => {
    if (score < 40) return { label: "Building", variant: "building" as const };
    if (score < 75) return { label: "Practicing", variant: "practicing" as const };
    return { label: "Strong", variant: "strong" as const };
  };

  const status = getReadinessStatus(readinessScore);

  return (
    <section
      aria-label="Progress at a glance"
      className="mt-4 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-3 sm:p-4"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-(--border-subtle)">
        {/* Metric 1: Current Path */}
        <Link
          href="/learning-paths"
          className="flex items-center gap-3 pr-2 transition-colors hover:opacity-90 group"
        >
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-(--bg-surface-raised) border border-(--border-subtle) text-(--text-muted) group-hover:text-(--accent-lime) transition-colors">
            <Compass className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-caption text-(--text-muted)">Current path</p>
            <p className="text-card-title text-(--text-primary) truncate">
              {currentPath}
            </p>
          </div>
        </Link>

        {/* Metric 2: This Week Sessions */}
        <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:px-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-(--bg-surface-raised) border border-(--border-subtle) text-(--text-muted)">
            <Calendar className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-caption text-(--text-muted)">This week</p>
            <p className="text-card-title text-(--text-primary) font-tabular truncate">
              {thisWeekSessions} {thisWeekSessions === 1 ? "session" : "sessions"}
            </p>
          </div>
        </div>

        {/* Metric 3: Due for Review */}
        <Link
          href="/revision"
          className="flex items-center gap-3 pt-3 sm:pt-0 sm:px-3 transition-colors hover:opacity-90 group"
        >
          <div className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg border transition-colors",
            dueReviewsCount > 0
              ? "bg-(--accent-amber)/10 border-(--accent-amber)/30 text-(--accent-amber)"
              : "bg-(--bg-surface-raised) border-(--border-subtle) text-(--text-muted)"
          )}>
            <RefreshCw className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-caption text-(--text-muted)">Due for review</p>
            <p className="text-card-title font-tabular truncate text-(--text-primary)">
              {dueReviewsCount > 0 ? (
                <span className="text-(--accent-amber)">
                  {dueReviewsCount} {dueReviewsCount === 1 ? "item" : "items"}
                </span>
              ) : (
                <span className="text-(--text-secondary)">Queue clear</span>
              )}
            </p>
          </div>
        </Link>

        {/* Metric 4: Streak & Skill Readiness Status */}
        <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:pl-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-(--bg-surface-raised) border border-(--border-subtle) text-(--accent-lime)">
            <Flame className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-caption text-(--text-muted)">
              {bestStreakDays > 0 ? `Best: ${bestStreakDays}d streak` : "Consistency"}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant={status.variant}>
                {status.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

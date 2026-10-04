"use client";

import React from "react";
import {
  CheckCircle2,
  Flame,
  GitBranch,
  PenLine,
  RotateCcw,
  Target,
  Trophy,
} from "lucide-react";
import { ButtonLink, MasteryRing } from "@/components/product/ui";
import type { TopicDetailData } from "@/components/product/topic-detail-view";

interface TopicProgressWorkspaceProps {
  data: TopicDetailData;
  activeMission?: TopicDetailData["missions"][number];
}

function formatRelativeTime(iso: string) {
  if (!iso) return "No activity yet";
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function TopicProgressWorkspace({
  data,
  activeMission,
}: TopicProgressWorkspaceProps) {
  const { topic, counts, reflections, revisions } = data;
  const lastActivity = topic.lastStudiedAt || topic.lastSolvedAt;

  return (
    <div
      role="tabpanel"
      id="topic-workspace-panel-progress"
      aria-labelledby="topic-workspace-tab-progress"
      className="space-y-10 animate-in fade-in duration-150 pt-2"
    >
      {/* ── Mastery Analytics (De-containerized) ── */}
      <section aria-labelledby="mastery-analytics-heading" className="space-y-4">
        <div className="flex items-center gap-2 border-b border-(--color-border) pb-2.5">
          <Trophy size={14} className="text-(--color-purple)" />
          <h2
            id="mastery-analytics-heading"
            className="text-xs font-bold uppercase tracking-wider text-(--color-text-muted)"
          >
            Mastery Analytics
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
          <MasteryRing value={topic.progress} size="lg" label="Mastery" />

          <div className="grid grid-cols-2 gap-4 flex-1 w-full divide-y sm:divide-y-0 sm:divide-x divide-(--color-border)">
            <div className="pt-2 sm:pt-0 sm:px-4 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] text-(--color-text-muted)">
                <Target size={13} className="text-(--color-blue)" />
                <span>Problems Solved</span>
              </div>
              <p className="text-base font-bold text-(--color-text-primary) tabular-nums">
                {counts.solvedProblems} <span className="text-xs text-(--color-text-muted)">/ {counts.problems}</span>
              </p>
            </div>

            <div className="pt-2 sm:pt-0 sm:px-4 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] text-(--color-text-muted)">
                <GitBranch size={13} className="text-(--color-purple)" />
                <span>Patterns Mastered</span>
              </div>
              <p className="text-base font-bold text-(--color-text-primary) tabular-nums">
                {counts.patternsCompleted} <span className="text-xs text-(--color-text-muted)">/ {counts.patterns}</span>
              </p>
            </div>

            <div className="pt-2 sm:pt-0 sm:px-4 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] text-(--color-text-muted)">
                <Flame size={13} className="text-(--color-orange)" />
                <span>Mission Progress</span>
              </div>
              <p className="text-base font-bold text-(--color-text-primary) tabular-nums">
                {activeMission ? `${activeMission.progress}%` : "—"}
              </p>
            </div>

            <div className="pt-2 sm:pt-0 sm:px-4 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] text-(--color-text-muted)">
                <RotateCcw size={13} className="text-amber-400" />
                <span>Reviews Due</span>
              </div>
              <p className="text-base font-bold text-(--color-text-primary) tabular-nums">
                {counts.revisionsDue || 0}
              </p>
            </div>
          </div>
        </div>

        {lastActivity && (
          <p className="text-xs text-(--color-text-muted) pt-2">
            Last studied: {formatRelativeTime(lastActivity)}
          </p>
        )}
      </section>

      {/* ── Learning Reflections (De-containerized) ── */}
      <section aria-labelledby="learning-reflections-heading" className="space-y-4">
        <div className="flex items-center gap-2 border-b border-(--color-border) pb-2.5">
          <PenLine size={14} className="text-(--color-purple)" />
          <h2
            id="learning-reflections-heading"
            className="text-xs font-bold uppercase tracking-wider text-(--color-text-muted)"
          >
            Learning Reflections
          </h2>
        </div>

        {reflections.length ? (
          <div className="divide-y divide-(--color-border) border-b border-(--color-border)">
            {reflections.map((r) => (
              <div key={r.id} className="py-3 px-1 space-y-1">
                <p className="text-xs sm:text-sm text-(--color-text-primary) leading-relaxed">
                  {r.content}
                </p>
                <div className="flex items-center justify-between text-[11px] text-(--color-text-muted)">
                  <span>Confidence: {r.selfRating}/5</span>
                  <time dateTime={r.createdAt}>
                    {new Date(r.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 border-b border-(--color-border) text-center space-y-1">
            <PenLine size={16} className="mx-auto text-(--color-text-muted)" />
            <p className="text-xs font-medium text-(--color-text-primary)">No reflections yet</p>
            <p className="text-[11px] text-(--color-text-muted)">
              Capture reflections while solving problems or completing mission steps.
            </p>
          </div>
        )}
      </section>

      {/* ── Revision Queue (De-containerized) ── */}
      <section aria-labelledby="revision-queue-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-(--color-border) pb-2.5">
          <div className="flex items-center gap-2">
            <RotateCcw size={14} className="text-(--color-purple)" />
            <h2
              id="revision-queue-heading"
              className="text-xs font-bold uppercase tracking-wider text-(--color-text-muted)"
            >
              {counts.revisionsDue > 0
                ? `${counts.revisionsDue} Item${counts.revisionsDue !== 1 ? "s" : ""} Due for Review`
                : "Revision Queue"}
            </h2>
          </div>

          {revisions.length > 0 && (
            <ButtonLink href="/revision" variant="secondary" size="sm">
              Start Review
            </ButtonLink>
          )}
        </div>

        {revisions.length ? (
          <div className="divide-y divide-(--color-border) border-b border-(--color-border)">
            {revisions.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 py-2.5 px-1"
              >
                <div className="flex items-center gap-2 text-xs text-(--color-text-primary)">
                  <RotateCcw size={13} className="text-amber-400 shrink-0" />
                  <span className="capitalize">{item.state} Review</span>
                </div>
                <span className="text-[11px] font-medium text-amber-400 tabular-nums">
                  Due {new Date(item.dueAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 border-b border-(--color-border) text-center space-y-1">
            <CheckCircle2 size={16} className="mx-auto text-emerald-400" />
            <p className="text-xs font-medium text-(--color-text-primary)">All caught up!</p>
            <p className="text-[11px] text-(--color-text-muted)">
              No revision items due for this topic right now.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

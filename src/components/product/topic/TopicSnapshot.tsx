"use client";

import React from "react";
import {
  Activity,
  CheckCircle2,
  Clock,
  Flame,
  GitBranch,
  Target,
  Trophy,
} from "lucide-react";
import { ProgressTrack } from "@/components/product/ui";
import type { TopicDetailData } from "@/components/product/topic-detail-view";

interface TopicSnapshotProps {
  data: TopicDetailData;
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

export function TopicSnapshot({ data }: TopicSnapshotProps) {
  const { topic, counts } = data;
  const lastActivity = topic.lastStudiedAt || topic.lastSolvedAt;
  const isCompleted = topic.state === "mastered" || topic.progress >= 100;

  return (
    <section
      aria-labelledby="topic-snapshot-heading"
      className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) p-5 space-y-4 shadow-2xs"
    >
      {/* ── Section Title ── */}
      <div className="flex items-center justify-between gap-3 border-b border-(--color-border) pb-2.5">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-(--color-purple)" />
          <h2
            id="topic-snapshot-heading"
            className="text-xs font-bold uppercase tracking-wider text-(--color-text-muted)"
          >
            Topic Snapshot
          </h2>
        </div>

        {isCompleted && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
            <CheckCircle2 size={12} /> Mastered
          </span>
        )}
      </div>

      {/* ── Headline Mastery Metric ── */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-base font-extrabold tracking-tight text-(--color-text-primary) tabular-nums">
            {topic.progress}% Mastery
          </span>
        </div>
        <ProgressTrack
          value={topic.progress}
          color={isCompleted ? "emerald" : topic.progress > 0 ? "cyan" : "purple"}
          height="thin"
        />
      </div>

      {/* ── Compact Data Rows with subtle dividers ── */}
      <div className="divide-y divide-(--color-border) text-xs border-t border-(--color-border)">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2 text-(--color-text-secondary)">
            <Target size={13} className="text-(--color-blue)" />
            <span>Problems Solved</span>
          </div>
          <span className="font-semibold text-(--color-text-primary) tabular-nums">
            {counts.solvedProblems} <span className="text-(--color-text-muted)">/ {counts.problems}</span>
          </span>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2 text-(--color-text-secondary)">
            <GitBranch size={13} className="text-(--color-purple)" />
            <span>Patterns Mastered</span>
          </div>
          <span className="font-semibold text-(--color-text-primary) tabular-nums">
            {counts.patternsCompleted} <span className="text-(--color-text-muted)">/ {counts.patterns}</span>
          </span>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2 text-(--color-text-secondary)">
            <Flame size={13} className="text-(--color-orange)" />
            <span>Missions Completed</span>
          </div>
          <span className="font-semibold text-(--color-text-primary) tabular-nums">
            {counts.missionsCompleted} <span className="text-(--color-text-muted)">/ {counts.missions}</span>
          </span>
        </div>

        {topic.minutes > 0 && (
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 text-(--color-text-secondary)">
              <Clock size={13} className="text-(--color-text-muted)" />
              <span>Time Invested</span>
            </div>
            <span className="font-semibold text-(--color-text-primary)">
              {topic.minutes < 60 ? `${topic.minutes} min` : `~${Math.round(topic.minutes / 60)} hr`}
            </span>
          </div>
        )}

        {lastActivity && (
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 text-(--color-text-secondary)">
              <Activity size={13} className="text-(--color-teal)" />
              <span>Last Activity</span>
            </div>
            <span className="font-medium text-(--color-text-muted)">
              {formatRelativeTime(lastActivity)}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

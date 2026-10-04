"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  GitBranch,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Target,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { DifficultyBadge } from "@/components/product/ui";
import { RestartMissionButton } from "@/components/product/forms";
import { cn } from "@/lib/utils";
import type { TopicDetailData } from "@/components/product/topic-detail-view";
import type { LearningPathContext } from "@/features/learning-paths/types/learning-path-continuity.types";
import { resolveTopicAction } from "./topic-action-resolver";

interface TopicHeaderProps {
  data: TopicDetailData;
  activeMission?: TopicDetailData["missions"][number];
  learningPathContext?: LearningPathContext | null;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
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

function truncateDescription(desc: string, maxSentences = 2): string {
  if (!desc) return "";
  const sentences = desc.match(/[^.!?]+[.!?]+(?:\s|$)/g);
  if (sentences && sentences.length >= maxSentences) {
    return sentences.slice(0, maxSentences).join("").trim();
  }
  return desc.trim();
}

export function TopicHeader({
  data,
  activeMission,
  learningPathContext,
  focusMode = false,
  onToggleFocusMode,
}: TopicHeaderProps) {
  const shouldReduceMotion = useReducedMotion();
  const { topic, counts } = data;

  const resolved = resolveTopicAction(data);
  const shortDesc = truncateDescription(topic.description, 2);
  const lastActivity = topic.lastStudiedAt || topic.lastSolvedAt;

  return (
    <header className="space-y-3 pt-1">
      {/* ── Semantic Breadcrumb ── */}
      <nav aria-label="Topic navigation breadcrumb" className="flex items-center gap-1.5 text-xs text-(--color-text-muted)">
        {learningPathContext ? (
          <>
            <Link
              href={learningPathContext.backToStageUrl}
              className="group flex items-center gap-1.5 font-medium text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
            >
              <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
              <span>Stage {learningPathContext.stageOrder}</span>
            </Link>
            <ChevronRight size={11} className="text-(--color-border)" />
            <span className="text-(--color-text-secondary)">Topics</span>
            <ChevronRight size={11} className="text-(--color-border)" />
            <span className="font-semibold text-(--color-text-primary) truncate max-w-xs sm:max-w-md">
              {topic.title}
            </span>
          </>
        ) : (
          <>
            <Link
              href="/learn"
              className="group flex items-center gap-1.5 font-medium text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
            >
              <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
              <span>Learn</span>
            </Link>
            <ChevronRight size={11} className="text-(--color-border)" />
            <span className="font-semibold text-(--color-text-primary) truncate max-w-xs sm:max-w-md">
              {topic.title}
            </span>
          </>
        )}

        {/* Focus Mode toggle */}
        {onToggleFocusMode && (
          <button
            type="button"
            onClick={onToggleFocusMode}
            className={cn(
              "ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-(--radius-badge) text-xs font-medium transition-colors border",
              focusMode
                ? "bg-(--color-purple-subtle) text-(--color-purple) border-(--color-purple)/30"
                : "bg-transparent text-(--color-text-muted) hover:text-(--color-text-primary) border-(--color-border)"
            )}
            title={focusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
            aria-label={focusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
          >
            {focusMode ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span className="hidden sm:inline">{focusMode ? "Exit Focus" : "Focus Mode"}</span>
          </button>
        )}
      </nav>

      {/* ── Compact Editorial Header Row (Identity + Primary Action) ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1">
        <div className="space-y-1.5 max-w-2xl">
          {/* Metadata badges row */}
          <div className="flex flex-wrap items-center gap-2">
            <DifficultyBadge difficulty={topic.difficulty} />

            {topic.minutes > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-(--color-text-muted)">
                <Clock size={12} />
                <span>{topic.minutes < 60 ? `${topic.minutes} min` : `~${Math.round(topic.minutes / 60)} hr`}</span>
              </span>
            )}

            {resolved.statusBadge.variant === "mastered" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <Check size={12} className="stroke-[2.5]" />
                <span>Mastered</span>
              </span>
            )}

            {resolved.statusBadge.variant === "in_progress" && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
                <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>In Progress</span>
              </span>
            )}

            {resolved.statusBadge.variant === "mission_completed" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <Check size={12} className="stroke-[2.5]" />
                <span>Mission Completed</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-(--color-text-primary) leading-tight">
            {topic.title}
          </h1>

          {shortDesc && (
            <p className="text-xs sm:text-sm text-(--color-text-secondary) leading-relaxed">
              {shortDesc}
            </p>
          )}
        </div>

        {/* Dynamic Primary Action Button (Right Aligned in Header) */}
        <div className="shrink-0 self-start sm:self-end pb-0.5">
          {resolved.headerAction.variant === "secondary" ? (
            <div className="flex items-center gap-2">
              <Link
                href={resolved.headerAction.href}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-(--radius-btn) text-xs font-semibold border border-(--color-border) bg-(--color-surface-1) text-(--color-text-primary) hover:bg-(--color-surface-2) transition-colors"
              >
                {resolved.headerAction.icon === "book-open" ? (
                  <BookOpen size={13} />
                ) : (
                  <Target size={13} />
                )}
                <span>{resolved.headerAction.label}</span>
              </Link>
              {activeMission && <RestartMissionButton missionId={activeMission.id} />}
            </div>
          ) : (
            <motion.div
              initial={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                href={resolved.headerAction.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-(--radius-btn) px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0",
                  resolved.headerAction.icon === "target"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
                    : resolved.headerAction.icon === "git-branch"
                    ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
                    : resolved.resolvedState === "in_progress"
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
                    : "bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500"
                )}
              >
                {resolved.headerAction.icon === "target" ? (
                  <Target size={13} className="shrink-0" />
                ) : resolved.headerAction.icon === "git-branch" ? (
                  <GitBranch size={13} className="shrink-0" />
                ) : (
                  <Play size={12} className="fill-current shrink-0" />
                )}
                <span>{resolved.headerAction.label}</span>
              </Link>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Cohesive Metric Row & Divider ── */}
      <div className="pt-2 border-b border-(--color-border) pb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* Dominant Primary Metric */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black tracking-tight text-(--color-text-primary) tabular-nums">
              {topic.progress}%
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-(--color-text-muted)">
              Mastery
            </span>
          </div>

          <div className="hidden sm:block h-3.5 w-[1px] bg-(--color-border)" aria-hidden="true" />

          {/* Secondary Metrics */}
          <div className="flex flex-wrap items-center gap-4 text-(--color-text-secondary)">
            {counts.problems > 0 && (
              <span className="tabular-nums">
                <strong className="font-semibold text-(--color-text-primary)">{counts.solvedProblems}</strong>
                <span className="text-(--color-text-muted)">/{counts.problems}</span> Problems
              </span>
            )}

            {counts.patterns > 0 && (
              <span className="tabular-nums">
                <strong className="font-semibold text-(--color-text-primary)">{counts.patternsCompleted}</strong>
                <span className="text-(--color-text-muted)">/{counts.patterns}</span> Patterns
              </span>
            )}

            {counts.missions > 0 && (
              <span className="tabular-nums">
                <strong className="font-semibold text-(--color-text-primary)">{counts.missionsCompleted}</strong>
                <span className="text-(--color-text-muted)">/{counts.missions}</span> Missions
              </span>
            )}
          </div>
        </div>

        <div className="text-[11px] text-(--color-text-muted)">
          {lastActivity ? `Last studied ${formatRelativeTime(lastActivity)}` : "Not started yet"}
        </div>
      </div>
    </header>
  );
}

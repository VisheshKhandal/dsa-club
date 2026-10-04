"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Award,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronDown,
  Clock,
  Compass,
  Flame,
  HelpCircle,
  Lightbulb,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Surface, PageHeader, ProgressTrack } from "./ui";

/* ── Types & Interfaces ────────────────────────────────── */

export interface RadarMetrics {
  arrays: number;
  trees: number;
  dp: number;
  graphs: number;
  patterns: number;
  problemSolving: number;
  totalEvidence: number;
}

export interface RecentEvidenceItem {
  id: string;
  key?: string;
  type: "problem_solve" | "hint_solve" | "mission_stage" | "pattern_recognition" | "revision";
  title: string;
  subtitle: string;
  badge: string;
  badgeVariant: "emerald" | "blue" | "purple" | "amber";
  href?: string;
  timestamp: string;
}

export interface ProgressTopicExplainable {
  why: string;
  strongAreas: string[];
  weakAreas: string[];
  recentSuccesses: string[];
  recentMistakes: string[];
  needsRevision: string[];
  nextAction: string;
}

export interface ProgressTopicItem {
  id: string;
  topicId: string;
  slug: string;
  title: string;
  topicName: string;
  progress: number;
  mastery: number;
  confidence: number;
  difficulty: string;
  state: string;
  explainable?: ProgressTopicExplainable | null;
}

export interface ProgressSnapshotData {
  stats: {
    totalFocusedMinutes: number;
    solvedProblems: number;
    attemptedProblems: number;
    currentStreakDays: number;
    overallMasteryScore: number;
    interviewReadinessScore: number;
    consistencyScore: number;
    revisionRetentionScore: number;
    masteryScore: number;
    currentStreak: number;
    problemsSolved: number;
    readinessScore: number;
    studyTimeHours: number;
    independentSolves?: number;
    hintAssistedSolves?: number;
    patternAccuracy?: number;
    topicsMastered?: number;
  };
  radarMetrics?: RadarMetrics;
  recentEvidence?: RecentEvidenceItem[];
  topicProgress: ProgressTopicItem[];
  weeklyActivity?: Array<{
    date: string;
    minutes: number;
    problemsSolved: number;
    problemsAttempted: number;
    revisionsDone: number;
    activityScore: number;
  }>;
  focusAction?: {
    rank?: number;
    title: string;
    href: string;
    reason: string;
    estimatedMinutes?: number;
    entityType?: string;
  } | null;
  intelligenceSummary?: {
    overallMastery: number;
    strongTopics: string[];
    weakTopics: string[];
    patternsNeedingRevision: string[];
    recentImprovement: string;
    revisionNeeds: string;
    interviewReadinessSignal: string;
    recommendedNextAction: string;
  };
  focusAreas?: Array<{
    slug: string;
    href: string;
    mastery: number;
    name?: string;
    title?: string;
  }>;
  activeMission?: {
    slug: string;
    title: string;
    topic: string;
    progress: number;
  } | null;
  isNewUser?: boolean;
}

/* ── 1. Readiness Indicator Component ───────────────────── */

export function ReadinessIndicator({
  score,
  independentSolves,
  hintAssistedSolves,
  patternAccuracy,
  topicsMastered,
  isCelebration,
}: {
  score: number;
  independentSolves: number;
  hintAssistedSolves: number;
  patternAccuracy: number;
  topicsMastered: number;
  isCelebration: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();
  const radius = 48;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  // Status Tier Badge
  const tier =
    clampedScore >= 80
      ? { label: "Interview Ready", color: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/30", ring: "stroke-emerald-400" }
      : clampedScore >= 50
      ? { label: "Building Foundation", color: "text-cyan-300", bg: "bg-cyan-500/10 border-cyan-500/30", ring: "stroke-cyan-400" }
      : { label: "Building Evidence", color: "text-purple-300", bg: "bg-purple-500/10 border-purple-500/30", ring: "stroke-purple-400" };

  return (
    <Surface level="elevated" className="relative overflow-hidden p-6 sm:p-7 flex flex-col justify-between border-[var(--border-strong,#33424D)] bg-[var(--bg-surface-raised,#17212B)]">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--accent-lime,#B7F36B)]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted,#71807C)]">Interview Readiness Evidence</span>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tier.bg} ${tier.color}`}>
            {clampedScore >= 80 && <Sparkles className="w-3 h-3" />}
            {tier.label}
          </span>
        </div>

        {/* Meter & Primary Value */}
        <div className="flex flex-col sm:flex-row items-center gap-6 my-3">
          <div className="relative flex items-center justify-center shrink-0">
            <svg width="124" height="124" className="-rotate-90 transform">
              <circle
                cx="62"
                cy="62"
                r={radius}
                className="stroke-white/[0.08]"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <motion.circle
                cx="62"
                cy="62"
                r={radius}
                className={tier.ring}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: prefersReducedMotion ? 0 : 1.2, ease: "easeOut" }}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold tracking-tight text-[var(--text-primary,#F3F6F4)] font-mono">{clampedScore}%</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted,#71807C)]">Readiness</span>
            </div>
          </div>

          {/* Explanation narrative */}
          <div className="space-y-1.5 text-center sm:text-left">
            <p className="text-sm font-medium text-[var(--text-primary,#F3F6F4)]">
              {clampedScore >= 80
                ? "Demonstrated high technical interview readiness."
                : clampedScore >= 50
                ? "Solid core foundation with active topic development."
                : "Initial algorithmic signals being recorded."}
            </p>
            <p className="text-xs text-[var(--text-secondary,#A8B4B0)] leading-relaxed max-w-sm">
              Readiness is derived from independent solve accuracy, multi-topic mastery depth, and pattern recognition velocity.
            </p>
          </div>
        </div>
      </div>

      {/* Meaningful Evidence Breakdown Grid */}
      <div className="mt-5 pt-4 border-t border-[var(--border-subtle,#24313B)] grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-lg bg-[var(--bg-app,#0B0F14)] border border-[var(--border-subtle,#24313B)] p-2.5 text-center">
          <p className="text-base font-bold text-emerald-400 font-mono">{independentSolves}</p>
          <p className="text-[10px] font-medium text-[var(--text-muted,#71807C)] leading-tight mt-0.5">Independent Solves</p>
        </div>
        <div className="rounded-lg bg-[var(--bg-app,#0B0F14)] border border-[var(--border-subtle,#24313B)] p-2.5 text-center">
          <p className="text-base font-bold text-cyan-300 font-mono">{hintAssistedSolves}</p>
          <p className="text-[10px] font-medium text-[var(--text-muted,#71807C)] leading-tight mt-0.5">Guided Solves</p>
        </div>
        <div className="rounded-lg bg-[var(--bg-app,#0B0F14)] border border-[var(--border-subtle,#24313B)] p-2.5 text-center">
          <p className="text-base font-bold text-[var(--accent-lime,#B7F36B)] font-mono">{patternAccuracy}%</p>
          <p className="text-[10px] font-medium text-[var(--text-muted,#71807C)] leading-tight mt-0.5">Pattern Accuracy</p>
        </div>
        <div className="rounded-lg bg-[var(--bg-app,#0B0F14)] border border-[var(--border-subtle,#24313B)] p-2.5 text-center">
          <p className="text-base font-bold text-amber-300 font-mono">{topicsMastered}</p>
          <p className="text-[10px] font-medium text-[var(--text-muted,#71807C)] leading-tight mt-0.5">Topics Mastered</p>
        </div>
      </div>
    </Surface>
  );
}

/* ── 2. Recommendation Card (ONE Next Action) ───────────── */

export function RecommendationCard({
  action,
}: {
  action: {
    title: string;
    href: string;
    reason: string;
    estimatedMinutes?: number;
    entityType?: string;
  };
}) {
  const getCtaLabel = (entityType?: string) => {
    switch (entityType) {
      case "mission":
        return "Continue Mission →";
      case "pattern":
        return "Practice Pattern →";
      case "problem":
        return "Prepare Problem →";
      case "revision":
        return "Clear Queue →";
      default:
        return "Take Action →";
    }
  };

  return (
    <Surface level="elevated" className="relative overflow-hidden p-6 sm:p-7 flex flex-col justify-between group border-[var(--border-strong,#33424D)] bg-[var(--bg-surface-raised,#17212B)]">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--accent-lime,#B7F36B)]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted,#71807C)]">Highest Value Next Action</span>
          </div>
          {action.estimatedMinutes && (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted,#71807C)] bg-[var(--bg-app,#0B0F14)] px-2 py-0.5 rounded border border-[var(--border-subtle,#24313B)]">
              <Clock className="w-3 h-3 text-[var(--accent-amber,#F2B84B)]" />
              {action.estimatedMinutes}m
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-[var(--text-primary,#F3F6F4)] group-hover:text-[var(--accent-lime,#B7F36B)] transition-colors leading-snug">
          {action.title}
        </h3>

        <p className="mt-2 text-xs text-[var(--text-secondary,#A8B4B0)] leading-relaxed">
          {action.reason}
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-[var(--border-subtle,#24313B)] flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--accent-lime,#B7F36B)] uppercase tracking-wider">
          Recommended for you
        </span>
        <Link
          href={action.href}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent-lime,#B7F36B)] text-[#0B0F14] text-xs font-bold hover:bg-[var(--accent-lime-dark,#6B9B36)] transition shadow-sm"
        >
          {getCtaLabel(action.entityType)}
        </Link>
      </div>
    </Surface>
  );
}

export const NextActionCard = RecommendationCard;

/* ── 3. Radar Chart (Pure SVG 6-Axis Visualization) ─────── */

export function RadarChart({ metrics }: { metrics?: RadarMetrics }) {
  const prefersReducedMotion = useReducedMotion();
  const dimensions = [
    { key: "arrays", label: "Arrays", value: metrics?.arrays ?? 0 },
    { key: "trees", label: "Trees", value: metrics?.trees ?? 0 },
    { key: "dp", label: "DP", value: metrics?.dp ?? 0 },
    { key: "graphs", label: "Graphs", value: metrics?.graphs ?? 0 },
    { key: "patterns", label: "Patterns", value: metrics?.patterns ?? 0 },
    { key: "problemSolving", label: "Problem Solving", value: metrics?.problemSolving ?? 0 },
  ];

  const totalEvidence = metrics?.totalEvidence ?? dimensions.reduce((s, d) => s + d.value, 0);
  const isZeroEvidence = totalEvidence === 0;

  // Geometry
  const cx = 160;
  const cy = 160;
  const maxR = 95;
  const numAxes = dimensions.length;

  const getCoordinates = (index: number, radius: number) => {
    const angle = (index * 2 * Math.PI) / numAxes - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  // Concentric Rings at 25%, 50%, 75%, 100%
  const ringLevels = [0.25, 0.5, 0.75, 1.0];
  const ringPolygons = ringLevels.map((level) => {
    const pts = dimensions.map((_, i) => {
      const { x, y } = getCoordinates(i, maxR * level);
      return `${x},${y}`;
    });
    return pts.join(" ");
  });

  // Data Polygon
  const dataPolygonPoints = dimensions
    .map((dim, i) => {
      const normalized = Math.max(8, (dim.value / 100) * maxR);
      const { x, y } = getCoordinates(i, normalized);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Surface level="default" className="p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-(--color-text-primary)">6-Axis Algorithmic Radar</h3>
          </div>
          <span className="text-[11px] text-(--color-text-muted) font-medium">Relative Competency</span>
        </div>
        <p className="text-xs text-(--color-text-secondary) mb-4 leading-relaxed">
          Holistic balance across foundational structures, advanced techniques, and recognition.
        </p>
      </div>

      <div className="relative w-full flex items-center justify-center py-2">
        <svg viewBox="0 0 320 320" className="w-full max-w-[300px] h-auto overflow-visible select-none">
          <defs>
            <radialGradient id="radarFillGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
            </radialGradient>
          </defs>

          {/* Concentric Hexagon Grid Rings */}
          {ringPolygons.map((pts, idx) => (
            <polygon
              key={`ring-${idx}`}
              points={pts}
              fill="none"
              stroke="currentColor"
              className={idx === 3 ? "text-(--color-border) opacity-80" : "text-(--color-border) opacity-40"}
              strokeWidth={idx === 3 ? "1.5" : "1"}
            />
          ))}

          {/* Radial Spokes from Center */}
          {dimensions.map((_, i) => {
            const { x, y } = getCoordinates(i, maxR);
            return (
              <line
                key={`spoke-${i}`}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="currentColor"
                className="text-(--color-border) opacity-50"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
            );
          })}

          {/* If Zero Evidence: Dashed guided indicator */}
          {isZeroEvidence ? (
            <g>
              <circle cx={cx} cy={cy} r="28" fill="rgba(168, 85, 247, 0.08)" stroke="rgba(168, 85, 247, 0.3)" strokeDasharray="3 3" />
              <text x={cx} y={cy + 3} textAnchor="middle" className="fill-purple-600 dark:fill-purple-300 text-[10px] font-semibold">
                No Data Yet
              </text>
            </g>
          ) : (
            <>
              {/* Animated Data Polygon */}
              <motion.polygon
                points={dataPolygonPoints}
                fill="url(#radarFillGrad)"
                stroke="#a855f7"
                strokeWidth="2"
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              />

              {/* Data Vertices */}
              {dimensions.map((dim, i) => {
                const normalized = Math.max(8, (dim.value / 100) * maxR);
                const { x, y } = getCoordinates(i, normalized);
                return (
                  <circle
                    key={`vertex-${i}`}
                    cx={x}
                    cy={y}
                    r="3.5"
                    className="fill-purple-500 dark:fill-purple-300 stroke-white dark:stroke-purple-950"
                    strokeWidth="1.5"
                  />
                );
              })}
            </>
          )}

          {/* Outer Dimension Labels */}
          {dimensions.map((dim, i) => {
            const labelCoord = getCoordinates(i, maxR + 24);
            const isTop = i === 0;
            const isBottom = i === 3;
            const isRight = i === 1 || i === 2;

            let textAnchor: "middle" | "start" | "end" = "middle";
            if (isRight) textAnchor = "start";
            else if (!isTop && !isBottom) textAnchor = "end";

            return (
              <g key={`label-${dim.key}`}>
                <text
                  x={labelCoord.x}
                  y={labelCoord.y}
                  textAnchor={textAnchor}
                  className="fill-(--color-text-primary) text-[11px] font-semibold"
                >
                  {dim.label}
                </text>
                <text
                  x={labelCoord.x}
                  y={labelCoord.y + 12}
                  textAnchor={textAnchor}
                  className="fill-purple-600 dark:fill-purple-300/70 text-[10px] font-medium"
                >
                  {isZeroEvidence ? "0%" : `${dim.value}%`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {isZeroEvidence && (
        <div className="mt-3 p-2.5 rounded-lg bg-purple-900/20 border border-purple-500/20 text-center">
          <p className="text-xs text-purple-200/80">
            Complete your first problem or mission to map your algorithmic fingerprint.
          </p>
        </div>
      )}
    </Surface>
  );
}

/* ── 4. 7-Day Progress & Activity Trend ─────────────────── */

export function ProgressTrend7Day({
  weeklyActivity,
}: {
  weeklyActivity?: Array<{
    date: string;
    minutes: number;
    problemsSolved: number;
    problemsAttempted: number;
    revisionsDone: number;
    activityScore: number;
  }>;
}) {
  const days = weeklyActivity || [];
  const totalMinutes = days.reduce((sum, d) => sum + (d.minutes || 0), 0);
  const totalSolves = days.reduce((sum, d) => sum + (d.problemsSolved || 0), 0);
  const totalRevisions = days.reduce((sum, d) => sum + (d.revisionsDone || 0), 0);
  const hasActivity = totalMinutes > 0 || totalSolves > 0 || totalRevisions > 0;

  const maxScore = Math.max(1, ...days.map((d) => d.activityScore || 0));

  const formatDayName = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { weekday: "narrow" });
    } catch {
      return "•";
    }
  };

  return (
    <Surface level="default" className="p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-(--color-text-primary)">7-Day Momentum</h3>
          </div>
          <span className="text-[11px] text-(--color-text-muted) font-medium">Last 7 Days</span>
        </div>
        <p className="text-xs text-(--color-text-secondary) mb-4 leading-relaxed">
          Daily active study time, verified problem solves, and spaced repetition drills.
        </p>
      </div>

      {hasActivity ? (
        <div className="space-y-4 my-auto py-2">
          {/* Daily Spark-Pill Visualizer */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, idx) => {
              const active = (day.activityScore || 0) > 0;
              const heightPercent = Math.max(15, Math.round(((day.activityScore || 0) / maxScore) * 100));

              return (
                <div key={day.date || idx} className="flex flex-col items-center gap-2 group">
                  <div className="w-full h-24 rounded-lg bg-(--color-surface-2) border border-(--color-border) p-1 flex items-end justify-center">
                    <div
                      style={{ height: `${active ? heightPercent : 8}%` }}
                      className={`w-full rounded transition-all duration-300 ${
                        active
                          ? (day.problemsSolved || 0) > 0
                            ? "bg-gradient-to-t from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/30"
                            : "bg-gradient-to-t from-purple-500 to-indigo-400"
                          : "bg-(--color-surface-3)"
                      }`}
                      title={`${day.minutes}m studied • ${day.problemsSolved} solved • ${day.revisionsDone} revisions`}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-(--color-text-muted) group-hover:text-(--color-text-primary) transition-colors">
                    {formatDayName(day.date)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Weekly Summary Row */}
          <div className="flex items-center justify-between pt-3 border-t border-(--color-border) text-xs">
            <span className="text-(--color-text-secondary)">
              <strong className="text-(--color-text-primary) font-semibold">{totalSolves}</strong> solved •{" "}
              <strong className="text-(--color-text-primary) font-semibold">{totalMinutes}m</strong> focused
            </span>
            <span className="text-emerald-500 dark:text-emerald-400 font-medium flex items-center gap-1">
              <Flame className="w-3 h-3" /> Active Momentum
            </span>
          </div>
        </div>
      ) : (
        <div className="my-auto py-6 text-center space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-(--color-surface-2) border border-(--color-border) flex items-center justify-center text-purple-400">
            <Clock className="w-5 h-5 opacity-60" />
          </div>
          <p className="text-xs text-purple-200/70 max-w-xs mx-auto">
            No activity logged in the past 7 days. Solve your first problem or complete a mission to start your momentum streak.
          </p>
        </div>
      )}
    </Surface>
  );
}

/* ── 5. Strengths Section (Evidence-Backed) ─────────────── */

export function StrengthsSection({
  strengths,
}: {
  strengths: Array<{ title: string; description: string; evidence: string }>;
}) {
  return (
    <Surface level="default" className="p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Award className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-(--color-text-primary)">Verified Strengths</h3>
        </div>
        <p className="text-xs text-(--color-text-secondary) mb-4 leading-relaxed">
          Competencies validated through independent problem solves and high pattern recognition accuracy.
        </p>
      </div>

      <div className="space-y-3 my-auto">
        {strengths.length > 0 ? (
          strengths.map((st, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/20 hover:border-emerald-500/35 transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-(--color-text-primary) flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {st.title}
                </p>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {st.evidence}
                </span>
              </div>
              <p className="text-[11px] text-(--color-text-secondary) mt-1.5 leading-relaxed pl-5">
                {st.description}
              </p>
            </div>
          ))
        ) : (
          <div className="p-4 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-center">
            <p className="text-xs text-(--color-text-muted)">
              Solve 2–3 problems independently to establish your first evidence-backed strength.
            </p>
          </div>
        )}
      </div>
    </Surface>
  );
}

/* ── 6. Focus Areas Section & WeakTopicChip ─────────────── */

export function WeakTopicChip({
  topic,
}: {
  topic: {
    slug: string;
    href: string;
    mastery: number;
    name?: string;
    title?: string;
    gap?: string;
  };
}) {
  const displayName = topic.name || topic.title || topic.slug;

  return (
    <Link
      href={topic.href || `/learn/topics/${topic.slug}`}
      className="group p-3 rounded-lg bg-amber-500/[0.05] hover:bg-amber-500/[0.08] border border-amber-500/20 hover:border-amber-500/40 transition-all flex flex-col justify-between"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-(--color-text-primary) group-hover:text-amber-600 dark:group-hover:text-amber-200 transition-colors">
          {displayName}
        </span>
        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
          {topic.mastery}% mastery
        </span>
      </div>
      {topic.gap && (
        <p className="text-[11px] text-amber-800 dark:text-amber-200/70 mt-1.5 leading-relaxed">
          {topic.gap}
        </p>
      )}
      <span className="text-[10px] font-medium text-(--color-purple) group-hover:underline mt-2 flex items-center gap-1">
        Targeted Practice <ArrowRight className="w-2.5 h-2.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export function FocusAreasSection({
  focusTopics,
}: {
  focusTopics: Array<{
    slug: string;
    href: string;
    mastery: number;
    name?: string;
    title?: string;
    gap?: string;
  }>;
}) {
  return (
    <Surface level="default" className="p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-(--color-text-primary)">Focus Areas & Gaps</h3>
        </div>
        <p className="text-xs text-(--color-text-secondary) mb-4 leading-relaxed">
          Specific topics or sub-skills that would benefit most from targeted practice drills.
        </p>
      </div>

      <div className="space-y-3 my-auto">
        {focusTopics.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {focusTopics.map((item, idx) => (
              <WeakTopicChip key={item.slug || idx} topic={item} />
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-center">
            <p className="text-xs text-(--color-text-muted)">
              No critical weak areas identified. Continue expanding topic coverage.
            </p>
          </div>
        )}
      </div>
    </Surface>
  );
}

/* ── 7. Recent Evidence Section ─────────────────────────── */

export function RecentEvidenceSection({
  evidence,
}: {
  evidence: RecentEvidenceItem[];
}) {
  const getBadgeStyle = (variant: RecentEvidenceItem["badgeVariant"]) => {
    switch (variant) {
      case "emerald":
        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/25";
      case "blue":
        return "bg-cyan-500/10 text-cyan-300 border-cyan-500/25";
      case "amber":
        return "bg-amber-500/10 text-amber-300 border-amber-500/25";
      default:
        return "bg-purple-500/10 text-purple-300 border-purple-500/25";
    }
  };

  return (
    <Surface level="default" className="p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-(--color-text-primary)">Recent Evidence</h3>
        </div>
        <span className="text-[11px] text-(--color-text-muted) font-medium">Verified Progress Milestones</span>
      </div>
      <p className="text-xs text-(--color-text-secondary) mb-4 leading-relaxed">
        Proof of skill development from your latest independent solves, guided breakthroughs, and completed missions.
      </p>

      {evidence.length > 0 ? (
        <div className="divide-y divide-(--color-border)">
          {evidence.map((item) => {
            const ContentWrapper = item.href ? Link : "div";
            return (
              <ContentWrapper
                key={item.id}
                href={item.href || "#"}
                className={`py-3 flex items-start justify-between gap-4 group ${
                  item.href ? "hover:bg-(--color-surface-2) px-2 rounded-lg -mx-2 transition-colors" : ""
                }`}
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-semibold text-(--color-text-primary) group-hover:text-(--color-purple) transition-colors truncate">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-(--color-text-muted) leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getBadgeStyle(item.badgeVariant)}`}>
                    {item.badge}
                  </span>
                  {item.href && (
                    <ArrowRight className="w-3.5 h-3.5 text-purple-400 group-hover:text-(--color-purple) transition-transform group-hover:translate-x-0.5" />
                  )}
                </div>
              </ContentWrapper>
            );
          })}
        </div>
      ) : (
        <div className="py-6 text-center text-xs text-(--color-text-muted)">
          No recent evidence recorded yet. Start a problem or mission to log proof of progress.
        </div>
      )}
    </Surface>
  );
}

/* ── 8. Supporting Topic Mastery Accordion ───────────────── */

export function TopicMasteryAccordion({
  topicProgress,
}: {
  topicProgress: ProgressTopicItem[];
}) {
  const [openTopicId, setOpenTopicId] = useState<string | null>(null);

  const toggleTopic = (id: string) => {
    setOpenTopicId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-(--color-text-primary)">Topic Deep Dive</h3>
        <p className="text-xs text-(--color-text-secondary) leading-relaxed">
          Secondary topic-by-topic breakdown of strong concepts, flagged misconceptions, and targeted recommendations.
        </p>
      </div>

      <Surface level="default" className="p-0 overflow-hidden divide-y divide-(--color-border)">
        {topicProgress.map((topic) => {
          const isOpen = openTopicId === (topic.id || topic.topicId);
          const explainable = topic.explainable;

          return (
            <div key={topic.id || topic.topicId} className="transition-colors">
              <button
                type="button"
                onClick={() => toggleTopic(topic.id || topic.topicId)}
                className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-(--color-surface-2) transition-colors gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-semibold text-(--color-text-primary)">{topic.topicName || topic.title}</span>
                    <span className="text-[10px] font-medium text-(--color-text-muted) bg-(--color-surface-2) px-1.5 py-0.5 rounded border border-(--color-border)">
                      {topic.difficulty}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 max-w-[180px]">
                      <ProgressTrack value={topic.mastery} height="thin" />
                    </div>
                    <span className="text-xs font-semibold text-(--color-text-secondary)">{topic.mastery}%</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <Link
                    href={`/learn/topics/${topic.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-purple-300 hover:text-purple-200 bg-purple-500/10 px-2.5 py-1 rounded border border-purple-500/20 transition-colors"
                  >
                    View Topic <ArrowRight className="w-2.5 h-2.5" />
                  </Link>
                  <ChevronDown
                    className={`w-4 h-4 text-(--color-text-muted) transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-(--color-purple)" : ""
                    }`}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-2 text-xs text-(--color-text-secondary) space-y-4 border-t border-(--color-border) bg-(--color-surface-2)/40">
                  {explainable ? (
                    <>
                      {explainable.why && (
                        <p className="italic border-l-2 border-purple-500/40 pl-3 text-(--color-text-secondary)">
                          {explainable.why}
                        </p>
                      )}

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-emerald-500/[0.03] border border-emerald-500/15">
                          <p className="font-semibold text-emerald-600 dark:text-emerald-300 mb-1.5">Strong Areas</p>
                          {explainable.strongAreas?.length ? (
                            <ul className="list-disc list-inside space-y-0.5 text-emerald-700 dark:text-emerald-200/80">
                              {explainable.strongAreas.map((a, i) => (
                                <li key={i}>{a}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-(--color-text-muted)">Keep practicing to establish strong sub-topics.</p>
                          )}
                        </div>

                        <div className="p-3 rounded-lg bg-amber-500/[0.03] border border-amber-500/15">
                          <p className="font-semibold text-amber-600 dark:text-amber-300 mb-1.5">Needs Improvement</p>
                          {explainable.weakAreas?.length ? (
                            <ul className="list-disc list-inside space-y-0.5 text-amber-800 dark:text-amber-200/80">
                              {explainable.weakAreas.map((a, i) => (
                                <li key={i}>{a}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-(--color-text-muted)">No specific weaknesses identified.</p>
                          )}
                        </div>
                      </div>

                      {/* Topic Action Button */}
                      <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/25 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-wider text-(--color-purple)">
                            Recommended Action
                          </p>
                          <p className="text-xs font-medium text-(--color-text-primary) mt-0.5">
                            {explainable.nextAction || "Explore foundational concepts and guided problems for this topic."}
                          </p>
                        </div>
                        <Link
                          href={`/learn/topics/${topic.slug}`}
                          className="shrink-0 px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors"
                        >
                          Explore Topic →
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="py-2 text-(--color-text-muted)">
                      Not enough problem evidence available to explain detailed sub-skills for this topic.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {topicProgress.length === 0 && (
          <div className="p-6 text-center text-xs text-purple-200/50">
            No topic progress data available.
          </div>
        )}
      </Surface>
    </div>
  );
}

/* ── 9. New User Guided State ("Build Your Evidence") ────── */

export function BuildEvidenceState({
  recommendedAction,
}: {
  recommendedAction: {
    title: string;
    href: string;
    reason: string;
    estimatedMinutes?: number;
    entityType?: string;
  };
}) {
  return (
    <div className="space-y-8">
      {/* Motivating Header */}
      <Surface level="elevated" className="relative overflow-hidden p-6 sm:p-8 border-purple-500/30">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 border border-purple-500/30 text-(--color-purple)">
            <Compass className="w-3.5 h-3.5" />
            Welcome to Progress Intelligence
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-(--color-text-primary) tracking-tight">
            Build your evidence
          </h2>
          <p className="text-sm text-(--color-text-secondary) leading-relaxed">
            DSA Club evaluates your problem-solving accuracy, pattern recognition velocity, and interview readiness derived from real learning milestones. No empty statistical filler—take your first step below.
          </p>
        </div>
      </Surface>

      {/* ONE Clear First Action */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-(--color-text-muted) mb-3">
          Your Starting Point
        </h3>
        <RecommendationCard action={recommendedAction} />
      </div>

      {/* Three Pedagogical Pillars */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Surface level="default" className="p-5 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-semibold text-(--color-text-primary)">Independent Solves</h4>
          <p className="text-xs text-(--color-text-muted) leading-relaxed">
            Solving problems without hints builds genuine technical interview confidence and boosts your readiness gauge.
          </p>
        </Surface>

        <Surface level="default" className="p-5 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-(--color-purple)">
            <Brain className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-semibold text-(--color-text-primary)">6-Axis Radar</h4>
          <p className="text-xs text-(--color-text-muted) leading-relaxed">
            Continuously balances your competency across Arrays, Trees, DP, Graphs, Patterns, and Problem Solving.
          </p>
        </Surface>

        <Surface level="default" className="p-5 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 dark:text-cyan-300">
            <TrendingUp className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-semibold text-(--color-text-primary)">Active Retention</h4>
          <p className="text-xs text-(--color-text-muted) leading-relaxed">
            Automated spaced repetitions ensure the patterns you study stick until the day of your interview.
          </p>
        </Surface>
      </div>

      {/* Guided Empty Radar */}
      <RadarChart />
    </div>
  );
}

/* ── Progress Intelligence Invariants & Pure Helpers ───── */

export function deriveReadinessTier(score: number) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  if (clamped >= 80) {
    return { tier: "Interview Ready", color: "text-emerald-300", isCelebration: true, minScore: 80 };
  }
  if (clamped >= 50) {
    return { tier: "Building Foundation", color: "text-cyan-300", isCelebration: false, minScore: 50 };
  }
  return { tier: "Building Evidence", color: "text-purple-300", isCelebration: false, minScore: 0 };
}

export function isNewUserState(stats?: ProgressSnapshotData["stats"], recentEvidence?: RecentEvidenceItem[]) {
  const solves = stats?.problemsSolved ?? stats?.solvedProblems ?? 0;
  const hours = stats?.studyTimeHours ?? Math.round((stats?.totalFocusedMinutes ?? 0) / 60);
  const readiness = stats?.readinessScore ?? stats?.interviewReadinessScore ?? 0;
  const evidenceCount = recentEvidence?.length ?? 0;

  return solves === 0 && hours === 0 && readiness < 10 && evidenceCount === 0;
}

export function deriveOneNextAction(
  focusAction?: ProgressSnapshotData["focusAction"] | null,
  activeMission?: ProgressSnapshotData["activeMission"] | null,
  intelligenceSummary?: ProgressSnapshotData["intelligenceSummary"] | null
) {
  if (focusAction?.title && focusAction?.href) {
    return {
      title: focusAction.title,
      href: focusAction.href,
      reason: focusAction.reason || "Highest value learning step based on current evidence.",
      estimatedMinutes: focusAction.estimatedMinutes || 15,
      entityType: focusAction.entityType || "problem",
      ctaLabel:
        focusAction.entityType === "mission"
          ? "Continue Mission →"
          : focusAction.entityType === "pattern"
          ? "Practice Pattern →"
          : focusAction.entityType === "problem"
          ? "Prepare Problem →"
          : "Take Action →",
    };
  }

  if (activeMission?.title) {
    return {
      title: `Continue Mission: ${activeMission.title}`,
      href: activeMission.slug ? `/missions/${activeMission.slug}` : "/missions/arrays-and-memory",
      reason: intelligenceSummary?.recommendedNextAction || "Build foundational continuous memory and indexing awareness.",
      estimatedMinutes: 20,
      entityType: "mission",
      ctaLabel: "Continue Mission →",
    };
  }

  return {
    title: "Arrays & Memory Foundations",
    href: "/missions/arrays-and-memory",
    reason: intelligenceSummary?.recommendedNextAction || "Build foundational continuous memory and indexing awareness.",
    estimatedMinutes: 20,
    entityType: "mission",
    ctaLabel: "Start Mission →",
  };
}

export function deduplicateMilestoneEvidence(rawItems: Array<{ key: string; title: string; type: string; timestamp: string }>) {
  const seen = new Set<string>();
  const deduped: typeof rawItems = [];

  for (const item of rawItems) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    deduped.push(item);
  }

  return deduped.slice(0, 5);
}

export function computeRadarPolygonPoints(
  cx: number,
  cy: number,
  maxR: number,
  dimensions: Array<{ key: string; value: number }>
) {
  return dimensions.map((dim, i) => {
    const angle = (i * 2 * Math.PI) / dimensions.length - Math.PI / 2;
    const normalized = Math.max(8, (dim.value / 100) * maxR);
    const x = Math.round((cx + normalized * Math.cos(angle)) * 10) / 10;
    const y = Math.round((cy + normalized * Math.sin(angle)) * 10) / 10;
    return { key: dim.key, x, y };
  });
}

/* ── Main Progress Intelligence View ────────────────────── */

export function ProgressIntelligenceView({ data }: { data: ProgressSnapshotData }) {
  const {
    stats,
    radarMetrics,
    recentEvidence = [],
    topicProgress = [],
    weeklyActivity = [],
    focusAction,
    intelligenceSummary,
    focusAreas = [],
    activeMission,
  } = data;

  // Derive readiness score
  const readinessScore = Math.max(
    0,
    Number(stats?.interviewReadinessScore ?? stats?.readinessScore ?? intelligenceSummary?.overallMastery ?? 0)
  );

  // Derive ONE high-value next action
  const singleNextAction = deriveOneNextAction(focusAction, activeMission, intelligenceSummary);

  // Derive evidence drivers
  const independentSolves = Number(stats?.independentSolves ?? (stats?.problemsSolved ? Math.round(stats.problemsSolved * 0.7) : 0));
  const hintAssistedSolves = Number(stats?.hintAssistedSolves ?? (stats?.problemsSolved ? Math.max(0, stats.problemsSolved - independentSolves) : 0));
  const patternAccuracy = Number(radarMetrics?.patterns ?? stats?.patternAccuracy ?? 0);
  const topicsMastered = Number(stats?.topicsMastered ?? topicProgress.filter((t) => t.mastery >= 75).length);

  // Check new user state (insufficient data, zero activity)
  const isNewUser = isNewUserState(stats, recentEvidence);

  // Check celebration state
  const { isCelebration } = deriveReadinessTier(readinessScore);

  // Derive evidence-backed strengths
  const strengthsList: Array<{ title: string; description: string; evidence: string }> = [];
  if (independentSolves > 0) {
    strengthsList.push({
      title: "Independent Problem Solving",
      description: `${independentSolves} problem(s) solved cleanly without hints.`,
      evidence: `${independentSolves} independent solves`,
    });
  }
  const topTopics = [...topicProgress].sort((a, b) => b.mastery - a.mastery).filter((t) => t.mastery >= 60);
  for (const t of topTopics.slice(0, 2)) {
    strengthsList.push({
      title: `${t.topicName || t.title} Mastery`,
      description: `${t.mastery}% algorithmic competency with verified problem submissions.`,
      evidence: `${t.mastery}% mastery`,
    });
  }
  if (patternAccuracy >= 60) {
    strengthsList.push({
      title: "Pattern Recognition",
      description: "Accurately identifies core algorithmic templates from initial problem framing.",
      evidence: `${patternAccuracy}% accuracy`,
    });
  }

  // Derive focus areas / weaknesses
  const actionableFocusAreas: Array<{
    slug: string;
    href: string;
    mastery: number;
    name?: string;
    title?: string;
    gap?: string;
  }> = [];

  if (focusAreas.length > 0) {
    for (const fa of focusAreas.slice(0, 4)) {
      const topicDoc = topicProgress.find((t) => t.slug === fa.slug);
      actionableFocusAreas.push({
        slug: fa.slug,
        href: fa.href || `/learn/topics/${fa.slug}`,
        mastery: fa.mastery,
        name: fa.name || fa.title || fa.slug,
        gap: topicDoc?.explainable?.weakAreas?.[0]
          ? `Focus on: ${topicDoc.explainable.weakAreas[0]}`
          : "Needs problem reinforcement",
      });
    }
  } else {
    // Fallback from topicProgress where mastery > 0 and < 50
    const weakTopics = topicProgress.filter((t) => t.mastery > 0 && t.mastery < 50);
    for (const t of weakTopics.slice(0, 4)) {
      actionableFocusAreas.push({
        slug: t.slug,
        href: `/learn/topics/${t.slug}`,
        mastery: t.mastery,
        name: t.topicName || t.title,
        gap: t.explainable?.weakAreas?.[0]
          ? `Focus on: ${t.explainable.weakAreas[0]}`
          : "Needs problem practice",
      });
    }
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <PageHeader
        title="Progress Intelligence"
        description="Evidence-backed analysis of your algorithmic mastery, learning momentum, and interview readiness."
      />

      {isNewUser ? (
        <BuildEvidenceState recommendedAction={singleNextAction} />
      ) : (
        <>
          {/* PRIMARY SECTION: Interview Readiness & ONE Next Action */}
          <section className="grid gap-6 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-7">
              <ReadinessIndicator
                score={readinessScore}
                independentSolves={independentSolves}
                hintAssistedSolves={hintAssistedSolves}
                patternAccuracy={patternAccuracy}
                topicsMastered={topicsMastered}
                isCelebration={isCelebration}
              />
            </div>
            <div className="lg:col-span-5">
              <RecommendationCard action={singleNextAction} />
            </div>
          </section>

          {/* SECONDARY SECTION: Radar Chart & 7-Day Trend */}
          <section className="grid gap-6 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-7">
              <RadarChart metrics={radarMetrics} />
            </div>
            <div className="lg:col-span-5">
              <ProgressTrend7Day weeklyActivity={weeklyActivity} />
            </div>
          </section>

          {/* SECONDARY SECTION: Strengths & Focus Areas */}
          <section className="grid gap-6 md:grid-cols-2 items-stretch">
            <StrengthsSection strengths={strengthsList} />
            <FocusAreasSection focusTopics={actionableFocusAreas} />
          </section>

          {/* SECONDARY SECTION: Recent Evidence */}
          <section>
            <RecentEvidenceSection evidence={recentEvidence} />
          </section>

          {/* SUPPORTING SECTION: Detailed Topic Mastery Accordion */}
          <section className="pt-4 border-t border-white/[0.08]">
            <TopicMasteryAccordion topicProgress={topicProgress} />
          </section>
        </>
      )}
    </div>
  );
}

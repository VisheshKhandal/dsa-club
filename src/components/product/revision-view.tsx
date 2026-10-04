"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Code,
  History,
  Layers,
  RotateCcw,
  Zap,
} from "lucide-react";
import { Surface, PageHeader } from "./ui";

/* ── Types & Interfaces ────────────────────────────────── */

export interface DueRevisionItem {
  id: string;
  entityType: string;
  itemType?: string;
  conceptName: string;
  href: string;
  sourceHref?: string;
  detail: string;
  estimatedMinutes: number;
  dueAt: string;
  priority: number;
  state: string;
}

export interface NextScheduledRevision {
  id?: string;
  entityType: string;
  conceptName: string;
  dueAt: string;
  estimatedMinutes: number;
}

export interface HistoryEntry {
  id: string;
  queueId: string;
  entityType: string;
  title: string;
  reviewedAt: string;
  grade: number;
  confidence: number;
  responseSeconds: number;
  nextIntervalDays: number;
  wasOverdue?: boolean;
}

export interface RevisionSnapshotData {
  dueRevisions: DueRevisionItem[];
  totalRevisionMinutes?: number;
  counts?: {
    completedReviews?: number;
    dueRevisions?: number;
    completedTopics?: number;
    completedMissions?: number;
  };
  nextScheduledRevision?: NextScheduledRevision | null;
  stats?: {
    revisionRetentionScore?: number;
    totalFocusedMinutes?: number;
  };
}

/* ── Helpers & Invariants (Exported for Testing) ────────── */

export function formatPriorityBadge(priority: number, dueAt?: string) {
  const isOverdue = dueAt ? new Date(dueAt).getTime() < Date.now() - 86400000 : false;

  if (priority >= 30 || isOverdue) {
    return {
      label: isOverdue ? "Overdue" : "High Priority",
      color: "text-amber-300",
      bg: "bg-amber-500/10 border-amber-500/25",
    };
  }
  if (priority >= 15) {
    return {
      label: "Medium Priority",
      color: "text-purple-300",
      bg: "bg-purple-500/10 border-purple-500/25",
    };
  }
  return {
    label: "Normal Priority",
    color: "text-[var(--text-secondary,#A8B4B0)]",
    bg: "bg-[var(--bg-app,#0B0F14)] border-[var(--border-subtle,#24313B)]",
  };
}

export function getTypeCardDetails(entityType: string) {
  const type = (entityType || "").toLowerCase();
  switch (type) {
    case "problem":
      return {
        tag: "Problem",
        flowSubtitle: "Recall approach → Pattern check → Solve one similar",
        icon: Code,
        tagColor: "text-cyan-300 bg-cyan-500/10 border-cyan-500/25",
        hoverBorder: "group-hover:border-cyan-500/30",
        accentGradient: "from-cyan-500/10 to-blue-500/5",
      };
    case "mission":
      return {
        tag: "Mission",
        flowSubtitle: "Concept recall → Key questions → Reflection",
        icon: BookOpen,
        tagColor: "text-purple-300 bg-purple-500/10 border-purple-500/25",
        hoverBorder: "group-hover:border-purple-500/30",
        accentGradient: "from-purple-500/10 to-fuchsia-500/5",
      };
    case "pattern":
      return {
        tag: "Pattern",
        flowSubtitle: "Signal keywords → Recognition check → Tradeoffs",
        icon: Layers,
        tagColor: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
        hoverBorder: "group-hover:border-emerald-500/30",
        accentGradient: "from-emerald-500/10 to-teal-500/5",
      };
    case "topic":
    default:
      return {
        tag: "Topic",
        flowSubtitle: "Core mental model → Sub-skill check → Practice",
        icon: Brain,
        tagColor: "text-amber-300 bg-amber-500/10 border-amber-500/25",
        hoverBorder: "group-hover:border-amber-500/30",
        accentGradient: "from-amber-500/10 to-orange-500/5",
      };
  }
}

export function formatRelativeDue(dueAtStr: string) {
  try {
    const due = new Date(dueAtStr);
    if (isNaN(due.getTime())) return "Upcoming";
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "Due today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === 2) return "In 2 days";
    return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Upcoming";
  }
}

export function buildContinuousSessionUrl(dueRevisions: DueRevisionItem[]) {
  if (!dueRevisions || dueRevisions.length === 0) return "/revision";
  const firstId = dueRevisions[0].id;
  const allIds = dueRevisions.map((r) => r.id).join(",");
  return `/revision/session/${firstId}?queue=${allIds}`;
}

export function getGradeLabel(grade: number) {
  if (grade >= 5) return { label: "Easy", color: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/25" };
  if (grade >= 4) return { label: "Good", color: "text-cyan-300", bg: "bg-cyan-500/10 border-cyan-500/25" };
  if (grade >= 3) return { label: "Hard", color: "text-amber-300", bg: "bg-amber-500/10 border-amber-500/25" };
  return { label: "Again", color: "text-rose-300", bg: "bg-rose-500/10 border-rose-500/25" };
}

/* ── 1. Queue-First Revision Hero ───────────────────────── */

export function RevisionHero({
  dueRevisions,
  totalEstimatedMinutes,
}: {
  dueRevisions: DueRevisionItem[];
  totalEstimatedMinutes: number;
}) {
  const continuousSessionHref = buildContinuousSessionUrl(dueRevisions);
  const dueCount = dueRevisions.length;
  const timeDisplay = totalEstimatedMinutes > 0 ? totalEstimatedMinutes : dueCount * 5;

  return (
    <div className="rounded-2xl border border-[var(--border-strong,#33424D)] bg-[var(--bg-surface-raised,#17212B)] p-6 sm:p-8 shadow-sm">
      <div className="max-w-xl space-y-4">
        {/* Metric Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--accent-lime,#B7F36B)]/10 border border-[var(--accent-lime,#B7F36B)]/25 text-[var(--accent-lime,#B7F36B)]">
          <Zap className="w-3.5 h-3.5" />
          <span>
            {dueCount} {dueCount === 1 ? "item due" : "items due"} · ~{timeDisplay} minutes estimated
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary,#F3F6F4)] tracking-tight leading-tight">
          Start today&apos;s spaced repetition
        </h2>

        <p className="text-xs sm:text-sm text-[var(--text-secondary,#A8B4B0)] leading-relaxed">
          One continuous session covering your due algorithmic patterns and problem formulations before memory decay sets in.
        </p>

        {/* Primary CTA */}
        <div className="pt-2">
          <Link
            href={continuousSessionHref}
            className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-[var(--accent-lime,#B7F36B)] hover:bg-[var(--accent-lime-dark,#6B9B36)] text-[#0B0F14] text-sm font-bold shadow-sm transition-all transform active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,#D8FF9D)]"
          >
            Start Revision Session (~{timeDisplay} min) <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── 2. Differentiated Revision Card ────────────────────── */

export function RevisionCard({ item }: { item: DueRevisionItem }) {
  const typeDetails = getTypeCardDetails(item.entityType);
  const priorityBadge = formatPriorityBadge(item.priority, item.dueAt);
  const Icon = typeDetails.icon;

  return (
    <div className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,#D8FF9D)] rounded-xl">
      <div className="p-4 sm:p-5 rounded-xl border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface,#121922)] hover:border-[var(--border-strong,#33424D)] hover:bg-[var(--bg-surface-raised,#17212B)] transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            {/* Type Icon Badge */}
            <div className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${typeDetails.tagColor}`}>
              <Icon className="w-4 h-4" />
            </div>

            {/* Content Details */}
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${typeDetails.tagColor}`}>
                  {typeDetails.tag}
                </span>
                {item.detail && (
                  <span className="text-[11px] text-[var(--text-muted,#71807C)] font-medium">
                    · {item.detail}
                  </span>
                )}
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${priorityBadge.bg} ${priorityBadge.color}`}>
                  {priorityBadge.label}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted,#71807C)]">
                  <Clock className="w-3 h-3" />
                  ~{item.estimatedMinutes || 5} min
                </span>
              </div>

              <h3 className="text-base font-bold text-[var(--text-primary,#F3F6F4)] group-hover:text-[var(--accent-lime,#B7F36B)] transition-colors truncate">
                {item.conceptName}
              </h3>

              <p className="text-xs text-[var(--text-secondary,#A8B4B0)] leading-relaxed">
                {typeDetails.flowSubtitle}
              </p>
            </div>
          </div>

          {/* Direct Individual Item CTA */}
          <div className="shrink-0 flex items-center justify-end">
            <Link
              href={`/revision/session/${item.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--bg-surface-raised,#17212B)] hover:bg-[var(--accent-lime,#B7F36B)] hover:text-[#0B0F14] text-[var(--text-primary,#F3F6F4)] text-xs font-bold border border-[var(--border-subtle,#24313B)] hover:border-transparent transition-all"
            >
              Review item <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 3. Actionable Empty State ───────────────────────────── */

export function RevisionEmptyState({
  nextScheduled,
  onViewHistory,
}: {
  nextScheduled?: NextScheduledRevision | null;
  onViewHistory: () => void;
}) {
  return (
    <div className="p-8 sm:p-10 rounded-2xl border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface,#121922)] text-center relative overflow-hidden">
      <div className="max-w-md mx-auto space-y-4">
        {/* Positive Icon Indicator */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-7 h-7" />
        </div>

        <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary,#F3F6F4)] tracking-tight">
          No reviews are due today
        </h3>

        <p className="text-xs sm:text-sm text-[var(--text-secondary,#A8B4B0)] leading-relaxed">
          Your next review appears after you complete a learning step or problem solve. Daily consistency prevents forgetting curves and builds long-term algorithmic intuition.
        </p>

        {/* Next Scheduled Revision Preview */}
        {nextScheduled && (
          <div className="mt-6 p-4 rounded-xl bg-[var(--bg-surface-raised,#17212B)] border border-[var(--border-subtle,#24313B)] text-left flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-lime,#B7F36B)]">
                Next scheduled review
              </span>
              <p className="text-sm font-bold text-[var(--text-primary,#F3F6F4)] truncate mt-0.5">
                {nextScheduled.conceptName}
              </p>
              <p className="text-xs text-[var(--text-secondary,#A8B4B0)] mt-0.5">
                {formatRelativeDue(nextScheduled.dueAt)} · ~{nextScheduled.estimatedMinutes || 5} min
              </p>
            </div>
            <div className="p-2 rounded-lg bg-[var(--accent-lime,#B7F36B)]/10 text-[var(--accent-lime,#B7F36B)] shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/practice"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--accent-lime,#B7F36B)] hover:bg-[var(--accent-lime-dark,#6B9B36)] text-[#0B0F14] text-xs font-bold transition-all shadow-sm"
          >
            Practice New Problems <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/learn"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--bg-surface-raised,#17212B)] hover:bg-[var(--bg-surface-hover,#1B2732)] text-[var(--text-primary,#F3F6F4)] text-xs font-semibold border border-[var(--border-subtle,#24313B)] transition-colors"
          >
            Continue Learning Path
          </Link>
          <button
            type="button"
            onClick={onViewHistory}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[var(--text-muted,#71807C)] hover:text-[var(--text-primary,#F3F6F4)] text-xs font-semibold transition-colors"
          >
            <History className="w-3.5 h-3.5" /> View Log
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 4. History Tab ─────────────────────────────────────── */

export function RevisionHistoryList({
  history,
  loading,
  totalCount,
}: {
  history: HistoryEntry[] | null;
  loading: boolean;
  totalCount: number;
}) {
  const displayCount = totalCount > 0 ? totalCount : history?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary,#F3F6F4)] flex items-center gap-2">
            <History className="w-4 h-4 text-[var(--accent-lime,#B7F36B)]" />
            <span>{displayCount} completed reviews</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary,#A8B4B0)] mt-0.5 leading-relaxed">
            Spaced repetition logs verifying retention quality, recall grades, and updated intervals.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-[var(--text-muted,#71807C)] space-y-2">
          <RotateCcw className="w-5 h-5 mx-auto animate-spin opacity-50 text-[var(--accent-lime,#B7F36B)]" />
          <p>Loading completed review history…</p>
        </div>
      ) : history && history.length > 0 ? (
        <div className="space-y-2.5">
          {history.map((h) => {
            const gradeInfo = getGradeLabel(h.grade);
            const dateStr = new Date(h.reviewedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });

            return (
              <div
                key={h.id}
                className="p-4 rounded-xl border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface,#121922)] hover:border-[var(--border-strong,#33424D)] transition-colors flex items-center justify-between gap-4"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-[var(--text-primary,#F3F6F4)] truncate">{h.title}</h4>
                    <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-[var(--bg-app,#0B0F14)] text-[var(--text-muted,#71807C)] border border-[var(--border-subtle,#24313B)]">
                      {h.entityType}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted,#71807C)]">
                    Reviewed {dateStr}
                    {h.wasOverdue && <span className="ml-1 text-amber-400 font-medium">· overdue</span>}
                  </p>
                </div>

                <div className="shrink-0 text-right space-y-0.5">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${gradeInfo.bg} ${gradeInfo.color}`}>
                    {gradeInfo.label}
                  </span>
                  <p className="text-[11px] font-medium text-emerald-400 font-mono">
                    +{h.nextIntervalDays}d interval
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center text-xs text-[var(--text-muted,#71807C)] space-y-2">
          <Clock className="w-5 h-5 mx-auto opacity-40" />
          <p>No revision history recorded yet. Complete your first session to build retention logs.</p>
        </div>
      )}
    </div>
  );
}

/* ── Main Revision View Component ───────────────────────── */

export function RevisionView({ data }: { data: RevisionSnapshotData }) {
  const {
    dueRevisions = [],
    totalRevisionMinutes = 0,
    counts,
    nextScheduledRevision,
  } = data;

  const [tab, setTab] = useState<"queue" | "history">("queue");
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const completedReviewsCount = Number(counts?.completedReviews ?? 0);

  const loadHistory = () => {
    if (history !== null) return;
    setHistoryLoading(true);
    fetch("/api/v1/revision/history")
      .then((r) => r.json())
      .then((items) => setHistory(Array.isArray(items) ? items : []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  };

  // Sort due revisions by priority descending
  const sortedDueRevisions = [...dueRevisions].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page Header */}
      <PageHeader
        eyebrow="Spaced Repetition"
        title="Review Queue"
        description="Actionable active recall sessions to reinforce algorithmic patterns and prevent memory decay."
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface,#121922)] p-1">
        <button
          type="button"
          onClick={() => setTab("queue")}
          className={`flex-1 rounded-lg py-2.5 text-xs sm:text-sm font-semibold transition ${
            tab === "queue"
              ? "bg-[var(--bg-surface-raised,#17212B)] text-[var(--text-primary,#F3F6F4)] border border-[var(--border-strong,#33424D)] shadow-xs"
              : "text-[var(--text-secondary,#A8B4B0)] hover:text-[var(--text-primary,#F3F6F4)]"
          }`}
        >
          Due Queue ({dueRevisions.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("history");
            loadHistory();
          }}
          className={`flex-1 rounded-lg py-2.5 text-xs sm:text-sm font-semibold transition ${
            tab === "history"
              ? "bg-[var(--bg-surface-raised,#17212B)] text-[var(--text-primary,#F3F6F4)] border border-[var(--border-strong,#33424D)] shadow-xs"
              : "text-[var(--text-secondary,#A8B4B0)] hover:text-[var(--text-primary,#F3F6F4)]"
          }`}
        >
          History ({completedReviewsCount})
        </button>
      </div>

      {/* Tab 1: Queue */}
      {tab === "queue" && (
        <div className="space-y-8">
          {sortedDueRevisions.length > 0 ? (
            <>
              {/* Revision Hero */}
              <RevisionHero
                dueRevisions={sortedDueRevisions}
                totalEstimatedMinutes={totalRevisionMinutes}
              />

              {/* Differentiated Queue List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted,#71807C)]">
                    Due Items ({sortedDueRevisions.length})
                  </h3>
                  <span className="text-xs text-[var(--text-muted,#71807C)]">
                    Total queue: ~{totalRevisionMinutes || sortedDueRevisions.length * 5} min
                  </span>
                </div>

                <div className="space-y-3">
                  {sortedDueRevisions.map((item) => (
                    <RevisionCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <RevisionEmptyState
              nextScheduled={nextScheduledRevision}
              onViewHistory={() => {
                setTab("history");
                loadHistory();
              }}
            />
          )}
        </div>
      )}

      {/* Tab 2: History */}
      {tab === "history" && (
        <RevisionHistoryList
          history={history}
          loading={historyLoading}
          totalCount={completedReviewsCount}
        />
      )}
    </div>
  );
}

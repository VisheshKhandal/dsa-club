"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { RefreshCw, CheckCircle2, ArrowRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type {
  DashboardReviewQueue,
  DashboardReviewQueueItem,
} from "@/features/product/types/dashboard-dto.types";

export interface ReviewQueueItem {
  id: string;
  conceptName: string;
  itemType?: string;
  difficulty?: "easy" | "medium" | "hard";
  estimatedMinutes?: number;
  href?: string;
  priority?: number;
  reason?: string;
  detail?: string;
}

export interface ReviewQueuePreviewProps {
  reviewQueue?: DashboardReviewQueue | null;
  dueRevisions?: (DashboardReviewQueueItem | ReviewQueueItem)[];
  hasActivePlan?: boolean;
  activePlanTopic?: string;
  isPrimaryActionReview?: boolean;
  isTodayActionReview?: boolean;
  primaryActionId?: string;
  primaryActionTitle?: string;
  className?: string;
}

export function ReviewQueuePreview({
  reviewQueue,
  dueRevisions = [],
  hasActivePlan = false,
  activePlanTopic = "Current topic",
  isPrimaryActionReview,
  isTodayActionReview,
  primaryActionId,
  primaryActionTitle,
  className,
}: ReviewQueuePreviewProps) {
  // Authoritative review queue source from typed DashboardDTO
  const dueCount = reviewQueue ? reviewQueue.dueCount : dueRevisions.length;
  const totalEstimatedMinutes = reviewQueue
    ? reviewQueue.estimatedTotalMinutes
    : dueRevisions.reduce((sum, item) => sum + (item.estimatedMinutes || 7), 0);
  const items = reviewQueue ? reviewQueue.items : dueRevisions;

  // Suppress second Start Review CTA if primary action is already a due review
  const isPrimaryReview = Boolean(isPrimaryActionReview ?? isTodayActionReview);

  // When primary action is a review, filter it out from the queue preview so it is not repeated
  const additionalItems = React.useMemo(() => {
    if (!isPrimaryReview) return items;
    if (primaryActionId) {
      const filtered = items.filter(
        (item) => String(item.id) !== String(primaryActionId)
      );
      if (filtered.length !== items.length) return filtered;
    }
    if (primaryActionTitle) {
      const filtered = items.filter(
        (item) =>
          item.conceptName.toLowerCase() !== primaryActionTitle.toLowerCase() &&
          !primaryActionTitle.toLowerCase().includes(item.conceptName.toLowerCase())
      );
      if (filtered.length !== items.length) return filtered;
    }
    return items.slice(1);
  }, [items, isPrimaryReview, primaryActionId, primaryActionTitle]);

  const visibleItems = additionalItems.slice(0, 2);

  // FULL-CARD EMPTY STATE (Matches visual weight of adjacent GoalCheckpointProof card)
  if (dueCount === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-5 sm:p-6 flex flex-col",
          className
        )}
      >
        {/* Header — matches the active state header style */}
        <div className="flex items-center justify-between pb-3 border-b border-(--border-subtle)/60">
          <div className="flex items-center gap-2">
            <div className="grid size-6 place-items-center rounded-md bg-(--accent-lime)/10 text-(--accent-lime)">
              <RefreshCw className="size-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-(--text-primary)">
                Spaced Retention
              </h3>
              <p className="text-[11px] text-(--text-muted)">
                Review queue &middot; Spaced repetition tracking
              </p>
            </div>
          </div>
        </div>

        {/* Centered empty state content */}
        <div className="flex-1 flex flex-col items-center justify-center py-8 gap-3">
          <div className="grid size-12 place-items-center rounded-xl bg-(--accent-lime)/8 text-(--accent-lime)">
            <CheckCircle2 className="size-6" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-(--text-primary)">
              Review queue clear
            </p>
            <p className="text-xs text-(--text-muted) max-w-[240px]">
              No spaced retention items due today. Items will appear here as your study intervals mature.
            </p>
          </div>
        </div>

        {/* Footer action */}
        <div className="pt-3 border-t border-(--border-subtle)/60 flex items-center justify-between">
          <Link
            href="/review"
            className="text-xs font-medium text-(--accent-lime) hover:underline transition-colors inline-flex items-center gap-1"
          >
            <span>Open review queue</span>
            <ArrowRight className="size-3" />
          </Link>
          <Link
            href="/review"
            className="text-xs font-medium text-(--text-muted) hover:text-(--text-primary) transition-colors inline-flex items-center gap-1"
          >
            <span>Review history</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    );
  }

  // ACTIVE DUE ITEMS PANEL
  return (
    <div
      className={cn(
        "rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-5 sm:p-6 space-y-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-(--border-subtle)/60">
        <div className="flex items-center gap-2">
          <div className="grid size-6 place-items-center rounded-md bg-(--accent-amber)/10 text-(--accent-amber)">
            <RefreshCw className="size-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-(--text-primary)">
              Review Attention
            </h3>
            <p className="text-[11px] text-(--text-muted)">
              {isPrimaryReview
                ? "Retention checkpoint included in today's main practice step"
                : "Spaced retrieval practice due for retention"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-(--accent-amber)/10 border border-(--accent-amber)/30 px-2.5 py-0.5 text-xs font-semibold text-(--accent-amber) font-tabular">
            {dueCount} due (~{totalEstimatedMinutes}m)
          </span>
        </div>
      </div>

      {/* Due Items List */}
      <div className="space-y-2">
        {visibleItems.length > 0 ? (
          visibleItems.map((item) => {
            const minutes = item.estimatedMinutes || 7;
            const detailText = item.detail || (item as any).reason || "Retention interval elapsed";
            const href = item.href && item.href !== "/review" ? item.href : "/revision";

            return (
              <Link
                key={item.id}
                href={href}
                className="flex items-center justify-between gap-3 rounded-lg border border-(--border-subtle) bg-(--bg-surface-raised) p-3 text-xs hover:border-(--border-strong) transition-colors group cursor-pointer"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="font-semibold text-(--text-primary) truncate group-hover:text-(--accent-lime) transition-colors">
                    {item.conceptName}
                  </p>
                  <p className="text-[11px] text-(--text-muted) truncate">
                    {detailText}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-tabular text-(--text-muted) flex items-center gap-1">
                    <Clock className="size-3" />
                    ~{minutes}m
                  </span>
                  <span className="text-[11px] text-(--text-muted) group-hover:text-(--text-primary) transition-colors inline-flex items-center">
                    Review <ArrowRight className="size-3 ml-0.5" />
                  </span>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-lg border border-(--border-subtle) bg-(--bg-surface-raised)/40 p-3 text-xs text-(--text-secondary)">
            <p className="text-[11px] text-(--text-muted)">
              The active due item is featured as your primary action in the hero above. No additional items are pending.
            </p>
          </div>
        )}
      </div>

      {/* Action Row */}
      <div className="pt-1 flex items-center justify-between">
        {!isPrimaryReview ? (
          <Link
            href="/review"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-(--accent-amber) px-4 py-2 text-xs font-semibold text-black hover:bg-amber-400 transition-colors cursor-pointer shadow-xs"
          >
            <span>Start review</span>
            <ArrowRight className="size-3.5" />
          </Link>
        ) : (
          <span className="text-xs text-(--text-muted) italic">
            Included in primary action
          </span>
        )}

        <Link
          href="/review"
          className="text-xs font-medium text-(--text-secondary) hover:text-(--text-primary) transition-colors inline-flex items-center gap-1 cursor-pointer"
        >
          <span>See all {dueCount} items</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

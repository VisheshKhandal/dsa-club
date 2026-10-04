"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface DueRevisionItem {
  id: string;
  conceptName: string;
  itemType?: string;
  difficulty?: "easy" | "medium" | "hard";
  estimatedMinutes?: number;
  href?: string;
  priority?: number;
}

interface ReviewDueSectionProps {
  dueRevisions?: DueRevisionItem[];
  hasActivePlan?: boolean;
}

export function ReviewDueSection({ dueRevisions = [], hasActivePlan = false }: ReviewDueSectionProps) {
  // Show only 2-3 due items on Home dashboard as per Blueprint Section 11 & 16
  const visibleItems = dueRevisions.slice(0, 3);
  const hasItems = visibleItems.length > 0;

  return (
    <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-5 sm:p-6 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <RefreshCw className="size-4 text-(--accent-amber)" />
            <h3 className="text-section text-(--text-primary)">Review support</h3>
          </div>
          {hasItems && (
            <span className="rounded-full bg-(--accent-amber)/10 border border-(--accent-amber)/30 px-2.5 py-0.5 text-caption font-semibold text-(--accent-amber)">
              {hasActivePlan ? `${dueRevisions.length} due · Spaced Retention` : `${dueRevisions.length} due`}
            </span>
          )}
        </div>

        {/* Due items list */}
        {hasItems ? (
          <div className="mt-4 space-y-2.5">
            {visibleItems.map((item) => {
              const difficultyVariant = (item.difficulty || "medium") as "easy" | "medium" | "hard";
              const minutes = item.estimatedMinutes || 7;

              return (
                <Link
                  key={item.id}
                  href={item.href || "/revision"}
                  className="group flex flex-col gap-1 rounded-lg border border-(--border-subtle) bg-(--bg-surface-raised) p-3 transition-colors hover:border-(--border-strong) hover:bg-(--bg-surface-hover)"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-card-title text-(--text-primary) group-hover:text-(--accent-lime) transition-colors truncate">
                      {item.conceptName}
                    </p>
                    <Badge variant={difficultyVariant} className="shrink-0 text-[10px] py-0 px-1.5">
                      {item.difficulty || "Medium"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-caption text-(--text-muted) pt-1">
                    <span className="font-tabular">~{minutes} min</span>
                    <span className="text-(--accent-amber) font-medium text-xs">
                      {hasActivePlan ? "Retention support" : "Review today"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* Contextual empty state required by Section 6 & 11 */
          <div className="mt-6 rounded-lg bg-(--bg-surface-raised) border border-(--border-subtle) p-4 flex items-start gap-3">
            <CheckCircle2 className="size-5 text-(--accent-lime) shrink-0 mt-0.5" />
            <div>
              <p className="text-card-title text-(--text-primary)">Queue clear</p>
              <p className="mt-1 text-body text-(--text-muted) leading-normal">
                No reviews are due today. Your next review appears after you complete a learning step.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 pt-2 flex items-center justify-between">
        <Link
          href="/revision"
          className="text-caption font-semibold text-(--accent-amber) hover:underline inline-flex items-center gap-1"
        >
          <span>{hasActivePlan ? "See spaced review queue" : "See the full review queue"}</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

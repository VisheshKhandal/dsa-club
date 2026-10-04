"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronDown,
  GitBranch,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { DifficultyBadge, ProgressTrack } from "@/components/product/ui";
import { cn } from "@/lib/utils";
import type { TopicDetailData } from "@/components/product/topic-detail-view";

interface PatternRecognitionSectionProps {
  patterns: TopicDetailData["patterns"];
  masteredCount: number;
  totalCount: number;
}

export function PatternRecognitionSection({
  patterns,
  masteredCount,
  totalCount,
}: PatternRecognitionSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const INITIAL_VISIBLE_COUNT = 4;

  if (!patterns.length) {
    return (
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) p-5 text-center space-y-2">
        <GitBranch size={18} className="mx-auto text-(--color-text-muted)" />
        <h3 className="text-sm font-semibold text-(--color-text-primary)">No Patterns Linked</h3>
        <p className="text-xs text-(--color-text-muted)">
          Patterns for this topic are being indexed.
        </p>
      </div>
    );
  }

  // Priority sort: in_progress first, then not_started, completed last
  const sortedPatterns = [...patterns].sort((a, b) => {
    const order = { in_progress: 0, not_started: 1, completed: 2 };
    return (order[a.status as keyof typeof order] ?? 1) - (order[b.status as keyof typeof order] ?? 1);
  });

  const visiblePatterns = sortedPatterns.slice(0, INITIAL_VISIBLE_COUNT);
  const remainingPatterns = sortedPatterns.slice(INITIAL_VISIBLE_COUNT);

  return (
    <section
      id="patterns-section"
      aria-labelledby="pattern-recognition-heading"
      className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) p-5 space-y-4 shadow-2xs scroll-mt-20"
    >
      {/* ── Section Title ── */}
      <div className="flex items-center justify-between gap-3 border-b border-(--color-border) pb-2.5">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-(--color-purple)" />
          <h2
            id="pattern-recognition-heading"
            className="text-xs font-bold uppercase tracking-wider text-(--color-text-muted)"
          >
            Pattern Recognition
          </h2>
        </div>

        <div className="text-xs font-semibold tabular-nums text-(--color-text-secondary)">
          <span>{masteredCount}</span>
          <span className="text-(--color-text-muted)">/</span>
          <span>{totalCount} mastered</span>
        </div>
      </div>

      {/* ── Compact Pattern Rows with Dividers (Lightweight rows, NOT card tiles) ── */}
      <div className="divide-y divide-(--color-border)">
        {visiblePatterns.map((pattern) => {
          const isCompleted = pattern.status === "completed";
          const isInProgress = pattern.status === "in_progress";

          return (
            <Link
              key={pattern.id}
              href={`/patterns/${pattern.slug}`}
              className="group block py-2.5 px-1 transition-colors duration-150 hover:bg-(--color-surface-2)/50 rounded-xs space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-xs font-semibold truncate transition-colors",
                    isCompleted
                      ? "text-emerald-400"
                      : isInProgress
                      ? "text-cyan-300"
                      : "text-(--color-text-primary) group-hover:text-(--color-purple)"
                  )}
                >
                  {pattern.name}
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  <DifficultyBadge difficulty={pattern.difficulty} />
                  <ArrowUpRight
                    size={12}
                    className="text-(--color-text-muted) opacity-0 group-hover:opacity-100 group-hover:text-(--color-purple) transition-opacity"
                  />
                </div>
              </div>

              {/* Progress track row */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <ProgressTrack
                    value={pattern.progress}
                    color={isCompleted ? "emerald" : isInProgress ? "cyan" : "purple"}
                    height="thin"
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold tabular-nums shrink-0",
                    isCompleted ? "text-emerald-400" : isInProgress ? "text-cyan-400" : "text-(--color-text-muted)"
                  )}
                >
                  {pattern.progress}%
                </span>
              </div>
            </Link>
          );
        })}

        {/* Expandable remaining patterns */}
        {remainingPatterns.length > 0 && (
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden divide-y divide-(--color-border)"
              >
                {remainingPatterns.map((pattern) => {
                  const isCompleted = pattern.status === "completed";
                  const isInProgress = pattern.status === "in_progress";

                  return (
                    <Link
                      key={pattern.id}
                      href={`/patterns/${pattern.slug}`}
                      className="group block py-2.5 px-1 transition-colors duration-150 hover:bg-(--color-surface-2)/50 rounded-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-xs font-semibold truncate transition-colors",
                            isCompleted
                              ? "text-emerald-400"
                              : isInProgress
                              ? "text-cyan-300"
                              : "text-(--color-text-primary) group-hover:text-(--color-purple)"
                          )}
                        >
                          {pattern.name}
                        </span>

                        <div className="flex items-center gap-2 shrink-0">
                          <DifficultyBadge difficulty={pattern.difficulty} />
                          <ArrowUpRight
                            size={12}
                            className="text-(--color-text-muted) opacity-0 group-hover:opacity-100 group-hover:text-(--color-purple) transition-opacity"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <ProgressTrack
                            value={pattern.progress}
                            color={isCompleted ? "emerald" : isInProgress ? "cyan" : "purple"}
                            height="thin"
                          />
                        </div>
                        <span
                          className={cn(
                            "text-[10px] font-semibold tabular-nums shrink-0",
                            isCompleted ? "text-emerald-400" : isInProgress ? "text-cyan-400" : "text-(--color-text-muted)"
                          )}
                        >
                          {pattern.progress}%
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Bottom actions: Toggle or View all link */}
      <div className="flex items-center justify-between pt-1 text-xs border-t border-(--color-border)">
        {remainingPatterns.length > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 font-semibold text-(--color-text-secondary) hover:text-(--color-purple) transition-colors"
          >
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.18 }}
            >
              <ChevronDown size={14} />
            </motion.span>
            <span>{expanded ? "Show fewer" : `Show ${remainingPatterns.length} more →`}</span>
          </button>
        ) : (
          <div />
        )}

        <Link
          href="/patterns"
          className="inline-flex items-center gap-1 text-xs font-semibold text-(--color-purple) hover:underline"
        >
          <span>View all</span>
          <ArrowUpRight size={12} />
        </Link>
      </div>
    </section>
  );
}

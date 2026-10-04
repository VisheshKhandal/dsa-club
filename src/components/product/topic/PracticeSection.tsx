"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Target,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { DifficultyBadge } from "@/components/product/ui";
import { cn } from "@/lib/utils";
import type { TopicDetailData } from "@/components/product/topic-detail-view";

interface PracticeSectionProps {
  problems: TopicDetailData["problems"];
  solvedCount: number;
  totalCount: number;
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PracticeSection({
  problems,
  solvedCount,
  totalCount,
}: PracticeSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const INITIAL_VISIBLE_COUNT = 5;

  if (!problems.length) {
    return (
      <div className="py-8 border-b border-(--color-border) space-y-2 text-center">
        <Target size={20} className="mx-auto text-(--color-text-muted)" />
        <h3 className="text-sm font-semibold text-(--color-text-primary)">No Practice Problems</h3>
        <p className="text-xs text-(--color-text-muted)">
          Problems for this topic are currently being curated.
        </p>
      </div>
    );
  }

  // Priority sort: unsolved first, started second, solved last
  const sortedProblems = [...problems].sort((a, b) => {
    const order = { not_started: 0, started: 1, solved: 2 };
    return (order[a.status as keyof typeof order] ?? 0) - (order[b.status as keyof typeof order] ?? 0);
  });

  const visibleProblems = sortedProblems.slice(0, INITIAL_VISIBLE_COUNT);
  const remainingProblems = sortedProblems.slice(INITIAL_VISIBLE_COUNT);

  return (
    <section
      id="practice-section"
      aria-labelledby="practice-section-heading"
      className="space-y-4 scroll-mt-20"
    >
      {/* ── Section Title ── */}
      <div className="flex items-center justify-between gap-3 border-b border-(--color-border) pb-2.5">
        <div className="flex items-center gap-2">
          <Target size={15} className="text-(--color-purple)" />
          <h2
            id="practice-section-heading"
            className="text-xs font-bold uppercase tracking-wider text-(--color-text-muted)"
          >
            Practice
          </h2>
        </div>

        <div className="text-xs font-semibold tabular-nums text-(--color-text-secondary)">
          <span>{solvedCount}</span>
          <span className="text-(--color-text-muted)">/</span>
          <span>{totalCount} solved</span>
        </div>
      </div>

      {/* ── Spacious Problem Rows with Dividers (Clean list, NOT card boxes) ── */}
      <div className="divide-y divide-(--color-border) border-b border-(--color-border)">
        {visibleProblems.map((problem) => {
          const isSolved = problem.status === "solved";
          const isStarted = problem.status === "started";

          return (
            <Link
              key={problem.id}
              href={`/practice/problems/${problem.slug}`}
              className={cn(
                "group flex items-center justify-between gap-4 py-3.5 px-2 transition-colors duration-150",
                "hover:bg-(--color-surface-1)/70",
                isSolved && "opacity-80 hover:opacity-100"
              )}
            >
              {/* Left: Status Icon & Title */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {isSolved ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                ) : isStarted ? (
                  <div className="size-4 rounded-full border-2 border-cyan-400 shrink-0 flex items-center justify-center">
                    <div className="size-1.5 rounded-full bg-cyan-400" />
                  </div>
                ) : (
                  <div className="size-4 rounded-full border border-(--color-border) shrink-0" />
                )}

                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-semibold truncate transition-colors",
                      isSolved
                        ? "text-(--color-text-secondary) group-hover:text-(--color-text-primary)"
                        : "text-(--color-text-primary) group-hover:text-(--color-purple)"
                    )}
                  >
                    {problem.title}
                  </p>
                  <p className="text-xs text-(--color-text-muted) truncate mt-0.5">
                    {problem.pattern}
                  </p>
                </div>
              </div>

              {/* Right: Difficulty, Status tag & Arrow affordance */}
              <div className="flex items-center gap-3 shrink-0">
                {problem.status !== "not_started" && (
                  <span
                    className={cn(
                      "text-[11px] font-semibold hidden sm:inline-block",
                      isSolved ? "text-emerald-400" : "text-cyan-400"
                    )}
                  >
                    {statusLabel(problem.status)}
                  </span>
                )}

                <DifficultyBadge difficulty={problem.difficulty} />

                <ArrowUpRight
                  size={14}
                  className="text-(--color-text-muted) opacity-0 group-hover:opacity-100 group-hover:text-(--color-purple) transition-all duration-150"
                />
              </div>
            </Link>
          );
        })}

        {/* ── Progressive Disclosure for Remaining Problems ── */}
        {remainingProblems.length > 0 && (
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden divide-y divide-(--color-border)"
              >
                {remainingProblems.map((problem) => {
                  const isSolved = problem.status === "solved";
                  const isStarted = problem.status === "started";

                  return (
                    <Link
                      key={problem.id}
                      href={`/practice/problems/${problem.slug}`}
                      className={cn(
                        "group flex items-center justify-between gap-4 py-3.5 px-2 transition-colors duration-150",
                        "hover:bg-(--color-surface-1)/70",
                        isSolved && "opacity-80 hover:opacity-100"
                      )}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {isSolved ? (
                          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                        ) : isStarted ? (
                          <div className="size-4 rounded-full border-2 border-cyan-400 shrink-0 flex items-center justify-center">
                            <div className="size-1.5 rounded-full bg-cyan-400" />
                          </div>
                        ) : (
                          <div className="size-4 rounded-full border border-(--color-border) shrink-0" />
                        )}

                        <div className="min-w-0">
                          <p
                            className={cn(
                              "text-sm font-semibold truncate transition-colors",
                              isSolved
                                ? "text-(--color-text-secondary) group-hover:text-(--color-text-primary)"
                                : "text-(--color-text-primary) group-hover:text-(--color-purple)"
                            )}
                          >
                            {problem.title}
                          </p>
                          <p className="text-xs text-(--color-text-muted) truncate mt-0.5">
                            {problem.pattern}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {problem.status !== "not_started" && (
                          <span
                            className={cn(
                              "text-[11px] font-semibold hidden sm:inline-block",
                              isSolved ? "text-emerald-400" : "text-cyan-400"
                            )}
                          >
                            {statusLabel(problem.status)}
                          </span>
                        )}

                        <DifficultyBadge difficulty={problem.difficulty} />

                        <ArrowUpRight
                          size={14}
                          className="text-(--color-text-muted) opacity-0 group-hover:opacity-100 group-hover:text-(--color-purple) transition-all duration-150"
                        />
                      </div>
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Progressive Disclosure Toggle */}
      {remainingProblems.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--color-text-secondary) hover:text-(--color-purple) transition-colors py-1"
        >
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.18 }}
          >
            <ChevronDown size={14} />
          </motion.span>
          <span>
            {expanded
              ? "Show fewer problems"
              : `Show ${remainingProblems.length} more problem${remainingProblems.length !== 1 ? "s" : ""} →`}
          </span>
        </button>
      )}
    </section>
  );
}

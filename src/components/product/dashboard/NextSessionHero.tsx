"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  CheckCircle2,
  Play,
  Milestone,
  Check,
  Compass,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  DashboardActivePlan,
  DashboardPrimaryAction,
  PrimaryActionProvenance,
  PrimaryActionCtaState,
} from "@/features/product/types/dashboard-dto.types";

export interface PlanSpineNode {
  id: string;
  title: string;
  targetDay: number;
  status: "completed" | "current" | "upcoming";
  isCheckpoint?: boolean;
}

export interface NextSessionHeroProps {
  primaryAction?: DashboardPrimaryAction | null;
  activePlan?: DashboardActivePlan | null;
  focusAction?: any;
  activeMission?: any;
  progressMetrics?: any;
  streakDays?: number;
  bonusChallenge?: any;
  onActionClick?: () => void;
}

function getSignalDetails(
  provenance: PrimaryActionProvenance,
  ctaState?: PrimaryActionCtaState
) {
  if (ctaState === "day_complete") {
    return {
      label: "Daily goals completed",
      detail: "All scheduled tasks for today have been completed. Next day schedule unlocks tomorrow.",
    };
  }
  if (ctaState === "paused") {
    return {
      label: "Paused study plan",
      detail: "Your structured study plan is currently paused. Resume your schedule when ready.",
    };
  }

  switch (provenance) {
    case "in_progress_task":
      return {
        label: "In-progress task",
        detail: "Prioritized to maintain momentum on work already started today.",
      };
    case "in_flight_draft":
      return {
        label: "Unfinished problem draft",
        detail: "Prioritized to complete in-flight problem code before beginning new topics.",
      };
    case "active_session":
      return {
        label: "Active focus session",
        detail: "Prioritized because a timed practice session is currently running.",
      };
    case "required_plan_task":
      return {
        label: "Scheduled plan task",
        detail: "Core requirement for today's structured curriculum day.",
      };
    case "due_review":
      return {
        label: "Spaced retrieval review",
        detail: "Prioritized to prevent retention decay at your scheduled repetition interval.",
      };
    case "optional_plan_task":
      return {
        label: "Optional practice task",
        detail: "Reinforces today's topic after completing required milestones.",
      };
    case "self_paced_recommendation":
      return {
        label: "Targeted practice recommendation",
        detail: "Selected by the Evidence Loop from your real problem attempts and pattern performance.",
      };
    case "roadmap_continuity":
      return {
        label: "Curriculum roadmap mission",
        detail: "Advances your self-paced pedagogical progression along the curriculum roadmap.",
      };
    case "setup":
      return {
        label: "Learning path setup",
        detail: "No active plan or path selected. Choose a topic to begin structured daily practice.",
      };
    default: {
      const _exhaustive: never = provenance;
      return {
        label: "Recommended action",
        detail: "Selected based on your current learning progression and plan requirements.",
      };
    }
  }
}

export function NextSessionHero({
  primaryAction,
  activePlan,
  focusAction,
  activeMission,
  progressMetrics,
  streakDays,
  bonusChallenge,
  onActionClick,
}: NextSessionHeroProps) {
  const [feedbackGiven, setFeedbackGiven] = React.useState<string | null>(null);
  // Authoritative action from typed DashboardDTO, with fallback adapter for legacy consumers
  const action: DashboardPrimaryAction = useMemo(() => {
    if (primaryAction) return primaryAction;
    if (focusAction) {
      return {
        id: focusAction.id || "legacy-action",
        actionKey: focusAction.actionKey || "legacy-action",
        type: focusAction.type || "problem",
        title: focusAction.title || "Core Algorithmic Practice",
        href: focusAction.href || "/practice",
        topicName: focusAction.topicName || activePlan?.topicName || "DSA Fundamentals",
        topicSlug: focusAction.topicSlug || activePlan?.topicSlug || "dsa",
        isCrossTopic: Boolean(focusAction.isCrossTopic),
        relationshipLabel: focusAction.relationshipLabel || null,
        estimatedDurationMinutes: Number(focusAction.estimatedDurationMinutes ?? focusAction.estimatedMinutes ?? 25),
        isDurationEstimate: true,
        reason: focusAction.reason || focusAction.whyThisIsNext || "Targeted problem solving reinforces core invariants.",
        sourceProvenance: focusAction.sourceProvenance || "required_plan_task",
        afterCompletionOutcome: focusAction.afterCompletionOutcome || "Advances schedule and records verified mastery.",
        ctaLabel: focusAction.ctaLabel || "Start today's task",
        ctaState: focusAction.ctaState || "start",
      };
    }
    if (activePlan) {
      return {
        id: activePlan.id,
        actionKey: `plan-${activePlan.id}`,
        type: "problem",
        title: activePlan.dayTitle || "Daily Plan Session",
        href: "/practice",
        topicName: activePlan.topicName,
        topicSlug: activePlan.topicSlug,
        isCrossTopic: false,
        relationshipLabel: null,
        estimatedDurationMinutes: activePlan.targetDailyMinutes || 30,
        isDurationEstimate: true,
        reason: activePlan.dayFocus || "Advances scheduled curriculum.",
        sourceProvenance: "required_plan_task",
        afterCompletionOutcome: "Completes today's scheduled requirements.",
        ctaLabel: "Start today's task",
        ctaState: "start",
      };
    }
    return {
      id: "setup-path",
      actionKey: "setup-path",
      type: "setup",
      title: "Choose your next DSA topic",
      href: "/learn/paths",
      topicName: "Curriculum Selection",
      topicSlug: "curriculum",
      isCrossTopic: false,
      relationshipLabel: null,
      estimatedDurationMinutes: 15,
      isDurationEstimate: true,
      reason: "Calibrate your practice by selecting a focused topic path.",
      sourceProvenance: "setup",
      afterCompletionOutcome: "Initializes your daily practice schedule and checkpoints.",
      ctaLabel: "Choose a learning path",
      ctaState: "setup",
    };
  }, [primaryAction, focusAction, activePlan]);

  const planDay = activePlan?.currentDayIndex ?? progressMetrics?.currentDayIndex ?? 1;
  const totalDays = activePlan?.totalDays ?? progressMetrics?.totalDays ?? 18;
  const completedTasks = activePlan?.completedTasksCount ?? progressMetrics?.todayCompletedTasksCount ?? 0;
  const totalTasks = activePlan?.tasksCount ?? progressMetrics?.todayTasksCount ?? 0;

  // Primary CTA State configuration
  const ctaState = action.ctaState;
  const ctaLabel = action.ctaLabel;
  const rawCtaHref = action.href;
  const ctaHref = useMemo(() => {
    if (!rawCtaHref || ctaState === "day_complete" || ctaState === "setup") return rawCtaHref;
    if (
      action.sourceProvenance === "required_plan_task" ||
      action.sourceProvenance === "optional_plan_task" ||
      action.sourceProvenance === "in_progress_task"
    ) {
      const sep = rawCtaHref.includes("?") ? "&" : "?";
      let res = rawCtaHref.includes("from=plan") ? rawCtaHref : `${rawCtaHref}${sep}from=plan`;
      if (activePlan?.id && !res.includes("planId=")) {
        res += `&planId=${encodeURIComponent(activePlan.id)}`;
      }
      if (action.taskId && !res.includes("planTaskId=")) {
        res += `&planTaskId=${encodeURIComponent(action.taskId)}`;
      }
      return res;
    }
    return rawCtaHref;
  }, [rawCtaHref, ctaState, action.sourceProvenance, action.taskId, activePlan?.id]);

  const CtaIcon = useMemo(() => {
    if (ctaState === "day_complete") return CheckCircle2;
    if (ctaState === "paused") return Play;
    if (ctaState === "setup") return Compass;
    return ArrowRight;
  }, [ctaState]);

  const ctaVariantClass = useMemo(() => {
    if (ctaState === "day_complete") {
      return "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25";
    }
    if (ctaState === "paused") {
      return "bg-(--accent-amber) text-black hover:bg-amber-400";
    }
    return "bg-(--accent-lime) text-black hover:bg-(--accent-lime-hover) shadow-sm";
  }, [ctaState]);

  // Topic & cross-topic bridge metadata
  const topicName = action.topicName || activePlan?.topicName || "DSA Fundamentals";
  const isCrossTopic = action.isCrossTopic;
  const relationshipLabel = action.relationshipLabel;

  // Embedded Learning Spine: ONLY rendered when backed by real persisted blueprint stages
  const spineNodes = useMemo(() => {
    if (activePlan?.stages && Array.isArray(activePlan.stages) && activePlan.stages.length > 0) {
      return activePlan.stages;
    }
    return [];
  }, [activePlan?.stages]);

  const isDayComplete = ctaState === "day_complete" || Boolean(activePlan?.isDayComplete);

  return (
    <section
      aria-label="Today's practice focus"
      className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-5 sm:p-6 transition-colors"
    >
      <div className="flex flex-col gap-5">
        {/* Celebration Banner for Day Completion */}
        {isDayComplete && (
          <div className="rounded-xl border border-teal-500/40 bg-gradient-to-r from-teal-500/20 via-emerald-500/10 to-(--bg-surface-raised) p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shrink-0">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-teal-300">
                    🎉 Today&apos;s Daily Goal Achieved!
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    Day {planDay} Complete
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-0.5">
                  You completed all required tasks for today! Your {streakDays && streakDays > 0 ? `${streakDays}d streak is secured` : "learning streak is secured"}. Rest up, or solve the bonus challenge below.
                </p>
              </div>
            </div>
            <Link
              href="/plan"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-(--border-subtle) bg-(--bg-surface) text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary) transition-colors shrink-0"
            >
              <span>View Plan</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}

        {/* Meta Bar: Topic tag, cross-topic bridge, cycle position, estimated duration */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-(--accent-lime)/30 bg-(--accent-lime)/10 px-2.5 py-0.5 font-semibold text-(--accent-lime)">
              Today&apos;s Focus
            </span>

            <span className="font-medium text-(--text-secondary)">
              {topicName}
            </span>

            {/* Explicitly validated Curriculum Bridge */}
            {isCrossTopic && relationshipLabel && (
              <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-400">
                <span>Curriculum Bridge:</span>
                <strong className="font-semibold">{relationshipLabel}</strong>
              </span>
            )}

            {activePlan && (
              <>
                <span className="text-(--text-muted)">•</span>
                <span className="text-(--text-muted) font-tabular">
                  Day {planDay} of {totalDays}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 text-(--text-secondary)">
            <span className="inline-flex items-center gap-1 font-tabular">
              <Clock className="size-3.5 text-(--text-muted)" />
              <strong className="text-(--text-primary)">
                ~{isDayComplete && bonusChallenge ? bonusChallenge.estimatedMinutes : action.estimatedDurationMinutes}m
              </strong>
              <span className="text-[10px] text-(--text-muted) uppercase tracking-wider font-sans">est.</span>
            </span>
            <span className="text-(--border-subtle)">•</span>
            <span className="font-tabular">
              {totalTasks > 0
                ? `${completedTasks} of ${totalTasks} tasks today`
                : completedTasks > 0
                ? `${completedTasks} task${completedTasks > 1 ? "s" : ""} completed today ✓`
                : "Authoritative daily focus"}
            </span>
          </div>
        </div>

        {/* Primary Action Area: Task Title + Rationale + Main CTA */}
        {isDayComplete && bonusChallenge ? (
          /* Day Complete with Dedicated Bonus Challenge in Hero Focus */
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                  <Sparkles className="size-3.5" />
                  Bonus Challenge · Optional Practice
                </span>
                <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
                  {bonusChallenge.difficulty}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-(--text-primary)">
                {bonusChallenge.title}
              </h2>

              <div className="space-y-1 text-xs sm:text-sm text-(--text-secondary) leading-relaxed">
                <p>
                  <span className="font-semibold text-(--text-primary)">Why this is next: </span>
                  {bonusChallenge.reason || "You've finished your scheduled tasks for today! Great consistency! Practice this optional challenge to reinforce pattern recognition."}
                </p>
                <p className="text-[11px] sm:text-xs text-(--text-muted)">
                  <span className="font-medium text-(--text-secondary)">Outcome: </span>
                  Earns bonus XP and deepens algorithmic intuition without affecting your daily streak.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 pt-2 lg:pt-0">
              <Link
                href={bonusChallenge.href}
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-(--accent-lime) text-black hover:bg-(--accent-lime-hover) shadow-sm px-5 py-3 text-sm font-semibold transition-all duration-150 active:scale-[0.98]"
              >
                <span>Solve Bonus Challenge</span>
                <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>

              {activePlan && (
                <Link
                  href="/plan"
                  className="inline-flex items-center justify-center rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) px-3.5 py-3 text-xs font-medium text-(--text-secondary) transition-colors hover:border-(--border-strong) hover:text-(--text-primary)"
                >
                  View full plan
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-(--text-primary)">
                {action.title}
              </h2>

              <div className="space-y-1 text-xs sm:text-sm text-(--text-secondary) leading-relaxed">
                <p>
                  <span className="font-semibold text-(--text-primary)">Why this is next: </span>
                  {action.reason}
                </p>
                <p className="text-[11px] sm:text-xs text-(--text-muted)">
                  <span className="font-medium text-(--text-secondary)">Outcome: </span>
                  {action.afterCompletionOutcome}
                </p>
              </div>

              {/* Time Budget Alert & Shorter Alternative */}
              {action.timeBudgetExceeded && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                    <Clock className="size-3.5" />
                    <span>Time notice: {action.estimatedDurationMinutes}m estimate exceeds your {action.timeBudgetAvailableMinutes}m session budget</span>
                  </div>
                  {action.timeBudgetAlternative ? (
                    <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <p className="text-[11px] text-zinc-300">
                        Shorter alternative that fits: <strong className="text-white">{action.timeBudgetAlternative.title}</strong> ({action.timeBudgetAlternative.estimatedMinutes}m).
                      </p>
                      <Link
                        href={action.timeBudgetAlternative.href}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200 underline shrink-0"
                      >
                        <span>Start {action.timeBudgetAlternative.estimatedMinutes}m alternative</span>
                        <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] text-zinc-400">
                      No shorter activity currently fits. Proceed with the primary task or increase your available time.
                    </p>
                  )}
                </div>
              )}

              {/* Compact "Why this is next" disclosure */}
              <details className="group rounded-xl border border-(--border-subtle)/80 bg-(--bg-surface-raised)/50 text-xs transition-colors">
                <summary className="flex cursor-pointer items-center justify-between px-3 py-1.5 text-(--text-secondary) hover:text-(--text-primary) transition select-none">
                  <span className="flex items-center gap-2">
                    <span className="inline-block size-1.5 rounded-full bg-(--accent-lime)" />
                    <strong className="font-semibold text-(--text-primary)">Decision details</strong>
                    <span className="text-[10px] text-(--text-muted) px-1.5 py-0.5 rounded border border-(--border-subtle) bg-(--bg-surface)">
                      Signal: {getSignalDetails(action.sourceProvenance, action.ctaState).label}
                    </span>
                  </span>
                  <ChevronDown className="size-3.5 text-(--text-muted) transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="border-t border-(--border-subtle)/50 px-3 py-2 space-y-1 text-xs text-(--text-secondary)">
                  <p>
                    <strong className="text-(--text-primary)">Evidence basis: </strong>
                    {getSignalDetails(action.sourceProvenance, action.ctaState).detail}
                  </p>
                  <p className="text-[11px] text-(--text-muted)">
                    <strong className="text-(--text-secondary)">What completion changes: </strong>
                    {action.afterCompletionOutcome}
                  </p>
                  {action.relationshipLabel && (
                    <p className="text-[11px] text-sky-400">
                      <strong>Curriculum bridge: </strong>
                      {action.relationshipLabel}
                    </p>
                  )}
                </div>
              </details>
            </div>

            {/* Action Button & Quiet Secondary Link */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 pt-2 lg:pt-0">
              <Link
                href={ctaHref}
                onClick={onActionClick}
                className={cn(
                  "group inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-150 active:scale-[0.98]",
                  ctaVariantClass
                )}
              >
                <span>{ctaLabel}</span>
                <CtaIcon className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>

              {activePlan && (
                <Link
                  href="/plan"
                  className="inline-flex items-center justify-center rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) px-3.5 py-3 text-xs font-medium text-(--text-secondary) transition-colors hover:border-(--border-strong) hover:text-(--text-primary)"
                >
                  {action.sourceProvenance === "self_paced_recommendation" ? "Return to active plan" : "View plan"}
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Self-Paced Recommendation Feedback & Skip Options */}
        {action.sourceProvenance === "self_paced_recommendation" && (
          <div className="border-t border-(--border-subtle)/40 pt-2.5">
            {feedbackGiven ? (
              <p className="text-[11px] text-(--accent-lime) font-medium">
                Feedback recorded ({feedbackGiven}). Recommendations will calibrate to your preference.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-xs text-(--text-muted)">
                <span className="text-[11px]">Recommendation feedback:</span>
                <button
                  type="button"
                  onClick={() => setFeedbackGiven("Too easy")}
                  className="px-2 py-0.5 text-[11px] rounded border border-(--border-subtle) hover:bg-(--bg-surface-raised) hover:text-(--text-primary) transition cursor-pointer"
                >
                  Too easy
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackGiven("Too difficult")}
                  className="px-2 py-0.5 text-[11px] rounded border border-(--border-subtle) hover:bg-(--bg-surface-raised) hover:text-(--text-primary) transition cursor-pointer"
                >
                  Too difficult
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackGiven("Not relevant")}
                  className="px-2 py-0.5 text-[11px] rounded border border-(--border-subtle) hover:bg-(--bg-surface-raised) hover:text-(--text-primary) transition cursor-pointer"
                >
                  Not relevant
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackGiven("Skipped")}
                  className="px-2 py-0.5 text-[11px] rounded border border-(--border-subtle) hover:bg-(--bg-surface-raised) hover:text-(--text-primary) transition cursor-pointer"
                >
                  Skip
                </button>
              </div>
            )}
          </div>
        )}

        {/* Embedded Learning Spine: Compact Progression Timeline (rendered ONLY when backed by real persisted stages) */}
        {spineNodes.length > 0 && (
          <div className="border-t border-(--border-subtle)/60 pt-3.5">
            <div className="flex items-center justify-between text-[11px] text-(--text-muted) pb-2">
              <span className="flex items-center gap-1.5 font-medium text-(--text-secondary)">
                <Milestone className="size-3 text-(--accent-lime)" />
                Learning Spine
              </span>
              <Link
                href="/plan"
                className="text-[11px] font-medium text-(--accent-lime) hover:underline inline-flex items-center gap-1"
              >
                <span>View full plan</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>

            {/* Compact Timeline Rail */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 scrollbar-none">
              {spineNodes.map((node, index) => {
                const isCompleted = node.status === "completed";
                const isCurrent = node.status === "current";
                const isLast = index === spineNodes.length - 1;

                return (
                  <React.Fragment key={node.id}>
                    <div className="flex items-center gap-2 shrink-0 py-1">
                      <div
                        className={cn(
                          "grid size-5 place-items-center rounded-full text-[10px] font-bold border transition-colors",
                          isCompleted && "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
                          isCurrent && "border-(--accent-lime) bg-(--accent-lime) text-black font-extrabold",
                          !isCompleted && !isCurrent && "border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-muted)"
                        )}
                      >
                        {isCompleted ? <Check className="size-3 stroke-[2.5]" /> : index + 1}
                      </div>
                      <span
                        className={cn(
                          "text-xs whitespace-nowrap",
                          isCurrent ? "font-bold text-(--text-primary)" : isCompleted ? "text-(--text-secondary)" : "text-(--text-muted)"
                        )}
                      >
                        {node.title}
                      </span>
                    </div>

                    {!isLast && (
                      <div
                        className={cn(
                          "h-px flex-1 min-w-3 mx-1",
                          isCompleted ? "bg-emerald-500/40" : "bg-(--border-subtle)"
                        )}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

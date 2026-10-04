"use client";

import React, { useState, useEffect, useRef, useCallback, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Clock,
  ArrowRight,
  Sparkles,
  BookOpen,
  Code2,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  SkipForward,
  Flame,
  Target,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RotateCcw,
  Play,
  Zap,
  Check,
  Calendar,
  X,
  SlidersHorizontal,
} from "lucide-react";
import {
  completePlanTaskAction,
  skipPlanTaskAction,
  materializeCurrentDayTasksAction,
  resumePlanAction,
  recalibrateTodayMinutesAction,
  reschedulePlanTaskAction,
  startNextDayEarlyAction,
} from "@/features/intelligence/actions/plan-actions";
import { PLAN_GRAMMAR } from "./plan-visual-grammar";
import type { IntelligenceViewProps } from "./types";
import { cn } from "@/lib/utils";

type DifficultyFilter = "all" | "easy" | "medium" | "hard";

function resolvePlanTaskHref(
  url: string | null | undefined,
  context?: { planId?: string; planDayId?: string; planTaskId?: string }
): string {
  if (!url) return "/plan";
  const formatted = url.startsWith("/problems/") ? `/practice${url}` : url;
  const separator = formatted.includes("?") ? "&" : "?";
  let res = formatted.includes("from=plan") ? formatted : `${formatted}${separator}from=plan`;
  if (context?.planId && !res.includes("planId=")) {
    res += `&planId=${encodeURIComponent(context.planId)}`;
  }
  if (context?.planDayId && !res.includes("planDayId=")) {
    res += `&planDayId=${encodeURIComponent(context.planDayId)}`;
  }
  if (context?.planTaskId && !res.includes("planTaskId=")) {
    res += `&planTaskId=${encodeURIComponent(context.planTaskId)}`;
  }
  return res;
}

export function TodayPlanBoard(props: IntelligenceViewProps) {
  const { plan, days, tasks, snapshot, topicProblems = [], activeTopicName = "DSA Fundamentals" } = props;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const shouldReduceMotion = useReducedMotion();

  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(
    () => new Set(tasks.filter((t) => t.status === "completed").map((t) => t.id))
  );
  const [skippedTaskIds, setSkippedTaskIds] = useState<Set<string>>(
    () => new Set(tasks.filter((t) => t.status === "skipped").map((t) => t.id))
  );
  const [reflectionAnswers, setReflectionAnswers] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [materializationWarning, setMaterializationWarning] = useState<string | null>(null);
  const [isMaterializing, setIsMaterializing] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");
  const [showAllProblems, setShowAllProblems] = useState(false);
  const [showRecalibrateModal, setShowRecalibrateModal] = useState(false);
  const [reschedulingTaskId, setReschedulingTaskId] = useState<string | null>(null);
  const [expandedCompletedIds, setExpandedCompletedIds] = useState<Set<string>>(new Set());
  const hasAutoAttemptedRef = useRef(false);

  // Sync state when props change
  useEffect(() => {
    setCompletedTaskIds(new Set(tasks.filter((t) => t.status === "completed").map((t) => t.id)));
    setSkippedTaskIds(new Set(tasks.filter((t) => t.status === "skipped").map((t) => t.id)));
  }, [tasks]);

  // Check today's dateKey according to plan timezone
  const todayDateKey = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: plan?.timezone || "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }, [plan?.timezone]);

  // Priority 1: User explicitly started a day (e.g. today or working ahead early)
  const inProgressDay = days.find((d) => d.status === "in_progress");

  // Priority 2: Check if today's scheduled day was completed today
  const completedTodayDay = days.find(
    (d) => d.dateKey === todayDateKey && d.status === "completed"
  );

  // Authoritative active day:
  // If user explicitly has an in_progress day, respect that.
  // Otherwise, if today's day was already finished today, show today's victory & celebration screen
  // instead of abruptly forcing tomorrow's tasks before the user chooses to start early.
  const activeDay = inProgressDay || (
    completedTodayDay ||
    snapshot?.currentPlanDay ||
    days.find((d) => d.status === "available") ||
    days[0]
  );

  // Next day information for preview
  const nextDay = activeDay
    ? days.find((d) => d.dayIndex === activeDay.dayIndex + 1)
    : null;
  const nextBlueprintSnapshot = plan?.snapshots?.estimatedScheduleSnapshot?.find(
    (d: any) => activeDay && d.dayIndex === activeDay.dayIndex + 1
  );
  const nextDayTitle = nextDay?.title || nextBlueprintSnapshot?.title || (activeDay ? `Day ${activeDay.dayIndex + 1} Execution` : "");
  const nextDayFocus = nextDay?.focus || nextBlueprintSnapshot?.focus || nextDay?.topicName || "Next Curriculum Milestones";
  const nextDayPhase = nextDay?.phase || nextBlueprintSnapshot?.phase || "PRACTICE";
  const nextDayMinutes = nextDay?.targetMinutes || plan?.dailyMinutes || 45;

  // Tasks for the active day
  const todayTasks: any[] = (completedTodayDay && !inProgressDay)
    ? tasks.filter((t) => activeDay && t.planDayId === activeDay.id)
    : (snapshot?.todayTasks && snapshot.todayTasks.length > 0
        ? snapshot.todayTasks
        : tasks.filter((t) => activeDay && t.planDayId === activeDay.id));

  // Remaining planned time calculation
  const remainingMinutes = todayTasks
    .filter((t) => !completedTaskIds.has(t.id) && !skippedTaskIds.has(t.id))
    .reduce((acc, t) => acc + (t.estimatedMinutes || 15), 0);

  const targetMinutes = activeDay?.targetMinutes || plan?.dailyMinutes || 45;

  const resolvedCount = todayTasks.filter((t: any) => completedTaskIds.has(t.id) || skippedTaskIds.has(t.id)).length;
  const isDayComplete = todayTasks.length > 0 && resolvedCount === todayTasks.length;
  const percentComplete = todayTasks.length > 0 ? Math.round((resolvedCount / todayTasks.length) * 100) : 0;

  // Determine current active task: first unresolved task in sequence
  const currentTaskIndex = todayTasks.findIndex(
    (t: any) => !completedTaskIds.has(t.id) && !skippedTaskIds.has(t.id)
  );

  // Dedicated Bonus Challenge (1 optional practice problem not in today's assigned tasks)
  const bonusProblem = useMemo(() => {
    if (!topicProblems || topicProblems.length === 0) return null;
    const assignedIds = new Set(
      todayTasks
        .filter((t: any) => t.entityId)
        .map((t: any) => String(t.entityId))
    );
    const unassignedUnsolved = topicProblems.filter(
      (p) => !assignedIds.has(String(p.id)) && !p.isSolved
    );
    if (unassignedUnsolved.length > 0) return unassignedUnsolved[0];

    const unassigned = topicProblems.filter((p) => !assignedIds.has(String(p.id)));
    return unassigned[0] || topicProblems[0] || null;
  }, [topicProblems, todayTasks]);

  const nonReflectionTasks = todayTasks.filter((t) => t.entityType !== "reflection");
  const allProblemsCompleted =
    nonReflectionTasks.length > 0 &&
    nonReflectionTasks.every((t) => completedTaskIds.has(t.id) || skippedTaskIds.has(t.id));

  // Intelligent real data recommendations for Problem Vault: at most 3 optional problems
  const recommendedProblems = useMemo(() => {
    if (!topicProblems || topicProblems.length === 0) return [];
    const unsolved = topicProblems.filter((p) => !p.isSolved);
    const solved = topicProblems.filter((p) => p.isSolved);

    if (unsolved.length > 0) {
      const easy = unsolved.find((p) => p.difficulty.toLowerCase() === "easy");
      const medium = unsolved.find((p) => p.difficulty.toLowerCase() === "medium");
      const hard = unsolved.find((p) => p.difficulty.toLowerCase() === "hard");

      const picked: typeof topicProblems = [];
      if (easy) picked.push(easy);
      if (medium && !picked.some((p) => p.id === medium.id)) picked.push(medium);
      if (hard && !picked.some((p) => p.id === hard.id)) picked.push(hard);

      for (const p of unsolved) {
        if (picked.length >= 3) break;
        if (!picked.some((item) => item.id === p.id)) picked.push(p);
      }
      for (const p of solved) {
        if (picked.length >= 3) break;
        if (!picked.some((item) => item.id === p.id)) picked.push(p);
      }
      return picked.slice(0, 3);
    }
    return topicProblems.slice(0, 3);
  }, [topicProblems]);

  // Filtered vault problems for progressive disclosure view
  const filteredVaultProblems = useMemo(() => {
    return topicProblems.filter((p) => {
      if (difficultyFilter === "all") return true;
      return p.difficulty.toLowerCase() === difficultyFilter;
    });
  }, [topicProblems, difficultyFilter]);

  const handleMaterializeTasks = useCallback(async () => {
    setIsMaterializing(true);
    setStatusMessage(null);
    try {
      const res = await materializeCurrentDayTasksAction();
      if (res.success) {
        setStatusMessage("Tasks synchronized successfully!");
        startTransition(() => {
          router.refresh();
        });
      } else {
        setStatusMessage(res.error || "Failed to load tasks.");
      }
    } catch (e: any) {
      setStatusMessage(e?.message || "Error loading tasks.");
    } finally {
      setIsMaterializing(false);
    }
  }, [router]);

  useEffect(() => {
    if (activeDay && todayTasks.length === 0 && !hasAutoAttemptedRef.current) {
      hasAutoAttemptedRef.current = true;
      handleMaterializeTasks();
    }
  }, [activeDay, todayTasks.length, handleMaterializeTasks]);

  const handleCompleteTask = (taskId: string, reflectionAnswer?: string) => {
    setStatusMessage(null);
    // Optimistic instant UI update
    setCompletedTaskIds((prev) => new Set([...prev, taskId]));

    startTransition(async () => {
      try {
        const res = await completePlanTaskAction(taskId, {
          reflectionAnswer,
          passed: true,
        });

        if (res.success) {
          if ((res as any).materializationWarning) {
            setMaterializationWarning((res as any).materializationWarning);
          } else {
            setMaterializationWarning(null);
          }
          if (res.dayAdvanced) {
            setStatusMessage(`Day ${activeDay?.dayIndex ?? 1} finished! Advanced to Day ${res.nextDayIndex}.`);
          } else {
            setStatusMessage("Task completed and evidence recorded.");
          }
          router.refresh();
        }
      } catch (err: any) {
        setCompletedTaskIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
        setStatusMessage(err?.message || "Failed to update task.");
      }
    });
  };

  const handleSkipTask = (taskId: string, reason?: string) => {
    setStatusMessage(null);
    setSkippedTaskIds((prev) => new Set([...prev, taskId]));

    startTransition(async () => {
      try {
        const res = await skipPlanTaskAction(taskId, reason || "Activity unavailable in curriculum");
        if (res.success) {
          if (res.dayAdvanced) {
            setStatusMessage(`Day ${activeDay?.dayIndex ?? 1} finished! Advanced to Day ${res.nextDayIndex}.`);
          } else {
            setStatusMessage("Activity skipped. Next tasks unlocked.");
          }
          router.refresh();
        }
      } catch (err: any) {
        setSkippedTaskIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
        setStatusMessage(err?.message || "Failed to skip task.");
      }
    });
  };

  const handleReschedule = (taskId: string, reason?: string) => {
    setReschedulingTaskId(null);
    setStatusMessage(null);
    setSkippedTaskIds((prev) => new Set([...prev, taskId]));

    startTransition(async () => {
      try {
        const res = await reschedulePlanTaskAction(
          taskId,
          reason || "Rescheduled by learner to future session"
        );
        if (res.success) {
          if (res.dayAdvanced) {
            setStatusMessage(
              `Task safely rescheduled. Day ${activeDay?.dayIndex ?? 1} completed! Advanced to Day ${res.nextDayIndex}.`
            );
          } else {
            setStatusMessage("Task safely rescheduled to your spaced retention queue.");
          }
          router.refresh();
        }
      } catch (err: any) {
        setSkippedTaskIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
        setStatusMessage(err?.message || "Failed to reschedule task.");
      }
    });
  };

  const handleRecalibrateTime = (minutes: number) => {
    setShowRecalibrateModal(false);
    setStatusMessage(null);
    startTransition(async () => {
      try {
        const res = await recalibrateTodayMinutesAction(minutes);
        if (res.success) {
          setStatusMessage(`Today's planned time adjusted to ${minutes}m.`);
          router.refresh();
        }
      } catch (err: any) {
        setStatusMessage(err?.message || "Failed to recalibrate time.");
      }
    });
  };

  const handleResumePlan = () => {
    setStatusMessage(null);
    startTransition(async () => {
      try {
        await resumePlanAction();
        setStatusMessage("Plan resumed! Welcome back to your learning schedule.");
        router.refresh();
      } catch (err: any) {
        setStatusMessage(err?.message || "Failed to resume plan.");
      }
    });
  };

  const handleStartNextDayEarly = () => {
    setStatusMessage(null);
    startTransition(async () => {
      try {
        const res = await startNextDayEarlyAction();
        if (res.success) {
          setStatusMessage(`Day ${res.dayIndex} unlocked! You are now working ahead.`);
          router.refresh();
        } else {
          setStatusMessage(res.error || "Could not start next day.");
        }
      } catch (err: any) {
        setStatusMessage(err?.message || "Failed to start next day.");
      }
    });
  };

  const toggleExpandCompleted = (taskId: string) => {
    setExpandedCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // ── PAUSED OR SELF-PACED MODE ──
  if (!plan || plan.status === "paused") {
    const isPaused = plan?.status === "paused";
    const pendingPlanTask = todayTasks.find((t: any) => !completedTaskIds.has(t.id) && !skippedTaskIds.has(t.id));
    const firstUnsolvedProblem = topicProblems.find((p) => !p.isSolved) || topicProblems[0];

    const nextActionTitle = isPaused
      ? (pendingPlanTask?.title || firstUnsolvedProblem?.title || "Daily Practice Problem")
      : (firstUnsolvedProblem?.title || "Practice Problem");

    const rawActionUrl = isPaused
      ? (pendingPlanTask?.targetUrl || (firstUnsolvedProblem ? `/practice/problems/${firstUnsolvedProblem.slug}` : "/practice"))
      : (firstUnsolvedProblem ? `/practice/problems/${firstUnsolvedProblem.slug}` : "/practice");

    const nextActionUrl = resolvePlanTaskHref(rawActionUrl);
    const nextActionMinutes = isPaused
      ? (pendingPlanTask?.estimatedMinutes || firstUnsolvedProblem?.estimatedMinutes || 25)
      : (firstUnsolvedProblem?.estimatedMinutes || 25);
    const nextActionDifficulty = firstUnsolvedProblem?.difficulty || "Medium";

    return (
      <div className="space-y-8">
        {/* Feedback message banner */}
        {statusMessage && (
          <div className="rounded-2xl border border-teal-500/40 bg-teal-500/10 p-4 text-xs font-semibold text-teal-300 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-teal-400" />
              <span>{statusMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-teal-400/70 hover:text-teal-400"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* ── TODAY'S NEXT ACTION HERO (SELF-PACED / PAUSED) ── */}
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border p-6 sm:p-7 shadow-sm transition-all",
            isPaused
              ? "border-amber-500/30 bg-amber-500/10"
              : "border-(--border-subtle) bg-(--bg-surface)"
          )}
        >
          <div
            className={cn(
              "pointer-events-none absolute -right-20 -top-20 size-72 rounded-full blur-3xl",
              isPaused ? "bg-amber-500/10" : "bg-(--accent-lime)/10"
            )}
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                    isPaused
                      ? "border border-amber-500/30 bg-amber-500/20 text-amber-300"
                      : "border border-(--accent-lime)/30 bg-(--accent-lime)/10 text-(--accent-lime)"
                  )}
                >
                  <Sparkles className="size-3.5" />
                  {isPaused ? "Learning Plan Paused · Exploratory Mode" : "Self-Paced Practice · Today's Mission"}
                </span>
                <span className="text-xs text-(--text-muted)">
                  {isPaused
                    ? `Paused at Day ${activeDay?.dayIndex ?? 1} of ${plan?.totalDays || 18}`
                    : "Free Exploration Mode"}
                </span>
              </div>

              {isPaused ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleResumePlan}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  <span>Resume plan</span>
                  <ArrowRight className="size-3.5" />
                </button>
              ) : (
                <Link
                  href="/intelligence?tab=manage"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--accent-lime) hover:underline"
                >
                  <span>Create my plan</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pt-1">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-(--text-muted)">
                  <Clock className="size-3.5" />
                  <span>~{nextActionMinutes} min</span>
                  <span>·</span>
                  <span className="capitalize font-medium text-(--text-primary)">
                    {nextActionDifficulty}
                  </span>
                  <span>·</span>
                  <span className={isPaused ? "text-amber-300 font-semibold" : "text-(--accent-lime) font-semibold"}>
                    {activeTopicName}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-(--text-primary)">
                  {nextActionTitle}
                </h3>
              </div>

              {/* Dominant Primary CTA */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Link
                  href={nextActionUrl}
                  className="inline-flex items-center gap-2 rounded-xl bg-(--accent-lime) px-5 py-3 text-sm font-bold text-black hover:bg-(--accent-lime-hover) transition-all shadow-md active:scale-[0.99]"
                >
                  <span>Solve in Editor</span>
                  <ArrowRight className="size-4" />
                </Link>

                {isPaused && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleResumePlan}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/20 px-4 py-3 text-xs font-semibold text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer"
                  >
                    <Play className="size-3.5 fill-amber-200" />
                    <span>Resume Plan</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── TOPIC PROBLEM VAULT (RECOMMENDED + PROGRESSIVE DISCLOSURE) ── */}
        <section id="problem-vault" className="space-y-4 pt-4 border-t border-(--border-subtle)/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-(--text-primary) flex items-center gap-2">
                <Layers className="size-4 text-(--accent-lime)" />
                {activeTopicName} Extended Problem Vault
              </h3>
              <p className="text-xs text-(--text-muted) mt-0.5">
                Curated challenges to build pattern intuition and problem-solving readiness.
              </p>
            </div>

            {topicProblems.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllProblems((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary) transition-all cursor-pointer self-start sm:self-auto"
              >
                <span>{showAllProblems ? "Show less" : `Browse all ${topicProblems.length} problems`}</span>
                {showAllProblems ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
            )}
          </div>

          {/* Difficulty Filter Tabs (Visible when full vault is opened) */}
          {showAllProblems && (
            <div className="flex items-center gap-1 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-1 shrink-0 self-start sm:self-auto w-fit">
              {(["all", "easy", "medium", "hard"] as DifficultyFilter[]).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficultyFilter(diff)}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors cursor-pointer",
                    difficultyFilter === diff
                      ? "bg-(--accent-lime) text-black"
                      : "text-(--text-muted) hover:text-(--text-primary)"
                  )}
                >
                  {diff}
                </button>
              ))}
            </div>
          )}

          {/* Problems Display: 3 recommended by default, or all when toggled */}
          {((showAllProblems ? filteredVaultProblems : recommendedProblems).length === 0) ? (
            <div className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-6 text-center text-xs text-(--text-muted)">
              No problems found matching this filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(showAllProblems ? filteredVaultProblems : recommendedProblems).map((problem) => {
                const isEasy = problem.difficulty.toLowerCase() === "easy";
                const isMedium = problem.difficulty.toLowerCase() === "medium";
                const isHard = problem.difficulty.toLowerCase() === "hard";

                return (
                  <div
                    key={problem.id || problem.slug}
                    className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-4 hover:border-(--accent-lime)/40 transition-all flex flex-col justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            isEasy && "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
                            isMedium && "bg-amber-500/15 text-amber-400 border border-amber-500/30",
                            isHard && "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          )}
                        >
                          {problem.difficulty}
                        </span>

                        {problem.isSolved ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <Check className="size-3" />
                            Solved
                          </span>
                        ) : (
                          <span className="text-[11px] text-(--text-muted) flex items-center gap-1">
                            <Clock className="size-3" />
                            {problem.estimatedMinutes || 25}m
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-(--text-primary) line-clamp-1">
                        {problem.title}
                      </h4>

                      {problem.patterns?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {problem.patterns.slice(0, 2).map((pat) => (
                            <span
                              key={pat}
                              className="rounded bg-(--bg-surface-raised) border border-(--border-subtle) px-1.5 py-0.5 text-[9px] font-medium text-(--text-muted)"
                            >
                              {pat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <Link
                      href={resolvePlanTaskHref(`/practice/problems/${problem.slug}`)}
                      className="mt-1 inline-flex items-center justify-between rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) px-3 py-2 text-xs font-semibold text-(--text-secondary) hover:text-black hover:bg-(--accent-lime) hover:border-(--accent-lime) transition-all"
                    >
                      <span>{problem.isSolved ? "Practice Again" : "Solve in Editor"}</span>
                      <ExternalLink className="size-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ── ACTIVE PLAN TODAY BOARD ──
  return (
    <div className="space-y-6">
      {/* ── COMPACT TODAY HEADER: DAY, STAGE, REMAINING TIME & PROGRESS ── */}
      <header className="relative overflow-hidden rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-5 sm:p-6 shadow-sm">
        <div
          className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-(--accent-lime)/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col gap-4">
          {/* Top row: Stage, Day & Recalibration Quick Link */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-(--accent-lime)/30 bg-(--accent-lime)/10 px-2.5 py-0.5 text-xs font-semibold text-(--accent-lime)">
                <Zap className="size-3" />
                Day {activeDay?.dayIndex ?? 1} of {plan.totalDays}
              </span>
              <span className="inline-flex items-center rounded-full border border-(--border-subtle) bg-(--bg-surface-raised) px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)">
                {String(activeDay?.phase || "practice").replace("_", " ")}
              </span>
              <span className="text-xs font-medium text-(--text-muted)">
                {activeDay?.topicName || activeTopicName}
              </span>
            </div>

            {/* Quick Metrics: Target, Remaining & Recalibrate */}
            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
              <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) px-3 py-1.5 text-right">
                <div className="text-[10px] font-medium text-(--text-muted) uppercase tracking-wider">Remaining</div>
                <div className="text-xs sm:text-sm font-semibold text-(--text-primary)">
                  {remainingMinutes}m <span className="text-[10px] text-(--text-muted) font-normal">/ {targetMinutes}m</span>
                </div>
              </div>

              {/* Less Time Today Quick Trigger */}
              <button
                type="button"
                onClick={() => setShowRecalibrateModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) px-3 py-2 text-xs font-semibold text-(--text-secondary) hover:text-(--accent-lime) hover:border-(--accent-lime)/40 transition-all cursor-pointer shadow-xs"
                title="Quickly adjust today's planned minutes"
              >
                <Clock className="size-3.5 text-(--accent-lime)" />
                <span className="hidden sm:inline">Less time today?</span>
                <span className="sm:hidden">Adjust</span>
              </button>
            </div>
          </div>

          {/* Today's Title & Visual Completion Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-(--text-primary)">
                {activeDay?.title || "Daily Focused Practice"}
              </span>
              <span className="text-teal-400 font-mono font-medium">
                {resolvedCount} / {todayTasks.length} Done ({percentComplete}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-(--bg-surface-raised)">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${percentComplete}%` }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.2,
                  ease: "easeOut",
                }}
              />
            </div>
          </div>

          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="rounded-xl border border-teal-500/40 bg-teal-500/10 p-3 text-xs text-teal-300 flex items-center justify-between gap-2 shadow-xs"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-teal-400" />
                <span>{statusMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                className="text-teal-400/70 hover:text-teal-400"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          )}

          {materializationWarning && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-400 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{materializationWarning}</span>
              </div>
              <button
                onClick={() => router.refresh()}
                className="underline hover:text-white"
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── LESS TIME TODAY? QUICK RECALIBRATION MODAL / DRAWER ── */}
      <AnimatePresence>
        {showRecalibrateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 }}
              transition={{ duration: 0.18 }}
              className="relative w-full max-w-md rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="size-5 text-(--accent-lime)" />
                  <h3 className="text-base font-bold text-(--text-primary)">
                    Quick Time Recalibration
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecalibrateModal(false)}
                  className="rounded-lg p-1 text-(--text-muted) hover:text-(--text-primary)"
                >
                  <X className="size-5" />
                </button>
              </div>

              <p className="text-xs text-(--text-secondary) leading-relaxed">
                Short on time today? Adjust your planned commitment. Your streak, past completions, and XP stay permanently intact.
              </p>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {[
                  { minutes: 15, label: "15 min", desc: "Express core solve" },
                  { minutes: 25, label: "25 min", desc: "Targeted single challenge" },
                  { minutes: 45, label: "45 min", desc: "Standard daily workload" },
                  { minutes: 60, label: "60 min", desc: "Deep dive mastery" },
                ].map((option) => (
                  <button
                    key={option.minutes}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleRecalibrateTime(option.minutes)}
                    className={cn(
                      "flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer",
                      targetMinutes === option.minutes
                        ? "border-(--accent-lime) bg-(--accent-lime)/10 text-(--text-primary)"
                        : "border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-secondary) hover:border-(--border-strong) hover:text-(--text-primary)"
                    )}
                  >
                    <span className="text-sm font-bold text-(--text-primary)">{option.label}</span>
                    <span className="text-[10px] text-(--text-muted) mt-0.5">{option.desc}</span>
                  </button>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowRecalibrateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-(--text-muted) hover:text-(--text-primary)"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── CONNECTED VERTICAL EXECUTION TIMELINE ── */}
      <section className="space-y-3">
        {todayTasks.length === 0 ? (
          <div className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-8 text-center space-y-3">
            <RefreshCw className={cn("size-8 mx-auto text-(--accent-lime)", isMaterializing && "animate-spin")} />
            <h4 className="text-sm font-semibold text-(--text-primary)">
              {isMaterializing ? "Organizing today's tasks..." : "Tasks Ready to Load"}
            </h4>
            <p className="text-xs text-(--text-secondary) max-w-sm mx-auto">
              Click below to sync your focused session tasks for Day {activeDay?.dayIndex ?? 1}.
            </p>
            <button
              onClick={() => handleMaterializeTasks()}
              disabled={isMaterializing}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-(--accent-lime) px-4 py-2 text-xs font-semibold text-black hover:bg-(--accent-lime-hover) transition-all cursor-pointer"
            >
              <span>Load Day Tasks</span>
              <RefreshCw className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-3">
            {/* The single continuous vertical rail line connecting all steps */}
            <div
              className="absolute left-[13px] sm:left-[17px] top-4 bottom-4 w-0.5 bg-(--border-subtle)"
              aria-hidden="true"
            />

            {todayTasks.map((task: any, index: number) => {
              const isCompleted = completedTaskIds.has(task.id);
              const isSkipped = skippedTaskIds.has(task.id);
              const isResolved = isCompleted || isSkipped;
              const isCurrent = index === currentTaskIndex && !isResolved;
              const isUpcoming = index > currentTaskIndex && !isResolved;
              const isUnavailable = task.status === "unavailable" && !isSkipped && !isCompleted;
              const isReflection = task.entityType === "reflection";
              const isMission = task.entityType === "mission";
              const isProblem = task.entityType === "problem";
              const isRevision = task.phase === "revise" || task.entityType === "revision";
              const isCheckpoint = task.entityType === "checkpoint" || task.phase === "checkpoint";
              const isExpandedCompleted = expandedCompletedIds.has(task.id);

              const rawTargetUrl = task.targetUrl;
              const resolvedTaskUrl =
                isCheckpoint && (!rawTargetUrl || rawTargetUrl.includes("/intelligence"))
                  ? `/revision?topic=${task.topicSlug || ""}`
                  : rawTargetUrl || (isCheckpoint ? `/revision?topic=${task.topicSlug || ""}` : "/plan");

              return (
                <div key={task.id} className="relative group">
                  {/* Timeline Node Indicator */}
                  {/* Status indicator badge (Non-clickable: genuine progress driven by problem solving) */}
                  <div
                    className="absolute -left-6 sm:-left-8 top-3.5 -translate-x-1/2 select-none z-10"
                    aria-label={
                      isCompleted
                        ? "Completed"
                        : isSkipped
                        ? "Skipped"
                        : isCurrent
                        ? "Current active task"
                        : "Upcoming task"
                    }
                  >
                    {isCompleted ? (
                      <div className="size-5 rounded-full bg-(--bg-surface) flex items-center justify-center">
                        <CheckCircle2 className="size-5 text-teal-400" />
                      </div>
                    ) : isSkipped ? (
                      <div className="size-5 rounded-full bg-(--bg-surface) flex items-center justify-center">
                        <SkipForward className="size-4 text-zinc-500" />
                      </div>
                    ) : isCurrent ? (
                      <div className="size-5 rounded-full border-2 border-(--accent-lime) bg-(--bg-surface) flex items-center justify-center ring-4 ring-(--accent-lime)/20">
                        <div className="size-2 rounded-full bg-(--accent-lime) animate-pulse" />
                      </div>
                    ) : (
                      <div className="size-5 rounded-full border border-zinc-700 bg-(--bg-surface) flex items-center justify-center text-[10px] font-mono text-zinc-500">
                        {index + 1}
                      </div>
                    )}
                  </div>

                  {/* ── CASE 1: COMPLETED / SKIPPED TASK (COMPACT / COLLAPSED) ── */}
                  {isResolved ? (
                    <div
                      className={cn(
                        "rounded-xl border transition-all duration-200 px-4 py-2.5",
                        isCompleted
                          ? "border-teal-500/25 bg-teal-950/15"
                          : "border-(--border-subtle) bg-(--bg-surface)/40"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={cn(
                              "text-xs font-semibold truncate",
                              isCompleted
                                ? "text-teal-300/80 line-through decoration-teal-700/50"
                                : "text-(--text-muted) line-through decoration-zinc-700"
                            )}
                          >
                            {task.title}
                          </span>

                          <span className="text-[10px] text-(--text-muted) shrink-0 flex items-center gap-1">
                            <Clock className="size-3" />
                            {task.estimatedMinutes}m
                          </span>

                          {isSkipped && (
                            <span className="rounded bg-(--bg-surface-raised) border border-(--border-subtle) px-1.5 py-0.5 text-[9px] font-semibold text-(--text-muted)">
                              Rescheduled
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {resolvedTaskUrl && (
                            <Link
                              href={resolvePlanTaskHref(resolvedTaskUrl, {
                                planId: plan?.id,
                                planDayId: task.planDayId,
                                planTaskId: task.id,
                              })}
                              className="text-[11px] font-medium text-teal-400/80 hover:text-teal-300 hover:underline"
                            >
                              Review
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : isCurrent ? (
                    /* ── CASE 2: CURRENT ACTIVE TASK (VISUALLY EXPANDED, STRONGEST EMPHASIS & ONE PRIMARY CTA) ── */
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className={cn(
                        "relative overflow-hidden rounded-2xl border p-5 sm:p-6 shadow-md transition-all",
                        "border-(--accent-lime) bg-(--bg-surface) ring-1 ring-(--accent-lime)/40"
                      )}
                    >
                      {/* Ambient Accent Aura */}
                      <div
                        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-(--accent-lime)/10 blur-2xl"
                        aria-hidden="true"
                      />

                      <div className="relative z-10 space-y-4">
                        {/* Status & Phase Metadata */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-(--accent-lime)/40 bg-(--accent-lime)/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-(--accent-lime)">
                              <div className="size-1.5 rounded-full bg-(--accent-lime) animate-pulse" />
                              Current Task
                            </span>

                            <span
                              className={cn(
                                "flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                                isRevision || isCheckpoint
                                  ? "border border-sky-500/30 bg-sky-500/10 text-sky-400"
                                  : "border border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-muted)"
                              )}
                            >
                              {isMission && <BookOpen className="size-3 text-sky-400" />}
                              {isProblem && <Code2 className="size-3 text-(--accent-lime)" />}
                              {isReflection && <RotateCcw className="size-3 text-sky-400" />}
                              {(isRevision || isCheckpoint) && <RefreshCw className="size-3 text-sky-400" />}
                              {isCheckpoint ? "CHECKPOINT" : task.phase}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-(--text-muted)">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3.5 text-(--accent-lime)" />
                              <strong className="text-(--text-primary)">{task.estimatedMinutes}m</strong>
                            </span>
                            {task.required ? (
                              <span className="text-[10px] text-zinc-400">· Required</span>
                            ) : (
                              <span className="text-[10px] text-(--text-muted)">· Optional</span>
                            )}
                          </div>
                        </div>

                        {/* Title & Clear Action Prompt */}
                        <div>
                          <h4 className="text-lg sm:text-xl font-bold text-(--text-primary) tracking-tight">
                            {task.title}
                          </h4>
                          <p className="mt-1 text-xs text-(--text-secondary) leading-relaxed">
                            {isMission
                              ? "Study the visual mental models and solidify your core invariant understanding."
                              : isProblem
                              ? "Implement the solution in the interactive editor with full automated test feedback."
                              : isReflection
                              ? "Reflect on today's core pattern intuition to solidify long-term retrieval."
                              : isCheckpoint
                              ? "Review key pattern mechanisms and practice scheduled spaced retention items before starting today's challenges."
                              : "Review key pattern mechanisms before starting today's challenges."}
                          </p>
                        </div>

                        {/* Reflection Prompt Expansion (Revealed ONLY when reflection is current) */}
                        {isReflection && (
                          <div className="pt-2 space-y-3">
                            {allProblemsCompleted && (
                              <div className="rounded-xl border border-(--accent-lime)/40 bg-gradient-to-r from-(--accent-lime)/15 via-(--accent-lime)/10 to-(--bg-surface-raised) p-4 space-y-1.5 animate-in fade-in duration-200">
                                <div className="flex items-center gap-2 font-bold text-(--accent-lime) text-sm">
                                  <Sparkles className="size-4 shrink-0" />
                                  <span>🎉 Today&apos;s Target Solved! Time for Daily Reflection</span>
                                </div>
                                <p className="text-xs text-zinc-300 leading-relaxed">
                                  Outstanding work! All your assigned problems for Day {activeDay?.dayIndex ?? 1} are complete. Before advancing to tomorrow, record your key algorithmic intuition to solidify retention.
                                </p>
                              </div>
                            )}

                            <label className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                              <MessageSquare className="size-3.5 text-(--accent-lime)" />
                              {task.reflectionPrompt || "What was the main algorithmic intuition you discovered today?"}
                            </label>
                            <textarea
                              rows={3}
                              value={reflectionAnswers[task.id] || ""}
                              onChange={(e) =>
                                setReflectionAnswers({ ...reflectionAnswers, [task.id]: e.target.value })
                              }
                              placeholder="Write your key algorithmic takeaway here to lock in memory..."
                              className="w-full rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) p-3 text-xs text-(--text-primary) placeholder:text-(--text-muted) focus:border-(--accent-lime) focus:outline-none transition-colors"
                            />
                          </div>
                        )}

                        {/* Actions Row: ONE Dominant CTA + Secondary Ghost Reschedule */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-(--border-subtle)/60">
                          {/* Dominant Primary CTA */}
                          <div>
                            {isReflection ? (
                              <div className="flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleCompleteTask(task.id, reflectionAnswers[task.id])}
                                  className="inline-flex items-center gap-2 rounded-xl bg-(--accent-lime) px-5 py-2.5 text-xs sm:text-sm font-bold text-black hover:bg-(--accent-lime-hover) transition-all shadow-md active:scale-[0.99] cursor-pointer"
                                >
                                  <Check className="size-4" />
                                  <span>Save Reflection & Complete Day</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleSkipTask(task.id, "Skipped daily reflection")}
                                  className="text-xs text-(--text-muted) hover:text-(--text-secondary) underline-offset-4 hover:underline transition-colors cursor-pointer px-1 py-1"
                                >
                                  Skip reflection & finish day
                                </button>
                              </div>
                            ) : isCheckpoint ? (
                              <div className="flex flex-wrap items-center gap-3">
                                <Link
                                  href={resolvePlanTaskHref(resolvedTaskUrl, {
                                    planId: plan?.id,
                                    planDayId: task.planDayId,
                                    planTaskId: task.id,
                                  })}
                                  className="inline-flex items-center gap-2 rounded-xl bg-(--accent-lime) px-5 py-2.5 text-xs sm:text-sm font-bold text-black hover:bg-(--accent-lime-hover) transition-all shadow-md active:scale-[0.99]"
                                >
                                  <RefreshCw className="size-4" />
                                  <span>Start Checkpoint Drill</span>
                                  <ArrowRight className="size-4" />
                                </Link>
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleCompleteTask(task.id)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-teal-500/40 bg-teal-500/15 hover:bg-teal-500/25 px-4 py-2.5 text-xs sm:text-sm font-bold text-teal-300 transition-all shadow-xs cursor-pointer"
                                >
                                  <Check className="size-4" />
                                  <span>Complete Checkpoint Review</span>
                                </button>
                              </div>
                            ) : !isUnavailable && resolvedTaskUrl ? (
                              <Link
                                href={resolvePlanTaskHref(resolvedTaskUrl, {
                                  planId: plan?.id,
                                  planDayId: task.planDayId,
                                  planTaskId: task.id,
                                })}
                                className="inline-flex items-center gap-2 rounded-xl bg-(--accent-lime) px-5 py-2.5 text-xs sm:text-sm font-bold text-black hover:bg-(--accent-lime-hover) transition-all shadow-md active:scale-[0.99]"
                              >
                                <span>
                                  {isProblem ? "Solve in Editor" : isMission ? "Start Mission" : isRevision ? "Start Revision Drill" : "Start Session"}
                                </span>
                                <ArrowRight className="size-4" />
                              </Link>
                            ) : null}
                          </div>

                          {/* Secondary Subtle Reschedule / Defer Action */}
                          <div className="flex items-center gap-2">
                            {reschedulingTaskId === task.id ? (
                              <div className="flex items-center gap-2 bg-(--bg-surface-raised) border border-(--border-subtle) rounded-xl px-2.5 py-1 text-xs">
                                <span className="text-[11px] text-(--text-muted)">Reschedule to review?</span>
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleReschedule(task.id, "Rescheduled for tomorrow")}
                                  className="font-semibold text-amber-400 hover:underline cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReschedulingTaskId(null)}
                                  className="text-(--text-muted) hover:text-(--text-primary) cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => setReschedulingTaskId(task.id)}
                                className="inline-flex items-center gap-1.5 text-xs text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
                              >
                                <Calendar className="size-3.5" />
                                <span>Reschedule</span>
                              </button>
                            )}

                            {isUnavailable && (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleSkipTask(task.id, "Content unseeded")}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer"
                              >
                                <span>Skip Task</span>
                                <SkipForward className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    /* ── CASE 3: UPCOMING TASK (COMPACT NEUTRAL STATE) ── */
                    <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface)/60 px-4 py-3 text-zinc-400 flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-medium text-zinc-400 truncate">
                          {task.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-[11px] text-(--text-muted)">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3 text-zinc-500" />
                          {task.estimatedMinutes}m
                        </span>
                        <span className="rounded bg-(--bg-surface-raised) border border-(--border-subtle) px-1.5 py-0.5 text-[9px] font-semibold uppercase text-zinc-500">
                          {task.phase}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── DEDICATED BONUS CHALLENGE (OPTIONAL) SECTION ── */}
        {bonusProblem && (
          <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/5 via-(--bg-surface) to-(--bg-surface) p-5 sm:p-6 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    <Sparkles className="size-3" />
                    Bonus Challenge · Optional
                  </span>
                  <span className="text-[11px] text-(--text-muted)">
                    Extra practice · Does not block day completion or green progress bar
                  </span>
                </div>
                <h4 className="text-base font-bold text-(--text-primary)">
                  {bonusProblem.title}
                </h4>
                <div className="flex items-center gap-2 text-xs text-(--text-secondary)">
                  <span
                    className={cn(
                      "font-semibold uppercase text-[10px] px-2 py-0.5 rounded border",
                      bonusProblem.difficulty.toLowerCase() === "easy"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : bonusProblem.difficulty.toLowerCase() === "hard"
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    )}
                  >
                    {bonusProblem.difficulty}
                  </span>
                  <span>~{bonusProblem.estimatedMinutes || 25}m</span>
                  {bonusProblem.patterns && bonusProblem.patterns.length > 0 && (
                    <span className="text-(--text-muted) hidden sm:inline">
                      · {bonusProblem.patterns[0]}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/practice/problems/${bonusProblem.slug}?from=plan`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-300 transition-all cursor-pointer shadow-xs"
                >
                  <span>Solve Bonus Problem</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── DAY COMPLETED VICTORY BANNER WITH TOMORROW'S FOCUS PREVIEW ── */}
        {isDayComplete && (
          <motion.div
            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="rounded-2xl border border-teal-500/35 bg-gradient-to-br from-teal-950/25 via-(--bg-surface) to-(--bg-surface) p-6 sm:p-7 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-400">
                  <CheckCircle2 className="size-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-teal-300">
                    Day {activeDay.dayIndex} Objectives Mastered! 🎉
                  </h4>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    You crushed today&apos;s curriculum for {activeDay.topicName || activeTopicName}. Your streak is secured and progress is recorded. Rest up, or explore DSA Club below!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/intelligence?tab=week"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) px-4 py-2 text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary) transition-all"
                >
                  <span>View Full Schedule</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>

            {/* Exploration Hub: Problems, Patterns, Missions */}
            <div className="pt-2 border-t border-(--border-subtle)/50 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-(--text-primary) uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-(--accent-lime)" />
                  Explore DSA Club While Resting
                </span>
                <span className="text-[11px] text-(--text-muted)">
                  Self-paced exploration does not disrupt your daily streak
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  href={`/practice?topic=${activeDay.topicSlug || ""}`}
                  className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised)/60 p-3.5 hover:border-(--accent-lime)/40 hover:bg-(--bg-surface-hover) transition-all group"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-(--text-primary) group-hover:text-(--accent-lime) transition-colors">
                    <Code2 className="size-4 text-(--accent-lime)" />
                    <span>Problem Vault</span>
                  </div>
                  <p className="mt-1 text-[11px] text-(--text-muted) leading-relaxed">
                    Practice topic problems with integrated test runner.
                  </p>
                </Link>
                <Link
                  href="/patterns"
                  className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised)/60 p-3.5 hover:border-sky-500/40 hover:bg-(--bg-surface-hover) transition-all group"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-(--text-primary) group-hover:text-sky-400 transition-colors">
                    <Layers className="size-4 text-sky-400" />
                    <span>Algorithmic Patterns</span>
                  </div>
                  <p className="mt-1 text-[11px] text-(--text-muted) leading-relaxed">
                    Study mental models, pattern triggers, and invariant templates.
                  </p>
                </Link>
                <Link
                  href="/missions"
                  className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised)/60 p-3.5 hover:border-purple-500/40 hover:bg-(--bg-surface-hover) transition-all group"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-(--text-primary) group-hover:text-purple-400 transition-colors">
                    <Target className="size-4 text-purple-400" />
                    <span>Interactive Missions</span>
                  </div>
                  <p className="mt-1 text-[11px] text-(--text-muted) leading-relaxed">
                    Visual milestone challenges that build concept foundation.
                  </p>
                </Link>
              </div>
            </div>

            {/* Next Day Preview Card with Start Early CTA */}
            {(nextDay || nextBlueprintSnapshot) && (
              <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised)/80 p-4 space-y-3 text-left">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                    <Clock className="size-3.5 text-zinc-400" />
                    Tomorrow&apos;s Focus · Day {activeDay.dayIndex + 1}
                  </span>
                  <span className="text-[11px] text-(--text-muted) flex items-center gap-1">
                    Unlocks automatically tomorrow · ~{nextDayMinutes}m
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="text-sm font-semibold text-(--text-primary)">
                      {nextDayTitle}
                    </h5>
                    <p className="text-xs text-(--text-secondary) mt-0.5">
                      {nextDayFocus}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleStartNextDayEarly}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-(--accent-lime) px-4 py-2 text-xs font-bold text-black hover:bg-(--accent-lime-hover) transition-all shadow-sm cursor-pointer active:scale-[0.98]"
                    >
                      <span>Start Day {nextDay?.dayIndex ?? (activeDay.dayIndex + 1)} Early</span>
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Extra Practice Prompt -> Link to Problem Vault */}
            <div className="pt-2 border-t border-(--border-subtle)/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="text-(--text-muted) flex items-center gap-2">
                <Sparkles className="size-4 text-(--accent-lime) shrink-0" />
                <span>
                  Want to keep coding today? Practice anytime using the <strong>Extended Problem Vault</strong> below.
                </span>
              </div>
              <a
                href="#problem-vault"
                className="inline-flex items-center gap-1 text-xs font-semibold text-(--accent-lime) hover:underline self-start sm:self-auto cursor-pointer"
              >
                <span>Jump to Vault</span>
                <ChevronRight className="size-3.5" />
              </a>
            </div>
          </motion.div>
        )}
      </section>

      {/* ── TOPIC PROBLEM VAULT (RECOMMENDED + PROGRESSIVE DISCLOSURE) ── */}
      <section id="problem-vault" className="space-y-4 pt-4 border-t border-(--border-subtle)/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-(--text-primary) flex items-center gap-2">
              <Layers className="size-4 text-(--accent-lime)" />
              {activeTopicName} Extended Problem Vault
            </h3>
            <p className="text-xs text-(--text-muted) mt-0.5">
              Intelligently selected optional challenges from real topic data. Solves award XP and reinforce retention.
            </p>
          </div>

          {topicProblems.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllProblems((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary) transition-all cursor-pointer self-start sm:self-auto"
            >
              <span>{showAllProblems ? "Show less" : `Browse all ${topicProblems.length} problems`}</span>
              {showAllProblems ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
          )}
        </div>

        {/* Difficulty Filter Tabs (Visible when full vault is opened) */}
        {showAllProblems && (
          <div className="flex items-center gap-1 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-1 shrink-0 self-start sm:self-auto w-fit">
            {(["all", "easy", "medium", "hard"] as DifficultyFilter[]).map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => setDifficultyFilter(diff)}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors cursor-pointer",
                  difficultyFilter === diff
                    ? "bg-(--accent-lime) text-black"
                    : "text-(--text-muted) hover:text-(--text-primary)"
                )}
              >
                {diff}
              </button>
            ))}
          </div>
        )}

        {/* Problems Display: At most 3 recommended by default, full catalog when expanded */}
        {((showAllProblems ? filteredVaultProblems : recommendedProblems).length === 0) ? (
          <div className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-6 text-center text-xs text-(--text-muted)">
            No additional problems found in the catalog matching &ldquo;{difficultyFilter}&rdquo; difficulty.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(showAllProblems ? filteredVaultProblems : recommendedProblems).map((problem) => {
              const isEasy = problem.difficulty.toLowerCase() === "easy";
              const isMedium = problem.difficulty.toLowerCase() === "medium";
              const isHard = problem.difficulty.toLowerCase() === "hard";

              return (
                <div
                  key={problem.id || problem.slug}
                  className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-4 hover:border-(--accent-lime)/40 transition-all flex flex-col justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          isEasy && "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
                          isMedium && "bg-amber-500/15 text-amber-400 border border-amber-500/30",
                          isHard && "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                        )}
                      >
                        {problem.difficulty}
                      </span>

                      {problem.isSolved ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <Check className="size-3" />
                          Solved
                        </span>
                      ) : (
                        <span className="text-[11px] text-(--text-muted) flex items-center gap-1">
                          <Clock className="size-3" />
                          {problem.estimatedMinutes || 25}m
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-semibold text-(--text-primary) line-clamp-1">
                      {problem.title}
                    </h4>

                    {problem.patterns?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {problem.patterns.slice(0, 2).map((pat) => (
                          <span
                            key={pat}
                            className="rounded bg-(--bg-surface-raised) border border-(--border-subtle) px-1.5 py-0.5 text-[9px] font-medium text-(--text-muted)"
                          >
                            {pat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <Link
                    href={resolvePlanTaskHref(`/practice/problems/${problem.slug}`)}
                    className="mt-1 inline-flex items-center justify-between rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) px-3 py-2 text-xs font-semibold text-(--text-secondary) hover:text-black hover:bg-(--accent-lime) hover:border-(--accent-lime) transition-all"
                  >
                    <span>{problem.isSolved ? "Practice Again" : "Solve in Editor"}</span>
                    <ExternalLink className="size-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

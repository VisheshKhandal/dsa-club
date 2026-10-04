"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  SlidersHorizontal,
  Pause,
  Play,
  Square,
  Clock,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Target,
  Compass,
  X,
  Search,
  RotateCcw,
  Check,
  HelpCircle,
  Info,
  Sliders,
  CalendarDays,
  ShieldAlert,
} from "lucide-react";
import { useReducedMotion } from "framer-motion";
import {
  createPlanPreviewAction,
  activatePlanAction,
  pausePlanAction,
  resumePlanAction,
  stopPlanAction,
} from "@/features/intelligence/actions/plan-actions";
import {
  CANONICAL_TOPIC_CATALOG,
  normalizeTopicSlug,
  type CanonicalTopicEntry,
} from "@/features/intelligence/planning/topic-catalog";
import type { PlannerInput } from "@/features/intelligence/types/intelligence.types";
import type { IntelligenceViewProps } from "./types";
import { cn } from "@/lib/utils";

const MINUTE_OPTIONS = [30, 45, 60, 90, 120];

const PROBLEM_OPTIONS = [
  { count: 1, label: "1 Problem", sub: "Light Pace" },
  { count: 2, label: "2 Problems", sub: "Standard" },
  { count: 3, label: "3 Problems", sub: "Accelerated" },
  { count: 4, label: "4 Problems", sub: "Intensive" },
] as const;

const LEVEL_OPTIONS = [
  { value: "beginner", label: "Beginner", desc: "Build intuition and core patterns from scratch" },
  { value: "intermediate", label: "Intermediate", desc: "Solid on basics, focus on medium problem mastery" },
  { value: "advanced", label: "Advanced", desc: "Target hard optimizations and complex edge cases" },
] as const;

const GOAL_OPTIONS = [
  { value: "placement", label: "Campus Placement", desc: "Standard company rounds and online assessments" },
  { value: "internship", label: "Internship Prep", desc: "Core algorithms and speed execution" },
  { value: "switch", label: "Job Switch", desc: "Mid/Senior interview patterns and system invariants" },
  { value: "foundation", label: "CS Foundations", desc: "Deep conceptual grounding without interview rush" },
  { value: "interview", label: "Target FAANG / Top Tech", desc: "Hard problem variations and rigorous time bounds" },
] as const;

const LANGUAGE_OPTIONS = [
  { value: "cpp", label: "C++", tag: "STL" },
  { value: "java", label: "Java", tag: "Collections" },
  { value: "python", label: "Python", tag: "Standard Lib" },
  { value: "javascript", label: "JavaScript", tag: "ES6+" },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: "adaptive", label: "Adaptive (Recommended)", desc: "Dynamically balances difficulty based on your solve rates" },
  { value: "standard", label: "Standard Progression", desc: "Linear ramp from easy to medium patterns" },
  { value: "challenging", label: "High Intensity", desc: "Accelerates early into medium and hard problems" },
] as const;

const DAYS_OF_WEEK = [
  { id: 1, label: "Mon", full: "Monday" },
  { id: 2, label: "Tue", full: "Tuesday" },
  { id: 3, label: "Wed", full: "Wednesday" },
  { id: 4, label: "Thu", full: "Thursday" },
  { id: 5, label: "Fri", full: "Friday" },
  { id: 6, label: "Sat", full: "Saturday" },
  { id: 0, label: "Sun", full: "Sunday" },
];

interface UndoState {
  canUndo: boolean;
  previousConfig: PlannerInput;
  appliedChangesCount: number;
  secondsRemaining: number;
}

export function ManagePlanTab({ plan, days = [] }: IntelligenceViewProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [isPending, startTransition] = useTransition();

  // Feedback notifications
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);

  // Modals and Drawers
  const [showStopModal, setShowStopModal] = useState(false);
  const [isTopicSelectorOpen, setIsTopicSelectorOpen] = useState(false);
  const [topicSearchQuery, setTopicSearchQuery] = useState("");
  const [selectedTopicCategory, setSelectedTopicCategory] = useState<string>("all");

  // Progressive disclosure for advanced scheduling
  const [isAdvancedSchedulingOpen, setIsAdvancedSchedulingOpen] = useState(false);

  // Initial plan values
  const initialMinutes = plan?.dailyMinutes || 45;
  const initialProblems = (plan as any)?.dailyProblems || 2;
  const initialLevel = (plan?.experienceLevel as any) || "beginner";
  const initialTopic = normalizeTopicSlug(days[0]?.topicSlug) || CANONICAL_TOPIC_CATALOG[0]?.slug || "arrays";
  const initialLanguage = (plan?.language as any) || "cpp";
  const initialGoal = (plan?.goal as any) || "placement";
  const initialDifficulty = (plan?.difficultyPreference as any) || "adaptive";
  const initialStudyDays = (plan as any)?.studyDaysPerWeek || 7;
  const initialCatchUp = (plan as any)?.catchUpPreference || "rebalance_forward";
  const initialTargetDate = plan?.targetCompletionDate
    ? new Date(plan.targetCompletionDate).toISOString().slice(0, 10)
    : "";

  // Form State
  const [dailyMinutes, setDailyMinutes] = useState<number>(initialMinutes);
  const [dailyProblems, setDailyProblems] = useState<number>(initialProblems);
  const [experienceLevel, setExperienceLevel] = useState<"beginner" | "intermediate" | "advanced">(initialLevel);
  const [primaryTopicSlug, setPrimaryTopicSlug] = useState<string>(initialTopic);
  const [language, setLanguage] = useState<"cpp" | "java" | "python" | "javascript">(initialLanguage);
  const [learningGoal, setLearningGoal] = useState<"internship" | "placement" | "switch" | "foundation" | "interview">(initialGoal);
  const [difficultyPreference, setDifficultyPreference] = useState<"adaptive" | "standard" | "challenging">(initialDifficulty);
  const [studyDaysPerWeek, setStudyDaysPerWeek] = useState<number>(initialStudyDays);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [targetInterviewDate, setTargetInterviewDate] = useState<string>(initialTargetDate);
  const [catchUpPreference, setCatchUpPreference] = useState<"rebalance_forward" | "accelerate" | "buffer_day">(initialCatchUp);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [newBlackoutDate, setNewBlackoutDate] = useState("");

  // Live preview diff state
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Active day computation
  const activeDay = days.find((d) => d.status === "in_progress") || days.find((d) => d.status === "available") || days[0];
  const activeDayIndex = activeDay?.dayIndex || 1;

  // Plan state flags
  const isPaused = plan?.status === "paused";
  const isActive = plan?.status === "active";
  const isStopped = !plan || plan?.status === "archived";

  // Selected Topic Metadata
  const selectedTopic = useMemo(() => {
    return CANONICAL_TOPIC_CATALOG.find((t) => t.slug === primaryTopicSlug) || CANONICAL_TOPIC_CATALOG[0];
  }, [primaryTopicSlug]);

  // Filtered Topics for Searchable Selector
  const filteredTopics = useMemo(() => {
    return CANONICAL_TOPIC_CATALOG.filter((t) => {
      const matchesCategory = selectedTopicCategory === "all" || t.category === selectedTopicCategory;
      const q = topicSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.displayName.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [topicSearchQuery, selectedTopicCategory]);

  // Calculate Real Changes Count
  const changesCount = useMemo(() => {
    let count = 0;
    if (dailyMinutes !== initialMinutes) count++;
    if (dailyProblems !== initialProblems) count++;
    if (experienceLevel !== initialLevel) count++;
    if (normalizeTopicSlug(primaryTopicSlug) !== normalizeTopicSlug(initialTopic)) count++;
    if (language !== initialLanguage) count++;
    if (learningGoal !== initialGoal) count++;
    if (difficultyPreference !== initialDifficulty) count++;
    if (studyDaysPerWeek !== initialStudyDays) count++;
    if (targetInterviewDate !== initialTargetDate) count++;
    if (catchUpPreference !== initialCatchUp) count++;
    if (unavailableDates.length > 0) count++;
    return count;
  }, [
    dailyMinutes, initialMinutes,
    dailyProblems, initialProblems,
    experienceLevel, initialLevel,
    primaryTopicSlug, initialTopic,
    language, initialLanguage,
    learningGoal, initialGoal,
    difficultyPreference, initialDifficulty,
    studyDaysPerWeek, initialStudyDays,
    targetInterviewDate, initialTargetDate,
    catchUpPreference, initialCatchUp,
    unavailableDates.length,
  ]);

  // Debounced live preview generation
  useEffect(() => {
    let active = true;
    setIsPreviewLoading(true);

    const input: PlannerInput = {
      dailyMinutes,
      dailyProblems,
      experienceLevel,
      focusTopicSlugs: [primaryTopicSlug],
      primaryTopicSlug,
      language,
      learningGoal,
      companySlugs: ["other"],
      difficultyPreference,
      timezone: "Asia/Kolkata",
      studyDaysPerWeek,
      targetInterviewDate: targetInterviewDate || undefined,
      catchUpPreference,
      unavailableDates: unavailableDates.length > 0 ? unavailableDates : undefined,
    };

    const timer = setTimeout(() => {
      createPlanPreviewAction(input)
        .then((res) => {
          if (active) {
            setPreviewResult(res);
            setIsPreviewLoading(false);
          }
        })
        .catch(() => {
          if (active) setIsPreviewLoading(false);
        });
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    dailyMinutes,
    dailyProblems,
    experienceLevel,
    primaryTopicSlug,
    language,
    learningGoal,
    difficultyPreference,
    studyDaysPerWeek,
    targetInterviewDate,
    catchUpPreference,
    unavailableDates,
  ]);

  // Undo countdown timer
  useEffect(() => {
    if (!undoState) return;
    const interval = setInterval(() => {
      setUndoState((prev) => {
        if (!prev || prev.secondsRemaining <= 1) return null;
        return { ...prev, secondsRemaining: prev.secondsRemaining - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [undoState]);

  // Actions
  const handlePause = (reason: "break" | "exam" | "vacation" | "manual" = "manual") => {
    setStatusMessage(null);
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await pausePlanAction(reason);
        setStatusMessage("Plan paused. Your schedule is frozen without losing streak or completed tasks.");
        router.refresh();
      } catch (err: any) {
        setErrorMessage(err?.message || "Failed to pause plan.");
      }
    });
  };

  const handleResume = () => {
    setStatusMessage(null);
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await resumePlanAction();
        setStatusMessage("Plan resumed! Welcome back to your daily practice schedule.");
        router.refresh();
      } catch (err: any) {
        setErrorMessage(err?.message || "Failed to resume plan.");
      }
    });
  };

  const handleConfirmStop = () => {
    setStatusMessage(null);
    setErrorMessage(null);
    setShowStopModal(false);
    startTransition(async () => {
      try {
        await stopPlanAction("Learner opted for self-paced practice");
        setStatusMessage("Plan stopped. You are now in Self-Paced Practice Mode with full access to problems.");
        router.refresh();
      } catch (err: any) {
        setErrorMessage(err?.message || "Failed to stop plan.");
      }
    });
  };

  const handleApplyRecalibration = () => {
    setStatusMessage(null);
    setErrorMessage(null);

    const previousConfig: PlannerInput = {
      dailyMinutes: initialMinutes,
      dailyProblems: initialProblems,
      experienceLevel: initialLevel,
      focusTopicSlugs: [initialTopic],
      primaryTopicSlug: initialTopic,
      language: initialLanguage,
      learningGoal: initialGoal,
      companySlugs: ["other"],
      difficultyPreference: initialDifficulty,
      timezone: "Asia/Kolkata",
      studyDaysPerWeek: initialStudyDays,
      targetInterviewDate: initialTargetDate || undefined,
      catchUpPreference: initialCatchUp,
    };

    const countApplied = changesCount;

    startTransition(async () => {
      try {
        const input: PlannerInput = {
          dailyMinutes,
          dailyProblems,
          experienceLevel,
          focusTopicSlugs: [primaryTopicSlug],
          primaryTopicSlug,
          language,
          learningGoal,
          companySlugs: ["other"],
          difficultyPreference,
          timezone: "Asia/Kolkata",
          studyDaysPerWeek,
          targetInterviewDate: targetInterviewDate || undefined,
          catchUpPreference,
          unavailableDates: unavailableDates.length > 0 ? unavailableDates : undefined,
        };

        await activatePlanAction(input, plan ? "recalibrated" : "starter");

        // Surface Undo opportunity for 10 seconds
        setUndoState({
          canUndo: true,
          previousConfig,
          appliedChangesCount: countApplied,
          secondsRemaining: 10,
        });

        setStatusMessage(`Plan successfully calibrated! Applied ${countApplied} change${countApplied > 1 ? "s" : ""}.`);
        router.refresh();
      } catch (err: any) {
        setErrorMessage(err?.message || "Failed to activate recalibrated plan.");
      }
    });
  };

  const handleUndo = () => {
    if (!undoState) return;
    const config = undoState.previousConfig;
    setUndoState(null);
    setStatusMessage(null);
    setErrorMessage(null);

    // Restore form values
    setDailyMinutes(config.dailyMinutes);
    setDailyProblems(config.dailyProblems || 2);
    setExperienceLevel(config.experienceLevel);
    setPrimaryTopicSlug(config.primaryTopicSlug || config.focusTopicSlugs?.[0] || "arrays");
    setLanguage(config.language);
    setLearningGoal(config.learningGoal as any);
    if (config.difficultyPreference) setDifficultyPreference(config.difficultyPreference);
    if (config.studyDaysPerWeek) setStudyDaysPerWeek(config.studyDaysPerWeek);
    if (config.catchUpPreference) setCatchUpPreference(config.catchUpPreference);
    setTargetInterviewDate(config.targetInterviewDate || "");

    startTransition(async () => {
      try {
        await activatePlanAction(config, "recalibrated");
        setStatusMessage("Recalibration undone. Restored previous plan configuration.");
        router.refresh();
      } catch (err: any) {
        setErrorMessage(err?.message || "Failed to undo recalibration.");
      }
    });
  };

  const handleAddBlackoutDate = () => {
    if (!newBlackoutDate) return;
    if (!unavailableDates.includes(newBlackoutDate)) {
      setUnavailableDates([...unavailableDates, newBlackoutDate]);
    }
    setNewBlackoutDate("");
  };

  const handleRemoveBlackoutDate = (date: string) => {
    setUnavailableDates(unavailableDates.filter((d) => d !== date));
  };

  const toggleWeekday = (id: number) => {
    if (selectedWeekdays.includes(id)) {
      if (selectedWeekdays.length > 1) {
        setSelectedWeekdays(selectedWeekdays.filter((d) => d !== id));
      }
    } else {
      setSelectedWeekdays([...selectedWeekdays, id]);
    }
  };

  // Checkpoint movement calculation for preview
  const currentCheckpointDays = useMemo(() => {
    return days.filter((d) => d.isCheckpointDay || d.dayIndex % 7 === 0).map((d) => d.dayIndex);
  }, [days]);

  const proposedCheckpointDays = useMemo(() => {
    if (!previewResult?.proposedBlueprint?.days) return [7, 14, 21];
    return previewResult.proposedBlueprint.days
      .filter((d: any) => d.isCheckpointDay || d.dayIndex % 7 === 0)
      .map((d: any) => d.dayIndex);
  }, [previewResult]);

  return (
    <div className="space-y-8 w-full">
      {/* ── NOTIFICATIONS & UNDO BANNER ── */}
      {undoState && (
        <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 text-xs font-semibold text-sky-300 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-sky-400 shrink-0" />
            <span>
              Applied {undoState.appliedChangesCount} change{undoState.appliedChangesCount > 1 ? "s" : ""} to your plan schedule.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleUndo}
              disabled={isPending}
              className="rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 px-3.5 py-1.5 text-xs font-bold text-sky-200 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="size-3.5" />
              <span>Undo ({undoState.secondsRemaining}s)</span>
            </button>
            <button
              type="button"
              onClick={() => setUndoState(null)}
              className="text-sky-400/70 hover:text-sky-300"
              aria-label="Dismiss undo"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {statusMessage && !undoState && (
        <div className="rounded-2xl border border-(--accent-lime)/40 bg-(--accent-lime)/10 p-4 text-xs font-semibold text-(--accent-lime) flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-(--accent-lime)/70 hover:text-(--accent-lime)"
            aria-label="Dismiss status message"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-xs font-semibold text-red-400 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-400/70 hover:text-red-400"
            aria-label="Dismiss error message"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* ── 1. PLAN MODE SELECTOR (STRUCTURED PLAN VS SELF-PACED) ── */}
      <div className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-(--text-muted)">
              Learning Operating Mode
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-(--text-primary)">
              {isStopped ? "Self-Paced Practice Mode Active" : "Structured Learning Plan Mode"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                isActive
                  ? "bg-(--accent-lime)/15 text-(--accent-lime) border border-(--accent-lime)/30"
                  : isPaused
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "bg-sky-500/15 text-sky-400 border border-sky-500/30"
              )}
            >
              {isActive ? (
                <>
                  <Play className="size-3 fill-(--accent-lime)" />
                  <span>Structured Plan: Active</span>
                </>
              ) : isPaused ? (
                <>
                  <Pause className="size-3" />
                  <span>Structured Plan: Paused</span>
                </>
              ) : (
                <>
                  <Compass className="size-3 text-sky-400" />
                  <span>Self-Paced Mode</span>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Option A: Structured Plan */}
          <div
            onClick={() => {
              if (isStopped) {
                // Focus on form below to configure & activate
                const el = document.getElementById("plan-configuration-form");
                el?.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className={cn(
              "rounded-xl border p-4.5 transition-all cursor-pointer flex flex-col justify-between gap-3",
              !isStopped
                ? "border-(--accent-lime) bg-(--accent-lime)/10 ring-1 ring-(--accent-lime)/40 shadow-xs"
                : "border-(--border-subtle) bg-(--bg-surface-raised) hover:border-(--border-subtle)/80 opacity-80"
            )}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-(--text-primary) flex items-center gap-2">
                  <Sparkles className="size-4 text-(--accent-lime)" />
                  Structured Plan Mode
                </span>
                {!isStopped && (
                  <span className="size-2 rounded-full bg-(--accent-lime) shadow-xs" />
                )}
              </div>
              <p className="text-xs text-(--text-secondary) leading-relaxed">
                Daily syllabus with dedicated time budgets, 7-day milestone checkpoints, and algorithmic retention decay protection.
              </p>
            </div>
            <div className="text-[11px] font-semibold text-(--accent-lime)">
              {!isStopped
                ? `Cycle ${plan?.cycleNumber || 1} · ${plan?.totalDays || 18} Days Total (${plan?.dailyMinutes || 45}m/day)`
                : "Configure parameters below to generate a new cycle"}
            </div>
          </div>

          {/* Option B: Self-Paced Practice */}
          <div
            onClick={() => {
              if (!isStopped) {
                setShowStopModal(true);
              }
            }}
            className={cn(
              "rounded-xl border p-4.5 transition-all cursor-pointer flex flex-col justify-between gap-3",
              isStopped
                ? "border-sky-500/50 bg-sky-500/10 ring-1 ring-sky-500/30 shadow-xs"
                : "border-(--border-subtle) bg-(--bg-surface-raised) hover:border-(--border-subtle)/80 opacity-80"
            )}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-(--text-primary) flex items-center gap-2">
                  <Compass className="size-4 text-sky-400" />
                  Self-Paced Practice Mode
                </span>
                {isStopped && (
                  <span className="size-2 rounded-full bg-sky-400 shadow-xs" />
                )}
              </div>
              <p className="text-xs text-(--text-secondary) leading-relaxed">
                Zero daily deadlines or sprint pressure. Solve any problem freely from the catalog. All solved problems award XP and contribute to mastery.
              </p>
            </div>
            <div className="text-[11px] font-semibold text-sky-400">
              {isStopped ? "Active: Practice freely without daily schedules" : "Switch to Self-Paced Mode →"}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. TWO-COLUMN DESKTOP LAYOUT (SETTINGS LEFT, STICKY PREVIEW RIGHT) ── */}
      <div id="plan-configuration-form" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── LEFT COLUMN: PLAN CONFIGURATION FORM (7 COLS) ── */}
        <div className="lg:col-span-7 space-y-6">
          {/* GROUP 1: TIME & AVAILABILITY */}
          <div className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-6 space-y-5 shadow-sm">
            <div className="border-b border-(--border-subtle)/60 pb-3">
              <h3 className="text-base font-bold text-(--text-primary) flex items-center gap-2">
                <Clock className="size-4 text-(--accent-lime)" />
                <span>Time & Availability</span>
              </h3>
              <p className="text-xs text-(--text-muted) mt-0.5">
                Calibrate daily focus capacity, problem count, and weekly study commitment.
              </p>
            </div>

            {/* Daily Minutes Target */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide flex items-center justify-between">
                <span>Daily Practice Time</span>
                <span className="text-(--accent-lime) font-bold">{dailyMinutes} minutes / day</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {MINUTE_OPTIONS.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDailyMinutes(mins)}
                    className={cn(
                      "rounded-xl border py-2.5 text-xs font-semibold transition-all cursor-pointer",
                      dailyMinutes === mins
                        ? "border-(--accent-lime) bg-(--accent-lime)/15 text-(--accent-lime) font-bold"
                        : "border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-secondary) hover:text-(--text-primary)"
                    )}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>

            {/* Daily Problems Target */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide flex items-center justify-between">
                <span>Daily Problem Volume</span>
                <span className="text-(--accent-lime) font-bold">
                  {dailyProblems} {dailyProblems === 1 ? "problem" : "problems"} / session
                </span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PROBLEM_OPTIONS.map((opt) => (
                  <button
                    key={opt.count}
                    type="button"
                    onClick={() => setDailyProblems(opt.count)}
                    className={cn(
                      "rounded-xl border p-2.5 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5",
                      dailyProblems === opt.count
                        ? "border-(--accent-lime) bg-(--accent-lime)/15 text-(--accent-lime)"
                        : "border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-secondary) hover:text-(--text-primary)"
                    )}
                  >
                    <span className="text-xs font-bold">{opt.label}</span>
                    <span className="text-[10px] text-(--text-muted)">{opt.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Study Days per Week */}
            <div className="space-y-2.5 pt-1">
              <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide flex items-center justify-between">
                <span>Weekly Study Schedule</span>
                <span className="text-xs text-(--text-muted)">
                  {studyDaysPerWeek === 7 ? "All 7 Days" : `${studyDaysPerWeek} Days / Week`}
                </span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStudyDaysPerWeek(7);
                    setSelectedWeekdays([1, 2, 3, 4, 5, 6, 0]);
                  }}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                    studyDaysPerWeek === 7
                      ? "border-(--accent-lime) bg-(--accent-lime)/15 text-(--accent-lime)"
                      : "border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-secondary)"
                  )}
                >
                  Every Day (7d)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStudyDaysPerWeek(5);
                    setSelectedWeekdays([1, 2, 3, 4, 5]);
                  }}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                    studyDaysPerWeek === 5
                      ? "border-(--accent-lime) bg-(--accent-lime)/15 text-(--accent-lime)"
                      : "border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-secondary)"
                  )}
                >
                  Weekdays Only (5d)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStudyDaysPerWeek(6);
                    setSelectedWeekdays([1, 2, 3, 4, 5, 6]);
                  }}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                    studyDaysPerWeek === 6
                      ? "border-(--accent-lime) bg-(--accent-lime)/15 text-(--accent-lime)"
                      : "border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-secondary)"
                  )}
                >
                  6 Days (Mon–Sat)
                </button>
              </div>

              {/* Day Tokens */}
              <div className="flex items-center gap-1.5 pt-1">
                {DAYS_OF_WEEK.map((day) => {
                  const isDayActive = selectedWeekdays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleWeekday(day.id)}
                      className={cn(
                        "size-8 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center justify-center",
                        isDayActive
                          ? "border-(--accent-lime) bg-(--accent-lime)/20 text-(--accent-lime)"
                          : "border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-muted) hover:text-(--text-primary)"
                      )}
                      title={day.full}
                    >
                      {day.label[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Interview Date */}
            <div className="space-y-2 pt-1 border-t border-(--border-subtle)/60">
              <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide flex items-center justify-between">
                <span>Target / Interview Date (Optional)</span>
                <span className="text-[11px] text-(--text-muted)">Guides schedule pace</span>
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="date"
                  value={targetInterviewDate}
                  onChange={(e) => setTargetInterviewDate(e.target.value)}
                  className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) px-3 py-2 text-xs text-(--text-primary) focus:border-(--accent-lime) focus:outline-none"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(Date.now() + 30 * 86400000);
                      setTargetInterviewDate(d.toISOString().slice(0, 10));
                    }}
                    className="rounded-lg border border-(--border-subtle) bg-(--bg-surface-raised) px-2.5 py-1.5 text-[11px] font-medium text-(--text-secondary) hover:text-(--text-primary)"
                  >
                    +30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(Date.now() + 60 * 86400000);
                      setTargetInterviewDate(d.toISOString().slice(0, 10));
                    }}
                    className="rounded-lg border border-(--border-subtle) bg-(--bg-surface-raised) px-2.5 py-1.5 text-[11px] font-medium text-(--text-secondary) hover:text-(--text-primary)"
                  >
                    +60 Days
                  </button>
                  {targetInterviewDate && (
                    <button
                      type="button"
                      onClick={() => setTargetInterviewDate("")}
                      className="text-xs text-(--text-muted) hover:text-red-400 px-1"
                      title="Clear date"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* GROUP 2: LEARNING FOCUS */}
          <div className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-6 space-y-5 shadow-sm">
            <div className="border-b border-(--border-subtle)/60 pb-3">
              <h3 className="text-base font-bold text-(--text-primary) flex items-center gap-2">
                <Target className="size-4 text-(--accent-lime)" />
                <span>Learning Focus</span>
              </h3>
              <p className="text-xs text-(--text-muted) mt-0.5">
                Target topic curriculum, interview objective, and programming language.
              </p>
            </div>

            {/* Compact Selected Focus Control (Replaces Giant Grid) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide flex items-center justify-between">
                <span>Primary Focus Topic</span>
                <span className="text-[11px] text-(--text-muted)">Drives daily syllabus problems</span>
              </label>

              <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="size-10 rounded-xl bg-(--accent-lime)/15 border border-(--accent-lime)/30 flex items-center justify-center shrink-0 text-(--accent-lime) mt-0.5 sm:mt-0">
                    <Layers className="size-5" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-(--text-primary)">
                        {selectedTopic?.displayName || primaryTopicSlug}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-(--bg-surface) text-(--text-muted) border border-(--border-subtle)">
                        {selectedTopic?.category?.replace("_", " ") || "Topic"}
                      </span>
                    </div>
                    <p className="text-xs text-(--text-secondary) line-clamp-1">
                      {selectedTopic?.description || "Core invariant modeling and pattern recognition tasks."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTopicSelectorOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-(--border-subtle) bg-(--bg-surface) px-3.5 py-2 text-xs font-semibold text-(--text-primary) hover:border-(--accent-lime)/40 hover:text-(--accent-lime) transition-all shrink-0 cursor-pointer self-end sm:self-center"
                >
                  <Search className="size-3.5" />
                  <span>Change Topic...</span>
                </button>
              </div>
            </div>

            {/* Primary Goal */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">
                Target Milestone Goal
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {GOAL_OPTIONS.map((goal) => (
                  <button
                    key={goal.value}
                    type="button"
                    onClick={() => setLearningGoal(goal.value as any)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all cursor-pointer space-y-0.5",
                      learningGoal === goal.value
                        ? "border-(--accent-lime) bg-(--accent-lime)/15"
                        : "border-(--border-subtle) bg-(--bg-surface-raised) hover:border-(--border-subtle)/80"
                    )}
                  >
                    <div
                      className={cn(
                        "text-xs font-bold",
                        learningGoal === goal.value ? "text-(--accent-lime)" : "text-(--text-primary)"
                      )}
                    >
                      {goal.label}
                    </div>
                    <div className="text-[11px] text-(--text-muted) leading-tight">{goal.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">
                Programming Language
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <button
                    key={lang.value}
                    type="button"
                    onClick={() => setLanguage(lang.value as any)}
                    className={cn(
                      "rounded-xl border p-2.5 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5",
                      language === lang.value
                        ? "border-(--accent-lime) bg-(--accent-lime)/15 text-(--accent-lime)"
                        : "border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-secondary) hover:text-(--text-primary)"
                    )}
                  >
                    <span className="text-xs font-bold">{lang.label}</span>
                    <span className="text-[10px] text-(--text-muted)">{lang.tag}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* GROUP 3: CURRENT LEVEL & DIFFICULTY */}
          <div className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-6 space-y-5 shadow-sm">
            <div className="border-b border-(--border-subtle)/60 pb-3">
              <h3 className="text-base font-bold text-(--text-primary) flex items-center gap-2">
                <Sliders className="size-4 text-(--accent-lime)" />
                <span>Current Level & Difficulty</span>
              </h3>
              <p className="text-xs text-(--text-muted) mt-0.5">
                Tune starting problem difficulty and pedagogical scaffolding.
              </p>
            </div>

            {/* Experience Level */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">
                Current Skill Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {LEVEL_OPTIONS.map((lvl) => (
                  <button
                    key={lvl.value}
                    type="button"
                    onClick={() => setExperienceLevel(lvl.value)}
                    className={cn(
                      "rounded-xl border p-3.5 text-left transition-all space-y-1 cursor-pointer",
                      experienceLevel === lvl.value
                        ? "border-(--accent-lime) bg-(--accent-lime)/15"
                        : "border-(--border-subtle) bg-(--bg-surface-raised) hover:border-(--border-subtle)/80"
                    )}
                  >
                    <div
                      className={cn(
                        "text-xs font-bold",
                        experienceLevel === lvl.value ? "text-(--accent-lime)" : "text-(--text-primary)"
                      )}
                    >
                      {lvl.label}
                    </div>
                    <div className="text-[11px] text-(--text-muted) leading-tight">{lvl.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Preference */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">
                Progression Curve
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {DIFFICULTY_OPTIONS.map((diff) => (
                  <button
                    key={diff.value}
                    type="button"
                    onClick={() => setDifficultyPreference(diff.value as any)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all space-y-1 cursor-pointer",
                      difficultyPreference === diff.value
                        ? "border-(--accent-lime) bg-(--accent-lime)/15"
                        : "border-(--border-subtle) bg-(--bg-surface-raised) hover:border-(--border-subtle)/80"
                    )}
                  >
                    <div
                      className={cn(
                        "text-xs font-bold",
                        difficultyPreference === diff.value ? "text-(--accent-lime)" : "text-(--text-primary)"
                      )}
                    >
                      {diff.label}
                    </div>
                    <div className="text-[11px] text-(--text-muted) leading-tight">{diff.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── PROGRESSIVE DISCLOSURE: ADVANCED SCHEDULING & CATCH-UP POLICY ── */}
          <div className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface) shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setIsAdvancedSchedulingOpen((prev) => !prev)}
              className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-(--bg-surface-raised)/40 transition-colors cursor-pointer"
            >
              <div className="space-y-0.5">
                <div className="text-sm font-bold text-(--text-primary) flex items-center gap-2">
                  <CalendarDays className="size-4 text-sky-400" />
                  <span>Advanced Scheduling & Catch-Up Policy</span>
                </div>
                <p className="text-xs text-(--text-secondary)">
                  Missed-day recovery rules, blackout dates, and timezone handling.
                </p>
              </div>
              <div className="p-1 rounded-lg border border-(--border-subtle) bg-(--bg-surface-raised)">
                {isAdvancedSchedulingOpen ? (
                  <ChevronUp className="size-4 text-(--text-secondary)" />
                ) : (
                  <ChevronDown className="size-4 text-(--text-secondary)" />
                )}
              </div>
            </button>

            {isAdvancedSchedulingOpen && (
              <div className="p-6 pt-0 space-y-5 border-t border-(--border-subtle)/60">
                {/* Missed-Day Catch-Up Preference */}
                <div className="space-y-2 pt-4">
                  <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">
                    Missed-Day Catch-Up Strategy
                  </label>
                  <div className="space-y-2">
                    <div
                      onClick={() => setCatchUpPreference("rebalance_forward")}
                      className={cn(
                        "rounded-xl border p-3 transition-all cursor-pointer",
                        catchUpPreference === "rebalance_forward"
                          ? "border-(--accent-lime) bg-(--accent-lime)/10 text-(--text-primary)"
                          : "border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-secondary)"
                      )}
                    >
                      <div className="text-xs font-bold text-(--accent-lime)">
                        Rebalance Forward (Recommended)
                      </div>
                      <div className="text-[11px] text-(--text-muted) mt-0.5">
                        Pushes upcoming deadlines forward. Keeps your daily minute target constant to avoid burnout.
                      </div>
                    </div>

                    <div
                      onClick={() => setCatchUpPreference("accelerate")}
                      className={cn(
                        "rounded-xl border p-3 transition-all cursor-pointer",
                        catchUpPreference === "accelerate"
                          ? "border-(--accent-lime) bg-(--accent-lime)/10 text-(--text-primary)"
                          : "border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-secondary)"
                      )}
                    >
                      <div className="text-xs font-bold text-(--text-primary)">
                        Compress & Catch Up
                      </div>
                      <div className="text-[11px] text-(--text-muted) mt-0.5">
                        Temporarily adds +1 problem to upcoming days to preserve the original completion date.
                      </div>
                    </div>

                    <div
                      onClick={() => setCatchUpPreference("buffer_day")}
                      className={cn(
                        "rounded-xl border p-3 transition-all cursor-pointer",
                        catchUpPreference === "buffer_day"
                          ? "border-(--accent-lime) bg-(--accent-lime)/10 text-(--text-primary)"
                          : "border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-secondary)"
                      )}
                    >
                      <div className="text-xs font-bold text-(--text-primary)">
                        Buffer Day Absorption
                      </div>
                      <div className="text-[11px] text-(--text-muted) mt-0.5">
                        Reserves Day 7 & 14 checkpoints as catch-up buffers to resolve pending tasks without shifting milestones.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Unavailable Dates / Blackouts */}
                <div className="space-y-2 pt-2 border-t border-(--border-subtle)/60">
                  <label className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide flex items-center justify-between">
                    <span>Unavailable Dates / Study Blackouts</span>
                    <span className="text-[11px] text-(--text-muted)">Exams, travel, or rest days</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={newBlackoutDate}
                      onChange={(e) => setNewBlackoutDate(e.target.value)}
                      className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) px-3 py-2 text-xs text-(--text-primary) focus:border-(--accent-lime) focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddBlackoutDate}
                      disabled={!newBlackoutDate}
                      className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) px-3.5 py-2 text-xs font-semibold text-(--text-primary) hover:border-(--accent-lime)/40 disabled:opacity-50"
                    >
                      Add Blackout
                    </button>
                  </div>

                  {unavailableDates.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {unavailableDates.map((date) => (
                        <span
                          key={date}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-subtle) bg-(--bg-surface-raised) px-2.5 py-1 text-xs text-(--text-secondary)"
                        >
                          <Calendar className="size-3 text-(--accent-lime)" />
                          <span>{date}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveBlackoutDate(date)}
                            className="text-(--text-muted) hover:text-red-400"
                            aria-label={`Remove blackout date ${date}`}
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── SECONDARY PLAN CONTROLS & DANGER ZONE (MOVED AWAY FROM HERO) ── */}
          <div className="space-y-4 pt-2">
            {/* Secondary Lifecycle Controls */}
            {!isStopped && (
              <div className="rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-5 sm:p-6 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-(--text-muted)">
                  Schedule Controls
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-(--text-primary)">
                      {isActive ? "Pause Active Cycle" : "Resume Frozen Schedule"}
                    </h4>
                    <p className="text-xs text-(--text-secondary) mt-0.5">
                      {isActive
                        ? "Pausing temporarily freezes countdown timers for exams, vacations, or busy weeks without losing progress."
                        : `Paused at Day ${activeDayIndex}. Unpause whenever you are ready to resume.`}
                    </p>
                  </div>

                  {isActive ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handlePause("manual")}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all shrink-0 cursor-pointer"
                    >
                      <Pause className="size-3.5" />
                      <span>Pause Plan</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleResume}
                      className="inline-flex items-center gap-2 rounded-xl bg-(--accent-lime) px-4 py-2 text-xs font-bold text-black hover:bg-(--accent-lime-hover) transition-all shrink-0 cursor-pointer shadow-sm"
                    >
                      <Play className="size-3.5 fill-black" />
                      <span>Resume Plan</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Danger Zone */}
            {!isStopped && (
              <div className="rounded-2xl border border-red-500/30 bg-red-950/10 p-5 sm:p-6 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-400">
                  <ShieldAlert className="size-4" />
                  <span>Danger Zone</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-red-300">
                      End Structured Learning Plan
                    </h4>
                    <p className="text-xs text-red-200/70 mt-0.5 max-w-md">
                      Permanently terminates Cycle {plan?.cycleNumber || 1} and transitions workspace to Self-Paced Practice.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setShowStopModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/20 px-3.5 py-2 text-xs font-bold text-red-300 hover:bg-red-500/30 transition-all shrink-0 cursor-pointer self-start sm:self-center"
                  >
                    <Square className="size-3.5 fill-red-400" />
                    <span>Stop Plan</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: STICKY LIVE PLAN IMPACT PREVIEW (5 COLS) ── */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          <div className="rounded-2xl border border-(--accent-lime)/30 bg-(--bg-surface) p-6 space-y-5 shadow-lg">
            {/* Preview Header */}
            <div className="flex items-center justify-between border-b border-(--border-subtle)/60 pb-3">
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-(--accent-lime) flex items-center gap-1.5">
                  <Sparkles className="size-3" />
                  <span>Live Plan Impact</span>
                </div>
                <h3 className="text-base font-bold text-(--text-primary)">
                  Schedule Impact Preview
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                {isPreviewLoading ? (
                  <span className="text-[11px] text-(--accent-lime) animate-pulse font-mono">
                    Recalculating...
                  </span>
                ) : (
                  <span className="rounded-full bg-(--accent-lime)/15 border border-(--accent-lime)/30 px-2 py-0.5 text-[10px] font-bold text-(--accent-lime)">
                    Real-time
                  </span>
                )}
              </div>
            </div>

            {/* REAL BEFORE → AFTER DIFFS */}
            <div className="space-y-3">
              {/* 1. Cycle Duration Diff */}
              <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) p-3.5 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                    Cycle Duration
                  </div>
                  <div className="font-bold text-(--text-primary) text-sm mt-0.5">
                    {previewResult?.proposedBlueprint?.totalDays || plan?.totalDays || 18} Days Total
                  </div>
                  <div className="text-[11px] text-(--text-muted)">
                    Current: {plan?.totalDays || 18} days
                  </div>
                </div>
                <div className="text-right">
                  {previewResult?.diff?.durationDiff !== undefined && previewResult.diff.durationDiff !== 0 ? (
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[11px] font-bold",
                        previewResult.diff.durationDiff > 0
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-teal-500/20 text-teal-300"
                      )}
                    >
                      {previewResult.diff.durationDiff > 0
                        ? `+${previewResult.diff.durationDiff}d`
                        : `${previewResult.diff.durationDiff}d`}
                    </span>
                  ) : (
                    <span className="text-[11px] text-(--text-muted)">Unchanged</span>
                  )}
                </div>
              </div>

              {/* 2. Daily Pace Diff */}
              <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) p-3.5 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                    Daily Pace & Time
                  </div>
                  <div className="font-bold text-(--text-primary) text-sm mt-0.5">
                    {dailyMinutes}m / session
                  </div>
                  <div className="text-[11px] text-(--text-muted)">
                    Current: {initialMinutes}m/session
                  </div>
                </div>
                <div className="text-right">
                  {dailyMinutes !== initialMinutes ? (
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[11px] font-bold",
                        dailyMinutes > initialMinutes
                          ? "bg-teal-500/20 text-teal-300"
                          : "bg-amber-500/20 text-amber-300"
                      )}
                    >
                      {dailyMinutes > initialMinutes
                        ? `+${dailyMinutes - initialMinutes}m`
                        : `${dailyMinutes - initialMinutes}m`}
                    </span>
                  ) : (
                    <span className="text-[11px] text-(--text-muted)">Unchanged</span>
                  )}
                </div>
              </div>

              {/* 3. Daily Problem Target Diff */}
              <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) p-3.5 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                    Daily Problem Volume
                  </div>
                  <div className="font-bold text-(--text-primary) text-sm mt-0.5">
                    {dailyProblems} {dailyProblems === 1 ? "problem" : "problems"} / day
                  </div>
                  <div className="text-[11px] text-(--text-muted)">
                    Current: {initialProblems} prob/day
                  </div>
                </div>
                <div className="text-right">
                  {dailyProblems !== initialProblems ? (
                    <span className="rounded px-2 py-0.5 text-[11px] font-bold bg-teal-500/20 text-teal-300">
                      {dailyProblems > initialProblems ? `+${dailyProblems - initialProblems}` : dailyProblems - initialProblems} prob
                    </span>
                  ) : (
                    <span className="text-[11px] text-(--text-muted)">Unchanged</span>
                  )}
                </div>
              </div>

              {/* 4. Milestones & Checkpoint Movement */}
              <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) p-3.5 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                    Checkpoint Gates
                  </div>
                  <div className="font-bold text-(--text-primary) text-sm mt-0.5">
                    {previewResult?.proposedBlueprint?.stages?.length || 3} Milestone Stages
                  </div>
                  <div className="text-[11px] text-(--text-muted)">
                    Gates at: Days {proposedCheckpointDays.slice(0, 3).join(", ")}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-sky-400 font-semibold">
                    Spaced Review
                  </span>
                </div>
              </div>

              {/* 5. Progress Continuity Guarantee */}
              <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3.5 flex items-start gap-2.5 text-xs">
                <CheckCircle2 className="size-4 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-teal-300">
                    Progress Continuity Guaranteed
                  </div>
                  <p className="text-[11px] text-(--text-secondary) mt-0.5 leading-relaxed">
                    All historical problem solves, streaks, and XP remain 100% preserved. Calibration modifies only upcoming session workload.
                  </p>
                </div>
              </div>

              {/* Topic Switch Notice (if topic changed) */}
              {previewResult?.diff?.topicChanged && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-2.5 text-xs">
                  <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-300">
                      Topic Focus Shift
                    </div>
                    <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                      You are changing focus to <strong>{selectedTopic.displayName}</strong>. Your mastery in previously practiced topics will remain in your profile.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* DYNAMIC APPLY CTA BUTTON */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                disabled={changesCount === 0 || isPending || isPreviewLoading}
                onClick={handleApplyRecalibration}
                className={cn(
                  "w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all shadow-md cursor-pointer",
                  changesCount > 0 && !isPending && !isPreviewLoading
                    ? "bg-(--accent-lime) text-black hover:bg-(--accent-lime-hover) active:scale-[0.99]"
                    : "bg-(--bg-surface-raised) text-(--text-muted) border border-(--border-subtle) opacity-60 cursor-not-allowed"
                )}
              >
                <span>
                  {changesCount === 0
                    ? "No Changes to Apply"
                    : isPending
                    ? "Applying Changes..."
                    : `Apply ${changesCount} Change${changesCount > 1 ? "s" : ""}`}
                </span>
                <ArrowRight className="size-4" />
              </button>

              <p className="text-center text-[11px] text-(--text-muted)">
                {changesCount > 0
                  ? `Recalibrates Today board, 7-day schedule, and milestone map immediately.`
                  : "Change any setting on the left to recalculate and apply."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── SEARCHABLE TOPIC SELECTOR MODAL ── */}
      {isTopicSelectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl border border-(--border-subtle) bg-(--bg-surface) shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-(--border-subtle) flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-(--text-primary) flex items-center gap-2">
                  <Search className="size-4 text-(--accent-lime)" />
                  <span>Select Curriculum Focus Topic</span>
                </h3>
                <p className="text-xs text-(--text-muted) mt-0.5">
                  Choose from {CANONICAL_TOPIC_CATALOG.length} canonical DSA tracks.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTopicSelectorOpen(false)}
                className="p-1.5 rounded-lg border border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-muted) hover:text-(--text-primary) cursor-pointer"
                aria-label="Close topic selector"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Search Input & Category Filters */}
            <div className="p-4 border-b border-(--border-subtle)/60 space-y-3 bg-(--bg-surface-raised)/30">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search topics by name, concept, or pattern..."
                  value={topicSearchQuery}
                  onChange={(e) => setTopicSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border border-(--border-subtle) bg-(--bg-surface) pl-9 pr-9 py-2 text-xs text-(--text-primary) placeholder:text-(--text-muted) focus:border-(--accent-lime) focus:outline-none"
                />
                {topicSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTopicSearchQuery("")}
                    className="absolute right-3 top-2.5 text-(--text-muted) hover:text-(--text-primary)"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {[
                  { id: "all", label: "All Topics" },
                  { id: "core_structures", label: "Core Structures" },
                  { id: "algorithmic_patterns", label: "Algorithmic Patterns" },
                  { id: "advanced", label: "Advanced Topics" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedTopicCategory(cat.id)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer",
                      selectedTopicCategory === cat.id
                        ? "bg-(--accent-lime)/15 text-(--accent-lime) border border-(--accent-lime)/30"
                        : "bg-(--bg-surface) text-(--text-muted) border border-(--border-subtle) hover:text-(--text-primary)"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtered Topics Grid */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1 max-h-[50vh]">
              {filteredTopics.length === 0 ? (
                <div className="py-12 text-center text-xs text-(--text-muted) space-y-1">
                  <div className="font-semibold text-(--text-primary)">No matching topics found</div>
                  <div>Try searching for arrays, trees, dynamic programming, or sliding window.</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredTopics.map((topic) => {
                    const isSelected = primaryTopicSlug === topic.slug;
                    return (
                      <button
                        key={topic.slug}
                        type="button"
                        onClick={() => {
                          setPrimaryTopicSlug(topic.slug);
                          setIsTopicSelectorOpen(false);
                        }}
                        className={cn(
                          "rounded-xl border p-3.5 text-left transition-all cursor-pointer flex flex-col justify-between gap-1",
                          isSelected
                            ? "border-(--accent-lime) bg-(--accent-lime)/15 ring-1 ring-(--accent-lime)/40"
                            : "border-(--border-subtle) bg-(--bg-surface-raised) hover:border-(--border-subtle)/90"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "text-xs font-bold",
                              isSelected ? "text-(--accent-lime)" : "text-(--text-primary)"
                            )}
                          >
                            {topic.displayName}
                          </span>
                          {isSelected && (
                            <Check className="size-3.5 text-(--accent-lime) shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-(--text-muted) line-clamp-2 leading-relaxed">
                          {topic.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-(--border-subtle) bg-(--bg-surface-raised)/40 flex items-center justify-between text-xs">
              <span className="text-[11px] text-(--text-muted)">
                Selected: <strong className="text-(--accent-lime)">{selectedTopic.displayName}</strong>
              </span>
              <button
                type="button"
                onClick={() => setIsTopicSelectorOpen(false)}
                className="rounded-lg border border-(--border-subtle) bg-(--bg-surface) px-3 py-1.5 text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary)"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STOP PLAN CONFIRMATION MODAL ── */}
      {showStopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-(--bg-surface) p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 shrink-0">
                <AlertTriangle className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-(--text-primary)">
                  Stop Structured Plan?
                </h3>
                <p className="text-xs text-(--text-secondary) leading-relaxed">
                  Stopping your plan permanently terminates Cycle {plan?.cycleNumber || 1}. You will transition into <strong>Self-Paced Practice Mode</strong>.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300 space-y-1.5">
              <div className="font-semibold text-amber-200">
                Important Difference from Pausing:
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-300/90 pl-1">
                <li><strong>Pause</strong>: Freezes your countdown so you can resume Day {activeDayIndex} later.</li>
                <li><strong>Stop</strong>: Retires this cycle completely. You cannot resume from Day {activeDayIndex}. Restarting requires creating a new cycle from scratch.</li>
                <li>All problems you have already solved remain safely recorded in your profile.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowStopModal(false)}
                className="rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) px-4 py-2.5 text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary) transition-all cursor-pointer"
              >
                Keep Plan Active
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmStop}
                className="rounded-xl bg-red-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-600 transition-all shadow-md cursor-pointer"
              >
                Confirm & Stop Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

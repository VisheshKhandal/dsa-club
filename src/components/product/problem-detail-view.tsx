"use client";

import { useState, useTransition, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  ExternalLink,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { DifficultyBadge, EmptySlate, Surface } from "@/components/product/ui";
import { ProgressiveHintLadder } from "@/components/product/progressive-hint-ladder";
import { ThinkingDirectionView } from "@/components/product/thinking-direction-view";
import { DryRunStepper } from "@/components/learning/dry-run-stepper";
import { normalizeProblemContent } from "@/components/product/problem-content-normalizer";
import { ProblemAIDrawer } from "@/components/product/problem-ai-drawer";
import { ProblemWorkspaceHeader } from "@/components/product/problem-workspace-header";
import {
  recordProblemPatternRecognitionAction,
  recordProblemAttemptAction,
  saveReflectionAction,
  recordProblemOpenAction,
  recordHintRevealedAction,
  getOrCreatePracticeSessionAction,
  startFreshAttemptAction,
  updateSessionTimerAction,
  getCommandReceiptAction,
} from "@/features/product/actions/product.actions";
import { cn } from "@/lib/utils";
import type { LearningPathContext } from "@/features/learning-paths/types/learning-path-continuity.types";
import { LearningPathContextBar } from "@/components/product/learning-path-context-bar";
import { useLearnerSync } from "@/components/sync/learner-sync-context";

export type ProblemDetail = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  thinkingDirection?: string;
  dryRunPrompt?: string;
  hints?: Array<{ level: number; title: string; content: string }>;
  commonMistakes?: string[];
  source?: string;
  sourceUrl?: string;
  difficulty?: string;
  pattern?: string;
  patternDetail?: {
    id: string;
    slug: string;
    name: string;
    description?: string;
    whenToUse?: string;
    mentalModel?: string;
    variations?: string[];
    signalKeywords?: string[];
  } | null;
  allPatterns?: Array<{ id: string; name: string; slug: string }>;
  expectedPatternIds?: string[];
  latestRecognition?: {
    isCorrect: boolean;
    selectedPatternName?: string;
    reasoning?: string;
    signalIdentified?: string;
    recognitionScore?: number;
    masteryScore?: number;
    trend?: string;
    createdAt?: string;
  } | null;
  confidence?: number;
  status?: string;
  durationSeconds?: number;
  codeLanguage?: string;
  perceivedDifficulty?: number;
  strategy?: string;
  hintsUsed?: number;
  lastAttemptAt?: string;
  bookmarked?: boolean;
  topics?: string[];
  companies?: string[];
  tags?: string[];
  estimatedMinutes?: number;
  reflection?: string;
  reflectionRating?: number;
  learningGoal?: string;
};

export interface ProblemDetailViewProps {
  problem: ProblemDetail | null | undefined;
  nextProblem?: ProblemDetail | null;
  learningPathContext?: LearningPathContext | null;
}

type PhaseId = 1 | 2 | 3 | 4;

const PHASES: Array<{ id: PhaseId; label: string; shortLabel: string; description: string }> = [
  { id: 1, label: "Phase 1 — Think", shortLabel: "1. Think", description: "Reasoning roadmap & hypothesis" },
  { id: 2, label: "Phase 2 — Confirm", shortLabel: "2. Confirm", description: "Verify invariant & hints" },
  { id: 3, label: "Phase 3 — Solve", shortLabel: "3. Solve", description: "External implementation" },
  { id: 4, label: "Phase 4 — Reflect", shortLabel: "4. Reflect", description: "Log takeaways & metrics" },
];

export function ProblemDetailView({
  problem,
  nextProblem,
  learningPathContext,
}: ProblemDetailViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFromPlanQuery = searchParams?.get("from") === "plan" || searchParams?.get("source") === "plan";
  const [isFromPlan, setIsFromPlan] = useState<boolean>(isFromPlanQuery);
  const [isRedirectingToPlan, setIsRedirectingToPlan] = useState<boolean>(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isFromPlanQuery) {
      setIsFromPlan(true);
      try {
        if (problem?.id) sessionStorage.setItem(`from_plan_${problem.id}`, "1");
      } catch {}
    } else if (typeof window !== "undefined" && problem?.id) {
      try {
        if (
          sessionStorage.getItem(`from_plan_${problem.id}`) === "1" ||
          document.referrer.includes("/intelligence") ||
          document.referrer.includes("/plan")
        ) {
          setIsFromPlan(true);
        }
      } catch {}
    }
  }, [isFromPlanQuery, problem?.id]);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  // State derived from initial data
  const initialRecognition = problem?.latestRecognition;
  const initialAttemptSaved = Boolean(
    (problem?.status && problem.status !== "not_started") || problem?.reflection
  );

  // Recognition state
  const [recognitionResult, setRecognitionResult] = useState<any>(initialRecognition || null);
  const hasRecognition = Boolean(recognitionResult);

  // Determine initial phase:
  // - If attempt already recorded: start on Phase 4 (reviewed/completed)
  // - If pattern already recognized: start on Phase 2 (or 3)
  // - Else: start on Phase 1
  const [activePhase, setActivePhase] = useState<PhaseId>(() => {
    if (initialAttemptSaved) return 4;
    if (initialRecognition) return 2;
    return 1;
  });

  // Highest unlocked phase
  const maxUnlockedPhase = useMemo<PhaseId>(() => {
    if (initialAttemptSaved) return 4;
    if (hasRecognition) return 3;
    return 1;
  }, [initialAttemptSaved, hasRecognition]);

  // Persistent Practice Session & Command Identity
  const [practiceSessionId, setPracticeSessionId] = useState<string | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [currentAttemptNumber, setCurrentAttemptNumber] = useState<number>(1);
  const [hasPriorExposure, setHasPriorExposure] = useState<boolean>(false);
  const [commandId, setCommandId] = useState<string>(() => {
    if (typeof window !== "undefined" && problem?.id) {
      try {
        const stored = sessionStorage.getItem(`inflight_cmd_${problem.id}`);
        if (stored) return stored;
      } catch {}
    }
    const newId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    if (typeof window !== "undefined" && problem?.id) {
      try {
        sessionStorage.setItem(`inflight_cmd_${problem.id}`, newId);
      } catch {}
    }
    return newId;
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedReceipt, setSavedReceipt] = useState<any>(null);
  const [isFreshAttemptPending, startFreshAttemptTransition] = useTransition();
  const { broadcastUpdate } = useLearnerSync();

  // Hints state
  const [hintsRevealed, setHintsRevealed] = useState<number>(problem?.hintsUsed || 0);

  // Stopwatch state
  const [timerSeconds, setTimerSeconds] = useState<number>(problem?.durationSeconds || 0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Resume or create persistent practice session on mount
  useEffect(() => {
    if (!problem?.id) return;
    let isCancelled = false;

    async function initSession() {
      try {
        // Check if an in-flight command already completed in the background
        if (typeof window !== "undefined") {
          try {
            const storedCmd = sessionStorage.getItem(`inflight_cmd_${problem!.id}`);
            if (storedCmd) {
              const receiptRes = (await getCommandReceiptAction(storedCmd)) as any;
              if (receiptRes?.ok && receiptRes?.receipt) {
                setSavedReceipt(receiptRes.receipt);
                setIsAttemptSaved(true);
                setActivePhase(4);
                sessionStorage.removeItem(`inflight_cmd_${problem!.id}`);
              }
            }
          } catch {}
        }

        const planTaskId = searchParams?.get("planTaskId") || undefined;
        const planDayId = searchParams?.get("planDayId") || undefined;
        const planId = searchParams?.get("planId") || undefined;
        const res = await getOrCreatePracticeSessionAction({
          problemId: problem!.id,
          planTaskId,
          planDayId,
          planId,
          sourceSurface: isFromPlan ? "plan" : "workspace",
        });
        if (isCancelled || !res?.ok || !res?.session) return;
        const sess = res.session as any;
        setPracticeSessionId(sess.sessionId || sess._id);
        if (sess.activeAttemptId) {
          setActiveAttemptId(String(sess.activeAttemptId));
        }
        const attemptNum = sess.activeAttemptNumber ?? sess.currentAttemptNumber;
        if (attemptNum) {
          setCurrentAttemptNumber(Number(attemptNum));
        }
        const priorExp = sess.hasPriorExposure ?? sess.priorExposure;
        if (typeof priorExp === "boolean") {
          setHasPriorExposure(priorExp);
        }
        if (Array.isArray(sess.hintsRevealedLevels) && sess.hintsRevealedLevels.length > 0) {
          setHintsRevealed((prev) => Math.max(prev, sess.hintsRevealedLevels.length));
        }
        if (sess.timerState) {
          const accumulated = Number(sess.timerState.accumulatedSeconds || 0);
          if (sess.timerState.isRunning && sess.timerState.lastStartedAt) {
            const elapsedSince = Math.max(
              0,
              Math.floor((Date.now() - new Date(sess.timerState.lastStartedAt).getTime()) / 1000)
            );
            setTimerSeconds(accumulated + elapsedSince);
            setIsTimerRunning(true);
          } else if (accumulated > 0) {
            setTimerSeconds((prev) => (prev > 0 ? prev : accumulated));
          }
        }
      } catch {
        // Fallback gracefully without breaking view
      }
    }
    initSession();
    return () => {
      isCancelled = true;
    };
  }, [problem?.id, isFromPlan, searchParams]);

  // Deliberate problem open tracking with stable session semantics (never fires from prefetch/rerenders)
  useEffect(() => {
    if (!problem?.id) return;
    try {
      const storageKey = `problem_opened_${problem.id}`;
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, "1");
      const sessionId = sessionStorage.getItem("dsa_session_id") || undefined;
      recordProblemOpenAction({ problemId: problem.id, sessionId }).catch(() => {});
    } catch {
      // sessionStorage unavailable
    }
  }, [problem?.id]);

  // Attempt form state
  const [attemptOutcome, setAttemptOutcome] = useState<"solved" | "started" | "abandoned">(
    problem?.status === "solved" ? "solved" : "solved"
  );
  const [attemptConfidence, setAttemptConfidence] = useState<number>(
    problem?.confidence ? Math.round(problem.confidence / 20) : 4
  );
  const [attemptInsight, setAttemptInsight] = useState<string>(problem?.reflection || "");
  const [isAttemptSaved, setIsAttemptSaved] = useState<boolean>(initialAttemptSaved);
  const [savedAttemptData, setSavedAttemptData] = useState<any>(
    initialAttemptSaved
      ? {
          status: problem?.status || "solved",
          confidence: problem?.confidence ? Math.round(problem.confidence / 20) : 4,
          reflection: problem?.reflection || "",
          hintsUsed: problem?.hintsUsed || 0,
          durationSeconds: problem?.durationSeconds || 0,
        }
      : null
  );

  // Transitions
  const [isRecognitionPending, startRecognitionTransition] = useTransition();
  const [isAttemptPending, startAttemptTransition] = useTransition();

  // Pattern prediction inputs
  const [selectedPatternId, setSelectedPatternId] = useState<string>("");
  const [reasoning, setReasoning] = useState<string>("");
  const [signalIdentified, setSignalIdentified] = useState<string>("");
  const [recognitionError, setRecognitionError] = useState<string>("");

  // Collapsible supporting drawers in Phase 3
  const [isMistakesOpen, setIsMistakesOpen] = useState<boolean>(false);
  const [isDryRunOpen, setIsDryRunOpen] = useState<boolean>(false);
  const [isComplexityOpen, setIsComplexityOpen] = useState<boolean>(false);

  // AI Mentor Drawer open state
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState<boolean>(false);

  // Handle pattern recognition submission
  const handlePatternSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatternId) {
      setRecognitionError("Please select the pattern you believe applies.");
      return;
    }
    if (reasoning.trim().length < 5) {
      setRecognitionError("Please provide a brief reason (at least 5 characters).");
      return;
    }
    setRecognitionError("");

    startRecognitionTransition(async () => {
      try {
        const payload = {
          problemId: problem!.id,
          selectedPatternId,
          reasoning: reasoning.trim(),
          signalIdentified: signalIdentified.trim(),
          durationSeconds: timerSeconds,
        };
        const result = (await recordProblemPatternRecognitionAction(payload)) as any;
        const selectedPatternName =
          problem!.allPatterns?.find((p) => p.id === selectedPatternId)?.name || "Selected pattern";

        const recData = {
          isCorrect: Boolean(result?.isCorrect),
          selectedPatternName,
          reasoning: reasoning.trim(),
          signalIdentified: signalIdentified.trim(),
          recognitionScore: Number(result?.recognitionScore ?? 0),
          masteryScore: Number(result?.masteryScore ?? 0),
          trend: String(result?.trend ?? ""),
        };
        setRecognitionResult(recData);
        setActivePhase(2);
      } catch (err: any) {
        setRecognitionError(err.message || "Failed to save recognition. Please try again.");
      }
    });
  };

  // Start fresh attempt handler (cleans attempt-scoped hints while preserving prior exposure)
  const handleStartFreshAttempt = () => {
    startFreshAttemptTransition(async () => {
      try {
        if (!problem?.id) return;
        const res = await startFreshAttemptAction({
          problemId: problem.id,
          planTaskId: searchParams?.get("planTaskId") || undefined,
        });
        if (res.ok && res.session) {
          const sess = res.session as any;
          setPracticeSessionId(sess.sessionId || sess._id);
          setActiveAttemptId(sess.activeAttemptId ? String(sess.activeAttemptId) : null);
          const nextAttempt = sess.activeAttemptNumber || sess.currentAttemptNumber || (currentAttemptNumber + 1);
          setCurrentAttemptNumber(Number(nextAttempt));
          setHasPriorExposure(true);
          setHintsRevealed(0);
          setTimerSeconds(0);
          setIsTimerRunning(false);
          setAttemptOutcome("solved");
          setAttemptInsight("");
          setIsAttemptSaved(false);
          setSavedReceipt(null);
          setSaveError(null);
          const newCmd =
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          setCommandId(newCmd);
          if (typeof window !== "undefined" && problem?.id) {
            try {
              sessionStorage.setItem(`inflight_cmd_${problem.id}`, newCmd);
            } catch {}
          }
          setActivePhase(1);
        }
      } catch (err: any) {
        setSaveError(err.message || "Failed to start fresh attempt. Please try again.");
      }
    });
  };

  // Check save status using stable commandId (recovering from response loss)
  const handleCheckSaveStatus = async () => {
    try {
      const res = (await getCommandReceiptAction(commandId)) as any;
      if (res?.ok && res?.receipt) {
        setSavedReceipt(res.receipt);
        setIsAttemptSaved(true);
        setSaveError(null);
        setActivePhase(4);
      } else {
        setSaveError("No completed save found for this attempt yet. Click Retry Save to submit.");
      }
    } catch {
      setSaveError("Unable to verify receipt. Please check your connection and retry.");
    }
  };

  // Handle save attempt submission (atomic practice + reflection with honest duration provenance)
  const handleSaveAttempt = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaveError(null);
    startAttemptTransition(async () => {
      try {
        const strategy = hintsRevealed > 0 ? "hint_assisted" : "independent";
        const effectiveDuration = timerSeconds;
        const durationProvenance: "measured" | "reported" | "unknown" =
          timerSeconds > 0 ? "measured" : "unknown";

        const payload = {
          problemId: problem!.id,
          status: attemptOutcome,
          strategy,
          durationSeconds: effectiveDuration,
          durationProvenance,
          hintsUsed: hintsRevealed,
          hintsRevealedLevels: Array.from({ length: hintsRevealed }, (_, i) => i + 1),
          selfConfidence: attemptConfidence,
          perceivedDifficulty: 3,
          commandId,
          sessionId: practiceSessionId || undefined,
          planTaskId: searchParams?.get("planTaskId") || undefined,
          reflection: attemptInsight.trim().length >= 10 ? attemptInsight.trim() : undefined,
        };

        const res = (await recordProblemAttemptAction(payload)) as any;
        if (!res?.ok) {
          throw new Error(res?.error || "Failed to save attempt. Please verify or retry.");
        }
        if (typeof window !== "undefined" && problem?.id) {
          try {
            sessionStorage.removeItem(`inflight_cmd_${problem.id}`);
          } catch {}
        }
        const receipt = res?.receipt;
        setSavedReceipt(receipt || null);

        broadcastUpdate({
          type: "LEARNER_MUTATION_COMMITTED",
          commandId,
          entityType: "problem",
          entityId: problem!.id,
        });

        const savedData = {
          status: attemptOutcome,
          confidence: attemptConfidence,
          reflection: attemptInsight.trim(),
          hintsUsed: hintsRevealed,
          durationSeconds: effectiveDuration,
        };
        setSavedAttemptData(savedData);
        setIsAttemptSaved(true);
        setActivePhase(4);
      } catch (err: any) {
        setSaveError(
          err.message ||
            "Failed to save attempt. Your input has been safely preserved. Please click Retry Save."
        );
      }
    });
  };

  // Canonical normalized problem content pipeline
  const normalizedContent = useMemo(() => {
    return normalizeProblemContent({
      thinkingDirection: problem?.thinkingDirection,
      dryRunPrompt: problem?.dryRunPrompt,
      commonMistakes: problem?.commonMistakes,
    });
  }, [problem?.thinkingDirection, problem?.dryRunPrompt, problem?.commonMistakes]);

  if (!problem) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <EmptySlate title="Problem not found" description="This problem does not exist or has been unpublished." />
      </div>
    );
  }

  const sourceLabel =
    problem.source === "leetcode"
      ? "LeetCode"
      : problem.source === "geeksforgeeks"
      ? "GeeksforGeeks"
      : problem.source === "codeforces"
      ? "Codeforces"
      : "External Platform";

  const patternDetail = problem.patternDetail;
  const patternSlug = patternDetail?.slug || problem.pattern?.toLowerCase().replace(/\s+/g, "-") || "";

  return (
    <div className="min-w-0 w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto space-y-7 pb-12 break-words text-(--color-text-primary)">
      {/* ── Path Continuity Context Layer ── */}
      {learningPathContext && (
        <LearningPathContextBar context={learningPathContext} className="mb-1" />
      )}

      {/* ── Compact & Intentional Problem Header ── */}
      <ProblemWorkspaceHeader
        problemId={problem.id}
        title={problem.title}
        summary={problem.summary}
        difficulty={problem.difficulty}
        status={isAttemptSaved ? savedAttemptData?.status || "solved" : problem.status || "not_started"}
        estimatedMinutes={problem.estimatedMinutes}
        pattern={problem.pattern}
        patternSlug={patternSlug}
        hasRecognition={hasRecognition}
        topics={problem.topics}
        bookmarked={Boolean(problem.bookmarked)}
        learningPathContext={learningPathContext}
        onOpenIntelligence={() => setIsAIDrawerOpen(true)}
        timerSeconds={timerSeconds}
        isTimerRunning={isTimerRunning}
        onToggleTimer={() => {
          const nextState = !isTimerRunning;
          setIsTimerRunning(nextState);
          if (problem?.id) {
            updateSessionTimerAction({
              problemId: problem.id,
              elapsedSeconds: timerSeconds,
              timerState: nextState ? "running" : "paused",
            }).catch(() => {});
          }
        }}
        onResetTimer={() => {
          setIsTimerRunning(false);
          setTimerSeconds(0);
          if (problem?.id) {
            updateSessionTimerAction({
              problemId: problem.id,
              elapsedSeconds: 0,
              timerState: "stopped",
            }).catch(() => {});
          }
        }}
        activePhase={activePhase}
        sourceLabel={sourceLabel}
      />

      {/* ── Cognitive Flow Progress Navigation Stepper ── */}
      <nav aria-label="Problem solving stages" className="border-b border-(--color-border) pb-1">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PHASES.map((p) => {
            const isActive = activePhase === p.id;
            const isCompleted =
              p.id === 1 ? hasRecognition : p.id === 2 ? hasRecognition : p.id === 3 ? isAttemptSaved : isAttemptSaved;
            const isUnlocked = p.id <= maxUnlockedPhase || isCompleted || (p.id === 2 && hasRecognition) || (p.id === 3 && hasRecognition);

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  if (isUnlocked) setActivePhase(p.id);
                }}
                disabled={!isUnlocked}
                className={cn(
                  "relative flex flex-col items-start px-3 py-2 rounded-xl text-left transition group",
                  isActive
                    ? "bg-[var(--accent-lime,#B7F36B)]/15 border border-[var(--accent-lime,#B7F36B)]/40 text-white shadow-sm"
                    : isUnlocked
                    ? "hover:bg-white/[0.04] text-(--color-text-muted) border border-transparent"
                    : "opacity-40 cursor-not-allowed border border-transparent text-white/40"
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  <span
                    className={cn(
                      "grid size-5 place-items-center rounded-full text-[10px] font-bold shrink-0 transition-colors",
                      isActive
                        ? "bg-[var(--accent-lime,#B7F36B)] text-[#0B0F14] font-bold"
                        : isCompleted
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-white/[0.06] text-white/60"
                    )}
                  >
                    {isCompleted ? <Check size={11} strokeWidth={3} /> : p.id}
                  </span>
                  <span className={cn("text-xs font-semibold truncate", isActive ? "text-white" : "text-(--color-text-muted)")}>
                    {p.shortLabel}
                  </span>
                </div>
                <span className="text-[10px] text-white/40 mt-0.5 truncate hidden sm:block">
                  {p.description}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="active-phase-indicator"
                    className="absolute -bottom-[5px] left-3 right-3 h-[2px] bg-[var(--accent-lime,#B7F36B)] rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Full-Width Learning Workspace ── */}
      <main className="w-full space-y-8 min-w-0">
        {/* ────────────────────────────────────────────────────────── */}
        {/* PHASE 1: THINK & HYPOTHESIZE                               */}
        {/* ────────────────────────────────────────────────────────── */}
        {(activePhase === 1 || !hasRecognition) && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Semantic Thinking Direction Roadmap */}
            <section aria-label="Thinking Direction Roadmap">
              <ThinkingDirectionView
                content={problem.thinkingDirection}
                learningGoal={problem.learningGoal}
                dryRunPrompt={problem.dryRunPrompt}
              />
            </section>

            {/* Dry Run / Visual Reasoning */}
            {normalizedContent.hasDryRun && normalizedContent.dryRunData && (
              <section aria-label="Dry Run Visual Reasoning" className="pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-wider">
                    Visual Reasoning · Execution Dry Run
                  </span>
                </div>
                <DryRunStepper data={normalizedContent.dryRunData} />
              </section>
            )}

            {/* Pattern Recognition Hypothesis Checkpoint */}
            <section aria-label="Pattern Hypothesis Checkpoint" className="pt-8 border-t border-(--color-border) space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                    Hypothesis Checkpoint
                  </span>
                </div>
                  <h3 className="text-base font-semibold text-white mt-1">Which algorithmic pattern applies?</h3>
                  <p className="mt-1 text-xs text-purple-200/60 leading-relaxed">
                    Commit to a reasoning hypothesis before viewing external solution code. Explaining why reinforces intuition.
                  </p>
                </div>

                {hasRecognition ? (
                  /* Previously Completed Recognition Card */
                  <div
                    className={cn(
                      "rounded-xl border p-4 space-y-3",
                      recognitionResult.isCorrect
                        ? "border-emerald-400/25 bg-emerald-500/[0.05]"
                        : "border-amber-400/25 bg-amber-500/[0.05]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "grid size-5 place-items-center rounded-full text-xs",
                            recognitionResult.isCorrect ? "bg-emerald-400/20 text-emerald-300" : "bg-amber-400/20 text-amber-300"
                          )}
                        >
                          {recognitionResult.isCorrect ? <Check size={12} strokeWidth={3} /> : <Sparkles size={12} />}
                        </span>
                        <span className="text-xs font-semibold text-white">
                          {recognitionResult.isCorrect ? "Pattern Identified Correctly!" : "Good Intuition — Verified Pattern Below"}
                        </span>
                      </div>
                      <span className="text-[11px] text-purple-200/70">
                        Prediction: <strong className="text-white">{recognitionResult.selectedPatternName}</strong>
                      </span>
                    </div>

                    {recognitionResult.reasoning && (
                      <p className="text-xs text-white/80 italic border-l-2 border-[var(--accent-lime,#B7F36B)]/40 pl-3">
                        &ldquo;{recognitionResult.reasoning}&rdquo;
                      </p>
                    )}

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setActivePhase(2)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-lime,#B7F36B)]/15 border border-[var(--accent-lime,#B7F36B)]/30 px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-lime,#B7F36B)] hover:bg-[var(--accent-lime,#B7F36B)]/25 transition"
                      >
                        <span>Proceed to Phase 2: Confirm</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Interactive Form */
                  <form onSubmit={handlePatternSubmit} className="space-y-4 pt-1">
                    {recognitionError && (
                      <div className="flex items-center gap-2 rounded-lg border border-rose-500/25 bg-rose-500/[0.08] p-3 text-xs text-rose-300">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{recognitionError}</span>
                      </div>
                    )}

                    <div>
                      <label htmlFor="pattern-select" className="block text-xs font-medium text-white/80 mb-1.5">
                        1. Select Pattern <span className="text-[var(--accent-lime,#B7F36B)]">*</span>
                      </label>
                      <select
                        id="pattern-select"
                        value={selectedPatternId}
                        onChange={(e) => setSelectedPatternId(e.target.value)}
                        className="w-full rounded-xl border border-(--color-border) bg-(--color-surface-1) px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-[var(--accent-lime,#B7F36B)]/60 focus:ring-2 focus:ring-[var(--accent-lime,#B7F36B)]/20"
                      >
                        <option value="" disabled>
                          Choose the pattern you predict...
                        </option>
                        {problem.allPatterns?.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="pattern-signal" className="block text-xs font-medium text-white/80 mb-1.5">
                        2. Structural Signal Noticed (Optional)
                      </label>
                      <input
                        id="pattern-signal"
                        type="text"
                        value={signalIdentified}
                        onChange={(e) => setSignalIdentified(e.target.value)}
                        placeholder="e.g., sorted array, contiguous subarray, pairs summing to target"
                        className="w-full rounded-xl border border-(--color-border) bg-(--color-surface-1) px-3.5 py-2 text-xs text-white placeholder:text-white/30 outline-none transition focus:border-[var(--accent-lime,#B7F36B)]/60 focus:ring-2 focus:ring-[var(--accent-lime,#B7F36B)]/20"
                      />
                    </div>

                    <div>
                      <label htmlFor="pattern-reasoning" className="block text-xs font-medium text-white/80 mb-1.5">
                        3. Why does this pattern apply? <span className="text-[var(--accent-lime,#B7F36B)]">*</span>
                      </label>
                      <textarea
                        id="pattern-reasoning"
                        rows={3}
                        value={reasoning}
                        onChange={(e) => setReasoning(e.target.value)}
                        placeholder="Explain how the problem's constraints or invariants match this pattern..."
                        className="w-full rounded-xl border border-(--color-border) bg-(--color-surface-1) p-3 text-xs text-white placeholder:text-white/30 outline-none transition focus:border-[var(--accent-lime,#B7F36B)]/60 focus:ring-2 focus:ring-[var(--accent-lime,#B7F36B)]/20 resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <p className="text-[11px] text-(--color-text-muted)">
                        Evaluates hypothesis and reveals verified summary + hint ladder immediately.
                      </p>
                      <button
                        type="submit"
                        disabled={isRecognitionPending || !selectedPatternId}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-lime,#B7F36B)] px-5 py-2.5 text-xs font-semibold text-[#0B0F14] shadow-md transition hover:bg-[var(--accent-lime,#B7F36B)]/90 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isRecognitionPending ? (
                          <span>Evaluating...</span>
                        ) : (
                          <>
                            <span>Confirm Hypothesis</span>
                            <ArrowRight size={13} />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </section>
            </motion.div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* PHASE 2: CONFIRM & HINT LADDER                            */}
          {/* ────────────────────────────────────────────────────────── */}
          {activePhase === 2 && hasRecognition && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Pattern Recognition Outcome Card */}
              <div
                className={cn(
                  "rounded-2xl border p-4 sm:p-5 flex items-start gap-3.5",
                  recognitionResult.isCorrect
                    ? "border-emerald-400/25 bg-emerald-500/[0.05]"
                    : "border-amber-400/25 bg-amber-500/[0.05]"
                )}
              >
                <div
                  className={cn(
                    "grid size-8 place-items-center rounded-xl shrink-0 text-sm",
                    recognitionResult.isCorrect ? "bg-emerald-400/20 text-emerald-300" : "bg-amber-400/20 text-amber-300"
                  )}
                >
                  {recognitionResult.isCorrect ? <Check size={16} strokeWidth={3} /> : <Target size={16} />}
                </div>
                <div className="flex-1 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-white text-sm">
                      {recognitionResult.isCorrect
                        ? `Correct Pattern: ${problem.pattern}`
                        : `Applied Pattern: ${problem.pattern}`}
                    </h4>
                    {recognitionResult.recognitionScore ? (
                      <span className="text-[11px] font-medium text-emerald-300">
                        Accuracy: {recognitionResult.recognitionScore}%
                      </span>
                    ) : null}
                  </div>
                  <p className="text-purple-100/70 leading-relaxed">
                    {recognitionResult.isCorrect
                      ? `Spot on! Your intuition for recognizing ${problem.pattern} is reinforced.`
                      : `You predicted ${recognitionResult.selectedPatternName}. For this problem, ${problem.pattern} is the primary pattern because of its structural invariant.`}
                  </p>
                </div>
              </div>

              {/* Concise Pattern Summary Card */}
              <div className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/[0.04] to-cyan-900/[0.02] p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-md bg-cyan-400/15 text-cyan-300">
                      <Sparkles size={14} />
                    </span>
                    <h3 className="text-sm font-semibold text-white">Pattern Reminder: {problem.pattern}</h3>
                  </div>
                  <Link
                    href={`/patterns/${patternSlug}`}
                    className="group inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition"
                  >
                    <span>Learn pattern deeply</span>
                    <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
                  </Link>
                </div>

                <p className="text-xs sm:text-sm leading-relaxed text-purple-100/80">
                  {patternDetail?.whenToUse ||
                    patternDetail?.description ||
                    `The ${problem.pattern} pattern optimizes this problem by maintaining an invariant across elements rather than checking exhaustive combinations.`}
                </p>

                {patternDetail?.signalKeywords?.length ? (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-purple-200/50 uppercase tracking-wider font-semibold mr-1">
                      Signals:
                    </span>
                    {patternDetail.signalKeywords.map((signal) => (
                      <span
                        key={signal}
                        className="rounded-md border border-cyan-400/20 bg-cyan-400/[0.05] px-2 py-0.5 text-[10px] font-medium text-cyan-200"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Progressive Metered Hint Ladder */}
              <div className="space-y-4">
                {problem.hints && problem.hints.length > 0 ? (
                  <ProgressiveHintLadder
                    hints={problem.hints}
                    revealedCount={hintsRevealed}
                    onRevealChange={(newCount) => {
                      setHintsRevealed(newCount);
                      if (problem?.id && newCount > 0) {
                        recordHintRevealedAction({
                          problemId: problem.id,
                          hintLevel: newCount,
                        }).catch(() => {});
                      }
                    }}
                  />
                ) : (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-purple-200/60">
                    No sequential hints configured for this problem. Rely on your pattern invariant.
                  </div>
                )}
              </div>

              {/* Transition to Phase 3 CTA */}
              <div className="flex items-center justify-between border-t border-(--color-border) pt-6">
                <button
                  type="button"
                  onClick={() => setActivePhase(1)}
                  className="text-xs text-purple-200/60 hover:text-white transition flex items-center gap-1.5"
                >
                  <ArrowLeft size={13} />
                  <span>Review Phase 1</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePhase(3)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-lime,#B7F36B)] px-5 py-2.5 text-xs font-semibold text-[#0B0F14] shadow-md transition hover:bg-[var(--accent-lime,#B7F36B)]/90"
                >
                  <span>Ready to solve? Proceed to Solve</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* PHASE 3: SOLVE & EXECUTE                                   */}
          {/* ────────────────────────────────────────────────────────── */}
          {activePhase === 3 && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Primary External Solve Action Card */}
              <Surface className="rounded-2xl border border-[var(--accent-lime,#B7F36B)]/25 bg-gradient-to-br from-[var(--accent-lime,#B7F36B)]/[0.06] to-transparent p-6 text-center space-y-4">
                <div className="max-w-md mx-auto space-y-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-lime,#B7F36B)]/15 border border-[var(--accent-lime,#B7F36B)]/30 px-2.5 py-0.5 text-[10px] font-semibold text-[var(--accent-lime,#B7F36B)]">
                    DSA Club Preparation Complete
                  </span>
                  <h3 className="text-lg font-bold text-white">Execute Solution on {sourceLabel}</h3>
                  <p className="text-xs text-(--color-text-muted) leading-relaxed">
                    Open the problem in a new tab, implement your invariant using {problem.pattern}, and run the test cases.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  {problem.sourceUrl ? (
                    <a
                      href={problem.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent-lime,#B7F36B)] px-6 text-sm font-semibold text-[#0B0F14] shadow-[0_4px_16px_rgba(183,243,107,0.25)] transition hover:bg-[var(--accent-lime,#B7F36B)]/90"
                    >
                      <span>Solve on {sourceLabel}</span>
                      <ExternalLink size={15} />
                    </a>
                  ) : (
                    <p className="text-xs text-(--color-text-muted)">External problem link unavailable</p>
                  )}

                  {/* Lightweight Solving Stopwatch Timer */}
                  <div className="flex items-center gap-2 rounded-xl border border-(--color-border) bg-white/[0.03] px-3.5 py-2">
                    <Clock size={14} className="text-[var(--accent-lime,#B7F36B)] shrink-0" />
                    <span className="font-mono text-xs font-semibold text-white tracking-wider">
                      {formatTimer(timerSeconds)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextState = !isTimerRunning;
                        setIsTimerRunning(nextState);
                        if (problem?.id) {
                          updateSessionTimerAction({
                            problemId: problem.id,
                            elapsedSeconds: timerSeconds,
                            timerState: nextState ? "running" : "paused",
                          }).catch(() => {});
                        }
                      }}
                      className="ml-1 rounded p-1 text-purple-200/60 hover:bg-white/[0.06] hover:text-white transition"
                      title={isTimerRunning ? "Pause timer" : "Start timer"}
                    >
                      {isTimerRunning ? <Pause size={13} /> : <Play size={13} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsTimerRunning(false);
                        setTimerSeconds(0);
                        if (problem?.id) {
                          updateSessionTimerAction({
                            problemId: problem.id,
                            elapsedSeconds: 0,
                            timerState: "stopped",
                          }).catch(() => {});
                        }
                      }}
                      className="rounded p-1 text-purple-200/40 hover:bg-white/[0.06] hover:text-white transition"
                      title="Reset timer"
                    >
                      <RotateCcw size={11} />
                    </button>
                  </div>
                </div>
              </Surface>

              {/* Target Complexity Exercise */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <button
                  type="button"
                  onClick={() => setIsComplexityOpen(!isComplexityOpen)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="grid size-5 place-items-center rounded bg-purple-400/10 text-purple-300 text-xs">
                      ⚡
                    </span>
                    <span className="text-xs font-semibold text-white">Target Complexity Exercise</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-purple-200/60 text-xs">
                    <span>{isComplexityOpen ? "Hide" : "Review target"}</span>
                    {isComplexityOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {isComplexityOpen && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06] text-xs text-purple-200/70 leading-relaxed space-y-2">
                    <p>
                      Before you submit, ensure your solution satisfies the optimal constraints. For <strong>{problem.pattern}</strong>, target an $O(N)$ or $O(N \log N)$ time complexity and verify if extra auxiliary space ($O(N)$) is permitted or if an in-place pointer pass ($O(1)$) is expected.
                    </p>
                  </div>
                )}
              </div>

              {/* Expandable Supporting Drawers: Common Mistakes & Dry Run */}
              <div className="space-y-3">
                {/* Common Mistakes */}
                {problem.commonMistakes && problem.commonMistakes.length > 0 && (
                  <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.02] overflow-hidden transition">
                    <button
                      type="button"
                      onClick={() => setIsMistakesOpen(!isMistakesOpen)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-6 place-items-center rounded-md bg-amber-400/15 text-amber-300">
                          <AlertCircle size={13} />
                        </span>
                        <div>
                          <h4 className="text-xs font-semibold text-white">Common Mistakes to Avoid</h4>
                          <p className="text-[10px] text-purple-200/50">Expand to check subtle pitfalls before coding</p>
                        </div>
                      </div>
                      {isMistakesOpen ? <ChevronUp size={15} className="text-purple-200/50" /> : <ChevronDown size={15} className="text-purple-200/50" />}
                    </button>

                    {isMistakesOpen && (
                      <div className="px-4 pb-4 pt-1 border-t border-amber-400/15 text-xs text-purple-100/70">
                        <ul className="list-disc space-y-1.5 pl-4">
                          {problem.commonMistakes.map((mistake, idx) => (
                            <li key={idx}>{mistake}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Dry Run */}
                {problem.dryRunPrompt && (
                  <div className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/[0.02] overflow-hidden transition">
                    <button
                      type="button"
                      onClick={() => setIsDryRunOpen(!isDryRunOpen)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-6 place-items-center rounded-md bg-fuchsia-400/15 text-fuchsia-300">
                          <Play size={13} />
                        </span>
                        <div>
                          <h4 className="text-xs font-semibold text-white">Dry Run Invariant Walkthrough</h4>
                          <p className="text-[10px] text-purple-200/50">Expand to validate step-by-step example</p>
                        </div>
                      </div>
                      {isDryRunOpen ? <ChevronUp size={15} className="text-purple-200/50" /> : <ChevronDown size={15} className="text-purple-200/50" />}
                    </button>

                    {isDryRunOpen && (
                      <div className="p-4 border-t border-fuchsia-400/15">
                        {normalizedContent.hasDryRun && normalizedContent.dryRunData ? (
                          <DryRunStepper data={normalizedContent.dryRunData} className="my-0" />
                        ) : (
                          <div className="text-xs leading-relaxed text-purple-100/70">
                            {problem.dryRunPrompt}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Transition to Phase 4 CTA */}
              <div className="pt-2 flex items-center justify-between border-t border-white/[0.06] pt-4">
                <button
                  type="button"
                  onClick={() => setActivePhase(2)}
                  className="text-xs text-purple-200/60 hover:text-white transition flex items-center gap-1"
                >
                  <ArrowLeft size={12} />
                  <span>Review Hints & Pattern</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePhase(4)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-lime,#B7F36B)] px-5 py-2.5 text-xs font-semibold text-[#0B0F14] shadow-md transition hover:bg-[var(--accent-lime,#B7F36B)]/90"
                >
                  <span>Finished or Attempted? Record Attempt</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* PHASE 4: REFLECT & LOG OUTCOME                             */}
          {/* ────────────────────────────────────────────────────────── */}
          {activePhase === 4 && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {isAttemptSaved && savedAttemptData ? (
                /* Completed / Reviewed State with Durable Receipt */
                <div className="space-y-6">
                  <div className="rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/[0.08] to-emerald-900/[0.02] p-6 sm:p-7 space-y-4 text-center">
                    <div className="inline-flex size-12 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300 mx-auto">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Problem Attempt Recorded ✓</h3>
                      <p className="mt-1 text-xs text-emerald-300/80">
                        Your learning evidence, attempt metadata, and reflection have been durably persisted.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-emerald-400/15 max-w-lg mx-auto">
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                        <span className="text-[10px] text-purple-200/50 uppercase font-semibold block">Outcome</span>
                        <span className="text-xs font-bold capitalize text-white mt-0.5 block">
                          {savedAttemptData.status === "solved"
                            ? "Solved"
                            : savedAttemptData.status === "started"
                            ? "Partially Solved"
                            : "Attempted"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                        <span className="text-[10px] text-purple-200/50 uppercase font-semibold block">Confidence</span>
                        <span className="text-xs font-bold text-white mt-0.5 block">
                          {savedAttemptData.confidence}/5
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                        <span className="text-[10px] text-purple-200/50 uppercase font-semibold block">Assistance</span>
                        <span className="text-xs font-bold text-white mt-0.5 block">
                          {savedAttemptData.hintsUsed > 0
                            ? `Hint Assisted (${savedAttemptData.hintsUsed})`
                            : "Independent"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                        <span className="text-[10px] text-purple-200/50 uppercase font-semibold block">Duration</span>
                        <span className="text-xs font-bold text-white mt-0.5 block">
                          {Number(savedAttemptData.durationSeconds) > 0
                            ? `${formatTimer(savedAttemptData.durationSeconds)} (measured)`
                            : "Untracked / Unknown"}
                        </span>
                      </div>
                    </div>

                    {/* Receipt Metadata Badge */}
                    {savedReceipt && (
                      <div className="rounded-xl border border-(--color-border) bg-black/30 p-3.5 text-xs text-left max-w-lg mx-auto space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-purple-200/60 pb-1 border-b border-white/[0.06]">
                          <span>Receipt ID: <code className="text-purple-300 font-mono">{String(savedReceipt.commandId).slice(0, 16)}...</code></span>
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {savedReceipt.downstreamStatus?.replace(/_/g, " ") || "Committed"}
                          </span>
                        </div>
                        {savedReceipt.planEffect?.status === "completed" && (
                          <div className="flex items-center gap-2 text-emerald-300 text-[11px]">
                            <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
                            <span>Plan Task completed for Day {savedReceipt.planEffect.dayIndex}</span>
                          </div>
                        )}
                        {savedReceipt.planEffect?.status === "already_completed" && (
                          <div className="text-purple-300/80 text-[11px]">
                            Plan Task was already marked completed previously.
                          </div>
                        )}
                        {savedReceipt.planEffect?.status === "not_applicable" && (
                          <div className="text-purple-200/60 text-[11px]">
                            Off-plan practice recorded (does not advance scheduled plan tasks).
                          </div>
                        )}
                        {savedReceipt.planEffect?.status === "stale_plan" && (
                          <div className="text-amber-300/80 text-[11px]">
                            Saved off-plan (scheduled plan is no longer active).
                          </div>
                        )}
                      </div>
                    )}

                    {savedAttemptData.reflection && (
                      <div className="pt-2 text-left max-w-lg mx-auto">
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                          <span className="text-[10px] text-purple-200/50 uppercase font-semibold block mb-1">
                            Key Insight
                          </span>
                          <p className="text-xs leading-relaxed text-purple-100/90 italic">
                            &ldquo;{savedAttemptData.reflection}&rdquo;
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Fresh Attempt or Plan Navigation Controls */}
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-emerald-400/15">
                      <button
                        type="button"
                        onClick={handleStartFreshAttempt}
                        disabled={isFreshAttemptPending}
                        className="inline-flex items-center gap-2 rounded-xl border border-purple-400/30 bg-purple-500/15 px-4 py-2 text-xs font-semibold text-purple-200 hover:bg-purple-500/25 transition disabled:opacity-50"
                      >
                        <RotateCcw size={13} className={isFreshAttemptPending ? "animate-spin" : ""} />
                        <span>{isFreshAttemptPending ? "Starting fresh..." : "Start Fresh Attempt"}</span>
                      </button>

                      {isFromPlan && (
                        <button
                          type="button"
                          onClick={() => {
                            router.push("/intelligence?tab=today");
                            router.refresh();
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-lime,#B7F36B)] px-5 py-2 text-xs font-bold text-black shadow-md hover:bg-[var(--accent-lime,#B7F36B)]/90 transition"
                        >
                          <span>Return to Today&apos;s Plan</span>
                          <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stage Continuity or Next Problem Recommended Action */}
                  {learningPathContext?.isStageCompleted ? (
                    <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 via-emerald-950/20 to-transparent p-6 sm:p-7 space-y-4 text-center shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                      <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-emerald-400/20 text-emerald-300 mx-auto border border-emerald-400/30 shadow-lg">
                        <Trophy size={28} />
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-0.5 text-[11px] font-bold text-emerald-300 uppercase tracking-wide">
                          🎉 Stage Complete
                        </span>
                        <h4 className="text-xl sm:text-2xl font-bold text-white mt-2">
                          {learningPathContext.stageTitle}
                        </h4>
                        <p className="mt-1 text-xs sm:text-sm text-emerald-200/80 max-w-md mx-auto">
                          All required problems and missions in this stage are completed.
                          {learningPathContext.nextStage && " Next stage is unlocked!"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-emerald-400/20">
                        {learningPathContext.nextStage ? (
                          <Link
                            href={learningPathContext.nextStage.url}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:shadow-emerald-500/25 transition-all hover:-translate-y-0.5"
                          >
                            <span>Continue to Stage {learningPathContext.nextStage.order} →</span>
                            <ArrowRight size={14} />
                          </Link>
                        ) : (
                          <Link
                            href={`/learning-paths/${learningPathContext.pathSlug}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition-all"
                          >
                            <span>Review Learning Path</span>
                            <ArrowRight size={14} />
                          </Link>
                        )}

                        <Link
                          href={learningPathContext.backToStageUrl}
                          className="rounded-xl border border-(--color-border) bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-purple-200/80 hover:bg-white/[0.06] hover:text-white transition"
                        >
                          Review Stage {learningPathContext.stageOrder}
                        </Link>
                      </div>
                    </div>
                  ) : learningPathContext?.nextItem ? (
                    <div className="rounded-2xl border border-purple-400/25 bg-gradient-to-br from-purple-500/10 via-[#0e071c] to-transparent p-5 sm:p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-purple-300 uppercase tracking-wide">
                          <Sparkles size={13} className="text-purple-400" />
                          Next in your Learning Path
                        </span>
                        <span className="rounded-full bg-purple-500/20 border border-purple-400/30 px-2.5 py-0.5 text-[10px] font-semibold text-purple-200">
                          Stage {learningPathContext.stageOrder}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base sm:text-lg font-bold text-white">
                          {learningPathContext.nextItem.title}
                        </h4>
                        <p className="mt-1 text-xs text-purple-200/60">
                          Keep your momentum going! Progress towards completing Stage {learningPathContext.stageOrder}: {learningPathContext.stageTitle}.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Link
                          href={learningPathContext.nextItem.url}
                          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-purple-500/30 transition-all hover:-translate-y-0.5"
                        >
                          <span>{learningPathContext.nextItem.buttonLabel}</span>
                          <ArrowRight size={13} />
                        </Link>

                        <Link
                          href={learningPathContext.backToStageUrl}
                          className="rounded-xl border border-(--color-border) bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-purple-200/80 hover:bg-white/[0.06] hover:text-white transition"
                        >
                          {learningPathContext.backToStageLabel}
                        </Link>

                        <button
                          type="button"
                          onClick={() => setIsAttemptSaved(false)}
                          className="ml-auto text-xs text-purple-200/50 hover:text-white underline underline-offset-2 transition"
                        >
                          Record a Revisit
                        </button>
                      </div>
                    </div>
                  ) : nextProblem ? (
                    <div className="rounded-2xl border border-purple-400/20 bg-white/[0.02] p-5 sm:p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-300 uppercase tracking-wide">
                          <Sparkles size={12} />
                          Recommended Next Problem
                        </span>
                        <DifficultyBadge difficulty={nextProblem.difficulty || "medium"} />
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-white">{nextProblem.title}</h4>
                        <p className="mt-1 text-xs text-purple-200/60">{nextProblem.summary}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Link
                          href={`/practice/problems/${nextProblem.slug}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-lime,#B7F36B)] px-4 py-2.5 text-xs font-semibold text-[#0B0F14] shadow-md hover:bg-[var(--accent-lime,#B7F36B)]/90 transition"
                        >
                          <span>Prepare Next: {nextProblem.title}</span>
                          <ArrowRight size={13} />
                        </Link>

                        <Link
                          href={isFromPlan ? "/intelligence?tab=today" : "/practice"}
                          className="rounded-xl border border-(--color-border) bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/[0.06] transition"
                        >
                          {isFromPlan ? "Back to Today's Plan" : "Back to Problems"}
                        </Link>

                        <button
                          type="button"
                          onClick={() => setIsAttemptSaved(false)}
                          className="ml-auto text-xs text-purple-200/50 hover:text-white underline underline-offset-2 transition"
                        >
                          Record a Revisit
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                      <span className="text-xs text-(--color-text-muted)">Ready for more practice?</span>
                      <div className="flex items-center gap-3">
                        <Link
                          href={isFromPlan ? "/intelligence?tab=today" : "/practice"}
                          className="rounded-lg bg-purple-500/20 border border-purple-400/30 px-4 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/30 transition"
                        >
                          {isFromPlan ? "Back to Today's Plan" : "Explore Problems Catalog"}
                        </Link>
                        <button
                          type="button"
                          onClick={() => setIsAttemptSaved(false)}
                          className="text-xs text-purple-200/50 hover:text-white underline transition"
                        >
                          Record a Revisit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Simplified 3-Field Save Attempt Form */
                <div className="rounded-2xl border border-(--color-border) bg-white/[0.02] p-5 sm:p-6 space-y-5">
                  <div>
                    <h3 className="text-base font-semibold text-white">Save Attempt & Reflection</h3>
                    <p className="mt-1 text-xs text-(--color-text-muted) leading-relaxed">
                      Log your outcome and confidence to keep your learning progress, spaced repetition, and pattern mastery up to date.
                    </p>
                  </div>

                  <form onSubmit={handleSaveAttempt} className="space-y-5">
                    {/* Field 1: Outcome */}
                    <div>
                      <label className="block text-xs font-medium text-purple-200/80 mb-2">
                        1. Solve Outcome
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setAttemptOutcome("solved")}
                          className={cn(
                            "flex items-center justify-center gap-1.5 rounded-xl p-3 text-xs font-semibold transition border",
                            attemptOutcome === "solved"
                              ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300 shadow-sm"
                              : "border-(--color-border) bg-white/[0.03] text-purple-200/70 hover:bg-white/[0.06]"
                          )}
                        >
                          <Check size={14} className={attemptOutcome === "solved" ? "text-emerald-300" : ""} />
                          <span>Solved</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAttemptOutcome("started")}
                          className={cn(
                            "flex items-center justify-center gap-1.5 rounded-xl p-3 text-xs font-semibold transition border",
                            attemptOutcome === "started"
                              ? "border-amber-400/40 bg-amber-500/15 text-amber-300 shadow-sm"
                              : "border-(--color-border) bg-white/[0.03] text-purple-200/70 hover:bg-white/[0.06]"
                          )}
                        >
                          <Zap size={14} className={attemptOutcome === "started" ? "text-amber-300" : ""} />
                          <span>Partially Solved</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAttemptOutcome("abandoned")}
                          className={cn(
                            "flex items-center justify-center gap-1.5 rounded-xl p-3 text-xs font-semibold transition border",
                            attemptOutcome === "abandoned"
                              ? "border-rose-400/40 bg-rose-500/15 text-rose-300 shadow-sm"
                              : "border-(--color-border) bg-white/[0.03] text-purple-200/70 hover:bg-white/[0.06]"
                          )}
                        >
                          <AlertCircle size={14} className={attemptOutcome === "abandoned" ? "text-rose-300" : ""} />
                          <span>Not Solved</span>
                        </button>
                      </div>
                    </div>

                    {/* Field 2: Confidence */}
                    <div>
                      <label className="block text-xs font-medium text-white/80 mb-2">
                        2. Solution Confidence
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setAttemptConfidence(5)}
                          className={cn(
                            "flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-semibold transition border",
                            attemptConfidence === 5
                              ? "border-[var(--accent-lime,#B7F36B)]/50 bg-[var(--accent-lime,#B7F36B)]/15 text-white shadow-sm"
                              : "border-(--color-border) bg-white/[0.03] text-(--color-text-muted) hover:bg-white/[0.06]"
                          )}
                        >
                          <span>High (5/5)</span>
                          <span className="text-[10px] text-white/40 mt-0.5">Could explain clearly</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAttemptConfidence(3)}
                          className={cn(
                            "flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-semibold transition border",
                            attemptConfidence === 3
                              ? "border-[var(--accent-lime,#B7F36B)]/50 bg-[var(--accent-lime,#B7F36B)]/15 text-white shadow-sm"
                              : "border-(--color-border) bg-white/[0.03] text-(--color-text-muted) hover:bg-white/[0.06]"
                          )}
                        >
                          <span>Medium (3/5)</span>
                          <span className="text-[10px] text-white/40 mt-0.5">Understood core idea</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAttemptConfidence(1)}
                          className={cn(
                            "flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-semibold transition border",
                            attemptConfidence === 1
                              ? "border-[var(--accent-lime,#B7F36B)]/50 bg-[var(--accent-lime,#B7F36B)]/15 text-white shadow-sm"
                              : "border-(--color-border) bg-white/[0.03] text-(--color-text-muted) hover:bg-white/[0.06]"
                          )}
                        >
                          <span>Low (1/5)</span>
                          <span className="text-[10px] text-white/40 mt-0.5">Needed guidance</span>
                        </button>
                      </div>
                    </div>

                    {/* Field 3: Key Insight Reflection */}
                    <div>
                      <label htmlFor="key-insight" className="block text-xs font-medium text-white/80 mb-1.5">
                        3. Key Insight or Takeaway
                      </label>
                      <textarea
                        id="key-insight"
                        rows={3}
                        value={attemptInsight}
                        onChange={(e) => setAttemptInsight(e.target.value)}
                        placeholder="What clicked, what failed, or what would you try differently next time?"
                        className="w-full rounded-xl border border-(--color-border) bg-(--color-surface-1) p-3 text-xs text-white placeholder:text-white/30 outline-none transition focus:border-[var(--accent-lime,#B7F36B)]/60 focus:ring-2 focus:ring-[var(--accent-lime,#B7F36B)]/20 resize-none"
                      />
                      <p className="mt-1 text-[11px] text-white/40">
                        Minimum 10 characters to record in your personal reflection journal.
                      </p>
                    </div>

                    {/* Context Auto-captured bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2 text-[11px] text-purple-200/60">
                      <span className="flex items-center gap-1.5">
                        <Lightbulb size={12} className="text-amber-300" />
                        <span>Hints revealed: {hintsRevealed}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={12} className="text-purple-300" />
                        <span>Tracked time: {formatTimer(timerSeconds)}</span>
                      </span>
                      <span>
                        Strategy: {hintsRevealed >= 1 ? "Hint-assisted" : "Independent"}
                      </span>
                    </div>

                    {/* Actionable Save Error Banner with retry and status verification */}
                    {saveError && (
                      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs space-y-2.5 text-rose-200">
                        <div className="flex items-center gap-2 font-semibold text-rose-300">
                          <AlertCircle size={15} />
                          <span>Save Attempt Issue</span>
                        </div>
                        <p className="leading-relaxed">{saveError}</p>
                        <div className="flex items-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSaveAttempt()}
                            disabled={isAttemptPending}
                            className="rounded-lg bg-rose-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 transition disabled:opacity-50"
                          >
                            {isAttemptPending ? "Retrying..." : "Retry Save"}
                          </button>
                          <button
                            type="button"
                            onClick={handleCheckSaveStatus}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-purple-200/80 hover:bg-white/10 transition"
                          >
                            Verify Save Status
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setActivePhase(3)}
                        className="text-xs text-purple-200/60 hover:text-white transition flex items-center gap-1"
                      >
                        <ArrowLeft size={12} />
                        <span>Back to Solve</span>
                      </button>

                      <button
                        type="submit"
                        disabled={isAttemptPending}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:opacity-95 transition disabled:opacity-50"
                      >
                        {isAttemptPending ? (
                          <span>Saving attempt...</span>
                        ) : (
                          <>
                            <Check size={14} strokeWidth={2.5} />
                            <span>Record Attempt & Reflection</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          )}
      </main>

      {/* ── Slide-Over DSA Club Intelligence Drawer ── */}
      <ProblemAIDrawer
        isOpen={isAIDrawerOpen}
        onClose={() => setIsAIDrawerOpen(false)}
        problemId={problem.id}
        problemTitle={problem.title}
        summary={problem.summary}
        patternName={problem.pattern}
        difficulty={problem.difficulty}
        topicName={problem.topics?.[0]}
        activePhase={activePhase}
        thinkingDirection={problem.thinkingDirection}
        hintsRevealed={hintsRevealed}
        userPrediction={recognitionResult?.selectedPatternName}
        userReasoning={recognitionResult?.reasoning}
      />
    </div>
  );
}

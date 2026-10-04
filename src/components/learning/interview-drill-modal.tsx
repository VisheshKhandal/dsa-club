"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/Button";
import {
  Clock,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import {
  startOrResumeInterviewDrillAction,
  advanceInterviewStepAction,
  togglePauseInterviewDrillAction,
  getActiveInterviewDrillAction,
} from "@/features/learning/actions/interview-drill.actions";
import type { InterviewDrillStep } from "@/features/learning/models/interview-drill.model";

interface InterviewDrillModalProps {
  problemSlug: string;
  problemTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onDrillCompleted?: () => void;
}

export function InterviewDrillModal({
  problemSlug,
  problemTitle,
  isOpen,
  onClose,
  onDrillCompleted,
}: InterviewDrillModalProps) {
  const [drill, setDrill] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingStep, setSavingStep] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step response state
  const [step1Notes, setStep1Notes] = useState({
    acknowledged1Indexed: true,
    acknowledgedO1Space: true,
    acknowledgedExactSolution: true,
    clarificationNotes: "",
  });

  const [step2Approach, setStep2Approach] = useState({
    chosenStrategy: "two_pointers_opposite_ends",
    invariantExplanation:
      "Left at 0, Right at n-1. If sum < target, Left++ to increase sum. If sum > target, Right-- to decrease sum.",
  });

  const [step3Impl, setStep3Impl] = useState({
    selfReportedStatus: "solved",
    hintsUsed: 0,
    solutionViewed: false,
    implementationNotes: "",
  });

  const [step4Boundaries, setStep4Boundaries] = useState({
    handledDuplicates: true,
    handledNegatives: true,
    handledExtremes: true,
    boundaryNotes: "Verified with negative values and duplicate targets.",
  });

  const [step5Complexity, setStep5Complexity] = useState({
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    tradeoffNotes:
      "Two pointers achieves O(1) space compared to hash map O(n) space by exploiting the sorted property.",
  });

  // Local active timer display
  const [localSeconds, setLocalSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    async function loadOrCreateDrill() {
      setLoading(true);
      setError(null);
      try {
        const res = await startOrResumeInterviewDrillAction({
          problemSlug,
          timeboxMinutes: 30,
        });
        if (res.ok && mounted) {
          setDrill(res.drill);
          setLocalSeconds(res.drill.elapsedActiveSeconds || 0);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || "Failed to initialize interview drill");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadOrCreateDrill();

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, problemSlug]);

  // Handle active timer increment
  useEffect(() => {
    if (!drill || drill.isPaused || drill.status === "completed") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setLocalSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [drill?.isPaused, drill?.status]);

  if (!isOpen) return null;

  const currentStep: InterviewDrillStep = drill?.currentStep || 1;

  async function handleTogglePause() {
    if (!drill) return;
    const shouldPause = !drill.isPaused;
    try {
      const res = await togglePauseInterviewDrillAction({
        drillId: drill.drillId,
        pause: shouldPause,
      });
      if (res.ok) {
        setDrill(res.drill);
        setLocalSeconds(res.drill.elapsedActiveSeconds);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleAdvanceStep() {
    if (!drill) return;
    setSavingStep(true);
    setError(null);

    let stepResponse: any = {};
    if (currentStep === 1) stepResponse = step1Notes;
    if (currentStep === 2) stepResponse = step2Approach;
    if (currentStep === 3) stepResponse = step3Impl;
    if (currentStep === 4) stepResponse = step4Boundaries;
    if (currentStep === 5) stepResponse = step5Complexity;

    try {
      const res = await advanceInterviewStepAction({
        drillId: drill.drillId,
        step: currentStep,
        response: stepResponse,
      });

      if (res.ok) {
        setDrill(res.drill);
        if (res.drill.status === "completed") {
          onDrillCompleted?.();
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to advance step");
    } finally {
      setSavingStep(false);
    }
  }

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-(--bg-surface-raised) border border-(--border-subtle) rounded-2xl shadow-2xl p-6 space-y-6 relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-(--border-subtle) pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Bounded Interview Drill
              </span>
              <span className="text-xs text-(--text-muted)">• 6 Structured Phases</span>
            </div>
            <h3 className="text-lg font-bold text-(--text-primary)">{problemTitle}</h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Timer & Pause */}
            {drill && drill.status !== "completed" && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-(--border-subtle) bg-(--bg-surface)">
                <Clock className="size-3.5 text-amber-400" />
                <span className="text-xs font-mono font-semibold text-(--text-primary)">
                  {formatTimer(localSeconds)}
                </span>
                <button
                  type="button"
                  onClick={handleTogglePause}
                  title={drill.isPaused ? "Resume Drill" : "Pause Drill"}
                  className="p-1 rounded text-(--text-muted) hover:text-(--text-primary) transition-colors"
                >
                  {drill.isPaused ? (
                    <Play className="size-3 text-emerald-400 fill-emerald-400" />
                  ) : (
                    <Pause className="size-3 text-amber-400 fill-amber-400" />
                  )}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-(--text-muted) hover:text-(--text-primary) p-1 rounded-lg text-sm font-semibold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Step Progress Indicator */}
        <div className="grid grid-cols-6 gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((s) => {
            const isCompleted = currentStep > s || drill?.status === "completed";
            const isCurrent = currentStep === s && drill?.status !== "completed";
            return (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  isCompleted
                    ? "bg-emerald-400"
                    : isCurrent
                    ? "bg-amber-400 ring-2 ring-amber-400/30"
                    : "bg-(--border-subtle)"
                }`}
                title={`Step ${s}`}
              />
            );
          })}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Drill Paused Notice */}
        {drill?.isPaused && (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pause className="size-4 shrink-0 fill-amber-400" />
              <span>Drill is paused. Work time is frozen.</span>
            </div>
            <ButtonSecondary onClick={handleTogglePause} className="text-xs py-1 px-3">
              Resume
            </ButtonSecondary>
          </div>
        )}

        {/* Content Body */}
        {loading ? (
          <div className="py-12 text-center text-xs text-(--text-muted)">
            Initializing practice session & interview drill...
          </div>
        ) : drill?.status === "completed" || currentStep === 6 ? (
          /* STEP 6: FACTUAL DEBRIEF */
          <div className="space-y-5">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-400" />
                <h4 className="text-sm font-bold text-emerald-300">
                  Interview Practice Completed
                </h4>
              </div>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                {drill?.debrief?.factualOutcome ||
                  "Structured interview drill recorded with honest evidence."}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl border border-(--border-subtle) bg-(--bg-surface) space-y-1">
                <span className="text-[10px] text-(--text-muted) uppercase font-mono">
                  Elapsed Time
                </span>
                <p className="text-sm font-bold text-(--text-primary)">
                  {Math.ceil((drill?.elapsedActiveSeconds || localSeconds) / 60)} mins
                </p>
              </div>

              <div className="p-3 rounded-xl border border-(--border-subtle) bg-(--bg-surface) space-y-1">
                <span className="text-[10px] text-(--text-muted) uppercase font-mono">
                  Independence
                </span>
                <p
                  className={`text-sm font-bold ${
                    drill?.debrief?.demonstratedIndependence ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {drill?.debrief?.demonstratedIndependence ? "Unaided" : "Assisted"}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-(--border-subtle) bg-(--bg-surface) space-y-1">
                <span className="text-[10px] text-(--text-muted) uppercase font-mono">
                  Mistake Repair
                </span>
                <p className="text-sm font-bold text-(--text-primary)">
                  {drill?.debrief?.repairScheduled ? "Scheduled" : "None Required"}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-(--border-subtle) bg-(--bg-surface) space-y-1">
                <span className="text-[10px] text-(--text-muted) uppercase font-mono">
                  Spaced Review
                </span>
                <p className="text-sm font-bold text-emerald-400">Scheduled</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-(--border-subtle) bg-(--bg-surface) space-y-2 text-xs text-(--text-secondary)">
              <div className="flex items-center gap-1.5 font-semibold text-(--text-primary)">
                <ShieldCheck className="size-4 text-emerald-400" />
                <span>Honest Evidence Record</span>
              </div>
              <p>
                DSA Club does not fabricate artificial &quot;hiring readiness&quot; percentages. Your
                performance has been durably stored in the learning ledger and connected to your
                canonical revision queue.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <ButtonPrimary onClick={onClose} className="px-5 py-2 text-xs">
                Done
              </ButtonPrimary>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* STEP 1: UNDERSTAND CONSTRAINTS */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-(--text-primary)">
                    Phase 1: Clarify & Confirm Constraints
                  </h4>
                  <p className="text-xs text-(--text-secondary)">
                    In an interview, never jump directly to coding without confirming boundary
                    rules and memory budgets.
                  </p>
                </div>

                <div className="space-y-2.5 p-4 rounded-xl border border-(--border-subtle) bg-(--bg-surface)">
                  <label className="flex items-center gap-3 text-xs text-(--text-primary) cursor-pointer">
                    <input
                      type="checkbox"
                      checked={step1Notes.acknowledged1Indexed}
                      onChange={(e) =>
                        setStep1Notes({ ...step1Notes, acknowledged1Indexed: e.target.checked })
                      }
                      className="rounded border-(--border-subtle) text-amber-500 focus:ring-amber-500"
                    />
                    <span>Target indices are 1-indexed (return [index1 + 1, index2 + 1]).</span>
                  </label>

                  <label className="flex items-center gap-3 text-xs text-(--text-primary) cursor-pointer">
                    <input
                      type="checkbox"
                      checked={step1Notes.acknowledgedO1Space}
                      onChange={(e) =>
                        setStep1Notes({ ...step1Notes, acknowledgedO1Space: e.target.checked })
                      }
                      className="rounded border-(--border-subtle) text-amber-500 focus:ring-amber-500"
                    />
                    <span>Memory limit is strictly O(1) auxiliary space (hash map rejected).</span>
                  </label>

                  <label className="flex items-center gap-3 text-xs text-(--text-primary) cursor-pointer">
                    <input
                      type="checkbox"
                      checked={step1Notes.acknowledgedExactSolution}
                      onChange={(e) =>
                        setStep1Notes({
                          ...step1Notes,
                          acknowledgedExactSolution: e.target.checked,
                        })
                      }
                      className="rounded border-(--border-subtle) text-amber-500 focus:ring-amber-500"
                    />
                    <span>Array is non-decreasing; exactly one valid pair is guaranteed.</span>
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-(--text-secondary)">
                    Clarification Questions or Notes (Optional):
                  </label>
                  <textarea
                    rows={2}
                    value={step1Notes.clarificationNotes}
                    onChange={(e) =>
                      setStep1Notes({ ...step1Notes, clarificationNotes: e.target.value })
                    }
                    placeholder="e.g. Can numbers be negative? (Yes, numbers can be negative)."
                    className="w-full text-xs p-3 rounded-xl border border-(--border-subtle) bg-(--bg-surface) text-(--text-primary) focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: EXPLAIN APPROACH */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-(--text-primary)">
                    Phase 2: Articulate the Invariant & Approach
                  </h4>
                  <p className="text-xs text-(--text-secondary)">
                    Explain why the two-pointer invariant works before typing code.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-(--text-secondary)">
                    Explain the Invariant:
                  </label>
                  <textarea
                    rows={4}
                    value={step2Approach.invariantExplanation}
                    onChange={(e) =>
                      setStep2Approach({
                        ...step2Approach,
                        invariantExplanation: e.target.value,
                      })
                    }
                    className="w-full text-xs p-3 rounded-xl border border-(--border-subtle) bg-(--bg-surface) text-(--text-primary) focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-300 space-y-1">
                  <span className="font-semibold">Invariant Guarantee:</span>
                  <p className="text-[11px] text-amber-300/80">
                    Because `numbers` is sorted, if `numbers[L] + numbers[R] &gt; target`, `numbers[R]`
                    cannot pair with any element &ge; `numbers[L]` to reach `target`. Discarding `R`
                    preserves all potential solutions.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3: IMPLEMENTATION */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-(--text-primary)">
                    Phase 3: Attempt Implementation
                  </h4>
                  <p className="text-xs text-(--text-secondary)">
                    Report your implementation outcome honestly. All outcomes are preserved
                    accurately in your learning profile.
                  </p>
                </div>

                <div className="space-y-3 p-4 rounded-xl border border-(--border-subtle) bg-(--bg-surface)">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-(--text-secondary)">
                      Implementation Result:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "solved", label: "Solved Successfully", color: "text-emerald-400" },
                        { id: "partially_solved", label: "Partially Solved", color: "text-amber-400" },
                        { id: "blocked", label: "Blocked / Stalled", color: "text-red-400" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setStep3Impl({ ...step3Impl, selfReportedStatus: opt.id })
                          }
                          className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                            step3Impl.selfReportedStatus === opt.id
                              ? "border-amber-400 bg-amber-500/10 text-amber-300"
                              : "border-(--border-subtle) text-(--text-muted) hover:text-(--text-primary)"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-(--text-secondary)">
                        Hints Used:
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={step3Impl.hintsUsed}
                        onChange={(e) =>
                          setStep3Impl({ ...step3Impl, hintsUsed: parseInt(e.target.value) || 0 })
                        }
                        className="w-full text-xs p-2 rounded-lg border border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-primary)"
                      />
                    </div>

                    <div className="space-y-1 flex flex-col justify-end">
                      <label className="flex items-center gap-2 text-xs text-(--text-primary) cursor-pointer pb-2">
                        <input
                          type="checkbox"
                          checked={step3Impl.solutionViewed}
                          onChange={(e) =>
                            setStep3Impl({ ...step3Impl, solutionViewed: e.target.checked })
                          }
                          className="rounded border-(--border-subtle) text-amber-500"
                        />
                        <span>Viewed Editorial Solution</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: EXAMINE BOUNDARIES */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-(--text-primary)">
                    Phase 4: Test Boundary Cases & Off-by-One Checks
                  </h4>
                  <p className="text-xs text-(--text-secondary)">
                    Walk through extreme test cases with the interviewer.
                  </p>
                </div>

                <div className="space-y-2.5 p-4 rounded-xl border border-(--border-subtle) bg-(--bg-surface)">
                  <label className="flex items-center gap-3 text-xs text-(--text-primary) cursor-pointer">
                    <input
                      type="checkbox"
                      checked={step4Boundaries.handledDuplicates}
                      onChange={(e) =>
                        setStep4Boundaries({
                          ...step4Boundaries,
                          handledDuplicates: e.target.checked,
                        })
                      }
                      className="rounded border-(--border-subtle) text-amber-500"
                    />
                    <span>Duplicates in input (e.g. `[2, 2, 11, 15]`, target 4 returns [1, 2]).</span>
                  </label>

                  <label className="flex items-center gap-3 text-xs text-(--text-primary) cursor-pointer">
                    <input
                      type="checkbox"
                      checked={step4Boundaries.handledNegatives}
                      onChange={(e) =>
                        setStep4Boundaries({
                          ...step4Boundaries,
                          handledNegatives: e.target.checked,
                        })
                      }
                      className="rounded border-(--border-subtle) text-amber-500"
                    />
                    <span>Negative values (e.g. `[-3, -1, 0, 4]`, target -4 returns [1, 2]).</span>
                  </label>

                  <label className="flex items-center gap-3 text-xs text-(--text-primary) cursor-pointer">
                    <input
                      type="checkbox"
                      checked={step4Boundaries.handledExtremes}
                      onChange={(e) =>
                        setStep4Boundaries({
                          ...step4Boundaries,
                          handledExtremes: e.target.checked,
                        })
                      }
                      className="rounded border-(--border-subtle) text-amber-500"
                    />
                    <span>Boundary indices: left &lt; right terminates without collision.</span>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 5: COMPARE COMPLEXITY */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-(--text-primary)">
                    Phase 5: Time & Space Complexity Tradeoff
                  </h4>
                  <p className="text-xs text-(--text-secondary)">
                    State runtime, auxiliary memory, and justify the algorithmic tradeoff.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-(--border-subtle) bg-(--bg-surface) space-y-1">
                    <span className="text-[10px] text-(--text-muted) uppercase font-mono">
                      Time Complexity
                    </span>
                    <p className="text-sm font-bold text-emerald-400">O(N)</p>
                    <p className="text-[11px] text-(--text-secondary)">
                      Each step decrements right or increments left. At most N operations.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-(--border-subtle) bg-(--bg-surface) space-y-1">
                    <span className="text-[10px] text-(--text-muted) uppercase font-mono">
                      Auxiliary Space
                    </span>
                    <p className="text-sm font-bold text-emerald-400">O(1)</p>
                    <p className="text-[11px] text-(--text-secondary)">
                      Only two integer pointers stored on the call frame.
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-(--text-secondary)">
                    Tradeoff Justification:
                  </label>
                  <textarea
                    rows={2}
                    value={step5Complexity.tradeoffNotes}
                    onChange={(e) =>
                      setStep5Complexity({
                        ...step5Complexity,
                        tradeoffNotes: e.target.value,
                      })
                    }
                    className="w-full text-xs p-3 rounded-xl border border-(--border-subtle) bg-(--bg-surface) text-(--text-primary) focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-(--border-subtle)">
              <div className="text-xs text-(--text-muted)">
                Step {currentStep} of 6 • Active Time Measured
              </div>

              <ButtonPrimary
                onClick={handleAdvanceStep}
                disabled={savingStep || drill?.isPaused}
                className="px-5 py-2 text-xs flex items-center gap-1.5"
              >
                <span>
                  {savingStep
                    ? "Saving..."
                    : currentStep === 5
                    ? "Complete Drill & Debrief"
                    : "Next Step"}
                </span>
                <ArrowRight className="size-3.5" />
              </ButtonPrimary>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

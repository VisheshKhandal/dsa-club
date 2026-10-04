"use client";

import React, { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { ITrackAdaptiveSheetData } from "@/features/intelligence/services/track.service";
import { enrollInTrackAction } from "@/features/intelligence/actions/track-actions";
import {
  startCheckpointSessionAction,
  submitCheckpointAttemptAction,
} from "@/features/intelligence/actions/checkpoint-actions";
import {
  CheckCircle2,
  Clock,
  Sparkles,
  Lock,
  ArrowRight,
  BookOpen,
  Target,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InterviewDrillModal } from "@/components/learning/interview-drill-modal";

interface AdaptiveSheetViewProps {
  initialData: ITrackAdaptiveSheetData;
}

export function AdaptiveSheetView({
  initialData,
}: AdaptiveSheetViewProps) {
  const toast = useToast();
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  // Active checkpoint modal state
  const [activeCheckpointKey, setActiveCheckpointKey] = useState<string | null>(null);
  const [checkpointSession, setCheckpointSession] = useState<any | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [checkpointResult, setCheckpointResult] = useState<any | null>(null);
  const [checkpointSubmitting, setCheckpointSubmitting] = useState(false);
  const [selectedInterviewProblem, setSelectedInterviewProblem] = useState<{
    slug: string;
    title: string;
  } | null>(null);

  const { track, enrollment, units, stats } = data;
  const isEnrolled = Boolean(enrollment && enrollment.status === "active");

  const handleStartTrack = () => {
    startTransition(async () => {
      const res = await enrollInTrackAction(track.trackSlug);
      if (res.ok) {
        toast.success("Started preparation track! Connected to your active study journey.");
        router.refresh();
      } else {
        toast.error("Failed to start track.");
      }
    });
  };

  const handleStartCheckpoint = (key: string) => {
    setSelectedOption(null);
    setCheckpointResult(null);
    setActiveCheckpointKey(key);

    startTransition(async () => {
      const res = await startCheckpointSessionAction({ itemKey: key });
      if (res.ok) {
        setCheckpointSession(res);
      } else {
        toast.error("Failed to load checkpoint session.");
      }
    });
  };

  const handleSubmitCheckpoint = () => {
    if (!checkpointSession || !selectedOption) return;
    setCheckpointSubmitting(true);

    startTransition(async () => {
      const res = await submitCheckpointAttemptAction({
        sessionId: checkpointSession.sessionId,
        selectedOptionKey: selectedOption,
      });
      setCheckpointSubmitting(false);

      if (res.ok) {
        setCheckpointResult(res);
        if (res.isCorrect) {
          toast.success("Checkpoint passed! Evidence recorded.");
        } else {
          toast.info("Checkpoint reviewed. See rubric feedback.");
        }
        router.refresh();
      } else {
        toast.error("Submission failed.");
      }
    });
  };

  return (
    <div className="space-y-10 pb-16 max-w-5xl mx-auto">
      {/* Scope & Contract Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-(--accent-lime)/15 text-(--accent-lime) border border-(--accent-lime)/30">
            PREPARATION TRACK
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-(--bg-surface-raised) border border-(--border-subtle) text-(--text-muted)">
            v{track.version}
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] bg-(--bg-surface-raised) border border-(--border-subtle) text-(--text-muted) flex items-center gap-1">
            <Clock className="size-3" />
            {track.workloadHours} Hours Workload
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] bg-(--bg-surface-raised) border border-(--border-subtle) text-(--text-muted)">
            Provenance: {track.provenance}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-(--text-primary)">
              {track.title}
            </h1>
            <p className="text-xs text-(--text-secondary) leading-relaxed">
              {track.shortDescription}
            </p>
          </div>

          {/* Track Action Control */}
          <div className="shrink-0">
            {isEnrolled ? (
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>Track Active • Connected to Journey</span>
              </div>
            ) : (
              <ButtonPrimary
                onClick={handleStartTrack}
                disabled={isPending}
                className="text-xs font-bold py-2.5 px-5 flex items-center gap-1.5"
              >
                {isPending ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Start Preparation Track</span>
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </ButtonPrimary>
            )}
          </div>
        </div>
      </div>

      {/* Track Contract Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Supported Scope */}
        <Card className="p-4 border-(--border-subtle) bg-(--bg-surface-raised) space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-(--text-primary)">
            <Target className="size-4 text-(--accent-lime)" />
            <span>Supported Scope</span>
          </div>
          <p className="text-(--text-secondary) leading-relaxed text-[11px]">
            {track.supportedScope}
          </p>
          <div className="pt-2 border-t border-(--border-subtle)/50 space-y-1">
            <div className="text-[10px] font-semibold text-(--text-muted) uppercase">
              Covered Capabilities
            </div>
            <div className="flex flex-wrap gap-1">
              {track.coveredCapabilities.map((cap) => (
                <span
                  key={cap}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-(--bg-surface) border border-(--border-subtle) text-(--text-secondary) font-mono"
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Intentionally Excluded */}
        <Card className="p-4 border-(--border-subtle) bg-(--bg-surface-raised) space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-(--text-primary)">
            <AlertCircle className="size-4 text-amber-400" />
            <span>Intentionally Excluded</span>
          </div>
          <p className="text-(--text-secondary) leading-relaxed text-[11px]">
            To guarantee thoroughness, this track does not claim to teach unrelated domains:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-(--text-muted) pt-1">
            {track.excludedTopics.map((topic, idx) => (
              <li key={idx}>{topic}</li>
            ))}
          </ul>
        </Card>

        {/* Completion Criteria & Progress */}
        <Card className="p-4 border-(--border-subtle) bg-(--bg-surface-raised) space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-(--text-primary)">
              <Award className="size-4 text-(--accent-lime)" />
              <span>Completion Evidence</span>
            </div>
            {stats.completionSummary ? (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                  stats.completionSummary.status === "completed"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : stats.completionSummary.status === "retention_pending"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : stats.completionSummary.status === "needs_transfer_evidence"
                    ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                    : "bg-(--bg-surface) text-(--text-muted) border-(--border-subtle)"
                )}
              >
                {stats.completionSummary.status.replace(/_/g, " ").toUpperCase()}
              </span>
            ) : stats.isTrackCompleted ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                COMPLETED
              </span>
            ) : null}
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between text-(--text-secondary)">
              <span>Problems Solved</span>
              <span className="font-bold text-(--text-primary)">
                {stats.completedProblems} / {track.completionCriteria.minCompletedProblems}
              </span>
            </div>
            <div className="flex justify-between text-(--text-secondary)">
              <span>Checkpoints Passed</span>
              <span className="font-bold text-(--text-primary)">
                {stats.passedCheckpoints} / {track.completionCriteria.minCheckpointsPassed}
              </span>
            </div>
            <div className="flex justify-between text-(--text-secondary)">
              <span>Arrays Mastery Score</span>
              <span className="font-bold text-(--text-primary)">
                {stats.masteryScore} / {track.completionCriteria.minMasteryScore}
              </span>
            </div>
          </div>
          {stats.completionSummary?.evidenceExplanation && (
            <div className="pt-2 border-t border-(--border-subtle)/50 text-[10px] text-(--text-secondary) leading-relaxed">
              {stats.completionSummary.evidenceExplanation}
            </div>
          )}
        </Card>
      </div>

      {/* Adaptive Sheet Units */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-xl font-bold text-(--text-primary)">
              Adaptive Preparation Sheet
            </h2>
            <p className="text-xs text-(--text-muted)">
              Units adapt to your verified problem solves, assistance evidence, and checkpoint outcomes.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {units.map((unit) => (
            <Card
              key={unit.unitId}
              className={cn(
                "p-5 border-(--border-subtle) bg-(--bg-surface-raised) space-y-4 transition-all",
                unit.isCompleted && "border-emerald-500/30"
              )}
            >
              {/* Unit Header */}
              <div className="flex items-start justify-between gap-4 border-b border-(--border-subtle)/60 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-(--accent-lime)">
                      UNIT {unit.order}
                    </span>
                    <h3 className="text-base font-bold text-(--text-primary)">
                      {unit.title}
                    </h3>
                  </div>
                  <p className="text-xs text-(--text-secondary)">
                    {unit.description}
                  </p>
                </div>
                {unit.isCompleted && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 flex items-center gap-1">
                    <Check className="size-3" />
                    Unit Mastered
                  </span>
                )}
              </div>

              {/* Unit Items Table */}
              <div className="divide-y divide-(--border-subtle)/40">
                {unit.items.map((item) => (
                  <div
                    key={item.itemId}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase",
                            item.type === "problem"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          )}
                        >
                          {item.type}
                        </span>
                        <span className="text-xs font-bold text-(--text-primary)">
                          {item.title}
                        </span>
                        {item.isPlannedToday && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-(--accent-lime)/15 text-(--accent-lime) border border-(--accent-lime)/30">
                            Planned Today
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-(--text-muted)">
                        <span>~{item.estimatedMinutes} mins</span>
                        {item.difficulty && (
                          <span className="capitalize">{item.difficulty}</span>
                        )}
                        {item.demonstratedIndependence !== undefined && (
                          <span className="text-emerald-400">
                            {item.demonstratedIndependence ? "Independent Solve" : "Assisted"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge & Launch Button */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {item.status === "solved" || item.status === "passed" ? (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="size-3.5" />
                          {item.status === "solved" ? "Solved" : "Passed"}
                        </span>
                      ) : item.status === "attempted" ? (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Reviewed ({item.score}%)
                        </span>
                      ) : item.status === "in_progress" ? (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          In Progress
                        </span>
                      ) : null}

                      {item.type === "problem" ? (
                        <div className="flex items-center gap-1.5">
                          <Link href={`/practice?problem=${item.slugOrKey}`}>
                            <ButtonSecondary className="text-xs py-1.5 px-3 flex items-center gap-1">
                              <span>{item.status === "solved" ? "Review" : "Practice"}</span>
                              <ArrowRight className="size-3" />
                            </ButtonSecondary>
                          </Link>
                          <ButtonSecondary
                            onClick={() =>
                              setSelectedInterviewProblem({
                                slug: item.slugOrKey,
                                title: item.title,
                              })
                            }
                            className="text-xs py-1.5 px-2.5 flex items-center gap-1 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                            title="Start bounded 6-step interview drill"
                          >
                            <Clock className="size-3" />
                            <span className="hidden sm:inline">Interview Drill</span>
                          </ButtonSecondary>
                        </div>
                      ) : (
                        <ButtonSecondary
                          onClick={() => handleStartCheckpoint(item.slugOrKey)}
                          className="text-xs py-1.5 px-3 flex items-center gap-1 text-(--accent-lime) border-(--accent-lime)/30 hover:bg-(--accent-lime)/10"
                        >
                          <Sparkles className="size-3" />
                          <span>{item.status === "passed" ? "Retake" : "Checkpoint"}</span>
                        </ButtonSecondary>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Checkpoint Assessment Modal */}
      {activeCheckpointKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-(--bg-surface-raised) border border-(--border-subtle) rounded-2xl shadow-2xl p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
              <div>
                <span className="text-[11px] font-mono text-(--accent-lime) font-semibold uppercase">
                  Reviewed Checkpoint
                </span>
                <h3 className="text-base font-bold text-(--text-primary)">
                  {checkpointSession?.item?.capability?.replace(/_/g, " ") || "Assessment Item"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveCheckpointKey(null)}
                className="text-(--text-muted) hover:text-(--text-primary) p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Loading session */}
            {!checkpointSession ? (
              <div className="py-12 text-center">
                <RefreshCw className="size-6 text-(--accent-lime) animate-spin mx-auto" />
                <p className="text-xs text-(--text-muted) mt-2">Freezing item version...</p>
              </div>
            ) : !checkpointResult ? (
              <div className="space-y-5">
                {/* Prompt */}
                <div className="p-4 rounded-xl border border-(--border-subtle) bg-(--bg-surface) text-xs text-(--text-primary) leading-relaxed">
                  {checkpointSession.item.prompt}
                </div>

                {/* Rubric Options (answers stripped until submitted) */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-(--text-muted)">
                    Select Your Answer:
                  </div>
                  <div className="space-y-2">
                    {checkpointSession.item.options.map((opt: any) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setSelectedOption(opt.key)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border text-xs transition-all flex items-start gap-2.5",
                          selectedOption === opt.key
                            ? "border-(--accent-lime) bg-(--accent-lime)/10 text-(--text-primary)"
                            : "border-(--border-subtle) bg-(--bg-surface) text-(--text-secondary) hover:border-(--border-subtle)/80"
                        )}
                      >
                        <span className="font-bold text-(--accent-lime) shrink-0">
                          {opt.key}.
                        </span>
                        <span>{opt.text}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <ButtonSecondary
                    onClick={() => setActiveCheckpointKey(null)}
                    className="text-xs py-2 px-4"
                  >
                    Cancel
                  </ButtonSecondary>
                  <ButtonPrimary
                    onClick={handleSubmitCheckpoint}
                    disabled={!selectedOption || checkpointSubmitting}
                    className="text-xs font-bold py-2 px-5"
                  >
                    {checkpointSubmitting ? (
                      <RefreshCw className="size-3.5 animate-spin" />
                    ) : (
                      "Submit Response"
                    )}
                  </ButtonPrimary>
                </div>
              </div>
            ) : (
              /* Rubric Feedback Stage */
              <div className="space-y-5">
                <div
                  className={cn(
                    "p-4 rounded-xl border flex items-start gap-3 text-xs",
                    checkpointResult.isCorrect
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  )}
                >
                  {checkpointResult.isCorrect ? (
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="size-5 shrink-0 text-amber-400 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <div className="font-bold text-sm">
                      {checkpointResult.isCorrect ? "Correct Reasoning" : "Needs Review"}
                    </div>
                    <p className="leading-relaxed">{checkpointResult.feedback}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-(--border-subtle) bg-(--bg-surface) space-y-1 text-xs">
                  <div className="font-semibold text-(--text-muted)">Reference Explanation:</div>
                  <p className="text-(--text-secondary) leading-relaxed">
                    {checkpointResult.explanation}
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <ButtonPrimary
                    onClick={() => setActiveCheckpointKey(null)}
                    className="text-xs font-bold py-2 px-5"
                  >
                    Return to Sheet
                  </ButtonPrimary>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interview Drill Modal */}
      {selectedInterviewProblem && (
        <InterviewDrillModal
          problemSlug={selectedInterviewProblem.slug}
          problemTitle={selectedInterviewProblem.title}
          isOpen={!!selectedInterviewProblem}
          onClose={() => setSelectedInterviewProblem(null)}
          onDrillCompleted={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

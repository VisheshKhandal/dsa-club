"use client";

import { useEffect, useState, useRef, useTransition, useActionState, useMemo } from "react";
import { useFormStatus } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Brain, CheckCircle2, ChevronRight, Clock,
  ExternalLink, Lightbulb, LoaderCircle, Repeat2, Sparkles, Target, Trophy, Zap,
  AlertTriangle, BookOpen, Code, Layers
} from "lucide-react";
import Link from "next/link";
import { recordRevisionAction } from "@/features/product/actions/product.actions";
import { useLearnerSync } from "@/components/sync/learner-sync-context";

/* ── Types ── */
export type CompletedSessionRecord = {
  id: string;
  title: string;
  entityType: string;
  grade: number;
  confidence: number;
  nextDays: number;
  elapsedSeconds: number;
};
type RevisionItem = {
  id: string;
  entityType: string;
  title: string;
  href: string;
  sourceHref: string;
  detail: string;
  description: string;
  patternName: string;
  topicName: string;
  keywords: string[];
  hints: { level: number; title: string; content: string }[];
  commonMistakes: string[];
  thinkingDirection: string;
  dryRunPrompt: string;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  history: {
    id: string;
    reviewedAt: string;
    grade: number;
    confidence: number;
    nextIntervalDays: number;
  }[];
};

/* ── Shared style tokens ── */
const inputClass =
  "w-full rounded-[10px] border border-(--color-border) bg-(--color-surface-1) px-3.5 py-3 text-sm text-(--color-text-primary) outline-none transition placeholder:text-(--color-text-muted) focus:border-(--color-purple) focus:ring-2 focus:ring-(--color-purple)/20";
const selectClass =
  "h-10 w-full rounded-[10px] border border-(--color-border) bg-(--color-surface-1) px-3.5 text-sm text-(--color-text-primary) outline-none transition focus:border-(--color-purple) focus:ring-2 focus:ring-(--color-purple)/20";

/* ── Step definitions ── */
const STEPS = [
  { key: "recall", label: "Recall", icon: Brain },
  { key: "selfcheck", label: "Self-check", icon: CheckCircle2 },
  { key: "pattern", label: "Pattern", icon: Layers },
  { key: "practice", label: "Practice", icon: Code },
  { key: "complete", label: "Complete", icon: Trophy },
] as const;
type StepKey = typeof STEPS[number]["key"];

/* ── Grade / confidence label helpers ── */
const GRADE_LABELS: Record<number, { label: string; color: string }> = {
  5: { label: "Easy — recalled perfectly", color: "text-emerald-300" },
  4: { label: "Good — recalled with effort", color: "text-cyan-300" },
  3: { label: "Hard — recalled after struggle", color: "text-amber-300" },
  2: { label: "Difficult — incorrect or partial recall", color: "text-rose-300" },
  1: { label: "Poor — remembered only with cues", color: "text-rose-400" },
  0: { label: "Blackout — total memory blank", color: "text-red-400" },
};
const CONF_LABELS: Record<number, string> = {
  5: "Very high confidence",
  4: "High confidence",
  3: "Medium confidence",
  2: "Low confidence",
  1: "Very low confidence",
};

/* ── Timer hook ── */
function useElapsedSeconds() {
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return seconds;
}

/* ══════════════════════════════════════════════════════
   Main session client
══════════════════════════════════════════════════════ */
export function RevisionSessionClient({
  queueId,
  queueIds,
}: {
  queueId: string;
  queueIds?: string[];
}) {
  const allQueueIds = useMemo(() => {
    if (!queueIds || queueIds.length === 0) return [queueId];
    if (!queueIds.includes(queueId)) return [queueId, ...queueIds];
    return queueIds;
  }, [queueId, queueIds]);

  const [activeQueueId, setActiveQueueId] = useState(queueId);
  const [completedRecords, setCompletedRecords] = useState<CompletedSessionRecord[]>([]);
  const [item, setItem] = useState<RevisionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentIndex = allQueueIds.indexOf(activeQueueId);
  const totalItems = allQueueIds.length;
  const isMultiSession = totalItems > 1;
  const isLastItem = currentIndex >= totalItems - 1 || currentIndex === -1;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/v1/revision/${activeQueueId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setItem(data);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e.message ?? "Failed to load session"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeQueueId]);

  const handleAdvance = () => {
    if (currentIndex < allQueueIds.length - 1) {
      const nextId = allQueueIds[currentIndex + 1];
      setActiveQueueId(nextId);
      try {
        window.history.replaceState(
          null,
          "",
          `/revision/session/${nextId}?queue=${allQueueIds.join(",")}`
        );
      } catch {
        // ignore
      }
    }
  };

  const handleRecordCompleted = (record: CompletedSessionRecord) => {
    setCompletedRecords((prev) => {
      if (prev.some((r) => r.id === record.id)) return prev;
      return [...prev, record];
    });
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 rounded-md bg-white/[0.06] animate-[skeleton-shimmer_1.6s_ease-in-out_infinite]" />
          <div className="h-4 w-16 rounded-md bg-white/[0.06] animate-[skeleton-shimmer_1.6s_ease-in-out_infinite]" />
        </div>
        {/* Entity hero skeleton */}
        <div className="rounded-[18px] border border-purple-300/[0.14] bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="size-10 rounded-xl bg-white/[0.06] animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-24 rounded-sm bg-white/[0.06] animate-[skeleton-shimmer_1.6s_ease-in-out_infinite]" />
              <div className="h-6 w-3/4 rounded-md bg-white/[0.06] animate-[skeleton-shimmer_1.6s_ease-in-out_infinite]" />
              <div className="h-3 w-1/2 rounded-sm bg-white/[0.06] animate-[skeleton-shimmer_1.6s_ease-in-out_infinite]" />
            </div>
          </div>
          <div className="h-12 w-full rounded-xl bg-white/[0.04] animate-[skeleton-shimmer_1.6s_ease-in-out_infinite]" />
        </div>
        {/* Step tabs skeleton */}
        <div className="flex gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-8 w-24 rounded-full bg-white/[0.06] animate-[skeleton-shimmer_1.6s_ease-in-out_infinite]" />
          ))}
        </div>
        {/* Content skeleton */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
          <div className="h-4 w-28 rounded-md bg-white/[0.06] animate-[skeleton-shimmer_1.6s_ease-in-out_infinite]" />
          <div className="h-5 w-2/3 rounded-md bg-white/[0.06] animate-[skeleton-shimmer_1.6s_ease-in-out_infinite]" />
          <div className="h-4 w-full rounded-md bg-white/[0.06] animate-[skeleton-shimmer_1.6s_ease-in-out_infinite]" />
          <div className="h-28 w-full rounded-xl bg-white/[0.04] animate-[skeleton-shimmer_1.6s_ease-in-out_infinite]" />
        </div>
        <div className="h-11 w-48 rounded-xl bg-white/[0.06] animate-[skeleton-shimmer_1.6s_ease-in-out_infinite]" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-xl mx-auto space-y-6 py-16 text-center">
        <AlertTriangle size={32} className="mx-auto text-amber-400" />
        <p className="text-white font-semibold">{error ?? "Session not found"}</p>
        <Link href="/revision" className="inline-flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200">
          <ArrowLeft size={14} /> Back to revision queue
        </Link>
      </div>
    );
  }

  return (
    <RevisionSessionShell
      key={activeQueueId}
      item={item}
      currentIndex={currentIndex >= 0 ? currentIndex : 0}
      totalItems={totalItems}
      isMultiSession={isMultiSession}
      isLastItem={isLastItem}
      completedRecords={completedRecords}
      onRecordCompleted={handleRecordCompleted}
      onAdvance={handleAdvance}
    />
  );
}

/* ── Session Shell: multi-step UI ── */
function RevisionSessionShell({
  item,
  currentIndex,
  totalItems,
  isMultiSession,
  isLastItem,
  completedRecords,
  onRecordCompleted,
  onAdvance,
}: {
  item: RevisionItem;
  currentIndex: number;
  totalItems: number;
  isMultiSession: boolean;
  isLastItem: boolean;
  completedRecords: CompletedSessionRecord[];
  onRecordCompleted: (rec: CompletedSessionRecord) => void;
  onAdvance: () => void;
}) {
  const [step, setStep] = useState<StepKey>("recall");
  const [recallText, setRecallText] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState<"yes" | "partial" | "no" | null>(null);
  const [patternNotes, setPatternNotes] = useState("");
  const [dryRunDone, setDryRunDone] = useState(false);
  const [summary, setSummary] = useState("");
  const [grade, setGrade] = useState(4);
  const [confidence, setConfidence] = useState(3);
  const elapsed = useElapsedSeconds();

  const commandIdRef = useRef<string>(typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `rev-${item.id}-${Date.now()}`);
  const { broadcastUpdate } = useLearnerSync();

  const [completionState, formAction] = useActionState(
    async (_prev: { ok: boolean; message: string; receipt?: any }, formData: FormData) => {
      const rawGrade = formData.get("grade");
      const gradeVal = rawGrade !== null ? Number(rawGrade) : grade;
      const rawConfidence = formData.get("confidence");
      const confVal = rawConfidence !== null ? Number(rawConfidence) : confidence;
      const rawElapsed = formData.get("responseSeconds");
      const elapsedVal = rawElapsed !== null ? Number(rawElapsed) : elapsed;

      const isAssisted = Boolean(showAnswer);
      return await recordRevisionAction({
        commandId: commandIdRef.current,
        queueId: item.id,
        grade: gradeVal,
        confidence: confVal,
        responseSeconds: elapsedVal,
        recallText,
        quizAnswer,
        patternNotes,
        dryRunDone,
        summary: (formData.get("summary") as string) || summary,
        assisted: isAssisted,
        hintsUsed: 0,
        solutionViewed: Boolean(showAnswer),
      });
    },
    { ok: false, message: "", receipt: undefined }
  );

  useEffect(() => {
    if (completionState.ok) {
      broadcastUpdate({
        type: "LEARNER_MUTATION_COMMITTED",
        commandId: commandIdRef.current,
        entityType: "revision",
        entityId: item.id,
      });
      const backendNextDays = completionState.receipt?.reviewEffect?.nextIntervalDays;
      const nextDays =
        typeof backendNextDays === "number"
          ? backendNextDays
          : (grade >= 4 ? Math.max(1, item.intervalDays * 2) : grade === 3 ? Math.max(1, item.intervalDays) : 1);
      onRecordCompleted({
        id: item.id,
        title: item.title,
        entityType: item.entityType,
        grade,
        confidence,
        nextDays,
        elapsedSeconds: elapsed,
      });
    }
  }, [completionState.ok, completionState.receipt, grade, confidence, elapsed, item.id, item.title, item.entityType, item.intervalDays, onRecordCompleted, broadcastUpdate]);

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const entityIcon =
    item.entityType === "problem" ? Target :
    item.entityType === "pattern" ? Layers :
    item.entityType === "mission" ? Sparkles :
    BookOpen;
  const EntityIcon = entityIcon;

  /* ── Completion screen / Transitions ── */
  if (completionState.ok) {
    const backendNextDays = completionState.receipt?.reviewEffect?.nextIntervalDays;
    const nextDays =
      typeof backendNextDays === "number"
        ? backendNextDays
        : (grade >= 4 ? Math.max(1, item.intervalDays * 2) : grade === 3 ? Math.max(1, item.intervalDays) : 1);

    if (isMultiSession) {
      if (!isLastItem) {
        return (
          <QueueItemTransitionScreen
            item={item}
            grade={grade}
            nextDays={nextDays}
            itemIndex={currentIndex}
            totalItems={totalItems}
            onContinue={onAdvance}
          />
        );
      }

      // Last item of multi session:
      const currentRec: CompletedSessionRecord = {
        id: item.id,
        title: item.title,
        entityType: item.entityType,
        grade,
        confidence,
        nextDays,
        elapsedSeconds: elapsed,
      };
      const allDone = [...completedRecords.filter((r) => r.id !== item.id), currentRec];
      const totalElapsed = allDone.reduce((sum, r) => sum + r.elapsedSeconds, 0);
      return <MultiItemSessionRecapScreen records={allDone} totalSeconds={totalElapsed} />;
    }

    const gradeInfo = GRADE_LABELS[grade] ?? GRADE_LABELS[4];
    const confLabel = CONF_LABELS[confidence] ?? "Medium confidence";
    return (
      <CompletionScreen
        item={item}
        grade={grade}
        gradeInfo={gradeInfo}
        confLabel={confLabel}
        nextDays={nextDays}
        elapsedSeconds={elapsed}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* Top Session Progress Bar for multi-item session */}
      {isMultiSession && (
        <SessionProgressBar
          currentIndex={currentIndex}
          totalItems={totalItems}
          estimatedMinutesRemaining={Math.max(1, (totalItems - currentIndex) * 5)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Link href="/revision" className="inline-flex items-center gap-1.5 text-sm text-purple-300/70 hover:text-purple-200 transition">
          <ArrowLeft size={14} /> Revision Queue
        </Link>
        <div className="flex items-center gap-2 text-xs text-purple-100/40">
          <Clock size={13} />
          <span>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span>
        </div>
      </div>

      {/* Entity hero */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[18px] border border-purple-300/[0.14] bg-gradient-to-br from-[#0d0620] via-[#0a0418] to-[#07020d] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.35)]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.12),transparent_55%)]" />
        <div className="relative">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 grid size-10 place-items-center rounded-xl bg-purple-400/[0.12] border border-purple-400/20">
              <EntityIcon size={18} className="text-purple-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-purple-300/60">{item.entityType}</span>
                {item.topicName && <span className="text-[10px] text-purple-100/40">· {item.topicName}</span>}
                {item.patternName && (step !== "recall" || showAnswer) && (
                  <span className="text-[10px] text-cyan-300/60">· {item.patternName}</span>
                )}
              </div>
              <h1 className="text-xl font-bold text-white leading-tight">{item.title}</h1>
              <p className="mt-1 text-xs text-purple-100/40">{item.detail}</p>
            </div>
          </div>
          {item.description && (step !== "recall" || showAnswer) && (
            <p className="mt-4 text-sm leading-relaxed text-purple-100/55 border-t border-white/[0.05] pt-4">
              {item.description}
            </p>
          )}
          {/* SR stats */}
          <div className="mt-4 flex flex-wrap gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-purple-100/50">
              <Repeat2 size={11} /> {item.repetitions} reviews
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-purple-100/50">
              <Clock size={11} /> {item.intervalDays}d interval
            </span>
            {item.lapses > 0 && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/20 bg-amber-400/[0.05] px-2.5 py-1 text-amber-300/80">
                <AlertTriangle size={11} /> {item.lapses} lapses
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Step progress tabs */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < stepIndex;
          const active = s.key === step;
          return (
            <button
              key={s.key}
              onClick={() => setStep(s.key)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                active
                  ? "border-purple-400/40 bg-purple-400/[0.15] text-purple-100"
                  : done
                  ? "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-300"
                  : "border-white/[0.07] bg-white/[0.025] text-purple-100/35"
              }`}
            >
              {done ? <CheckCircle2 size={11} /> : <Icon size={11} />}
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === "recall" && (
            <RecallStep
              item={item}
              recallText={recallText}
              setRecallText={setRecallText}
              showAnswer={showAnswer}
              setShowAnswer={setShowAnswer}
              onNext={() => setStep("selfcheck")}
            />
          )}
          {step === "selfcheck" && (
            <SelfCheckStep
              item={item}
              answer={quizAnswer}
              setAnswer={setQuizAnswer}
              onNext={() => setStep("pattern")}
            />
          )}
          {step === "pattern" && (
            <PatternRecallStep
              item={item}
              notes={patternNotes}
              setNotes={setPatternNotes}
              onNext={() => setStep("practice")}
            />
          )}
          {step === "practice" && (
            <PracticeStep
              item={item}
              done={dryRunDone}
              setDone={setDryRunDone}
              onNext={() => setStep("complete")}
            />
          )}
          {step === "complete" && (
            <CompleteStep
              item={item}
              grade={grade}
              setGrade={setGrade}
              confidence={confidence}
              setConfidence={setConfidence}
              summary={summary}
              setSummary={setSummary}
              elapsed={elapsed}
              formAction={formAction}
              quizAnswer={quizAnswer}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ══════ Step Components ══════ */

/* ── Recall ── */
function RecallStep({
  item, recallText, setRecallText, showAnswer, setShowAnswer, onNext,
}: {
  item: RevisionItem;
  recallText: string;
  setRecallText: (v: string) => void;
  showAnswer: boolean;
  setShowAnswer: (v: boolean) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <StepCard
        icon={Brain}
        eyebrow="Step 1 · Active Recall"
        title={`What do you remember about "${item.title}"?`}
        body={`Before looking at any notes: write or say aloud what you remember. Cover the key idea, when to use it, its time/space complexity, and one concrete example.`}
        accent="purple"
      />

      <div className="space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-purple-100/40">
          Your recall (optional — private, helps you self-assess)
        </label>
        <textarea
          value={recallText}
          onChange={(e) => setRecallText(e.target.value)}
          placeholder="Write what you remember about this concept…"
          className={`${inputClass} min-h-28 resize-y`}
        />
      </div>

      {!showAnswer && (
        <button
          onClick={() => setShowAnswer(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-purple-100/70 hover:bg-white/[0.06] hover:text-white transition"
        >
          <Lightbulb size={14} /> Reveal concept summary
        </button>
      )}

      {showAnswer && item.description && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-4"
        >
          <p className="text-xs font-semibold text-cyan-300/70 mb-2 uppercase tracking-wide">Concept summary</p>
          <p className="text-sm leading-relaxed text-purple-100/75">{item.description}</p>
          {item.thinkingDirection && (
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <p className="text-xs font-semibold text-cyan-300/50 mb-1">Thinking direction</p>
              <p className="text-sm leading-relaxed text-purple-100/60">{item.thinkingDirection}</p>
            </div>
          )}
        </motion.div>
      )}

      {showAnswer && item.keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-purple-100/30 self-center">Signal words:</span>
          {item.keywords.map((kw) => (
            <span key={kw} className="rounded-md border border-purple-400/20 bg-purple-400/[0.06] px-2 py-0.5 text-[11px] text-purple-200/70">
              {kw}
            </span>
          ))}
        </div>
      )}

      <NextButton label="Continue to self-check" onClick={onNext} />
    </div>
  );
}

/* ── Self-check ── */
const QUIZ_ITEMS = [
  "I can state the core invariant / key idea.",
  "I can give the time and space complexity.",
  "I can describe a concrete failure/edge case.",
];

function SelfCheckStep({
  item, answer, setAnswer, onNext,
}: {
  item: RevisionItem;
  answer: "yes" | "partial" | "no" | null;
  setAnswer: (v: "yes" | "partial" | "no") => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <StepCard
        icon={CheckCircle2}
        eyebrow="Step 2 · Self-Check"
        title="Mini quiz — be honest"
        body={`For "${item.title}", answer the three questions below without peeking:`}
        accent="emerald"
      />

      <div className="space-y-3">
        {QUIZ_ITEMS.map((q, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
            <span className="mt-0.5 grid size-5 flex-shrink-0 place-items-center rounded-full bg-purple-400/[0.12] text-[10px] font-bold text-purple-300">{i + 1}</span>
            <p className="text-sm text-purple-100/75">{q}</p>
          </div>
        ))}
      </div>

      {item.hints.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-100/30">Hints (expand if needed)</p>
          {item.hints.map((hint) => (
            <details key={hint.level} className="rounded-lg border border-white/[0.07] bg-black/15 p-3">
              <summary className="cursor-pointer text-sm font-medium text-purple-100">
                Hint {hint.level}{hint.title ? ` — ${hint.title}` : ""}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-purple-100/65">{hint.content}</p>
            </details>
          ))}
        </div>
      )}

      {item.commonMistakes.length > 0 && (
        <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-4">
          <p className="text-xs font-semibold text-amber-300/80 mb-2">Common mistakes</p>
          <ul className="space-y-1 list-disc pl-5 text-sm text-purple-100/65">
            {item.commonMistakes.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium text-white">Overall self-assessment:</p>
        <div className="flex gap-2">
          {(["yes", "partial", "no"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setAnswer(v)}
              className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${
                answer === v
                  ? v === "yes" ? "border-emerald-400/35 bg-emerald-400/[0.12] text-emerald-300"
                    : v === "partial" ? "border-amber-400/35 bg-amber-400/[0.10] text-amber-300"
                    : "border-rose-400/35 bg-rose-400/[0.10] text-rose-300"
                  : "border-white/[0.07] bg-white/[0.02] text-purple-100/50 hover:bg-white/[0.04]"
              }`}
            >
              {v === "yes" ? "✓ Got it" : v === "partial" ? "≈ Mostly" : "✗ Not yet"}
            </button>
          ))}
        </div>
      </div>

      <NextButton label="Continue to pattern recall" onClick={onNext} disabled={answer === null} />
    </div>
  );
}

/* ── Pattern recall ── */
function PatternRecallStep({
  item, notes, setNotes, onNext,
}: {
  item: RevisionItem;
  notes: string;
  setNotes: (v: string) => void;
  onNext: () => void;
}) {
  const isPatternType = item.entityType === "pattern" || Boolean(item.patternName);
  return (
    <div className="space-y-5">
      <StepCard
        icon={Layers}
        eyebrow="Step 3 · Pattern Recall"
        title="When would you reach for this?"
        body={
          isPatternType
            ? `Name the problem signals or constraints that tell you to use "${item.patternName || item.title}". What does the input/output shape look like?`
            : `What pattern does "${item.title}" demonstrate? Name the signal words that would make you pick this approach in an unseen problem.`
        }
        accent="fuchsia"
      />

      {item.keywords.length > 0 && (
        <div className="rounded-xl border border-fuchsia-400/15 bg-fuchsia-400/[0.04] p-4">
          <p className="text-xs font-semibold text-fuchsia-300/70 mb-3">Key signals for this concept</p>
          <div className="flex flex-wrap gap-2">
            {item.keywords.map((kw) => (
              <span key={kw} className="rounded-md border border-fuchsia-400/25 bg-fuchsia-400/[0.08] px-2.5 py-1 text-xs font-medium text-fuchsia-200">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-purple-100/40">
          Your pattern notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. 'Use when asked for a subarray with a constraint on sum — sliding window applies if all values are positive.'"
          className={`${inputClass} min-h-24 resize-y`}
        />
      </div>

      <NextButton label="Continue to practice" onClick={onNext} />
    </div>
  );
}

/* ── Practice / dry-run ── */
function PracticeStep({
  item, done, setDone, onNext,
}: {
  item: RevisionItem;
  done: boolean;
  setDone: (v: boolean) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <StepCard
        icon={Code}
        eyebrow="Step 4 · Apply (Optional)"
        title="Practice this concept once"
        body={item.dryRunPrompt || `Open the linked resource, attempt the core step or dry-run a small example, then return here to rate your recall honestly.`}
        accent="cyan"
      />

      <div className="flex flex-wrap gap-3">
        {item.href && (
          <Link
            href={item.href}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.09] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-purple-100 hover:bg-white/[0.07] hover:text-white transition"
          >
            Open in DSA Club <ArrowRight size={13} />
          </Link>
        )}
        {item.sourceHref && (
          <a
            href={item.sourceHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-purple-300/20 bg-purple-400/[0.07] px-4 py-2.5 text-sm font-semibold text-purple-200 hover:bg-purple-400/[0.12] transition"
          >
            External practice <ExternalLink size={13} />
          </a>
        )}
      </div>

      <button
        onClick={() => setDone(!done)}
        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
          done
            ? "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-300"
            : "border-white/[0.07] bg-white/[0.025] text-purple-100/60 hover:bg-white/[0.05] hover:text-white"
        }`}
      >
        <CheckCircle2 size={15} />
        {done ? "Practice marked complete" : "Mark as practiced"}
      </button>

      <NextButton label="Finish & rate recall" onClick={onNext} />
    </div>
  );
}

/* ── Complete ── */
function CompleteStep({
  item, grade, setGrade, confidence, setConfidence, summary, setSummary, elapsed, formAction, quizAnswer,
}: {
  item: RevisionItem;
  grade: number;
  setGrade: (v: number) => void;
  confidence: number;
  setConfidence: (v: number) => void;
  summary: string;
  setSummary: (v: string) => void;
  elapsed: number;
  formAction: (formData: FormData) => void;
  quizAnswer: "yes" | "partial" | "no" | null;
}) {
  // Suggest grade based on self-check
  const suggestedGrade = quizAnswer === "yes" ? 4 : quizAnswer === "partial" ? 3 : 2;

  return (
    <div className="space-y-6">
      <StepCard
        icon={Trophy}
        eyebrow="Step 5 · Complete Review"
        title="Rate this recall session"
        body="Be honest — accurate grading improves your spaced repetition schedule more than inflated scores."
        accent="violet"
      />

      {quizAnswer !== null && (
        <div className="rounded-xl border border-purple-400/15 bg-purple-400/[0.05] p-4">
          <p className="text-xs text-purple-300/60 mb-2">Based on your self-check, suggested grade:</p>
          <p className="text-sm font-semibold text-white">{GRADE_LABELS[suggestedGrade]?.label}</p>
          <button
            onClick={() => setGrade(suggestedGrade)}
            className="mt-2 text-xs text-purple-300 hover:text-purple-200 underline underline-offset-2"
          >
            Apply suggestion
          </button>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="responseSeconds" value={elapsed} />

        <div className="space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-purple-100/40">
            Session Summary & Learnings (Optional)
          </label>
          <textarea
            name="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="What did you forget? What clicked this time?"
            className={`${inputClass} min-h-20 resize-y`}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-purple-100/40">
            Recall quality
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {([5, 4, 3, 2, 1, 0] as const).map((g) => {
              const info = GRADE_LABELS[g];
              return (
                <button
                  key={g}
                  type="button"
                  name="grade"
                  value={g}
                  onClick={() => setGrade(g)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    grade === g
                      ? "border-purple-400/40 bg-purple-400/[0.12]"
                      : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <span className={`text-lg font-bold ${grade === g ? "text-purple-300" : "text-purple-100/30"}`}>{g}</span>
                  <span className={`text-sm ${grade === g ? info.color : "text-purple-100/50"}`}>{info.label}</span>
                </button>
              );
            })}
          </div>
          <input type="hidden" name="grade" value={grade} />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-purple-100/40">
            Confidence level
          </label>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setConfidence(c)}
                title={CONF_LABELS[c]}
                className={`flex-1 rounded-xl border py-3 text-base font-bold transition ${
                  confidence === c
                    ? "border-fuchsia-400/40 bg-fuchsia-400/[0.15] text-fuchsia-300"
                    : "border-white/[0.07] bg-white/[0.025] text-purple-100/30 hover:bg-white/[0.05]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="text-xs text-purple-100/40">{CONF_LABELS[confidence]}</p>
          <input type="hidden" name="confidence" value={confidence} />
        </div>

        <CompleteReviewButton />
      </form>
    </div>
  );
}

function CompleteReviewButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-ring inline-flex w-full h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-400 via-purple-400 to-violet-500 text-sm font-bold text-white shadow-[0_6px_24px_rgba(168,85,247,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(168,85,247,0.4)] disabled:opacity-60 disabled:translate-y-0"
    >
      {pending ? <LoaderCircle className="animate-spin-slow" size={16} /> : <CheckCircle2 size={16} />}
      {pending ? "Completing…" : "Complete Review & Update Queue"}
    </button>
  );
}

/* ── Top Session Progress Bar for multi-item session ── */
function SessionProgressBar({
  currentIndex,
  totalItems,
  estimatedMinutesRemaining,
}: {
  currentIndex: number;
  totalItems: number;
  estimatedMinutesRemaining: number;
}) {
  return (
    <div className="rounded-xl border border-purple-400/20 bg-purple-950/30 backdrop-blur-md p-3.5 space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-purple-400 animate-pulse" />
          <span className="font-bold text-white tracking-wide">
            Item {currentIndex + 1} of {totalItems}
          </span>
          <span className="rounded-md border border-purple-400/25 bg-purple-400/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
            Daily Session
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-purple-200/60 font-medium">
            ~{estimatedMinutesRemaining} min remaining
          </span>
          <Link
            href="/revision"
            className="text-[11px] text-purple-300/60 hover:text-purple-200 underline underline-offset-2 transition"
          >
            Exit session
          </Link>
        </div>
      </div>
      {/* Segmented bar */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${totalItems}, minmax(0, 1fr))` }}>
        {Array.from({ length: totalItems }, (_, i) => {
          const isDone = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                isDone
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                  : isCurrent
                  ? "bg-gradient-to-r from-purple-400 to-violet-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                  : "bg-white/[0.08]"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ── Queue Item Micro-Transition Screen (between items in a multi-item queue) ── */
function QueueItemTransitionScreen({
  item,
  grade,
  nextDays,
  itemIndex,
  totalItems,
  onContinue,
}: {
  item: RevisionItem;
  grade: number;
  nextDays: number;
  itemIndex: number;
  totalItems: number;
  onContinue: () => void;
}) {
  const gradeInfo = GRADE_LABELS[grade] ?? GRADE_LABELS[4];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        onContinue();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onContinue]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-xl mx-auto space-y-6 py-6"
    >
      <div className="relative overflow-hidden rounded-[20px] border border-purple-400/20 bg-gradient-to-br from-[#0c061e] via-[#090416] to-[#05020c] p-6 text-center shadow-[0_24px_64px_rgba(0,0,0,0.4)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.12),transparent_60%)]" />
        <div className="relative space-y-3">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-400/10 border border-emerald-400/25 text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
          <h2 className="text-xl font-bold text-white">
            {grade >= 4 ? `Great recall on ${item.title}!` : `Review recorded for ${item.title}`}
          </h2>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-xs text-purple-200/80">
            <span className={gradeInfo.color}>Grade: {grade}/5</span>
            <span className="text-white/20">·</span>
            <span>Next review in ~{nextDays} days</span>
          </div>
        </div>
      </div>

      {/* Up next card */}
      <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.025] p-5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-purple-300/60">
            Up Next · Item {itemIndex + 2} of {totalItems}
          </span>
          <span className="text-purple-200/50">~5 min estimated</span>
        </div>
        <p className="text-sm font-semibold text-white">
          Continue to the next revision item to keep your recall session focused.
        </p>
        <p className="text-xs text-purple-200/40">
          Tip: Keeping your momentum going trains immediate pattern switching across topics.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={onContinue}
          className="focus-ring w-full sm:flex-1 h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-400 via-purple-400 to-violet-500 text-sm font-bold text-white shadow-[0_6px_24px_rgba(168,85,247,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(168,85,247,0.4)]"
        >
          Continue Session (Item {itemIndex + 2} of {totalItems}) <ArrowRight size={15} />
        </button>
        <Link
          href="/revision"
          className="w-full sm:w-auto h-12 inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 text-sm font-semibold text-purple-200/60 hover:bg-white/[0.06] hover:text-white transition"
        >
          Pause & return
        </Link>
      </div>
      <p className="text-center text-[11px] text-purple-200/30">
        Press <kbd className="rounded border border-white/15 bg-white/5 px-1 py-0.5 font-mono text-[10px] text-purple-200/70">Enter</kbd> to continue
      </p>
    </motion.div>
  );
}

/* ── Multi-Item Session Completion Screen (all items in continuous session done) ── */
function MultiItemSessionRecapScreen({
  records,
  totalSeconds,
}: {
  records: CompletedSessionRecord[];
  totalSeconds: number;
}) {
  const strongRecallCount = records.filter((r) => r.grade >= 4).length;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto space-y-8 py-8"
    >
      <div className="relative overflow-hidden rounded-[22px] border border-purple-400/25 bg-gradient-to-br from-[#0c061e] via-[#090416] to-[#04010a] p-8 text-center shadow-[0_32px_80px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.18),transparent_65%)]" />
        <div className="relative space-y-4">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-purple-400/20 border border-amber-400/30 text-amber-300">
            <Trophy size={32} />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              All caught up for today! 🎉
            </h1>
            <p className="text-sm text-purple-200/60 max-w-md mx-auto">
              You completed all {records.length} items in today&apos;s revision session. Spaced repetition intervals have been recalculated.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.025] p-4 text-center">
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-purple-200/40 mb-1">
            Items Reviewed
          </dt>
          <dd className="text-2xl font-bold text-white">{records.length}</dd>
        </div>
        <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.025] p-4 text-center">
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-purple-200/40 mb-1">
            Total Time Spent
          </dt>
          <dd className="text-2xl font-bold text-white">
            {minutes}m {seconds}s
          </dd>
        </div>
        <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.025] p-4 text-center">
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-purple-200/40 mb-1">
            High Recall
          </dt>
          <dd className="text-2xl font-bold text-emerald-400">
            {strongRecallCount} / {records.length}
          </dd>
        </div>
      </div>

      {/* Items List */}
      <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.025] p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-purple-200/60">
          Reviewed In This Session
        </h2>
        <div className="space-y-2">
          {records.map((r, i) => {
            const gradeInfo = GRADE_LABELS[r.grade] ?? GRADE_LABELS[4];
            return (
              <div
                key={`${r.id}-${i}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300/60">
                      {r.entityType}
                    </span>
                    <span className="truncate text-sm font-semibold text-white">
                      {r.title}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs font-semibold ${gradeInfo.color}`}>
                    {gradeInfo.label.split("—")[0].trim()}
                  </span>
                  <span className="text-xs text-purple-200/50">
                    Next in ~{r.nextDays}d
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/dashboard"
          className="focus-ring w-full sm:flex-1 h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-400 via-purple-400 to-violet-500 text-sm font-bold text-white shadow-[0_6px_24px_rgba(168,85,247,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(168,85,247,0.4)]"
        >
          Back to Dashboard <ArrowRight size={15} />
        </Link>
        <Link
          href="/revision"
          className="w-full sm:flex-1 h-12 inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm font-semibold text-purple-200 hover:bg-white/[0.06] hover:text-white transition"
        >
          <Repeat2 size={14} /> View Revision History
        </Link>
      </div>
    </motion.div>
  );
}

/* ── Completion screen ── */
function CompletionScreen({
  item, grade, gradeInfo, confLabel, nextDays, elapsedSeconds,
}: {
  item: RevisionItem;
  grade: number;
  gradeInfo: { label: string; color: string };
  confLabel: string;
  nextDays: number;
  elapsedSeconds: number;
}) {
  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[20px] border border-emerald-400/20 bg-gradient-to-br from-[#050d0a] via-[#06100c] to-[#030807] p-8 text-center shadow-[0_32px_80px_rgba(0,0,0,0.4)]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.1),transparent_55%)]" />
        <div className="relative">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-emerald-400/[0.12] border border-emerald-400/25"
          >
            <CheckCircle2 size={28} className="text-emerald-400" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2">Review complete!</h2>
          <p className="text-purple-100/50 text-sm">Queue updated · History recorded · Schedule recalculated</p>
        </div>
      </motion.div>

      {/* Summary card */}
      <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.025] p-6 space-y-5">
        <h3 className="text-base font-semibold text-white">Session summary</h3>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-purple-100/35 mb-1">Item reviewed</dt>
            <dd className="text-sm font-semibold text-white">{item.title}</dd>
            <dd className="text-xs text-purple-100/40 mt-0.5">{item.entityType} · {item.detail}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-purple-100/35 mb-1">Time spent</dt>
            <dd className="text-sm font-semibold text-white">
              {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-purple-100/35 mb-1">Recall quality</dt>
            <dd className={`text-sm font-semibold ${gradeInfo.color}`}>{grade}/5 — {gradeInfo.label}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-purple-100/35 mb-1">Confidence</dt>
            <dd className="text-sm font-semibold text-white">{confLabel}</dd>
          </div>
        </dl>

        <div className="rounded-xl border border-purple-400/15 bg-purple-400/[0.05] p-4 flex items-center gap-4">
          <Zap size={20} className="text-purple-300 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">Next review in ~{nextDays} day{nextDays !== 1 ? "s" : ""}</p>
            <p className="text-xs text-purple-100/45 mt-0.5">Spaced repetition schedule has been updated</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/revision"
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-purple-100 hover:bg-white/[0.07] hover:text-white transition"
        >
          <Repeat2 size={14} /> Back to queue
        </Link>
        {item.href && (
          <Link
            href={item.href}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-400 via-purple-400 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(168,85,247,0.25)] transition hover:-translate-y-0.5"
          >
            View {item.entityType} <ArrowRight size={13} />
          </Link>
        )}
      </div>
    </div>
  );
}

/* ══════ Shared sub-components ══════ */

function StepCard({
  icon: Icon, eyebrow, title, body, accent = "purple",
}: {
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  body: string;
  accent?: "purple" | "emerald" | "fuchsia" | "cyan" | "violet";
}) {
  const colors: Record<string, string> = {
    purple: "border-purple-300/15 bg-purple-300/[0.04] text-purple-300",
    emerald: "border-emerald-400/15 bg-emerald-400/[0.04] text-emerald-300",
    fuchsia: "border-fuchsia-400/15 bg-fuchsia-400/[0.04] text-fuchsia-300",
    cyan: "border-cyan-400/15 bg-cyan-400/[0.04] text-cyan-300",
    violet: "border-violet-400/15 bg-violet-400/[0.04] text-violet-300",
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[accent] ?? colors.purple}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">{eyebrow}</span>
      </div>
      <h3 className="text-base font-bold text-white mb-2">{title}</h3>
      <p className="text-sm leading-relaxed text-purple-100/65">{body}</p>
    </div>
  );
}

function NextButton({
  label, onClick, disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-400 via-purple-400 to-violet-500 px-5 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(168,85,247,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(168,85,247,0.35)] disabled:opacity-50 disabled:translate-y-0 disabled:cursor-not-allowed"
    >
      {label} <ChevronRight size={14} />
    </button>
  );
}

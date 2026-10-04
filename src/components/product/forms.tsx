"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Bookmark, Check, Eye, EyeOff, LoaderCircle, Save, RotateCcw, ArrowRight, ExternalLink } from "lucide-react";
import { completeMissionStepAction, recordProblemAttemptAction, recordProblemPatternRecognitionAction, recordRevisionAction, saveReflectionAction, toggleBookmarkAction, updateNotificationAction, updateProfileAction, restartMissionAction } from "@/features/product/actions/product.actions";

/* ── Shared field style ─────────────────────────────── */
const inputClass = "h-10 w-full rounded-[10px] border border-white/[0.08] bg-white/[0.025] px-3.5 text-sm text-white outline-none transition placeholder:text-purple-100/35 focus:border-purple-400/50 focus:bg-white/[0.045] focus:ring-4 focus:ring-purple-400/10";
const selectClass = "h-10 rounded-[10px] border border-white/[0.08] bg-[#0c0716] px-3.5 text-sm text-white outline-none transition focus:border-purple-400/50 focus:ring-4 focus:ring-purple-400/10";
const initialSaveState = { ok: false, message: "" };

function SaveSubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  const [saved, setSaved] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending) {
      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 1500);
      return () => clearTimeout(timer);
    }
    wasPending.current = pending;
  }, [pending]);

  const isSaved = saved && !pending;

  return (
    <button
      disabled={pending}
      className={`focus-ring inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-all duration-150 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60 ${
        isSaved
          ? "bg-emerald-500 text-black shadow-[0_4px_14px_rgba(52,211,153,0.25)]"
          : "bg-(--accent-lime) text-black hover:bg-(--accent-lime)/90 shadow-[0_4px_14px_rgba(183,243,107,0.25)]"
      }`}
    >
      {isSaved ? <Check size={13} className="text-black" /> : pending ? <LoaderCircle className="animate-spin-slow" size={13} /> : <Save size={13} />}
      {isSaved ? "Saved ✓" : pending ? "Saving..." : children}
    </button>
  );
}

/* ── Mission step button ────────────────────────────── */
export function MissionStepButton({ missionId, stepKey, done }: { missionId: string; stepKey: string; done: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={done || pending}
      onClick={() => startTransition(() => completeMissionStepAction({ missionId, stepKey }))}
      className={`focus-ring inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition ${
        done
          ? "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-400"
          : "border-white/[0.08] bg-white/[0.035] text-(--text-secondary) hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <Check size={12} strokeWidth={2.5} />
      {done ? "Done" : pending ? "Saving…" : "Complete"}
    </button>
  );
}

/* ── Restart mission button ─────────────────────────── */
export function RestartMissionButton({ missionId, className = "" }: { missionId: string; className?: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => restartMissionAction(missionId))}
      className={`focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.035] px-4 text-sm font-semibold text-(--text-secondary) transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {pending ? <LoaderCircle size={15} className="animate-spin-slow" /> : <RotateCcw size={15} />}
      {pending ? "Restarting..." : "Restart Mission"}
    </button>
  );
}

/* ── Reflection form ────────────────────────────────── */
export function ReflectionForm({ entityType, entityId, initialContent = "", initialRating = 3 }: { entityType: "mission" | "problem" | "topic" | "pattern"; entityId: string; initialContent?: string; initialRating?: number }) {
  const [state, formAction] = useActionState(async (_state: typeof initialSaveState, formData: FormData) => {
    const payload = {
      entityType,
      entityId,
      content: String(formData.get("content") ?? ""),
      selfRating: Number(formData.get("selfRating") ?? 3),
    };
    const result = await saveReflectionAction(payload);
    return { ...result, reflection: payload };
  }, initialSaveState);
  const savedReflection = (state as typeof initialSaveState & { reflection?: { content: string; selfRating: number } }).reflection;

  if (state.ok && savedReflection) {
    return (
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-300">
          <Check size={15} />
          Learning captured
        </div>
        <p className="text-sm leading-relaxed text-(--text-secondary)">{savedReflection.content}</p>
        <p className="mt-3 text-xs text-emerald-300">Confidence {savedReflection.selfRating}/5</p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-3"
    >
      <textarea
        name="content"
        required
        minLength={10}
        defaultValue={initialContent}
        placeholder="Write what clicked, what failed, and the next edge case to revisit."
        className="min-h-28 w-full resize-y rounded-[10px] border border-white/[0.08] bg-white/[0.025] p-3.5 text-sm text-white outline-none transition placeholder:text-(--text-muted) focus:border-(--accent-lime)/50 focus:bg-white/[0.045] focus:ring-4 focus:ring-(--accent-lime)/10"
      />
      <div className="flex items-center gap-3">
        <select name="selfRating" defaultValue={initialRating} className={selectClass}>
          <option value="5">Confidence — Very high</option>
          <option value="4">Confidence — High</option>
          <option value="3">Confidence — Medium</option>
          <option value="2">Confidence — Low</option>
          <option value="1">Confidence — Very low</option>
        </select>
        <SaveSubmitButton>Save</SaveSubmitButton>
      </div>
      {state.ok ? <p className="text-xs font-medium text-emerald-300">Saved. Your reflection is now part of this learning record.</p> : null}
    </form>
  );
}

/* ── Problem attempt form ───────────────────────────── */
export function ProblemAttemptForm({
  problemId,
  initialHintsUsed = 0,
}: {
  problemId: string;
  initialHintsUsed?: number;
}) {
  const [hintsUsed, setHintsUsed] = useState(initialHintsUsed);
  const [strategy, setStrategy] = useState(initialHintsUsed >= 1 ? "hint_assisted" : "independent");

  // Keep in sync when hints are unlocked from the ladder
  useEffect(() => {
    setHintsUsed(initialHintsUsed);
    if (initialHintsUsed >= 1) {
      setStrategy("hint_assisted");
    }
  }, [initialHintsUsed]);

  const [state, formAction] = useActionState(async (_state: typeof initialSaveState, formData: FormData) => {
    const rawHints = Number(formData.get("hintsUsed") ?? hintsUsed);
    let chosenStrategy = String(formData.get("strategy"));
    if (rawHints > 0 && chosenStrategy === "independent") {
      chosenStrategy = "hint_assisted";
    }
    const rawDuration = Number(formData.get("durationSeconds") ?? 0);
    const payload = {
      problemId,
      status: String(formData.get("status")),
      strategy: chosenStrategy,
      durationSeconds: rawDuration,
      durationProvenance: (rawDuration > 0 ? "measured" : "unknown") as "measured" | "unknown",
      hintsUsed: rawHints,
      selfConfidence: Number(formData.get("selfConfidence") ?? 3),
      perceivedDifficulty: Number(formData.get("perceivedDifficulty") ?? 3),
      codeLanguage: String(formData.get("codeLanguage") ?? ""),
    };
    const result = (await recordProblemAttemptAction(payload)) as any;
    return { ...result, attempt: payload, receipt: result?.receipt };
  }, initialSaveState);
  const typedState = state as typeof initialSaveState & {
    attempt?: Record<string, unknown>;
    receipt?: any;
  };
  const savedAttempt = typedState.attempt;
  const savedReceipt = typedState.receipt;

  if (state.ok && savedAttempt) {
    return (
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
            <Check size={15} />
            Attempt saved
          </div>
          {savedReceipt?.planEffect?.status === "completed" && (
            <span className="rounded-full bg-emerald-400/20 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
              Plan Task Completed
            </span>
          )}
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-purple-100/40">Status</dt><dd className="font-medium capitalize text-white">{String(savedAttempt.status).replace("_", " ")}</dd></div>
          <div><dt className="text-purple-100/40">Strategy</dt><dd className="font-medium capitalize text-white">{String(savedAttempt.strategy).replace("_", " ")}</dd></div>
          <div><dt className="text-purple-100/40">Confidence</dt><dd className="font-medium text-white">{String(savedAttempt.selfConfidence)}/5</dd></div>
          <div>
            <dt className="text-purple-100/40">Duration</dt>
            <dd className="font-medium text-white">
              {Number(savedAttempt.durationSeconds) > 0
                ? `${savedAttempt.durationSeconds}s (measured)`
                : "Unknown / untracked"}
            </dd>
          </div>
          <div><dt className="text-purple-100/40">Hints used</dt><dd className="font-medium text-white">{String(savedAttempt.hintsUsed ?? 0)}</dd></div>
          {savedAttempt.codeLanguage ? <div><dt className="text-purple-100/40">Language</dt><dd className="font-medium text-white">{String(savedAttempt.codeLanguage)}</dd></div> : null}
          <div><dt className="text-purple-100/40">Perceived difficulty</dt><dd className="font-medium text-white">{String(savedAttempt.perceivedDifficulty)}/5</dd></div>
        </dl>
        {savedReceipt && (
          <div className="border-t border-white/[0.06] pt-2 text-[11px] text-purple-200/50 flex flex-wrap items-center justify-between gap-2">
            <span>Command: <code className="text-purple-300">{String(savedReceipt.commandId).slice(0, 16)}...</code></span>
            <span>Status: <strong className="text-emerald-300 capitalize">{savedReceipt.downstreamStatus?.replace(/_/g, " ")}</strong></span>
          </div>
        )}
      </div>
    );
  }

  const isAssisted = hintsUsed >= 1;

  return (
    <form
      action={formAction}
      className="space-y-4"
    >
      {isAssisted ? (
        <div className="flex items-center gap-2 rounded-lg border border-fuchsia-400/25 bg-fuchsia-400/[0.08] px-3.5 py-2.5 text-xs text-fuchsia-200">
          <AlertCircle size={14} className="text-fuchsia-400 shrink-0" />
          <span>
            <strong>Assisted Attempt:</strong> {hintsUsed} hint{hintsUsed > 1 ? "s were" : " was"} unlocked. Strategy is preset to <span className="font-semibold text-white">Hint assisted</span> (any hint use precludes independent solve classification).
          </span>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-[11px] font-medium text-purple-100/50 mb-1.5">Outcome Status</label>
          <select name="status" className={`${selectClass} w-full`} defaultValue="solved">
            <option value="solved">Solved</option>
            <option value="started">Started</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-purple-100/50 mb-1.5">Solving Strategy</label>
          <select
            name="strategy"
            className={`${selectClass} w-full`}
            value={hintsUsed >= 1 && strategy === "independent" ? "hint_assisted" : strategy}
            onChange={(e) => setStrategy(e.target.value)}
          >
            <option value="independent" disabled={hintsUsed >= 1}>
              {hintsUsed >= 1 ? "Independent (Locked — hint used)" : "Independent"}
            </option>
            <option value="hint_assisted">Hint assisted</option>
            <option value="editorial_assisted">Editorial assisted</option>
            <option value="revisited">Revisited</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-purple-100/50 mb-1.5">Duration (seconds)</label>
          <input name="durationSeconds" type="number" min="0" placeholder="Duration (seconds)" className={inputClass} />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-purple-100/50 mb-1.5">Programming Language</label>
          <input name="codeLanguage" placeholder="Language (e.g. Python, Java, C++)" className={inputClass} />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-purple-100/50 mb-1.5">Hints Revealed</label>
          <input
            name="hintsUsed"
            type="number"
            min="0"
            max="5"
            value={hintsUsed}
            onChange={(e) => {
              const val = Number(e.target.value);
              setHintsUsed(val);
              if (val >= 1) setStrategy("hint_assisted");
            }}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-purple-100/50 mb-1.5">Self Confidence</label>
          <select name="selfConfidence" className={`${selectClass} w-full`} defaultValue="3">
            <option value="5">Confidence — Very high (5/5)</option>
            <option value="4">Confidence — High (4/5)</option>
            <option value="3">Confidence — Medium (3/5)</option>
            <option value="2">Confidence — Low (2/5)</option>
            <option value="1">Confidence — Very low (1/5)</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[11px] font-medium text-purple-100/50 mb-1.5">Perceived Difficulty</label>
          <select name="perceivedDifficulty" className={`${selectClass} w-full`} defaultValue="3">
            <option value="3">Difficulty — Medium</option>
            <option value="4">Difficulty — Hard</option>
            <option value="5">Difficulty — Very hard</option>
            <option value="2">Difficulty — Easy</option>
            <option value="1">Difficulty — Very easy</option>
          </select>
        </div>

        <div className="sm:col-span-2 pt-2">
          <SaveSubmitButton>Save attempt</SaveSubmitButton>
        </div>
      </div>
    </form>
  );
}

export function ProblemPatternRecognitionForm({
  problemId,
  options,
  latestRecognition,
}: {
  problemId: string;
  options: Array<{ id: string; name: string }>;
  latestRecognition?: { isCorrect: boolean; selectedPatternName?: string; trend?: string; recognitionScore?: number; masteryScore?: number } | null;
}) {
  const [state, formAction] = useActionState(async (_state: typeof initialSaveState, formData: FormData) => {
    const payload = {
      problemId,
      selectedPatternId: String(formData.get("selectedPatternId") ?? ""),
      reasoning: String(formData.get("reasoning") ?? ""),
      signalIdentified: String(formData.get("signalIdentified") ?? ""),
      durationSeconds: 0,
    };
    const result = await recordProblemPatternRecognitionAction(payload);
    const selectedPatternName = options.find((option) => option.id === payload.selectedPatternId)?.name ?? "Selected pattern";
    return { ...result, recognition: { ...payload, selectedPatternName } };
  }, initialSaveState);
  const savedRecognition = (state as typeof initialSaveState & {
    isCorrect?: boolean;
    recognitionScore?: number;
    masteryScore?: number;
    trend?: string;
    recognition?: { selectedPatternName: string; reasoning: string; signalIdentified: string };
  }).recognition;
  const visibleRecognition = savedRecognition
    ? {
        isCorrect: Boolean((state as any).isCorrect),
        selectedPatternName: savedRecognition.selectedPatternName,
        reasoning: savedRecognition.reasoning,
        signalIdentified: savedRecognition.signalIdentified,
        recognitionScore: Number((state as any).recognitionScore ?? 0),
        masteryScore: Number((state as any).masteryScore ?? 0),
        trend: String((state as any).trend ?? ""),
      }
    : latestRecognition;

  if (state.ok && visibleRecognition) {
    return (
      <div className={`rounded-xl border p-4 ${visibleRecognition.isCorrect ? "border-emerald-400/20 bg-emerald-400/[0.05]" : "border-amber-400/20 bg-amber-400/[0.05]"}`}>
        <div className={`mb-3 flex items-center gap-2 text-sm font-semibold ${visibleRecognition.isCorrect ? "text-emerald-300" : "text-amber-300"}`}>
          <Check size={15} />
          {visibleRecognition.isCorrect ? "Correct recognition" : "Recognition saved"}
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-purple-100/40">Selected pattern</dt><dd className="font-medium text-white">{visibleRecognition.selectedPatternName}</dd></div>
          <div><dt className="text-purple-100/40">Result</dt><dd className="font-medium text-white">{visibleRecognition.isCorrect ? "Correct" : "Incorrect"}</dd></div>
          <div><dt className="text-purple-100/40">Recognition</dt><dd className="font-medium text-white">{visibleRecognition.recognitionScore ?? 0}%</dd></div>
          <div><dt className="text-purple-100/40">Mastery</dt><dd className="font-medium text-white">{visibleRecognition.masteryScore ?? 0}%</dd></div>
        </dl>
        {(visibleRecognition as any).reasoning ? <p className="mt-3 text-sm leading-relaxed text-purple-100/70">{(visibleRecognition as any).reasoning}</p> : null}
      </div>
    );
  }

  if (!options.length) {
    return <p className="text-sm text-purple-100/50">No published patterns are available for recognition yet.</p>;
  }

  return (
    <form action={formAction} className="space-y-3">
      {latestRecognition ? (
        <div className={`rounded-lg border px-3 py-2 text-xs ${latestRecognition.isCorrect ? "border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-200/80" : "border-amber-400/20 bg-amber-400/[0.04] text-amber-200/80"}`}>
          Last recognition: {latestRecognition.isCorrect ? "correct" : "incorrect"}{latestRecognition.trend ? ` · ${latestRecognition.trend.replaceAll("_", " ")}` : ""}
        </div>
      ) : null}
      <select name="selectedPatternId" required className={`${selectClass} w-full`} defaultValue="">
        <option value="" disabled>Which pattern is this?</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
      <textarea
        name="reasoning"
        required
        minLength={5}
        placeholder="Why is this pattern applicable?"
        className="min-h-24 w-full resize-y rounded-[10px] border border-white/[0.08] bg-white/[0.025] p-3.5 text-sm text-white outline-none transition placeholder:text-purple-100/35 focus:border-purple-400/50 focus:bg-white/[0.045] focus:ring-4 focus:ring-purple-400/10"
      />
      <input name="signalIdentified" placeholder="Signal you noticed, such as sorted input, overlapping subproblems, or frequency counting" className={inputClass} />
      <SaveSubmitButton>Save recognition</SaveSubmitButton>
    </form>
  );
}

/* ── Bookmark button ────────────────────────────────── */
export function BookmarkButton({ entityType, entityId, active }: { entityType: "topic" | "pattern" | "problem" | "mission" | "resource"; entityId: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleBookmarkAction({ entityType, entityId }))}
      className={`focus-ring inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition ${
        active
          ? "border-amber-400/30 bg-amber-400/[0.08] text-amber-300"
          : "border-white/[0.08] bg-white/[0.035] text-purple-100/60 hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <Bookmark size={12} fill={active ? "currentColor" : "none"} />
      {active ? "Bookmarked" : "Bookmark"}
    </button>
  );
}

/* ── Revision review form ───────────────────────────── */
export function RevisionReviewForm({ item }: { item: { id: string; conceptName: string; itemType: string; href?: string; sourceHref?: string; detail?: string } }) {
  const [step, setStep] = useState(0);
  const [grade, setGrade] = useState(4);
  const [confidence, setConfidence] = useState(3);
  const [seconds, setSeconds] = useState(90);
  const [state, formAction] = useActionState(async (_state: typeof initialSaveState, formData: FormData) => {
    return await recordRevisionAction({
      queueId: item.id,
      grade: Number(formData.get("grade") ?? 3),
      confidence: Number(formData.get("confidence") ?? 3),
      responseSeconds: Number(formData.get("responseSeconds") ?? 0),
    });
  }, initialSaveState);

  if (state.ok) {
    return (
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4 text-sm font-medium text-emerald-300">
        Review completed. The next review date has been scheduled.
      </div>
    );
  }

  const steps = [
    {
      label: "Recall",
      title: "Recall before looking",
      body: `Close the notes and write or say what you remember about ${item.conceptName}. Focus on the key idea, when to use it, and one example.`,
    },
    {
      label: "Quiz",
      title: "Self-check",
      body: "Could you explain the core invariant, complexity, and failure case without peeking?",
    },
    {
      label: "Pattern",
      title: "Pattern recall",
      body: "Name the signal words or constraints that should make you reach for this idea in a new problem.",
    },
    {
      label: "Practice",
      title: "Apply it once",
      body: "Open the linked item, attempt the core step, then come back and rate the review honestly.",
    },
    {
      label: "Summary",
      title: "Schedule the next review",
      body: "Record how the recall felt. This updates your spaced repetition queue.",
    },
  ];
  const current = steps[step];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {steps.map((sessionStep, index) => (
          <button
            key={sessionStep.label}
            type="button"
            onClick={() => setStep(index)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${index === step ? "border-purple-300/35 bg-purple-400/[0.12] text-purple-100" : "border-white/[0.07] bg-white/[0.03] text-purple-100/45"}`}
          >
            {sessionStep.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
        <p className="label-xs mb-1 text-purple-300/70">{item.itemType} · {item.detail ?? "Review"}</p>
        <h4 className="text-sm font-semibold text-white">{current.title}</h4>
        <p className="mt-2 text-sm leading-relaxed text-purple-100/65">{current.body}</p>
      </div>
      {step === 3 && (
        <div className="flex flex-wrap gap-2">
          {item.href ? <a href={item.href} className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-semibold text-purple-100 hover:bg-white/[0.06]">Open in DSA Club <ArrowRight size={13} /></a> : null}
          {item.sourceHref ? <a href={item.sourceHref} target="_blank" rel="noopener noreferrer" className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg border border-purple-300/20 bg-purple-400/[0.07] px-3 text-xs font-semibold text-purple-200 hover:bg-purple-400/[0.12]">External practice <ExternalLink size={13} /></a> : null}
        </div>
      )}
      {step < steps.length - 1 ? (
        <button type="button" onClick={() => setStep(step + 1)} className="focus-ring inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-400 via-purple-400 to-violet-500 px-4 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(168,85,247,0.25)] transition hover:-translate-y-0.5">
          Continue <ArrowRight size={13} />
        </button>
      ) : (
        <form action={formAction} className="grid gap-3 sm:grid-cols-3">
          <select name="grade" value={grade} onChange={(e) => setGrade(Number(e.target.value))} className={selectClass}>
            <option value="5">Easy</option>
            <option value="4">Good</option>
            <option value="3">Hard</option>
            <option value="2">Again</option>
          </select>
          <select name="confidence" value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} className={selectClass}>
            <option value="5">Confidence - Very high</option>
            <option value="4">Confidence - High</option>
            <option value="3">Confidence - Medium</option>
            <option value="2">Confidence - Low</option>
          </select>
          <input name="responseSeconds" type="number" min="0" value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} className={inputClass} />
          <button className="focus-ring h-10 rounded-lg bg-gradient-to-r from-fuchsia-400 via-purple-400 to-violet-500 px-4 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(168,85,247,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(168,85,247,0.35)] sm:col-span-3">
            Complete review
          </button>
        </form>
      )}
    </div>
  );
}

/* ── Notification actions ───────────────────────────── */
export function NotificationActions({ notificationId, status }: { notificationId: string; status: string }) {
  return (
    <div className="flex shrink-0 gap-2">
      <form action={() => updateNotificationAction({ notificationId, status: status === "read" ? "unread" : "read" })}>
        <button className="focus-ring grid size-8 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.035] text-purple-100/60 transition hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white">
          {status === "read" ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </form>
      <form action={() => updateNotificationAction({ notificationId, status: "archived" })}>
        <button className="focus-ring h-8 rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-medium text-purple-100/60 transition hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white">
          Archive
        </button>
      </form>
    </div>
  );
}

/* ── Profile form ───────────────────────────────────── */
export function ProfileForm({ profile, user }: { profile: Record<string, unknown> | null | undefined; user: { name: string } }) {
  const [pending, startTransition] = useTransition();
  const preferences = profile?.preferences as Record<string, unknown> | undefined;
  return (
    <form
      action={async (formData) => {
        await updateProfileAction({
          name: String(formData.get("name") ?? ""),
          currentLevel: String(formData.get("currentLevel") ?? "beginner"),
          primaryLanguage: String(formData.get("primaryLanguage") ?? "cpp"),
          dailyMinutes: Number(formData.get("dailyMinutes") ?? 60),
          goals: String(formData.get("goals") ?? "placements"),
          reminderEnabled: formData.get("reminderEnabled") === "on",
          reminderTime: String(formData.get("reminderTime") ?? "19:00"),
        });
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="space-y-1.5">
        <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Full name</label>
        <input name="name" defaultValue={user.name} placeholder="Your name" className={inputClass} />
      </div>
      <div className="space-y-1.5">
        <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Experience level</label>
        <select name="currentLevel" defaultValue={String(profile?.currentLevel ?? "beginner")} className={`${selectClass} w-full`}>
          <option value="absolute_beginner">Absolute beginner</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Primary language</label>
        <select name="primaryLanguage" defaultValue={String(profile?.primaryLanguage ?? "cpp")} className={`${selectClass} w-full`}>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="go">Go</option>
          <option value="rust">Rust</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Daily minutes</label>
        <input name="dailyMinutes" type="number" min="15" max="720" defaultValue={Number(profile?.dailyMinutes ?? 60)} className={inputClass} />
      </div>
      <div className="space-y-1.5">
        <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Goal</label>
        <input name="goals" defaultValue={String((profile?.goals as string[] | undefined)?.[0] ?? "placements")} className={inputClass} />
      </div>
      <div className="space-y-1.5">
        <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Reminder time</label>
        <input name="reminderTime" type="time" defaultValue={String(preferences?.reminderTime ?? "19:00")} className={inputClass} />
      </div>
      <div className="flex items-center gap-2.5 sm:col-span-2">
        <input
          name="reminderEnabled"
          type="checkbox"
          id="reminderEnabled"
          defaultChecked={Boolean(preferences?.reminderEnabled ?? true)}
          className="size-4 rounded border-white/20 bg-white/[0.05] accent-emerald-400"
        />
        <label htmlFor="reminderEnabled" className="text-sm text-slate-400 cursor-pointer">
          Enable reminder notifications
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-400 via-purple-400 to-violet-500 px-4 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(168,85,247,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(168,85,247,0.35)] disabled:opacity-60 disabled:translate-y-0 sm:col-span-2"
      >
        {pending && <LoaderCircle className="animate-spin-slow" size={15} />}
        <Save size={14} />
        Save profile
      </button>
    </form>
  );
}

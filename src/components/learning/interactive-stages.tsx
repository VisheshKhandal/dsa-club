"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Code2,
  ExternalLink,
  LoaderCircle,
  Sparkles,
  Target,
} from "lucide-react";
import type { Stage } from "@/features/platform/engines/learning.engine";
import {
  completeMissionMasteryStageAction,
  completeMissionPatternStageAction,
  completeMissionPracticeStageAction,
} from "@/features/product/actions/product.actions";
import { ReflectionForm } from "@/components/product/forms";
import { cn } from "@/lib/utils";

interface InteractiveStageProps {
  missionId: string;
  stage: Stage;
  onAdvance?: () => void;
}

/* ─── 1. Pattern Recognition Interactive Stage ─────────────── */
export function PatternRecognitionStage({
  missionId,
  stage,
  onAdvance,
}: InteractiveStageProps) {
  const router = useRouter();
  const target = stage.target;
  const patternOptions = stage.patternOptions ?? [];

  const [selectedPatternId, setSelectedPatternId] = useState(
    stage.latestPatternAttempt?.selectedPatternId ?? ""
  );
  const [reasoning, setReasoning] = useState(
    stage.latestPatternAttempt?.reasoning ?? ""
  );
  const [signal, setSignal] = useState(
    stage.latestPatternAttempt?.signalIdentified ?? ""
  );
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(
    stage.status === "completed" || Boolean(stage.latestPatternAttempt?.reasoning)
  );

  const trimmedReasoning = reasoning.trim();
  const isValid = trimmedReasoning.length >= 10;
  const canSubmit = isValid && !pending && !saved;

  function handleSubmit() {
    if (!canSubmit || pending) return;
    startTransition(async () => {
      await completeMissionPatternStageAction({
        missionId,
        stepKey: stage.key,
        selectedPatternId: selectedPatternId || undefined,
        reasoning: trimmedReasoning,
        signalIdentified: signal.trim(),
        durationSeconds: 0,
      });
      setSaved(true);
      router.refresh();
      onAdvance?.();
    });
  }

  return (
    <section aria-labelledby="pattern-stage-heading" className="space-y-6 pt-4">
      {/* Target Pattern Overview Callout */}
      {target && (
        <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) p-5 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
            <Target size={14} />
            <span>Problem Pattern Target</span>
          </div>

          <h3 id="pattern-stage-heading" className="text-base font-bold text-(--color-text-primary)">
            {target.title}
          </h3>

          {(target.description || target.summary) && (
            <p className="text-sm leading-relaxed text-(--color-text-secondary)">
              {target.description || target.summary}
            </p>
          )}

          {target.whenToUse && (
            <p className="text-xs sm:text-sm leading-relaxed text-(--color-text-secondary)">
              <strong className="text-cyan-300">When to use: </strong>
              {target.whenToUse}
            </p>
          )}

          {target.mentalModel && (
            <p className="text-xs sm:text-sm leading-relaxed text-(--color-text-secondary)">
              <strong className="text-purple-300">Mental Model: </strong>
              {target.mentalModel}
            </p>
          )}

          {target.signalKeywords && target.signalKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {target.signalKeywords.map((kw) => (
                <span
                  key={kw}
                  className="rounded-md border border-(--color-border) bg-(--color-surface-2) px-2 py-0.5 text-[11px] font-mono text-(--color-text-muted)"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Interactive Form Controls */}
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) p-5 space-y-4">
        {patternOptions.length > 0 ? (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">
              Which pattern applies here?
            </label>
            <select
              disabled={saved}
              value={selectedPatternId}
              onChange={(e) => setSelectedPatternId(e.target.value)}
              className="h-10 w-full rounded-(--radius-btn) border border-(--color-border) bg-(--color-surface-2) px-3 text-xs sm:text-sm text-(--color-text-primary) outline-none focus:border-(--color-purple)"
            >
              <option value="">Select pattern...</option>
              {patternOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">
              Pattern Name
            </label>
            <input
              disabled={saved}
              value={signal}
              onChange={(e) => setSignal(e.target.value)}
              placeholder="e.g. Two Pointers, Sliding Window, DFS..."
              className="h-10 w-full rounded-(--radius-btn) border border-(--color-border) bg-(--color-surface-2) px-3 text-xs sm:text-sm text-(--color-text-primary) outline-none focus:border-(--color-purple)"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold uppercase tracking-wider text-(--color-text-muted)">
              Explain Your Reasoning
            </label>
            {!saved && trimmedReasoning.length > 0 && trimmedReasoning.length < 10 && (
              <span className="text-amber-400 font-medium">
                {10 - trimmedReasoning.length} more characters needed
              </span>
            )}
          </div>
          <textarea
            disabled={saved}
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            rows={3}
            placeholder="What signal, constraint, or property told you which pattern to use? (min 10 chars)..."
            className="w-full rounded-(--radius-btn) border border-(--color-border) bg-(--color-surface-2) p-3 text-xs sm:text-sm text-(--color-text-primary) outline-none focus:border-(--color-purple)"
          />
        </div>

        {saved ? (
          <div className="flex items-center gap-2 rounded-(--radius-btn) border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-2.5 text-xs font-semibold text-emerald-400">
            <Check size={14} className="stroke-[2.5]" />
            <span>Pattern Recognition Recorded ✓</span>
          </div>
        ) : (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || pending}
              className="focus-ring inline-flex items-center gap-2 rounded-(--radius-btn) bg-gradient-to-r from-purple-600 to-violet-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:from-purple-500 hover:to-violet-500 disabled:opacity-40"
            >
              {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Target size={14} />}
              <span>{pending ? "Saving..." : "Save Pattern Recognition"}</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── 2. Practice Stage ────────────────────────────────────── */
export function PracticeStage({
  missionId,
  stage,
  onAdvance,
}: InteractiveStageProps) {
  const router = useRouter();
  const target = stage.target;

  const [status, setStatus] = useState<"solved" | "abandoned">(
    stage.latestPracticeEvidence?.status === "abandoned" ? "abandoned" : "solved"
  );
  const [strategy, setStrategy] = useState(
    stage.latestPracticeEvidence?.strategy || "independent"
  );
  const [confidence, setConfidence] = useState(
    stage.latestPracticeEvidence?.confidence ?? 3
  );
  const [difficulty, setDifficulty] = useState(
    stage.latestPracticeEvidence?.difficulty ?? 3
  );
  const [reflection, setReflection] = useState(
    stage.latestPracticeEvidence?.reflection ?? ""
  );
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(
    stage.status === "completed" || Boolean(stage.latestPracticeEvidence?.reflection)
  );

  const trimmedReflection = reflection.trim();
  const isValid = trimmedReflection.length >= 10;
  const canSubmit = isValid && !pending && !saved;

  function handleSaveAttempt() {
    if (!canSubmit || pending) return;
    startTransition(async () => {
      await completeMissionPracticeStageAction({
        missionId,
        stepKey: stage.key,
        status,
        strategy,
        durationSeconds: 0,
        selfConfidence: confidence,
        perceivedDifficulty: difficulty,
        codeLanguage: "",
        reflection: trimmedReflection,
      });
      setSaved(true);
      router.refresh();
      onAdvance?.();
    });
  }

  return (
    <section aria-labelledby="practice-stage-heading" className="space-y-6 pt-4">
      {/* Problem Target Banner */}
      {target && (
        <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">
              {target.difficulty} · {target.patternName || "Practice Problem"}
            </span>
          </div>

          <h3 id="practice-stage-heading" className="text-base font-bold text-(--color-text-primary)">
            {target.title}
          </h3>

          {target.summary && (
            <p className="text-sm leading-relaxed text-(--color-text-secondary)">
              {target.summary}
            </p>
          )}

          {target.sourceUrl && (
            <a
              href={target.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex items-center gap-1.5 rounded-(--radius-btn) border border-(--color-border) bg-(--color-surface-2) px-3.5 py-2 text-xs font-semibold text-(--color-text-primary) hover:bg-(--color-surface-3) transition-colors"
            >
              <span>Solve on {target.source === "leetcode" ? "LeetCode" : "Platform"}</span>
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      )}

      {/* Practice Evidence Form */}
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold uppercase tracking-wider text-(--color-text-muted)">Outcome</label>
            <select
              disabled={saved}
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="h-10 w-full rounded-(--radius-btn) border border-(--color-border) bg-(--color-surface-2) px-3 text-(--color-text-primary) outline-none"
            >
              <option value="solved">Solved</option>
              <option value="abandoned">Could not solve yet</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold uppercase tracking-wider text-(--color-text-muted)">Strategy</label>
            <select
              disabled={saved}
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="h-10 w-full rounded-(--radius-btn) border border-(--color-border) bg-(--color-surface-2) px-3 text-(--color-text-primary) outline-none"
            >
              <option value="independent">Independent</option>
              <option value="hint_assisted">Hint assisted</option>
              <option value="editorial_assisted">Editorial assisted</option>
              <option value="revisited">Revisited</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold uppercase tracking-wider text-(--color-text-muted)">Confidence</label>
            <select
              disabled={saved}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="h-10 w-full rounded-(--radius-btn) border border-(--color-border) bg-(--color-surface-2) px-3 text-(--color-text-primary) outline-none"
            >
              <option value="5">Very High</option>
              <option value="4">High</option>
              <option value="3">Medium</option>
              <option value="2">Low</option>
              <option value="1">Very Low</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold uppercase tracking-wider text-(--color-text-muted)">Perceived Difficulty</label>
            <select
              disabled={saved}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="h-10 w-full rounded-(--radius-btn) border border-(--color-border) bg-(--color-surface-2) px-3 text-(--color-text-primary) outline-none"
            >
              <option value="5">Very Hard</option>
              <option value="4">Hard</option>
              <option value="3">Medium</option>
              <option value="2">Easy</option>
              <option value="1">Very Easy</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold uppercase tracking-wider text-(--color-text-muted)">
              Practice Reflection
            </label>
            {!saved && trimmedReflection.length > 0 && trimmedReflection.length < 10 && (
              <span className="text-amber-400 font-medium">
                {10 - trimmedReflection.length} more characters needed
              </span>
            )}
          </div>
          <textarea
            disabled={saved}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            rows={3}
            placeholder="What was the key move or bug you fixed? (min 10 chars)..."
            className="w-full rounded-(--radius-btn) border border-(--color-border) bg-(--color-surface-2) p-3 text-xs sm:text-sm text-(--color-text-primary) outline-none focus:border-(--color-purple)"
          />
        </div>

        {saved ? (
          <div className="flex items-center gap-2 rounded-(--radius-btn) border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-2.5 text-xs font-semibold text-emerald-400">
            <Check size={14} className="stroke-[2.5]" />
            <span>Practice Evidence Recorded ✓</span>
          </div>
        ) : (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleSaveAttempt}
              disabled={!canSubmit || pending}
              className="focus-ring inline-flex items-center gap-2 rounded-(--radius-btn) bg-gradient-to-r from-purple-600 to-violet-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:from-purple-500 hover:to-violet-500 disabled:opacity-40"
            >
              {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Code2 size={14} />}
              <span>{pending ? "Saving..." : "Save Practice Evidence"}</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── 3. Mastery Proof Stage ───────────────────────────────── */
function parseMasteryEvidence(content: string) {
  const readSection = (label: string) => {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`${escapedLabel}:\\n([\\s\\S]*?)(?=\\n\\n[A-Z][^\\n]*:\\n|$)`);
    return content.match(pattern)?.[1]?.trim() ?? "";
  };

  return {
    conceptRecall: readSection("Concept recall"),
    patternUnderstanding: readSection("Pattern understanding"),
    approach: readSection("Approach"),
    complexity: readSection("Time/space complexity"),
    edgeCases: readSection("Edge cases"),
  };
}

export function MasteryProofStage({
  missionId,
  stage,
  onAdvance,
}: InteractiveStageProps) {
  const initialMastery = parseMasteryEvidence(stage.latestMasteryEvidence?.content ?? "");
  const [conceptRecall, setConceptRecall] = useState(initialMastery.conceptRecall);
  const [patternUnderstanding, setPatternUnderstanding] = useState(initialMastery.patternUnderstanding);
  const [approach, setApproach] = useState(initialMastery.approach);
  const [complexity, setComplexity] = useState(initialMastery.complexity);
  const [edgeCases, setEdgeCases] = useState(initialMastery.edgeCases);
  const [confidence, setConfidence] = useState(stage.latestMasteryEvidence?.selfRating ?? 3);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(
    stage.status === "completed" || Boolean(stage.latestMasteryEvidence)
  );
  const [qualityScore, setQualityScore] = useState(
    stage.latestMasteryEvidence?.qualityScore ?? null
  );

  const ready =
    conceptRecall.trim().length >= 20 &&
    patternUnderstanding.trim().length >= 20 &&
    approach.trim().length >= 20 &&
    complexity.trim().length >= 10 &&
    edgeCases.trim().length >= 10;

  function handleSaveMastery() {
    if (!ready || pending) return;
    startTransition(async () => {
      const response = await completeMissionMasteryStageAction({
        missionId,
        stepKey: stage.key,
        conceptRecall,
        patternUnderstanding,
        approach,
        complexity,
        edgeCases,
        confidence,
      });
      setQualityScore((response as { qualityScore?: number }).qualityScore ?? null);
      setSaved(true);
      onAdvance?.();
    });
  }

  return (
    <section aria-labelledby="mastery-stage-heading" className="space-y-4 pt-4">
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) p-5 space-y-3">
        <h3 id="mastery-stage-heading" className="text-sm font-bold uppercase tracking-wider text-fuchsia-400">
          Prove Topic Mastery
        </h3>

        <div className="space-y-3">
          <textarea
            disabled={saved}
            value={conceptRecall}
            onChange={(e) => setConceptRecall(e.target.value)}
            placeholder="Concept Recall: Describe the foundational data structure or algorithm mechanics..."
            rows={2}
            className="w-full rounded-(--radius-btn) border border-(--color-border) bg-(--color-surface-2) p-3 text-xs sm:text-sm text-(--color-text-primary) outline-none focus:border-(--color-purple)"
          />
          <textarea
            disabled={saved}
            value={patternUnderstanding}
            onChange={(e) => setPatternUnderstanding(e.target.value)}
            placeholder="Pattern Understanding: When does this algorithmic technique apply versus alternatives?"
            rows={2}
            className="w-full rounded-(--radius-btn) border border-(--color-border) bg-(--color-surface-2) p-3 text-xs sm:text-sm text-(--color-text-primary) outline-none focus:border-(--color-purple)"
          />
          <textarea
            disabled={saved}
            value={approach}
            onChange={(e) => setApproach(e.target.value)}
            placeholder="Step-by-step Approach: How do you formulate the solution?"
            rows={2}
            className="w-full rounded-(--radius-btn) border border-(--color-border) bg-(--color-surface-2) p-3 text-xs sm:text-sm text-(--color-text-primary) outline-none focus:border-(--color-purple)"
          />
          <textarea
            disabled={saved}
            value={complexity}
            onChange={(e) => setComplexity(e.target.value)}
            placeholder="Time and Space Complexity with reasoning..."
            rows={2}
            className="w-full rounded-(--radius-btn) border border-(--color-border) bg-(--color-surface-2) p-3 text-xs sm:text-sm text-(--color-text-primary) outline-none focus:border-(--color-purple)"
          />
          <textarea
            disabled={saved}
            value={edgeCases}
            onChange={(e) => setEdgeCases(e.target.value)}
            placeholder="Crucial edge cases (empty input, duplicates, extremes)..."
            rows={2}
            className="w-full rounded-(--radius-btn) border border-(--color-border) bg-(--color-surface-2) p-3 text-xs sm:text-sm text-(--color-text-primary) outline-none focus:border-(--color-purple)"
          />
        </div>

        {saved ? (
          <div className="flex items-center gap-2 rounded-(--radius-btn) border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-2.5 text-xs font-semibold text-emerald-400">
            <Check size={14} className="stroke-[2.5]" />
            <span>Mastery Recorded{qualityScore !== null ? ` (${qualityScore}%)` : ""} ✓</span>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-(--color-text-muted)">
              {ready ? "Ready to submit" : "Fill in all evaluation prompts"}
            </span>
            <button
              type="button"
              onClick={handleSaveMastery}
              disabled={!ready || pending}
              className="focus-ring inline-flex items-center gap-2 rounded-(--radius-btn) bg-gradient-to-r from-fuchsia-600 to-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:from-fuchsia-500 hover:to-purple-500 disabled:opacity-40"
            >
              {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}
              <span>{pending ? "Evaluating..." : "Submit Mastery Evidence"}</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── 4. Reflection Stage ──────────────────────────────────── */
export function ReflectionStage({
  missionId,
  stage,
}: InteractiveStageProps) {
  const explicitPrompt = (stage as any).reflectionPrompt || (stage as any).prompt;
  const isHtmlContent = Boolean(stage.content && /<[a-z][\s\S]*>/i.test(stage.content));
  const prompt =
    explicitPrompt && explicitPrompt.trim() !== ""
      ? explicitPrompt
      : stage.content && !isHtmlContent && stage.content.length < 250
      ? stage.content
      : "Synthesize your mental model: What invariant or edge case clicked, what mistake will you avoid, and how will you recognize this pattern in upcoming problems?";

  return (
    <section aria-labelledby="reflection-stage-heading" className="space-y-4 pt-4">
      <div className="rounded-(--radius-card) border border-(--border-subtle) bg-(--bg-surface) p-5 space-y-4">
        <h3 id="reflection-stage-heading" className="text-xs font-bold uppercase tracking-wider text-(--accent-lime)">
          Capture Your Learning
        </h3>
        <p className="text-sm leading-relaxed text-(--text-secondary)">
          {prompt}
        </p>

        <ReflectionForm entityType="mission" entityId={missionId} />
      </div>
    </section>
  );
}

"use client";

import { useState, useRef, useTransition, useId } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  ExternalLink,
  Flame,
  HelpCircle,
  Lightbulb,
  LoaderCircle,
  RotateCcw,
  Search,
  Shuffle,
  Sparkles,
  Star,
  Tag,
  Target,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { DifficultyChip, ButtonLink, EmptyState } from "@/components/product/ui";
import { BookmarkButton } from "@/components/product/forms";
import {
  recordPatternRecognitionAction,
  saveReflectionAction,
} from "@/features/product/actions/product.actions";
import { cn } from "@/lib/utils";
import type { LearningPathContext } from "@/features/learning-paths/types/learning-path-continuity.types";
import { LearningPathContextBar } from "@/components/product/learning-path-context-bar";


export type PatternDetailDTO = {
  id: string;
  slug: string;
  name: string;
  description: string;
  whenToUse: string;
  mentalModel: string;
  variations: string[];
  difficulty: string;
  topic: { name: string; slug: string };
  keywords: string[];
  progress: number;
  mastery: {
    recognitionScore: number;
    applicationScore: number;
    transferScore: number;
    totalAttempts: number;
    successfulAttempts: number;
  };
  bookmarked: boolean;
  problemsSolvedCount?: number;
  hasAttemptedProblems?: boolean;
  allProblemsSolved?: boolean;
  problems: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    difficulty: string;
    source: string;
    sourceUrl: string;
    patternIds: string[];
    attemptStatus?: "solved" | "started" | "not_started";
  }[];
  relatedMissions: { id: string; slug: string; title: string }[];
  reflections: { id: string; content: string; selfRating: number; createdAt: string }[];
  recognitionHistory: {
    id: string;
    isCorrect: boolean;
    reasoning: string;
    signalIdentified: string;
    durationSeconds: number;
    createdAt: string;
  }[];
  allPatterns: { id: string; name: string; slug: string }[];
};

/* ── UI Helpers ─────────────────────────────────────────── */

function difficultyColor(d: string) {
  const lower = d.toLowerCase();
  if (lower === "easy") return "text-emerald-400";
  if (lower === "medium") return "text-amber-400";
  if (lower === "hard") return "text-rose-400";
  return "text-[var(--accent-lime,#B7F36B)]";
}

function ProgressRing({
  value,
  size = 72,
  color = "lime",
}: {
  value: number;
  size?: number;
  color?: "lime" | "emerald";
}) {
  const strokeWidth = 5;
  const r = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
  const half = size / 2;

  const gradId = color === "emerald" ? "ringGradEmerald" : "ringGradLime";

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <defs>
        <linearGradient id="ringGradLime" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#b7f36b" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        <linearGradient id="ringGradEmerald" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <circle
        cx={half}
        cy={half}
        r={r}
        fill="none"
        stroke={color === "emerald" ? "rgba(16,185,129,0.15)" : "rgba(183,243,107,0.15)"}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={half}
        cy={half}
        r={r}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
      />
    </svg>
  );
}

function SectionHeading({
  stepNumber,
  eyebrow,
  title,
  icon,
  badge,
}: {
  stepNumber?: string;
  eyebrow: string;
  title: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-3.5 mb-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          {stepNumber && (
            <span className="rounded bg-[var(--accent-lime,#B7F36B)]/15 border border-[var(--accent-lime,#B7F36B)]/30 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-[var(--accent-lime,#B7F36B)]">
              {stepNumber}
            </span>
          )}
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent-lime,#B7F36B)]/80">
            {eyebrow}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
        </div>
      </div>
      {badge && <div className="shrink-0">{badge}</div>}
    </div>
  );
}

/* ── Step 0: Hero ───────────────────────────────────────── */

export function PatternHero({ pattern }: { pattern: PatternDetailDTO }) {
  const isMastered =
    pattern.progress >= 80 ||
    (Boolean(pattern.allProblemsSolved) && pattern.reflections.length > 0);

  return (
    <header className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0C121D] via-[#080C12] to-[#040608] p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      {/* Ambient background glow */}
      <div
        className={cn(
          "pointer-events-none absolute -right-16 -top-16 size-80 rounded-full blur-[100px] opacity-20",
          isMastered ? "bg-emerald-500" : "bg-[var(--accent-lime,#B7F36B)]"
        )}
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1 min-w-0">
          {/* Metadata badges row */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <DifficultyChip difficulty={pattern.difficulty as never} />
            <Link
              href={`/learn/topics/${pattern.topic.slug}`}
              className="rounded-md border border-[var(--accent-lime,#B7F36B)]/25 bg-[var(--accent-lime,#B7F36B)]/[0.08] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent-lime,#B7F36B)] transition hover:bg-[var(--accent-lime,#B7F36B)]/15"
            >
              {pattern.topic.name}
            </Link>
            {pattern.problems.length > 0 && (
              <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 text-xs font-medium text-white/70">
                {pattern.problems.length} problem{pattern.problems.length !== 1 ? "s" : ""}
              </span>
            )}
            {isMastered && (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <Trophy size={11} /> Pattern Mastered
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {pattern.name}
          </h1>

          {/* Expanded readable description */}
          <p className="mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-(--color-text-muted)">
            {pattern.description}
          </p>

          {/* Recognition keywords / signals */}
          {pattern.keywords.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-white/40 mr-1">
                <Tag size={11} /> Signal tags:
              </span>
              {pattern.keywords.map((kw) => (
                <span
                  key={kw}
                  className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-white/70"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right side Mastery circle */}
        <div className="flex shrink-0 flex-row items-center gap-4 lg:flex-col lg:items-center self-start rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 sm:p-4">
          <div className="relative grid place-items-center">
            <ProgressRing
              value={pattern.progress}
              color={isMastered ? "emerald" : "lime"}
              size={68}
            />
            <span
              className={cn(
                "absolute text-sm font-extrabold tabular-nums",
                isMastered ? "text-emerald-300" : "text-white"
              )}
            >
              {pattern.progress}%
            </span>
          </div>
          <div className="text-left lg:text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
              Mastery Score
            </p>
            <p className="text-xs font-semibold text-white/80 mt-0.5">
              {isMastered
                ? "Mastered 🎉"
                : pattern.progress > 0
                ? "In Progress"
                : "Not Started"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ── Step 1: Understand ─────────────────────────────────── */

export function MentalModelCard({ pattern }: { pattern: PatternDetailDTO }) {
  const [showAllVariants, setShowAllVariants] = useState(false);

  return (
    <section id="step-understand" className="space-y-4">
      <SectionHeading
        stepNumber="01 · Understand"
        eyebrow="Foundation"
        title="Pattern Mental Model & Intuition"
        icon={<Brain size={18} className="text-[var(--accent-lime,#B7F36B)]" />}
      />

      <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.025] to-transparent p-5 sm:p-6 space-y-6">
        {/* Core Intuition / Why It Works */}
        {pattern.whenToUse && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300/90">
              <Lightbulb size={15} className="text-amber-400" />
              When & Why to Use It
            </div>
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-4 text-sm leading-relaxed text-white/80 whitespace-pre-line">
              {pattern.whenToUse}
            </div>
          </div>
        )}

        {/* Mental Model Framework */}
        {pattern.mentalModel && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-lime,#B7F36B)]">
              <Compass size={15} className="text-[var(--accent-lime,#B7F36B)]" />
              Mental Model Framework
            </div>
            <div className="rounded-xl border border-[var(--accent-lime,#B7F36B)]/25 bg-[var(--accent-lime,#B7F36B)]/[0.03] p-4 text-sm leading-relaxed text-white/85 whitespace-pre-line border-l-4 border-l-[var(--accent-lime,#B7F36B)]">
              {pattern.mentalModel}
            </div>
          </div>
        )}

        {/* Recognition Signals */}
        {pattern.keywords.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300/90">
              <Sparkles size={15} className="text-cyan-400" />
              Key Recognition Signals
            </div>
            <p className="text-xs text-(--color-text-muted)">
              Look for these keywords, invariants, and structural constraints in problem descriptions:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pattern.keywords.map((kw, i) => (
                <div
                  key={kw}
                  className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-white/80"
                >
                  <span className="grid size-4 shrink-0 place-items-center rounded bg-[var(--accent-lime,#B7F36B)]/15 text-[10px] font-bold text-[var(--accent-lime,#B7F36B)]">
                    {i + 1}
                  </span>
                  <span className="font-medium text-white">{kw}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Common Variations */}
        {pattern.variations.length > 0 && (
          <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-lime,#B7F36B)]/80">
                <Shuffle size={14} className="text-[var(--accent-lime,#B7F36B)]" />
                Common Variations ({pattern.variations.length})
              </div>
              {pattern.variations.length > 2 && (
                <button
                  type="button"
                  onClick={() => setShowAllVariants(!showAllVariants)}
                  className="text-[11px] font-semibold text-[var(--accent-lime,#B7F36B)] hover:text-white transition-colors flex items-center gap-1"
                >
                  {showAllVariants ? (
                    <>Show less <ChevronUp size={12} /></>
                  ) : (
                    <>Show all <ChevronDown size={12} /></>
                  )}
                </button>
              )}
            </div>
            <ul className="space-y-2">
              {(showAllVariants ? pattern.variations : pattern.variations.slice(0, 2)).map(
                (v, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.015] p-3 text-xs leading-relaxed text-white/70"
                  >
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-[var(--accent-lime,#B7F36B)]/15 text-[10px] font-bold text-[var(--accent-lime,#B7F36B)]">
                      {i + 1}
                    </span>
                    <span>{v}</span>
                  </li>
                )
              )}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Step 2: Recognize ──────────────────────────────────── */

export function RecognitionPracticeCard({ pattern }: { pattern: PatternDetailDTO }) {
  const shouldReduceMotion = useReducedMotion();
  const [practicing, setPracticing] = useState(false);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [selectedPatternId, setSelectedPatternId] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [signalIdentified, setSignalIdentified] = useState("");
  const [result, setResult] = useState<{
    ok: boolean;
    isCorrect: boolean;
    recognitionScore: number;
    masteryScore: number;
  } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [pending, startTransition] = useTransition();
  const startTime = useRef(Date.now());

  const currentProblem = pattern.problems[currentProblemIndex] ?? null;

  // Curate 4 pattern options: the actual pattern + 3 other sibling patterns
  const suggestedPatterns = [
    { id: pattern.id, name: pattern.name },
    ...pattern.allPatterns
      .filter((p) => p.id !== pattern.id)
      .slice(0, 3),
  ].sort((a, b) => a.name.localeCompare(b.name));

  function startPractice() {
    if (pattern.problems.length === 0) return;
    setCurrentProblemIndex(0);
    setSelectedPatternId("");
    setReasoning("");
    setSignalIdentified("");
    setResult(null);
    startTime.current = Date.now();
    setPracticing(true);
  }

  function nextProblem() {
    if (pattern.problems.length === 0) return;
    const nextIdx = (currentProblemIndex + 1) % pattern.problems.length;
    setCurrentProblemIndex(nextIdx);
    setSelectedPatternId("");
    setReasoning("");
    setSignalIdentified("");
    setResult(null);
    startTime.current = Date.now();
  }

  function handleSubmit() {
    if (!currentProblem || !selectedPatternId || reasoning.trim().length < 5) return;
    const durationSeconds = Math.max(1, Math.round((Date.now() - startTime.current) / 1000));
    startTransition(async () => {
      const res = await recordPatternRecognitionAction({
        problemId: currentProblem.id,
        expectedPatternId: pattern.id,
        selectedPatternId,
        reasoning,
        signalIdentified,
        durationSeconds,
      });
      setResult(res as any);
    });
  }

  return (
    <section id="step-recognize" className="space-y-4">
      <SectionHeading
        stepNumber="02 · Recognize"
        eyebrow="Instinct Training"
        title="Pattern Recognition Practice"
        icon={<Target size={18} className="text-emerald-400" />}
        badge={
          pattern.mastery.totalAttempts > 0 ? (
            <span className="text-xs font-semibold text-white/60 tabular-nums">
              Score: <strong className="text-emerald-300">{pattern.mastery.recognitionScore}%</strong> ({pattern.mastery.successfulAttempts}/{pattern.mastery.totalAttempts})
            </span>
          ) : undefined
        }
      />

      {!practicing ? (
        <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-emerald-500/[0.05] via-[var(--accent-lime,#B7F36B)]/[0.02] to-transparent p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Brain size={16} className="text-emerald-400" />
                Train Your Pattern Instinct
              </h3>
              <p className="text-xs sm:text-sm text-(--color-text-muted) max-w-xl leading-relaxed">
                You will be shown an unseen problem scenario. Without writing code, identify which pattern applies, cite the key signal, and justify your choice.
              </p>
            </div>
            {pattern.problems.length > 0 ? (
              <button
                type="button"
                onClick={startPractice}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_22px_rgba(16,185,129,0.4)] active:translate-y-0"
              >
                <Shuffle size={14} /> Start Recognition Practice
              </button>
            ) : (
              <span className="text-xs text-white/40 italic">
                No practice problems linked yet.
              </span>
            )}
          </div>

          {/* Past Attempts drawer */}
          {pattern.recognitionHistory.length > 0 && (
            <div className="pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center justify-between w-full text-xs text-white/50 hover:text-white transition-colors"
              >
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  Recent Recognition Attempts ({pattern.recognitionHistory.length})
                </span>
                {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {showHistory && (
                <div className="mt-3 space-y-2">
                  {pattern.recognitionHistory.slice(0, 5).map((att) => (
                    <div
                      key={att.id}
                      className="flex items-start gap-2.5 rounded-lg border border-white/[0.05] bg-white/[0.015] p-2.5 text-xs"
                    >
                      {att.isCorrect ? (
                        <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <X size={15} className="text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white/80 truncate font-medium">{att.reasoning}</p>
                        {att.signalIdentified && (
                          <p className="text-[11px] text-[var(--accent-lime,#B7F36B)]/80 mt-0.5">
                            Signal: {att.signalIdentified}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-white/30 tabular-nums shrink-0">
                        {new Date(att.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : result ? (
        /* Result State */
        <motion.div
          initial={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "rounded-2xl border p-5 sm:p-6 space-y-4",
            result.isCorrect
              ? "border-emerald-500/30 bg-emerald-950/20"
              : "border-rose-500/30 bg-rose-950/20"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "grid size-10 place-items-center rounded-xl",
                result.isCorrect
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-rose-500/20 text-rose-300"
              )}
            >
              {result.isCorrect ? <CheckCircle2 size={22} /> : <X size={22} />}
            </div>
            <div>
              <h4 className="text-base font-bold text-white">
                {result.isCorrect
                  ? "Spot On! Correct Recognition"
                  : `Not Quite — This was ${pattern.name}`}
              </h4>
              <p className="text-xs text-(--color-text-muted) mt-0.5">
                {result.isCorrect
                  ? "You accurately identified the structural cues and invariant of this pattern."
                  : `The problem cues indicate ${pattern.name}. Review the core mental model to reinforce your instinct.`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Recognition Score
              </span>
              <p className="text-xl font-extrabold text-white mt-0.5 tabular-nums">
                {result.recognitionScore}%
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Mastery Score
              </span>
              <p className="text-xl font-extrabold text-white mt-0.5 tabular-nums">
                {result.masteryScore}%
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onClick={nextProblem}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-lime,#B7F36B)] px-4 py-2 text-xs font-bold text-[#0B0F14] hover:bg-[var(--accent-lime,#B7F36B)]/90 transition shadow-sm"
            >
              <ArrowRight size={13} /> Try Another Problem
            </button>
            <a
              href="#step-practice"
              onClick={() => setPracticing(false)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-bold text-white hover:bg-white/[0.08] transition"
            >
              Continue to Practice Problems ↓
            </a>
            <button
              type="button"
              onClick={() => setPracticing(false)}
              className="ml-auto text-xs text-white/50 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      ) : (
        /* Active Practice Form */
        <motion.div
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[var(--accent-lime,#B7F36B)]/30 bg-gradient-to-br from-[var(--accent-lime,#B7F36B)]/[0.04] to-transparent p-5 sm:p-6 space-y-4 shadow-xl"
        >
          {/* Question scenario card */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-lime,#B7F36B)]">
                Problem Challenge #{currentProblemIndex + 1}
              </span>
              <div className="flex items-center gap-2">
                <span className={cn("text-[11px] font-bold", difficultyColor(currentProblem?.difficulty ?? "easy"))}>
                  {currentProblem?.difficulty}
                </span>
                {currentProblem?.sourceUrl && (
                  <a
                    href={currentProblem.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-white/40 hover:text-white"
                  >
                    Source <ExternalLink size={9} />
                  </a>
                )}
              </div>
            </div>
            <h4 className="text-base font-bold text-white">{currentProblem?.title}</h4>
            <p className="text-xs sm:text-sm text-(--color-text-muted) leading-relaxed">
              {currentProblem?.summary}
            </p>
          </div>

          {/* Form fields */}
          <div className="space-y-3.5">
            {/* 1. Pick pattern */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70">
                1. Which pattern applies?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {suggestedPatterns.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPatternId(p.id)}
                    className={cn(
                      "rounded-xl border p-2.5 text-xs font-semibold text-left transition-all duration-150",
                      selectedPatternId === p.id
                        ? "border-[var(--accent-lime,#B7F36B)] bg-[var(--accent-lime,#B7F36B)]/15 text-white shadow-[0_0_12px_rgba(183,243,107,0.25)]"
                        : "border-white/[0.08] bg-white/[0.02] text-white/70 hover:border-[var(--accent-lime,#B7F36B)]/40 hover:bg-white/[0.04]"
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Signal identified */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70">
                2. What signal or clue gave it away?
              </label>
              <input
                type="text"
                value={signalIdentified}
                onChange={(e) => setSignalIdentified(e.target.value)}
                placeholder="e.g. sorted array, contiguous subarray, count frequency..."
                className="h-9 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-xs text-white placeholder:text-white/30 outline-none focus:border-[var(--accent-lime,#B7F36B)]/50 focus:bg-white/[0.05] transition-colors"
              />
            </div>

            {/* 3. Reasoning */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70">
                3. Explain why (structural reasoning)
              </label>
              <textarea
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                placeholder="Explain what invariant or problem structure dictates this pattern..."
                rows={2}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 text-xs text-white placeholder:text-white/30 outline-none focus:border-[var(--accent-lime,#B7F36B)]/50 focus:bg-white/[0.05] transition-colors resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={pending || !selectedPatternId || reasoning.trim().length < 5}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-[0_4px_14px_rgba(16,185,129,0.3)] transition hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0"
              >
                {pending ? (
                  <>
                    <LoaderCircle size={13} className="animate-spin" /> Evaluating...
                  </>
                ) : (
                  <>
                    <Check size={13} /> Submit Recognition
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setPracticing(false)}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/60 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </section>
  );
}

/* ── Step 3: Practice ───────────────────────────────────── */

export function ProblemListRow({
  problem,
}: {
  problem: PatternDetailDTO["problems"][number];
}) {
  const isSolved = problem.attemptStatus === "solved";
  const isInProgress = problem.attemptStatus === "started";

  return (
    <div
      className={cn(
        "group flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-2xl border p-4 transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]",
        isSolved
          ? "border-emerald-500/20 bg-emerald-950/[0.07] hover:border-emerald-500/35"
          : isInProgress
          ? "border-[var(--accent-lime,#B7F36B)]/25 bg-[var(--accent-lime,#B7F36B)]/[0.04] hover:border-[var(--accent-lime,#B7F36B)]/40"
          : "border-white/[0.07] bg-white/[0.02] hover:border-[var(--accent-lime,#B7F36B)]/40 hover:bg-white/[0.035]"
      )}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {/* Solved Status Indicator */}
        <div className="mt-0.5 shrink-0">
          {isSolved ? (
            <div className="grid size-6 place-items-center rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
              <Check size={13} strokeWidth={3} />
            </div>
          ) : isInProgress ? (
            <div className="grid size-6 place-items-center rounded-full bg-[var(--accent-lime,#B7F36B)]/20 border border-[var(--accent-lime,#B7F36B)]/40 text-[var(--accent-lime,#B7F36B)]">
              <span className="size-2 rounded-full bg-[var(--accent-lime,#B7F36B)] animate-pulse" />
            </div>
          ) : (
            <div className="grid size-6 place-items-center rounded-full border border-white/20 text-white/30 text-[10px] font-semibold">
              ○
            </div>
          )}
        </div>

        {/* Problem metadata */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className="text-sm font-bold text-white transition-colors group-hover:text-[var(--accent-lime,#B7F36B)]">
              {problem.title}
            </h4>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                problem.difficulty.toLowerCase() === "easy"
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                  : problem.difficulty.toLowerCase() === "medium"
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
                  : "bg-rose-500/15 text-rose-300 border border-rose-500/25"
              )}
            >
              {problem.difficulty}
            </span>
            {isSolved && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Solved
              </span>
            )}
          </div>
          {problem.summary && (
            <p className="text-xs text-(--color-text-muted) line-clamp-1 leading-relaxed">
              {problem.summary}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons: Practice -> (Primary) vs LeetCode (Secondary Ghost) */}
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
        {problem.sourceUrl && (
          <a
            href={problem.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:border-white/20 hover:text-white"
          >
            {problem.source.toLowerCase() === "leetcode"
              ? "LeetCode"
              : problem.source.toLowerCase() === "geeksforgeeks"
              ? "GFG"
              : "External"}
            <ExternalLink size={11} className="opacity-60" />
          </a>
        )}

        <Link
          href={`/practice/problems/${problem.slug}`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold transition-all duration-150 shadow-sm",
            isSolved
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/25"
              : "bg-[var(--accent-lime,#B7F36B)] text-[#0B0F14] hover:bg-[var(--accent-lime,#B7F36B)]/90 hover:shadow-[0_4px_14px_rgba(183,243,107,0.3)] hover:-translate-y-px font-semibold"
          )}
        >
          {isSolved ? "Practice Again" : "Practice"}
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

export function PatternProblemList({ pattern }: { pattern: PatternDetailDTO }) {
  const solvedCount = pattern.problems.filter((p) => p.attemptStatus === "solved").length;

  return (
    <section id="step-practice" className="space-y-4">
      <SectionHeading
        stepNumber="03 · Practice"
        eyebrow="Hands-On Application"
        title={`${pattern.problems.length} Practice Problem${pattern.problems.length !== 1 ? "s" : ""}`}
        icon={<BookOpen size={18} className="text-cyan-400" />}
        badge={
          pattern.problems.length > 0 ? (
            <span className="text-xs font-semibold tabular-nums text-white/60">
              <strong className="text-emerald-300">{solvedCount}</strong> / {pattern.problems.length} solved
            </span>
          ) : undefined
        }
      />

      {pattern.problems.length > 0 ? (
        <div className="space-y-3">
          {pattern.problems.map((problem) => (
            <ProblemListRow key={problem.id} problem={problem} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/[0.08] p-8 text-center">
          <BookOpen size={24} className="mx-auto mb-2 text-white/30" />
          <p className="text-sm text-white/60 font-semibold">No problems linked to this pattern yet.</p>
          <p className="text-xs text-white/40 mt-1">Check back soon as new curriculum is published.</p>
        </div>
      )}
    </section>
  );
}

/* ── Step 4: Reflect & Confidence ───────────────────────── */

const CONFIDENCE_LEVELS = [
  { val: 1, label: "1 · Shaky", desc: "Need hints or editorial" },
  { val: 2, label: "2 · Basic", desc: "Get concept, struggle to code" },
  { val: 3, label: "3 · Moderate", desc: "Can solve similar variants" },
  { val: 4, label: "4 · Strong", desc: "Recognize quickly, clean code" },
  { val: 5, label: "5 · Mastered", desc: "Can explain and teach it" },
];

export function ConfidenceSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold uppercase tracking-wider text-white/50 text-[10px]">
          Pattern Confidence Rating
        </span>
        <span className="font-semibold text-[var(--accent-lime,#B7F36B)]">
          {CONFIDENCE_LEVELS.find((c) => c.val === value)?.desc}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {CONFIDENCE_LEVELS.map((item) => (
          <button
            key={item.val}
            type="button"
            onClick={() => onChange(item.val)}
            className={cn(
              "flex flex-col items-center justify-center rounded-xl border py-2 px-1 text-center transition-all duration-150",
              value === item.val
                ? "border-[var(--accent-lime,#B7F36B)] bg-[var(--accent-lime,#B7F36B)]/15 text-white shadow-[0_0_12px_rgba(183,243,107,0.25)]"
                : "border-white/[0.07] bg-white/[0.02] text-white/70 hover:border-[var(--accent-lime,#B7F36B)]/40 hover:bg-white/[0.04]"
            )}
          >
            <span className="text-xs font-bold tabular-nums">{item.val} / 5</span>
            <span className="text-[9px] font-medium opacity-70 truncate w-full hidden sm:block">
              {item.label.split(" · ")[1]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReflectionBox({ pattern }: { pattern: PatternDetailDTO }) {
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(3);
  const [savedStatus, setSavedStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [pending, startTransition] = useTransition();

  const hasSolvedAny = pattern.problems.some((p) => p.attemptStatus === "solved");
  const hasAttemptedAny = pattern.hasAttemptedProblems || pattern.problems.some((p) => p.attemptStatus !== "not_started");
  const allSolved = pattern.allProblemsSolved ?? (pattern.problems.length > 0 && pattern.problems.every((p) => p.attemptStatus === "solved"));

  async function handleSave(manual = false) {
    if (!content.trim() || content.trim().length < 10) return;
    setSavedStatus("saving");
    startTransition(async () => {
      await saveReflectionAction({
        entityType: "pattern",
        entityId: pattern.id,
        content: content.trim(),
        selfRating: rating,
      });
      setSavedStatus("saved");
      setTimeout(() => setSavedStatus("idle"), 3000);
    });
  }

  return (
    <section id="step-reflect" className="space-y-4">
      <SectionHeading
        stepNumber="04 · Reflect"
        eyebrow="Consolidation"
        title="Pattern Reflection & Insights"
        icon={<Sparkles size={18} className="text-amber-400" />}
      />

      <div
        className={cn(
          "rounded-2xl border p-5 sm:p-6 space-y-5 transition-all",
          allSolved
            ? "border-[var(--accent-lime,#B7F36B)]/30 bg-gradient-to-br from-[var(--accent-lime,#B7F36B)]/[0.06] via-amber-500/[0.02] to-transparent shadow-[0_8px_32px_rgba(183,243,107,0.1)]"
            : hasAttemptedAny
            ? "border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent"
            : "border-white/[0.06] bg-white/[0.015]"
        )}
      >
        {/* Dynamic Contextual Guidance Banner */}
        {allSolved ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-400/25 bg-emerald-500/15 p-3.5 text-xs text-emerald-200">
            <Trophy size={16} className="text-emerald-300 shrink-0" />
            <div>
              <strong className="text-white">All problems completed! 🎉</strong> Now reflect on what you learned to cement your mastery.
            </div>
          </div>
        ) : hasAttemptedAny ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
            <Sparkles size={15} className="text-emerald-400 shrink-0" />
            <div>
              <strong>Practice detected:</strong> Capture your key insight while the problem structure and edge cases are fresh.
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-white/50">
            <Lightbulb size={15} className="text-amber-400/70 shrink-0" />
            <div>
              <strong>Learning sequence:</strong> Attempt at least 1 problem above to write the most impactful reflection.
            </div>
          </div>
        )}

        {/* Confidence Slider */}
        <ConfidenceSlider value={rating} onChange={setRating} />

        {/* Textarea with auto-save on blur */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold uppercase tracking-wider text-white/50 text-[10px]">
              Key Insights & Traps to Remember
            </label>
            <span className="text-[10px] text-white/35">
              Auto-saves on blur (min 10 chars)
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={() => handleSave(false)}
            rows={3}
            placeholder="What clicked about this pattern? What recognition signal will you look for next time? What edge case tripped you up?"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.025] p-3.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-[var(--accent-lime,#B7F36B)]/50 focus:bg-white/[0.045] transition-colors resize-y"
          />
        </div>

        {/* Save button & status */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 text-xs">
            {savedStatus === "saving" && (
              <span className="text-[var(--accent-lime,#B7F36B)] flex items-center gap-1 font-medium">
                <LoaderCircle size={12} className="animate-spin" /> Saving reflection...
              </span>
            )}
            {savedStatus === "saved" && (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <Check size={13} /> Reflection saved!
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={pending || content.trim().length < 10}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-lime,#B7F36B)] px-4 py-2 text-xs font-bold text-[#0B0F14] shadow-sm transition hover:bg-[var(--accent-lime,#B7F36B)]/90 disabled:opacity-40"
          >
            Save Reflection
          </button>
        </div>

        {/* Past Reflections history */}
        {pattern.reflections.length > 0 && (
          <div className="pt-4 border-t border-white/[0.06] space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Past Reflections ({pattern.reflections.length})
            </h4>
            <div className="space-y-2.5">
              {pattern.reflections.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 space-y-1.5 text-xs"
                >
                  <p className="text-white/80 leading-relaxed whitespace-pre-line">
                    {r.content}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-white/40 pt-1">
                    <span className="font-semibold text-[var(--accent-lime,#B7F36B)]">
                      Confidence {r.selfRating}/5
                    </span>
                    <time dateTime={r.createdAt}>
                      {new Date(r.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Right Sidebar: Your Journey ────────────────────────── */

export function MasteryBreakdownSidebar({ pattern }: { pattern: PatternDetailDTO }) {
  const solvedCount = pattern.problems.filter((p) => p.attemptStatus === "solved").length;
  const hasAttemptedProblems = pattern.hasAttemptedProblems || solvedCount > 0;
  const hasRecognized = pattern.mastery.totalAttempts > 0;
  const hasReflected = pattern.reflections.length > 0;
  const isAllSolved = pattern.problems.length > 0 && solvedCount === pattern.problems.length;
  const isMastered = pattern.progress >= 80 || (isAllSolved && hasReflected);

  // Next action logic
  const nextProblem = pattern.problems.find((p) => p.attemptStatus !== "solved") ?? pattern.problems[0];

  const milestones = [
    {
      id: "understand",
      label: "1. Understand Mental Model",
      done: true,
      href: "#step-understand",
    },
    {
      id: "recognize",
      label: "2. Pattern Recognition",
      done: hasRecognized,
      href: "#step-recognize",
    },
    {
      id: "practice",
      label: `3. Practice Problems (${solvedCount}/${pattern.problems.length})`,
      done: isAllSolved,
      href: "#step-practice",
    },
    {
      id: "reflect",
      label: "4. Reflect & Lock In",
      done: hasReflected,
      href: "#step-reflect",
    },
  ];

  return (
    <aside className="space-y-6 lg:sticky lg:top-20 self-start">
      {/* Your Journey Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0C121D] to-[#080C12] p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
          <div className="flex items-center gap-2">
            <Compass size={16} className="text-[var(--accent-lime,#B7F36B)]" />
            <h3 className="text-sm font-bold tracking-tight text-white">Your Journey</h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-lime,#B7F36B)]/70 tabular-nums">
            {milestones.filter((m) => m.done).length} of 4 Complete
          </span>
        </div>

        {/* Milestone Steps */}
        <div className="space-y-2">
          {milestones.map((m) => (
            <a
              key={m.id}
              href={m.href}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border p-2.5 text-xs transition-colors",
                m.done
                  ? "border-emerald-500/20 bg-emerald-500/[0.05] text-emerald-300 hover:bg-emerald-500/[0.08]"
                  : "border-white/[0.06] bg-white/[0.02] text-white/70 hover:border-[var(--accent-lime,#B7F36B)]/30 hover:text-white"
              )}
            >
              <div className="shrink-0">
                {m.done ? (
                  <CheckCircle2 size={14} className="text-emerald-400" />
                ) : (
                  <span className="grid size-3.5 place-items-center rounded-full border border-white/30 text-[9px]">
                    ○
                  </span>
                )}
              </div>
              <span className="font-semibold">{m.label}</span>
            </a>
          ))}
        </div>

        {/* Next Recommended Action */}
        <div className="rounded-xl border border-[var(--accent-lime,#B7F36B)]/25 bg-[var(--accent-lime,#B7F36B)]/10 p-3 text-xs space-y-1">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--accent-lime,#B7F36B)]">
            Recommended Next Step
          </span>
          <p className="font-semibold text-white leading-snug">
            {!hasRecognized ? (
              <a href="#step-recognize" className="hover:underline flex items-center gap-1">
                Test your pattern recognition →
              </a>
            ) : !isAllSolved && nextProblem ? (
              <Link
                href={`/practice/problems/${nextProblem.slug}`}
                className="hover:underline flex items-center gap-1 text-[var(--accent-lime,#B7F36B)]"
              >
                Practice: {nextProblem.title} →
              </Link>
            ) : !hasReflected ? (
              <a href="#step-reflect" className="hover:underline flex items-center gap-1 text-amber-200">
                Write reflection to finalize mastery →
              </a>
            ) : (
              <span className="text-emerald-300">Pattern Mastered! Reinforce via practice.</span>
            )}
          </p>
        </div>
      </div>

      {/* Evolving Detailed Mastery Breakdown */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
        <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
          Mastery Breakdown
        </h4>

        {!hasAttemptedProblems && !hasRecognized ? (
          /* Empty state for new students */
          <div className="space-y-2 text-xs text-white/50">
            <p>
              Your granular mastery breakdown across <strong>Recognition</strong>, <strong>Application</strong>, and <strong>Transfer</strong> will activate once you attempt your first problem or recognition quiz.
            </p>
          </div>
        ) : (
          /* Live animated stat bars */
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/60">Recognition</span>
                <span className="font-bold tabular-nums text-white">
                  {pattern.mastery.recognitionScore}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-[var(--accent-lime,#B7F36B)] rounded-full transition-all duration-500"
                  style={{ width: `${pattern.mastery.recognitionScore}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/60">Application</span>
                <span className="font-bold tabular-nums text-white">
                  {pattern.mastery.applicationScore}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${pattern.mastery.applicationScore}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/60">Transfer</span>
                <span className="font-bold tabular-nums text-white">
                  {pattern.mastery.transferScore}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${pattern.mastery.transferScore}%` }}
                />
              </div>
            </div>

            {pattern.mastery.totalAttempts > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-[11px] text-white/60">
                <TrendingUp size={13} className="text-emerald-400" />
                <span>
                  {pattern.mastery.successfulAttempts} of {pattern.mastery.totalAttempts} recognitions correct
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Related Missions */}
      {pattern.relatedMissions.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
            Learn in Mission
          </h4>
          <div className="space-y-2">
            {pattern.relatedMissions.map((m) => (
              <Link
                key={m.id}
                href={`/missions/${m.slug}`}
                className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs font-semibold text-white transition hover:border-[var(--accent-lime,#B7F36B)]/30 hover:bg-[var(--accent-lime,#B7F36B)]/[0.05]"
              >
                <span className="truncate">{m.title}</span>
                <Zap size={13} className="text-[var(--accent-lime,#B7F36B)] shrink-0 ml-2" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Facts */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3 text-xs">
        <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
          Pattern Facts
        </h4>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-white/40">Difficulty</dt>
            <dd className="font-semibold text-white">{pattern.difficulty}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/40">Topic</dt>
            <dd className="font-semibold text-white">{pattern.topic.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/40">Problems Linked</dt>
            <dd className="font-semibold text-white tabular-nums">{pattern.problems.length}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/40">Recognition Tests</dt>
            <dd className="font-semibold text-white tabular-nums">{pattern.mastery.totalAttempts}</dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}

/* ── Main Pattern Detail View ───────────────────────────── */

export function PatternDetailView({
  pattern,
  learningPathContext,
}: {
  pattern: PatternDetailDTO;
  learningPathContext?: LearningPathContext | null;
}) {
  if (!pattern) {
    return (
      <div className="mx-auto max-w-4xl py-8">
        <EmptyState
          title="Pattern not found"
          description="This pattern is not published or does not exist."
          action={<ButtonLink href="/patterns">Back to Patterns</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16 pt-2">
      {/* ── Path Continuity Context Layer ── */}
      {learningPathContext && (
        <LearningPathContextBar context={learningPathContext} className="mb-2" />
      )}

      {/* Top Breadcrumb & Bookmark */}
      <div className="flex items-center justify-between gap-3">
        <nav aria-label="Pattern breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-(--color-text-muted)">
          {learningPathContext ? (
            <>
              <Link
                href={learningPathContext.backToStageUrl}
                className="flex items-center gap-1 rounded-md px-2 py-1 transition hover:bg-white/[0.06] hover:text-white"
              >
                <ArrowLeft size={12} /> Stage {learningPathContext.stageOrder}
              </Link>
              <span className="text-white/20">/</span>
              <span className="text-white/80 font-medium">Patterns</span>
              <span className="text-white/20">/</span>
              <span className="rounded-md bg-[var(--accent-lime,#B7F36B)]/15 px-2 py-1 font-semibold text-[var(--accent-lime,#B7F36B)]">
                {pattern.name}
              </span>
            </>
          ) : (
            <>
              <Link
                href="/patterns"
                className="flex items-center gap-1 rounded-md px-2 py-1 transition hover:bg-white/[0.06] hover:text-white"
              >
                <ArrowLeft size={12} /> Patterns
              </Link>
              <span className="text-white/20">/</span>
              {pattern.topic.slug && (
                <>
                  <Link
                    href={`/learn/topics/${pattern.topic.slug}`}
                    className="rounded-md px-2 py-1 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    {pattern.topic.name}
                  </Link>
                  <span className="text-white/20">/</span>
                </>
              )}
              <span className="rounded-md bg-[var(--accent-lime,#B7F36B)]/15 px-2 py-1 font-semibold text-[var(--accent-lime,#B7F36B)]">
                {pattern.name}
              </span>
            </>
          )}
        </nav>

        <BookmarkButton
          entityType="pattern"
          entityId={pattern.id}
          active={pattern.bookmarked}
        />
      </div>

      {/* Hero */}
      <PatternHero pattern={pattern} />

      {/* Main Content Layout: Left Column (Sequence) + Right Sidebar (Your Journey) */}
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Left Column: 1. Understand -> 2. Recognize -> 3. Practice -> 4. Reflect */}
        <div className="space-y-10 min-w-0">
          {/* Step 1: Understand */}
          <MentalModelCard pattern={pattern} />

          {/* Step 2: Recognize */}
          <RecognitionPracticeCard pattern={pattern} />

          {/* Step 3: Practice */}
          <PatternProblemList pattern={pattern} />

          {/* Step 4: Reflect */}
          <ReflectionBox pattern={pattern} />
        </div>

        {/* Right Sidebar: Your Journey & Evolving Mastery */}
        <MasteryBreakdownSidebar pattern={pattern} />
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  LoaderCircle,
  Brain,
  Target,
  BookOpen,
  Sparkles,
  Lightbulb,
  Eye,
  Layers,
  Star,
  Code2,
  MessageSquarePlus,
  ArrowLeft,
  Check,
} from "lucide-react";
import { completeMissionMasteryStageAction, completeMissionPatternStageAction, completeMissionPracticeStageAction } from "@/features/product/actions/product.actions";
import type { Stage } from "@/features/platform/engines/learning.engine";
import { ReflectionForm } from "@/components/product/forms";
import { CodeIllustration } from "./code-illustration";
import { InlineAIMentor } from "./inline-ai-mentor";

/* ─── Stage kind → display config ────────────────────── */
const KIND_META: Record<
  string,
  { label: string; Icon: React.ElementType; accentClass: string; glowClass: string }
> = {
  introduction: {
    label: "Introduction",
    Icon: BookOpen,
    accentClass: "text-purple-300",
    glowClass: "bg-purple-400/[0.08] border-purple-400/20",
  },
  intuition: {
    label: "Intuition",
    Icon: Lightbulb,
    accentClass: "text-amber-300",
    glowClass: "bg-amber-400/[0.06] border-amber-400/15",
  },
  concept: {
    label: "Concept",
    Icon: Layers,
    accentClass: "text-cyan-300",
    glowClass: "bg-cyan-400/[0.06] border-cyan-400/15",
  },
  mental_model: {
    label: "Mental Model",
    Icon: Brain,
    accentClass: "text-emerald-300",
    glowClass: "bg-emerald-400/[0.06] border-emerald-400/15",
  },
  visualization: {
    label: "Visualization",
    Icon: Eye,
    accentClass: "text-violet-300",
    glowClass: "bg-violet-400/[0.06] border-violet-400/15",
  },
  pattern: {
    label: "Pattern Recognition",
    Icon: Target,
    accentClass: "text-amber-300",
    glowClass: "bg-amber-400/[0.06] border-amber-400/15",
  },
  example: {
    label: "Example",
    Icon: Code2,
    accentClass: "text-cyan-300",
    glowClass: "bg-cyan-400/[0.06] border-cyan-400/15",
  },
  practice: {
    label: "Practice",
    Icon: Star,
    accentClass: "text-purple-300",
    glowClass: "bg-purple-400/[0.06] border-purple-400/15",
  },
  reflection: {
    label: "Capture Learning",
    Icon: MessageSquarePlus,
    accentClass: "text-emerald-300",
    glowClass: "bg-emerald-400/[0.06] border-emerald-400/15",
  },
  mastery: {
    label: "Mastery Check",
    Icon: Sparkles,
    accentClass: "text-fuchsia-300",
    glowClass: "bg-fuchsia-400/[0.06] border-fuchsia-400/15",
  },
};

type StageNavProps = {
  canGoBack?: boolean;
  onBack?: () => void;
  onContinue?: (stepKey: string) => void;
  missionTitle?: string;
  topicName?: string;
  stageIndex?: number;
  totalStages?: number;
};

function getKindMeta(kind: string) {
  return (
    KIND_META[kind] ?? {
      label: kind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      Icon: BookOpen,
      accentClass: "text-purple-300",
      glowClass: "bg-purple-400/[0.06] border-purple-400/15",
    }
  );
}

/* ─── Reading Area Top Header (Audit Requirement 3) ──── */
function StageCardHeader({
  missionTitle,
  stageTitle,
  stageKind,
  stageIndex = 0,
  totalStages = 1,
}: {
  missionTitle?: string;
  stageTitle?: string | null;
  stageKind: string;
  stageIndex?: number;
  totalStages?: number;
}) {
  const { label, Icon, accentClass, glowClass } = getKindMeta(stageKind);
  const displayTitle = stageTitle && stageTitle.trim() !== "" ? stageTitle : label;

  return (
    <div className="mb-7 border-b border-white/[0.07] pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <span className="text-xs font-medium text-purple-200/50 truncate max-w-sm">
          {missionTitle || "Mission"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/20 bg-purple-400/[0.07] px-2.5 py-0.5 text-[11px] font-semibold text-purple-300 shrink-0">
          Stage {stageIndex + 1} of {totalStages}
        </span>
      </div>
      <div className="flex items-start gap-4">
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl border ${glowClass}`}>
          <Icon size={20} className={accentClass} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-purple-100/40">
              {label}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug mt-0.5">
            {displayTitle}
          </h2>
        </div>
      </div>
    </div>
  );
}


function decodeHtml(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#10;/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n");
}

/* ─── Content renderer ────────────────────────────────── */
function StageContent({ content }: { content: string | null | undefined; kind: string }) {
  if (!content || content.trim() === "") {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-8 text-center">
        <p className="text-sm text-purple-100/40">
          No content available for this stage yet.
        </p>
      </div>
    );
  }

  const htmlTagPattern = /<\/?(p|br|blockquote|pre|code|h[1-6]|ul|ol|li|strong|em|b|i|a)\b/i;
  const hasSavedHtml = htmlTagPattern.test(content);
  const sanitizeHtml = (value: string) => {
    if (typeof window === "undefined") return "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(value, "text/html");
    doc.querySelectorAll("script,style,iframe,object,embed").forEach((node) => node.remove());
    const allowedTags = new Set(["P", "BR", "BLOCKQUOTE", "PRE", "CODE", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "STRONG", "EM", "B", "I", "A"]);
    doc.body.querySelectorAll("*").forEach((element) => {
      if (!allowedTags.has(element.tagName)) {
        element.replaceWith(...Array.from(element.childNodes));
        return;
      }
      Array.from(element.attributes).forEach((attr) => {
        if (element.tagName === "A" && attr.name === "href") {
          const href = attr.value.trim();
          if (/^https?:\/\//i.test(href)) {
            element.setAttribute("target", "_blank");
            element.setAttribute("rel", "noopener noreferrer");
            return;
          }
        }
        element.removeAttribute(attr.name);
      });
    });
    return doc.body.innerHTML;
  };

  if (hasSavedHtml) {
    const codeBlockRegex = /<pre[^>]*><code(?:\s+class="language-([^"]*)")?[^>]*>([\s\S]*?)<\/code><\/pre>/gi;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        const textChunk = content.slice(lastIndex, matchIndex);
        if (textChunk.trim()) {
          parts.push(
            <div
              key={`text-${lastIndex}`}
              className="max-w-none text-[15px] leading-[1.8] text-purple-100/75 [&_a]:text-cyan-300 [&_blockquote]:border-l-2 [&_blockquote]:border-purple-400/30 [&_blockquote]:pl-4 [&_blockquote]:text-purple-100/70 [&_code]:rounded-md [&_code]:bg-white/[0.06] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-cyan-200 [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_h4]:text-white [&_h5]:text-white [&_h6]:text-white [&_li]:my-1.5 [&_li]:text-purple-100/75 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_p]:text-purple-100/75 [&_p]:last:mb-0 [&_strong]:text-white [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(textChunk) }}
            />
          );
        }
      }
      const lang = match[1] || "cpp";
      const rawCode = decodeHtml(match[2] ?? "");
      parts.push(
        <CodeIllustration
          key={`code-${matchIndex}`}
          code={rawCode}
          language={lang}
        />
      );
      lastIndex = matchIndex + match[0].length;
    }

    if (lastIndex < content.length) {
      const remainingChunk = content.slice(lastIndex);
      if (remainingChunk.trim()) {
        parts.push(
          <div
            key={`text-${lastIndex}`}
            className="max-w-none text-[15px] leading-[1.8] text-purple-100/75 [&_a]:text-cyan-300 [&_blockquote]:border-l-2 [&_blockquote]:border-purple-400/30 [&_blockquote]:pl-4 [&_blockquote]:text-purple-100/70 [&_code]:rounded-md [&_code]:bg-white/[0.06] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-cyan-200 [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_h4]:text-white [&_h5]:text-white [&_h6]:text-white [&_li]:my-1.5 [&_li]:text-purple-100/75 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_p]:text-purple-100/75 [&_p]:last:mb-0 [&_strong]:text-white [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(remainingChunk) }}
          />
        );
      }
    }

    if (parts.length > 0) {
      return <div className="space-y-2">{parts}</div>;
    }

    return (
      <div
        className="max-w-none text-[15px] leading-[1.8] text-purple-100/75 [&_a]:text-cyan-300 [&_blockquote]:border-l-2 [&_blockquote]:border-purple-400/30 [&_blockquote]:pl-4 [&_blockquote]:text-purple-100/70 [&_code]:rounded-md [&_code]:bg-white/[0.06] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-cyan-200 [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_h4]:text-white [&_h5]:text-white [&_h6]:text-white [&_li]:my-1.5 [&_li]:text-purple-100/75 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_p]:text-purple-100/75 [&_p]:last:mb-0 [&_strong]:text-white [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
      />
    );
  }

  // Raw markdown parser handling fenced code blocks and paragraphs
  const rawParts = content.split(/(```[\w]*[\s\S]*?```)/g);
  return (
    <div className="max-w-none space-y-4">
      {rawParts.map((chunk, i) => {
        const trimmed = chunk.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith("```")) {
          const matchLang = trimmed.match(/^```(\w+)/);
          const lang = matchLang ? matchLang[1] : "cpp";
          const code = trimmed.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "");
          return (
            <CodeIllustration
              key={i}
              code={code}
              language={lang}
            />
          );
        }
        return (
          <div key={i} className="space-y-4">
            {trimmed.split("\n\n").map((para, pIdx) => {
              const pTrimmed = para.trim();
              if (!pTrimmed) return null;
              if (pTrimmed.startsWith("    ")) {
                return (
                  <CodeIllustration
                    key={pIdx}
                    code={pTrimmed.replace(/^    /gm, "")}
                    language="cpp"
                  />
                );
              }
              return (
                <p key={pIdx} className="text-[15px] leading-[1.8] text-purple-100/75">
                  {pTrimmed}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main dispatcher ─────────────────────────────────── */
export function StageRenderer({
  missionId,
  stage,
  canGoBack,
  onBack,
  onContinue,
  missionTitle,
  topicName,
  stageIndex,
  totalStages,
}: {
  missionId: string;
  stage: Stage;
} & StageNavProps) {
  const commonProps = {
    missionId,
    stage,
    canGoBack,
    onBack,
    onContinue,
    missionTitle,
    topicName,
    stageIndex,
    totalStages,
  };
  if (stage.kind === "reflection") {
    return <ReflectionStageCard {...commonProps} />;
  }
  if (stage.kind === "pattern") {
    return <PatternStageCard {...commonProps} />;
  }
  if (stage.kind === "practice") {
    return <PracticeStageCard {...commonProps} />;
  }
  if (stage.kind === "mastery") {
    return <MasteryStageCard {...commonProps} />;
  }
  return <GenericStageCard {...commonProps} />;
}

/* ─── Generic stage card ──────────────────────────────── */
function GenericStageCard({
  missionId,
  stage,
  canGoBack,
  onBack,
  onContinue,
  missionTitle,
  topicName,
  stageIndex,
  totalStages,
}: {
  missionId: string;
  stage: Stage;
} & StageNavProps) {
  const { label } = getKindMeta(stage.kind);

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#0c0619]/90 to-[#080414]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
      <StageCardHeader
        missionTitle={missionTitle}
        stageTitle={stage.title}
        stageKind={stage.kind}
        stageIndex={stageIndex}
        totalStages={totalStages}
      />

      {/* Content Body */}
      <div className="mb-6">
        <StageContent content={stage.content} kind={stage.kind} />
      </div>

      {/* Contextual Inline AI Trigger (Requirement 5) */}
      <InlineAIMentor
        missionId={missionId}
        missionTitle={missionTitle || "Mission"}
        topicName={topicName}
        stageTitle={stage.title || label}
        stageKind={stage.kind}
      />
    </div>
  );
}

function PatternStageCard({
  missionId,
  stage,
  canGoBack,
  onBack,
  onContinue,
  missionTitle,
  topicName,
  stageIndex,
  totalStages,
}: { missionId: string; stage: Stage } & StageNavProps) {
  const router = useRouter();
  const { label } = getKindMeta(stage.kind);
  const [selectedPatternId, setSelectedPatternId] = useState(stage.latestPatternAttempt?.selectedPatternId ?? "");
  const [reasoning, setReasoning] = useState(stage.latestPatternAttempt?.reasoning ?? "");
  const [signal, setSignal] = useState(stage.latestPatternAttempt?.signalIdentified ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(stage.status === "completed" || Boolean(stage.latestPatternAttempt?.reasoning));
  const target = stage.target;
  const patternOptions = stage.patternOptions ?? [];

  // Minimum 10 characters validation (trimmed)
  const trimmedReasoning = reasoning.trim();
  const isValid = trimmedReasoning.length >= 10;
  const canSubmit = isValid && !pending && !saved;

  function submit() {
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
    });
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#0c0619]/90 to-[#080414]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
      <StageCardHeader
        missionTitle={missionTitle}
        stageTitle={stage.title || "Recognize the pattern"}
        stageKind={stage.kind}
        stageIndex={stageIndex}
        totalStages={totalStages}
      />
      <div className="mb-6">
        <StageContent content={stage.content} kind={stage.kind} />
      </div>

      {target ? (
        <div className="mb-5 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-4">
          <p className="label-xs mb-1 text-cyan-300/70">Understand</p>
          <h4 className="text-sm font-semibold text-white">{target.title}</h4>
          {target.description || target.summary ? <p className="mt-2 text-sm leading-relaxed text-purple-100/65">{target.description || target.summary}</p> : null}
          {target.whenToUse ? <p className="mt-3 text-sm leading-relaxed text-purple-100/65"><span className="font-semibold text-cyan-200">When to use:</span> {target.whenToUse}</p> : null}
          {target.mentalModel ? <p className="mt-3 text-sm leading-relaxed text-purple-100/65"><span className="font-semibold text-cyan-200">Mental model:</span> {target.mentalModel}</p> : null}
          {target.signalKeywords?.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {target.signalKeywords.map((keyword) => (
                <span key={keyword} className="rounded-md border border-cyan-300/15 bg-cyan-300/[0.06] px-2 py-1 text-[10px] font-medium text-cyan-100/80">{keyword}</span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-4">
        {patternOptions.length ? (
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-purple-100/40">
              Which pattern do you think this is?
            </label>
            <select
              disabled={saved}
              value={selectedPatternId}
              onChange={(event) => setSelectedPatternId(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-[10px] border border-white/[0.08] bg-[#0c0716] px-3.5 text-sm text-white outline-none transition focus:border-purple-400/50 focus:ring-4 focus:ring-purple-400/10 disabled:opacity-60"
            >
              <option value="">Select pattern (optional)</option>
              {patternOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-purple-100/40">
              Which pattern do you think this is?
            </label>
            <input
              disabled={saved}
              value={signal}
              onChange={(event) => setSignal(event.target.value)}
              placeholder="e.g. Two Pointers, Sliding Window, Fast & Slow Pointers..."
              className="mt-1.5 h-10 w-full rounded-[10px] border border-white/[0.08] bg-white/[0.025] px-3.5 text-sm text-white outline-none placeholder:text-purple-100/35 focus:border-purple-400/50 disabled:opacity-60"
            />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-purple-100/40">
              Give your reason
            </label>
            {!saved && trimmedReasoning.length > 0 && trimmedReasoning.length < 10 ? (
              <span className="text-[11px] font-medium text-amber-300/80">
                {10 - trimmedReasoning.length} more characters needed
              </span>
            ) : null}
          </div>
          <textarea
            disabled={saved}
            value={reasoning}
            onChange={(event) => setReasoning(event.target.value)}
            placeholder="Explain the signal, constraint, or input shape that tells you which pattern to use (minimum 10 characters)..."
            className="mt-1.5 min-h-28 w-full resize-y rounded-[10px] border border-white/[0.08] bg-white/[0.025] p-3.5 text-sm text-white outline-none transition placeholder:text-purple-100/35 focus:border-purple-400/50 focus:bg-white/[0.045] focus:ring-4 focus:ring-purple-400/10 disabled:opacity-60"
          />
        </div>

        {patternOptions.length ? (
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-purple-100/40">
              Signal / Key Move (optional)
            </label>
            <input
              disabled={saved}
              value={signal}
              onChange={(event) => setSignal(event.target.value)}
              placeholder="e.g. Sorted array, window size constraint, prefix sums..."
              className="mt-1.5 h-10 w-full rounded-[10px] border border-white/[0.08] bg-white/[0.025] px-3.5 text-sm text-white outline-none placeholder:text-purple-100/35 focus:border-purple-400/50 disabled:opacity-60"
            />
          </div>
        ) : null}
      </div>

      {saved ? (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm font-medium text-emerald-300">
          <Check size={16} className="shrink-0" />
          <span>Response saved</span>
        </div>
      ) : (
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || pending}
            className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 px-6 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(168,85,247,0.20)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(168,85,247,0.32)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
          >
            {pending ? <LoaderCircle size={15} className="animate-spin" /> : <Target size={15} />}
            {pending ? "Saving..." : "Save Recognition"}
          </button>
        </div>
      )}

      {/* Contextual Inline AI Trigger */}
      <div className="mt-6">
        <InlineAIMentor
          missionId={missionId}
          missionTitle={missionTitle || "Mission"}
          topicName={topicName}
          stageTitle={stage.title || label}
          stageKind={stage.kind}
        />
      </div>
    </div>
  );
}

function PracticeStageCard({
  missionId,
  stage,
  canGoBack,
  onBack,
  onContinue,
  missionTitle,
  topicName,
  stageIndex,
  totalStages,
}: { missionId: string; stage: Stage } & StageNavProps) {
  const router = useRouter();
  const { label } = getKindMeta(stage.kind);
  const [opened, setOpened] = useState(Boolean(stage.latestPracticeEvidence));
  const [status, setStatus] = useState<"solved" | "abandoned">(
    stage.latestPracticeEvidence?.status === "abandoned" ? "abandoned" : "solved"
  );
  const [strategy, setStrategy] = useState(stage.latestPracticeEvidence?.strategy || "independent");
  const [confidence, setConfidence] = useState(stage.latestPracticeEvidence?.confidence ?? 3);
  const [difficulty, setDifficulty] = useState(stage.latestPracticeEvidence?.difficulty ?? 3);
  const [reflection, setReflection] = useState(stage.latestPracticeEvidence?.reflection ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(stage.status === "completed" || Boolean(stage.latestPracticeEvidence?.reflection));
  const target = stage.target;

  const trimmedReflection = reflection.trim();
  const isValid = trimmedReflection.length >= 10;
  const canSubmit = isValid && !pending && !saved;

  function saveAttempt() {
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
    });
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#0c0619]/90 to-[#080414]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
      <StageCardHeader
        missionTitle={missionTitle}
        stageTitle={stage.title || "Practice externally"}
        stageKind={stage.kind}
        stageIndex={stageIndex}
        totalStages={totalStages}
      />
      <div className="mb-6"><StageContent content={stage.content} kind={stage.kind} /></div>
      {target ? (
        <div className="mb-5 rounded-xl border border-purple-300/15 bg-purple-300/[0.04] p-4">
          <p className="label-xs mb-1 text-purple-300/70">{target.difficulty} · {target.patternName || "Practice problem"}</p>
          <h4 className="text-sm font-semibold text-white">{target.title}</h4>
          {target.summary ? <p className="mt-2 text-sm leading-relaxed text-purple-100/65">{target.summary}</p> : null}
          {target.sourceUrl ? (
            <a href={target.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpened(true)} className="focus-ring mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-purple-300/20 bg-purple-400/[0.07] px-4 text-xs font-semibold text-purple-200">
              Solve on {target.source === "leetcode" ? "LeetCode" : target.source === "geeksforgeeks" ? "GeeksforGeeks" : "external platform"}
              <ArrowRight size={13} />
            </a>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <select disabled={saved} value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-10 rounded-[10px] border border-white/[0.08] bg-[#0c0716] px-3.5 text-sm text-white outline-none disabled:opacity-60">
          <option value="solved">Solved externally</option>
          <option value="abandoned">Could not solve yet</option>
        </select>
        <select disabled={saved} value={strategy} onChange={(event) => setStrategy(event.target.value)} className="h-10 rounded-[10px] border border-white/[0.08] bg-[#0c0716] px-3.5 text-sm text-white outline-none disabled:opacity-60">
          <option value="independent">Independent</option>
          <option value="hint_assisted">Hint assisted</option>
          <option value="editorial_assisted">Editorial assisted</option>
          <option value="revisited">Revisited</option>
        </select>
        <select disabled={saved} value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} className="h-10 rounded-[10px] border border-white/[0.08] bg-[#0c0716] px-3.5 text-sm text-white outline-none disabled:opacity-60">
          <option value="5">Confidence - Very high</option>
          <option value="4">Confidence - High</option>
          <option value="3">Confidence - Medium</option>
          <option value="2">Confidence - Low</option>
          <option value="1">Confidence - Very low</option>
        </select>
        <select disabled={saved} value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value))} className="h-10 rounded-[10px] border border-white/[0.08] bg-[#0c0716] px-3.5 text-sm text-white outline-none disabled:opacity-60">
          <option value="5">Felt very hard</option>
          <option value="4">Felt hard</option>
          <option value="3">Felt medium</option>
          <option value="2">Felt easy</option>
          <option value="1">Felt very easy</option>
        </select>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-purple-100/40">
            Reflection
          </label>
          {!saved && trimmedReflection.length > 0 && trimmedReflection.length < 10 ? (
            <span className="text-[11px] font-medium text-amber-300/80">
              {10 - trimmedReflection.length} more characters needed
            </span>
          ) : null}
        </div>
        <textarea
          disabled={saved}
          value={reflection}
          onChange={(event) => setReflection(event.target.value)}
          placeholder="Reflect on your approach, blocker, mistake, or the key move that solved it (minimum 10 characters)..."
          className="min-h-24 w-full resize-y rounded-[10px] border border-white/[0.08] bg-white/[0.025] p-3.5 text-sm text-white outline-none transition placeholder:text-purple-100/35 focus:border-purple-400/50 focus:bg-white/[0.045] focus:ring-4 focus:ring-purple-400/10 disabled:opacity-60"
        />
      </div>
      {saved ? (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm font-medium text-emerald-300">
          <Check size={16} className="shrink-0" />
          <span>Response saved</span>
        </div>
      ) : (
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={saveAttempt}
            disabled={!canSubmit || pending}
            className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 px-6 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(168,85,247,0.20)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(168,85,247,0.32)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
          >
            {pending ? <LoaderCircle size={15} className="animate-spin" /> : <Code2 size={15} />}
            {pending ? "Saving..." : "Save Practice Evidence"}
          </button>
        </div>
      )}

      {/* Contextual Inline AI Trigger */}
      <div className="mt-6">
        <InlineAIMentor
          missionId={missionId}
          missionTitle={missionTitle || "Mission"}
          topicName={topicName}
          stageTitle={stage.title || label}
          stageKind={stage.kind}
        />
      </div>
    </div>
  );
}

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

function MasteryStageCard({
  missionId,
  stage,
  canGoBack,
  onBack,
  onContinue,
  missionTitle,
  topicName,
  stageIndex,
  totalStages,
}: { missionId: string; stage: Stage } & StageNavProps) {
  const { label } = getKindMeta(stage.kind);
  const initialMastery = parseMasteryEvidence(stage.latestMasteryEvidence?.content ?? "");
  const [conceptRecall, setConceptRecall] = useState(initialMastery.conceptRecall);
  const [patternUnderstanding, setPatternUnderstanding] = useState(initialMastery.patternUnderstanding);
  const [approach, setApproach] = useState(initialMastery.approach);
  const [complexity, setComplexity] = useState(initialMastery.complexity);
  const [edgeCases, setEdgeCases] = useState(initialMastery.edgeCases);
  const [confidence, setConfidence] = useState(stage.latestMasteryEvidence?.selfRating ?? 3);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(stage.status === "completed" || Boolean(stage.latestMasteryEvidence));
  const [qualityScore, setQualityScore] = useState(stage.latestMasteryEvidence?.qualityScore ?? null);
  const ready = conceptRecall.trim().length >= 20 && patternUnderstanding.trim().length >= 20 && approach.trim().length >= 20 && complexity.trim().length >= 10 && edgeCases.trim().length >= 10;

  function saveMasteryEvidence() {
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
      onContinue?.(stage.key);
    });
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#0c0619]/90 to-[#080414]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
      <StageCardHeader
        missionTitle={missionTitle}
        stageTitle={stage.title || "Prove mastery"}
        stageKind={stage.kind}
        stageIndex={stageIndex}
        totalStages={totalStages}
      />
      <div className="mb-6"><StageContent content={stage.content} kind={stage.kind} /></div>
      <div className="space-y-3">
        <textarea disabled={saved} value={conceptRecall} onChange={(event) => setConceptRecall(event.target.value)} placeholder="Concept recall" className="min-h-20 w-full resize-y rounded-[10px] border border-white/[0.08] bg-white/[0.025] p-3.5 text-sm text-white outline-none transition placeholder:text-purple-100/35 focus:border-purple-400/50 focus:bg-white/[0.045] focus:ring-4 focus:ring-purple-400/10 disabled:opacity-60" />
        <textarea disabled={saved} value={patternUnderstanding} onChange={(event) => setPatternUnderstanding(event.target.value)} placeholder="Pattern understanding" className="min-h-20 w-full resize-y rounded-[10px] border border-white/[0.08] bg-white/[0.025] p-3.5 text-sm text-white outline-none transition placeholder:text-purple-100/35 focus:border-purple-400/50 focus:bg-white/[0.045] focus:ring-4 focus:ring-purple-400/10 disabled:opacity-60" />
        <textarea disabled={saved} value={approach} onChange={(event) => setApproach(event.target.value)} placeholder="Approach" className="min-h-20 w-full resize-y rounded-[10px] border border-white/[0.08] bg-white/[0.025] p-3.5 text-sm text-white outline-none transition placeholder:text-purple-100/35 focus:border-purple-400/50 focus:bg-white/[0.045] focus:ring-4 focus:ring-purple-400/10 disabled:opacity-60" />
        <textarea disabled={saved} value={complexity} onChange={(event) => setComplexity(event.target.value)} placeholder="Time and space complexity" className="min-h-16 w-full resize-y rounded-[10px] border border-white/[0.08] bg-white/[0.025] p-3.5 text-sm text-white outline-none transition placeholder:text-purple-100/35 focus:border-purple-400/50 focus:bg-white/[0.045] focus:ring-4 focus:ring-purple-400/10 disabled:opacity-60" />
        <textarea disabled={saved} value={edgeCases} onChange={(event) => setEdgeCases(event.target.value)} placeholder="Edge cases" className="min-h-16 w-full resize-y rounded-[10px] border border-white/[0.08] bg-white/[0.025] p-3.5 text-sm text-white outline-none transition placeholder:text-purple-100/35 focus:border-purple-400/50 focus:bg-white/[0.045] focus:ring-4 focus:ring-purple-400/10 disabled:opacity-60" />
        <div className="flex flex-wrap items-center gap-3">
          <select disabled={saved} value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} className="h-10 rounded-[10px] border border-white/[0.08] bg-[#0c0716] px-3.5 text-sm text-white outline-none disabled:opacity-60">
            <option value="5">Interview-ready explanation</option>
            <option value="4">Strong explanation</option>
            <option value="3">Partial explanation</option>
            <option value="2">Still shaky</option>
            <option value="1">Need to relearn</option>
          </select>
          <span className="text-xs text-purple-100/35">{ready ? "Ready to evaluate" : "Complete each mastery prompt"}</span>
        </div>
      </div>
      {saved ? (
        <p className="mt-4 text-sm font-medium text-emerald-300">
          Mastery evidence saved{qualityScore !== null ? ` (${qualityScore}%)` : ""}.
        </p>
      ) : (
        <div className="mt-5 flex justify-end">
          <button
            onClick={saveMasteryEvidence}
            disabled={!ready || pending}
            className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl border border-fuchsia-300/20 bg-fuchsia-400/[0.08] px-5 text-sm font-semibold text-purple-100 transition hover:bg-fuchsia-400/[0.14] disabled:opacity-50"
          >
            {pending ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}
            Save Mastery Evidence
          </button>
        </div>
      )}

      {/* Contextual Inline AI Trigger */}
      <div className="mt-6">
        <InlineAIMentor
          missionId={missionId}
          missionTitle={missionTitle || "Mission"}
          topicName={topicName}
          stageTitle={stage.title || label}
          stageKind={stage.kind}
        />
      </div>
    </div>
  );
}

/* ─── Reflection stage card ───────────────────────────── */
function ReflectionStageCard({
  missionId,
  stage,
  canGoBack,
  onBack,
  onContinue,
  missionTitle,
  topicName,
  stageIndex,
  totalStages,
}: {
  missionId: string;
  stage: Stage;
} & StageNavProps) {
  const { label } = getKindMeta(stage.kind);
  const explicitPrompt = (stage as any).reflectionPrompt || (stage as any).prompt;
  const isHtmlContent = Boolean(stage.content && /<[a-z][\s\S]*>/i.test(stage.content));
  const prompt =
    explicitPrompt && explicitPrompt.trim() !== ""
      ? explicitPrompt
      : stage.content && !isHtmlContent && stage.content.length < 250
      ? stage.content
      : "What was the key insight from this mission? What confused you? What would you do differently next time?";

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#0c0619]/90 to-[#080414]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
      <StageCardHeader
        missionTitle={missionTitle}
        stageTitle={stage.title && stage.title.trim() !== "" ? stage.title : "Capture Your Learning"}
        stageKind={stage.kind}
        stageIndex={stageIndex}
        totalStages={totalStages}
      />

      {/* Prompt */}
      <div className="mb-6 rounded-xl border border-(--accent-lime)/20 bg-(--accent-lime)/[0.05] px-5 py-4">
        <p className="text-sm leading-relaxed text-(--text-secondary)">{prompt}</p>
      </div>

      {/* Reflection form — wired to mission entityType */}
      <div className="mb-8">
        <ReflectionForm entityType="mission" entityId={missionId} />
      </div>

      {/* Contextual Inline AI Trigger */}
      <div className="mb-6">
        <InlineAIMentor
          missionId={missionId}
          missionTitle={missionTitle || "Mission"}
          topicName={topicName}
          stageTitle={stage.title || label}
          stageKind={stage.kind}
        />
      </div>
    </div>
  );
}

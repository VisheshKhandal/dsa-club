"use client";

import React, { useMemo, useState } from "react";
import {
  Compass,
  Lightbulb,
  Clock,
  Database,
  Zap,
  ChevronDown,
  ChevronUp,
  Play,
  Check,
  Sparkles,
} from "lucide-react";
import { decodeHtmlEntities, unescapeHtmlIfNeeded } from "@/components/learning/content-normalizer";
import { CodeIllustration } from "@/components/learning/code-illustration";
import { cn } from "@/lib/utils";

export interface ThinkingDirectionViewProps {
  content?: string | null;
  dryRunPrompt?: string | null;
  learningGoal?: string | null;
  className?: string;
}

interface StepItem {
  number: number;
  title: string;
  body: string;
  subSteps?: string[];
  isComplexity?: boolean;
  timeComplexity?: string;
  spaceComplexity?: string;
  codeSnippet?: string;
}

interface DryRunStep {
  step: number;
  text: string;
}

/**
 * Common code tokens to recognize as inline code when not in backticks
 */
const INLINE_CODE_PATTERNS = [
  /(?:\bleft\+\+|\bright--|\+\+left\b|--right\b)/g,
  /\b(?:nums\[i\]|nums\[j\]|s\[left\]|s\[right\]|s\[i\]|arr\[i\]|matrix\[r\]\[c\])/g,
  /(?:left\s*<\s*right|left\s*<=\s*right|i\s*<\s*n|start\s*<\s*end)/g,
  /\b(?:target\s*-\s*nums\[i\]|target\s*-\s*x)/g,
  /\b(?:if\s*\(!root\)\s*return[^\.;,\n]*)/g,
  /\b(?:nullptr|NULL|None|true|false|True|False)\b/g,
  /\b(?:left|right|mid|root|head|curr|prev|slow|fast)\b(?=\s*(?:pointer|index|boundary|\+\+|--|==|!=|<|>))/gi,
];

/**
 * Parses and renders inline code expressions and complexity tokens
 */
function renderInlineContent(text: string): React.ReactNode[] {
  if (!text) return [];

  const segments = text.split(/(`[^`]+`)/g);

  return segments.flatMap((segment, segIdx) => {
    if (segment.startsWith("`") && segment.endsWith("`")) {
      const code = segment.slice(1, -1);
      return (
        <code
          key={`bt-${segIdx}`}
          className="font-mono text-[12px] bg-purple-500/15 text-purple-200 border border-purple-400/25 px-1.5 py-0.5 rounded font-medium inline-block my-0.5"
        >
          {code}
        </code>
      );
    }

    const complexityRegex = /\b(O\((?:1|N|N\s*\^?\s*2|N\s*log\s*N|log\s*N|2\^N|N!|V\s*\+\s*E)\))/gi;
    const compParts = segment.split(complexityRegex);

    return compParts.map((part, partIdx) => {
      if (complexityRegex.test(part)) {
        return (
          <span
            key={`comp-${segIdx}-${partIdx}`}
            className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-200 border border-violet-400/30"
          >
            <Zap size={10} className="text-violet-300" />
            {part}
          </span>
        );
      }

      let processed = part;
      INLINE_CODE_PATTERNS.forEach((regex) => {
        processed = processed.replace(regex, (match) => `\u0000${match}\u0001`);
      });

      if (processed.includes("\u0000")) {
        const subParts = processed.split(/(\u0000[^\u0001]+\u0001)/g);
        return subParts.map((sub, subIdx) => {
          if (sub.startsWith("\u0000") && sub.endsWith("\u0001")) {
            const code = sub.slice(1, -1);
            return (
              <code
                key={`tok-${segIdx}-${partIdx}-${subIdx}`}
                className="font-mono text-[12px] bg-purple-500/15 text-purple-200 border border-purple-400/25 px-1.5 py-0.5 rounded font-medium inline-block my-0.5"
              >
                {code}
              </code>
            );
          }
          return <React.Fragment key={`txt-${segIdx}-${partIdx}-${subIdx}`}>{sub}</React.Fragment>;
        });
      }

      return <React.Fragment key={`p-${segIdx}-${partIdx}`}>{part}</React.Fragment>;
    });
  });
}

/**
 * Parses sub-steps inside complex algorithm descriptions
 */
function splitSubSteps(body: string): string[] {
  // If the body contains algorithmic conditions (While, If, Compare)
  if (/(?:While|If|Compare)\s+/i.test(body) && body.includes(". ")) {
    const sentences = body
      .split(/(?<=\.)\s+(?=[A-Z]|While|If|Compare)/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);
    if (sentences.length >= 2) return sentences;
  }
  return [];
}

/**
 * Extracts structured steps from the raw thinking direction text
 * Supports both newline-delimited AND inline-numbered strings (e.g. "1. Understand: ... 2. Filter: ...")
 */
function parseThinkingDirection(rawText: string): StepItem[] {
  const cleaned = decodeHtmlEntities(unescapeHtmlIfNeeded(rawText)).trim();
  if (!cleaned) return [];

  // Match numbered steps whether separated by newlines OR spaces (like in MongoDB)
  const stepRegex = /(?:^|\s+)(\d+)[\.\)]\s*([A-Za-z0-9\s\(\)\/&-]+?)(?::|\s+-\s+)([\s\S]*?)(?=(?:\s+\d+[\.\)]\s*[A-Za-z0-9\s\(\)\/&-]+?(?::|\s+-\s+)|\s*$))/g;
  const matches = Array.from(cleaned.matchAll(stepRegex));

  if (matches.length >= 2) {
    const seenNumbers = new Set<number>();
    return matches.map((match, idx) => {
      let num = parseInt(match[1], 10);
      if (isNaN(num) || num <= 0 || seenNumbers.has(num)) {
        num = idx + 1;
      }
      seenNumbers.add(num);
      const title = match[2].trim();
      const body = match[3].trim();

      const isComplexity = /complexity/i.test(title) || /time\s*:/i.test(body);
      const timeMatch = body.match(/time(?:\s*complexity)?\s*:\s*(O\([^\)]+\))/i);
      const spaceMatch = body.match(/space(?:\s*complexity)?\s*:\s*(O\([^\)]+\))/i);

      let codeSnippet: string | undefined;
      const codeBlockMatch = body.match(/```(?:\w+)?\n([\s\S]*?)```/);
      if (codeBlockMatch) {
        codeSnippet = codeBlockMatch[1].trim();
      }

      const subSteps = !isComplexity && !codeSnippet ? splitSubSteps(body) : [];

      return {
        number: num,
        title,
        body: codeBlockMatch ? body.replace(codeBlockMatch[0], "").trim() : body,
        subSteps,
        isComplexity,
        timeComplexity: timeMatch ? timeMatch[1] : undefined,
        spaceComplexity: spaceMatch ? spaceMatch[1] : undefined,
        codeSnippet,
      };
    });
  }

  // Fallback: Paragraph splitting
  const paragraphs = cleaned
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length >= 2) {
    return paragraphs.map((para, idx) => {
      const colonMatch = para.match(/^([A-Za-z\s]{3,24}):\s*([\s\S]+)$/);
      if (colonMatch) {
        return {
          number: idx + 1,
          title: colonMatch[1].trim(),
          body: colonMatch[2].trim(),
        };
      }
      return {
        number: idx + 1,
        title: idx === 0 ? "Initial Intuition" : idx === 1 ? "Structural Invariant" : `Observation ${idx + 1}`,
        body: para,
      };
    });
  }

  return [
    {
      number: 1,
      title: "Core Invariant & Strategy",
      body: cleaned,
    },
  ];
}

/**
 * Parses dry run prompt into step-by-step trace
 */
function parseDryRunSteps(text: string): { intro: string; steps: DryRunStep[] } | null {
  if (!text) return null;
  const cleaned = decodeHtmlEntities(unescapeHtmlIfNeeded(text)).trim();

  // Mode A: Explicit "Step X:" or "Step X." (e.g. "Step 1: pA=1, pB=6. Step 2: pA=8...")
  if (/step\s+\d+[:\.]/i.test(cleaned)) {
    const introMatch = cleaned.match(/^(.*?)(?=\s*step\s+1[:\.])/i);
    const intro = introMatch ? introMatch[1].trim() : "";
    const stepRegex = /(?:^|\s+)step\s+(\d+)[:\.]\s*([\s\S]*?)(?=(?:\s+step\s+\d+[:\.]|\s*$))/gi;
    const rawSteps = Array.from(cleaned.matchAll(stepRegex)).map((m, idx) => ({
      step: parseInt(m[1], 10) || idx + 1,
      text: m[2].trim(),
    }));
    if (rawSteps.length >= 2) return { intro, steps: rawSteps };
  }

  // Mode B: "Level X:" (e.g. "Level 0: size=1...")
  if (/level\s+\d+[:\.]/i.test(cleaned)) {
    const introMatch = cleaned.match(/^(.*?)(?=\s*level\s+\d+[:\.])/i);
    const intro = introMatch ? introMatch[1].trim() : "";
    const stepRegex = /(?:^|\s+)level\s+(\d+)[:\.]\s*([\s\S]*?)(?=(?:\s+level\s+\d+[:\.]|\s*$))/gi;
    const rawSteps = Array.from(cleaned.matchAll(stepRegex)).map((m, idx) => ({
      step: parseInt(m[1], 10) || idx + 1,
      text: m[2].trim(),
    }));
    if (rawSteps.length >= 2) return { intro, steps: rawSteps };
  }

  // Mode C: Numbered list "1. ..." or "1) ..."
  const introMatch = cleaned.match(/^(.*?)(?=(?:^|\s+)1[\.\)]\s+)/);
  const intro = introMatch ? introMatch[1].trim() : "";
  const stepRegex = /(?:^|\s+)(\d+)[\.\)]\s+([A-Za-z0-9\$\+\-\'\"\`\(][\s\S]*?)(?=(?:\s+\d+[\.\)]\s+[A-Za-z0-9\$\+\-\'\"\`\(]|\s*$))/g;
  const rawSteps = Array.from(cleaned.matchAll(stepRegex)).map((m, idx) => ({
    step: parseInt(m[1], 10) || idx + 1,
    text: m[2].trim(),
  }));

  if (rawSteps.length >= 2 && rawSteps.some((s) => s.step === 1)) {
    return { intro, steps: rawSteps };
  }
  return null;
}

export function ThinkingDirectionView({
  content,
  dryRunPrompt,
  learningGoal,
  className,
}: ThinkingDirectionViewProps) {
  const steps = useMemo(() => {
    const raw = content || learningGoal || "Analyze the problem structure, constraints, and relationships before picking data structures.";
    return parseThinkingDirection(raw);
  }, [content, learningGoal]);

  const dryRunData = useMemo(() => {
    if (!dryRunPrompt) return null;
    return parseDryRunSteps(dryRunPrompt);
  }, [dryRunPrompt]);

  const [isDryRunExpanded, setIsDryRunExpanded] = useState(false);

  return (
    <section className={cn("space-y-6", className)}>
      {/* ── Section Title (Open Region) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-purple-500/15 border border-purple-400/30 text-purple-300">
            <Compass size={17} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>Thinking Direction</span>
              <span className="text-xs font-normal text-purple-300/60 font-mono">
                ({steps.length} {steps.length === 1 ? "step" : "reasoning steps"})
              </span>
            </h2>
            <p className="text-xs text-purple-200/60 mt-0.5">
              Structural thought progression from brute-force observation to optimal invariant.
            </p>
          </div>
        </div>
      </div>

      {/* ── Structured Reasoning Roadmap (Open Timeline Layout) ── */}
      <div className="relative space-y-6 pl-2">
        {/* Continuous vertical connector */}
        {steps.length > 1 && (
          <div
            className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-purple-500/40 via-violet-500/20 to-transparent"
            aria-hidden="true"
          />
        )}

        {steps.map((step, index) => (
          <div key={`step-${step.number}-${index}`} className="relative flex items-start gap-4 group">
            {/* Step Number Circle */}
            <div className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full bg-[#0e071c] border-2 border-purple-400/40 text-purple-200 shadow-sm transition group-hover:border-purple-300 group-hover:scale-105">
              <span className="font-mono text-xs font-bold">{step.number}</span>
            </div>

            {/* Step Content */}
            <div className="min-w-0 flex-1 space-y-2 pt-0.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {step.title}
                </h3>

                {/* Complexity Presentation */}
                {(step.timeComplexity || step.spaceComplexity) && (
                  <div className="flex items-center gap-2">
                    {step.timeComplexity && (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">
                        <Clock size={11} />
                        Time: {step.timeComplexity}
                      </span>
                    )}
                    {step.spaceComplexity && (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/30 text-cyan-300">
                        <Database size={11} />
                        Space: {step.spaceComplexity}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Sub-steps breakdown when available */}
              {step.subSteps && step.subSteps.length > 0 ? (
                <ul className="space-y-1.5 pl-2 border-l-2 border-purple-400/20 my-2">
                  {step.subSteps.map((sub, sIdx) => (
                    <li key={sIdx} className="text-xs sm:text-[13px] leading-relaxed text-purple-100/85">
                      <span className="text-purple-400 font-bold mr-1.5">•</span>
                      {renderInlineContent(sub)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs sm:text-[13px] leading-relaxed text-purple-100/80 font-normal">
                  {renderInlineContent(step.body)}
                </p>
              )}

              {/* Multi-line code block if embedded */}
              {step.codeSnippet && (
                <div className="mt-3">
                  <CodeIllustration
                    code={step.codeSnippet}
                    showLineNumbers={false}
                    className="border-purple-400/20"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Visual Dry Run Walkthrough (If Available) ── */}
      {dryRunData && (
        <div className="rounded-2xl border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/[0.04] to-purple-950/[0.1] p-4 sm:p-5 space-y-3">
          <button
            type="button"
            onClick={() => setIsDryRunExpanded(!isDryRunExpanded)}
            className="w-full flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-lg bg-fuchsia-400/15 text-fuchsia-300 border border-fuchsia-400/25">
                <Play size={13} />
              </span>
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-fuchsia-200 transition">
                  Dry Run Trace & Pointer Walkthrough
                </h4>
                <p className="text-[11px] text-purple-200/60">
                  {dryRunData.intro || "Step-by-step pointer trace across an actual example"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs text-fuchsia-300 font-medium">
              <span>{isDryRunExpanded ? "Hide Trace" : `View Trace (${dryRunData.steps.length} steps)`}</span>
              {isDryRunExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </button>

          {isDryRunExpanded && (
            <div className="pt-3 border-t border-fuchsia-400/15 space-y-2.5">
              {dryRunData.steps.map((s, idx) => (
                <div
                  key={`dry-run-step-${s.step}-${idx}`}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs text-purple-100/90 leading-relaxed font-mono"
                >
                  <span className="font-bold text-fuchsia-300 shrink-0">Step {s.step}:</span>
                  <div className="flex-1 font-sans text-xs">
                    {renderInlineContent(s.text)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Mentor Guidance Tip ── */}
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-500/[0.03] p-3 text-xs text-amber-200/90 leading-relaxed">
        <Lightbulb size={14} className="text-amber-300 shrink-0 mt-0.5" />
        <p>
          <strong className="text-amber-200 font-semibold">Invariant Tip:</strong> Before looking at solutions or code, predict which algorithmic pattern maintains this invariant in the checkpoint below.
        </p>
      </div>
    </section>
  );
}

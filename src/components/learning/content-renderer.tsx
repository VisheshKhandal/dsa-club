"use client";

import React, { useMemo } from "react";
import { unescapeHtmlIfNeeded, detectContentFormat, decodeHtmlEntities } from "./content-normalizer";
import { SafeHtmlParser } from "./safe-html-parser";
import { CodeIllustration } from "./code-illustration";
import { TreeVisualization } from "./tree-visualization";
import {
  KeyInsight,
  ThinkCheckpoint,
  ExampleBlock,
  WarningCallout,
  KeyTakeaways,
  MentalModelCallout,
} from "./content-blocks";
import { DryRunStepper } from "./dry-run-stepper";
import { parseDryRunFromText } from "./ast-semantic-transformer";
import { cn } from "@/lib/utils";

export interface ContentRendererProps {
  content?: string | null;
  kind?: string;
  stageTitle?: string;
  className?: string;
}

/**
 * Pure Markdown Fallback Parser for purely markdown-authored stages
 */
function MarkdownBlockRenderer({ markdown, stageTitle }: { markdown: string; stageTitle?: string }) {
  const parts = markdown.split(/(```[\w]*[\s\S]*?```)/g);

  return (
    <div className="space-y-4 text-[15px] sm:text-[16px] leading-[1.8] text-(--color-text-secondary)">
      {parts.map((chunk, i) => {
        const trimmed = chunk.trim();
        if (!trimmed) return null;

        // Fenced Code / Diagram Block
        if (trimmed.startsWith("```")) {
          const matchLang = trimmed.match(/^```(\w+)/);
          const lang = (matchLang ? matchLang[1] : "cpp").toLowerCase();
          const rawCode = trimmed.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "");

          if (lang === "tree" || lang === "diagram") {
            return (
              <TreeVisualization
                key={i}
                treeData={rawCode}
                title={`${stageTitle || "Stage"} · Tree Structure`}
              />
            );
          }

          return (
            <CodeIllustration
              key={i}
              code={rawCode}
              language={lang}
              className="my-5"
            />
          );
        }

        // Paragraphs & Callout parser
        const paragraphs = trimmed.split(/\n\n+/);

        return (
          <React.Fragment key={i}>
            {paragraphs.map((para, pIdx) => {
              const pTrimmed = para.trim();
              if (!pTrimmed) return null;

              // Mental Model
              if (
                pTrimmed.toLowerCase().startsWith("model 1:") ||
                pTrimmed.toLowerCase().startsWith("model 2:") ||
                pTrimmed.toLowerCase().startsWith("model 3:") ||
                pTrimmed.toLowerCase().startsWith("decision framework:")
              ) {
                const title = pTrimmed.split(":")[0]?.trim() || "Mental Model";
                const content = pTrimmed.replace(/^[^:]+:\s*/, "");
                return <MentalModelCallout key={pIdx} title={title}>{content}</MentalModelCallout>;
              }

              // Dry Run Trace
              const dryRun = parseDryRunFromText(pTrimmed);
              if (dryRun) {
                return <DryRunStepper key={pIdx} data={dryRun} />;
              }

              // Key Insight
              if (
                pTrimmed.startsWith("> [!KEY INSIGHT]") ||
                pTrimmed.startsWith("┃ KEY INSIGHT") ||
                pTrimmed.toLowerCase().startsWith("key insight:")
              ) {
                const text = pTrimmed
                  .replace(/^>\s*\[!KEY INSIGHT\]\s*/i, "")
                  .replace(/^┃\s*KEY INSIGHT\s*/i, "")
                  .replace(/^key insight:\s*/i, "")
                  .replace(/^>\s*/gm, "")
                  .trim();
                return <KeyInsight key={pIdx}>{text}</KeyInsight>;
              }

              // Think Checkpoint
              if (
                pTrimmed.startsWith("> [!THINK]") ||
                pTrimmed.toLowerCase().startsWith("think checkpoint:") ||
                pTrimmed.toLowerCase().startsWith("think about this:")
              ) {
                const cleaned = pTrimmed
                  .replace(/^>\s*\[!THINK\]\s*/i, "")
                  .replace(/^think (?:checkpoint|about this):\s*/i, "")
                  .replace(/^>\s*/gm, "")
                  .trim();
                const [question, ...expParts] = cleaned.split(/\n(?=(?:Explanation|Answer|Intuition):)/i);
                const explanation = expParts.join("\n").replace(/^(?:Explanation|Answer|Intuition):\s*/i, "").trim() ||
                  "Think through the invariants, constraints, and base cases of the current problem.";

                return (
                  <ThinkCheckpoint
                    key={pIdx}
                    question={question}
                    explanation={explanation}
                  />
                );
              }

              // Warning / Common Mistake
              if (
                pTrimmed.startsWith("> [!WARNING]") ||
                pTrimmed.toLowerCase().startsWith("common mistake:") ||
                pTrimmed.toLowerCase().startsWith("pitfall:")
              ) {
                const text = pTrimmed
                  .replace(/^>\s*\[!WARNING\]\s*/i, "")
                  .replace(/^(?:common mistake|pitfall):\s*/i, "")
                  .replace(/^>\s*/gm, "")
                  .trim();
                return <WarningCallout key={pIdx}>{text}</WarningCallout>;
              }

              // Key Takeaways
              if (
                pTrimmed.toLowerCase().startsWith("key takeaways:") ||
                pTrimmed.toLowerCase().startsWith("summary:")
              ) {
                const lines = pTrimmed
                  .replace(/^(?:key takeaways|summary):\s*/i, "")
                  .split("\n")
                  .map((l) => l.replace(/^[-*•]\s*/, "").trim())
                  .filter(Boolean);

                return <KeyTakeaways key={pIdx} items={lines} />;
              }

              // Headings
              if (pTrimmed.startsWith("### ")) {
                return (
                  <h3 key={pIdx} className="text-lg sm:text-xl font-bold tracking-tight text-(--color-text-primary) pt-5 pb-1">
                    {pTrimmed.replace(/^###\s+/, "")}
                  </h3>
                );
              }
              if (pTrimmed.startsWith("## ")) {
                return (
                  <h2 key={pIdx} className="text-xl sm:text-2xl font-bold tracking-tight text-(--color-text-primary) pt-6 pb-2 border-b border-(--color-border)">
                    {pTrimmed.replace(/^##\s+/, "")}
                  </h2>
                );
              }
              if (pTrimmed.startsWith("# ")) {
                return (
                  <h1 key={pIdx} className="text-2xl sm:text-3xl font-black tracking-tight text-(--color-text-primary) pt-6 pb-2">
                    {pTrimmed.replace(/^#\s+/, "")}
                  </h1>
                );
              }

              // Standard Paragraph
              return (
                <p key={pIdx} className="leading-[1.8] mb-4">
                  {decodeHtmlEntities(pTrimmed)}
                </p>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Unified, safe ContentRenderer component for the Mission Guided Reader.
 * Inspects content format, unescapes double-encoded markup, and renders semantic blocks.
 * GUARANTEES zero raw HTML tags or literal entity strings are exposed to the learner.
 */
export function ContentRenderer({ content, kind, stageTitle, className }: ContentRendererProps) {
  // 1. Unescape double-encoded markup and normalize
  const normalized = useMemo(() => (content ? unescapeHtmlIfNeeded(content) : ""), [content]);

  // 2. Resolve content format
  const format = useMemo(() => (normalized ? detectContentFormat(normalized) : "empty"), [normalized]);

  if (!content || content.trim() === "") {
    return (
      <div className="py-12 text-center text-sm text-(--color-text-muted)">
        <p>No written guide available for this stage yet.</p>
      </div>
    );
  }

  return (
    <div className={cn("content-renderer w-full", className)}>
      {format === "html" || format === "mixed" ? (
        <SafeHtmlParser html={normalized} stageTitle={stageTitle} />
      ) : (
        <MarkdownBlockRenderer markdown={normalized} stageTitle={stageTitle} />
      )}
    </div>
  );
}

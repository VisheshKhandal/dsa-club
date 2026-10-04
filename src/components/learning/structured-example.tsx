"use client";

import React from "react";
import { BookOpen, ArrowRight, Lightbulb, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StructuredExampleProps {
  title?: string;
  problemStatement?: string;
  input?: string;
  output?: string;
  explanation?: string | React.ReactNode;
  codeSnippet?: string;
  codeLanguage?: string;
  className?: string;
}

export function StructuredExample({
  title = "Worked Example",
  problemStatement,
  input,
  output,
  explanation,
  codeSnippet,
  codeLanguage = "cpp",
  className,
}: StructuredExampleProps) {
  return (
    <section
      className={cn(
        "my-6 overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) shadow-sm",
        className
      )}
      aria-label={title}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-(--color-border) bg-(--color-surface-2)/40 px-4 py-2.5 text-xs font-semibold text-(--color-text-primary)">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-purple-400" />
          <span className="uppercase tracking-wider text-[11px] font-bold text-purple-300">
            {title}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Problem Statement */}
        {problemStatement && (
          <div className="text-sm sm:text-base leading-relaxed text-(--color-text-primary) font-medium">
            {problemStatement}
          </div>
        )}

        {/* Input & Output Grid */}
        {(input || output) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {input && (
              <div className="rounded-lg border border-(--color-border) bg-(--color-surface-2)/50 p-3 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                  Input
                </span>
                <div className="font-mono text-xs sm:text-sm text-(--color-text-primary) break-all">
                  {input}
                </div>
              </div>
            )}

            {output && (
              <div className="rounded-lg border border-(--color-border) bg-(--color-surface-2)/50 p-3 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Expected Output
                </span>
                <div className="font-mono text-xs sm:text-sm text-emerald-300 font-bold break-all">
                  {output}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Explanation / Why it works */}
        {explanation && (
          <div className="rounded-lg border border-purple-500/20 bg-purple-500/[0.04] p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-300">
              <Lightbulb size={13} className="text-purple-400" />
              <span>Why It Works</span>
            </div>
            <div className="text-sm leading-relaxed text-(--color-text-secondary)">
              {explanation}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

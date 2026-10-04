"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/* ─── 0. Mental Model Callout (Conceptual Highlight) ───────── */
export interface MentalModelCalloutProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function MentalModelCallout({
  children,
  title = "Mental Model",
  className,
}: MentalModelCalloutProps) {
  return (
    <aside
      aria-label={title}
      className={cn(
        "my-6 rounded-r-(--radius-card) border-l-3 border-cyan-400 bg-cyan-500/[0.07] py-3.5 pl-4 sm:pl-5 pr-4 text-(--color-text-primary)",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1.5">
        <Sparkles size={14} className="shrink-0 text-cyan-400" />
        <span>{title}</span>
      </div>
      <div className="text-sm sm:text-[15px] font-medium leading-relaxed text-(--color-text-primary)/95">
        {children}
      </div>
    </aside>
  );
}

/* ─── 1. Key Insight Block ─────────────────────────────────── */
export interface KeyInsightProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function KeyInsight({
  children,
  title = "Key Insight",
  className,
}: KeyInsightProps) {
  return (
    <aside
      aria-label={title}
      className={cn(
        "my-6 rounded-r-(--radius-card) border-l-3 border-(--color-purple) bg-(--color-purple-subtle)/30 py-3.5 pl-4 sm:pl-5 pr-4 text-(--color-text-primary)",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-(--color-purple) mb-1.5">
        <Lightbulb size={14} className="shrink-0 text-(--color-purple)" />
        <span>{title}</span>
      </div>
      <div className="text-sm sm:text-[15px] font-medium leading-relaxed text-(--color-text-primary)/95">
        {children}
      </div>
    </aside>
  );
}

/* ─── 2. Think Checkpoint (Interactive Question + Reveal) ──── */
export interface ThinkCheckpointProps {
  question: React.ReactNode;
  explanation: React.ReactNode;
  title?: string;
  className?: string;
  defaultOpen?: boolean;
}

export function ThinkCheckpoint({
  question,
  explanation,
  title = "Think About This",
  className,
  defaultOpen = false,
}: ThinkCheckpointProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        "my-6 overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) shadow-sm transition-colors",
        isOpen && "border-(--color-purple)/40 bg-(--color-surface-1)",
        className
      )}
    >
      {/* Header / Question Area */}
      <div className="p-4 sm:p-5 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400">
          <HelpCircle size={14} className="shrink-0" />
          <span>{title}</span>
        </div>

        <div className="text-sm sm:text-base font-semibold leading-relaxed text-(--color-text-primary)">
          {question}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            className="focus-ring inline-flex items-center gap-2 rounded-(--radius-btn) border border-(--color-border) bg-(--color-surface-2) px-3 py-1.5 text-xs font-semibold text-(--color-text-primary) hover:bg-(--color-surface-3) transition-colors"
          >
            <span>{isOpen ? "Hide Explanation" : "Reveal Explanation"}</span>
            <motion.span
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.18 }}
            >
              <ChevronDown size={14} />
            </motion.span>
          </button>
        </div>
      </div>

      {/* Collapsible Explanation Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden border-t border-(--color-border) bg-(--color-surface-2)/40"
          >
            <div className="p-4 sm:p-5 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                <Sparkles size={13} className="shrink-0" />
                <span>Explanation & Intuition</span>
              </div>
              <div className="text-sm sm:text-[15px] leading-relaxed text-(--color-text-secondary)">
                {explanation}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── 3. Structured Example Block ──────────────────────────── */
export interface ExampleBlockProps {
  title?: string;
  input?: string;
  output?: string;
  explanation?: React.ReactNode;
  className?: string;
}

export function ExampleBlock({
  title = "Example",
  input,
  output,
  explanation,
  className,
}: ExampleBlockProps) {
  return (
    <div
      className={cn(
        "my-6 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) p-4 sm:p-5 space-y-3",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-(--color-border) pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-(--color-text-muted)">
          {title}
        </span>
      </div>

      <div className="space-y-2 text-xs sm:text-sm font-mono">
        {input && (
          <div className="rounded-md bg-(--color-surface-2) p-2.5">
            <span className="font-bold text-(--color-text-muted) select-none">Input: </span>
            <span className="text-cyan-200">{input}</span>
          </div>
        )}

        {output && (
          <div className="rounded-md bg-(--color-surface-2) p-2.5">
            <span className="font-bold text-(--color-text-muted) select-none">Output: </span>
            <span className="text-emerald-300 font-semibold">{output}</span>
          </div>
        )}
      </div>

      {explanation && (
        <div className="pt-1 text-xs sm:text-sm leading-relaxed text-(--color-text-secondary) font-sans">
          <strong className="font-semibold text-(--color-text-primary)">Why: </strong>
          {explanation}
        </div>
      )}
    </div>
  );
}

/* ─── 4. Warning / Common Mistake Callout ──────────────────── */
export interface WarningCalloutProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function WarningCallout({
  children,
  title = "Common Mistake",
  className,
}: WarningCalloutProps) {
  return (
    <aside
      aria-label={title}
      className={cn(
        "my-6 rounded-r-(--radius-card) border-l-3 border-amber-400 bg-amber-500/[0.08] py-3.5 pl-4 sm:pl-5 pr-4 text-(--color-text-primary)",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1.5">
        <AlertTriangle size={14} className="shrink-0" />
        <span>{title}</span>
      </div>
      <div className="text-sm sm:text-[15px] leading-relaxed text-amber-100/90 font-medium">
        {children}
      </div>
    </aside>
  );
}

/* ─── 5. Key Takeaways Summary Checklist ───────────────────── */
export interface KeyTakeawaysProps {
  items: string[];
  title?: string;
  className?: string;
}

export function KeyTakeaways({
  items,
  title = "Key Takeaways",
  className,
}: KeyTakeawaysProps) {
  if (!items.length) return null;

  return (
    <div
      className={cn(
        "my-6 rounded-(--radius-card) border border-emerald-500/20 bg-emerald-500/[0.04] p-4 sm:p-5 space-y-3",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
        <CheckCircle2 size={14} className="shrink-0" />
        <span>{title}</span>
      </div>

      <ul className="space-y-2 text-sm leading-relaxed text-(--color-text-secondary)">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold select-none mt-0.5">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

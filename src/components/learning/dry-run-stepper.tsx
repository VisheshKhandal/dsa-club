"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, CheckCircle2, Activity, ArrowDown } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface DryRunBadge {
  label: string;
  value: string;
  color?: "cyan" | "emerald" | "amber" | "purple" | "rose";
}

export interface DryRunStep {
  stepNumber: number;
  label: string;
  description: string;
  stateBadges?: DryRunBadge[];
  result?: string;
}

export interface DryRunData {
  title?: string;
  input?: string;
  steps: DryRunStep[];
  result?: string;
}

export interface DryRunStepperProps {
  data: DryRunData;
  className?: string;
}

const BADGE_COLORS: Record<string, string> = {
  cyan: "bg-cyan-500/15 border-cyan-400/40 text-cyan-200",
  emerald: "bg-emerald-500/15 border-emerald-400/40 text-emerald-200",
  amber: "bg-amber-500/15 border-amber-400/40 text-amber-200",
  purple: "bg-purple-500/15 border-purple-400/40 text-purple-200",
  rose: "bg-rose-500/15 border-rose-400/40 text-rose-200",
};

export function DryRunStepper({ data, className }: DryRunStepperProps) {
  const { title = "Algorithm Dry Run", input, steps = [], result } = data;
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReduceMotion = useReducedMotion();

  // Handle Play/Pause
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setTimeout(() => {
        if (activeStepIdx < steps.length - 1) {
          setActiveStepIdx((prev) => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 1200);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, activeStepIdx, steps.length]);

  if (!steps.length) return null;

  const currentStep = steps[activeStepIdx];

  return (
    <div
      className={cn(
        "my-6 overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) shadow-sm",
        className
      )}
    >
      {/* Header with Title & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--color-border) bg-(--color-surface-2)/40 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2 font-semibold text-(--color-text-primary)">
          <Activity size={14} className="text-cyan-400" />
          <span>{title}</span>
          <span className="rounded-full bg-(--color-surface-2) px-2 py-0.5 text-[10px] font-mono text-(--color-text-muted) border border-(--color-border)">
            Step {activeStepIdx + 1} of {steps.length}
          </span>
        </div>

        {/* Stepper Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-(--color-border) bg-(--color-surface-1) px-2.5 py-1 text-xs font-medium text-(--color-text-primary) hover:bg-(--color-surface-2) transition-colors"
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} className="fill-current" />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>

          <button
            type="button"
            disabled={activeStepIdx <= 0}
            onClick={() => {
              setIsPlaying(false);
              setActiveStepIdx((p) => Math.max(p - 1, 0));
            }}
            className="p-1 rounded-md text-(--color-text-muted) hover:text-(--color-text-primary) disabled:opacity-30 transition-colors"
            title="Previous Step"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            type="button"
            disabled={activeStepIdx >= steps.length - 1}
            onClick={() => {
              setIsPlaying(false);
              setActiveStepIdx((p) => Math.min(p + 1, steps.length - 1));
            }}
            className="p-1 rounded-md text-(--color-text-muted) hover:text-(--color-text-primary) disabled:opacity-30 transition-colors"
            title="Next Step"
          >
            <ChevronRight size={16} />
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setActiveStepIdx(0);
            }}
            className="p-1 rounded-md text-(--color-text-muted) hover:text-(--color-text-primary) transition-colors"
            title="Reset"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Input state display if available */}
      {input && (
        <div className="border-b border-(--color-border) bg-(--color-surface-2)/20 px-4 py-2 text-xs font-mono text-(--color-text-secondary) flex items-center gap-2">
          <span className="font-bold text-cyan-400 select-none uppercase tracking-wider text-[10px]">
            Input:
          </span>
          <span className="text-(--color-text-primary) truncate">{input}</span>
        </div>
      )}

      {/* Step Progress Dots / Pills */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-1 overflow-x-auto scrollbar-none">
        {steps.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setActiveStepIdx(idx);
            }}
            className={cn(
              "h-1.5 rounded-full transition-all duration-200",
              idx === activeStepIdx
                ? "w-8 bg-cyan-400"
                : idx < activeStepIdx
                ? "w-4 bg-emerald-500/60"
                : "w-2 bg-(--color-border) hover:bg-(--color-text-muted)"
            )}
            title={`Step ${idx + 1}: ${s.label}`}
          />
        ))}
      </div>

      {/* Active Step Presentation */}
      <div className="p-4 sm:p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.stepNumber}
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 4 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            {/* Step Label & Changing State Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                {currentStep.label}
              </span>

              {currentStep.stateBadges?.map((b, bIdx) => (
                <div
                  key={bIdx}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded border",
                    BADGE_COLORS[b.color || "cyan"]
                  )}
                >
                  <span className="opacity-70 text-[10px] uppercase">{b.label}:</span>
                  <span className="font-bold">{b.value}</span>
                </div>
              ))}
            </div>

            {/* Step Detailed Action / Explanation */}
            <div className="rounded-lg border border-(--color-border) bg-(--color-surface-2)/60 p-3.5 text-sm sm:text-[15px] font-mono leading-relaxed text-(--color-text-primary)">
              {currentStep.description}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Final Result Banner */}
      {result && (
        <div className="flex items-center gap-2 border-t border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-2.5 text-xs font-mono text-emerald-300">
          <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
          <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-400">
            Final Outcome:
          </span>
          <span className="text-(--color-text-primary) font-semibold">{result}</span>
        </div>
      )}
    </div>
  );
}

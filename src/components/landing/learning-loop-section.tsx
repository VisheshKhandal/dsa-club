"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LEARNING_LOOP_CONTENT } from "./landing-content";
import { cn } from "@/lib/utils";

export function LearningLoopSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  // Demo internal states
  const [learnStarted, setLearnStarted] = useState(false);
  const [practiceChoice, setPracticeChoice] = useState<string | null>(null);
  const [revisionRevealed, setRevisionRevealed] = useState(false);
  const [masterProgress, setMasterProgress] = useState(65);

  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-advance loop every 3.2s only when user has NOT interacted and not hovering
  useEffect(() => {
    if (reduced || hasInteracted || isHovered || showDemo) return;

    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % LEARNING_LOOP_CONTENT.steps.length);
    }, 3200);

    return () => clearInterval(timer);
  }, [hasInteracted, isHovered, reduced, showDemo]);

  // Master demo progress fill effect
  useEffect(() => {
    if (showDemo && activeStep === 3) {
      const timeout = setTimeout(() => {
        setMasterProgress(100);
      }, 250);
      return () => clearTimeout(timeout);
    } else {
      setMasterProgress(65);
    }
  }, [showDemo, activeStep]);

  const handleStepClick = (stepId: number) => {
    setHasInteracted(true); // Permanent stop on manual click
    setActiveStep(stepId);
    setShowDemo(false);
    setLearnStarted(false);
    setPracticeChoice(null);
    setRevisionRevealed(false);
  };

  const currentStep = LEARNING_LOOP_CONTENT.steps[activeStep];
  const totalSteps = LEARNING_LOOP_CONTENT.steps.length;

  return (
    <section
      id="how-it-works"
      className="py-14 md:py-20 border-t border-(--border-subtle) bg-(--bg-app) relative overflow-hidden"
    >
      {/* Anchor for #learning-path as well */}
      <span id="learning-path" className="absolute -top-24" aria-hidden="true" />

      {/* Subtle radial ambient backdrop */}
      <div
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-25"
        aria-hidden="true"
      >
        <div className="size-[550px] rounded-full bg-[radial-gradient(circle,rgba(183,243,107,0.05)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-[1160px] mx-auto px-5 sm:px-10">
        {/* Centered Heading */}
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
          <span className="text-[11px] font-mono tracking-[0.1em] text-(--accent-lime) uppercase font-bold">
            {LEARNING_LOOP_CONTENT.label}
          </span>
          <h2 className="text-[26px] sm:text-[32px] md:text-[38px] font-bold text-(--text-primary) mt-2 tracking-tight">
            {LEARNING_LOOP_CONTENT.headline}
          </h2>
          <p className="mt-3 text-[16px] text-(--text-secondary) leading-relaxed">
            {LEARNING_LOOP_CONTENT.subtitle}
          </p>
        </div>

        {/* Interactive Loop Diagram Container */}
        <div
          ref={containerRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="max-w-2xl mx-auto"
        >
          {/* Loop Nodes & Track */}
          <div className="relative flex items-center justify-between px-3 sm:px-8">
            {/* Background connecting track */}
            <div
              className="absolute left-8 right-8 top-6 h-[2px] bg-(--border-subtle) -translate-y-1/2 z-0"
              aria-hidden="true"
            />

            {/* Active animated progress bar along track */}
            <motion.div
              className="absolute left-8 top-6 h-[2px] bg-(--accent-lime) -translate-y-1/2 z-0 shadow-xs"
              animate={{
                width: `${(activeStep / (totalSteps - 1)) * 100}%`,
              }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              aria-hidden="true"
            />

            {/* Step Nodes */}
            {LEARNING_LOOP_CONTENT.steps.map((step) => {
              const isActive = step.id === activeStep;
              const isCompleted = step.id < activeStep;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  className="relative z-10 flex flex-col items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime) rounded-full cursor-pointer"
                  aria-label={`Step ${step.id + 1}: ${step.label}`}
                  aria-current={isActive ? "step" : undefined}
                >
                  <div
                    className={cn(
                      "size-12 rounded-full flex items-center justify-center text-[14px] font-bold transition-all duration-200 relative border",
                      isActive
                        ? "bg-(--accent-lime) text-(--bg-app) border-(--accent-lime) scale-110 shadow-xs ring-4 ring-(--accent-lime)/15"
                        : isCompleted
                        ? "bg-(--bg-surface) text-(--accent-lime) border-(--accent-lime)/50"
                        : "bg-(--bg-surface) border-(--border-subtle) text-(--text-muted) group-hover:border-(--border-strong) group-hover:text-(--text-secondary)"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="size-5 stroke-[2.5]" />
                    ) : (
                      <span>{step.id + 1}</span>
                    )}
                  </div>

                  <span
                    className={cn(
                      "mt-3 text-[13px] font-semibold transition-colors duration-150 tracking-wide",
                      isActive
                        ? "text-(--text-primary) font-bold"
                        : isCompleted
                        ? "text-(--accent-lime)"
                        : "text-(--text-muted) group-hover:text-(--text-secondary)"
                    )}
                  >
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Content Card with 'See it in action' Trigger */}
          <div className="mt-8 min-h-[200px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.id}
                initial={reduced ? false : { opacity: 0, y: 8, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.99 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="max-w-[480px] mx-auto rounded-2xl bg-(--bg-surface-raised) border border-(--border-subtle) p-6 shadow-xl text-center backdrop-blur-md transition-colors hover:border-(--border-strong)"
              >
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-(--bg-surface) border border-(--border-subtle) text-[11px] font-mono uppercase tracking-wider text-(--accent-lime) font-bold mb-2">
                  <span className="size-1.5 rounded-full bg-(--accent-lime)" />
                  <span>
                    Stage {currentStep.id + 1} of 4 · {currentStep.label}
                  </span>
                </div>

                <h3 className="text-[18px] font-bold text-(--text-primary)">
                  {currentStep.header}
                </h3>

                <div className="mt-4 pt-4 border-t border-(--border-subtle) space-y-2.5 text-left text-[13px]">
                  <div className="flex items-start gap-2.5 p-2 rounded-lg bg-(--bg-surface)">
                    <span className="text-(--accent-lime) font-semibold shrink-0">
                      DSA Club role:
                    </span>
                    <span className="text-(--text-secondary)">{currentStep.role}</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-lg bg-(--accent-lime)/[0.06] border border-(--accent-lime)/20">
                    <span className="text-(--accent-lime) font-semibold shrink-0">
                      Outcome:
                    </span>
                    <span className="text-(--text-primary)">{currentStep.outcome}</span>
                  </div>
                </div>

                {/* 'See it in action →' Trigger Button */}
                <div className="mt-4 pt-3 border-t border-(--border-subtle)">
                  <button
                    type="button"
                    onClick={() => {
                      setHasInteracted(true);
                      setShowDemo(!showDemo);
                    }}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-(--accent-lime) hover:text-(--accent-lime-dark) transition-colors cursor-pointer"
                  >
                    <span>{showDemo ? "Hide action demo" : "See it in action →"}</span>
                    {showDemo ? (
                      <ChevronUp className="size-3.5" />
                    ) : (
                      <ChevronDown className="size-3.5" />
                    )}
                  </button>
                </div>

                {/* Inline Mini-Demo Specific to Active Step */}
                <AnimatePresence>
                  {showDemo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden mt-4 pt-4 border-t border-(--border-subtle)"
                    >
                      {/* Step 0: LEARN demo */}
                      {activeStep === 0 && (
                        <div className="p-4 rounded-xl bg-(--bg-surface) border border-(--border-subtle) text-left space-y-3">
                          <span className="text-[11px] font-mono text-(--accent-lime) uppercase font-bold block">
                            Start a focused mission
                          </span>

                          {learnStarted ? (
                            <div className="p-2.5 rounded bg-(--accent-lime)/15 border border-(--accent-lime)/40 text-(--accent-lime) text-[13px] font-semibold flex items-center gap-2">
                              <Check className="size-4 stroke-[3]" />
                              <span>Your next step is clear.</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setLearnStarted(true)}
                              className="w-full py-2.5 px-3 rounded-lg bg-(--accent-lime) hover:bg-(--accent-lime-dark) text-(--bg-app) text-[12px] font-semibold shadow-xs transition-all cursor-pointer"
                            >
                              Start Mission
                            </button>
                          )}
                        </div>
                      )}

                      {/* Step 1: PRACTICE demo */}
                      {activeStep === 1 && (
                        <div className="p-4 rounded-xl bg-(--bg-surface) border border-(--border-subtle) text-left space-y-3">
                          <div>
                            <span className="text-[11px] font-mono text-(--accent-lime) uppercase font-bold block">
                              Container With Most Water
                            </span>
                            <p className="text-[12px] text-(--text-primary) font-medium mt-1">
                              Which pattern fits?
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            {["Two Pointer", "Binary Search", "Hash Map", "Greedy"].map(
                              (p) => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => setPracticeChoice(p)}
                                  className={cn(
                                    "p-2 rounded border text-left transition-all cursor-pointer",
                                    practiceChoice === p && p === "Two Pointer"
                                      ? "bg-(--accent-lime)/20 border-(--accent-lime) text-(--text-primary) font-semibold"
                                      : practiceChoice === p
                                      ? "bg-(--accent-red)/20 border-(--accent-red) text-(--text-primary)"
                                      : "bg-(--bg-surface-raised) border-(--border-subtle) text-(--text-secondary) hover:border-(--border-strong) hover:text-(--text-primary)"
                                  )}
                                >
                                  {p}
                                </button>
                              )
                            )}
                          </div>

                          {practiceChoice === "Two Pointer" && (
                            <p className="text-[11px] text-(--accent-lime) font-medium flex items-center gap-1">
                              <Check className="size-3.5 stroke-[3]" />
                              <span>Pattern recognized before writing code.</span>
                            </p>
                          )}
                        </div>
                      )}

                      {/* Step 2: REVISE demo */}
                      {activeStep === 2 && (
                        <div className="p-4 rounded-xl bg-(--bg-surface) border border-(--border-subtle) text-left space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-(--accent-lime) uppercase font-bold">
                              5 min revision
                            </span>
                            <Clock className="size-3.5 text-(--accent-lime)" />
                          </div>

                          {revisionRevealed ? (
                            <div className="p-2.5 rounded bg-(--bg-surface-raised) border border-(--border-subtle) text-[12px] text-(--text-secondary) space-y-1">
                              <span className="font-semibold block text-(--text-primary)">Key Insight:</span>
                              <span>Inorder traversal of a BST generates keys in strictly sorted ascending order.</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setRevisionRevealed(true)}
                              className="w-full py-2.5 px-3 rounded-lg bg-(--accent-lime)/15 hover:bg-(--accent-lime)/25 text-(--accent-lime) border border-(--accent-lime)/30 text-[12px] font-semibold transition-all cursor-pointer"
                            >
                              Reveal key insight
                            </button>
                          )}
                        </div>
                      )}

                      {/* Step 3: MASTER demo */}
                      {activeStep === 3 && (
                        <div className="p-4 rounded-xl bg-(--bg-surface) border border-(--border-subtle) text-left space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-(--accent-lime) uppercase font-bold">
                              Mastery Verification
                            </span>
                            {masterProgress === 100 && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-(--accent-lime)/20 text-(--accent-lime) flex items-center gap-1 animate-fade-in">
                                <Check className="size-3 stroke-[3]" />
                                <span>Mastered</span>
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] font-mono">
                              <span className="text-(--text-secondary)">Progress</span>
                              <span className="text-(--accent-lime) font-bold">{masterProgress}%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-(--bg-app) overflow-hidden border border-(--border-subtle)">
                              <motion.div
                                className="h-full rounded-full bg-(--accent-lime)"
                                animate={{ width: `${masterProgress}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

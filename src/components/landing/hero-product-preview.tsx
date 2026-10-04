"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { Check, ExternalLink, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export function HeroProductPreview() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [wrongFeedback, setWrongFeedback] = useState<string | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Detect touch devices to disable 3D mouse tilt
  useEffect(() => {
    setIsTouchDevice(
      "ontouchstart" in window || navigator.maxTouchPoints > 0
    );
  }, []);

  // Subtle 3D mouse tilt (Desktop only)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { stiffness: 260, damping: 28 };
  const rotateX = useSpring(
    useTransform(mouseY, [-0.5, 0.5], [3.5, -3.5]),
    springConfig
  );
  const rotateY = useSpring(
    useTransform(mouseX, [-0.5, 0.5], [-3.5, 3.5]),
    springConfig
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice || reduced) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleChipClick = (chip: string) => {
    setSelectedChip(chip);
    if (chip === "Inorder DFS") {
      setWrongFeedback(null);
    } else {
      setWrongFeedback("Not optimal for BST ordered elements. Hint: Inorder traversal yields sorted values.");
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedChip(null);
    setWrongFeedback(null);
  };

  const progressPercentage =
    step === 1 ? 36 : selectedChip === "Inorder DFS" ? 52 : 45;

  return (
    <div
      className="relative w-full max-w-[380px] sm:max-w-[420px] mx-auto select-none"
      style={{ perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      ref={cardRef}
    >
      {/* Static Ghost Card 1 — behind, tilted left */}
      <div
        aria-hidden="true"
        className="hidden sm:block absolute top-4 -left-4 w-[94%] h-[84%] rounded-[16px] bg-(--bg-surface)/70 border border-(--border-subtle) shadow-lg -z-10 pointer-events-none"
        style={{
          transform: "rotate(-4deg) translateZ(-20px)",
        }}
      />

      {/* Static Ghost Card 2 — behind, tilted right */}
      <div
        aria-hidden="true"
        className="hidden sm:block absolute top-7 -right-3 w-[90%] h-[80%] rounded-[16px] bg-(--bg-surface)/50 border border-(--border-subtle) shadow -z-20 pointer-events-none"
        style={{
          transform: "rotate(3deg) translateZ(-40px)",
        }}
      />

      {/* Main Interactive Product Card */}
      <motion.div
        style={{
          rotateX: isTouchDevice || reduced ? 0 : rotateX,
          rotateY: isTouchDevice || reduced ? 0 : rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative z-10 w-full rounded-2xl bg-(--bg-surface-raised) border border-(--border-strong) p-5 sm:p-6 shadow-2xl backdrop-blur-xl transition-all duration-200 hover:border-(--accent-lime)/40"
      >
        {/* Card Header Bar */}
        <div className="flex items-center justify-between pb-3.5 border-b border-(--border-subtle)">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-(--accent-lime)" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-(--accent-lime) font-bold">
              TODAY&apos;S MISSION · STAGE {step === 1 ? "3" : "4"} OF 9
            </span>
          </div>

          {/* Quick reset button */}
          {step > 1 && (
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-mono text-(--text-muted) hover:text-(--text-primary) flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:underline"
              title="Reset preview"
            >
              <RotateCcw className="size-3" />
              <span>↻ Try again</span>
            </button>
          )}
        </div>

        {/* Progress Bar & Stage Indicators */}
        <div className="py-3">
          <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((dotIndex) => {
                const currentThreshold = step === 1 ? 3 : 4;
                const isDone = dotIndex < currentThreshold;
                const isCurrent = dotIndex === currentThreshold;

                return (
                  <span
                    key={dotIndex}
                    className={cn(
                      "size-2 rounded-full transition-all duration-200",
                      isDone
                        ? "bg-(--accent-lime)"
                        : isCurrent
                        ? "bg-(--accent-lime) ring-2 ring-(--accent-lime)/40 scale-110"
                        : "bg-(--border-subtle)"
                    )}
                  />
                );
              })}
            </div>
            <span className="text-(--accent-lime) font-semibold">{progressPercentage}%</span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-(--bg-surface) overflow-hidden border border-(--border-subtle)">
            <motion.div
              className="h-full rounded-full bg-(--accent-lime)"
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Main Content Machine */}
        <div className="min-h-[225px] relative overflow-hidden flex flex-col justify-between pt-1">
          <AnimatePresence mode="wait">
            {/* STATE 1 — VISUALIZATION */}
            {step === 1 && (
              <motion.div
                key="state-1"
                initial={reduced ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-[17px] sm:text-[18px] font-bold text-(--text-primary)">
                    Mastering Binary Trees
                  </h3>
                  <p className="text-[13px] text-(--accent-lime) font-medium mt-0.5">
                    Visualization
                  </p>
                  <p className="text-[12px] text-(--text-secondary) mt-0.5">
                    &ldquo;See how trees actually work&rdquo;
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-(--bg-surface) border border-(--border-subtle) text-[12px] text-(--text-secondary) space-y-1.5">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-(--text-muted) block font-bold">
                    Next up:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-(--accent-lime)" />
                    <span className="text-(--text-primary)">Pattern Recognition</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-(--text-muted)" />
                    <span className="text-(--text-muted)">Guided Practice</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-(--accent-lime) hover:bg-(--accent-lime-dark) text-(--bg-app) text-[13px] font-semibold transition-all duration-150 active:scale-[0.98] shadow-xs cursor-pointer"
                >
                  <span>Continue →</span>
                </button>
              </motion.div>
            )}

            {/* STATE 2 — PATTERN RECOGNITION */}
            {step === 2 && (
              <motion.div
                key="state-2"
                initial={reduced ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-3"
              >
                <div>
                  <span className="text-[11px] font-mono text-(--accent-lime) uppercase font-bold block">
                    Pattern Recognition — Identify the approach
                  </span>
                  <p className="text-[13px] font-semibold text-(--text-primary) mt-1 leading-snug">
                    &ldquo;Given a BST, find the Kth smallest element.&rdquo;
                  </p>
                  <p className="text-[12px] text-(--text-secondary) mt-0.5 font-medium">
                    Which approach fits?
                  </p>
                </div>

                {/* Clickable Pattern Chips */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {["Inorder DFS", "BFS Level", "Binary Search", "Two Pointer"].map(
                    (chip) => {
                      const isSelected = selectedChip === chip;
                      const isCorrect = chip === "Inorder DFS";

                      return (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleChipClick(chip)}
                          className={cn(
                            "py-2 px-2.5 rounded-lg border text-[12px] font-medium transition-all text-left flex items-center justify-between cursor-pointer",
                            isSelected && isCorrect
                              ? "bg-(--accent-lime)/20 border-(--accent-lime) text-(--text-primary) font-semibold shadow-xs"
                              : isSelected && !isCorrect
                              ? "bg-(--accent-red)/15 border-(--accent-red)/40 text-(--text-primary)"
                              : "bg-(--bg-surface) border-(--border-subtle) text-(--text-secondary) hover:border-(--border-strong) hover:text-(--text-primary) active:scale-[0.98]"
                          )}
                        >
                          <span>{chip}</span>
                          {isSelected && isCorrect && (
                            <Check className="size-3.5 text-(--accent-lime) stroke-[3]" />
                          )}
                        </button>
                      );
                    }
                  )}
                </div>

                {/* Wrong answer notice */}
                {wrongFeedback && (
                  <p className="text-[11px] text-(--accent-amber) italic animate-fade-in">
                    {wrongFeedback}
                  </p>
                )}

                {/* Correct answer state feedback */}
                {selectedChip === "Inorder DFS" ? (
                  <div className="pt-2 space-y-2.5 animate-fade-in">
                    <div className="p-2.5 rounded-lg bg-(--accent-lime)/10 border border-(--accent-lime)/30 text-[12px] text-(--accent-lime)">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Check className="size-3.5 stroke-[3]" />
                        <span>Correct</span>
                      </div>
                      <p className="text-[11px] text-(--text-secondary) mt-0.5">
                        Inorder traversal of a BST produces values in sorted order.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-(--accent-lime) hover:bg-(--accent-lime-dark) text-(--bg-app) text-[13px] font-semibold transition-all duration-150 active:scale-[0.98] shadow-xs cursor-pointer"
                    >
                      <span>Continue to Practice →</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-(--text-muted) italic text-center pt-1">
                    Click an option to test approach
                  </p>
                )}
              </motion.div>
            )}

            {/* STATE 3 — PRODUCT FEEDBACK */}
            {step === 3 && (
              <motion.div
                key="state-3"
                initial={reduced ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-3"
              >
                <div className="flex items-center gap-1.5 text-(--accent-lime) text-[13px] font-bold">
                  <Check className="size-4 stroke-[3]" />
                  <span>Pattern recognized</span>
                </div>

                <div className="p-3 rounded-xl bg-(--bg-surface) border border-(--border-subtle) text-left">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-(--accent-lime) font-bold block">
                    Recommended next step:
                  </span>
                  <p className="text-[14px] font-bold text-(--text-primary) mt-1">
                    Practice Kth Smallest Element
                  </p>
                  <p className="text-[11px] text-(--text-secondary) mt-1">
                    Solve targeted LeetCode problem utilizing your validated Inorder DFS approach.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <a
                    href="https://leetcode.com/problems/kth-smallest-element-in-a-bst/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg bg-(--accent-lime) hover:bg-(--accent-lime-dark) text-(--bg-app) text-[13px] font-semibold transition-all duration-150 active:scale-[0.98] shadow-xs cursor-pointer"
                  >
                    <span>Start Practice →</span>
                    <ExternalLink className="size-3.5" />
                  </a>

                  <p className="text-[11px] text-(--text-muted) text-center leading-relaxed">
                    This is how DSA Club turns concepts into targeted practice.
                  </p>
                </div>

                <div className="pt-2 border-t border-(--border-subtle) flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="size-3" />
                    <span>↻ Try again</span>
                  </button>

                  <Link
                    href="/register?callbackUrl=/onboarding"
                    className="text-(--accent-lime) hover:underline font-semibold"
                  >
                    Start free →
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

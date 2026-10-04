"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, RotateCcw, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaygroundProblem {
  id: string;
  title: string;
  difficulty: string;
  topic: string;
  question: string;
  correct: string;
  options: string[];
  why: string;
}

const PLAYGROUND_PROBLEMS: PlaygroundProblem[] = [
  {
    id: "kth-bst",
    title: "Kth Smallest Element in a BST",
    difficulty: "Medium",
    topic: "Binary Trees",
    question: "Given the root of a binary search tree and an integer k, return the kth smallest value.",
    correct: "Inorder DFS",
    options: ["Inorder DFS", "Binary Search", "BFS Level Order", "Two Pointer"],
    why: "Inorder traversal of a BST yields values in strictly ascending sorted order. The kth node visited is the answer.",
  },
  {
    id: "water-container",
    title: "Container With Most Water",
    difficulty: "Medium",
    topic: "Arrays",
    question: "Find two lines that together with the x-axis form a container that contains the most water.",
    correct: "Two Pointer",
    options: ["Two Pointer", "Sliding Window", "Dynamic Programming", "Greedy"],
    why: "Shrinking inward from both ends eliminates suboptimal pairs in O(n) time by always discarding the shorter line.",
  },
  {
    id: "valid-anagram",
    title: "Valid Anagram",
    difficulty: "Easy",
    topic: "Strings & Hashing",
    question: "Given two strings s and t, return true if t is an anagram of s.",
    correct: "Frequency Map",
    options: ["Frequency Map", "Two Pointer", "Binary Search", "DFS Graph"],
    why: "Counting character frequencies in a hash map or array allows O(n) comparison without expensive O(n log n) sorting.",
  },
];

export function ProductPlayground() {
  const [activeStage, setActiveStage] = useState<1 | 2 | 3>(1);
  const [problemIndex, setProblemIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [wrongNote, setWrongNote] = useState<string | null>(null);
  const reduced = useReducedMotion();

  const currentProblem = PLAYGROUND_PROBLEMS[problemIndex];

  const handleGiveProblem = () => {
    setActiveStage(2);
    setSelectedOption(null);
    setWrongNote(null);
  };

  const handleSelectOption = (opt: string) => {
    setSelectedOption(opt);
    if (opt === currentProblem.correct) {
      setWrongNote(null);
      setActiveStage(3);
    } else {
      setWrongNote("Not the optimal pattern. Try another approach.");
    }
  };

  const handleTryAnother = () => {
    setProblemIndex((prev) => (prev + 1) % PLAYGROUND_PROBLEMS.length);
    setSelectedOption(null);
    setWrongNote(null);
    setActiveStage(2);
  };

  return (
    <div className="mt-12 pt-10 border-t border-(--border-subtle) max-w-3xl mx-auto">
      {/* Playground Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-(--bg-surface) border border-(--border-subtle) text-[11px] font-mono tracking-wider text-(--accent-lime) uppercase mb-3 font-semibold">
          <span>Try one pattern question</span>
        </div>
        <h3 className="text-[22px] sm:text-[28px] font-bold text-(--text-primary) tracking-tight">
          Try the DSA Club method.
        </h3>
        <p className="mt-2 text-[14px] text-(--text-secondary) max-w-lg mx-auto">
          Experience how a problem moves from recognition to practice in seconds.
        </p>
      </div>

      {/* Main Interactive Stage Box */}
      <div className="rounded-2xl bg-(--bg-surface-raised) border border-(--border-subtle) p-6 sm:p-8 shadow-xl min-h-[220px] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* STAGE 1 — TRIGGER */}
          {activeStage === 1 && (
            <motion.div
              key="stage-1"
              initial={reduced ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="text-center space-y-4"
            >
              <p className="text-[15px] text-(--text-secondary) max-w-md mx-auto">
                Ready to test your pattern recognition speed? We&apos;ll give you a real DSA interview problem.
              </p>

              <button
                type="button"
                onClick={handleGiveProblem}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-(--accent-lime) hover:bg-(--accent-lime-dark) text-(--bg-app) text-[14px] font-semibold transition-all shadow-xs active:scale-[0.98] cursor-pointer"
              >
                <span>Give me a problem →</span>
              </button>
            </motion.div>
          )}

          {/* STAGE 2 — PROBLEM PRESENTATION & MULTI-CHOICE */}
          {activeStage === 2 && (
            <motion.div
              key="stage-2"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-(--text-muted) mb-1">
                  <span>{currentProblem.topic}</span>
                  <span className="text-(--accent-lime)">{currentProblem.difficulty}</span>
                </div>
                <h4 className="text-[17px] font-bold text-(--text-primary)">
                  {currentProblem.title}
                </h4>
                <p className="mt-1.5 text-[13px] text-(--text-secondary) leading-relaxed">
                  &ldquo;{currentProblem.question}&rdquo;
                </p>
              </div>

              <div>
                <span className="text-[12px] font-mono text-(--text-muted) block mb-2 font-medium">
                  What pattern or approach fits?
                </span>

                <div className="grid grid-cols-2 gap-2.5 text-[13px]">
                  {currentProblem.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSelectOption(opt)}
                      className={cn(
                        "p-3 rounded-lg border text-left font-medium transition-all cursor-pointer",
                        selectedOption === opt && opt !== currentProblem.correct
                          ? "bg-(--accent-red)/15 border-(--accent-red)/40 text-(--text-primary)"
                          : "bg-(--bg-surface) border-(--border-subtle) text-(--text-secondary) hover:border-(--border-strong) hover:text-(--text-primary) active:scale-[0.98]"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {wrongNote && (
                  <p className="mt-2 text-[12px] text-(--accent-amber) italic">
                    {wrongNote}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* STAGE 3 — PATTERN RECOGNIZED RESULT */}
          {activeStage === 3 && (
            <motion.div
              key="stage-3"
              initial={reduced ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 text-left"
            >
              <div className="flex items-center gap-2 text-(--accent-lime)">
                <div className="size-6 rounded-full bg-(--accent-lime)/15 flex items-center justify-center">
                  <Check className="size-3.5 stroke-[3]" />
                </div>
                <span className="text-[14px] font-bold">
                  Pattern recognized: {currentProblem.correct}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-(--bg-surface) border border-(--border-subtle) text-[13px]">
                <span className="text-[11px] font-mono uppercase tracking-wider text-(--accent-lime) font-bold block mb-1">
                  Why this approach?
                </span>
                <p className="text-(--text-secondary) leading-relaxed">
                  {currentProblem.why}
                </p>
              </div>

              <p className="text-[12px] text-(--text-muted) leading-relaxed">
                DSA Club helps you recognize the approach before you start coding.
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-(--border-subtle)">
                <button
                  type="button"
                  onClick={handleTryAnother}
                  className="text-[12px] font-semibold text-(--text-secondary) hover:text-(--text-primary) transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Try another problem</span>
                </button>

                <Link
                  href="/register?callbackUrl=/onboarding"
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-(--accent-lime) hover:text-(--accent-lime-dark) transition-colors"
                >
                  <span>Build my learning path</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

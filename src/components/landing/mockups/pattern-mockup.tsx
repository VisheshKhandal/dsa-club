"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "framer-motion";

interface Option {
  id: string;
  name: string;
  isCorrect: boolean;
}

const OPTIONS: Option[] = [
  { id: "two-pointers", name: "Two Pointers", isCorrect: true },
  { id: "binary-search", name: "Binary Search", isCorrect: false },
  { id: "greedy", name: "Greedy Approach", isCorrect: false },
  { id: "hash-map", name: "Hash Map", isCorrect: false },
];

export function PatternDiagnosticMockup() {
  const [selectedId, setSelectedId] = useState<string>("two-pointers");
  const [userInteracted, setUserInteracted] = useState(false);
  const reduced = useReducedMotion();

  // Subtle slow simulated toggle every 5.5s if user has not interacted
  useEffect(() => {
    if (reduced || userInteracted) return;

    const interval = setInterval(() => {
      setSelectedId((prev) => (prev === "two-pointers" ? "binary-search" : "two-pointers"));
    }, 5500);

    return () => clearInterval(interval);
  }, [userInteracted, reduced]);

  const handleSelect = (id: string) => {
    setUserInteracted(true);
    setSelectedId(id);
  };

  const isTwoPointers = selectedId === "two-pointers";

  return (
    <div className="rounded-[14px] bg-(--bg-surface) border border-(--border-subtle) p-5 sm:p-6 shadow-xl text-(--text-primary) transition-all duration-300 hover:border-(--border-strong)">
      {/* Mockup Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-(--border-subtle) mb-4">
        <span className="text-[12px] font-bold tracking-wide uppercase text-(--accent-lime)">
          Pattern Diagnostic
        </span>
        <span className="text-[11px] font-mono text-(--text-muted) bg-(--bg-surface-raised) px-2 py-0.5 rounded">
          Identify Pattern First
        </span>
      </div>

      {/* Target Problem Box */}
      <div className="p-3.5 rounded-[10px] bg-(--bg-surface-raised) border border-(--border-subtle) mb-4">
        <span className="text-[11px] text-(--text-muted) block font-mono">Problem Target</span>
        <h4 className="text-[15px] font-bold text-(--text-primary) mt-0.5">
          Container With Most Water
        </h4>
        <p className="text-[12px] text-(--text-secondary) mt-1">
          Which algorithmic pattern best optimizes this problem?
        </p>
      </div>

      {/* Pattern Selector Grid */}
      <div className="grid grid-cols-2 gap-2.5 text-[12px]">
        {OPTIONS.map((opt) => {
          const isSelected = selectedId === opt.id;
          const isCorrect = opt.isCorrect;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              className={cn(
                "p-2.5 rounded-[8px] border text-left transition-all duration-200 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--accent-lime)",
                isSelected && isCorrect
                  ? "bg-(--accent-lime)/15 border-(--accent-lime)/50 text-(--text-primary) font-semibold shadow-[0_0_12px_rgba(183,243,107,0.15)]"
                  : isSelected && !isCorrect
                  ? "bg-(--bg-surface) border-(--border-strong) text-(--text-secondary)"
                  : "border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-secondary) hover:text-(--text-primary)"
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full shrink-0",
                  isSelected && isCorrect
                    ? "bg-(--accent-lime)"
                    : isSelected && !isCorrect
                    ? "bg-(--text-muted)"
                    : "bg-(--border-strong)"
                )}
              />
              <span>{opt.name}</span>
            </button>
          );
        })}
      </div>

      {/* Diagnostic Explanation Feedback */}
      <div className="mt-4 pt-3.5 border-t border-(--border-subtle) text-[12px] min-h-[44px] flex items-center">
        {isTwoPointers ? (
          <div className="text-(--accent-lime) flex items-start gap-2 animate-fade-in">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            <span>Two Pointer — because we shrink boundaries inward from both ends.</span>
          </div>
        ) : (
          <div className="text-(--text-secondary) flex items-start gap-2 animate-fade-in">
            <HelpCircle className="size-4 shrink-0 mt-0.5" />
            <span>Notice array boundaries: shrinking the shorter line guarantees optimal subproblems. Try Two Pointers.</span>
          </div>
        )}
      </div>
    </div>
  );
}

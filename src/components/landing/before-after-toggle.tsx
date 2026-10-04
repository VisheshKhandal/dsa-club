"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export function BeforeAfterToggle() {
  const [mode, setMode] = useState<"without" | "with">("with");
  const reduced = useReducedMotion();

  const handleScrollToSession = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("learner-session");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="mt-12 pt-10 border-t border-(--border-subtle) max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <span className="text-[11px] font-mono uppercase tracking-wider text-(--accent-lime) font-bold">
          System Comparison
        </span>
        <h3 className="text-[20px] sm:text-[24px] font-bold text-(--text-primary) mt-1">
          DSA Club replaces random practice with a connected learning loop.
        </h3>
      </div>

      {/* Segmented Controller Toggle */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => setMode("without")}
          className={cn(
            "px-4 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer border",
            mode === "without"
              ? "bg-(--bg-surface) text-(--text-primary) border-(--border-strong) shadow-xs"
              : "bg-transparent text-(--text-muted) hover:text-(--text-secondary) border-transparent"
          )}
        >
          Without structure
        </button>

        <button
          type="button"
          onClick={() => setMode("with")}
          className={cn(
            "px-4 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer border",
            mode === "with"
              ? "bg-(--accent-lime)/15 text-(--accent-lime) border-(--accent-lime)/40 font-bold shadow-xs"
              : "bg-transparent text-(--text-muted) hover:text-(--text-secondary) border-transparent"
          )}
        >
          With DSA Club
        </button>
      </div>

      {/* Comparison Stage */}
      <div className="rounded-2xl bg-(--bg-surface-raised) border border-(--border-subtle) p-6 sm:p-7 min-h-[160px] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {mode === "without" ? (
            <motion.div
              key="mode-without"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-5"
            >
              <div className="text-[12px] font-mono text-(--text-muted) text-center">
                Without DSA Club (Random topic loop):
              </div>

              {/* Without Structure Sequence (Neutral Slate) */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[13px] font-mono">
                <span className="px-3 py-1.5 rounded-lg bg-(--bg-surface) border border-(--border-subtle) text-(--text-secondary)">
                  Choose
                </span>
                <span className="text-(--text-muted)">→</span>
                <span className="px-3 py-1.5 rounded-lg bg-(--bg-surface) border border-(--border-subtle) text-(--text-secondary)">
                  Solve
                </span>
                <span className="text-(--text-muted)">→</span>
                <span className="px-3 py-1.5 rounded-lg bg-(--bg-surface) border border-(--border-subtle) text-(--text-secondary)">
                  Forget
                </span>
                <span className="text-(--text-muted)">→</span>
                <span className="px-3 py-1.5 rounded-lg bg-(--bg-surface) border border-(--border-subtle) text-(--text-muted)">
                  Restart
                </span>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setMode("with")}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-(--accent-lime) hover:underline cursor-pointer"
                >
                  <span>See the DSA Club sequence →</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="mode-with"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-5"
            >
              <div className="text-[12px] font-mono text-(--accent-lime) text-center font-medium">
                With DSA Club (Connected learning loop):
              </div>

              {/* With DSA Club Sequence (Lime accents) */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[13px] font-mono">
                <span className="px-3 py-1.5 rounded-lg bg-(--bg-surface) border border-(--accent-lime)/30 text-(--accent-lime) font-medium flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-(--accent-lime)" />
                  <span>Learn</span>
                </span>
                <span className="text-(--accent-lime)">→</span>
                <span className="px-3 py-1.5 rounded-lg bg-(--bg-surface) border border-(--accent-lime)/30 text-(--accent-lime) font-medium flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-(--accent-lime)" />
                  <span>Practice</span>
                </span>
                <span className="text-(--accent-lime)">→</span>
                <span className="px-3 py-1.5 rounded-lg bg-(--bg-surface) border border-(--accent-lime)/30 text-(--accent-lime) font-medium flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-(--accent-lime)" />
                  <span>Review</span>
                </span>
                <span className="text-(--accent-lime)">→</span>
                <span className="px-3 py-1.5 rounded-lg bg-(--accent-lime)/15 border border-(--accent-lime) text-(--accent-lime) font-bold flex items-center gap-1.5">
                  <Check className="size-3.5 stroke-[3]" />
                  <span>Improve</span>
                </span>
              </div>

              {/* Transition CTA directly into the 30-minute section */}
              <div className="text-center pt-1">
                <a
                  href="#learner-session"
                  onClick={handleScrollToSession}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-(--accent-lime) hover:text-(--accent-lime-dark) transition-colors cursor-pointer group"
                >
                  <span>See the 30-minute example</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

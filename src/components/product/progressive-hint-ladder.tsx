"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Eye, Key, Lightbulb, Lock, Sparkles, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProblemHint {
  level: number;
  title: string;
  content: string;
}

interface ProgressiveHintLadderProps {
  hints: ProblemHint[];
  revealedCount: number;
  onRevealChange: (count: number) => void;
}

const DEFAULT_LEVEL_LABELS: Record<number, { category: string; description: string }> = {
  1: { category: "Conceptual Direction", description: "Intuition & problem perspective" },
  2: { category: "Algorithm Strategy", description: "Core data structure & pattern setup" },
  3: { category: "Key Move & Edge Cases", description: "Pseudocode & tricky constraints" },
};

export function ProgressiveHintLadder({
  hints,
  revealedCount,
  onRevealChange,
}: ProgressiveHintLadderProps) {
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true });

  if (!hints || hints.length === 0) return null;

  const sortedHints = [...hints].sort((a, b) => a.level - b.level);

  const toggleExpand = (index: number) => {
    setExpandedIndices((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleUnlockNext = () => {
    if (revealedCount < sortedHints.length) {
      const nextCount = revealedCount + 1;
      onRevealChange(nextCount);
      // Auto-expand newly unlocked hint
      setExpandedIndices((prev) => ({ ...prev, [revealedCount]: true }));
    }
  };
  const isAssisted = revealedCount >= 1;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5 space-y-4">
      {/* Header with Hint Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">Metered Hint Ladder</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-400/[0.08] border border-purple-400/20 px-2 py-0.5 text-[10px] font-medium text-purple-300">
              {revealedCount} / {sortedHints.length} Unlocked
            </span>
          </div>
          <p className="mt-1 text-xs text-purple-100/50">
            Hints unlock sequentially. Reveal only what you need to preserve your independent mastery score.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {revealedCount === 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-2.5 py-1 text-xs font-medium text-emerald-300">
              <CheckCircle2 size={13} />
              Independent Solve
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-fuchsia-400/30 bg-fuchsia-400/[0.1] px-2.5 py-1 text-xs font-semibold text-fuchsia-200 shadow-sm">
              <AlertCircle size={13} />
              Hint-Assisted ({revealedCount} hint{revealedCount > 1 ? "s" : ""})
            </span>
          )}
        </div>
      </div>

      {/* Warning banner when >= 1 hint is unlocked */}
      {isAssisted && (
        <div className="flex items-start gap-2.5 rounded-lg border border-fuchsia-400/20 bg-fuchsia-400/[0.05] p-3 text-xs text-fuchsia-200/90 leading-relaxed">
          <AlertCircle size={15} className="text-fuchsia-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold text-fuchsia-100">Learning Integrity Notice:</strong> Unlocking any hint classifies this solve as <span className="underline font-semibold">Hint Assisted</span>. DSA Club counts independent solves only when zero hints are unlocked.
          </div>
        </div>
      )}

      {/* Progressive Hints List */}
      <div className="space-y-3">
        {sortedHints.map((hint, idx) => {
          const isUnlocked = idx < revealedCount;
          const isNext = idx === revealedCount;
          const isLocked = idx > revealedCount;
          const isExpanded = isUnlocked && Boolean(expandedIndices[idx]);
          const levelMeta = DEFAULT_LEVEL_LABELS[hint.level] || {
            category: `Hint Level ${hint.level}`,
            description: "Targeted guidance",
          };

          if (isUnlocked) {
            return (
              <div
                key={`${hint.level}-${idx}`}
                className="rounded-xl border border-purple-400/20 bg-purple-400/[0.03] transition overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(idx)}
                  className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/[0.02] transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-6 place-items-center rounded-md bg-purple-400/[0.12] text-purple-300 text-xs font-bold">
                      {hint.level}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">
                          {hint.title || levelMeta.category}
                        </span>
                        <span className="text-[10px] text-purple-300/60 font-medium">
                          ({levelMeta.category})
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-purple-100/40">
                    <span className="text-[11px] text-emerald-400/80 flex items-center gap-1 font-medium">
                      <Unlock size={11} /> Unlocked
                    </span>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                </button>

                {isExpanded && (
                  <div
                    className="px-3.5 pb-3.5 pt-1 border-t border-white/[0.04] text-xs leading-relaxed text-purple-100/75 bg-black/20 whitespace-pre-wrap animate-[fadeSlideIn_160ms_ease-out]"
                    style={{ animationFillMode: "backwards" }}
                  >
                    {hint.content}
                  </div>
                )}
              </div>
            );
          }

          if (isNext) {
            return (
              <div
                key={`${hint.level}-${idx}`}
                className="rounded-xl border border-white/[0.1] bg-white/[0.02] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-purple-300/25 transition animate-[fadeSlideIn_180ms_ease-out]"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-6 place-items-center rounded-md border border-white/[0.1] bg-white/[0.04] text-purple-100/60 text-xs font-bold shrink-0">
                    {hint.level}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-white">
                      Hint {hint.level}: {hint.title || levelMeta.category}
                    </p>
                    <p className="text-[11px] text-purple-100/50 mt-0.5">
                      {levelMeta.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUnlockNext}
                  className="focus-ring inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-purple-500/15 border border-purple-400/30 px-3.5 text-xs font-semibold text-purple-200 transition hover:bg-purple-500/25 hover:border-purple-400/50 shrink-0"
                >
                  <Key size={13} className="text-purple-300" />
                  Unlock Hint {hint.level}
                </button>
              </div>
            );
          }

          // isLocked
          return (
            <div
              key={`${hint.level}-${idx}`}
              className="rounded-xl border border-white/[0.04] bg-black/10 p-3.5 flex items-center justify-between opacity-50 cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-6 place-items-center rounded-md border border-white/[0.06] bg-black/20 text-purple-100/30 text-xs font-medium">
                  {hint.level}
                </span>
                <span className="text-xs text-purple-100/40 font-medium">
                  Hint {hint.level}: {hint.title || levelMeta.category}
                </span>
              </div>
              <span className="text-[11px] text-purple-100/30 flex items-center gap-1 font-medium">
                <Lock size={12} /> Locked (Unlock Hint {hint.level - 1} first)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

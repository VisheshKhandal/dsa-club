"use client";

import React, { useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  Check,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FEATURES_CONTENT,
  ROTATING_PATTERN_PROBLEMS,
} from "./landing-content";

export function FeaturesInteractive() {
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);
  const reduced = useReducedMotion();

  // Tab 1: Mission Stages state
  const [currentMissionStage, setCurrentMissionStage] = useState(3);
  const totalMissionStages = 7;
  const missionStages = [
    { num: 1, name: "Introduction" },
    { num: 2, name: "Concepts" },
    { num: 3, name: "Visualization" },
    { num: 4, name: "Pattern Recognition" },
    { num: 5, name: "Practice" },
    { num: 6, name: "Reflection" },
    { num: 7, name: "Mastery Check" },
  ];

  // Tab 2: Rotating Pattern state
  const [patternProblemIndex, setPatternProblemIndex] = useState(0);
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);

  const currentProblem = ROTATING_PATTERN_PROBLEMS[patternProblemIndex];

  const handleNextProblem = () => {
    setSelectedPattern(null);
    setPatternProblemIndex(
      (prev) => (prev + 1) % ROTATING_PATTERN_PROBLEMS.length
    );
  };

  // Tab 3: Revision queue state
  const [revisionItems, setRevisionItems] = useState([
    {
      id: "bst",
      title: "Balance a BST",
      difficulty: "Easy",
      timing: "Due today",
      expanded: false,
      revealed: false,
      done: false,
      insight: "Inorder traversal of BST gives a sorted array. Find mid element as root to balance recursively.",
    },
    {
      id: "two-sum",
      title: "Two Sum",
      difficulty: "Easy",
      timing: "Due today",
      expanded: false,
      revealed: false,
      done: false,
      insight: "Use a hash map to store complement (target - current) in one pass for O(n) lookup.",
    },
    {
      id: "arrays-mission",
      title: "Arrays Mission",
      difficulty: "Medium",
      timing: "90 min",
      expanded: false,
      revealed: false,
      done: false,
      insight: "Prefix sums allow O(1) subarray query evaluations.",
    },
  ]);

  const toggleReviewItem = (id: string) => {
    setRevisionItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, expanded: !item.expanded } : item
      )
    );
  };

  const revealInsight = (id: string) => {
    setRevisionItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, revealed: true, done: true } : item
      )
    );
  };

  const tabs = [
    {
      id: 0,
      label: FEATURES_CONTENT.features[0].label,
      title: FEATURES_CONTENT.features[0].headline,
      body: FEATURES_CONTENT.features[0].body,
    },
    {
      id: 1,
      label: FEATURES_CONTENT.features[1].label,
      title: FEATURES_CONTENT.features[1].headline,
      body: FEATURES_CONTENT.features[1].body,
    },
    {
      id: 2,
      label: FEATURES_CONTENT.features[2].label,
      title: FEATURES_CONTENT.features[2].headline,
      body: FEATURES_CONTENT.features[2].body,
    },
  ];

  return (
    <div className="mt-8 md:mt-12">
      {/* Mobile Horizontal Pill Tabs (hidden on md+) */}
      <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
        {tabs.map((tab, idx) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(idx as 0 | 1 | 2)}
            className={cn(
              "shrink-0 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all border",
              activeTab === idx
                ? "bg-(--accent-lime) text-(--bg-app) border-(--accent-lime) shadow-xs"
                : "bg-(--bg-surface) border-(--border-subtle) text-(--text-secondary) hover:text-(--text-primary)"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid: Left Tab List + Right Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: 3 Clickable Feature Tabs (Desktop) */}
        <div className="lg:col-span-5 space-y-3">
          {tabs.map((tab, idx) => {
            const isActive = activeTab === idx;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(idx as 0 | 1 | 2)}
                className={cn(
                  "w-full text-left p-5 sm:p-6 rounded-2xl transition-all duration-200 relative border cursor-pointer",
                  isActive
                    ? "bg-(--bg-surface-raised) border-(--accent-lime)/40 shadow-xl"
                    : "bg-(--bg-surface)/40 border-transparent opacity-65 hover:opacity-100 hover:bg-(--bg-surface-raised) hover:border-(--border-subtle)"
                )}
              >
                {/* Active Sliding Left Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeFeatureTab"
                    className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-(--accent-lime)"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}

                <span
                  className={cn(
                    "text-[11px] font-mono uppercase tracking-wider font-bold block",
                    isActive ? "text-(--accent-lime)" : "text-(--text-muted)"
                  )}
                >
                  {tab.label}
                </span>

                <h3 className="text-[17px] sm:text-[19px] font-bold text-(--text-primary) mt-1.5 leading-snug">
                  {tab.title}
                </h3>

                <p className="mt-2 text-[14px] text-(--text-secondary) leading-relaxed line-clamp-2">
                  {tab.body}
                </p>
              </button>
            );
          })}
        </div>

        {/* Right Column: Animated UI Preview Panel */}
        <div className="lg:col-span-7 w-full">
          <div className="rounded-2xl bg-(--bg-surface-raised) border border-(--border-subtle) p-5 sm:p-7 shadow-xl backdrop-blur-md min-h-[420px] flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {/* TAB 1: Missions Interactive Stage Navigator */}
              {activeTab === 0 && (
                <motion.div
                  key="tab-missions"
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-(--border-subtle)">
                    <div>
                      <span className="text-[11px] font-mono text-(--accent-lime) uppercase font-bold">
                        Mission Stage Rail
                      </span>
                      <h4 className="text-[16px] font-bold text-(--text-primary) mt-0.5">
                        Complete Arrays in Depth
                      </h4>
                    </div>

                    <span className="text-[11px] font-mono text-(--text-secondary) bg-(--bg-surface) px-2.5 py-1 rounded border border-(--border-subtle)">
                      Stage {Math.min(currentMissionStage, totalMissionStages)} of {totalMissionStages}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full rounded-full bg-(--bg-surface) overflow-hidden border border-(--border-subtle)">
                    <motion.div
                      className="h-full rounded-full bg-(--accent-lime)"
                      animate={{
                        width: `${(currentMissionStage / totalMissionStages) * 100}%`,
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  {/* Stage List */}
                  {currentMissionStage > totalMissionStages ? (
                    <div className="py-10 text-center space-y-3">
                      <div className="size-12 rounded-full bg-(--accent-lime)/15 text-(--accent-lime) flex items-center justify-center mx-auto">
                        <Check className="size-6 stroke-[3]" />
                      </div>
                      <h4 className="text-[18px] font-bold text-(--text-primary)">Mission Complete! 🎉</h4>
                      <p className="text-[13px] text-(--text-secondary) max-w-sm mx-auto">
                        You&apos;ve completed all stages of this mission. Knowledge has been queued for spaced revision.
                      </p>
                      <button
                        type="button"
                        onClick={() => setCurrentMissionStage(1)}
                        className="mt-2 text-[12px] font-semibold text-(--accent-lime) hover:underline cursor-pointer"
                      >
                        Reset demo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {missionStages.map((stg) => {
                        const isDone = stg.num < currentMissionStage;
                        const isCurrent = stg.num === currentMissionStage;

                        return (
                          <div
                            key={stg.num}
                            className={cn(
                              "flex items-center justify-between p-2.5 rounded-lg border transition-all",
                              isCurrent
                                ? "bg-(--bg-surface) border-(--accent-lime)/40 text-(--text-primary) shadow-xs"
                                : isDone
                                ? "bg-(--bg-surface)/40 border-(--border-subtle)"
                                : "opacity-40 border-transparent"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={cn(
                                  "size-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                  isDone
                                    ? "bg-(--accent-lime)/20 text-(--accent-lime)"
                                    : isCurrent
                                    ? "bg-(--accent-lime) text-(--bg-app)"
                                    : "border border-(--border-subtle) text-(--text-muted)"
                                )}
                              >
                                {isDone ? <Check className="size-3 stroke-[3]" /> : stg.num}
                              </span>
                              <span
                                className={cn(
                                  "text-[13px]",
                                  isCurrent
                                    ? "font-bold text-(--text-primary)"
                                    : isDone
                                    ? "text-(--text-secondary)"
                                    : "text-(--text-muted)"
                                )}
                              >
                                {stg.name}
                              </span>
                            </div>

                            {isCurrent && (
                              <span className="text-[11px] font-mono text-(--accent-lime) font-bold">
                                Current
                              </span>
                            )}
                            {isDone && (
                              <span className="text-[11px] font-mono text-(--accent-lime)">Done</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Bottom Actions */}
                  {currentMissionStage <= totalMissionStages && (
                    <div className="pt-3 border-t border-(--border-subtle) flex items-center justify-between">
                      <button
                        type="button"
                        disabled={currentMissionStage <= 1}
                        onClick={() => setCurrentMissionStage((prev) => Math.max(1, prev - 1))}
                        className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold text-(--text-muted) hover:text-(--text-primary) disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        ← Back
                      </button>

                      <button
                        type="button"
                        onClick={() => setCurrentMissionStage((prev) => prev + 1)}
                        className="px-4 py-2 rounded-lg bg-(--accent-lime) hover:bg-(--accent-lime-dark) text-(--bg-app) text-[12px] font-semibold transition-all active:scale-[0.98] shadow-xs cursor-pointer"
                      >
                        Continue →
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 2: Patterns Recognition Demo with Rotation */}
              {activeTab === 1 && (
                <motion.div
                  key="tab-patterns"
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-(--border-subtle)">
                    <div>
                      <span className="text-[11px] font-mono text-(--accent-lime) uppercase font-bold">
                        Pattern Diagnostic
                      </span>
                      <h4 className="text-[16px] font-bold text-(--text-primary) mt-0.5">
                        {currentProblem.title}
                      </h4>
                      <span className="text-[11px] text-(--text-secondary)">
                        {currentProblem.difficulty} · {currentProblem.topic}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleNextProblem}
                      className="text-[11px] font-mono text-(--accent-lime) hover:underline transition-colors bg-(--bg-surface) border border-(--border-subtle) px-2.5 py-1 rounded cursor-pointer"
                    >
                      Next problem →
                    </button>
                  </div>

                  <div>
                    <span className="text-[12px] text-(--text-secondary) block mb-2 font-medium">
                      Pick the pattern:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      {currentProblem.options.map((opt) => {
                        const isCorrect = opt === currentProblem.correctPattern;
                        const isSelected = selectedPattern === opt;

                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setSelectedPattern(opt)}
                            className={cn(
                              "p-3 rounded-lg border text-left font-medium transition-all duration-150 cursor-pointer",
                              selectedPattern && isCorrect
                                ? "bg-(--accent-lime)/15 border-(--accent-lime) text-(--text-primary) font-semibold shadow-xs"
                                : isSelected && !isCorrect
                                ? "bg-(--accent-red)/15 border-(--accent-red)/40 text-(--text-primary)"
                                : selectedPattern
                                ? "opacity-35 border-transparent bg-(--bg-surface)"
                                : "bg-(--bg-surface) border-(--border-subtle) text-(--text-secondary) hover:border-(--border-strong) hover:text-(--text-primary) active:scale-[0.98]"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span>{opt}</span>
                              {selectedPattern && isCorrect && (
                                <Check className="size-3.5 text-(--accent-lime) stroke-[3]" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Feedback Box */}
                  <div className="min-h-[60px] pt-3 border-t border-(--border-subtle)">
                    {selectedPattern ? (
                      <div className="space-y-2.5">
                        <div
                          className={cn(
                            "text-[12px] flex items-start gap-2",
                            selectedPattern === currentProblem.correctPattern
                              ? "text-(--accent-lime)"
                              : "text-(--accent-amber)"
                          )}
                        >
                          <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                          <span>{currentProblem.explanation}</span>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <a
                            href={`https://leetcode.com/problems/${currentProblem.leetcodeSlug}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-(--accent-lime) hover:underline transition-colors"
                          >
                            <span>Practice on LeetCode</span>
                            <ExternalLink className="size-3" />
                          </a>

                          <span className="text-[11px] text-(--text-muted)">
                            Pattern recognition mapped
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[12px] text-(--text-muted) italic">
                        Click a pattern chip above to test your approach recognition...
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB 3: Revision Queue Session with Expandable Review */}
              {activeTab === 2 && (
                <motion.div
                  key="tab-revision"
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-(--border-subtle)">
                    <div>
                      <span className="text-[11px] font-mono text-(--accent-lime) uppercase font-bold">
                        {"Today's Revision"}
                      </span>
                      <h4 className="text-[16px] font-bold text-(--text-primary) mt-0.5">
                        Active Recall Queue
                      </h4>
                    </div>

                    <span className="text-[11px] font-mono text-(--text-secondary) bg-(--bg-surface) px-2.5 py-1 rounded border border-(--border-subtle)">
                      3 items · ~16 min
                    </span>
                  </div>

                  {/* Revision Items with Expandable Review */}
                  <div className="space-y-2.5">
                    {revisionItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "rounded-xl border p-3 transition-all",
                          item.done
                            ? "bg-(--bg-surface) border-(--accent-lime)/30"
                            : "bg-(--bg-surface) border-(--border-subtle)"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "size-2 rounded-full",
                                  item.done ? "bg-(--accent-lime)" : "bg-(--accent-amber)"
                                )}
                              />
                              <span className="text-[13px] font-semibold text-(--text-primary)">
                                {item.title}
                              </span>
                            </div>
                            <span className="text-[11px] text-(--text-muted) ml-4">
                              {item.difficulty} · {item.timing}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleReviewItem(item.id)}
                            className={cn(
                              "px-3 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer border",
                              item.done
                                ? "bg-(--accent-lime)/15 text-(--accent-lime) border-(--accent-lime)/30"
                                : "bg-(--bg-surface-raised) text-(--text-secondary) border-(--border-subtle) hover:border-(--border-strong) hover:text-(--text-primary)"
                            )}
                          >
                            {item.done ? "Recalled ✓" : "Review"}
                          </button>
                        </div>

                        {/* Expanded Insight Prompt */}
                        {item.expanded && (
                          <div className="mt-3 pt-3 border-t border-(--border-subtle) space-y-2">
                            <p className="text-[12px] font-medium text-(--text-primary)">
                              What is the key insight for this problem?
                            </p>
                            <div className="p-2 rounded bg-(--bg-surface-raised) border border-(--border-subtle) text-[11px] text-(--text-muted) italic">
                              Type mental recall checkpoint...
                            </div>

                            {item.revealed ? (
                              <div className="p-2.5 rounded bg-(--accent-lime)/10 border border-(--accent-lime)/30 text-[12px] text-(--accent-lime)">
                                <span className="font-semibold block">Key Insight:</span>
                                {item.insight}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => revealInsight(item.id)}
                                className="text-[11px] font-semibold text-(--accent-lime) hover:underline cursor-pointer"
                              >
                                Reveal answer →
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-(--border-subtle) flex items-center justify-between">
                    <span className="text-[12px] text-(--text-secondary)">
                      Retention score: 88%
                    </span>

                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg bg-(--accent-lime) hover:bg-(--accent-lime-dark) text-(--bg-app) text-[12px] font-semibold transition-all active:scale-[0.98] shadow-xs cursor-pointer"
                    >
                      Start Revision Session →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

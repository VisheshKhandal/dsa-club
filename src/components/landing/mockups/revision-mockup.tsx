"use client";

import React, { useState } from "react";
import { Check, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface RevisionItem {
  id: string;
  type: "drill" | "checkpoint";
  title: string;
  isReviewed: boolean;
}

const INITIAL_ITEMS: RevisionItem[] = [
  { id: "bst", type: "drill", title: "Balance a Binary Search Tree", isReviewed: false },
  { id: "two-sum", type: "drill", title: "Two Sum (Optimal Pointers)", isReviewed: false },
  { id: "arrays", type: "checkpoint", title: "Complete Arrays in Depth", isReviewed: false },
];

export function RevisionQueueMockup() {
  const [items, setItems] = useState<RevisionItem[]>(INITIAL_ITEMS);

  const toggleReview = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isReviewed: !item.isReviewed } : item
      )
    );
  };

  const reviewedCount = items.filter((i) => i.isReviewed).length;

  return (
    <div className="rounded-[14px] bg-(--bg-surface) border border-(--border-subtle) p-5 sm:p-6 shadow-xl text-(--text-primary) transition-all duration-300 hover:border-(--border-strong)">
      {/* Mockup Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-(--border-subtle) mb-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="size-4 text-(--accent-lime)" />
          <span className="text-[12px] font-bold tracking-wide uppercase text-(--accent-lime)">
            Revision Queue
          </span>
        </div>
        <span className="text-[11px] font-mono text-(--text-muted) bg-(--bg-surface-raised) px-2 py-0.5 rounded">
          {items.length - reviewedCount} due · ~16 min
        </span>
      </div>

      {/* Revision Items */}
      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center justify-between p-2.5 rounded-[8px] transition-all duration-200 border",
              item.isReviewed
                ? "bg-(--accent-lime)/[0.08] border-(--accent-lime)/30"
                : "bg-(--bg-surface-raised) border-(--border-subtle) hover:border-(--border-strong)"
            )}
          >
            <div>
              <span className="text-[10px] font-mono uppercase font-bold block text-(--accent-lime)">
                {item.type === "checkpoint" ? "Mission Checkpoint" : "Problem Drill"}
              </span>
              <span
                className={cn(
                  "text-[13px] font-semibold transition-colors",
                  item.isReviewed ? "text-(--text-muted) line-through" : "text-(--text-primary)"
                )}
              >
                {item.title}
              </span>
            </div>

            <button
              type="button"
              onClick={() => toggleReview(item.id)}
              className={cn(
                "px-2.5 py-1 rounded text-[11px] font-semibold transition-all duration-150 active:scale-[0.96] flex items-center gap-1",
                item.isReviewed
                  ? "bg-(--accent-lime)/20 text-(--accent-lime) border border-(--accent-lime)/40"
                  : "bg-(--accent-lime)/10 text-(--accent-lime) border border-(--accent-lime)/30 hover:bg-(--accent-lime)/20"
              )}
            >
              {item.isReviewed ? (
                <>
                  <Check className="size-3 stroke-[2.5]" />
                  <span>Recalled</span>
                </>
              ) : (
                <span>Review</span>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Footer Summary */}
      <div className="mt-4 pt-3.5 border-t border-(--border-subtle) flex items-center justify-between text-[12px]">
        <span className="text-(--text-secondary) flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-(--accent-lime)" />
          <span>Retention score: 88%</span>
        </span>
        <span className="font-semibold text-(--accent-lime) hover:text-(--accent-lime-dark) transition-colors cursor-pointer inline-flex items-center gap-1">
          Start Revision Session →
        </span>
      </div>
    </div>
  );
}

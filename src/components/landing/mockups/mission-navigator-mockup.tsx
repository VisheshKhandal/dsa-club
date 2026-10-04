"use client";

import React, { useState } from "react";
import { Check, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

interface StageItem {
  number: number;
  title: string;
  defaultStatus: "done" | "current" | "queued";
}

const STAGES: StageItem[] = [
  { number: 1, title: "1. Introduction & Context", defaultStatus: "done" },
  { number: 2, title: "2. Pattern Concepts", defaultStatus: "done" },
  { number: 3, title: "3. Visualization Lab", defaultStatus: "current" },
  { number: 4, title: "4. Pattern Recognition", defaultStatus: "queued" },
  { number: 5, title: "5. Problem Practice", defaultStatus: "queued" },
];

export function MissionNavigatorMockup() {
  const [selectedStage, setSelectedStage] = useState(3);

  return (
    <div className="rounded-[14px] bg-(--bg-surface) border border-(--border-subtle) p-5 sm:p-6 shadow-xl text-(--text-primary) transition-all duration-300 hover:border-(--border-strong)">
      {/* Mockup Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-(--border-subtle) mb-4">
        <div className="flex items-center gap-2">
          <Compass className="size-4 text-(--accent-lime)" />
          <span className="text-[12px] font-bold tracking-wide uppercase text-(--accent-lime)">
            Mission Navigator
          </span>
        </div>
        <span className="text-[11px] font-mono text-(--text-muted) bg-(--bg-surface-raised) px-2 py-0.5 rounded">
          Stage {selectedStage} of 6
        </span>
      </div>

      {/* Stage Rail */}
      <div className="space-y-2.5">
        {STAGES.map((stage) => {
          const isCurrent = stage.number === selectedStage;
          const isDone = stage.number < selectedStage;

          return (
            <button
              key={stage.number}
              type="button"
              onClick={() => setSelectedStage(stage.number)}
              className={cn(
                "w-full flex items-center justify-between p-2.5 rounded-[8px] text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--accent-lime)",
                isCurrent
                  ? "bg-(--accent-lime)/15 border border-(--accent-lime)/50 shadow-[0_0_12px_rgba(183,243,107,0.15)]"
                  : isDone
                  ? "bg-(--bg-surface-raised) border border-(--border-subtle) hover:border-(--border-strong)"
                  : "opacity-60 border border-transparent hover:opacity-80 hover:bg-(--bg-surface-raised)"
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "size-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-transform",
                    isDone
                      ? "bg-(--accent-lime)/20 text-(--accent-lime)"
                      : isCurrent
                      ? "bg-(--accent-lime) text-(--bg-app) shadow-[0_0_8px_rgba(183,243,107,0.4)]"
                      : "border border-(--border-subtle) text-(--text-muted)"
                  )}
                >
                  {isDone ? <Check className="size-3 stroke-[2.5]" /> : stage.number}
                </span>
                <span
                  className={cn(
                    "text-[13px] transition-colors",
                    isCurrent
                      ? "font-semibold text-(--text-primary)"
                      : isDone
                      ? "text-(--text-secondary)"
                      : "text-(--text-muted)"
                  )}
                >
                  {stage.title}
                </span>
              </div>

              <span
                className={cn(
                  "text-[11px] font-mono",
                  isCurrent
                    ? "text-(--accent-lime) font-bold"
                    : isDone
                    ? "text-(--accent-lime) font-medium"
                    : "text-(--text-muted)"
                )}
              >
                {isCurrent ? "Current" : isDone ? "Done" : "Queued"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

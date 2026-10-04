"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedProgressProps {
  totalSteps: number;
  completedSteps: number;
  currentStep?: number;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

export function SegmentedProgress({
  totalSteps,
  completedSteps,
  currentStep,
  label,
  size = "md",
  className,
}: SegmentedProgressProps) {
  const total = Math.max(1, totalSteps);
  const completed = Math.max(0, Math.min(total, completedSteps));
  const active = currentStep !== undefined ? currentStep : completed + 1;
  const heightClass = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      <div className="flex items-center gap-1.5 w-full" aria-label={`Progress: ${completed} of ${total} steps complete`}>
        {Array.from({ length: total }).map((_, idx) => {
          const stepIndex = idx + 1;
          const isDone = stepIndex <= completed;
          const isCurrent = stepIndex === active && !isDone;

          return (
            <div
              key={idx}
              className={cn(
                "flex-1 rounded-full transition-colors duration-200",
                heightClass,
                isDone
                  ? "bg-(--accent-lime)"
                  : isCurrent
                    ? "bg-(--accent-lime)/40 border border-(--accent-lime)/60"
                    : "bg-(--bg-surface-raised) border border-(--border-subtle)"
              )}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between text-caption text-(--text-muted)">
        <span>{label ?? `${completed} of ${total} steps complete`}</span>
        <span className="font-tabular text-xs font-semibold text-(--text-secondary)">
          {Math.round((completed / total) * 100)}%
        </span>
      </div>
    </div>
  );
}

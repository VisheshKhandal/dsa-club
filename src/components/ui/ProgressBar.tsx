"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  value: number; // 0–100
  color?: string; // default: var(--color-green)
  animated?: boolean; // animates fill on mount (800ms ease-out)
  showLabel?: boolean; // show "X%" text at end
  size?: "sm" | "md"; // sm=4px height, md=8px height
  className?: string;
}

export function ProgressBar({
  value,
  color = "var(--color-green)",
  animated = true,
  showLabel = false,
  size = "md",
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value || 0)));
  const heightClass = size === "sm" ? "h-1" : "h-2";

  return (
    <div className={cn("flex items-center gap-3 w-full", className)}>
      <div
        className={cn(
          "relative flex-1 w-full overflow-hidden rounded-full bg-(--color-surface-2) border border-(--color-border)/40",
          heightClass
        )}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {animated ? (
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: "0%" }}
            animate={{ width: `${clamped}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        ) : (
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${clamped}%`, backgroundColor: color }}
          />
        )}
      </div>
      {showLabel && (
        <span className="text-caption font-medium text-(--color-text-secondary) shrink-0 min-w-[36px] text-right">
          {clamped}%
        </span>
      )}
    </div>
  );
}

export const Progress = ProgressBar;

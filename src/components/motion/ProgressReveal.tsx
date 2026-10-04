"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { motionEase } from "./variants";
import { cn } from "@/lib/utils";

export interface ProgressRevealProps {
  value: number; // 0–100
  color?: string;
  size?: "sm" | "md";
  className?: string;
  showLabel?: boolean;
}

export function ProgressReveal({
  value,
  color = "var(--color-purple)",
  size = "md",
  className,
  showLabel = false,
}: ProgressRevealProps) {
  const shouldReduceMotion = useReducedMotion();
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
        {shouldReduceMotion ? (
          <div
            className="h-full rounded-full"
            style={{ width: `${clamped}%`, backgroundColor: color }}
          />
        ) : (
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: "0%" }}
            animate={{ width: `${clamped}%` }}
            transition={{ duration: 0.65, ease: motionEase }}
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

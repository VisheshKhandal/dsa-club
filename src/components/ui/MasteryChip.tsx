import React from "react";
import { cn } from "@/lib/utils";

export interface MasteryChipProps {
  value: number; // 0–100
  className?: string;
  size?: "sm" | "md";
}

/**
 * MasteryChip — inline percentage chip for card subtitles.
 * Color: green (mastered ≥ 70%), orange (in-progress 30–69%), muted (< 30%)
 * Example: "72% Mastery"
 */
export function MasteryChip({ value, className, size = "sm" }: MasteryChipProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value || 0)));

  const colorClass =
    clamped >= 70
      ? "text-(--color-green) bg-(--color-green-subtle) border-((--color-green)/25)"
      : clamped >= 30
      ? "text-(--color-orange) bg-(--color-orange-subtle) border-((--color-orange)/25)"
      : "text-(--color-text-muted) bg-(--color-surface-2) border-(--color-border)";

  const sizeClass = size === "sm" ? "text-[11px] px-1.5 py-0.5" : "text-xs px-2 py-1";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-(--radius-badge) border font-medium whitespace-nowrap select-none",
        colorClass,
        sizeClass,
        className
      )}
    >
      <span className="tabular-nums">{clamped}%</span>
      <span className="opacity-70">Mastery</span>
    </span>
  );
}

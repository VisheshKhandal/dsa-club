"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/motion";

export interface ProgressRingProps {
  value: number; // 0–100
  size?: number; // px, default 64
  strokeWidth?: number; // default 6
  color?: string; // default --color-green
  label?: string; // center text override (default: value%)
  className?: string;
}

export function ProgressRing({
  value,
  size = 64,
  strokeWidth = 6,
  color = "var(--color-green)",
  label,
  className,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value || 0)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg]"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--color-surface-2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated fill */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
        <span className="text-caption font-bold text-(--color-text-primary) leading-none">
          {label ?? (
            <span>
              <AnimatedNumber value={clamped} durationMs={650} />%
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

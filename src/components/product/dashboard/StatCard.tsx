"use client";

import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/motion";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  suffix?: string;
  accent: "purple" | "emerald" | "amber" | "cyan";
  href?: string;
}

const accentMap = {
  purple: {
    border: "border-t-purple-500",
    iconBg: "bg-purple-500/12",
    iconText: "text-purple-500",
    glow: "group-hover:shadow-[0_0_20px_rgba(168,85,247,0.12)]",
  },
  emerald: {
    border: "border-t-emerald-500",
    iconBg: "bg-emerald-500/12",
    iconText: "text-emerald-500",
    glow: "group-hover:shadow-[0_0_20px_rgba(52,211,153,0.12)]",
  },
  amber: {
    border: "border-t-amber-500",
    iconBg: "bg-amber-500/12",
    iconText: "text-amber-500",
    glow: "group-hover:shadow-[0_0_20px_rgba(245,158,11,0.12)]",
  },
  cyan: {
    border: "border-t-cyan-500",
    iconBg: "bg-cyan-500/12",
    iconText: "text-cyan-500",
    glow: "group-hover:shadow-[0_0_20px_rgba(34,211,238,0.12)]",
  },
} as const;

export function StatCard({ icon: Icon, value, label, suffix = "", accent }: StatCardProps) {
  const a = accentMap[accent];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-1) p-4",
        "border-t-2 transition-all duration-200 hover:-translate-y-0.5",
        a.border,
        a.glow
      )}
    >
      {/* Subtle radial glow on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-4 -top-4 size-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: accent === "purple" ? "rgba(168,85,247,0.15)"
            : accent === "emerald" ? "rgba(52,211,153,0.15)"
            : accent === "amber" ? "rgba(245,158,11,0.15)"
            : "rgba(34,211,238,0.15)",
        }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-bold tracking-tight text-(--color-text-primary)">
            <AnimatedNumber value={value} durationMs={700} />{suffix}
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-(--color-text-muted)">
            {label}
          </p>
        </div>
        <div className={cn("grid size-9 shrink-0 place-items-center rounded-lg", a.iconBg)}>
          <Icon size={18} className={a.iconText} aria-hidden />
        </div>
      </div>
    </div>
  );
}

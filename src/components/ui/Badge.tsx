import React from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "not-started"
  | "in-progress"
  | "active"
  | "needs-revision"
  | "completed"
  | "mastered"
  | "locked"
  | "easy"
  | "medium"
  | "hard"
  | "ai"
  | "building"
  | "practicing"
  | "strong";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  "not-started": "text-(--text-muted) bg-(--bg-surface-raised) border border-(--border-subtle)",
  "in-progress": "text-(--accent-blue) bg-(--accent-blue)/10 border border-(--accent-blue)/25",
  active: "text-(--accent-lime) bg-(--accent-lime)/10 border border-(--accent-lime)/25",
  "needs-revision": "text-(--accent-amber) bg-(--accent-amber)/10 border border-(--accent-amber)/25",
  completed: "text-(--accent-lime) bg-(--accent-lime)/10 border border-(--accent-lime)/25",
  mastered: "text-(--accent-lime) bg-(--accent-lime)/10 border border-(--accent-lime)/25",
  locked: "text-(--text-muted) bg-(--bg-surface-raised) border border-(--border-subtle)",
  easy: "text-(--accent-lime) bg-(--accent-lime)/10 border border-(--accent-lime)/25",
  medium: "text-(--accent-amber) bg-(--accent-amber)/10 border border-(--accent-amber)/25",
  hard: "text-(--accent-red) bg-(--accent-red)/10 border border-(--accent-red)/25",
  ai: "text-(--accent-teal) bg-(--accent-teal)/10 border border-(--accent-teal)/25",
  building: "text-(--accent-amber) bg-(--accent-amber)/10 border border-(--accent-amber)/25",
  practicing: "text-(--accent-teal) bg-(--accent-teal)/10 border border-(--accent-teal)/25",
  strong: "text-(--accent-lime) bg-(--accent-lime)/10 border border-(--accent-lime)/25",
};

export function Badge({
  variant = "not-started",
  children,
  className,
  icon,
  ...props
}: BadgeProps) {
  const isLocked = variant === "locked";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-label rounded-(--radius-badge) whitespace-nowrap font-medium select-none",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {isLocked && <Lock className="size-2.5 shrink-0" />}
      {!isLocked && icon && <span className="shrink-0">{icon}</span>}
      {children ?? (isLocked ? "Locked" : variant.replace("-", " "))}
    </span>
  );
}

export const StatusBadge = Badge;

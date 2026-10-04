"use client";

import React from "react";
import { ButtonGhost } from "./Button";
import { Badge } from "./Badge";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
  badge?: string; // e.g., "3 items"
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  action,
  badge,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-(--color-border)/60 mb-6",
        className
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h2 className="text-section text-(--color-text-primary) tracking-tight">
            {title}
          </h2>
          {badge && <Badge variant="not-started">{badge}</Badge>}
        </div>
        {subtitle && (
          <p className="text-body text-(--color-text-secondary)">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="shrink-0">
          <ButtonGhost size="sm" onClick={action.onClick}>
            {action.label}
          </ButtonGhost>
        </div>
      )}
    </div>
  );
}

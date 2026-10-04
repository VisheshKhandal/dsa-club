"use client";

import React from "react";
import { ButtonPrimary } from "./Button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-(--radius-card) bg-(--color-surface-1) border border-(--color-border) max-w-md mx-auto my-6",
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-(--color-text-muted) size-12 flex items-center justify-center [&>svg]:size-12">
          {icon}
        </div>
      )}
      <h3 className="text-card-title text-(--color-text-primary) mb-1.5 font-semibold">
        {title}
      </h3>
      {subtitle && (
        <p className="text-body text-(--color-text-secondary) max-w-xs mb-6">
          {subtitle}
        </p>
      )}
      {action && (
        <ButtonPrimary size="md" onClick={action.onClick}>
          {action.label}
        </ButtonPrimary>
      )}
    </div>
  );
}

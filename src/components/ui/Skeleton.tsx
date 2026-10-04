import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  rounded?: string;
  className?: string;
}

export function Skeleton({
  width,
  height,
  rounded = "rounded-(--radius-btn)",
  className,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton bg-(--color-surface-2)",
        rounded,
        className
      )}
      style={{
        width,
        height,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

export const LoadingSkeleton = Skeleton;

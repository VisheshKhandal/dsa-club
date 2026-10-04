"use client";

import React from "react";
import { ArrowRight, ArrowDown, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StackQueueVisualizationProps {
  type: "stack" | "queue";
  items: (string | number)[];
  title?: string;
  operation?: string;
  className?: string;
}

export function StackQueueVisualization({
  type,
  items = [],
  title,
  operation,
  className,
}: StackQueueVisualizationProps) {
  const displayTitle = title || (type === "queue" ? "Queue State (FIFO)" : "Stack State (LIFO)");

  return (
    <figure
      className={cn(
        "my-6 overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) shadow-sm",
        className
      )}
      aria-label={displayTitle}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-(--color-border) bg-(--color-surface-2)/40 px-4 py-2.5 text-xs font-semibold text-(--color-text-primary)">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-cyan-400" />
          <span>{displayTitle}</span>
        </div>
        {operation && (
          <span className="font-mono text-[11px] text-purple-300 font-medium bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
            {operation}
          </span>
        )}
      </div>

      <div className="p-5 flex items-center justify-center">
        {type === "queue" ? (
          /* ── Queue: Horizontal FIFO ── */
          <div className="flex items-center gap-2 overflow-x-auto py-2">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Dequeue</span>
              <span className="text-rose-400 text-xs font-mono">← Front</span>
            </div>

            <div className="flex items-center rounded-lg border-2 border-dashed border-cyan-500/40 bg-(--color-surface-2)/50 p-1.5 gap-1.5 min-w-[120px]">
              {items.length === 0 ? (
                <span className="text-xs text-(--color-text-muted) italic px-4 py-2">Empty Queue</span>
              ) : (
                items.map((val, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center justify-center min-w-10 h-10 px-3 rounded-md font-mono text-sm font-bold border transition-colors",
                      idx === 0
                        ? "border-rose-400/50 bg-rose-500/15 text-rose-200"
                        : idx === items.length - 1
                        ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
                        : "border-(--color-border) bg-(--color-surface-3) text-(--color-text-primary)"
                    )}
                  >
                    {val}
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Enqueue</span>
              <span className="text-emerald-400 text-xs font-mono">Rear ←</span>
            </div>
          </div>
        ) : (
          /* ── Stack: Vertical LIFO ── */
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="flex items-center gap-1.5 text-xs text-rose-300 font-mono">
              <span className="font-bold text-rose-400 uppercase tracking-wider">Top (Push / Pop)</span>
              <ArrowDown size={14} className="text-rose-400 animate-bounce" />
            </div>

            <div className="flex flex-col-reverse w-40 rounded-b-lg border-x-2 border-b-2 border-dashed border-purple-500/50 bg-(--color-surface-2)/50 p-2 gap-1.5 min-h-[140px] justify-start">
              {items.length === 0 ? (
                <span className="text-xs text-(--color-text-muted) italic text-center py-8">Empty Stack</span>
              ) : (
                items.map((val, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center justify-between w-full h-9 px-3 rounded font-mono text-sm font-bold border",
                      idx === items.length - 1
                        ? "border-rose-400/60 bg-rose-500/20 text-rose-200 shadow-sm"
                        : "border-(--color-border) bg-(--color-surface-3) text-(--color-text-primary)"
                    )}
                  >
                    <span>{val}</span>
                    <span className="text-[10px] text-(--color-text-muted) font-sans">
                      {idx === items.length - 1 ? "TOP" : idx === 0 ? "BASE" : ""}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </figure>
  );
}

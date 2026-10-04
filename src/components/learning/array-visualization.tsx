"use client";

import React, { useState } from "react";
import { Layers, Calendar, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ArrayElement {
  index: number;
  value: string | number;
  label?: string;
  isHighlighted?: boolean;
  color?: "cyan" | "purple" | "emerald" | "amber" | "rose";
}

export interface IntervalItem {
  id: string;
  label: string;
  start: number;
  end: number;
  isSelected?: boolean;
  isConflict?: boolean;
}

export interface ArrayVisualizationProps {
  title?: string;
  caption?: string;
  elements?: (string | number)[] | ArrayElement[];
  intervals?: IntervalItem[];
  pointers?: { name: string; index: number; color?: "cyan" | "purple" | "emerald" | "amber" }[];
  className?: string;
}

export function ArrayVisualization({
  title = "Array Visualization",
  caption,
  elements,
  intervals,
  pointers = [],
  className,
}: ArrayVisualizationProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Normalize elements
  const normalizedElements: ArrayElement[] = (elements ?? []).map((el, idx) => {
    if (typeof el === "object" && el !== null && "value" in el) {
      return el as ArrayElement;
    }
    return {
      index: idx,
      value: el,
    };
  });

  // Calculate timeline bounds if intervals present
  const minTime = intervals && intervals.length > 0 ? Math.min(...intervals.map((i) => i.start), 0) : 0;
  const maxTime = intervals && intervals.length > 0 ? Math.max(...intervals.map((i) => i.end), 10) : 10;
  const totalDuration = Math.max(maxTime - minTime, 1);

  return (
    <figure
      className={cn(
        "my-6 overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) shadow-sm",
        className
      )}
      aria-label={title}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-(--color-border) bg-(--color-surface-2)/40 px-4 py-2.5 text-xs font-semibold text-(--color-text-primary)">
        <div className="flex items-center gap-2">
          {intervals && intervals.length > 0 ? (
            <Calendar size={14} className="text-cyan-400" />
          ) : (
            <Layers size={14} className="text-cyan-400" />
          )}
          <span>{title}</span>
        </div>
        <span className="font-mono text-[11px] text-(--color-text-muted)">
          {intervals ? `${intervals.length} intervals` : `${normalizedElements.length} elements`}
        </span>
      </div>

      <div className="p-4 sm:p-5 overflow-x-auto">
        {/* ── 1. 1D Array Cells ── */}
        {normalizedElements.length > 0 && !intervals && (
          <div className="flex flex-col items-center py-2 min-w-max">
            {/* Pointers Row */}
            {pointers.length > 0 && (
              <div className="flex gap-2 mb-2 select-none h-6 items-end">
                {normalizedElements.map((_, idx) => {
                  const ptrsHere = pointers.filter((p) => p.index === idx);
                  if (!ptrsHere.length) return <div key={idx} className="w-12" />;
                  return (
                    <div key={idx} className="w-12 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-tighter">
                        {ptrsHere.map((p) => p.name).join(",")}
                      </span>
                      <span className="text-cyan-400 text-xs leading-none">↓</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cells Row */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {normalizedElements.map((el) => {
                const isSelected = selectedIdx === el.index;
                return (
                  <button
                    key={el.index}
                    type="button"
                    onClick={() => setSelectedIdx(isSelected ? null : el.index)}
                    className={cn(
                      "flex flex-col items-center justify-center w-12 h-13 rounded-lg border transition-all duration-150 select-none",
                      isSelected
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-200 scale-105 shadow-sm shadow-cyan-500/20"
                        : el.isHighlighted
                        ? "border-purple-400/50 bg-purple-500/15 text-purple-200"
                        : "border-(--color-border) bg-(--color-surface-2) text-(--color-text-primary) hover:border-(--color-purple)/40 hover:bg-(--color-surface-3)"
                    )}
                  >
                    <span className="font-mono text-sm font-bold">{el.value}</span>
                    <span className="font-mono text-[10px] text-(--color-text-muted) opacity-70">
                      [{el.index}]
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Hover details / explanation */}
            {selectedIdx !== null && (
              <div className="mt-4 rounded-md bg-(--color-surface-2) px-3 py-1.5 text-xs text-(--color-text-secondary) font-mono">
                Index: <span className="text-cyan-300 font-bold">{selectedIdx}</span> | Value:{" "}
                <span className="text-emerald-300 font-bold">
                  {normalizedElements[selectedIdx]?.value}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── 2. Interval / Timeline Schedule ── */}
        {intervals && intervals.length > 0 && (
          <div className="space-y-3 py-2 min-w-[480px]">
            {/* Timeline Axis Header */}
            <div className="relative h-6 border-b border-(--color-border) text-[10px] font-mono text-(--color-text-muted)">
              {Array.from({ length: totalDuration + 1 }).map((_, idx) => {
                const timePoint = minTime + idx;
                const leftPercent = ((timePoint - minTime) / totalDuration) * 100;
                return (
                  <div
                    key={idx}
                    className="absolute -translate-x-1/2 flex flex-col items-center"
                    style={{ left: `${leftPercent}%` }}
                  >
                    <span>{timePoint}</span>
                    <div className="w-px h-1.5 bg-(--color-border) mt-0.5" />
                  </div>
                );
              })}
            </div>

            {/* Interval Bars */}
            <div className="space-y-2 pt-2">
              {intervals.map((item) => {
                const leftPercent = ((item.start - minTime) / totalDuration) * 100;
                const widthPercent = Math.max(((item.end - item.start) / totalDuration) * 100, 4);

                return (
                  <div key={item.id} className="relative h-7 flex items-center">
                    <div
                      className={cn(
                        "absolute h-6 rounded-md px-2 flex items-center justify-between text-xs font-mono font-medium transition-all shadow-xs",
                        item.isSelected
                          ? "bg-emerald-500/20 border border-emerald-400 text-emerald-300 ring-1 ring-emerald-400/30"
                          : item.isConflict
                          ? "bg-rose-500/10 border border-rose-500/30 text-rose-300/80 line-through opacity-60"
                          : "bg-purple-500/15 border border-purple-500/30 text-purple-200 hover:border-purple-400"
                      )}
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        minWidth: "48px",
                      }}
                    >
                      <span className="truncate">{item.label}</span>
                      <span className="text-[10px] opacity-75 ml-1 select-none">
                        [{item.start}, {item.end}]
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {caption && (
        <figcaption className="border-t border-(--color-border) bg-(--color-surface-2)/20 px-4 py-2 text-[11px] text-(--color-text-muted)">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

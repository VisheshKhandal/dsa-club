"use client";

import React, { useRef, useEffect, useState } from "react";
import type { ResolvedMissionState } from "./mission-state-resolver";
import { ContentRenderer } from "./content-renderer";
import {
  PatternRecognitionStage,
  PracticeStage,
  MasteryProofStage,
  ReflectionStage,
} from "./interactive-stages";
import { cn } from "@/lib/utils";

export interface MissionReaderProps {
  missionId: string;
  state: ResolvedMissionState;
  missionTitle: string;
  onAdvance?: () => void;
  className?: string;
}

export function MissionReader({
  missionId,
  state,
  missionTitle,
  onAdvance,
  className,
}: MissionReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const {
    selectedStage,
    selectedStageNumber,
    totalStages,
    selectedStageTitle,
    isViewingCompleted,
  } = state;

  // Find the actual scroll container (the <main> with overflow-y-auto in AppLayout)
  const getScrollContainer = (): HTMLElement | null => {
    if (typeof window === "undefined") return null;
    // Walk up from the reader to find the nearest overflow-y scroll container
    let el = containerRef.current?.parentElement;
    while (el) {
      const style = getComputedStyle(el);
      if (style.overflowY === "auto" || style.overflowY === "scroll") {
        return el;
      }
      el = el.parentElement;
    }
    return document.documentElement;
  };

  // Local-only scroll progress calculation (zero database writes)
  useEffect(() => {
    const scrollEl = getScrollContainer();
    if (!scrollEl) return;

    const handleScroll = () => {
      const totalHeight = scrollEl.scrollHeight - scrollEl.clientHeight;
      if (totalHeight > 0) {
        const progress = Math.min(Math.max((scrollEl.scrollTop / totalHeight) * 100, 0), 100);
        setScrollProgress(progress);
      }
    };

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [selectedStage.key]);

  // Restore saved scroll position for this stage from localStorage
  useEffect(() => {
    const scrollEl = getScrollContainer();
    if (!scrollEl) return;

    try {
      const savedY = localStorage.getItem(`mission-${missionId}-stage-${selectedStage.key}-scrollY`);
      if (savedY) {
        scrollEl.scrollTop = Number(savedY);
      } else {
        scrollEl.scrollTop = 0;
      }
    } catch {
      // localStorage disabled fallback
    }

    const savePosition = () => {
      try {
        localStorage.setItem(`mission-${missionId}-stage-${selectedStage.key}-scrollY`, String(scrollEl.scrollTop));
      } catch {
        // ignore
      }
    };

    window.addEventListener("beforeunload", savePosition);
    return () => {
      savePosition();
      window.removeEventListener("beforeunload", savePosition);
    };
  }, [missionId, selectedStage.key]);

  return (
    <article
      ref={containerRef}
      className={cn("min-w-0 flex-1 space-y-5 pb-6", className)}
      aria-labelledby="current-stage-title"
    >
      {/* ── Reading Progress Bar (Subtle Hairline) ── */}
      <div
        className="sticky top-0 z-30 h-[2px] w-full bg-(--color-surface-2) overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* ── Stage Title & Section Header (Directly on canvas) ── */}
      <div className="space-y-2 pt-1 pb-4 border-b border-(--color-border)">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 text-cyan-400 font-bold tracking-wider uppercase">
            Stage {selectedStageNumber} of {totalStages}
          </span>
          <span className="text-(--color-border)">·</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-(--color-surface-2) px-2 py-0.5 text-[11px] font-medium capitalize text-(--color-text-muted) border border-(--color-border)">
            {selectedStage.kind.replace(/_/g, " ")}
          </span>
          {isViewingCompleted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-400/20">
              ✓ Completed
            </span>
          )}
        </div>

        <h2
          id="current-stage-title"
          className="text-2xl sm:text-3xl font-extrabold tracking-tight text-(--color-text-primary) leading-tight"
        >
          {selectedStageTitle}
        </h2>
      </div>

      {/* ── Stage Reading Content (Un-boxed, open, comfortable reading width) ── */}
      <div className="pt-1">
        <ContentRenderer
          content={selectedStage.content}
          kind={selectedStage.kind}
          stageTitle={selectedStageTitle}
        />
      </div>

      {/* ── Interactive Stages (Pattern, Practice, Mastery, Reflection) ── */}
      {selectedStage.kind === "pattern" && (
        <PatternRecognitionStage
          missionId={missionId}
          stage={selectedStage}
          onAdvance={onAdvance}
        />
      )}

      {selectedStage.kind === "practice" && (
        <PracticeStage
          missionId={missionId}
          stage={selectedStage}
          onAdvance={onAdvance}
        />
      )}

      {selectedStage.kind === "mastery" && (
        <MasteryProofStage
          missionId={missionId}
          stage={selectedStage}
          onAdvance={onAdvance}
        />
      )}

      {selectedStage.kind === "reflection" && (
        <ReflectionStage
          missionId={missionId}
          stage={selectedStage}
          onAdvance={onAdvance}
        />
      )}
    </article>
  );
}

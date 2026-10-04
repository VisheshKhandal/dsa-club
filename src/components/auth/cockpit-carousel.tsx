"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useReducedMotion } from "framer-motion";
import {
  BookOpen,
  GitBranch,
  RefreshCw,
  Target,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";

export type CockpitCard = {
  id: string;
  badge: string;
  badgeColor: "purple" | "amber" | "cyan" | "emerald";
  tag: string;
  title: string;
  subtext: string;
  highlight: string;
  highlightColor: string;
  metricLabel: string;
  metricValue: string;
  metricPercent: number;
  gradient: string;
  icon: "learn" | "practice" | "recognize" | "revise" | "progress";
};

export const COCKPIT_CARDS: CockpitCard[] = [
  {
    id: "learn",
    badge: "LEARN",
    badgeColor: "cyan",
    tag: "Core Concept",
    title: "Guided Mission",
    subtext: "Binary Trees",
    highlight: "Tree Traversals",
    highlightColor: "text-(--accent-lime)",
    metricLabel: "Concept Readiness",
    metricValue: "Ready",
    metricPercent: 100,
    gradient: "from-(--accent-lime) to-(--accent-lime-dark)",
    icon: "learn",
  },
  {
    id: "practice",
    badge: "PRACTICE",
    badgeColor: "cyan",
    tag: "Focused Mission",
    title: "Today's Mission",
    subtext: "Solve one focused problem",
    highlight: "Pattern Recognition",
    highlightColor: "text-(--accent-lime)",
    metricLabel: "Progress",
    metricValue: "3 of 5",
    metricPercent: 60,
    gradient: "from-(--accent-lime) to-(--accent-lime-dark)",
    icon: "practice",
  },
  {
    id: "recognize",
    badge: "RECOGNIZE",
    badgeColor: "purple",
    tag: "Core Logic",
    title: "Pattern Detected",
    subtext: "Two Pointers",
    highlight: "Sliding Window",
    highlightColor: "text-(--accent-lime)",
    metricLabel: "Pattern Confidence",
    metricValue: "High",
    metricPercent: 92,
    gradient: "from-(--accent-lime) to-(--accent-lime-dark)",
    icon: "recognize",
  },
  {
    id: "revise",
    badge: "REVISE",
    badgeColor: "amber",
    tag: "Spaced Repetition",
    title: "Revision Due",
    subtext: "Arrays & Hashing",
    highlight: "Review Now",
    highlightColor: "text-(--accent-lime)",
    metricLabel: "Memory State",
    metricValue: "Due Today",
    metricPercent: 100,
    gradient: "from-(--accent-lime) to-(--accent-lime-dark)",
    icon: "revise",
  },
  {
    id: "progress",
    badge: "PROGRESS",
    badgeColor: "emerald",
    tag: "Growth",
    title: "Learning Momentum",
    subtext: "This week",
    highlight: "Binary Trees",
    highlightColor: "text-(--accent-lime)",
    metricLabel: "Completed",
    metricValue: "6 focused sessions",
    metricPercent: 80,
    gradient: "from-(--accent-lime) to-(--accent-lime-dark)",
    icon: "progress",
  },
];

function CardIcon({ type }: { type: CockpitCard["icon"] }) {
  switch (type) {
    case "learn":
      return (
        <div className="relative grid size-11 place-items-center rounded-2xl border border-(--accent-lime)/30 bg-(--accent-lime)/10 text-(--accent-lime) shadow-[0_0_16px_rgba(183,243,107,0.15)]">
          <BookOpen size={20} className="animate-icon-branch" />
        </div>
      );
    case "practice":
      return (
        <div className="relative grid size-11 place-items-center rounded-2xl border border-(--accent-lime)/30 bg-(--accent-lime)/10 text-(--accent-lime) shadow-[0_0_16px_rgba(183,243,107,0.15)]">
          <Target size={20} className="animate-icon-radar" />
        </div>
      );
    case "recognize":
      return (
        <div className="relative grid size-11 place-items-center rounded-2xl border border-(--accent-lime)/30 bg-(--accent-lime)/10 text-(--accent-lime) shadow-[0_0_16px_rgba(183,243,107,0.15)]">
          <GitBranch size={20} className="animate-icon-branch" />
        </div>
      );
    case "revise":
      return (
        <div className="relative grid size-11 place-items-center rounded-2xl border border-(--accent-lime)/30 bg-(--accent-lime)/10 text-(--accent-lime) shadow-[0_0_16px_rgba(183,243,107,0.15)]">
          <RefreshCw size={20} className="animate-icon-rotate" />
        </div>
      );
    case "progress":
      return (
        <div className="relative grid size-11 place-items-center rounded-2xl border border-(--accent-lime)/30 bg-(--accent-lime)/10 text-(--accent-lime) shadow-[0_0_16px_rgba(183,243,107,0.15)]">
          <TrendingUp size={20} className="animate-icon-float" />
        </div>
      );
  }
}

export function CockpitCarousel({
  onActiveCardChange,
  activeId,
}: {
  onActiveCardChange?: (card: CockpitCard) => void;
  activeId?: string;
}) {
  const reduceMotion = useReducedMotion();
  const N = COCKPIT_CARDS.length;

  const [activeIndex, setActiveIndex] = useState(0);
  const [isHoveredOrFocused, setIsHoveredOrFocused] = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);

  // Keep callback in a ref to avoid triggering effects when the callback identity changes
  const onActiveCardChangeRef = useRef(onActiveCardChange);
  useEffect(() => {
    onActiveCardChangeRef.current = onActiveCardChange;
  }, [onActiveCardChange]);

  // Sync activeIndex with external activeId if provided
  useEffect(() => {
    if (activeId) {
      const idx = COCKPIT_CARDS.findIndex((c) => c.id === activeId);
      if (idx !== -1) {
        setActiveIndex((prev) => (prev === idx ? prev : idx));
      }
    }
  }, [activeId]);

  // Inactivity resume timer reference
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Magnetic cursor physics state
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Notify parent only when activeIndex actually changes
  const lastReportedIndexRef = useRef<number | null>(null);
  useEffect(() => {
    if (lastReportedIndexRef.current !== activeIndex) {
      lastReportedIndexRef.current = activeIndex;
      onActiveCardChangeRef.current?.(COCKPIT_CARDS[activeIndex]);
    }
  }, [activeIndex]);

  const advanceNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % N);
  }, [N]);

  const advancePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + N) % N);
  }, [N]);

  // Pause helper with optional grace period
  const triggerPause = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
    setIsHoveredOrFocused(true);
  }, []);

  const triggerResumeWithDelay = useCallback((delayMs = 3000) => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }
    resumeTimeoutRef.current = setTimeout(() => {
      setIsHoveredOrFocused(false);
      resumeTimeoutRef.current = null;
    }, delayMs);
  }, []);

  // Automatic 4.5-second rotation (paused on interaction or reduced motion)
  useEffect(() => {
    if (isHoveredOrFocused || isManuallyPaused || reduceMotion) return;
    const timer = setInterval(advanceNext, 4500);
    return () => clearInterval(timer);
  }, [isHoveredOrFocused, isManuallyPaused, reduceMotion, advanceNext]);

  const rafRef = useRef<number | null>(null);

  // Cleanup timers and animation frames on unmount
  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Subtle magnetic cursor movement handler (throttled to animation frames)
  // Max translation: 3-4px, max rotation: 2-3 degrees
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height - 0.5) * 2));

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setCursorPos({ x, y });
    });
  };

  const handleMouseEnter = () => {
    triggerPause();
  };

  const handleMouseLeave = () => {
    setCursorPos(null);
    triggerResumeWithDelay(2500);
  };

  const handleFocusIn = () => {
    triggerPause();
  };

  const handleFocusOut = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      triggerResumeWithDelay(2500);
    }
  };

  const handleTouchStart = () => {
    triggerPause();
  };

  const toggleManualPause = () => {
    setIsManuallyPaused((prev) => !prev);
  };

  const handleCardClick = (idx: number) => {
    setActiveIndex(idx);
    triggerPause();
    triggerResumeWithDelay(4000);
  };

  const handleDotClick = (idx: number) => {
    setActiveIndex(idx);
    triggerPause();
    triggerResumeWithDelay(4000);
  };

  const activeCard = COCKPIT_CARDS[activeIndex];

  return (
    <div
      className="relative space-y-3"
      onFocusCapture={handleFocusIn}
      onBlurCapture={handleFocusOut}
      onTouchStart={handleTouchStart}
    >
      {/* Header with status badge & playback controls */}
      <div className="flex items-center justify-between">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-(--accent-lime)">
          Adaptive Curriculum Engine
        </div>

        {/* Compact accessible manual navigation buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={advancePrev}
            aria-label="Previous learning stage card"
            className="flex size-6 items-center justify-center rounded-lg border border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-muted) transition hover:border-(--border-strong) hover:text-(--text-primary) focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--accent-lime) cursor-pointer"
          >
            <ChevronLeft size={13} />
          </button>

          <button
            type="button"
            onClick={toggleManualPause}
            aria-label={isManuallyPaused ? "Resume card auto-rotation" : "Pause card auto-rotation"}
            aria-pressed={isManuallyPaused}
            className="flex size-6 items-center justify-center rounded-lg border border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-muted) transition hover:border-(--border-strong) hover:text-(--text-primary) focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--accent-lime) cursor-pointer"
          >
            {isManuallyPaused ? <Play size={11} /> : <Pause size={11} />}
          </button>

          <button
            type="button"
            onClick={advanceNext}
            aria-label="Next learning stage card"
            className="flex size-6 items-center justify-center rounded-lg border border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-muted) transition hover:border-(--border-strong) hover:text-(--text-primary) focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--accent-lime) cursor-pointer"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Screen reader live announcement */}
      <div className="sr-only" aria-live="polite">
        Showing learning card {activeIndex + 1} of {N}: {activeCard.badge} — {activeCard.title}
      </div>

      {/* Layered Perspective / Reduced Motion Carousel Container */}
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        className="relative flex h-[270px] w-full items-center justify-center overflow-visible py-2"
        style={reduceMotion ? undefined : { perspective: 1200 }}
      >
        {COCKPIT_CARDS.map((card, idx) => {
          // Circular relative offset between -2 and 2
          let diff = (idx - activeIndex) % N;
          if (diff < -Math.floor(N / 2)) diff += N;
          if (diff > Math.floor(N / 2)) diff -= N;

          const isActive = diff === 0;
          const isLeft = diff === -1;
          const isRight = diff === 1;
          const isHidden = Math.abs(diff) >= 2;

          // Reduced Motion fallback: single active card with simple fade
          if (reduceMotion) {
            return (
              <div
                key={card.id}
                className="absolute inset-x-0 mx-auto h-[240px] w-[260px] rounded-[22px] border p-5 backdrop-blur-2xl sm:w-[276px] transition-opacity duration-200"
                style={{
                  opacity: isActive ? 1 : 0,
                  pointerEvents: isActive ? "auto" : "none",
                  backgroundColor: "rgba(23, 33, 43, 0.95)",
                  borderColor: "rgba(183, 243, 107, 0.45)",
                  boxShadow: "0 12px 32px rgba(0,0,0,0.55)",
                }}
              >
                {/* Top Badge and Tag */}
                <div className="relative z-10 flex items-center justify-between gap-2">
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase border border-(--accent-lime)/30 bg-(--accent-lime)/10 text-(--accent-lime)">
                    {card.badge}
                  </span>
                  <span className="rounded-md border border-(--border-subtle) bg-(--bg-surface) px-2.5 py-0.5 text-[11px] font-medium text-(--text-secondary)">
                    {card.tag}
                  </span>
                </div>

                {/* Card Icon */}
                <div className="relative z-10 mt-3.5">
                  <CardIcon type={card.icon} />
                </div>

                {/* Titles & Highlights */}
                <div className="relative z-10 mt-3 space-y-0.5">
                  <h3 className="text-[15px] font-bold tracking-tight text-(--text-primary) sm:text-base">
                    {card.title}
                  </h3>
                  <p className="text-xs text-(--text-muted) font-normal">{card.subtext}</p>
                  <p className="text-xs font-semibold sm:text-sm text-(--accent-lime)">
                    {card.highlight}
                  </p>
                </div>

                {/* Bottom Metric & Progress Bar */}
                <div className="relative z-10 mt-3.5 space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-(--text-secondary)">{card.metricLabel}</span>
                    <span className="font-semibold text-(--accent-lime)">
                      {card.metricValue}
                    </span>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-(--bg-surface) border border-(--border-subtle)">
                    <div
                      className="h-full rounded-full bg-(--accent-lime)"
                      style={{ width: `${card.metricPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          }

          // Full 3D subtle motion experience
          const hasCursor = cursorPos !== null && !reduceMotion;

          // Layered positioning
          let xOffset = 0;
          let zOffset = 0;
          let baseScale = 0.85;
          let baseRotateY = 0;
          let opacity = 0;
          let zIndex = 0;

          if (isActive) {
            xOffset = 0;
            zOffset = 30;
            baseScale = 1.04;
            baseRotateY = 0;
            opacity = 1;
            zIndex = 20;
          } else if (isLeft) {
            xOffset = -155;
            zOffset = -20;
            baseScale = 0.88;
            baseRotateY = 12;
            opacity = 0.55;
            zIndex = 10;
          } else if (isRight) {
            xOffset = 155;
            zOffset = -20;
            baseScale = 0.88;
            baseRotateY = -12;
            opacity = 0.55;
            zIndex = 10;
          } else {
            xOffset = diff < 0 ? -260 : 260;
            zOffset = -80;
            baseScale = 0.72;
            baseRotateY = diff < 0 ? 20 : -20;
            opacity = 0;
            zIndex = 1;
          }

          // Apply subtle magnetic physics (max 3-4px translation, 2-3 deg rotation)
          let finalTx = xOffset;
          let finalTy = 0;
          let finalRx = 0;
          let finalRy = baseRotateY;
          let spotlightStyle = "";

          if (hasCursor && !isHidden) {
            if (isActive) {
              finalTx += cursorPos.x * 3.5;
              finalTy += cursorPos.y * 2.5;
              finalRx = -cursorPos.y * 2.2;
              finalRy += cursorPos.x * 2.8;
              spotlightStyle = `radial-gradient(circle at ${50 + cursorPos.x * 30}% ${
                50 + cursorPos.y * 30
              }%, rgba(183,243,107,0.07) 0%, transparent 65%)`;
            } else {
              finalTx += cursorPos.x * 1.0;
              finalTy += cursorPos.y * 0.8;
              finalRx = -cursorPos.y * 0.8;
              finalRy += cursorPos.x * 0.8;
            }
          }

          return (
            <div
              key={card.id}
              onClick={() => {
                if (!isActive) handleCardClick(idx);
              }}
              className={`absolute h-[240px] w-[260px] select-none rounded-[22px] border p-5 backdrop-blur-2xl transition-all sm:w-[276px] ${
                isActive ? "cursor-default" : "cursor-pointer hover:opacity-80"
              }`}
              style={{
                transform: `translate3d(${finalTx}px, ${finalTy}px, ${zOffset}px) scale(${baseScale}) rotateX(${finalRx}deg) rotateY(${finalRy}deg)`,
                transformStyle: "preserve-3d",
                zIndex,
                opacity,
                pointerEvents: isHidden ? "none" : "auto",
                transition: hasCursor && isActive
                  ? "transform 100ms ease-out, opacity 450ms ease, border-color 300ms ease, box-shadow 300ms ease"
                  : "transform 600ms cubic-bezier(0.16, 1, 0.3, 1), opacity 550ms ease, border-color 400ms ease, box-shadow 400ms ease",
                backgroundColor: isActive ? "rgba(23, 33, 43, 0.95)" : "rgba(18, 25, 34, 0.85)",
                borderColor: isActive ? "rgba(183, 243, 107, 0.45)" : "rgba(36, 49, 59, 0.9)",
                boxShadow: isActive
                  ? "0 24px 60px -10px rgba(0,0,0,0.85), 0 0 28px rgba(183,243,107,0.18)"
                  : "0 12px 32px rgba(0,0,0,0.55)",
              }}
            >
              {/* Dynamic Specular / Ambient Highlight */}
              <div
                className="pointer-events-none absolute inset-0 rounded-[22px] opacity-90 transition-opacity duration-300"
                style={{
                  background:
                    spotlightStyle ||
                    "linear-gradient(135deg, rgba(183,243,107,0.04) 0%, transparent 60%)",
                }}
              />

              {/* Top Badge and Tag */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase border border-(--accent-lime)/30 bg-(--accent-lime)/10 text-(--accent-lime)">
                  {card.badge}
                </span>

                <span className="rounded-md border border-(--border-subtle) bg-(--bg-surface) px-2.5 py-0.5 text-[11px] font-medium text-(--text-secondary)">
                  {card.tag}
                </span>
              </div>

              {/* Card Icon */}
              <div className="relative z-10 mt-3.5">
                <CardIcon type={card.icon} />
              </div>

              {/* Titles & Highlights */}
              <div className="relative z-10 mt-3 space-y-0.5">
                <h3 className="text-[15px] font-bold tracking-tight text-(--text-primary) sm:text-base">
                  {card.title}
                </h3>
                <p className="text-xs text-(--text-muted) font-normal">{card.subtext}</p>
                <p className="text-xs font-semibold sm:text-sm text-(--accent-lime)">
                  {card.highlight}
                </p>
              </div>

              {/* Bottom Metric & Progress Bar */}
              <div className="relative z-10 mt-3.5 space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-(--text-secondary)">{card.metricLabel}</span>
                  <span className="font-semibold text-(--accent-lime)">
                    {card.metricValue}
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-(--bg-surface) border border-(--border-subtle)">
                  <div
                    className="h-full rounded-full bg-(--accent-lime) transition-all duration-700 ease-out"
                    style={{ width: `${card.metricPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Indicator Dots with Accessible Labels */}
      <div className="flex items-center justify-center gap-2 pt-1" role="tablist" aria-label="Curriculum stage cards">
        {COCKPIT_CARDS.map((card, idx) => {
          const isActive = idx === activeIndex;
          const stageName = card.badge.charAt(0) + card.badge.slice(1).toLowerCase();
          return (
            <button
              key={card.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Jump to ${stageName} card`}
              onClick={() => handleDotClick(idx)}
              className="group relative flex h-5 min-w-[28px] items-center justify-center px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime) cursor-pointer"
            >
              <span
                className={`block h-1.5 rounded-full transition-all duration-300 ease-out ${
                  isActive
                    ? "w-8 bg-(--accent-lime) shadow-[0_0_12px_rgba(183,243,107,0.6)]"
                    : "w-2 bg-(--border-strong) group-hover:bg-(--accent-lime)/60"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useReducedMotion } from "framer-motion";
import { BookOpen, GitBranch, RefreshCw, Target, TrendingUp } from "lucide-react";

export type JourneyStageId = "learn" | "practice" | "recognize" | "revise" | "progress";

interface StageNode {
  id: JourneyStageId;
  label: string;
  icon: typeof BookOpen;
  xPercent: number;
  yPx: number;
}

const STAGES: StageNode[] = [
  { id: "learn", label: "Learn", icon: BookOpen, xPercent: 8, yPx: 38 },
  { id: "practice", label: "Practice", icon: Target, xPercent: 28, yPx: 28 },
  { id: "recognize", label: "Recognize", icon: GitBranch, xPercent: 50, yPx: 42 },
  { id: "revise", label: "Revise", icon: RefreshCw, xPercent: 72, yPx: 30 },
  { id: "progress", label: "Progress", icon: TrendingUp, xPercent: 92, yPx: 36 },
];

export function CurriculumJourneyWave({
  activeStageId = "learn",
  onSelectStage,
}: {
  activeStageId?: JourneyStageId;
  onSelectStage?: (id: JourneyStageId) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState<JourneyStageId>(activeStageId);

  useEffect(() => {
    if (activeStageId) {
      setActive((prev) => (prev === activeStageId ? prev : activeStageId));
    }
  }, [activeStageId]);

  const handleSelect = (id: JourneyStageId) => {
    setActive(id);
    onSelectStage?.(id);
  };

  const wavePath = "M 48 38 C 100 12, 120 48, 168 28 C 220 10, 260 55, 300 42 C 350 26, 390 15, 432 30 C 475 46, 510 20, 552 36";

  return (
    <div className="relative w-full py-2">
      {/* Wave SVG Container */}
      <div className="relative h-[86px] w-full">
        <svg
          className="absolute inset-0 h-full w-full overflow-visible"
          viewBox="0 0 600 75"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="journeyWaveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#B7F36B" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#A3E635" stopOpacity="1" />
              <stop offset="100%" stopColor="#B7F36B" stopOpacity="0.85" />
            </linearGradient>
            <filter id="waveGlow" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Subdued background guide path */}
          <path
            d={wavePath}
            fill="none"
            stroke="rgba(183,243,107,0.15)"
            strokeWidth="2"
          />

          {/* Ambient luminous glow wave */}
          <path
            d={wavePath}
            fill="none"
            stroke="url(#journeyWaveGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#waveGlow)"
            opacity="0.32"
          />

          {/* Continuously animated flowing dashed path (static if reduced motion) */}
          <path
            d={wavePath}
            fill="none"
            stroke="url(#journeyWaveGradient)"
            strokeWidth="2"
            strokeDasharray="6 6"
            strokeLinecap="round"
            className={reduceMotion ? "" : "animate-wave-dash"}
          />
        </svg>

        {/* 5 Journey Nodes */}
        {STAGES.map((node) => {
          const Icon = node.icon;
          const isActive = node.id === active;

          return (
            <div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
              style={{
                left: `${node.xPercent}%`,
                top: `${node.yPx}px`,
              }}
            >
              <button
                type="button"
                onClick={() => handleSelect(node.id)}
                aria-label={`Select stage ${node.label}`}
                className="group relative grid size-10 place-items-center rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime) cursor-pointer sm:size-11"
              >
                {/* Active Ripple / Halo Wave Ping (disabled in reduced motion) */}
                {isActive && !reduceMotion && (
                  <span
                    className="pointer-events-none absolute -inset-2 rounded-full border border-(--accent-lime)/40 animate-radar-ping"
                    aria-hidden="true"
                  />
                )}

                {/* Concentric Glow Ring */}
                {isActive && (
                  <span
                    className="pointer-events-none absolute -inset-1 rounded-full bg-(--accent-lime)/15 blur-sm"
                    aria-hidden="true"
                  />
                )}

                {/* Node Surface */}
                <div
                  className={`relative grid size-full place-items-center rounded-full transition-all duration-300 ${
                    isActive
                      ? "border-2 border-(--accent-lime) bg-(--bg-surface) text-(--accent-lime) shadow-[0_0_24px_rgba(183,243,107,0.35)] scale-110"
                      : "border border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-muted) shadow-[0_4px_16px_rgba(0,0,0,0.5)] group-hover:border-(--border-strong) group-hover:text-(--text-secondary) group-hover:scale-105"
                  }`}
                >
                  <Icon size={17} className="transition-transform duration-200 group-hover:scale-110" />
                </div>
              </button>

              {/* Node Text Label */}
              <span
                className={`mt-1.5 block text-center text-xs transition-colors duration-200 ${
                  isActive
                    ? "font-bold text-(--accent-lime)"
                    : "font-medium text-(--text-muted)"
                }`}
              >
                {node.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

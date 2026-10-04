"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Clock3,
  Layers3,
  Loader2,
  Play,
  Sparkles,
} from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SlideFade } from "@/components/motion";
import { learnerStepTitle, RationaleList, SectionLabel } from "./dashboard-shared";

interface MissionHeroCardProps {
  activeMission: any;
  missionProgress: number;
  missionCta: string;
  missionHref: string;
  currentStage: number;
  journey: any[];
  rationale: string[];
  whyOpen: boolean;
  onToggleWhy: () => void;
  onMissionClick: () => void;
}

export function MissionHeroCard({
  activeMission,
  missionProgress,
  missionCta,
  missionHref,
  currentStage,
  journey,
  rationale,
  whyOpen,
  onToggleWhy,
  onMissionClick,
}: MissionHeroCardProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPos = useRef({ x: 0, y: 0 });

  const handleCardMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pendingPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const spot = spotlightRef.current;
      if (!spot) return;
      spot.style.background = `radial-gradient(420px circle at ${pendingPos.current.x}px ${pendingPos.current.y}px, rgba(168,85,247,0.22), transparent 75%)`;
    });
  }, []);

  const stepHint =
    activeMission.nextStage?.title ??
    activeMission.stageTitle ??
    "Continue building on what you learned last time.";

  return (
    <div
      onMouseMove={handleCardMouseMove}
      className="group relative overflow-hidden will-change-transform"
    >
      <div
        ref={spotlightRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative bg-[radial-gradient(ellipse_80%_60%_at_100%_0%,rgba(124,58,237,0.08),transparent_55%)] p-5 sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-40 w-40 bg-[radial-gradient(circle,rgba(124,58,237,0.10),transparent_68%)]"
        />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-(--color-text-secondary)">
              <SectionLabel>Today’s mission</SectionLabel>
              <span aria-hidden>·</span>
              <span>Current step: {learnerStepTitle(activeMission.nextStage ?? activeMission)}</span>
              <span aria-hidden>·</span>
              <span>{activeMission.topic}</span>
            </div>
            <h2 id="today-heading" className="mt-4 max-w-3xl text-[22px] font-bold leading-snug tracking-[-0.025em] text-(--color-text-primary) sm:text-2xl">
              {activeMission.title}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-(--color-text-secondary)">{stepHint}</p>
            <div className="mt-5 max-w-xl">
              <ProgressBar value={missionProgress} color="var(--color-purple, #8b5cf6)" size="sm" showLabel />
              <p className="mt-2 text-xs text-(--color-text-muted)">{missionProgress}% complete</p>
            </div>
            {rationale.length > 0 && (
              <div className="mt-4 max-w-xl rounded-lg bg-(--color-surface-2)/80 px-3 py-2.5">
                <button
                  type="button"
                  onClick={onToggleWhy}
                  aria-expanded={whyOpen}
                  className="flex w-full items-center justify-between gap-3 text-left text-xs font-semibold text-(--color-purple) hover:opacity-90"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles size={13} className="text-(--color-purple)" aria-hidden />
                    Why this mission?
                  </span>
                  <ChevronDown size={14} className={`transition-transform duration-150 ${whyOpen ? "rotate-180" : ""}`} />
                </button>
                {!whyOpen && (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-(--color-text-secondary)">{rationale[0]}</p>
                )}
                <SlideFade open={whyOpen}>
                  <RationaleList reasons={rationale} />
                </SlideFade>
              </div>
            )}
            {journey.length > 0 && (
              <div className="mt-5" aria-label="Mission step progress">
                <div className="flex max-w-xl items-center gap-1.5">
                  {journey.map((step: any, index: number) => {
                    const completed = step.state === "completed";
                    const current = step.state === "current";
                    return (
                      <span
                        key={step.key}
                        title={`Step ${index + 1}: ${learnerStepTitle(step)}`}
                        className={`h-1.5 min-w-2 flex-1 rounded-full transition-colors duration-200 ${
                          completed
                            ? "bg-emerald-500"
                            : current
                              ? "bg-(--color-purple) shadow-[0_0_8px_rgba(124,58,237,0.45)]"
                              : "bg-(--color-surface-3)"
                        }`}
                      />
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-(--color-text-secondary)">
                  <span className="font-semibold text-(--color-purple)">
                    {learnerStepTitle(activeMission.nextStage ?? journey[currentStage - 1])}
                  </span>
                  <span className="mx-1.5 text-(--color-text-muted)" aria-hidden>
                    ·
                  </span>
                  {journey.length} learning steps in this mission
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-5 lg:block">
            <div className="flex items-center gap-2 text-xs text-(--color-text-secondary) lg:mb-4">
              <Clock3 size={14} className="text-(--color-purple)" aria-hidden />~{activeMission.estimatedMinutes ?? 45} min
            </div>
            <Link
              href={missionHref}
              onClick={() => {
                setIsNavigating(true);
                onMissionClick?.();
              }}
              className={`group/btn inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-(--color-purple) px-5 text-sm font-semibold text-white shadow-md transition duration-150 hover:-translate-y-px hover:opacity-95 active:translate-y-0 ${
                isNavigating ? "opacity-80 pointer-events-none" : ""
              }`}
            >
              {isNavigating ? (
                <Loader2 size={14} className="animate-spin" aria-hidden />
              ) : (
                <Play size={14} fill="currentColor" aria-hidden />
              )}
              {isNavigating ? "Opening..." : missionCta}
              <kbd className="ml-1 hidden items-center rounded border border-white/30 bg-white/20 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white/90 md:inline-flex">
                Space
              </kbd>
              <ArrowRight size={15} className="transition-transform duration-150 group-hover/btn:translate-x-1" aria-hidden />
            </Link>
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap items-center gap-5 pt-1 text-xs text-(--color-text-secondary)">
          <span className="inline-flex items-center gap-1.5">
            <BookOpen size={14} className="text-(--color-purple)" aria-hidden />
            Step {Math.max(1, currentStage)} of {journey.length || activeMission.totalSteps || 1}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Layers3 size={14} className="text-(--color-purple)" aria-hidden />
            {activeMission.learningPathContext || "Learning path"}
          </span>
        </div>
      </div>
    </div>
  );
}

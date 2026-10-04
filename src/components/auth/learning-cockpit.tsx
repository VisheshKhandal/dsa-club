"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { GitBranch, RefreshCw, Target } from "lucide-react";
import { CockpitCarousel, type CockpitCard } from "@/components/auth/cockpit-carousel";
import { CurriculumJourneyWave, type JourneyStageId } from "@/components/auth/curriculum-journey-wave";

export function LearningCockpit() {
  const [activeStage, setActiveStage] = useState<JourneyStageId>("learn");

  const handleActiveCardChange = useCallback((card: CockpitCard) => {
    setActiveStage((prev) => (prev === card.id ? prev : (card.id as JourneyStageId)));
  }, []);

  const handleSelectStage = useCallback((id: JourneyStageId) => {
    setActiveStage((prev) => (prev === id ? prev : id));
  }, []);

  return (
    <section
      aria-label="Adaptive Curriculum Cockpit"
      className="relative hidden lg:flex h-full flex-col justify-between overflow-hidden border-r border-(--border-subtle) bg-(--bg-surface) p-7 xl:p-9"
    >
      {/* Ambient background mesh glow (low-intensity lime) */}
      <div
        className="pointer-events-none absolute -left-20 -top-20 size-80 rounded-full bg-[radial-gradient(circle,rgba(183,243,107,0.05)_0%,transparent_70%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 right-10 size-80 rounded-full bg-[radial-gradient(circle,rgba(183,243,107,0.03)_0%,transparent_70%)]"
        aria-hidden="true"
      />

      {/* ── 1. Top Header: Clean Branding & Contextual Subtitle ─── */}
      <div className="relative z-10 flex flex-col items-start gap-1">
        <Link href="/" className="inline-block group focus-visible:outline-none">
          <Image
            src="/icons/dsa-club-logo-text.png"
            alt="DSA Club — Learn · Practice · Grow"
            width={220}
            height={70}
            className="object-contain"
            priority
          />
        </Link>
        <p className="pl-1 text-xs font-medium text-(--text-muted) tracking-wide">
          Adaptive curriculum & deliberate practice
        </p>
      </div>

      {/* ── 2. Unified Curriculum Engine: Carousel + Journey Wave ─── */}
      {/* Grouped together so the 3D card carousel sits directly above the animated dot wave with zero excess void */}
      <div className="relative z-10 my-auto flex flex-col justify-center gap-1 xl:gap-2 py-1">
        <CockpitCarousel activeId={activeStage} onActiveCardChange={handleActiveCardChange} />
        <CurriculumJourneyWave activeStageId={activeStage} onSelectStage={handleSelectStage} />
      </div>

      {/* ── 3. Bottom Product Signals (3 Compact Signals) ────────────── */}
      <div className="relative z-10 rounded-2xl border border-(--border-subtle) bg-(--bg-surface-raised) p-3 shadow-lg sm:flex sm:items-center sm:justify-between">
        {/* Signal 1: Structured paths */}
        <div className="flex items-center gap-2.5 px-3 py-1">
          <span className="grid size-8 place-items-center rounded-xl border border-(--accent-lime)/30 bg-(--accent-lime)/10 text-(--accent-lime)">
            <GitBranch size={16} />
          </span>
          <span className="text-xs font-semibold text-(--text-primary) xl:text-[13px]">
            Structured paths
          </span>
        </div>

        {/* Divider 1 */}
        <div className="hidden h-5 w-px bg-(--border-subtle) sm:block" />

        {/* Signal 2: Pattern-first practice */}
        <div className="flex items-center gap-2.5 px-3 py-1">
          <span className="grid size-8 place-items-center rounded-xl border border-(--accent-lime)/30 bg-(--accent-lime)/10 text-(--accent-lime)">
            <Target size={16} />
          </span>
          <span className="text-xs font-semibold text-(--text-primary) xl:text-[13px]">
            Pattern-first practice
          </span>
        </div>

        {/* Divider 2 */}
        <div className="hidden h-5 w-px bg-(--border-subtle) sm:block" />

        {/* Signal 3: Spaced review */}
        <div className="flex items-center gap-2.5 px-3 py-1">
          <span className="grid size-8 place-items-center rounded-xl border border-(--accent-lime)/30 bg-(--accent-lime)/10 text-(--accent-lime)">
            <RefreshCw size={16} />
          </span>
          <span className="text-xs font-semibold text-(--text-primary) xl:text-[13px]">
            Spaced review
          </span>
        </div>
      </div>
    </section>
  );
}

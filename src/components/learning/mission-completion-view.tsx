"use client";

import React from "react";
import Link from "next/link";
import { Check, Sparkles, BookOpen } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { RestartMissionButton } from "@/components/product/forms";

export interface MissionCompletionViewProps {
  missionTitle: string;
  missionId: string;
  topicName?: string;
  topicSlug?: string;
  totalStages: number;
  returnUrl: string;
  onReviewMission: () => void;
  isFromPlan?: boolean;
}

export function MissionCompletionView({
  missionTitle,
  missionId,
  topicName,
  totalStages,
  returnUrl,
  onReviewMission,
  isFromPlan = false,
}: MissionCompletionViewProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="py-16 px-4 text-center max-w-xl mx-auto space-y-6">
      <motion.div
        initial={shouldReduceMotion ? undefined : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-400/30 shadow-[0_0_30px_rgba(52,211,153,0.2)]"
      >
        <Check size={32} className="stroke-[2.5]" />
      </motion.div>

      <div className="space-y-2">
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
          <Sparkles size={14} />
          <span>Mission Mastered</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-(--color-text-primary)">
          {missionTitle}
        </h2>
        <p className="text-sm leading-relaxed text-(--color-text-secondary) max-w-md mx-auto">
          Outstanding work. You have mastered all {totalStages} stages of this mission and reinforced your algorithmic intuition.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link
          href={returnUrl}
          className="focus-ring inline-flex h-10 items-center justify-center rounded-(--radius-btn) bg-gradient-to-r from-emerald-600 to-teal-600 px-6 text-xs font-semibold text-white shadow-sm hover:from-emerald-500 hover:to-teal-500 transition-all"
        >
          <span>{isFromPlan ? "Return to Study Plan →" : "Continue Learning →"}</span>
        </Link>

        <button
          type="button"
          onClick={onReviewMission}
          className="focus-ring inline-flex h-10 items-center gap-2 rounded-(--radius-btn) border border-(--color-border) bg-(--color-surface-1) px-4 text-xs font-semibold text-(--color-text-primary) hover:bg-(--color-surface-2) transition-colors"
        >
          <BookOpen size={14} />
          <span>Review from Beginning</span>
        </button>
      </div>

      <div className="pt-4 text-xs text-(--color-text-muted)">
        <RestartMissionButton missionId={missionId} />
      </div>
    </div>
  );
}

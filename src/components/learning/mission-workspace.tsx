"use client";

import React, { useEffect, useState, useTransition, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Stage } from "@/features/platform/engines/learning.engine";
import type { LearningPathContext } from "@/features/learning-paths/types/learning-path-continuity.types";
import { resolveMissionState } from "./mission-state-resolver";
import { LearningPathContextBar } from "@/components/product/learning-path-context-bar";
import {
  completeMissionStepAction,
  finishMissionAction,
  recordMissionOpenAction,
} from "@/features/product/actions/product.actions";
import { MissionHeader } from "./mission-header";
import { MissionOutline } from "./mission-outline";
import { MissionReader } from "./mission-reader";
import { StageNavigation } from "./stage-navigation";
import { MissionCompletionView } from "./mission-completion-view";
import { AILearningDrawer } from "./ai-learning-drawer";


export interface MissionWorkspaceProps {
  missionTitle: string;
  missionId: string;
  topicName: string;
  topicSlug: string;
  stages: Stage[];
  activeStageKey: string | null;
  initialStageKey?: string | null;
  progress: number;
  learningPathContext?: LearningPathContext | null;
}

export function MissionWorkspace({
  missionTitle,
  missionId,
  topicName,
  topicSlug,
  stages,
  activeStageKey,
  initialStageKey,
  progress,
  learningPathContext,
}: MissionWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldReduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [pendingTransition, startTransition] = useTransition();

  // Resolve initial selected stage from URL query param `?step=...` or activeStageKey
  const queryStepKey = searchParams?.get("step");
  const defaultKey = queryStepKey || initialStageKey || activeStageKey || stages[0]?.key || null;
  const [selectedStageKey, setSelectedStageKey] = useState<string | null>(defaultKey);

  const isFromPlan = searchParams?.get("from") === "plan" || searchParams?.get("source") === "plan";

  useEffect(() => {
    setMounted(true);
    recordMissionOpenAction({ missionId }).catch(() => {});
  }, [missionId]);

  // Sync state if activeStageKey changes from server and no user selection made
  useEffect(() => {
    if (!selectedStageKey && activeStageKey) {
      setSelectedStageKey(activeStageKey);
    }
  }, [activeStageKey, selectedStageKey]);

  // Deep linking: keep URL query updated with current step
  const handleSelectStage = (stageKey: string) => {
    setSelectedStageKey(stageKey);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("step", stageKey);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Centralized single source of truth for all stage progression and navigation state
  const resolvedState = useMemo(
    () =>
      resolveMissionState({
        stages,
        selectedStageKey,
        activeStageKey,
        progress,
      }),
    [stages, selectedStageKey, activeStageKey, progress]
  );

  const {
    selectedStage,
    selectedStageIndex,
    selectedStageTitle,
    previousStage,
    nextStage,
    totalStages,
    completedStagesCount,
  } = resolvedState;

  const isInteractiveStage =
    selectedStage?.kind === "pattern" ||
    selectedStage?.kind === "practice" ||
    selectedStage?.kind === "mastery";
  const isInteractiveIncomplete =
    isInteractiveStage && selectedStage?.status !== "completed";

  const handlePreviousStage = () => {
    if (previousStage) {
      handleSelectStage(previousStage.key);
    }
  };

  const handleNextStage = () => {
    if (!selectedStage || pendingTransition) return;

    // Last stage: Finish Mission
    if (selectedStageIndex === totalStages - 1) {
      const finishUrl = isFromPlan
        ? "/plan"
        : (learningPathContext?.nextItem?.url ||
           learningPathContext?.backToStageUrl ||
           (topicSlug ? `/learn/topics/${topicSlug}` : "/learn"));

      startTransition(async () => {
        try {
          await finishMissionAction({ missionId, stepKey: selectedStage?.key });
        } catch (err) {
          console.error("Failed to finish mission:", err);
        }
        router.push(finishUrl);
        router.refresh();
      });
      return;
    }

    // Advance to next stage
    if (nextStage) {
      if (
        selectedStage.status !== "completed" &&
        !isInteractiveStage
      ) {
        // Non-interactive stage: complete it server-side then advance
        startTransition(async () => {
          await completeMissionStepAction({ missionId, stepKey: selectedStage.key });
          handleSelectStage(nextStage.key);
          router.refresh();
        });
      } else if (isInteractiveStage && selectedStage.status !== "completed") {
        // Interactive stage completed via its own form but server data hasn't refreshed yet.
        // Complete the step server-side and advance within a transition to avoid stale state.
        startTransition(async () => {
          try {
            await completeMissionStepAction({ missionId, stepKey: selectedStage.key });
          } catch {
            // Already completed by the interactive stage action — safe to ignore
          }
          handleSelectStage(nextStage.key);
          router.refresh();
        });
      } else {
        // Already completed stage — just navigate forward
        handleSelectStage(nextStage.key);
        router.refresh();
      }
    }
  };

  const returnUrl = isFromPlan
    ? "/plan"
    : (learningPathContext?.nextItem?.url ||
       learningPathContext?.backToStageUrl ||
       (topicSlug ? `/learn/topics/${topicSlug}` : "/learn"));

  // Bottom navigation content
  const navigationContent = (
    <StageNavigation
      state={resolvedState}
      onPreviousStage={handlePreviousStage}
      onNextStage={handleNextStage}
      isInteractiveIncomplete={isInteractiveIncomplete}
      pendingTransition={pendingTransition}
    />
  );

  const portalTarget =
    mounted && typeof document !== "undefined"
      ? document.getElementById("app-bottom-bar-portal")
      : null;

  return (
    <div className="w-full space-y-4 pb-4 pt-1 transition-all duration-200">
      {/* ── Path Continuity Context Layer ── */}
      {learningPathContext && (
        <LearningPathContextBar context={learningPathContext} className="mb-2" />
      )}

      {/* ── Editorial Mission Header (Directly on canvas, no card wrapper) ── */}
      <MissionHeader
        missionTitle={missionTitle}
        topicName={topicName}
        topicSlug={topicSlug}
        state={resolvedState}
        learningPathContext={learningPathContext}
        focusMode={focusMode}
        isFromPlan={isFromPlan}
        onToggleFocusMode={() => setFocusMode((p) => !p)}
        onOpenAI={() => setAiDrawerOpen(true)}
      />

      {/* ── Guided Reading Workspace (Outline + Reader) ── */}
      <div className="flex flex-col lg:flex-row items-start gap-5">
        {/* Sticky Mission Outline (Hidden in Focus Mode) */}
        {!focusMode && (
          <MissionOutline
            state={resolvedState}
            onSelectStage={handleSelectStage}
            missionId={missionId}
          />
        )}

        {/* Dominant Reading Area */}
        <main className="min-w-0 flex-1 w-full">
          <AnimatePresence mode="wait">
            {selectedStage ? (
              <motion.div
                key={selectedStage.key}
                initial={shouldReduceMotion ? undefined : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                <MissionReader
                  missionId={missionId}
                  state={resolvedState}
                  missionTitle={missionTitle}
                  onAdvance={handleNextStage}
                />
              </motion.div>
            ) : (
              <MissionCompletionView
                missionTitle={missionTitle}
                missionId={missionId}
                topicName={topicName}
                topicSlug={topicSlug}
                totalStages={totalStages}
                returnUrl={returnUrl}
                isFromPlan={isFromPlan}
                onReviewMission={() => handleSelectStage(stages[0].key)}
              />
            )}
          </AnimatePresence>

          {/* In-place fallback if portal target is not in DOM */}
          {!portalTarget && navigationContent}
        </main>
      </div>

      {/* ── Persistent Bottom Navigation Bar (Portaled to AppLayout) ── */}
      {portalTarget ? createPortal(navigationContent, portalTarget) : null}

      {/* ── Contextual AI Learning Drawer (Slide-over) ── */}
      <AILearningDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        missionId={missionId}
        missionTitle={missionTitle}
        stageTitle={selectedStageTitle}
        stageKind={selectedStage?.kind}
        topicName={topicName}
      />
    </div>
  );
}

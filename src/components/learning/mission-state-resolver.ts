import type { Stage } from "@/features/platform/engines/learning.engine";

export interface ResolveMissionStateParams {
  stages: Stage[];
  selectedStageKey?: string | null;
  activeStageKey?: string | null;
  progress?: number;
}

export interface ResolvedMissionState {
  stages: Stage[];
  totalStages: number;
  completedStagesCount: number;
  lockedStagesCount: number;

  // Frontier stage (the user's next unresolved learning step)
  frontierStageKey: string | null;
  frontierStageIndex: number;
  frontierStage: Stage | null;

  // Selected stage (the stage currently open in the reader)
  selectedStageKey: string;
  selectedStageIndex: number;
  selectedStageNumber: number; // 1-indexed (e.g. 6 for Stage 6 of 11)
  selectedStage: Stage;
  selectedStageTitle: string;

  // State flags for the currently viewed stage
  isViewingFrontier: boolean;
  isViewingCompleted: boolean;
  isViewingLocked: boolean;

  // Adjacent stage navigation
  nextStage: Stage | null;
  previousStage: Stage | null;
  canGoBack: boolean;
  canAdvance: boolean;

  // Unified single source of truth for progress percentage
  missionProgressPercent: number;
}

export function formatStageTitle(stage?: Stage | null): string {
  if (!stage) return "Stage";
  if (stage.title && stage.title.trim()) return stage.title.trim();
  return stage.kind
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Resolves the single source of truth for Mission progression and stage navigation state.
 * Eliminates contradictory stage numbers, titles, and completion percentages across all components.
 */
export function resolveMissionState({
  stages,
  selectedStageKey,
  activeStageKey,
  progress,
}: ResolveMissionStateParams): ResolvedMissionState {
  const safeStages = Array.isArray(stages) && stages.length > 0
    ? stages
    : [{ key: "intro", kind: "introduction" as const, title: "Introduction", status: "active" as const }];

  const totalStages = safeStages.length;
  const completedStagesCount = safeStages.filter((s) => s.status === "completed").length;
  const lockedStagesCount = safeStages.filter((s) => s.status === "locked").length;

  // 1. Identify learning frontier stage
  let frontierStageIndex = activeStageKey
    ? safeStages.findIndex((s) => s.key === activeStageKey)
    : -1;
  if (frontierStageIndex < 0) {
    frontierStageIndex = safeStages.findIndex((s) => s.status !== "completed");
  }
  if (frontierStageIndex < 0) {
    // All completed
    frontierStageIndex = safeStages.length - 1;
  }
  const frontierStage = safeStages[frontierStageIndex] ?? safeStages[0];
  const frontierStageKey = frontierStage?.key ?? null;

  // 2. Identify currently selected/viewed stage
  let selectedStageIndex = -1;
  if (selectedStageKey) {
    selectedStageIndex = safeStages.findIndex((s) => s.key === selectedStageKey);
  }
  // If invalid, fallback to frontier stage.
  // NOTE: We do NOT bounce locked stages to frontier here. The outline already prevents
  // clicking locked stages (disabled={isLocked}), and bouncing here causes a timing bug
  // when advancing from an interactive stage — the next stage is still "locked" in stale
  // client state, causing the user to get stuck. Let programmatic navigation proceed.
  if (selectedStageIndex < 0) {
    selectedStageIndex = frontierStageIndex;
  }
  const selectedStage = safeStages[selectedStageIndex] ?? safeStages[0];
  const resolvedSelectedKey = selectedStage.key;
  const selectedStageNumber = selectedStageIndex + 1;
  const selectedStageTitle = formatStageTitle(selectedStage);

  // 3. Flags
  const isViewingFrontier = resolvedSelectedKey === frontierStageKey;
  const isViewingCompleted = selectedStage.status === "completed";
  const isViewingLocked = selectedStage.status === "locked";

  // 4. Navigation targets
  const previousStage = selectedStageIndex > 0 ? safeStages[selectedStageIndex - 1] : null;
  const nextStage = selectedStageIndex < totalStages - 1 ? safeStages[selectedStageIndex + 1] : null;
  const canGoBack = selectedStageIndex > 0;
  const canAdvance = selectedStage.status === "completed";

  // 5. Unified progress calculation
  const calculatedPercent = Math.round((completedStagesCount / totalStages) * 100);
  const missionProgressPercent = typeof progress === "number" && progress >= 0
    ? Math.max(progress, calculatedPercent)
    : calculatedPercent;

  return {
    stages: safeStages,
    totalStages,
    completedStagesCount,
    lockedStagesCount,
    frontierStageKey,
    frontierStageIndex,
    frontierStage,
    selectedStageKey: resolvedSelectedKey,
    selectedStageIndex,
    selectedStageNumber,
    selectedStage,
    selectedStageTitle,
    isViewingFrontier,
    isViewingCompleted,
    isViewingLocked,
    nextStage,
    previousStage,
    canGoBack,
    canAdvance,
    missionProgressPercent,
  };
}

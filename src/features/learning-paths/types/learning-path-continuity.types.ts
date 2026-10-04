export type StageItemKind = "topic" | "pattern" | "problem" | "mission";

export interface LearningPathContextItem {
  kind: StageItemKind;
  id: string;
  slug: string;
  title: string;
  position: number;
  totalInKind: number;
  isCompleted?: boolean;
}

export interface LearningPathStageStats {
  totalProblems: number;
  solvedProblems: number;
  totalMissions: number;
  completedMissions: number;
  totalItems: number;
  completedItems: number;
}

export interface LearningPathNextItem {
  kind: StageItemKind | "stage" | "path_completed";
  id?: string;
  slug?: string;
  title: string;
  url: string;
  buttonLabel: string;
}

export interface LearningPathNextStage {
  order: number;
  title: string;
  url: string;
}

export interface LearningPathContext {
  // Path identity
  pathId: string;
  pathSlug: string;
  pathTitle: string;

  // Stage roadmap
  stageOrder: number;
  stageTitle: string;
  totalStages: number;
  stageProgress: number; // 0 - 100
  isStageCompleted: boolean;
  isPathCompleted: boolean;

  // Spatial awareness ("You Are Here")
  currentItem: LearningPathContextItem;

  // Progress metrics
  stageStats: LearningPathStageStats;

  // Progression resolver outputs
  nextItem: LearningPathNextItem | null;
  backToStageUrl: string;
  backToStageLabel: string;

  // Next stage unlock (if current stage is completed)
  nextStage?: LearningPathNextStage | null;
}

export interface ResumePointResult {
  pathId: string;
  pathSlug: string;
  pathTitle: string;
  stageOrder: number;
  stageTitle: string;
  totalStages: number;
  stageProgress: number;
  isStageCompleted: boolean;
  isPathCompleted: boolean;
  nextItem: LearningPathNextItem | null;
  nextStage?: LearningPathNextStage | null;
}

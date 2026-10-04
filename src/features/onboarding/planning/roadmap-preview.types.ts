import type { LearningPhase } from "./milestone-phase.types";

export type PlannedTopicStage = {
  slug: string;
  name: string;
  order: number;
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number;
  plannedDays: number;
  startDay: number;
  endDay: number;
};

export type SessionBlock = {
  step: number;
  title: string;
  detail: string;
};

export type PreviewDay = {
  dayNumber: number;
  dayLabel: string;
  topicName: string;
  topicSlug: string;
  phase?: LearningPhase;
  title: string;
  focus: string;
  isFirstDay: boolean;
  isReviewOrCheckpoint: boolean;
};

export type RoadmapSummary = {
  experienceLevel: string;
  experienceLabel: string;
  companies: string[];
  companyLabels: string[];
  customCompany?: string;
  dailyMinutes: number;
  language: string;
  languageLabel: string;
  learningGoal: string;
  learningGoalLabel: string;
};

export type RoadmapPreview = {
  summary: RoadmapSummary;
  firstStep: {
    topicName: string;
    topicSlug: string;
    title: string;
    focus: string;
    estimatedMinutes: number;
    breakdown: SessionBlock[];
  };
  schedule: PreviewDay[];
  editableLater: {
    title: string;
    description: string;
    destinationNote: string;
  }[];
};

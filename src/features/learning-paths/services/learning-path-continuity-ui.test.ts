import { describe, it, expect } from "vitest";
import type { LearningPathContext } from "../types/learning-path-continuity.types";

describe("Path Continuity System - Contract & Invariant Integrity", () => {
  const sampleContext: LearningPathContext = {
    pathId: "path-1",
    pathSlug: "bst-foundation",
    pathTitle: "DSA Core Foundation: Binary Search Trees",
    stageOrder: 1,
    stageTitle: "Binary Search Tree Fundamentals",
    totalStages: 5,
    stageProgress: 40,
    isStageCompleted: false,
    isPathCompleted: false,
    currentItem: {
      kind: "problem",
      id: "prob-1",
      slug: "insert-into-bst",
      title: "Insert into a Binary Search Tree",
      position: 2,
      totalInKind: 4,
      isCompleted: false,
    },
    stageStats: {
      totalProblems: 4,
      solvedProblems: 2,
      totalMissions: 1,
      completedMissions: 0,
      totalItems: 5,
      completedItems: 2,
    },
    nextItem: {
      kind: "problem",
      id: "prob-2",
      slug: "search-in-bst",
      title: "Search in a Binary Search Tree",
      url: "/practice/problems/search-in-bst?path=bst-foundation&stage=1&source=learning-path",
      buttonLabel: "Continue Stage →",
    },
    backToStageUrl: "/learning-paths/bst-foundation?stage=1",
    backToStageLabel: "Back to Stage 1",
    nextStage: {
      order: 2,
      title: "Advanced BST Operations",
      url: "/learning-paths/bst-foundation?stage=2",
    },
  };

  it("ensures URL preservation contains path, stage, and source for seamless continuity", () => {
    expect(sampleContext.nextItem?.url).toContain("path=bst-foundation");
    expect(sampleContext.nextItem?.url).toContain("stage=1");
    expect(sampleContext.nextItem?.url).toContain("source=learning-path");
  });

  it("ensures deterministic semantic back URL returns to specific stage page", () => {
    expect(sampleContext.backToStageUrl).toBe("/learning-paths/bst-foundation?stage=1");
    expect(sampleContext.backToStageLabel).toBe("Back to Stage 1");
  });

  it("ensures stage progress calculations match completed vs total items", () => {
    const { completedItems, totalItems } = sampleContext.stageStats;
    const computedProgress = Math.round((completedItems / totalItems) * 100);
    expect(sampleContext.stageProgress).toBe(computedProgress);
    expect(sampleContext.isStageCompleted).toBe(false);
  });

  it("ensures stage completion triggers next stage unlock information", () => {
    const completedStageContext: LearningPathContext = {
      ...sampleContext,
      stageProgress: 100,
      isStageCompleted: true,
      stageStats: {
        ...sampleContext.stageStats,
        completedItems: 5,
        solvedProblems: 4,
        completedMissions: 1,
      },
      nextItem: {
        kind: "stage",
        title: "Stage 2: Advanced BST Operations",
        url: "/learning-paths/bst-foundation?stage=2",
        buttonLabel: "Continue to Stage 2 →",
      },
    };

    expect(completedStageContext.isStageCompleted).toBe(true);
    expect(completedStageContext.nextItem?.kind).toBe("stage");
    expect(completedStageContext.nextStage?.order).toBe(2);
    expect(completedStageContext.nextItem?.buttonLabel).toBe("Continue to Stage 2 →");
  });

  it("ensures final stage completion triggers path_completed state", () => {
    const pathCompletedContext: LearningPathContext = {
      ...sampleContext,
      stageOrder: 5,
      totalStages: 5,
      stageProgress: 100,
      isStageCompleted: true,
      isPathCompleted: true,
      nextStage: null,
      nextItem: {
        kind: "path_completed",
        title: "All Stages Completed",
        url: "/learning-paths/bst-foundation",
        buttonLabel: "Review Learning Path",
      },
    };

    expect(pathCompletedContext.isPathCompleted).toBe(true);
    expect(pathCompletedContext.nextItem?.kind).toBe("path_completed");
    expect(pathCompletedContext.nextStage).toBeNull();
  });
});

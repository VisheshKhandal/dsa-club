import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/features/learning/models/learning.model", () => ({
  ProblemAttemptModel: { find: vi.fn() },
  MissionProgressModel: { find: vi.fn() },
}));

const mockLearningPathDoc = {
  _id: "507f1f77bcf86cd799439001",
  slug: "bst-foundation",
  title: "DSA Core Foundation: Binary Search Trees",
  isPublished: true,
  stages: [
    {
      order: 1,
      title: "Stage 1: Binary Search Tree Fundamentals",
      problemIds: [
        { _id: "507f1f77bcf86cd799439011", slug: "insert-into-bst", title: "Insert into a BST" },
        { _id: "507f1f77bcf86cd799439012", slug: "search-in-bst", title: "Search in a BST" },
      ],
      missionIds: [
        { _id: "507f1f77bcf86cd799439021", slug: "bst-invariants-mission", title: "BST Invariants Mission" },
      ],
      topicIds: [{ _id: "507f1f77bcf86cd799439031", slug: "trees", name: "Binary Trees" }],
      patternIds: [{ _id: "507f1f77bcf86cd799439041", slug: "bst-property", name: "BST Property" }],
    },
    {
      order: 2,
      title: "Stage 2: Advanced BST Operations",
      problemIds: [
        { _id: "507f1f77bcf86cd799439013", slug: "validate-bst", title: "Validate BST" },
      ],
      missionIds: [],
      topicIds: [],
      patternIds: [],
    },
  ],
};

vi.mock("@/features/content/services/curriculum-cache", () => ({
  getCachedLearningPathBySlug: vi.fn().mockImplementation(async (slug: string) => {
    if (slug === "bst-foundation") return mockLearningPathDoc;
    return null;
  }),
}));

import { ProblemAttemptModel, MissionProgressModel } from "@/features/learning/models/learning.model";
import {
  resolveResumePoint,
  resolveLearningPathContext,
  normalizeStageTitle,
} from "./learning-path-continuity.service";

describe("Learning Path Continuity Service", () => {
  const mockUserId = "507f1f77bcf86cd799439000";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizeStageTitle removes Stage prefixes correctly", () => {
    expect(normalizeStageTitle("Stage 1: Binary Search Tree Fundamentals")).toBe(
      "Binary Search Tree Fundamentals"
    );
    expect(normalizeStageTitle("Stage 2 : Advanced Operations")).toBe(
      "Advanced Operations"
    );
    expect(normalizeStageTitle("No Prefix Title")).toBe("No Prefix Title");
  });

  describe("resolveResumePoint", () => {
    it("returns null if path does not exist", async () => {
      const result = await resolveResumePoint({
        userId: mockUserId,
        pathSlug: "non-existent-path",
      });
      expect(result).toBeNull();
    });

    it("resolves to the first unsolved problem when starting fresh", async () => {
      (ProblemAttemptModel.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      });
      (MissionProgressModel.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await resolveResumePoint({
        userId: mockUserId,
        pathSlug: "bst-foundation",
      });

      expect(result).not.toBeNull();
      expect(result?.stageOrder).toBe(1);
      expect(result?.stageProgress).toBe(0);
      expect(result?.isStageCompleted).toBe(false);
      expect(result?.nextItem?.kind).toBe("problem");
      expect(result?.nextItem?.slug).toBe("insert-into-bst");
      expect(result?.nextItem?.url).toContain("path=bst-foundation&stage=1&source=learning-path");
    });

    it("resolves to the next unsolved problem when the first is solved", async () => {
      (ProblemAttemptModel.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { problemId: "507f1f77bcf86cd799439011" },
          ]),
        }),
      });
      (MissionProgressModel.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await resolveResumePoint({
        userId: mockUserId,
        pathSlug: "bst-foundation",
      });

      expect(result?.nextItem?.kind).toBe("problem");
      expect(result?.nextItem?.slug).toBe("search-in-bst");
    });

    it("resolves to the mission when all problems are solved but mission is incomplete", async () => {
      (ProblemAttemptModel.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { problemId: "507f1f77bcf86cd799439011" },
            { problemId: "507f1f77bcf86cd799439012" },
          ]),
        }),
      });
      (MissionProgressModel.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await resolveResumePoint({
        userId: mockUserId,
        pathSlug: "bst-foundation",
        stageOrder: 1,
      });

      expect(result?.nextItem?.kind).toBe("mission");
      expect(result?.nextItem?.slug).toBe("bst-invariants-mission");
    });

    it("resolves to next stage when current stage items are all completed", async () => {
      (ProblemAttemptModel.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { problemId: "507f1f77bcf86cd799439011" },
            { problemId: "507f1f77bcf86cd799439012" },
          ]),
        }),
      });
      (MissionProgressModel.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { missionId: "507f1f77bcf86cd799439021", status: "completed", progress: 100 },
          ]),
        }),
      });

      const result = await resolveResumePoint({
        userId: mockUserId,
        pathSlug: "bst-foundation",
        stageOrder: 1,
      });

      expect(result?.isStageCompleted).toBe(true);
      expect(result?.nextItem?.kind).toBe("stage");
      expect(result?.nextStage?.order).toBe(2);
      expect(result?.nextItem?.url).toContain("stage=2");
    });

    it("signals path_completed when all stages are completed", async () => {
      (ProblemAttemptModel.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { problemId: "507f1f77bcf86cd799439011" },
            { problemId: "507f1f77bcf86cd799439012" },
            { problemId: "507f1f77bcf86cd799439013" },
          ]),
        }),
      });
      (MissionProgressModel.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { missionId: "507f1f77bcf86cd799439021", status: "completed", progress: 100 },
          ]),
        }),
      });

      const result = await resolveResumePoint({
        userId: mockUserId,
        pathSlug: "bst-foundation",
      });

      expect(result?.isPathCompleted).toBe(true);
      expect(result?.nextItem?.kind).toBe("path_completed");
    });
  });

  describe("resolveLearningPathContext", () => {
    it("returns null if path slug does not exist", async () => {
      const result = await resolveLearningPathContext({
        userId: mockUserId,
        pathSlug: "unknown",
        currentResource: { kind: "problem", slug: "insert-into-bst" },
      });
      expect(result).toBeNull();
    });

    it("constructs full LearningPathContext for a problem page", async () => {
      (ProblemAttemptModel.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { problemId: "507f1f77bcf86cd799439011" },
          ]),
        }),
      });
      (MissionProgressModel.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      });

      const context = await resolveLearningPathContext({
        userId: mockUserId,
        pathSlug: "bst-foundation",
        stageOrder: 1,
        currentResource: { kind: "problem", slug: "search-in-bst" },
      });

      expect(context).not.toBeNull();
      expect(context?.pathTitle).toBe("DSA Core Foundation: Binary Search Trees");
      expect(context?.stageOrder).toBe(1);
      expect(context?.stageTitle).toBe("Binary Search Tree Fundamentals");
      expect(context?.currentItem.kind).toBe("problem");
      expect(context?.currentItem.position).toBe(2);
      expect(context?.currentItem.totalInKind).toBe(2);
      expect(context?.stageStats.totalProblems).toBe(2);
      expect(context?.stageStats.solvedProblems).toBe(1);
      expect(context?.stageStats.totalMissions).toBe(1);
      expect(context?.stageStats.completedMissions).toBe(0);
      expect(context?.backToStageUrl).toBe("/learning-paths/bst-foundation?stage=1");
    });

    it("constructs context for a topic page", async () => {
      (ProblemAttemptModel.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      });
      (MissionProgressModel.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      });

      const context = await resolveLearningPathContext({
        userId: mockUserId,
        pathSlug: "bst-foundation",
        stageOrder: 1,
        currentResource: { kind: "topic", slug: "trees" },
      });

      expect(context).not.toBeNull();
      expect(context?.currentItem.kind).toBe("topic");
      expect(context?.currentItem.position).toBe(1);
      expect(context?.currentItem.title).toBe("Binary Trees");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/features/content/models/content.model", () => ({
  LearningPathModel: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
  TopicModel: { find: vi.fn() },
  PatternModel: { find: vi.fn() },
  ProblemModel: { find: vi.fn() },
  MissionModel: { find: vi.fn() },
  CompanyModel: { find: vi.fn() },
  CompanyPatternModel: { find: vi.fn() },
  CompanyProblemModel: { find: vi.fn() },
}));

vi.mock("@/features/learning/models/learning.model", () => ({
  MissionProgressModel: { find: vi.fn() },
  ProblemAttemptModel: { find: vi.fn() },
  TopicProgressModel: { find: vi.fn() },
  PatternMasteryModel: { find: vi.fn() },
  PatternRecognitionAttemptModel: { find: vi.fn() },
  LearningSessionModel: { find: vi.fn() },
  ReflectionLogModel: { find: vi.fn() },
  RoadmapModel: { find: vi.fn() },
  RoadmapTemplateModel: { find: vi.fn() },
  BookmarkModel: { find: vi.fn() },
}));

import { LearningPathModel } from "@/features/content/models/content.model";
import { MissionProgressModel, ProblemAttemptModel } from "@/features/learning/models/learning.model";
import { getLearningPathsData, getLearningPathDetailData, normalizeStageTitle } from "./product.service";

describe("Product Service - Learning Paths Data & Progress Aggregator", () => {
  const mockUserId = "507f1f77bcf86cd799439011";

  const mockPathDoc = {
    _id: "path-1",
    slug: "dsa-core-foundation-mastery-path",
    title: "DSA Core Foundation Mastery Path",
    description: "Foundational DSA journey",
    coverImage: "https://res.cloudinary.com/demo/image/upload/sample.webp",
    difficulty: "medium",
    estimatedMinutes: 2460,
    audience: "Beginners to intermediate",
    tags: ["arrays", "two-pointers"],
    isFeatured: true,
    stages: [
      {
        order: 0,
        title: "Stage 1: Arrays & Hashing",
        description: "Core array techniques",
        estimatedMinutes: 120,
        topicIds: [{ _id: "t-1", name: "Arrays", slug: "arrays" }],
        patternIds: [{ _id: "p-1", name: "Prefix Sum", slug: "prefix-sum" }],
        problemIds: [
          { _id: "prob-1", slug: "two-sum", title: "Two Sum", difficulty: "easy" },
          { _id: "prob-2", slug: "contains-duplicate", title: "Contains Duplicate", difficulty: "easy" },
        ],
        missionIds: [
          { _id: "mis-1", slug: "array-mastery", title: "Array Mastery Mission" },
        ],
      },
      {
        order: 1,
        title: "Stage 2: Two Pointers",
        description: "Two pointer techniques",
        estimatedMinutes: 180,
        topicIds: [],
        patternIds: [],
        problemIds: [
          { _id: "prob-3", slug: "valid-palindrome", title: "Valid Palindrome", difficulty: "easy" },
        ],
        missionIds: [],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    const mockFindChain = (data: any) => ({
      sort: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(data),
        }),
      }),
    });

    (LearningPathModel.find as any).mockReturnValue(mockFindChain([mockPathDoc]));

    const mockFindOneChain = (data: any) => ({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(data),
      }),
    });

    (LearningPathModel.findOne as any).mockReturnValue(mockFindOneChain(mockPathDoc));
  });

  it("calculates accurate overall and stage-level progress when problems and missions are solved", async () => {
    // User has solved prob-1 and completed mis-1
    (ProblemAttemptModel.find as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ problemId: "prob-1" }]),
      }),
    });

    (MissionProgressModel.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { missionId: "mis-1", progress: 100, status: "completed" },
      ]),
    });

    const paths = await getLearningPathsData(mockUserId);
    expect(paths.length).toBe(1);

    const path = paths[0];
    expect(path.title).toBe("DSA Core Foundation Mastery Path");
    expect(path.coverImage).toBe("https://res.cloudinary.com/demo/image/upload/sample.webp");
    expect(path.totalProblems).toBe(3); // prob-1, prob-2, prob-3
    expect(path.solvedProblems).toBe(1); // prob-1
    expect(path.totalMissions).toBe(1); // mis-1
    expect(path.completedMissions).toBe(1); // mis-1

    // Total trackable items = 3 problems + 1 mission = 4. Completed = 1 + 1 = 2.
    // Progress = 2 / 4 = 50%
    expect(path.progress).toBe(50);
    expect(path.status).toBe("in_progress");

    // Stage 1 has 2 problems + 1 mission = 3. Completed = prob-1 + mis-1 = 2 / 3 = 67%
    expect(path.stages[0].progress).toBe(67);
    expect(path.stages[0].status).toBe("in_progress");
    expect(path.stages[0].problems[0].isSolved).toBe(true);
    expect(path.stages[0].problems[1].isSolved).toBe(false);

    // Current stage is Stage 1 (order 0) because it's not 100% complete
    expect(path.currentStageIndex).toBe(0);
    expect(path.nextItemUrl).toBe("/practice/problems/contains-duplicate");
  });

  it("returns 0% progress and 'not_started' when user has no attempts", async () => {
    (ProblemAttemptModel.find as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    });

    (MissionProgressModel.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    });

    const paths = await getLearningPathsData(mockUserId);
    const path = paths[0];
    expect(path.progress).toBe(0);
    expect(path.status).toBe("not_started");
    expect(path.stages[0].progress).toBe(0);
    expect(path.stages[0].status).toBe("not_started");
    expect(path.nextItemUrl).toBe("/practice/problems/two-sum");
  });

  it("loads single learning path detail with getLearningPathDetailData", async () => {
    (ProblemAttemptModel.find as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ problemId: "prob-1" }, { problemId: "prob-2" }, { problemId: "prob-3" }]),
      }),
    });

    (MissionProgressModel.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { missionId: "mis-1", progress: 100, status: "completed" },
      ]),
    });

    const detail = await getLearningPathDetailData("dsa-core-foundation-mastery-path", mockUserId);
    expect(detail).not.toBeNull();
    expect(detail!.progress).toBe(100);
    expect(detail!.status).toBe("completed");
    expect(detail!.stages.length).toBe(2);
    expect(detail!.stages[0].status).toBe("completed");
    expect(detail!.stages[1].status).toBe("completed");
  });

  describe("Stage Title Normalization & Progression Invariants", () => {
    it("strips arbitrary 'Stage X:' prefixes to prevent stage mismatch", () => {
      expect(normalizeStageTitle("Stage 4: Binary Search Tree Fundamentals")).toBe("Binary Search Tree Fundamentals");
      expect(normalizeStageTitle("Stage 1: Arrays & Hashing")).toBe("Arrays & Hashing");
      expect(normalizeStageTitle("stage 10 : Dynamic Programming")).toBe("Dynamic Programming");
      expect(normalizeStageTitle("Graphs & Topological Sort")).toBe("Graphs & Topological Sort");
      expect(normalizeStageTitle("")).toBe("");
    });

    it("ensures currentStageIndex and currentStageTitle derive from the same source of truth", async () => {
      (ProblemAttemptModel.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([{ problemId: "prob-1" }, { problemId: "prob-2" }]),
        }),
      });

      (MissionProgressModel.find as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { missionId: "mis-1", progress: 100, status: "completed" },
        ]),
      });

      // Stage 0 (prob-1, prob-2, mis-1) is now 100% complete.
      // Next stage is Stage 1 (prob-3), which has progress 0%.
      const paths = await getLearningPathsData(mockUserId);
      const path = paths[0];

      expect(path.stages[0].progress).toBe(100);
      expect(path.stages[0].status).toBe("completed");

      // Current active stage MUST be stage 1 (order 1)
      expect(path.currentStageIndex).toBe(1);
      expect(path.currentStageTitle).toBe("Two Pointers");
      expect(path.nextItemUrl).toBe("/practice/problems/valid-palindrome");
    });
  });
});


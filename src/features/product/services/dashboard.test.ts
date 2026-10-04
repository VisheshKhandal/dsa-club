import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/features/identity/models/user.model", () => ({
  UserModel: {
    findById: vi.fn(),
  },
  UserProfileModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock("@/features/content/models/content.model", () => ({
  LearningPathModel: { find: vi.fn(), findOne: vi.fn() },
  TopicModel: { find: vi.fn(), findById: vi.fn() },
  PatternModel: { find: vi.fn(), findById: vi.fn() },
  ProblemModel: { find: vi.fn(), findById: vi.fn() },
  MissionModel: { find: vi.fn(), findById: vi.fn(), findOne: vi.fn() },
  CompanyModel: { find: vi.fn() },
  CompanyPatternModel: { find: vi.fn() },
  CompanyProblemModel: { find: vi.fn() },
}));

vi.mock("@/features/learning/models/learning.model", () => ({
  MissionProgressModel: { find: vi.fn(), findOne: vi.fn(), countDocuments: vi.fn() },
  ProblemAttemptModel: { find: vi.fn() },
  TopicProgressModel: { find: vi.fn() },
  PatternMasteryModel: { find: vi.fn() },
  PatternRecognitionAttemptModel: { find: vi.fn() },
  LearningSessionModel: { find: vi.fn() },
  ReflectionLogModel: { find: vi.fn() },
  RoadmapModel: { findOne: vi.fn() },
  RoadmapTemplateModel: { find: vi.fn() },
  BookmarkModel: { find: vi.fn() },
}));

vi.mock("@/features/intelligence/models/intelligence.model", () => ({
  RevisionQueueModel: { find: vi.fn() },
  RevisionHistoryModel: { find: vi.fn(), countDocuments: vi.fn() },
  UserStatisticsModel: { findOne: vi.fn() },
  UserAchievementModel: { find: vi.fn() },
  NotificationModel: { find: vi.fn() },
  DailyPlanModel: { findOneAndUpdate: vi.fn().mockResolvedValue(null) },
}));

vi.mock("@/features/intelligence/models", () => ({
  PlanModel: { findOne: vi.fn().mockResolvedValue(null) },
  PlanDayModel: { findOne: vi.fn().mockResolvedValue(null), find: vi.fn().mockResolvedValue([]) },
  PlanTaskModel: { findOne: vi.fn().mockResolvedValue(null), find: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }) },
  IntelligenceDecisionModel: { create: vi.fn(), find: vi.fn().mockResolvedValue([]) },
}));

vi.mock("@/features/intelligence/models/plan-task.model", () => ({
  PlanTaskModel: {
    findOne: vi.fn().mockResolvedValue(null),
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

vi.mock("@/features/intelligence/models/learning-event.model", () => ({
  LearningEventModel: {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    }),
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/features/intelligence/models/user-topic-progress.model", () => ({
  UserTopicProgressModel: {
    find: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
}));

vi.mock("@/features/intelligence/services/plan-migration.service", () => ({
  resolveUserActivePlan: vi.fn().mockResolvedValue({
    plan: null,
    days: [],
    tasks: [],
    wasMigrated: false,
  }),
}));

vi.mock("@/features/progress/services/progress.service", () => ({
  generateProgressSummary: vi.fn().mockResolvedValue({
    overallMastery: 42,
    strongTopics: ["Hash Tables"],
    weakTopics: ["Binary Trees", "Graphs"],
    patternsNeedingRevision: ["Two Pointers"],
    recentImprovement: "Good progress in Arrays",
    revisionNeeds: "Queue has 2 items",
    interviewReadinessSignal: "Building Foundations",
    recommendedNextAction: "Continue Arrays mission",
  }),
}));

vi.mock("@/features/platform/engines/recommendation.engine", () => ({
  getRecommendationCandidates: vi.fn().mockResolvedValue([
    {
      rank: 1,
      phase: "concept",
      label: "Resume Mission",
      title: "Arrays in Depth",
      href: "/missions/arrays-in-depth",
      explanation: "Continue your current mission",
      estimatedMinutes: 45,
      entityType: "mission",
    },
  ]),
}));

import { UserModel, UserProfileModel } from "@/features/identity/models/user.model";
import { MissionModel, TopicModel, PatternModel, ProblemModel } from "@/features/content/models/content.model";
import {
  MissionProgressModel,
  TopicProgressModel,
  RoadmapModel,
  ProblemAttemptModel,
  LearningSessionModel,
  PatternMasteryModel,
} from "@/features/learning/models/learning.model";
import {
  RevisionQueueModel,
  RevisionHistoryModel,
  UserStatisticsModel,
  UserAchievementModel,
  NotificationModel,
} from "@/features/intelligence/models/intelligence.model";
import { PlanTaskModel } from "@/features/intelligence/models/plan-task.model";
import { LearningEventModel } from "@/features/intelligence/models/learning-event.model";
import { getProductSnapshot } from "./product.service";

describe("Product Service - Dashboard Action Center Snapshot", () => {
  const mockUserId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    vi.clearAllMocks();

    const mockSelectLean = () => ({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    });

    (PlanTaskModel.find as any).mockReturnValue(mockSelectLean());
    (LearningEventModel.find as any).mockReturnValue(mockSelectLean());
    (TopicModel.find as any).mockReturnValue(mockSelectLean());
    (PatternModel.find as any).mockReturnValue(mockSelectLean());
    (ProblemModel.find as any).mockReturnValue(mockSelectLean());
    (MissionModel.find as any).mockReturnValue({
      populate: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              _id: "m-1",
              slug: "arrays-in-depth",
              title: "Complete Arrays in Depth",
              estimatedMinutes: 45,
              topicId: { name: "Arrays", slug: "arrays" },
              steps: [
                { key: "step-1", kind: "concept", title: "Concept Overview" },
                { key: "step-2", kind: "practice", title: "Practice Problem" },
              ],
            },
          ]),
        }),
      }),
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    });

    (UserModel.findById as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: mockUserId,
        name: "Rajesh Kumar",
        email: "rajesh@example.com",
      }),
    });

    (UserProfileModel.findOne as any).mockReturnValue({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          userId: mockUserId,
          currentLevel: "beginner",
          targetDate: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000), // 11 days from now
          targetCompanyIds: [{ _id: "c-1", name: "Amazon", slug: "amazon" }],
          onboarding: { status: "completed" },
        }),
      }),
    });

    (RoadmapModel.findOne as any).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: "roadmap-1",
          title: "DSA Foundation Roadmap",
          status: "active",
          stages: [
            {
              order: 1,
              title: "Arrays & Hashing",
              status: "active",
              missionIds: ["m-1"],
            },
          ],
        }),
      }),
    });

    (UserStatisticsModel.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        totalFocusedMinutes: 120,
        solvedProblems: 5,
        currentStreakDays: 3,
      }),
    });

    const topicStartedDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    (TopicProgressModel.find as any).mockReturnValue({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: "tp-1",
            topicId: { _id: "t-1", name: "Arrays", slug: "arrays" },
            masteryScore: 35,
            createdAt: topicStartedDate,
          },
          {
            _id: "tp-2",
            topicId: { _id: "t-2", name: "Binary Trees", slug: "binary-trees" },
            masteryScore: 20,
            createdAt: topicStartedDate,
          },
        ]),
      }),
    });

    (MissionProgressModel.find as any).mockReturnValue({
      populate: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              _id: "mp-1",
              missionId: {
                _id: "m-1",
                slug: "arrays-in-depth",
                title: "Complete Arrays in Depth",
                estimatedMinutes: 45,
                topicId: { name: "Arrays", slug: "arrays" },
                steps: [
                  { key: "step-1", kind: "concept", title: "Concept Overview" },
                  { key: "step-2", kind: "practice", title: "Practice Problem" },
                ],
              },
              status: "in_progress",
              progress: 50,
              completedStepKeys: ["step-1"],
              startedAt: topicStartedDate,
            },
          ]),
        }),
      }),
    });

    (MissionModel.findById as any).mockReturnValue({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: "m-1",
          slug: "arrays-in-depth",
          title: "Complete Arrays in Depth",
          estimatedMinutes: 45,
          topicId: { name: "Arrays", slug: "arrays" },
          steps: [
            { key: "step-1", kind: "concept", title: "Concept Overview" },
            { key: "step-2", kind: "practice", title: "Practice Problem" },
          ],
        }),
      }),
    });

    (RevisionQueueModel.find as any).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              _id: "rq-1",
              entityId: "p-1",
              entityType: "pattern",
              conceptName: "Binary Search",
              priority: 4,
              dueAt: new Date(),
              state: "due",
            },
            {
              _id: "rq-2",
              entityId: "p-2",
              entityType: "pattern",
              conceptName: "Two Pointers",
              priority: 2,
              dueAt: new Date(),
              state: "due",
            },
          ]),
        }),
      }),
    });

    (UserAchievementModel.find as any).mockReturnValue({
      populate: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });

    (LearningSessionModel.find as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
      lean: vi.fn().mockResolvedValue([]),
    });

    (PatternMasteryModel.find as any).mockReturnValue({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
      lean: vi.fn().mockResolvedValue([]),
    });

    (NotificationModel.find as any).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    (ProblemAttemptModel.find as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        lean: vi.fn().mockResolvedValue([
          { _id: "pa-1", status: "solved", createdAt: new Date() },
          { _id: "pa-2", status: "attempted", createdAt: new Date() },
        ]),
      }),
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      }),
      lean: vi.fn().mockResolvedValue([
        { _id: "pa-1", status: "solved", createdAt: new Date() },
        { _id: "pa-2", status: "attempted", createdAt: new Date() },
      ]),
    });

    (RevisionHistoryModel.find as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { _id: "rh-1", reviewedAt: new Date() },
        ]),
      }),
      lean: vi.fn().mockResolvedValue([
        { _id: "rh-1", reviewedAt: new Date() },
      ]),
    });

    (RevisionHistoryModel.countDocuments as any).mockResolvedValue(1);
  });

  it("should return rich active mission data with title, stage, progress %, and estimated minutes", async () => {
    const data = await getProductSnapshot(mockUserId);

    expect(data.activeMission).toBeDefined();
    expect(data.activeMission!.title).toBe("Complete Arrays in Depth");
    expect(data.activeMission!.slug).toBe("arrays-in-depth");
    expect(data.activeMission!.progress).toBe(50);
    expect(data.activeMission!.estimatedMinutes).toBe(45);
    expect(data.activeMission!.stageTitle).toBe("Practice Problem");
    expect(data.activeMission!.stageKind).toBe("practice");
  });

  it("should generate a dynamic contextual sentence based on days into topic", async () => {
    const data = await getProductSnapshot(mockUserId);

    expect(data.contextSentence).toContain("days into Arrays");
    expect(data.contextSentence).toContain("Here's today's plan.");
  });

  it("should detect interview imminent state when targetDate is within 14 days", async () => {
    const data = await getProductSnapshot(mockUserId);

    expect(data.interviewImminent).toBeDefined();
    expect(data.interviewImminent!.daysRemaining).toBeLessThanOrEqual(14);
    expect(data.interviewImminent!.companyName).toBe("Amazon");
    expect(data.interviewImminent!.companySlug).toBe("amazon");
  });

  it("should compute real weekly summary metrics from recent activities", async () => {
    const data = await getProductSnapshot(mockUserId);

    expect(data.weeklySummary).toBeDefined();
    expect(data.weeklySummary.problems).toBe(1); // 1 solved
    expect(data.weeklySummary.revisions).toBe(1);
  });

  it("should provide actionable focus areas with maximum 3 weak topics", async () => {
    const data = await getProductSnapshot(mockUserId);

    expect(data.focusAreas).toBeDefined();
    expect(data.focusAreas.length).toBeLessThanOrEqual(3);
    expect(data.focusAreas[0]).toHaveProperty("name");
    expect(data.focusAreas[0]).toHaveProperty("href");
  });

  it("toDTO safely handles circular references without throwing Maximum call stack size exceeded", async () => {
    const { toDTO } = await import("./product.service");
    const circularObj: any = {
      name: "Circular Test",
      date: new Date("2026-09-24T12:00:00Z"),
      sub: {
        val: 42,
      },
    };
    circularObj.sub.parent = circularObj;
    circularObj.list = [circularObj];

    expect(() => toDTO(circularObj)).not.toThrow();
    const result = toDTO(circularObj);
    expect(result.name).toBe("Circular Test");
    expect(result.date).toBe("2026-09-24T12:00:00.000Z");
    expect(result.sub.val).toBe(42);
    expect(result.sub.parent).toBeNull();
    expect(result.list[0]).toBeNull();
  });

  it("toDTO ignores internal Mongoose properties like $__, schema, ownerDocument", async () => {
    const { toDTO } = await import("./product.service");
    const mockMongooseDoc: any = {
      _id: "507f1f77bcf86cd799439011",
      title: "Plan Day 1",
      $__: { scope: null },
      schema: { paths: {} },
      ownerDocument: null,
      __v: 0,
      snapshots: {
        focus: "Arrays",
      },
    };
    mockMongooseDoc.$__.scope = mockMongooseDoc;
    mockMongooseDoc.ownerDocument = mockMongooseDoc;

    expect(() => toDTO(mockMongooseDoc)).not.toThrow();
    const result = toDTO(mockMongooseDoc);
    expect(result.title).toBe("Plan Day 1");
    expect(result._id).toBe("507f1f77bcf86cd799439011");
    expect(result.$__).toBeUndefined();
    expect(result.schema).toBeUndefined();
    expect(result.ownerDocument).toBeUndefined();
    expect(result.snapshots.focus).toBe("Arrays");
  });

  it("toDTO preserves shared references across multiple fields without nullifying them", async () => {
    const { toDTO } = await import("./product.service");
    const sharedPath = { slug: "two-pointers", title: "Two Pointers", isFeatured: true };
    const payload = {
      activePath: sharedPath,
      featuredPaths: [sharedPath],
    };

    const result = toDTO(payload);
    expect(result.activePath).toBeDefined();
    expect(result.activePath.slug).toBe("two-pointers");
    expect(result.featuredPaths).toBeDefined();
    expect(result.featuredPaths[0]).not.toBeNull();
    expect(result.featuredPaths[0].slug).toBe("two-pointers");
  });
});

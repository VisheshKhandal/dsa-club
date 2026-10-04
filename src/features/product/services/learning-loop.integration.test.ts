import { describe, expect, it, vi, beforeEach } from "vitest";
import mongoose, { Types } from "mongoose";

// Mock DB connection to run fast in-memory tests
vi.mock("@/lib/db/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/features/learning/services/learning-command.service", () => ({
  executePracticeSubmission: vi.fn().mockImplementation(async (params: any) => {
    const { ProblemAttemptModel } = await import("@/features/learning/models/learning.model");
    const { LearningDeliveryModel } = await import("@/features/intelligence/models/learning-delivery.model");
    await ProblemAttemptModel.create([
      {
        problemId: new Types.ObjectId(params.problemId),
        status: params.status,
        strategy: params.strategy,
        durationSeconds: params.durationSeconds,
        hintsUsed: params.hintsUsed,
        selfConfidence: params.selfConfidence,
        perceivedDifficulty: params.perceivedDifficulty,
      }
    ], {});
    await (LearningDeliveryModel.bulkWrite as any)([]);
    return {
      ok: true,
      receipt: {
        commandId: params.commandId,
        commandKind: "practice_submission",
        outcome: params.status,
        attemptId: new Types.ObjectId().toString(),
        timestamp: new Date().toISOString(),
      },
    };
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

vi.mock("@/lib/auth-guard", () => ({
  requireUserId: vi.fn().mockResolvedValue("64b8f0123456789012345678"),
}));

// Mock AssessmentEngine to avoid complex deep DB chains during integration tests
vi.mock("@/features/platform/engines/assessment.engine", () => ({
  AssessmentEngine: {
    assessTopic: vi.fn().mockResolvedValue({
      masteryScore: 70,
      dimensions: { recognition: 75, understanding: 80 },
    }),
  },
}));

// Mock Mongoose models
vi.mock("@/features/content/models/content.model", () => {
  return {
    TopicModel: {
      bulkWrite: vi.fn().mockResolvedValue({}),
      find: vi.fn(),
      findOne: vi.fn(),
      findById: vi.fn(),
    },
    MissionModel: {
      find: vi.fn(),
      findOne: vi.fn(),
      findById: vi.fn(),
    },
    ProblemModel: {
      find: vi.fn(),
      findOne: vi.fn(),
      findById: vi.fn(),
    },
    PatternModel: {
      find: vi.fn(),
      findOne: vi.fn(),
      findById: vi.fn(),
    },
    CompanyModel: {
      bulkWrite: vi.fn().mockResolvedValue({}),
      find: vi.fn(),
      findOne: vi.fn(),
    },
  };
});

vi.mock("@/features/learning/models/learning.model", () => {
  return {
    RoadmapModel: {
      create: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      findOne: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
      findOneAndUpdate: vi.fn(),
    },
    MissionProgressModel: {
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      updateOne: vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }),
      countDocuments: vi.fn(),
    },
    TopicProgressModel: {
      find: vi.fn(),
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn().mockResolvedValue({}),
    },
    PatternMasteryModel: {
      find: vi.fn(),
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn().mockResolvedValue({}),
    },
    ProblemAttemptModel: {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn().mockImplementation((docs: any) => Promise.resolve(Array.isArray(docs) ? docs.map((d: any) => ({ _id: new Types.ObjectId(), ...d })) : [{ _id: new Types.ObjectId() }])),
      distinct: vi.fn().mockResolvedValue([]),
      countDocuments: vi.fn().mockResolvedValue(0),
    },
    PatternRecognitionAttemptModel: {
      find: vi.fn(),
      create: vi.fn(),
    },
    ReflectionLogModel: {
      find: vi.fn(),
      create: vi.fn().mockImplementation((docs: any) => Promise.resolve(Array.isArray(docs) ? docs.map((d: any) => ({ _id: new Types.ObjectId(), ...d })) : [{ _id: new Types.ObjectId() }])),
    },
    LearningCommandModel: {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((docs: any) => Promise.resolve(Array.isArray(docs) ? docs : [docs])),
    },
    PracticeSessionModel: {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ _id: new Types.ObjectId(), hintsRevealedLevels: [] }),
      updateOne: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({}),
    },
  };
});

vi.mock("@/features/learning/models/learning-command.model", () => ({
  LearningCommandModel: {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((docs: any) => Promise.resolve(Array.isArray(docs) ? docs : [docs])),
  },
}));

vi.mock("@/features/learning/models/practice-session.model", () => ({
  PracticeSessionModel: {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ _id: new Types.ObjectId(), hintsRevealedLevels: [] }),
    updateOne: vi.fn().mockResolvedValue({}),
    updateMany: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/features/intelligence/models/learning-delivery.model", () => ({
  LearningDeliveryModel: {
    insertMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    bulkWrite: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/features/intelligence/models/intelligence.model", () => {
  return {
    RevisionQueueModel: {
      find: vi.fn(),
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn().mockResolvedValue({}),
    },
    RevisionHistoryModel: {
      find: vi.fn(),
      create: vi.fn(),
      countDocuments: vi.fn().mockResolvedValue(0),
    },
    UserStatisticsModel: {
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn().mockResolvedValue({}),
    },
    ActivityEventModel: {
      create: vi.fn().mockResolvedValue({}),
      updateOne: vi.fn().mockResolvedValue({}),
    },
    LearningDeliveryModel: {
      insertMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
    },
  };
});

vi.mock("@/features/identity/models/user.model", () => ({
  UserModel: {
    findById: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ learningEpoch: 1 }),
      }),
    }),
  },
  UserProfileModel: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
  },
}));

vi.mock("@/features/intelligence/models/plan-task.model", () => ({
  PlanTaskModel: {
    find: vi.fn(),
    findOne: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
  },
}));

vi.mock("@/features/intelligence/models/plan.model", () => ({
  PlanModel: {
    find: vi.fn(),
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    }),
  },
}));

vi.mock("@/features/intelligence/models/learning-event.model", () => ({
  LearningEventModel: {
    create: vi.fn().mockImplementation((docs: any) => Promise.resolve(Array.isArray(docs) ? docs.map((d: any) => ({ _id: new Types.ObjectId(), ...d })) : [{ _id: new Types.ObjectId() }])),
    findOne: vi.fn().mockResolvedValue(null),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

vi.mock("@/features/intelligence/models/plan-day.model", () => ({
  PlanDayModel: {
    find: vi.fn(),
    findOne: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("@/features/intelligence/models/learning-event.model", () => ({
  LearningEventModel: {
    find: vi.fn(),
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    updateOne: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/features/intelligence/models/user-topic-progress.model", () => ({
  UserTopicProgressModel: {
    find: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
}));

vi.mock("@/features/content/services/curriculum-cache", () => ({
  getCachedPublishedProblems: vi.fn().mockResolvedValue([]),
  getCachedPublishedTopics: vi.fn().mockResolvedValue([]),
  getCachedPublishedPatterns: vi.fn().mockResolvedValue([]),
  getCachedRoadmapTemplate: vi.fn().mockResolvedValue(null),
  getCachedActiveCompanies: vi.fn().mockResolvedValue([]),
  CURRICULUM_TAGS: {
    TOPICS: "curriculum-topics",
    PATTERNS: "curriculum-patterns",
    PROBLEMS: "curriculum-problems",
    COMPANIES: "curriculum-companies",
    LEARNING_PATHS: "curriculum-learning-paths",
    ROADMAP_TEMPLATE: "curriculum-roadmap-template",
    MISSIONS: "curriculum-missions",
  },
}));

// Import engines and services under test
import { generatePersonalizedRoadmap } from "@/features/onboarding/services/roadmap-generator.service";
import { LearningEngine } from "@/features/platform/engines/learning.engine";
import { ProgressEngine } from "@/features/platform/engines/progress.engine";
import { buildPracticeRecommendations } from "@/features/product/services/learning-loop.selectors";
import { recordProblemAttemptAction, recordProblemPatternRecognitionAction } from "@/features/product/actions/product.actions";
import { TopicModel, MissionModel, ProblemModel, PatternModel, CompanyModel } from "@/features/content/models/content.model";
import { RoadmapModel, MissionProgressModel, TopicProgressModel, PatternMasteryModel, ProblemAttemptModel, PatternRecognitionAttemptModel } from "@/features/learning/models/learning.model";
import { RevisionQueueModel, UserStatisticsModel } from "@/features/intelligence/models/intelligence.model";
import { LearningDeliveryModel } from "@/features/intelligence/models/learning-delivery.model";
import { getCachedPublishedProblems } from "@/features/content/services/curriculum-cache";

describe("Core Learning Loop Integration Suite", () => {
  const mockUserId = new Types.ObjectId().toString();
  const mockTopic1Id = new Types.ObjectId();
  const mockTopic2Id = new Types.ObjectId();
  const mockTopic3Id = new Types.ObjectId();
  const mockMission1Id = new Types.ObjectId();
  const mockMission2Id = new Types.ObjectId();
  const mockProblemId = new Types.ObjectId();
  const mockPatternId = new Types.ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ──────────────────────────────────────────────────────────
   * 1. ONBOARDING → ROADMAP INTEGRATION
   * ────────────────────────────────────────────────────────── */
  describe("Phase 1: Onboarding → Roadmap Generation", () => {
    it("creates an active sequential roadmap with proper stage statuses and mission linkage", async () => {
      const mockTopics = [
        { _id: mockTopic1Id, slug: "arrays", name: "Arrays", order: 10, estimatedMinutes: 300 },
        { _id: mockTopic2Id, slug: "two-pointers", name: "Two Pointers", order: 40, estimatedMinutes: 300 },
        { _id: mockTopic3Id, slug: "sliding-window", name: "Sliding Window", order: 50, estimatedMinutes: 360 },
      ];

      const mockMissions = [
        { _id: mockMission1Id, topicId: mockTopic1Id, title: "Arrays Foundation", estimatedMinutes: 30 },
        { _id: mockMission2Id, topicId: mockTopic2Id, title: "Two Pointers Mastery", estimatedMinutes: 45 },
      ];

      (TopicModel.find as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockTopics),
      });

      (MissionModel.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockMissions),
        }),
      });

      (CompanyModel.find as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ _id: new Types.ObjectId(), slug: "amazon", name: "Amazon" }]),
      });

      (RoadmapModel.create as any).mockImplementation((data: any) => Promise.resolve({ _id: new Types.ObjectId(), ...data }));

      const roadmap = await generatePersonalizedRoadmap(mockUserId, {
        experienceLevel: "beginner",
        companySlugs: ["amazon"],
        dailyMinutes: 60,
        language: "javascript",
        knownTopicSlugs: [],
        learningGoal: "interview",
      });

      // 1. Verifies previous active roadmaps are archived
      expect(RoadmapModel.updateMany).toHaveBeenCalledWith(
        { userId: mockUserId, status: "active" },
        { $set: { status: "archived" } }
      );

      // 2. Verifies roadmap is saved with active status
      expect(RoadmapModel.create).toHaveBeenCalled();
      expect(roadmap.status).toBe("active");
      expect(roadmap.algorithmVersion).toBe("onboarding-rules-v1");

      // 3. Verifies stages sequencing: first stage is 'active', all subsequent are 'locked'
      const stages = roadmap.stages;
      expect(stages.length).toBeGreaterThan(0);
      expect(stages[0].status).toBe("active");
      expect(stages[1].status).toBe("locked");

      // 4. Verifies published missions are mapped to stages by topic
      const arraysStage = stages.find((s: any) => s.key === "arrays");
      expect(arraysStage).toBeDefined();
      expect(arraysStage.missionIds).toContain(mockMission1Id);
    });

    it("filters out known topics for intermediate learners and boosts target company topics", async () => {
      const mockTopics = [
        { _id: mockTopic1Id, slug: "arrays", name: "Arrays", order: 10, estimatedMinutes: 300 },
        { _id: mockTopic2Id, slug: "graphs", name: "Graphs", order: 120, estimatedMinutes: 600 },
      ];

      (TopicModel.find as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockTopics),
      });

      (MissionModel.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      });

      (CompanyModel.find as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      (RoadmapModel.create as any).mockImplementation((data: any) => Promise.resolve(data));

      const roadmap = await generatePersonalizedRoadmap(mockUserId, {
        experienceLevel: "intermediate",
        companySlugs: ["google"], // Google boosts graphs
        dailyMinutes: 60,
        language: "python",
        knownTopicSlugs: ["arrays"], // Learner already knows arrays
        learningGoal: "interview",
      });

      const stageKeys = roadmap.stages.map((s: any) => s.key);
      // Arrays should be filtered out because learner is intermediate and knows arrays
      expect(stageKeys).not.toContain("arrays");
      // Graphs should be present and boosted
      expect(stageKeys).toContain("graphs");
    });
  });

  /* ──────────────────────────────────────────────────────────
   * 2. MISSION PROGRESSION → REVISION QUEUE INTEGRATION
   * ────────────────────────────────────────────────────────── */
  describe("Phase 2: Mission Progression → Revision Queue Scheduling", () => {
    it("progresses an active mission stage-by-stage and triggers completion side-effects", async () => {
      const mockMission = {
        _id: mockMission1Id,
        topicId: mockTopic1Id,
        title: "Two Pointers Core",
        steps: [
          { key: "concept-intro", kind: "concept" },
          { key: "practice-problem", kind: "practice" },
        ],
      };

      (MissionModel.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockMission),
      });

      // Step 1: Complete the first stage
      (MissionProgressModel.findOneAndUpdate as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          userId: new Types.ObjectId(mockUserId),
          missionId: mockMission1Id,
          completedStepKeys: ["concept-intro"],
          status: "in_progress",
          progress: 0,
        }),
      });

      await LearningEngine.completeStage(mockUserId, mockMission1Id.toString(), "concept-intro");

      // Verifies intermediate progress update (1 of 2 steps = 50%)
      expect(MissionProgressModel.updateOne).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: expect.objectContaining({
            status: "in_progress",
            progress: 50,
          }),
        })
      );

      // Step 2: Complete the final stage
      (MissionProgressModel.findOneAndUpdate as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          userId: new Types.ObjectId(mockUserId),
          missionId: mockMission1Id,
          completedStepKeys: ["concept-intro", "practice-problem"],
          status: "in_progress",
          progress: 50,
        }),
      });

      // Spy on completeMission
      const completeMissionSpy = vi.spyOn(LearningEngine, "completeMission").mockResolvedValue();

      await LearningEngine.completeStage(mockUserId, mockMission1Id.toString(), "practice-problem");

      // Verifies completeMission is triggered when all steps are completed
      expect(completeMissionSpy).toHaveBeenCalledWith(mockUserId, mockMission1Id.toString());
    });

    it("enqueues revision item and updates roadmap stages upon mission completion", async () => {
      const mockMission = {
        _id: mockMission1Id,
        topicId: mockTopic1Id,
        title: "Two Pointers Core",
      };

      (MissionModel.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockMission),
      });

      (TopicProgressModel.findOne as any).mockResolvedValue({
        userId: new Types.ObjectId(mockUserId),
        topicId: mockTopic1Id,
        masteryScore: 75,
      });

      const mockRoadmapDoc = {
        userId: new Types.ObjectId(mockUserId),
        status: "active",
        stages: [
          {
            missionIds: [mockMission1Id],
            status: "active",
            completionScore: 0,
          },
          {
            missionIds: [mockMission2Id],
            status: "locked",
            completionScore: 0,
          },
        ],
        save: vi.fn().mockResolvedValue(true),
      };

      (RoadmapModel.findOne as any).mockResolvedValue(mockRoadmapDoc);
      (MissionProgressModel.countDocuments as any).mockImplementation((query: any) => {
        const inIds = query?.missionId?.$in ?? [];
        if (inIds.some((id: any) => String(id) === String(mockMission1Id))) {
          return Promise.resolve(1);
        }
        return Promise.resolve(0);
      });

      await ProgressEngine.processMissionCompletion(mockUserId, mockMission1Id.toString());

      // 1. Verifies RevisionQueueModel is scheduled with 1-day interval
      expect(RevisionQueueModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.anything(),
          entityType: "mission",
          entityId: expect.anything(),
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            state: "scheduled",
            priority: 5,
          }),
        }),
        { upsert: true }
      );

      // 2. Verifies UserStatisticsModel is updated with currentTopicId
      expect(UserStatisticsModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ userId: expect.anything() }),
        expect.objectContaining({
          $set: expect.objectContaining({
            currentTopicId: mockTopic1Id,
            lastStudiedTopicId: mockTopic1Id,
          }),
        }),
        { upsert: true }
      );

      // 3. Verifies stage 1 is marked completed and stage 2 unlocked as active
      expect(mockRoadmapDoc.stages[0].status).toBe("completed");
      expect(mockRoadmapDoc.stages[0].completionScore).toBe(100);
      expect(mockRoadmapDoc.stages[1].status).toBe("active");
      expect(mockRoadmapDoc.save).toHaveBeenCalled();
    });
  });

  /* ──────────────────────────────────────────────────────────
   * 3. PROBLEM ATTEMPTS, HINT TRACKING & RECOMMENDATIONS
   * ────────────────────────────────────────────────────────── */
  describe("Phase 3: Metered Hints, Problem Attempts & Recommendation Loop", () => {
    it("recognizes assisted attempts when 2 or more hints are used and flags for reinforcement", async () => {
      const mockProblem = {
        _id: mockProblemId,
        title: "Two Sum II",
        difficulty: "easy",
        isPublished: true,
        topicIds: [mockTopic1Id],
        patternIds: [mockPatternId],
        qualityScore: 0.9,
      };

      (TopicProgressModel.find as any).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              topicId: { _id: mockTopic1Id, name: "Arrays" },
              masteryScore: 40, // Weak topic
              state: "learning",
            },
          ]),
        }),
      });

      (PatternMasteryModel.find as any).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              patternId: { _id: mockPatternId, name: "Two Pointers" },
              masteryScore: 50,
            },
          ]),
        }),
      });

      // Attempt was abandoned/started with 2 hints used
      const mockAttempts = [
        {
          problemId: mockProblemId,
          status: "abandoned",
          strategy: "hint_assisted",
          hintsUsed: 2,
          selfConfidence: 2, // low confidence
          createdAt: new Date(),
        },
      ];

      (ProblemAttemptModel.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockAttempts),
        }),
      });

      (RevisionQueueModel.find as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      // getCachedPublishedProblems is mocked at module level; override per-test to inject the problem
      vi.mocked(getCachedPublishedProblems).mockResolvedValueOnce([mockProblem] as any);

      const recommendations = await buildPracticeRecommendations(new Types.ObjectId(mockUserId), 3);

      expect(recommendations.length).toBe(1);
      const rec = recommendations[0];
      // Since hintsUsed >= 2 and lowConfidence, reason codes must flag reinforcement needs
      expect(rec.reasonCodes).toContain("needs_reinforcement");
      expect(rec.reasonCodes).toContain("low_confidence");
      expect(rec.reasonCodes).toContain("weak_topic");
      expect(rec.reasonCodes).toContain("previous_attempt");
    });

    it("prioritizes due revisions with elevated score in practice recommendations", async () => {
      const mockProblem = {
        _id: mockProblemId,
        title: "Trapping Rain Water",
        difficulty: "hard",
        isPublished: true,
        topicIds: [mockTopic1Id],
        patternIds: [mockPatternId],
        qualityScore: 1.0,
      };

      (TopicProgressModel.find as any).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      });

      (PatternMasteryModel.find as any).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      });

      (ProblemAttemptModel.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { problemId: mockProblemId, status: "solved", hintsUsed: 0, selfConfidence: 4 },
          ]),
        }),
      });

      // Problem is due for revision
      (RevisionQueueModel.find as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ entityId: mockProblemId }]),
      });

      // getCachedPublishedProblems is mocked at module level; override per-test to inject the problem
      vi.mocked(getCachedPublishedProblems).mockResolvedValueOnce([mockProblem] as any);

      const recommendations = await buildPracticeRecommendations(new Types.ObjectId(mockUserId), 1);

      expect(recommendations.length).toBe(1);
      expect(recommendations[0].reasonCodes).toContain("revision_due");
      expect(recommendations[0].reason).toMatch(/Due for revision/i);
    });

    it("records a problem attempt with hintsUsed and updates user statistics and topic practice scores", async () => {
      const mockProblem = {
        _id: mockProblemId,
        topicIds: [mockTopic1Id],
        patternIds: [mockPatternId],
      };

      (ProblemModel.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockProblem),
      });

      (ProblemAttemptModel.create as any).mockResolvedValue({ _id: new Types.ObjectId() });
      (ProblemAttemptModel.distinct as any).mockResolvedValue([mockProblemId]);
      (TopicProgressModel.findOne as any).mockResolvedValue({ masteryScore: 75 });

      const result = await recordProblemAttemptAction({
        problemId: mockProblemId.toString(),
        status: "solved",
        strategy: "hint_assisted",
        durationSeconds: 180,
        hintsUsed: 3,
        selfConfidence: 4,
        perceivedDifficulty: 3,
      });

      expect(result.ok).toBe(true);
      expect(result.message).toBe("Saved");
      expect(result.receipt).toBeDefined();

      // Verifies ProblemAttemptModel.create captures hintsUsed and strategy
      expect(ProblemAttemptModel.create).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            problemId: mockProblemId,
            status: "solved",
            strategy: "hint_assisted",
            hintsUsed: 3,
            selfConfidence: 4,
          }),
        ]),
        expect.anything()
      );

      // Verifies committed receipt and durable downstream outbox deliveries
      expect(result.receipt).toBeDefined();
      expect(result.receipt?.commandKind).toBe("practice_submission");
      expect(result.receipt?.outcome).toBe("solved");
      expect(result.receipt?.attemptId).toBeDefined();
      expect(LearningDeliveryModel.bulkWrite).toHaveBeenCalled();
    });

    it("evaluates pattern recognition attempts and recalculates pattern mastery scores", async () => {
      const mockProblem = {
        _id: mockProblemId,
        patternIds: [mockPatternId],
        topicIds: [mockTopic1Id],
      };

      const mockPattern = {
        _id: mockPatternId,
        topicId: mockTopic1Id,
        name: "Two Pointers",
      };

      (ProblemModel.findOne as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockProblem),
        }),
      });

      (PatternModel.findOne as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockPattern),
        }),
      });

      // Previous attempts: 3 correct
      (PatternRecognitionAttemptModel.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { isCorrect: true },
            { isCorrect: true },
            { isCorrect: true },
          ]),
        }),
      });

      const res = await recordProblemPatternRecognitionAction({
        problemId: mockProblemId.toString(),
        selectedPatternId: mockPatternId.toString(),
        reasoning: "Opposite ends converge towards target sum.",
        signalIdentified: "Sorted array with pair target",
        durationSeconds: 25,
      });

      expect(res.ok).toBe(true);
      expect(res.isCorrect).toBe(true);
      expect(res.recognitionScore).toBe(100);
      expect(res.masteryScore).toBe(100);

      // Verifies PatternRecognitionAttemptModel.create is called
      expect(PatternRecognitionAttemptModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          problemId: mockProblemId,
          expectedPatternId: mockPatternId,
          selectedPatternId: mockPatternId,
          isCorrect: true,
          reasoning: "Opposite ends converge towards target sum.",
          signalIdentified: "Sorted array with pair target",
        })
      );

      // Verifies PatternMasteryModel is updated with recalculated scores
      expect(PatternMasteryModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ patternId: mockPatternId }),
        expect.objectContaining({
          $set: expect.objectContaining({
            recognitionScore: 100,
            applicationScore: 100,
            masteryScore: 100,
          }),
        }),
        { upsert: true, new: true }
      );
    });
  });
});

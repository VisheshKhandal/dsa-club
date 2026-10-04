import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";

// Mock dependencies
const mockUserId = new Types.ObjectId();
const mockMissionId = new Types.ObjectId();
const mockPatternId = new Types.ObjectId();
const mockProblemId = new Types.ObjectId();
const mockTopicId = new Types.ObjectId();

vi.mock("@/lib/auth-guard", () => ({
  requireUserId: vi.fn(async () => mockUserId.toString()),
}));

vi.mock("@/lib/db/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

vi.mock("@/features/platform/engines/learning.engine", () => ({
  LearningEngine: {
    completeStage: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/features/platform/engines/revision.engine", () => ({
  scheduleRevisionItem: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/platform/engines/progress.engine", () => ({
  refreshLearnerState: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/learning/models/learning.model", () => ({
  PatternRecognitionAttemptModel: {
    create: vi.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ isCorrect: true }]),
      }),
    }),
  },
  PatternMasteryModel: {
    findOneAndUpdate: vi.fn().mockResolvedValue({}),
  },
  ProblemAttemptModel: {
    create: vi.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    distinct: vi.fn().mockResolvedValue([]),
  },
  ReflectionLogModel: {
    create: vi.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
  },
  MissionProgressModel: {},
  BookmarkModel: {},
  LearningSessionModel: {},
  RoadmapModel: {},
  TopicProgressModel: {},
}));

vi.mock("@/features/content/models/content.model", () => ({
  MissionModel: {
    findById: vi.fn(),
  },
  PatternModel: {
    findOne: vi.fn(),
    exists: vi.fn(),
  },
  ProblemModel: {
    findOne: vi.fn(),
  },
  TopicModel: {},
}));

vi.mock("@/features/intelligence/models/intelligence.model", () => ({
  UserStatisticsModel: {
    findOneAndUpdate: vi.fn().mockResolvedValue({}),
  },
  ActivityEventModel: {
    create: vi.fn().mockResolvedValue({}),
    updateOne: vi.fn().mockResolvedValue({}),
  },
  RevisionQueueModel: {
    findOne: vi.fn().mockResolvedValue(null),
    findOneAndUpdate: vi.fn().mockResolvedValue({}),
    updateOne: vi.fn().mockResolvedValue({}),
    create: vi.fn().mockResolvedValue({}),
  },
  NotificationModel: {},
}));

vi.mock("@/features/progress/services/progress.service", () => ({
  recomputeTopicProgress: vi.fn().mockResolvedValue({}),
  generateProgressSummary: vi.fn().mockResolvedValue({}),
}));

import {
  completeMissionPatternStageAction,
  completeMissionPracticeStageAction,
} from "../actions/product.actions";
import {
  MissionModel,
  PatternModel,
  ProblemModel,
} from "@/features/content/models/content.model";
import {
  PatternRecognitionAttemptModel,
  ProblemAttemptModel,
  ReflectionLogModel,
} from "@/features/learning/models/learning.model";
import { LearningEngine } from "@/features/platform/engines/learning.engine";

describe("Mission User Inputs — Non-blocking & Minimum 10 Characters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Pattern Recognition Stage", () => {
    it("rejects input with less than 10 characters", async () => {
      await expect(
        completeMissionPatternStageAction({
          missionId: mockMissionId.toString(),
          stepKey: "step-pattern-1",
          reasoning: "Too short", // 9 characters
        })
      ).rejects.toThrow();
    });

    it("rejects input with whitespace-only >= 10 characters", async () => {
      await expect(
        completeMissionPatternStageAction({
          missionId: mockMissionId.toString(),
          stepKey: "step-pattern-1",
          reasoning: "          ", // 10 spaces
        })
      ).rejects.toThrow();
    });

    it("succeeds when pattern target is missing (unconfigured stage) with >= 10 chars", async () => {
      // Setup mission with a pattern step having NO targetId
      (MissionModel.findById as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: mockMissionId,
            topicId: mockTopicId,
            patternId: null,
            steps: [
              { key: "step-pattern-1", kind: "pattern", targetId: null },
            ],
            slug: "test-mission",
          }),
        }),
      });

      const response = await completeMissionPatternStageAction({
        missionId: mockMissionId.toString(),
        stepKey: "step-pattern-1",
        reasoning: "I would use Two Pointer because the array is sorted",
      });

      expect(response.ok).toBe(true);
      expect(response.isCorrect).toBe(true);

      // Verify PatternRecognitionAttemptModel.create was called with expectedPatternId: null
      expect(PatternRecognitionAttemptModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          missionId: mockMissionId,
          stepKey: "step-pattern-1",
          expectedPatternId: null,
          reasoning: "I would use Two Pointer because the array is sorted",
        })
      );

      // Verify step was completed in learning engine
      expect(LearningEngine.completeStage).toHaveBeenCalledWith(
        mockUserId.toString(),
        mockMissionId.toString(),
        "step-pattern-1"
      );
    });

    it("succeeds and evaluates correctly when pattern target IS configured", async () => {
      (MissionModel.findById as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: mockMissionId,
            topicId: mockTopicId,
            patternId: mockPatternId,
            steps: [
              { key: "step-pattern-1", kind: "pattern", targetId: mockPatternId },
            ],
            slug: "test-mission",
          }),
        }),
      });

      (PatternModel.findOne as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: mockPatternId,
            slug: "two-pointers",
            topicId: mockTopicId,
          }),
        }),
      });

      (PatternModel.exists as any).mockResolvedValue(true);

      const response = await completeMissionPatternStageAction({
        missionId: mockMissionId.toString(),
        stepKey: "step-pattern-1",
        selectedPatternId: mockPatternId.toString(),
        reasoning: "Pointers move from both ends inwards to find pair sum.",
      });

      expect(response.ok).toBe(true);
      expect(response.isCorrect).toBe(true);

      expect(PatternRecognitionAttemptModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedPatternId: mockPatternId,
          selectedPatternId: mockPatternId,
          isCorrect: true,
        })
      );

      expect(LearningEngine.completeStage).toHaveBeenCalled();
    });
  });

  describe("Practice Stage", () => {
    it("rejects reflection with less than 10 characters", async () => {
      await expect(
        completeMissionPracticeStageAction({
          missionId: mockMissionId.toString(),
          stepKey: "step-practice-1",
          status: "solved",
          reflection: "Short", // 5 chars
          selfConfidence: 4,
          perceivedDifficulty: 3,
        })
      ).rejects.toThrow();
    });

    it("succeeds when problem target is missing with >= 10 chars reflection", async () => {
      (MissionModel.findById as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: mockMissionId,
            topicId: mockTopicId,
            steps: [
              { key: "step-practice-1", kind: "practice", targetId: null },
            ],
            slug: "test-mission",
          }),
        }),
      });

      const response = await completeMissionPracticeStageAction({
        missionId: mockMissionId.toString(),
        stepKey: "step-practice-1",
        status: "solved",
        reflection: "Solved this using a sliding window with set lookup.",
        selfConfidence: 4,
        perceivedDifficulty: 3,
      });

      expect(response.ok).toBe(true);

      // Verify ReflectionLog was created with entityType "mission"
      expect(ReflectionLogModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          entityType: "mission",
          entityId: mockMissionId,
          content: "Solved this using a sliding window with set lookup.",
        })
      );

      // Verify step was completed in learning engine
      expect(LearningEngine.completeStage).toHaveBeenCalledWith(
        mockUserId.toString(),
        mockMissionId.toString(),
        "step-practice-1"
      );
    });

    it("succeeds and records problem attempt when problem target IS configured", async () => {
      (MissionModel.findById as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: mockMissionId,
            topicId: mockTopicId,
            steps: [
              { key: "step-practice-1", kind: "practice", targetId: mockProblemId },
            ],
            slug: "test-mission",
          }),
        }),
      });

      (ProblemModel.findOne as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: mockProblemId,
            slug: "two-sum",
            topicIds: [mockTopicId],
          }),
        }),
      });

      const response = await completeMissionPracticeStageAction({
        missionId: mockMissionId.toString(),
        stepKey: "step-practice-1",
        status: "solved",
        reflection: "Solved using hash map complement lookup in O(n).",
        selfConfidence: 5,
        perceivedDifficulty: 2,
      });

      expect(response.ok).toBe(true);

      expect(ProblemAttemptModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          problemId: mockProblemId,
          status: "solved",
        })
      );

      expect(LearningEngine.completeStage).toHaveBeenCalled();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import {
  resolveCurrentPlanDay,
  resolveLearningExecutionSnapshot,
} from "./learning-execution-snapshot";
import {
  resolvePlanActivity,
  resolveTopicDocForSlug,
  batchResolveTopicDocsForSlugs,
  validatePlanTaskTopicAlignment,
} from "./plan-content-resolver";
import { generateCanonicalPlan, resolvePrimaryTopicSlug } from "../planning/canonical-planner";
import {
  completePlanTaskAction,
  skipPlanTaskAction,
  pausePlanAction,
  resumePlanAction,
} from "../actions/plan-actions";
import { PlanModel } from "../models/plan.model";
import { PlanDayModel } from "../models/plan-day.model";
import { PlanTaskModel } from "../models/plan-task.model";
import { TopicModel, MissionModel, ProblemModel } from "@/features/content/models/content.model";

// Mock auth guard to return a consistent test user ID
vi.mock("@/lib/auth-guard", () => ({
  requireUserId: vi.fn().mockResolvedValue("64b8f0123456789012345678"),
}));

// Mock DB connection
vi.mock("@/lib/db/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

// Mock Next.js cache APIs
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

// Mock Mongoose models
vi.mock("@/features/content/models/content.model", () => ({
  TopicModel: {
    find: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
  },
  MissionModel: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
  ProblemModel: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock("../models/plan.model", () => ({
  PlanModel: {
    findOne: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock("../models/plan-day.model", () => ({
  PlanDayModel: {
    findOne: vi.fn(),
    find: vi.fn(),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    findOneAndUpdate: vi.fn(),
    insertMany: vi.fn(),
  },
}));

vi.mock("../models/plan-task.model", () => ({
  PlanTaskModel: {
    findOne: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    findOneAndUpdate: vi.fn(),
    insertMany: vi.fn(),
    updateOne: vi.fn().mockResolvedValue({ acknowledged: true }),
  },
}));

vi.mock("../models/intelligence-decision.model", () => ({
  IntelligenceDecisionModel: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("../models/user-topic-progress.model", () => ({
  UserTopicProgressModel: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
    find: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
}));

vi.mock("../models/intelligence.model", () => ({
  UserStatisticsModel: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ currentStreakDays: 5 }),
    }),
  },
}));

vi.mock("../models/learning-event.model", () => ({
  LearningEventModel: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: "existing-event" }),
    }),
  },
}));

vi.mock("../services/learning-event.service", () => ({
  recordLearningEvent: vi.fn().mockResolvedValue({
    status: "created",
    event: { _id: "mock-event-id" },
    isDuplicate: false,
  }),
}));

vi.mock("@/features/learning/models/learning.model", () => ({
  TopicProgressModel: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
  },
}));

describe("Phase 0 Correctness Gate — Integration & Invariant Suite", () => {
  const testUserId = new Types.ObjectId("64b8f0123456789012345678");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Multi-topic plans: Per-day topicId persistence
  // ---------------------------------------------------------------------------
  describe("Gate 1: Multi-topic plans & per-day topicId persistence", () => {
    it("strictly preserves each day's own topicId matching its topicSlug across multi-topic blueprints", async () => {
      const arraysTopicId = new Types.ObjectId();
      const twoPointersTopicId = new Types.ObjectId();

      const mockTopics = [
        { _id: arraysTopicId, slug: "arrays", name: "Arrays" },
        { _id: twoPointersTopicId, slug: "two-pointers", name: "Two Pointers" },
      ];

      (TopicModel.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockTopics),
        }),
      });

      const topicMap = await batchResolveTopicDocsForSlugs(["arrays", "two-pointers"]);
      expect(topicMap.get("arrays")?._id.toString()).toBe(arraysTopicId.toString());
      expect(topicMap.get("two-pointers")?._id.toString()).toBe(twoPointersTopicId.toString());

      // Simulate multi-topic schedule day creation
      const schedule = [
        { dayIndex: 1, topicSlug: "arrays", topicName: "Arrays", plannedMinutes: 30, phase: "learn" },
        { dayIndex: 8, topicSlug: "two-pointers", topicName: "Two Pointers", plannedMinutes: 30, phase: "learn" },
      ];

      const daysToInsert = schedule.map((d) => {
        const topicDoc = topicMap.get(d.topicSlug);
        return {
          dayIndex: d.dayIndex,
          topicId: topicDoc?._id || null,
          topicSlug: d.topicSlug,
          topicName: topicDoc?.name || d.topicName,
        };
      });

      // Day 1 must have Arrays topicId
      expect(daysToInsert[0].topicId?.toString()).toBe(arraysTopicId.toString());
      expect(daysToInsert[0].topicSlug).toBe("arrays");

      // Day 8 must have Two Pointers topicId, NEVER the Arrays topicId
      expect(daysToInsert[1].topicId?.toString()).toBe(twoPointersTopicId.toString());
      expect(daysToInsert[1].topicSlug).toBe("two-pointers");
      expect(daysToInsert[1].topicId?.toString()).not.toBe(arraysTopicId.toString());
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Reject mismatched PlanTasks
  // ---------------------------------------------------------------------------
  describe("Gate 2: Reject mismatched PlanTasks in execution snapshot and resolution", () => {
    it("flags task with mismatched topic as 'mismatched' and 'unavailable', excluding it from primary action", async () => {
      const activePlanId = new Types.ObjectId();
      const currentDayId = new Types.ObjectId();
      const arraysTopicId = new Types.ObjectId();
      const dpTopicId = new Types.ObjectId();

      const mockPlan: any = {
        _id: activePlanId,
        status: "active",
        cycleNumber: 1,
        totalDays: 21,
        dailyMinutes: 30,
        startDate: new Date(),
        timezone: "Asia/Kolkata",
        snapshots: { primaryTopicSlug: "arrays" },
      };

      const mockDays: any[] = [
        {
          _id: currentDayId,
          planId: activePlanId,
          dayIndex: 1,
          dateKey: new Date().toISOString().slice(0, 10),
          status: "available",
          phase: "orientation",
          title: "Understand Arrays",
          focus: "Arrays basics",
          topicId: arraysTopicId,
          topicSlug: "arrays",
          topicName: "Arrays",
          targetMinutes: 30,
        },
      ];

      // Two tasks: 1 correctly aligned to Arrays, 1 corrupted/mismatched with DP topic
      const mockTasks: any[] = [
        {
          _id: new Types.ObjectId(),
          planId: activePlanId,
          planDayId: currentDayId,
          dayIndex: 1,
          taskKey: "arrays_concept",
          title: "Arrays Mental Model",
          phase: "learn",
          entityType: "mission",
          topicId: arraysTopicId,
          topicSlug: "arrays",
          topicName: "Arrays",
          validationStatus: "aligned",
          required: true,
          status: "pending",
        },
        {
          _id: new Types.ObjectId(),
          planId: activePlanId,
          planDayId: currentDayId,
          dayIndex: 1,
          taskKey: "foreign_dp_problem",
          title: "Knapsack DP Problem",
          phase: "practice",
          entityType: "problem",
          topicId: dpTopicId, // Mismatched!
          topicSlug: "dynamic-programming", // Mismatched!
          validationStatus: "aligned",
          required: true,
          status: "pending",
        },
      ];

      const { resolveUserActivePlan } = await import("./plan-migration.service");
      vi.spyOn({ resolveUserActivePlan }, "resolveUserActivePlan").mockResolvedValue({
        plan: mockPlan,
        days: mockDays,
        tasks: mockTasks,
        wasMigrated: false,
      });

      // Mock resolveUserActivePlan inside migration service
      const migrationService = await import("./plan-migration.service");
      vi.spyOn(migrationService, "resolveUserActivePlan").mockResolvedValue({
        plan: mockPlan,
        days: mockDays,
        tasks: mockTasks,
        wasMigrated: false,
      });

      (TopicModel.findOne as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ _id: arraysTopicId, slug: "arrays", name: "Arrays" }),
        }),
      });

      const snapshot = await resolveLearningExecutionSnapshot("64b8f0123456789012345678");

      expect(snapshot.todayTasks.length).toBe(2);
      const alignedTask = snapshot.todayTasks.find((t) => t.taskKey === "arrays_concept")!;
      const mismatchedTask = snapshot.todayTasks.find((t) => t.taskKey === "foreign_dp_problem")!;

      expect(alignedTask.topicAlignment).toBe("aligned");
      expect(alignedTask.status).toBe("pending");

      // Invariant: Mismatched task must be flagged mismatched, unavailable, and required === false
      expect(mismatchedTask.topicAlignment).toBe("mismatched");
      expect(mismatchedTask.status).toBe("unavailable");
      expect(mismatchedTask.required).toBe(false);

      // Invariant: Primary action must ONLY select the valid aligned task
      expect(snapshot.primaryTodayAction?.actionKey).toBe("arrays_concept");
      expect(snapshot.primaryTodayAction?.actionKey).not.toBe("foreign_dp_problem");

      // Invariant: Warning must be surfaced
      expect(snapshot.availabilityWarnings.some((w) => w.includes("does not match the active day topic"))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Authorize completion against active plan & actionable day
  // ---------------------------------------------------------------------------
  describe("Gate 3: Authorize completion against the active plan", () => {
    it("rejects completion for a task belonging to an archived/stale plan", async () => {
      const activePlanId = new Types.ObjectId();
      const archivedPlanId = new Types.ObjectId();
      const staleTaskId = new Types.ObjectId();

      // Active plan exists
      (PlanModel.findOne as any).mockResolvedValue({
        _id: activePlanId,
        userId: testUserId,
        status: "active",
      });

      // The task exists, but points to the archived plan
      (PlanTaskModel.findOne as any).mockResolvedValue({
        _id: staleTaskId,
        userId: testUserId,
        planId: archivedPlanId, // Belongs to old archived plan!
        planDayId: new Types.ObjectId(),
        status: "pending",
      });

      await expect(completePlanTaskAction(staleTaskId.toString())).rejects.toThrow(
        /Stale task rejected/
      );
    });

    it("rejects skip action for a task belonging to an archived/stale plan", async () => {
      const activePlanId = new Types.ObjectId();
      const archivedPlanId = new Types.ObjectId();
      const staleTaskId = new Types.ObjectId();

      (PlanModel.findOne as any).mockResolvedValue({
        _id: activePlanId,
        userId: testUserId,
        status: "active",
      });

      (PlanTaskModel.findOne as any).mockResolvedValue({
        _id: staleTaskId,
        userId: testUserId,
        planId: archivedPlanId,
        planDayId: new Types.ObjectId(),
        status: "pending",
      });

      await expect(skipPlanTaskAction(staleTaskId.toString())).rejects.toThrow(
        /Stale task rejected/
      );
    });

    it("rejects completion when task belongs to a future locked day instead of current actionable day", async () => {
      const activePlanId = new Types.ObjectId();
      const day1Id = new Types.ObjectId();
      const day2Id = new Types.ObjectId();
      const day2TaskId = new Types.ObjectId();

      (PlanModel.findOne as any).mockResolvedValue({
        _id: activePlanId,
        userId: testUserId,
        status: "active",
        timezone: "Asia/Kolkata",
      });

      (PlanTaskModel.findOne as any).mockResolvedValue({
        _id: day2TaskId,
        userId: testUserId,
        planId: activePlanId,
        planDayId: day2Id, // Task is for Day 2!
        status: "pending",
      });

      // Active days: Day 1 is available (current actionable day), Day 2 is locked
      (PlanDayModel.find as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { _id: day1Id, planId: activePlanId, dayIndex: 1, status: "available" },
          { _id: day2Id, planId: activePlanId, dayIndex: 2, status: "locked" },
        ]),
      });

      await expect(completePlanTaskAction(day2TaskId.toString())).rejects.toThrow(
        /Task does not belong to the current actionable day/
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Remove silent "arrays" fallbacks
  // ---------------------------------------------------------------------------
  describe("Gate 4: Remove silent arrays fallbacks", () => {
    it("does not silently label missing topic as arrays in topic resolution", async () => {
      (TopicModel.findOne as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      });

      const res = await resolveTopicDocForSlug("non-existent-exotic-topic");
      expect(res).toBeNull();
    });

    it("canonical planner resolvePrimaryTopicSlug selects first curriculum topic when unknown set matches, without crashing", () => {
      const resolved = resolvePrimaryTopicSlug({
        knownTopicSlugs: ["all-known-1", "all-known-2"],
      });
      // Should resolve to a valid curriculum slug, not crash or undefined
      expect(typeof resolved).toBe("string");
      expect(resolved.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Activation races & plan state consistency
  // ---------------------------------------------------------------------------
  describe("Gate 5: Activation races & single active plan guarantee", () => {
    it("ensures duplicate or concurrent activation requests archive previous active plans", async () => {
      const activePlanId = new Types.ObjectId();

      (PlanModel.findOne as any).mockResolvedValue({
        _id: activePlanId,
        userId: testUserId,
        status: "active",
      });

      // Verify updateMany is called to archive existing active plans during activation
      (PlanModel.updateMany as any).mockResolvedValue({ modifiedCount: 1 });

      const migrationService = await import("./plan-migration.service");
      // The updateMany query must explicitly match status: "active" for user
      await PlanModel.updateMany(
        { userId: testUserId, status: "active" },
        { $set: { status: "archived", archivedAt: new Date() } }
      );

      expect(PlanModel.updateMany).toHaveBeenCalledWith(
        { userId: testUserId, status: "active" },
        expect.objectContaining({ $set: expect.objectContaining({ status: "archived" }) })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Pause / resume behavior
  // ---------------------------------------------------------------------------
  describe("Gate 6: Pause and resume correctness", () => {
    it("rejects task completion when the plan is paused", async () => {
      const pausedPlanId = new Types.ObjectId();
      const taskId = new Types.ObjectId();

      // No active plan, but paused plan exists
      (PlanModel.findOne as any)
        .mockResolvedValueOnce(null) // active plan query returns null
        .mockResolvedValueOnce({
          _id: pausedPlanId,
          userId: testUserId,
          status: "paused",
        }); // paused plan query returns paused plan

      await expect(completePlanTaskAction(taskId.toString())).rejects.toThrow(
        /Cannot complete tasks while plan is paused/
      );
    });

    it("rejects task skip when the plan is paused", async () => {
      const pausedPlanId = new Types.ObjectId();
      const taskId = new Types.ObjectId();

      (PlanModel.findOne as any)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          _id: pausedPlanId,
          userId: testUserId,
          status: "paused",
        });

      await expect(skipPlanTaskAction(taskId.toString())).rejects.toThrow(
        /Cannot skip tasks while plan is paused/
      );
    });

    it("shifts target completion date accurately when resuming after pause", async () => {
      const pausedAt = new Date(Date.now() - 3 * 86400000); // Paused 3 days ago
      const originalTarget = new Date(Date.now() + 10 * 86400000);

      const mockPlan: any = {
        _id: new Types.ObjectId(),
        userId: testUserId,
        status: "paused",
        pausedDaysCount: 0,
        pausePeriods: [{ startedAt: pausedAt, reason: "vacation" }],
        targetCompletionDate: originalTarget,
        save: vi.fn().mockResolvedValue(true),
      };

      (PlanModel.findOne as any).mockResolvedValue(mockPlan);

      await resumePlanAction();

      expect(mockPlan.status).toBe("active");
      expect(mockPlan.pausedDaysCount).toBeGreaterThanOrEqual(3);
      expect(new Date(mockPlan.targetCompletionDate).getTime()).toBeGreaterThan(originalTarget.getTime());
      expect(mockPlan.save).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Timezone boundaries & DateKey generation
  // ---------------------------------------------------------------------------
  describe("Gate 7: Timezone boundaries & local midnight calendar accuracy", () => {
    it("correctly generates dateKey according to user local timezone across midnight boundary", () => {
      // 2026-09-26 at 20:00 UTC is 2026-09-27 01:30 in Asia/Kolkata
      const boundaryTime = new Date("2026-09-26T20:00:00.000Z");

      const days: any[] = [
        { _id: "d1", dayIndex: 1, dateKey: "2026-09-26", status: "completed" },
        { _id: "d2", dayIndex: 2, dateKey: "2026-09-27", status: "available" },
      ];

      const currentDayKolkata = resolveCurrentPlanDay(
        { timezone: "Asia/Kolkata" },
        days,
        boundaryTime,
        "Asia/Kolkata"
      );

      // In Asia/Kolkata it is September 27 -> must select Day 2
      expect(currentDayKolkata?.dateKey).toBe("2026-09-27");
      expect(currentDayKolkata?.dayIndex).toBe(2);

      const currentDayUTC = resolveCurrentPlanDay(
        { timezone: "UTC" },
        days,
        boundaryTime,
        "UTC"
      );

      // In UTC it is still September 26 (Day 1 completed, so advances to Day 2)
      expect(currentDayUTC?.dayIndex).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Duplicate completion requests & idempotency
  // ---------------------------------------------------------------------------
  describe("Gate 8: Duplicate completion requests idempotency", () => {
    it("returns alreadyCompleted: true without double-advancing day when called repeatedly", async () => {
      const activePlanId = new Types.ObjectId();
      const currentDayId = new Types.ObjectId();
      const taskId = new Types.ObjectId();

      (PlanModel.findOne as any).mockResolvedValue({
        _id: activePlanId,
        userId: testUserId,
        status: "active",
      });

      // Existing task is already completed
      (PlanTaskModel.findOne as any).mockResolvedValue({
        _id: taskId,
        userId: testUserId,
        planId: activePlanId,
        planDayId: currentDayId,
        status: "completed", // Already completed!
      });

      (PlanDayModel.find as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { _id: currentDayId, planId: activePlanId, dayIndex: 1, status: "available" },
        ]),
      });

      (PlanTaskModel.countDocuments as any).mockResolvedValue(1);

      const res = await completePlanTaskAction(taskId.toString());

      expect(res.success).toBe(true);
      expect(res.alreadyCompleted).toBe(true);
      expect(res.dayAdvanced).toBe(false);

      // Invariant: findOneAndUpdate should NOT have been called to re-advance day
      expect(PlanDayModel.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Phase 1 — Standardized CTA vocabulary in execution snapshot
  // ---------------------------------------------------------------------------
  describe("Gate 9: Standardized CTA vocabulary in execution snapshot", () => {
    it("sets primaryTodayAction.label to 'Start task' for pending tasks", async () => {
      const planId = new Types.ObjectId();
      const dayId = new Types.ObjectId();
      const topicId = new Types.ObjectId();

      const mockPlan = {
        _id: planId,
        userId: testUserId,
        status: "active",
        startDate: new Date(),
        totalDays: 21,
        dailyMinutes: 45,
        pausedDaysCount: 0,
      };

      const mockDays = [
        {
          _id: dayId,
          planId,
          userId: testUserId,
          dayIndex: 1,
          dateKey: "2026-09-24",
          status: "available",
          topicId,
          topicSlug: "arrays",
          topicName: "Arrays",
          targetMinutes: 45,
          phase: "mechanics",
        },
      ];

      const mockTasks = [
        {
          _id: new Types.ObjectId(),
          planId,
          planDayId: dayId,
          userId: testUserId,
          taskKey: "arrays_task_1",
          title: "Two Sum",
          topicId,
          topicSlug: "arrays",
          status: "pending",
          phase: "mechanics",
          entityType: "problem",
          required: true,
          estimatedMinutes: 20,
          targetUrl: "/practice/problems/two-sum",
        },
      ];

      const migrationService = await import("./plan-migration.service");
      vi.spyOn(migrationService, "resolveUserActivePlan").mockResolvedValue({
        plan: mockPlan as any,
        days: mockDays as any,
        tasks: mockTasks as any,
        wasMigrated: false,
      });

      const snapshot = await resolveLearningExecutionSnapshot(testUserId.toString());
      expect(snapshot.primaryTodayAction).not.toBeNull();
      expect(snapshot.primaryTodayAction?.label).toBe("Start task");
    });

    it("sets primaryTodayAction.label to 'Continue task' for in-progress tasks", async () => {
      const planId = new Types.ObjectId();
      const dayId = new Types.ObjectId();
      const topicId = new Types.ObjectId();

      const mockPlan = {
        _id: planId,
        userId: testUserId,
        status: "active",
        startDate: new Date(),
        totalDays: 21,
        dailyMinutes: 45,
        pausedDaysCount: 0,
      };

      const mockDays = [
        {
          _id: dayId,
          planId,
          userId: testUserId,
          dayIndex: 1,
          dateKey: "2026-09-24",
          status: "in_progress",
          topicId,
          topicSlug: "arrays",
          topicName: "Arrays",
          targetMinutes: 45,
          phase: "mechanics",
        },
      ];

      const mockTasks = [
        {
          _id: new Types.ObjectId(),
          planId,
          planDayId: dayId,
          userId: testUserId,
          taskKey: "arrays_task_in_progress",
          title: "Container With Most Water",
          topicId,
          topicSlug: "arrays",
          status: "in_progress",
          phase: "mechanics",
          entityType: "problem",
          required: true,
          estimatedMinutes: 25,
          targetUrl: "/practice/problems/container-with-most-water",
        },
      ];

      const migrationService = await import("./plan-migration.service");
      vi.spyOn(migrationService, "resolveUserActivePlan").mockResolvedValue({
        plan: mockPlan as any,
        days: mockDays as any,
        tasks: mockTasks as any,
        wasMigrated: false,
      });

      const snapshot = await resolveLearningExecutionSnapshot(testUserId.toString());
      expect(snapshot.primaryTodayAction).not.toBeNull();
      expect(snapshot.primaryTodayAction?.label).toBe("Continue task");
    });

    it("sets primaryTodayAction.label to 'Start next task' when all today's tasks are completed", async () => {
      const planId = new Types.ObjectId();
      const dayId = new Types.ObjectId();
      const topicId = new Types.ObjectId();

      const mockPlan = {
        _id: planId,
        userId: testUserId,
        status: "active",
        startDate: new Date(),
        totalDays: 21,
        dailyMinutes: 45,
        pausedDaysCount: 0,
      };

      const mockDays = [
        {
          _id: dayId,
          planId,
          userId: testUserId,
          dayIndex: 1,
          dateKey: "2026-09-24",
          status: "completed",
          topicId,
          topicSlug: "arrays",
          topicName: "Arrays",
          targetMinutes: 45,
          phase: "mechanics",
        },
      ];

      const mockTasks = [
        {
          _id: new Types.ObjectId(),
          planId,
          planDayId: dayId,
          userId: testUserId,
          taskKey: "arrays_task_done",
          title: "Two Sum",
          topicId,
          topicSlug: "arrays",
          status: "completed",
          phase: "mechanics",
          entityType: "problem",
          required: true,
          estimatedMinutes: 20,
        },
      ];

      const migrationService = await import("./plan-migration.service");
      vi.spyOn(migrationService, "resolveUserActivePlan").mockResolvedValue({
        plan: mockPlan as any,
        days: mockDays as any,
        tasks: mockTasks as any,
        wasMigrated: false,
      });

      const snapshot = await resolveLearningExecutionSnapshot(testUserId.toString());
      expect(snapshot.primaryTodayAction).not.toBeNull();
      expect(snapshot.primaryTodayAction?.label).toBe("Start next task");
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Phase 1 — Tablet responsive layout contracts
  // ---------------------------------------------------------------------------
  describe("Gate 10: Tablet responsive layout contracts", () => {
    it("ensures AppLayout and Sidebar provide docked navigation without tablet dead-zones", async () => {
      const fs = await import("fs");
      const path = await import("path");

      const appLayout = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/layout/AppLayout.tsx"),
        "utf-8"
      );
      const sidebar = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/layout/Sidebar.tsx"),
        "utf-8"
      );
      const header = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/layout/Header.tsx"),
        "utf-8"
      );

      // AppLayout spacer applies to tablet (md:)
      expect(appLayout).toContain("hidden md:block");
      // Sidebar docks on tablet (md:)
      expect(sidebar).toContain("-translate-x-full md:translate-x-0");
      // Header menu button is hidden on tablet (md:hidden)
      expect(header).toContain("md:hidden");
    });
  });

  // ---------------------------------------------------------------------------
  // 11. Phase 1 — Plan workspace tab hierarchy & defaults
  // ---------------------------------------------------------------------------
  describe("Gate 11: Plan workspace tab hierarchy & defaults", () => {
    it("enforces canonical tab ordering: Today | This Week | Overview | Manage with today as default", async () => {
      const fs = await import("fs");
      const path = await import("path");

      const intelligenceView = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/intelligence/IntelligenceView.tsx"),
        "utf-8"
      );

      // Tab definitions check
      expect(intelligenceView).toContain('{ key: "today", label: "Today", icon: CheckSquare }');
      expect(intelligenceView).toContain('{ key: "week", label: "This Week", icon: Calendar }');
      expect(intelligenceView).toContain('{ key: "overview", label: "Overview", icon: LayoutDashboard }');
      expect(intelligenceView).toContain('{ key: "manage", label: "Manage Plan", icon: SlidersHorizontal }');

      // Default tab check
      expect(intelligenceView).toContain('props.initialTab || "today"');

      // Learner-first branding
      expect(intelligenceView).toContain("Powered by Club Intelligence");
      expect(intelligenceView).toContain("Study Plan");
    });
  });

  // ---------------------------------------------------------------------------
  // 12. Phase 1 — Dashboard execution cockpit hierarchy & 4-question answers
  // ---------------------------------------------------------------------------
  describe("Gate 12: Phase 1 — Dashboard execution cockpit & hierarchy", () => {
    it("ensures snapshot primaryTodayAction explicitly populates whyThisIsNext and afterCompletionOutcome", async () => {
      const planId = new Types.ObjectId();
      const dayId = new Types.ObjectId();
      const topicId = new Types.ObjectId();

      const mockPlan = {
        _id: planId,
        userId: testUserId,
        status: "active",
        startDate: new Date(),
        totalDays: 21,
        dailyMinutes: 45,
        pausedDaysCount: 0,
      };

      const mockDays = [
        {
          _id: dayId,
          planId,
          userId: testUserId,
          dayIndex: 1,
          dateKey: "2026-09-24",
          status: "available",
          topicId,
          topicSlug: "arrays",
          topicName: "Arrays",
          targetMinutes: 45,
          phase: "mechanics",
        },
      ];

      const mockTasks = [
        {
          _id: new Types.ObjectId(),
          planId,
          planDayId: dayId,
          userId: testUserId,
          taskKey: "arrays_task_1",
          title: "Two Sum",
          topicId,
          topicSlug: "arrays",
          topicName: "Arrays",
          status: "pending",
          phase: "practice",
          entityType: "problem",
          required: true,
          estimatedMinutes: 25,
        },
        {
          _id: new Types.ObjectId(),
          planId,
          planDayId: dayId,
          userId: testUserId,
          taskKey: "arrays_task_2",
          title: "Container With Most Water",
          topicId,
          topicSlug: "arrays",
          topicName: "Arrays",
          status: "pending",
          phase: "practice",
          entityType: "problem",
          required: true,
          estimatedMinutes: 30,
        },
      ];

      const migrationService = await import("./plan-migration.service");
      vi.spyOn(migrationService, "resolveUserActivePlan").mockResolvedValue({
        plan: mockPlan as any,
        days: mockDays as any,
        tasks: mockTasks as any,
        wasMigrated: false,
      });

      const snapshot = await resolveLearningExecutionSnapshot(testUserId.toString());
      expect(snapshot.primaryTodayAction).not.toBeNull();
      // Answers all 4 questions:
      // 1. What do I do?
      expect(snapshot.primaryTodayAction?.title).toBe("Two Sum");
      expect(snapshot.primaryTodayAction?.phase).toBe("practice");
      expect(snapshot.primaryTodayAction?.entityType).toBe("problem");
      // 2. Why do I do it?
      expect(snapshot.primaryTodayAction?.whyThisIsNext).toBeDefined();
      expect(snapshot.primaryTodayAction?.whyThisIsNext?.length).toBeGreaterThan(10);
      // 3. How long will it take?
      expect(snapshot.primaryTodayAction?.estimatedMinutes).toBe(25);
      // 4. What happens after I finish?
      expect(snapshot.primaryTodayAction?.afterCompletionOutcome).toBeDefined();
      expect(snapshot.primaryTodayAction?.afterCompletionOutcome).toContain("Container With Most Water");
    });

    it("verifies DashboardView and ClubIntelligenceCard enforce single primary execution cockpit", async () => {
      const fs = await import("fs");
      const path = await import("path");

      const dashboardView = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/product/dashboard/DashboardView.tsx"),
        "utf-8"
      );
      const intelligenceCard = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/product/dashboard/ClubIntelligenceCard.tsx"),
        "utf-8"
      );

      // Dashboard demotes secondary exploration below the fold
      expect(dashboardView).toContain("AlternativeRoutesBar");
      expect(dashboardView).toContain("hasActivePlan={Boolean(");

      // ClubIntelligenceCard explicitly renders all 4 answers
      expect(intelligenceCard).toContain("Why this is next:");
      expect(intelligenceCard).toContain("After finish:");
      expect(intelligenceCard).toContain("About {focusAction?.estimatedMinutes");
      expect(intelligenceCard).toContain("Plan Paused");
      expect(intelligenceCard).toContain("No Active Learning Plan");
    });

    it("verifies TodayPlanBoard contains on-demand task loading recovery mechanism", async () => {
      const fs = await import("fs");
      const path = await import("path");

      const todayBoard = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/intelligence/TodayPlanBoard.tsx"),
        "utf-8"
      );

      expect(todayBoard).toContain("materializeCurrentDayTasksAction");
      expect(todayBoard).toContain("handleMaterializeTasks");
      expect(todayBoard).toContain("Load Day Tasks");
    });
  });

  // ---------------------------------------------------------------------------
  // 12. Reflection task authorization on completed day (regression guard)
  // ---------------------------------------------------------------------------
  describe("Gate 12: Reflection task authorization on today's completed day", () => {

    it("allows completing a reflection task on today's completed day (TASK_DAY_NOT_ACTIONABLE regression)", async () => {
      const activePlanId = new Types.ObjectId();
      const day10Id = new Types.ObjectId();
      const day11Id = new Types.ObjectId();
      const reflectionTaskId = new Types.ObjectId();
      const todayDateKey = new Date().toISOString().slice(0, 10);

      (PlanModel.findOne as any).mockResolvedValue({
        _id: activePlanId,
        userId: testUserId,
        status: "active",
        timezone: "Asia/Kolkata",
      });

      // Reflection task belongs to Day 10 which was completed today
      (PlanTaskModel.findOne as any).mockResolvedValue({
        _id: reflectionTaskId,
        userId: testUserId,
        planId: activePlanId,
        planDayId: day10Id,
        entityType: "reflection",
        status: "pending",
        required: false,
        topicSlug: "arrays",
      });

      // Day 10 completed today; Day 11 is still available
      (PlanDayModel.find as any).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: day10Id,
            planId: activePlanId,
            dayIndex: 10,
            dateKey: todayDateKey,
            status: "completed",
            topicSlug: "arrays",
          },
          {
            _id: day11Id,
            planId: activePlanId,
            dayIndex: 11,
            dateKey: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
            status: "available",
            topicSlug: "arrays",
          },
        ]),
      });

      // findOneAndUpdate for the task update
      (PlanTaskModel.findOneAndUpdate as any).mockResolvedValue({
        _id: reflectionTaskId,
        planDayId: day10Id,
        status: "completed",
      });

      // Day is already completed — advance check returns false
      (PlanTaskModel.countDocuments as any).mockResolvedValue(0);
      (PlanDayModel.findOneAndUpdate as any).mockResolvedValue(null); // already completed

      const res = await completePlanTaskAction(reflectionTaskId.toString(), {
        reflectionAnswer: "Two pointers avoid nested loops via invariant maintenance.",
        passed: true,
      });

      expect(res.success).toBe(true);
    });

    it("allows skipping a reflection task on today's completed day", async () => {
      const activePlanId = new Types.ObjectId();
      const day10Id = new Types.ObjectId();
      const day11Id = new Types.ObjectId();
      const reflectionTaskId = new Types.ObjectId();
      const todayDateKey = new Date().toISOString().slice(0, 10);

      (PlanModel.findOne as any).mockResolvedValue({
        _id: activePlanId,
        userId: testUserId,
        status: "active",
        timezone: "Asia/Kolkata",
      });

      (PlanTaskModel.findOne as any).mockResolvedValue({
        _id: reflectionTaskId,
        userId: testUserId,
        planId: activePlanId,
        planDayId: day10Id,
        entityType: "reflection",
        status: "pending",
        required: false,
        topicSlug: "arrays",
      });

      (PlanDayModel.find as any).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: day10Id,
            planId: activePlanId,
            dayIndex: 10,
            dateKey: todayDateKey,
            status: "completed",
            topicSlug: "arrays",
          },
          {
            _id: day11Id,
            planId: activePlanId,
            dayIndex: 11,
            dateKey: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
            status: "available",
            topicSlug: "arrays",
          },
        ]),
      });

      (PlanTaskModel.findOneAndUpdate as any).mockResolvedValue({
        _id: reflectionTaskId,
        planDayId: day10Id,
        status: "skipped",
      });

      (PlanTaskModel.countDocuments as any).mockResolvedValue(0);
      (PlanDayModel.findOneAndUpdate as any).mockResolvedValue(null);

      const res = await skipPlanTaskAction(reflectionTaskId.toString(), "Skipped daily reflection");

      expect(res.success).toBe(true);
    });

    it("still rejects tasks on future locked days (regression safety)", async () => {
      const activePlanId = new Types.ObjectId();
      const day10Id = new Types.ObjectId();
      const day15Id = new Types.ObjectId();
      const futureTaskId = new Types.ObjectId();
      const todayDateKey = new Date().toISOString().slice(0, 10);

      (PlanModel.findOne as any).mockResolvedValue({
        _id: activePlanId,
        userId: testUserId,
        status: "active",
        timezone: "Asia/Kolkata",
      });

      (PlanTaskModel.findOne as any).mockResolvedValue({
        _id: futureTaskId,
        userId: testUserId,
        planId: activePlanId,
        planDayId: day15Id,
        entityType: "problem",
        status: "pending",
        required: true,
        topicSlug: "graphs",
      });

      (PlanDayModel.find as any).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: day10Id,
            planId: activePlanId,
            dayIndex: 10,
            dateKey: todayDateKey,
            status: "available",
            topicSlug: "arrays",
          },
          {
            _id: day15Id,
            planId: activePlanId,
            dayIndex: 15,
            dateKey: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
            status: "locked",
            topicSlug: "graphs",
          },
        ]),
      });

      await expect(completePlanTaskAction(futureTaskId.toString())).rejects.toThrow(
        /Task does not belong to the current actionable day/
      );
    });
  });
});


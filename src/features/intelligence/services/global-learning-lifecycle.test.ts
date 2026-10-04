import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";

// Mock Next.js cache and auth guard before module imports
const mockRevalidateTag = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: any[]) => mockRevalidatePath(...args),
  revalidateTag: (...args: any[]) => mockRevalidateTag(...args),
  unstable_cache: vi.fn((fn) => fn),
}));

let currentMockUserId = new Types.ObjectId().toString();

vi.mock("@/lib/auth-guard", () => ({
  requireUserId: vi.fn(() => Promise.resolve(currentMockUserId)),
}));

import {
  reconcileTaskCompletion,
  syncTaskStartIfScheduled,
  type SupportedLearningEntityType,
} from "./learning-lifecycle.service";
import { TopicModel, ProblemModel, MissionModel, PatternModel } from "@/features/content/models/content.model";
import { UserModel, UserProfileModel } from "@/features/identity/models/user.model";
import { PlanModel } from "@/features/intelligence/models/plan.model";
import { PlanDayModel } from "@/features/intelligence/models/plan-day.model";
import { PlanTaskModel } from "@/features/intelligence/models/plan-task.model";
import { LearningEventModel } from "@/features/intelligence/models/learning-event.model";
import { TopicProgressModel } from "@/features/learning/models/learning.model";
import { resolveLearningExecutionSnapshot } from "./learning-execution-snapshot";
import { resolveAuthoritativeLearningAction } from "../decisions/decision-selector";

describe("Global Data-Driven Learning Lifecycle Across All Entity Types", () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);

    await PlanModel.syncIndexes();
    await PlanDayModel.syncIndexes();
    await PlanTaskModel.syncIndexes();
    await TopicModel.syncIndexes();
    await ProblemModel.syncIndexes();
    await MissionModel.syncIndexes();
    await LearningEventModel.syncIndexes();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  // Helper generator to create a complete realistic test plan environment with dynamic IDs
  async function createTestPlanEnvironment(params: {
    topicSlug: string;
    topicName: string;
    entities: Array<{
      type: SupportedLearningEntityType;
      title: string;
      order: number;
      required: boolean;
    }>;
  }) {
    const userId = new Types.ObjectId();
    currentMockUserId = userId.toString();

    await UserModel.create({
      _id: userId,
      email: `learner-${Date.now()}@example.com`,
      name: "Autonomous Learner",
    });

    const topicId = new Types.ObjectId();
    await TopicModel.create({
      _id: topicId,
      slug: params.topicSlug,
      name: params.topicName,
      difficulty: "medium",
      description: `${params.topicName} topic overview and core patterns`,
      estimatedMinutes: 60,
      order: 1,
      isPublished: true,
    });

    // Create backing content documents dynamically based on requested entity types
    const createdTasks: Array<{
      entityType: SupportedLearningEntityType;
      entityId: Types.ObjectId;
      title: string;
      taskKey: string;
      order: number;
      required: boolean;
    }> = [];

    for (const item of params.entities) {
      const entityId = new Types.ObjectId();
      if (item.type === "mission") {
        await MissionModel.create({
          _id: entityId,
          topicId,
          slug: `mission-${entityId}`,
          title: item.title,
          description: `${item.title} guided learning mission`,
          difficulty: "easy",
          isPublished: true,
          estimatedMinutes: 25,
          steps: [
            { key: "intro", kind: "introduction", content: "Intro", required: true, weight: 0.5 },
            { key: "practice", kind: "practice", content: "Practice", required: true, weight: 0.5 },
          ],
        });
      } else if (item.type === "problem") {
        await ProblemModel.create({
          _id: entityId,
          topicIds: [topicId],
          slug: `problem-${entityId}`,
          title: item.title,
          summary: `${item.title} problem description and summary`,
          source: "internal",
          sourceUrl: `https://dsaclub.dev/problems/${entityId}`,
          difficulty: "medium",
          estimatedMinutes: 20,
          isPublished: true,
          order: item.order,
        });
      } else if (item.type === "pattern") {
        await PatternModel.create({
          _id: entityId,
          topicId,
          slug: `pattern-${entityId}`,
          name: item.title,
          description: `${item.title} pattern description`,
          difficulty: "medium",
          isPublished: true,
        });
      }

      createdTasks.push({
        entityType: item.type,
        entityId,
        title: item.title,
        taskKey: `task-${item.type}-${entityId}`,
        order: item.order,
        required: item.required,
      });
    }

    const planId = new Types.ObjectId();
    const planDay1Id = new Types.ObjectId();

    await PlanModel.create({
      _id: planId,
      userId,
      cycleNumber: 1,
      status: "active",
      source: "onboarding",
      version: 1,
      goal: "job_ready",
      experienceLevel: "intermediate",
      language: "javascript",
      totalDays: 14,
      currentDayIndex: 1,
      dailyMinutes: 45,
      startDate: new Date(),
      targetCompletionDate: new Date(Date.now() + 14 * 86400000),
      timezone: "Asia/Kolkata",
      topicSlug: params.topicSlug,
      topicName: params.topicName,
      snapshots: {
        plannerVersion: "1.0.0",
        curriculumVersion: "2026.1",
        primaryTopicSlug: params.topicSlug,
        inputSnapshot: {
          dailyMinutes: 45,
          totalDays: 14,
          goal: "interview_prep",
          level: "intermediate",
        },
        availabilitySnapshot: {
          status: "ready",
          availableMissionsCount: 1,
          availableProblemsCount: 2,
        },
        estimatedScheduleSnapshot: [
          { dayIndex: 1, topicSlug: params.topicSlug, topicName: params.topicName, title: "Day 1 Fundamentals" },
          { dayIndex: 2, topicSlug: params.topicSlug, topicName: params.topicName, title: "Day 2 Deep Practice" },
        ],
      },
    });

    const todayDateKey = new Date().toISOString().slice(0, 10);
    await PlanDayModel.create({
      _id: planDay1Id,
      planId,
      userId,
      dayIndex: 1,
      dateKey: todayDateKey,
      status: "available",
      phase: "orientation",
      title: "Day 1 Foundations",
      focus: "Mastering Core Building Blocks",
      topicId,
      topicSlug: params.topicSlug,
      topicName: params.topicName,
      targetMinutes: 45,
      actualMinutes: 0,
      startedAt: new Date(),
      completedAt: null,
      isBufferDay: false,
      isCheckpointDay: false,
    });

    const taskDocs = [];
    for (const t of createdTasks) {
      const taskDoc = await PlanTaskModel.create({
        planId,
        planDayId: planDay1Id,
        userId,
        dayIndex: 1,
        taskKey: t.taskKey,
        title: t.title,
        phase: t.entityType === "mission" ? "learn" : t.entityType === "revision" ? "revise" : "practice",
        entityType: t.entityType,
        entityId: t.entityId,
        topicId,
        topicSlug: params.topicSlug,
        topicName: params.topicName,
        validationStatus: "aligned",
        order: t.order,
        required: t.required,
        estimatedMinutes: 20,
        actualMinutes: 0,
        status: "pending",
        planRelation: "planned_today",
        targetUrl: `/${t.entityType}s/${t.entityId}`,
      });
      taskDocs.push(taskDoc);
    }

    return {
      userId,
      topicId,
      planId,
      planDay1Id,
      tasks: taskDocs,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 1. PARAMETERIZED RECONCILIATION ACROSS MULTIPLE ENTITY TYPES & TOPICS
  // ════════════════════════════════════════════════════════════════════════════
  const supportedCases: Array<{
    entityType: SupportedLearningEntityType;
    topicSlug: string;
    topicName: string;
    taskTitle: string;
  }> = [
    { entityType: "problem", topicSlug: "graphs-dfs-bfs", topicName: "Graphs & Traversals", taskTitle: "Solve Island Perimeter" },
    { entityType: "mission", topicSlug: "dynamic-programming", topicName: "Dynamic Programming", taskTitle: "Build Coin Change Intuition" },
    { entityType: "pattern", topicSlug: "sliding-window", topicName: "Sliding Window", taskTitle: "Identify Minimum Window Substring Pattern" },
    { entityType: "revision", topicSlug: "binary-trees", topicName: "Binary Trees", taskTitle: "Spaced Retention Review: Invert Tree" },
    { entityType: "reflection", topicSlug: "heaps-priority-queues", topicName: "Priority Queues", taskTitle: "Reflect on Top K Frequent Elements" },
    { entityType: "checkpoint", topicSlug: "backtracking", topicName: "Backtracking", taskTitle: "Weekly Retention Checkpoint" },
  ];

  it.each(supportedCases)(
    "reconciles completion for entity type '$entityType' in topic '$topicSlug'",
    async ({ entityType, topicSlug, topicName, taskTitle }) => {
      const env = await createTestPlanEnvironment({
        topicSlug,
        topicName,
        entities: [
          { type: entityType, title: taskTitle, order: 1, required: true },
          { type: "problem", title: "Follow-up Challenge", order: 2, required: true },
        ],
      });

      const targetTask = env.tasks[0];

      // Execute reconciliation
      const result = await reconcileTaskCompletion({
        userId: env.userId,
        entityType,
        entityId: targetTask.entityId!,
        evidence: {
          score: 100,
          passed: true,
          durationSeconds: 900,
          independentSolve: true,
        },
      });

      expect(result.success).toBe(true);
      expect(result.isOnPlan).toBe(true);
      expect(result.planTaskId).toBe(targetTask._id.toString());
      expect(result.dayAdvanced).toBe(false); // Task 2 is still pending!

      // 1. Assert persisted database state
      const updatedTask = await PlanTaskModel.findById(targetTask._id);
      expect(updatedTask?.status).toBe("completed");
      expect(updatedTask?.actualMinutes).toBe(15);
      expect(updatedTask?.completedAt).toBeDefined();

      // 2. Assert canonical LearningEvent emission and correlation
      const event = await LearningEventModel.findOne({
        userId: env.userId,
        eventType: "task_completed",
        planTaskId: targetTask._id,
      });
      expect(event).toBeDefined();
      expect(event?.planId?.toString()).toBe(env.planId.toString());
      expect(event?.planDayId?.toString()).toBe(env.planDay1Id.toString());
      expect(event?.topicSlug).toBe(topicSlug);

      // 3. Assert user-scoped cache invalidation
      expect(mockRevalidateTag).toHaveBeenCalledWith(`snapshot-${env.userId}`);
      expect(mockRevalidateTag).toHaveBeenCalledWith(`plan-${env.userId}`);
      expect(mockRevalidateTag).toHaveBeenCalledWith(`dashboard-${env.userId}`);
      expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/plan");

      // 4. Assert authoritative decision selector advances to next pending task
      const snapshot = await resolveLearningExecutionSnapshot(env.userId.toString());
      expect(snapshot.todayProgress.completedTasks).toBe(1);
      expect(snapshot.todayProgress.totalTasks).toBe(2);
      expect(snapshot.todayProgress.isDayComplete).toBe(false);

      const decision = await resolveAuthoritativeLearningAction({
        userId: env.userId.toString(),
        mode: "plan_led",
        activePlan: snapshot.activePlan as any,
        currentPlanDay: snapshot.currentPlanDay as any,
        todayTasks: snapshot.todayTasks as any,
      });

      // The next primary action must be Task 2, NOT the completed task!
      expect(decision.primaryAction?.id).toBe(env.tasks[1]._id.toString());
      expect(decision.primaryAction?.title).toBe("Follow-up Challenge");
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 2. IDEMPOTENT REPEATED COMPLETION (NO DUPLICATE XP OR EVENTS)
  // ════════════════════════════════════════════════════════════════════════════
  it("prevents duplicate events and XP on repeated completion requests", async () => {
    const env = await createTestPlanEnvironment({
      topicSlug: "linked-lists",
      topicName: "Linked Lists",
      entities: [
        { type: "problem", title: "Reverse Linked List", order: 1, required: true },
        { type: "problem", title: "Merge Two Sorted Lists", order: 2, required: true },
      ],
    });

    const targetTask = env.tasks[0];

    // First completion
    const res1 = await reconcileTaskCompletion({
      userId: env.userId,
      entityType: "problem",
      entityId: targetTask.entityId!,
      evidence: { passed: true, score: 100, independentSolve: true },
    });
    expect(res1.success).toBe(true);
    expect(res1.alreadyCompleted).toBeFalsy();

    const eventCountAfterFirst = await LearningEventModel.countDocuments({
      userId: env.userId,
      eventType: "task_completed",
      planTaskId: targetTask._id,
    });
    expect(eventCountAfterFirst).toBe(1);

    // Second completion (e.g. accidental double-submit or network retry)
    const res2 = await reconcileTaskCompletion({
      userId: env.userId,
      entityType: "problem",
      entityId: targetTask.entityId!,
      evidence: { passed: true, score: 100, independentSolve: true },
    });
    expect(res2.success).toBe(true);
    expect(res2.alreadyCompleted).toBe(true);

    const eventCountAfterSecond = await LearningEventModel.countDocuments({
      userId: env.userId,
      eventType: "task_completed",
      planTaskId: targetTask._id,
    });
    expect(eventCountAfterSecond).toBe(1); // STRICTLY IDEMPOTENT, NO DUPLICATE!
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. PARTIAL FAILURE REPAIR ON RETRY
  // ════════════════════════════════════════════════════════════════════════════
  it("repairs missing event and day advancement when task was completed but downstream failed", async () => {
    const env = await createTestPlanEnvironment({
      topicSlug: "tries",
      topicName: "Trie Data Structures",
      entities: [
        { type: "problem", title: "Implement Trie", order: 1, required: true },
      ],
    });

    const targetTask = env.tasks[0];

    // Simulate partial failure: task is marked completed in DB, but event write crashed
    await PlanTaskModel.updateOne(
      { _id: targetTask._id },
      { $set: { status: "completed", completedAt: new Date(), actualMinutes: 20 } }
    );

    // Verify event does NOT exist yet
    const initialEvents = await LearningEventModel.countDocuments({
      userId: env.userId,
      planTaskId: targetTask._id,
    });
    expect(initialEvents).toBe(0);

    // Learner or retry system invokes reconciliation
    const repairResult = await reconcileTaskCompletion({
      userId: env.userId,
      entityType: "problem",
      entityId: targetTask.entityId!,
      evidence: { passed: true, score: 100 },
    });

    expect(repairResult.success).toBe(true);
    expect(repairResult.alreadyCompleted).toBe(true);
    expect(repairResult.dayAdvanced).toBe(true);

    // Assert missing event was repaired
    const repairedEvent = await LearningEventModel.findOne({
      userId: env.userId,
      planTaskId: targetTask._id,
    });
    expect(repairedEvent).toBeDefined();
    expect(repairedEvent?.idempotencyKey).toContain(`repair-task-completed-${targetTask._id}`);

    // Assert day was advanced to Day 2
    const day2 = await PlanDayModel.findOne({ planId: env.planId, dayIndex: 2 });
    expect(day2).toBeDefined();
    expect(day2?.status).toBe("available");
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. DAY ADVANCEMENT ONLY WHEN ALL REQUIRED TASKS ARE COMPLETE
  // ════════════════════════════════════════════════════════════════════════════
  it("advances schedule only when all required tasks on the active day are complete", async () => {
    const env = await createTestPlanEnvironment({
      topicSlug: "recursion",
      topicName: "Recursion & Backtracking",
      entities: [
        { type: "mission", title: "Recursion Visualizer", order: 1, required: true },
        { type: "problem", title: "Subsets Generation", order: 2, required: true },
        { type: "problem", title: "Bonus Challenge", order: 3, required: false }, // Optional task
      ],
    });

    // Complete Task 1 (required)
    const res1 = await reconcileTaskCompletion({
      userId: env.userId,
      entityType: "mission",
      entityId: env.tasks[0].entityId!,
    });
    expect(res1.dayAdvanced).toBe(false);

    // Complete Task 2 (final required task!)
    const res2 = await reconcileTaskCompletion({
      userId: env.userId,
      entityType: "problem",
      entityId: env.tasks[1].entityId!,
    });
    expect(res2.dayAdvanced).toBe(true);
    expect(res2.nextDayIndex).toBe(2);

    // Assert Day 1 status is completed
    const day1Doc = await PlanDayModel.findById(env.planDay1Id);
    expect(day1Doc?.status).toBe("completed");

    // Assert Day 2 was created and materialized
    const day2Doc = await PlanDayModel.findOne({ planId: env.planId, dayIndex: 2 });
    expect(day2Doc).toBeDefined();
    expect(day2Doc?.status).toBe("available");

    const day2Tasks = await PlanTaskModel.find({ planDayId: day2Doc?._id });
    expect(day2Tasks.length).toBeGreaterThan(0);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5. OFF-PLAN ACTIVITY PRESERVES PLAN AUTHORITY
  // ════════════════════════════════════════════════════════════════════════════
  it("preserves active plan authority and does NOT mutate plan tasks on off-plan activity", async () => {
    const env = await createTestPlanEnvironment({
      topicSlug: "two-pointers",
      topicName: "Two Pointers",
      entities: [
        { type: "problem", title: "Container With Most Water", order: 1, required: true },
      ],
    });

    // Learner solves a completely unrelated problem outside their plan (e.g. from Practice catalogue)
    const offPlanProblemId = new Types.ObjectId();
    const offPlanTopicId = new Types.ObjectId();
    await TopicModel.create({
      _id: offPlanTopicId,
      slug: "bit-manipulation",
      name: "Bit Manipulation",
      difficulty: "medium",
      description: "Bit manipulation fundamentals",
      estimatedMinutes: 60,
      order: 2,
      isPublished: true,
    });
    await ProblemModel.create({
      _id: offPlanProblemId,
      topicIds: [offPlanTopicId],
      slug: "single-number",
      title: "Single Number",
      summary: "Single number bit manipulation problem",
      source: "internal",
      sourceUrl: "https://dsaclub.dev/problems/single-number",
      difficulty: "easy",
      estimatedMinutes: 15,
      isPublished: true,
    });

    const offPlanResult = await reconcileTaskCompletion({
      userId: env.userId,
      entityType: "problem",
      entityId: offPlanProblemId,
      evidence: { passed: true, score: 100, independentSolve: true },
    });

    expect(offPlanResult.success).toBe(true);
    expect(offPlanResult.isOnPlan).toBe(false);
    expect(offPlanResult.planTaskId).toBeUndefined();
    expect(offPlanResult.dayAdvanced).toBe(false);

    // Active plan task must remain strictly pending!
    const planTask = await PlanTaskModel.findById(env.tasks[0]._id);
    expect(planTask?.status).toBe("pending");

    // Off-plan learning event must be recorded with null planTaskId
    const offPlanEvent = await LearningEventModel.findOne({
      userId: env.userId,
      problemId: offPlanProblemId,
    });
    expect(offPlanEvent).toBeDefined();
    expect(offPlanEvent?.planTaskId).toBeFalsy();

    // Primary action on the dashboard must still point to the scheduled plan task!
    const snapshot = await resolveLearningExecutionSnapshot(env.userId.toString());
    const decision = await resolveAuthoritativeLearningAction({
      userId: env.userId.toString(),
      mode: "plan_led",
      activePlan: snapshot.activePlan as any,
      currentPlanDay: snapshot.currentPlanDay as any,
      todayTasks: snapshot.todayTasks as any,
    });

    expect(decision.primaryAction?.id).toBe(env.tasks[0]._id.toString());
    expect(decision.primaryAction?.title).toBe("Container With Most Water");
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 6. SELF-PACED LEARNER WITHOUT ACTIVE PLAN
  // ════════════════════════════════════════════════════════════════════════════
  it("handles self-paced learners without active plans cleanly without fake tasks", async () => {
    const selfPacedUserId = new Types.ObjectId();
    const selfPacedTopicId = new Types.ObjectId();
    const selfPacedProblemId = new Types.ObjectId();

    await UserModel.create({
      _id: selfPacedUserId,
      email: "selfpaced@example.com",
      name: "Self Paced Learner",
    });
    await TopicModel.create({
      _id: selfPacedTopicId,
      slug: "greedy",
      name: "Greedy Algorithms",
      difficulty: "medium",
      description: "Greedy algorithms fundamentals",
      estimatedMinutes: 60,
      order: 1,
      isPublished: true,
    });
    await ProblemModel.create({
      _id: selfPacedProblemId,
      topicIds: [selfPacedTopicId],
      slug: "jump-game",
      title: "Jump Game",
      summary: "Jump game reachable indices",
      source: "internal",
      sourceUrl: "https://dsaclub.dev/problems/jump-game",
      difficulty: "medium",
      estimatedMinutes: 20,
      isPublished: true,
    });

    const result = await reconcileTaskCompletion({
      userId: selfPacedUserId,
      entityType: "problem",
      entityId: selfPacedProblemId,
      evidence: { passed: true, score: 100, independentSolve: true },
    });

    expect(result.success).toBe(true);
    expect(result.isOnPlan).toBe(false);
    expect(result.planTaskId).toBeUndefined();

    // Event recorded cleanly
    const event = await LearningEventModel.findOne({
      userId: selfPacedUserId,
      problemId: selfPacedProblemId,
    });
    expect(event).toBeDefined();
    expect(event?.topicSlug).toBe("greedy");
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 7. INTENTIONAL START TRACKING (NO GET/PREFETCH SIDE-EFFECTS)
  // ════════════════════════════════════════════════════════════════════════════
  it("transitions tasks to in_progress only on explicit user start action", async () => {
    const env = await createTestPlanEnvironment({
      topicSlug: "binary-search",
      topicName: "Binary Search",
      entities: [
        { type: "problem", title: "Search in Rotated Sorted Array", order: 1, required: true },
      ],
    });

    const targetTask = env.tasks[0];
    expect(targetTask.status).toBe("pending");

    // Explicit user action to start task
    const startResult = await syncTaskStartIfScheduled({
      userId: env.userId,
      entityType: "problem",
      entityId: targetTask.entityId!,
      sourceSurface: "workspace",
    });

    expect(startResult.matchedTask).toBe(true);
    expect(startResult.status).toBe("in_progress");

    const inProgressDoc = await PlanTaskModel.findById(targetTask._id);
    expect(inProgressDoc?.status).toBe("in_progress");
    expect(inProgressDoc?.startedAt).toBeDefined();

    // Event emitted
    const startEvent = await LearningEventModel.findOne({
      userId: env.userId,
      eventType: "task_started",
      planTaskId: targetTask._id,
    });
    expect(startEvent).toBeDefined();

    // Second call is idempotent and does not emit duplicate start event
    const startResult2 = await syncTaskStartIfScheduled({
      userId: env.userId,
      entityType: "problem",
      entityId: targetTask.entityId!,
      sourceSurface: "workspace",
    });
    expect(startResult2.matchedTask).toBe(true);
    expect(startResult2.status).toBe("in_progress");

    const totalStartEvents = await LearningEventModel.countDocuments({
      userId: env.userId,
      eventType: "task_started",
      planTaskId: targetTask._id,
    });
    expect(totalStartEvents).toBe(1);
  });
});

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";

// Mock Next.js cache and auth guard before module imports
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

let currentMockUserId = new Types.ObjectId().toString();

vi.mock("@/lib/auth-guard", () => ({
  requireUserId: vi.fn(() => Promise.resolve(currentMockUserId)),
}));

import {
  syncMissionStartIfScheduled,
  reconcileMissionCompletion,
} from "./mission-plan-orchestrator";
import { LearningEngine } from "@/features/platform/engines/learning.engine";
import { MissionModel, TopicModel, ProblemModel } from "@/features/content/models/content.model";
import { UserModel, UserProfileModel } from "@/features/identity/models/user.model";
import { UserStatisticsModel } from "@/features/intelligence/models/intelligence.model";
import {
  MissionProgressModel,
  TopicProgressModel,
} from "@/features/learning/models/learning.model";
import { PlanModel } from "@/features/intelligence/models/plan.model";
import { PlanDayModel } from "@/features/intelligence/models/plan-day.model";
import { PlanTaskModel } from "@/features/intelligence/models/plan-task.model";
import { LearningEventModel } from "@/features/intelligence/models/learning-event.model";
import { getProductSnapshot } from "@/features/product/services/product.service";
import { resolveAuthoritativeLearningAction } from "@/features/intelligence/decisions/decision-selector";
import { resolveLearningExecutionSnapshot } from "./learning-execution-snapshot";

describe("End-to-End Mission → Plan → Intelligence → Dashboard Continuity", () => {
  let mongod: MongoMemoryServer;

  let userId: Types.ObjectId;
  let topicId: Types.ObjectId;
  let missionId: Types.ObjectId;
  let problemId: Types.ObjectId;
  let planId: Types.ObjectId;
  let planDay1Id: Types.ObjectId;
  let task1Id: Types.ObjectId;
  let task2Id: Types.ObjectId;
  let task3Id: Types.ObjectId;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);

    await PlanModel.syncIndexes();
    await PlanDayModel.syncIndexes();
    await PlanTaskModel.syncIndexes();
    await TopicModel.syncIndexes();
    await MissionModel.syncIndexes();
    await ProblemModel.syncIndexes();
    await LearningEventModel.syncIndexes();
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    userId = new Types.ObjectId();
    currentMockUserId = userId.toString();
    topicId = new Types.ObjectId();
    missionId = new Types.ObjectId();
    problemId = new Types.ObjectId();
    planId = new Types.ObjectId();
    planDay1Id = new Types.ObjectId();
    task1Id = new Types.ObjectId();
    task2Id = new Types.ObjectId();
    task3Id = new Types.ObjectId();

    // Clean mock db collections
    await UserModel.deleteMany({});
    await UserProfileModel.deleteMany({});
    await UserStatisticsModel.deleteMany({});
    await MissionModel.deleteMany({});
    await TopicModel.deleteMany({});
    await ProblemModel.deleteMany({});
    await MissionProgressModel.deleteMany({});
    await TopicProgressModel.deleteMany({});
    await PlanModel.deleteMany({});
    await PlanDayModel.deleteMany({});
    await PlanTaskModel.deleteMany({});
    await LearningEventModel.deleteMany({});

    // Seed user & profile
    await UserModel.create({
      _id: userId,
      email: `user-${userId}@example.com`,
      name: "Alex Learner",
    });
    await UserProfileModel.create({
      userId,
      dailyMinutes: 45,
      currentLevel: "beginner",
      onboarding: { status: "completed" },
    });
    await UserStatisticsModel.create({
      userId,
      currentStreakDays: 1,
      totalFocusedMinutes: 0,
      totalXp: 100,
    });

    // Seed topic: Arrays
    await TopicModel.create({
      _id: topicId,
      name: "Arrays",
      slug: "arrays",
      difficulty: "easy",
      description: "Arrays fundamentals",
      estimatedMinutes: 60,
      isPublished: true,
      order: 1,
    });

    // Seed mission: Complete Arrays in Depth (3 steps)
    await MissionModel.create({
      _id: missionId,
      title: "Complete Arrays in Depth",
      slug: "complete-arrays-in-depth",
      topicId,
      difficulty: "easy",
      description: "Master arrays in depth",
      isPublished: true,
      order: 1,
      estimatedMinutes: 30,
      steps: [
        { key: "concept-intro", title: "Concept Introduction", kind: "concept", weight: 0.3 },
        { key: "pattern-analysis", title: "Pattern Analysis", kind: "pattern", weight: 0.3 },
        { key: "mastery-challenge", title: "Mastery Challenge", kind: "mastery", weight: 0.4 },
      ],
    });

    // Seed problem: Two Sum
    await ProblemModel.create({
      _id: problemId,
      title: "Two Sum",
      slug: "two-sum",
      summary: "Find two numbers in array that add up to target.",
      source: "leetcode",
      sourceUrl: "https://leetcode.com/problems/two-sum",
      topicIds: [topicId],
      isPublished: true,
      difficulty: "easy",
      estimatedMinutes: 20,
    });

    // Seed active plan: 21-day plan
    await PlanModel.create({
      _id: planId,
      userId,
      status: "active",
      source: "onboarding",
      version: 1,
      goal: "job_ready",
      experienceLevel: "intermediate",
      language: "javascript",
      cycleNumber: 1,
      totalDays: 21,
      currentDayIndex: 1,
      dailyMinutes: 45,
      topicId,
      topicSlug: "arrays",
      topicName: "Arrays",
      startDate: new Date(),
      timezone: "UTC",
      snapshots: {
        plannerVersion: "1.0.0",
        curriculumVersion: "2026.1",
        inputSnapshot: {
          learningGoal: "job_ready",
          experienceLevel: "intermediate",
          language: "javascript",
          dailyMinutes: 45,
        },
        availabilitySnapshot: {
          status: "ready",
          availableMissionsCount: 1,
          availableProblemsCount: 2,
        },
      },
    });

    // Seed Day 1: 3 tasks (Task 1: Mission, Task 2: Problem, Task 3: Problem/Review)
    await PlanDayModel.create({
      _id: planDay1Id,
      planId,
      userId,
      dayIndex: 1,
      dateKey: "2026-10-01",
      title: "Day 1: Arrays Fundamentals",
      focus: "Master core array invariants and two-pointer traversal",
      topicId,
      topicSlug: "arrays",
      topicName: "Arrays",
      phase: "orientation",
      targetMinutes: 45,
      status: "available",
    });

    // Task 1: Scheduled Mission
    await PlanTaskModel.create({
      _id: task1Id,
      planId,
      planDayId: planDay1Id,
      userId,
      dayIndex: 1,
      taskKey: "day1-mission-1",
      title: "Complete Arrays in Depth",
      phase: "learn",
      entityType: "mission",
      entityId: missionId,
      topicId,
      topicSlug: "arrays",
      topicName: "Arrays",
      order: 1,
      required: true,
      estimatedMinutes: 30,
      status: "pending",
      targetUrl: "/missions/complete-arrays-in-depth",
    });

    // Task 2: Scheduled Problem
    await PlanTaskModel.create({
      _id: task2Id,
      planId,
      planDayId: planDay1Id,
      userId,
      dayIndex: 1,
      taskKey: "day1-problem-1",
      title: "Two Sum",
      phase: "practice",
      entityType: "problem",
      entityId: problemId,
      topicId,
      topicSlug: "arrays",
      topicName: "Arrays",
      order: 2,
      required: true,
      estimatedMinutes: 20,
      status: "pending",
      targetUrl: "/practice/problems/two-sum",
    });

    // Task 3: Final required task for Day 1
    await PlanTaskModel.create({
      _id: task3Id,
      planId,
      planDayId: planDay1Id,
      userId,
      dayIndex: 1,
      taskKey: "day1-problem-2",
      title: "Best Time to Buy and Sell Stock",
      phase: "practice",
      entityType: "problem",
      topicId,
      topicSlug: "arrays",
      topicName: "Arrays",
      order: 3,
      required: true,
      estimatedMinutes: 15,
      status: "pending",
      targetUrl: "/practice/problems/stock",
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // A. SCHEDULED MISSION TASK CONTRACT
  // ══════════════════════════════════════════════════════════════════════════
  it("A. Scheduled mission task: start marks PlanTask in_progress, completion updates PlanTask, emits event with missionId, surfaces next problem, and does not advance early", async () => {
    // 1. Initial snapshot check
    let snapshot = await resolveLearningExecutionSnapshot(userId.toString());
    expect(snapshot.todayProgress.completedTasks).toBe(0);
    expect(snapshot.todayProgress.totalTasks).toBe(3);
    expect(snapshot.todayProgress.isDayComplete).toBe(false);

    // 2. Start mission task
    const startResult = await syncMissionStartIfScheduled({
      userId,
      missionId,
    });
    expect(startResult.matchedTask).toBe(true);
    expect(startResult.status).toBe("in_progress");

    // PlanTask must now be in_progress
    const inProgressTask = await PlanTaskModel.findById(task1Id).lean();
    expect(inProgressTask?.status).toBe("in_progress");

    // Idempotent task_started event recorded with missionId
    const startedEvent = await LearningEventModel.findOne({
      userId,
      eventType: "task_started",
      planTaskId: task1Id,
    }).lean();
    expect(startedEvent).toBeDefined();
    expect(String(startedEvent?.missionId)).toBe(missionId.toString());

    // 3. Complete stage 1: does NOT complete the PlanTask
    await LearningEngine.completeStage(userId.toString(), missionId.toString(), "concept-intro");
    let taskAfterStage1 = await PlanTaskModel.findById(task1Id).lean();
    expect(taskAfterStage1?.status).toBe("in_progress");

    // 4. Complete stage 2: does NOT complete the PlanTask
    await LearningEngine.completeStage(userId.toString(), missionId.toString(), "pattern-analysis");
    let taskAfterStage2 = await PlanTaskModel.findById(task1Id).lean();
    expect(taskAfterStage2?.status).toBe("in_progress");

    // 5. Complete stage 3 (all stages finished): completes MissionProgress AND PlanTask!
    await LearningEngine.completeStage(userId.toString(), missionId.toString(), "mastery-challenge");

    const missionProg = await MissionProgressModel.findOne({ userId, missionId }).lean();
    expect(missionProg?.status).toBe("completed");
    expect(missionProg?.progress).toBe(100);

    const completedPlanTask = await PlanTaskModel.findById(task1Id).lean();
    expect(completedPlanTask?.status).toBe("completed");

    // Exactly one correlated task_completed LearningEvent exists with missionId
    const completedEvents = await LearningEventModel.find({
      userId,
      eventType: "task_completed",
      planTaskId: task1Id,
    }).lean();
    expect(completedEvents.length).toBe(1);
    expect(String(completedEvents[0].missionId)).toBe(missionId.toString());
    expect(String(completedEvents[0].planId)).toBe(planId.toString());

    // 6. Day does NOT advance because 2 required tasks remain!
    const day1Doc = await PlanDayModel.findById(planDay1Id).lean();
    expect(day1Doc?.status).toBe("available");
    expect(day1Doc?.completedAt).toBeNull();

    // 7. Dashboard execution snapshot becomes 1 of 3 tasks
    snapshot = await resolveLearningExecutionSnapshot(userId.toString());
    expect(snapshot.todayProgress.completedTasks).toBe(1);
    expect(snapshot.todayProgress.totalTasks).toBe(3);
    expect(snapshot.todayProgress.isDayComplete).toBe(false);

    // 8. Authoritative decision selector immediately surfaces Task 2 (Two Sum) with its real route!
    const selection = await resolveAuthoritativeLearningAction({
      userId,
      surface: "dashboard",
      activePlan: snapshot.activePlan,
      currentPlanDay: snapshot.currentPlanDay,
      todayTasks: snapshot.todayTasks,
    });
    expect(selection.primaryAction).toBeDefined();
    expect(selection.primaryAction?.title).toBe("Two Sum");
    expect(selection.primaryAction?.href).toBe("/practice/problems/two-sum");
    expect(selection.primaryAction?.type).toBe("problem");
  });

  // ══════════════════════════════════════════════════════════════════════════
  // B. FINAL REQUIRED TASK & DAY ADVANCEMENT
  // ══════════════════════════════════════════════════════════════════════════
  it("B. Completing all required tasks advances the day once, and dashboard shows next day's primary task", async () => {
    // Complete task 1 (Mission)
    await LearningEngine.completeStage(userId.toString(), missionId.toString(), "concept-intro");
    await LearningEngine.completeStage(userId.toString(), missionId.toString(), "pattern-analysis");
    await LearningEngine.completeStage(userId.toString(), missionId.toString(), "mastery-challenge");

    // Complete task 2 (Two Sum)
    const { completePlanTaskAction } = await import("@/features/intelligence/actions/plan-actions");
    const res2 = await completePlanTaskAction(task2Id.toString(), { passed: true });
    expect(res2.dayAdvanced).toBe(false);

    // Complete task 3 (Final required task)
    const res3 = await completePlanTaskAction(task3Id.toString(), { passed: true });
    expect(res3.dayAdvanced).toBe(true);

    // Day 1 must now be marked completed
    const day1 = await PlanDayModel.findById(planDay1Id).lean();
    expect(day1?.status).toBe("completed");

    // Day 2 must have been created/materialized
    const day2 = await PlanDayModel.findOne({ planId, dayIndex: 2 }).lean();
    expect(day2).toBeDefined();
    expect(day2?.status).toBe("available");
  });

  // ══════════════════════════════════════════════════════════════════════════
  // C. OFF-PLAN MISSION DOES NOT MUTATE ACTIVE PLAN
  // ══════════════════════════════════════════════════════════════════════════
  it("C. Off-plan mission: saves evidence, emits event with missionId, does NOT touch plan tasks or force self-paced mode", async () => {
    const offPlanTopicId = new Types.ObjectId();
    await TopicModel.create({
      _id: offPlanTopicId,
      name: "Binary Trees",
      slug: "binary-trees",
      difficulty: "easy",
      description: "Binary trees fundamentals",
      estimatedMinutes: 60,
      isPublished: true,
      order: 2,
    });

    const offPlanMissionId = new Types.ObjectId();
    await MissionModel.create({
      _id: offPlanMissionId,
      title: "Binary Trees Fundamentals",
      slug: "binary-trees-fundamentals",
      topicId: offPlanTopicId,
      isPublished: true,
      difficulty: "easy",
      description: "Binary tree intro",
      estimatedMinutes: 30,
      steps: [{ key: "tree-intro", title: "Tree Intro", kind: "concept", weight: 1 }],
    });

    // Complete off-plan mission
    await LearningEngine.completeStage(userId.toString(), offPlanMissionId.toString(), "tree-intro");

    // Verify MissionProgress is completed
    const prog = await MissionProgressModel.findOne({ userId, missionId: offPlanMissionId }).lean();
    expect(prog?.status).toBe("completed");

    // Verify no unrelated PlanTasks were completed
    const task1 = await PlanTaskModel.findById(task1Id).lean();
    expect(task1?.status).toBe("pending"); // Mission on active plan remains pending!

    // Verify off-plan LearningEvent was recorded with missionId and NO planTaskId
    const event = await LearningEventModel.findOne({
      userId,
      missionId: offPlanMissionId,
    }).lean();
    expect(event).toBeDefined();
    expect(event?.planTaskId).toBeNull();

    // Active plan remains the authoritative dashboard action!
    const snapshot = await resolveLearningExecutionSnapshot(userId.toString());
    const selection = await resolveAuthoritativeLearningAction({
      userId,
      surface: "dashboard",
      activePlan: snapshot.activePlan,
      currentPlanDay: snapshot.currentPlanDay,
      todayTasks: snapshot.todayTasks,
    });
    expect(selection.primaryAction?.title).toBe("Complete Arrays in Depth"); // Still authoritative Day 1 task!
  });

  // ══════════════════════════════════════════════════════════════════════════
  // D. SELF-PACED MISSION COMPLETION
  // ══════════════════════════════════════════════════════════════════════════
  it("D. Self-paced mission: records completion without active plan and without creating fake PlanTasks", async () => {
    const selfPacedUserId = new Types.ObjectId();
    await LearningEngine.completeStage(selfPacedUserId.toString(), missionId.toString(), "concept-intro");
    await LearningEngine.completeStage(selfPacedUserId.toString(), missionId.toString(), "pattern-analysis");
    await LearningEngine.completeStage(selfPacedUserId.toString(), missionId.toString(), "mastery-challenge");

    const prog = await MissionProgressModel.findOne({ userId: selfPacedUserId, missionId }).lean();
    expect(prog?.status).toBe("completed");

    const tasksCount = await PlanTaskModel.countDocuments({ userId: selfPacedUserId });
    expect(tasksCount).toBe(0); // Zero fake tasks created
  });

  // ══════════════════════════════════════════════════════════════════════════
  // E. IDEMPOTENCY & RECOVERY
  // ══════════════════════════════════════════════════════════════════════════
  it("E. Idempotency & recovery: retrying after mission is already complete repairs plan sync and does not duplicate events", async () => {
    // Simulate MissionProgress already marked completed (e.g. from partial failure before plan sync)
    await MissionProgressModel.create({
      userId,
      missionId,
      status: "completed",
      progress: 100,
      completedStepKeys: ["concept-intro", "pattern-analysis", "mastery-challenge"],
      startedAt: new Date(Date.now() - 30 * 60000),
      completedAt: new Date(),
    });

    // PlanTask is still pending
    expect((await PlanTaskModel.findById(task1Id).lean())?.status).toBe("pending");

    // Retry call to reconcileMissionCompletion
    const result1 = await reconcileMissionCompletion({ userId, missionId });
    expect(result1.success).toBe(true);
    expect(result1.isOnPlan).toBe(true);

    // PlanTask was repaired and is now completed!
    expect((await PlanTaskModel.findById(task1Id).lean())?.status).toBe("completed");

    // Exactly one completion event exists
    const events1 = await LearningEventModel.find({
      userId,
      eventType: "task_completed",
      planTaskId: task1Id,
    }).lean();
    expect(events1.length).toBe(1);

    // Second retry (double click): returns alreadyCompleted without duplicating events
    const result2 = await reconcileMissionCompletion({ userId, missionId });
    expect(result2.success).toBe(true);
    expect(result2.alreadyCompleted).toBe(true);

    const events2 = await LearningEventModel.find({
      userId,
      eventType: "task_completed",
      planTaskId: task1Id,
    }).lean();
    expect(events2.length).toBe(1); // Still exactly 1!
  });

  // ══════════════════════════════════════════════════════════════════════════
  // F. MISSION RESOLVER NEVER RE-SELECTS COMPLETED MISSION
  // ══════════════════════════════════════════════════════════════════════════
  it("F. Mission resolver: completed mission is never selected as active mission when all topic missions are done", async () => {
    // Complete the mission
    await LearningEngine.completeStage(userId.toString(), missionId.toString(), "concept-intro");
    await LearningEngine.completeStage(userId.toString(), missionId.toString(), "pattern-analysis");
    await LearningEngine.completeStage(userId.toString(), missionId.toString(), "mastery-challenge");

    // Fetch dashboard data
    const dashboardData = await getProductSnapshot(userId.toString());
    const dto = dashboardData.dashboardDTO;

    // The primary action should now be Two Sum (the next scheduled task), NOT the completed mission!
    expect(dto.primaryAction?.title).toBe("Two Sum");
    expect(dto.primaryAction?.href).toBe("/practice/problems/two-sum");

    // Active mission on dashboard should be null (since all missions in Arrays are complete)
    expect(dashboardData.activeMission).toBeNull();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // G. TOPIC EVIDENCE EXPLAINABILITY (20% CASE)
  // ══════════════════════════════════════════════════════════════════════════
  it("G. Topic evidence: 20% score is clearly labeled as rubric evidence with provenance and denominator", async () => {
    // Complete the mission
    await LearningEngine.completeStage(userId.toString(), missionId.toString(), "concept-intro");
    await LearningEngine.completeStage(userId.toString(), missionId.toString(), "pattern-analysis");
    await LearningEngine.completeStage(userId.toString(), missionId.toString(), "mastery-challenge");

    const dashboardData = await getProductSnapshot(userId.toString());
    const topicEvidence = dashboardData.dashboardDTO.topicEvidence;

    expect(topicEvidence).toBeDefined();
    expect(topicEvidence.topicName).toBe("Arrays");
    // With 1 completed mission and 0 problem solves, rubric mastery score is 20%
    expect(topicEvidence.topicMasteryPercent).toBe(20);
    expect(topicEvidence.topicSolvedCount).toBe(0);
    expect(topicEvidence.isFullMastery).toBe(false);

    // Truthful rubric evidence label & explanation
    expect(topicEvidence.evidenceLabel).toBe("20% rubric evidence");
    expect(topicEvidence.evidenceExplanation).toContain("foundational missions completed");
    expect(topicEvidence.evidenceExplanation).toContain("Practice problems required");
    expect(topicEvidence.missionsCompletedCount).toBe(1);
    expect(topicEvidence.missionsTotalCount).toBe(1);
  });
});

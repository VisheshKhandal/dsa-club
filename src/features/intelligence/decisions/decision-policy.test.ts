import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import { PlanModel } from "../models/plan.model";
import { PlanDayModel } from "../models/plan-day.model";
import { PlanTaskModel } from "../models/plan-task.model";
import { TopicModel, MissionModel } from "@/features/content/models/content.model";
import { IntelligenceDecisionModel } from "../models/intelligence-decision.model";
import { UserTopicProgressModel } from "../models/user-topic-progress.model";
import { RevisionQueueModel } from "@/features/intelligence/models/intelligence.model";
import { buildCandidateSet } from "./task-candidate-builder";
import { evaluateNextTaskDecision } from "./decision-policy";
import { activateCanonicalPlanForUser } from "../services/plan-migration.service";
import { generateCanonicalPlan } from "../planning/canonical-planner";
import type { PlannerInput } from "../types/intelligence.types";

let mongod: MongoMemoryServer;
let currentMockUserId: string = new Types.ObjectId().toString();

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/auth-guard", () => ({
  requireUserId: vi.fn(() => Promise.resolve(currentMockUserId)),
}));

describe("Module 6: Deterministic Decisions & Explainable Policies", () => {
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
    await RevisionQueueModel.syncIndexes();
    await IntelligenceDecisionModel.syncIndexes();
    await UserTopicProgressModel.syncIndexes();
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    currentMockUserId = new Types.ObjectId().toString();
    await PlanModel.deleteMany({});
    await PlanDayModel.deleteMany({});
    await PlanTaskModel.deleteMany({});
    await TopicModel.deleteMany({});
    await MissionModel.deleteMany({});
    await IntelligenceDecisionModel.deleteMany({});
    await UserTopicProgressModel.deleteMany({});
  });

  async function setupPlanEnvironment() {
    const topic = await TopicModel.create({
      name: "Binary Search",
      slug: "binary-search",
      order: 1,
      difficulty: "medium",
      estimatedMinutes: 30,
      description: "Binary search description",
      isPublished: true,
    });

    await MissionModel.create({
      title: "Binary Search Mechanics",
      slug: "binary-search-mechanics",
      topicId: topic._id as Types.ObjectId,
      order: 1,
      estimatedMinutes: 20,
      difficulty: "medium",
      description: "Interactive mission for Binary Search",
      isPublished: true,
      steps: [],
    });

    const input: PlannerInput = {
      learningGoal: "placement",
      focusTopicSlugs: ["binary-search"],
      knownTopicSlugs: [],
      companySlugs: [],
      dailyMinutes: 45,
      experienceLevel: "intermediate",
      language: "python",
      timezone: "Asia/Kolkata",
    };

    const blueprint = generateCanonicalPlan(input, 1);
    const { plan, days, tasks } = await activateCanonicalPlanForUser({
      userId: currentMockUserId,
      blueprint,
      input,
      source: "customized",
    });

    return { plan, days, tasks, topic };
  }

  // ── 1. CANDIDATE SET BUILDING & INVARIANT FILTERS ──
  it("builds candidate set filtering out completed, mismatched, or unavailable tasks", async () => {
    const { tasks } = await setupPlanEnvironment();

    // Mark task 0 as completed
    await PlanTaskModel.updateOne(
      { _id: tasks[0]._id },
      { $set: { status: "completed" } }
    );

    const candidateSet = await buildCandidateSet(currentMockUserId);

    expect(candidateSet.candidates.length).toBeGreaterThan(0);
    // Task 0 must NOT be in candidates
    const hasCompleted = candidateSet.candidates.some(
      (c) => c.taskId === tasks[0]._id.toString()
    );
    expect(hasCompleted).toBe(false);
    expect(candidateSet.excludedCount).toBeGreaterThanOrEqual(1);
  });

  it("injects due spaced retention reviews into the candidate set", async () => {
    await setupPlanEnvironment();

    // Canonical Phase 2/3 Revision Queue with due date
    const queueDoc = await RevisionQueueModel.create({
      userId: new Types.ObjectId(currentMockUserId),
      entityType: "problem",
      entityId: new Types.ObjectId(),
      intervalDays: 1,
      easeFactor: 2.5,
      repetitions: 1,
      lapses: 0,
      source: "attempt",
      state: "due",
      dueAt: new Date(Date.now() - 86400000), // Due yesterday
    });

    const candidateSet = await buildCandidateSet(currentMockUserId);
    const reviewCandidate = candidateSet.candidates.find(
      (c) => c.actionKey === `review-${queueDoc._id}`
    );

    expect(reviewCandidate).toBeDefined();
    expect(reviewCandidate?.planRelation).toBe("plan_revision");
    expect(reviewCandidate?.title).toContain("Retention Review");
  });

  // ── 2. DETERMINISTIC DECISION EVALUATION & REASONING ──
  it("prioritizes an in_progress task over all pending tasks", async () => {
    await setupPlanEnvironment();

    // Query task directly from DB for Day 1
    const inDbTask = await PlanTaskModel.findOne({
      userId: new Types.ObjectId(currentMockUserId),
      dayIndex: 1,
    });
    expect(inDbTask).not.toBeNull();

    await PlanTaskModel.updateOne(
      { _id: inDbTask!._id },
      { $set: { status: "in_progress" } }
    );

    const decision = await evaluateNextTaskDecision({
      userId: currentMockUserId,
      surface: "dashboard_card",
      persistRecord: true,
    });

    expect(decision).not.toBeNull();
    expect(decision?.selectedAction.isInProgress).toBe(true);
    expect(decision?.primaryReason).toContain("Task in progress");
    expect(decision?.secondaryReasons).toContain("Resuming existing active session");

    // Verify written to IntelligenceDecisionModel in MongoDB
    const stored = await IntelligenceDecisionModel.findById(decision?.decisionId).lean();
    expect(stored).not.toBeNull();
    expect(stored?.userId.toString()).toBe(currentMockUserId);
    expect(stored?.surface).toBe("dashboard_card");
  });

  // ── 3. REPRODUCIBILITY & DETERMINISM ──
  it("consistently produces 100% identical decision results given the same input state", async () => {
    await setupPlanEnvironment();

    const decision1 = await evaluateNextTaskDecision({
      userId: currentMockUserId,
      surface: "today_board",
    });

    const decision2 = await evaluateNextTaskDecision({
      userId: currentMockUserId,
      surface: "today_board",
    });

    expect(decision1?.selectedAction.actionKey).toBe(decision2?.selectedAction.actionKey);
    expect(decision1?.selectedAction.priorityScore).toBe(decision2?.selectedAction.priorityScore);
    expect(decision1?.primaryReason).toBe(decision2?.primaryReason);
    expect(decision1?.candidateCount).toBe(decision2?.candidateCount);
  });
});

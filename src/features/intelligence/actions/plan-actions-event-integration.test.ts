import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import { PlanModel } from "../models/plan.model";
import { PlanDayModel } from "../models/plan-day.model";
import { PlanTaskModel } from "../models/plan-task.model";
import { TopicModel, MissionModel } from "@/features/content/models/content.model";
import { LearningEventModel } from "../models/learning-event.model";
import {
  startPlanTaskAction,
  completePlanTaskAction,
  skipPlanTaskAction,
  pausePlanAction,
  resumePlanAction,
  stopPlanAction,
} from "./plan-actions";
import { activateCanonicalPlanForUser } from "../services/plan-migration.service";
import { generateCanonicalPlan } from "../planning/canonical-planner";
import type { PlannerInput } from "../types/intelligence.types";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

let currentMockUserId = new Types.ObjectId().toString();

vi.mock("@/lib/auth-guard", () => ({
  requireUserId: vi.fn(() => Promise.resolve(currentMockUserId)),
}));

let mongod: MongoMemoryServer;

describe("Module 3: Live Plan Actions Event Hook Integration", () => {
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
    await LearningEventModel.syncIndexes();
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
    await LearningEventModel.deleteMany({});
  });

  async function setupActivePlan() {
    const topic = await TopicModel.create({
      name: "Arrays",
      slug: "arrays",
      order: 1,
      difficulty: "easy",
      estimatedMinutes: 20,
      description: "Arrays description",
      isPublished: true,
    });

    await MissionModel.create({
      title: "Array Mechanics",
      slug: "array-mechanics",
      topicId: topic._id as Types.ObjectId,
      order: 1,
      estimatedMinutes: 15,
      difficulty: "easy",
      description: "Array mechanics description",
      isPublished: true,
      steps: [],
    });

    const input: PlannerInput = {
      learningGoal: "placement",
      focusTopicSlugs: ["arrays"],
      knownTopicSlugs: [],
      companySlugs: [],
      dailyMinutes: 30,
      experienceLevel: "beginner",
      language: "javascript",
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

  // ── 1. TASK STARTED EVENT EMISSION ──
  it("emits immutable task_started event when startPlanTaskAction is executed", async () => {
    const { tasks } = await setupActivePlan();
    const targetTask = tasks[0];

    const res = await startPlanTaskAction(String(targetTask._id));
    expect(res.success).toBe(true);
    expect(res.started).toBe(true);

    // Verify LearningEvent in DB
    const event = await LearningEventModel.findOne({
      userId: new Types.ObjectId(currentMockUserId),
      eventType: "task_started",
      planTaskId: targetTask._id,
    }).lean();

    expect(event).not.toBeNull();
    expect(event?.eventType).toBe("task_started");
    expect(event?.topicSlug).toBe("arrays");
    expect(event?.payload).toEqual({ sourceSurface: "today_board" });
  });

  // ── 2. TASK COMPLETED EVENT EMISSION ──
  it("emits immutable task_completed event with evidence when completePlanTaskAction is executed", async () => {
    const { tasks } = await setupActivePlan();
    const targetTask = tasks[0];

    const res = await completePlanTaskAction(String(targetTask._id), {
      passed: true,
      score: 100,
      reflectionAnswer: "Iterated through array with single pointer.",
    });

    expect(res.success).toBe(true);

    // Verify LearningEvent in DB
    const event = await LearningEventModel.findOne({
      userId: new Types.ObjectId(currentMockUserId),
      eventType: "task_completed",
      planTaskId: targetTask._id,
    }).lean();

    expect(event).not.toBeNull();
    expect(event?.eventType).toBe("task_completed");
    expect(event?.topicSlug).toBe("arrays");
    expect((event?.payload as any)?.independentSolve).toBe(true);
    expect((event?.payload as any)?.passed).toBe(true);
    expect((event?.payload as any)?.reflectionAnswer).toBe(
      "Iterated through array with single pointer."
    );
  });

  // ── 3. TASK SKIPPED EVENT EMISSION ──
  it("emits immutable task_skipped event with reason when skipPlanTaskAction is executed", async () => {
    const { tasks } = await setupActivePlan();
    const targetTask = tasks[0];

    const res = await skipPlanTaskAction(
      String(targetTask._id),
      "Skipping to focus on next problem"
    );
    expect(res.success).toBe(true);

    const event = await LearningEventModel.findOne({
      userId: new Types.ObjectId(currentMockUserId),
      eventType: "task_skipped",
      planTaskId: targetTask._id,
    }).lean();

    expect(event).not.toBeNull();
    expect(event?.eventType).toBe("task_skipped");
    expect((event?.payload as any)?.reason).toBe(
      "Skipping to focus on next problem"
    );
  });

  // ── 4. PLAN LIFECYCLE EVENTS (PAUSE & RESUME) ──
  it("emits plan_paused and plan_resumed events during pause and resume actions", async () => {
    await setupActivePlan();

    // 1. Pause
    await pausePlanAction("exam");
    const pauseEvent = await LearningEventModel.findOne({
      userId: new Types.ObjectId(currentMockUserId),
      eventType: "plan_paused",
    }).lean();

    expect(pauseEvent).not.toBeNull();
    expect((pauseEvent?.payload as any)?.reason).toBe("exam");

    // 2. Resume
    await resumePlanAction();
    const resumeEvent = await LearningEventModel.findOne({
      userId: new Types.ObjectId(currentMockUserId),
      eventType: "plan_resumed",
    }).lean();

    expect(resumeEvent).not.toBeNull();
    expect(resumeEvent?.eventType).toBe("plan_resumed");
  });

  // ── 5. PARALLEL DUPLICATE IDEMPOTENCY SAFETY ──
  it("handles concurrent completion calls cleanly, creating exactly 1 task_completed event", async () => {
    const { tasks } = await setupActivePlan();
    const targetTaskId = String(tasks[0]._id);

    const [res1, res2] = await Promise.all([
      completePlanTaskAction(targetTaskId),
      completePlanTaskAction(targetTaskId),
    ]);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);

    // Exactly 1 task_completed event must exist in MongoDB
    const events = await LearningEventModel.find({
      userId: new Types.ObjectId(currentMockUserId),
      eventType: "task_completed",
      planTaskId: new Types.ObjectId(targetTaskId),
    }).lean();

    expect(events.length).toBe(1);
  });

  // ── 6. PLAN STOP / ARCHIVE PERMANENCE ──
  it("permanently stops and archives active plan, recording plan_paused event and preventing resume", async () => {
    const { plan } = await setupActivePlan();

    await stopPlanAction("Switching to self-paced exploratory mode");

    const updatedPlan = await PlanModel.findById(plan._id).lean();
    expect(updatedPlan?.status).toBe("archived");
    expect(updatedPlan?.archivedAt).toBeDefined();

    // Trying to resume an archived plan must throw an error
    await expect(resumePlanAction()).rejects.toThrow("No paused plan found to resume");

    // Event was recorded
    const stopEvent = await LearningEventModel.findOne({
      userId: new Types.ObjectId(currentMockUserId),
      eventType: "plan_paused",
    }).lean();
    expect(stopEvent).not.toBeNull();
    expect((stopEvent?.payload as any)?.reason).toContain("Switching to self-paced exploratory mode");
  });
});

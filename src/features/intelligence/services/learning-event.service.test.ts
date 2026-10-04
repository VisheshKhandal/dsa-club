import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import {
  recordLearningEvent,
  getLearningEventsForTask,
  getLearningEventsForTopic,
  getLearningEventsForUser,
  LearningEventError,
} from "./learning-event.service";
import { LearningEventModel } from "../models/learning-event.model";

let mongod: MongoMemoryServer;

describe("Module 2: LearningEvent Ingestion Service", () => {
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);
    await LearningEventModel.syncIndexes();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await LearningEventModel.deleteMany({});
  });

  // ── 1. CLEAN INGESTION & CREATION ──
  it("records a new LearningEvent with status 'created' and isDuplicate: false", async () => {
    const userId = new Types.ObjectId();
    const planTaskId = new Types.ObjectId();

    const result = await recordLearningEvent({
      userId,
      eventType: "task_started",
      idempotencyKey: "start-task-1",
      planTaskId,
      payload: { sourceSurface: "workspace" },
    });

    expect(result.status).toBe("created");
    expect(result.isDuplicate).toBe(false);
    expect(result.event._id).toBeDefined();
    expect(result.event.eventType).toBe("task_started");

    // Verify persisted in DB
    const count = await LearningEventModel.countDocuments({ userId });
    expect(count).toBe(1);
  });

  // ── 2. IDEMPOTENT DUPLICATE RETURN ──
  it("returns existing event with status 'already_exists' and isDuplicate: true on duplicate idempotencyKey", async () => {
    const userId = new Types.ObjectId();
    const planTaskId = new Types.ObjectId();
    const idempotencyKey = "complete-task-101";

    // 1st call
    const firstResult = await recordLearningEvent({
      userId,
      eventType: "task_completed",
      idempotencyKey,
      planTaskId,
      payload: { minutesSpent: 20, independentSolve: true },
    });

    expect(firstResult.status).toBe("created");
    expect(firstResult.isDuplicate).toBe(false);

    // 2nd call with identical key and event type (network retry simulation)
    const duplicateResult = await recordLearningEvent({
      userId,
      eventType: "task_completed",
      idempotencyKey,
      planTaskId,
      payload: { minutesSpent: 20, independentSolve: true },
    });

    expect(duplicateResult.status).toBe("already_exists");
    expect(duplicateResult.isDuplicate).toBe(true);
    expect(duplicateResult.event._id.toString()).toBe(firstResult.event._id.toString());

    // Invariant: Total count in MongoDB must strictly remain 1
    const count = await LearningEventModel.countDocuments({ userId });
    expect(count).toBe(1);
  });

  // ── 3. STRICT CONFLICT DETECTION ──
  it("throws IDEMPOTENCY_CONFLICT if same key is reused with a different eventType", async () => {
    const userId = new Types.ObjectId();
    const idempotencyKey = "key-reused-with-conflict";

    // 1st call: recorded as task_completed
    await recordLearningEvent({
      userId,
      eventType: "task_completed",
      idempotencyKey,
      payload: { minutesSpent: 15, independentSolve: true },
    });

    // 2nd call: same key but tried to emit task_skipped
    await expect(
      recordLearningEvent({
        userId,
        eventType: "task_skipped",
        idempotencyKey,
        payload: { reason: "Too difficult" },
      })
    ).rejects.toThrowError(LearningEventError);

    try {
      await recordLearningEvent({
        userId,
        eventType: "task_skipped",
        idempotencyKey,
        payload: { reason: "Too difficult" },
      });
    } catch (err: any) {
      expect(err.code).toBe("IDEMPOTENCY_CONFLICT");
    }
  });

  it("throws IDEMPOTENCY_CONFLICT if same key is reused with a different planTaskId", async () => {
    const userId = new Types.ObjectId();
    const idempotencyKey = "key-different-task";
    const taskA = new Types.ObjectId();
    const taskB = new Types.ObjectId();

    await recordLearningEvent({
      userId,
      eventType: "task_started",
      idempotencyKey,
      planTaskId: taskA,
      payload: {},
    });

    await expect(
      recordLearningEvent({
        userId,
        eventType: "task_started",
        idempotencyKey,
        planTaskId: taskB,
        payload: {},
      })
    ).rejects.toThrowError(LearningEventError);
  });

  // ── 4. CONCURRENT RACE SAFETY ──
  it("safely handles parallel duplicate requests without throwing or creating duplicate documents", async () => {
    const userId = new Types.ObjectId();
    const planTaskId = new Types.ObjectId();
    const idempotencyKey = "parallel-race-test-key";

    // Simulate 2 parallel incoming network requests at the exact same millisecond
    const [res1, res2] = await Promise.all([
      recordLearningEvent({
        userId,
        eventType: "hint_requested",
        idempotencyKey,
        planTaskId,
        payload: { hintLevel: 1 },
      }),
      recordLearningEvent({
        userId,
        eventType: "hint_requested",
        idempotencyKey,
        planTaskId,
        payload: { hintLevel: 1 },
      }),
    ]);

    // One must be 'created', one must be 'already_exists'
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual(["already_exists", "created"]);

    // Both must refer to the exact same document ID
    expect(res1.event._id.toString()).toBe(res2.event._id.toString());

    // Exactly 1 document in the database
    const count = await LearningEventModel.countDocuments({ userId });
    expect(count).toBe(1);
  });

  // ── 5. TIMELINE QUERY HELPERS ──
  it("retrieves task events chronologically via getLearningEventsForTask", async () => {
    const userId = new Types.ObjectId();
    const planTaskId = new Types.ObjectId();

    const t1 = new Date("2026-09-28T10:00:00.000Z");
    const t2 = new Date("2026-09-28T10:05:00.000Z");
    const t3 = new Date("2026-09-28T10:15:00.000Z");

    await recordLearningEvent({
      userId,
      eventType: "task_started",
      idempotencyKey: "task-t1",
      planTaskId,
      occurredAt: t1,
      payload: {},
    });

    await recordLearningEvent({
      userId,
      eventType: "hint_requested",
      idempotencyKey: "task-t2",
      planTaskId,
      occurredAt: t2,
      payload: { hintLevel: 1 },
    });

    await recordLearningEvent({
      userId,
      eventType: "task_completed",
      idempotencyKey: "task-t3",
      planTaskId,
      occurredAt: t3,
      payload: { minutesSpent: 15, independentSolve: false },
    });

    const events = await getLearningEventsForTask(planTaskId);
    expect(events.length).toBe(3);
    expect(events[0].eventType).toBe("task_started");
    expect(events[1].eventType).toBe("hint_requested");
    expect(events[2].eventType).toBe("task_completed");
  });

  it("retrieves topic progression events via getLearningEventsForTopic", async () => {
    const userId = new Types.ObjectId();
    const topicSlug = "linked-list";

    await recordLearningEvent({
      userId,
      eventType: "task_completed",
      idempotencyKey: "ll-1",
      topicSlug,
      payload: { minutesSpent: 10, independentSolve: true },
    });

    await recordLearningEvent({
      userId,
      eventType: "task_completed",
      idempotencyKey: "ll-2",
      topicSlug,
      payload: { minutesSpent: 12, independentSolve: true },
    });

    // Unrelated topic event
    await recordLearningEvent({
      userId,
      eventType: "task_completed",
      idempotencyKey: "dp-1",
      topicSlug: "dynamic-programming",
      payload: { minutesSpent: 40, independentSolve: false },
    });

    const topicEvents = await getLearningEventsForTopic(userId, topicSlug);
    expect(topicEvents.length).toBe(2);
    expect(topicEvents.every((e) => e.topicSlug === "linked-list")).toBe(true);
  });

  it("retrieves filtered events for user via getLearningEventsForUser", async () => {
    const userId = new Types.ObjectId();

    await recordLearningEvent({
      userId,
      eventType: "task_started",
      idempotencyKey: "user-evt-1",
      payload: {},
    });

    await recordLearningEvent({
      userId,
      eventType: "reflection_submitted",
      idempotencyKey: "user-evt-2",
      payload: { keyTakeaway: "Fast & Slow pointer simplifies cycle detection." },
    });

    const reflectionsOnly = await getLearningEventsForUser(userId, {
      eventTypes: ["reflection_submitted"],
    });

    expect(reflectionsOnly.length).toBe(1);
    expect(reflectionsOnly[0].eventType).toBe("reflection_submitted");
  });
});

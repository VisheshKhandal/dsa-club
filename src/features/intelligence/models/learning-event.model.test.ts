import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import { LearningEventModel } from "./learning-event.model";
import { LEARNING_EVENT_TYPES } from "../events/learning-event.types";

let mongod: MongoMemoryServer;

describe("Module 1: LearningEvent Model & Invariants", () => {
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
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

  // ── 1. SCHEMA INTEGRITY & ENUM VALIDATION ──
  it("verifies schema paths, defaults, and canonical eventType enum values", () => {
    const paths = LearningEventModel.schema.paths;

    expect(paths).toHaveProperty("userId");
    expect(paths).toHaveProperty("eventType");
    expect(paths).toHaveProperty("occurredAt");
    expect(paths).toHaveProperty("occurredAtTimezone");
    expect(paths).toHaveProperty("receivedAt");
    expect(paths).toHaveProperty("idempotencyKey");
    expect(paths).toHaveProperty("schemaVersion");
    expect(paths).toHaveProperty("source");
    expect(paths).toHaveProperty("payload");

    // Check enum array
    const eventTypeEnum = (paths["eventType"] as any).options.enum;
    expect(eventTypeEnum).toEqual(LEARNING_EVENT_TYPES);
  });

  // ── 2. VALID DOCUMENT CREATION ──
  it("creates a valid immutable LearningEvent with default schema version and UTC timezone", async () => {
    const userId = new Types.ObjectId();
    const planTaskId = new Types.ObjectId();
    const now = new Date();

    const event = await LearningEventModel.create({
      userId,
      eventType: "task_started",
      occurredAt: now,
      idempotencyKey: `start-${planTaskId.toString()}-1`,
      planTaskId,
      payload: {
        sourceSurface: "dashboard",
      },
    });

    expect(event._id).toBeDefined();
    expect(event.userId.toString()).toBe(userId.toString());
    expect(event.eventType).toBe("task_started");
    expect(event.schemaVersion).toBe(1);
    expect(event.occurredAtTimezone).toBe("UTC");
    expect(event.source).toBe("server");
    expect(event.payload).toEqual({ sourceSurface: "dashboard" });
    expect(event.receivedAt).toBeDefined();
  });

  // ── 3. STRICT SCHEMA VALIDATION & REJECTIONS ──
  it("rejects invalid or unknown eventType values", async () => {
    const userId = new Types.ObjectId();

    await expect(
      LearningEventModel.create({
        userId,
        eventType: "unknown_hack_event" as any,
        occurredAt: new Date(),
        idempotencyKey: "test-key-1",
      })
    ).rejects.toThrow();
  });

  it("rejects event creation without mandatory userId or idempotencyKey", async () => {
    await expect(
      LearningEventModel.create({
        eventType: "task_completed",
        occurredAt: new Date(),
        idempotencyKey: "test-key-missing-user",
      } as any)
    ).rejects.toThrow();

    await expect(
      LearningEventModel.create({
        userId: new Types.ObjectId(),
        eventType: "task_completed",
        occurredAt: new Date(),
      } as any)
    ).rejects.toThrow();
  });

  // ── 4. PER-USER IDEMPOTENCY KEY CONSTRAINT ──
  it("strictly enforces compound unique index on (userId, idempotencyKey)", async () => {
    const userId = new Types.ObjectId();
    const idempotencyKey = "complete-task-123-attempt-1";

    // 1st insert: succeeds
    await LearningEventModel.create({
      userId,
      eventType: "task_completed",
      occurredAt: new Date(),
      idempotencyKey,
      payload: { minutesSpent: 25, independentSolve: true },
    });

    // 2nd insert with exact same userId and idempotencyKey: must fail with MongoDB duplicate key error (code 11000)
    await expect(
      LearningEventModel.create({
        userId,
        eventType: "task_completed",
        occurredAt: new Date(),
        idempotencyKey,
        payload: { minutesSpent: 30, independentSolve: false },
      })
    ).rejects.toThrow(/duplicate key|E11000/);
  });

  it("allows different users to use the same idempotency key without collision", async () => {
    const userA = new Types.ObjectId();
    const userB = new Types.ObjectId();
    const sharedIdempotencyKey = "shared-batch-key-1";

    const eventA = await LearningEventModel.create({
      userId: userA,
      eventType: "problem_attempted",
      occurredAt: new Date(),
      idempotencyKey: sharedIdempotencyKey,
      payload: { attemptNumber: 1, passed: true },
    });

    const eventB = await LearningEventModel.create({
      userId: userB,
      eventType: "problem_attempted",
      occurredAt: new Date(),
      idempotencyKey: sharedIdempotencyKey,
      payload: { attemptNumber: 1, passed: true },
    });

    expect(eventA._id).toBeDefined();
    expect(eventB._id).toBeDefined();
    expect(eventA.userId.toString()).not.toBe(eventB.userId.toString());
  });

  // ── 5. IMMUTABILITY GUARDS ──
  it("blocks update operations to ensure event sourcing immutability", async () => {
    const userId = new Types.ObjectId();
    const event = await LearningEventModel.create({
      userId,
      eventType: "hint_requested",
      occurredAt: new Date(),
      idempotencyKey: "hint-req-1",
      payload: { hintLevel: 1 },
    });

    // Attempting to update the event must be intercepted and thrown
    await expect(
      LearningEventModel.updateOne(
        { _id: event._id },
        { $set: { "payload.hintLevel": 2 } }
      )
    ).rejects.toThrow("LearningEvent documents are immutable and cannot be updated.");

    await expect(
      LearningEventModel.findOneAndUpdate(
        { _id: event._id },
        { $set: { "payload.hintLevel": 3 } }
      )
    ).rejects.toThrow("LearningEvent documents are immutable and cannot be updated.");
  });

  // ── 6. TIMELINE & TIMEZONE PRESERVATION ──
  it("preserves exact occurredAt timestamp and custom local timezone", async () => {
    const userId = new Types.ObjectId();
    const localTimezone = "Asia/Kolkata";
    const customOccurredAt = new Date("2026-09-28T09:30:00.000Z");

    const event = await LearningEventModel.create({
      userId,
      eventType: "reflection_submitted",
      occurredAt: customOccurredAt,
      occurredAtTimezone: localTimezone,
      idempotencyKey: "reflection-kolkata-1",
      payload: {
        keyTakeaway: "Pointers must be reversed iteratively before breaking links.",
        confidenceLevel: 5,
      },
    });

    const fetched = await LearningEventModel.findById(event._id).lean();
    expect(fetched).not.toBeNull();
    expect(new Date(fetched!.occurredAt).toISOString()).toBe(customOccurredAt.toISOString());
    expect(fetched!.occurredAtTimezone).toBe("Asia/Kolkata");
  });
});

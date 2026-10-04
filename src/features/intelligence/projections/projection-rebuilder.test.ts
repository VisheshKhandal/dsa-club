import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import { LearningEventModel } from "../models/learning-event.model";
import { UserTopicProgressModel } from "../models/user-topic-progress.model";
import { recordLearningEvent } from "../services/learning-event.service";
import {
  rebuildUserTopicProgress,
  rebuildAllUserTopicProjections,
} from "./projection-rebuilder";

let mongod: MongoMemoryServer;

describe("Module 5: Projections & Event Replay Engine", () => {
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);

    await LearningEventModel.syncIndexes();
    await UserTopicProgressModel.syncIndexes();
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await LearningEventModel.deleteMany({});
    await UserTopicProgressModel.deleteMany({});
  });

  // ── 1. LIVE INCREMENTAL PROJECTION UPDATES ──
  it("incrementally updates UserTopicProgress projection as events are ingested", async () => {
    const userId = new Types.ObjectId();
    const topicSlug = "linked-list";

    // 1. Ingest problem_attempted
    await recordLearningEvent({
      userId,
      eventType: "problem_attempted",
      idempotencyKey: "ll-att-1",
      topicSlug,
      payload: { passed: false, attemptNumber: 1 },
    });

    let projection = await UserTopicProgressModel.findOne({
      userId,
      topicSlug,
    }).lean();

    expect(projection).not.toBeNull();
    expect(projection?.attemptedCount).toBe(1);
    expect(projection?.completedCount).toBe(0);

    // 2. Ingest hint_requested
    await recordLearningEvent({
      userId,
      eventType: "hint_requested",
      idempotencyKey: "ll-hint-1",
      topicSlug,
      payload: { hintLevel: 1 },
    });

    projection = await UserTopicProgressModel.findOne({
      userId,
      topicSlug,
    }).lean();

    expect(projection?.hintCount).toBe(1);

    // 3. Ingest task_completed
    await recordLearningEvent({
      userId,
      eventType: "task_completed",
      idempotencyKey: "ll-comp-1",
      topicSlug,
      payload: {
        minutesSpent: 25,
        independentSolve: false, // Hint was used
      },
    });

    projection = await UserTopicProgressModel.findOne({
      userId,
      topicSlug,
    }).lean();

    expect(projection?.completedCount).toBe(1);
    expect(projection?.independentSolveCount).toBe(0);
    expect(projection?.totalMinutesSpent).toBe(25);
    expect(projection?.reviewDueAt).toBeDefined();
    expect(projection?.rebuildStatus).toBe("healthy");
    expect(projection?.masteryScore).toBeGreaterThanOrEqual(0);
  });

  // ── 2. DISASTER RECOVERY & GROUND-UP REPLAY REBUILD ──
  it("completely reconstructs a wiped projection from the immutable event log", async () => {
    const userId = new Types.ObjectId();
    const topicSlug = "binary-trees";

    const prob1 = new Types.ObjectId();
    const prob2 = new Types.ObjectId();

    // Ingest a sequence of events over multiple days
    await recordLearningEvent({
      userId,
      eventType: "problem_attempted",
      idempotencyKey: "bt-att-1",
      topicSlug,
      problemId: prob1,
      occurredAt: new Date("2026-09-20T10:00:00Z"),
      payload: { passed: true, attemptNumber: 1 },
    });

    await recordLearningEvent({
      userId,
      eventType: "task_completed",
      idempotencyKey: "bt-comp-1",
      topicSlug,
      problemId: prob1,
      occurredAt: new Date("2026-09-20T10:15:00Z"),
      payload: { minutesSpent: 15, independentSolve: true },
    });

    await recordLearningEvent({
      userId,
      eventType: "task_completed",
      idempotencyKey: "bt-comp-2",
      topicSlug,
      problemId: prob2,
      occurredAt: new Date("2026-09-21T11:00:00Z"),
      payload: { minutesSpent: 20, independentSolve: true },
    });

    await recordLearningEvent({
      userId,
      eventType: "confidence_submitted",
      idempotencyKey: "bt-conf-1",
      topicSlug,
      occurredAt: new Date("2026-09-21T11:05:00Z"),
      payload: { timing: "post_attempt", confidenceScore: 4 },
    });

    const liveProjection = await UserTopicProgressModel.findOne({
      userId,
      topicSlug,
    }).lean();

    expect(liveProjection?.completedCount).toBe(2);
    expect(liveProjection?.independentSolveCount).toBe(2);
    expect(liveProjection?.totalMinutesSpent).toBe(35);
    expect(liveProjection?.averageConfidence).toBe(4);

    // ── SIMULATE DISASTER: Wipe projection table entirely ──
    await UserTopicProgressModel.deleteMany({});
    const emptyCheck = await UserTopicProgressModel.countDocuments();
    expect(emptyCheck).toBe(0);

    // ── REBUILD: Reconstruct from event stream ──
    const rebuilt = await rebuildUserTopicProgress(userId, topicSlug);

    expect(rebuilt).not.toBeNull();
    expect(rebuilt.completedCount).toBe(liveProjection?.completedCount);
    expect(rebuilt.independentSolveCount).toBe(liveProjection?.independentSolveCount);
    expect(rebuilt.totalMinutesSpent).toBe(liveProjection?.totalMinutesSpent);
    expect(rebuilt.averageConfidence).toBe(liveProjection?.averageConfidence);
    expect(rebuilt.masteryScore).toBe(liveProjection?.masteryScore);
    expect(rebuilt.rebuildStatus).toBe("healthy");
  });

  // ── 3. MULTI-TOPIC REBUILD ISOLATION ──
  it("rebuilds all topics independently without cross-topic data contamination", async () => {
    const userId = new Types.ObjectId();

    const arrProb = new Types.ObjectId();
    const grpProb = new Types.ObjectId();

    // Arrays events
    await recordLearningEvent({
      userId,
      eventType: "task_completed",
      idempotencyKey: "arr-1",
      topicSlug: "arrays",
      problemId: arrProb,
      payload: { minutesSpent: 10, independentSolve: true },
    });

    // Graphs events
    await recordLearningEvent({
      userId,
      eventType: "task_completed",
      idempotencyKey: "grp-1",
      topicSlug: "graphs",
      problemId: grpProb,
      payload: { minutesSpent: 45, independentSolve: false },
    });

    await recordLearningEvent({
      userId,
      eventType: "hint_requested",
      idempotencyKey: "grp-hint-1",
      topicSlug: "graphs",
      payload: { hintLevel: 1 },
    });

    // Wipe projections
    await UserTopicProgressModel.deleteMany({});

    // Rebuild all
    const rebuiltAll = await rebuildAllUserTopicProjections(userId);
    expect(rebuiltAll.length).toBe(2);

    const arraysProj = rebuiltAll.find((p) => p.topicSlug === "arrays");
    const graphsProj = rebuiltAll.find((p) => p.topicSlug === "graphs");

    expect(arraysProj?.completedCount).toBe(1);
    expect(arraysProj?.independentSolveCount).toBe(1);
    expect(arraysProj?.hintCount).toBe(0);

    expect(graphsProj?.completedCount).toBe(1);
    expect(graphsProj?.independentSolveCount).toBe(0);
    expect(graphsProj?.hintCount).toBe(1);
  });
});

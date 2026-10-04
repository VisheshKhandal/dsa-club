import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";

// Models
import { UserModel } from "@/features/identity/models/user.model";
import {
  ProblemAttemptModel,
  ReflectionLogModel,
  PracticeSessionModel,
  LearningCommandModel,
  PatternMasteryModel,
  TopicProgressModel,
  MissionProgressModel,
} from "@/features/learning/models/learning.model";
import {
  RevisionQueueModel,
  RevisionHistoryModel,
  LearningDeliveryModel,
  UserStatisticsModel,
  DailyPlanModel,
} from "@/features/intelligence/models/intelligence.model";
import { LearningEventModel } from "@/features/intelligence/models/learning-event.model";
import { UserTopicProgressModel } from "@/features/intelligence/models/user-topic-progress.model";
import { PlanModel } from "@/features/intelligence/models/plan.model";
import { PlanDayModel } from "@/features/intelligence/models/plan-day.model";
import { PlanTaskModel } from "@/features/intelligence/models/plan-task.model";
import { ProblemModel, TopicModel } from "@/features/content/models/content.model";

// Services
import {
  executePracticeSubmission,
  executeReviewSubmission,
  getCommandReceipt,
} from "./learning-command.service";
import {
  getOrCreatePracticeSession,
  startFreshAttempt,
  recordAttemptHintReveal,
  updateSessionTimerState,
} from "./practice-session.service";
import {
  claimDeliveries,
  processDeliveryBatch,
  recoverStaleDeliveries,
  verifyCronAuthorization,
} from "@/features/intelligence/services/learning-delivery.service";
import { resetLearningDataAction } from "@/features/product/actions/product.actions";

// Mock next/cache and auth guard
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

let currentMockUserId: string = new Types.ObjectId().toString();

vi.mock("@/lib/auth-guard", () => ({
  requireUserId: vi.fn(() => Promise.resolve(currentMockUserId)),
}));

let replSet: MongoMemoryReplSet;

describe("Phase 1 Foundation and Reliability Acceptance Suite", () => {
  let testUserId: Types.ObjectId;
  let testProblemId: Types.ObjectId;
  let testTopicId: Types.ObjectId;

  beforeAll(async () => {
    // Start in-memory replica set to support transactions
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);

    // Additive index creation
    await LearningCommandModel.createIndexes();
    await PracticeSessionModel.createIndexes();
    await ProblemAttemptModel.createIndexes();
    await RevisionHistoryModel.createIndexes();
    await RevisionQueueModel.createIndexes();
    await LearningDeliveryModel.createIndexes();
    await LearningEventModel.createIndexes();
    await UserTopicProgressModel.createIndexes();
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  beforeEach(async () => {
    // Clean collections before each test
    await LearningCommandModel.deleteMany({});
    await PracticeSessionModel.deleteMany({});
    await ProblemAttemptModel.deleteMany({});
    await ReflectionLogModel.deleteMany({});
    await RevisionHistoryModel.deleteMany({});
    await RevisionQueueModel.deleteMany({});
    await LearningDeliveryModel.deleteMany({});
    await LearningEventModel.deleteMany({});
    await UserTopicProgressModel.deleteMany({});
    await UserStatisticsModel.deleteMany({});
    await UserModel.deleteMany({});
    await ProblemModel.deleteMany({});
    await TopicModel.deleteMany({});
    await PlanModel.deleteMany({});
    await PlanDayModel.deleteMany({});
    await PlanTaskModel.deleteMany({});

    testUserId = new Types.ObjectId();
    currentMockUserId = testUserId.toString();
    testTopicId = new Types.ObjectId();
    testProblemId = new Types.ObjectId();

    await UserModel.create({
      _id: testUserId,
      name: "Test Engineer",
      email: "test@dsaclub.internal",
      role: "student",
      learningEpoch: 1,
    });

    await TopicModel.create({
      _id: testTopicId,
      name: "Two Pointers",
      slug: "two-pointers",
      description: "Master two pointer algorithmic patterns and techniques",
      estimatedMinutes: 60,
      order: 1,
      difficulty: "easy",
      isPublished: true,
    });

    await ProblemModel.create({
      _id: testProblemId,
      title: "Valid Palindrome",
      slug: "valid-palindrome",
      summary: "Determine if a string is a palindrome using two pointers",
      source: "internal",
      sourceUrl: "/problems/valid-palindrome",
      estimatedMinutes: 20,
      topicIds: [testTopicId],
      patternIds: [],
      difficulty: "easy",
      isPublished: true,
    });
  });

  describe("1. Command Identity and Idempotent Practice Submissions", () => {
    it("submits practice command once and returns durable receipt", async () => {
      const commandId = "cmd_practice_001";
      const result = await executePracticeSubmission({
        userId: testUserId,
        commandId,
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 120,
        durationProvenance: "measured",
        hintsUsed: 0,
        reflection: "Recognized two-pointer symmetry immediately.",
      });

      expect(result.receipt).toBeDefined();
      expect(result.receipt!.commandId).toBe(commandId);
      expect(result.receipt!.commandKind).toBe("practice_submission");
      expect(result.receipt!.outcome).toBe("solved");
      expect(result.receipt!.downstreamStatus).toBe("pending");

      // Verify DB state
      const attempts = await ProblemAttemptModel.find({ userId: testUserId });
      expect(attempts).toHaveLength(1);
      expect(attempts[0].commandId).toBe(commandId);
      expect(attempts[0].strategy).toBe("independent");
      expect(attempts[0].durationSeconds).toBe(120);
      expect(attempts[0].durationProvenance).toBe("measured");

      // Verify reflection was atomically persisted
      const reflections = await ReflectionLogModel.find({ userId: testUserId });
      expect(reflections).toHaveLength(1);
      expect(reflections[0].content).toBe("Recognized two-pointer symmetry immediately.");
      expect(reflections[0].problemAttemptId?.toString()).toBe(attempts[0]._id.toString());
    });

    it("resubmitting identical practice payload returns original receipt without duplicate attempt", async () => {
      const commandId = "cmd_practice_idempotent";
      const payload = {
        userId: testUserId,
        commandId,
        problemId: testProblemId.toString(),
        status: "solved" as const,
        strategy: "independent" as const,
        durationSeconds: 90,
        durationProvenance: "measured" as const,
        hintsUsed: 0,
      };

      const firstResult = await executePracticeSubmission(payload);
      const secondResult = await executePracticeSubmission(payload);

      expect(secondResult.receipt).toBeDefined();
      expect(firstResult.receipt).toBeDefined();
      expect(secondResult.receipt!.commandId).toBe(commandId);
      expect(secondResult.receipt!.attemptId).toBe(firstResult.receipt!.attemptId);
      expect(secondResult.receipt!.committedAt).toBe(firstResult.receipt!.committedAt);

      // Verify attempts count is strictly 1
      const count = await ProblemAttemptModel.countDocuments({ userId: testUserId });
      expect(count).toBe(1);
    });

    it("submitting same command ID with altered payload returns 409 conflict", async () => {
      const commandId = "cmd_practice_conflict";

      await executePracticeSubmission({
        userId: testUserId,
        commandId,
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 100,
      });

      const conflictResult = await executePracticeSubmission({
        userId: testUserId,
        commandId,
        problemId: testProblemId.toString(),
        status: "abandoned", // altered status
        strategy: "independent",
        durationSeconds: 100,
      });

      expect(conflictResult.ok).toBe(false);
      expect(conflictResult.conflict).toBe(true);
      expect(conflictResult.status).toBe(409);
    });

    it("resolves response loss via getCommandReceipt", async () => {
      const commandId = "cmd_response_loss_01";

      await executePracticeSubmission({
        userId: testUserId,
        commandId,
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 60,
      });

      const res = await getCommandReceipt(testUserId, commandId);
      expect(res.ok).toBe(true);
      expect(res.receipt?.commandId).toBe(commandId);
      expect(res.receipt?.outcome).toBe("solved");
    });
  });

  describe("2. Review Submissions and Grade 0 Invariance", () => {
    it("preserves grade 0 throughout review pipeline and creates stable reviewAttemptId", async () => {
      const queueItem = await RevisionQueueModel.create({
        userId: testUserId,
        entityType: "problem",
        entityId: testProblemId,
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 0,
        dueAt: new Date(),
        source: "attempt",
        state: "due",
        learningEpoch: 1,
      });

      const commandId = "cmd_review_grade_zero";
      const result = await executeReviewSubmission({
        userId: testUserId,
        commandId,
        queueId: queueItem._id.toString(),
        grade: 0, // Zero grade: failure/complete blackout
        confidence: 1,
        responseSeconds: 45,
        summary: "Could not recall invariant",
      });

      expect(result.receipt).toBeDefined();
      expect(result.receipt!.commandKind).toBe("review_submission");
      expect(result.receipt!.outcome).toBe("grade_0");
      expect(result.receipt!.reviewAttemptId).toBeDefined();

      // Check RevisionHistoryModel
      const history = await RevisionHistoryModel.findOne({ userId: testUserId });
      expect(history).not.toBeNull();
      expect(history?.grade).toBe(0); // Strictly 0, never upgraded to 3!
      expect(history?.reviewAttemptId).toBe(result.receipt!.reviewAttemptId);

      // Check RevisionQueueModel: failed review resets interval to 1 day
      const updatedQueue = await RevisionQueueModel.findById(queueItem._id);
      expect(updatedQueue?.repetitions).toBe(0);
      expect(updatedQueue?.intervalDays).toBe(1);
    });

    it("retrying review with same command ID returns original receipt without double-advancing schedule", async () => {
      const queueItem = await RevisionQueueModel.create({
        userId: testUserId,
        entityType: "problem",
        entityId: testProblemId,
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 0,
        dueAt: new Date(),
        source: "attempt",
        state: "due",
        learningEpoch: 1,
      });

      const commandId = "cmd_review_retry";
      const payload = {
        userId: testUserId,
        commandId,
        queueId: queueItem._id.toString(),
        grade: 4 as const,
        confidence: 4,
        responseSeconds: 30,
      };

      const first = await executeReviewSubmission(payload);
      const queueAfterFirst = await RevisionQueueModel.findById(queueItem._id);
      const intervalAfterFirst = queueAfterFirst?.intervalDays;

      const second = await executeReviewSubmission(payload);
      const queueAfterSecond = await RevisionQueueModel.findById(queueItem._id);

      expect(second.receipt).toBeDefined();
      expect(first.receipt).toBeDefined();
      expect(second.receipt!.reviewAttemptId).toBe(first.receipt!.reviewAttemptId);
      expect(queueAfterSecond?.intervalDays).toBe(intervalAfterFirst);
      expect(queueAfterSecond?.repetitions).toBe(queueAfterFirst?.repetitions);
    });
  });

  describe("3. Persistent Practice Sessions and Attempt-Scoped Assistance", () => {
    it("creates and resumes practice session across page loads", async () => {
      const session1 = await getOrCreatePracticeSession({
        userId: testUserId.toString(),
        problemId: testProblemId.toString(),
        sourceSurface: "workspace",
      });

      expect(session1.sessionId).toBeDefined();
      expect(session1.activeAttemptNumber).toBe(1);

      // Second fetch resumes the same active session
      const session2 = await getOrCreatePracticeSession({
        userId: testUserId.toString(),
        problemId: testProblemId.toString(),
        sourceSurface: "workspace",
      });

      expect(session2.sessionId).toBe(session1.sessionId);
      expect(session2.activeAttemptNumber).toBe(session1.activeAttemptNumber);
    });

    it("reveals hints and deduplicates identical reveals within the same attempt", async () => {
      await getOrCreatePracticeSession({
        userId: testUserId.toString(),
        problemId: testProblemId.toString(),
      });

      // Reveal hint 1
      const res1 = await recordAttemptHintReveal(testUserId, testProblemId.toString(), 1);
      expect(res1.hintsRevealedLevels).toEqual([1]);
      expect(res1.isAssisted).toBe(true);

      // Reveal hint 1 again (duplicate)
      const res2 = await recordAttemptHintReveal(testUserId, testProblemId.toString(), 1);
      expect(res2.hintsRevealedLevels).toEqual([1]); // Not duplicated!

      // Reveal hint 2
      const res3 = await recordAttemptHintReveal(testUserId, testProblemId.toString(), 2);
      expect(res3.hintsRevealedLevels).toEqual([1, 2]);
    });

    it("starting a fresh attempt cleanly scopes hints while preserving prior exposure", async () => {
      await getOrCreatePracticeSession({
        userId: testUserId.toString(),
        problemId: testProblemId.toString(),
      });
      await recordAttemptHintReveal(testUserId, testProblemId.toString(), 1);

      // Start fresh attempt
      const freshSession = await startFreshAttempt(testUserId.toString(), testProblemId.toString());

      expect(freshSession.activeAttemptNumber).toBe(2);
      expect(freshSession.hintsRevealedLevels).toEqual([]); // Fresh clean hints!
      expect(freshSession.isAssisted).toBe(false); // Current attempt is not assisted
      expect(freshSession.hasPriorExposure).toBe(true); // Prior exposure is durably remembered!
    });
  });

  describe("4. Duration Provenance and Honest Accounting", () => {
    it("records unknown duration when timer is zero without inventing study time", async () => {
      const commandId = "cmd_zero_timer";
      const result = await executePracticeSubmission({
        userId: testUserId,
        commandId,
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 0,
        durationProvenance: "unknown",
      });

      expect(result.receipt).toBeDefined();
      expect(result.receipt!.durationProvenance).toBe("unknown");
      const attempt = await ProblemAttemptModel.findOne({ commandId });
      expect(attempt?.durationSeconds).toBe(0);
      expect(attempt?.durationProvenance).toBe("unknown");
    });

    it("records measured duration when timer was actively run", async () => {
      const commandId = "cmd_active_timer";
      const result = await executePracticeSubmission({
        userId: testUserId,
        commandId,
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 310,
        durationProvenance: "measured",
      });

      expect(result.receipt).toBeDefined();
      expect(result.receipt!.durationProvenance).toBe("measured");
      const attempt = await ProblemAttemptModel.findOne({ commandId });
      expect(attempt?.durationSeconds).toBe(310);
      expect(attempt?.durationProvenance).toBe("measured");
    });
  });

  describe("5. Durable Outbox Delivery, Claiming, and Recovery", () => {
    it("claims delivery batch atomically with lease token and recovers stale leases", async () => {
      const event = await LearningEventModel.create({
        userId: testUserId,
        eventType: "task_completed",
        idempotencyKey: "evt_test_001",
        learningEpoch: 1,
        problemId: testProblemId,
        topicSlug: "two-pointers",
        occurredAt: new Date(),
        payload: {
          strategy: "independent",
          outcome: "solved",
        },
      });

      await LearningDeliveryModel.create({
        deliveryKey: "del_test_001",
        eventId: event._id,
        handler: "topic_progress_projection",
        userId: testUserId,
        learningEpoch: 1,
        status: "pending",
      });

      // Claim batch
      const worker1 = "worker-node-1";
      const claimed = await claimDeliveries({
        workerId: worker1,
        batchSize: 10,
        leaseMs: 1000, // Short 1s lease for testing
      });

      expect(claimed).toHaveLength(1);
      expect(claimed[0].status).toBe("claimed");
      expect(claimed[0].claimedBy).toBe(worker1);

      // Expire lease manually
      await LearningDeliveryModel.updateOne(
        { _id: claimed[0]._id },
        { $set: { leaseExpiresAt: new Date(Date.now() - 5000) } }
      );

      // Recover stale deliveries
      const recoveredCount = await recoverStaleDeliveries();
      expect(recoveredCount).toBe(1);

      const recoveredDoc = await LearningDeliveryModel.findById(claimed[0]._id);
      expect(recoveredDoc?.status).toBe("pending");
      expect(recoveredDoc?.claimedBy).toBeNull();
    });

    it("verifies cron authorization with fail-closed semantics", () => {
      const secret = "super-secret-cron-token";
      expect(verifyCronAuthorization(`Bearer ${secret}`, secret)).toBe(true);
      expect(verifyCronAuthorization("Bearer wrong-token", secret)).toBe(false);
      expect(verifyCronAuthorization(null, secret)).toBe(false);
      // Fails closed if secret is missing/empty
      expect(verifyCronAuthorization("Bearer whatever", "")).toBe(false);
      expect(verifyCronAuthorization("Bearer whatever", undefined)).toBe(false);
    });
  });

  describe("6. Complete Learning Reset and Epoch Fencing", () => {
    it("wipes learning collections and increments learning epoch", async () => {
      // Create test data across collections
      await ProblemAttemptModel.create({
        userId: testUserId,
        problemId: testProblemId,
        status: "solved",
        strategy: "independent",
        learningEpoch: 1,
        startedAt: new Date(),
        completedAt: new Date(),
        selfConfidence: 4,
        perceivedDifficulty: 3,
        durationSeconds: 120,
      });

      await RevisionQueueModel.create({
        userId: testUserId,
        entityType: "problem",
        entityId: testProblemId,
        source: "attempt",
        dueAt: new Date(),
        learningEpoch: 1,
      });

      await UserTopicProgressModel.create({
        userId: testUserId,
        topicSlug: "two-pointers",
        solvedCount: 1,
        learningEpoch: 1,
      });

      await PracticeSessionModel.create({
        userId: testUserId,
        problemId: testProblemId,
        status: "active",
        learningEpoch: 1,
      });

      // Execute reset with required confirmation phrase
      const resetResult = await resetLearningDataAction("RESET");
      expect(resetResult.ok).toBe(true);

      // Verify epoch incremented
      const updatedUser = await UserModel.findById(testUserId);
      expect(updatedUser?.learningEpoch).toBe(2);

      // Verify collections wiped
      expect(await ProblemAttemptModel.countDocuments({ userId: testUserId })).toBe(0);
      expect(await RevisionQueueModel.countDocuments({ userId: testUserId })).toBe(0);
      expect(await UserTopicProgressModel.countDocuments({ userId: testUserId })).toBe(0);
      expect(await PracticeSessionModel.countDocuments({ userId: testUserId })).toBe(0);

      // Verify old epoch submissions are fenced
      await expect(
        executePracticeSubmission({
          userId: testUserId,
          commandId: "cmd_old_epoch",
          problemId: testProblemId.toString(),
          status: "solved",
          strategy: "independent",
          durationSeconds: 100,
        })
      ).resolves.toMatchObject({
        receipt: expect.objectContaining({
          learningEpoch: 2, // New submissions use fresh epoch 2
        }),
      });
    });
  });
});

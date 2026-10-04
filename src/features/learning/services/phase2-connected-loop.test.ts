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
} from "@/features/learning/models/learning.model";
import {
  RevisionQueueModel,
  RevisionHistoryModel,
  LearningDeliveryModel,
  UserStatisticsModel,
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
  recordAttemptHintReveal,
} from "./practice-session.service";
import {
  processDeliveryBatch,
} from "@/features/intelligence/services/learning-delivery.service";
import { getSharedLearnerTopicProgress } from "@/features/progress/services/shared-progress.service";
import {
  resolveTaskRequirement,
  evaluateTaskCompletion,
} from "@/features/intelligence/services/completion-evaluator";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

let currentMockUserId: string = new Types.ObjectId().toString();

vi.mock("@/lib/auth-guard", () => ({
  requireUserId: vi.fn(() => Promise.resolve(currentMockUserId)),
}));

describe("Phase 2 — Connected Learning Loop Acceptance Suite", () => {
  let replSet: MongoMemoryReplSet;
  let testUserId: Types.ObjectId;
  let testProblemId: Types.ObjectId;
  let testTopicId: Types.ObjectId;
  const topicSlug = "arrays";
  const problemSlug = "two-sum-ii";

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
    const uri = replSet.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);

    // Sync required unique indexes
    await LearningCommandModel.createIndexes();
    await LearningDeliveryModel.createIndexes();
    await LearningEventModel.createIndexes();
    await UserTopicProgressModel.createIndexes();
    await PracticeSessionModel.createIndexes();
    await RevisionQueueModel.createIndexes();
    await RevisionHistoryModel.createIndexes();
    await ProblemAttemptModel.createIndexes();
    await PlanTaskModel.createIndexes();
  }, 60000);

  function createPlanDoc(userId: Types.ObjectId, planId: Types.ObjectId, currentDayIndex = 1) {
    return {
      _id: planId,
      userId,
      status: "active",
      source: "onboarding",
      version: 1,
      goal: "job_ready",
      experienceLevel: "intermediate",
      language: "javascript",
      cycleNumber: 1,
      totalDays: 14,
      currentDayIndex,
      dailyMinutes: 45,
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
    };
  }

  function createPlanDayDoc(userId: Types.ObjectId, planId: Types.ObjectId, dayId: Types.ObjectId, dayIndex = 1, overrides: Record<string, any> = {}) {
    return {
      _id: dayId,
      planId,
      userId,
      dayIndex,
      dateKey: "2026-10-03",
      status: "in_progress",
      phase: "guided_practice",
      title: `Day ${dayIndex}: Two Pointers Basics`,
      focus: "Two Sum II drill",
      topicId: testTopicId,
      topicSlug,
      topicName: "Arrays & Pointers",
      targetMinutes: 45,
      actualMinutes: 0,
      ...overrides,
    };
  }

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) {
      await replSet.stop();
    }
  });

  beforeEach(async () => {
    testUserId = new Types.ObjectId();
    currentMockUserId = testUserId.toString();

    // Clear test collections
    await UserModel.deleteMany({});
    await ProblemAttemptModel.deleteMany({});
    await ReflectionLogModel.deleteMany({});
    await PracticeSessionModel.deleteMany({});
    await LearningCommandModel.deleteMany({});
    await RevisionQueueModel.deleteMany({});
    await RevisionHistoryModel.deleteMany({});
    await LearningDeliveryModel.deleteMany({});
    await LearningEventModel.deleteMany({});
    await UserTopicProgressModel.deleteMany({});
    await TopicProgressModel.deleteMany({});
    await PlanModel.deleteMany({});
    await PlanDayModel.deleteMany({});
    await PlanTaskModel.deleteMany({});
    await ProblemModel.deleteMany({});
    await TopicModel.deleteMany({});

    // Seed User
    await UserModel.create({
      _id: testUserId,
      email: "learner@dsaclub.test",
      name: "Connected Learner",
      learningEpoch: 1,
    });

    // Seed Topic & Problem
    testTopicId = new Types.ObjectId();
    await TopicModel.create({
      _id: testTopicId,
      slug: topicSlug,
      name: "Arrays & Pointers",
      description: "Fundamental array manipulation and pointer techniques",
      order: 1,
      difficulty: "beginner",
      estimatedMinutes: 120,
    });

    testProblemId = new Types.ObjectId();
    await ProblemModel.create({
      _id: testProblemId,
      slug: problemSlug,
      title: "Two Sum II - Input Array Is Sorted",
      summary: "Find two numbers in sorted array that add up to target.",
      source: "leetcode",
      sourceUrl: "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/",
      difficulty: "medium",
      topicIds: [testTopicId],
      estimatedMinutes: 20,
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO A: Independent Reported Solve
  // ══════════════════════════════════════════════════════════════════════════
  it("Scenario A: completes planned task, advances day, schedules review, and establishes independent progress", async () => {
    // 1. Create active Plan with Day 1 and a required solve_problem task
    const planId = new Types.ObjectId();
    const planDayId = new Types.ObjectId();
    const planTaskId = new Types.ObjectId();

    await PlanModel.create(createPlanDoc(testUserId, planId));

    await PlanDayModel.create(createPlanDayDoc(testUserId, planId, planDayId, 1));

    await PlanTaskModel.create({
      _id: planTaskId,
      planId,
      planDayId,
      userId: testUserId,
      dayIndex: 1,
      taskKey: "day1_task1",
      title: "Solve Two Sum II",
      phase: "practice",
      entityType: "problem",
      entityId: testProblemId,
      topicId: testTopicId,
      topicSlug,
      order: 1,
      required: true,
      estimatedMinutes: 20,
      status: "pending",
      completionRequirement: "solve_problem",
    });

    // 2. Start planned task practice session
    const sessionDto = await getOrCreatePracticeSession({
      userId: testUserId,
      problemId: testProblemId.toString(),
      sourceSurface: "plan",
      planContext: {
        planId: planId.toString(),
        planDayId: planDayId.toString(),
        planTaskId: planTaskId.toString(),
      },
    });

    expect(sessionDto.sessionId).toBeDefined();
    expect(sessionDto.activeAttemptNumber).toBe(1);

    // Refresh simulation: second call returns the same session
    const resumedSession = await getOrCreatePracticeSession({
      userId: testUserId,
      problemId: testProblemId.toString(),
      sourceSurface: "plan",
    });
    expect(resumedSession.sessionId).toBe(sessionDto.sessionId);

    // 3. Submit learner-reported independent solve
    const commandId = "cmd-scenario-a-1";
    const result = await executePracticeSubmission({
      userId: testUserId,
      commandId,
      problemId: testProblemId.toString(),
      status: "solved",
      strategy: "independent",
      durationSeconds: 720,
      durationProvenance: "measured",
      hintsUsed: 0,
      planTaskId: planTaskId.toString(),
      sessionId: sessionDto.sessionId,
    });

    expect(result.ok).toBe(true);
    expect(result.receipt).toBeDefined();
    expect(result.receipt?.planEffect.status).toBe("completed");
    expect(result.receipt?.planEffect.planTaskId).toBe(planTaskId.toString());
    expect(result.receipt?.planEffect.dayAdvanced).toBe(true);

    // 4. Verify PlanTask was marked completed with evidence
    const taskDoc = await PlanTaskModel.findById(planTaskId);
    expect(taskDoc?.status).toBe("completed");
    expect(taskDoc?.evidence?.passed).toBe(true);

    // 5. Verify Day advanced
    const completedDay = await PlanDayModel.findById(planDayId);
    expect(completedDay?.status).toBe("completed");

    const nextDay = await PlanDayModel.findOne({ planId, dayIndex: 2 });
    expect(nextDay).toBeDefined();
    expect(nextDay?.status).toBe("available");

    // 6. Verify revision queue item was automatically scheduled for tomorrow (FLOW-001)
    const queueItem = await RevisionQueueModel.findOne({
      userId: testUserId,
      entityType: "problem",
      entityId: testProblemId,
    });
    expect(queueItem).toBeDefined();
    expect(queueItem?.state).toBe("scheduled");
    expect(queueItem?.intervalDays).toBe(1);

    // 7. Process deliveries to update topic progress projection
    await processDeliveryBatch({ workerId: "worker-1" });

    // 8. Shared Progress read contract confirms independent solve
    const progress = await getSharedLearnerTopicProgress(testUserId, topicSlug);
    expect(progress.coverage.completedCount).toBe(1);
    expect(progress.coverage.independentSolveCount).toBe(1);
    expect(progress.evidence.hasIndependentSolve).toBe(true);
    expect(progress.evidence.hasAssistedSolve).toBe(false);
    expect(progress.retention.status).toBe("scheduled");
    expect(progress.transfer.status).toBe("unassessed");
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO B: Assisted Solve
  // ══════════════════════════════════════════════════════════════════════════
  it("Scenario B: records hints honestly, rejects solve_independently requirement, and schedules retrieval", async () => {
    const planId = new Types.ObjectId();
    const planDayId = new Types.ObjectId();
    const planTaskId = new Types.ObjectId();

    // Scenario B
    await PlanModel.create(createPlanDoc(testUserId, planId));

    await PlanDayModel.create(createPlanDayDoc(testUserId, planId, planDayId, 1));

    // Task strictly requires solve_independently!
    await PlanTaskModel.create({
      _id: planTaskId,
      planId,
      planDayId,
      userId: testUserId,
      dayIndex: 1,
      taskKey: "day1_task_independent",
      title: "Solve Two Sum II Independently",
      phase: "practice",
      entityType: "problem",
      entityId: testProblemId,
      topicId: testTopicId,
      topicSlug,
      order: 1,
      required: true,
      estimatedMinutes: 20,
      status: "pending",
      completionRequirement: "solve_independently",
    });

    // 1. Start session
    const session = await getOrCreatePracticeSession({
      userId: testUserId,
      problemId: testProblemId.toString(),
      sourceSurface: "plan",
      planContext: { planTaskId: planTaskId.toString() },
    });

    // 2. Reveal hint 1
    await recordAttemptHintReveal(testUserId, testProblemId.toString(), 1);

    // 3. User submits solve claiming independent solve
    const result = await executePracticeSubmission({
      userId: testUserId,
      commandId: "cmd-scenario-b-1",
      problemId: testProblemId.toString(),
      status: "solved",
      strategy: "independent", // Client tries to claim independent
      hintsUsed: 0,            // Client omits hint
      durationSeconds: 600,
      planTaskId: planTaskId.toString(),
      sessionId: session.sessionId,
    });

    expect(result.ok).toBe(true);
    // Server merged persisted hint: effective strategy became hint_assisted
    expect(result.receipt?.assistanceSummary.hintsUsed).toBe(1);
    expect(result.receipt?.assistanceSummary.strategy).toBe("hint_assisted");

    // Task required solve_independently, so it did NOT qualify to complete
    expect(result.receipt?.planEffect.status).toBe("not_applicable");

    const taskDoc = await PlanTaskModel.findById(planTaskId);
    expect(taskDoc?.status).toBe("in_progress");

    // Shared progress reports assisted solve, 0 independent solves
    await processDeliveryBatch({ workerId: "worker-1" });
    const progress = await getSharedLearnerTopicProgress(testUserId, topicSlug);
    expect(progress.coverage.completedCount).toBe(1);
    expect(progress.coverage.independentSolveCount).toBe(0);
    expect(progress.coverage.assistedSolveCount).toBe(1);
    expect(progress.evidence.hasIndependentSolve).toBe(false);
    expect(progress.evidence.hasAssistedSolve).toBe(true);
    expect(progress.summary.text).toContain("Solved with guidance");
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO C: Substantive Unsuccessful Practice
  // ══════════════════════════════════════════════════════════════════════════
  it("Scenario C: saves substantive attempt and satisfies engage_practice_attempt without claiming solve", async () => {
    const planId = new Types.ObjectId();
    const planDayId = new Types.ObjectId();
    const planTaskId = new Types.ObjectId();

    await PlanModel.create(createPlanDoc(testUserId, planId));

    await PlanDayModel.create(createPlanDayDoc(testUserId, planId, planDayId, 1));

    // Task requirement is engage_practice_attempt
    await PlanTaskModel.create({
      _id: planTaskId,
      planId,
      planDayId,
      userId: testUserId,
      dayIndex: 1,
      taskKey: "day1_attempt_drill",
      title: "Attempt Two Sum II",
      phase: "practice",
      entityType: "problem",
      entityId: testProblemId,
      topicId: testTopicId,
      topicSlug,
      order: 1,
      required: true,
      estimatedMinutes: 20,
      status: "pending",
      completionRequirement: "engage_practice_attempt",
    });

    const result = await executePracticeSubmission({
      userId: testUserId,
      commandId: "cmd-scenario-c-1",
      problemId: testProblemId.toString(),
      status: "started", // Failed/unsolved attempt
      strategy: "independent",
      durationSeconds: 900,
      durationProvenance: "measured",
      hintsUsed: 0,
      planTaskId: planTaskId.toString(),
    });

    expect(result.ok).toBe(true);
    expect(result.receipt?.outcome).toBe("started");
    // Satisfied engage_practice_attempt
    expect(result.receipt?.planEffect.status).toBe("completed");

    const taskDoc = await PlanTaskModel.findById(planTaskId);
    expect(taskDoc?.status).toBe("completed");

    // Progress shows attempt recorded but 0 solves
    await processDeliveryBatch({ workerId: "worker-1" });
    const progress = await getSharedLearnerTopicProgress(testUserId, topicSlug);
    expect(progress.coverage.attemptedCount).toBe(1);
    expect(progress.coverage.completedCount).toBe(0);
    expect(progress.summary.text).toContain("no verified or reported solves yet");
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO D: Delayed Review with Grade Zero (Blackout Recall)
  // ══════════════════════════════════════════════════════════════════════════
  it("Scenario D: preserves grade zero without coercion, resets interval to 1 day, and marks repair needed", async () => {
    const queueId = new Types.ObjectId();
    await RevisionQueueModel.create({
      _id: queueId,
      userId: testUserId,
      entityType: "problem",
      entityId: testProblemId,
      intervalDays: 14,
      easeFactor: 2.5,
      repetitions: 3,
      lapses: 0,
      source: "attempt",
      state: "due",
      dueAt: new Date(Date.now() - 3600000), // Overdue
    });

    // Submit review with grade 0
    const result = await executeReviewSubmission({
      userId: testUserId,
      commandId: "cmd-scenario-d-1",
      queueId: queueId.toString(),
      grade: 0,
      confidence: 1,
      responseSeconds: 45,
      recallText: "I completely forgot the two pointer convergence invariant.",
    });

    expect(result.ok).toBe(true);
    expect(result.receipt?.outcome).toBe("grade_0");

    // Queue interval reset to 1 day, lapses incremented
    const queueDoc = await RevisionQueueModel.findById(queueId);
    expect(queueDoc?.repetitions).toBe(0);
    expect(queueDoc?.lapses).toBe(1);
    expect(queueDoc?.intervalDays).toBe(1);
    expect(queueDoc?.priority).toBe(95); // High priority repair

    // History record created with grade 0
    const historyDoc = await RevisionHistoryModel.findOne({ queueId });
    expect(historyDoc?.grade).toBe(0);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO E: Response Loss and Retry
  // ══════════════════════════════════════════════════════════════════════════
  it("Scenario E: re-submitting with the same commandId returns the original receipt without duplicating writes", async () => {
    const commandId = "cmd-scenario-e-loss";
    const payload = {
      userId: testUserId,
      commandId,
      problemId: testProblemId.toString(),
      status: "solved" as const,
      strategy: "independent" as const,
      durationSeconds: 480,
      hintsUsed: 0,
    };

    // First attempt
    const res1 = await executePracticeSubmission(payload);
    expect(res1.ok).toBe(true);
    expect(res1.isDuplicate).toBe(false);

    // Second attempt (simulating response loss and retry)
    const res2 = await executePracticeSubmission(payload);
    expect(res2.ok).toBe(true);
    expect(res2.isDuplicate).toBe(true);
    expect(res2.receipt?.attemptId).toBe(res1.receipt?.attemptId);

    // Verify only 1 ProblemAttempt exists
    const attempts = await ProblemAttemptModel.find({ userId: testUserId });
    expect(attempts).toHaveLength(1);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO F: Two Tabs (Finalized Session Protection)
  // ══════════════════════════════════════════════════════════════════════════
  it("Scenario F: prevents a stale second tab from finalizing an already completed session", async () => {
    const session = await getOrCreatePracticeSession({
      userId: testUserId,
      problemId: testProblemId.toString(),
    });

    // Tab 1 submits and completes the session
    const tab1Result = await executePracticeSubmission({
      userId: testUserId,
      commandId: "cmd-tab-1",
      sessionId: session.sessionId,
      problemId: testProblemId.toString(),
      status: "solved",
      strategy: "independent",
      durationSeconds: 500,
    });
    expect(tab1Result.ok).toBe(true);

    // Tab 2 submits with a different commandId on the same finalized session
    const tab2Result = await executePracticeSubmission({
      userId: testUserId,
      commandId: "cmd-tab-2",
      sessionId: session.sessionId,
      problemId: testProblemId.toString(),
      status: "solved",
      strategy: "hint_assisted",
      durationSeconds: 600,
    });

    expect(tab2Result.ok).toBe(false);
    expect(tab2Result.conflict).toBe(true);
    expect(tab2Result.status).toBe(409);
    expect(tab2Result.error).toContain("SESSION_ALREADY_COMPLETED");

    // Only Tab 1's attempt was created
    const attempts = await ProblemAttemptModel.find({ userId: testUserId });
    expect(attempts).toHaveLength(1);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO G: Downstream Deliveries & Dynamic Synchronization
  // ══════════════════════════════════════════════════════════════════════════
  it("Scenario G: transitions downstream status from pending to synchronized upon worker batch execution", async () => {
    const commandId = "cmd-scenario-g-outbox";
    const res = await executePracticeSubmission({
      userId: testUserId,
      commandId,
      problemId: testProblemId.toString(),
      status: "solved",
      strategy: "independent",
      durationSeconds: 400,
    });
    expect(res.ok).toBe(true);
    expect(res.receipt?.downstreamStatus).toBe("pending");

    // Process all pending deliveries
    const batchResult = await processDeliveryBatch({ workerId: "test-worker" });
    expect(batchResult.succeeded).toBeGreaterThan(0);

    // Dynamic getCommandReceipt returns synchronized
    const receiptRes = await getCommandReceipt(testUserId, commandId);
    expect(receiptRes.ok).toBe(true);
    expect(receiptRes.receipt?.downstreamStatus).toBe("synchronized");
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO H: Epoch Reset Isolation
  // ══════════════════════════════════════════════════════════════════════════
  it("Scenario H: fences past epoch commands and prevents old work from polluting new epoch", async () => {
    // Commit attempt in Epoch 1
    const res1 = await executePracticeSubmission({
      userId: testUserId,
      commandId: "cmd-epoch-1",
      problemId: testProblemId.toString(),
      status: "solved",
      strategy: "independent",
      durationSeconds: 300,
    });
    expect(res1.ok).toBe(true);
    expect(res1.receipt?.learningEpoch).toBe(1);

    // Reset user to Epoch 2
    await UserModel.updateOne({ _id: testUserId }, { $inc: { learningEpoch: 1 } });

    // In Epoch 2, getSharedLearnerTopicProgress sees empty fresh start
    const epoch2Progress = await getSharedLearnerTopicProgress(testUserId, topicSlug);
    expect(epoch2Progress.learningEpoch).toBe(2);
    expect(epoch2Progress.coverage.attemptedCount).toBe(0);
    expect(epoch2Progress.coverage.completedCount).toBe(0);

    // Replay of old commandId in new epoch is treated as a clean new command
    const res2 = await executePracticeSubmission({
      userId: testUserId,
      commandId: "cmd-epoch-2",
      problemId: testProblemId.toString(),
      status: "solved",
      strategy: "independent",
      durationSeconds: 300,
    });
    expect(res2.ok).toBe(true);
    expect(res2.receipt?.learningEpoch).toBe(2);
  });
});

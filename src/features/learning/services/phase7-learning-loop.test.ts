import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";

// Identity & Learning Models
import { UserModel, UserProfileModel } from "@/features/identity/models/user.model";
import {
  ProblemAttemptModel,
  ReflectionLogModel,
  PracticeSessionModel,
  LearningCommandModel,
  TopicProgressModel,
} from "@/features/learning/models/learning.model";
import {
  RevisionQueueModel,
  RevisionHistoryModel,
  LearningDeliveryModel,
  UserStatisticsModel,
  NotificationModel,
} from "@/features/intelligence/models/intelligence.model";
import { LearningEventModel } from "@/features/intelligence/models/learning-event.model";
import { UserTopicProgressModel } from "@/features/intelligence/models/user-topic-progress.model";
import { PlanModel } from "@/features/intelligence/models/plan.model";
import { PlanDayModel } from "@/features/intelligence/models/plan-day.model";
import { PlanTaskModel } from "@/features/intelligence/models/plan-task.model";
import { ProblemModel, TopicModel } from "@/features/content/models/content.model";

// Services to test
import {
  executePracticeSubmission,
  executeReviewSubmission,
} from "./learning-command.service";
import {
  getSharedLearnerGlobalProgress,
  getSharedLearnerTopicProgress,
} from "@/features/progress/services/shared-progress.service";
import {
  getProductSnapshot,
  getNotifications,
} from "@/features/product/services/product.service";
import { completePlanTaskAction } from "@/features/intelligence/actions/plan-actions";
import { buildCandidateSet } from "@/features/intelligence/decisions/task-candidate-builder";
import { resolveAuthoritativeLearningAction } from "@/features/intelligence/decisions/decision-selector";

// Mock next/cache and auth-guard
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

describe("Phase 7 — Reconcile the Existing Learning Loop Suite", () => {
  let testUserId: Types.ObjectId;
  let testTopicId: Types.ObjectId;
  let testProblemId: Types.ObjectId;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);

    // Deploy indexes
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
    await LearningCommandModel.deleteMany({});
    await PracticeSessionModel.deleteMany({});
    await ProblemAttemptModel.deleteMany({});
    await ReflectionLogModel.deleteMany({});
    await RevisionHistoryModel.deleteMany({});
    await RevisionQueueModel.deleteMany({});
    await LearningDeliveryModel.deleteMany({});
    await LearningEventModel.deleteMany({});
    await UserTopicProgressModel.deleteMany({});
    await TopicProgressModel.deleteMany({});
    await UserStatisticsModel.deleteMany({});
    await NotificationModel.deleteMany({});
    await UserModel.deleteMany({});
    await UserProfileModel.deleteMany({});
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
      email: `learner_${Date.now()}@example.com`,
      name: "Loop Learner",
    });

    await UserProfileModel.create({
      userId: testUserId,
      learningEpoch: 1,
      onboarding: { status: "completed" },
    });

    await TopicModel.create({
      _id: testTopicId,
      name: "Dynamic Programming",
      slug: "dynamic-programming",
      description: "DP algorithms and memoization",
      difficulty: "medium",
      order: 1,
      estimatedMinutes: 60,
    });

    await ProblemModel.create({
      _id: testProblemId,
      title: "Climbing Stairs",
      slug: "climbing-stairs",
      summary: "Climbing stairs problem",
      topicIds: [testTopicId],
      difficulty: "easy",
      estimatedMinutes: 20,
      source: "internal",
      sourceUrl: "/problems/climbing-stairs",
      patternIds: [],
      hints: [],
      status: "published",
      isPublished: true,
    });
  });

  async function createTestTopic(overrides: Partial<any> = {}) {
    const id = overrides._id || new Types.ObjectId();
    const slug = overrides.slug || `topic-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    return await TopicModel.create({
      _id: id,
      name: overrides.name || "Test Topic",
      slug,
      description: overrides.description || "Test topic description",
      difficulty: overrides.difficulty || "medium",
      order: overrides.order || 1,
      estimatedMinutes: overrides.estimatedMinutes || 30,
      isPublished: overrides.isPublished ?? true,
      ...overrides,
    });
  }

  async function createTestProblem(overrides: Partial<any> = {}) {
    const id = overrides._id || new Types.ObjectId();
    const slug = overrides.slug || `prob-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    return await ProblemModel.create({
      _id: id,
      title: overrides.title || "Test Problem",
      slug,
      summary: overrides.summary || "Test problem summary",
      topicIds: overrides.topicIds || [testTopicId],
      patternIds: overrides.patternIds || [],
      difficulty: overrides.difficulty || "medium",
      estimatedMinutes: overrides.estimatedMinutes || 20,
      source: overrides.source || "internal",
      sourceUrl: overrides.sourceUrl || `/problems/${slug}`,
      hints: overrides.hints || [],
      status: overrides.status || "published",
      isPublished: overrides.isPublished ?? true,
      ...overrides,
    });
  }

  async function createTestPlan(overrides: Partial<any> = {}) {
    const id = overrides._id || new Types.ObjectId();
    return await PlanModel.create({
      _id: id,
      userId: testUserId,
      status: overrides.status || "active",
      source: overrides.source || "onboarding",
      version: overrides.version || 1,
      goal: overrides.goal || "interview_prep",
      experienceLevel: overrides.experienceLevel || "intermediate",
      language: overrides.language || "javascript",
      totalDays: overrides.totalDays || 14,
      dailyMinutes: overrides.dailyMinutes || 45,
      timezone: overrides.timezone || "Asia/Kolkata",
      startDate: overrides.startDate || new Date(),
      targetCompletionDate: overrides.targetCompletionDate || new Date(Date.now() + 14 * 86400000),
      snapshots: {
        plannerVersion: "1.0.0",
        curriculumVersion: "2026.1",
        inputSnapshot: { dailyMinutes: 45, totalDays: 14 },
        availabilitySnapshot: { status: "ready", availableMissionsCount: 1, availableProblemsCount: 2 },
        estimatedScheduleSnapshot: [],
      },
      ...overrides,
    });
  }

  async function createTestPlanDay(overrides: Partial<any> = {}) {
    const id = overrides._id || new Types.ObjectId();
    return await PlanDayModel.create({
      _id: id,
      planId: overrides.planId,
      userId: testUserId,
      dayIndex: overrides.dayIndex || 1,
      dateKey: overrides.dateKey || new Date().toISOString().slice(0, 10),
      status: overrides.status || "in_progress",
      phase: overrides.phase || "guided_practice",
      title: overrides.title || "Day 1 Practice",
      focus: overrides.focus || "Problem solving fundamentals",
      topicId: overrides.topicId || testTopicId,
      topicSlug: overrides.topicSlug || "dynamic-programming",
      topicName: overrides.topicName || "Dynamic Programming",
      targetMinutes: overrides.targetMinutes || 45,
      actualMinutes: overrides.actualMinutes || 0,
      isBufferDay: false,
      isCheckpointDay: false,
      ...overrides,
    });
  }

  async function createTestAttempt(overrides: Partial<any> = {}) {
    return await ProblemAttemptModel.create({
      userId: testUserId,
      learningEpoch: 1,
      problemId: testProblemId,
      status: "solved",
      strategy: "independent",
      durationSeconds: 120,
      selfConfidence: 3,
      perceivedDifficulty: 3,
      startedAt: new Date(),
      ...overrides,
    });
  }

  // =========================================================================
  // 1. FLOW-001: Practice-to-Review Propagation
  // =========================================================================
  describe("1. FLOW-001: Practice-to-Review Propagation", () => {
    it("automatically creates a revision queue item with initial 1-day interval on independent solve", async () => {
      const result = await executePracticeSubmission({
        userId: testUserId,
        commandId: "cmd_flow_01",
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 180,
      });

      expect(result.ok).toBe(true);
      expect(result.receipt).toBeDefined();
      expect(result.receipt?.reviewEffect).toBeDefined();
      expect(result.receipt?.reviewEffect?.nextIntervalDays).toBe(1);
      expect(result.receipt?.reviewEffect?.queueId).toBeDefined();

      // Verify RevisionQueue document in DB
      const queueDoc = await RevisionQueueModel.findOne({
        userId: testUserId,
        entityType: "problem",
        entityId: testProblemId,
      });

      expect(queueDoc).not.toBeNull();
      expect(queueDoc?.state).toBe("scheduled");
      expect(queueDoc?.intervalDays).toBe(1);
      expect(queueDoc?.easeFactor).toBe(2.3);
      expect(queueDoc?.priority).toBe(50);
      expect(queueDoc?.source).toBe("attempt");
    });

    it("schedules review with higher priority (70) and conservative easeFactor on assisted solve", async () => {
      const result = await executePracticeSubmission({
        userId: testUserId,
        commandId: "cmd_flow_assisted_01",
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "hint_assisted",
        hintsUsed: 2,
        durationSeconds: 300,
      });

      expect(result.ok).toBe(true);
      expect(result.receipt?.reviewEffect).toBeDefined();

      const queueDoc = await RevisionQueueModel.findOne({
        userId: testUserId,
        entityType: "problem",
        entityId: testProblemId,
      });

      expect(queueDoc).not.toBeNull();
      expect(queueDoc?.priority).toBe(70);
      expect(queueDoc?.easeFactor).toBe(2.1);
    });

    it("schedules retrieval practice on substantive failed attempt but not on abandoned/opened-only session", async () => {
      // 1. Abandoned with 0 duration: NOT scheduled
      const openResult = await executePracticeSubmission({
        userId: testUserId,
        commandId: "cmd_abandoned_01",
        problemId: testProblemId.toString(),
        status: "abandoned",
        strategy: "independent",
        durationSeconds: 0,
      });

      expect(openResult.ok).toBe(true);
      expect(openResult.receipt?.reviewEffect).toBeUndefined();

      let queueDoc = await RevisionQueueModel.findOne({
        userId: testUserId,
        entityId: testProblemId,
      });
      expect(queueDoc).toBeNull();

      // 2. Substantive attempt (started + duration >= 45s): Scheduled for retrieval
      const attemptResult = await executePracticeSubmission({
        userId: testUserId,
        commandId: "cmd_substantive_01",
        problemId: testProblemId.toString(),
        status: "started",
        strategy: "independent",
        durationSeconds: 90,
        reflection: "Got stuck on base case recurrence.",
      });

      expect(attemptResult.ok).toBe(true);
      expect(attemptResult.receipt?.reviewEffect).toBeDefined();

      queueDoc = await RevisionQueueModel.findOne({
        userId: testUserId,
        entityId: testProblemId,
      });
      expect(queueDoc).not.toBeNull();
      expect(queueDoc?.priority).toBe(75);
    });

    it("does NOT postpone an existing overdue review when learner practices the problem again", async () => {
      // Create an overdue queue item
      const pastDue = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      await RevisionQueueModel.create({
        userId: testUserId,
        entityType: "problem",
        entityId: testProblemId,
        state: "due",
        dueAt: pastDue,
        intervalDays: 3,
        easeFactor: 2.2,
        repetitions: 2,
        lapses: 0,
        priority: 60,
        source: "attempt",
        version: 1,
      });

      // Submit another practice solve today
      const result = await executePracticeSubmission({
        userId: testUserId,
        commandId: "cmd_practice_overdue_recheck",
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 150,
      });

      expect(result.ok).toBe(true);

      const queueDoc = await RevisionQueueModel.findOne({
        userId: testUserId,
        entityId: testProblemId,
      });

      // INVARIANT: Overdue work is NOT pushed back!
      expect(queueDoc?.state).toBe("due");
      expect(new Date(queueDoc!.dueAt).getTime()).toBeLessThanOrEqual(Date.now());
      expect(queueDoc?.repetitions).toBe(2); // Preserves repetitions
    });
  });

  // =========================================================================
  // 2. Review-to-Progress & Retention Propagation
  // =========================================================================
  describe("2. Review-to-Progress & Retention Propagation", () => {
    it("completing a review updates retention honestly without inflating distinct solved problems count", async () => {
      // 1. Solve problem initially
      await executePracticeSubmission({
        userId: testUserId,
        commandId: "cmd_first_solve_01",
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 180,
      });

      const queueDoc = await RevisionQueueModel.findOne({
        userId: testUserId,
        entityId: testProblemId,
      });
      expect(queueDoc).not.toBeNull();

      // Verify distinct solved count is 1
      let progress = await getSharedLearnerGlobalProgress(testUserId);
      expect(progress.distinctSolvedProblems).toBe(1);

      // 2. Complete review with grade 4 (successful recall)
      const reviewResult = await executeReviewSubmission({
        userId: testUserId,
        commandId: "cmd_review_submit_01",
        queueId: String(queueDoc!._id),
        grade: 4,
        confidence: 4,
        responseSeconds: 45,
      });

      expect(reviewResult.ok).toBe(true);
      expect(reviewResult.receipt?.reviewEffect?.nextIntervalDays).toBeGreaterThanOrEqual(1);

      // Verify ReviewHistory was created
      const historyCount = await RevisionHistoryModel.countDocuments({
        userId: testUserId,
      });
      expect(historyCount).toBe(1);

      // INVARIANT: Review completion must NOT inflate distinct solved problems count!
      progress = await getSharedLearnerGlobalProgress(testUserId);
      expect(progress.distinctSolvedProblems).toBe(1);
    });

    it("review grade 0 updates schedule to lapse and preserves grade 0 throughout receipt", async () => {
      const queue = await RevisionQueueModel.create({
        userId: testUserId,
        entityType: "problem",
        entityId: testProblemId,
        state: "due",
        dueAt: new Date(Date.now() - 3600000),
        intervalDays: 4,
        easeFactor: 2.3,
        repetitions: 2,
        lapses: 0,
        priority: 50,
        source: "attempt",
        version: 1,
      });

      const result = await executeReviewSubmission({
        userId: testUserId,
        commandId: "cmd_review_grade_zero",
        queueId: String(queue._id),
        grade: 0,
        confidence: 1,
        responseSeconds: 30,
      });

      expect(result.ok).toBe(true);
      expect(result.receipt?.reviewEffect?.grade).toBe(0);
      expect(result.receipt?.reviewEffect?.nextIntervalDays).toBe(1);

      const history = await RevisionHistoryModel.findOne({
        userId: testUserId,
        commandId: "cmd_review_grade_zero",
      });
      expect(history?.grade).toBe(0);

      const updatedQueue = await RevisionQueueModel.findById(queue._id);
      expect(updatedQueue?.intervalDays).toBe(1);
      expect(updatedQueue?.lapses).toBe(1);
    });
  });

  // =========================================================================
  // 3. PROG-001 & DASH-001: Shared State & Truthful Dashboard Counts
  // =========================================================================
  describe("3. PROG-001 & DASH-001: Shared State & Truthful Dashboard Counts", () => {
    it("shared global progress returns truthful distinct solved problems matching source attempts", async () => {
      // Create 3 distinct problems
      const prob2 = await createTestProblem({
        title: "Coin Change",
        slug: "coin-change",
        topicIds: [testTopicId],
        difficulty: "medium",
        estimatedMinutes: 30,
      });
      const prob3 = await createTestProblem({
        title: "Word Break",
        slug: "word-break",
        topicIds: [testTopicId],
        difficulty: "medium",
        estimatedMinutes: 30,
      });

      // Solve prob1 twice (repeat practice), solve prob2 once, attempt prob3 without solve
      await executePracticeSubmission({
        userId: testUserId,
        commandId: "cmd_p1_att1",
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 120,
      });
      await executePracticeSubmission({
        userId: testUserId,
        commandId: "cmd_p1_att2",
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 100,
      });
      await executePracticeSubmission({
        userId: testUserId,
        commandId: "cmd_p2_att1",
        problemId: prob2._id.toString(),
        status: "solved",
        strategy: "hint_assisted",
        hintsUsed: 1,
        durationSeconds: 240,
      });
      await executePracticeSubmission({
        userId: testUserId,
        commandId: "cmd_p3_att1",
        problemId: prob3._id.toString(),
        status: "started",
        strategy: "independent",
        durationSeconds: 90,
      });

      const globalProgress = await getSharedLearnerGlobalProgress(testUserId);

      // INVARIANT CHECKS:
      // Distinct solved = 2 (prob1, prob2)
      expect(globalProgress.distinctSolvedProblems).toBe(2);
      // Total solve attempts = 3
      expect(globalProgress.totalSolveAttempts).toBe(3);
      // Distinct attempted = 3 (prob1, prob2, prob3)
      expect(globalProgress.distinctAttemptedProblems).toBe(3);
      // Total attempts = 4
      expect(globalProgress.totalAttempts).toBe(4);
      // Independent solves = 2 (the two solves on prob1)
      expect(globalProgress.independentSolves).toBe(2);
      // Assisted solves = 1 (prob2)
      expect(globalProgress.assistedSolves).toBe(1);
    });

    it("default-zero UserStatistics does NOT hide saved solve; getProductSnapshot returns truthful count", async () => {
      // Solve a problem
      await executePracticeSubmission({
        userId: testUserId,
        commandId: "cmd_p1_truthful_snapshot",
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 120,
      });

      // Force UserStatistics to have solvedProblems: 0
      await UserStatisticsModel.findOneAndUpdate(
        { userId: testUserId },
        { $set: { solvedProblems: 0, attemptedProblems: 0 } },
        { upsert: true }
      );

      const snapshot = await getProductSnapshot(testUserId.toString());

      // Dashboard stats MUST reflect the true count from shared progress, NOT the stale 0!
      expect(snapshot.stats.solvedProblems).toBe(1);
      expect(snapshot.stats.problemsSolved).toBe(1);
      expect(snapshot.stats.attemptedProblems).toBe(1);
    });

    it("multi-topic problem does NOT inflate global distinct solved count", async () => {
      const topic2 = await createTestTopic({
        name: "Arrays",
        slug: "arrays",
      });

      // Problem belonging to 2 topics
      const multiTopicProblem = await createTestProblem({
        title: "Maximum Subarray",
        slug: "maximum-subarray",
        topicIds: [testTopicId, topic2._id],
        difficulty: "easy",
      });

      await executePracticeSubmission({
        userId: testUserId,
        commandId: "cmd_multi_topic_solve",
        problemId: multiTopicProblem._id.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 180,
      });

      const globalProgress = await getSharedLearnerGlobalProgress(testUserId);
      expect(globalProgress.distinctSolvedProblems).toBe(1);
    });

    it("getNotifications does NOT inject fabricated sliding window or 80% readiness milestones", async () => {
      const notifications = await getNotifications(testUserId.toString());

      // Verify no fake revision or milestone notifications exist
      const titles = notifications.map((n: any) => n.title);
      expect(titles).not.toContain("Sliding Window ready for revision");
      expect(titles).not.toContain("Interview Readiness reached 80%");
      expect(titles).not.toContain("Two Pointers retention drill");

      // Only a single welcome notification is permitted
      expect(notifications.length).toBeLessThanOrEqual(1);
      if (notifications.length === 1) {
        expect(notifications[0].title).toBe("Welcome to DSA Club");
      }
    });
  });

  // =========================================================================
  // 4. READY-001: Evidence-Qualified Readiness
  // =========================================================================
  describe("4. READY-001: Evidence-Qualified Readiness", () => {
    it("reports 0 readiness for unassessed learner with 0 solved problems", async () => {
      const progress = await getSharedLearnerGlobalProgress(testUserId);

      expect(progress.distinctSolvedProblems).toBe(0);
      expect(progress.interviewReadinessScore).toBe(0);
      expect(progress.evidenceSufficiency).toBe("unassessed");
    });

    it("caps readiness at 35 (limited) when learner has solved fewer than 3 problems", async () => {
      await executePracticeSubmission({
        userId: testUserId,
        commandId: "cmd_few_solves_01",
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 180,
      });

      const progress = await getSharedLearnerGlobalProgress(testUserId);

      expect(progress.distinctSolvedProblems).toBe(1);
      expect(progress.interviewReadinessScore).toBeLessThanOrEqual(35);
      expect(progress.evidenceSufficiency).toBe("limited");
    });

    it("caps readiness at 55 (building) when solves are predominantly assisted", async () => {
      // Create and solve 3 problems, all with hints
      for (let i = 1; i <= 3; i++) {
        const prob = await createTestProblem({
          title: `DP Problem ${i}`,
          slug: `dp-problem-${i}`,
          topicIds: [testTopicId],
        });
        await executePracticeSubmission({
          userId: testUserId,
          commandId: `cmd_assisted_${i}`,
          problemId: prob._id.toString(),
          status: "solved",
          strategy: "hint_assisted",
          hintsUsed: 2,
          durationSeconds: 200,
        });
      }

      const progress = await getSharedLearnerGlobalProgress(testUserId);

      expect(progress.distinctSolvedProblems).toBe(3);
      expect(progress.independentSolves).toBe(0);
      expect(progress.interviewReadinessScore).toBeLessThanOrEqual(55);
      expect(progress.evidenceSufficiency).toBe("building");
    });
  });

  // =========================================================================
  // 5. PLAN-002: Plan Completion Semantics
  // =========================================================================
  describe("5. PLAN-002: Plan Completion Semantics", () => {
    it("completePlanTaskAction rejects completing a solve_problem task if no attempt exists or attempt failed", async () => {
      const plan = await createTestPlan();
      const day = await createTestPlanDay({ planId: plan._id });
      const task = await PlanTaskModel.create({
        planId: plan._id,
        planDayId: day._id,
        userId: testUserId,
        dayIndex: 1,
        order: 1,
        taskKey: "task_solve_req",
        phase: "practice",
        title: "Solve Climbing Stairs",
        entityType: "problem",
        entityId: testProblemId,
        completionRequirement: "solve_problem",
        planRelation: "planned_today",
        required: true,
        status: "pending",
        estimatedMinutes: 20,
        actualMinutes: 0,
      });

      // Try to complete without evidence or qualifying attempt
      const result = await completePlanTaskAction(task._id.toString(), {
        passed: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("TASK_REQUIREMENT_UNMET");

      // Verify task in DB is still pending
      const taskDoc = await PlanTaskModel.findById(task._id);
      expect(taskDoc?.status).toBe("pending");
    });

    it("completePlanTaskAction rejects completing a solve_independently task if attempt was assisted", async () => {
      const plan = await createTestPlan();
      const day = await createTestPlanDay({ planId: plan._id });
      const task = await PlanTaskModel.create({
        planId: plan._id,
        planDayId: day._id,
        userId: testUserId,
        dayIndex: 1,
        order: 1,
        taskKey: "task_indep_req",
        phase: "practice",
        title: "Solve Climbing Stairs Independently",
        entityType: "problem",
        entityId: testProblemId,
        completionRequirement: "solve_independently",
        planRelation: "planned_today",
        required: true,
        status: "pending",
        estimatedMinutes: 20,
        actualMinutes: 0,
      });

      // Create an assisted attempt in DB
      const attempt = await createTestAttempt({
        status: "solved",
        strategy: "hint_assisted",
        hintsUsed: 2,
        durationSeconds: 180,
      });

      const result = await completePlanTaskAction(task._id.toString(), {
        problemAttemptId: attempt._id.toString(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("TASK_REQUIREMENT_UNMET");

      const taskDoc = await PlanTaskModel.findById(task._id);
      expect(taskDoc?.status).toBe("pending");
    });

    it("completePlanTaskAction succeeds when qualifying independent solve attempt exists", async () => {
      const plan = await createTestPlan();
      const day = await createTestPlanDay({ planId: plan._id });
      const task = await PlanTaskModel.create({
        planId: plan._id,
        planDayId: day._id,
        userId: testUserId,
        dayIndex: 1,
        order: 1,
        taskKey: "task_indep_valid",
        phase: "practice",
        title: "Solve Climbing Stairs Independently",
        entityType: "problem",
        entityId: testProblemId,
        completionRequirement: "solve_independently",
        planRelation: "planned_today",
        required: true,
        status: "pending",
        estimatedMinutes: 20,
        actualMinutes: 0,
      });

      // Create valid independent attempt
      const attempt = await createTestAttempt({
        status: "solved",
        strategy: "independent",
        hintsUsed: 0,
        durationSeconds: 150,
      });

      const result = await completePlanTaskAction(task._id.toString(), {
        problemAttemptId: attempt._id.toString(),
      });

      expect(result.success).toBe(true);

      const taskDoc = await PlanTaskModel.findById(task._id);
      expect(taskDoc?.status).toBe("completed");
    });
  });

  // =========================================================================
  // 6. DEC-001: Next-Action Authority & Context Preservation
  // =========================================================================
  describe("6. DEC-001: Next-Action Authority & Context Preservation", () => {
    it("buildTaskCandidates constructs revision candidate targetUrl pointing to /revision/session/[id]", async () => {
      const queue = await RevisionQueueModel.create({
        userId: testUserId,
        entityType: "problem",
        entityId: testProblemId,
        state: "due",
        dueAt: new Date(Date.now() - 3600000),
        intervalDays: 1,
        easeFactor: 2.3,
        repetitions: 0,
        lapses: 0,
        priority: 80,
        source: "attempt",
        version: 1,
      });

      const { candidates } = await buildCandidateSet(testUserId, {
        availableMinutes: 30,
      });

      const reviewCandidate = candidates.find((c) => c.actionType === "revision");
      expect(reviewCandidate).toBeDefined();
      // INVARIANT: DEC-001 targetUrl points directly to session route
      expect(reviewCandidate?.targetUrl).toBe(`/revision/session/${queue._id}`);
    });

    it("resolveAuthoritativeLearningAction unifies primary action and preserves target destination", async () => {
      const queue = await RevisionQueueModel.create({
        userId: testUserId,
        entityType: "problem",
        entityId: testProblemId,
        state: "due",
        dueAt: new Date(Date.now() - 3600000),
        intervalDays: 1,
        easeFactor: 2.3,
        repetitions: 0,
        lapses: 0,
        priority: 85,
        source: "attempt",
        version: 1,
      });

      const selection = await resolveAuthoritativeLearningAction({
        userId: testUserId,
        mode: "self_paced",
        dueRevisions: [
          {
            _id: queue._id,
            entityType: "problem",
            entityId: testProblemId,
            dueAt: queue.dueAt,
            priority: 85,
            state: "due",
          },
        ],
      });

      expect(selection.primaryAction).toBeDefined();
      expect(selection.primaryAction.type).toBe("revision");
      expect(selection.primaryAction.href).toBe(`/revision/session/${queue._id}`);
    });
  });
});

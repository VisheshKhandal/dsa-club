import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";

// Identity & Content Models
import { UserModel, UserProfileModel } from "@/features/identity/models/user.model";
import { TopicModel, ProblemModel } from "@/features/content/models/content.model";

// Learning & Intelligence Models
import {
  PracticeSessionModel,
  ProblemAttemptModel,
  LearningCommandModel,
  TopicProgressModel,
} from "@/features/learning/models/learning.model";
import {
  RevisionQueueModel,
  RevisionHistoryModel,
  LearningDeliveryModel,
  NotificationModel,
} from "@/features/intelligence/models/intelligence.model";
import { LearningEventModel } from "@/features/intelligence/models/learning-event.model";
import { UserTopicProgressModel } from "@/features/intelligence/models/user-topic-progress.model";
import {
  TrackModel,
  TrackEnrollmentModel,
} from "@/features/intelligence/models/track.model";
import {
  CheckpointItemModel,
  CheckpointSessionModel,
  CheckpointAttemptModel,
} from "@/features/intelligence/models/checkpoint-item.model";
import { MistakeRepairModel } from "@/features/intelligence/models/mistake-repair.model";
import { InterviewDrillModel } from "@/features/learning/models/interview-drill.model";
import { JourneyModel } from "@/features/intelligence/models/journey.model";
import { PlanModel } from "@/features/intelligence/models/plan.model";
import { PlanDayModel } from "@/features/intelligence/models/plan-day.model";
import { PlanTaskModel } from "@/features/intelligence/models/plan-task.model";

// Services to test
import {
  executePracticeSubmission,
  executeReviewSubmission,
  getLearnerEpoch,
} from "./learning-command.service";
import { resetLearningDataAction } from "@/features/product/actions/product.actions";
import {
  getSharedLearnerGlobalProgress,
  getSharedLearnerTopicProgress,
} from "@/features/progress/services/shared-progress.service";
import { getNotifications } from "@/features/product/services/product.service";
import { completePlanTaskAction } from "@/features/intelligence/actions/plan-actions";
import {
  seedTrackDefinitions,
  getTrackBySlug,
  enrollInTrack,
  getTrackAdaptiveSheetData,
} from "@/features/intelligence/services/track.service";
import {
  seedCheckpointFixtures,
  startCheckpointSession,
  submitCheckpointAttempt,
} from "@/features/intelligence/services/checkpoint.service";
import {
  createOrGetMistakeRepair,
  recordRepairActivityCompleted,
  recordRepairFollowUpOutcome,
  getActiveMistakeRepairs,
} from "@/features/intelligence/services/mistake-repair.service";
import {
  startOrResumeInterviewDrill,
  advanceInterviewStep,
} from "./interview-drill.service";
import {
  calculateScheduleCapacity,
  generateReplanProposal,
  acceptReplanProposal,
  createPreparationJourney,
} from "@/features/intelligence/services/journey.service";
import { buildCandidateSet } from "@/features/intelligence/decisions/task-candidate-builder";

// Mocks for next/cache and auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

let currentMockUserId: string = new Types.ObjectId().toString();

vi.mock("@/lib/auth-guard", () => ({
  requireUserId: vi.fn(() => Promise.resolve(currentMockUserId)),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

let replSet: MongoMemoryReplSet;

describe("Phase 9 — Final Continuity, Responsiveness, and Operational Verification Suite", () => {
  let testUserId: Types.ObjectId;
  let testTopicId: Types.ObjectId;
  let testProblemId: Types.ObjectId;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);

    // Sync Model Indexes
    await UserModel.createIndexes();
    await ProblemAttemptModel.createIndexes();
    await PracticeSessionModel.createIndexes();
    await LearningCommandModel.createIndexes();
    await RevisionQueueModel.createIndexes();
    await LearningDeliveryModel.createIndexes();
    await LearningEventModel.createIndexes();
    await UserTopicProgressModel.createIndexes();
    await TrackModel.createIndexes();
    await TrackEnrollmentModel.createIndexes();
    await CheckpointItemModel.createIndexes();
    await CheckpointSessionModel.createIndexes();
    await CheckpointAttemptModel.createIndexes();
    await MistakeRepairModel.createIndexes();
    await InterviewDrillModel.createIndexes();
    await JourneyModel.createIndexes();
    await PlanModel.createIndexes();
    await PlanDayModel.createIndexes();
    await PlanTaskModel.createIndexes();
    await NotificationModel.createIndexes();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  beforeEach(async () => {
    testUserId = new Types.ObjectId();
    currentMockUserId = testUserId.toString();

    // Clear collections
    await UserModel.deleteMany({});
    await ProblemAttemptModel.deleteMany({});
    await PracticeSessionModel.deleteMany({});
    await LearningCommandModel.deleteMany({});
    await RevisionQueueModel.deleteMany({});
    await RevisionHistoryModel.deleteMany({});
    await LearningDeliveryModel.deleteMany({});
    await LearningEventModel.deleteMany({});
    await UserTopicProgressModel.deleteMany({});
    await TrackModel.deleteMany({});
    await TrackEnrollmentModel.deleteMany({});
    await CheckpointItemModel.deleteMany({});
    await CheckpointSessionModel.deleteMany({});
    await CheckpointAttemptModel.deleteMany({});
    await MistakeRepairModel.deleteMany({});
    await InterviewDrillModel.deleteMany({});
    await JourneyModel.deleteMany({});
    await PlanModel.deleteMany({});
    await PlanDayModel.deleteMany({});
    await PlanTaskModel.deleteMany({});
    await NotificationModel.deleteMany({});
    await TopicModel.deleteMany({});
    await ProblemModel.deleteMany({});

    // Seed User
    await UserModel.create({
      _id: testUserId,
      email: "learner@dsaclub.test",
      name: "Test Learner",
      learningEpoch: 1,
      role: "student",
    });

    // Seed Topic & Problem
    const topic = await TopicModel.create({
      slug: "arrays",
      name: "Arrays & Two Pointers",
      description: "Linear data structures and two-pointer traversal",
      difficulty: "beginner",
      order: 1,
      estimatedMinutes: 60,
      isPublished: true,
    });
    testTopicId = topic._id as Types.ObjectId;

    const prob1 = await ProblemModel.create({
      slug: "two-sum",
      title: "Two Sum",
      summary: "Find indices that add up to target",
      difficulty: "easy",
      estimatedMinutes: 15,
      source: "leetcode",
      sourceUrl: "https://leetcode.com/problems/two-sum/",
      status: "published",
      isPublished: true,
      topicIds: [testTopicId],
      bodyHtml: "<p>Find indices that add to target</p>",
    });
    testProblemId = prob1._id as Types.ObjectId;

    await ProblemModel.create({
      slug: "two-sum-ii-input-array-is-sorted",
      title: "Two Sum II - Input Array Is Sorted",
      summary: "Find two numbers in sorted array that add up to target",
      difficulty: "medium",
      estimatedMinutes: 25,
      source: "leetcode",
      sourceUrl: "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/",
      status: "published",
      isPublished: true,
      topicIds: [testTopicId],
      bodyHtml: "<p>Find indices in sorted array</p>",
    });

    // Seed Track and Checkpoint fixtures
    await seedCheckpointFixtures();
    await seedTrackDefinitions();
  });

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

  // =========================================================================
  // JOURNEY A: Fresh Starter Learner Experience
  // =========================================================================
  describe("Journey A: Fresh Starter Learner Experience", () => {
    it("provides truthful empty states without fabricated notifications and schedules first review on solve", async () => {
      // 1. Fresh learner opens notifications -> must NOT create or fabricate milestones
      const notifications = await getNotifications(testUserId.toString());
      expect(notifications).toEqual([]);

      // 2. Global progress is truthfully zero
      const progress = await getSharedLearnerGlobalProgress(testUserId);
      expect(progress.distinctSolvedProblems).toBe(0);
      expect(progress.totalAttempts).toBe(0);

      // 3. Learner completes first problem
      const cmdId = `cmd_starter_${Date.now()}`;
      const subResult = await executePracticeSubmission({
        userId: testUserId,
        commandId: cmdId,
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 300,
        hintsUsed: 0,
      });

      expect(subResult.ok).toBe(true);
      expect(subResult.receipt?.attemptId).toBeDefined();
      expect(subResult.receipt?.reviewEffect).toBeDefined();

      // 4. Progress updates to 1 distinct solve and review is scheduled
      const updatedProgress = await getSharedLearnerGlobalProgress(testUserId);
      expect(updatedProgress.distinctSolvedProblems).toBe(1);

      const queue = await RevisionQueueModel.findOne({
        userId: testUserId,
        entityId: testProblemId,
      });
      expect(queue).toBeDefined();
      expect(queue?.state).toBe("scheduled");
      expect(queue?.repetitions).toBe(0);
    });
  });

  // =========================================================================
  // JOURNEY B: Structured-Plan Learner Experience
  // =========================================================================
  describe("Journey B: Structured-Plan Learner Experience", () => {
    it("enforces that assisted or failed solves cannot satisfy required independent solve tasks", async () => {
      // 1. Create active plan with solve_problem task
      const plan = await createTestPlan({ dailyMinutes: 30 });

      const planDay = await PlanDayModel.create({
        planId: plan._id,
        userId: testUserId,
        dayIndex: 1,
        dateKey: "2026-10-04",
        status: "in_progress",
        phase: "independent_practice",
        title: "Day 1: Arrays",
        focus: "Arrays & Two Pointers",
        topicId: testTopicId,
        topicSlug: "arrays",
        topicName: "Arrays & Two Pointers",
        targetMinutes: 30,
      });

      const planTask = await PlanTaskModel.create({
        planId: plan._id,
        planDayId: planDay._id,
        userId: testUserId,
        dayIndex: 1,
        order: 1,
        taskKey: "task_solve_two_sum",
        phase: "practice",
        title: "Solve Two Sum",
        entityType: "problem",
        entityId: testProblemId,
        completionRequirement: "solve_independently",
        planRelation: "planned_today",
        required: true,
        status: "pending",
        estimatedMinutes: 20,
        actualMinutes: 0,
      });

      // 2. Submit an assisted solve (hintsUsed = 2)
      const sub1 = await executePracticeSubmission({
        userId: testUserId,
        commandId: `cmd_assisted_${Date.now()}`,
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "hint_assisted",
        hintsUsed: 2,
        durationSeconds: 400,
      });

      // 3. Attempting to complete the task with an assisted solve fails requirements
      const completeRes = await completePlanTaskAction(planTask._id.toString(), {
        problemAttemptId: sub1.receipt?.attemptId ?? undefined,
      });
      expect(completeRes.success).toBe(false);
      expect(completeRes.error).toContain("TASK_REQUIREMENT_UNMET");

      // 4. Submit a genuine independent solve
      const sub2 = await executePracticeSubmission({
        userId: testUserId,
        commandId: `cmd_indep_${Date.now()}`,
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        hintsUsed: 0,
        durationSeconds: 320,
      });

      // 5. Task now completes successfully
      const finalRes = await completePlanTaskAction(planTask._id.toString(), {
        problemAttemptId: sub2.receipt?.attemptId ?? undefined,
      });
      expect(finalRes.success).toBe(true);

      const updatedTask = await PlanTaskModel.findById(planTask._id);
      expect(updatedTask?.status).toBe("completed");
    });
  });

  // =========================================================================
  // JOURNEY C: Refresh During Submission & Lost-Response Recovery
  // =========================================================================
  describe("Journey C: Refresh During Submission & Lost-Response Recovery", () => {
    it("idempotently handles identical command submissions and recovers authoritative receipt", async () => {
      const stableCommandId = `cmd_recovery_${Date.now()}`;

      // 1. Initial submission succeeds and commits
      const res1 = await executePracticeSubmission({
        userId: testUserId,
        commandId: stableCommandId,
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 240,
        hintsUsed: 0,
      });
      expect(res1.ok).toBe(true);
      expect(res1.receipt?.attemptId).toBeDefined();

      // 2. Simulated refresh/lost response: retry submission with same command ID
      const res2 = await executePracticeSubmission({
        userId: testUserId,
        commandId: stableCommandId,
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 240,
        hintsUsed: 0,
      });

      // Must return duplicate cached receipt without creating a second attempt
      expect(res2.ok).toBe(true);
      expect(res2.isDuplicate).toBe(true);
      expect(res2.receipt?.attemptId).toBe(res1.receipt?.attemptId);

      const attemptCount = await ProblemAttemptModel.countDocuments({
        userId: testUserId,
        problemId: testProblemId,
      });
      expect(attemptCount).toBe(1);
    });
  });

  // =========================================================================
  // JOURNEY D: Browser Close, Reopen, and Session Context Preservation
  // =========================================================================
  describe("Journey D: Browser Close and Session Context Preservation", () => {
    it("preserves active practice session state, timer, and hints across restarts", async () => {
      // 1. Start practice session
      const session = await PracticeSessionModel.create({
        userId: testUserId,
        problemId: testProblemId,
        learningEpoch: 1,
        contentVersion: 1,
        state: "active",
        hintsRevealedLevels: [1, 2],
        timerState: {
          accumulatedSeconds: 120,
          isRunning: true,
          startedAt: new Date(Date.now() - 30000),
          lastHeartbeatAt: new Date(),
          provenance: "measured",
        },
      });

      // 2. Re-fetch session (simulating reopen)
      const restored = await PracticeSessionModel.findOne({
        userId: testUserId,
        problemId: testProblemId,
        learningEpoch: 1,
        state: "active",
      });

      expect(restored).toBeDefined();
      expect(restored?.hintsRevealedLevels).toEqual([1, 2]);
      expect(restored?.timerState.accumulatedSeconds).toBe(120);

      // 3. Finalize session via practice submission
      const subRes = await executePracticeSubmission({
        userId: testUserId,
        commandId: `cmd_final_${Date.now()}`,
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "hint_assisted",
        hintsUsed: 2,
        durationSeconds: 150,
        sessionId: session._id.toString(),
      });

      expect(subRes.ok).toBe(true);

      const finalizedSess = await PracticeSessionModel.findById(session._id);
      expect(finalizedSess?.state).toBe("completed");
    });
  });

  // =========================================================================
  // JOURNEY E: Multiple Tabs & Competing Submissions
  // =========================================================================
  describe("Journey E: Multiple Tabs & Competing Submissions", () => {
    it("prevents double-finalizing a completed session with a different command", async () => {
      const session = await PracticeSessionModel.create({
        userId: testUserId,
        problemId: testProblemId,
        learningEpoch: 1,
        contentVersion: 1,
        state: "active",
      });

      const cmdTab1 = `cmd_tab1_${Date.now()}`;
      const cmdTab2 = `cmd_tab2_${Date.now()}`;

      // Tab 1 submits and completes session
      const res1 = await executePracticeSubmission({
        userId: testUserId,
        commandId: cmdTab1,
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 100,
        sessionId: session._id.toString(),
      });
      expect(res1.ok).toBe(true);

      // Tab 2 attempts to submit against the now-completed session with a new command
      const res2 = await executePracticeSubmission({
        userId: testUserId,
        commandId: cmdTab2,
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 110,
        sessionId: session._id.toString(),
      });

      expect(res2.ok).toBe(false);
      expect(res2.conflict).toBe(true);
      expect(res2.error).toContain("SESSION_ALREADY_COMPLETED");
    });
  });

  // =========================================================================
  // JOURNEY F: Offline and Reconnection Recovery
  // =========================================================================
  describe("Journey F: Offline and Reconnection Recovery", () => {
    it("rejects mismatched payload reuse and permits safe retry with preserved intent", async () => {
      const commandId = `cmd_offline_${Date.now()}`;

      // 1. Initial attempt
      await executePracticeSubmission({
        userId: testUserId,
        commandId,
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 180,
      });

      // 2. Accidental retry with conflicting payload (different status)
      const conflictRes = await executePracticeSubmission({
        userId: testUserId,
        commandId,
        problemId: testProblemId.toString(),
        status: "abandoned", // altered intent — status enum only allows: solved | started | abandoned
        strategy: "independent",
        durationSeconds: 180,
      });

      expect(conflictRes.ok).toBe(false);
      expect(conflictRes.conflict).toBe(true);
      expect(conflictRes.error).toContain("IDEMPOTENCY_CONFLICT");
    });
  });

  // =========================================================================
  // JOURNEY G: Delayed Worker Recovery & Downstream Backlog
  // =========================================================================
  describe("Journey G: Delayed Worker Recovery", () => {
    it("commits practice command with pending downstreamStatus and maintains recovery durability", async () => {
      const commandId = `cmd_worker_${Date.now()}`;
      const subRes = await executePracticeSubmission({
        userId: testUserId,
        commandId,
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 220,
      });

      expect(subRes.ok).toBe(true);
      expect(subRes.receipt?.downstreamStatus).toBe("pending");

      const cmdRecord = await LearningCommandModel.findOne({ commandId });
      expect(cmdRecord).toBeDefined();
      expect(cmdRecord?.downstreamStatus).toBe("pending");

      // Verify delivery record was created for downstream worker processing
      const delivery = await LearningDeliveryModel.findOne({
        commandId,
        userId: testUserId,
      });
      expect(delivery).toBeDefined();
      expect(delivery?.status).toBe("pending");
    });
  });

  // =========================================================================
  // JOURNEY H: Review at a Date Boundary
  // =========================================================================
  describe("Journey H: Review at a Date Boundary", () => {
    it("recognizes overdue reviews immediately when dueAt <= now without waiting for worker cron", async () => {
      // 1. Schedule a review due 10 minutes ago
      const tenMinutesAgo = new Date(Date.now() - 600000);
      await RevisionQueueModel.create({
        userId: testUserId,
        entityType: "problem",
        entityId: testProblemId,
        state: "scheduled", // state is still scheduled
        dueAt: tenMinutesAgo, // but due timestamp has passed!
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 1,
        lapses: 0,
        priority: 50,
        source: "attempt",
      });

      // 2. Query candidates via decision engine -> must surface the review as due immediately
      const candidateSet = await buildCandidateSet(testUserId, { availableMinutes: 30 });
      const reviewCandidate = candidateSet.candidates.find(
        (c) => c.actionType === "revision" && String(c.entityId) === String(testProblemId)
      );

      expect(reviewCandidate).toBeDefined();
      expect(reviewCandidate?.reasons.join(" ")).toContain("retention review is due");

      // 3. Complete review submission
      const queueDoc = await RevisionQueueModel.findOne({
        userId: testUserId,
        entityId: testProblemId,
      });
      const revRes = await executeReviewSubmission({
        userId: testUserId,
        commandId: `cmd_rev_${Date.now()}`,
        queueId: queueDoc!._id.toString(),
        grade: 4,
        confidence: 4,
        responseSeconds: 90,
      });

      expect(revRes.ok).toBe(true);
      expect(revRes.receipt?.reviewEffect?.nextIntervalDays).toBeGreaterThan(1);
    });
  });

  // =========================================================================
  // JOURNEY I: Track and Checkpoint Submission
  // =========================================================================
  describe("Journey I: Track and Checkpoint Submission", () => {
    it("enforces session assignment, monotonic assistance, and conservative transfer", async () => {
      await enrollInTrack({
        userId: testUserId,
        trackSlug: "arrays-and-pointers",
      });

      // 1. Start checkpoint session
      const { session } = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-transfer",
      });
      expect(session).toBeDefined();
      const sessionId = session.sessionId;

      // 2. Submit correct attempt
      const subRes = await submitCheckpointAttempt({
        userId: testUserId,
        sessionId,
        selectedOptionKey: "B",
        hintsUsed: 0,
        solutionViewed: false,
      });

      expect(subRes.isCorrect).toBe(true);
      expect(subRes.attempt.isTransferEvidence).toBe(true);

      // 3. Second attempt on same variant is NOT novel transfer evidence
      const { session: session2 } = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-transfer",
      });
      const subRes2 = await submitCheckpointAttempt({
        userId: testUserId,
        sessionId: session2.sessionId,
        selectedOptionKey: "B",
        hintsUsed: 0,
      });

      expect(subRes2.attempt.isTransferEvidence).toBe(false);
      expect(subRes2.attempt.priorExposureCount).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // JOURNEY J: Mistake Repair Lifecycle
  // =========================================================================
  describe("Journey J: Mistake Repair Lifecycle", () => {
    it("progresses from pending to activity_completed to resolved via durable recheck", async () => {
      // 1. Trigger repair
      const sourceAttemptId = new Types.ObjectId();
      const repair = await createOrGetMistakeRepair({
        userId: testUserId,
        sourceType: "problem_attempt",
        sourceId: sourceAttemptId.toString(),
        capability: "two_pointers_invariant",
        topicSlug: "arrays",
        explicitMisconception: "boundary_condition_issue",
      });
      expect(repair.status).toBe("pending");

      // 2. Complete study activity -> activity_completed (NOT resolved)
      const afterActivity = await recordRepairActivityCompleted(repair.repairId, testUserId);
      expect(afterActivity.status).toBe("activity_completed");

      // 3. Follow-up recheck fails -> further_evidence_needed
      // 3. Follow-up recheck fails -> further_evidence_needed
      const failedRecheck = await recordRepairFollowUpOutcome({
        repairId: repair.repairId,
        userId: testUserId,
        passed: false,
        independent: false,
        score: 40,
      });
      expect(failedRecheck.status).toBe("further_evidence_needed");

      // 4. Qualifying follow-up passed -> follow_up_passed
      const passedRecheck = await recordRepairFollowUpOutcome({
        repairId: repair.repairId,
        userId: testUserId,
        passed: true,
        independent: true,
        score: 100,
      });
      expect(passedRecheck.status).toBe("follow_up_passed");
    });
  });

  // =========================================================================
  // JOURNEY K: Interview Drill Finalization
  // =========================================================================
  describe("Journey K: Interview Drill Finalization", () => {
    it("connects to canonical practice submission without fake fallbacks", async () => {
      const drill = await startOrResumeInterviewDrill({
        userId: testUserId,
        problemSlug: "two-sum",
        timeboxMinutes: 20,
      });

      await advanceInterviewStep({
        drillId: drill.drillId,
        userId: testUserId,
        step: 1,
        response: { acknowledged1Indexed: true },
      });
      await advanceInterviewStep({
        drillId: drill.drillId,
        userId: testUserId,
        step: 2,
        response: { invariantExplanation: "Hash map complement lookup" },
      });
      await advanceInterviewStep({
        drillId: drill.drillId,
        userId: testUserId,
        step: 3,
        response: { selfReportedStatus: "solved", hintsUsed: 0 },
      });
      await advanceInterviewStep({
        drillId: drill.drillId,
        userId: testUserId,
        step: 4,
        response: { handledDuplicates: true },
      });

      const finalDrill = await advanceInterviewStep({
        drillId: drill.drillId,
        userId: testUserId,
        step: 5,
        response: { timeComplexity: "O(n)", spaceComplexity: "O(n)" },
      });

      expect(finalDrill.status).toBe("completed");
      expect(finalDrill.debrief?.factualOutcome).toContain("self-reported");

      // Verifies canonical ProblemAttempt was created
      const attempt = await ProblemAttemptModel.findOne({
        userId: testUserId,
        problemId: testProblemId,
      });
      expect(attempt).toBeDefined();
      expect(attempt?.status).toBe("solved");
    });
  });

  // =========================================================================
  // JOURNEY L: Journey Replanning & Schedule Application
  // =========================================================================
  describe("Journey L: Journey Replanning & Schedule Application", () => {
    it("generates honest capacity and mutates linked plan days upon acceptance", async () => {
      // 1. Create linked Plan
      const plan = await createTestPlan({ dailyMinutes: 30 });

      const planDay = await PlanDayModel.create({
        planId: plan._id,
        userId: testUserId,
        dayIndex: 1,
        dateKey: "2026-10-04",
        status: "in_progress",
        phase: "independent_practice",
        title: "Day 1: Arrays",
        focus: "Arrays & Two Pointers",
        topicId: testTopicId,
        topicSlug: "arrays",
        topicName: "Arrays & Two Pointers",
        targetMinutes: 30,
      });

      // 2. Capacity calculation
      const capacity = calculateScheduleCapacity({
        startDate: new Date(),
        studyDaysPerWeek: 5,
        dailyMinutes: 45,
        availableDaysOfWeek: [1, 2, 3, 4, 5],
      });
      expect(capacity.isFeasible).toBe(true);

      // 3. Create Journey
      const { journey } = await createPreparationJourney({
        userId: testUserId,
        goal: "interview_prep",
        weeklyAvailability: {
          studyDaysPerWeek: 5,
          dailyMinutes: 30,
          availableDaysOfWeek: [1, 2, 3, 4, 5],
          timezone: "Asia/Kolkata",
        },
      });

      // 4. Generate proposal and accept it
      const proposal = await generateReplanProposal({
        userId: testUserId,
        journeyId: String(journey._id),
        trigger: "availability_change",
        proposedAvailability: { dailyMinutes: 50 },
      });

      const acceptRes = await acceptReplanProposal({
        userId: testUserId,
        journeyId: String(journey._id),
        replanId: proposal.replanId,
      });

      expect(acceptRes.success).toBe(true);

      const updatedPlan = await PlanModel.findById(plan._id);
      expect(updatedPlan?.dailyMinutes).toBe(50);
    });
  });

  // =========================================================================
  // JOURNEY M: Reset and Stale Sessions
  // =========================================================================
  describe("Journey M: Reset and Stale Sessions", () => {
    it("increments learningEpoch and rejects submissions from prior epoch sessions", async () => {
      // 1. Ensure auth context points to testUserId
      currentMockUserId = testUserId.toString();

      // 2. Execute full learning reset -> increments learningEpoch to 2
      await resetLearningDataAction("RESET");
      const newEpoch = await getLearnerEpoch(testUserId);
      expect(newEpoch).toBe(2);

      // 3. Simulate a stale session created in prior epoch 1
      const sessionOldEpoch = await PracticeSessionModel.create({
        userId: testUserId,
        problemId: testProblemId,
        learningEpoch: 1,
        contentVersion: 1,
        state: "active",
      });

      // 4. Attempting to submit against epoch 1 session must be rejected with SESSION_EPOCH_MISMATCH
      const staleRes = await executePracticeSubmission({
        userId: testUserId,
        commandId: `cmd_stale_${Date.now()}`,
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 120,
        sessionId: sessionOldEpoch._id.toString(),
      });

      expect(staleRes.ok).toBe(false);
      expect(staleRes.conflict).toBe(true);
      expect(staleRes.error).toContain("SESSION_EPOCH_MISMATCH");
    });
  });

  // =========================================================================
  // JOURNEY N: Account Isolation
  // =========================================================================
  describe("Journey N: Account Isolation", () => {
    it("strictly isolates practice sessions, attempts, and receipts between distinct accounts", async () => {
      const userBId = new Types.ObjectId();
      await UserModel.create({
        _id: userBId,
        email: "user_b@dsaclub.test",
        name: "User B",
        role: "student",
        learningEpoch: 1,
      });

      // User A creates a session
      const sessA = await PracticeSessionModel.create({
        userId: testUserId,
        problemId: testProblemId,
        learningEpoch: 1,
        contentVersion: 1,
        state: "active",
      });

      // User B attempts to submit against User A's session
      const hijackRes = await executePracticeSubmission({
        userId: userBId,
        commandId: `cmd_hijack_${Date.now()}`,
        problemId: testProblemId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 100,
        sessionId: sessA._id.toString(),
      });

      expect(hijackRes.ok).toBe(false);
      expect(hijackRes.conflict).toBe(true);
      expect(hijackRes.error).toContain("SESSION_OWNER_MISMATCH");
    });
  });

  // =========================================================================
  // JOURNEY O: Missing Content & Old URLs
  // =========================================================================
  describe("Journey O: Missing Content and Old URLs", () => {
    it("gracefully rejects attempts on unpublished or nonexistent problems", async () => {
      const nonexistentId = new Types.ObjectId();
      const res = await executePracticeSubmission({
        userId: testUserId,
        commandId: `cmd_404_${Date.now()}`,
        problemId: nonexistentId.toString(),
        status: "solved",
        strategy: "independent",
        durationSeconds: 60,
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(404);
      expect(res.error).toContain("not found");
    });
  });
});

import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import {
  CheckpointItemModel,
  CheckpointAttemptModel,
  CheckpointSessionModel,
} from "@/features/intelligence/models/checkpoint-item.model";
import {
  TrackModel,
  TrackEnrollmentModel,
} from "@/features/intelligence/models/track.model";
import {
  ProblemModel,
  TopicModel,
} from "@/features/content/models/content.model";
import {
  ProblemAttemptModel,
  PracticeSessionModel,
} from "@/features/learning/models/learning.model";
import { UserTopicProgressModel } from "@/features/intelligence/models/user-topic-progress.model";
import { JourneyModel } from "@/features/intelligence/models/journey.model";
import { PlanModel } from "@/features/intelligence/models/plan.model";
import { PlanDayModel } from "@/features/intelligence/models/plan-day.model";
import { PlanTaskModel } from "@/features/intelligence/models/plan-task.model";
import { LearningEventModel } from "@/features/intelligence/models/learning-event.model";
import { RevisionQueueModel } from "@/features/intelligence/models/intelligence.model";
import { MistakeRepairModel } from "@/features/intelligence/models/mistake-repair.model";
import { InterviewDrillModel } from "@/features/learning/models/interview-drill.model";
import {
  seedCheckpointFixtures,
  startCheckpointSession,
  submitCheckpointAttempt,
} from "@/features/intelligence/services/checkpoint.service";
import {
  seedTrackDefinitions,
  getTrackBySlug,
  enrollInTrack,
  getTrackAdaptiveSheetData,
  ARRAYS_TRACK_DEFINITION,
} from "@/features/intelligence/services/track.service";
import {
  createOrGetMistakeRepair,
  recordRepairActivityCompleted,
  recordRepairFollowUpOutcome,
  getActiveMistakeRepairs,
} from "@/features/intelligence/services/mistake-repair.service";
import {
  computeSchedule,
  getCapacityBoundedRevisions,
} from "@/features/revision/services/revision.service";
import {
  startOrResumeInterviewDrill,
  advanceInterviewStep,
  togglePauseInterviewDrill,
} from "./interview-drill.service";

let mongod: MongoMemoryReplSet;
let testUserId: Types.ObjectId;

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/auth-guard", () => ({
  requireUserId: vi.fn(() => Promise.resolve(new Types.ObjectId().toString())),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Phase 5: Non-Commercial Architecture & Strengthened Learning Experience", () => {
  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);

    await CheckpointItemModel.syncIndexes();
    await CheckpointAttemptModel.syncIndexes();
    await CheckpointSessionModel.syncIndexes();
    await TrackModel.syncIndexes();
    await TrackEnrollmentModel.syncIndexes();
    await ProblemModel.syncIndexes();
    await TopicModel.syncIndexes();
    await ProblemAttemptModel.syncIndexes();
    await PracticeSessionModel.syncIndexes();
    await UserTopicProgressModel.syncIndexes();
    await LearningEventModel.syncIndexes();
    await RevisionQueueModel.syncIndexes();
    await MistakeRepairModel.syncIndexes();
    await InterviewDrillModel.syncIndexes();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    testUserId = new Types.ObjectId();
    await CheckpointAttemptModel.deleteMany({});
    await CheckpointSessionModel.deleteMany({});
    await TrackEnrollmentModel.deleteMany({});
    await ProblemAttemptModel.deleteMany({});
    await PracticeSessionModel.deleteMany({});
    await UserTopicProgressModel.deleteMany({});
    await LearningEventModel.deleteMany({});
    await RevisionQueueModel.deleteMany({});
    await MistakeRepairModel.deleteMany({});
    await InterviewDrillModel.deleteMany({});
    await JourneyModel.deleteMany({});
    await PlanModel.deleteMany({});

    // Seed test fixtures
    await seedCheckpointFixtures();
    await seedTrackDefinitions();

    // Seed mock problems for track
    await ProblemModel.findOneAndUpdate(
      { slug: "two-sum" },
      {
        slug: "two-sum",
        title: "Two Sum",
        difficulty: "easy",
        status: "published",
        bodyHtml: "<p>Two sum problem</p>",
      },
      { upsert: true, new: true }
    );

    await ProblemModel.findOneAndUpdate(
      { slug: "two-sum-ii-input-array-is-sorted" },
      {
        slug: "two-sum-ii-input-array-is-sorted",
        title: "Two Sum II - Input Array Is Sorted",
        difficulty: "easy",
        status: "published",
        bodyHtml: "<p>Sorted array two-sum</p>",
      },
      { upsert: true, new: true }
    );
  });

  // =========================================================================
  // PART A: Safe Monetization Removal & Legitimate Access Verification
  // =========================================================================
  describe("Part A: Safe Monetization Removal & Non-commercial Track Access", () => {
    it("allows an authenticated learner without subscription records to start a published track", async () => {
      // Learner has no subscription record anywhere in DB
      const result = await enrollInTrack({
        userId: testUserId,
        trackSlug: "arrays-and-pointers",
      });

      expect(result).toBeDefined();
      expect(result.enrollment.trackSlug).toBe("arrays-and-pointers");
      expect(result.enrollment.status).toBe("active");
      expect(result.enrollment.trackVersion).toBe("1.0.0");

      // Verify legitimate learning enrollment was stored, not a commercial order
      const found = await TrackEnrollmentModel.findOne({
        userId: testUserId,
        trackSlug: "arrays-and-pointers",
      });
      expect(found).not.toBeNull();
      expect(found?.status).toBe("active");
    });

    it("enforces legitimate publication checks: rejects enrollment in non-existent or unpublished track", async () => {
      await expect(
        enrollInTrack({
          userId: testUserId,
          trackSlug: "non-existent-unpublished-track",
        })
      ).rejects.toThrow(/not found/);
    });

    it("serves track adaptive sheet data without commercial subscription fields or paywalls", async () => {
      const sheet = await getTrackAdaptiveSheetData(testUserId, "arrays-and-pointers");

      expect(sheet).toBeDefined();
      expect(sheet.track.trackSlug).toBe("arrays-and-pointers");
      expect(sheet.track.workloadHours).toBe(3.5);
      expect((sheet.track as any).isCommercial).toBeFalsy();
      expect((sheet.track as any).requiredPlanTier).toBe("free");
      expect(sheet.units.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // PART B.1: Checkpoint Variant Families & Honest Transfer Evidence
  // =========================================================================
  describe("Part B.1: Checkpoint Variant Families & Honest Transfer Evidence", () => {
    it("differentiates baseline recognition from unfamiliar transfer evidence", async () => {
      // 1. Invariant recognition checkpoint
      const session1 = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-invariant",
      });

      const res1 = await submitCheckpointAttempt({
        sessionId: session1.session.sessionId,
        userId: testUserId,
        selectedOptionKey: "B", // Correct option for chk-two-sum-ii-invariant
        hintsUsed: 0,
        solutionViewed: false,
      });

      expect(res1.isCorrect).toBe(true);
      expect(res1.attempt.evidenceType).toBe("recognition");
      // Baseline recognition is NOT transfer evidence!
      expect(res1.attempt.isTransferEvidence).toBe(false);

      // 2. Transfer variant checkpoint with changed constraints
      const session2 = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-transfer",
      });

      const res2 = await submitCheckpointAttempt({
        sessionId: session2.session.sessionId,
        userId: testUserId,
        selectedOptionKey: "B", // Correct option for chk-two-sum-ii-transfer
        hintsUsed: 0,
        solutionViewed: false,
      });

      expect(res2.isCorrect).toBe(true);
      expect(res2.attempt.evidenceType).toBe("variant_transfer");
      // Unassisted solve of unfamiliar transfer variant qualifies as transfer evidence!
      expect(res2.attempt.isTransferEvidence).toBe(true);
    });

    it("does NOT count transfer evidence if the learner received hints or viewed solutions", async () => {
      const session = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-transfer",
      });

      const res = await submitCheckpointAttempt({
        sessionId: session.session.sessionId,
        userId: testUserId,
        selectedOptionKey: "B",
        hintsUsed: 2, // Guided attempt
        solutionViewed: false,
      });

      expect(res.isCorrect).toBe(true);
      // Assisted attempt must not be claimed as independent transfer proof
      expect(res.attempt.isTransferEvidence).toBe(false);
    });

    it("increments learner exposure count across repeated attempts", async () => {
      // First session
      const s1 = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-boundary",
      });
      await submitCheckpointAttempt({
        sessionId: s1.session.sessionId,
        userId: testUserId,
        selectedOptionKey: "A",
      });

      // Second session: prior exposure count should now be 1
      const s2 = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-boundary",
      });
      expect(s2.session.priorExposureCount).toBe(1);
    });
  });

  // =========================================================================
  // PART B.2: Actionable Mistake Repair Workflow
  // =========================================================================
  describe("Part B.2: Actionable Mistake Repair Workflow", () => {
    it("diagnoses root difficulty honestly from rubric and generates targeted repair", async () => {
      // Learner fails boundary checkpoint by picking option A (distinct index violation distractor)
      const session = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-boundary",
      });

      const res = await submitCheckpointAttempt({
        sessionId: session.session.sessionId,
        userId: testUserId,
        selectedOptionKey: "A", // Option A mapped to misconception: boundary_condition_issue
      });

      expect(res.isCorrect).toBe(false);
      expect(res.attempt.repairId).toBeDefined();

      // Verify mistake repair document created
      const repair = await MistakeRepairModel.findOne({ repairId: res.attempt.repairId });
      expect(repair).not.toBeNull();
      expect(repair?.rootDifficulty).toBe("boundary_condition_issue");
      expect(repair?.diagnosisSource).toBe("reviewed_rubric");
      expect(repair?.status).toBe("pending");
      expect(repair?.activity.activityType).toBe("boundary_checkpoint");
      expect(repair?.recheckItemKey).toBe("chk-two-sum-ii-boundary");
    });

    it("deduplicates mistake repair generation for identical source attempts", async () => {
      const input = {
        userId: testUserId,
        sourceType: "problem_attempt" as const,
        sourceId: "two-sum-ii-input-array-is-sorted",
        capability: "two_pointers_invariant",
        topicSlug: "arrays",
        explicitMisconception: "constraint_mismatch" as const,
      };

      const repair1 = await createOrGetMistakeRepair(input);
      const repair2 = await createOrGetMistakeRepair(input);

      expect(repair1.repairId).toBe(repair2.repairId);
      expect(repair1._id.toString()).toBe(repair2._id.toString());

      const count = await MistakeRepairModel.countDocuments({
        userId: testUserId,
        sourceId: "two-sum-ii-input-array-is-sorted",
      });
      expect(count).toBe(1);
    });

    it("requires an independent recheck: reading an explanation does not claim resolution", async () => {
      const repair = await createOrGetMistakeRepair({
        userId: testUserId,
        sourceType: "checkpoint_attempt",
        sourceId: "chk-two-sum-ii-boundary",
        capability: "boundary_reasoning",
        topicSlug: "arrays",
        explicitMisconception: "boundary_condition_issue",
      });

      // 1. Learner marks activity completed
      const afterActivity = await recordRepairActivityCompleted(repair.repairId, testUserId);
      expect(afterActivity.status).toBe("activity_completed");
      // Critical check: reading/completing the activity must NOT mark it resolved!
      expect(afterActivity.status).not.toBe("follow_up_passed");

      // 2. Learner passes independent follow-up recheck
      const afterRecheck = await recordRepairFollowUpOutcome({
        repairId: repair.repairId,
        userId: testUserId,
        passed: true,
        independent: true,
        score: 100,
        notes: "Passed boundary reasoning recheck without hints.",
      });

      expect(afterRecheck.status).toBe("follow_up_passed");
      expect(afterRecheck.resolutionEvidence?.passed).toBe(true);
      expect(afterRecheck.resolutionEvidence?.independent).toBe(true);
    });
  });

  // =========================================================================
  // PART B.3: Evidence-Grounded Revision & Capacity Awareness
  // =========================================================================
  describe("Part B.3: Evidence-Grounded Revision & Capacity Awareness", () => {
    it("preserves zero-grade invariance: grade 0 remains grade 0 and does not inflate interval", () => {
      const current = {
        intervalDays: 6,
        easeFactor: 2.5,
        repetitions: 3,
        lapses: 0,
      };

      const sched = computeSchedule(current, 0, 1, new Date(), { assisted: false });

      expect(sched.intervalDays).toBe(1);
      expect(sched.repetitions).toBe(0); // Lapsed back to initial retention
      expect(sched.easeFactor).toBeLessThan(2.5);
    });

    it("prevents false retention calibration: assisted reviews do not advance intervals", () => {
      const current = {
        intervalDays: 6,
        easeFactor: 2.5,
        repetitions: 2,
        lapses: 0,
      };

      const sched = computeSchedule(current, 4, 4, new Date(), { assisted: true });

      // Guided assistance must cap the interval at 1 day rather than advancing to 15 days
      expect(sched.intervalDays).toBe(1);
      expect(sched.repetitions).toBe(0); // Reset or kept conservative due to assisted failure
    });

    it("bounds review capacity to prevent learner paralysis and provides clear explanations", async () => {
      // Seed 8 due items in revision queue
      for (let i = 1; i <= 8; i++) {
        await RevisionQueueModel.create({
          userId: testUserId,
          entityType: "problem",
          entityId: new Types.ObjectId(),
          dueAt: new Date(Date.now() - 10000), // Past due
          intervalDays: i,
          priority: 50 + i,
          lapses: 0,
          source: "attempt",
          state: "due",
        });
      }

      // Default batch limit is 5
      const items = await getCapacityBoundedRevisions({
        userId: testUserId,
        maxDailyItems: 5,
      });

      expect(items.length).toBe(5);

      // Verify learner-facing explanations exist on every item
      for (const item of items) {
        expect(item.reviewReason).toBeDefined();
        expect(item.expectedRetrieval).toBeDefined();
        expect(item.explanation).toBeDefined();
      }
    });
  });

  // =========================================================================
  // PART B.4: Track Coherence & Separated Completion Language
  // =========================================================================
  describe("Part B.4: Track Coherence & Separated Completion Language", () => {
    it("reports honest completion breakdown: distinguishes in_progress vs needs_transfer_evidence vs completed", async () => {
      // Case 1: Brand new enrollment
      await enrollInTrack({
        userId: testUserId,
        trackSlug: "arrays-and-pointers",
      });
      const sheet1 = await getTrackAdaptiveSheetData(testUserId, "arrays-and-pointers");

      expect(sheet1.stats.completionSummary?.status).toBe("in_progress");
      expect(sheet1.stats.isTrackCompleted).toBe(false);

      // Case 2: User completes recognition problem attempts
      const p1 = await ProblemModel.findOne({ slug: "two-sum" });
      const p2 = await ProblemModel.findOne({ slug: "two-sum-ii-input-array-is-sorted" });

      await UserTopicProgressModel.create({
        userId: testUserId,
        learningEpoch: 1,
        topicSlug: "arrays",
        masteryScore: 85,
        reviewDueAt: new Date(Date.now() + 86400000), // future
      });

      await ProblemAttemptModel.create({
        userId: testUserId,
        problemId: p1!._id,
        learningEpoch: 1,
        status: "solved",
        strategy: "independent",
        durationSeconds: 400,
        selfConfidence: 4,
        perceivedDifficulty: 2,
        startedAt: new Date(),
        completedAt: new Date(),
      });

      await ProblemAttemptModel.create({
        userId: testUserId,
        problemId: p2!._id,
        learningEpoch: 1,
        status: "solved",
        strategy: "independent",
        durationSeconds: 500,
        selfConfidence: 4,
        perceivedDifficulty: 2,
        startedAt: new Date(),
        completedAt: new Date(),
      });

      // Pass baseline checkpoint
      const sess = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-invariant",
      });
      await submitCheckpointAttempt({
        sessionId: sess.session.sessionId,
        userId: testUserId,
        selectedOptionKey: "B",
      });

      // Pass boundary checkpoint
      const sessB = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-boundary",
      });
      await submitCheckpointAttempt({
        sessionId: sessB.session.sessionId,
        userId: testUserId,
        selectedOptionKey: "B",
      });

      const sheet2 = await getTrackAdaptiveSheetData(testUserId, "arrays-and-pointers");
      // Should require transfer evidence before claiming completion!
      expect(sheet2.stats.completionSummary?.status).toBe("needs_transfer_evidence");
      expect(sheet2.stats.isTrackCompleted).toBe(false);

      // Case 3: Pass transfer checkpoint independently
      const sessT = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-transfer",
      });
      await submitCheckpointAttempt({
        sessionId: sessT.session.sessionId,
        userId: testUserId,
        selectedOptionKey: "B",
        hintsUsed: 0,
        solutionViewed: false,
      });

      // Also pass trap checkpoint
      const sessTrap = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-trap",
      });
      await submitCheckpointAttempt({
        sessionId: sessTrap.session.sessionId,
        userId: testUserId,
        selectedOptionKey: "B",
        hintsUsed: 0,
        solutionViewed: false,
      });

      const sheet3 = await getTrackAdaptiveSheetData(testUserId, "arrays-and-pointers");
      expect(sheet3.stats.completionSummary?.status).toBe("completed");
      expect(sheet3.stats.isTrackCompleted).toBe(true);
    });
  });

  // =========================================================================
  // PART B.5: Bounded 6-Step Interview Practice Experience
  // =========================================================================
  describe("Part B.5: Bounded 6-Step Interview Practice Experience", () => {
    it("runs through the complete 6-step lifecycle with honest debrief and mistake repair trigger", async () => {
      // 1. Start drill
      const drill = await startOrResumeInterviewDrill({
        userId: testUserId,
        problemSlug: "two-sum-ii-input-array-is-sorted",
        timeboxMinutes: 25,
      });

      expect(drill.status).toBe("active");
      expect(drill.currentStep).toBe(1);
      expect(drill.practiceSessionId).toBeDefined();

      // 2. Advance through steps
      // Step 1: Constraints
      const s1 = await advanceInterviewStep({
        drillId: drill.drillId,
        userId: testUserId,
        step: 1,
        response: { acknowledged1Indexed: true, acknowledgedO1Space: true },
      });
      expect(s1.currentStep).toBe(2);

      // Step 2: Approach
      const s2 = await advanceInterviewStep({
        drillId: drill.drillId,
        userId: testUserId,
        step: 2,
        response: { invariantExplanation: "Opposite ends inward scan" },
      });
      expect(s2.currentStep).toBe(3);

      // Step 3: Implementation (with guided hints!)
      const s3 = await advanceInterviewStep({
        drillId: drill.drillId,
        userId: testUserId,
        step: 3,
        response: {
          selfReportedStatus: "solved",
          hintsUsed: 2, // Used 2 hints
          solutionViewed: false,
        },
      });
      expect(s3.currentStep).toBe(4);

      // Test pause / resume functionality
      const paused = await togglePauseInterviewDrill({
        drillId: drill.drillId,
        userId: testUserId,
        pause: true,
      });
      expect(paused.isPaused).toBe(true);
      expect(paused.status).toBe("paused");

      const resumed = await togglePauseInterviewDrill({
        drillId: drill.drillId,
        userId: testUserId,
        pause: false,
      });
      expect(resumed.isPaused).toBe(false);
      expect(resumed.status).toBe("active");

      // Step 4: Boundaries
      await advanceInterviewStep({
        drillId: drill.drillId,
        userId: testUserId,
        step: 4,
        response: { handledDuplicates: true, handledNegatives: true },
      });

      // Step 5: Complexity -> Triggers Finalization and Debrief
      const finalDrill = await advanceInterviewStep({
        drillId: drill.drillId,
        userId: testUserId,
        step: 5,
        response: { timeComplexity: "O(n)", spaceComplexity: "O(1)" },
      });

      expect(finalDrill.currentStep).toBe(6);
      expect(finalDrill.status).toBe("completed");
      expect(finalDrill.debrief).toBeDefined();

      // Assisted implementation must trigger a scheduled mistake repair
      expect(finalDrill.debrief?.demonstratedIndependence).toBe(false);
      expect(finalDrill.debrief?.hintsUsed).toBe(2);
      expect(finalDrill.debrief?.repairScheduled).toBe(true);
      expect(finalDrill.debrief?.reviewScheduled).toBe(true);

      // Verify the mistake repair actually landed in the repair ledger!
      const activeRepairs = await getActiveMistakeRepairs(testUserId);
      expect(activeRepairs.length).toBeGreaterThan(0);
      // sourceId stores the canonical attempt ObjectId (when submission succeeds) or
      // falls back to the problem slug. Either way it must be a non-empty string.
      expect(typeof activeRepairs[0].sourceId).toBe("string");
      expect(activeRepairs[0].sourceId.length).toBeGreaterThan(0);
      expect(activeRepairs[0].sourceType).toBe("problem_attempt");
    });
  });
});

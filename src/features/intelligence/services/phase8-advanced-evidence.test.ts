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
} from "@/features/learning/models/learning.model";
import {
  RevisionQueueModel,
  LearningDeliveryModel,
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
  seedTrackDefinitions,
  getPublishedTracks,
  getTrackBySlug,
  enrollInTrack,
  getTrackAdaptiveSheetData,
} from "./track.service";
import {
  seedCheckpointFixtures,
  startCheckpointSession,
  submitCheckpointAttempt,
} from "./checkpoint.service";
import {
  createOrGetMistakeRepair,
  recordRepairActivityCompleted,
  recordRepairFollowUpOutcome,
  getActiveMistakeRepairs,
} from "./mistake-repair.service";
import {
  startOrResumeInterviewDrill,
  advanceInterviewStep,
} from "@/features/learning/services/interview-drill.service";
import {
  calculateScheduleCapacity,
  generateReplanProposal,
  acceptReplanProposal,
} from "./journey.service";

// Mock next/cache and auth
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
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

let replSet: MongoMemoryReplSet;

describe("Phase 8 — Validate Track and Advanced Learning Evidence Suite", () => {
  let testUserId: Types.ObjectId;
  let testTopicId: Types.ObjectId;
  let testProblemId: Types.ObjectId;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);

    // Create Indexes
    await TrackModel.createIndexes();
    await TrackEnrollmentModel.createIndexes();
    await CheckpointItemModel.createIndexes();
    await CheckpointSessionModel.createIndexes();
    await CheckpointAttemptModel.createIndexes();
    await MistakeRepairModel.createIndexes();
    await InterviewDrillModel.createIndexes();
    await JourneyModel.createIndexes();
    await LearningCommandModel.createIndexes();
    await PracticeSessionModel.createIndexes();
    await ProblemAttemptModel.createIndexes();
    await RevisionQueueModel.createIndexes();
    await UserTopicProgressModel.createIndexes();
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  beforeEach(async () => {
    await TrackModel.deleteMany({});
    await TrackEnrollmentModel.deleteMany({});
    await CheckpointItemModel.deleteMany({});
    await CheckpointSessionModel.deleteMany({});
    await CheckpointAttemptModel.deleteMany({});
    await MistakeRepairModel.deleteMany({});
    await InterviewDrillModel.deleteMany({});
    await JourneyModel.deleteMany({});
    await LearningCommandModel.deleteMany({});
    await PracticeSessionModel.deleteMany({});
    await ProblemAttemptModel.deleteMany({});
    await RevisionQueueModel.deleteMany({});
    await LearningDeliveryModel.deleteMany({});
    await LearningEventModel.deleteMany({});
    await UserTopicProgressModel.deleteMany({});
    await UserModel.deleteMany({});
    await UserProfileModel.deleteMany({});
    await ProblemModel.deleteMany({});
    await TopicModel.deleteMany({});
    await PlanModel.deleteMany({});
    await PlanDayModel.deleteMany({});
    await PlanTaskModel.deleteMany({});

    testUserId = new Types.ObjectId();
    testTopicId = new Types.ObjectId();
    testProblemId = new Types.ObjectId();

    await UserModel.create({
      _id: testUserId,
      email: `phase8_learner_${Date.now()}@example.com`,
      name: "Phase 8 Learner",
    });

    await UserProfileModel.create({
      userId: testUserId,
      learningEpoch: 1,
      onboarding: { status: "completed" },
    });

    await TopicModel.create({
      _id: testTopicId,
      name: "Arrays",
      slug: "arrays",
      description: "Array data structures and two-pointer algorithms",
      difficulty: "beginner",
      order: 1,
      estimatedMinutes: 60,
      isPublished: true,
    });

    await ProblemModel.create({
      _id: testProblemId,
      title: "Two Sum II - Input Array Is Sorted",
      slug: "two-sum-ii-input-array-is-sorted",
      summary: "Find two numbers in sorted array that add up to target.",
      topicIds: [testTopicId],
      patternIds: [],
      difficulty: "medium",
      estimatedMinutes: 20,
      source: "leetcode",
      sourceUrl: "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/",
      hints: [],
      status: "published",
      isPublished: true,
    });
  });

  // =========================================================================
  // 1. TRACK-001 & TRACK-002: Track Service, Seeding, and Linkage
  // =========================================================================
  describe("1. TRACK-001 & TRACK-002: Track Service, Seeding, and Linkage", () => {
    it("getPublishedTracks and getTrackBySlug do NOT seed database on read queries", async () => {
      // Prior to query, Track collection is empty
      const countBefore = await TrackModel.countDocuments();
      expect(countBefore).toBe(0);

      // Read published tracks
      const tracks = await getPublishedTracks();
      expect(tracks.length).toBeGreaterThan(0);
      expect(tracks[0].trackSlug).toBe("arrays-and-pointers");

      // Verify DB count is STILL 0 (read-only static fallback, no write on read!)
      const countAfter = await TrackModel.countDocuments();
      expect(countAfter).toBe(0);

      // Query single track by slug
      const single = await getTrackBySlug("arrays-and-pointers");
      expect(single).toBeDefined();
      expect(single?.trackSlug).toBe("arrays-and-pointers");

      const countAfterSingle = await TrackModel.countDocuments();
      expect(countAfterSingle).toBe(0);
    });

    it("enrollInTrack is idempotent and associates with current epoch", async () => {
      await seedTrackDefinitions();

      const res1 = await enrollInTrack({
        userId: testUserId,
        trackSlug: "arrays-and-pointers",
      });
      expect(res1.isNewEnrollment).toBe(true);
      expect(res1.enrollment.status).toBe("active");
      expect(res1.enrollment.trackSlug).toBe("arrays-and-pointers");
      expect(res1.enrollment.learningEpoch).toBe(1);

      // Second enrollment call is idempotent
      const res2 = await enrollInTrack({
        userId: testUserId,
        trackSlug: "arrays-and-pointers",
      });
      expect(res2.isNewEnrollment).toBe(false);
      expect(res2.enrollment._id.toString()).toBe(res1.enrollment._id.toString());
    });

    it("enrollInTrack does NOT silently link an unrelated active plan", async () => {
      await seedTrackDefinitions();

      // Create an active plan focused on Dynamic Programming
      await PlanModel.create({
        userId: testUserId,
        status: "active",
        source: "onboarding",
        version: 1,
        goal: "interview_prep",
        experienceLevel: "intermediate",
        language: "javascript",
        totalDays: 14,
        dailyMinutes: 45,
        timezone: "Asia/Kolkata",
        startDate: new Date(),
        snapshots: {
          plannerVersion: "1.0.0",
          curriculumVersion: "2026.1",
          primaryTopicSlug: "dynamic-programming",
          inputSnapshot: { dailyMinutes: 45, totalDays: 14 },
          availabilitySnapshot: { status: "ready", availableMissionsCount: 1, availableProblemsCount: 2 },
          estimatedScheduleSnapshot: [],
        },
      });

      // Enroll in Arrays track
      const { enrollment } = await enrollInTrack({
        userId: testUserId,
        trackSlug: "arrays-and-pointers",
      });

      // Invariant TRACK-001: unrelated DP plan must NOT be silently linked
      expect(enrollment.planId).toBeNull();
    });

    it("getTrackAdaptiveSheetData accurately computes isPlannedToday using canonical resolveCurrentPlanDay", async () => {
      await seedTrackDefinitions();
      await seedCheckpointFixtures();

      // Create an active plan for Arrays
      const plan = await PlanModel.create({
        userId: testUserId,
        status: "active",
        source: "onboarding",
        version: 1,
        goal: "interview_prep",
        experienceLevel: "intermediate",
        language: "javascript",
        totalDays: 14,
        dailyMinutes: 45,
        timezone: "Asia/Kolkata",
        startDate: new Date(),
        snapshots: {
          plannerVersion: "1.0.0",
          curriculumVersion: "2026.1",
          primaryTopicSlug: "arrays",
          inputSnapshot: { dailyMinutes: 45, totalDays: 14 },
          availabilitySnapshot: { status: "ready", availableMissionsCount: 1, availableProblemsCount: 2 },
          estimatedScheduleSnapshot: [],
        },
      });

      const day = await PlanDayModel.create({
        planId: plan._id,
        userId: testUserId,
        dayIndex: 1,
        dateKey: new Date().toISOString().slice(0, 10),
        status: "in_progress",
        phase: "guided_practice",
        title: "Day 1 Practice",
        focus: "Arrays and Pointers",
        topicId: testTopicId,
        topicSlug: "arrays",
        topicName: "Arrays",
        targetMinutes: 45,
        actualMinutes: 0,
        isBufferDay: false,
        isCheckpointDay: false,
      });

      // Planned problem task for today
      await PlanTaskModel.create({
        planId: plan._id,
        planDayId: day._id,
        userId: testUserId,
        dayIndex: 1,
        order: 1,
        taskKey: "task_two_sum_ii",
        phase: "practice",
        title: "Solve Two Sum II",
        entityType: "problem",
        entityId: testProblemId,
        completionRequirement: "solve_problem",
        planRelation: "planned_today",
        required: true,
        status: "pending",
        estimatedMinutes: 20,
        actualMinutes: 0,
      });

      const sheet = await getTrackAdaptiveSheetData(testUserId, "arrays-and-pointers");
      const unit1 = sheet.units.find((u) => u.unitId === "unit-1-inward-search");
      expect(unit1).toBeDefined();

      const probItem = unit1?.items.find((i) => i.slugOrKey === "two-sum-ii-input-array-is-sorted");
      expect(probItem).toBeDefined();
      // INVARIANT TRACK-001: Problem is marked isPlannedToday via canonical task
      expect(probItem?.isPlannedToday).toBe(true);
    });

    it("TRACK-002: requires all units, transfer evidence, and clear retention for track completion", async () => {
      await seedTrackDefinitions();
      await seedCheckpointFixtures();

      const sheet = await getTrackAdaptiveSheetData(testUserId, "arrays-and-pointers");
      expect(sheet.stats.isTrackCompleted).toBe(false);
      expect(sheet.stats.completionSummary?.status).toBe("in_progress");
    });
  });

  // =========================================================================
  // 2. CHK-001 & CHK-002: Checkpoints, Monotonic Assistance & Transfer
  // =========================================================================
  describe("2. CHK-001 & CHK-002: Checkpoints, Monotonic Assistance & Transfer", () => {
    it("startCheckpointSession freezes item version and hides rubric answer key", async () => {
      await seedCheckpointFixtures();

      const res = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-invariant",
      });

      expect(res.session).toBeDefined();
      expect(res.session.sessionId).toMatch(/^chk-sess-/);
      expect(res.session.itemVersion).toBe("1.0.0");
      expect(res.session.hintsUsed).toBe(0);

      // INVARIANT: Rubric answer key is NOT exposed to client
      expect(res.item.options.length).toBeGreaterThan(0);
      for (const opt of res.item.options) {
        expect((opt as any).isCorrect).toBeUndefined();
        expect((opt as any).explanation).toBeUndefined();
      }
    });

    it("submitCheckpointAttempt rejects invalid or unowned sessionId instead of falling back to itemKey", async () => {
      await seedCheckpointFixtures();

      await expect(
        submitCheckpointAttempt({
          userId: testUserId,
          sessionId: "fake-session-id-12345",
          selectedOptionKey: "B",
        })
      ).rejects.toThrow("Invalid or unowned checkpoint session.");
    });

    it("submitCheckpointAttempt enforces monotonic assistance (client cannot decrease hints)", async () => {
      await seedCheckpointFixtures();

      // Start session with 2 hints used
      const { session } = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-invariant",
        hintsUsed: 2,
        solutionViewed: false,
      });

      // Learner submits attempt claiming 0 hints
      const result = await submitCheckpointAttempt({
        userId: testUserId,
        sessionId: session.sessionId,
        selectedOptionKey: "B", // Correct option
        hintsUsed: 0,           // Malicious or mismatched attempt to claim 0 hints
      });

      expect(result.isCorrect).toBe(true);
      // INVARIANT: Server assistance is monotonic, so demonstratedIndependence MUST be false
      expect(result.demonstratedIndependence).toBe(false);

      const dbAttempt = await CheckpointAttemptModel.findById(result.attempt._id);
      expect(dbAttempt?.demonstratedIndependence).toBe(false);
    });

    it("conservative transfer evidence: novel variant yields transfer evidence, repeat does not", async () => {
      await seedCheckpointFixtures();

      // Start first session for variant transfer checkpoint
      const { session: sess1 } = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-transfer",
      });

      const res1 = await submitCheckpointAttempt({
        userId: testUserId,
        sessionId: sess1.sessionId,
        selectedOptionKey: "B", // Correct option
      });

      expect(res1.isCorrect).toBe(true);
      expect(res1.demonstratedIndependence).toBe(true);

      const att1 = await CheckpointAttemptModel.findById(res1.attempt._id);
      // First-seen variant: transfer evidence is granted
      expect(att1?.isTransferEvidence).toBe(true);

      // Repeat session on same variant
      const { session: sess2 } = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-transfer",
      });

      const res2 = await submitCheckpointAttempt({
        userId: testUserId,
        sessionId: sess2.sessionId,
        selectedOptionKey: "B",
      });

      const att2 = await CheckpointAttemptModel.findById(res2.attempt._id);
      // INVARIANT: Repeating an already-exposed variant does NOT grant first-seen transfer evidence
      expect(att2?.priorExposureCount).toBeGreaterThan(0);
      expect(att2?.isTransferEvidence).toBe(false);
    });
  });

  // =========================================================================
  // 3. REPAIR-001: Mistake Repair Lifecycle & Mastery Protection
  // =========================================================================
  describe("3. REPAIR-001: Mistake Repair Lifecycle & Mastery Protection", () => {
    it("incorrect checkpoint submission triggers deduplicated mistake repair referencing source attempt", async () => {
      await seedCheckpointFixtures();

      const { session } = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-invariant",
      });

      // Submit incorrect option A
      const res = await submitCheckpointAttempt({
        userId: testUserId,
        sessionId: session.sessionId,
        selectedOptionKey: "A",
      });

      expect(res.isCorrect).toBe(false);

      const activeRepairs = await getActiveMistakeRepairs(testUserId);
      expect(activeRepairs.length).toBe(1);
      const repair = activeRepairs[0];

      expect(repair.capability).toBe("two_pointers_invariant");
      expect(repair.sourceType).toBe("checkpoint_attempt");
      // INVARIANT: References the actual source attempt ID
      expect(repair.sourceId).toBe(String(res.attempt._id));
      expect(repair.status).toBe("pending");
    });

    it("recordRepairActivityCompleted sets activity_completed without resolving repair", async () => {
      const repair = await createOrGetMistakeRepair({
        userId: testUserId,
        sourceType: "checkpoint_attempt",
        sourceId: "att_source_01",
        capability: "two_pointers_invariant",
        topicSlug: "arrays",
        explicitMisconception: "incorrect_invariant",
      });

      const updated = await recordRepairActivityCompleted(repair.repairId, testUserId);
      expect(updated.status).toBe("activity_completed");
      expect(updated.completedAt).toBeDefined();

      // INVARIANT: Still active/unresolved because follow-up recheck is pending!
      const active = await getActiveMistakeRepairs(testUserId);
      expect(active.length).toBe(1);
    });

    it("recordRepairFollowUpOutcome resolves repair without arbitrary mastery inflation", async () => {
      const repair = await createOrGetMistakeRepair({
        userId: testUserId,
        sourceType: "checkpoint_attempt",
        sourceId: "att_source_02",
        capability: "boundary_reasoning",
        topicSlug: "arrays",
        explicitMisconception: "boundary_condition_issue",
      });

      await UserTopicProgressModel.create({
        userId: testUserId,
        learningEpoch: 1,
        topicSlug: "arrays",
        masteryScore: 40,
        coveragePct: 50,
      });

      // Resolve repair
      const resolved = await recordRepairFollowUpOutcome({
        repairId: repair.repairId,
        userId: testUserId,
        passed: true,
        independent: true,
        score: 100,
      });

      expect(resolved.status).toBe("follow_up_passed");

      // Verify mastery was NOT arbitrarily incremented by $inc: { masteryScore: 5 }
      const topicProg = await UserTopicProgressModel.findOne({
        userId: testUserId,
        topicSlug: "arrays",
      });
      expect(topicProg?.masteryScore).toBe(40);
    });
  });

  // =========================================================================
  // 4. FLOW-002: Interview Drill Joins Canonical Practice Lifecycle
  // =========================================================================
  describe("4. FLOW-002: Interview Drill Joins Canonical Practice Lifecycle", () => {
    it("finalizing interview drill creates canonical ProblemAttempt, schedules review, and produces factual debrief", async () => {
      const drill = await startOrResumeInterviewDrill({
        userId: testUserId,
        problemSlug: "two-sum-ii-input-array-is-sorted",
        timeboxMinutes: 30,
      });

      expect(drill.status).toBe("active");
      expect(drill.currentStep).toBe(1);

      // Advance through steps 1 to 4
      await advanceInterviewStep({
        drillId: drill.drillId,
        userId: testUserId,
        step: 1,
        response: { notes: "1-indexed sorted array with distinct solution" },
      });
      await advanceInterviewStep({
        drillId: drill.drillId,
        userId: testUserId,
        step: 2,
        response: { strategy: "two_pointers" },
      });
      await advanceInterviewStep({
        drillId: drill.drillId,
        userId: testUserId,
        step: 3,
        response: {
          selfReportedStatus: "solved",
          hintsUsed: 0,
          solutionViewed: false,
        },
      });
      await advanceInterviewStep({
        drillId: drill.drillId,
        userId: testUserId,
        step: 4,
        response: { verifiedBoundaries: true },
      });

      // Advance step 5 -> finalizes drill
      const finalized = await advanceInterviewStep({
        drillId: drill.drillId,
        userId: testUserId,
        step: 5,
        response: { timeComplexity: "O(n)", spaceComplexity: "O(1)" },
      });

      expect(finalized.status).toBe("completed");
      expect(finalized.currentStep).toBe(6);

      // INVARIANT FLOW-002: Canonical ProblemAttemptModel MUST be created in DB!
      const attempts = await ProblemAttemptModel.find({
        userId: testUserId,
        problemId: testProblemId,
      });
      expect(attempts.length).toBe(1);
      expect(attempts[0].status).toBe("solved");
      expect(attempts[0].strategy).toBe("independent");

      // INVARIANT FLOW-002: Review queue item was automatically scheduled by executePracticeSubmission
      const queueItem = await RevisionQueueModel.findOne({
        userId: testUserId,
        entityId: testProblemId,
      });
      expect(queueItem).toBeDefined();
      expect(queueItem?.state).toBe("scheduled");

      // INVARIANT: Debrief language is factual without unsupported claims
      expect(finalized.debrief?.factualOutcome).toContain("self-reported solve");
      expect(finalized.debrief?.factualOutcome).not.toContain("verified O(1) space invariant");
    });
  });

  // =========================================================================
  // 5. JOURNEY-001: Journey Feasibility & Replan Proposal Application
  // =========================================================================
  describe("5. JOURNEY-001: Journey Feasibility & Replan Proposal Application", () => {
    it("calculateScheduleCapacity reports infeasible when daily minutes cannot cover workload without shrinking estimates", () => {
      const assessment = calculateScheduleCapacity({
        startDate: new Date(),
        deadline: new Date(Date.now() + 2 * 86400000), // 2 calendar days
        studyDaysPerWeek: 2,
        dailyMinutes: 15,
        requiredMinutes: 180, // Needs 180m, but 2 days * 15m = 30m
      });

      expect(assessment.isFeasible).toBe(false);
      expect(assessment.capacityShortfallMinutes).toBeGreaterThan(0);
      expect(assessment.recommendation).toBeDefined();
    });

    it("acceptReplanProposal updates linked plan and rejects stale proposals", async () => {
      const plan = await PlanModel.create({
        userId: testUserId,
        status: "active",
        source: "onboarding",
        version: 1,
        goal: "interview_prep",
        experienceLevel: "intermediate",
        language: "javascript",
        totalDays: 14,
        dailyMinutes: 30,
        timezone: "Asia/Kolkata",
        startDate: new Date(),
        snapshots: {
          plannerVersion: "1.0.0",
          curriculumVersion: "2026.1",
          primaryTopicSlug: "arrays",
          inputSnapshot: { dailyMinutes: 30, totalDays: 14 },
          availabilitySnapshot: { status: "ready", availableMissionsCount: 1, availableProblemsCount: 2 },
          estimatedScheduleSnapshot: [],
        },
      });

      const journey = await JourneyModel.create({
        userId: testUserId,
        learningEpoch: 1,
        status: "active",
        goal: "interview_prep",
        curriculumSlice: "arrays-and-pointers",
        curriculumVersion: "1.0.0",
        weeklyAvailability: {
          studyDaysPerWeek: 4,
          dailyMinutes: 30,
          availableDaysOfWeek: [1, 2, 3, 4],
          timezone: "Asia/Kolkata",
        },
        startDate: new Date(),
        currentCycleNumber: 1,
        activePlanId: plan._id,
        version: 1,
        replanHistory: [],
      });

      // Generate Replan Proposal
      const proposal = await generateReplanProposal({
        userId: testUserId,
        journeyId: journey._id,
        trigger: "availability_change",
        proposedAvailability: {
          dailyMinutes: 60,
          studyDaysPerWeek: 5,
        },
      });

      expect(proposal.status).toBe("proposed");
      expect(proposal.beforeSnapshot.version).toBe(1);

      // Apply Replan Proposal
      const result = await acceptReplanProposal({
        userId: testUserId,
        journeyId: journey._id,
        replanId: proposal.replanId,
      });

      expect(result.success).toBe(true);
      expect(result.newVersion).toBe(2);

      // Verify linked active plan was calibrated to 60m
      const updatedPlan = await PlanModel.findById(plan._id);
      expect(updatedPlan?.dailyMinutes).toBe(60);
      expect(updatedPlan?.version).toBe(2);

      // INVARIANT JOURNEY-001: Trying to accept a stale proposal with mismatched base version throws STALE_PROPOSAL
      const staleProposal = {
        replanId: "stale-replan-999",
        trigger: "manual" as const,
        triggeredAt: new Date(),
        reason: "Stale proposal test",
        beforeSnapshot: {
          dailyMinutes: 30,
          studyDaysPerWeek: 4,
          version: 1, // Base version is 1, but journey version is now 2!
        },
        proposedChanges: {
          dailyMinutes: 75,
          studyDaysPerWeek: 5,
          diffSummary: "Stale change",
          whatStays: [],
          whatMoves: [],
          whatIsAdded: [],
        },
        status: "proposed" as const,
      };

      await JourneyModel.updateOne(
        { _id: journey._id },
        { $push: { replanHistory: staleProposal } }
      );

      await expect(
        acceptReplanProposal({
          userId: testUserId,
          journeyId: journey._id,
          replanId: staleProposal.replanId,
        })
      ).rejects.toThrow("STALE_PROPOSAL");
    });
  });
});

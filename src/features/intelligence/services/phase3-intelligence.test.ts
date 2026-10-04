import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import { PlanModel } from "../models/plan.model";
import { PlanDayModel } from "../models/plan-day.model";
import { PlanTaskModel } from "../models/plan-task.model";
import { TopicModel, MissionModel } from "@/features/content/models/content.model";
import { IntelligenceDecisionModel } from "../models/intelligence-decision.model";
import { UserTopicProgressModel } from "../models/user-topic-progress.model";
import { RevisionQueueModel } from "@/features/intelligence/models/intelligence.model";
import { JourneyModel } from "../models/journey.model";
import { CheckpointItemModel, CheckpointAttemptModel } from "../models/checkpoint-item.model";
import { LearningEventModel } from "../models/learning-event.model";
import { evaluateNextTaskDecision } from "../decisions/decision-policy";
import { resolveAuthoritativeLearningAction } from "../decisions/decision-selector";
import {
  createPreparationJourney,
  getActiveJourney,
  calculateScheduleCapacity,
  generateReplanProposal,
  acceptReplanProposal,
} from "./journey.service";
import {
  seedCheckpointFixtures,
  submitCheckpointAttempt,
  getEligibleCheckpointItems,
} from "./checkpoint.service";
import { activateCanonicalPlanForUser } from "./plan-migration.service";
import { generateCanonicalPlan } from "../planning/canonical-planner";
import type { PlannerInput } from "../types/intelligence.types";

let mongod: MongoMemoryServer;
let currentMockUserId: string = new Types.ObjectId().toString();

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/auth-guard", () => ({
  requireUserId: vi.fn(() => Promise.resolve(currentMockUserId)),
}));

describe("Phase 3: Intelligence Acceptance Test Suite", () => {
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
    await RevisionQueueModel.syncIndexes();
    await IntelligenceDecisionModel.syncIndexes();
    await JourneyModel.syncIndexes();
    await CheckpointItemModel.syncIndexes();
    await CheckpointAttemptModel.syncIndexes();
    await LearningEventModel.syncIndexes();
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    currentMockUserId = new Types.ObjectId().toString();
    await PlanModel.deleteMany({});
    await PlanDayModel.deleteMany({});
    await PlanTaskModel.deleteMany({});
    await TopicModel.deleteMany({});
    await MissionModel.deleteMany({});
    await RevisionQueueModel.deleteMany({});
    await IntelligenceDecisionModel.deleteMany({});
    await JourneyModel.deleteMany({});
    await CheckpointItemModel.deleteMany({});
    await CheckpointAttemptModel.deleteMany({});
    await LearningEventModel.deleteMany({});
  });

  // Helper to establish a valid active plan and curriculum environment
  async function seedTestEnvironment() {
    const userObjectId = new Types.ObjectId(currentMockUserId);

    const topic = await TopicModel.create({
      name: "Arrays & Pointers",
      slug: "arrays",
      order: 1,
      difficulty: "easy",
      estimatedMinutes: 60,
      description: "Foundational memory access and dual pointer invariants",
      isPublished: true,
    });

    await MissionModel.create({
      title: "Arrays Mechanics",
      slug: "arrays-mechanics",
      topicId: topic._id as Types.ObjectId,
      order: 1,
      estimatedMinutes: 20,
      difficulty: "easy",
      description: "Interactive mission for Arrays",
      isPublished: true,
      steps: [],
    });

    const input: PlannerInput = {
      learningGoal: "placement",
      focusTopicSlugs: ["arrays"],
      knownTopicSlugs: [],
      companySlugs: [],
      dailyMinutes: 45,
      experienceLevel: "intermediate",
      language: "python",
      timezone: "UTC",
    };

    const blueprint = generateCanonicalPlan(input, 1);
    const { plan, days, tasks } = await activateCanonicalPlanForUser({
      userId: currentMockUserId,
      blueprint,
      input,
      source: "customized",
    });

    const day1 = days[0];
    const day1Tasks = tasks.filter((t) => t.planDayId.toString() === day1._id.toString());
    const task1 = day1Tasks[0];
    const task2 = day1Tasks[1] || day1Tasks[0];

    // Calibrate task 1 to 35m and task 2 to 10m for explicit time budget testing
    await PlanTaskModel.updateOne({ _id: task1._id }, { $set: { estimatedMinutes: 35 } });
    task1.estimatedMinutes = 35;
    if (day1Tasks[1]) {
      await PlanTaskModel.updateOne(
        { _id: day1Tasks[1]._id },
        { $set: { estimatedMinutes: 10, required: false } }
      );
      day1Tasks[1].estimatedMinutes = 10;
      day1Tasks[1].required = false;
    }

    const day2 = days[1];
    const day2Task = tasks.find((t) => t.planDayId.toString() === day2?._id.toString());

    return { userObjectId, plan, day1, task1, task2: day1Tasks[1] || task2, day2, day2Task };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 1. ONE EXPLAINABLE NEXT-ACTION POLICY (#7)
  // ════════════════════════════════════════════════════════════════════════════
  describe("#7: Next-Action Decision Policy", () => {
    it("preserves commit order and selects the next required task in plan-led mode", async () => {
      const { task1 } = await seedTestEnvironment();

      const decision = await evaluateNextTaskDecision({
        userId: currentMockUserId,
        surface: "dashboard_card",
      });

      expect(decision).not.toBeNull();
      expect(decision?.selectedAction.title).toBe(task1.title);
      expect(decision?.selectedAction.estimatedMinutes).toBe(35);
      expect(decision?.reasonCodes).toContain("plan_required_next");
      expect(decision?.timeBudgetExceeded).toBe(false);
    });

    it("prioritizes an in_progress task over any pending task to maintain continuity", async () => {
      const { task1 } = await seedTestEnvironment();

      // Put task 1 into in_progress state
      await PlanTaskModel.updateOne({ _id: task1._id }, { $set: { status: "in_progress" } });

      const decision = await evaluateNextTaskDecision({
        userId: currentMockUserId,
        surface: "dashboard_card",
      });

      expect(decision).not.toBeNull();
      expect(decision?.selectedAction.title).toBe(task1.title);
      expect(decision?.selectedAction.isInProgress).toBe(true);
      expect(decision?.reasonCodes).toContain("plan_in_progress");
      expect(decision?.primaryReason).toContain("Task in progress");
    });

    it("sources due reviews canonically from RevisionQueueModel instead of obsolete proxies", async () => {
      const { userObjectId } = await seedTestEnvironment();

      // Seed a due revision queue item
      const revQueueItem = await RevisionQueueModel.create({
        userId: userObjectId,
        entityType: "problem",
        entityId: new Types.ObjectId(),
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 1,
        lapses: 0,
        source: "attempt",
        state: "due",
        dueAt: new Date(Date.now() - 3600000), // Due 1 hour ago
      });

      // Complete both today's plan tasks so plan-led schedule is done
      await PlanTaskModel.updateMany({ dayIndex: 1 }, { $set: { status: "completed" } });

      const decision = await evaluateNextTaskDecision({
        userId: currentMockUserId,
        surface: "dashboard_card",
      });

      expect(decision).not.toBeNull();
      expect(decision?.selectedAction.actionKey).toBe(`review-${revQueueItem._id}`);
      expect(decision?.reasonCodes).toContain("revision_due");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. HONEST TIME-BUDGET HANDLING (#7)
  // ════════════════════════════════════════════════════════════════════════════
  describe("#7: Time Budget Constraints", () => {
    it("never shrinks an estimated 35m task when the learner only has 15m; surfaces a genuine shorter alternative", async () => {
      await seedTestEnvironment();

      const decision = await evaluateNextTaskDecision({
        userId: currentMockUserId,
        availableMinutes: 15,
        surface: "dashboard_card",
      });

      expect(decision).not.toBeNull();
      // Primary retains its honest 35-minute duration!
      expect(decision?.selectedAction.estimatedMinutes).toBe(35);
      expect(decision?.timeBudgetExceeded).toBe(true);
      expect(decision?.reasonCodes).toContain("time_budget_exceeded");

      // Surfaces an authentic alternative that fits the 15-minute window
      expect(decision?.timeBudgetAlternative).toBeDefined();
      expect(decision?.timeBudgetAlternative?.estimatedMinutes).toBeLessThanOrEqual(15);
    });

    it("surfaces honest no-fit when no available task fits the available time", async () => {
      await seedTestEnvironment();

      // Learner only has 2 minutes (no task fits: task 1 is 35m, task 2 is 10m, reflection is 5m)
      const decision = await evaluateNextTaskDecision({
        userId: currentMockUserId,
        availableMinutes: 2,
        surface: "dashboard_card",
      });

      expect(decision).not.toBeNull();
      expect(decision?.selectedAction.estimatedMinutes).toBe(35);
      expect(decision?.timeBudgetExceeded).toBe(true);
      expect(decision?.timeBudgetAlternative).toBeNull();
      expect(decision?.reasonCodes).toContain("no_fit_budget");
      expect(decision?.secondaryReasons).toEqual(
        expect.arrayContaining([expect.stringContaining("No shorter activity currently fits")])
      );
    });

    it("synchronizes NextSessionHero selector contract with decision policy", async () => {
      const { plan, day1, task1, task2 } = await seedTestEnvironment();

      const result = await resolveAuthoritativeLearningAction({
        userId: currentMockUserId,
        activePlan: plan,
        currentPlanDay: day1,
        todayTasks: [task1, task2],
        availableMinutes: 15,
        persistDecision: false,
      });

      expect(result.primaryAction.title).toBe(task1.title);
      expect(result.primaryAction.estimatedDurationMinutes).toBe(35); // Unchanged!
      expect(result.primaryAction.timeBudgetExceeded).toBe(true);
      expect(result.primaryAction.timeBudgetAvailableMinutes).toBe(15);
      expect(result.primaryAction.timeBudgetAlternative?.estimatedMinutes).toBe(10);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. GOAL-AWARE PREPARATION JOURNEYS (#8)
  // ════════════════════════════════════════════════════════════════════════════
  describe("#8: MVP Preparation Journey", () => {
    it("creates an active journey with milestone partitions for arrays-and-pointers", async () => {
      const { plan } = await seedTestEnvironment();

      const { journey } = await createPreparationJourney({
        userId: currentMockUserId,
        goal: "interview_prep",
        targetProfile: { experienceLevel: "intermediate" },
        deadline: new Date(Date.now() + 30 * 86400000), // 30 days out
        weeklyAvailability: {
          studyDaysPerWeek: 5,
          dailyMinutes: 45,
          availableDaysOfWeek: [1, 2, 3, 4, 5],
          timezone: "UTC",
        },
      });

      expect(journey).toBeDefined();
      expect(journey.curriculumSlice).toBe("arrays-and-pointers");
      expect(journey.status).toBe("active");
      expect(journey.milestones.length).toBeGreaterThanOrEqual(3);
      expect(journey.milestones[0].title).toBe("Milestone 1: Two Pointers Mechanics & Invariants");
    });

    it("calculates realistic schedule capacity partitioning (40% learn, 35% practice, 15% review, 10% buffer)", () => {
      const now = new Date();
      const capacity = calculateScheduleCapacity({
        startDate: now,
        deadline: new Date(now.getTime() + 28 * 86400000),
        studyDaysPerWeek: 5,
        dailyMinutes: 60,
        availableDaysOfWeek: [1, 2, 3, 4, 5],
        requiredMinutes: 180,
      });

      expect(capacity.totalCapacityMinutes).toBeGreaterThanOrEqual(1000);
      expect(capacity.isFeasible).toBe(true);
      expect(capacity.capacityAllocation.learningMinutes).toBe(Math.round(capacity.totalCapacityMinutes * 0.4));
      expect(capacity.capacityAllocation.practiceMinutes).toBe(Math.round(capacity.totalCapacityMinutes * 0.35));
      expect(capacity.capacityAllocation.reviewMinutes).toBe(Math.round(capacity.totalCapacityMinutes * 0.15));
      expect(capacity.capacityAllocation.bufferMinutes).toBe(Math.round(capacity.totalCapacityMinutes * 0.1));
    });

    it("flags an infeasible schedule when target deadline has inadequate study capacity", () => {
      const now = new Date();
      const capacity = calculateScheduleCapacity({
        startDate: now,
        deadline: new Date(now.getTime() + 5 * 86400000),
        studyDaysPerWeek: 1,
        dailyMinutes: 20,
        availableDaysOfWeek: [1],
        requiredMinutes: 180,
      });

      expect(capacity.isFeasible).toBe(false);
      expect(capacity.capacityShortfallMinutes).toBeGreaterThan(0);
      expect(capacity.recommendation).toBeDefined();
      expect(capacity.recommendation?.suggestedDailyMinutes).toBeGreaterThanOrEqual(20);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. VERSIONED REPLAN PROPOSALS & SAFE ACCEPTANCE (#8)
  // ════════════════════════════════════════════════════════════════════════════
  describe("#8: Replan Proposals and Safe Application", () => {
    it("generates an explainable replan proposal specifying whatStays, whatMoves, and whatIsAdded", async () => {
      const { plan } = await seedTestEnvironment();

      const { journey } = await createPreparationJourney({
        userId: currentMockUserId,
        goal: "interview_prep",
        targetProfile: { experienceLevel: "intermediate" },
        weeklyAvailability: {
          studyDaysPerWeek: 4,
          dailyMinutes: 45,
          availableDaysOfWeek: [1, 2, 4, 5],
          timezone: "UTC",
        },
      });

      const proposal = await generateReplanProposal({
        userId: currentMockUserId,
        journeyId: journey._id.toString(),
        trigger: "availability_change",
        reason: "Learner reduced weekly study days from 5 to 4.",
        proposedAvailability: {
          studyDaysPerWeek: 4,
          dailyMinutes: 45,
        },
      });

      expect(proposal.trigger).toBe("availability_change");
      expect(proposal.proposedChanges.whatStays.length).toBeGreaterThan(0);
      expect(proposal.proposedChanges.whatMoves.length).toBeGreaterThan(0);
      expect(proposal.proposedChanges.diffSummary).toContain("Adjusting future schedule");
    });

    it("strictly preserves completed tasks and only mutates future unstarted plan days", async () => {
      const { plan, task1, day2 } = await seedTestEnvironment();

      // Complete Day 1 Task 1
      await PlanTaskModel.updateOne({ _id: task1._id }, { $set: { status: "completed", completedAt: new Date() } });

      const { journey } = await createPreparationJourney({
        userId: currentMockUserId,
        goal: "interview_prep",
        targetProfile: { experienceLevel: "intermediate" },
        weeklyAvailability: {
          studyDaysPerWeek: 5,
          dailyMinutes: 45,
          availableDaysOfWeek: [1, 2, 3, 4, 5],
          timezone: "UTC",
        },
      });

      const proposal = await generateReplanProposal({
        userId: currentMockUserId,
        journeyId: journey._id.toString(),
        trigger: "missed_commitments",
        reason: "One day missed; realigning future tasks.",
      });

      const applyResult = await acceptReplanProposal({
        userId: currentMockUserId,
        journeyId: journey._id.toString(),
        replanId: proposal.replanId,
      });

      expect(applyResult.success).toBe(true);

      // Verify Completed task is UNTOUCHED
      const refreshedTask1 = await PlanTaskModel.findById(task1._id);
      expect(refreshedTask1?.status).toBe("completed");
      expect(refreshedTask1?.completedAt).not.toBeNull();

      // Verify Journey replan record marked accepted
      const refreshedJourney = await JourneyModel.findById(journey._id);
      const appliedReplan = refreshedJourney?.replanHistory.find((r: any) => r.replanId === proposal.replanId);
      expect(appliedReplan?.status).toBe("accepted");
      expect(appliedReplan?.appliedAt).toBeDefined();

      // Verify idempotent re-acceptance produces identical success without error
      const secondApply = await acceptReplanProposal({
        userId: currentMockUserId,
        journeyId: journey._id.toString(),
        replanId: proposal.replanId,
      });
      expect(secondApply.success).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5. REVIEWED CHECKPOINT FOUNDATIONS (#9)
  // ════════════════════════════════════════════════════════════════════════════
  describe("#9: Checkpoint Foundations & Review Honesty", () => {
    it("seeds 3 reviewed foundation items with review_ready status and rubric criteria", async () => {
      await seedCheckpointFixtures();

      const items = await CheckpointItemModel.find({ topicSlug: "arrays" });
      expect(items.length).toBeGreaterThanOrEqual(3);

      const invariantItem = items.find((i: any) => i.itemKey === "chk-two-sum-ii-invariant");
      expect(invariantItem).toBeDefined();
      expect(invariantItem?.reviewStatus).toBe("review_ready");
      expect(invariantItem?.evaluationRubric.options?.length).toBe(4);
      expect(invariantItem?.capability).toBe("two_pointers_invariant");
    });

    it("evaluates candidate answer deterministically against rubric and records checkpoint_attempted event", async () => {
      await seedCheckpointFixtures();

      // Submit correct option B for chk-two-sum-ii-invariant
      const result = await submitCheckpointAttempt({
        userId: currentMockUserId,
        itemKey: "chk-two-sum-ii-invariant",
        selectedOptionKey: "B",
        durationSeconds: 95,
      });

      expect(result.isCorrect).toBe(true);
      expect(result.score).toBe(100);
      expect(result.reviewStatus).toBe("review_ready");
      expect(result.isProvisional).toBe(true); // Honest attribution!

      // Check CheckpointAttemptModel record
      const attempt = await CheckpointAttemptModel.findOne({
        userId: new Types.ObjectId(currentMockUserId),
        itemKey: "chk-two-sum-ii-invariant",
      });
      expect(attempt).not.toBeNull();
      expect(attempt?.isCorrect).toBe(true);
      expect(attempt?.score).toBe(100);

      // Check LearningEventModel was emitted
      const event = await LearningEventModel.findOne({
        userId: new Types.ObjectId(currentMockUserId),
        eventType: "checkpoint_attempted",
      });
      expect(event).not.toBeNull();
      expect(event?.payload.itemKey).toBe("chk-two-sum-ii-invariant");
      expect(event?.payload.score).toBe(100);
    });

    it("evaluates incorrect answer with 0 score and provides formative feedback", async () => {
      await seedCheckpointFixtures();

      // Submit incorrect option A
      const result = await submitCheckpointAttempt({
        userId: currentMockUserId,
        itemKey: "chk-two-sum-ii-invariant",
        selectedOptionKey: "A",
        durationSeconds: 40,
      });

      expect(result.isCorrect).toBe(false);
      expect(result.score).toBe(0);
      expect(result.feedback).toContain("non-increases the sum");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 6. RESET & LEARNING-EPOCH ISOLATION
  // ════════════════════════════════════════════════════════════════════════════
  describe("Reset & Epoch Fencing", () => {
    it("fences active journeys so previous epoch journeys are not returned after an epoch reset", async () => {
      const { plan } = await seedTestEnvironment();

      // Create journey in Epoch 1
      const { journey } = await createPreparationJourney({
        userId: currentMockUserId,
        goal: "interview_prep",
        targetProfile: { experienceLevel: "intermediate" },
        weeklyAvailability: {
          studyDaysPerWeek: 5,
          dailyMinutes: 45,
          availableDaysOfWeek: [1, 2, 3, 4, 5],
          timezone: "UTC",
        },
      });

      expect(journey.learningEpoch).toBe(1);

      // Verify active journey found in Epoch 1
      const activeJourney = await getActiveJourney(currentMockUserId);
      expect(activeJourney).not.toBeNull();
      expect(activeJourney?._id.toString()).toBe(journey._id.toString());

      // Advance user learning epoch to 2 (simulating reset)
      await mongoose.connection.collection("users").updateOne(
        { _id: new Types.ObjectId(currentMockUserId) },
        { $set: { learningEpoch: 2 } },
        { upsert: true }
      );

      // Now query active journey in epoch 2 — must return null (clean isolation!)
      const activeJourneyEpoch2 = await getActiveJourney(currentMockUserId);
      expect(activeJourneyEpoch2).toBeNull();
    });
  });
});

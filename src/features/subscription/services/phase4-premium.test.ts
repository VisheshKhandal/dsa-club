import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
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
  SubscriptionModel,
  CheckoutOrderModel,
  MockTransactionReceiptModel,
} from "../models/subscription.model";
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
import {
  seedCheckpointFixtures,
  getEligibleCheckpointItems,
  startCheckpointSession,
  submitCheckpointAttempt,
  APPROVED_CHECKPOINT_FIXTURES,
} from "@/features/intelligence/services/checkpoint.service";
import {
  seedTrackDefinitions,
  getTrackBySlug,
  enrollInTrack,
  getTrackAdaptiveSheetData,
  ARRAYS_TRACK_DEFINITION,
} from "@/features/intelligence/services/track.service";
import {
  evaluateEntitlement,
  getLearnerEntitlementSnapshot,
  getEffectiveSubscription,
} from "./entitlement.service";
import {
  createCheckoutOrder,
  processSimulatedCheckout,
  activateSubscriptionFromOrder,
} from "./checkout.service";
import {
  cancelSubscriptionAtPeriodEnd,
  reactivateSubscription,
  getBillingReceipts,
} from "./subscription.service";
import { PLAN_CATALOG, type PlanTier } from "../plans";

let mongod: MongoMemoryServer;
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

describe("Phase 4: Premium Value, Reviewed Checkpoints, Track, and Subscription Foundations", () => {
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);

    await CheckpointItemModel.syncIndexes();
    await CheckpointAttemptModel.syncIndexes();
    await CheckpointSessionModel.syncIndexes();
    await TrackModel.syncIndexes();
    await TrackEnrollmentModel.syncIndexes();
    await SubscriptionModel.syncIndexes();
    await CheckoutOrderModel.syncIndexes();
    await MockTransactionReceiptModel.syncIndexes();
    await UserTopicProgressModel.syncIndexes();
    await LearningEventModel.syncIndexes();
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
    await SubscriptionModel.deleteMany({});
    await CheckoutOrderModel.deleteMany({});
    await MockTransactionReceiptModel.deleteMany({});
    await ProblemAttemptModel.deleteMany({});
    await PracticeSessionModel.deleteMany({});
    await UserTopicProgressModel.deleteMany({});
    await LearningEventModel.deleteMany({});
    await JourneyModel.deleteMany({});
    await PlanModel.deleteMany({});
  });

  describe("A. Checkpoint Correctness, Session Freezing, and Honest Evidence", () => {
    it("reads do not mutate or auto-seed content, and strip correct answers before submission", async () => {
      // 1. Explicit seeding
      await seedCheckpointFixtures({ includeApproved: true });

      // 2. Pure read
      const items = await getEligibleCheckpointItems("arrays");
      expect(items.length).toBeGreaterThanOrEqual(3);

      // 3. Start a session to freeze assigned version
      const { session, item } = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-invariant",
      });

      expect(session.sessionId).toBeDefined();
      expect(session.itemKey).toBe("chk-two-sum-ii-invariant");
      expect(session.itemVersion).toBe("1.0.0");
      expect(session.status).toBe("started");

      // Verify that options presented do NOT reveal isCorrect or explanations
      expect(item.options.length).toBe(4);
      for (const opt of item.options) {
        expect((opt as any).isCorrect).toBeUndefined();
        expect((opt as any).explanation).toBeUndefined();
      }
    });

    it("evaluates submission against exact frozen item version and rejects invalid option keys", async () => {
      await seedCheckpointFixtures({ includeApproved: true });

      const { session } = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-invariant",
      });

      // Reject non-existent option key "Z" rather than treating as valid incorrect answer
      await expect(
        submitCheckpointAttempt({
          userId: testUserId,
          sessionId: session.sessionId,
          selectedOptionKey: "Z",
        })
      ).rejects.toThrow(/Invalid option key "Z"/);

      // Submit valid correct option B
      const result = await submitCheckpointAttempt({
        userId: testUserId,
        sessionId: session.sessionId,
        selectedOptionKey: "B",
      });

      expect(result.isCorrect).toBe(true);
      expect(result.score).toBe(100);
      expect(result.demonstratedIndependence).toBe(true);
      expect(result.attempt.itemVersion).toBe("1.0.0");
    });

    it("distinguishes assistance from independence: hints or editorial solutions negate demonstrated independence", async () => {
      await seedCheckpointFixtures({ includeApproved: true });

      // Session with hints revealed
      const { session: assistedSession } = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-invariant",
        hintsUsed: 2,
        solutionViewed: false,
      });

      const result = await submitCheckpointAttempt({
        userId: testUserId,
        sessionId: assistedSession.sessionId,
        selectedOptionKey: "B", // Correct answer
      });

      expect(result.isCorrect).toBe(true);
      expect(result.score).toBe(100);
      // Honest evidence: even though answer is correct, assistance was used
      expect(result.demonstratedIndependence).toBe(false);
    });

    it("ensures submission idempotency: retrying with the same session returns the stable result without duplicate attempts", async () => {
      await seedCheckpointFixtures({ includeApproved: true });

      const { session } = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-boundary",
      });

      const firstResult = await submitCheckpointAttempt({
        userId: testUserId,
        sessionId: session.sessionId,
        selectedOptionKey: "B",
      });

      // Immediate retry of same session
      const secondResult = await submitCheckpointAttempt({
        userId: testUserId,
        sessionId: session.sessionId,
        selectedOptionKey: "B",
      });

      expect(String(firstResult.attempt._id)).toBe(String(secondResult.attempt._id));
      expect(firstResult.score).toBe(secondResult.score);

      // Verify only 1 attempt document exists
      const totalAttempts = await CheckpointAttemptModel.countDocuments({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-boundary",
      });
      expect(totalAttempts).toBe(1);
    });

    it("distinguishes approved/authoritative items from review_ready provisional items", async () => {
      await seedCheckpointFixtures({ includeApproved: true });

      // Item 1: review_ready (provisional)
      const res1 = await submitCheckpointAttempt({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-invariant",
        selectedOptionKey: "B",
      });
      expect(res1.reviewStatus).toBe("review_ready");
      expect(res1.isProvisional).toBe(true);

      // Item 2: approved standard
      const res2 = await submitCheckpointAttempt({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-constraint",
        selectedOptionKey: "B",
      });
      expect(res2.reviewStatus).toBe("approved");
      expect(res2.isProvisional).toBe(false);
    });
  });

  describe("B. Preparation Track & Adaptive Sheet Engine", () => {
    it("resolves canonical track contract with explicit scope, workload, and excluded topics", async () => {
      await seedTrackDefinitions();

      const track = await getTrackBySlug("arrays-and-pointers");
      expect(track).toBeDefined();
      expect(track?.title).toBe("Arrays and Two-Pointers Preparation Track");
      expect(track?.workloadHours).toBe(3.5);
      expect(track?.units.length).toBe(3);
      expect(track?.excludedTopics).toContain("Graph pathfinding and topological sorts");
      expect(track?.completionCriteria.minCompletedProblems).toBe(2);
      expect(track?.completionCriteria.minCheckpointsPassed).toBe(2);
    });

    it("allows track enrollment without commercial paywalls (Phase 5 Non-Commercial Architecture)", async () => {
      await seedTrackDefinitions();

      // Free user enrollment succeeds without artificial paywall gates
      const { enrollment, isNewEnrollment } = await enrollInTrack({
        userId: testUserId,
        trackSlug: "arrays-and-pointers",
      });
      expect(isNewEnrollment).toBe(true);
      expect(enrollment.status).toBe("active");

      // Idempotent retry: re-enrolling returns existing without duplicate
      const retry = await enrollInTrack({
        userId: testUserId,
        trackSlug: "arrays-and-pointers",
      });
      expect(retry.isNewEnrollment).toBe(false);
      expect(String(retry.enrollment._id)).toBe(String(enrollment._id));
    });

    it("adaptive sheet unifies canonical progress, problem attempts, and checkpoint records without parallel database", async () => {
      await seedTrackDefinitions();
      await seedCheckpointFixtures({ includeApproved: true });

      // Create a problem in DB matching track problemSlugs
      const problem = await ProblemModel.create({
        title: "Two Sum",
        slug: "two-sum",
        difficulty: "easy",
        summary: "Find two numbers that add up to target",
        source: "internal",
        sourceUrl: "/problems/two-sum",
        estimatedMinutes: 20,
        isPublished: true,
        topicIds: [],
        patternIds: [],
      });

      // Record a canonical problem attempt for this user
      await ProblemAttemptModel.create({
        userId: testUserId,
        learningEpoch: 1,
        problemId: problem._id,
        status: "solved",
        strategy: "independent",
        passed: true,
        hintsUsed: 0,
        independentSolve: true,
        perceivedDifficulty: 3,
        selfConfidence: 4,
        startedAt: new Date(Date.now() - 600000),
        durationSeconds: 600,
        completedAt: new Date(),
      });

      // Record a checkpoint attempt
      await submitCheckpointAttempt({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-invariant",
        selectedOptionKey: "B",
      });

      // Record/update topic progress
      await UserTopicProgressModel.findOneAndUpdate(
        { userId: testUserId, learningEpoch: 1, topicSlug: "arrays" },
        {
          $set: {
            masteryScore: 75,
            completedCount: 2,
            independentSolveCount: 2,
            attemptedCount: 2,
            totalMinutesSpent: 40,
            reviewDueAt: new Date(Date.now() - 3600000), // Due 1 hour ago
          },
        },
        { upsert: true, new: true }
      );

      const sheetData = await getTrackAdaptiveSheetData(testUserId, "arrays-and-pointers");
      expect(sheetData.track.trackSlug).toBe("arrays-and-pointers");

      // Check stats
      expect(sheetData.stats.completedProblems).toBe(1);
      expect(sheetData.stats.passedCheckpoints).toBe(1);
      expect(sheetData.stats.masteryScore).toBe(75);
      expect(sheetData.stats.reviewDue).toBe(true);

      // Check unit items
      const unit1 = sheetData.units[0];
      const twoSumItem = unit1.items.find((i) => i.slugOrKey === "two-sum");
      expect(twoSumItem?.status).toBe("solved");
      expect(twoSumItem?.demonstratedIndependence).toBe(true);

      const chkItem = unit1.items.find((i) => i.slugOrKey === "chk-two-sum-ii-invariant");
      expect(chkItem?.status).toBe("passed");
    });
  });

  describe("C. Centralized Entitlements & Subscription Catalog", () => {
    it("evaluates capabilities accurately for Free, Elite, and Pro tiers", async () => {
      // 1. Free learner
      const freeSnapshot = await getLearnerEntitlementSnapshot(testUserId);
      expect(freeSnapshot.tier).toBe("free");
      expect(freeSnapshot.capabilities.trackEnrollment).toBe(false);
      expect(freeSnapshot.capabilities.reviewedCheckpoints).toBe(false);

      const freeTrackDec = await evaluateEntitlement({
        userId: testUserId,
        capability: "track_enrollment",
      });
      expect(freeTrackDec.decision).toBe("upgrade_required");
      expect(freeTrackDec.minimumEligiblePlan).toBe("pro");

      const freePreviewDec = await evaluateEntitlement({
        userId: testUserId,
        capability: "track_view",
      });
      expect(freePreviewDec.decision).toBe("preview_available");

      // 2. Elite learner
      await SubscriptionModel.create({
        userId: testUserId,
        planTier: "elite",
        status: "active",
        catalogVersion: "2026.1-demo",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      });

      const eliteChkDec = await evaluateEntitlement({
        userId: testUserId,
        capability: "checkpoint_submit",
      });
      expect(eliteChkDec.decision).toBe("allowed");

      const eliteTrackDec = await evaluateEntitlement({
        userId: testUserId,
        capability: "track_enrollment",
      });
      expect(eliteTrackDec.decision).toBe("upgrade_required");
      expect(eliteTrackDec.minimumEligiblePlan).toBe("pro");

      // 3. Pro learner
      await SubscriptionModel.updateOne(
        { userId: testUserId },
        { $set: { planTier: "pro" } }
      );

      const proTrackDec = await evaluateEntitlement({
        userId: testUserId,
        capability: "track_enrollment",
      });
      expect(proTrackDec.decision).toBe("allowed");
    });

    it("DSA Club Max is marked unavailable for purchase without purchase CTAs", () => {
      const maxPlan = PLAN_CATALOG["max"];
      expect(maxPlan.isAvailableForPurchase).toBe(false);
      expect(maxPlan.unavailableReason).toBeDefined();
    });

    it("cancellation preserves access and historical records until currentPeriodEnd", async () => {
      const currentPeriodEnd = new Date(Date.now() + 14 * 86400000); // 14 days left
      await SubscriptionModel.create({
        userId: testUserId,
        planTier: "pro",
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd,
      });

      // Schedule cancellation
      await cancelSubscriptionAtPeriodEnd({ userId: testUserId });

      // Effective access is STILL Pro during the paid period
      const effective = await getEffectiveSubscription(testUserId);
      expect(effective.effectiveTier).toBe("pro");
      expect(effective.isActive).toBe(true);
      expect(effective.subscription?.cancelAtPeriodEnd).toBe(true);

      // Reactivate
      await reactivateSubscription(testUserId);
      const reactivated = await getEffectiveSubscription(testUserId);
      expect(reactivated.subscription?.cancelAtPeriodEnd).toBe(false);
    });
  });

  describe("D. Simulated Checkout Lifecycle & Durable Activation", () => {
    it("validates quotes, prevents duplicate purchases, and blocks Max tier purchases", async () => {
      // 1. Max purchase attempt rejected
      await expect(
        createCheckoutOrder({
          userId: testUserId,
          targetPlanTier: "max",
        })
      ).rejects.toThrow(/preview/);

      // 2. Normal order creation
      const order = await createCheckoutOrder({
        userId: testUserId,
        targetPlanTier: "pro",
      });
      expect(order.orderId).toBeDefined();
      expect(order.quote.amountMinorUnits).toBe(99900);
      expect(order.status).toBe("awaiting_method");

      // 3. Duplicate purchase prevention when already subscribed
      await SubscriptionModel.create({
        userId: testUserId,
        planTier: "pro",
        status: "active",
        catalogVersion: "2026.1-demo",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      });

      await expect(
        createCheckoutOrder({
          userId: testUserId,
          targetPlanTier: "pro",
        })
      ).rejects.toThrow(/already have an active subscription/);
    });

    it("completes simulated payment lifecycle and idempotently activates subscription with receipt", async () => {
      const order = await createCheckoutOrder({
        userId: testUserId,
        targetPlanTier: "pro",
      });

      const result = await processSimulatedCheckout({
        orderId: order.orderId,
        userId: testUserId,
        methodType: "upi",
        testScenario: "success",
        methodDetails: { upiId: "learner@okhdfcbank" },
      });

      expect(result.ok).toBe(true);
      expect(result.status).toBe("activated");

      // Verify active subscription
      const sub = await SubscriptionModel.findOne({ userId: testUserId });
      expect(sub?.planTier).toBe("pro");
      expect(sub?.status).toBe("active");
      expect(sub?.simulatedPaymentMethod?.type).toBe("upi");

      // Verify demonstration receipt
      const receipts = await getBillingReceipts(testUserId);
      expect(receipts.length).toBe(1);
      expect(receipts[0].isDemonstration).toBe(true);
      expect(receipts[0].amountMinorUnits).toBe(99900);

      // Repeated call is completely idempotent
      const retryResult = await processSimulatedCheckout({
        orderId: order.orderId,
        userId: testUserId,
        methodType: "upi",
      });
      expect(retryResult.ok).toBe(true);
      expect(retryResult.status).toBe("activated");

      // Still only 1 receipt exists
      const receiptsAfter = await getBillingReceipts(testUserId);
      expect(receiptsAfter.length).toBe(1);
    });

    it("handles simulated failure scenarios without activating access", async () => {
      const order = await createCheckoutOrder({
        userId: testUserId,
        targetPlanTier: "elite",
      });

      const result = await processSimulatedCheckout({
        orderId: order.orderId,
        userId: testUserId,
        methodType: "card",
        testScenario: "insufficient_funds",
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe("failed");

      // Subscription must NOT be activated
      const sub = await SubscriptionModel.findOne({ userId: testUserId });
      expect(sub).toBeNull();
    });

    it("prevents delayed older successes from downgrading a newer higher-tier subscription", async () => {
      // User has active Pro plan
      await SubscriptionModel.create({
        userId: testUserId,
        planTier: "pro",
        status: "active",
        catalogVersion: "2026.1-demo",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      });

      // An older delayed order for Elite succeeds
      const delayedEliteOrder = await CheckoutOrderModel.create({
        orderId: "ord_delayed_elite",
        userId: testUserId,
        planTier: "elite",
        catalogVersion: "2026.1-demo",
        quote: { amountMinorUnits: 49900, currency: "INR", displayAmount: "₹499" },
        status: "processing",
        attemptId: "att_delayed",
      });

      await activateSubscriptionFromOrder(delayedEliteOrder, {
        status: "succeeded",
        providerTransactionId: "mock_txn_delayed",
        providerSessionRef: "mock_sess_delayed",
        simulatedPaymentMethodSummary: "Card •••• 4242",
        methodType: "card",
        timestamp: new Date(),
      });

      // User must STILL be Pro!
      const currentSub = await SubscriptionModel.findOne({ userId: testUserId });
      expect(currentSub?.planTier).toBe("pro");
    });
  });

  describe("E. End-to-End Preparation Track & Premium Commercial Flow", () => {
    it("completes full flow: preview -> upgrade -> enroll -> practice -> checkpoint -> sheet reflect", async () => {
      await seedTrackDefinitions();
      await seedCheckpointFixtures({ includeApproved: true });

      // 1. Free learner previews the track
      const sheetPreview = await getTrackAdaptiveSheetData(testUserId, "arrays-and-pointers");
      expect(sheetPreview.enrollment).toBeNull();
      expect(sheetPreview.track.title).toBe("Arrays and Two-Pointers Preparation Track");

      // 2. Learner initiates checkout for Pro
      const order = await createCheckoutOrder({
        userId: testUserId,
        targetPlanTier: "pro",
      });

      // 3. Completes simulated payment
      const paymentRes = await processSimulatedCheckout({
        orderId: order.orderId,
        userId: testUserId,
        methodType: "upi",
        testScenario: "success",
      });
      expect(paymentRes.ok).toBe(true);

      // 4. Entitlements refresh
      const snapshot = await getLearnerEntitlementSnapshot(testUserId);
      expect(snapshot.tier).toBe("pro");
      expect(snapshot.capabilities.trackEnrollment).toBe(true);

      // 5. Learner enrolls in track
      const { enrollment } = await enrollInTrack({
        userId: testUserId,
        trackSlug: "arrays-and-pointers",
      });
      expect(enrollment.status).toBe("active");

      // 6. Completes a reviewed checkpoint with frozen session
      const { session } = await startCheckpointSession({
        userId: testUserId,
        itemKey: "chk-two-sum-ii-constraint",
      });

      const checkpointRes = await submitCheckpointAttempt({
        userId: testUserId,
        sessionId: session.sessionId,
        selectedOptionKey: "B", // O(1) auxiliary space
      });
      expect(checkpointRes.isCorrect).toBe(true);
      expect(checkpointRes.reviewStatus).toBe("approved");

      // 7. Verify adaptive sheet now reflects the passed checkpoint and active enrollment
      const sheetUpdated = await getTrackAdaptiveSheetData(testUserId, "arrays-and-pointers");
      expect(sheetUpdated.enrollment?.status).toBe("active");
      expect(sheetUpdated.stats.passedCheckpoints).toBe(1);

      const chkItem = sheetUpdated.units[1].items.find(
        (i) => i.slugOrKey === "chk-two-sum-ii-constraint"
      );
      expect(chkItem?.status).toBe("passed");
    });
  });
});

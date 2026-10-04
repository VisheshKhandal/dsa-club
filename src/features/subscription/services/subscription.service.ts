import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  SubscriptionModel,
  MockTransactionReceiptModel,
  type ISubscriptionDocument,
  type IMockTransactionReceiptDocument,
} from "../models/subscription.model";
import { getEffectiveSubscription } from "./entitlement.service";
import { PLAN_CATALOG, CATALOG_VERSION, type PlanTier } from "../plans";

/**
 * Retrieves the user's active subscription, or returns a default Free tier representation.
 */
export async function getSubscription(
  userId: string | Types.ObjectId
): Promise<{
  subscription: ISubscriptionDocument | null;
  effectiveTier: PlanTier;
  isActive: boolean;
}> {
  return getEffectiveSubscription(userId);
}

/**
 * Cancels a subscription at the end of the current period.
 * PRESERVES all historical attempts, solved records, reviews, and personal notes!
 */
export async function cancelSubscriptionAtPeriodEnd(params: {
  userId: string | Types.ObjectId;
  reason?: string;
}): Promise<ISubscriptionDocument> {
  await connectToDatabase();
  const userObjectId =
    params.userId instanceof Types.ObjectId
      ? params.userId
      : new Types.ObjectId(params.userId);

  const sub = await SubscriptionModel.findOne({ userId: userObjectId });
  if (!sub) {
    throw new Error("No active subscription found to cancel.");
  }

  if (sub.planTier === "free") {
    throw new Error("Free tier cannot be cancelled.");
  }

  sub.cancelAtPeriodEnd = true;
  sub.canceledAt = new Date();
  sub.history.push({
    event: "subscription_cancellation_scheduled",
    fromTier: sub.planTier,
    toTier: sub.planTier,
    at: new Date(),
    reason: params.reason || "Learner requested cancellation at period end",
  });

  await sub.save();
  return sub;
}

/**
 * Reactivates a subscription that was scheduled for cancellation before the period ended.
 */
export async function reactivateSubscription(
  userId: string | Types.ObjectId
): Promise<ISubscriptionDocument> {
  await connectToDatabase();
  const userObjectId =
    userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);

  const sub = await SubscriptionModel.findOne({ userId: userObjectId });
  if (!sub) {
    throw new Error("No subscription found to reactivate.");
  }

  if (!sub.cancelAtPeriodEnd) {
    return sub;
  }

  sub.cancelAtPeriodEnd = false;
  sub.canceledAt = null;
  sub.history.push({
    event: "subscription_reactivated",
    fromTier: sub.planTier,
    toTier: sub.planTier,
    at: new Date(),
    reason: "Learner reactivated subscription",
  });

  await sub.save();
  return sub;
}

/**
 * Retrieves the simulated billing and receipt history for a learner.
 * Labeled explicitly as demonstration transactions.
 */
export async function getBillingReceipts(
  userId: string | Types.ObjectId
): Promise<IMockTransactionReceiptDocument[]> {
  await connectToDatabase();
  const userObjectId =
    userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);

  return MockTransactionReceiptModel.find({ userId: userObjectId })
    .sort({ issuedAt: -1 })
    .lean() as any;
}

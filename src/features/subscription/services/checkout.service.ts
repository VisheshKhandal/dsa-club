import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  CheckoutOrderModel,
  SubscriptionModel,
  MockTransactionReceiptModel,
  type ICheckoutOrderDocument,
  type PaymentMethodType,
} from "../models/subscription.model";
import { mockPaymentProvider } from "../adapters/mock-payment-provider.adapter";
import type { MockScenarioType, NormalizedPaymentResult } from "../adapters/payment-provider.interface";
import {
  PLAN_CATALOG,
  CATALOG_VERSION,
  getTierRank,
  type PlanTier,
} from "../plans";
import { getEffectiveSubscription } from "./entitlement.service";

export interface CreateCheckoutInput {
  userId: string | Types.ObjectId;
  targetPlanTier: PlanTier;
}

export interface ProcessCheckoutInput {
  orderId: string;
  userId: string | Types.ObjectId;
  methodType: PaymentMethodType;
  testScenario?: MockScenarioType;
  methodDetails?: Record<string, any>;
}

/**
 * Creates a new checkout order with stable identity and payment session reference.
 * Strictly validates availability and prevents same-plan or downgrade purchases.
 */
export async function createCheckoutOrder(
  input: CreateCheckoutInput
): Promise<ICheckoutOrderDocument> {
  await connectToDatabase();
  const userObjectId =
    input.userId instanceof Types.ObjectId
      ? input.userId
      : new Types.ObjectId(input.userId);

  const targetPlan = PLAN_CATALOG[input.targetPlanTier];
  if (!targetPlan) {
    throw new Error(`Plan tier "${input.targetPlanTier}" does not exist in catalog.`);
  }

  // 1. Validate plan availability
  if (!targetPlan.isAvailableForPurchase) {
    throw new Error(
      targetPlan.unavailableReason ||
        `Plan "${targetPlan.displayName}" is currently not available for purchase.`
    );
  }

  // 2. Validate current subscription state to prevent duplicate or invalid purchases
  const { effectiveTier, subscription } = await getEffectiveSubscription(userObjectId);
  if (effectiveTier === input.targetPlanTier && subscription?.status === "active") {
    throw new Error(`You already have an active subscription to ${targetPlan.displayName}.`);
  }

  const currentRank = getTierRank(effectiveTier);
  const targetRank = getTierRank(input.targetPlanTier);
  if (currentRank > targetRank && subscription?.status === "active") {
    throw new Error(
      `Your current plan (${PLAN_CATALOG[effectiveTier].displayName}) already provides higher access than ${targetPlan.displayName}.`
    );
  }

  // 3. Generate stable identifiers
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // 4. Create provider session through replaceable boundary
  const providerSession = await mockPaymentProvider.createPaymentSession({
    orderId,
    amountMinorUnits: targetPlan.priceMinorUnits,
    currency: targetPlan.currency,
    customerId: String(userObjectId),
  });

  // 5. Persist order
  const order = await CheckoutOrderModel.create({
    orderId,
    userId: userObjectId,
    planTier: input.targetPlanTier,
    catalogVersion: CATALOG_VERSION,
    quote: {
      amountMinorUnits: targetPlan.priceMinorUnits,
      currency: targetPlan.currency,
      displayAmount: targetPlan.displayPrice,
    },
    status: "awaiting_method",
    attemptId,
    providerSessionRef: providerSession.providerSessionRef,
  });

  return order;
}

/**
 * Recovers checkout order state on page refresh or across tabs.
 */
export async function getCheckoutOrder(
  orderId: string,
  userId: string | Types.ObjectId
): Promise<ICheckoutOrderDocument | null> {
  await connectToDatabase();
  const userObjectId =
    userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);

  return CheckoutOrderModel.findOne({ orderId, userId: userObjectId });
}

/**
 * Processes simulated checkout payment and idempotently activates subscription.
 */
export async function processSimulatedCheckout(
  input: ProcessCheckoutInput
): Promise<{
  ok: boolean;
  status: string;
  order: ICheckoutOrderDocument;
  message?: string;
}> {
  await connectToDatabase();
  const userObjectId =
    input.userId instanceof Types.ObjectId
      ? input.userId
      : new Types.ObjectId(input.userId);

  const order = await CheckoutOrderModel.findOne({
    orderId: input.orderId,
    userId: userObjectId,
  });

  if (!order) {
    throw new Error("Checkout order not found or unauthorized.");
  }

  // Idempotency: if already activated, return immediately
  if (order.status === "activated") {
    return { ok: true, status: "activated", order };
  }

  // Validate state
  if (order.status !== "awaiting_method" && order.status !== "failed") {
    throw new Error(
      `Cannot process order in state "${order.status}". Please start a new checkout session.`
    );
  }

  order.status = "processing";
  order.paymentMethodType = input.methodType;
  order.simulatedDetails = input.methodDetails || null;
  await order.save();

  // Call mock payment provider adapter
  const result: NormalizedPaymentResult = await mockPaymentProvider.processPaymentSimulation({
    providerSessionRef: order.providerSessionRef || `ref_${order.orderId}`,
    methodType: input.methodType,
    scenario: input.testScenario || "success",
    methodDetails: input.methodDetails,
  });

  if (result.status === "cancelled") {
    order.status = "cancelled";
    order.failureReason = result.errorMessage || "User cancelled payment";
    await order.save();
    return {
      ok: false,
      status: "cancelled",
      order,
      message: result.errorMessage,
    };
  }

  if (result.status === "failed") {
    order.status = "failed";
    order.failureReason = result.errorMessage || "Payment failed";
    await order.save();
    return {
      ok: false,
      status: "failed",
      order,
      message: result.errorMessage,
    };
  }

  // Provider succeeded -> durable activation step
  order.status = "confirming_activation";
  await order.save();

  await activateSubscriptionFromOrder(order, result);

  order.status = "activated";
  order.activatedAt = new Date();
  await order.save();

  return {
    ok: true,
    status: "activated",
    order,
  };
}

/**
 * Authoritatively activates a subscription from an order.
 * Ensures:
 * 1. An older delayed success cannot downgrade a newer plan.
 * 2. Repeated calls activate once and do not produce duplicate receipts.
 * 3. Safely records synthetic payment details and receipt.
 */
export async function activateSubscriptionFromOrder(
  order: ICheckoutOrderDocument,
  paymentResult: NormalizedPaymentResult
): Promise<void> {
  await connectToDatabase();

  // Deduplication check: Has a receipt already been generated for this order?
  const existingReceipt = await MockTransactionReceiptModel.findOne({
    orderId: order.orderId,
  });

  if (!existingReceipt) {
    const receiptId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await MockTransactionReceiptModel.create({
      receiptId,
      orderId: order.orderId,
      userId: order.userId,
      planTier: order.planTier,
      amountMinorUnits: order.quote.amountMinorUnits,
      currency: order.quote.currency,
      displayAmount: order.quote.displayAmount,
      paymentMethodSummary: paymentResult.simulatedPaymentMethodSummary,
      status: "paid",
      isDemonstration: true,
      issuedAt: new Date(),
    });
  }

  // Hierarchy check: Check if user already holds a higher tier
  const existingSub = await SubscriptionModel.findOne({ userId: order.userId });
  if (existingSub && existingSub.status === "active") {
    const existingRank = getTierRank(existingSub.planTier);
    const orderRank = getTierRank(order.planTier);

    if (existingRank > orderRank) {
      console.warn(
        `Prevented delayed downgrade: user already holds ${existingSub.planTier}, order is for ${order.planTier}.`
      );
      return;
    }
  }

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (existingSub) {
    const fromTier = existingSub.planTier;
    existingSub.planTier = order.planTier;
    existingSub.status = "active";
    existingSub.catalogVersion = order.catalogVersion;
    existingSub.currentPeriodStart = now;
    existingSub.currentPeriodEnd = periodEnd;
    existingSub.cancelAtPeriodEnd = false;
    existingSub.canceledAt = null;
    existingSub.simulatedPaymentMethod = {
      type: paymentResult.methodType,
      label: paymentResult.simulatedPaymentMethodSummary,
      providerRef: paymentResult.providerTransactionId,
    };
    existingSub.version += 1;
    existingSub.history.push({
      event: "subscription_activated",
      fromTier,
      toTier: order.planTier,
      at: now,
      orderId: order.orderId,
      reason: `Activated via simulated checkout (${paymentResult.methodType})`,
    });
    await existingSub.save();
  } else {
    await SubscriptionModel.create({
      userId: order.userId,
      planTier: order.planTier,
      status: "active",
      catalogVersion: order.catalogVersion,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      simulatedPaymentMethod: {
        type: paymentResult.methodType,
        label: paymentResult.simulatedPaymentMethodSummary,
        providerRef: paymentResult.providerTransactionId,
      },
      version: 1,
      history: [
        {
          event: "subscription_activated",
          toTier: order.planTier,
          at: now,
          orderId: order.orderId,
          reason: `Initial activation via simulated checkout (${paymentResult.methodType})`,
        },
      ],
    });
  }
}

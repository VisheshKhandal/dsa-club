"use server";

import { requireUserId } from "@/lib/auth-guard";
import {
  PLAN_CATALOG,
  ORDERED_PLAN_TIERS,
  CATALOG_VERSION,
  type PlanTier,
} from "../plans";
import {
  getLearnerEntitlementSnapshot,
  evaluateEntitlement,
  type EntitlementCapability,
} from "../services/entitlement.service";
import {
  getSubscription,
  cancelSubscriptionAtPeriodEnd,
  reactivateSubscription,
  getBillingReceipts,
} from "../services/subscription.service";
import {
  createCheckoutOrder,
  getCheckoutOrder,
  processSimulatedCheckout,
} from "../services/checkout.service";
import type { PaymentMethodType } from "../models/subscription.model";
import type { MockScenarioType } from "../adapters/payment-provider.interface";
import { revalidatePath } from "next/cache";
import { serializeForClient } from "@/lib/utils";

export async function getPlanCatalogAction() {
  return {
    ok: true,
    catalog: PLAN_CATALOG,
    orderedTiers: ORDERED_PLAN_TIERS,
    catalogVersion: CATALOG_VERSION,
  };
}

export async function getLearnerEntitlementSnapshotAction() {
  const userId = await requireUserId();
  const snapshot = await getLearnerEntitlementSnapshot(userId);
  return { ok: true, snapshot: serializeForClient(snapshot) };
}

export async function evaluateEntitlementAction(params: {
  capability: EntitlementCapability;
  resourceId?: string;
}) {
  const userId = await requireUserId();
  const result = await evaluateEntitlement({
    userId,
    capability: params.capability,
    resourceId: params.resourceId,
  });
  return { ok: true, result: serializeForClient(result) };
}

export async function getSubscriptionDetailsAction() {
  const userId = await requireUserId();
  const subData = await getSubscription(userId);
  const receipts = await getBillingReceipts(userId);

  return {
    ok: true,
    subscription: serializeForClient(subData.subscription),
    effectiveTier: subData.effectiveTier,
    isActive: subData.isActive,
    receipts: serializeForClient(receipts),
  };
}

export async function createCheckoutOrderAction(targetPlanTier: PlanTier) {
  const userId = await requireUserId();
  try {
    const order = await createCheckoutOrder({
      userId,
      targetPlanTier,
    });
    return { ok: true, order: serializeForClient(order) };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Failed to create checkout order." };
  }
}

export async function getCheckoutOrderAction(orderId: string) {
  const userId = await requireUserId();
  const order = await getCheckoutOrder(orderId, userId);
  if (!order) {
    return { ok: false, error: "Order not found." };
  }
  return { ok: true, order: serializeForClient(order) };
}

export async function processSimulatedCheckoutAction(params: {
  orderId: string;
  methodType: PaymentMethodType;
  testScenario?: MockScenarioType;
  methodDetails?: Record<string, any>;
}) {
  const userId = await requireUserId();
  try {
    const result = await processSimulatedCheckout({
      orderId: params.orderId,
      userId,
      methodType: params.methodType,
      testScenario: params.testScenario,
      methodDetails: params.methodDetails,
    });

    revalidatePath("/pricing");
    revalidatePath("/account");
    revalidatePath("/dashboard");
    revalidatePath("/tracks");

    return {
      ok: result.ok,
      status: result.status,
      order: serializeForClient(result.order),
      message: result.message,
    };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Payment simulation failed." };
  }
}

export async function cancelSubscriptionAction(reason?: string) {
  const userId = await requireUserId();
  try {
    const sub = await cancelSubscriptionAtPeriodEnd({ userId, reason });
    revalidatePath("/account");
    revalidatePath("/pricing");
    return { ok: true, subscription: serializeForClient(sub) };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Failed to cancel subscription." };
  }
}

export async function reactivateSubscriptionAction() {
  const userId = await requireUserId();
  try {
    const sub = await reactivateSubscription(userId);
    revalidatePath("/account");
    revalidatePath("/pricing");
    return { ok: true, subscription: serializeForClient(sub) };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Failed to reactivate subscription." };
  }
}


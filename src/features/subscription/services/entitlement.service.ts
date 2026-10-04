import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  SubscriptionModel,
  type ISubscriptionDocument,
} from "../models/subscription.model";
import {
  type PlanTier,
  getTierRank,
  CATALOG_VERSION,
} from "../plans";

export type EntitlementCapability =
  | "track_enrollment"
  | "track_view"
  | "checkpoint_submit"
  | "adaptive_replan"
  | "advanced_analytics"
  | "practice_problem";

export type EntitlementDecisionType =
  | "allowed"
  | "preview_available"
  | "upgrade_required"
  | "content_unavailable"
  | "subscription_unresolved";

export interface EntitlementDecision {
  decision: EntitlementDecisionType;
  capability: EntitlementCapability;
  resourceId?: string;
  minimumEligiblePlan?: PlanTier;
  reason: string;
  canPreview: boolean;
}

export interface LearnerEntitlementSnapshot {
  userId: string;
  tier: PlanTier;
  status: string;
  currentPeriodEnd?: Date | string | null;
  cancelAtPeriodEnd: boolean;
  catalogVersion: string;
  capabilities: {
    trackEnrollment: boolean;
    trackView: boolean;
    reviewedCheckpoints: boolean;
    adaptiveReplan: boolean;
    advancedAnalytics: boolean;
  };
}

/**
 * Resolves the active subscription and effective tier for a user.
 * Preserves access during cancellation until currentPeriodEnd.
 */
export async function getEffectiveSubscription(
  userId: string | Types.ObjectId
): Promise<{
  subscription: ISubscriptionDocument | null;
  effectiveTier: PlanTier;
  isActive: boolean;
}> {
  await connectToDatabase();
  const userObjectId =
    userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);

  const sub = await SubscriptionModel.findOne({ userId: userObjectId });
  if (!sub) {
    return {
      subscription: null,
      effectiveTier: "free",
      isActive: true,
    };
  }

  const now = new Date();

  // If status is canceled, check if we are still within the paid period
  if (sub.status === "canceled") {
    if (sub.currentPeriodEnd && now <= new Date(sub.currentPeriodEnd)) {
      return {
        subscription: sub,
        effectiveTier: sub.planTier,
        isActive: true,
      };
    }
    return {
      subscription: sub,
      effectiveTier: "free",
      isActive: false,
    };
  }

  // If expired or past due, revert to free
  if (sub.status === "expired" || sub.status === "past_due") {
    return {
      subscription: sub,
      effectiveTier: "free",
      isActive: false,
    };
  }

  return {
    subscription: sub,
    effectiveTier: sub.planTier,
    isActive: sub.status === "active",
  };
}

/**
 * Centralized entitlement evaluation service.
 * Never scatter `plan === "pro"` string checks in learning components!
 */
export async function evaluateEntitlement(params: {
  userId: string | Types.ObjectId;
  capability: EntitlementCapability;
  resourceId?: string;
}): Promise<EntitlementDecision> {
  const { userId, capability, resourceId } = params;
  const { effectiveTier } = await getEffectiveSubscription(userId);

  const userRank = getTierRank(effectiveTier);

  switch (capability) {
    case "track_enrollment": {
      // Track enrollment requires Pro (rank >= 2)
      const requiredTier: PlanTier = "pro";
      if (userRank >= getTierRank(requiredTier)) {
        return {
          decision: "allowed",
          capability,
          resourceId,
          reason: "Active DSA Club Pro entitlement.",
          canPreview: true,
        };
      }
      return {
        decision: "upgrade_required",
        capability,
        resourceId,
        minimumEligiblePlan: requiredTier,
        reason: "Preparation Track enrollment requires DSA Club Pro.",
        canPreview: true,
      };
    }

    case "track_view": {
      // Free and Elite users can always preview published tracks
      if (userRank >= getTierRank("pro")) {
        return {
          decision: "allowed",
          capability,
          resourceId,
          reason: "Full track view allowed.",
          canPreview: true,
        };
      }
      return {
        decision: "preview_available",
        capability,
        resourceId,
        minimumEligiblePlan: "pro",
        reason: "Track preview available. Upgrade to Pro to enroll.",
        canPreview: true,
      };
    }

    case "checkpoint_submit": {
      // Diagnostic checkpoints can be attempted on Elite or Pro
      const requiredTier: PlanTier = "elite";
      if (userRank >= getTierRank(requiredTier)) {
        return {
          decision: "allowed",
          capability,
          resourceId,
          reason: "Checkpoint submission and rubric grading active.",
          canPreview: true,
        };
      }
      return {
        decision: "upgrade_required",
        capability,
        resourceId,
        minimumEligiblePlan: requiredTier,
        reason: "Rubric-grounded checkpoint evaluation requires DSA Club Elite or Pro.",
        canPreview: true,
      };
    }

    case "adaptive_replan": {
      const requiredTier: PlanTier = "pro";
      if (userRank >= getTierRank(requiredTier)) {
        return {
          decision: "allowed",
          capability,
          resourceId,
          reason: "Adaptive journey replan allowed.",
          canPreview: true,
        };
      }
      return {
        decision: "upgrade_required",
        capability,
        resourceId,
        minimumEligiblePlan: requiredTier,
        reason: "Automated adaptive journey replanning requires DSA Club Pro.",
        canPreview: false,
      };
    }

    case "advanced_analytics": {
      const requiredTier: PlanTier = "pro";
      if (userRank >= getTierRank(requiredTier)) {
        return {
          decision: "allowed",
          capability,
          resourceId,
          reason: "Advanced insights allowed.",
          canPreview: true,
        };
      }
      return {
        decision: "upgrade_required",
        capability,
        resourceId,
        minimumEligiblePlan: requiredTier,
        reason: "Detailed preparation analytics require DSA Club Pro.",
        canPreview: false,
      };
    }

    case "practice_problem":
    default:
      return {
        decision: "allowed",
        capability,
        resourceId,
        reason: "Core practice problems are included in all plans.",
        canPreview: true,
      };
  }
}

/**
 * Returns a complete entitlement snapshot for the learner UI presentation.
 */
export async function getLearnerEntitlementSnapshot(
  userId: string | Types.ObjectId
): Promise<LearnerEntitlementSnapshot> {
  const { subscription, effectiveTier } = await getEffectiveSubscription(userId);
  const userRank = getTierRank(effectiveTier);

  return {
    userId: String(userId),
    tier: effectiveTier,
    status: subscription?.status || "active",
    currentPeriodEnd: subscription?.currentPeriodEnd || null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
    catalogVersion: subscription?.catalogVersion || CATALOG_VERSION,
    capabilities: {
      trackEnrollment: userRank >= getTierRank("pro"),
      trackView: true,
      reviewedCheckpoints: userRank >= getTierRank("elite"),
      adaptiveReplan: userRank >= getTierRank("pro"),
      advancedAnalytics: userRank >= getTierRank("pro"),
    },
  };
}

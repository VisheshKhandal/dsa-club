export type PlanTier = "free" | "elite" | "pro" | "max";

export interface IPlanCatalogItem {
  tier: PlanTier;
  name: string;
  displayName: string;
  tagline: string;
  priceMinorUnits: number; // in minor units (e.g. 49900 = 499.00 INR)
  currency: string;
  displayPrice: string;
  billingPeriod: "forever" | "monthly" | "yearly";
  isAvailableForPurchase: boolean;
  unavailableReason?: string;
  badge?: string;
  features: string[];
  limitations?: string[];
}

export const CATALOG_VERSION = "2026.1-demo";

/**
 * Authoritative Plan Catalog with explicit demonstration pricing and capabilities.
 * Order: Free -> DSA Club Elite -> DSA Club Pro -> DSA Club Max
 */
export const PLAN_CATALOG: Record<PlanTier, IPlanCatalogItem> = {
  free: {
    tier: "free",
    name: "Free",
    displayName: "Free",
    tagline: "Core learning foundations and daily practice habits.",
    priceMinorUnits: 0,
    currency: "INR",
    displayPrice: "₹0",
    billingPeriod: "forever",
    isAvailableForPurchase: false,
    badge: "Current Plan",
    features: [
      "Full access to the core learning loop & starter path",
      "Daily practice problems with durable saving",
      "Spaced review scheduling and retention tracking",
      "Diagnostic checkpoint question previews",
      "Explainable next-action recommendations",
      "Full personal attempt and solution history",
    ],
    limitations: [
      "Preparation track enrollment requires Pro",
      "Reviewed checkpoint scoring requires Elite/Pro",
    ],
  },
  elite: {
    tier: "elite",
    name: "DSA Club Elite",
    displayName: "DSA Club Elite",
    tagline: "Expanded practice collections and diagnostic evaluations.",
    priceMinorUnits: 49900,
    currency: "INR",
    displayPrice: "₹499 / mo",
    billingPeriod: "monthly",
    isAvailableForPurchase: true,
    badge: "Popular",
    features: [
      "Everything in Free",
      "Expanded topic practice problem sets",
      "Checkpoint rubric feedback & scoring",
      "Review queue prioritization and streak tracking",
      "Detailed error and boundary analysis",
    ],
    limitations: [
      "Complete preparation track with adaptive sheet requires Pro",
    ],
  },
  pro: {
    tier: "pro",
    name: "DSA Club Pro",
    displayName: "DSA Club Pro",
    tagline: "The complete delivered preparation experience.",
    priceMinorUnits: 99900,
    currency: "INR",
    displayPrice: "₹999 / mo",
    billingPeriod: "monthly",
    isAvailableForPurchase: true,
    badge: "Recommended",
    features: [
      "Everything in Elite",
      "Full Arrays and Two-Pointers Preparation Track",
      "Adaptive Sheet organizing preparation into unified milestones",
      "Approved and reviewed checkpoint evaluation with honest evidence",
      "Goal-aware adaptive study journey and versioned replans",
      "Evidence-grounded preparation insights and capability mastery",
    ],
  },
  max: {
    tier: "max",
    name: "DSA Club Max",
    displayName: "DSA Club Max",
    tagline: "Advanced multi-track interview readiness.",
    priceMinorUnits: 199900,
    currency: "INR",
    displayPrice: "₹1,999 / mo",
    billingPeriod: "monthly",
    isAvailableForPurchase: false, // In preview: no purchase CTA until deliverables are ready!
    unavailableReason:
      "DSA Club Max is currently in preview. Additional multi-track concurrent enrollments and live mock interview diagnostics are under active development.",
    badge: "In Preview",
    features: [
      "Everything in Pro",
      "Multi-track concurrent enrollments (Coming Soon)",
      "Live mock interview diagnostics (In Development)",
      "Custom curriculum authoring (In Development)",
    ],
  },
};

export const ORDERED_PLAN_TIERS: PlanTier[] = ["free", "elite", "pro", "max"];

/**
 * Returns tier numerical rank for hierarchy comparisons.
 */
export function getTierRank(tier: PlanTier): number {
  switch (tier) {
    case "free":
      return 0;
    case "elite":
      return 1;
    case "pro":
      return 2;
    case "max":
      return 3;
    default:
      return 0;
  }
}

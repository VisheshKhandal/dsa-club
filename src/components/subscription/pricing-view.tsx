"use client";

import React, { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  PLAN_CATALOG,
  ORDERED_PLAN_TIERS,
  type PlanTier,
  type IPlanCatalogItem,
} from "@/features/subscription/plans";
import type { LearnerEntitlementSnapshot } from "@/features/subscription/services/entitlement.service";
import {
  createCheckoutOrderAction,
  processSimulatedCheckoutAction,
} from "@/features/subscription/actions/subscription.actions";
import type { PaymentMethodType } from "@/features/subscription/models/subscription.model";
import type { MockScenarioType } from "@/features/subscription/adapters/payment-provider.interface";
import {
  Check,
  ShieldCheck,
  Zap,
  Sparkles,
  Lock,
  ArrowRight,
  CreditCard,
  Smartphone,
  Building,
  Wallet,
  AlertCircle,
  Clock,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PricingViewProps {
  initialSnapshot: LearnerEntitlementSnapshot;
}

export function PricingView({ initialSnapshot }: PricingViewProps) {
  const toast = useToast();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutOrder, setCheckoutOrder] = useState<any | null>(null);

  // Checkout modal form state
  const [methodType, setMethodType] = useState<PaymentMethodType>("upi");
  const [testScenario, setTestScenario] = useState<MockScenarioType>("success");
  const [upiId, setUpiId] = useState("learner@okhdfcbank");
  const [cardBrand, setCardBrand] = useState("Visa");
  const [bankName, setBankName] = useState("HDFC Bank");
  const [walletProvider, setWalletProvider] = useState("Demonstration Wallet");

  const [isPending, startTransition] = useTransition();
  const [checkoutStep, setCheckoutStep] = useState<
    "form" | "processing" | "success" | "error"
  >("form");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartCheckout = (tier: PlanTier) => {
    if (tier === "free") return;
    if (tier === "max") {
      toast.info("DSA Club Max is currently in preview and unavailable for purchase.");
      return;
    }
    if (tier === snapshot.tier && snapshot.status === "active") {
      toast.info(`You are already subscribed to ${PLAN_CATALOG[tier].displayName}.`);
      return;
    }

    setSelectedPlan(tier);
    setCheckoutStep("form");
    setErrorMessage(null);

    startTransition(async () => {
      const res = await createCheckoutOrderAction(tier);
      if (res.ok && res.order) {
        setCheckoutOrder(res.order);
        setCheckoutModalOpen(true);
      } else {
        toast.error(res.error || "Failed to start checkout session.");
      }
    });
  };

  const handleSimulatePayment = () => {
    if (!checkoutOrder) return;
    setCheckoutStep("processing");
    setErrorMessage(null);

    startTransition(async () => {
      const methodDetails: Record<string, any> = {};
      if (methodType === "upi") methodDetails.upiId = upiId;
      if (methodType === "card") methodDetails.brand = cardBrand;
      if (methodType === "netbanking") methodDetails.bankName = bankName;
      if (methodType === "wallet") methodDetails.walletProvider = walletProvider;

      const res = await processSimulatedCheckoutAction({
        orderId: checkoutOrder.orderId,
        methodType,
        testScenario,
        methodDetails,
      });

      if (res.ok && res.status === "activated") {
        setCheckoutStep("success");
        setSnapshot((prev) => ({
          ...prev,
          tier: checkoutOrder.planTier,
          status: "active",
          capabilities: {
            ...prev.capabilities,
            trackEnrollment: true,
            reviewedCheckpoints: true,
            adaptiveReplan: true,
            advancedAnalytics: true,
          },
        }));
        toast.success("Simulated payment succeeded! Subscription activated.");
        router.refresh();
      } else {
        setCheckoutStep("error");
        setErrorMessage(res.message || "Simulated payment failed.");
        toast.error(res.message || "Payment simulation failed.");
      }
    });
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Simulation Disclosure Header */}
      <div className="p-4 rounded-xl border border-(--accent-lime)/30 bg-(--accent-lime)/5 flex items-start gap-3.5">
        <ShieldCheck className="size-5 text-(--accent-lime) shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <div className="font-semibold text-(--text-primary) flex items-center gap-2">
            Commercial Demonstration Environment
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-(--accent-lime)/20 text-(--accent-lime)">
              SIMULATED
            </span>
          </div>
          <p className="text-(--text-secondary) leading-relaxed">
            All checkouts, activations, and payments in DSA Club are simulated
            through a replaceable provider boundary. <strong>No real money is charged</strong>,
            and no real credit cards, CVVs, or bank credentials are ever requested or collected.
          </p>
        </div>
      </div>

      {/* Main Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-(--bg-surface-raised) border border-(--border-subtle) text-xs text-(--text-muted)">
          <Sparkles className="size-3.5 text-(--accent-lime)" />
          <span>Transparent, Evidence-Grounded Preparation</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-(--text-primary)">
          Choose Your Preparation Track
        </h1>
        <p className="text-sm text-(--text-secondary)">
          Full access to complete preparation tracks, reviewed checkpoints, and adaptive
          study journeys. Free forever for the core learning loop.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
        {ORDERED_PLAN_TIERS.map((tier) => {
          const plan = PLAN_CATALOG[tier];
          const isCurrent = snapshot.tier === tier && snapshot.status === "active";
          const isPro = tier === "pro";
          const isMax = tier === "max";

          return (
            <Card
              key={tier}
              className={cn(
                "relative flex flex-col justify-between p-6 transition-all duration-200",
                isPro && "border-(--accent-lime) ring-1 ring-(--accent-lime)/50 shadow-lg shadow-(--accent-lime)/5",
                isCurrent && "border-(--accent-lime)/60 bg-(--bg-surface-raised)"
              )}
            >
              {plan.badge && (
                <div
                  className={cn(
                    "absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase",
                    isPro
                      ? "bg-(--accent-lime) text-black font-bold"
                      : "bg-(--bg-surface-raised) border border-(--border-subtle) text-(--text-secondary)"
                  )}
                >
                  {isCurrent ? "Current Plan" : plan.badge}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-(--text-primary)">
                    {plan.displayName}
                  </h2>
                  <p className="text-xs text-(--text-muted) mt-1 min-h-[32px]">
                    {plan.tagline}
                  </p>
                </div>

                <div className="pt-2 pb-4 border-b border-(--border-subtle)">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-(--text-primary)">
                      {plan.displayPrice}
                    </span>
                  </div>
                  <span className="text-[11px] text-(--text-muted)">
                    {plan.billingPeriod === "forever"
                      ? "Free forever"
                      : "Simulated monthly billing"}
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="text-[11px] font-semibold text-(--text-muted) uppercase tracking-wider">
                    Included Capabilities
                  </div>
                  <ul className="space-y-2 text-xs">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="size-3.5 text-(--accent-lime) shrink-0 mt-0.5" />
                        <span className="text-(--text-secondary)">{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.limitations && plan.limitations.length > 0 && (
                    <div className="pt-3 border-t border-(--border-subtle)/50 space-y-1.5">
                      <div className="text-[10px] font-medium text-(--text-muted) uppercase">
                        Plan Scope
                      </div>
                      <ul className="space-y-1 text-[11px] text-(--text-muted)">
                        {plan.limitations.map((lim, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-(--text-muted)">•</span>
                            <span>{lim}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-(--border-subtle)">
                {isCurrent ? (
                  <div className="w-full py-2.5 px-3 rounded-lg border border-(--border-subtle) text-center text-xs font-semibold text-(--accent-lime) bg-(--accent-lime)/10 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="size-4" />
                    Active Plan
                  </div>
                ) : isMax ? (
                  <div className="space-y-2">
                    <button
                      disabled
                      className="w-full py-2.5 px-3 rounded-lg border border-(--border-subtle) text-center text-xs font-medium text-(--text-muted) bg-(--bg-surface-raised)/50 cursor-not-allowed"
                    >
                      In Preview • Not For Sale
                    </button>
                    <p className="text-[10px] text-center text-(--text-muted)">
                      {plan.unavailableReason}
                    </p>
                  </div>
                ) : (
                  <ButtonPrimary
                    onClick={() => handleStartCheckout(tier)}
                    disabled={isPending}
                    className={cn(
                      "w-full text-xs font-bold py-2.5 justify-center",
                      !isPro && "bg-(--bg-surface-raised) text-(--text-primary) hover:bg-(--bg-surface-hover) border border-(--border-subtle)"
                    )}
                  >
                    {isPending && selectedPlan === tier ? (
                      <RefreshCw className="size-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>Upgrade to {plan.name}</span>
                        <ArrowRight className="size-3.5 ml-1" />
                      </>
                    )}
                  </ButtonPrimary>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Preparation Track Highlights Banner */}
      <Card className="p-6 border-(--border-subtle) bg-(--bg-surface-raised)">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-(--accent-lime)/10 text-(--accent-lime)">
              DELIVERED PREPARATION TRACK
            </div>
            <h3 className="text-lg font-bold text-(--text-primary)">
              Arrays and Two-Pointers Preparation Track
            </h3>
            <p className="text-xs text-(--text-secondary) leading-relaxed">
              Included in <strong>DSA Club Pro</strong>. Master inward two-pointer traversal,
              monotonic pruning, and space invariant optimization with verified checkpoints
              and adaptive sheets.
            </p>
          </div>
          <Link href="/tracks/arrays-and-pointers">
            <ButtonSecondary className="text-xs shrink-0 flex items-center gap-1.5">
              <span>Preview Track & Adaptive Sheet</span>
              <ExternalLink className="size-3.5" />
            </ButtonSecondary>
          </Link>
        </div>
      </Card>

      {/* Simulated Checkout Modal */}
      {checkoutModalOpen && checkoutOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-(--bg-surface-raised) border border-(--border-subtle) rounded-2xl shadow-2xl p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-4">
              <div>
                <div className="text-xs font-semibold text-(--accent-lime) uppercase tracking-wider">
                  Demonstration Checkout
                </div>
                <h3 className="text-base font-bold text-(--text-primary) mt-0.5">
                  Upgrade to {PLAN_CATALOG[checkoutOrder.planTier as PlanTier]?.displayName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutModalOpen(false)}
                className="text-(--text-muted) hover:text-(--text-primary) p-1 rounded-lg hover:bg-(--bg-surface-hover)"
              >
                ✕
              </button>
            </div>

            {/* Step: Form */}
            {checkoutStep === "form" && (
              <div className="space-y-5">
                {/* Order Summary */}
                <div className="p-3.5 rounded-lg bg-(--bg-sidebar) border border-(--border-subtle) flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-(--text-primary)">
                      {PLAN_CATALOG[checkoutOrder.planTier as PlanTier]?.displayName}
                    </span>
                    <div className="text-[11px] text-(--text-muted)">
                      Order: {checkoutOrder.orderId}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-(--text-primary)">
                      {checkoutOrder.quote.displayAmount}
                    </div>
                    <div className="text-[10px] text-(--text-muted)">Demo Pricing</div>
                  </div>
                </div>

                {/* Simulated Payment Methods */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-(--text-primary)">
                    Select Demonstration Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: "upi", label: "UPI", icon: Smartphone },
                      { id: "card", label: "Card", icon: CreditCard },
                      { id: "netbanking", label: "Net Banking", icon: Building },
                      { id: "wallet", label: "Wallet", icon: Wallet },
                    ].map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setMethodType(id as PaymentMethodType)}
                        className={cn(
                          "flex items-center gap-2.5 p-3 rounded-lg border text-xs font-medium transition-all text-left",
                          methodType === id
                            ? "border-(--accent-lime) bg-(--accent-lime)/10 text-(--text-primary)"
                            : "border-(--border-subtle) bg-(--bg-surface) text-(--text-muted) hover:border-(--border-subtle)/80"
                        )}
                      >
                        <Icon className="size-4 shrink-0 text-(--accent-lime)" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Synthetic Method Details */}
                <div className="p-3.5 rounded-lg border border-(--border-subtle) bg-(--bg-surface) space-y-3 text-xs">
                  {methodType === "upi" && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-(--text-muted)">
                        Synthetic UPI ID
                      </label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full px-3 py-2 rounded border border-(--border-subtle) bg-(--bg-surface-raised) text-xs text-(--text-primary) font-mono"
                        placeholder="demo@upi"
                      />
                    </div>
                  )}

                  {methodType === "card" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-(--text-muted)">
                        <span>Synthetic Test Card</span>
                        <span className="font-mono">•••• •••• •••• 4242</span>
                      </div>
                      <div className="text-[10px] text-(--text-muted)">
                        Safe sandbox profile. No actual card number or CVV required.
                      </div>
                    </div>
                  )}

                  {methodType === "netbanking" && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-(--text-muted)">
                        Synthetic Bank
                      </label>
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full px-3 py-2 rounded border border-(--border-subtle) bg-(--bg-surface-raised) text-xs text-(--text-primary)"
                      >
                        <option value="HDFC Bank">HDFC Bank (Demonstration)</option>
                        <option value="ICICI Bank">ICICI Bank (Demonstration)</option>
                        <option value="State Bank of India">SBI (Demonstration)</option>
                        <option value="Axis Bank">Axis Bank (Demonstration)</option>
                      </select>
                    </div>
                  )}

                  {methodType === "wallet" && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-(--text-muted)">
                        Demonstration Wallet
                      </label>
                      <input
                        type="text"
                        value={walletProvider}
                        onChange={(e) => setWalletProvider(e.target.value)}
                        className="w-full px-3 py-2 rounded border border-(--border-subtle) bg-(--bg-surface-raised) text-xs text-(--text-primary)"
                      />
                    </div>
                  )}
                </div>

                {/* Developer / Demo Scenario Controls */}
                <div className="space-y-1.5 p-3 rounded-lg border border-dashed border-(--border-subtle) bg-(--bg-surface)/40 text-xs">
                  <label className="text-[11px] font-semibold text-(--text-muted) flex items-center gap-1.5">
                    <Sparkles className="size-3 text-(--accent-lime)" />
                    Simulation Test Scenario
                  </label>
                  <select
                    value={testScenario}
                    onChange={(e) => setTestScenario(e.target.value as MockScenarioType)}
                    className="w-full px-2.5 py-1.5 rounded border border-(--border-subtle) bg-(--bg-surface-raised) text-xs text-(--text-primary)"
                  >
                    <option value="success">Success (Authorize & Activate)</option>
                    <option value="insufficient_funds">Insufficient Funds (Simulate Failure)</option>
                    <option value="user_cancelled">User Cancelled (Simulate Dropoff)</option>
                    <option value="network_timeout">Gateway Timeout (Simulate Network Error)</option>
                  </select>
                  <p className="text-[10px] text-(--text-muted)">
                    Tests provider recovery, state machine rollback, and idempotent retries.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <ButtonSecondary
                    onClick={() => setCheckoutModalOpen(false)}
                    className="flex-1 text-xs py-2.5"
                  >
                    Cancel
                  </ButtonSecondary>
                  <ButtonPrimary
                    onClick={handleSimulatePayment}
                    className="flex-1 text-xs py-2.5 justify-center font-bold"
                  >
                    Authorize Simulated Payment ({checkoutOrder.quote.displayAmount})
                  </ButtonPrimary>
                </div>
              </div>
            )}

            {/* Step: Processing */}
            {checkoutStep === "processing" && (
              <div className="py-12 text-center space-y-4">
                <RefreshCw className="size-8 text-(--accent-lime) animate-spin mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-(--text-primary)">
                    Processing Simulated Authorization...
                  </h4>
                  <p className="text-xs text-(--text-secondary)">
                    Confirming state machine transition and activating entitlements.
                  </p>
                </div>
              </div>
            )}

            {/* Step: Success */}
            {checkoutStep === "success" && (
              <div className="py-6 text-center space-y-5">
                <div className="size-12 rounded-full bg-(--accent-lime)/20 text-(--accent-lime) grid place-items-center mx-auto border border-(--accent-lime)/40">
                  <Check className="size-6" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-lg font-bold text-(--text-primary)">
                    Welcome to {PLAN_CATALOG[checkoutOrder.planTier as PlanTier]?.displayName}!
                  </h4>
                  <p className="text-xs text-(--text-secondary) max-w-sm mx-auto">
                    Your entitlement snapshot has refreshed across all browser sessions.
                    Preparation tracks, adaptive sheets, and approved checkpoints are now unlocked.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-(--border-subtle) bg-(--bg-surface) text-left text-xs space-y-1">
                  <div className="text-[11px] font-semibold text-(--text-muted)">
                    Demonstration Receipt Logged
                  </div>
                  <div className="text-[11px] font-mono text-(--text-secondary)">
                    Order: {checkoutOrder.orderId}
                  </div>
                  <div className="text-[11px] text-(--text-secondary)">
                    Amount: {checkoutOrder.quote.displayAmount} • Status: Activated
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  <Link href="/tracks/arrays-and-pointers" className="flex-1">
                    <ButtonPrimary className="w-full text-xs py-2.5 justify-center font-bold">
                      Open Preparation Track
                    </ButtonPrimary>
                  </Link>
                  <ButtonSecondary
                    onClick={() => setCheckoutModalOpen(false)}
                    className="flex-1 text-xs py-2.5"
                  >
                    Done
                  </ButtonSecondary>
                </div>
              </div>
            )}

            {/* Step: Error */}
            {checkoutStep === "error" && (
              <div className="py-6 text-center space-y-4">
                <div className="size-12 rounded-full bg-red-500/20 text-red-400 grid place-items-center mx-auto border border-red-500/40">
                  <AlertCircle className="size-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-(--text-primary)">
                    Payment Simulation Failed
                  </h4>
                  <p className="text-xs text-red-400 max-w-sm mx-auto">
                    {errorMessage || "The mock payment was declined."}
                  </p>
                </div>
                <div className="pt-2 flex gap-3">
                  <ButtonSecondary
                    onClick={() => setCheckoutStep("form")}
                    className="flex-1 text-xs py-2.5"
                  >
                    Retry Simulation
                  </ButtonSecondary>
                  <ButtonSecondary
                    onClick={() => setCheckoutModalOpen(false)}
                    className="flex-1 text-xs py-2.5"
                  >
                    Close
                  </ButtonSecondary>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

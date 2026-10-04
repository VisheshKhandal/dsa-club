"use client";

import React, { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { ButtonPrimary, ButtonSecondary, ButtonDanger } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { PLAN_CATALOG, type PlanTier } from "@/features/subscription/plans";
import {
  cancelSubscriptionAction,
  reactivateSubscriptionAction,
} from "@/features/subscription/actions/subscription.actions";
import type {
  ISubscriptionDocument,
  IMockTransactionReceiptDocument,
} from "@/features/subscription/models/subscription.model";
import {
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Receipt,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface BillingManagementViewProps {
  subscription: ISubscriptionDocument | null;
  effectiveTier: PlanTier;
  receipts: IMockTransactionReceiptDocument[];
}

export function BillingManagementView({
  subscription,
  effectiveTier,
  receipts,
}: BillingManagementViewProps) {
  const toast = useToast();
  const router = useRouter();
  const [sub, setSub] = useState(subscription);
  const [isPending, startTransition] = useTransition();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const plan = PLAN_CATALOG[effectiveTier];
  const isCanceled = sub?.cancelAtPeriodEnd || sub?.status === "canceled";

  const handleCancelAtPeriodEnd = () => {
    startTransition(async () => {
      const res = await cancelSubscriptionAction();
      if (res.ok && res.subscription) {
        setSub(res.subscription as any);
        setCancelDialogOpen(false);
        toast.info(
          "Subscription scheduled to cancel at end of period. Your learning data and progress remain intact."
        );
        router.refresh();
      } else {
        toast.error(res.error || "Failed to cancel subscription.");
      }
    });
  };

  const handleReactivate = () => {
    startTransition(async () => {
      const res = await reactivateSubscriptionAction();
      if (res.ok && res.subscription) {
        setSub(res.subscription as any);
        toast.success("Subscription reactivated successfully!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to reactivate subscription.");
      }
    });
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      {/* Simulation Disclosure */}
      <div className="p-4 rounded-xl border border-(--accent-lime)/30 bg-(--accent-lime)/5 flex items-start gap-3.5">
        <ShieldCheck className="size-5 text-(--accent-lime) shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <div className="font-semibold text-(--text-primary) flex items-center gap-2">
            Simulated Commercial Management
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-(--accent-lime)/20 text-(--accent-lime)">
              DEMO
            </span>
          </div>
          <p className="text-(--text-secondary) leading-relaxed">
            All receipts and periods are demonstration records. Cancelling and reactivating
            exercises the exact entitlement and access policy boundaries of the system
            without collecting live funds.
          </p>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-(--text-primary)">
          Subscription & Billing
        </h1>
        <p className="text-xs text-(--text-secondary) mt-1">
          Manage your plan tier, period renewal, simulated payment methods, and transaction history.
        </p>
      </div>

      {/* Current Plan Card */}
      <Card className="p-6 border-(--border-subtle) bg-(--bg-surface-raised) space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-(--border-subtle) pb-5">
          <div className="space-y-1">
            <div className="text-xs text-(--text-muted) uppercase font-semibold tracking-wider">
              Current Plan
            </div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-(--text-primary)">
                {plan.displayName}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-(--accent-lime)/15 text-(--accent-lime) border border-(--accent-lime)/30">
                {sub?.status === "active" && !isCanceled
                  ? "Active"
                  : isCanceled
                  ? "Cancels at period end"
                  : "Free"}
              </span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-lg font-bold text-(--text-primary)">
              {plan.displayPrice}
            </div>
            <div className="text-[11px] text-(--text-muted)">
              {plan.billingPeriod === "forever" ? "Included" : "Demonstration Billing"}
            </div>
          </div>
        </div>

        {/* Period & Payment Method */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg border border-(--border-subtle) bg-(--bg-surface) space-y-1.5">
            <div className="flex items-center gap-2 text-(--text-muted) font-medium">
              <Calendar className="size-4 text-(--accent-lime)" />
              <span>Current Period</span>
            </div>
            <div className="text-(--text-primary) font-medium">
              {sub?.currentPeriodEnd
                ? `Expires on ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`
                : "Active forever (Free tier)"}
            </div>
            {isCanceled && sub?.currentPeriodEnd && (
              <div className="text-[11px] text-amber-400 font-medium">
                Access remains full until {new Date(sub.currentPeriodEnd).toLocaleDateString()}.
                After that, reverts to Free tier. Historical attempts remain preserved.
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-lg border border-(--border-subtle) bg-(--bg-surface) space-y-1.5">
            <div className="flex items-center gap-2 text-(--text-muted) font-medium">
              <CreditCard className="size-4 text-(--accent-lime)" />
              <span>Simulated Payment Method</span>
            </div>
            <div className="text-(--text-primary) font-medium">
              {sub?.simulatedPaymentMethod?.label || "No method registered"}
            </div>
            <div className="text-[11px] text-(--text-muted)">
              Demonstration profile (Safe test sandbox)
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {effectiveTier === "free" ? (
            <Link href="/pricing">
              <ButtonPrimary className="text-xs font-bold py-2 px-4 flex items-center gap-1.5">
                <span>View Upgrade Options</span>
                <ArrowRight className="size-3.5" />
              </ButtonPrimary>
            </Link>
          ) : isCanceled ? (
            <ButtonPrimary
              onClick={handleReactivate}
              disabled={isPending}
              className="text-xs font-bold py-2 px-4"
            >
              {isPending ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                "Reactivate Subscription"
              )}
            </ButtonPrimary>
          ) : (
            <>
              <Link href="/pricing">
                <ButtonSecondary className="text-xs py-2 px-4">
                  Change Plan Tier
                </ButtonSecondary>
              </Link>
              <ButtonDanger
                onClick={() => setCancelDialogOpen(true)}
                className="text-xs py-2 px-4"
              >
                Cancel at Period End
              </ButtonDanger>
            </>
          )}
        </div>
      </Card>

      {/* Confirmation Dialog for Cancellation */}
      {cancelDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-(--bg-surface-raised) border border-(--border-subtle) rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-full bg-amber-500/20 text-amber-400 grid place-items-center shrink-0 border border-amber-500/30">
                <AlertTriangle className="size-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-(--text-primary)">
                  Cancel Subscription at Period End?
                </h3>
                <p className="text-xs text-(--text-secondary) leading-relaxed">
                  Your plan will remain active until{" "}
                  <strong>
                    {sub?.currentPeriodEnd
                      ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                      : "end of period"}
                  </strong>
                  . After this date, you will return to the Free tier.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-(--border-subtle) bg-(--bg-surface) space-y-1.5 text-xs text-(--text-muted)">
              <div className="font-semibold text-(--text-primary)">
                What happens to your data:
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                <li>All solved problems, code attempts, and notes are preserved.</li>
                <li>Your spaced repetition review history remains intact.</li>
                <li>Preparation track enrollment will be paused without deleting progress.</li>
              </ul>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <ButtonSecondary
                onClick={() => setCancelDialogOpen(false)}
                className="flex-1 text-xs py-2"
              >
                Keep Subscription
              </ButtonSecondary>
              <ButtonDanger
                onClick={handleCancelAtPeriodEnd}
                disabled={isPending}
                className="flex-1 text-xs py-2 justify-center font-bold"
              >
                {isPending ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  "Confirm Cancellation"
                )}
              </ButtonDanger>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History / Receipts */}
      <Card className="p-6 border-(--border-subtle) bg-(--bg-surface-raised) space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-(--accent-lime)" />
            <h3 className="text-sm font-bold text-(--text-primary)">
              Demonstration Transaction History
            </h3>
          </div>
          <span className="text-[11px] text-(--text-muted)">
            {receipts.length} record{receipts.length === 1 ? "" : "s"}
          </span>
        </div>

        {receipts.length === 0 ? (
          <div className="py-8 text-center text-xs text-(--text-muted)">
            No transactions recorded yet. Complete a simulated checkout to view receipts.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-(--border-subtle) text-(--text-muted)">
                  <th className="pb-2.5 font-medium">Date</th>
                  <th className="pb-2.5 font-medium">Receipt ID</th>
                  <th className="pb-2.5 font-medium">Plan Tier</th>
                  <th className="pb-2.5 font-medium">Amount</th>
                  <th className="pb-2.5 font-medium">Payment Method</th>
                  <th className="pb-2.5 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle)/50">
                {receipts.map((rec) => (
                  <tr key={rec.receiptId} className="text-(--text-secondary)">
                    <td className="py-3 font-mono text-[11px]">
                      {new Date(rec.issuedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 font-mono text-[11px] text-(--text-primary)">
                      {rec.receiptId}
                    </td>
                    <td className="py-3 font-medium text-(--text-primary)">
                      {PLAN_CATALOG[rec.planTier]?.displayName || rec.planTier}
                    </td>
                    <td className="py-3 font-bold text-(--text-primary)">
                      {rec.displayAmount}
                    </td>
                    <td className="py-3 text-[11px] text-(--text-muted)">
                      {rec.paymentMethodSummary}
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="size-3" />
                        Simulated
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

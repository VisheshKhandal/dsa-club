import { Schema, model, type Document, Types } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";
import type { PlanTier } from "../plans";

export type SubscriptionStatus = "active" | "canceled" | "past_due" | "expired";
export type PaymentMethodType = "upi" | "card" | "netbanking" | "wallet";

export interface ISimulatedPaymentMethod {
  type: PaymentMethodType;
  label: string;
  last4?: string;
  providerRef?: string;
}

export interface ISubscriptionHistoryEntry {
  event: string;
  fromTier?: PlanTier;
  toTier: PlanTier;
  at: Date;
  orderId?: string;
  reason?: string;
}

export interface ISubscriptionDocument extends Document {
  userId: Types.ObjectId;
  planTier: PlanTier;
  status: SubscriptionStatus;
  catalogVersion: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date | null;
  simulatedPaymentMethod?: ISimulatedPaymentMethod;
  version: number;
  history: ISubscriptionHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = withTimestamps(
  new Schema({
    userId: { type: objectId, ref: "User", required: true, unique: true, index: true },
    planTier: {
      type: String,
      enum: ["free", "elite", "pro", "max"],
      default: "free",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "canceled", "past_due", "expired"],
      default: "active",
      required: true,
      index: true,
    },
    catalogVersion: { type: String, required: true, default: "2026.1-demo" },
    currentPeriodStart: { type: Date, required: true, default: Date.now },
    currentPeriodEnd: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: { type: Date, default: null },
    simulatedPaymentMethod: {
      type: new Schema(
        {
          type: { type: String, enum: ["upi", "card", "netbanking", "wallet"] },
          label: { type: String, required: true },
          last4: { type: String, default: null },
          providerRef: { type: String, default: null },
        },
        { _id: false }
      ),
      default: null,
    },
    version: { type: Number, default: 1 },
    history: [
      {
        event: { type: String, required: true },
        fromTier: { type: String },
        toTier: { type: String, required: true },
        at: { type: Date, default: Date.now },
        orderId: { type: String },
        reason: { type: String },
      },
    ],
  })
);

export const SubscriptionModel = getModel<ISubscriptionDocument>(
  "Subscription",
  () => model<ISubscriptionDocument>("Subscription", subscriptionSchema)
);

export type CheckoutOrderStatus =
  | "reviewing"
  | "validating"
  | "awaiting_method"
  | "processing"
  | "confirming_activation"
  | "activated"
  | "failed"
  | "cancelled"
  | "expired";

export interface ICheckoutOrderDocument extends Document {
  orderId: string;
  userId: Types.ObjectId;
  planTier: PlanTier;
  catalogVersion: string;
  quote: {
    amountMinorUnits: number;
    currency: string;
    displayAmount: string;
  };
  status: CheckoutOrderStatus;
  paymentMethodType?: PaymentMethodType | null;
  simulatedDetails?: Record<string, any> | null;
  attemptId: string;
  providerSessionRef?: string | null;
  failureReason?: string | null;
  activatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const checkoutOrderSchema = withTimestamps(
  new Schema({
    orderId: { type: String, required: true, unique: true, index: true },
    userId: { type: objectId, ref: "User", required: true, index: true },
    planTier: { type: String, enum: ["elite", "pro", "max"], required: true },
    catalogVersion: { type: String, required: true, default: "2026.1-demo" },
    quote: {
      amountMinorUnits: { type: Number, required: true },
      currency: { type: String, required: true, default: "INR" },
      displayAmount: { type: String, required: true },
    },
    status: {
      type: String,
      enum: [
        "reviewing",
        "validating",
        "awaiting_method",
        "processing",
        "confirming_activation",
        "activated",
        "failed",
        "cancelled",
        "expired",
      ],
      default: "reviewing",
      index: true,
    },
    paymentMethodType: {
      type: String,
      enum: ["upi", "card", "netbanking", "wallet"],
      default: null,
    },
    simulatedDetails: { type: Schema.Types.Mixed, default: null },
    attemptId: { type: String, required: true, index: true },
    providerSessionRef: { type: String, default: null },
    failureReason: { type: String, default: null },
    activatedAt: { type: Date, default: null },
  })
);

export const CheckoutOrderModel = getModel<ICheckoutOrderDocument>(
  "CheckoutOrder",
  () => model<ICheckoutOrderDocument>("CheckoutOrder", checkoutOrderSchema)
);

export interface IMockTransactionReceiptDocument extends Document {
  receiptId: string;
  orderId: string;
  userId: Types.ObjectId;
  planTier: PlanTier;
  amountMinorUnits: number;
  currency: string;
  displayAmount: string;
  paymentMethodSummary: string;
  status: "paid" | "refunded";
  isDemonstration: boolean;
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const mockReceiptSchema = withTimestamps(
  new Schema({
    receiptId: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    userId: { type: objectId, ref: "User", required: true, index: true },
    planTier: { type: String, enum: ["elite", "pro", "max"], required: true },
    amountMinorUnits: { type: Number, required: true },
    currency: { type: String, required: true, default: "INR" },
    displayAmount: { type: String, required: true },
    paymentMethodSummary: { type: String, required: true },
    status: { type: String, enum: ["paid", "refunded"], default: "paid" },
    isDemonstration: { type: Boolean, default: true },
    issuedAt: { type: Date, default: Date.now },
  })
);

export const MockTransactionReceiptModel = getModel<IMockTransactionReceiptDocument>(
  "MockTransactionReceipt",
  () => model<IMockTransactionReceiptDocument>("MockTransactionReceipt", mockReceiptSchema)
);

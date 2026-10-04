import { Schema, model, type Document, Types } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";
import type { PlanRelation } from "../types/intelligence.types";

export interface IIntelligenceDecisionDocument extends Document {
  userId: Types.ObjectId;
  learningEpoch: number;
  policyVersion?: string;
  sourceEvidenceRevision?: number;
  planId?: Types.ObjectId | null;
  planDayId?: Types.ObjectId | null;
  journeyId?: Types.ObjectId | null;
  surface: "dashboard_card" | "today_board" | "recovery_prompt" | "completion_eval" | "recalibration";
  decisionType: "daily_next_action" | "recovery_recommendation" | "plan_completion" | "retargeting";
  mode?: "plan_led" | "self_paced";
  availableMinutesContext?: number;
  timeBudgetExceeded?: boolean;
  reasonCodes?: string[];
  selectedAction: {
    actionKey: string;
    actionType: "mission" | "practice" | "revision" | "reflection" | "checkpoint" | "rest";
    entityType?: string;
    entityId?: Types.ObjectId | null;
    title: string;
    estimatedMinutes: number;
    planRelation: PlanRelation;
    targetUrl: string;
  };
  alternativeAction?: {
    actionKey: string;
    actionType: "mission" | "practice" | "revision" | "reflection" | "checkpoint" | "rest";
    entityType?: string;
    entityId?: Types.ObjectId | null;
    title: string;
    estimatedMinutes: number;
    planRelation: PlanRelation;
    targetUrl: string;
    reason: string;
  } | null;
  primaryReason: string;
  secondaryReasons: string[];
  signals: {
    planDayIndex?: number;
    streakDays?: number;
    dueRevisionsCount?: number;
    missedDaysCount?: number;
    recentStrugglesCount?: number;
    recoveryTriggered?: boolean;
    readinessScore?: number;
  };
  aiExplanation?: {
    text?: string;
    enhancedAt?: Date;
    model?: string;
    fallbackUsed: boolean;
  };
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const intelligenceDecisionSchema = withTimestamps(
  new Schema({
    userId: { type: objectId, ref: "User", required: true, index: true },
    learningEpoch: { type: Number, required: true, default: 1 },
    policyVersion: { type: String, default: "3.0.0-canonical" },
    sourceEvidenceRevision: { type: Number, default: 1 },
    planId: { type: objectId, ref: "Plan", default: null, index: true },
    planDayId: { type: objectId, ref: "PlanDay", default: null },
    journeyId: { type: objectId, ref: "Journey", default: null, index: true },
    surface: {
      type: String,
      enum: ["dashboard_card", "today_board", "recovery_prompt", "completion_eval", "recalibration"],
      required: true,
    },
    decisionType: {
      type: String,
      enum: ["daily_next_action", "recovery_recommendation", "plan_completion", "retargeting"],
      required: true,
    },
    mode: { type: String, enum: ["plan_led", "self_paced"], default: "plan_led" },
    availableMinutesContext: { type: Number, default: null },
    timeBudgetExceeded: { type: Boolean, default: false },
    reasonCodes: [{ type: String }],
    selectedAction: {
      actionKey: { type: String, required: true },
      actionType: {
        type: String,
        enum: ["mission", "practice", "revision", "reflection", "checkpoint", "rest"],
        required: true,
      },
      entityType: { type: String, default: null },
      entityId: { type: objectId, default: null },
      title: { type: String, required: true },
      estimatedMinutes: { type: Number, required: true, min: 0 },
      planRelation: {
        type: String,
        enum: ["planned_today", "plan_revision", "plan_recovery", "plan_extension", "outside_plan"],
        required: true,
      },
      targetUrl: { type: String, required: true },
    },
    alternativeAction: {
      actionKey: { type: String },
      actionType: {
        type: String,
        enum: ["mission", "practice", "revision", "reflection", "checkpoint", "rest"],
      },
      entityType: { type: String, default: null },
      entityId: { type: objectId, default: null },
      title: { type: String },
      estimatedMinutes: { type: Number },
      planRelation: {
        type: String,
        enum: ["planned_today", "plan_revision", "plan_recovery", "plan_extension", "outside_plan"],
      },
      targetUrl: { type: String },
      reason: { type: String },
    },
    primaryReason: { type: String, required: true, maxlength: 400 },
    secondaryReasons: [{ type: String, maxlength: 200 }],
    signals: {
      planDayIndex: { type: Number, default: null },
      streakDays: { type: Number, default: null },
      dueRevisionsCount: { type: Number, default: null },
      missedDaysCount: { type: Number, default: null },
      recentStrugglesCount: { type: Number, default: null },
      recoveryTriggered: { type: Boolean, default: null },
      readinessScore: { type: Number, default: null },
    },
    aiExplanation: {
      text: { type: String, default: null, maxlength: 1000 },
      enhancedAt: { type: Date, default: null },
      model: { type: String, default: null },
      fallbackUsed: { type: Boolean, default: true },
    },
    expiresAt: { type: Date, default: null },
  })
);

intelligenceDecisionSchema.index({ userId: 1, createdAt: -1 });
intelligenceDecisionSchema.index({ planId: 1, createdAt: -1 });
intelligenceDecisionSchema.index({ userId: 1, surface: 1, createdAt: -1 });

export const IntelligenceDecisionModel = getModel<IIntelligenceDecisionDocument>(
  "IntelligenceDecision",
  () => model<IIntelligenceDecisionDocument>("IntelligenceDecision", intelligenceDecisionSchema)
);

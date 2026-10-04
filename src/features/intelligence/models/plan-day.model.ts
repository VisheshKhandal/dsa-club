import { Schema, model, type Document, Types } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";
import type { PlanDayPhase, PlanDayStatus } from "../types/intelligence.types";

export interface IPlanDayDocument extends Document {
  planId: Types.ObjectId;
  userId: Types.ObjectId;
  dayIndex: number;
  dateKey: string;
  status: PlanDayStatus;
  phase: PlanDayPhase;
  title: string;
  focus: string;
  topicId?: Types.ObjectId;
  topicSlug: string;
  topicName: string;
  targetMinutes: number;
  actualMinutes: number;
  startedAt?: Date;
  completedAt?: Date;
  recoveryFromDayIndex?: number;
  isBufferDay: boolean;
  isCheckpointDay: boolean;
  summary?: string;
  reflectionResponse?: {
    confidence?: number;
    note?: string;
    blockerReason?: string;
  };
}

const planDaySchema = withTimestamps(
  new Schema({
    planId: { type: objectId, ref: "Plan", required: true, index: true },
    userId: { type: objectId, ref: "User", required: true, index: true },
    dayIndex: { type: Number, required: true, min: 1 },
    dateKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    status: {
      type: String,
      enum: ["locked", "available", "in_progress", "completed", "missed", "deferred"],
      default: "locked",
      index: true,
    },
    phase: {
      type: String,
      enum: [
        "orientation",
        "mechanics",
        "pattern_recognition",
        "guided_practice",
        "independent_practice",
        "synthesis",
        "review",
      ],
      required: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    focus: { type: String, required: true, maxlength: 400 },
    topicId: { type: objectId, ref: "Topic", default: null },
    topicSlug: { type: String, required: true },
    topicName: { type: String, required: true },
    targetMinutes: { type: Number, required: true, min: 5, max: 480 },
    actualMinutes: { type: Number, default: 0, min: 0 },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    recoveryFromDayIndex: { type: Number, default: null },
    isBufferDay: { type: Boolean, default: false },
    isCheckpointDay: { type: Boolean, default: false },
    summary: { type: String, default: null, maxlength: 1000 },
    reflectionResponse: {
      confidence: { type: Number, min: 1, max: 5 },
      note: { type: String, maxlength: 1000 },
      blockerReason: { type: String, maxlength: 500 },
    },
  })
);

// Enforce unique day index per plan
planDaySchema.index({ planId: 1, dayIndex: 1 }, { unique: true });
planDaySchema.index({ userId: 1, dateKey: 1 });
planDaySchema.index({ userId: 1, status: 1 });
planDaySchema.index({ planId: 1, status: 1 });

// Database-level contract: Executable/completed days MUST have both topicId and topicSlug present
planDaySchema.pre("validate", function (next) {
  const status = String((this as any).status);
  if (["available", "in_progress", "completed"].includes(status)) {
    if (!this.topicId) {
      return next(
        new Error(
          `Database invariant violation: Executable PlanDay (dayIndex: ${this.dayIndex}, status: ${this.status}) must persist a valid topicId.`
        )
      );
    }
    if (!this.topicSlug || typeof this.topicSlug !== "string" || !this.topicSlug.trim()) {
      return next(
        new Error(
          `Database invariant violation: Executable PlanDay (dayIndex: ${this.dayIndex}) must persist a valid topicSlug.`
        )
      );
    }
  }
  next();
});

export const PlanDayModel = getModel<IPlanDayDocument>(
  "PlanDay",
  () => model<IPlanDayDocument>("PlanDay", planDaySchema)
);

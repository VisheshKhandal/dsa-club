import { Schema, model, type Document, Types } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";

export type JourneyStatus = "active" | "paused" | "completed" | "archived";

export interface IJourneyMilestone {
  milestoneId: string;
  order: number;
  title: string;
  targetTopicSlug: string;
  requiredProblemsCount: number;
  targetReviewCount: number;
  status: "pending" | "in_progress" | "completed";
  completedAt?: Date | null;
}

export interface IReplanRecord {
  replanId: string;
  trigger: "availability_change" | "missed_commitments" | "struggle_detected" | "manual";
  triggeredAt: Date;
  reason: string;
  beforeSnapshot: {
    dailyMinutes: number;
    studyDaysPerWeek: number;
    targetCompletionDate?: Date | null;
    version: number;
  };
  proposedChanges: {
    dailyMinutes?: number;
    studyDaysPerWeek?: number;
    targetCompletionDate?: Date | null;
    diffSummary: string;
    whatStays: string[];
    whatMoves: string[];
    whatIsAdded: string[];
  };
  status: "proposed" | "accepted" | "declined";
  appliedAt?: Date | null;
}

export interface IJourneyDocument extends Document {
  userId: Types.ObjectId;
  learningEpoch: number;
  status: JourneyStatus;
  goal: string;
  targetProfile?: {
    role?: string;
    companySlug?: string;
    experienceLevel: "beginner" | "intermediate" | "advanced";
  };
  curriculumSlice: string;
  curriculumVersion: string;
  weeklyAvailability: {
    studyDaysPerWeek: number;
    dailyMinutes: number;
    availableDaysOfWeek: number[];
    timezone: string;
  };
  startDate: Date;
  deadline?: Date | null;
  targetCompletionDate?: Date | null;
  milestones: IJourneyMilestone[];
  currentCycleNumber: number;
  activePlanId?: Types.ObjectId | null;
  version: number;
  replanHistory: IReplanRecord[];
  createdAt: Date;
  updatedAt: Date;
}

const journeyMilestoneSchema = new Schema(
  {
    milestoneId: { type: String, required: true },
    order: { type: Number, required: true },
    title: { type: String, required: true },
    targetTopicSlug: { type: String, required: true },
    requiredProblemsCount: { type: Number, required: true, default: 2 },
    targetReviewCount: { type: Number, required: true, default: 1 },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
    },
    completedAt: { type: Date, default: null },
  },
  { _id: false }
);

const replanRecordSchema = new Schema(
  {
    replanId: { type: String, required: true },
    trigger: {
      type: String,
      enum: ["availability_change", "missed_commitments", "struggle_detected", "manual"],
      required: true,
    },
    triggeredAt: { type: Date, default: Date.now },
    reason: { type: String, required: true },
    beforeSnapshot: { type: Schema.Types.Mixed, required: true },
    proposedChanges: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["proposed", "accepted", "declined"],
      default: "proposed",
    },
    appliedAt: { type: Date, default: null },
  },
  { _id: false }
);

const journeySchema = withTimestamps(
  new Schema({
    userId: { type: objectId, ref: "User", required: true, index: true },
    learningEpoch: { type: Number, required: true, default: 1 },
    status: {
      type: String,
      enum: ["active", "paused", "completed", "archived"],
      default: "active",
      index: true,
    },
    goal: { type: String, required: true },
    targetProfile: {
      role: { type: String, default: "Full-Stack Engineer" },
      companySlug: { type: String, default: null },
      experienceLevel: {
        type: String,
        enum: ["beginner", "intermediate", "advanced"],
        default: "intermediate",
      },
    },
    curriculumSlice: { type: String, required: true, default: "arrays-and-pointers" },
    curriculumVersion: { type: String, required: true, default: "2026.1" },
    weeklyAvailability: {
      studyDaysPerWeek: { type: Number, required: true, min: 1, max: 7, default: 5 },
      dailyMinutes: { type: Number, required: true, min: 10, max: 240, default: 45 },
      availableDaysOfWeek: { type: [Number], default: [1, 2, 3, 4, 5] },
      timezone: { type: String, default: "UTC" },
    },
    startDate: { type: Date, default: Date.now },
    deadline: { type: Date, default: null },
    targetCompletionDate: { type: Date, default: null },
    milestones: { type: [journeyMilestoneSchema], default: [] },
    currentCycleNumber: { type: Number, default: 1 },
    activePlanId: { type: objectId, ref: "Plan", default: null },
    version: { type: Number, default: 1 },
    replanHistory: { type: [replanRecordSchema], default: [] },
  })
);

journeySchema.index({ userId: 1, status: 1 });
journeySchema.index({ userId: 1, learningEpoch: 1 });

export const JourneyModel = getModel<IJourneyDocument>(
  "Journey",
  () => model<IJourneyDocument>("Journey", journeySchema)
);

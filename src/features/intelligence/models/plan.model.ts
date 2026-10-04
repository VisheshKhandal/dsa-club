import { Schema, model, type Document, Types } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";
import type { PausePeriod } from "../types/intelligence.types";

export interface IPlanDocument extends Document {
  userId: Types.ObjectId;
  status: "draft" | "active" | "paused" | "completed" | "archived";
  source: "onboarding" | "customized" | "starter" | "recalibrated";
  version: number;
  activationKey?: string;

  goal: string;
  targetCompanyIds: Types.ObjectId[];
  targetCompanySnapshots: Array<{ id: string; slug: string; name: string }>;
  customCompany?: string;
  primaryTopicId?: Types.ObjectId;
  focusTopicIds: Types.ObjectId[];
  knownTopicIds: Types.ObjectId[];
  experienceLevel: "beginner" | "intermediate" | "advanced";
  language: "cpp" | "java" | "python" | "javascript";
  dailyMinutes: number;
  dailyProblems?: number;
  difficultyPreference: "adaptive" | "standard" | "challenging";
  timezone: string;

  cycleNumber: number;
  totalDays: number;
  startDate: Date;
  targetCompletionDate?: Date;

  pausePeriods: PausePeriod[];
  pausedDaysCount: number;

  completedAt?: Date;
  archivedAt?: Date;

  snapshots: {
    plannerVersion: string;
    curriculumVersion: string;
    primaryTopicSlug?: string;
    inputSnapshot: Record<string, unknown>;
    availabilitySnapshot: {
      status: "ready" | "partial_content" | "content_unavailable" | "blocked_by_prerequisite";
      availableMissionsCount: number;
      availableProblemsCount: number;
    };
    estimatedScheduleSnapshot: Array<{
      dayIndex: number;
      title: string;
      focus: string;
      phase: string;
      topicSlug?: string;
      topicName?: string;
    }>;
  };

  roadmapId?: Types.ObjectId;
}

const planSchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true, index: true },
  status: { type: String, enum: ["draft", "active", "paused", "completed", "archived"], default: "active", index: true },
  source: { type: String, enum: ["onboarding", "customized", "starter", "recalibrated"], required: true },
  version: { type: Number, required: true, default: 1 },
  activationKey: { type: String, default: null },

  goal: { type: String, required: true },
  targetCompanyIds: [{ type: objectId, ref: "Company" }],
  targetCompanySnapshots: [{ id: String, slug: String, name: String }],
  customCompany: { type: String, default: null },
  primaryTopicId: { type: objectId, ref: "Topic", default: null },
  focusTopicIds: [{ type: objectId, ref: "Topic" }],
  knownTopicIds: [{ type: objectId, ref: "Topic" }],
  experienceLevel: { type: String, enum: ["beginner", "intermediate", "advanced"], required: true },
  language: { type: String, enum: ["cpp", "java", "python", "javascript"], required: true },
  dailyMinutes: { type: Number, required: true, min: 15, max: 240 },
  dailyProblems: { type: Number, default: 2, min: 1, max: 4 },
  difficultyPreference: { type: String, enum: ["adaptive", "standard", "challenging"], default: "adaptive" },
  timezone: { type: String, default: "Asia/Kolkata" },

  cycleNumber: { type: Number, default: 1 },
  totalDays: { type: Number, required: true },
  startDate: { type: Date, required: true },
  targetCompletionDate: { type: Date, default: null },

  pausePeriods: [{
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    reason: { type: String, enum: ["break", "exam", "vacation", "manual"], default: "manual" },
  }],
  pausedDaysCount: { type: Number, default: 0 },

  completedAt: { type: Date, default: null },
  archivedAt: { type: Date, default: null },

  snapshots: {
    plannerVersion: { type: String, required: true },
    curriculumVersion: { type: String, required: true },
    primaryTopicSlug: { type: String, default: null },
    inputSnapshot: { type: Schema.Types.Mixed, required: true },
    availabilitySnapshot: {
      status: { type: String, enum: ["ready", "partial_content", "content_unavailable", "blocked_by_prerequisite"], required: true },
      availableMissionsCount: { type: Number, default: 0 },
      availableProblemsCount: { type: Number, default: 0 },
    },
    estimatedScheduleSnapshot: [
      {
        dayIndex: Number,
        title: String,
        focus: String,
        phase: String,
        topicSlug: String,
        topicName: String,
      },
    ],
  },

  roadmapId: { type: objectId, ref: "Roadmap", default: null },
}));

// Partial unique index: Exactly one active plan per user
planSchema.index(
  { userId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "active" } }
);
planSchema.index({ userId: 1, version: -1 });
planSchema.index({ userId: 1, createdAt: -1 });

export const PlanModel = getModel<IPlanDocument>("Plan", () => model<IPlanDocument>("Plan", planSchema));

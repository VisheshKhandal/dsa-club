import { Schema, model, type Document, Types } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";
import type { PlanRelation, PlanTaskStatus } from "../types/intelligence.types";

export interface IPlanTaskDocument extends Document {
  planId: Types.ObjectId;
  planDayId: Types.ObjectId;
  userId: Types.ObjectId;
  dayIndex: number;
  taskKey: string;
  title: string;
  phase: "learn" | "practice" | "revise" | "reflect" | "checkpoint";
  entityType: "mission" | "problem" | "pattern" | "revision" | "reflection" | "checkpoint";
  entityId?: Types.ObjectId | null;
  topicId?: Types.ObjectId | null;
  topicSlug?: string | null;
  topicName?: string | null;
  validationStatus?: "aligned" | "cross_topic_bridge" | "mismatched" | "unavailable";
  order: number;
  required: boolean;
  estimatedMinutes: number;
  actualMinutes: number;
  status: PlanTaskStatus;
  planRelation: PlanRelation;
  completionRequirement?:
    | "engage_practice_attempt"
    | "solve_problem"
    | "solve_independently"
    | "complete_reflection"
    | "perform_review"
    | "demonstrate_recall"
    | null;
  targetUrl?: string;
  startedAt?: Date;
  completedAt?: Date;
  evidence?: {
    problemAttemptId?: Types.ObjectId;
    missionSubmissionId?: Types.ObjectId;
    score?: number;
    passed?: boolean;
    reflectionAnswer?: string;
  };
  reflectionPrompt?: string;
}

const planTaskSchema = withTimestamps(
  new Schema({
    planId: { type: objectId, ref: "Plan", required: true, index: true },
    planDayId: { type: objectId, ref: "PlanDay", required: true, index: true },
    userId: { type: objectId, ref: "User", required: true, index: true },
    dayIndex: { type: Number, required: true, min: 1 },
    taskKey: { type: String, required: true },
    title: { type: String, required: true, maxlength: 200 },
    phase: {
      type: String,
      enum: ["learn", "practice", "revise", "reflect", "checkpoint"],
      required: true,
    },
    entityType: {
      type: String,
      enum: ["mission", "problem", "pattern", "revision", "reflection", "checkpoint"],
      required: true,
    },
    // Nullable/optional for reflections, checkpoints, or abstract tasks
    entityId: { type: objectId, default: null },
    topicId: { type: objectId, ref: "Topic", default: null },
    topicSlug: { type: String, default: null },
    topicName: { type: String, default: null },
    validationStatus: {
      type: String,
      enum: ["aligned", "cross_topic_bridge", "mismatched", "unavailable"],
      default: "aligned",
    },
    order: { type: Number, required: true, default: 1 },
    required: { type: Boolean, default: true },
    estimatedMinutes: { type: Number, required: true, min: 1, max: 240 },
    actualMinutes: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "skipped", "unavailable"],
      default: "pending",
      index: true,
    },
    planRelation: {
      type: String,
      enum: ["planned_today", "plan_revision", "plan_recovery", "plan_extension", "outside_plan"],
      default: "planned_today",
    },
    completionRequirement: {
      type: String,
      enum: [
        "engage_practice_attempt",
        "solve_problem",
        "solve_independently",
        "complete_reflection",
        "perform_review",
        "demonstrate_recall",
      ],
      default: null,
    },
    targetUrl: { type: String, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    evidence: {
      problemAttemptId: { type: objectId, ref: "ProblemAttempt", default: null },
      missionSubmissionId: { type: objectId, ref: "MissionSubmission", default: null },
      score: { type: Number, default: null },
      passed: { type: Boolean, default: null },
      reflectionAnswer: { type: String, default: null, maxlength: 2000 },
    },
    reflectionPrompt: { type: String, default: null, maxlength: 500 },
  })
);

// Enforce unique taskKey per day in a plan
planTaskSchema.index({ planId: 1, dayIndex: 1, taskKey: 1 }, { unique: true });
planTaskSchema.index({ planDayId: 1, order: 1 });
planTaskSchema.index({ userId: 1, status: 1 });
planTaskSchema.index({ entityType: 1, entityId: 1 });
planTaskSchema.index({ topicSlug: 1 });

export const PlanTaskModel = getModel<IPlanTaskDocument>(
  "PlanTask",
  () => model<IPlanTaskDocument>("PlanTask", planTaskSchema)
);

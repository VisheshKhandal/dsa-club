import { Schema, model, type Document, Types } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";

export type PracticeSessionState = "active" | "paused" | "completed" | "abandoned";
export type DurationProvenance = "measured" | "reported" | "unknown";

export interface IPracticeSessionDocument extends Document {
  userId: Types.ObjectId;
  learningEpoch: number;
  problemId: Types.ObjectId;
  contentVersion: number;
  sourceSurface: string;
  planContext?: {
    planId?: Types.ObjectId | null;
    planDayId?: Types.ObjectId | null;
    planTaskId?: Types.ObjectId | null;
    planVersion?: number | null;
  } | null;
  state: PracticeSessionState;
  activeAttemptId?: Types.ObjectId | null;
  activeAttemptNumber: number;
  hintsRevealedLevels: number[];
  editorialViewed: boolean;
  aiAssisted: boolean;
  timerState: {
    accumulatedSeconds: number;
    isRunning: boolean;
    startedAt?: Date | null;
    lastHeartbeatAt?: Date | null;
    provenance: DurationProvenance;
  };
  startedAt: Date;
  completedAt?: Date | null;
  finalizedCommandId?: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const practiceSessionSchema = withTimestamps(
  new Schema({
    userId: { type: objectId, ref: "User", required: true, index: true },
    learningEpoch: { type: Number, required: true, default: 1 },
    problemId: { type: objectId, ref: "Problem", required: true, index: true },
    contentVersion: { type: Number, required: true, default: 1 },
    sourceSurface: { type: String, default: "workspace" },
    planContext: {
      planId: { type: objectId, ref: "Plan", default: null },
      planDayId: { type: objectId, ref: "PlanDay", default: null },
      planTaskId: { type: objectId, ref: "PlanTask", default: null },
      planVersion: { type: Number, default: null },
    },
    state: {
      type: String,
      enum: ["active", "paused", "completed", "abandoned"],
      required: true,
      default: "active",
      index: true,
    },
    activeAttemptId: { type: objectId, ref: "ProblemAttempt", default: null },
    activeAttemptNumber: { type: Number, required: true, default: 1, min: 1 },
    hintsRevealedLevels: [{ type: Number }],
    editorialViewed: { type: Boolean, default: false },
    aiAssisted: { type: Boolean, default: false },
    timerState: {
      accumulatedSeconds: { type: Number, default: 0, min: 0 },
      isRunning: { type: Boolean, default: false },
      startedAt: { type: Date, default: null },
      lastHeartbeatAt: { type: Date, default: null },
      provenance: {
        type: String,
        enum: ["measured", "reported", "unknown"],
        default: "unknown",
      },
    },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date, default: null },
    finalizedCommandId: { type: String, default: null },
    version: { type: Number, default: 1 },
  })
);

// Unique partial index: at most one active/paused session per problem for a user within an epoch
practiceSessionSchema.index(
  { userId: 1, learningEpoch: 1, problemId: 1 },
  { unique: true, partialFilterExpression: { state: { $in: ["active", "paused"] } } }
);

practiceSessionSchema.index({ userId: 1, learningEpoch: 1, updatedAt: -1 });

export const PracticeSessionModel = getModel<IPracticeSessionDocument>(
  "PracticeSession",
  () => model<IPracticeSessionDocument>("PracticeSession", practiceSessionSchema)
);

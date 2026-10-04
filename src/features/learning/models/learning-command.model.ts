import { Schema, model, type Document, Types } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";

export type LearningCommandKind = "practice_submission" | "review_submission" | "session_action";
export type LearningCommandStatus = "committed" | "conflict" | "failed";

export interface PlanEffectSummary {
  status: "completed" | "already_completed" | "not_applicable" | "stale_context";
  planTaskId?: string | null;
  dayAdvanced?: boolean;
  nextDayIndex?: number | null;
}

export interface ReviewEffectSummary {
  queueId?: string | null;
  grade?: number;
  nextIntervalDays?: number;
  dueAt?: string | null;
}

export interface LearningReceipt {
  commandId: string;
  commandKind: LearningCommandKind;
  sessionId?: string | null;
  attemptId?: string | null;
  reviewAttemptId?: string | null;
  committedAt: string;
  learningEpoch: number;
  outcome: string;
  outcomeSource: "learner-reported" | "system-verified";
  durationProvenance: "measured" | "reported" | "unknown";
  durationSeconds: number;
  assistanceSummary: {
    hintsUsed: number;
    editorialViewed: boolean;
    aiAssisted: boolean;
    strategy: string;
  };
  planEffect: PlanEffectSummary;
  reviewEffect?: ReviewEffectSummary;
  downstreamStatus: "pending" | "synchronized" | "failed";
  safeContinuation?: {
    nextProblemSlug?: string;
    nextUrl?: string;
  };
}

export interface ILearningCommandDocument extends Document {
  userId: Types.ObjectId;
  learningEpoch: number;
  commandId: string;
  commandKind: LearningCommandKind;
  payloadHash: string;
  status: LearningCommandStatus;
  receipt: LearningReceipt;
  downstreamStatus: "pending" | "synchronized" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

const learningCommandSchema = withTimestamps(
  new Schema({
    userId: { type: objectId, ref: "User", required: true, index: true },
    learningEpoch: { type: Number, required: true, default: 1 },
    commandId: { type: String, required: true },
    commandKind: {
      type: String,
      enum: ["practice_submission", "review_submission", "session_action"],
      required: true,
    },
    payloadHash: { type: String, required: true },
    status: {
      type: String,
      enum: ["committed", "conflict", "failed"],
      required: true,
      default: "committed",
    },
    receipt: { type: Schema.Types.Mixed, required: true },
    downstreamStatus: {
      type: String,
      enum: ["pending", "synchronized", "failed"],
      default: "pending",
    },
  })
);

learningCommandSchema.index({ userId: 1, learningEpoch: 1, commandId: 1 }, { unique: true });
learningCommandSchema.index({ userId: 1, learningEpoch: 1, createdAt: -1 });

export const LearningCommandModel = getModel<ILearningCommandDocument>(
  "LearningCommand",
  () => model<ILearningCommandDocument>("LearningCommand", learningCommandSchema)
);

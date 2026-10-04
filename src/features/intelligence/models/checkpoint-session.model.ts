import { Schema, model, type Document, Types } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";
import type { CheckpointItemType } from "./checkpoint-item.model";

export type CheckpointSessionStatus = "started" | "paused" | "submitted" | "abandoned";
export type CheckpointPurpose = "diagnostic" | "checkpoint";

export interface ICheckpointSessionDocument extends Document {
  sessionId: string;
  userId: Types.ObjectId;
  learningEpoch: number;
  purpose: CheckpointPurpose;
  topicSlug: string;
  itemKey: string;
  itemVersion: string;
  capability: string;
  itemType: CheckpointItemType;
  status: CheckpointSessionStatus;
  hintsUsed: number;
  solutionViewed: boolean;
  priorExposureCount: number;
  startedAt: Date;
  submittedAt?: Date | null;
  activeAttemptId?: Types.ObjectId | null;
  idempotencyKey?: string | null;
  selectedOptionKey?: string | null;
  resultSnapshot?: {
    isCorrect: boolean;
    score: number;
    feedback: string;
    demonstratedIndependence: boolean;
    isProvisional: boolean;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

const checkpointSessionSchema = withTimestamps(
  new Schema({
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: objectId, ref: "User", required: true, index: true },
    learningEpoch: { type: Number, required: true, default: 1 },
    purpose: {
      type: String,
      enum: ["diagnostic", "checkpoint"],
      default: "checkpoint",
    },
    topicSlug: { type: String, required: true, index: true },
    itemKey: { type: String, required: true, index: true },
    itemVersion: { type: String, required: true },
    capability: { type: String, required: true },
    itemType: {
      type: String,
      enum: ["invariant_recognition", "boundary_reasoning", "constraint_analysis", "variant_transfer"],
      required: true,
    },
    status: {
      type: String,
      enum: ["started", "paused", "submitted", "abandoned"],
      default: "started",
      index: true,
    },
    hintsUsed: { type: Number, default: 0, min: 0 },
    solutionViewed: { type: Boolean, default: false },
    priorExposureCount: { type: Number, default: 0, min: 0 },
    startedAt: { type: Date, required: true, default: Date.now },
    submittedAt: { type: Date, default: null },
    activeAttemptId: { type: objectId, ref: "CheckpointAttempt", default: null },
    idempotencyKey: { type: String, default: null, index: true },
    selectedOptionKey: { type: String, default: null },
    resultSnapshot: {
      type: new Schema(
        {
          isCorrect: { type: Boolean, required: true },
          score: { type: Number, required: true },
          feedback: { type: String, required: true },
          demonstratedIndependence: { type: Boolean, required: true },
          isProvisional: { type: Boolean, required: true },
        },
        { _id: false }
      ),
      default: null,
    },
  })
);

checkpointSessionSchema.index({ userId: 1, learningEpoch: 1, itemKey: 1 });
checkpointSessionSchema.index({ userId: 1, status: 1 });

export const CheckpointSessionModel = getModel<ICheckpointSessionDocument>(
  "CheckpointSession",
  () => model<ICheckpointSessionDocument>("CheckpointSession", checkpointSessionSchema)
);

import { Schema, model, type Document, Types } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";

export type DeliveryHandlerName =
  | "topic_progress_projection"
  | "activity_statistics"
  | "gamification_xp"
  | "recommendation_invalidation";

export type DeliveryStatus = "pending" | "claimed" | "completed" | "failed";

export interface ILearningDeliveryDocument extends Document {
  userId: Types.ObjectId;
  learningEpoch: number;
  deliveryKey: string;
  handler: DeliveryHandlerName;
  eventId?: Types.ObjectId | null;
  commandId?: string | null;
  payload: Record<string, unknown>;
  status: DeliveryStatus;
  attemptCount: number;
  maxAttempts: number;
  lastError?: string | null;
  claimedBy?: string | null;
  leaseExpiresAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const learningDeliverySchema = withTimestamps(
  new Schema({
    userId: { type: objectId, ref: "User", required: true, index: true },
    learningEpoch: { type: Number, required: true, default: 1 },
    deliveryKey: { type: String, required: true },
    handler: {
      type: String,
      enum: [
        "topic_progress_projection",
        "activity_statistics",
        "gamification_xp",
        "recommendation_invalidation",
      ],
      required: true,
      index: true,
    },
    eventId: { type: objectId, ref: "LearningEvent", default: null },
    commandId: { type: String, default: null },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["pending", "claimed", "completed", "failed"],
      default: "pending",
      index: true,
    },
    attemptCount: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 5, min: 1 },
    lastError: { type: String, default: null, maxlength: 2000 },
    claimedBy: { type: String, default: null },
    leaseExpiresAt: { type: Date, default: null, index: true },
    completedAt: { type: Date, default: null },
  })
);

learningDeliverySchema.index({ userId: 1, learningEpoch: 1, deliveryKey: 1 }, { unique: true });
learningDeliverySchema.index({ status: 1, leaseExpiresAt: 1, createdAt: 1 });

export const LearningDeliveryModel = getModel<ILearningDeliveryDocument>(
  "LearningDelivery",
  () => model<ILearningDeliveryDocument>("LearningDelivery", learningDeliverySchema)
);

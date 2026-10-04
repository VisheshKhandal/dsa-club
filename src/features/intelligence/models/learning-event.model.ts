import { Schema, model, type Document, Types } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";
import {
  LEARNING_EVENT_TYPES,
  type LearningEventType,
  type LearningEventSource,
} from "../events/learning-event.types";

export interface ILearningEventDocument extends Document {
  userId: Types.ObjectId;
  eventType: LearningEventType;
  occurredAt: Date;
  occurredAtTimezone: string;
  receivedAt: Date;
  learningEpoch: number;
  idempotencyKey: string;
  schemaVersion: number;
  source: LearningEventSource;
  correlationId?: string | null;

  // Contextual references
  planId?: Types.ObjectId | null;
  planDayId?: Types.ObjectId | null;
  planTaskId?: Types.ObjectId | null;
  topicId?: Types.ObjectId | null;
  topicSlug?: string | null;
  problemId?: Types.ObjectId | null;
  missionId?: Types.ObjectId | null;
  sessionId?: string | null;

  // Generic/Arbitrary payload matching event type
  payload: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

const learningEventSchema = withTimestamps(
  new Schema({
    userId: { type: objectId, ref: "User", required: true, index: true },
    eventType: {
      type: String,
      enum: LEARNING_EVENT_TYPES,
      required: true,
      index: true,
    },
    occurredAt: { type: Date, required: true, index: true },
    occurredAtTimezone: { type: String, required: true, default: "UTC" },
    receivedAt: { type: Date, default: Date.now, immutable: true },
    learningEpoch: { type: Number, required: true, default: 1, index: true },
    idempotencyKey: { type: String, required: true },
    schemaVersion: { type: Number, required: true, default: 1 },
    source: {
      type: String,
      enum: ["browser", "server", "system", "migration"],
      default: "server",
    },
    correlationId: { type: String, default: null },

    planId: { type: objectId, ref: "Plan", default: null, index: true },
    planDayId: { type: objectId, ref: "PlanDay", default: null },
    planTaskId: { type: objectId, ref: "PlanTask", default: null, index: true },
    topicId: { type: objectId, ref: "Topic", default: null },
    topicSlug: { type: String, default: null },
    problemId: { type: objectId, ref: "Problem", default: null },
    missionId: { type: objectId, ref: "Mission", default: null },
    sessionId: { type: String, default: null },

    payload: { type: Schema.Types.Mixed, default: {} },
  })
);

// ── CRITICAL EVENT SOURCING INVARIANTS & INDEXES ──

// 1. Strict per-user/epoch Idempotency Gate:
// Prevents duplicate event ingestion across network retries, race conditions, and double-clicks.
learningEventSchema.index({ userId: 1, learningEpoch: 1, idempotencyKey: 1 }, { unique: true });

// 2. Timeline & Replay Index:
// Powers projection rebuilding and event replay ordered chronologically.
learningEventSchema.index({ userId: 1, occurredAt: 1 });

// 3. Task Evidence Index:
// Allows instant retrieval of all events (attempts, hints, completions) for a specific plan task.
learningEventSchema.index({ planTaskId: 1, occurredAt: 1 });

// 4. Plan Audit Index:
// Allows retrieving full plan-level history.
learningEventSchema.index({ planId: 1, occurredAt: 1 });

// 5. Topic Progression Index:
// Fast event replay for topic-specific projections.
learningEventSchema.index({ userId: 1, topicSlug: 1, occurredAt: 1 });

// 6. Global Event Type Timeline:
learningEventSchema.index({ eventType: 1, occurredAt: 1 });

// ── IMMUTABILITY GUARDS ──
// Events represent immutable facts in the past. They must NEVER be updated or overwritten.
learningEventSchema.pre(["updateOne", "updateMany", "findOneAndUpdate", "replaceOne"], function () {
  throw new Error("LearningEvent documents are immutable and cannot be updated.");
});

export const LearningEventModel = getModel<ILearningEventDocument>(
  "LearningEvent",
  () => model<ILearningEventDocument>("LearningEvent", learningEventSchema)
);

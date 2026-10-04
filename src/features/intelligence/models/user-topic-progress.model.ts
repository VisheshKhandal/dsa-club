import { Schema, model, type Document, Types } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";

export interface IUserTopicProgressDocument extends Document {
  userId: Types.ObjectId;
  topicSlug: string;
  topicId?: Types.ObjectId | null;

  // Counts & Evidence metrics
  attemptedCount: number;
  completedCount: number;
  independentSolveCount: number;
  hintCount: number;
  seenHintKeys?: string[];
  skippedCount: number;
  totalMinutesSpent: number;

  // Metacognition
  averageConfidence: number;
  confidenceSubmissionsCount: number;

  // Spaced Repetition & Retention
  lastAttemptAt?: Date | null;
  lastCompletedAt?: Date | null;
  reviewDueAt?: Date | null;

  // Derived intelligence score (0 - 100)
  masteryScore: number;

  // Projection audit metadata
  learningEpoch: number;
  projectionVersion: number;
  lastProcessedEventId?: string | null;
  lastProcessedOccurredAt?: Date | null;
  processedEventIds: string[];
  rebuildStatus: "healthy" | "stale" | "rebuilding";

  createdAt: Date;
  updatedAt: Date;
}

const userTopicProgressSchema = withTimestamps(
  new Schema({
    userId: { type: objectId, ref: "User", required: true, index: true },
    learningEpoch: { type: Number, required: true, default: 1, index: true },
    topicSlug: { type: String, required: true, index: true },
    topicId: { type: objectId, ref: "Topic", default: null },

    attemptedCount: { type: Number, default: 0, min: 0 },
    completedCount: { type: Number, default: 0, min: 0 },
    independentSolveCount: { type: Number, default: 0, min: 0 },
    hintCount: { type: Number, default: 0, min: 0 },
    seenHintKeys: { type: [String], default: [] },
    skippedCount: { type: Number, default: 0, min: 0 },
    totalMinutesSpent: { type: Number, default: 0, min: 0 },

    averageConfidence: { type: Number, default: 0, min: 0, max: 5 },
    confidenceSubmissionsCount: { type: Number, default: 0, min: 0 },

    lastAttemptAt: { type: Date, default: null },
    lastCompletedAt: { type: Date, default: null },
    reviewDueAt: { type: Date, default: null, index: true },

    masteryScore: { type: Number, default: 0, min: 0, max: 100 },

    projectionVersion: { type: Number, default: 1 },
    lastProcessedEventId: { type: String, default: null },
    lastProcessedOccurredAt: { type: Date, default: null },
    processedEventIds: { type: [String], default: [] },
    rebuildStatus: {
      type: String,
      enum: ["healthy", "stale", "rebuilding"],
      default: "healthy",
    },
  })
);

// ── FAST READ & UNIQUENESS INDEXES ──

// Unique constraint: Exactly one progress projection per user per topic per learning epoch
userTopicProgressSchema.index({ userId: 1, learningEpoch: 1, topicSlug: 1 }, { unique: true });

// Retention & review queue fast lookup
userTopicProgressSchema.index({ userId: 1, reviewDueAt: 1 });

export const UserTopicProgressModel = getModel<IUserTopicProgressDocument>(
  "UserTopicProgress",
  () => model<IUserTopicProgressDocument>("UserTopicProgress", userTopicProgressSchema)
);

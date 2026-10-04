import { Schema, model, type Document, Types } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";

export type CheckpointItemType =
  | "invariant_recognition"
  | "boundary_reasoning"
  | "constraint_analysis"
  | "variant_transfer";

export type CheckpointEvidenceType =
  | "recognition"
  | "invariant_explanation"
  | "implementation"
  | "boundary_reasoning"
  | "retention"
  | "variant_transfer";

export type CheckpointVariantType =
  | "baseline"
  | "changed_constraints"
  | "boundary_shift"
  | "distractor_trap"
  | "negative_signed_domain"
  | "duplicate_values";

export type EditorialReviewStatus =
  | "draft"
  | "review_ready"
  | "approved"
  | "reviewed"
  | "published"
  | "retired";

export interface IRubricOption {
  key: string;
  text: string;
  isCorrect: boolean;
  explanation: string;
  misconceptionType?:
    | "misunderstood_prerequisite"
    | "incorrect_invariant"
    | "boundary_condition_issue"
    | "constraint_mismatch"
    | "implementation_difficulty"
    | "failed_recall"
    | "unknown_cause";
}

export interface ICheckpointItemDocument extends Document {
  itemKey: string;
  version: string;
  topicSlug: string;
  capability: string;
  prompt: string;
  itemType: CheckpointItemType;
  evidenceType: CheckpointEvidenceType;
  variantFamilyId?: string;
  variantType?: CheckpointVariantType;
  prerequisites: string[];
  difficulty: "easy" | "medium" | "hard";
  expectedDurationMinutes: number;
  allowedAssistance: "none" | "hints_locked";
  evaluationRubric: {
    options?: IRubricOption[];
    referenceAnswer?: string;
    keyPoints?: string[];
  };
  difficultyRationale: string;
  provenance: string;
  reviewStatus: EditorialReviewStatus;
  reviewer?: string | null;
  reviewedAt?: Date | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const rubricOptionSchema = new Schema(
  {
    key: { type: String, required: true },
    text: { type: String, required: true },
    isCorrect: { type: Boolean, required: true },
    explanation: { type: String, required: true },
    misconceptionType: { type: String, default: null },
  },
  { _id: false }
);

const checkpointItemSchema = withTimestamps(
  new Schema({
    itemKey: { type: String, required: true, index: true },
    version: { type: String, required: true, default: "1.0.0" },
    topicSlug: { type: String, required: true, index: true },
    capability: { type: String, required: true },
    prompt: { type: String, required: true },
    itemType: {
      type: String,
      enum: ["invariant_recognition", "boundary_reasoning", "constraint_analysis", "variant_transfer"],
      required: true,
    },
    evidenceType: {
      type: String,
      enum: [
        "recognition",
        "invariant_explanation",
        "implementation",
        "boundary_reasoning",
        "retention",
        "variant_transfer",
      ],
      default: "boundary_reasoning",
    },
    variantFamilyId: { type: String, default: null, index: true },
    variantType: {
      type: String,
      enum: [
        "baseline",
        "changed_constraints",
        "boundary_shift",
        "distractor_trap",
        "negative_signed_domain",
        "duplicate_values",
      ],
      default: "baseline",
    },
    prerequisites: [{ type: String }],
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    expectedDurationMinutes: { type: Number, required: true, min: 2, max: 60, default: 8 },
    allowedAssistance: {
      type: String,
      enum: ["none", "hints_locked"],
      default: "none",
    },
    evaluationRubric: {
      options: { type: [rubricOptionSchema], default: [] },
      referenceAnswer: { type: String, default: null },
      keyPoints: { type: [String], default: [] },
    },
    difficultyRationale: { type: String, required: true },
    provenance: { type: String, required: true },
    reviewStatus: {
      type: String,
      enum: ["draft", "review_ready", "approved", "reviewed", "published", "retired"],
      default: "review_ready",
      index: true,
    },
    reviewer: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    isPublished: { type: Boolean, default: false, index: true },
  })
);

checkpointItemSchema.index({ itemKey: 1, version: 1 }, { unique: true });
checkpointItemSchema.index({ topicSlug: 1, reviewStatus: 1, isPublished: 1 });

export const CheckpointItemModel = getModel<ICheckpointItemDocument>(
  "CheckpointItem",
  () => model<ICheckpointItemDocument>("CheckpointItem", checkpointItemSchema)
);

export interface ICheckpointAttemptDocument extends Document {
  userId: Types.ObjectId;
  learningEpoch: number;
  itemKey: string;
  itemVersion: string;
  topicSlug: string;
  capability: string;
  evidenceType: CheckpointEvidenceType;
  variantFamilyId?: string | null;
  isTransferEvidence: boolean;
  evaluationMode: "deterministic_rubric" | "self_reported" | "unscored_reasoning";
  priorExposureCount: number;
  repairId?: string | null;
  sessionId?: string | null;
  idempotencyKey?: string | null;
  selectedOptionKey?: string | null;
  responseContent?: string | null;
  isCorrect: boolean;
  score: number;
  demonstratedIndependence: boolean;
  feedback: string;
  durationSeconds: number;
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const checkpointAttemptSchema = withTimestamps(
  new Schema({
    userId: { type: objectId, ref: "User", required: true, index: true },
    learningEpoch: { type: Number, required: true, default: 1 },
    itemKey: { type: String, required: true, index: true },
    itemVersion: { type: String, required: true },
    topicSlug: { type: String, required: true },
    capability: { type: String, required: true },
    evidenceType: { type: String, default: "boundary_reasoning" },
    variantFamilyId: { type: String, default: null },
    isTransferEvidence: { type: Boolean, default: false },
    evaluationMode: {
      type: String,
      enum: ["deterministic_rubric", "self_reported", "unscored_reasoning"],
      default: "deterministic_rubric",
    },
    priorExposureCount: { type: Number, default: 0 },
    repairId: { type: String, default: null },
    sessionId: { type: String, default: null, index: true },
    idempotencyKey: { type: String, default: null, index: true },
    selectedOptionKey: { type: String, default: null },
    responseContent: { type: String, default: null },
    isCorrect: { type: Boolean, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    demonstratedIndependence: { type: Boolean, default: true },
    feedback: { type: String, required: true },
    completedAt: { type: Date, default: Date.now },
  })
);

checkpointAttemptSchema.index({ userId: 1, itemKey: 1, learningEpoch: 1 });
checkpointAttemptSchema.index(
  { userId: 1, sessionId: 1 },
  { unique: true, partialFilterExpression: { sessionId: { $type: "string" } } }
);
checkpointAttemptSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

export const CheckpointAttemptModel = getModel<ICheckpointAttemptDocument>(
  "CheckpointAttempt",
  () => model<ICheckpointAttemptDocument>("CheckpointAttempt", checkpointAttemptSchema)
);

export { CheckpointSessionModel } from "./checkpoint-session.model";


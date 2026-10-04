import { Schema, model, type Document, Types } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";

export type MistakeRootDifficulty =
  | "misunderstood_prerequisite"
  | "incorrect_invariant"
  | "boundary_condition_issue"
  | "constraint_mismatch"
  | "implementation_difficulty"
  | "failed_recall"
  | "unknown_cause";

export type RepairDiagnosisSource =
  | "reviewed_rubric"
  | "learner_reflection"
  | "system_fallback";

export type MistakeRepairStatus =
  | "pending"
  | "activity_completed"
  | "follow_up_passed"
  | "further_evidence_needed";

export interface IMistakeRepairDocument extends Document {
  repairId: string;
  userId: Types.ObjectId;
  learningEpoch: number;
  sourceType: "problem_attempt" | "checkpoint_attempt" | "spaced_review";
  sourceId: string;
  capability: string;
  topicSlug: string;
  rootDifficulty: MistakeRootDifficulty;
  diagnosisSource: RepairDiagnosisSource;
  explanation: string;
  activity: {
    activityType: "concept_refresh" | "targeted_problem" | "boundary_checkpoint" | "retrieval_recheck";
    slugOrKey: string;
    title: string;
    estimatedMinutes: number;
  };
  recheckItemKey?: string | null;
  status: MistakeRepairStatus;
  resolutionEvidence?: {
    passed: boolean;
    independent: boolean;
    score: number;
    evaluatedAt?: Date;
    notes?: string;
  };
  dedupKey: string;
  completedAt?: Date | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const repairActivitySchema = new Schema(
  {
    activityType: {
      type: String,
      enum: ["concept_refresh", "targeted_problem", "boundary_checkpoint", "retrieval_recheck"],
      required: true,
    },
    slugOrKey: { type: String, required: true },
    title: { type: String, required: true },
    estimatedMinutes: { type: Number, required: true, default: 10 },
  },
  { _id: false }
);

const mistakeRepairSchema = withTimestamps(
  new Schema({
    repairId: { type: String, required: true, unique: true, index: true },
    userId: { type: objectId, ref: "User", required: true, index: true },
    learningEpoch: { type: Number, required: true, default: 1 },
    sourceType: {
      type: String,
      enum: ["problem_attempt", "checkpoint_attempt", "spaced_review"],
      required: true,
    },
    sourceId: { type: String, required: true },
    capability: { type: String, required: true },
    topicSlug: { type: String, required: true },
    rootDifficulty: {
      type: String,
      enum: [
        "misunderstood_prerequisite",
        "incorrect_invariant",
        "boundary_condition_issue",
        "constraint_mismatch",
        "implementation_difficulty",
        "failed_recall",
        "unknown_cause",
      ],
      required: true,
    },
    diagnosisSource: {
      type: String,
      enum: ["reviewed_rubric", "learner_reflection", "system_fallback"],
      required: true,
    },
    explanation: { type: String, required: true },
    activity: { type: repairActivitySchema, required: true },
    recheckItemKey: { type: String, default: null },
    status: {
      type: String,
      enum: ["pending", "activity_completed", "follow_up_passed", "further_evidence_needed"],
      default: "pending",
      index: true,
    },
    resolutionEvidence: {
      passed: { type: Boolean },
      independent: { type: Boolean },
      score: { type: Number },
      evaluatedAt: { type: Date },
      notes: { type: String },
    },
    dedupKey: { type: String, required: true, unique: true, index: true },
    completedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
  })
);

mistakeRepairSchema.index({ userId: 1, learningEpoch: 1, status: 1 });
mistakeRepairSchema.index({ userId: 1, capability: 1 });

export const MistakeRepairModel = getModel<IMistakeRepairDocument>(
  "MistakeRepair",
  () => model<IMistakeRepairDocument>("MistakeRepair", mistakeRepairSchema)
);

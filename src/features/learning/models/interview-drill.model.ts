import { Schema, model, type Document, Types } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";

export type InterviewDrillStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface IInterviewDrillDocument extends Document {
  drillId: string;
  userId: Types.ObjectId;
  learningEpoch: number;
  problemSlug: string;
  practiceSessionId?: Types.ObjectId | null;
  currentStep: InterviewDrillStep;
  stepResponses: {
    step1Constraints?: string;
    step2Approach?: string;
    step3Implementation?: {
      codeSnippet?: string;
      selfReportedStatus?: "solved" | "partially_solved" | "blocked";
      hintsUsed?: number;
      solutionViewed?: boolean;
    };
    step4BoundaryCases?: string;
    step5Complexity?: {
      timeComplexity?: string;
      spaceComplexity?: string;
    };
  };
  timeboxMinutes?: number | null;
  elapsedActiveSeconds: number;
  isPaused: boolean;
  startedAt: Date;
  lastResumedAt?: Date | null;
  completedAt?: Date | null;
  status: "active" | "paused" | "completed";
  debrief?: {
    summary: string;
    demonstratedIndependence: boolean;
    hintsUsed: number;
    solutionViewed: boolean;
    repairScheduled: boolean;
    reviewScheduled: boolean;
    factualOutcome: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

const interviewDrillSchema = withTimestamps(
  new Schema({
    drillId: { type: String, required: true, unique: true, index: true },
    userId: { type: objectId, ref: "User", required: true, index: true },
    learningEpoch: { type: Number, required: true, default: 1 },
    problemSlug: { type: String, required: true, index: true },
    practiceSessionId: { type: objectId, ref: "PracticeSession", default: null },
    currentStep: { type: Number, min: 1, max: 6, default: 1 },
    stepResponses: {
      step1Constraints: { type: String, default: null },
      step2Approach: { type: String, default: null },
      step3Implementation: {
        codeSnippet: { type: String, default: null },
        selfReportedStatus: {
          type: String,
          enum: ["solved", "partially_solved", "blocked"],
          default: null,
        },
        hintsUsed: { type: Number, default: 0 },
        solutionViewed: { type: Boolean, default: false },
      },
      step4BoundaryCases: { type: String, default: null },
      step5Complexity: {
        timeComplexity: { type: String, default: null },
        spaceComplexity: { type: String, default: null },
      },
    },
    timeboxMinutes: { type: Number, default: 30 },
    elapsedActiveSeconds: { type: Number, default: 0 },
    isPaused: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now },
    lastResumedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["active", "paused", "completed"],
      default: "active",
      index: true,
    },
    debrief: {
      summary: { type: String },
      demonstratedIndependence: { type: Boolean },
      hintsUsed: { type: Number },
      solutionViewed: { type: Boolean },
      repairScheduled: { type: Boolean },
      reviewScheduled: { type: Boolean },
      factualOutcome: { type: String },
    },
  })
);

interviewDrillSchema.index({ userId: 1, problemSlug: 1, status: 1 });

export const InterviewDrillModel = getModel<IInterviewDrillDocument>(
  "InterviewDrill",
  () => model<IInterviewDrillDocument>("InterviewDrill", interviewDrillSchema)
);

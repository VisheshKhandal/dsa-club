import { Schema, model, type Document, Types } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";

export type TrackPublicationStatus = "draft" | "review_ready" | "approved" | "published";

export interface ITrackUnit {
  unitId: string;
  order: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  problemSlugs: string[];
  missionSlugs?: string[];
  checkpointKeys: string[];
  requiredToComplete: boolean;
}

export interface ITrackDocument extends Document {
  trackSlug: string;
  version: string;
  title: string;
  shortDescription: string;
  targetProfile: {
    minExperience: "beginner" | "intermediate" | "advanced";
    description: string;
  };
  prerequisites: string[];
  supportedScope: string;
  coveredCapabilities: string[];
  excludedTopics: string[];
  workloadHours: number;
  completionCriteria: {
    minCompletedProblems: number;
    minMasteryScore: number;
    minCheckpointsPassed: number;
  };
  provenance: string;
  publicationStatus: TrackPublicationStatus;
  isCommercial?: boolean;
  requiredPlanTier?: string;
  units: ITrackUnit[];
  createdAt: Date;
  updatedAt: Date;
}

const trackUnitSchema = new Schema(
  {
    unitId: { type: String, required: true },
    order: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    estimatedMinutes: { type: Number, required: true, default: 45 },
    problemSlugs: [{ type: String }],
    missionSlugs: [{ type: String }],
    checkpointKeys: [{ type: String }],
    requiredToComplete: { type: Boolean, default: true },
  },
  { _id: false }
);

const trackSchema = withTimestamps(
  new Schema({
    trackSlug: { type: String, required: true, unique: true, index: true },
    version: { type: String, required: true, default: "1.0.0" },
    title: { type: String, required: true },
    shortDescription: { type: String, required: true },
    targetProfile: {
      minExperience: {
        type: String,
        enum: ["beginner", "intermediate", "advanced"],
        default: "intermediate",
      },
      description: { type: String, required: true },
    },
    prerequisites: [{ type: String }],
    supportedScope: { type: String, required: true },
    coveredCapabilities: [{ type: String }],
    excludedTopics: [{ type: String }],
    workloadHours: { type: Number, required: true, default: 6 },
    completionCriteria: {
      minCompletedProblems: { type: Number, default: 2 },
      minMasteryScore: { type: Number, default: 60 },
      minCheckpointsPassed: { type: Number, default: 2 },
    },
    provenance: { type: String, required: true },
    publicationStatus: {
      type: String,
      enum: ["draft", "review_ready", "approved", "published"],
      default: "published",
      index: true,
    },
    isCommercial: { type: Boolean, default: false },
    requiredPlanTier: {
      type: String,
      default: "free",
    },
    units: { type: [trackUnitSchema], default: [] },
  })
);

export const TrackModel = getModel<ITrackDocument>(
  "Track",
  () => model<ITrackDocument>("Track", trackSchema)
);

export interface ITrackEnrollmentDocument extends Document {
  userId: Types.ObjectId;
  learningEpoch: number;
  trackSlug: string;
  trackVersion: string;
  journeyId?: Types.ObjectId | null;
  planId?: Types.ObjectId | null;
  status: "active" | "completed" | "paused";
  enrolledAt: Date;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const trackEnrollmentSchema = withTimestamps(
  new Schema({
    userId: { type: objectId, ref: "User", required: true, index: true },
    learningEpoch: { type: Number, required: true, default: 1 },
    trackSlug: { type: String, required: true, index: true },
    trackVersion: { type: String, required: true },
    journeyId: { type: objectId, ref: "Journey", default: null },
    planId: { type: objectId, ref: "Plan", default: null },
    status: {
      type: String,
      enum: ["active", "completed", "paused"],
      default: "active",
      index: true,
    },
    enrolledAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  })
);

// One active enrollment per user per track per epoch
trackEnrollmentSchema.index(
  { userId: 1, learningEpoch: 1, trackSlug: 1 },
  { unique: true }
);

export const TrackEnrollmentModel = getModel<ITrackEnrollmentDocument>(
  "TrackEnrollment",
  () => model<ITrackEnrollmentDocument>("TrackEnrollment", trackEnrollmentSchema)
);

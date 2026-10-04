import { model, Schema, type InferSchemaType } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";

const userSchema = withTimestamps(new Schema({
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
  image: { type: String, default: null, maxlength: 2048 },
  passwordHash: { type: String, default: null, select: false },
  emailVerified: { type: Date, default: null },
  authProviders: [{ type: String, enum: ["credentials", "google", "github"] }],
  role: { type: String, enum: ["student", "mentor", "author", "admin"], default: "student", index: true },
  status: { type: String, enum: ["active", "suspended", "deleted"], default: "active", index: true },
  timezone: { type: String, default: "Asia/Kolkata", maxlength: 64 },
  locale: { type: String, default: "en-IN", maxlength: 16 },
  learningEpoch: { type: Number, default: 1, min: 1 },
  lastActiveAt: { type: Date, default: Date.now, index: true },
  deletedAt: { type: Date, default: null },
}));
userSchema.index({ email: 1 }, { unique: true });

const profileSchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true, unique: true },
  currentLevel: { type: String, enum: ["absolute_beginner", "beginner", "intermediate", "advanced"], default: "beginner" },
  primaryLanguage: { type: String, enum: ["cpp", "java", "python", "javascript", "typescript", "go", "rust"], default: "cpp" },
  goals: [{ type: String, enum: ["placements", "internship", "interviews", "competitive_programming", "foundation"] }],
  targetCompanyIds: [{ type: objectId, ref: "Company" }],
  dailyMinutes: { type: Number, default: 60, min: 15, max: 720 },
  targetDate: { type: Date, default: null },
  onboardingCompletedAt: { type: Date, default: null },
  knownTopicIds: [{ type: objectId, ref: "Topic" }],
  activeRoadmapId: { type: objectId, ref: "Roadmap", default: null },
  roadmapSource: { type: String, enum: ["starter", "personalized"], default: "starter" },
  onboarding: {
    status: { type: String, enum: ["not_started", "in_progress", "completed", "skipped"], default: "not_started" },
    currentStep: { type: Number, default: 0, min: 0, max: 7 },
    draft: {
      experienceLevel: { type: String, enum: ["beginner", "intermediate", "advanced"], default: null },
      companySlugs: [{ type: String, lowercase: true, trim: true }],
      customCompany: { type: String, trim: true, default: null },
      dailyMinutes: { type: Number, min: 15, max: 240, default: null },
      language: { type: String, enum: ["cpp", "java", "python", "javascript"], default: null },
      topicKnowledgeMode: { type: String, enum: ["starting_fresh", "select_known_topics"], default: null },
      knownTopicSlugs: [{ type: String, lowercase: true, trim: true }],
      learningGoal: { type: String, enum: ["internship", "placement", "switch", "foundation", "interview", "not_sure"], default: null },
    },
    completedAt: { type: Date, default: null },
    skippedAt: { type: Date, default: null },
  },
  preferences: {
    type: Schema.Types.Mixed,
    default: {
      reminderEnabled: true,
      reminderTime: "19:00",
      difficultyPreference: "adaptive",
    },
  },
}));

export type User = InferSchemaType<typeof userSchema>;
export type UserProfile = InferSchemaType<typeof profileSchema>;
export const UserModel = getModel("User", () => model<User>("User", userSchema));
export const UserProfileModel = getModel("UserProfile", () => model<UserProfile>("UserProfile", profileSchema));

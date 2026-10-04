import { model, Schema } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";

const revisionQueueSchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true }, entityType: { type: String, enum: ["topic", "pattern", "problem", "mission"], required: true }, entityId: { type: objectId, required: true },
  state: { type: String, enum: ["scheduled", "due", "snoozed", "completed", "retired"], default: "scheduled", index: true },
  dueAt: { type: Date, required: true, index: true }, lastReviewedAt: { type: Date, default: null }, intervalDays: { type: Number, default: 1, min: 0.04, max: 3650 }, easeFactor: { type: Number, default: 2.3, min: 1.3, max: 3.2 }, repetitions: { type: Number, default: 0, min: 0 }, lapses: { type: Number, default: 0, min: 0 }, priority: { type: Number, default: 50, min: 0, max: 100 }, source: { type: String, enum: ["mission", "attempt", "recommendation", "manual"], required: true }, snoozedUntil: { type: Date, default: null },
  version: { type: Number, default: 1 },
}));
revisionQueueSchema.index({ userId: 1, entityType: 1, entityId: 1 }, { unique: true });
revisionQueueSchema.index({ userId: 1, state: 1, dueAt: 1, priority: -1 });

const revisionHistorySchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true }, queueId: { type: objectId, ref: "RevisionQueue", required: true }, entityType: { type: String, required: true }, entityId: { type: objectId, required: true },
  learningEpoch: { type: Number, default: 1, min: 1 },
  reviewAttemptId: { type: String, default: null },
  commandId: { type: String, default: null },
  reviewedAt: { type: Date, required: true }, grade: { type: Number, required: true, min: 0, max: 5 }, confidence: { type: Number, required: true, min: 1, max: 5 }, responseSeconds: { type: Number, required: true, min: 0 }, previousIntervalDays: { type: Number, required: true }, nextIntervalDays: { type: Number, required: true }, wasOverdue: { type: Boolean, required: true },
  evidence: { type: Schema.Types.Mixed, default: {} },
}));
revisionHistorySchema.index({ userId: 1, reviewedAt: -1 });
revisionHistorySchema.index({ queueId: 1, reviewedAt: -1 });
revisionHistorySchema.index(
  { userId: 1, learningEpoch: 1, reviewAttemptId: 1 },
  { unique: true, partialFilterExpression: { reviewAttemptId: { $type: "string" } } }
);

const assessmentResultSchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true }, entityType: { type: String, enum: ["topic", "pattern"], required: true }, entityId: { type: objectId, required: true },
  dimensions: {
    recognition: { type: Number, default: 0 }, understanding: { type: Number, default: 0 }, implementation: { type: Number, default: 0 }, optimization: { type: Number, default: 0 }, explanation: { type: Number, default: 0 }, edgeCases: { type: Number, default: 0 }, retention: { type: Number, default: 0 },
  },
  overallScore: { type: Number, required: true },
  evidenceUsed: [{ type: objectId }], evidenceTypes: [{ type: String }],
}));
assessmentResultSchema.index({ userId: 1, entityType: 1, entityId: 1, createdAt: -1 });

const recommendationSchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true }, generatedAt: { type: Date, required: true, index: true }, expiresAt: { type: Date, required: true }, algorithmVersion: { type: String, required: true },
  context: { currentTopicId: { type: objectId, ref: "Topic", default: null }, lastTopicId: { type: objectId, ref: "Topic", default: null }, availableMinutes: { type: Number, required: true }, dueRevisionCount: { type: Number, required: true }, dailyProgress: { type: Number, required: true }, streakDays: { type: Number, required: true } },
  candidates: [{ rank: { type: Number, required: true }, actionType: { type: String, enum: ["mission", "revision", "problem", "quiz", "reflection", "rest"], required: true }, entityType: { type: String, required: true }, entityId: { type: objectId, required: true }, score: { type: Number, required: true }, reasonCodes: [{ type: String, required: true }], explanation: { type: String, required: true, maxlength: 500 }, estimatedMinutes: { type: Number, required: true }, dismissed: { type: Boolean, default: false } }],
  selectedRank: { type: Number, default: null }, actedAt: { type: Date, default: null },
}));
recommendationSchema.index({ userId: 1, generatedAt: -1 });
recommendationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const recommendationEventSchema = withTimestamps(new Schema({ userId: { type: objectId, ref: "User", required: true }, recommendationId: { type: objectId, ref: "Recommendation", required: true }, candidateRank: { type: Number, required: true }, event: { type: String, enum: ["shown", "selected", "started", "completed", "dismissed", "snoozed"], required: true }, occurredAt: { type: Date, required: true }, metadata: { type: Schema.Types.Mixed, default: {} } }));
recommendationEventSchema.index({ recommendationId: 1, occurredAt: 1 });
recommendationEventSchema.index({ userId: 1, occurredAt: -1 });

const dailyPlanSchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true }, dateKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, timezone: { type: String, required: true }, targetMinutes: { type: Number, required: true, min: 1 }, completedMinutes: { type: Number, default: 0, min: 0 }, status: { type: String, enum: ["active", "completed", "missed"], default: "active" },
  items: [{ order: { type: Number, required: true }, entityType: { type: String, required: true }, entityId: { type: objectId, required: true }, actionType: { type: String, required: true }, plannedMinutes: { type: Number, required: true }, status: { type: String, enum: ["pending", "completed", "skipped"], default: "pending" } }],
}));
dailyPlanSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

const userStatisticsSchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true, unique: true },
  learningEpoch: { type: Number, default: 1, min: 1 },
  totalXp: { type: Number, default: 0, min: 0 }, totalFocusedMinutes: { type: Number, default: 0 }, solvedProblems: { type: Number, default: 0 }, attemptedProblems: { type: Number, default: 0 }, currentStreakDays: { type: Number, default: 0 }, longestStreakDays: { type: Number, default: 0 }, lastActivityDateKey: { type: String, default: null },
  interviewReadinessScore: { type: Number, default: 0, min: 0, max: 100 }, overallMasteryScore: { type: Number, default: 0, min: 0, max: 100 }, consistencyScore: { type: Number, default: 0, min: 0, max: 100 }, revisionRetentionScore: { type: Number, default: 0, min: 0, max: 100 }, reflectionQualityScore: { type: Number, default: 0, min: 0, max: 100 }, patternRecognitionScore: { type: Number, default: 0, min: 0, max: 100 },
  currentTopicId: { type: objectId, ref: "Topic", default: null }, lastStudiedTopicId: { type: objectId, ref: "Topic", default: null }, lastSolvedProblemId: { type: objectId, ref: "Problem", default: null }, weakTopicIds: [{ type: objectId, ref: "Topic" }], strongTopicIds: [{ type: objectId, ref: "Topic" }],
}));

const achievementSchema = withTimestamps(new Schema({ key: { type: String, required: true, lowercase: true }, title: { type: String, required: true }, description: { type: String, required: true }, category: { type: String, enum: ["consistency", "practice", "mastery", "revision", "milestone"], required: true }, criteria: { type: Schema.Types.Mixed, required: true }, isActive: { type: Boolean, default: true } }));
achievementSchema.index({ key: 1 }, { unique: true });
const userAchievementSchema = withTimestamps(new Schema({ userId: { type: objectId, ref: "User", required: true }, achievementId: { type: objectId, ref: "Achievement", required: true }, unlockedAt: { type: Date, required: true }, metadata: { type: Schema.Types.Mixed, default: {} } }));
userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

const notificationSchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true },
  type: { type: String, enum: ["revision_due", "plan_ready", "streak_risk", "achievement", "recommendation", "system"], required: true },
  priority: { type: String, enum: ["important", "actionable", "informational"], default: "informational" },
  groupKey: { type: String, default: null, maxlength: 160 },
  actionLabel: { type: String, default: null, maxlength: 80 },
  title: { type: String, required: true, maxlength: 160 }, body: { type: String, required: true, maxlength: 1000 }, deepLink: { type: String, default: null, maxlength: 2048 },
  status: { type: String, enum: ["unread", "read", "archived"], default: "unread" }, scheduledAt: { type: Date, default: Date.now }, readAt: { type: Date, default: null }
}));
notificationSchema.index({ userId: 1, status: 1, scheduledAt: -1 });

const aiConversationSchema = withTimestamps(new Schema({ userId: { type: objectId, ref: "User", required: true }, title: { type: String, default: "New conversation", maxlength: 160 }, context: { topicId: { type: objectId, ref: "Topic", default: null }, patternId: { type: objectId, ref: "Pattern", default: null }, problemId: { type: objectId, ref: "Problem", default: null }, missionId: { type: objectId, ref: "Mission", default: null }, roadmapId: { type: objectId, ref: "Roadmap", default: null } }, status: { type: String, enum: ["active", "archived"], default: "active" }, lastMessageAt: { type: Date, default: Date.now } }));
aiConversationSchema.index({ userId: 1, lastMessageAt: -1 });
aiConversationSchema.index({ userId: 1, "context.problemId": 1, "context.missionId": 1 });
const aiMessageSchema = withTimestamps(new Schema({ conversationId: { type: objectId, ref: "AIConversation", required: true }, userId: { type: objectId, ref: "User", required: true }, role: { type: String, enum: ["user", "assistant", "system"], required: true }, content: { type: String, required: true, maxlength: 20_000 }, model: { type: String, default: null }, tokenUsage: { input: { type: Number, default: 0 }, output: { type: Number, default: 0 } }, safetyFlags: [{ type: String }], metadata: { type: Schema.Types.Mixed, default: {} } }));
aiMessageSchema.index({ conversationId: 1, createdAt: 1 });

const activityEventSchema = withTimestamps(new Schema({ userId: { type: objectId, ref: "User", required: true }, type: { type: String, required: true, index: true }, entityType: { type: String, default: null }, entityId: { type: objectId, default: null }, occurredAt: { type: Date, required: true }, payload: { type: Schema.Types.Mixed, default: {} }, idempotencyKey: { type: String, required: true } }));
activityEventSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
activityEventSchema.index({ userId: 1, occurredAt: -1 });

export const RevisionQueueModel = getModel("RevisionQueue", () => model("RevisionQueue", revisionQueueSchema));
export const RevisionHistoryModel = getModel("RevisionHistory", () => model("RevisionHistory", revisionHistorySchema));
export const AssessmentResultModel = getModel("AssessmentResult", () => model("AssessmentResult", assessmentResultSchema));
export const RecommendationModel = getModel("Recommendation", () => model("Recommendation", recommendationSchema));
export const RecommendationEventModel = getModel("RecommendationEvent", () => model("RecommendationEvent", recommendationEventSchema));
export const DailyPlanModel = getModel("DailyPlan", () => model("DailyPlan", dailyPlanSchema));
export const UserStatisticsModel = getModel("UserStatistics", () => model("UserStatistics", userStatisticsSchema));
export const AchievementModel = getModel("Achievement", () => model("Achievement", achievementSchema));
export const UserAchievementModel = getModel("UserAchievement", () => model("UserAchievement", userAchievementSchema));
export const NotificationModel = getModel("Notification", () => model("Notification", notificationSchema));
export const AIConversationModel = getModel("AIConversation", () => model("AIConversation", aiConversationSchema));
export const AIMessageModel = getModel("AIMessage", () => model("AIMessage", aiMessageSchema));
export const ActivityEventModel = getModel("ActivityEvent", () => model("ActivityEvent", activityEventSchema));
export { LearningDeliveryModel } from "./learning-delivery.model";

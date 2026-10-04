import { model, Schema, type InferSchemaType } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";

const roadmapTemplateSchema = withTimestamps(new Schema({
  slug: { type: String, required: true, lowercase: true }, name: { type: String, required: true, maxlength: 160 },
  audience: { levels: [{ type: String }], goals: [{ type: String }], dailyMinutes: { min: { type: Number }, max: { type: Number } } },
  version: { type: Number, required: true, min: 1 }, isPublished: { type: Boolean, default: false, index: true },
  stages: [{ key: { type: String, required: true }, title: { type: String, required: true }, order: { type: Number, required: true }, topicIds: [{ type: objectId, ref: "Topic" }], missionIds: [{ type: objectId, ref: "Mission" }], estimatedMinutes: { type: Number, required: true } }],
  nodes: [{
    key: { type: String, required: true },
    type: { type: String, enum: ["topic", "pattern", "mission", "problem", "milestone"], required: true },
    refId: { type: objectId, default: null },
    title: { type: String, required: true, maxlength: 180 },
    description: { type: String, default: "", maxlength: 500 },
    position: { x: { type: Number, default: 0 }, y: { type: Number, default: 0 } },
    order: { type: Number, required: true, min: 0 },
    estimatedMinutes: { type: Number, default: 60, min: 0 },
    unlockRule: { type: String, enum: ["all_prerequisites", "any_prerequisite", "manual"], default: "all_prerequisites" },
  }],
  edges: [{
    key: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    type: { type: String, enum: ["prerequisite", "progression", "dependency"], default: "progression" },
  }],
}));
roadmapTemplateSchema.index({ slug: 1, version: 1 }, { unique: true });

const roadmapSchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true, index: true }, templateId: { type: objectId, ref: "RoadmapTemplate", default: null },
  status: { type: String, enum: ["active", "paused", "completed", "archived"], default: "active", index: true },
  inputs: { targetCompanyIds: [{ type: objectId, ref: "Company" }], currentLevel: { type: String, required: true }, dailyMinutes: { type: Number, required: true }, language: { type: String, required: true }, goal: { type: String, required: true }, targetDate: { type: Date, default: null } },
  generatedAt: { type: Date, required: true, default: Date.now }, algorithmVersion: { type: String, required: true },
  stages: [{ key: { type: String, required: true }, title: { type: String, required: true }, order: { type: Number, required: true }, status: { type: String, enum: ["locked", "active", "completed"], required: true }, plannedStartAt: { type: Date }, plannedEndAt: { type: Date }, topicIds: [{ type: objectId, ref: "Topic" }], missionIds: [{ type: objectId, ref: "Mission" }], completionScore: { type: Number, default: 0, min: 0, max: 100 } }],
}));
roadmapSchema.index({ userId: 1, status: 1, updatedAt: -1 });

const topicProgressSchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true }, topicId: { type: objectId, ref: "Topic", required: true },
  state: { type: String, enum: ["unseen", "learning", "practicing", "solid", "mastered"], default: "unseen" },
  understandingScore: { type: Number, default: 0, min: 0, max: 100 }, confidenceScore: { type: Number, default: 0, min: 0, max: 100 }, quizScore: { type: Number, default: 0, min: 0, max: 100 }, practiceScore: { type: Number, default: 0, min: 0, max: 100 }, reflectionScore: { type: Number, default: 0, min: 0, max: 100 }, retentionScore: { type: Number, default: 0, min: 0, max: 100 }, consistencyScore: { type: Number, default: 0, min: 0, max: 100 }, patternRecognitionScore: { type: Number, default: 0, min: 0, max: 100 },
  implementationScore: { type: Number, default: 0, min: 0, max: 100 }, optimizationScore: { type: Number, default: 0, min: 0, max: 100 }, explanationScore: { type: Number, default: 0, min: 0, max: 100 }, edgeCasesScore: { type: Number, default: 0, min: 0, max: 100 }, masteryScore: { type: Number, default: 0, min: 0, max: 100, index: true },
  attempts: { type: Number, default: 0, min: 0 }, solvedCount: { type: Number, default: 0, min: 0 }, lastStudiedAt: { type: Date, default: null }, lastSolvedAt: { type: Date, default: null }, nextRecommendedAt: { type: Date, default: null },
}));
topicProgressSchema.index({ userId: 1, topicId: 1 }, { unique: true });
topicProgressSchema.index({ userId: 1, masteryScore: 1, lastStudiedAt: 1 });

const patternMasterySchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true }, patternId: { type: objectId, ref: "Pattern", required: true }, topicId: { type: objectId, ref: "Topic", required: true },
  recognitionScore: { type: Number, default: 0, min: 0, max: 100 }, applicationScore: { type: Number, default: 0, min: 0, max: 100 }, transferScore: { type: Number, default: 0, min: 0, max: 100 }, masteryScore: { type: Number, default: 0, min: 0, max: 100 },
  successfulAttempts: { type: Number, default: 0 }, totalAttempts: { type: Number, default: 0 }, lastPracticedAt: { type: Date, default: null },
}));
patternMasterySchema.index({ userId: 1, patternId: 1 }, { unique: true });
patternMasterySchema.index({ userId: 1, masteryScore: 1 });

const problemAttemptSchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true }, problemId: { type: objectId, ref: "Problem", required: true },
  learningEpoch: { type: Number, default: 1, min: 1 },
  attemptNumber: { type: Number, default: 1, min: 1 },
  status: { type: String, enum: ["started", "solved", "abandoned"], required: true, index: true },
  outcomeSource: { type: String, enum: ["learner-reported", "system-verified"], default: "learner-reported" },
  strategy: { type: String, enum: ["independent", "hint_assisted", "editorial_assisted", "revisited"], required: true },
  durationSeconds: { type: Number, min: 0, required: true },
  durationProvenance: { type: String, enum: ["measured", "reported", "unknown"], default: "unknown" },
  hintsUsed: { type: Number, default: 0, min: 0 },
  hintsRevealedLevels: [{ type: Number }],
  editorialViewed: { type: Boolean, default: false },
  aiAssisted: { type: Boolean, default: false },
  selfConfidence: { type: Number, required: true, min: 1, max: 5 },
  perceivedDifficulty: { type: Number, required: true, min: 1, max: 5 },
  codeLanguage: { type: String, default: null },
  commandId: { type: String, default: null },
  sessionId: { type: String, default: null },
  reflectionId: { type: objectId, ref: "ReflectionLog", default: null },
  startedAt: { type: Date, required: true },
  completedAt: { type: Date, default: null },
}));
problemAttemptSchema.index({ userId: 1, problemId: 1, createdAt: -1 });
problemAttemptSchema.index({ userId: 1, createdAt: -1 });
problemAttemptSchema.index({ userId: 1, status: 1, completedAt: -1 });
problemAttemptSchema.index(
  { userId: 1, learningEpoch: 1, commandId: 1 },
  { unique: true, partialFilterExpression: { commandId: { $type: "string" } } }
);
problemAttemptSchema.index({ userId: 1, learningEpoch: 1, problemId: 1, attemptNumber: 1 });
problemAttemptSchema.index(
  { userId: 1, learningEpoch: 1, sessionId: 1, attemptNumber: 1 },
  { unique: true, partialFilterExpression: { sessionId: { $type: "string" } } }
);

const quizAttemptSchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true }, topicId: { type: objectId, ref: "Topic", required: true }, patternId: { type: objectId, ref: "Pattern", default: null },
  correctCount: { type: Number, required: true, min: 0 }, totalCount: { type: Number, required: true, min: 1 }, score: { type: Number, required: true, min: 0, max: 100 }, durationSeconds: { type: Number, required: true, min: 0 }, submittedAt: { type: Date, required: true },
}));
quizAttemptSchema.index({ userId: 1, topicId: 1, submittedAt: -1 });

const patternRecognitionAttemptSchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true },
  problemId: { type: objectId, ref: "Problem", default: null },
  missionId: { type: objectId, ref: "Mission", default: null },
  stepKey: { type: String, default: "", maxlength: 80 },
  expectedPatternId: { type: objectId, ref: "Pattern", default: null },
  selectedPatternId: { type: objectId, ref: "Pattern", default: null },
  isCorrect: { type: Boolean, default: true },
  reasoning: { type: String, required: true, maxlength: 1000 },
  signalIdentified: { type: String, default: "", maxlength: 500 },
  durationSeconds: { type: Number, default: 0, min: 0 },
}));
patternRecognitionAttemptSchema.index({ userId: 1, expectedPatternId: 1, createdAt: -1 });
patternRecognitionAttemptSchema.index({ userId: 1, missionId: 1, stepKey: 1, createdAt: -1 });


const learningSessionSchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true }, topicId: { type: objectId, ref: "Topic", default: null }, missionId: { type: objectId, ref: "Mission", default: null },
  startedAt: { type: Date, required: true }, endedAt: { type: Date, default: null }, plannedMinutes: { type: Number, required: true, min: 1 }, focusedSeconds: { type: Number, default: 0, min: 0 }, activityCounts: { learn: { type: Number, default: 0 }, quiz: { type: Number, default: 0 }, practice: { type: Number, default: 0 }, revision: { type: Number, default: 0 } }, quality: { type: Number, default: null, min: 1, max: 5 },
}));
learningSessionSchema.index({ userId: 1, startedAt: -1 });

const reflectionSchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true }, topicId: { type: objectId, ref: "Topic", default: null }, problemAttemptId: { type: objectId, ref: "ProblemAttempt", default: null },
  entityType: { type: String, enum: ["mission", "problem", "topic", "pattern"], default: null, index: true },
  entityId: { type: objectId, default: null, index: true },
  promptVersion: { type: String, required: true }, content: { type: String, required: true, minlength: 10, maxlength: 5000 }, selfRating: { type: Number, required: true, min: 1, max: 5 }, qualityScore: { type: Number, default: null, min: 0, max: 100 }, extractedMisconceptions: [{ type: String, maxlength: 300 }],
}));
reflectionSchema.index({ userId: 1, topicId: 1, createdAt: -1 });
reflectionSchema.index({ userId: 1, entityType: 1, entityId: 1, createdAt: -1 });

const bookmarkSchema = withTimestamps(new Schema({ userId: { type: objectId, ref: "User", required: true }, entityType: { type: String, enum: ["topic", "pattern", "problem", "mission", "resource"], required: true }, entityId: { type: objectId, required: true }, note: { type: String, maxlength: 1000, default: "" } }));
bookmarkSchema.index({ userId: 1, entityType: 1, entityId: 1 }, { unique: true });

const missionProgressSchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true },
  missionId: { type: objectId, ref: "Mission", required: true },
  status: { type: String, enum: ["not_started", "in_progress", "completed"], default: "not_started", index: true },
  completedStepKeys: [{ type: String, required: true }],
  progress: { type: Number, default: 0, min: 0, max: 100 },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  reflection: { type: String, maxlength: 5000, default: "" },
}));
missionProgressSchema.index({ userId: 1, missionId: 1 }, { unique: true });
missionProgressSchema.index({ userId: 1, status: 1, updatedAt: -1 });

export const RoadmapTemplateModel = getModel("RoadmapTemplate", () => model("RoadmapTemplate", roadmapTemplateSchema));
export const RoadmapModel = getModel("Roadmap", () => model("Roadmap", roadmapSchema));
export const TopicProgressModel = getModel("TopicProgress", () => model("TopicProgress", topicProgressSchema));
export const PatternMasteryModel = getModel("PatternMastery", () => model("PatternMastery", patternMasterySchema));
export const ProblemAttemptModel = getModel("ProblemAttempt", () => model("ProblemAttempt", problemAttemptSchema));
export const QuizAttemptModel = getModel("QuizAttempt", () => model("QuizAttempt", quizAttemptSchema));
export const PatternRecognitionAttemptModel = getModel("PatternRecognitionAttempt", () => model("PatternRecognitionAttempt", patternRecognitionAttemptSchema));
export const LearningSessionModel = getModel("LearningSession", () => model("LearningSession", learningSessionSchema));
export const ReflectionLogModel = getModel("ReflectionLog", () => model("ReflectionLog", reflectionSchema));
export const BookmarkModel = getModel("Bookmark", () => model("Bookmark", bookmarkSchema));
export type MissionProgress = InferSchemaType<typeof missionProgressSchema>;
export const MissionProgressModel = getModel("MissionProgress", () => model("MissionProgress", missionProgressSchema));
export { LearningCommandModel } from "./learning-command.model";
export { PracticeSessionModel } from "./practice-session.model";

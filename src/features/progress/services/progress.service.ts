import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { TopicProgressModel, MissionProgressModel, ProblemAttemptModel, ReflectionLogModel, PatternMasteryModel, QuizAttemptModel, LearningSessionModel } from "@/features/learning/models/learning.model";
import { MissionModel, ProblemModel, PatternModel, TopicModel } from "@/features/content/models/content.model";
import { RevisionHistoryModel, RevisionQueueModel, UserStatisticsModel } from "@/features/intelligence/models/intelligence.model";
import { startOfDay, subDays } from "date-fns";

type AnyDoc = Record<string, any>;

export const PROGRESS_WEIGHTS = { understanding: 0.17, confidence: 0.10, quiz: 0.12, practice: 0.25, reflection: 0.08, retention: 0.15, consistency: 0.05, patternRecognition: 0.08 } as const;

export function calculateMastery(scores: Record<keyof typeof PROGRESS_WEIGHTS, number>) {
  return Math.round(Object.entries(PROGRESS_WEIGHTS).reduce((sum, [key, weight]) => sum + scores[key as keyof typeof PROGRESS_WEIGHTS] * weight, 0));
}

function normalize(value: number, max: number) {
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)));
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export async function recomputeTopicProgress(userId: Types.ObjectId, topicId: Types.ObjectId) {
  const { AssessmentEngine } = await import("@/features/platform/engines/assessment.engine");
  const assessment = await AssessmentEngine.assessTopic(userId, topicId);
  
  // Also fetch and return the updated progress
  await connectToDatabase();
  const progress = await TopicProgressModel.findOne({ userId, topicId });
  if (progress) return progress;
  throw new Error("Failed to recompute topic progress");
}

export async function generateProgressSummary(
  userId: Types.ObjectId,
  preloaded?: {
    topicsProgress?: AnyDoc[];
    dueRevisions?: AnyDoc[];
  },
  options?: { asyncWrite?: boolean; skipWrite?: boolean }
) {
  await connectToDatabase();
  
  const topicsProgress = preloaded?.topicsProgress 
    ? preloaded.topicsProgress 
    : (await TopicProgressModel.find({ userId }).populate("topicId").lean() as AnyDoc[]);
  const validTopics = topicsProgress.filter(t => t.topicId);
  
  const overallMastery = validTopics.length > 0 
    ? Math.round(validTopics.reduce((sum, t) => sum + (t.masteryScore || 0), 0) / validTopics.length)
    : 0;

  const sortedByMastery = [...validTopics].sort((a, b) => (b.masteryScore || 0) - (a.masteryScore || 0));
  const strongTopics = sortedByMastery.filter(t => (t.masteryScore || 0) >= 75).slice(0, 3).map(t => String(t.topicId?.name ?? t.topicId));
  const weakTopics = sortedByMastery.filter(t => (t.masteryScore || 0) > 0 && (t.masteryScore || 0) < 50).reverse().slice(0, 3).map(t => String(t.topicId?.name ?? t.topicId));

  const dueRevisions = preloaded?.dueRevisions
    ? preloaded.dueRevisions
    : (await RevisionQueueModel.find({ userId, state: { $in: ["due", "scheduled"] }, dueAt: { $lte: new Date() } }).populate("entityId").lean() as AnyDoc[]);

  const revisionNeeds = dueRevisions.length > 0 
    ? `${dueRevisions.length} item${dueRevisions.length > 1 ? 's' : ''} due for spaced repetition`
    : "Queue is clear";

  const patternsNeedingRevision = dueRevisions
    .filter(r => r.entityType === "pattern")
    .map(r => String(r.entityId?.name || "Unknown Pattern"))
    .slice(0, 3);

  const interviewReadinessSignal = overallMastery >= 80 && strongTopics.length >= 3
    ? "High Readiness" 
    : overallMastery >= 50
    ? "Building Foundation"
    : "Getting Started";

  let recommendedNextAction = "Continue your active mission.";
  if (dueRevisions.length > 0) {
    recommendedNextAction = "Clear your revision queue to maintain retention.";
  } else if (weakTopics.length > 0) {
    recommendedNextAction = `Practice problems in ${weakTopics[0]} to improve mastery.`;
  }

  // Update stats model
  // Only fetch revision history when the user actually has topic progress to calculate against.
  // Avoids a DB round-trip for new users or dashboard loads where this score hasn't changed.
  const retentionGrades = validTopics.length > 0
    ? (await RevisionHistoryModel.find({ userId }).sort({ reviewedAt: -1 }).limit(25).lean() as AnyDoc[])
    : [];
  const revisionRetentionScore = retentionGrades.length > 0 ? normalize(avg(retentionGrades.map((r) => (r.grade !== undefined && r.grade !== null ? Number(r.grade) : 3))), 5) : 0;
  const consistencyScore = validTopics.length > 0 ? avg(validTopics.map((t) => Number(t.consistencyScore || 0))) : 0;
  const patternRecognitionScore = validTopics.length > 0 ? avg(validTopics.map((t) => Number(t.patternRecognitionScore || 0))) : 0;
  const reflectionQualityScore = validTopics.length > 0 ? avg(validTopics.map((t) => Number(t.reflectionScore || 0))) : 0;
  const interviewReadinessScore = Math.round(
    overallMastery * 0.55 +
    revisionRetentionScore * 0.18 +
    patternRecognitionScore * 0.12 +
    consistencyScore * 0.10 +
    reflectionQualityScore * 0.05
  );

  if (!options?.skipWrite) {
    const writePromise = UserStatisticsModel.findOneAndUpdate(
      { userId },
      { 
        $set: { 
          overallMasteryScore: overallMastery,
          interviewReadinessScore,
          revisionRetentionScore,
          consistencyScore,
          patternRecognitionScore,
          reflectionQualityScore,
          weakTopicIds: validTopics.filter((t) => (t.masteryScore || 0) > 0 && (t.masteryScore || 0) < 50).map((t) => t.topicId?._id ?? t.topicId),
          strongTopicIds: validTopics.filter((t) => (t.masteryScore || 0) >= 75).map((t) => t.topicId?._id ?? t.topicId),
        } 
      },
      { upsert: true }
    );
    if (!options?.asyncWrite) {
      await writePromise;
    } else {
      writePromise.catch(() => null);
    }
  }

  return {
    overallMastery,
    interviewReadinessScore,
    strongTopics,
    weakTopics,
    patternsNeedingRevision,
    recentImprovement: "Calculated from recent progress", // Simplified for now
    revisionNeeds,
    interviewReadinessSignal,
    recommendedNextAction
  };
}

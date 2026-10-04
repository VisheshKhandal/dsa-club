import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { UserModel } from "@/features/identity/models/user.model";
import {
  UserTopicProgressModel,
  type IUserTopicProgressDocument,
} from "../models/user-topic-progress.model";
import { LearningEventModel } from "../models/learning-event.model";
import { getLearningEventsForTopic } from "../services/learning-event.service";
import { applyEventToTopicProgressDoc } from "./topic-progress.projector";

/**
 * Reconstructs a user's topic progress projection from the ground up by replaying
 * its entire immutable LearningEvent history in chronological order.
 *
 * This provides the ultimate disaster-recovery and schema-migration capability:
 * If projection data is ever corrupted or formulas change, the projection can be
 * rebuilt 100% identically in seconds.
 *
 * Invariants enforced:
 * - Scoped strictly to the specified or current learning epoch.
 * - Resets processedEventIds along with all counters so events are not erroneously skipped.
 * - Deterministic output on repeated runs.
 */
export async function rebuildUserTopicProgress(
  userId: string | Types.ObjectId,
  topicSlug: string,
  learningEpoch?: number
): Promise<IUserTopicProgressDocument> {
  await connectToDatabase();

  const userObjectId =
    userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);

  let targetEpoch = learningEpoch;
  if (targetEpoch === undefined || targetEpoch === null) {
    const user = await UserModel.findById(userObjectId).select("learningEpoch").lean();
    targetEpoch = user?.learningEpoch ?? 1;
  }

  // 1. Fetch all raw immutable events for this user, topic, and epoch in chronological order
  const events = await getLearningEventsForTopic(userObjectId, topicSlug, targetEpoch);

  // 2. Find existing projection doc or initialize fresh one scoped by learningEpoch
  let doc = await UserTopicProgressModel.findOne({
    userId: userObjectId,
    learningEpoch: targetEpoch,
    topicSlug,
  });

  if (!doc) {
    doc = new UserTopicProgressModel({
      userId: userObjectId,
      learningEpoch: targetEpoch,
      topicSlug,
      processedEventIds: [],
    });
  }

  // 3. Reset all counts and deduplication collections to blank baseline
  doc.attemptedCount = 0;
  doc.completedCount = 0;
  doc.independentSolveCount = 0;
  doc.hintCount = 0;
  doc.seenHintKeys = [];
  doc.skippedCount = 0;
  doc.totalMinutesSpent = 0;
  doc.averageConfidence = 0;
  doc.confidenceSubmissionsCount = 0;
  doc.lastAttemptAt = null;
  doc.lastCompletedAt = null;
  doc.reviewDueAt = null;
  doc.masteryScore = 0;
  doc.processedEventIds = []; // Crucial invariant: clear deduplication array so replay applies all events
  doc.rebuildStatus = "rebuilding";

  // 4. Replay every single event chronologically
  for (const event of events) {
    applyEventToTopicProgressDoc(doc, event);
  }

  // 5. Finalize status and persist
  doc.rebuildStatus = "healthy";
  await doc.save();

  return doc;
}

/**
 * Discovers all topics a user has engaged with within an epoch and rebuilds projections for all of them.
 */
export async function rebuildAllUserTopicProjections(
  userId: string | Types.ObjectId,
  learningEpoch?: number
): Promise<IUserTopicProgressDocument[]> {
  await connectToDatabase();

  const userObjectId =
    userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);

  let targetEpoch = learningEpoch;
  if (targetEpoch === undefined || targetEpoch === null) {
    const user = await UserModel.findById(userObjectId).select("learningEpoch").lean();
    targetEpoch = user?.learningEpoch ?? 1;
  }

  const distinctTopicSlugs = await LearningEventModel.distinct("topicSlug", {
    userId: userObjectId,
    learningEpoch: targetEpoch,
    topicSlug: { $ne: null },
  });

  const results: IUserTopicProgressDocument[] = [];
  for (const topicSlug of distinctTopicSlugs) {
    if (topicSlug) {
      const doc = await rebuildUserTopicProgress(userObjectId, topicSlug, targetEpoch);
      results.push(doc);
    }
  }

  return results;
}

import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  UserTopicProgressModel,
  type IUserTopicProgressDocument,
} from "../models/user-topic-progress.model";
import type { ILearningEvent } from "../events/learning-event.types";

/**
 * Calculates a 0 - 100 mastery score based on verified evidence:
 * - High weight for independent solves (+25 each)
 * - Completion points (+10 each)
 * - Minor hint penalty (-3 each)
 * - Penalty for skips (-5 each)
 */
export function calculateTopicMasteryScore(params: {
  completedCount: number;
  independentSolveCount: number;
  hintCount: number;
  skippedCount: number;
}): number {
  const { completedCount, independentSolveCount, hintCount, skippedCount } = params;
  if (completedCount === 0) return 0;

  const raw =
    independentSolveCount * 25 +
    completedCount * 10 -
    hintCount * 3 -
    skippedCount * 5;

  return Math.min(100, Math.max(0, Math.round(raw)));
}

/**
 * Mutates an in-memory UserTopicProgress document by applying a single LearningEvent.
 * Used both by live projection updates and the full event replay engine.
 */
export function applyEventToTopicProgressDoc(
  doc: IUserTopicProgressDocument,
  event: ILearningEvent<any>
): void {
  const eventIdKey = String(event._id || event.idempotencyKey || "");
  doc.processedEventIds = doc.processedEventIds || [];
  if (eventIdKey && doc.processedEventIds.includes(eventIdKey)) {
    // Already projected: exact once invariant
    return;
  }

  const occurredAt = new Date(event.occurredAt);

  if (event.topicId && !doc.topicId) {
    doc.topicId = new Types.ObjectId(event.topicId);
  }

  switch (event.eventType) {
    case "problem_attempted": {
      doc.attemptedCount += 1;
      if (!doc.lastAttemptAt || occurredAt > new Date(doc.lastAttemptAt)) {
        doc.lastAttemptAt = occurredAt;
      }
      const minutes = Number(event.payload?.minutesSpent ?? 0);
      if (minutes > 0) {
        const attemptId = event.payload?.problemAttemptId || (typeof event.idempotencyKey === "string" && event.idempotencyKey.startsWith("problem-attempt:") ? event.idempotencyKey.slice(16) : null);
        const durKey = attemptId
          ? `dur:att:${attemptId}`
          : (event.problemId ? `dur:prob:${event.problemId}:${new Date(occurredAt).toISOString().slice(0, 10)}` : null);
        if (!durKey || !doc.processedEventIds.includes(durKey)) {
          doc.totalMinutesSpent += minutes;
          if (durKey) doc.processedEventIds.push(durKey);
        }
      }

      const solveKey = event.problemId
        ? `solve:prob:${event.problemId}`
        : (event.payload?.problemAttemptId ? `solve:att:${event.payload.problemAttemptId}` : null);

      if (event.payload?.passed) {
        if (!solveKey || !doc.processedEventIds.includes(solveKey)) {
          doc.completedCount += 1;
          if (solveKey) doc.processedEventIds.push(solveKey);
          if (!doc.lastCompletedAt || occurredAt > new Date(doc.lastCompletedAt)) {
            doc.lastCompletedAt = occurredAt;
          }
        }

        const isExplicitlyIndependent = event.payload?.strategy === "independent";
        const hasZeroHints = event.payload?.hintsUsed === undefined || Number(event.payload?.hintsUsed) === 0;
        const indepKey = event.problemId ? `indep:prob:${event.problemId}` : null;
        if (isExplicitlyIndependent && hasZeroHints) {
          if (!indepKey || !doc.processedEventIds.includes(indepKey)) {
            doc.independentSolveCount += 1;
            if (indepKey) doc.processedEventIds.push(indepKey);
          }
        }
      }
      break;
    }

    case "hint_requested":
    case "hint_revealed": {
      // Deterministic deduplication:
      // A problem solving session may emit both hint_requested and hint_revealed for the same hint level.
      // We deduplicate by context (problemId, planTaskId, sessionId, or attempt) + hintLevel so that
      // revealing a previously requested hint does not double-penalize the learner or double-count.
      const contextId = String(
        event.problemId ||
        event.planTaskId ||
        event.sessionId ||
        event.payload?.problemAttemptId ||
        event.payload?.problemId ||
        "general"
      );
      const hintLevel = Number(event.payload?.hintLevel ?? 1);
      const hintKey = `${contextId}:level:${hintLevel}`;

      doc.seenHintKeys = doc.seenHintKeys || [];
      if (!doc.seenHintKeys.includes(hintKey)) {
        doc.seenHintKeys.push(hintKey);
        doc.hintCount += 1;
      }
      break;
    }

    case "task_skipped": {
      doc.skippedCount += 1;
      break;
    }

    case "confidence_submitted": {
      const score = Number(event.payload?.confidenceScore ?? 0);
      if (score > 0) {
        const currentSum = doc.averageConfidence * doc.confidenceSubmissionsCount;
        doc.confidenceSubmissionsCount += 1;
        doc.averageConfidence =
          Math.round(((currentSum + score) / doc.confidenceSubmissionsCount) * 10) / 10;
      }
      break;
    }

    case "task_completed": {
      const minutes = Number(event.payload?.minutesSpent ?? 0);
      if (minutes > 0) {
        const attemptId = event.payload?.problemAttemptId || (typeof event.idempotencyKey === "string" && event.idempotencyKey.includes("attempt:") ? event.idempotencyKey.split("attempt:")[1] : null);
        const durKey = attemptId
          ? `dur:att:${attemptId}`
          : (event.planTaskId ? `dur:task:${event.planTaskId}` : (event.problemId ? `dur:prob:${event.problemId}:${new Date(occurredAt).toISOString().slice(0, 10)}` : null));
        if (!durKey || !doc.processedEventIds.includes(durKey)) {
          doc.totalMinutesSpent += minutes;
          if (durKey) doc.processedEventIds.push(durKey);
        }
      }

      const isProblemSolve = Boolean(event.problemId || event.payload?.problemAttemptId);
      const isExplicitFailure = event.payload?.passed === false;

      // Only count completed work if it did not fail! An attempt drill with passed=false does not count as a completed solve.
      if (!isExplicitFailure) {
        const solveKey = event.problemId
          ? `solve:prob:${event.problemId}`
          : (event.payload?.problemAttemptId ? `solve:att:${event.payload.problemAttemptId}` : null);

        if (!solveKey || !doc.processedEventIds.includes(solveKey)) {
          doc.completedCount += 1;
          if (solveKey) doc.processedEventIds.push(solveKey);
          if (!doc.lastCompletedAt || occurredAt > new Date(doc.lastCompletedAt)) {
            doc.lastCompletedAt = occurredAt;
          }
        }

        const isExplicitlyIndependent = event.payload?.independentSolve === true;
        const hasZeroHints = event.payload?.hintsUsed === undefined || Number(event.payload?.hintsUsed) === 0;
        const indepKey = event.problemId ? `indep:prob:${event.problemId}` : null;
        if (isProblemSolve && isExplicitlyIndependent && hasZeroHints) {
          if (!indepKey || !doc.processedEventIds.includes(indepKey)) {
            doc.independentSolveCount += 1;
            if (indepKey) doc.processedEventIds.push(indepKey);
          }
        }
      }

      // Spaced repetition review default: 7 days after completion only if no sooner review is scheduled
      const reviewIntervalDays = 7;
      const scheduledReview = new Date(occurredAt.getTime() + reviewIntervalDays * 86400000);
      if (!doc.reviewDueAt) {
        doc.reviewDueAt = scheduledReview;
      }
      break;
    }

    case "review_completed": {
      const nextDays = Number(event.payload?.nextIntervalDays ?? 14);
      doc.reviewDueAt = new Date(occurredAt.getTime() + nextDays * 86400000);
      break;
    }

    default:
      break;
  }

  // Update mastery score
  doc.masteryScore = calculateTopicMasteryScore({
    completedCount: doc.completedCount,
    independentSolveCount: doc.independentSolveCount,
    hintCount: doc.hintCount,
    skippedCount: doc.skippedCount,
  });

  // Audit metadata & receipt tracking
  if (eventIdKey) {
    doc.processedEventIds.push(eventIdKey);
  }
  doc.lastProcessedEventId = String(event._id ?? event.idempotencyKey ?? "evt");
  doc.lastProcessedOccurredAt = occurredAt;
  doc.rebuildStatus = "healthy";
}

/**
 * Incrementally projects a single event into the UserTopicProgress read model.
 * If the event has no topicSlug, it is safely ignored.
 * Employs an optimistic concurrency retry loop to handle concurrent delivery workers safely.
 */
export async function projectTopicProgressEvent(
  event: ILearningEvent<any>
): Promise<IUserTopicProgressDocument | null> {
  if (!event.topicSlug) {
    return null;
  }

  await connectToDatabase();

  const userObjectId =
    event.userId instanceof Types.ObjectId
      ? event.userId
      : new Types.ObjectId(event.userId);

  const learningEpoch = Number(event.learningEpoch || 1);

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let doc = await UserTopicProgressModel.findOne({
      userId: userObjectId,
      learningEpoch,
      topicSlug: event.topicSlug,
    });

    if (!doc) {
      try {
        doc = await UserTopicProgressModel.create({
          userId: userObjectId,
          learningEpoch,
          topicSlug: event.topicSlug,
          topicId: event.topicId ? new Types.ObjectId(event.topicId) : null,
          rebuildStatus: "healthy",
          processedEventIds: [],
        });
      } catch (err: any) {
        if (err?.code === 11000) {
          // Concurrent creation race: fetch on next iteration
          continue;
        }
        throw err;
      }
    }

    applyEventToTopicProgressDoc(doc, event);
    try {
      await doc.save();
      return doc;
    } catch (saveErr: any) {
      if (saveErr?.name === "VersionError" || saveErr?.code === 11000) {
        // Optimistic concurrency race: retry find & apply
        continue;
      }
      throw saveErr;
    }
  }

  // Final fallback attempt
  const finalDoc = await UserTopicProgressModel.findOne({
    userId: userObjectId,
    learningEpoch,
    topicSlug: event.topicSlug,
  });
  if (finalDoc) {
    applyEventToTopicProgressDoc(finalDoc, event);
    await finalDoc.save();
    return finalDoc;
  }

  return null;
}

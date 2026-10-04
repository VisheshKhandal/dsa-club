import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";
import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  RevisionHistoryModel,
  RevisionQueueModel,
} from "@/features/intelligence/models/intelligence.model";
import { ProblemModel } from "@/features/content/models/content.model";

export type ReviewGrade = 0 | 1 | 2 | 3 | 4 | 5;

export interface ComputeScheduleInput {
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  lapses: number;
}

/**
 * Computes the next spaced repetition schedule.
 * Explicitly guards:
 * 1. Valid zero grades remain zero (never coerced upward).
 * 2. Guided reviews (assisted = true) do NOT count as independent retention and do not advance repetition counts.
 * 3. Failures reset interval to 1 day and increment lapses.
 */
export function computeSchedule(
  current: ComputeScheduleInput,
  grade: ReviewGrade,
  confidence: number,
  reviewedAt: Date,
  options?: { assisted?: boolean; hintsUsed?: number }
) {
  const isAssisted = Boolean(options?.assisted || (options?.hintsUsed && options.hintsUsed > 0));
  const failure = grade < 3 || isAssisted;

  // Grade 0 invariance: absolute failure
  const confidenceModifier = failure ? -0.15 : (confidence - 3) * 0.08;

  // Clamp ease factor conservatively
  const easeFactor = Math.min(
    3.0,
    Math.max(
      1.3,
      current.easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)) + confidenceModifier
    )
  );

  let intervalDays: number;
  let repetitions: number;
  let lapses = current.lapses;

  if (failure) {
    intervalDays = 1;
    repetitions = 0;
    lapses += 1;
  } else {
    repetitions = current.repetitions + 1;
    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 3;
    } else {
      intervalDays = Math.min(180, Math.max(1, Math.round(current.intervalDays * easeFactor)));
    }
  }

  return {
    intervalDays,
    easeFactor,
    repetitions,
    lapses,
    dueAt: addDays(startOfDay(reviewedAt), intervalDays),
  };
}

export async function recordRevision(input: {
  userId: Types.ObjectId;
  queueId: Types.ObjectId;
  grade: ReviewGrade;
  confidence: number;
  responseSeconds: number;
  reviewedAt?: Date;
  evidence?: any;
  assisted?: boolean;
  hintsUsed?: number;
}) {
  await connectToDatabase();
  const reviewedAt = input.reviewedAt ?? new Date();
  const queue = await RevisionQueueModel.findOne({ _id: input.queueId, userId: input.userId });
  if (!queue || queue.state === "retired") throw new Error("Revision item not found");

  const wasOverdue = differenceInCalendarDays(startOfDay(reviewedAt), startOfDay(queue.dueAt)) > 0;
  const next = computeSchedule(queue, input.grade, input.confidence, reviewedAt, {
    assisted: input.assisted,
    hintsUsed: input.hintsUsed,
  });

  await RevisionHistoryModel.create({
    userId: input.userId,
    queueId: queue._id,
    entityType: queue.entityType,
    entityId: queue.entityId,
    reviewedAt,
    grade: input.grade,
    confidence: input.confidence,
    responseSeconds: input.responseSeconds,
    previousIntervalDays: queue.intervalDays,
    nextIntervalDays: next.intervalDays,
    wasOverdue,
    evidence: {
      ...input.evidence,
      assisted: Boolean(input.assisted),
      hintsUsed: input.hintsUsed || 0,
    },
  });

  const failure = input.grade < 3 || Boolean(input.assisted);

  queue.set({
    ...next,
    lastReviewedAt: reviewedAt,
    state: "scheduled",
    snoozedUntil: null,
    priority: failure ? 95 : Math.max(15, queue.priority - 8),
    reviewType: failure ? "mistake_repair" : "spaced_retention",
  });
  await queue.save();
  return queue;
}

export async function markOverdueRevisions(userId: Types.ObjectId, now = new Date()) {
  await connectToDatabase();
  return RevisionQueueModel.updateMany(
    {
      userId,
      state: { $in: ["scheduled", "snoozed"] },
      dueAt: { $lte: now },
      $or: [{ snoozedUntil: null }, { snoozedUntil: { $lte: now } }],
    },
    { $set: { state: "due" } }
  );
}

/**
 * Capacity-aware revision batch selector.
 * Caps the returned review batch to realistic daily capacity (default 5 items)
 * to prevent backlog paralysis, while keeping all records safely in the queue.
 * Provides clear learner-facing explanations for why items returned.
 */
export async function getCapacityBoundedRevisions(params: {
  userId: Types.ObjectId;
  maxDailyItems?: number;
  now?: Date;
}) {
  await connectToDatabase();
  const now = params.now || new Date();
  const maxItems = params.maxDailyItems || 5;

  await markOverdueRevisions(params.userId, now);

  const dueItems = await RevisionQueueModel.find({
    userId: params.userId,
    state: "due",
  })
    .sort({ priority: -1, dueAt: 1 })
    .limit(maxItems)
    .lean();

  const results = [];
  for (const item of dueItems) {
    let title = "Spaced Repetition Item";
    let slug = "";
    if (item.entityType === "problem") {
      const prob = await ProblemModel.findById(item.entityId).select("title slug").lean();
      if (prob) {
        title = prob.title;
        slug = prob.slug;
      }
    }

    const isRepair = item.reviewType === "mistake_repair" || (item.lapses && item.lapses > 0);
    const wasOverdue = differenceInCalendarDays(startOfDay(now), startOfDay(item.dueAt)) > 0;

    let reviewReason: "due_spaced_retention" | "mistake_repair" | "overdue_reinforcement" =
      "due_spaced_retention";
    let explanation = "Scheduled retention check to consolidate memory decay.";

    if (isRepair) {
      reviewReason = "mistake_repair";
      explanation = "Mistake repair follow-up: reinforces invariant boundaries after prior difficulty.";
    } else if (wasOverdue) {
      reviewReason = "overdue_reinforcement";
      explanation = "Overdue reinforcement: prioritized to restore retrieval fluency.";
    }

    results.push({
      queueId: String(item._id),
      entityId: String(item.entityId),
      entityType: item.entityType,
      title,
      slug,
      reviewReason,
      expectedRetrieval: isRepair ? ("guided_recheck" as const) : ("independent_recall" as const),
      explanation,
      priority: item.priority,
      repetitions: item.repetitions,
      lapses: item.lapses,
    });
  }

  return results;
}

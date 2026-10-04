import { Types, type ClientSession } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { UserModel } from "@/features/identity/models/user.model";
import {
  LearningEventModel,
  type ILearningEventDocument,
} from "../models/learning-event.model";
import type {
  CreateLearningEventDTO,
  LearningEventType,
  ILearningEvent,
} from "../events/learning-event.types";
import { projectTopicProgressEvent } from "../projections/topic-progress.projector";

export type LearningEventErrorCode =
  | "IDEMPOTENCY_CONFLICT"
  | "INVALID_EVENT_PAYLOAD"
  | "EVENT_PERSISTENCE_FAILED";

export class LearningEventError extends Error {
  code: LearningEventErrorCode;
  constructor(code: LearningEventErrorCode, message: string) {
    super(message);
    this.name = "LearningEventError";
    this.code = code;
  }
}

export interface RecordLearningEventSuccess {
  status: "created";
  event: ILearningEventDocument;
  isDuplicate: false;
}

export interface RecordLearningEventDuplicate {
  status: "already_exists";
  event: ILearningEventDocument;
  isDuplicate: true;
}

export type RecordLearningEventResult =
  | RecordLearningEventSuccess
  | RecordLearningEventDuplicate;

/**
 * Validates whether an existing event conflicts with incoming parameters.
 * Throws LearningEventError("IDEMPOTENCY_CONFLICT") if the same key was reused
 * for a different event type or different task/plan context.
 */
function assertNoIdempotencyConflict(
  existing: ILearningEventDocument,
  incoming: CreateLearningEventDTO<any>
): void {
  if (existing.eventType !== incoming.eventType) {
    throw new LearningEventError(
      "IDEMPOTENCY_CONFLICT",
      `Idempotency key collision: key "${incoming.idempotencyKey}" was previously recorded as "${existing.eventType}", but incoming request is "${incoming.eventType}".`
    );
  }

  if (
    incoming.planTaskId &&
    existing.planTaskId &&
    String(existing.planTaskId) !== String(incoming.planTaskId)
  ) {
    throw new LearningEventError(
      "IDEMPOTENCY_CONFLICT",
      `Idempotency key collision: key "${incoming.idempotencyKey}" was previously bound to task "${existing.planTaskId}", incoming is "${incoming.planTaskId}".`
    );
  }

  if (
    incoming.missionId &&
    existing.missionId &&
    String(existing.missionId) !== String(incoming.missionId)
  ) {
    throw new LearningEventError(
      "IDEMPOTENCY_CONFLICT",
      `Idempotency key collision: key "${incoming.idempotencyKey}" was previously bound to mission "${existing.missionId}", incoming is "${incoming.missionId}".`
    );
  }
}

/**
 * Canonical ingestion service for all LearningEvents.
 * Enforces:
 * 1. Database connectivity.
 * 2. Pre-check idempotency for fast responses scoped by user and learningEpoch.
 * 3. Atomic MongoDB compound index fallback to catch concurrency races.
 * 4. Strict conflict detection if an idempotency key is illegitimately reused.
 */
export async function recordLearningEvent<T extends LearningEventType>(
  dto: CreateLearningEventDTO<T>,
  options?: { session?: ClientSession }
): Promise<RecordLearningEventResult> {
  await connectToDatabase();

  const userObjectId =
    dto.userId instanceof Types.ObjectId
      ? dto.userId
      : new Types.ObjectId(dto.userId);

  let learningEpoch = dto.learningEpoch;
  if (learningEpoch === undefined || learningEpoch === null) {
    const user = await UserModel.findById(userObjectId).select("learningEpoch").lean();
    learningEpoch = user?.learningEpoch ?? 1;
  }

  // 1. Fast path: Check if event with this idempotency key already exists for this user and epoch
  const existing = await LearningEventModel.findOne(
    {
      userId: userObjectId,
      learningEpoch,
      idempotencyKey: dto.idempotencyKey,
    },
    null,
    options?.session ? { session: options.session } : undefined
  );

  if (existing) {
    assertNoIdempotencyConflict(existing, dto);
    return {
      status: "already_exists",
      event: existing,
      isDuplicate: true,
    };
  }

  // 2. Prepare normalized document
  const planObjectId = dto.planId ? new Types.ObjectId(dto.planId) : null;
  const planDayObjectId = dto.planDayId ? new Types.ObjectId(dto.planDayId) : null;
  const planTaskObjectId = dto.planTaskId ? new Types.ObjectId(dto.planTaskId) : null;
  const topicObjectId = dto.topicId ? new Types.ObjectId(dto.topicId) : null;
  const problemObjectId = dto.problemId ? new Types.ObjectId(dto.problemId) : null;
  const missionObjectId = dto.missionId ? new Types.ObjectId(dto.missionId) : null;

  const eventDoc = {
    userId: userObjectId,
    learningEpoch,
    eventType: dto.eventType,
    occurredAt: dto.occurredAt ?? new Date(),
    occurredAtTimezone: dto.occurredAtTimezone ?? "UTC",
    idempotencyKey: dto.idempotencyKey,
    schemaVersion: 1,
    source: dto.source ?? "server",
    correlationId: dto.correlationId ?? null,
    planId: planObjectId,
    planDayId: planDayObjectId,
    planTaskId: planTaskObjectId,
    topicId: topicObjectId,
    topicSlug: dto.topicSlug ?? null,
    problemId: problemObjectId,
    missionId: missionObjectId,
    sessionId: dto.sessionId ?? null,
    payload: dto.payload ?? {},
  };

  // 3. Insert into database with race condition safety
  try {
    const createdDocs = await LearningEventModel.create([eventDoc], options?.session ? { session: options.session } : undefined);
    const created = Array.isArray(createdDocs) ? createdDocs[0] : createdDocs;

    // Incrementally update materialized topic progress projection only if not within a transaction.
    // If inside a transaction session, downstream delivery outbox handles projection post-commit.
    if (!options?.session && created.topicSlug) {
      try {
        await projectTopicProgressEvent(created as unknown as ILearningEvent<any>);
      } catch (projErr) {
        // Non-blocking warning: projection can always be rebuilt from event log
        console.warn("Topic progress projection update warning:", projErr);
      }
    }

    return {
      status: "created",
      event: created,
      isDuplicate: false,
    };
  } catch (error: any) {
    // 4. Catch concurrency race: Another thread wrote with the exact same (userId, learningEpoch, idempotencyKey)
    if (error?.code === 11000 || error?.name === "MongoServerError") {
      const raceExisting = await LearningEventModel.findOne(
        {
          userId: userObjectId,
          learningEpoch,
          idempotencyKey: dto.idempotencyKey,
        },
        null,
        options?.session ? { session: options.session } : undefined
      );

      if (raceExisting) {
        assertNoIdempotencyConflict(raceExisting, dto);
        return {
          status: "already_exists",
          event: raceExisting,
          isDuplicate: true,
        };
      }
    }

    throw error;
  }
}

/**
 * Retrieves all learning events for a specific task, ordered chronologically.
 * Used by task evidence reducers to compute total time, hints, and attempts.
 */
export async function getLearningEventsForTask(
  planTaskId: string | Types.ObjectId
): Promise<ILearningEventDocument[]> {
  await connectToDatabase();
  const taskObjectId =
    planTaskId instanceof Types.ObjectId
      ? planTaskId
      : new Types.ObjectId(planTaskId);

  return LearningEventModel.find({ planTaskId: taskObjectId })
    .sort({ occurredAt: 1, _id: 1 })
    .lean() as unknown as ILearningEventDocument[];
}

/**
 * Retrieves all learning events for a user within a specific topic.
 * Used by topic progression projections to determine mastery and review schedules.
 */
export async function getLearningEventsForTopic(
  userId: string | Types.ObjectId,
  topicSlug: string,
  learningEpoch?: number
): Promise<ILearningEventDocument[]> {
  await connectToDatabase();
  const userObjectId =
    userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);

  const query: any = {
    userId: userObjectId,
    topicSlug,
  };
  if (learningEpoch !== undefined && learningEpoch !== null) {
    query.learningEpoch = learningEpoch;
  }

  return LearningEventModel.find(query)
    .sort({ occurredAt: 1, _id: 1 })
    .lean() as unknown as ILearningEventDocument[];
}

/**
 * Retrieves chronologically ordered event timeline for a user with optional filters.
 */
export async function getLearningEventsForUser(
  userId: string | Types.ObjectId,
  options?: {
    since?: Date;
    eventTypes?: LearningEventType[];
    limit?: number;
  }
): Promise<ILearningEventDocument[]> {
  await connectToDatabase();
  const userObjectId =
    userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);

  const query: any = { userId: userObjectId };

  if (options?.since) {
    query.occurredAt = { $gte: options.since };
  }

  if (options?.eventTypes && options.eventTypes.length > 0) {
    query.eventType = { $in: options.eventTypes };
  }

  const findQuery = LearningEventModel.find(query).sort({
    occurredAt: 1,
    _id: 1,
  });

  if (options?.limit && options.limit > 0) {
    findQuery.limit(options.limit);
  }

  return findQuery.lean() as unknown as ILearningEventDocument[];
}

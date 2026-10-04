import { Types, type ClientSession } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  LearningDeliveryModel,
  type ILearningDeliveryDocument,
  type DeliveryHandlerName,
} from "../models/learning-delivery.model";
import { UserModel } from "@/features/identity/models/user.model";
import { UserStatisticsModel } from "../models/intelligence.model";
import { LearningEventModel } from "../models/learning-event.model";
import { projectTopicProgressEvent } from "../projections/topic-progress.projector";
import { awardXpIdempotent } from "@/features/product/services/gamification.service";
import { LearningCommandModel } from "@/features/learning/models/learning-command.model";
import {
  rebuildUserTopicProgress,
  rebuildAllUserTopicProjections,
} from "../projections/projection-rebuilder";
import { revalidateDashboardCache } from "@/features/product/services/product.service";
import type { ILearningEvent } from "../events/learning-event.types";

export interface EnqueueDeliveryInput {
  userId: Types.ObjectId;
  learningEpoch: number;
  deliveryKey: string;
  handler: DeliveryHandlerName;
  eventId?: Types.ObjectId | null;
  commandId?: string | null;
  payload?: Record<string, unknown>;
}

export interface ClaimBatchOptions {
  workerId: string;
  batchSize?: number;
  leaseMs?: number;
}

export interface ProcessBatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  staleEpochSkipped: number;
}

/**
 * Enqueues delivery tasks durably. If a ClientSession is provided, persists
 * atomically within the caller's transaction.
 */
export async function enqueueDeliveries(
  inputs: EnqueueDeliveryInput[],
  session?: ClientSession
): Promise<void> {
  if (inputs.length === 0) return;
  await connectToDatabase();

  const operations = inputs.map((input) => ({
    updateOne: {
      filter: {
        userId: input.userId,
        learningEpoch: input.learningEpoch,
        deliveryKey: input.deliveryKey,
      },
      update: {
        $setOnInsert: {
          userId: input.userId,
          learningEpoch: input.learningEpoch,
          deliveryKey: input.deliveryKey,
          handler: input.handler,
          eventId: input.eventId ?? null,
          commandId: input.commandId ?? null,
          payload: input.payload ?? {},
          status: "pending",
          attemptCount: 0,
          maxAttempts: 5,
        },
      },
      upsert: true,
    },
  }));

  await LearningDeliveryModel.bulkWrite(operations, { session });
}

/**
 * Atomically claims a batch of ready or expired-lease deliveries using findOneAndUpdate.
 */
export async function claimDeliveries(
  options: ClaimBatchOptions
): Promise<ILearningDeliveryDocument[]> {
  await connectToDatabase();
  const { workerId, batchSize = 10, leaseMs = 30_000 } = options;
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + leaseMs);

  const claimed: ILearningDeliveryDocument[] = [];

  for (let i = 0; i < batchSize; i++) {
    const doc = await LearningDeliveryModel.findOneAndUpdate(
      {
        status: { $in: ["pending", "claimed", "failed"] },
        attemptCount: { $lt: 5 },
        $or: [
          { leaseExpiresAt: null },
          { leaseExpiresAt: { $lt: now } },
        ],
      },
      {
        $set: {
          status: "claimed",
          claimedBy: workerId,
          leaseExpiresAt,
        },
        $inc: { attemptCount: 1 },
      },
      { new: true, sort: { createdAt: 1 } }
    );

    if (!doc) break;
    claimed.push(doc);
  }

  return claimed;
}

/**
 * Executes a single claimed delivery task with strict epoch fencing and handler isolation.
 */
export async function executeDelivery(
  delivery: ILearningDeliveryDocument
): Promise<{ status: "completed" | "failed" | "skipped_stale_epoch"; error?: string }> {
  await connectToDatabase();

  // 1. Strict Epoch Fencing:
  // If the user's current learningEpoch does not match the delivery's learningEpoch,
  // the delivery belongs to an older learning cycle that was reset. Abort to prevent
  // resurrecting stale progress.
  const user = await UserModel.findById(delivery.userId).select("learningEpoch").lean();
  const currentEpoch = user?.learningEpoch ?? 1;

  if (currentEpoch !== delivery.learningEpoch) {
    delivery.status = "completed";
    delivery.lastError = `Aborted: delivery epoch (${delivery.learningEpoch}) does not match current user epoch (${currentEpoch}).`;
    delivery.completedAt = new Date();
    delivery.leaseExpiresAt = null;
    await delivery.save();
    return { status: "skipped_stale_epoch" };
  }

  try {
    switch (delivery.handler) {
      case "topic_progress_projection": {
        if (delivery.eventId) {
          const event = await LearningEventModel.findById(delivery.eventId).lean();
          if (event && event.topicSlug) {
            await projectTopicProgressEvent(event as unknown as ILearningEvent<any>);
          }
        }
        break;
      }

      case "gamification_xp": {
        const xpAmount = Number(delivery.payload?.xpAmount ?? 0);
        const eventType = (delivery.payload?.eventType as any) ?? "problem";
        const idempotencyKey = String(delivery.payload?.idempotencyKey ?? delivery.deliveryKey);
        const entityId = delivery.payload?.entityId ? String(delivery.payload.entityId) : null;
        if (xpAmount > 0) {
          await awardXpIdempotent(delivery.userId, idempotencyKey, xpAmount, eventType, entityId);
        }
        break;
      }

      case "activity_statistics": {
        const updateObj: Record<string, any> = {};
        if (delivery.payload?.patch && typeof delivery.payload.patch === "object") {
          updateObj.$set = delivery.payload.patch;
        }
        if (delivery.payload?.inc && typeof delivery.payload.inc === "object") {
          updateObj.$inc = delivery.payload.inc;
        }
        if (Object.keys(updateObj).length > 0) {
          updateObj.$setOnInsert = { userId: delivery.userId, learningEpoch: delivery.learningEpoch };
          await UserStatisticsModel.findOneAndUpdate(
            { userId: delivery.userId },
            updateObj,
            { upsert: true }
          );
        }
        break;
      }

      case "recommendation_invalidation": {
        revalidateDashboardCache(String(delivery.userId));
        break;
      }

      default:
        break;
    }

    delivery.status = "completed";
    delivery.completedAt = new Date();
    delivery.lastError = null;
    delivery.leaseExpiresAt = null;
    await delivery.save();

    if (delivery.commandId) {
      const pendingCount = await LearningDeliveryModel.countDocuments({
        userId: delivery.userId,
        learningEpoch: delivery.learningEpoch,
        commandId: delivery.commandId,
        status: { $in: ["pending", "claimed"] },
      });
      const failedCount = await LearningDeliveryModel.countDocuments({
        userId: delivery.userId,
        learningEpoch: delivery.learningEpoch,
        commandId: delivery.commandId,
        status: "failed",
      });
      if (pendingCount === 0) {
        const finalStatus = failedCount > 0 ? "failed" : "synchronized";
        await LearningCommandModel.findOneAndUpdate(
          {
            userId: delivery.userId,
            learningEpoch: delivery.learningEpoch,
            commandId: delivery.commandId,
          },
          {
            $set: {
              "receipt.downstreamStatus": finalStatus,
              downstreamStatus: finalStatus,
            },
          }
        );
      }
    }

    return { status: "completed" };
  } catch (err: any) {
    const errorMessage = String(err?.message ?? "Delivery execution failed").slice(0, 1900);
    delivery.status = delivery.attemptCount >= delivery.maxAttempts ? "failed" : "pending";
    delivery.lastError = errorMessage;
    delivery.leaseExpiresAt = null;
    await delivery.save();

    if (delivery.commandId && delivery.status === "failed") {
      await LearningCommandModel.findOneAndUpdate(
        {
          userId: delivery.userId,
          learningEpoch: delivery.learningEpoch,
          commandId: delivery.commandId,
        },
        {
          $set: {
            "receipt.downstreamStatus": "failed",
            downstreamStatus: "failed",
          },
        }
      );
    }

    return { status: "failed", error: errorMessage };
  }
}

/**
 * Claims and executes a batch of deliveries.
 */
export async function processDeliveryBatch(
  options: ClaimBatchOptions
): Promise<ProcessBatchResult> {
  const claimed = await claimDeliveries(options);
  let succeeded = 0;
  let failed = 0;
  let staleEpochSkipped = 0;

  for (const delivery of claimed) {
    const res = await executeDelivery(delivery);
    if (res.status === "completed") succeeded++;
    else if (res.status === "skipped_stale_epoch") staleEpochSkipped++;
    else failed++;
  }

  return {
    processed: claimed.length,
    succeeded,
    failed,
    staleEpochSkipped,
  };
}

/**
 * Recovers stale deliveries whose worker lease expired without completion.
 */
export async function recoverStaleDeliveries(now = new Date()): Promise<number> {
  await connectToDatabase();
  const res = await LearningDeliveryModel.updateMany(
    {
      status: "claimed",
      leaseExpiresAt: { $lt: now },
      attemptCount: { $lt: 5 },
    },
    {
      $set: { status: "pending", claimedBy: null, leaseExpiresAt: null },
    }
  );
  return res.modifiedCount;
}

/**
 * Strict Projection Rebuild:
 * Rebuilds topic progress read projections strictly from immutable LearningEvents.
 * Delegates to projection-rebuilder for a clean, blank-slate replay.
 * INVARIANT: NEVER re-awards XP, sends notifications, or alters external ledgers!
 */
export async function rebuildTopicProjectionsForUser(
  userId: string | Types.ObjectId,
  topicSlug?: string
): Promise<{ eventsReplayed: number }> {
  await connectToDatabase();
  const uid = typeof userId === "string" ? new Types.ObjectId(userId) : userId;

  if (topicSlug) {
    await rebuildUserTopicProgress(uid, topicSlug);
    const count = await LearningEventModel.countDocuments({
      userId: uid,
      topicSlug,
    });
    return { eventsReplayed: count };
  } else {
    await rebuildAllUserTopicProjections(uid);
    const count = await LearningEventModel.countDocuments({
      userId: uid,
      topicSlug: { $ne: null },
    });
    return { eventsReplayed: count };
  }
}

/**
 * Security helper: Verifies cron secret with fail-closed semantics.
 */
export function verifyCronAuthorization(
  authHeader: string | null | undefined,
  expectedSecret?: string
): boolean {
  const secret = expectedSecret ?? process.env.CRON_SECRET;
  // Fail-closed: If secret is missing or empty, reject all requests.
  if (!secret || secret.trim().length === 0) {
    return false;
  }
  if (!authHeader) return false;
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  return token.trim() === secret.trim();
}

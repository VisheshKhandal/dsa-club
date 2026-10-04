import { Types } from "mongoose";
import { ActivityEventModel, UserStatisticsModel } from "@/features/intelligence/models/intelligence.model";
import { revalidateDashboardCache } from "@/features/product/services/product.service";

export interface UserLevelInfo {
  level: number;
  title: string;
  currentXp: number;
  nextLevelXp: number;
  prevLevelXp: number;
  progressPercent: number;
}

const LEVEL_THRESHOLDS = [
  { level: 1, title: "Algo Initiate", minXp: 0, maxXp: 200 },
  { level: 2, title: "Array Explorer", minXp: 200, maxXp: 500 },
  { level: 3, title: "Pointer Novice", minXp: 500, maxXp: 1000 },
  { level: 4, title: "Recursion Adept", minXp: 1000, maxXp: 1800 },
  { level: 5, title: "Tree Navigator", minXp: 1800, maxXp: 3000 },
  { level: 6, title: "Graph Conqueror", minXp: 3000, maxXp: 5000 },
  { level: 7, title: "DP Strategist", minXp: 5000, maxXp: 8000 },
  { level: 8, title: "Grandmaster Knight", minXp: 8000, maxXp: 8000 },
] as const;

/**
 * Centralized XP to Level & Title progression mapping.
 * Pure computation, zero database lookups.
 */
export function calculateLevelFromXp(totalXp: number): UserLevelInfo {
  const safeXp = Math.max(0, Math.floor(totalXp || 0));

  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    const t = LEVEL_THRESHOLDS[i];
    const isLast = i === LEVEL_THRESHOLDS.length - 1;

    if (isLast || safeXp < t.maxXp) {
      const span = Math.max(1, t.maxXp - t.minXp);
      const progressPercent = isLast ? 100 : Math.min(100, Math.max(0, Math.round(((safeXp - t.minXp) / span) * 100)));
      return {
        level: t.level,
        title: t.title,
        currentXp: safeXp,
        prevLevelXp: t.minXp,
        nextLevelXp: t.maxXp,
        progressPercent,
      };
    }
  }

  return {
    level: 1,
    title: "Algo Initiate",
    currentXp: safeXp,
    prevLevelXp: 0,
    nextLevelXp: 200,
    progressPercent: 0,
  };
}

/**
 * Idempotently awards XP to a user upon the occurrence of a verified event.
 * Backed by ActivityEventModel with a unique compound index on { userId, idempotencyKey }.
 * Never awards XP twice for the exact same event.
 */
export async function awardXpIdempotent(
  userId: Types.ObjectId | string,
  idempotencyKey: string,
  xpAmount: number,
  eventType: "problem" | "mission" | "revision" | "session",
  entityId?: Types.ObjectId | string | null
): Promise<boolean> {
  const uid = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const fullKey = `xp:${idempotencyKey}`;

  try {
    // 1. Attempt to insert the unique ActivityEvent record with pending stats status
    await ActivityEventModel.create({
      userId: uid,
      idempotencyKey: fullKey,
      type: `xp_${eventType}`,
      entityType: eventType,
      entityId: entityId ? (typeof entityId === "string" ? new Types.ObjectId(entityId) : entityId) : null,
      occurredAt: new Date(),
      payload: { xpAmount, statsIncremented: false },
    });

    // 2. Atomically claim increment right via CAS to prevent concurrent / retry double-increments
    const claimed = await ActivityEventModel.findOneAndUpdate(
      { userId: uid, idempotencyKey: fullKey, "payload.statsIncremented": false },
      { $set: { "payload.statsIncremented": true } }
    );

    if (claimed) {
      try {
        await UserStatisticsModel.findOneAndUpdate(
          { userId: uid },
          {
            $inc: { totalXp: xpAmount },
            $setOnInsert: { userId: uid },
          },
          { upsert: true }
        );
      } catch (incErr) {
        await ActivityEventModel.updateOne(
          { userId: uid, idempotencyKey: fullKey },
          { $set: { "payload.statsIncremented": false } }
        ).catch(() => {});
        throw incErr;
      }
      revalidateDashboardCache(String(uid));
      return true;
    }
    return false;
  } catch (err: any) {
    // Duplicate key error (code 11000) indicates this event was previously attempted
    if (err?.code === 11000 || String(err?.message ?? "").includes("E11000")) {
      // Atomic CAS repair: if a prior crash occurred before the increment, claim it now
      const claimed = await ActivityEventModel.findOneAndUpdate(
        { userId: uid, idempotencyKey: fullKey, "payload.statsIncremented": false },
        { $set: { "payload.statsIncremented": true } }
      );
      if (claimed) {
        try {
          await UserStatisticsModel.findOneAndUpdate(
            { userId: uid },
            {
              $inc: { totalXp: xpAmount },
              $setOnInsert: { userId: uid },
            },
            { upsert: true }
          );
        } catch (incErr) {
          await ActivityEventModel.updateOne(
            { userId: uid, idempotencyKey: fullKey },
            { $set: { "payload.statsIncremented": false } }
          ).catch(() => {});
          throw incErr;
        }
        revalidateDashboardCache(String(uid));
        return true;
      }
      return false;
    }
    // Re-throw any other fatal database errors
    throw err;
  }
}

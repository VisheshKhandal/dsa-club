"use server";

import { Types } from "mongoose";
import { requireUserId } from "@/lib/auth-guard";
import {
  getCapacityBoundedRevisions,
  recordRevision,
  type ReviewGrade,
} from "../services/revision.service";
import { revalidatePath } from "next/cache";
import { serializeForClient } from "@/lib/utils";

export async function getDueRevisionsAction(maxDailyItems = 5) {
  const userId = await requireUserId();
  const items = await getCapacityBoundedRevisions({
    userId: new Types.ObjectId(userId),
    maxDailyItems,
  });

  return { ok: true, items: serializeForClient(items) };
}

export async function submitRevisionAction(params: {
  queueId: string;
  grade: ReviewGrade;
  confidence: number;
  responseSeconds: number;
  assisted?: boolean;
  hintsUsed?: number;
}) {
  const userId = await requireUserId();
  const queueDoc = await recordRevision({
    userId: new Types.ObjectId(userId),
    queueId: new Types.ObjectId(params.queueId),
    grade: params.grade,
    confidence: params.confidence,
    responseSeconds: params.responseSeconds,
    assisted: params.assisted,
    hintsUsed: params.hintsUsed,
  });

  revalidatePath("/dashboard");
  revalidatePath("/review");
  revalidatePath("/progress");

  return { ok: true, queue: serializeForClient(queueDoc) };
}

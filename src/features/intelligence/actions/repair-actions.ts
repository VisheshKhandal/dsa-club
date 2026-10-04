"use server";

import { requireUserId } from "@/lib/auth-guard";
import {
  getActiveMistakeRepairs,
  recordRepairActivityCompleted,
  recordRepairFollowUpOutcome,
} from "../services/mistake-repair.service";
import { revalidatePath } from "next/cache";
import { serializeForClient } from "@/lib/utils";

export async function getActiveMistakeRepairsAction() {
  const userId = await requireUserId();
  const repairs = await getActiveMistakeRepairs(userId);
  return { ok: true, repairs: serializeForClient(repairs) };
}

export async function completeRepairActivityAction(repairId: string) {
  const userId = await requireUserId();
  const repair = await recordRepairActivityCompleted(repairId, userId);

  revalidatePath("/dashboard");
  revalidatePath("/plan");
  revalidatePath("/review");

  return { ok: true, repair: serializeForClient(repair) };
}

export async function submitRepairRecheckAction(params: {
  repairId: string;
  passed: boolean;
  independent: boolean;
  score: number;
  notes?: string;
}) {
  const userId = await requireUserId();
  const repair = await recordRepairFollowUpOutcome({
    repairId: params.repairId,
    userId,
    passed: params.passed,
    independent: params.independent,
    score: params.score,
    notes: params.notes,
  });

  revalidatePath("/dashboard");
  revalidatePath("/plan");
  revalidatePath("/progress");
  revalidatePath("/review");

  return { ok: true, repair: serializeForClient(repair) };
}

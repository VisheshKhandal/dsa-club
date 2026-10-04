import { endOfDay } from "date-fns";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { evaluateNextTaskDecision } from "@/features/intelligence/decisions/decision-policy";
import { DailyPlanModel } from "@/features/intelligence/models/intelligence.model";
import type { NextAction } from "@/features/product/services/learning-loop.selectors";

export type PersistedRecommendation = {
  id: string;
  generatedAt: string;
  expiresAt: string;
  nextAction: NextAction;
  candidates: Array<{
    rank: number;
    actionType: string;
    entityType: string;
    entityId: string;
    score: number;
    reasonCodes: string[];
    explanation: string;
    estimatedMinutes: number;
    href: string;
    label: string;
    title: string;
  }>;
};

/**
 * Generates the next action recommendation using the canonical decision policy.
 * Routine GET calls evaluate the decision deterministically without uncontrolled database writes.
 */
export async function generateNextAction(
  userId: Types.ObjectId,
  availableMinutes: number,
  now = new Date()
): Promise<PersistedRecommendation> {
  await connectToDatabase();

  const decision = await evaluateNextTaskDecision({
    userId,
    availableMinutes,
    persistRecord: false,
  });

  if (!decision) {
    throw new Error("No recommendation candidate is available; publish content or create a plan");
  }

  const sel = decision.selectedAction;
  const expiresAt = endOfDay(now);

  let explanation = decision.primaryReason;
  if (decision.timeBudgetExceeded && decision.timeBudgetAlternative) {
    explanation += ` Note: Estimated at ${sel.estimatedMinutes} mins (exceeds available ${availableMinutes} mins). Alternative available: "${decision.timeBudgetAlternative.title}" (${decision.timeBudgetAlternative.estimatedMinutes}m).`;
  }

  const candidate = {
    rank: 1,
    actionType: sel.actionType === "mission" ? "mission" : sel.actionType,
    entityType: sel.entityType || sel.actionType,
    entityId: sel.entityId ? String(sel.entityId) : String(userId),
    score: sel.priorityScore,
    reasonCodes: decision.reasonCodes as string[],
    explanation,
    estimatedMinutes: sel.estimatedMinutes,
    href: sel.targetUrl,
    label: sel.title,
    title: sel.title,
  };

  const phase: NextAction["phase"] =
    sel.actionType === "revision"
      ? "REVISE"
      : sel.actionType === "practice"
      ? "PRACTICE"
      : sel.actionType === "reflection"
      ? "REFLECT"
      : "LEARN";

  const nextAction: NextAction = {
    type: (sel.actionType === "practice" ? "problem" : sel.actionType) as any,
    title: sel.title,
    href: sel.targetUrl,
    estimatedMinutes: sel.estimatedMinutes,
    reason: decision.primaryReason,
    score: sel.priorityScore,
    phase,
    label: sel.title,
    evidenceNote: decision.secondaryReasons?.[0] || "Authoritative decision pipeline",
    entityId: sel.entityId ? String(sel.entityId) : undefined,
    entityType: sel.entityType as any,
  };

  return {
    id: decision.decisionId,
    generatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    nextAction,
    candidates: [candidate],
  };
}

export async function buildDailyPlan(
  userId: Types.ObjectId,
  dateKey: string,
  timezone: string,
  targetMinutes: number
) {
  const recommendation = await generateNextAction(userId, targetMinutes);
  const items = recommendation.candidates.map((candidate) => ({
    order: candidate.rank,
    entityType: candidate.entityType,
    entityId: Types.ObjectId.isValid(candidate.entityId) ? new Types.ObjectId(candidate.entityId) : userId,
    actionType: candidate.actionType,
    plannedMinutes: candidate.estimatedMinutes,
    status: "pending",
  }));
  return DailyPlanModel.findOneAndUpdate(
    { userId, dateKey },
    { $set: { timezone, targetMinutes, completedMinutes: 0, status: "active", items } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

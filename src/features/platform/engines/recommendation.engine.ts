/**
 * Platform-level recommendation engine — Single Source of Truth Facade
 *
 * The canonical scoring logic lives in learning-loop.selectors.ts:
 *   - buildDailyNextAction   → 5-phase deterministic next action
 *   - buildPracticeRecommendations → weakness-targeted problem candidates
 *
 * This module is the unified entry point for any caller that needs:
 *   - A ranked candidate list (multi-item) rather than a single selected action
 *   - The typed RecommendationCandidate contract
 *
 * Do NOT duplicate scoring logic here. Delegate to the selectors.
 */

import type { Types } from "mongoose";
import { Types as MongoTypes } from "mongoose";
import { buildDailyNextAction, buildPracticeRecommendations } from "@/features/product/services/learning-loop.selectors";

export type RecommendationContext = {
  userId: string;
  now?: Date;
};

export type RecommendationCandidate = {
  rank: number;
  entityType: "mission" | "topic" | "problem" | "revision" | "reflection";
  entityId: string;
  reason:
    | "revision_due"
    | "roadmap_next"
    | "weakness_repair"
    | "pattern_reinforcement"
    | "daily_goal"
    | "company_alignment"
    | "momentum"
    | "recovery"
    | "reflection_needed";
  score: number;
  label: string;
  title: string;
  href: string;
  explanation: string;
  estimatedMinutes: number;
  phase: "REVISE" | "PRACTICE" | "REFLECT" | "LEARN" | "MASTER";
  weakTopic?: string;
  weakPattern?: string;
};

function phaseToReason(phase: string): RecommendationCandidate["reason"] {
  if (phase === "REVISE") return "revision_due";
  if (phase === "PRACTICE") return "weakness_repair";
  if (phase === "REFLECT") return "reflection_needed";
  if (phase === "LEARN") return "roadmap_next";
  return "momentum";
}

function actionEntityType(type: string): RecommendationCandidate["entityType"] {
  if (type === "revision") return "revision";
  if (type === "problem") return "problem";
  if (type === "reflection") return "reflection";
  return "mission";
}

/**
 * Returns a ranked list of recommendation candidates for a user.
 * Rank 1 = the item the learner should do right now (same as buildDailyNextAction).
 * Subsequent ranks come from buildPracticeRecommendations for PRACTICE candidates.
 *
 * All data is sourced from MongoDB — no random values, no hardcoded content.
 */
export async function getRecommendationCandidates(
  context: RecommendationContext
): Promise<RecommendationCandidate[]> {
  let uid: InstanceType<typeof MongoTypes.ObjectId>;
  try {
    uid = new MongoTypes.ObjectId(context.userId);
  } catch {
    return [];
  }

  // Fetch practice recommendations first, then reuse them in buildDailyNextAction to avoid duplicate problem table queries
  const practiceRecs = await buildPracticeRecommendations(uid, 3).catch(
    () => [] as Awaited<ReturnType<typeof buildPracticeRecommendations>>
  );
  const action = await buildDailyNextAction(uid, practiceRecs).catch(() => null);

  const candidates: RecommendationCandidate[] = [];

  // Rank 1: The primary next action (highest priority across all phases)
  if (action) {
    candidates.push({
      rank: 1,
      entityType: actionEntityType(action.type),
      entityId: action.entityId ?? action.href,
      reason: phaseToReason(action.phase),
      score: action.score,
      label: action.label,
      title: action.title,
      href: action.href,
      explanation: action.reason,
      estimatedMinutes: action.estimatedMinutes,
      phase: action.phase,
    });
  }

  // Rank 2+: Practice candidates (weakness-targeted problems)
  // Skip any that duplicate the primary action
  const primaryEntityId = action?.entityId;
  let rank = 2;
  for (const rec of practiceRecs) {
    const p = rec.problem as Record<string, any>;
    const entityId = String(p._id);
    if (entityId === primaryEntityId) continue;
    candidates.push({
      rank: rank++,
      entityType: "problem",
      entityId,
      reason: rec.revisionIntent ? "revision_due" : "weakness_repair",
      score: rec.score,
      label: rec.revisionIntent ? "Re-attempt Problem" : "Solve Problem",
      title: String(p.title),
      href: `/practice/problems/${p.slug}`,
      explanation: rec.reason,
      estimatedMinutes: Number(p.estimatedMinutes ?? 25),
      phase: "PRACTICE",
      weakTopic: rec.weakTopic,
      weakPattern: rec.weakPattern,
    });
  }

  return candidates;
}

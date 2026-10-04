import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  IntelligenceDecisionModel,
  type IIntelligenceDecisionDocument,
} from "../models/intelligence-decision.model";
import { UserTopicProgressModel } from "../models/user-topic-progress.model";
import { buildCandidateSet } from "./task-candidate-builder";
import type {
  CandidateAction,
  DecisionEvaluationResult,
  DecisionReasonCode,
} from "./decision.types";
import { getLearnerEpoch } from "@/features/learning/services/learning-command.service";

export const DECISION_POLICY_VERSION = "3.0.0-canonical";

/**
 * Deterministically evaluates the candidate set against stored learner evidence
 * and available time constraints to pick the single authoritative learning action.
 *
 * Ranking Hierarchy:
 * 1. Tasks already in progress today (finish what was started).
 * 2. Required active plan day tasks in committed order.
 * 3. Due retention reviews from canonical RevisionQueueModel.
 * 4. Optional practice tasks.
 * 5. Self-paced / Roadmap mission fallback (supports no-active-plan case).
 * 6. Stable tie-breaker (priorityScore descending, candidateId ascending).
 *
 * Time Budget Handling:
 * - If top candidate exceeds available minutes: PRESERVE its honest estimate!
 * - Mark timeBudgetExceeded: true.
 * - Offer a genuine smaller candidate (e.g. 8-10m review or short drill) as timeBudgetAlternative.
 * - If no candidate fits, return structured no_fit_budget.
 */
export async function evaluateNextTaskDecision(params: {
  userId: string | Types.ObjectId;
  surface?: "dashboard_card" | "today_board" | "recovery_prompt" | "completion_eval" | "recalibration";
  availableMinutes?: number;
  persistRecord?: boolean;
}): Promise<DecisionEvaluationResult | null> {
  await connectToDatabase();
  const userObjectId =
    params.userId instanceof Types.ObjectId
      ? params.userId
      : new Types.ObjectId(params.userId);

  const surface = params.surface ?? "dashboard_card";
  const persistRecord = params.persistRecord ?? false;
  const availableMinutes = params.availableMinutes;

  const learningEpoch = await getLearnerEpoch(userObjectId);

  // 1. Build filtered candidate set
  const candidateSet = await buildCandidateSet(userObjectId, { availableMinutes });

  if (candidateSet.candidates.length === 0) {
    return null;
  }

  // 2. Fetch evidence for active topic
  const primaryTopicSlug = candidateSet.candidates[0].topicSlug;
  const topicProgress = await UserTopicProgressModel.findOne({
    userId: userObjectId,
    learningEpoch,
    topicSlug: primaryTopicSlug,
  }).lean();

  const topicMasteryScore = topicProgress?.masteryScore ?? 0;
  const independentSolveCount = topicProgress?.independentSolveCount ?? 0;
  const hintCount = topicProgress?.hintCount ?? 0;
  const isReviewDue = Boolean(
    topicProgress?.reviewDueAt && new Date(topicProgress.reviewDueAt) <= new Date()
  );

  // 3. Deterministic Sorting & Ranking Policy
  const ranked = [...candidateSet.candidates].sort((a, b) => {
    // Rank 1: In-progress tasks always take top priority
    if (a.isInProgress && !b.isInProgress) return -1;
    if (!a.isInProgress && b.isInProgress) return 1;

    // Rank 2: Required plan tasks take priority over optional tasks
    if (a.isRequired && !b.isRequired) return -1;
    if (!a.isRequired && b.isRequired) return 1;

    // Rank 3: Score comparison
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }

    // Rank 4: Stable tie-breaker
    return a.candidateId.localeCompare(b.candidateId);
  });

  const topCandidate: CandidateAction = ranked[0];
  const isPlanLed = Boolean(candidateSet.planId);

  // 4. Time Budget Constraint Evaluation
  let selectedAction: CandidateAction = topCandidate;
  let timeBudgetAlternative: CandidateAction | null = null;
  let timeBudgetExceeded = false;
  const reasonCodes: DecisionReasonCode[] = [];

  if (availableMinutes !== undefined && topCandidate.estimatedMinutes > availableMinutes) {
    timeBudgetExceeded = true;
    reasonCodes.push("time_budget_exceeded");

    // Locate the highest-priority candidate that DOES fit within the available minutes
    const fittingCandidate = ranked.find((c) => c.estimatedMinutes <= availableMinutes);
    if (fittingCandidate) {
      timeBudgetAlternative = fittingCandidate;
      reasonCodes.push("time_budget_alternative");
    } else {
      reasonCodes.push("no_fit_budget");
    }
  }

  // Add primary reason code
  if (selectedAction.isInProgress) {
    reasonCodes.unshift("plan_in_progress");
  } else if (selectedAction.planRelation === "plan_revision") {
    reasonCodes.unshift(selectedAction.reasonCode === "weakness_repair" ? "weakness_repair" : "revision_due");
  } else if (selectedAction.isRequired) {
    reasonCodes.unshift("plan_required_next");
  } else if (isPlanLed) {
    reasonCodes.unshift("plan_optional");
  } else {
    reasonCodes.unshift(selectedAction.actionType === "mission" ? "self_paced_mission" : "self_paced_practice");
  }

  // 5. Generate Structured Explanations
  let primaryReason = "";
  const secondaryReasons: string[] = [];

  if (selectedAction.isInProgress) {
    primaryReason = `Task in progress: You started "${selectedAction.title}" earlier. Resuming to complete your commitment.`;
    secondaryReasons.push("Resuming existing active session");
    secondaryReasons.push("Prevents context-switching");
  } else if (selectedAction.planRelation === "plan_revision") {
    primaryReason = selectedAction.reasonCode === "weakness_repair"
      ? `Mistake repair due: Reinforces invariant boundary reasoning for ${selectedAction.topicName} following prior difficulty.`
      : `Scheduled retention review: Spaced retrieval interval is due for ${selectedAction.topicName}; reinforcing recall without hints.`;
    secondaryReasons.push("Canonical revision queue item");
    secondaryReasons.push("Prevents concept decay");
  } else if (selectedAction.actionType === "mission") {
    primaryReason = `Core foundation: Introduces key invariants and mental models for ${selectedAction.topicName} before code implementation.`;
    secondaryReasons.push("Required for today's plan day");
    secondaryReasons.push(`Estimated duration: ${selectedAction.estimatedMinutes} minutes`);
  } else {
    primaryReason = `Targeted practice: Solidifies algorithmic implementation for ${selectedAction.topicName}.`;
    secondaryReasons.push("Follows canonical curriculum sequencing");
    if (topicMasteryScore > 0) {
      secondaryReasons.push(`Current topic mastery: ${topicMasteryScore}%`);
    }
  }

  if (timeBudgetExceeded) {
    if (timeBudgetAlternative) {
      secondaryReasons.push(
        `Time notice: Task estimate (${selectedAction.estimatedMinutes}m) exceeds available ${availableMinutes}m. Suggested alternative: "${timeBudgetAlternative.title}" (${timeBudgetAlternative.estimatedMinutes}m).`
      );
    } else {
      secondaryReasons.push(
        `Time notice: Task estimate (${selectedAction.estimatedMinutes}m) exceeds available ${availableMinutes}m. No shorter activity currently fits.`
      );
    }
  }

  // 6. Decision Persistence (at state transitions or explicit request, NOT on routine GETs)
  let decisionId = new Types.ObjectId().toString();
  if (persistRecord) {
    const planObjectId = candidateSet.planId ? new Types.ObjectId(candidateSet.planId) : null;
    const planDayObjectId = candidateSet.planDayId ? new Types.ObjectId(candidateSet.planDayId) : null;
    const entityObjectId = selectedAction.entityId ? new Types.ObjectId(selectedAction.entityId) : null;

    const altDoc = timeBudgetAlternative
      ? {
          actionKey: timeBudgetAlternative.actionKey,
          actionType: timeBudgetAlternative.actionType,
          entityType: timeBudgetAlternative.entityType,
          entityId: timeBudgetAlternative.entityId ? new Types.ObjectId(timeBudgetAlternative.entityId) : null,
          title: timeBudgetAlternative.title,
          estimatedMinutes: timeBudgetAlternative.estimatedMinutes,
          planRelation: timeBudgetAlternative.planRelation,
          targetUrl: timeBudgetAlternative.targetUrl,
          reason: timeBudgetAlternative.reasons[0] || "Fits your available session time.",
        }
      : null;

    const decisionDoc = await IntelligenceDecisionModel.create({
      userId: userObjectId,
      learningEpoch,
      policyVersion: DECISION_POLICY_VERSION,
      sourceEvidenceRevision: 1,
      planId: planObjectId,
      planDayId: planDayObjectId,
      surface,
      decisionType: selectedAction.planRelation === "plan_recovery" ? "recovery_recommendation" : "daily_next_action",
      mode: isPlanLed ? "plan_led" : "self_paced",
      availableMinutesContext: availableMinutes,
      timeBudgetExceeded,
      reasonCodes,
      selectedAction: {
        actionKey: selectedAction.actionKey,
        actionType: selectedAction.actionType,
        entityType: selectedAction.entityType,
        entityId: entityObjectId,
        title: selectedAction.title,
        estimatedMinutes: selectedAction.estimatedMinutes,
        planRelation: selectedAction.planRelation,
        targetUrl: selectedAction.targetUrl,
      },
      alternativeAction: altDoc,
      primaryReason,
      secondaryReasons,
      signals: {
        planDayIndex: candidateSet.currentDayIndex || 1,
        recentStrugglesCount: hintCount > 2 ? hintCount : 0,
        readinessScore: topicMasteryScore,
      },
      aiExplanation: {
        fallbackUsed: true,
      },
    });
    decisionId = decisionDoc._id.toString();
  }

  return {
    decisionId,
    selectedAction,
    timeBudgetAlternative,
    timeBudgetExceeded,
    primaryReason,
    secondaryReasons,
    reasonCodes,
    mode: isPlanLed ? "plan_led" : "self_paced",
    policyVersion: DECISION_POLICY_VERSION,
    learningEpoch,
    sourceEvidenceRevision: 1,
    availableMinutesContext: availableMinutes,
    candidateCount: ranked.length,
    evidenceSignals: {
      topicMasteryScore,
      independentSolveCount,
      hintCount,
      isReviewDue,
    },
  };
}

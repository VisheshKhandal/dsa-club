import type { Types } from "mongoose";
import type { PlanRelation } from "../types/intelligence.types";

export type DecisionReasonCode =
  | "plan_in_progress"
  | "plan_required_next"
  | "plan_optional"
  | "revision_due"
  | "weakness_repair"
  | "time_budget_alternative"
  | "time_budget_exceeded"
  | "no_fit_budget"
  | "self_paced_mission"
  | "self_paced_practice"
  | "checkpoint_due"
  | "day_complete";

export interface CandidateAction {
  candidateId: string;
  actionKey: string;
  actionType: "mission" | "practice" | "revision" | "reflection" | "checkpoint" | "rest";
  taskId?: string;
  entityType?: string;
  entityId?: string | null;
  topicId?: string | null;
  topicSlug: string;
  topicName: string;
  title: string;
  estimatedMinutes: number;
  planRelation: PlanRelation;
  targetUrl: string;
  priorityScore: number;
  reasons: string[];
  isInProgress: boolean;
  isRequired: boolean;
  fitsTimeBudget?: boolean;
  timeBudgetDeltaMinutes?: number;
  reasonCode?: DecisionReasonCode;
}

export interface CandidateSet {
  userId: string;
  planId?: string | null;
  planDayId?: string | null;
  currentDayIndex?: number;
  candidates: CandidateAction[];
  excludedCount: number;
  exclusionReasons: string[];
}

export interface DecisionEvaluationResult {
  decisionId: string;
  selectedAction: CandidateAction;
  timeBudgetAlternative?: CandidateAction | null;
  timeBudgetExceeded: boolean;
  primaryReason: string;
  secondaryReasons: string[];
  reasonCodes: DecisionReasonCode[];
  mode: "plan_led" | "self_paced";
  policyVersion: string;
  learningEpoch: number;
  sourceEvidenceRevision: number;
  availableMinutesContext?: number;
  candidateCount: number;
  evidenceSignals: {
    topicMasteryScore: number;
    independentSolveCount: number;
    hintCount: number;
    isReviewDue: boolean;
  };
}

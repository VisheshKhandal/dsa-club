/**
 * Task Completion Evaluator
 *
 * Implements the single canonical completion evaluator for all learning tasks.
 * Validates whether submitted evidence satisfies declared or default task requirements.
 *
 * Requirements:
 * - engage_practice_attempt: Any valid submitted attempt, regardless of pass/fail.
 * - solve_problem: A qualifying successful outcome.
 * - solve_independently: Success without current-attempt assistance (no hints, no editorial, no AI help).
 * - complete_reflection: A valid reflection submission.
 * - perform_review: A valid completed review, including failed recall (grade 0-5).
 * - demonstrate_recall: A review demonstrating retention (grade >= 3).
 */

export type TaskCompletionRequirement =
  | "engage_practice_attempt"
  | "solve_problem"
  | "solve_independently"
  | "complete_reflection"
  | "perform_review"
  | "demonstrate_recall";

export interface TaskCompletionEvidence {
  passed?: boolean;
  score?: number;
  strategy?: string;
  hintsUsed?: number;
  editorialViewed?: boolean;
  aiAssisted?: boolean;
  grade?: number;
  reflectionAnswer?: string;
  isAttemptSubmitted?: boolean;
  isReviewCompleted?: boolean;
  isReflectionSubmitted?: boolean;
}

export interface TaskEvaluationResult {
  qualifies: boolean;
  requirement: TaskCompletionRequirement;
  reason: string;
}

/**
 * Resolves the effective completion requirement for a plan task.
 * If the task document has an explicit requirement, that takes precedence.
 * Otherwise, resolves the canonical default from entityType and phase.
 */
export function resolveTaskRequirement(task: {
  phase?: string;
  entityType?: string;
  completionRequirement?: TaskCompletionRequirement | null;
}): TaskCompletionRequirement {
  if (task.completionRequirement) {
    return task.completionRequirement;
  }
  if (task.entityType === "revision" || task.phase === "revise") {
    return "perform_review";
  }
  if (task.entityType === "reflection" || task.phase === "reflect") {
    return "complete_reflection";
  }
  if (task.entityType === "checkpoint" || task.phase === "checkpoint") {
    return "solve_independently";
  }
  if (task.phase === "learn" || task.entityType === "mission") {
    return "engage_practice_attempt";
  }
  return "solve_problem";
}

/**
 * Evaluates whether the provided learning evidence satisfies the given requirement.
 */
export function evaluateTaskCompletion(
  requirement: TaskCompletionRequirement,
  evidence: TaskCompletionEvidence
): TaskEvaluationResult {
  switch (requirement) {
    case "engage_practice_attempt": {
      const qualifies = Boolean(
        evidence.isAttemptSubmitted ||
        evidence.passed !== undefined ||
        (evidence.score !== undefined && evidence.score >= 0)
      );
      return {
        qualifies,
        requirement,
        reason: qualifies
          ? "Practice attempt was submitted."
          : "No submitted practice attempt found.",
      };
    }

    case "solve_problem": {
      const qualifies = Boolean(
        evidence.passed === true || (evidence.score !== undefined && evidence.score >= 80)
      );
      return {
        qualifies,
        requirement,
        reason: qualifies
          ? "Problem was solved successfully."
          : "Problem was not solved successfully.",
      };
    }

    case "solve_independently": {
      const solved = Boolean(
        evidence.passed === true || (evidence.score !== undefined && evidence.score >= 80)
      );
      const hasHints = Number(evidence.hintsUsed ?? 0) > 0;
      const assisted = Boolean(
        evidence.editorialViewed ||
        evidence.aiAssisted ||
        hasHints ||
        (evidence.strategy && evidence.strategy !== "independent")
      );
      const qualifies = solved && !assisted;
      return {
        qualifies,
        requirement,
        reason: qualifies
          ? "Problem was solved independently without assistance."
          : solved
          ? "Problem was solved with guidance, which does not satisfy an independent solve requirement."
          : "Problem was not solved.",
      };
    }

    case "complete_reflection": {
      const qualifies = Boolean(
        evidence.isReflectionSubmitted ||
        (typeof evidence.reflectionAnswer === "string" && evidence.reflectionAnswer.trim().length >= 10)
      );
      return {
        qualifies,
        requirement,
        reason: qualifies
          ? "Reflection prompt was completed."
          : "Reflection submission is missing or under minimum length.",
      };
    }

    case "perform_review": {
      // Failed recall completes the commitment to review (while scheduling repair)
      const qualifies = Boolean(
        evidence.isReviewCompleted ||
        (evidence.grade !== undefined && evidence.grade >= 0)
      );
      return {
        qualifies,
        requirement,
        reason: qualifies
          ? "Scheduled review was performed."
          : "Review was not completed.",
      };
    }

    case "demonstrate_recall": {
      const qualifies = Boolean(evidence.grade !== undefined && evidence.grade >= 3);
      return {
        qualifies,
        requirement,
        reason: qualifies
          ? "Successful recall demonstrated."
          : "Review did not demonstrate successful recall (grade < 3).",
      };
    }

    default: {
      return {
        qualifies: Boolean(evidence.passed),
        requirement,
        reason: "Default completion evaluated.",
      };
    }
  }
}

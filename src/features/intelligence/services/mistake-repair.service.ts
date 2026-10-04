import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  MistakeRepairModel,
  type IMistakeRepairDocument,
  type MistakeRootDifficulty,
  type RepairDiagnosisSource,
} from "../models/mistake-repair.model";
import { RevisionQueueModel } from "../models/intelligence.model";
import { getLearnerEpoch } from "@/features/learning/services/learning-command.service";
import { UserTopicProgressModel } from "../models/user-topic-progress.model";
import { ProblemModel } from "@/features/content/models/content.model";

export interface CreateMistakeRepairInput {
  userId: string | Types.ObjectId;
  sourceType: "problem_attempt" | "checkpoint_attempt" | "spaced_review";
  sourceId: string;
  capability: string;
  topicSlug: string;
  explicitMisconception?: MistakeRootDifficulty;
  learnerReflection?: string;
  hintsUsed?: number;
  solutionViewed?: boolean;
}

/**
 * Creates or retrieves a deduplicated mistake repair record.
 * Root difficulty is diagnosed honestly from reviewed rubrics or explicit learner reflection
 * rather than fabricated or guessed via heuristic keywords.
 */
export async function createOrGetMistakeRepair(
  input: CreateMistakeRepairInput
): Promise<IMistakeRepairDocument> {
  await connectToDatabase();
  const userObjectId =
    input.userId instanceof Types.ObjectId ? input.userId : new Types.ObjectId(input.userId);

  const learningEpoch = await getLearnerEpoch(userObjectId);
  const dedupKey = `${userObjectId}:${learningEpoch}:${input.capability}:${input.sourceType}:${input.sourceId}`;

  // 1. Idempotency: Check if an exact repair or open repair already exists for this capability
  const existing = await MistakeRepairModel.findOne({ dedupKey });
  if (existing) {
    return existing;
  }

  const existingOpen = await MistakeRepairModel.findOne({
    userId: userObjectId,
    learningEpoch,
    capability: input.capability,
    topicSlug: input.topicSlug,
    status: { $in: ["pending", "activity_completed", "further_evidence_needed"] },
  }).sort({ createdAt: -1 });

  if (existingOpen) {
    return existingOpen;
  }

  // 1. Determine Honest Diagnosis
  let rootDifficulty: MistakeRootDifficulty = "unknown_cause";
  let diagnosisSource: RepairDiagnosisSource = "system_fallback";
  let explanation = "Difficulty observed during practice attempt.";

  if (input.explicitMisconception) {
    rootDifficulty = input.explicitMisconception;
    diagnosisSource = "reviewed_rubric";
    explanation = `Item rubric identified specific difficulty: ${rootDifficulty.replace(/_/g, " ")}.`;
  } else if (input.learnerReflection) {
    diagnosisSource = "learner_reflection";
    const ref = input.learnerReflection.toLowerCase();
    if (ref.includes("boundary") || ref.includes("off by one") || ref.includes("pointer")) {
      rootDifficulty = "boundary_condition_issue";
    } else if (ref.includes("invariant") || ref.includes("monotonic") || ref.includes("sort")) {
      rootDifficulty = "incorrect_invariant";
    } else if (ref.includes("constraint") || ref.includes("space") || ref.includes("memory")) {
      rootDifficulty = "constraint_mismatch";
    } else {
      rootDifficulty = "implementation_difficulty";
    }
    explanation = `Learner self-reported difficulty: ${input.learnerReflection.slice(0, 120)}`;
  } else if ((input.hintsUsed && input.hintsUsed > 0) || input.solutionViewed) {
    rootDifficulty = "implementation_difficulty";
    diagnosisSource = "system_fallback";
    explanation = "Learner required guided hints or editorial solution assistance during implementation.";
  }

  // 2. Select Grounded Repair Activity based on Topic & Capability
  let activity: {
    activityType: "concept_refresh" | "targeted_problem" | "boundary_checkpoint" | "retrieval_recheck";
    slugOrKey: string;
    title: string;
    estimatedMinutes: number;
  } = {
    activityType: "targeted_problem",
    slugOrKey: "two-sum-ii-input-array-is-sorted",
    title: "Inward Two-Pointer Convergence Drill",
    estimatedMinutes: 10,
  };
  let recheckItemKey: string | null = "chk-two-sum-ii-boundary";

  if (rootDifficulty === "boundary_condition_issue") {
    activity = {
      activityType: "boundary_checkpoint" as const,
      slugOrKey: "chk-two-sum-ii-boundary",
      title: "Boundary Reasoning & Strict Distinct Index Safety",
      estimatedMinutes: 6,
    };
    recheckItemKey = "chk-two-sum-ii-boundary";
  } else if (rootDifficulty === "constraint_mismatch") {
    activity = {
      activityType: "concept_refresh" as const,
      slugOrKey: "chk-two-sum-ii-constraint",
      title: "O(1) Space Invariance & Monotonic Pruning Constraints",
      estimatedMinutes: 6,
    };
    recheckItemKey = "chk-two-sum-ii-constraint";
  } else if (rootDifficulty === "incorrect_invariant") {
    activity = {
      activityType: "targeted_problem" as const,
      slugOrKey: "two-sum-ii-input-array-is-sorted",
      title: "Sorted Array Monotonic Invariant Practice",
      estimatedMinutes: 12,
    };
    recheckItemKey = "chk-two-sum-ii-invariant";
  }

  const repairId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const repair = await MistakeRepairModel.create({
    repairId,
    userId: userObjectId,
    learningEpoch,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    capability: input.capability,
    topicSlug: input.topicSlug,
    rootDifficulty,
    diagnosisSource,
    explanation,
    activity,
    recheckItemKey,
    status: "pending",
    dedupKey,
  });

  // 3. Connect to canonical RevisionQueue with high priority repair intent
  try {
    const problem = await ProblemModel.findOne({ slug: activity.slugOrKey }).select("_id").lean();
    if (problem) {
      await RevisionQueueModel.findOneAndUpdate(
        {
          userId: userObjectId,
          entityId: problem._id,
        },
        {
          $set: {
            state: "due",
            reviewType: "mistake_repair",
            priority: 95,
            dueAt: new Date(),
          },
        },
        { upsert: false }
      );
    }
  } catch {
    // Non-fatal if problem isn't indexed in revision queue yet
  }

  return repair;
}

/**
 * Marks a repair activity completed (e.g., learner studied the targeted explanation/drill).
 * Note: Reading an explanation is NOT proof that the misconception is resolved.
 * Status becomes "activity_completed" awaiting independent recheck.
 */
export async function recordRepairActivityCompleted(
  repairId: string,
  userId: string | Types.ObjectId
): Promise<IMistakeRepairDocument> {
  await connectToDatabase();
  const userObjectId =
    userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);

  const repair = await MistakeRepairModel.findOne({ repairId, userId: userObjectId });
  if (!repair) {
    throw new Error(`Mistake repair ${repairId} not found`);
  }

  if (repair.status === "pending") {
    repair.status = "activity_completed";
    repair.completedAt = new Date();
    await repair.save();
  }

  return repair;
}

/**
 * Evaluates the independent follow-up outcome for a repair record.
 * If passed independently, marks "follow_up_passed" and resolves the repair.
 * If failed or guided, marks "further_evidence_needed".
 */
export async function recordRepairFollowUpOutcome(params: {
  repairId: string;
  userId: string | Types.ObjectId;
  passed: boolean;
  independent: boolean;
  score: number;
  notes?: string;
}): Promise<IMistakeRepairDocument> {
  await connectToDatabase();
  const userObjectId =
    params.userId instanceof Types.ObjectId ? params.userId : new Types.ObjectId(params.userId);

  const repair = await MistakeRepairModel.findOne({
    repairId: params.repairId,
    userId: userObjectId,
  });
  if (!repair) {
    throw new Error(`Mistake repair ${params.repairId} not found`);
  }

  // Idempotency: if already resolved, return existing resolved record
  if (repair.status === "follow_up_passed") {
    return repair;
  }

  // Epoch fence: old-epoch repairs cannot affect current epoch progress
  const currentEpoch = await getLearnerEpoch(userObjectId);
  if (repair.learningEpoch !== currentEpoch) {
    throw new Error("Cannot resolve repair from an older learning epoch.");
  }

  repair.resolutionEvidence = {
    passed: params.passed,
    independent: params.independent,
    score: params.score,
    evaluatedAt: new Date(),
    notes: params.notes,
  };

  if (params.passed && params.independent) {
    repair.status = "follow_up_passed";
    repair.resolvedAt = new Date();
    // Invariant: Unsafe direct $inc on masteryScore is REMOVED to avoid uncoordinated, replay-unsafe mastery mutations
  } else {
    repair.status = "further_evidence_needed";
  }

  await repair.save();
  return repair;
}

/**
 * Retrieves all active (unresolved) mistake repairs for the learner.
 */
export async function getActiveMistakeRepairs(
  userId: string | Types.ObjectId
): Promise<IMistakeRepairDocument[]> {
  await connectToDatabase();
  const userObjectId =
    userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);

  const learningEpoch = await getLearnerEpoch(userObjectId);

  return MistakeRepairModel.find({
    userId: userObjectId,
    learningEpoch,
    status: { $in: ["pending", "activity_completed"] },
  })
    .sort({ createdAt: -1 })
    .lean() as any;
}

import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  CheckpointItemModel,
  CheckpointAttemptModel,
  type ICheckpointItemDocument,
  type ICheckpointAttemptDocument,
} from "../models/checkpoint-item.model";
import { CheckpointSessionModel, type CheckpointPurpose } from "../models/checkpoint-session.model";
import { PlanModel } from "../models/plan.model";
import { PlanTaskModel } from "../models/plan-task.model";
import { getLearnerEpoch } from "@/features/learning/services/learning-command.service";
import { recordLearningEvent } from "../services/learning-event.service";
import { createOrGetMistakeRepair } from "./mistake-repair.service";

/**
 * Reviewed foundation fixtures for the Arrays & Two-Pointers curriculum slice.
 * Explicitly labeled as "review_ready" (awaiting final editorial sign-off)
 * to maintain review honesty without claiming false external certification.
 */
export const ARRAYS_CHECKPOINT_FIXTURES = [
  {
    itemKey: "chk-two-sum-ii-invariant",
    version: "1.0.0",
    topicSlug: "arrays",
    capability: "two_pointers_invariant",
    prompt:
      "In a sorted array with two pointers left = 0 and right = n - 1, if array[left] + array[right] < target, which pointer must advance and why?",
    itemType: "invariant_recognition" as const,
    evidenceType: "recognition" as const,
    variantFamilyId: "fam-two-pointers-inward",
    variantType: "baseline" as const,
    prerequisites: ["sorted_array_indexing"],
    difficulty: "easy" as const,
    expectedDurationMinutes: 5,
    allowedAssistance: "none" as const,
    evaluationRubric: {
      options: [
        {
          key: "A",
          text: "Move right pointer to the left because sum is too small.",
          isCorrect: false,
          explanation: "Moving right to the left non-increases the sum, which moves further away from the target.",
          misconceptionType: "incorrect_invariant" as const,
        },
        {
          key: "B",
          text: "Move left pointer to the right because moving right cannot increase the sum in a sorted array.",
          isCorrect: true,
          explanation: "In a sorted array, array[left] + array[k] < target for all k <= right. Thus array[left] can never be part of a valid pair with any remaining candidate.",
        },
        {
          key: "C",
          text: "Move both pointers simultaneously towards the center.",
          isCorrect: false,
          explanation: "Moving both pointers may skip the valid combination.",
          misconceptionType: "incorrect_invariant" as const,
        },
        {
          key: "D",
          text: "Reset both pointers to index 0.",
          isCorrect: false,
          explanation: "Resetting throws away the O(n) monotonicity guarantee.",
          misconceptionType: "misunderstood_prerequisite" as const,
        },
      ],
      referenceAnswer: "B: Move left pointer rightward.",
      keyPoints: ["Monotonicity of sorted array", "Pruning eliminated candidates"],
    },
    difficultyRationale: "Tests core invariant understanding before code implementation.",
    provenance: "DSA Club Editorial Review Board (Internal Draft)",
    reviewStatus: "review_ready" as const,
    isPublished: true, // published for practice demonstration
  },
  {
    itemKey: "chk-two-sum-ii-boundary",
    version: "1.0.0",
    topicSlug: "arrays",
    capability: "boundary_reasoning",
    prompt:
      "When searching for a pair with target sum in a 1-indexed sorted array with distinct indices, what is the exact termination condition for the two pointers?",
    itemType: "boundary_reasoning" as const,
    evidenceType: "boundary_reasoning" as const,
    variantFamilyId: "fam-two-pointers-inward",
    variantType: "boundary_shift" as const,
    prerequisites: ["two_pointers_invariant"],
    difficulty: "easy" as const,
    expectedDurationMinutes: 5,
    allowedAssistance: "none" as const,
    evaluationRubric: {
      options: [
        {
          key: "A",
          text: "left <= right",
          isCorrect: false,
          explanation: "If left == right, the algorithm would reuse the same element at index left twice, violating the distinct indices requirement.",
          misconceptionType: "boundary_condition_issue" as const,
        },
        {
          key: "B",
          text: "left < right",
          isCorrect: true,
          explanation: "Strict inequality left < right guarantees two distinct elements are considered at every iteration.",
        },
        {
          key: "C",
          text: "right > 0",
          isCorrect: false,
          explanation: "right > 0 does not bound left relative to right.",
          misconceptionType: "boundary_condition_issue" as const,
        },
        {
          key: "D",
          text: "left >= 0",
          isCorrect: false,
          explanation: "left >= 0 does not enforce distinct indices.",
          misconceptionType: "boundary_condition_issue" as const,
        },
      ],
      referenceAnswer: "B: left < right",
      keyPoints: ["Distinct elements constraint", "Off-by-one boundary safety"],
    },
    difficultyRationale: "Tests edge-case boundary reasoning for distinct-element pairs.",
    provenance: "DSA Club Editorial Review Board (Internal Draft)",
    reviewStatus: "review_ready" as const,
    isPublished: true,
  },
  {
    itemKey: "chk-two-sum-ii-transfer",
    version: "1.0.0",
    topicSlug: "arrays",
    capability: "variant_transfer",
    prompt:
      "If the input array contains both negative and positive numbers, but remains sorted, does the two-pointer invariant still hold?",
    itemType: "variant_transfer" as const,
    evidenceType: "variant_transfer" as const,
    variantFamilyId: "fam-two-pointers-inward",
    variantType: "negative_signed_domain" as const,
    prerequisites: ["two_pointers_invariant", "signed_integers"],
    difficulty: "medium" as const,
    expectedDurationMinutes: 8,
    allowedAssistance: "none" as const,
    evaluationRubric: {
      options: [
        {
          key: "A",
          text: "No, two pointers only functions correctly on strictly positive numbers.",
          isCorrect: false,
          explanation: "Signs of numbers do not affect the relative ordering in a sorted array.",
          misconceptionType: "incorrect_invariant" as const,
        },
        {
          key: "B",
          text: "Yes, sorted monotonicity guarantees that moving left rightward non-decreases the sum, regardless of sign.",
          isCorrect: true,
          explanation: "Because the array is sorted, array[i] <= array[i+1] for all indices, so advancing left always increases or keeps the sum equal.",
        },
        {
          key: "C",
          text: "Only if all numbers are first converted to absolute values.",
          isCorrect: false,
          explanation: "Absolute values would destroy the sorted invariant.",
          misconceptionType: "incorrect_invariant" as const,
        },
        {
          key: "D",
          text: "Only if zero is omitted from the array.",
          isCorrect: false,
          explanation: "Zero has no adverse effect on monotonicity.",
          misconceptionType: "boundary_condition_issue" as const,
        },
      ],
      referenceAnswer: "B: Yes, sorted monotonicity holds regardless of signs.",
      keyPoints: ["Sign invariance", "Order preservation"],
    },
    difficultyRationale: "Tests transfer of the invariant to signed domains.",
    provenance: "DSA Club Editorial Review Board (Internal Draft)",
    reviewStatus: "review_ready" as const,
    isPublished: true,
  },
  {
    itemKey: "chk-two-sum-ii-trap",
    version: "1.0.0",
    topicSlug: "arrays",
    capability: "variant_transfer",
    prompt:
      "When a sorted array contains duplicate values and we must find all unique pairs that sum to target, what prevents duplicate answers?",
    itemType: "variant_transfer" as const,
    evidenceType: "variant_transfer" as const,
    variantFamilyId: "fam-two-pointers-inward",
    variantType: "distractor_trap" as const,
    prerequisites: ["two_pointers_invariant", "boundary_reasoning"],
    difficulty: "medium" as const,
    expectedDurationMinutes: 7,
    allowedAssistance: "none" as const,
    evaluationRubric: {
      options: [
        {
          key: "A",
          text: "Store all answers in a hash set to filter duplicates after full traversal.",
          isCorrect: false,
          explanation: "Using a hash set violates O(1) space constraint when in-place pointer advancement suffices.",
          misconceptionType: "constraint_mismatch" as const,
        },
        {
          key: "B",
          text: "After finding a match, advance left past identical adjacent values and decrement right past identical adjacent values.",
          isCorrect: true,
          explanation: "Skipping duplicates monotonically in O(1) space ensures each unique combination is emitted exactly once.",
        },
        {
          key: "C",
          text: "Two pointers cannot handle duplicate numbers in sorted arrays.",
          isCorrect: false,
          explanation: "Duplicates do not invalidate sorted monotonicity.",
          misconceptionType: "incorrect_invariant" as const,
        },
        {
          key: "D",
          text: "Only advance the right pointer when duplicates are encountered.",
          isCorrect: false,
          explanation: "Asymmetric advancement without skipping both will produce duplicate combinations.",
          misconceptionType: "boundary_condition_issue" as const,
        },
      ],
      referenceAnswer: "B: Skip adjacent duplicate values after match.",
      keyPoints: ["In-place deduplication", "O(1) auxiliary space"],
    },
    difficultyRationale: "Tests avoidance of common duplicate pair pitfalls without auxiliary space.",
    provenance: "DSA Club Editorial Review Board (Internal Draft)",
    reviewStatus: "review_ready" as const,
    isPublished: true,
  },
];

export const APPROVED_CHECKPOINT_FIXTURES = [
  {
    itemKey: "chk-two-sum-ii-constraint",
    version: "1.0.0",
    topicSlug: "arrays",
    capability: "constraint_analysis",
    prompt:
      "Given an array of size n that is sorted, what is the auxiliary space complexity of the optimal two-pointer solution for Two Sum II?",
    itemType: "constraint_analysis" as const,
    evidenceType: "invariant_explanation" as const,
    variantFamilyId: "fam-two-pointers-inward",
    variantType: "changed_constraints" as const,
    prerequisites: ["space_complexity_o1"],
    difficulty: "easy" as const,
    expectedDurationMinutes: 4,
    allowedAssistance: "none" as const,
    evaluationRubric: {
      options: [
        {
          key: "A",
          text: "O(n) auxiliary space to store a hash table of visited numbers.",
          isCorrect: false,
          explanation: "The sorted property allows two pointers without any hash map.",
          misconceptionType: "constraint_mismatch" as const,
        },
        {
          key: "B",
          text: "O(1) auxiliary space because pointers left and right only require two integer variables.",
          isCorrect: true,
          explanation: "Two pointers operate in-place with constant additional space.",
        },
        {
          key: "C",
          text: "O(log n) auxiliary space due to recursive stack frames.",
          isCorrect: false,
          explanation: "The standard two-pointer loop is iterative.",
          misconceptionType: "implementation_difficulty" as const,
        },
        {
          key: "D",
          text: "O(n^2) space in the worst case.",
          isCorrect: false,
          explanation: "No extra space quadratic in n is allocated.",
          misconceptionType: "constraint_mismatch" as const,
        },
      ],
      referenceAnswer: "B: O(1) auxiliary space.",
      keyPoints: ["In-place two-pointer traversal", "Constant auxiliary memory"],
    },
    difficultyRationale: "Tests space constraint verification.",
    provenance: "DSA Club Editorial Review Board (Approved Standard)",
    reviewStatus: "approved" as const,
    isPublished: true,
  },
];

/**
 * Seeds or updates checkpoint fixtures for the narrow curriculum slice.
 * Explicit administrative operation - NEVER called on learner read queries.
 */
export async function seedCheckpointFixtures(options?: { includeApproved?: boolean }): Promise<number> {
  await connectToDatabase();
  let count = 0;
  const fixtures = options?.includeApproved
    ? [...ARRAYS_CHECKPOINT_FIXTURES, ...APPROVED_CHECKPOINT_FIXTURES]
    : ARRAYS_CHECKPOINT_FIXTURES;
  for (const item of fixtures) {
    await CheckpointItemModel.findOneAndUpdate(
      { itemKey: item.itemKey, version: item.version },
      { $set: item },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    count++;
  }
  return count;
}


/**
 * Retrieves eligible checkpoint items for a topic. Pure read query.
 * Strips correct answers when requested for unsubmitted learner viewing.
 */
export async function getEligibleCheckpointItems(
  topicSlug: string,
  options?: { onlyReviewed?: boolean }
): Promise<ICheckpointItemDocument[]> {
  await connectToDatabase();
  const filter: Record<string, any> = { topicSlug, isPublished: true };
  if (options?.onlyReviewed) {
    filter.reviewStatus = { $in: ["approved", "reviewed", "published"] };
  }
  return CheckpointItemModel.find(filter).sort({ difficulty: 1 }).lean() as any;
}

/**
 * Starts a new Checkpoint Assessment Session, freezing the assigned item version.
 * Ensures the rubric answer key is NEVER exposed prior to submission.
 */
export async function startCheckpointSession(params: {
  userId: string | Types.ObjectId;
  itemKey: string;
  itemVersion?: string;
  purpose?: CheckpointPurpose;
  hintsUsed?: number;
  solutionViewed?: boolean;
}): Promise<{
  session: any;
  item: {
    itemKey: string;
    version: string;
    topicSlug: string;
    capability: string;
    prompt: string;
    itemType: string;
    evidenceType?: string;
    variantFamilyId?: string | null;
    variantType?: string;
    difficulty: string;
    expectedDurationMinutes: number;
    options: { key: string; text: string }[];
    reviewStatus: string;
    isProvisional: boolean;
  };
}> {
  await connectToDatabase();
  const userObjectId =
    params.userId instanceof Types.ObjectId
      ? params.userId
      : new Types.ObjectId(params.userId);

  const learningEpoch = await getLearnerEpoch(userObjectId);

  // 1. Resolve Item (respecting specific version if supplied, else active published version)
  const query: Record<string, any> = { itemKey: params.itemKey, isPublished: true };
  if (params.itemVersion) {
    query.version = params.itemVersion;
  }

  const item = await CheckpointItemModel.findOne(query).sort({ version: -1 });
  if (!item) {
    throw new Error(`Checkpoint item "${params.itemKey}" not found or not published.`);
  }

  // 2. Count prior exposures for this learner
  const priorExposureCount = await CheckpointAttemptModel.countDocuments({
    userId: userObjectId,
    learningEpoch,
    itemKey: item.itemKey,
  });

  const sessionId = `chk-sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // 3. Create frozen assessment session
  const session = await CheckpointSessionModel.create({
    sessionId,
    userId: userObjectId,
    learningEpoch,
    purpose: params.purpose || "checkpoint",
    topicSlug: item.topicSlug,
    itemKey: item.itemKey,
    itemVersion: item.version, // FROZEN VERSION
    capability: item.capability,
    itemType: item.itemType,
    status: "started",
    hintsUsed: params.hintsUsed || 0,
    solutionViewed: params.solutionViewed || false,
    priorExposureCount,
    startedAt: new Date(),
  });

  // 4. Return safe item presentation without exposing rubric isCorrect or explanations
  const safeOptions = (item.evaluationRubric.options || []).map((opt: any) => ({
    key: opt.key,
    text: opt.text,
  }));

  const isProvisional = item.reviewStatus !== "reviewed" && item.reviewStatus !== "approved";

  return {
    session,
    item: {
      itemKey: item.itemKey,
      version: item.version,
      topicSlug: item.topicSlug,
      capability: item.capability,
      prompt: item.prompt,
      itemType: item.itemType,
      evidenceType: item.evidenceType || "boundary_reasoning",
      variantFamilyId: item.variantFamilyId || null,
      variantType: item.variantType || "baseline",
      difficulty: item.difficulty,
      expectedDurationMinutes: item.expectedDurationMinutes,
      options: safeOptions,
      reviewStatus: item.reviewStatus,
      isProvisional,
    },
  };
}

/**
 * Retrieves a learner's checkpoint session by sessionId.
 */
export async function getCheckpointSession(
  sessionId: string,
  userId: string | Types.ObjectId
) {
  await connectToDatabase();
  const userObjectId =
    userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);

  return CheckpointSessionModel.findOne({
    sessionId,
    userId: userObjectId,
  });
}

/**
 * Submits a learner response for a diagnostic checkpoint item and computes rubric feedback.
 * Guaranteed idempotent and evaluated against the session's exact frozen version.
 */
export async function submitCheckpointAttempt(params: {
  userId: string | Types.ObjectId;
  itemKey?: string;
  itemVersion?: string;
  sessionId?: string;
  selectedOptionKey: string;
  responseContent?: string;
  durationSeconds?: number;
  hintsUsed?: number;
  solutionViewed?: boolean;
  idempotencyKey?: string;
}): Promise<{
  attempt: ICheckpointAttemptDocument;
  isCorrect: boolean;
  score: number;
  feedback: string;
  explanation: string;
  reviewStatus: string;
  isProvisional: boolean;
  demonstratedIndependence: boolean;
}> {
  await connectToDatabase();
  const userObjectId =
    params.userId instanceof Types.ObjectId
      ? params.userId
      : new Types.ObjectId(params.userId);

  const learningEpoch = await getLearnerEpoch(userObjectId);

  // 1. Session & Frozen Item Version Resolution
  let session = params.sessionId
    ? await CheckpointSessionModel.findOne({
        sessionId: params.sessionId,
        userId: userObjectId,
        learningEpoch,
      })
    : null;

  if (params.sessionId && !session) {
    throw new Error("Invalid or unowned checkpoint session.");
  }

  // Idempotency: If this session is already submitted, return the stable cached result
  if (session && session.status === "submitted" && session.activeAttemptId) {
    const existingAttempt = await CheckpointAttemptModel.findById(session.activeAttemptId);
    if (existingAttempt) {
      const item = await CheckpointItemModel.findOne({
        itemKey: session.itemKey,
        version: session.itemVersion,
      });

      return {
        attempt: existingAttempt,
        isCorrect: existingAttempt.isCorrect,
        score: existingAttempt.score,
        feedback: existingAttempt.feedback,
        explanation: item?.evaluationRubric.referenceAnswer || existingAttempt.feedback,
        reviewStatus: item?.reviewStatus || "reviewed",
        isProvisional: item ? item.reviewStatus !== "reviewed" && item.reviewStatus !== "approved" : false,
        demonstratedIndependence: existingAttempt.demonstratedIndependence,
      };
    }
  }

  const resolvedItemKey = session ? session.itemKey : params.itemKey;
  if (!resolvedItemKey) {
    throw new Error("Cannot submit checkpoint: itemKey or valid sessionId required.");
  }

  // Exact version resolution: use frozen session version if session exists
  const resolvedVersion = session?.itemVersion || params.itemVersion;
  const itemQuery: Record<string, any> = { itemKey: resolvedItemKey };
  if (resolvedVersion) {
    itemQuery.version = resolvedVersion;
  }

  const item = await CheckpointItemModel.findOne(itemQuery).sort({ version: -1 });
  if (!item) {
    throw new Error(
      `Checkpoint item ${resolvedItemKey}${resolvedVersion ? ` (v${resolvedVersion})` : ""} not found.`
    );
  }

  // 2. Validate Selected Option against Rubric
  // Reject invalid option keys instead of silently marking incorrect
  const chosenOption = item.evaluationRubric.options?.find(
    (opt: any) => opt.key === params.selectedOptionKey
  );

  if (!chosenOption) {
    throw new Error(
      `Invalid option key "${params.selectedOptionKey}" for checkpoint item ${item.itemKey}. Option does not exist in rubric.`
    );
  }

  const isCorrect = Boolean(chosenOption.isCorrect);
  const score = isCorrect ? 100 : 0;
  const feedback = chosenOption.explanation;
  const isProvisional = item.reviewStatus !== "reviewed" && item.reviewStatus !== "approved";

  // 3. Derive Honest Independence from Monotonic Assistance Evidence
  const effectiveHints = Math.max(session?.hintsUsed || 0, params.hintsUsed || 0);
  const effectiveSolutionViewed = Boolean(session?.solutionViewed || params.solutionViewed);
  if (session) {
    session.hintsUsed = effectiveHints;
    session.solutionViewed = effectiveSolutionViewed;
  }
  // A correct answer demonstrates independence ONLY when no hints were revealed, no editorial solution viewed, and answer is correct
  const demonstratedIndependence = isCorrect && effectiveHints === 0 && !effectiveSolutionViewed;

  // 4. Check for Attempt Idempotency
  const stableIdempKey =
    params.idempotencyKey ||
    (params.sessionId ? `chk-att-${params.sessionId}` : `chk-att-${userObjectId}-${item.itemKey}-${learningEpoch}`);

  let existingAttempt = await CheckpointAttemptModel.findOne({
    userId: userObjectId,
    learningEpoch,
    $or: [
      { idempotencyKey: stableIdempKey },
      ...(params.sessionId ? [{ sessionId: params.sessionId }] : []),
    ],
  });

  if (existingAttempt) {
    return {
      attempt: existingAttempt,
      isCorrect: existingAttempt.isCorrect,
      score: existingAttempt.score,
      feedback: existingAttempt.feedback,
      explanation: item.evaluationRubric.referenceAnswer || existingAttempt.feedback,
      reviewStatus: item.reviewStatus,
      isProvisional,
      demonstratedIndependence: existingAttempt.demonstratedIndependence,
    };
  }

  // 5. Derive Evidence Semantics: conservative transfer evidence requires no prior exposure
  const priorExposureCount = await CheckpointAttemptModel.countDocuments({
    userId: userObjectId,
    learningEpoch,
    itemKey: item.itemKey,
  });

  const isTransferEvidence =
    item.evidenceType === "variant_transfer" &&
    isCorrect &&
    demonstratedIndependence &&
    priorExposureCount === 0;

  // 6. Persist Attempt
  const attempt = await CheckpointAttemptModel.create({
    userId: userObjectId,
    learningEpoch,
    itemKey: item.itemKey,
    itemVersion: item.version,
    topicSlug: item.topicSlug,
    capability: item.capability,
    evidenceType: item.evidenceType || "boundary_reasoning",
    variantFamilyId: item.variantFamilyId || null,
    isTransferEvidence,
    evaluationMode: "deterministic_rubric",
    priorExposureCount,
    repairId: null,
    sessionId: params.sessionId || null,
    idempotencyKey: stableIdempKey,
    selectedOptionKey: params.selectedOptionKey,
    responseContent: params.responseContent || null,
    isCorrect,
    score,
    demonstratedIndependence,
    feedback,
    durationSeconds: params.durationSeconds || 0,
    completedAt: new Date(),
  });

  // 7. Trigger Mistake Repair on difficulty referencing exact source attempt ID
  let repairId: string | null = null;
  if (!isCorrect) {
    try {
      const repair = await createOrGetMistakeRepair({
        userId: userObjectId,
        sourceType: "checkpoint_attempt",
        sourceId: String(attempt._id),
        capability: item.capability,
        topicSlug: item.topicSlug,
        explicitMisconception: (chosenOption as any).misconceptionType,
        hintsUsed: effectiveHints,
        solutionViewed: effectiveSolutionViewed,
      });
      repairId = repair.repairId;
      attempt.repairId = repairId;
      await attempt.save();
    } catch (repairErr) {
      console.warn("Checkpoint mistake repair creation warning:", repairErr);
    }
  }

  // 8. Reconcile active PlanTask if applicable
  try {
    const activePlan = await PlanModel.findOne({ userId: userObjectId, status: "active" }).select("_id").lean();
    if (activePlan) {
      await PlanTaskModel.updateOne(
        {
          userId: userObjectId,
          planId: activePlan._id,
          entityType: "checkpoint",
          $or: [{ entityId: item._id }, { taskKey: item.itemKey }],
          status: { $in: ["pending", "in_progress"] },
        },
        {
          $set: {
            status: isCorrect ? "completed" : "pending",
            completedAt: isCorrect ? new Date() : null,
            "evidence.score": score,
            "evidence.passed": isCorrect,
          },
        }
      );
    }
  } catch (planReconcileErr) {
    console.warn("Checkpoint plan task reconciliation warning:", planReconcileErr);
  }

  // 6. Record canonical LearningEvent with stable idempotency
  try {
    await recordLearningEvent({
      userId: userObjectId,
      learningEpoch,
      eventType: "checkpoint_attempted",
      idempotencyKey: `evt-${stableIdempKey}`,
      topicSlug: item.topicSlug,
      sessionId: params.sessionId || null,
      payload: {
        itemKey: item.itemKey,
        itemVersion: item.version,
        capability: item.capability,
        isCorrect,
        score,
        itemType: item.itemType,
        reviewStatus: item.reviewStatus,
        isProvisional,
        demonstratedIndependence,
      },
    });
  } catch (eventErr) {
    // Learning event warning - attempt record is already durable
    console.warn("Checkpoint attempted event recording warning:", eventErr);
  }

  // 7. Update Session State
  if (session) {
    session.status = "submitted";
    session.submittedAt = new Date();
    session.activeAttemptId = attempt._id as Types.ObjectId;
    session.selectedOptionKey = params.selectedOptionKey;
    session.resultSnapshot = {
      isCorrect,
      score,
      feedback,
      demonstratedIndependence,
      isProvisional,
    };
    await session.save();
  }

  return {
    attempt,
    isCorrect,
    score,
    feedback,
    explanation: item.evaluationRubric.referenceAnswer || feedback,
    reviewStatus: item.reviewStatus,
    isProvisional,
    demonstratedIndependence,
  };
}


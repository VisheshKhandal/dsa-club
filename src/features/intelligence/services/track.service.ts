import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  TrackModel,
  TrackEnrollmentModel,
  type ITrackDocument,
  type ITrackEnrollmentDocument,
  type ITrackUnit,
} from "../models/track.model";
import { ProblemModel } from "@/features/content/models/content.model";
import { ProblemAttemptModel } from "@/features/learning/models/learning.model";
import { PracticeSessionModel } from "@/features/learning/models/practice-session.model";
import { CheckpointItemModel, CheckpointAttemptModel } from "../models/checkpoint-item.model";
import { UserTopicProgressModel } from "../models/user-topic-progress.model";
import { PlanModel } from "../models/plan.model";
import { PlanDayModel, type IPlanDayDocument } from "../models/plan-day.model";
import { PlanTaskModel } from "../models/plan-task.model";
import { getActiveJourney } from "./journey.service";
import { resolveCurrentPlanDay } from "./plan-content-resolver";
import { getLearnerEpoch } from "@/features/learning/services/learning-command.service";
import { serializeForClient } from "@/lib/utils";

/**
 * Canonical contract for the Arrays and Two-Pointers Preparation Track.
 * Explicitly bounded, tested, and published for the proven curriculum slice.
 */
export const ARRAYS_TRACK_DEFINITION = {
  trackSlug: "arrays-and-pointers",
  version: "1.0.0",
  title: "Arrays and Two-Pointers Preparation Track",
  shortDescription:
    "Master inward two-pointer traversal, monotonic pruning, boundary-condition reasoning, and in-place space optimization for sorted array problems.",
  targetProfile: {
    minExperience: "intermediate" as const,
    description:
      "Learners with basic programming knowledge looking to master deterministic two-pointer invariants without guessing or brute-force iteration.",
  },
  prerequisites: [
    "Basic array indexing and iteration (O(n) linear scans)",
    "Familiarity with time and space Big-O complexity",
  ],
  supportedScope:
    "Sorted array search, inward two-pointer invariants, boundary safety (distinct indices vs identical indices), and space-invariant analysis.",
  coveredCapabilities: [
    "two_pointers_invariant",
    "boundary_reasoning",
    "variant_transfer",
    "constraint_analysis",
  ],
  excludedTopics: [
    "Dynamic Programming on multi-dimensional matrices",
    "Graph pathfinding and topological sorts",
    "Binary tree traversals",
    "Bit manipulation bitmasking tricks",
  ],
  workloadHours: 3.5,
  completionCriteria: {
    minCompletedProblems: 2,
    minMasteryScore: 60,
    minCheckpointsPassed: 2,
  },
  provenance: "DSA Club Curriculum Committee",
  publicationStatus: "published" as const,
  units: [
    {
      unitId: "unit-1-inward-search",
      order: 1,
      title: "Inward Two-Pointer Search & Monotonicity",
      description:
        "Understand why sorted order enables monotonic pruning in O(n) without auxiliary memory.",
      estimatedMinutes: 45,
      problemSlugs: ["two-sum", "two-sum-ii-input-array-is-sorted"],
      checkpointKeys: ["chk-two-sum-ii-invariant"],
      requiredToComplete: true,
    },
    {
      unitId: "unit-2-boundary-and-constraints",
      order: 2,
      title: "Boundary Reasoning & Space Constraints",
      description:
        "Verify off-by-one pointer convergence, distinct element indices, and O(1) memory guarantees.",
      estimatedMinutes: 45,
      problemSlugs: ["two-sum-ii-input-array-is-sorted"],
      checkpointKeys: ["chk-two-sum-ii-boundary", "chk-two-sum-ii-constraint"],
      requiredToComplete: true,
    },
    {
      unitId: "unit-3-variant-transfer",
      order: 3,
      title: "Variant Transfer & Signed Domains",
      description:
        "Evaluate invariant preservation when arrays contain negative integers, duplicates, or zero.",
      estimatedMinutes: 50,
      problemSlugs: ["two-sum-ii-input-array-is-sorted"],
      checkpointKeys: ["chk-two-sum-ii-transfer", "chk-two-sum-ii-trap"],
      requiredToComplete: true,
    },
  ],
};

/**
 * Seeds canonical preparation tracks into the database.
 */
export async function seedTrackDefinitions(): Promise<number> {
  await connectToDatabase();
  await TrackModel.findOneAndUpdate(
    { trackSlug: ARRAYS_TRACK_DEFINITION.trackSlug },
    { $set: ARRAYS_TRACK_DEFINITION },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return 1;
}

/**
 * Retrieves all published tracks.
 * Pure read query: never seeds or mutates database on read.
 */
export async function getPublishedTracks(): Promise<ITrackDocument[]> {
  await connectToDatabase();
  const tracks = (await TrackModel.find({ publicationStatus: "published" }).lean()) as any[];
  if (!tracks || tracks.length === 0) {
    return [ARRAYS_TRACK_DEFINITION as any];
  }
  return tracks;
}

/**
 * Retrieves a single track by slug.
 * Pure read query: never seeds or mutates database on read.
 */
export async function getTrackBySlug(trackSlug: string): Promise<ITrackDocument | null> {
  await connectToDatabase();
  let track = (await TrackModel.findOne({ trackSlug }).lean()) as any;
  if (!track && trackSlug === ARRAYS_TRACK_DEFINITION.trackSlug) {
    // Read-only static definition: DO NOT seed or write to database on learner read
    track = ARRAYS_TRACK_DEFINITION as any;
  }
  return track;
}

/**
 * Enrolls a learner into a supported preparation track.
 * Idempotent: Associates with active journey/plan rather than creating duplicate scheduling authorities.
 */
export async function enrollInTrack(params: {
  userId: string | Types.ObjectId;
  trackSlug: string;
}): Promise<{
  enrollment: ITrackEnrollmentDocument;
  isNewEnrollment: boolean;
}> {
  await connectToDatabase();
  const userObjectId =
    params.userId instanceof Types.ObjectId
      ? params.userId
      : new Types.ObjectId(params.userId);

  const learningEpoch = await getLearnerEpoch(userObjectId);

  const track = await getTrackBySlug(params.trackSlug);
  if (!track) {
    throw new Error(`Track "${params.trackSlug}" not found`);
  }

  // 1. Enforce legitimate editorial publication status check
  if (track.publicationStatus !== "published") {
    throw new Error(
      `Track "${params.trackSlug}" is currently in ${track.publicationStatus} state and not published for learners.`
    );
  }

  // 2. Check existing enrollment in this epoch
  const existing = await TrackEnrollmentModel.findOne({
    userId: userObjectId,
    learningEpoch,
    trackSlug: track.trackSlug,
  });

  if (existing) {
    return { enrollment: existing, isNewEnrollment: false };
  }

  // 3. Resolve compatible active journey and plan
  let activeJourney = await getActiveJourney(userObjectId);
  let activePlanId = activeJourney?.activePlanId || null;

  if (!activePlanId) {
    const activePlan = await PlanModel.findOne({
      userId: userObjectId,
      status: "active",
    }).lean();

    if (activePlan) {
      // Check topic compatibility between plan and track
      const planTopicSlug =
        activePlan.snapshots?.primaryTopicSlug ||
        (activePlan as any).topicSlug ||
        "";

      // If active plan is for an unrelated topic (e.g. dynamic-programming while track is arrays-and-pointers),
      // DO NOT silently link it! Keep track enrollment self-paced.
      const isCompatible =
        !planTopicSlug ||
        planTopicSlug === "arrays" ||
        track.trackSlug.includes(planTopicSlug) ||
        planTopicSlug.includes("array");

      if (isCompatible) {
        activePlanId = activePlan._id as Types.ObjectId;
      }
    }
  }

  // 4. Create enrollment referencing existing canonical journey & plan
  const enrollment = await TrackEnrollmentModel.create({
    userId: userObjectId,
    learningEpoch,
    trackSlug: track.trackSlug,
    trackVersion: track.version,
    journeyId: activeJourney?._id || null,
    planId: activePlanId,
    status: "active",
    enrolledAt: new Date(),
  });

  return { enrollment, isNewEnrollment: true };
}

/**
 * Retrieves enrollment for a user and track in their current epoch.
 */
export async function getTrackEnrollment(
  userId: string | Types.ObjectId,
  trackSlug: string
): Promise<ITrackEnrollmentDocument | null> {
  await connectToDatabase();
  const userObjectId =
    userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);
  const learningEpoch = await getLearnerEpoch(userObjectId);

  return TrackEnrollmentModel.findOne({
    userId: userObjectId,
    learningEpoch,
    trackSlug,
  }).lean() as any;
}

export interface IAdaptiveSheetItem {
  itemId: string;
  type: "problem" | "checkpoint";
  title: string;
  slugOrKey: string;
  capability?: string;
  status: "solved" | "passed" | "in_progress" | "attempted" | "available" | "locked";
  hintsUsed?: number;
  demonstratedIndependence?: boolean;
  score?: number;
  isPlannedToday?: boolean;
  estimatedMinutes?: number;
  difficulty?: string;
}

export interface IAdaptiveSheetUnit {
  unitId: string;
  order: number;
  title: string;
  description: string;
  items: IAdaptiveSheetItem[];
  isCompleted: boolean;
}

export interface ITrackAdaptiveSheetData {
  track: ITrackDocument;
  enrollment: ITrackEnrollmentDocument | null;
  units: IAdaptiveSheetUnit[];
  stats: {
    totalProblems: number;
    completedProblems: number;
    totalCheckpoints: number;
    passedCheckpoints: number;
    masteryScore: number;
    reviewDue: boolean;
    reviewDueAt?: Date | null;
    isTrackCompleted: boolean;
    completionSummary?: {
      status: "completed" | "retention_pending" | "needs_transfer_evidence" | "in_progress";
      requiredWorkCompleted: boolean;
      observedCapabilities: string[];
      retentionPending: boolean;
      transferEvidenceAvailable: boolean;
      evidenceExplanation: string;
    };
  };
}

/**
 * Assembles Adaptive Sheet data for a learner.
 * Directly reads canonical learning records (ProblemAttempt, CheckpointAttempt, UserTopicProgress).
 * NEVER creates a parallel checklist database!
 */
export async function getTrackAdaptiveSheetData(
  userId: string | Types.ObjectId,
  trackSlug: string
): Promise<ITrackAdaptiveSheetData> {
  await connectToDatabase();
  const userObjectId =
    userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);
  const learningEpoch = await getLearnerEpoch(userObjectId);

  const track = await getTrackBySlug(trackSlug);
  if (!track) {
    throw new Error(`Track "${trackSlug}" not found`);
  }

  const enrollment = await getTrackEnrollment(userObjectId, trackSlug);

  // 1. Gather all problem slugs and checkpoint keys from track units
  const allProblemSlugs = Array.from(
    new Set(track.units.flatMap((u) => u.problemSlugs || []))
  );
  const allCheckpointKeys = Array.from(
    new Set(track.units.flatMap((u) => u.checkpointKeys || []))
  );

  // 2. Query problems from Content store
  const problems = (await ProblemModel.find({
    slug: { $in: allProblemSlugs },
  }).select("_id slug title difficulty estimatedMinutes").lean()) as any[];

  const problemMap = new Map<string, any>(problems.map((p: any) => [p.slug, p]));
  const problemIdMap = new Map<string, string>(problems.map((p: any) => [String(p._id), String(p.slug)]));
  const problemIds = problems.map((p: any) => p._id);

  // 3. Query canonical learning evidence: problem attempts
  const problemAttempts = (await ProblemAttemptModel.find({
    userId: userObjectId,
    learningEpoch,
    problemId: { $in: problemIds },
  }).lean()) as any[];

  // 4. Query active practice sessions
  const activeSessions = (await PracticeSessionModel.find({
    userId: userObjectId,
    learningEpoch,
    problemId: { $in: problemIds },
    state: { $in: ["active", "paused"] },
  }).lean()) as any[];

  const activeSessionProblemIds = new Set<string>(
    activeSessions.map((s: any) => String(s.problemId))
  );

  // 5. Query checkpoints and checkpoint attempts
  const checkpointItems = (await CheckpointItemModel.find({
    itemKey: { $in: allCheckpointKeys },
  }).lean()) as any[];

  const checkpointMap = new Map<string, any>(checkpointItems.map((c: any) => [c.itemKey, c]));

  const checkpointAttempts = (await CheckpointAttemptModel.find({
    userId: userObjectId,
    learningEpoch,
    itemKey: { $in: allCheckpointKeys },
  }).lean()) as any[];

  // 6. Check today's active plan tasks to tag `isPlannedToday`
  const activePlan = await PlanModel.findOne({
    userId: userObjectId,
    status: "active",
  }).lean();

  const plannedProblemSlugs = new Set<string>();
  const plannedCheckpointKeys = new Set<string>();
  if (activePlan) {
    const planDays = (await PlanDayModel.find({ planId: activePlan._id })
      .sort({ dayIndex: 1 })
      .lean()) as unknown as IPlanDayDocument[];
    const todayDay = resolveCurrentPlanDay(activePlan as any, planDays);

    if (todayDay) {
      const todayTasks = (await PlanTaskModel.find({
        planDayId: todayDay._id,
      }).lean()) as any[];

      for (const t of todayTasks) {
        if (t.entityType === "problem" && t.entityId && problemIdMap.has(String(t.entityId))) {
          plannedProblemSlugs.add(problemIdMap.get(String(t.entityId))!);
        } else if (t.entityType === "checkpoint" && t.taskKey) {
          plannedCheckpointKeys.add(t.taskKey);
        }
      }
    }
  }

  // 7. Topic progress & Spaced Repetition status
  const topicProgress = await UserTopicProgressModel.findOne({
    userId: userObjectId,
    learningEpoch,
    topicSlug: "arrays",
  }).lean();

  const reviewDueAt = topicProgress?.reviewDueAt || null;
  const reviewDue = Boolean(reviewDueAt && new Date(reviewDueAt) <= new Date());

  // Helper mappings for problem statuses
  const solvedProblemSlugs = new Set<string>();
  const problemEvidenceMap = new Map<
    string,
    { hintsUsed: number; independent: boolean }
  >();

  for (const att of problemAttempts) {
    const slug = problemIdMap.get(String(att.problemId));
    if (!slug) continue;

    const isSolved = att.passed === true || att.status === "solved";
    if (isSolved) {
      solvedProblemSlugs.add(slug);
    }

    const currentEv = problemEvidenceMap.get(slug);
    const hints = att.hintsUsed ?? 0;
    const isIndep = Boolean(att.independentSolve || att.strategy === "independent");

    if (!currentEv) {
      problemEvidenceMap.set(slug, { hintsUsed: hints, independent: isIndep });
    } else {
      currentEv.hintsUsed = Math.min(currentEv.hintsUsed, hints);
      if (isIndep) currentEv.independent = true;
    }
  }

  // Helper mappings for checkpoint statuses
  const passedCheckpointKeys = new Set<string>();
  const checkpointEvidenceMap = new Map<
    string,
    { score: number; independent: boolean; isTransferEvidence: boolean }
  >();

  for (const att of checkpointAttempts) {
    if (att.isCorrect) {
      passedCheckpointKeys.add(att.itemKey);
    }
    const current = checkpointEvidenceMap.get(att.itemKey);
    if (!current || att.score > current.score) {
      checkpointEvidenceMap.set(att.itemKey, {
        score: att.score,
        independent: Boolean(att.demonstratedIndependence),
        isTransferEvidence: Boolean(att.isTransferEvidence),
      });
    }
  }

  const masteryScore =
    topicProgress?.masteryScore && topicProgress.masteryScore > 0
      ? topicProgress.masteryScore
      : Math.min(
          100,
          Math.round(
            (solvedProblemSlugs.size / Math.max(1, allProblemSlugs.length)) * 50 +
              (passedCheckpointKeys.size / Math.max(1, allCheckpointKeys.length)) * 50
          )
        );

  // 8. Construct adaptive units view
  const adaptiveUnits: IAdaptiveSheetUnit[] = track.units.map((unit) => {
    const items: IAdaptiveSheetItem[] = [];

    // Problem items
    for (const slug of unit.problemSlugs) {
      const prob = problemMap.get(slug);
      const isSolved = solvedProblemSlugs.has(slug);
      const inProgress = activeSessionProblemIds.has(String(prob?._id));
      const ev = problemEvidenceMap.get(slug);

      items.push({
        itemId: `prob-${slug}`,
        type: "problem",
        title: prob?.title || slug,
        slugOrKey: slug,
        status: isSolved ? "solved" : inProgress ? "in_progress" : "available",
        hintsUsed: ev?.hintsUsed,
        demonstratedIndependence: ev?.independent,
        isPlannedToday: plannedProblemSlugs.has(slug),
        estimatedMinutes: prob?.estimatedMinutes || 25,
        difficulty: prob?.difficulty || "medium",
      });
    }

    // Checkpoint items
    for (const key of unit.checkpointKeys) {
      const chk = checkpointMap.get(key);
      const isPassed = passedCheckpointKeys.has(key);
      const attempted = checkpointEvidenceMap.has(key);
      const ev = checkpointEvidenceMap.get(key);

      items.push({
        itemId: `chk-${key}`,
        type: "checkpoint",
        title: chk ? `${chk.capability} Checkpoint` : key,
        slugOrKey: key,
        capability: chk?.capability,
        status: isPassed ? "passed" : attempted ? "attempted" : "available",
        score: ev?.score,
        demonstratedIndependence: ev?.independent,
        isPlannedToday: plannedCheckpointKeys.has(key),
        estimatedMinutes: chk?.expectedDurationMinutes || 8,
        difficulty: chk?.difficulty || "easy",
      });
    }

    // Unit completion: all required problems solved and required checkpoints passed
    const allProblemsSolved = unit.problemSlugs.every((slug) =>
      solvedProblemSlugs.has(slug)
    );
    const anyCheckpointPassed =
      unit.checkpointKeys.length === 0 ||
      unit.checkpointKeys.some((key) => passedCheckpointKeys.has(key));

    return {
      unitId: unit.unitId,
      order: unit.order,
      title: unit.title,
      description: unit.description,
      items,
      isCompleted: allProblemsSolved && anyCheckpointPassed,
    };
  });

  const totalProblems = allProblemSlugs.length;
  const completedProblems = solvedProblemSlugs.size;
  const totalCheckpoints = allCheckpointKeys.length;
  const passedCheckpoints = passedCheckpointKeys.size;

  const requiredUnitsCompleted = adaptiveUnits
    .filter((u) => {
      const unitDef = track.units.find((tu) => tu.unitId === u.unitId);
      return unitDef?.requiredToComplete !== false;
    })
    .every((u) => u.isCompleted);

  const minCriteriaMet =
    completedProblems >= track.completionCriteria.minCompletedProblems &&
    passedCheckpoints >= track.completionCriteria.minCheckpointsPassed;

  const requiredWorkCompleted = requiredUnitsCompleted && minCriteriaMet;

  // Track which capabilities have been observed in passed checkpoints
  const observedCapabilities = Array.from(passedCheckpointKeys).map((key) => {
    const chk = checkpointMap.get(key);
    return chk?.capability || key;
  });

  // Transfer evidence: has learner demonstrated transfer on variant checkpoints without prior exposure?
  const transferCheckpoints = checkpointItems.filter(
    (c: any) => c.evidenceType === "variant_transfer" || c.itemType === "variant_transfer"
  );
  const hasTransferRequirement = transferCheckpoints.length > 0;
  const transferEvidenceAvailable = hasTransferRequirement
    ? transferCheckpoints.some((c: any) => {
        const ev = checkpointEvidenceMap.get(c.itemKey);
        return ev && ev.isTransferEvidence;
      })
    : true;

  let completionStatus: "completed" | "retention_pending" | "needs_transfer_evidence" | "in_progress" =
    "in_progress";
  let evidenceExplanation = "Track in progress: complete core problems and pass reviewed checkpoints.";

  if (minCriteriaMet) {
    if (hasTransferRequirement && !transferEvidenceAvailable) {
      completionStatus = "needs_transfer_evidence";
      evidenceExplanation =
        "Core recognition checkpoints passed, but transfer evidence on unfamiliar problem variants remains pending.";
    } else if (reviewDue) {
      completionStatus = "retention_pending";
      evidenceExplanation =
        "Required track drills and checkpoints completed, but spaced retention review is due to consolidate recall.";
    } else if (requiredUnitsCompleted && masteryScore >= track.completionCriteria.minMasteryScore) {
      completionStatus = "completed";
      evidenceExplanation =
        "All required problems solved, reviewed checkpoints passed, and transfer evidence verified with up-to-date retention.";
    } else {
      completionStatus = "in_progress";
      evidenceExplanation =
        "Core requirements met, but remaining required track units or minimum mastery score still pending.";
    }
  }

  const isTrackCompleted = completionStatus === "completed";

  // If status is completed and enrollment exists, synchronize enrollment status
  if (enrollment && isTrackCompleted && enrollment.status !== "completed") {
    await TrackEnrollmentModel.updateOne(
      { _id: enrollment._id },
      { $set: { status: "completed", completedAt: new Date() } }
    );
  }

  return serializeForClient({
    track,
    enrollment,
    units: adaptiveUnits,
    stats: {
      totalProblems,
      completedProblems,
      totalCheckpoints,
      passedCheckpoints,
      masteryScore,
      reviewDue,
      reviewDueAt,
      isTrackCompleted,
      completionSummary: {
        status: completionStatus,
        requiredWorkCompleted,
        observedCapabilities,
        retentionPending: reviewDue,
        transferEvidenceAvailable,
        evidenceExplanation,
      },
    },
  });
}


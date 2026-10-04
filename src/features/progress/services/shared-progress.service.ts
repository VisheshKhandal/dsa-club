import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { UserTopicProgressModel } from "@/features/intelligence/models/user-topic-progress.model";
import {
  TopicProgressModel,
  ProblemAttemptModel,
} from "@/features/learning/models/learning.model";
import {
  RevisionQueueModel,
  RevisionHistoryModel,
  UserStatisticsModel,
} from "@/features/intelligence/models/intelligence.model";
import { TopicModel, ProblemModel } from "@/features/content/models/content.model";
import { getLearnerEpoch } from "@/features/learning/services/learning-command.service";

export interface SharedLearnerTopicProgressDTO {
  topicSlug: string;
  topicName: string;
  policyVersion: string;
  learningEpoch: number;
  coverage: {
    attemptedCount: number;
    completedCount: number;
    independentSolveCount: number;
    assistedSolveCount: number;
    totalMinutesSpent: number;
  };
  evidence: {
    learnerReportedSolves: number;
    verifiedSolves: number;
    hintsUsedTotal: number;
    hasIndependentSolve: boolean;
    hasAssistedSolve: boolean;
    priorExposureIdentified: boolean;
  };
  retention: {
    status: "due" | "scheduled" | "repair_needed" | "not_due" | "unassessed";
    nextReviewDueAt?: string | null;
    lapsesCount: number;
    repetitionsCount: number;
  };
  transfer: {
    status: "unassessed" | "limited_evidence" | "demonstrated";
    summary: string;
  };
  summary: {
    text: string;
    sufficiency: "sufficient" | "limited" | "none";
    masteryScore: number | null;
  };
}

export interface SharedLearnerGlobalProgressDTO {
  policyVersion: string;
  learningEpoch: number;
  distinctAttemptedProblems: number;
  distinctSolvedProblems: number;
  totalAttempts: number;
  totalSolveAttempts: number;
  independentSolves: number;
  assistedSolves: number;
  totalFocusedMinutes: number;
  dueReviewsCount: number;
  nextReviewDueAt: string | null;
  overallMasteryScore: number;
  interviewReadinessScore: number;
  consistencyScore: number;
  evidenceSufficiency: "unassessed" | "limited" | "building" | "sufficient";
  readinessExplanation: string;
}

/**
 * Single canonical read contract for topic progress and mastery evidence.
 * Unifies UserTopicProgress (event-projected) and TopicProgress (rubric assessments).
 * Strictly distinguishes reported vs verified, assisted vs independent, and marks unassessed transfer honestly.
 */
export async function getSharedLearnerTopicProgress(
  userId: string | Types.ObjectId,
  topicSlug: string
): Promise<SharedLearnerTopicProgressDTO> {
  await connectToDatabase();
  const uid = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const learningEpoch = await getLearnerEpoch(uid);

  // 1. Resolve Topic
  const topicDoc = await TopicModel.findOne({ slug: topicSlug }).select("name _id slug").lean();
  const topicName = topicDoc?.name || topicSlug;
  const topicId = topicDoc?._id;

  // 2. Fetch UserTopicProgress (Event-sourced projection for current epoch)
  const projection = await UserTopicProgressModel.findOne({
    userId: uid,
    learningEpoch,
    topicSlug,
  }).lean();

  // 3. Fetch TopicProgress (Rubric assessment doc, if any)
  let assessmentDoc: any = null;
  if (topicId) {
    assessmentDoc = await TopicProgressModel.findOne({
      userId: uid,
      topicId,
    }).lean();
  }

  // 4. Fetch ProblemAttempts for this topic to check evidence details
  let attempts: any[] = [];
  let problemIds: Types.ObjectId[] = [];
  if (topicId) {
    const topicProblems = await ProblemModel.find({ topicIds: topicId }).select("_id").lean();
    problemIds = topicProblems.map((p: any) => p._id);
    if (problemIds.length > 0) {
      attempts = await ProblemAttemptModel.find({
        userId: uid,
        learningEpoch,
        problemId: { $in: problemIds },
      })
        .sort({ completedAt: -1 })
        .lean();
    }
  }

  // 5. Fetch Revision Queue status specifically for this topic or its problems
  let queueItems: any[] = [];
  if (topicId) {
    const relevantEntityIds = [topicId, ...problemIds];
    queueItems = await RevisionQueueModel.find({
      userId: uid,
      entityId: { $in: relevantEntityIds },
      state: { $ne: "retired" },
    }).lean();
  }

  // Calculate evidence dimensions
  const attemptedCount = projection?.attemptedCount ?? attempts.length;
  const completedCount = projection?.completedCount ?? attempts.filter((a) => a.status === "solved").length;
  const independentSolveCount = projection?.independentSolveCount ?? attempts.filter(
    (a) => a.status === "solved" && (a.strategy === "independent" || (Number(a.hintsUsed ?? 0) === 0 && !a.editorialViewed && !a.aiAssisted))
  ).length;
  const assistedSolveCount = Math.max(0, completedCount - independentSolveCount);
  const totalMinutesSpent = projection?.totalMinutesSpent ?? attempts.reduce((acc, a) => acc + Math.round((a.durationSeconds || 0) / 60), 0);
  const hintsUsedTotal = projection?.hintCount ?? attempts.reduce((acc, a) => acc + (a.hintsUsed || 0), 0);

  const learnerReportedSolves = attempts.filter((a) => a.status === "solved" && a.outcomeSource === "learner-reported").length;
  const verifiedSolves = attempts.filter((a) => a.status === "solved" && (a.outcomeSource === "system-verified" || a.outcomeSource === "execution-verified")).length;

  const hasIndependentSolve = independentSolveCount > 0;
  const hasAssistedSolve = assistedSolveCount > 0;
  const priorExposureIdentified = attempts.some((a) => a.attemptNumber > 1);

  // Retention status from RevisionQueue
  let retentionStatus: "due" | "scheduled" | "repair_needed" | "not_due" | "unassessed" = "unassessed";
  let nextReviewDueAt: string | null = null;
  let lapsesCount = 0;
  let repetitionsCount = 0;

  if (queueItems.length > 0) {
    const now = new Date();
    const overdue = queueItems.find((q) => q.dueAt && new Date(q.dueAt) <= now);
    const lapsed = queueItems.find((q) => q.lapses > 0);

    lapsesCount = queueItems.reduce((acc, q) => acc + (q.lapses || 0), 0);
    repetitionsCount = queueItems.reduce((acc, q) => acc + (q.repetitions || 0), 0);

    if (lapsed && lapsed.easeFactor < 2.0) {
      retentionStatus = "repair_needed";
    } else if (overdue) {
      retentionStatus = "due";
    } else {
      retentionStatus = "scheduled";
    }

    const sortedDue = [...queueItems].sort((a, b) => (new Date(a.dueAt || 0).getTime()) - (new Date(b.dueAt || 0).getTime()));
    if (sortedDue[0]?.dueAt) {
      nextReviewDueAt = new Date(sortedDue[0].dueAt).toISOString();
    }
  }

  // Transfer dimension (honest unassessed label)
  const transfer: { status: "unassessed" | "limited_evidence" | "demonstrated"; summary: string } = {
    status: "unassessed",
    summary: "Transfer to unfamiliar or variant problems has not yet been assessed.",
  };

  // Truthful summary calculation
  let sufficiency: "sufficient" | "limited" | "none" = "none";
  let summaryText = `No practice attempts recorded for ${topicName} in this learning epoch.`;
  let masteryScore: number | null = null;

  if (attemptedCount === 0) {
    sufficiency = "none";
    summaryText = `Not yet assessed. Complete your first practice task to establish evidence.`;
  } else if (completedCount === 0) {
    sufficiency = "limited";
    summaryText = `${attemptedCount} attempt(s) recorded, but no verified or reported solves yet.`;
  } else if (!hasIndependentSolve && hasAssistedSolve) {
    sufficiency = "limited";
    summaryText = `Solved with guidance (${assistedSolveCount} assisted solve(s)). Independent recall is not yet demonstrated.`;
    masteryScore = assessmentDoc?.masteryScore ? Math.min(65, Number(assessmentDoc.masteryScore)) : 50;
  } else {
    sufficiency = "sufficient";
    summaryText = `${independentSolveCount} independent solve(s) demonstrated across ${attemptedCount} attempts.`;
    masteryScore = assessmentDoc?.masteryScore
      ? Number(assessmentDoc.masteryScore)
      : Math.min(95, Math.round(50 + (independentSolveCount * 15)));
  }

  return {
    topicSlug,
    topicName,
    policyVersion: "v2.0-evidence-based",
    learningEpoch,
    coverage: {
      attemptedCount,
      completedCount,
      independentSolveCount,
      assistedSolveCount,
      totalMinutesSpent,
    },
    evidence: {
      learnerReportedSolves,
      verifiedSolves,
      hintsUsedTotal,
      hasIndependentSolve,
      hasAssistedSolve,
      priorExposureIdentified,
    },
    retention: {
      status: retentionStatus,
      nextReviewDueAt,
      lapsesCount,
      repetitionsCount,
    },
    transfer,
    summary: {
      text: summaryText,
      sufficiency,
      masteryScore,
    },
  };
}

/**
 * Authoritative global progress and interview readiness calculation.
 * Bridges UserStatistics, ProblemAttempts, RevisionQueue, and Topic projections
 * into a single unified source of truth for Dashboard and Progress surfaces.
 */
export async function getSharedLearnerGlobalProgress(
  userId: string | Types.ObjectId
): Promise<SharedLearnerGlobalProgressDTO> {
  await connectToDatabase();
  const uid = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const learningEpoch = await getLearnerEpoch(uid);

  const [
    solvedProblemIds,
    attemptedProblemIds,
    totalAttempts,
    totalSolveAttempts,
    independentSolves,
    userTopicProgressDocs,
    topicProgressDocs,
    dueReviewsCount,
    nextDueQueueItem,
    statsDoc,
    retentionHistoryDocs,
  ] = await Promise.all([
    ProblemAttemptModel.distinct("problemId", { userId: uid, learningEpoch, status: "solved" }),
    ProblemAttemptModel.distinct("problemId", { userId: uid, learningEpoch }),
    ProblemAttemptModel.countDocuments({ userId: uid, learningEpoch }),
    ProblemAttemptModel.countDocuments({ userId: uid, learningEpoch, status: "solved" }),
    ProblemAttemptModel.countDocuments({
      userId: uid,
      learningEpoch,
      status: "solved",
      strategy: "independent",
      hintsUsed: { $in: [0, null] },
      editorialViewed: { $ne: true },
      aiAssisted: { $ne: true },
    }),
    UserTopicProgressModel.find({ userId: uid, learningEpoch }).lean(),
    TopicProgressModel.find({ userId: uid }).lean(),
    RevisionQueueModel.countDocuments({
      userId: uid,
      state: { $in: ["due", "scheduled"] },
      dueAt: { $lte: new Date() },
    }),
    RevisionQueueModel.findOne({
      userId: uid,
      state: { $in: ["due", "scheduled"] },
      dueAt: { $gt: new Date() },
    })
      .sort({ dueAt: 1 })
      .lean(),
    UserStatisticsModel.findOne({ userId: uid }).lean(),
    RevisionHistoryModel.find({ userId: uid, learningEpoch })
      .sort({ reviewedAt: -1 })
      .limit(30)
      .lean(),
  ]);

  const distinctSolvedProblems = solvedProblemIds.length;
  const distinctAttemptedProblems = attemptedProblemIds.length;
  const assistedSolves = Math.max(0, totalSolveAttempts - independentSolves);

  // Minutes calculation: deduplicated across topics + stats
  const topicMinutes = (userTopicProgressDocs || []).reduce((acc: number, p: any) => acc + (p.totalMinutesSpent || 0), 0);
  const totalFocusedMinutes = Math.max(topicMinutes, Number(statsDoc?.totalFocusedMinutes || 0));

  // Overall mastery calculation
  let overallMasteryScore = 0;
  if (userTopicProgressDocs && userTopicProgressDocs.length > 0) {
    const totalTopicMastery = userTopicProgressDocs.reduce((acc: number, p: any) => {
      const topicSolves = Number(p.completedCount || 0);
      const indepSolves = Number(p.independentSolveCount || 0);
      const score = Math.min(95, Math.round((indepSolves * 20) + (topicSolves * 10)));
      return acc + score;
    }, 0);
    overallMasteryScore = Math.round(totalTopicMastery / userTopicProgressDocs.length);
  } else if (topicProgressDocs && topicProgressDocs.length > 0) {
    const sum = topicProgressDocs.reduce((acc: number, t: any) => acc + Number(t.masteryScore || 0), 0);
    overallMasteryScore = Math.round(sum / topicProgressDocs.length);
  }

  // Retention score calculation
  const retentionGrades = (retentionHistoryDocs || []).map((r: any) =>
    r.grade !== undefined && r.grade !== null ? Number(r.grade) : 3
  );
  const avgRetentionGrade = retentionGrades.length > 0
    ? retentionGrades.reduce((a: number, b: number) => a + b, 0) / retentionGrades.length
    : 0;
  const revisionRetentionScore = retentionGrades.length > 0 ? Math.min(100, Math.round((avgRetentionGrade / 5) * 100)) : 0;

  // Consistency score
  const consistencyScore = Number(statsDoc?.consistencyScore || 0);

  // Evidence-qualified interview readiness (READY-001)
  let interviewReadinessScore = 0;
  let evidenceSufficiency: "unassessed" | "limited" | "building" | "sufficient" = "unassessed";
  let readinessExplanation = "Not yet assessed. Complete practice problems to build evidence.";

  if (distinctSolvedProblems === 0) {
    interviewReadinessScore = 0;
    evidenceSufficiency = "unassessed";
    readinessExplanation = "Not yet assessed. Solve your first problem to start building evidence.";
  } else if (distinctSolvedProblems < 3) {
    interviewReadinessScore = Math.min(35, Math.round(overallMasteryScore * 0.4));
    evidenceSufficiency = "limited";
    readinessExplanation = `${distinctSolvedProblems} problem(s) solved. Additional problem solving across topics is required to build foundation.`;
  } else {
    const independentRatio = independentSolves / Math.max(1, totalSolveAttempts);
    const weightedRaw = Math.round(
      overallMasteryScore * 0.50 +
      revisionRetentionScore * 0.25 +
      (independentRatio * 100) * 0.15 +
      consistencyScore * 0.10
    );

    if (independentRatio < 0.5) {
      interviewReadinessScore = Math.min(55, weightedRaw);
      evidenceSufficiency = "building";
      readinessExplanation = `Observed progress with guidance (${assistedSolves} assisted solves). Practice independently to unlock higher readiness.`;
    } else if (distinctSolvedProblems >= 5 && revisionRetentionScore >= 50) {
      interviewReadinessScore = Math.min(95, weightedRaw);
      evidenceSufficiency = "sufficient";
      readinessExplanation = "Demonstrated readiness across problem solving breadth and spaced retention.";
    } else {
      interviewReadinessScore = Math.min(75, weightedRaw);
      evidenceSufficiency = "building";
      readinessExplanation = "Building solid foundation. Maintain consistent practice and spaced reviews.";
    }
  }

  const nextReviewDueAt = nextDueQueueItem?.dueAt ? new Date(nextDueQueueItem.dueAt).toISOString() : null;

  // Sync statistics projection document so external readers don't see default-zero
  await UserStatisticsModel.findOneAndUpdate(
    { userId: uid },
    {
      $set: {
        solvedProblems: distinctSolvedProblems,
        attemptedProblems: distinctAttemptedProblems,
        totalFocusedMinutes,
        overallMasteryScore,
        interviewReadinessScore,
        revisionRetentionScore,
      },
      $setOnInsert: { userId: uid, learningEpoch },
    },
    { upsert: true }
  ).catch(() => {});

  return {
    policyVersion: "v2.0-evidence-based",
    learningEpoch,
    distinctAttemptedProblems,
    distinctSolvedProblems,
    totalAttempts,
    totalSolveAttempts,
    independentSolves,
    assistedSolves,
    totalFocusedMinutes,
    dueReviewsCount,
    nextReviewDueAt,
    overallMasteryScore,
    interviewReadinessScore,
    consistencyScore,
    evidenceSufficiency,
    readinessExplanation,
  };
}

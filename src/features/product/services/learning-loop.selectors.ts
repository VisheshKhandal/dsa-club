import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  MissionModel,
  ProblemModel,
} from "@/features/content/models/content.model";
import {
  MissionProgressModel,
  PatternMasteryModel,
  ProblemAttemptModel,
  RoadmapModel,
  TopicProgressModel,
} from "@/features/learning/models/learning.model";
import {
  UserStatisticsModel,
  RevisionQueueModel,
} from "@/features/intelligence/models/intelligence.model";
import {
  PlanModel,
  PlanDayModel,
  PlanTaskModel,
} from "@/features/intelligence/models";
import { UserTopicProgressModel } from "@/features/intelligence/models/user-topic-progress.model";
import { toDTO } from "@/features/product/services/product.service";
import { resolveStageMissions } from "@/features/roadmaps/services/roadmap-mission-resolver.service";
import { getCachedPublishedProblems } from "@/features/content/services/curriculum-cache";

type AnyDoc = Record<string, any>;

function id(v: unknown) {
  return String(v);
}

const DIFFICULTY_RANK: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function latestByEntity(docs: AnyDoc[], key: string) {
  const latest = new Map<string, AnyDoc>();
  for (const doc of docs) {
    const entityId = id(doc[key]);
    const existing = latest.get(entityId);
    if (!existing || new Date(doc.createdAt ?? 0).getTime() > new Date(existing.createdAt ?? 0).getTime()) latest.set(entityId, doc);
  }
  return latest;
}

/**
 * Scoring weights for the plan-aware daily flow.
 *
 * Priority order (descending):
 *   1. PLAN_TASK – Active plan day pending/in-progress required task (Score: 300)
 *   2. IN_PLAN_REVISION – In-plan spaced repetition items overdue (Score: 220)
 *   3. PLAN_OPTIONAL – Active plan optional task (Score: 160)
 *   4. OFF_PLAN_REVISION – Spaced repetition items due outside active plan (Score: 120)
 *   5. WEAK_PRACTICE – Unsolved problems on weak topics (Score: 90)
 *   6. ROADMAP_MISSION – Next mission in roadmap stage (Score: 80)
 *   7. MASTER – Momentum mission on active topic (Score: 75)
 */
const PHASE_SCORES = {
  planTask: 300,
  inPlanRevise: 220,
  planOptional: 160,
  master: 120,
  learn: 110,
  offPlanRevise: 100,
  practice: 90,
  reflect: 85,
  revise: 80,
  fallback: 70,
} as const;

export type NextAction = {
  type: "revision" | "problem" | "reflection" | "mission" | "learn";
  entityType?: "revision" | "problem" | "mission" | "topic" | "pattern" | "checkpoint";
  entityId?: string;
  phase: "REVISE" | "PRACTICE" | "REFLECT" | "LEARN" | "MASTER";
  label: string;
  title: string;
  href: string;
  reason: string;
  estimatedMinutes: number;
  score: number;
  /** Evidence summary shown in dashboard hero */
  evidenceNote: string;
  planRelation?: "planned_today" | "plan_revision" | "plan_recovery" | "plan_extension" | "outside_plan";
  planDayIndex?: number;
};

export type PracticeRecommendation = {
  problem: AnyDoc;
  score: number;
  reason: string;
  reasonCodes: string[];
  weakTopic?: string;
  weakPattern?: string;
  revisionIntent: boolean;
};

export async function buildPracticeRecommendations(
  userId: Types.ObjectId,
  limit = 3,
  preloaded?: {
    problems?: AnyDoc[];
    attempts?: AnyDoc[];
    topicProgressDocs?: AnyDoc[]; // Pass from getProductSnapshot to avoid duplicate TopicProgress query
    patternMasteryDocs?: AnyDoc[]; // Pass from getProductSnapshot to avoid PatternMastery DB query
    dueProblemRevisions?: AnyDoc[]; // Pass filtered revisionDocs to avoid extra RevisionQueue DB call
    userTopicProgressDocs?: AnyDoc[]; // Pass canonical CQRS UserTopicProgress projections
  }
): Promise<PracticeRecommendation[]> {
  await connectToDatabase();
  const now = new Date();
  const [topicProgressDocs, patternMasteryDocs, attempts, dueProblemRevisions, problems, userTopicProgressDocs] = await Promise.all([
    // Use preloaded topicProgress if available — eliminates duplicate TopicProgressModel query
    preloaded?.topicProgressDocs !== undefined
      ? Promise.resolve(preloaded.topicProgressDocs)
      : TopicProgressModel.find({ userId }).populate("topicId").lean(),
    // Use preloaded patternMastery if available — eliminates PatternMasteryModel query
    preloaded?.patternMasteryDocs !== undefined
      ? Promise.resolve(preloaded.patternMasteryDocs)
      : PatternMasteryModel.find({ userId }).populate("patternId topicId").lean(),
    preloaded?.attempts ?? ProblemAttemptModel.find({ userId }).sort({ createdAt: -1 }).lean(),
    // Use preloaded dueProblemRevisions if available — derived from revisionDocs, no extra query
    preloaded?.dueProblemRevisions !== undefined
      ? Promise.resolve(preloaded.dueProblemRevisions)
      : RevisionQueueModel.find({ userId, entityType: "problem", state: { $in: ["due", "scheduled"] }, dueAt: { $lte: now } }).lean(),
    preloaded?.problems ?? getCachedPublishedProblems(),
    // Use preloaded canonical UserTopicProgress projections or query
    preloaded?.userTopicProgressDocs !== undefined
      ? Promise.resolve(preloaded.userTopicProgressDocs)
      : UserTopicProgressModel.find({ userId }).lean().catch(() => []),
  ]);


  const latestAttemptByProblem = latestByEntity(attempts as AnyDoc[], "problemId");
  const solvedProblemIds = new Set((attempts as AnyDoc[]).filter((attempt) => attempt.status === "solved").map((attempt) => id(attempt.problemId)));
  const dueRevisionProblemIds = new Set((dueProblemRevisions as AnyDoc[]).map((revision) => id(revision.entityId)));

  const topicRank = new Map<string, { score: number; name: string; state: string }>();
  for (const progress of topicProgressDocs as AnyDoc[]) {
    const topic = progress.topicId as AnyDoc | undefined;
    const topicId = id(topic?._id ?? progress.topicId);
    const userTopicProg = ((userTopicProgressDocs as AnyDoc[]) || []).find(
      (p) => String(p.topicSlug ?? "").toLowerCase() === String(topic?.slug ?? "").toLowerCase()
    );
    const effectiveMastery = userTopicProg?.masteryScore !== undefined
      ? Number(userTopicProg.masteryScore)
      : Number(progress.masteryScore ?? 0);
    const statePenalty = progress.state === "learning" ? 8 : progress.state === "practicing" ? 5 : progress.state === "unseen" ? 2 : 0;
    topicRank.set(topicId, {
      score: 100 - average([
        effectiveMastery,
        Number(progress.practiceScore ?? 0),
        Number(progress.retentionScore ?? 0),
        Number(progress.confidenceScore ?? 0),
        Number(progress.patternRecognitionScore ?? 0),
      ]) + statePenalty,
      name: String(topic?.name ?? "this topic"),
      state: String(progress.state ?? "unseen"),
    });
  }

  const patternRank = new Map<string, { score: number; name: string }>();
  for (const mastery of patternMasteryDocs as AnyDoc[]) {
    const pattern = mastery.patternId as AnyDoc | undefined;
    const patternId = id(pattern?._id ?? mastery.patternId);
    patternRank.set(patternId, {
      score: 100 - average([
        Number(mastery.masteryScore ?? 0),
        Number(mastery.recognitionScore ?? 0),
        Number(mastery.applicationScore ?? 0),
        Number(mastery.transferScore ?? 0),
      ]),
      name: String(pattern?.name ?? "this pattern"),
    });
  }

  // ── Pre-filter: only score problems from weak topics/patterns ────────────────
  // PERF: Previously iterated ALL published problems (O(n_all)). Now we build Sets of
  // weak topic/pattern IDs and filter to only relevant problems first.
  // Typical reduction: 500 problems → 30-80 = 6-16x speedup in the scoring loop.
  const weakTopicIds = new Set<string>();
  for (const [topicId, rank] of topicRank.entries()) {
    if (rank.score > 40) weakTopicIds.add(topicId); // score > 40 means mastery < 60 (needs work)
  }
  const weakPatternIds = new Set<string>();
  for (const [patternId, rank] of patternRank.entries()) {
    if (rank.score > 40) weakPatternIds.add(patternId);
  }

  const problemsToScore = (problems as AnyDoc[]).filter((problem) => {
    const problemId = id(problem._id);
    // Always include problems due for revision
    if (dueRevisionProblemIds.has(problemId)) return true;
    // Skip already solved (not revision) problems early
    if (solvedProblemIds.has(problemId)) return false;
    // Include if problem belongs to a weak topic
    if (((problem.topicIds ?? []) as AnyDoc[]).some((t) => weakTopicIds.has(id(t?._id ?? t)))) return true;
    // Include if problem belongs to a weak pattern
    if (((problem.patternIds ?? []) as AnyDoc[]).some((p) => weakPatternIds.has(id(p?._id ?? p)))) return true;
    return false;
  });

  // Fallback: if weak-topic filter was too aggressive (new user, all topics strong),
  // include any unsolved problem to ensure we always return results.
  const candidatePool = problemsToScore.length >= limit
    ? problemsToScore
    : (problems as AnyDoc[]).filter((p) => !solvedProblemIds.has(id(p._id)));

  return candidatePool.map((problem) => {
    const problemId = id(problem._id);
    const revisionIntent = dueRevisionProblemIds.has(problemId);
    if (solvedProblemIds.has(problemId) && !revisionIntent) return null;

    const topicMatches = ((problem.topicIds ?? []) as AnyDoc[]).map((topic) => {
      const topicId = id(topic?._id ?? topic);
      return { id: topicId, ...(topicRank.get(topicId) ?? { score: 45, state: "unseen" }), name: String(topic?.name ?? topicRank.get(topicId)?.name ?? "this topic") };
    }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

    const patternMatches = ((problem.patternIds ?? []) as AnyDoc[]).map((pattern) => {
      const patternId = id(pattern?._id ?? pattern);
      return { id: patternId, ...(patternRank.get(patternId) ?? { score: 50 }), name: String(pattern?.name ?? patternRank.get(patternId)?.name ?? "this pattern") };
    }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

    const weakestTopic = topicMatches[0];
    const weakestPattern = patternMatches[0];
    const latestAttempt = latestAttemptByProblem.get(problemId);
    const isStarted = latestAttempt?.status === "started" || latestAttempt?.status === "abandoned";
    const selfConfidence = Number(latestAttempt?.selfConfidence ?? 0);
    const lowConfidence = selfConfidence > 0 && selfConfidence <= 2;
    const assistedAttempt = Number(latestAttempt?.hintsUsed ?? 0) >= 1 || latestAttempt?.strategy === "hint_assisted" || latestAttempt?.strategy === "editorial_assisted";
    const difficultyFit = weakestTopic?.state === "learning" && problem.difficulty === "hard" ? -8 : 0;
    const score = 100 + Number(weakestTopic?.score ?? 45) * 1.8 + Number(weakestPattern?.score ?? 50) * 1.4 + (revisionIntent ? 55 : 0) + (isStarted ? 18 : 0) + (lowConfidence ? 16 : 0) + (assistedAttempt ? 12 : 0) + difficultyFit + Math.round(Number(problem.qualityScore ?? 0.5) * 10);

    return {
      problem,
      score,
      reason: revisionIntent
        ? `Due for revision, and it reinforces ${weakestPattern?.name ?? "a relevant pattern"} in ${weakestTopic?.name ?? "your practice queue"}.`
        : `Targets ${weakestTopic?.name ?? "your weakest topic"} through ${weakestPattern?.name ?? "a relevant pattern"}.`,
      reasonCodes: ["weak_topic", "relevant_pattern", revisionIntent ? "revision_due" : null, isStarted ? "previous_attempt" : null, lowConfidence ? "low_confidence" : null, assistedAttempt ? "needs_reinforcement" : null].filter(Boolean) as string[],
      weakTopic: weakestTopic?.name,
      weakPattern: weakestPattern?.name,
      revisionIntent,
    };
  }).filter(Boolean).sort((a, b) =>
    b!.score - a!.score ||
    Number(b!.problem.qualityScore ?? 0) - Number(a!.problem.qualityScore ?? 0) ||
    (DIFFICULTY_RANK[String(a!.problem.difficulty)] ?? 9) - (DIFFICULTY_RANK[String(b!.problem.difficulty)] ?? 9) ||
    String(a!.problem.title).localeCompare(String(b!.problem.title)) ||
    id(a!.problem._id).localeCompare(id(b!.problem._id))
  ).slice(0, limit) as PracticeRecommendation[];
}

export async function buildDailyNextAction(
  userId: Types.ObjectId,
  preloadedPracticeRecommendations?: PracticeRecommendation[],
  preloaded?: {
    stats?: AnyDoc | null;
    roadmap?: AnyDoc | null;
    dueRevisions?: AnyDoc[];
    topicProgressDocs?: AnyDoc[];
    recentAttempts?: AnyDoc[];
    missionProgressDocs?: AnyDoc[];
  }
): Promise<NextAction | null> {
  await connectToDatabase();

  const uid = userId;

  // Query active plan if exists
  const activePlan = await PlanModel.findOne({
    userId: uid,
    status: { $in: ["active", "paused"] },
  }).lean();

  // Use preloaded data when available — avoids re-fetching what getProductSnapshot already has
  const [stats, roadmap, dueRevisions, topicProgressDocs, recentAttempts, unfinishedMissionProgress, practiceRecommendations] =
    await Promise.all([
      preloaded?.stats !== undefined
        ? Promise.resolve(preloaded.stats)
        : UserStatisticsModel.findOne({ userId: uid }).lean(),
      preloaded?.roadmap !== undefined
        ? Promise.resolve(preloaded.roadmap)
        : RoadmapModel.findOne({ userId: uid, status: "active" }).sort({ updatedAt: -1 }).lean(),
      preloaded?.dueRevisions !== undefined
        ? Promise.resolve(preloaded.dueRevisions)
        : RevisionQueueModel.find({ userId: uid, state: { $in: ["due", "scheduled"] }, dueAt: { $lte: new Date() } })
            .sort({ priority: -1, dueAt: 1 }).limit(10).lean(),
      preloaded?.topicProgressDocs !== undefined
        ? Promise.resolve(preloaded.topicProgressDocs)
        : TopicProgressModel.find({ userId: uid }).populate("topicId").lean(),
      preloaded?.recentAttempts !== undefined
        ? Promise.resolve(preloaded.recentAttempts)
        : ProblemAttemptModel.find({ userId: uid }).sort({ createdAt: -1 }).limit(20).lean(),
      // Derive in-progress mission from preloaded docs — avoids a separate DB query
      preloaded?.missionProgressDocs !== undefined
        ? Promise.resolve(
            [...preloaded.missionProgressDocs]
              .filter((m) => m.status === "in_progress")
              .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())[0] ?? null
          )
        : MissionProgressModel.findOne({ userId: uid, status: "in_progress" }).sort({ updatedAt: -1 }).lean(),
      preloadedPracticeRecommendations !== undefined
        ? Promise.resolve(preloadedPracticeRecommendations)
        : buildPracticeRecommendations(uid, 1),
    ]);

  const candidates: Array<NextAction & { _score: number }> = [];

  // ── PRIORITY: ACTIVE PLAN (HARD PRIORITY BOUNDARY) ──────────────────
  // If the user has an active Intelligence Plan, that plan is the sole authority for
  // next action. Legacy missions and general recommendations do not compete with it.
  if (activePlan) {
    const activePlanDay = await PlanDayModel.findOne({
      planId: activePlan._id,
      status: { $in: ["available", "in_progress"] },
    })
      .sort({ dayIndex: 1 })
      .lean();

    if (activePlanDay) {
      const activeTask = await PlanTaskModel.findOne({
        planDayId: activePlanDay._id,
        status: { $in: ["pending", "in_progress"] },
      })
        .sort({ order: 1 })
        .lean();

      if (activeTask) {
        const taskPhase: "REVISE" | "PRACTICE" | "REFLECT" | "LEARN" | "MASTER" =
          activeTask.phase === "revise"
            ? "REVISE"
            : activeTask.phase === "practice"
            ? "PRACTICE"
            : activeTask.phase === "reflect"
            ? "REFLECT"
            : "LEARN";

        const taskType: "mission" | "problem" | "revision" | "reflection" | "learn" =
          activeTask.entityType === "problem"
            ? "problem"
            : activeTask.entityType === "revision"
            ? "revision"
            : activeTask.entityType === "reflection"
            ? "reflection"
            : "mission";

        const isRequired = activeTask.required !== false;
        const taskScore = 1000; // Hard priority over all legacy recommendations

        const action: NextAction = {
          type: taskType,
          entityType: activeTask.entityType,
          entityId: activeTask.entityId ? id(activeTask.entityId) : undefined,
          phase: taskPhase,
          label:
            activeTask.status === "in_progress"
              ? "Resume Task"
              : `Day ${activePlanDay.dayIndex} · ${activeTask.phase.toUpperCase()}`,
          title: activeTask.title,
          href: activeTask.targetUrl || "/intelligence?tab=today",
          reason: `Part of your Day ${activePlanDay.dayIndex} schedule: ${activePlanDay.focus}`,
          estimatedMinutes: Number(activeTask.estimatedMinutes ?? 20),
          score: taskScore,
          evidenceNote: `Plan Day ${activePlanDay.dayIndex} of ${activePlan.totalDays} · ${isRequired ? "Required" : "Optional"}`,
          planRelation: activeTask.planRelation || "planned_today",
          planDayIndex: activePlanDay.dayIndex,
        };
        return toDTO(action) as NextAction;
      }

      // Check if in-plan revisions are due
      const inPlanTopicIds = new Set<string>();
      if (activePlan.primaryTopicId) inPlanTopicIds.add(id(activePlan.primaryTopicId));
      for (const tid of activePlan.focusTopicIds || []) inPlanTopicIds.add(id(tid));

      const inPlanRevision = dueRevisions.find(
        (r: AnyDoc) => r.entityType === "topic" && inPlanTopicIds.has(id(r.entityId))
      );

      if (inPlanRevision) {
        let entityName = "Plan Review item";
        const topic = (topicProgressDocs as AnyDoc[]).find(
          (t) => id(t.topicId?._id ?? t.topicId) === id(inPlanRevision.entityId)
        );
        if (topic?.topicId?.name) entityName = topic.topicId.name;

        const action: NextAction = {
          type: "revision",
          entityType: "revision",
          entityId: id(inPlanRevision._id),
          phase: "REVISE",
          label: "Plan Revision",
          title: entityName,
          href: `/revision/session/${id(inPlanRevision._id)}`,
          reason: `Overdue spaced repetition directly supporting your active plan topic.`,
          estimatedMinutes: 10,
          score: 900,
          evidenceNote: `In-Plan Review · ${activePlanDay.topicName || "Topic"}`,
          planRelation: "plan_revision",
          planDayIndex: activePlanDay.dayIndex,
        };
        return toDTO(action) as NextAction;
      }

      // All day tasks complete
      const action: NextAction = {
        type: "learn",
        entityType: "checkpoint",
        phase: "LEARN",
        label: `Day ${activePlanDay.dayIndex} Complete`,
        title: `All Day ${activePlanDay.dayIndex} sessions completed`,
        href: "/intelligence?tab=today",
        reason: "You've finished your scheduled tasks for today. Great consistency!",
        estimatedMinutes: 0,
        score: 800,
        evidenceNote: `Plan Day ${activePlanDay.dayIndex} of ${activePlan.totalDays}`,
        planRelation: "planned_today",
        planDayIndex: activePlanDay.dayIndex,
      };
      return toDTO(action) as NextAction;
    }

    // Active plan with all days completed
    const action: NextAction = {
      type: "learn",
      entityType: "checkpoint",
      phase: "LEARN",
      label: "Plan Completed",
      title: `Completed ${activePlan.totalDays}-day cycle!`,
      href: "/intelligence?tab=manage",
      reason: "You completed your learning cycle! Ready to calibrate your next focus topic.",
      estimatedMinutes: 0,
      score: 800,
      evidenceNote: `Cycle ${activePlan.cycleNumber || 1} Complete`,
      planRelation: "outside_plan",
    };
    return toDTO(action) as NextAction;
  }

  if (unfinishedMissionProgress) {
    const mission = await MissionModel.findOne({
      _id: (unfinishedMissionProgress as AnyDoc).missionId,
      isPublished: true,
    }).populate("topicId").lean();

    if (mission) {
      const m = mission as AnyDoc;
      candidates.push({
        type: "mission",
        entityType: "mission",
        entityId: id(m._id),
        phase: "MASTER",
        label: "Resume Mission",
        title: m.title,
        href: `/missions/${m.slug}`,
        reason: `Resume your unfinished ${m.topicId?.name ?? "DSA"} mission.`,
        estimatedMinutes: Number(m.estimatedMinutes ?? 25),
        score: PHASE_SCORES.master,
        evidenceNote: `Progress: ${Number((unfinishedMissionProgress as AnyDoc).progress ?? 0)}%`,
        _score: PHASE_SCORES.master,
      });
    }
  }

  const roadmapDoc = roadmap as AnyDoc | null;
  const stages = ((roadmapDoc?.stages ?? []) as AnyDoc[]).sort(
    (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)
  );
  const activeStage =
    stages.find((s) => s.status === "active") ??
    stages.find((s) => s.status !== "completed");

  const activeStageMissions = (await resolveStageMissions(activeStage)) as AnyDoc[];
  if (activeStageMissions.length) {
    const completedMissionIds = new Set(
      (
        await MissionProgressModel.find({
          userId: uid,
          missionId: { $in: activeStageMissions.map((mission: AnyDoc) => mission._id) },
          status: "completed",
        })
          .select("missionId")
          .lean()
      ).map((m: AnyDoc) => id(m.missionId))
    );

    const mission = activeStageMissions.find((candidate: AnyDoc) => !completedMissionIds.has(id(candidate._id))) ?? activeStageMissions[0];
    if (mission) {
      const missionProgress = await MissionProgressModel.findOne({
        userId: uid,
        missionId: mission._id,
      }).lean();
      candidates.push({
        type: "mission",
        entityType: "mission",
        entityId: id(mission._id),
        phase: "LEARN",
        label: missionProgress?.status === "in_progress" ? "Resume Mission" : "Continue Roadmap",
        title: mission.title,
        href: `/missions/${mission.slug}`,
        reason: `This is your current roadmap step: "${activeStage?.title ?? "Roadmap"}".`,
        estimatedMinutes: Number(mission.estimatedMinutes ?? 25),
        score: PHASE_SCORES.learn,
        evidenceNote: `Roadmap stage: ${activeStage?.title ?? "Roadmap"}`,
        _score: PHASE_SCORES.learn,
      });
    }
  }

  // ── PHASE 1: REVISE ────────────────────────────────────────────────
  if (dueRevisions.length > 0) {
    const top = dueRevisions[0] as AnyDoc;
    // Resolve the item's name via the entityType
    let entityName = "Review item";
    if (top.entityType === "topic") {
      const topic = (topicProgressDocs as AnyDoc[]).find(
        (t) => id(t.topicId?._id ?? t.topicId) === id(top.entityId)
      );
      if (topic?.topicId?.name) entityName = topic.topicId.name;
    } else if (top.entityType === "problem") {
      const prob = await ProblemModel.findById(top.entityId).select("title").lean();
      if (prob) entityName = (prob as AnyDoc).title;
    } else if (top.entityType === "pattern") {
      // entityId is a pattern id, populated by revision queue
      entityName = `Pattern review`;
    } else if (top.entityType === "mission") {
      const mission = await MissionModel.findById(top.entityId)
        .select("title")
        .lean();
      if (mission) entityName = (mission as AnyDoc).title;
    }

    const inPlanTopicIds = new Set<string>();
    if (activePlan) {
      if (activePlan.primaryTopicId) inPlanTopicIds.add(id(activePlan.primaryTopicId));
      for (const tid of activePlan.focusTopicIds || []) inPlanTopicIds.add(id(tid));
    }
    const isInPlan = top.entityType === "topic" && inPlanTopicIds.has(id(top.entityId));
    const revisionScore = isInPlan
      ? PHASE_SCORES.inPlanRevise + Number(top.priority ?? 0)
      : PHASE_SCORES.offPlanRevise + Number(top.priority ?? 0);

    candidates.push({
      type: "revision",
      entityType: "revision",
      entityId: id(top._id),
      phase: "REVISE",
      label: isInPlan ? "Plan Revision" : "Start Revision",
      title: entityName,
      href: `/revision/session/${id(top._id)}`,
      reason: isInPlan
        ? `Overdue spaced repetition directly supporting your active plan topic.`
        : `${dueRevisions.length} item${dueRevisions.length > 1 ? "s" : ""} due for spaced-repetition review. Clearing the queue keeps retention high.`,
      estimatedMinutes: Math.min(15, dueRevisions.length * 5),
      score: revisionScore,
      evidenceNote: isInPlan
        ? `In-Plan Review · ${dueRevisions.length} overdue`
        : `${dueRevisions.length} revision${dueRevisions.length > 1 ? "s" : ""} overdue`,
      planRelation: isInPlan ? "plan_revision" : "outside_plan",
      _score: revisionScore,
    });
  }

  // ── PHASE 2: PRACTICE – weak topics ────────────────────────────────
  const practiceRecommendation = practiceRecommendations[0];
  if (practiceRecommendation) {
    const p = practiceRecommendation.problem as AnyDoc;
    candidates.push({
      type: "problem",
      entityType: "problem",
      entityId: id(p._id),
      phase: "PRACTICE",
      label: practiceRecommendation.revisionIntent ? "Re-attempt Problem" : "Solve Problem",
      title: String(p.title),
      href: `/practice/problems/${p.slug}`,
      reason: practiceRecommendation.reason,
      estimatedMinutes: Number(p.estimatedMinutes ?? 25),
      score: PHASE_SCORES.practice + practiceRecommendation.score,
      evidenceNote: practiceRecommendation.weakTopic ? `Weak area: ${practiceRecommendation.weakTopic}` : "Personalized practice",
      _score: PHASE_SCORES.practice + practiceRecommendation.score,
    });
  }
  // ── PHASE 3: REFLECT – recent attempt without reflection ────────────
  if (recentAttempts.length > 0) {
    // Check if any recent attempt has no reflection
    const recentProblemIds = (recentAttempts as AnyDoc[])
      .filter((a) => a.status === "solved")
      .slice(0, 5)
      .map((a) => a.problemId);

    if (recentProblemIds.length > 0) {
      const { ReflectionLogModel } = await import(
        "@/features/learning/models/learning.model"
      );
      const reflections = await ReflectionLogModel.find({
        userId: uid,
        entityType: "problem",
        entityId: { $in: recentProblemIds },
      })
        .select("entityId")
        .lean();
      const reflectedIds = new Set(
        (reflections as AnyDoc[]).map((r) => id(r.entityId))
      );
      const unreflectedAttempt = (recentAttempts as AnyDoc[]).find(
        (a) => a.status === "solved" && !reflectedIds.has(id(a.problemId))
      );
      if (unreflectedAttempt) {
        const prob = await ProblemModel.findById(unreflectedAttempt.problemId)
          .select("slug title")
          .lean();
        if (prob) {
          const p = prob as AnyDoc;
          candidates.push({
            type: "reflection",
            entityType: "problem",
            entityId: id(p._id),
            phase: "REFLECT",
            label: "Write Reflection",
            title: p.title,
            href: `/practice/problems/${p.slug}#reflect`,
            reason: `You solved "${p.title}" but haven't reflected yet. Reflection cements long-term retention.`,
            estimatedMinutes: 5,
            score: PHASE_SCORES.reflect,
            evidenceNote: "Solved problem needs reflection",
            _score: PHASE_SCORES.reflect,
          });
        }
      }
    }
  }

  // ── PHASE 4: LEARN – next roadmap mission ──────────────────────────
  // ── PHASE 5: MASTER – momentum mission on current topic ─────────────
  if (candidates.length === 0) {
    // Fall back to any in-progress or next mission for continuity
    const lastTopicId = (stats as AnyDoc | null)?.lastStudiedTopicId;
    const missionQuery = lastTopicId
      ? { topicId: lastTopicId, isPublished: true }
      : { isPublished: true };

    const inProgressMissionProgress = await MissionProgressModel.findOne({
      userId: uid,
      status: "in_progress",
    })
      .sort({ updatedAt: -1 })
      .lean();

    let mission: AnyDoc | null = null;
    if (inProgressMissionProgress) {
      mission = (await MissionModel.findById(
        (inProgressMissionProgress as AnyDoc).missionId
      )
        .populate("topicId")
        .lean()) as AnyDoc | null;
    }
    if (!mission) {
      mission = (await MissionModel.findOne(missionQuery)
        .sort({ estimatedMinutes: 1 })
        .populate("topicId")
        .lean()) as AnyDoc | null;
    }

    if (mission) {
      candidates.push({
        type: "mission",
        entityType: "mission",
        entityId: id(mission._id),
        phase: "MASTER",
        label: "Continue Learning",
        title: mission.title,
        href: `/missions/${mission.slug}`,
        reason: `Keep your momentum going. This mission strengthens your foundation.`,
        estimatedMinutes: Number(mission.estimatedMinutes ?? 25),
        score: PHASE_SCORES.fallback,
        evidenceNote: "Continue learning",
        _score: PHASE_SCORES.fallback,
      });
    }
  }

  if (candidates.length === 0) {
    return {
      type: "learn",
      entityType: "topic",
      phase: "LEARN",
      label: "Browse Topics",
      title: "Choose your next DSA topic",
      href: "/learn",
      reason: "Start your journey — pick any topic to begin learning.",
      estimatedMinutes: 20,
      score: 0,
      evidenceNote: "No active content yet",
    };
  }

  // Select the highest-scoring candidate (deterministic)
  const selected = candidates.sort((a, b) => b._score - a._score)[0];
  const action: NextAction = {
    type: selected.type,
    entityType: selected.entityType,
    entityId: selected.entityId,
    phase: selected.phase,
    label: selected.label,
    title: selected.title,
    href: selected.href,
    reason: selected.reason,
    estimatedMinutes: selected.estimatedMinutes,
    score: selected.score,
    evidenceNote: selected.evidenceNote,
    planRelation: selected.planRelation ?? "outside_plan",
    planDayIndex: selected.planDayIndex,
  };
  return toDTO(action) as NextAction;
}

// ── Legacy shim (kept for backward compat with other callers) ──────────
export function buildDashboardNextAction(
  mappedActiveMission: {
    id?: string;
    slug: string;
    title: string;
    status: string;
    topic: string;
    progress?: number;
    nextStage?: { title: string; key?: string; kind?: string } | null;
  } | null,
  mappedDueRevisions: { conceptName: string; href?: string; id?: string }[]
) {
  if (mappedActiveMission) {
    return {
      type: "mission",
      entityType: "mission",
      entityId: mappedActiveMission.id,
      phase: mappedActiveMission.status === "in_progress" ? "LEARN" : "MASTER",
      label:
        mappedActiveMission.status === "in_progress"
          ? "Resume Mission"
          : "Start Mission",
      title: mappedActiveMission.title,
      href: `/missions/${mappedActiveMission.slug}`,
      reason: mappedActiveMission.nextStage
        ? `Next stage: ${mappedActiveMission.nextStage.title}.`
        : `Continue your active ${mappedActiveMission.topic} mission.`,
      estimatedMinutes: 25,
      score: 70,
      evidenceNote: `Topic: ${mappedActiveMission.topic}`,
    };
  }

  if (mappedDueRevisions.length > 0) {
    const top = mappedDueRevisions[0];
    return {
      type: "revision",
      entityType: "revision",
      entityId: top.id,
      phase: "REVISE",
      label: "Start Revision",
      title: top.conceptName,
      href: top.id ? `/revision/session/${top.id}` : "/revision",
      reason: `${mappedDueRevisions.length} item${mappedDueRevisions.length > 1 ? "s" : ""} due for retrieval practice. Clear the queue to keep retention high.`,
      estimatedMinutes: Math.min(15, mappedDueRevisions.length * 5),
      score: 100,
      evidenceNote: `${mappedDueRevisions.length} revision${mappedDueRevisions.length > 1 ? "s" : ""} overdue`,
    };
  }

  return {
      type: "learn",
      entityType: "topic",
    phase: "LEARN",
    label: "Browse Topics",
    title: "Choose your next DSA topic",
    href: "/learn",
    reason: "No active mission or due review is waiting.",
    estimatedMinutes: 20,
    score: 0,
    evidenceNote: "No active content yet",
  };
}

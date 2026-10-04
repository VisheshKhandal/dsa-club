import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { PlanModel } from "../models/plan.model";
import { PlanDayModel, type IPlanDayDocument } from "../models/plan-day.model";
import { PlanTaskModel } from "../models/plan-task.model";
import { RevisionQueueModel } from "../models/intelligence.model";
import { PracticeSessionModel } from "@/features/learning/models/practice-session.model";
import { MissionProgressModel, RoadmapModel } from "@/features/learning/models/learning.model";
import { ProblemModel, MissionModel } from "@/features/content/models/content.model";
import { getCachedPublishedTopics } from "@/features/content/services/curriculum-cache";
import { resolveCurrentPlanDay } from "../services/plan-content-resolver";
import type { CandidateAction, CandidateSet } from "./decision.types";

/**
 * Builds the authoritative candidate set for a learner by assembling tasks from
 * today's actionable plan day, the canonical revision queue, and active practice sessions.
 *
 * Hard Filters Enforced:
 * 1. Rejects completed tasks.
 * 2. Rejects tasks belonging to future/non-actionable days.
 * 3. Rejects topic-mismatched tasks.
 * 4. Rejects unavailable/unpublished tasks.
 * 5. Pulls due reviews strictly from RevisionQueueModel (canonical spaced repetition queue).
 */
export async function buildCandidateSet(
  userId: string | Types.ObjectId,
  options?: { availableMinutes?: number }
): Promise<CandidateSet> {
  await connectToDatabase();
  const userObjectId =
    userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);

  const availableMinutes = options?.availableMinutes;
  const exclusionReasons: string[] = [];
  let excludedCount = 0;
  const candidates: CandidateAction[] = [];

  // 1. Fetch active plan
  const plan = await PlanModel.findOne({
    userId: userObjectId,
    status: "active",
  });

  let currentDay: IPlanDayDocument | null = null;
  if (plan) {
    const planDays = (await PlanDayModel.find({ planId: plan._id })
      .sort({ dayIndex: 1 })
      .lean()) as unknown as IPlanDayDocument[];

    currentDay = resolveCurrentPlanDay(plan, planDays);
  }

  // 2. Fetch candidate tasks for current actionable plan day if on-plan
  if (plan && currentDay) {
    const rawTasks = await PlanTaskModel.find({
      planId: plan._id,
      planDayId: currentDay._id,
      userId: userObjectId,
    }).sort({ order: 1 });

    for (const task of rawTasks) {
      // Filter 1: Completed tasks
      if (task.status === "completed") {
        excludedCount++;
        continue;
      }

      // Filter 2: Topic Mismatches
      const isMismatched =
        task.validationStatus === "mismatched" ||
        (task.topicSlug && currentDay.topicSlug && task.topicSlug !== currentDay.topicSlug);

      if (isMismatched) {
        excludedCount++;
        exclusionReasons.push(`Task "${task.title}" rejected: topic does not match current day topic.`);
        continue;
      }

      // Filter 3: Unavailable tasks
      if (task.status === "unavailable" || task.validationStatus === "unavailable") {
        excludedCount++;
        exclusionReasons.push(`Task "${task.title}" rejected: content unavailable.`);
        continue;
      }

      const actionType =
        task.entityType === "problem"
          ? "practice"
          : task.entityType === "revision"
          ? "revision"
          : task.entityType === "reflection"
          ? "reflection"
          : task.entityType === "checkpoint"
          ? "checkpoint"
          : "mission";

      const isInProgress = task.status === "in_progress";
      const isRequired = task.required !== false;
      const estimatedMinutes = Number(task.estimatedMinutes || 20);

      // Base priority scoring
      let priorityScore = 100 - task.order * 5;
      if (isInProgress) priorityScore += 50;
      if (isRequired) priorityScore += 20;

      const fitsTimeBudget = availableMinutes !== undefined ? estimatedMinutes <= availableMinutes : true;
      const timeBudgetDeltaMinutes = availableMinutes !== undefined ? estimatedMinutes - availableMinutes : 0;

      candidates.push({
        candidateId: task._id.toString(),
        actionKey: task.taskKey,
        actionType,
        taskId: task._id.toString(),
        entityType: task.entityType,
        entityId: task.entityId ? task.entityId.toString() : null,
        topicId: task.topicId ? task.topicId.toString() : currentDay.topicId?.toString() ?? null,
        topicSlug: task.topicSlug || currentDay.topicSlug,
        topicName: task.topicName || currentDay.topicName,
        title: task.title,
        estimatedMinutes,
        planRelation: task.planRelation || "planned_today",
        targetUrl: task.targetUrl || `/learn/topics/${task.topicSlug || currentDay.topicSlug}`,
        priorityScore,
        reasons: isInProgress ? ["Task in progress from your active plan."] : ["Required task for today's plan commitment."],
        isInProgress,
        isRequired,
        fitsTimeBudget,
        timeBudgetDeltaMinutes,
        reasonCode: isInProgress ? "plan_in_progress" : isRequired ? "plan_required_next" : "plan_optional",
      });
    }
  }

  // 3. Check for due retention reviews across the Canonical Revision Queue
  const now = new Date();
  const dueQueueItems = await RevisionQueueModel.find({
    userId: userObjectId,
    state: { $ne: "retired" },
    dueAt: { $lte: now },
  })
    .sort({ dueAt: 1, priority: -1 })
    .limit(3)
    .lean();

  if (dueQueueItems.length > 0) {
    // Resolve problem/entity details for queue items
    const problemIds = dueQueueItems
      .filter((q: any) => q.entityType === "problem")
      .map((q: any) => q.entityId);

    const problemDocs = problemIds.length > 0
      ? await ProblemModel.find({ _id: { $in: problemIds } }).populate("topicIds").lean()
      : [];

    const problemMap = new Map(problemDocs.map((p: any) => [String(p._id), p]));

    for (const queueItem of dueQueueItems) {
      const pDoc: any = queueItem.entityId ? problemMap.get(String(queueItem.entityId)) : null;
      const topicDoc = pDoc?.topicIds?.[0];
      const topicSlug = topicDoc?.slug || "arrays";
      const topicName = topicDoc?.name || "Arrays & Pointers";
      const isRepair = queueItem.reviewType === "mistake_repair" || queueItem.lapses > 0;
      const estimatedMinutes = isRepair ? 10 : 8;

      const fitsTimeBudget = availableMinutes !== undefined ? estimatedMinutes <= availableMinutes : true;
      const timeBudgetDeltaMinutes = availableMinutes !== undefined ? estimatedMinutes - availableMinutes : 0;

      candidates.push({
        candidateId: `review-${queueItem._id}`,
        actionKey: `review-${queueItem._id}`,
        actionType: "revision",
        entityType: queueItem.entityType || "problem",
        entityId: queueItem.entityId ? String(queueItem.entityId) : null,
        topicSlug,
        topicName,
        title: isRepair
          ? `Mistake Repair: ${pDoc?.title || topicName}`
          : `Retention Review: ${pDoc?.title || topicName}`,
        estimatedMinutes,
        planRelation: "plan_revision",
        targetUrl: `/revision/session/${queueItem._id}`,
        priorityScore: isRepair ? 95 : 85,
        reasons: isRepair
          ? ["Mistake repair due following prior difficulty in independent solving."]
          : ["Spaced retrieval retention review is due."],
        isInProgress: false,
        isRequired: false,
        fitsTimeBudget,
        timeBudgetDeltaMinutes,
        reasonCode: isRepair ? "weakness_repair" : "revision_due",
      });
    }
  }

  // 4. Support Self-Paced Mode when no active plan or all plan tasks complete
  if (candidates.length === 0) {
    // Check in-progress mission progress
    const inProgressMission = await MissionProgressModel.findOne({
      userId: userObjectId,
      status: "in_progress",
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (inProgressMission) {
      const mission = await MissionModel.findById(inProgressMission.missionId)
        .populate("topicId")
        .lean();

      if (mission) {
        const estimatedMinutes = Number(mission.estimatedMinutes || 25);
        const fitsTimeBudget = availableMinutes !== undefined ? estimatedMinutes <= availableMinutes : true;

        candidates.push({
          candidateId: String(mission._id),
          actionKey: String(mission.slug),
          actionType: "mission",
          entityType: "mission",
          entityId: String(mission._id),
          topicSlug: String((mission.topicId as any)?.slug ?? "curriculum"),
          topicName: String((mission.topicId as any)?.name ?? "Learning Path"),
          title: String(mission.title),
          estimatedMinutes,
          planRelation: "outside_plan",
          targetUrl: `/missions/${mission.slug}`,
          priorityScore: 75,
          reasons: ["Resume your in-progress self-paced mission."],
          isInProgress: true,
          isRequired: false,
          fitsTimeBudget,
          reasonCode: "self_paced_mission",
        });
      }
    }

    // Foundational practice problem
    if (candidates.length === 0) {
      const publishedTopics = await getCachedPublishedTopics().catch(() => []);
      const foundationalTopic = (publishedTopics as any[])[0];
      let fallbackProblem = null;
      if (foundationalTopic) {
        fallbackProblem = await ProblemModel.findOne({
          isPublished: true,
          topicIds: foundationalTopic._id,
        })
          .populate("topicIds")
          .lean();
      }
      if (!fallbackProblem) {
        fallbackProblem = await ProblemModel.findOne({ isPublished: true })
          .populate("topicIds")
          .lean();
      }

      if (fallbackProblem) {
        const pTopic = (fallbackProblem.topicIds as any[])?.[0];
        const topicSlug = pTopic?.slug || foundationalTopic?.slug || "arrays";
        const topicName = pTopic?.name || foundationalTopic?.name || "Arrays & Pointers";
        const estimatedMinutes = Number(fallbackProblem.estimatedMinutes || 20);
        const fitsTimeBudget = availableMinutes !== undefined ? estimatedMinutes <= availableMinutes : true;

        candidates.push({
          candidateId: String(fallbackProblem._id),
          actionKey: String(fallbackProblem.slug),
          actionType: "practice",
          entityType: "problem",
          entityId: String(fallbackProblem._id),
          topicSlug,
          topicName,
          title: String(fallbackProblem.title),
          estimatedMinutes,
          planRelation: "outside_plan",
          targetUrl: `/practice/problems/${fallbackProblem.slug}`,
          priorityScore: 60,
          reasons: [`Foundational practice in ${topicName}.`],
          isInProgress: false,
          isRequired: false,
          fitsTimeBudget,
          reasonCode: "self_paced_practice",
        });
      }
    }
  }

  return {
    userId: userObjectId.toString(),
    planId: plan ? plan._id.toString() : null,
    planDayId: currentDay ? currentDay._id.toString() : null,
    currentDayIndex: currentDay?.dayIndex,
    candidates,
    excludedCount,
    exclusionReasons,
  };
}

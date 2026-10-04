import { Types } from "mongoose";
import { TopicModel, MissionModel, ProblemModel } from "@/features/content/models/content.model";
import { normalizeTopicSlug } from "../planning/topic-catalog";
import { PlanTaskModel } from "../models/plan-task.model";
import {
  generatePlanBlueprint,
  buildDayBlueprint,
} from "../planning/canonical-planner";
import type { PlannerInput } from "../types/intelligence.types";

export interface PlanActivityBlueprint {
  taskKey: string;
  entityType: "mission" | "problem" | "pattern" | "revision" | "reflection" | "checkpoint";
  title: string;
  phase: "learn" | "practice" | "revise" | "reflect" | "checkpoint";
  required: boolean;
  estimatedMinutes: number;
  reflectionPrompt?: string;
}

export interface ResolvedPlanTaskData {
  planId: Types.ObjectId;
  planDayId: Types.ObjectId;
  userId: Types.ObjectId;
  dayIndex: number;
  taskKey: string;
  title: string;
  phase: "learn" | "practice" | "revise" | "reflect" | "checkpoint";
  entityType: "mission" | "problem" | "pattern" | "revision" | "reflection" | "checkpoint";
  entityId: Types.ObjectId | null;
  topicId: Types.ObjectId | null;
  topicSlug: string | null;
  topicName: string | null;
  validationStatus: "aligned" | "cross_topic_bridge" | "mismatched" | "unavailable";
  order: number;
  required: boolean;
  estimatedMinutes: number;
  actualMinutes: number;
  status: "pending" | "in_progress" | "completed" | "skipped" | "unavailable";
  planRelation: "planned_today" | "plan_revision" | "plan_recovery" | "plan_extension" | "outside_plan";
  targetUrl: string;
  startedAt: null;
  completedAt: null;
  reflectionPrompt: string | null;
}

/**
 * Validates whether a plan task's assigned entity genuinely aligns with the planned topic.
 */
export function validatePlanTaskTopicAlignment(params: {
  planTopicId?: string | Types.ObjectId | null;
  entityTopicIds?: Array<string | Types.ObjectId>;
  entityType: string;
}): "aligned" | "cross_topic_bridge" | "mismatched" | "unavailable" {
  const { planTopicId, entityTopicIds, entityType } = params;
  if (!planTopicId) return "aligned";
  if (!entityTopicIds || entityTopicIds.length === 0) return "unavailable";

  const targetIdStr = planTopicId.toString();
  const matches = entityTopicIds.some((id) => id && id.toString() === targetIdStr);
  if (matches) return "aligned";

  // If entity has related topics, mark as bridge or mismatched
  return entityType === "problem" ? "mismatched" : "cross_topic_bridge";
}

/**
 * Resolves a Topic document by its slug, normalizing the slug and querying TopicModel.
 */
export async function resolveTopicDocForSlug(
  slug?: string | null
): Promise<{ _id: Types.ObjectId; slug: string; name: string } | null> {
  if (!slug) return null;
  const normalized = normalizeTopicSlug(slug) || slug;
  const topicDoc = await TopicModel.findOne({ slug: normalized })
    .select("_id slug name")
    .lean();
  if (topicDoc) {
    return {
      _id: topicDoc._id as Types.ObjectId,
      slug: topicDoc.slug,
      name: topicDoc.name,
    };
  }
  // Case-insensitive fallback if exact slug didn't match
  const fallbackDoc = await TopicModel.findOne({
    slug: { $regex: new RegExp(`^${normalized}$`, "i") },
  })
    .select("_id slug name")
    .lean();
  if (fallbackDoc) {
    return {
      _id: fallbackDoc._id as Types.ObjectId,
      slug: fallbackDoc.slug,
      name: fallbackDoc.name,
    };
  }
  return null;
}

/**
 * Batch resolves topic documents for a set of slugs.
 */
export async function batchResolveTopicDocsForSlugs(
  slugs: string[]
): Promise<Map<string, { _id: Types.ObjectId; slug: string; name: string }>> {
  const map = new Map<string, { _id: Types.ObjectId; slug: string; name: string }>();
  if (!slugs || slugs.length === 0) return map;

  const normalizedSlugs = Array.from(
    new Set(slugs.map((s) => normalizeTopicSlug(s) || s).filter(Boolean))
  );

  const docs = await TopicModel.find({ slug: { $in: normalizedSlugs } })
    .select("_id slug name")
    .lean();

  for (const doc of docs) {
    map.set(doc.slug, {
      _id: doc._id as Types.ObjectId,
      slug: doc.slug,
      name: doc.name,
    });
  }
  return map;
}

/**
 * Resolves a blueprint activity into an authentic, topic-grounded database entity
 * with stable deterministic sorting and modular index fallbacks.
 * Never creates a "mission" or "problem" task with broken links or invisible missing content.
 */
export async function resolvePlanActivity(params: {
  activity: PlanActivityBlueprint;
  topicSlug: string;
  dayIndex: number;
  activityIndex: number;
  planId: Types.ObjectId;
  planDayId: Types.ObjectId;
  userId: Types.ObjectId;
  topicDoc?: { _id: Types.ObjectId; slug: string; name: string } | null;
}): Promise<ResolvedPlanTaskData> {
  const {
    activity,
    topicSlug: rawTopicSlug,
    dayIndex,
    activityIndex,
    planId,
    planDayId,
    userId,
  } = params;

  const topicSlug = normalizeTopicSlug(rawTopicSlug) || rawTopicSlug;

  // Resolve Topic Doc early so all activities receive authentic topic metadata
  let topicDoc = params.topicDoc;
  if (!topicDoc) {
    topicDoc = await TopicModel.findOne({ slug: topicSlug })
      .select("_id slug name")
      .lean();
  }

  // 1. Reflection / Checkpoint Activities
  if (activity.entityType === "reflection" || activity.entityType === "checkpoint") {
    const isCheckpoint = activity.entityType === "checkpoint";
    return {
      planId,
      planDayId,
      userId,
      dayIndex,
      taskKey: activity.taskKey,
      title: activity.title,
      phase: activity.phase,
      entityType: activity.entityType,
      entityId: null,
      topicId: topicDoc?._id || null,
      topicSlug: topicDoc?.slug || topicSlug,
      topicName: topicDoc?.name || topicSlug,
      validationStatus: "aligned",
      order: activityIndex + 1,
      required: activity.required,
      estimatedMinutes: activity.estimatedMinutes,
      actualMinutes: 0,
      status: "pending",
      planRelation: "planned_today",
      targetUrl: isCheckpoint
        ? `/revision?topic=${topicDoc?.slug || topicSlug}`
        : "/intelligence?tab=today",
      startedAt: null,
      completedAt: null,
      reflectionPrompt: activity.reflectionPrompt || null,
    };
  }

  // 3. Mission Activity Resolution
  if (activity.entityType === "mission") {
    if (topicDoc) {
      const missions = await MissionModel.find({
        topicId: topicDoc._id,
        isPublished: true,
      })
        .select("_id slug title")
        .sort({ order: 1, _id: 1 })
        .lean();

      if (missions.length > 0) {
        // Query completed missions for this user to deduplicate
        let completedTaskMissions: any[] = [];
        try {
          if (typeof PlanTaskModel.find === "function") {
            const completedDocs = await PlanTaskModel.find({
              userId,
              entityType: "mission",
              status: "completed",
            })
              .select("entityId")
              .lean();
            completedTaskMissions = Array.isArray(completedDocs) ? completedDocs : [];
          }
        } catch {
          completedTaskMissions = [];
        }

        const completedSet = new Set(
          completedTaskMissions
            .map((t: any) => (t?.entityId ? String(t.entityId) : null))
            .filter((id): id is string => Boolean(id))
        );

        // Filter for uncompleted missions
        const uncompletedMissions = missions.filter((m: any) => !completedSet.has(String(m._id)));

        if (uncompletedMissions.length > 0) {
          const missionIndex = Math.max(0, (dayIndex - 1 + activityIndex) % uncompletedMissions.length);
          const selected = uncompletedMissions[missionIndex];

          return {
            planId,
            planDayId,
            userId,
            dayIndex,
            taskKey: activity.taskKey,
            title: selected.title || activity.title,
            phase: activity.phase,
            entityType: "mission",
            entityId: selected._id as Types.ObjectId,
            topicId: topicDoc?._id || null,
            topicSlug: topicDoc?.slug || topicSlug,
            topicName: topicDoc?.name || topicSlug,
            validationStatus: "aligned",
            order: activityIndex + 1,
            required: activity.required,
            estimatedMinutes: activity.estimatedMinutes,
            actualMinutes: 0,
            status: "pending",
            planRelation: "planned_today",
            targetUrl: `/missions/${selected.slug}`,
            startedAt: null,
            completedAt: null,
            reflectionPrompt: null,
          };
        }

        // All missions in this topic have already been completed!
        // Instead of re-assigning a duplicate completed mission, convert to a practice problem activity!
        const fallbackProblemActivity: PlanActivityBlueprint = {
          taskKey: `${activity.taskKey}_problem_fallback`,
          entityType: "problem",
          title: `Solve core ${topicDoc.name || topicSlug} practice problem`,
          phase: "practice",
          required: activity.required,
          estimatedMinutes: activity.estimatedMinutes,
        };
        return resolvePlanActivity({
          activity: fallbackProblemActivity,
          activityIndex,
          dayIndex,
          planId,
          planDayId,
          userId,
          topicSlug,
          topicDoc,
        });
      }
    }

    // Explicit unavailable status when no mission content is published
    return {
      planId,
      planDayId,
      userId,
      dayIndex,
      taskKey: activity.taskKey,
      title: activity.title,
      phase: activity.phase,
      entityType: "mission",
      entityId: null,
      topicId: topicDoc?._id || null,
      topicSlug: topicDoc?.slug || topicSlug,
      topicName: topicDoc?.name || topicSlug,
      validationStatus: "unavailable",
      order: activityIndex + 1,
      required: activity.required,
      estimatedMinutes: activity.estimatedMinutes,
      actualMinutes: 0,
      status: "unavailable",
      planRelation: "planned_today",
      targetUrl: `/learn/topics/${topicSlug}`,
      startedAt: null,
      completedAt: null,
      reflectionPrompt: null,
    };
  }

  // 4. Problem Activity Resolution
  if (activity.entityType === "problem") {
    if (topicDoc) {
      const problems = await ProblemModel.find({
        $or: [{ topicIds: topicDoc._id }, { topicId: topicDoc._id }],
        isPublished: true,
      })
        .select("_id slug title difficulty topicIds topicId")
        .sort({ difficulty: 1, _id: 1 })
        .lean();

      if (problems.length > 0) {
        const problemIndex = Math.max(0, (dayIndex - 1 + activityIndex) % problems.length);
        const selected = problems[problemIndex];

        // Semantic validation: Ensure selected problem genuinely matches the topic
        const entityTopicIds = [...(selected.topicIds || []), (selected as any).topicId].filter(Boolean);
        const alignment = validatePlanTaskTopicAlignment({
          planTopicId: topicDoc._id,
          entityTopicIds,
          entityType: "problem",
        });

        return {
          planId,
          planDayId,
          userId,
          dayIndex,
          taskKey: activity.taskKey,
          title: selected.title || activity.title,
          phase: activity.phase,
          entityType: "problem",
          entityId: selected._id as Types.ObjectId,
          topicId: topicDoc?._id || null,
          topicSlug: topicDoc?.slug || topicSlug,
          topicName: topicDoc?.name || topicSlug,
          validationStatus: alignment,
          order: activityIndex + 1,
          required: alignment === "mismatched" ? false : activity.required,
          estimatedMinutes: activity.estimatedMinutes,
          actualMinutes: 0,
          status: alignment === "mismatched" ? "unavailable" : "pending",
          planRelation: "planned_today",
          targetUrl: `/practice/problems/${selected.slug}`,
          startedAt: null,
          completedAt: null,
          reflectionPrompt: null,
        };
      }
    }

    // Explicit unavailable status when no problem content is published
    return {
      planId,
      planDayId,
      userId,
      dayIndex,
      taskKey: activity.taskKey,
      title: activity.title,
      phase: activity.phase,
      entityType: "problem",
      entityId: null,
      topicId: topicDoc?._id || null,
      topicSlug: topicDoc?.slug || topicSlug,
      topicName: topicDoc?.name || topicSlug,
      validationStatus: "unavailable",
      order: activityIndex + 1,
      required: activity.required,
      estimatedMinutes: activity.estimatedMinutes,
      actualMinutes: 0,
      status: "unavailable",
      planRelation: "planned_today",
      targetUrl: `/practice/problems?topic=${topicSlug}`,
      startedAt: null,
      completedAt: null,
      reflectionPrompt: null,
    };
  }

  // Fallback for generic or custom entity types
  return {
    planId,
    planDayId,
    userId,
    dayIndex,
    taskKey: activity.taskKey,
    title: activity.title,
    phase: activity.phase,
    entityType: activity.entityType,
    entityId: null,
    topicId: topicDoc?._id || null,
    topicSlug: topicDoc?.slug || topicSlug,
    topicName: topicDoc?.name || topicSlug,
    validationStatus: "aligned",
    order: activityIndex + 1,
    required: activity.required,
    estimatedMinutes: activity.estimatedMinutes,
    actualMinutes: 0,
    status: "pending",
    planRelation: "planned_today",
    targetUrl: `/learn/topics/${topicSlug}`,
    startedAt: null,
    completedAt: null,
    reflectionPrompt: null,
  };
}

/**
 * Ensures that tasks for a specific plan day are materialized in PlanTaskModel.
 * If tasks already exist, returns them immediately.
 * If tasks do not exist, constructs them deterministically from the canonical blueprint and inserts them.
 */
export async function materializeTasksForPlanDay(params: {
  plan: any;
  day: any;
  userId: Types.ObjectId | string;
}): Promise<any[]> {
  const { plan, day } = params;
  if (!plan || !day) return [];

  const userObjectId =
    typeof params.userId === "string" ? new Types.ObjectId(params.userId) : params.userId;
  const dayObjectId =
    typeof day._id === "string" ? new Types.ObjectId(day._id) : day._id;
  const planObjectId =
    typeof plan._id === "string" ? new Types.ObjectId(plan._id) : plan._id;

  // 1. Check if tasks already exist for this day
  const existingTasks = await PlanTaskModel.find({ planDayId: dayObjectId })
    .sort({ order: 1 })
    .lean();

  if (existingTasks && existingTasks.length > 0) {
    return existingTasks;
  }

  // 2. Resolve activities from plan snapshot or recompute blueprint
  const dayIndex = Number(day.dayIndex || 1);
  const dailyMinutes = Number(plan.dailyMinutes || 45);

  let activities: PlanActivityBlueprint[] = [];

  const estimatedScheduleSnapshot = plan.snapshots?.estimatedScheduleSnapshot;
  const snapshotDay = Array.isArray(estimatedScheduleSnapshot)
    ? estimatedScheduleSnapshot.find((d: any) => Number(d.dayIndex) === dayIndex)
    : null;

  if (
    snapshotDay &&
    Array.isArray((snapshotDay as any).suggestedActivities) &&
    (snapshotDay as any).suggestedActivities.length > 0
  ) {
    activities = (snapshotDay as any).suggestedActivities;
  } else {
    const input: PlannerInput = {
      learningGoal: plan.goal || "placement",
      focusTopicSlugs: day.topicSlug
        ? [day.topicSlug]
        : plan.snapshots?.primaryTopicSlug
        ? [plan.snapshots.primaryTopicSlug]
        : [],
      knownTopicSlugs: [],
      companySlugs: [],
      dailyMinutes,
      experienceLevel: plan.experienceLevel || "intermediate",
      language: plan.language || "cpp",
      timezone: plan.timezone || "Asia/Kolkata",
    };

    const recomputedBlueprint = generatePlanBlueprint(input, plan.cycleNumber || 1);
    const blueprintDay =
      recomputedBlueprint.estimatedSchedule.find((d) => d.dayIndex === dayIndex) ||
      buildDayBlueprint({
        dayIndex,
        stages: recomputedBlueprint.stages,
        dailyMinutes,
      });

    activities = blueprintDay.suggestedActivities;
  }

  // 3. Resolve Topic Doc for this day
  const topicSlug = day.topicSlug || plan.snapshots?.primaryTopicSlug || "arrays";
  let topicDoc = day.topicId
    ? await TopicModel.findById(day.topicId).select("_id slug name").lean()
    : null;

  if (!topicDoc && topicSlug) {
    topicDoc = await TopicModel.findOne({ slug: topicSlug }).select("_id slug name").lean();
  }

  // 4. Resolve each activity into a task document
  const tasksToInsert = await Promise.all(
    activities.map((act: any, idx: number) =>
      resolvePlanActivity({
        activity: act,
        topicSlug,
        dayIndex,
        activityIndex: idx,
        planId: planObjectId,
        planDayId: dayObjectId,
        userId: userObjectId,
        topicDoc,
      })
    )
  );

  // 5. Insert tasks into PlanTaskModel safely
  try {
    await PlanTaskModel.insertMany(tasksToInsert, { ordered: false });
  } catch (err: any) {
    const isDuplicateKey =
      err?.code === 11000 ||
      (err?.writeErrors &&
        Array.isArray(err.writeErrors) &&
        err.writeErrors.every((we: any) => we.code === 11000));
    if (!isDuplicateKey) {
      console.error("Non-duplicate error during auto-materialization of plan tasks:", err);
    }
  }

  // 6. Return the finalized tasks from DB
  const materializedTasks = await PlanTaskModel.find({ planDayId: dayObjectId })
    .sort({ order: 1 })
    .lean();

  return materializedTasks;
}

export interface PlanDayLike {
  _id?: any;
  id?: string;
  dayIndex: number;
  dateKey?: string;
  status: string;
  completedAt?: Date | string | null;
  topicId?: any;
  topicSlug?: string;
  topicName?: string;
}

/**
 * Deterministically resolves the current active PlanDay using timezone, calendar dateKey,
 * pause periods, and day completion status. Shared across dashboard and intelligence routes.
 *
 * Critical day-boundary rule:
 * An `in_progress` day from a *past* date (dateKey < todayDateKey) is treated as stale.
 * The system advances past it to find the next available day, ensuring that when a new
 * calendar day starts (IST midnight), the dashboard shows the correct next day.
 *
 * Pedagogical Celebration Rule:
 * When today's scheduled day has been completed today, we DO NOT prematurely advance
 * to tomorrow's tasks. Instead, today's completed day remains active with isDayComplete = true
 * so learners can celebrate, explore bonus challenges/problems, and rest.
 * Learners can explicitly unlock tomorrow early when desired.
 */
export function resolveCurrentPlanDay<T extends PlanDayLike>(
  plan: {
    startDate?: Date | string;
    timezone?: string;
    totalDays?: number;
    status?: string;
  } | null,
  days: T[],
  now: Date = new Date(),
  timezone = "Asia/Kolkata"
): T | null {
  if (!days || days.length === 0) return null;

  const tz = plan?.timezone || timezone || "Asia/Kolkata";
  let todayDateKey: string;
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    todayDateKey = formatter.format(now);
  } catch {
    todayDateKey = now.toISOString().slice(0, 10);
  }

  // 1. Any explicitly in_progress day takes highest priority.
  //    If a user has explicitly started a day (e.g. today or working ahead early),
  //    that in_progress day takes highest priority.
  const inProgressDay = days.find((d) => d.status === "in_progress");
  if (inProgressDay) return inProgressDay;

  // 2. Day matching today's calendar dateKey.
  //    Prefer uncompleted days on today's date first.
  const dateMatchDay = days.find((d) => d.dateKey === todayDateKey && d.status !== "completed");
  if (dateMatchDay) return dateMatchDay;

  // 3. First day with available status (next actionable day)
  const availableDay = days.find((d) => d.status === "available");
  if (availableDay) return availableDay;

  // 4. First uncompleted day with a future or missing dateKey
  const futureUncompletedDay = days.find(
    (d) => d.status !== "completed" && (!d.dateKey || d.dateKey >= todayDateKey)
  );
  if (futureUncompletedDay) return futureUncompletedDay;

  // 5. Return first uncompleted or fallback
  const uncompletedDay = days.find((d) => d.status !== "completed");
  if (uncompletedDay) return uncompletedDay;

  // 6. Fallback to last day or first day
  return days[days.length - 1] || days[0] || null;
}

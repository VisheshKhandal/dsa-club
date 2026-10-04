import mongoose, { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { UserProfileModel } from "@/features/identity/models/user.model";
import { RoadmapModel, TopicProgressModel } from "@/features/learning/models/learning.model";
import { TopicModel, MissionModel, ProblemModel } from "@/features/content/models/content.model";
import { PlanModel, type IPlanDocument } from "../models/plan.model";
import { PlanDayModel, type IPlanDayDocument } from "../models/plan-day.model";
import { PlanTaskModel, type IPlanTaskDocument } from "../models/plan-task.model";
import { generateCanonicalPlan } from "../planning/canonical-planner";
import { validateTopicAvailability } from "../planning/availability-validator";
import { normalizeTopicSlug } from "../planning/topic-catalog";
import {
  resolvePlanActivity,
  batchResolveTopicDocsForSlugs,
  resolveTopicDocForSlug,
  materializeTasksForPlanDay,
  resolveCurrentPlanDay,
} from "./plan-content-resolver";
import type { PlannerInput, PlanBlueprint } from "../types/intelligence.types";

function formatDateKey(date: Date, timezone = "Asia/Kolkata"): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Checks whether the current MongoDB deployment supports replica set multi-document transactions.
 */
export function isTransactionSupported(): boolean {
  try {
    const conn: any = mongoose.connection;
    if (!conn || !conn.client) return false;
    const topologyType = conn.client?.topology?.description?.type;
    return topologyType !== "Single" && typeof conn.client.startSession === "function";
  } catch {
    return false;
  }
}

/**
 * Activates a new canonical plan for a user, archiving any existing active plan,
 * creating the Plan record, materializing Days 1-7 PlanDay records, and
 * materializing actionable PlanTasks for Day 1 with authentic topic-grounded entities.
 * Supports conditional transactions when available, with automatic compensating rollback fallback.
 */
export async function activateCanonicalPlanForUser(params: {
  userId: string;
  blueprint: PlanBlueprint;
  input: PlannerInput;
  source: "onboarding" | "customized" | "starter" | "recalibrated";
  roadmapId?: Types.ObjectId | null;
}): Promise<{
  plan: IPlanDocument;
  days: IPlanDayDocument[];
  tasks: IPlanTaskDocument[];
}> {
  await connectToDatabase();
  const userObjectId = new Types.ObjectId(params.userId);

  // 1. Resolve Primary Topic document and all focus topics
  const primaryTopicQuery = TopicModel.findOne({
    slug: params.blueprint.primaryTopicSlug,
  });
  const primaryTopicDoc = (primaryTopicQuery && typeof (primaryTopicQuery as any).select === "function")
    ? await (primaryTopicQuery as any).select("_id slug name").lean()
    : (primaryTopicQuery && typeof (primaryTopicQuery as any).lean === "function")
    ? await (primaryTopicQuery as any).lean()
    : await primaryTopicQuery;

  const focusTopicQuery = TopicModel.find({
    slug: { $in: params.blueprint.focusTopicSlugs },
  });
  const focusTopicDocs = (focusTopicQuery && typeof (focusTopicQuery as any).select === "function")
    ? (await (focusTopicQuery as any).select("_id slug name").lean()) as Array<{ _id: Types.ObjectId; slug: string; name: string }>
    : (focusTopicQuery && typeof (focusTopicQuery as any).lean === "function")
    ? (await (focusTopicQuery as any).lean()) as Array<{ _id: Types.ObjectId; slug: string; name: string }>
    : ((await focusTopicQuery) || []) as Array<{ _id: Types.ObjectId; slug: string; name: string }>;

  const focusTopicIds =
    focusTopicDocs.length > 0
      ? focusTopicDocs.map((d: { _id: Types.ObjectId }) => d._id)
      : primaryTopicDoc
      ? [(primaryTopicDoc as any)._id as Types.ObjectId]
      : [];

  const availability = await validateTopicAvailability(
    params.blueprint.primaryTopicSlug,
    params.input.knownTopicSlugs ?? []
  );

  const startDate = new Date();
  const totalDays = params.blueprint.totalDays;
  const targetCompletionDate = new Date(startDate.getTime() + totalDays * 86400000);
  const activationKey = new Types.ObjectId().toString();

  // Pre-resolve topic documents for all days in the schedule to guarantee per-day topicId persistence
  const scheduleSlugs = params.blueprint.estimatedSchedule.map((d) => d.topicSlug).filter(Boolean);
  const scheduleTopicDocMap = await batchResolveTopicDocsForSlugs(scheduleSlugs);
  if (primaryTopicDoc) {
    scheduleTopicDocMap.set(primaryTopicDoc.slug, primaryTopicDoc as any);
  }

  // Blueprint day and task definitions
  const day1Blueprint = params.blueprint.estimatedSchedule[0];

  // ── ATTEMPT CONDITIONAL TRANSACTION IF SUPPORTED ──
  if (isTransactionSupported()) {
    const session = await mongoose.startSession();
    try {
      let txResult: any;
      await session.withTransaction(async () => {
        // Archive existing
        await PlanModel.updateMany(
          { userId: userObjectId, status: "active" },
          { $set: { status: "archived", archivedAt: new Date() } },
          { session }
        );

        // Create Plan
        const [planDoc] = await PlanModel.create(
          [
            {
              userId: userObjectId,
              status: "active",
              source: params.source,
              version: 1,
              activationKey,
              goal: params.input.learningGoal,
              targetCompanyIds: [],
              targetCompanySnapshots: (params.input.companySlugs || []).map((slug) => ({
                id: slug,
                slug,
                name: slug.toUpperCase(),
              })),
              customCompany: params.input.customCompany || null,
              primaryTopicId: primaryTopicDoc?._id || null,
              focusTopicIds,
              knownTopicIds: [],
              experienceLevel: params.input.experienceLevel,
              language: params.input.language,
              dailyMinutes: params.input.dailyMinutes,
              dailyProblems: params.input.dailyProblems || 2,
              difficultyPreference: params.input.difficultyPreference || "adaptive",
              timezone: params.input.timezone || "Asia/Kolkata",
              cycleNumber: params.blueprint.cycleNumber,
              totalDays,
              startDate,
              targetCompletionDate,
              pausePeriods: [],
              pausedDaysCount: 0,
              snapshots: {
                plannerVersion: "1.0.0",
                curriculumVersion: "2026.1",
                primaryTopicSlug: params.blueprint.primaryTopicSlug,
                inputSnapshot: params.input as unknown as Record<string, unknown>,
                availabilitySnapshot: {
                  status: availability.status,
                  availableMissionsCount: availability.availableMissionsCount,
                  availableProblemsCount: availability.availableProblemsCount,
                },
                estimatedScheduleSnapshot: params.blueprint.estimatedSchedule.map((d) => ({
                  dayIndex: d.dayIndex,
                  title: d.title,
                  focus: d.focus,
                  phase: d.phase,
                  topicSlug: d.topicSlug,
                  topicName: d.topicName,
                })),
              },
              roadmapId: params.roadmapId || null,
            },
          ],
          { session }
        );

        const planTimezone = params.input.timezone || "Asia/Kolkata";
        // Create Days with authentic per-day topic identity
        const dayDocs = params.blueprint.estimatedSchedule.slice(0, 7).map((d) => {
          const dayDate = new Date(startDate.getTime() + (d.dayIndex - 1) * 86400000);
          const dayTopicDoc =
            scheduleTopicDocMap.get(d.topicSlug) ||
            (d.topicSlug === params.blueprint.primaryTopicSlug ? primaryTopicDoc : null);
          return {
            planId: planDoc._id,
            userId: userObjectId,
            dayIndex: d.dayIndex,
            dateKey: formatDateKey(dayDate, planTimezone),
            status: d.dayIndex === 1 ? ("available" as const) : ("locked" as const),
            phase: d.phase,
            title: d.title,
            focus: d.focus,
            topicId: dayTopicDoc?._id || null,
            topicSlug: d.topicSlug,
            topicName: dayTopicDoc?.name || d.topicName,
            targetMinutes: d.plannedMinutes,
            actualMinutes: 0,
            startedAt: d.dayIndex === 1 ? new Date() : null,
            completedAt: null,
            isBufferDay: d.isReviewOrCheckpoint,
            isCheckpointDay: d.isReviewOrCheckpoint,
          };
        });

        const createdDays = (await PlanDayModel.insertMany(dayDocs, { session })) as unknown as IPlanDayDocument[];
        const day1Doc = createdDays.find((d: IPlanDayDocument) => d.dayIndex === 1)!;

        // Materialize Tasks with authentic topic identity for Day 1
        const day1TopicDoc = scheduleTopicDocMap.get(day1Blueprint.topicSlug) || primaryTopicDoc;
        const taskDocs = await Promise.all(
          day1Blueprint.suggestedActivities.map((act, idx) =>
            resolvePlanActivity({
              activity: act,
              topicSlug: day1Blueprint.topicSlug,
              dayIndex: 1,
              activityIndex: idx,
              planId: planDoc._id as Types.ObjectId,
              planDayId: day1Doc._id as Types.ObjectId,
              userId: userObjectId,
              topicDoc: day1TopicDoc,
            })
          )
        );

        const createdTasks = (await PlanTaskModel.insertMany(taskDocs, { session })) as unknown as IPlanTaskDocument[];

        txResult = {
          plan: (typeof (planDoc as any).toObject === "function" ? (planDoc as any).toObject() : planDoc) as IPlanDocument,
          days: createdDays.map((d: any) => (typeof d.toObject === "function" ? d.toObject() : d)) as unknown as IPlanDayDocument[],
          tasks: createdTasks.map((t: any) => (typeof t.toObject === "function" ? t.toObject() : t)) as unknown as IPlanTaskDocument[],
        };
      });

      return txResult;
    } catch (err: any) {
      const isUnsupported =
        err?.message?.includes("replica set") ||
        err?.message?.includes("Transaction numbers are only allowed") ||
        err?.code === 20;

      if (!isUnsupported) {
        throw err;
      }
      // If transactions are not supported by the environment, fall through to compensated workflow
    } finally {
      await session.endSession();
    }
  }

  // ── NON-TRANSACTIONAL COMPENSATED ACTIVATION WORKFLOW ──
  const existingActivePlans = await PlanModel.find({
    userId: userObjectId,
    status: "active",
  })
    .select("_id")
    .lean();

  await PlanModel.updateMany(
    { userId: userObjectId, status: "active" },
    { $set: { status: "archived", archivedAt: new Date() } }
  );

  let planDoc: any = null;
  try {
    // Create new plan in draft status first
    planDoc = await PlanModel.create({
      userId: userObjectId,
      status: "draft",
      source: params.source,
      version: 1,
      activationKey,
      goal: params.input.learningGoal,
      targetCompanyIds: [],
      targetCompanySnapshots: (params.input.companySlugs || []).map((slug) => ({
        id: slug,
        slug,
        name: slug.toUpperCase(),
      })),
      customCompany: params.input.customCompany || null,
      primaryTopicId: primaryTopicDoc?._id || null,
      focusTopicIds,
      knownTopicIds: [],
      experienceLevel: params.input.experienceLevel,
      language: params.input.language,
      dailyMinutes: params.input.dailyMinutes,
      dailyProblems: params.input.dailyProblems || 2,
      difficultyPreference: params.input.difficultyPreference || "adaptive",
      timezone: params.input.timezone || "Asia/Kolkata",
      cycleNumber: params.blueprint.cycleNumber,
      totalDays,
      startDate,
      targetCompletionDate,
      pausePeriods: [],
      pausedDaysCount: 0,
      snapshots: {
        plannerVersion: "1.0.0",
        curriculumVersion: "2026.1",
        primaryTopicSlug: params.blueprint.primaryTopicSlug,
        inputSnapshot: params.input as unknown as Record<string, unknown>,
        availabilitySnapshot: {
          status: availability.status,
          availableMissionsCount: availability.availableMissionsCount,
          availableProblemsCount: availability.availableProblemsCount,
        },
        estimatedScheduleSnapshot: params.blueprint.estimatedSchedule.map((d) => ({
          dayIndex: d.dayIndex,
          title: d.title,
          focus: d.focus,
          phase: d.phase,
          topicSlug: d.topicSlug,
          topicName: d.topicName,
        })),
      },
      roadmapId: params.roadmapId || null,
    });

    const planTimezone = params.input.timezone || "Asia/Kolkata";
    const dayDocsToInsert = params.blueprint.estimatedSchedule.slice(0, 7).map((d) => {
      const dayDate = new Date(startDate.getTime() + (d.dayIndex - 1) * 86400000);
      const dayTopicDoc =
        scheduleTopicDocMap.get(d.topicSlug) ||
        (d.topicSlug === params.blueprint.primaryTopicSlug ? primaryTopicDoc : null);
      return {
        planId: planDoc._id,
        userId: userObjectId,
        dayIndex: d.dayIndex,
        dateKey: formatDateKey(dayDate, planTimezone),
        status: d.dayIndex === 1 ? ("available" as const) : ("locked" as const),
        phase: d.phase,
        title: d.title,
        focus: d.focus,
        topicId: dayTopicDoc?._id || null,
        topicSlug: d.topicSlug,
        topicName: dayTopicDoc?.name || d.topicName,
        targetMinutes: d.plannedMinutes,
        actualMinutes: 0,
        startedAt: d.dayIndex === 1 ? new Date() : null,
        completedAt: null,
        isBufferDay: d.isReviewOrCheckpoint,
        isCheckpointDay: d.isReviewOrCheckpoint,
      };
    });

    const createdDays = (await PlanDayModel.insertMany(dayDocsToInsert)) as unknown as IPlanDayDocument[];
    const day1Doc = createdDays.find((d: IPlanDayDocument) => d.dayIndex === 1)!;

    const day1TopicDoc = scheduleTopicDocMap.get(day1Blueprint.topicSlug) || primaryTopicDoc;
    const taskDocsToInsert = await Promise.all(
      day1Blueprint.suggestedActivities.map((act, idx) =>
        resolvePlanActivity({
          activity: act,
          topicSlug: day1Blueprint.topicSlug,
          dayIndex: 1,
          activityIndex: idx,
          planId: planDoc._id as Types.ObjectId,
          planDayId: day1Doc._id as Types.ObjectId,
          userId: userObjectId,
          topicDoc: day1TopicDoc,
        })
      )
    );

    const createdTasks = (await PlanTaskModel.insertMany(taskDocsToInsert)) as unknown as IPlanTaskDocument[];

    // Promote draft plan to active status
    planDoc.status = "active";
    await planDoc.save();

    return {
      plan: (typeof (planDoc as any).toObject === "function" ? (planDoc as any).toObject() : planDoc) as IPlanDocument,
      days: createdDays.map((d: any) => (typeof d.toObject === "function" ? d.toObject() : d)) as unknown as IPlanDayDocument[],
      tasks: createdTasks.map((t: any) => (typeof t.toObject === "function" ? t.toObject() : t)) as unknown as IPlanTaskDocument[],
    };
  } catch (err) {
    // Compensating rollback
    if (planDoc?._id) {
      await PlanTaskModel.deleteMany({ planId: planDoc._id }).catch(() => {});
      await PlanDayModel.deleteMany({ planId: planDoc._id }).catch(() => {});
      await PlanModel.findByIdAndDelete(planDoc._id).catch(() => {});
    }
    if (existingActivePlans.length > 0) {
      await PlanModel.updateMany(
        { _id: { $in: existingActivePlans.map((p: any) => p._id) } },
        { $set: { status: "active" }, $unset: { archivedAt: "" } }
      ).catch(() => {});
    }
    throw err;
  }
}

/**
 * Resolves the active plan for a user, lazily creating one from their existing
 * onboarding profile or roadmap if none exists, safely preserving user's topic choices.
 */
export async function resolveUserActivePlan(userId: string): Promise<{
  plan: IPlanDocument | null;
  days: IPlanDayDocument[];
  tasks: IPlanTaskDocument[];
  wasMigrated: boolean;
}> {
  await connectToDatabase();
  const userObjectId = new Types.ObjectId(userId);

  // 1. Check for existing active plan
  const planQuery = PlanModel.findOne({
    userId: userObjectId,
    status: { $in: ["active", "paused"] },
  });
  const activePlan = planQuery && typeof (planQuery as any).lean === "function"
    ? await (planQuery as any).lean()
    : await planQuery;

  if (activePlan) {
    const days = await PlanDayModel.find({ planId: activePlan._id }).sort({ dayIndex: 1 }).lean();
    const tasks = await PlanTaskModel.find({ planId: activePlan._id }).sort({
      dayIndex: 1,
      order: 1,
    }).lean();

    // Self-healing: Ensure existing tasks have topic identity and validationStatus populated
    const needsRepair = tasks.some(
      (t: any) => !t.topicSlug || !t.validationStatus
    );

    if (needsRepair && days.length > 0) {
      const dayMap = new Map<string, any>(days.map((d: any) => [d._id.toString(), d]));
      const bulkOps = [];

      for (const t of tasks as any[]) {
        if (!t.topicSlug || !t.validationStatus) {
          const parentDay = dayMap.get(t.planDayId?.toString());
          const topicSlug = parentDay?.topicSlug || (activePlan.snapshots as any)?.primaryTopicSlug || "";
          const topicName = parentDay?.topicName || (activePlan.snapshots as any)?.primaryTopicName || "Unassigned Topic";
          const topicId = parentDay?.topicId || activePlan.primaryTopicId || null;
          const status = (!topicSlug || t.status === "unavailable") ? "unavailable" : "aligned";

          bulkOps.push({
            updateOne: {
              filter: { _id: t._id },
              update: {
                $set: {
                  topicId,
                  topicSlug,
                  topicName,
                  validationStatus: status,
                },
              },
            },
          });
          t.topicId = topicId;
          t.topicSlug = topicSlug;
          t.topicName = topicName;
          t.validationStatus = status;
        }
      }

      if (bulkOps.length > 0) {
        await PlanTaskModel.bulkWrite(bulkOps).catch(() => {});
      }
    }

    // 1.5a Self-healing: Auto-complete stale in_progress days from past dates.
    // When a user comes back the next day, any in_progress day from yesterday
    // should be auto-completed so the plan advances to the current day.
    const planTimezone = (activePlan as any).timezone || "Asia/Kolkata";
    let todayKey: string;
    try {
      const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: planTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      todayKey = fmt.format(new Date());
    } catch {
      todayKey = new Date().toISOString().slice(0, 10);
    }

    let daysModified = false;
    for (const day of days as any[]) {
      if (
        day.status === "in_progress" &&
        day.dateKey &&
        day.dateKey < todayKey
      ) {
        // Stale day from the past — auto-complete it
        await PlanDayModel.findByIdAndUpdate(day._id, {
          status: "completed",
          completedAt: new Date(),
        }).catch(() => {});
        day.status = "completed";
        day.completedAt = new Date();
        daysModified = true;

        // Ensure the next day exists and is available
        const nextDayIndex = day.dayIndex + 1;
        const totalPlanDays = Number(activePlan.totalDays || 21);
        if (nextDayIndex <= totalPlanDays) {
          const nextDay = days.find((d: any) => d.dayIndex === nextDayIndex);
          if (nextDay && (nextDay as any).status !== "completed") {
            await PlanDayModel.findByIdAndUpdate(nextDay._id, {
              status: "available",
            }).catch(() => {});
            (nextDay as any).status = "available";
          }
        }
      }
    }

    // 1.5b Auto-materialize tasks for current actionable day if missing
    let finalTasks = daysModified
      ? (await PlanTaskModel.find({ planId: activePlan._id }).sort({ dayIndex: 1, order: 1 }).lean()) as unknown as IPlanTaskDocument[]
      : tasks;
    const currentDay = resolveCurrentPlanDay(activePlan, days);
    if (currentDay && activePlan.status !== "completed") {
      const hasCurrentDayTasks = tasks.some(
        (t: any) => String(t.planDayId) === String(currentDay._id)
      );
      if (!hasCurrentDayTasks) {
        const materialized = await materializeTasksForPlanDay({
          plan: activePlan,
          day: currentDay,
          userId: userObjectId,
        });
        if (materialized && materialized.length > 0) {
          if (currentDay.status === "available" || currentDay.status === "locked") {
            await PlanDayModel.findByIdAndUpdate(currentDay._id, {
              status: "in_progress",
              startedAt: new Date(),
            }).catch(() => {});
            (currentDay as any).status = "in_progress";
            (currentDay as any).startedAt = new Date();
          }
          finalTasks = (await PlanTaskModel.find({ planId: activePlan._id })
            .sort({ dayIndex: 1, order: 1 })
            .lean()) as unknown as IPlanTaskDocument[];
        }
      }
    }

    return {
      plan: activePlan as unknown as IPlanDocument,
      days: days as unknown as IPlanDayDocument[],
      tasks: finalTasks as unknown as IPlanTaskDocument[],
      wasMigrated: false,
    };
  }

  // 1.8 If user has explicitly stopped/archived their plan and has no active plan,
  // honor their choice to be in self-paced practice mode without auto-creating a new plan.
  const archivedQuery = PlanModel.findOne({
    userId: userObjectId,
    status: "archived",
  });
  const archivedPlan = (archivedQuery && typeof (archivedQuery as any).sort === "function")
    ? await (archivedQuery as any).sort({ updatedAt: -1 }).lean()
    : (archivedQuery && typeof (archivedQuery as any).lean === "function")
    ? await (archivedQuery as any).lean()
    : await archivedQuery;

  if (archivedPlan) {
    return {
      plan: null,
      days: [],
      tasks: [],
      wasMigrated: false,
    };
  }

  // 2. Check for existing profile or active roadmap to migrate
  const profileQuery = UserProfileModel.findOne({ userId: userObjectId });
  const profile = profileQuery && typeof (profileQuery as any).lean === "function"
    ? await (profileQuery as any).lean()
    : await profileQuery;

  const roadmapQuery = RoadmapModel.findOne({
    userId: userObjectId,
    status: "active",
  });
  const activeRoadmap = roadmapQuery && typeof (roadmapQuery as any).lean === "function"
    ? await (roadmapQuery as any).lean()
    : await roadmapQuery;

  if (!profile && !activeRoadmap) {
    return {
      plan: null,
      days: [],
      tasks: [],
      wasMigrated: false,
    };
  }

  // 3. Reconstruct focus topics rather than silently dropping them
  const draft = profile?.onboarding?.draft;
  let restoredFocusSlugs: string[] = [];

  if (Array.isArray(draft?.focusTopicSlugs) && draft.focusTopicSlugs.length > 0) {
    restoredFocusSlugs = draft.focusTopicSlugs;
  } else if (Array.isArray(draft?.targetTopics) && draft.targetTopics.length > 0) {
    restoredFocusSlugs = draft.targetTopics;
  } else if (Array.isArray((profile as any)?.targetTopics) && (profile as any).targetTopics.length > 0) {
    restoredFocusSlugs = (profile as any).targetTopics;
  } else if (activeRoadmap?.stages?.length) {
    const activeStage =
      activeRoadmap.stages.find((s: any) => s.status === "active") ||
      activeRoadmap.stages[0];
    if (activeStage?.topicIds?.[0]) {
      const stageTopicDoc = await TopicModel.findById(activeStage.topicIds[0]).select("slug").lean();
      if (stageTopicDoc?.slug) {
        restoredFocusSlugs = [stageTopicDoc.slug];
      }
    }
  }

  if (restoredFocusSlugs.length === 0) {
    // Check recent studied topic in TopicProgress
    const lastProgressQuery = TopicProgressModel.findOne({ userId: userObjectId });
    const lastProgress = (lastProgressQuery && typeof (lastProgressQuery as any).sort === "function")
      ? await (lastProgressQuery as any).sort({ updatedAt: -1, lastStudiedAt: -1 }).populate("topicId").lean()
      : (lastProgressQuery && typeof (lastProgressQuery as any).lean === "function")
      ? await (lastProgressQuery as any).lean()
      : await lastProgressQuery;
    if ((lastProgress as any)?.topicId?.slug) {
      restoredFocusSlugs = [(lastProgress as any).topicId.slug];
    }
  }

  const normalizedFocusSlugs = restoredFocusSlugs
    .map((s) => normalizeTopicSlug(s))
    .filter((s): s is string => s !== null);

  const finalFocusTopicSlugs = normalizedFocusSlugs.length > 0 ? normalizedFocusSlugs : ["arrays"];

  // 4. Synthesize PlannerInput from existing user state
  const plannerInput: PlannerInput = {
    experienceLevel:
      draft?.experienceLevel ||
      (profile?.currentLevel === "advanced"
        ? "advanced"
        : profile?.currentLevel === "intermediate"
        ? "intermediate"
        : "beginner"),
    companySlugs: draft?.companySlugs && draft.companySlugs.length > 0 ? draft.companySlugs : ["other"],
    customCompany: draft?.customCompany || undefined,
    dailyMinutes: draft?.dailyMinutes || profile?.dailyMinutes || 45,
    language:
      draft?.language ||
      (profile?.primaryLanguage === "java" ||
      profile?.primaryLanguage === "python" ||
      profile?.primaryLanguage === "javascript"
        ? profile.primaryLanguage
        : "cpp"),
    focusTopicSlugs: finalFocusTopicSlugs,
    knownTopicSlugs: (draft?.knownTopicSlugs || []).map((s: string) => normalizeTopicSlug(s) || s),
    learningGoal:
      draft?.learningGoal ||
      (profile?.goals?.[0] === "internship"
        ? "internship"
        : profile?.goals?.[0] === "foundation"
        ? "foundation"
        : "placement"),
    difficultyPreference: "adaptive",
    timezone: "Asia/Kolkata",
  };

  const blueprint = generateCanonicalPlan(plannerInput);

  const activated = await activateCanonicalPlanForUser({
    userId,
    blueprint,
    input: plannerInput,
    source: profile?.onboarding?.status === "completed" ? "onboarding" : "starter",
    roadmapId: activeRoadmap?._id || null,
  });

  return {
    plan: activated.plan,
    days: activated.days,
    tasks: activated.tasks,
    wasMigrated: true,
  };
}

import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { JourneyModel, type IJourneyDocument, type IJourneyMilestone, type IReplanRecord } from "../models/journey.model";
import { PlanModel } from "../models/plan.model";
import { PlanDayModel } from "../models/plan-day.model";
import { PlanTaskModel } from "../models/plan-task.model";
import { getLearnerEpoch } from "@/features/learning/services/learning-command.service";
import { invalidateUserPlanCaches } from "@/features/intelligence/actions/plan-actions";

export interface CreateJourneyInput {
  userId: string | Types.ObjectId;
  goal: string;
  curriculumSlice?: string;
  weeklyAvailability: {
    studyDaysPerWeek: number;
    dailyMinutes: number;
    availableDaysOfWeek?: number[];
    timezone?: string;
  };
  deadline?: Date | string | null;
  targetProfile?: {
    role?: string;
    companySlug?: string;
    experienceLevel: "beginner" | "intermediate" | "advanced";
  };
}

export interface FeasibilityAssessment {
  isFeasible: boolean;
  totalStudyDays: number;
  totalCapacityMinutes: number;
  requiredWorkloadMinutes: number;
  capacityShortfallMinutes: number;
  capacityAllocation: {
    learningMinutes: number;
    practiceMinutes: number;
    reviewMinutes: number;
    bufferMinutes: number;
  };
  recommendation?: {
    suggestedDailyMinutes?: number;
    suggestedDeadline?: Date;
    suggestedScope?: string;
    reason: string;
  };
}

/**
 * Calculates study capacity from startDate to deadline using the learner's weekly schedule.
 */
export function calculateScheduleCapacity(params: {
  startDate: Date;
  deadline?: Date | null;
  studyDaysPerWeek: number;
  dailyMinutes: number;
  availableDaysOfWeek?: number[];
  requiredMinutes?: number;
}): FeasibilityAssessment {
  const {
    startDate,
    deadline,
    studyDaysPerWeek,
    dailyMinutes,
    availableDaysOfWeek = [1, 2, 3, 4, 5],
    requiredMinutes = 180, // Narrow curriculum slice workload (Arrays & Pointers: 2 missions + 3 problems + reviews)
  } = params;

  if (!deadline) {
    // Open-ended deadline is always feasible
    const defaultCycleDays = 14;
    const studyDays = Math.round((defaultCycleDays / 7) * studyDaysPerWeek);
    const capacity = studyDays * dailyMinutes;

    return {
      isFeasible: true,
      totalStudyDays: studyDays,
      totalCapacityMinutes: capacity,
      requiredWorkloadMinutes: requiredMinutes,
      capacityShortfallMinutes: 0,
      capacityAllocation: {
        learningMinutes: Math.round(capacity * 0.4),
        practiceMinutes: Math.round(capacity * 0.35),
        reviewMinutes: Math.round(capacity * 0.15),
        bufferMinutes: Math.round(capacity * 0.1),
      },
    };
  }

  const deadlineDate = new Date(deadline);
  const diffMs = deadlineDate.getTime() - startDate.getTime();
  const totalCalendarDays = Math.max(1, Math.ceil(diffMs / 86400000));

  // Count study days matching availableDaysOfWeek
  let totalStudyDays = 0;
  const current = new Date(startDate);
  for (let i = 0; i < totalCalendarDays; i++) {
    const dayOfWeek = current.getDay(); // 0 is Sunday, 1 is Monday
    const normalizedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    if (availableDaysOfWeek.includes(normalizedDay) || availableDaysOfWeek.includes(dayOfWeek)) {
      totalStudyDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  // Adjust for configured studyDaysPerWeek
  const maxPossibleStudyDays = Math.ceil((totalCalendarDays / 7) * studyDaysPerWeek);
  totalStudyDays = Math.min(totalStudyDays, maxPossibleStudyDays);
  if (totalStudyDays === 0) totalStudyDays = 1;

  const totalCapacityMinutes = totalStudyDays * dailyMinutes;
  const isFeasible = totalCapacityMinutes >= requiredMinutes;
  const capacityShortfallMinutes = Math.max(0, requiredMinutes - totalCapacityMinutes);

  let recommendation: FeasibilityAssessment["recommendation"] = undefined;
  if (!isFeasible) {
    const neededDailyMinutes = Math.ceil(requiredMinutes / totalStudyDays);
    const neededStudyDays = Math.ceil(requiredMinutes / dailyMinutes);
    const suggestedCalendarDays = Math.ceil((neededStudyDays / studyDaysPerWeek) * 7);
    const suggestedDeadline = new Date(startDate.getTime() + suggestedCalendarDays * 86400000);

    recommendation = {
      suggestedDailyMinutes: Math.min(180, Math.max(dailyMinutes + 15, neededDailyMinutes)),
      suggestedDeadline,
      suggestedScope: "Core Two-Pointers Foundations only",
      reason: `Deadline of ${deadlineDate.toISOString().slice(0, 10)} allows only ${totalCapacityMinutes}m of practice across ${totalStudyDays} study days, short of the required ${requiredMinutes}m.`,
    };
  }

  return {
    isFeasible,
    totalStudyDays,
    totalCapacityMinutes,
    requiredWorkloadMinutes: requiredMinutes,
    capacityShortfallMinutes,
    capacityAllocation: {
      learningMinutes: Math.round(totalCapacityMinutes * 0.4),
      practiceMinutes: Math.round(totalCapacityMinutes * 0.35),
      reviewMinutes: Math.round(totalCapacityMinutes * 0.15),
      bufferMinutes: Math.round(totalCapacityMinutes * 0.1),
    },
    recommendation,
  };
}

/**
 * Creates or updates an active Goal-Aware Preparation Journey for a learner.
 */
export async function createPreparationJourney(
  input: CreateJourneyInput
): Promise<{ journey: IJourneyDocument; feasibility: FeasibilityAssessment }> {
  await connectToDatabase();
  const userObjectId =
    input.userId instanceof Types.ObjectId
      ? input.userId
      : new Types.ObjectId(input.userId);

  const learningEpoch = await getLearnerEpoch(userObjectId);
  const slice = input.curriculumSlice || "arrays-and-pointers";
  const startDate = new Date();
  const deadline = input.deadline ? new Date(input.deadline) : null;

  // 1. Calculate schedule capacity & feasibility
  const feasibility = calculateScheduleCapacity({
    startDate,
    deadline,
    studyDaysPerWeek: input.weeklyAvailability.studyDaysPerWeek,
    dailyMinutes: input.weeklyAvailability.dailyMinutes,
    availableDaysOfWeek: input.weeklyAvailability.availableDaysOfWeek,
  });

  // 2. Generate structured milestones for the supported curriculum slice
  const milestones: IJourneyMilestone[] = [
    {
      milestoneId: "ms-1-pointers-foundation",
      order: 1,
      title: "Milestone 1: Two Pointers Mechanics & Invariants",
      targetTopicSlug: "arrays",
      requiredProblemsCount: 2,
      targetReviewCount: 1,
      status: "in_progress",
    },
    {
      milestoneId: "ms-2-independent-application",
      order: 2,
      title: "Milestone 2: Independent Problem Solving & Variation",
      targetTopicSlug: "arrays",
      requiredProblemsCount: 2,
      targetReviewCount: 1,
      status: "pending",
    },
    {
      milestoneId: "ms-3-retention-checkpoint",
      order: 3,
      title: "Milestone 3: Diagnostic Checkpoint & Spaced Retention",
      targetTopicSlug: "arrays",
      requiredProblemsCount: 1,
      targetReviewCount: 2,
      status: "pending",
    },
  ];

  // 3. Archive any current active journey for this user in this epoch
  await JourneyModel.updateMany(
    { userId: userObjectId, learningEpoch, status: "active" },
    { $set: { status: "archived" } }
  );

  // Link to active plan if one exists
  const activePlan = await PlanModel.findOne({
    userId: userObjectId,
    status: "active",
  }).select("_id").lean();

  const journey = await JourneyModel.create({
    userId: userObjectId,
    learningEpoch,
    status: "active",
    goal: input.goal,
    targetProfile: input.targetProfile || {
      role: "Full-Stack Engineer",
      experienceLevel: "intermediate",
    },
    curriculumSlice: slice,
    curriculumVersion: "2026.1",
    weeklyAvailability: {
      studyDaysPerWeek: input.weeklyAvailability.studyDaysPerWeek,
      dailyMinutes: input.weeklyAvailability.dailyMinutes,
      availableDaysOfWeek: input.weeklyAvailability.availableDaysOfWeek || [1, 2, 3, 4, 5],
      timezone: input.weeklyAvailability.timezone || "UTC",
    },
    startDate,
    deadline,
    targetCompletionDate: feasibility.recommendation?.suggestedDeadline || deadline,
    milestones,
    currentCycleNumber: 1,
    activePlanId: activePlan?._id || null,
    version: 1,
    replanHistory: [],
  });

  return { journey, feasibility };
}

/**
 * Retrieves the currently active journey for a learner.
 */
export async function getActiveJourney(
  userId: string | Types.ObjectId
): Promise<IJourneyDocument | null> {
  await connectToDatabase();
  const userObjectId =
    userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);
  const learningEpoch = await getLearnerEpoch(userObjectId);

  return JourneyModel.findOne({
    userId: userObjectId,
    learningEpoch,
    status: "active",
  });
}

/**
 * Generates an explainable, versioned Replan Proposal for an active journey.
 * Triggered by: availability changes, missed commitments, or detected struggles.
 * Does NOT mutate plan data until explicitly accepted by learner.
 */
export async function generateReplanProposal(params: {
  userId: string | Types.ObjectId;
  journeyId: string | Types.ObjectId;
  trigger: "availability_change" | "missed_commitments" | "struggle_detected" | "manual";
  proposedAvailability?: {
    dailyMinutes?: number;
    studyDaysPerWeek?: number;
  };
  reason?: string;
}): Promise<IReplanRecord> {
  await connectToDatabase();
  const userObjectId =
    params.userId instanceof Types.ObjectId
      ? params.userId
      : new Types.ObjectId(params.userId);

  const journey = await JourneyModel.findOne({
    _id: params.journeyId,
    userId: userObjectId,
    status: "active",
  });

  if (!journey) {
    throw new Error("Active journey not found to generate replan proposal");
  }

  const beforeDailyMinutes = journey.weeklyAvailability.dailyMinutes;
  const beforeDaysPerWeek = journey.weeklyAvailability.studyDaysPerWeek;
  const newDailyMinutes = params.proposedAvailability?.dailyMinutes ?? beforeDailyMinutes;
  const newDaysPerWeek = params.proposedAvailability?.studyDaysPerWeek ?? beforeDaysPerWeek;

  const replanId = `replan-${Date.now()}`;
  const whatStays = [
    "All completed tasks and previous attempt records remain untouched",
    "Current in-progress task identity and draft code are preserved",
    "Learned spaced repetition review dates are preserved",
  ];

  const whatMoves: string[] = [];
  const whatIsAdded: string[] = [];

  let diffSummary = "";
  if (params.trigger === "availability_change") {
    diffSummary = `Adjusting future schedule from ${beforeDailyMinutes}m/day (${beforeDaysPerWeek} days/wk) to ${newDailyMinutes}m/day (${newDaysPerWeek} days/wk).`;
    whatMoves.push(`Future unstarted plan tasks will calibrate to ${newDailyMinutes} minutes per session.`);
  } else if (params.trigger === "missed_commitments") {
    diffSummary = "Rescheduling missed commitments without increasing daily study burden.";
    whatMoves.push("Past incomplete tasks deferred into upcoming study buffer days.");
    whatIsAdded.push("1 dedicated catch-up buffer day inserted before next milestone.");
  } else {
    diffSummary = "Reinforcing core patterns with targeted mistake repair.";
    whatIsAdded.push("1 guided mistake-repair drill for Two Pointers invariant boundaries.");
  }

  const proposal: IReplanRecord = {
    replanId,
    trigger: params.trigger,
    triggeredAt: new Date(),
    reason: params.reason || diffSummary,
    beforeSnapshot: {
      dailyMinutes: beforeDailyMinutes,
      studyDaysPerWeek: beforeDaysPerWeek,
      targetCompletionDate: journey.targetCompletionDate,
      version: journey.version,
    },
    proposedChanges: {
      dailyMinutes: newDailyMinutes,
      studyDaysPerWeek: newDaysPerWeek,
      targetCompletionDate: journey.targetCompletionDate,
      diffSummary,
      whatStays,
      whatMoves,
      whatIsAdded,
    },
    status: "proposed",
  };

  journey.replanHistory.push(proposal);
  await journey.save();

  return proposal;
}

/**
 * Applies an accepted Replan Proposal to the active journey and its linked plan.
 * Strictly mutates future unstarted work only! Completed work is permanent.
 */
export async function acceptReplanProposal(params: {
  userId: string | Types.ObjectId;
  journeyId: string | Types.ObjectId;
  replanId: string;
}): Promise<{ success: boolean; newVersion: number }> {
  await connectToDatabase();
  const userObjectId =
    params.userId instanceof Types.ObjectId
      ? params.userId
      : new Types.ObjectId(params.userId);

  const journey = await JourneyModel.findOne({
    _id: params.journeyId,
    userId: userObjectId,
    status: "active",
  });

  if (!journey) {
    throw new Error("Active journey not found");
  }

  const proposal = journey.replanHistory.find((r: any) => r.replanId === params.replanId);
  if (!proposal) {
    throw new Error(`Replan proposal ${params.replanId} not found`);
  }

  if (proposal.status === "accepted") {
    // Already applied — idempotent return
    return { success: true, newVersion: journey.version };
  }

  // Reject stale proposal if journey version has drifted
  if (
    proposal.beforeSnapshot?.version !== undefined &&
    proposal.beforeSnapshot.version !== journey.version
  ) {
    throw new Error(
      `STALE_PROPOSAL: Journey has advanced to version ${journey.version} since proposal was created (base version ${proposal.beforeSnapshot.version}). Recompute proposal before applying.`
    );
  }

  // 1. Update Journey state
  if (proposal.proposedChanges.dailyMinutes) {
    journey.weeklyAvailability.dailyMinutes = proposal.proposedChanges.dailyMinutes;
  }
  if (proposal.proposedChanges.studyDaysPerWeek) {
    journey.weeklyAvailability.studyDaysPerWeek = proposal.proposedChanges.studyDaysPerWeek;
  }
  if (proposal.proposedChanges.targetCompletionDate) {
    journey.targetCompletionDate = new Date(proposal.proposedChanges.targetCompletionDate);
  }
  journey.version += 1;
  proposal.status = "accepted";
  proposal.appliedAt = new Date();

  await journey.save();

  // 2. Safely apply to linked active plan (future unstarted tasks only!)
  if (journey.activePlanId) {
    const plan = await PlanModel.findById(journey.activePlanId);
    if (plan && plan.status === "active") {
      plan.dailyMinutes = journey.weeklyAvailability.dailyMinutes;
      if (proposal.proposedChanges.targetCompletionDate) {
        plan.targetCompletionDate = new Date(proposal.proposedChanges.targetCompletionDate);
      }
      plan.version += 1;
      await plan.save();

      // Update future plan days (status: locked or available with no completed tasks)
      await PlanDayModel.updateMany(
        {
          planId: plan._id,
          status: { $in: ["locked", "available"] },
          completedAt: null,
        },
        {
          $set: { targetMinutes: journey.weeklyAvailability.dailyMinutes },
        }
      );
    }
  }

  await invalidateUserPlanCaches(userObjectId.toString());

  return { success: true, newVersion: journey.version };
}

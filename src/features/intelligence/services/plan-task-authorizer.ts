import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { PlanModel, type IPlanDocument } from "../models/plan.model";
import { PlanDayModel, type IPlanDayDocument } from "../models/plan-day.model";
import { PlanTaskModel, type IPlanTaskDocument } from "../models/plan-task.model";
import { resolveCurrentPlanDay } from "./learning-execution-snapshot";

export type PlanAuthorizationErrorCode =
  | "NO_ACTIVE_PLAN"
  | "PLAN_PAUSED"
  | "TASK_NOT_FOUND"
  | "TASK_NOT_IN_ACTIVE_PLAN"
  | "TASK_DAY_NOT_ACTIONABLE"
  | "TASK_ALREADY_COMPLETED"
  | "TASK_TOPIC_MISMATCH"
  | "STALE_TASK";

export class PlanAuthorizationError extends Error {
  code: PlanAuthorizationErrorCode;
  constructor(code: PlanAuthorizationErrorCode, message: string) {
    super(message);
    this.name = "PlanAuthorizationError";
    this.code = code;
  }
}

export interface AuthorizedTaskContext {
  task: IPlanTaskDocument;
  plan: IPlanDocument;
  currentDay?: IPlanDayDocument;
  planDays?: IPlanDayDocument[];
  userObjectId: Types.ObjectId;
  taskObjectId: Types.ObjectId;
  isAlreadyCompleted: boolean;
}

export interface AuthorizePlanTaskCommandParams {
  userId: string;
  taskId: string;
  command: "start" | "complete" | "skip";
}

/**
 * Canonical authorization gate for all plan task commands (complete, skip, start).
 * Guarantees that:
 * 1. User has an active plan (not paused, not missing).
 * 2. Task exists and is owned by the current user.
 * 3. Task belongs to the user's currently active plan.
 * 4. Task belongs to the currently actionable plan day.
 * 5. Task topic matches the current plan day topic (no cross-topic contamination).
 * 6. Mismatched tasks cannot be started or completed.
 * 7. Completed tasks return isAlreadyCompleted: true for idempotent handling on completion,
 *    or throw TASK_ALREADY_COMPLETED for invalid commands.
 */
export async function authorizePlanTaskCommand(
  params: AuthorizePlanTaskCommandParams
): Promise<AuthorizedTaskContext> {
  const { userId, taskId, command } = params;
  await connectToDatabase();

  const userObjectId = new Types.ObjectId(userId);
  const taskObjectId = new Types.ObjectId(taskId);

  // 1. Verify Active Plan status (check active first, then check paused for clear diagnostics)
  const plan = await PlanModel.findOne({
    userId: userObjectId,
    status: "active",
  });

  if (!plan) {
    const paused = await PlanModel.findOne({
      userId: userObjectId,
      status: "paused",
    });
    if (paused) {
      throw new PlanAuthorizationError(
        "PLAN_PAUSED",
        `Cannot ${command} tasks while plan is paused. Please resume your plan first.`
      );
    }
    throw new PlanAuthorizationError(
      "NO_ACTIVE_PLAN",
      "No active plan found. Please activate a plan first."
    );
  }

  // 2. Fetch the target task owned by user
  const task = await PlanTaskModel.findOne({
    _id: taskObjectId,
    userId: userObjectId,
  });

  if (!task) {
    throw new PlanAuthorizationError(
      "TASK_NOT_FOUND",
      "Plan task not found or unauthorized for this user."
    );
  }

  // 3. Stale plan authorization: Task must belong strictly to the user's active plan
  if (String(task.planId) !== String(plan._id)) {
    throw new PlanAuthorizationError(
      "TASK_NOT_IN_ACTIVE_PLAN",
      "Stale task rejected: Task does not belong to the currently active plan."
    );
  }

  // Idempotent duplicate check: If task is already completed, allow completion idempotently
  if (task.status === "completed" && command === "complete") {
    return {
      userObjectId,
      plan,
      task,
      taskObjectId,
      isAlreadyCompleted: true,
    };
  }

  // 4. Actionable day authorization: Task must belong strictly to the current actionable day
  let dayQuery: any = PlanDayModel.find({ planId: plan._id });
  if (typeof dayQuery.sort === "function") {
    dayQuery = dayQuery.sort({ dayIndex: 1 });
  }
  const planDays = (await dayQuery.lean()) as unknown as IPlanDayDocument[];

  const taskDay = planDays.find((d) => String(d._id) === String(task.planDayId));
  if (!taskDay) {
    throw new PlanAuthorizationError(
      "TASK_DAY_NOT_ACTIONABLE",
      "Action rejected: Task does not belong to any day in this plan."
    );
  }

  const currentDay = resolveCurrentPlanDay(plan, planDays);

  let todayDateKey: string;
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: plan.timezone || "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    todayDateKey = formatter.format(new Date());
  } catch {
    todayDateKey = new Date().toISOString().slice(0, 10);
  }

  const isCurrentDayMatch = Boolean(currentDay && String(task.planDayId) === String(currentDay._id));
  const isInProgressMatch = taskDay.status === "in_progress";

  const hasLaterDayStartedOrCompleted = planDays.some(
    (d) => d.dayIndex > taskDay.dayIndex && (d.status === "in_progress" || d.status === "completed")
  );

  // A completed day is actionable if:
  // - It completed on today's calendar date (same-session completion, day-advance is idempotent), OR
  // - It is the immediately preceding day (catch-up tasks), OR
  // - The task is a reflection type (always completable on completed days), OR
  // - No later day has been started yet (legacy single-day guard)
  const isCompletedDaySameCalendarDay = taskDay.status === "completed" && taskDay.dateKey === todayDateKey;
  const isCompletedDayActionable =
    taskDay.status === "completed" &&
    (task.entityType === "reflection" ||
      isCompletedDaySameCalendarDay ||
      Boolean(currentDay && taskDay.dayIndex === currentDay.dayIndex - 1) ||
      !hasLaterDayStartedOrCompleted);

  if (!isCurrentDayMatch && !isInProgressMatch && !isCompletedDayActionable) {
    throw new PlanAuthorizationError(
      "TASK_DAY_NOT_ACTIONABLE",
      "Action rejected: Task does not belong to the current actionable day."
    );
  }

  const effectiveDay = isCurrentDayMatch ? currentDay : taskDay;

  // 5. Topic identity alignment: Task topic must match the actionable day's topic
  if (task.topicSlug && effectiveDay?.topicSlug && task.topicSlug !== effectiveDay.topicSlug) {
    throw new PlanAuthorizationError(
      "TASK_TOPIC_MISMATCH",
      `Task topic (${task.topicSlug}) does not match day topic (${effectiveDay.topicSlug}).`
    );
  }

  if (
    task.validationStatus === "mismatched" &&
    (command === "start" || command === "complete")
  ) {
    throw new PlanAuthorizationError(
      "TASK_TOPIC_MISMATCH",
      `Cannot ${command} a mismatched task. Please choose another task or skip.`
    );
  }

  // 6. Command-specific state authorization
  const isAlreadyCompleted = task.status === "completed";

  if (isAlreadyCompleted) {
    if (command === "start") {
      throw new PlanAuthorizationError(
        "TASK_ALREADY_COMPLETED",
        "Cannot start a task that has already been completed."
      );
    }
    if (command === "skip") {
      throw new PlanAuthorizationError(
        "TASK_ALREADY_COMPLETED",
        "Cannot skip a task that has already been completed."
      );
    }
    // command === "complete" allows isAlreadyCompleted for idempotency
  }

  return {
    task,
    plan,
    currentDay: (effectiveDay ?? currentDay ?? undefined) as IPlanDayDocument | undefined,
    planDays,
    userObjectId,
    taskObjectId,
    isAlreadyCompleted,
  };
}

"use server";

import { requireUserId } from "@/lib/auth-guard";
import {
  startOrResumeInterviewDrill,
  advanceInterviewStep,
  togglePauseInterviewDrill,
} from "../services/interview-drill.service";
import { InterviewDrillModel, type InterviewDrillStep } from "../models/interview-drill.model";
import { revalidatePath } from "next/cache";
import { serializeForClient } from "@/lib/utils";
import { connectToDatabase } from "@/lib/db/mongodb";

export async function startOrResumeInterviewDrillAction(params: {
  problemSlug: string;
  timeboxMinutes?: number | null;
}) {
  const userId = await requireUserId();
  const drill = await startOrResumeInterviewDrill({
    userId,
    problemSlug: params.problemSlug,
    timeboxMinutes: params.timeboxMinutes,
  });

  return { ok: true, drill: serializeForClient(drill) };
}

export async function advanceInterviewStepAction(params: {
  drillId: string;
  step: InterviewDrillStep;
  response: any;
}) {
  const userId = await requireUserId();
  const drill = await advanceInterviewStep({
    drillId: params.drillId,
    userId,
    step: params.step,
    response: params.response,
  });

  revalidatePath("/dashboard");
  revalidatePath("/plan");
  revalidatePath("/review");

  return { ok: true, drill: serializeForClient(drill) };
}

export async function togglePauseInterviewDrillAction(params: {
  drillId: string;
  pause: boolean;
}) {
  const userId = await requireUserId();
  const drill = await togglePauseInterviewDrill({
    drillId: params.drillId,
    userId,
    pause: params.pause,
  });

  return { ok: true, drill: serializeForClient(drill) };
}

export async function getActiveInterviewDrillAction(problemSlug: string) {
  const userId = await requireUserId();
  await connectToDatabase();

  const drill = await InterviewDrillModel.findOne({
    userId,
    problemSlug,
    status: { $in: ["active", "paused"] },
  }).lean();

  return { ok: true, drill: drill ? serializeForClient(drill) : null };
}

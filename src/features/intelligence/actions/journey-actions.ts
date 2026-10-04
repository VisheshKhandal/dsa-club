"use server";

import { Types } from "mongoose";
import { z } from "zod";
import { requireUserId } from "@/lib/auth-guard";
import {
  createPreparationJourney,
  getActiveJourney,
  generateReplanProposal,
  acceptReplanProposal,
  type CreateJourneyInput,
} from "../services/journey.service";
import { revalidatePath } from "next/cache";
import { serializeForClient } from "@/lib/utils";

const createJourneySchema = z.object({
  goal: z.string().min(2).max(100),
  curriculumSlice: z.string().default("arrays-and-pointers"),
  weeklyAvailability: z.object({
    studyDaysPerWeek: z.coerce.number().int().min(1).max(7),
    dailyMinutes: z.coerce.number().int().min(10).max(240),
    availableDaysOfWeek: z.array(z.coerce.number().int().min(0).max(7)).optional(),
    timezone: z.string().default("UTC"),
  }),
  deadline: z.string().optional().nullable(),
  targetProfile: z
    .object({
      role: z.string().optional(),
      companySlug: z.string().optional(),
      experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
    })
    .optional(),
});

export async function createJourneyAction(rawInput: z.infer<typeof createJourneySchema>) {
  const userId = await requireUserId();
  const input = createJourneySchema.parse(rawInput);

  const result = await createPreparationJourney({
    userId,
    goal: input.goal,
    curriculumSlice: input.curriculumSlice,
    weeklyAvailability: input.weeklyAvailability,
    deadline: input.deadline ? new Date(input.deadline) : null,
    targetProfile: input.targetProfile,
  });

  revalidatePath("/dashboard");
  revalidatePath("/plan");
  revalidatePath("/intelligence");

  return {
    ok: true,
    journeyId: result.journey._id.toString(),
    version: result.journey.version,
    feasibility: result.feasibility,
  };
}

export async function getActiveJourneyAction() {
  const userId = await requireUserId();
  const journey = await getActiveJourney(userId);

  if (!journey) {
    return { ok: true, journey: null };
  }

  return {
    ok: true,
    journey: serializeForClient({
      id: journey._id.toString(),
      goal: journey.goal,
      status: journey.status,
      curriculumSlice: journey.curriculumSlice,
      weeklyAvailability: journey.weeklyAvailability,
      deadline: journey.deadline ? journey.deadline.toISOString() : null,
      targetCompletionDate: journey.targetCompletionDate
        ? journey.targetCompletionDate.toISOString()
        : null,
      milestones: journey.milestones,
      version: journey.version,
      replanHistory: journey.replanHistory,
    }),
  };
}

export async function generateReplanProposalAction(params: {
  journeyId: string;
  trigger: "availability_change" | "missed_commitments" | "struggle_detected" | "manual";
  proposedAvailability?: {
    dailyMinutes?: number;
    studyDaysPerWeek?: number;
  };
  reason?: string;
}) {
  const userId = await requireUserId();
  const proposal = await generateReplanProposal({
    userId,
    journeyId: params.journeyId,
    trigger: params.trigger,
    proposedAvailability: params.proposedAvailability,
    reason: params.reason,
  });

  revalidatePath("/dashboard");
  revalidatePath("/plan");

  return { ok: true, proposal: serializeForClient(proposal) };
}

export async function acceptReplanProposalAction(params: {
  journeyId: string;
  replanId: string;
}) {
  const userId = await requireUserId();
  const result = await acceptReplanProposal({
    userId,
    journeyId: params.journeyId,
    replanId: params.replanId,
  });

  revalidatePath("/dashboard");
  revalidatePath("/plan");
  revalidatePath("/intelligence");

  return { ok: true, newVersion: result.newVersion };
}

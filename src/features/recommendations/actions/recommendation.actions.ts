"use server";

import { z } from "zod";
import { Types } from "mongoose";
import { requireUserId } from "@/lib/auth-guard";
import { generateNextAction } from "@/features/recommendations/services/recommendation.service";

const schema = z.object({ availableMinutes: z.number().int().min(5).max(720) });

export async function getNextAction(input: z.infer<typeof schema>) {
  const parsed = schema.parse(input);
  return generateNextAction(new Types.ObjectId(await requireUserId()), parsed.availableMinutes);
}

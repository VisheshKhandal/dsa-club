import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  limit: z.coerce.number().int().min(1).max(25).default(10),
});

export const notificationFilterSchema = z.object({
  unreadOnly: z.coerce.boolean().default(false),
  type: z.enum(["revision_due", "plan_ready", "streak_risk", "achievement", "recommendation", "system"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

import { z } from "zod";

export const topicSlugs = [
  "arrays",
  "strings",
  "hashing",
  "two-pointers",
  "sliding-window",
  "binary-search",
  "stack",
  "queue",
  "linked-list",
  "trees",
  "heap",
  "graphs",
  "greedy",
  "dynamic-programming",
] as const;

export const companySlugs = [
  "amazon",
  "google",
  "microsoft",
  "adobe",
  "flipkart",
  "atlassian",
  "other",
] as const;

export const onboardingBaseSchema = z.object({
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
  companySlugs: z.array(z.enum(companySlugs)).max(3),
  customCompany: z
    .string()
    .trim()
    .max(50, "Company name cannot exceed 50 characters")
    .optional(),
  dailyMinutes: z.union([
    z.literal(15),
    z.literal(30),
    z.literal(45),
    z.literal(60),
    z.literal(120),
    z.literal(180),
  ]),
  language: z.enum(["cpp", "java", "python", "javascript"]),
  topicKnowledgeMode: z.enum(["starting_fresh", "select_known_topics"]).optional(),
  knownTopicSlugs: z.array(z.enum(topicSlugs)).max(topicSlugs.length),
  learningGoal: z.enum(["foundation", "placement", "internship", "interview", "switch", "not_sure"]),
});

export const onboardingSchema = onboardingBaseSchema.superRefine((data, ctx) => {
  if (data.companySlugs?.includes("other")) {
    const custom = data.customCompany?.trim() ?? "";
    if (custom.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter your target company name (at least 2 characters)",
        path: ["customCompany"],
      });
    }
  }
});

export const onboardingDraftSchema = onboardingBaseSchema.partial().extend({
  companySlugs: z.array(z.enum(companySlugs)).optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth-guard";
import { completeOnboarding } from "@/features/onboarding/services/onboarding.service";
import { revalidateDashboardCache } from "@/features/product/services/product.service";
import {
  onboardingSchema,
  type OnboardingInput,
} from "@/features/onboarding/validators/onboarding.validators";

export async function customizeDashboardPlanAction(input: unknown) {
  const userId = await requireUserId();
  const parsed: OnboardingInput = onboardingSchema.parse(input);
  const roadmap = await completeOnboarding(userId, parsed);

  // Invalidate product caches across all tags and dashboard path
  revalidateDashboardCache(userId);
  try {
    revalidatePath("/dashboard");
  } catch {
    // Graceful fallback outside Next.js request context
  }

  return {
    success: true,
    roadmapId: String(roadmap._id),
  };
}

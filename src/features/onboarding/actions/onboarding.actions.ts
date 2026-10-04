"use server";

import { requireUserId } from "@/lib/auth-guard";
import { MissionModel } from "@/features/content/models/content.model";
import {
  completeOnboarding,
  saveOnboardingDraft,
  skipOnboarding,
} from "@/features/onboarding/services/onboarding.service";
import {
  onboardingDraftSchema,
  onboardingSchema,
} from "@/features/onboarding/validators/onboarding.validators";

export async function saveOnboardingDraftAction(currentStep: number, draft: unknown) {
  const userId = await requireUserId();
  const parsed = onboardingDraftSchema.parse(draft);
  await saveOnboardingDraft(userId, currentStep, parsed);
}

export async function skipOnboardingAction() {
  const userId = await requireUserId();
  await skipOnboarding(userId);
  return { success: true };
}
export async function completeOnboardingAction(input: unknown) {
  const userId = await requireUserId();
  const parsed = onboardingSchema.parse(input);
  const roadmap = await completeOnboarding(userId, parsed);

  let firstMissionSlug: string | null = null;
  const firstStage = (roadmap?.stages ?? [])[0];
  if (firstStage?.missionIds?.length) {
    const mission = await MissionModel.findOne({
      _id: firstStage.missionIds[0],
      isPublished: true,
    })
      .select("slug")
      .lean();
    if (mission?.slug) {
      firstMissionSlug = String(mission.slug);
    }
  }

  const targetUrl = firstMissionSlug ? `/missions/${firstMissionSlug}` : "/dashboard";

  return {
    roadmapId: String(roadmap._id),
    firstMissionSlug,
    targetUrl,
  };
}

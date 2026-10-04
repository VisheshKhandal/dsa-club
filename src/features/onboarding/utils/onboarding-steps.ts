import type { OnboardingInput } from "../validators/onboarding.validators";

export const ONBOARDING_STEPS = ["goal", "level", "time", "language", "plan"] as const;
export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];

export type Draft = Partial<OnboardingInput>;

export const STEP_LABELS: Record<Exclude<OnboardingStepId, "plan">, { index: number; name: string }> = {
  goal: { index: 1, name: "Goal" },
  level: { index: 2, name: "Starting point" },
  time: { index: 3, name: "Realistic time" },
  language: { index: 4, name: "Coding language" },
};

/**
 * Resolves the appropriate onboarding step ID based on requested URL query,
 * legacy 8-step numeric draft values, and existing user draft answers.
 */
export function resolveInitialStepId(
  requestedStep: string | null | undefined,
  legacyStep: number | undefined,
  draft: Draft | undefined,
  isCalibrateMode: boolean
): OnboardingStepId {
  if (requestedStep && (ONBOARDING_STEPS as readonly string[]).includes(requestedStep)) {
    return requestedStep as OnboardingStepId;
  }
  if (isCalibrateMode) {
    return "goal";
  }
  if (draft?.learningGoal && draft?.experienceLevel && draft?.dailyMinutes && draft?.language) {
    return "plan";
  }
  if (!draft?.learningGoal) return "goal";
  if (!draft?.experienceLevel) return "level";
  if (!draft?.dailyMinutes) return "time";
  if (!draft?.language) return "language";

  if (typeof legacyStep === "number") {
    if (legacyStep <= 0) return "goal";
    if (legacyStep === 1) return "level";
    if (legacyStep === 2) return "time";
    if (legacyStep === 3) return "time";
    if (legacyStep === 4) return "language";
    if (legacyStep >= 5 && legacyStep < 7) return "language";
    if (legacyStep >= 7) return "plan";
  }

  return "goal";
}

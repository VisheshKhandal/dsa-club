import type { OnboardingInput } from "@/features/onboarding/validators/onboarding.validators";
import { planRoadmapStages } from "./roadmap-planner";
import { generateWeeklyMilestones } from "./topic-milestone-planner";
import type { RoadmapPreview, SessionBlock } from "./roadmap-preview.types";

const companyDisplayNames: Record<string, string> = {
  amazon: "Amazon",
  google: "Google",
  microsoft: "Microsoft",
  adobe: "Adobe",
  flipkart: "Flipkart",
  atlassian: "Atlassian",
  other: "Other Targets",
};

const experienceDisplayNames: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const languageDisplayNames: Record<string, string> = {
  cpp: "C++",
  java: "Java",
  python: "Python",
  javascript: "JavaScript",
};

const goalDisplayNames: Record<string, string> = {
  internship: "Internship",
  placement: "Campus Placement",
  switch: "Switch Companies",
  foundation: "Build Strong Foundations",
  interview: "Interview Preparation",
  not_sure: "Balanced Foundations",
};

/**
 * Checks whether the onboarding inputs are complete enough to generate
 * a realistic roadmap preview.
 */
export function hasCompletePreviewInputs(
  input: Partial<OnboardingInput>
): input is OnboardingInput {
  return Boolean(
    input.experienceLevel &&
      input.dailyMinutes &&
      input.language &&
      input.learningGoal
  );
}

/**
 * Generates the authentic roadmap preview based directly on the topic-aware planner engine.
 * Guarantees 1:1 alignment between what the user sees in onboarding
 * and what is created on the dashboard.
 */
export function generateRoadmapPreview(input: Partial<OnboardingInput>): RoadmapPreview | null {
  if (!hasCompletePreviewInputs(input)) {
    return null;
  }

  const stages = planRoadmapStages(input);
  if (!stages.length) {
    return null;
  }

  const firstStage = stages[0];

  const breakdown: SessionBlock[] = [
    {
      step: 1,
      title: "Understand the concept",
      detail: "Visual memory model and core invariants",
    },
    {
      step: 2,
      title: "Recognize the pattern",
      detail: "Pattern triggers, clues, and edge cases",
    },
    {
      step: 3,
      title: "Practice one focused problem",
      detail: "Hands-on implementation with graduated hints",
    },
  ];

  // Resolve target company label for contextual milestone enhancement
  const customCompany = input.customCompany?.trim();
  const selectedCompanies = input.companySlugs ?? [];
  const knownFirstCompany = selectedCompanies.find((s) => s !== "other");
  const targetCompanyLabel = customCompany || (knownFirstCompany ? companyDisplayNames[knownFirstCompany] : undefined);

  // Generate 7 pedagogically structured, non-repetitive daily milestones
  const schedule = generateWeeklyMilestones({
    primaryStage: firstStage,
    subsequentStages: stages.slice(1),
    experienceLevel: input.experienceLevel,
    dailyMinutes: input.dailyMinutes,
    learningGoal: input.learningGoal,
    targetCompanyLabel,
  });

  // Format company display labels, incorporating customCompany if provided
  const companyLabels = selectedCompanies.length
    ? selectedCompanies.map((slug) => {
        if (slug === "other") {
          return customCompany ? customCompany : "Other Targets";
        }
        return companyDisplayNames[slug] ?? slug;
      })
    : ["No company focus"];

  return {
    summary: {
      experienceLevel: input.experienceLevel,
      experienceLabel: experienceDisplayNames[input.experienceLevel] ?? input.experienceLevel,
      companies: selectedCompanies,
      companyLabels,
      customCompany: customCompany || undefined,
      dailyMinutes: input.dailyMinutes,
      language: input.language,
      languageLabel: languageDisplayNames[input.language] ?? input.language.toUpperCase(),
      learningGoal: input.learningGoal,
      learningGoalLabel: goalDisplayNames[input.learningGoal] ?? input.learningGoal,
    },
    firstStep: {
      topicName: firstStage.name,
      topicSlug: firstStage.slug,
      title: "Core pattern foundations",
      focus: "Understand invariants and solve your first targeted problem",
      estimatedMinutes: input.dailyMinutes,
      breakdown,
    },
    schedule,
    editableLater: [
      {
        title: "Daily study commitment",
        description: "Scale your daily time between 15 and 60 minutes as your schedule shifts.",
        destinationNote: "Adjust anytime in Settings",
      },
      {
        title: "Programming language & preferences",
        description: "Switch your preferred language or difficulty preferences whenever needed.",
        destinationNote: "Adjust in Account Settings",
      },
      {
        title: "Target companies & path focus",
        description: "Revisit your company focus and learning goals as your milestones evolve.",
        destinationNote: "Update in Learning Paths",
      },
      {
        title: "Adaptive pace",
        description: "Missed a day? The spaced repetition system adjusts your queue automatically without penalty.",
        destinationNote: "Handled automatically",
      },
    ],
  };
}

import type { OnboardingInput } from "@/features/onboarding/validators/onboarding.validators";
import { CURRICULUM, COMPANY_BOOSTS, goalOrder, type CurriculumTopic } from "./curriculum-rules";
import type { PlannedTopicStage } from "./roadmap-preview.types";

export type PlanStagesInput = Pick<
  OnboardingInput,
  "experienceLevel" | "companySlugs" | "dailyMinutes" | "knownTopicSlugs" | "learningGoal"
>;

/**
 * Pure planning engine that calculates prioritized topic stages and duration
 * without any database or side-effect dependencies.
 */
export function planRoadmapStages(input: PlanStagesInput): PlannedTopicStage[] {
  const companySlugs = input.companySlugs ?? [];
  const knownTopicSlugs = input.knownTopicSlugs ?? [];
  const dailyMinutes = Math.max(15, Number(input.dailyMinutes) || 30);
  const experienceLevel = input.experienceLevel ?? "beginner";
  const learningGoal = input.learningGoal ?? "foundation";

  const boosted = new Set(companySlugs.flatMap((slug) => COMPANY_BOOSTS[slug] ?? []));
  const known = new Set<string>(knownTopicSlugs);

  // Beginner learners do not filter out known topics (foundational reinforcement)
  const rawOrderedSlugs = goalOrder(learningGoal).filter(
    (slug) => !(experienceLevel !== "beginner" && known.has(slug))
  );

  // Deduplicate slugs preserving order
  const orderedSlugs = Array.from(new Set(rawOrderedSlugs));

  const curriculumMap = new Map(CURRICULUM.map((topic) => [topic.slug, topic]));
  const selected = orderedSlugs.map((slug) => curriculumMap.get(slug)).filter(Boolean) as CurriculumTopic[];

  const goalOrderMap = new Map(orderedSlugs.map((slug, index) => [slug, index]));
  const prioritized = [...selected].sort(
    (a, b) =>
      Number(boosted.has(b.slug)) - Number(boosted.has(a.slug)) ||
      (goalOrderMap.get(a.slug) ?? 0) - (goalOrderMap.get(b.slug) ?? 0)
  );

  let currentDay = 1;

  return prioritized.map((topic, index) => {
    const plannedDays = Math.max(1, Math.ceil(topic.minutes / dailyMinutes));
    const startDay = currentDay;
    const endDay = currentDay + plannedDays - 1;
    currentDay = endDay + 1;

    return {
      slug: topic.slug,
      name: topic.name,
      order: index,
      difficulty: topic.difficulty,
      estimatedMinutes: topic.minutes,
      plannedDays,
      startDay,
      endDay,
    };
  });
}

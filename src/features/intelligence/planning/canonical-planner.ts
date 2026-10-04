import { CURRICULUM, COMPANY_BOOSTS, type CurriculumTopic } from "@/features/onboarding/planning/curriculum-rules";
import { normalizeTopicSlug, isCanonicalTopicSlug } from "./topic-catalog";
import type {
  PlannerInput,
  PlanBlueprint,
  DayBlueprint,
  PlanDayPhase,
} from "../types/intelligence.types";

const topicMap = new Map<string, CurriculumTopic>(CURRICULUM.map((t) => [t.slug, t]));

export interface PlannedStage {
  slug: string;
  name: string;
  order: number;
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number;
  plannedDays: number;
  startDay: number;
  endDay: number;
}

/**
 * Calculates cycle duration from curriculum workload and learner daily minutes,
 * bounded between 7 and 30 days.
 */
export function calculateCycleDuration(params: {
  curriculumWorkloadMinutes: number;
  dailyMinutes: number;
  experienceLevel?: "beginner" | "intermediate" | "advanced";
  focusTopicsCount?: number;
}): number {
  const daily = Math.max(15, params.dailyMinutes || 30);
  const paceFactor =
    params.experienceLevel === "beginner"
      ? 1.2
      : params.experienceLevel === "advanced"
      ? 0.85
      : 1.0;

  const rawDays = Math.ceil((params.curriculumWorkloadMinutes * paceFactor) / daily);

  const MIN_CYCLE_DAYS = 7;
  const MAX_CYCLE_DAYS = 30;
  const DEFAULT_CYCLE_DAYS = 21;

  if (isNaN(rawDays) || rawDays <= 0) return DEFAULT_CYCLE_DAYS;
  return Math.max(MIN_CYCLE_DAYS, Math.min(MAX_CYCLE_DAYS, rawDays));
}

/**
 * Resolves the primary active topic slug.
 * Prioritizes explicitly selected focus topics (normalized), then evaluates known topics,
 * falling back to foundational arrays.
 */
export function resolvePrimaryTopicSlug(input: Partial<PlannerInput> & { primaryTopicSlug?: string }): string {
  if (input.primaryTopicSlug) {
    const normalized = normalizeTopicSlug(input.primaryTopicSlug);
    if (normalized && topicMap.has(normalized)) {
      return normalized;
    }
  }

  if (input.focusTopicSlugs && input.focusTopicSlugs.length > 0) {
    for (const rawSlug of input.focusTopicSlugs) {
      const normalized = normalizeTopicSlug(rawSlug);
      if (normalized && topicMap.has(normalized)) {
        return normalized;
      }
    }
  }

  const knownSet = new Set(
    (input.knownTopicSlugs ?? [])
      .map((s) => normalizeTopicSlug(s))
      .filter((s): s is string => s !== null)
  );

  const firstUnseen = CURRICULUM.find((t) => !knownSet.has(t.slug));
  return firstUnseen ? firstUnseen.slug : (CURRICULUM[0]?.slug ?? "arrays");
}

/**
 * Builds a deterministic, topic-aware pedagogical blueprint for any day in the cycle (Day 1..30).
 */
export function buildDayBlueprint(params: {
  dayIndex: number;
  stages: PlannedStage[];
  dailyMinutes: number;
  dailyProblems?: number;
  experienceLevel?: "beginner" | "intermediate" | "advanced";
  learningGoal?: string;
  targetCompanyLabel?: string;
}): DayBlueprint {
  const { dayIndex, stages, dailyMinutes, targetCompanyLabel } = params;
  const dailyProblems = Math.max(1, Math.min(4, params.dailyProblems ?? 2));
  const isFirstDay = dayIndex === 1;
  const isReviewOrCheckpoint = dayIndex % 7 === 0;

  const fallbackTopic = CURRICULUM[0] || {
    slug: "arrays",
    name: "Arrays",
    order: 0,
    difficulty: "easy" as const,
    minutes: 300,
    prerequisites: [],
  };

  // Find corresponding stage by day boundaries or wrap to last stage
  const matchedStage =
    stages.find((s) => dayIndex >= s.startDay && dayIndex <= s.endDay) ||
    stages[stages.length - 1] || {
      slug: fallbackTopic.slug,
      name: fallbackTopic.name,
      order: 0,
      difficulty: fallbackTopic.difficulty,
      estimatedMinutes: fallbackTopic.minutes,
      plannedDays: 7,
      startDay: 1,
      endDay: 7,
    };

  const stageDay = Math.max(1, dayIndex - matchedStage.startDay + 1);

  if (isReviewOrCheckpoint) {
    const phase: PlanDayPhase = "review";
    const checkpointNumber = Math.floor(dayIndex / 7);
    const title = `Day ${dayIndex} · Retention Checkpoint ${checkpointNumber}`;
    const focus = `Weekly retention checkpoint, review due queue, and pattern consolidation for ${matchedStage.name}.`;

    return {
      dayIndex,
      title,
      focus,
      phase,
      topicSlug: matchedStage.slug,
      topicName: matchedStage.name,
      plannedMinutes: dailyMinutes,
      isFirstDay: false,
      isReviewOrCheckpoint: true,
      suggestedActivities: [
        {
          taskKey: `checkpoint_day_${dayIndex}_review`,
          entityType: "checkpoint",
          title: `Weekly retention checkpoint & review due queue (${matchedStage.name})`,
          phase: "checkpoint",
          required: true,
          estimatedMinutes: Math.round(dailyMinutes * 0.8),
        },
        {
          taskKey: `checkpoint_day_${dayIndex}_reflection`,
          entityType: "reflection",
          title: "Weekly progress reflection",
          phase: "reflect",
          required: true,
          estimatedMinutes: Math.max(5, Math.round(dailyMinutes * 0.2)),
          reflectionPrompt: `Which ${matchedStage.name} patterns feel strongest, and where did you encounter edge cases?`,
        },
      ],
    };
  }

  if (isFirstDay) {
    const phase: PlanDayPhase = "orientation";
    const title = `Understand ${matchedStage.name} mental model & core invariants`;
    const focus = `Visual memory model and ${matchedStage.name} mental foundations`;

    const problemActivities: DayBlueprint["suggestedActivities"] = [];
    const problemMinutes = Math.max(15, Math.round((dailyMinutes * 0.5) / dailyProblems));
    for (let p = 1; p <= dailyProblems; p++) {
      problemActivities.push({
        taskKey: p === 1 ? `${matchedStage.slug}_core_practice` : `${matchedStage.slug}_day_1_problem_${p}`,
        entityType: "problem",
        title: p === 1
          ? `Solve initial focused ${matchedStage.name} problem with invariants`
          : `Solve complementary ${matchedStage.name} problem (${p}/${dailyProblems})`,
        phase: "practice",
        required: true,
        estimatedMinutes: problemMinutes,
      });
    }

    return {
      dayIndex: 1,
      title,
      focus,
      phase,
      topicSlug: matchedStage.slug,
      topicName: matchedStage.name,
      plannedMinutes: dailyMinutes,
      isFirstDay: true,
      isReviewOrCheckpoint: false,
      suggestedActivities: [
        {
          taskKey: `${matchedStage.slug}_foundation_concept`,
          entityType: "mission",
          title: `Understand ${matchedStage.name} mental model & core invariants`,
          phase: "learn",
          required: true,
          estimatedMinutes: Math.round(dailyMinutes * 0.4),
        },
        ...problemActivities,
        {
          taskKey: "daily_reflection",
          entityType: "reflection",
          title: "Daily retention reflection",
          phase: "reflect",
          required: true,
          estimatedMinutes: Math.max(5, Math.round(dailyMinutes * 0.1)),
          reflectionPrompt: `What was the core invariant or pattern rule you applied today in ${matchedStage.name}?`,
        },
      ],
    };
  }

  // Days 2..N: Pedagogical progression within stage
  let phase: PlanDayPhase = "guided_practice";
  let title = `Guided ${matchedStage.name} practice`;
  let focus = `Pattern variations and invariant maintenance in ${matchedStage.name}`;

  if (stageDay === 1) {
    phase = "orientation";
    title = `Understand ${matchedStage.name} foundations & invariants`;
    focus = `Foundational concepts and memory structures for ${matchedStage.name}.`;
  } else if (stageDay === 2) {
    phase = "mechanics";
    title = `Master ${matchedStage.name} core operations`;
    focus = `Invariant maintenance and boundary condition handling in ${matchedStage.name}.`;
  } else if (stageDay === 3) {
    phase = "pattern_recognition";
    title = `Recognize ${matchedStage.name} primary patterns`;
    focus = `Identifying cues, triggers, and invariant states in ${matchedStage.name}.`;
  } else if (stageDay === 4) {
    phase = "guided_practice";
    title = `Apply ${matchedStage.name} pattern variations`;
    focus = `Connecting ${matchedStage.name} to auxiliary techniques and edge-case navigation.`;
  } else {
    phase = "independent_practice";
    title = targetCompanyLabel
      ? `Targeted ${matchedStage.name} problem solving (${targetCompanyLabel} focus)`
      : `Targeted ${matchedStage.name} problem solving`;
    focus = `Independent problem solving and complexity trade-offs in ${matchedStage.name}.`;
  }

  const activities: DayBlueprint["suggestedActivities"] = [];

  // When starting a new stage on stageDay === 1, introduce concept mission if available
  if (stageDay === 1) {
    activities.push({
      taskKey: `${matchedStage.slug}_day_${dayIndex}_mission`,
      entityType: "mission",
      title,
      phase: "learn",
      required: true,
      estimatedMinutes: Math.round(dailyMinutes * 0.4),
    });
  }

  // Generate dailyProblems practice problems
  const problemMinutes = Math.max(
    15,
    Math.round((dailyMinutes * (stageDay === 1 ? 0.5 : 0.85)) / dailyProblems)
  );

  for (let p = 1; p <= dailyProblems; p++) {
    activities.push({
      taskKey: p === 1 ? `${matchedStage.slug}_day_${dayIndex}_problem` : `${matchedStage.slug}_day_${dayIndex}_problem_${p}`,
      entityType: "problem",
      title: dailyProblems === 1
        ? `Solve focused ${matchedStage.name} problem (Day ${dayIndex})`
        : `Solve focused ${matchedStage.name} problem #${p} (Day ${dayIndex})`,
      phase: "practice",
      required: true,
      estimatedMinutes: problemMinutes,
    });
  }

  // Reflection task is required: true so solving problems does not prematurely auto-advance the day
  activities.push({
    taskKey: `${matchedStage.slug}_day_${dayIndex}_reflection`,
    entityType: "reflection",
    title: "Daily retention reflection",
    phase: "reflect",
    required: true,
    estimatedMinutes: Math.max(5, Math.round(dailyMinutes * 0.15)),
    reflectionPrompt: `What was the key pattern or invariant you learned today in ${matchedStage.name}?`,
  });

  return {
    dayIndex,
    title,
    focus,
    phase,
    topicSlug: matchedStage.slug,
    topicName: matchedStage.name,
    plannedMinutes: dailyMinutes,
    isFirstDay: false,
    isReviewOrCheckpoint: false,
    suggestedActivities: activities,
  };
}

/**
 * Deterministic canonical planner that converts learner intent into a staged
 * cycle blueprint, full cycle schedule (Day 1..totalDays), and Day 1 task slots.
 */
export function generatePlanBlueprint(input: PlannerInput, cycleNumber = 1): PlanBlueprint {
  const primaryTopicSlug = resolvePrimaryTopicSlug(input);
  const primaryTopic = topicMap.get(primaryTopicSlug) ?? CURRICULUM[0];

  // Resolve focus topics with normalization
  const rawFocus = input.focusTopicSlugs ?? ((input as any).primaryTopicSlug ? [(input as any).primaryTopicSlug] : []);
  const normalizedFocus = rawFocus
    .map((s) => normalizeTopicSlug(s))
    .filter((s): s is string => s !== null && topicMap.has(s));

  const focusTopicSlugs = normalizedFocus.length > 0 ? normalizedFocus : [primaryTopicSlug];

  // Weight stages: Primary topic first, then remaining focus topics, then boosted company topics
  const companyBoosts = (input.companySlugs ?? []).flatMap((c) => COMPANY_BOOSTS[c] ?? []);
  const boostSet = new Set(companyBoosts);
  const knownSet = new Set(
    (input.knownTopicSlugs ?? [])
      .map((s) => normalizeTopicSlug(s))
      .filter((s): s is string => s !== null)
  );

  const remainingTopics = CURRICULUM.filter(
    (t) => t.slug !== primaryTopicSlug && !knownSet.has(t.slug)
  ).sort((a, b) => {
    const aFocus = focusTopicSlugs.includes(a.slug) ? 1 : 0;
    const bFocus = focusTopicSlugs.includes(b.slug) ? 1 : 0;
    if (aFocus !== bFocus) return bFocus - aFocus;

    const aBoost = boostSet.has(a.slug) ? 1 : 0;
    const bBoost = boostSet.has(b.slug) ? 1 : 0;
    if (aBoost !== bBoost) return bBoost - aBoost;

    return a.order - b.order;
  });

  const isSingleTopicFocus = focusTopicSlugs.length === 1 && rawFocus.length > 0;

  let stages: PlannedStage[];
  const daily = Math.max(15, input.dailyMinutes || 30);

  if (isSingleTopicFocus) {
    // Focused cycle: Entire cycle is dedicated to progressive deep-dive of the selected topic
    stages = [
      {
        slug: primaryTopic.slug,
        name: primaryTopic.name,
        order: 0,
        difficulty: primaryTopic.difficulty,
        estimatedMinutes: primaryTopic.minutes,
        plannedDays: 7,
        startDay: 1,
        endDay: 7,
      },
      {
        slug: primaryTopic.slug,
        name: `${primaryTopic.name} Advanced Patterns`,
        order: 1,
        difficulty: "medium" as const,
        estimatedMinutes: Math.round(primaryTopic.minutes * 1.2),
        plannedDays: 7,
        startDay: 8,
        endDay: 14,
      },
      {
        slug: primaryTopic.slug,
        name: `${primaryTopic.name} Mastery & Review`,
        order: 2,
        difficulty: "hard" as const,
        estimatedMinutes: Math.round(primaryTopic.minutes * 1.4),
        plannedDays: 7,
        startDay: 15,
        endDay: 21,
      },
    ];
  } else {
    // Multi-topic or comprehensive curriculum cycle
    const orderedTopics = [primaryTopic, ...remainingTopics];
    let dayCursor = 1;
    stages = orderedTopics.map((topic, index) => {
      const plannedDays = Math.max(1, Math.ceil(topic.minutes / daily));
      const startDay = dayCursor;
      const endDay = dayCursor + plannedDays - 1;
      dayCursor += plannedDays;

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

  // Calculate policy-driven total cycle length
  const primaryWorkload = primaryTopic.minutes;
  const totalDays = calculateCycleDuration({
    curriculumWorkloadMinutes: primaryWorkload * (stages.length > 1 ? 1.8 : 1.0),
    dailyMinutes: daily,
    experienceLevel: input.experienceLevel,
    focusTopicsCount: focusTopicSlugs.length,
  });

  // Target company name label for context
  const customCompany = input.customCompany?.trim();
  const knownCompany = input.companySlugs?.find((s) => s !== "other");
  const targetCompanyLabel = customCompany || (knownCompany ? knownCompany.toUpperCase() : undefined);

  // Generate full cycle schedule covering all totalDays (Day 1 to totalDays)
  const estimatedSchedule: DayBlueprint[] = [];
  for (let d = 1; d <= totalDays; d++) {
    estimatedSchedule.push(
      buildDayBlueprint({
        dayIndex: d,
        stages,
        dailyMinutes: daily,
        dailyProblems: input.dailyProblems,
        experienceLevel: input.experienceLevel,
        learningGoal: input.learningGoal,
        targetCompanyLabel,
      })
    );
  }

  const weeklySchedule = estimatedSchedule.slice(0, 7);

  return {
    primaryTopicSlug,
    focusTopicSlugs,
    totalDays,
    cycleNumber,
    dailyMinutes: daily,
    weeklySchedule,
    estimatedSchedule,
    stages,
  };
}

export const generateCanonicalPlan = generatePlanBlueprint;

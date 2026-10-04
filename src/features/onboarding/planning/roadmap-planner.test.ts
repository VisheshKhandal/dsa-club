import { describe, it, expect } from "vitest";
import { planRoadmapStages } from "./roadmap-planner";
import { generateRoadmapPreview, hasCompletePreviewInputs } from "./roadmap-preview.mapper";
import { generateWeeklyMilestones } from "./topic-milestone-planner";
import { getTopicLearningProfile } from "./topic-learning-profiles";
import { CURRICULUM, COMPANY_BOOSTS, goalOrder } from "./curriculum-rules";
import type { OnboardingInput } from "@/features/onboarding/validators/onboarding.validators";

describe("Topic-Agnostic Milestone Engine & Roadmap Planner", () => {
  it("keeps fundamental topics for beginner learners even if marked as known", () => {
    const input: OnboardingInput = {
      experienceLevel: "beginner",
      companySlugs: ["amazon"],
      dailyMinutes: 30,
      language: "python",
      knownTopicSlugs: ["arrays", "strings"],
      learningGoal: "interview",
    };

    const stages = planRoadmapStages(input);
    const slugs = stages.map((s) => s.slug);

    // Beginner must not skip arrays or strings
    expect(slugs).toContain("arrays");
    expect(slugs).toContain("strings");
  });

  it("skips known topics for intermediate and advanced learners", () => {
    const input: OnboardingInput = {
      experienceLevel: "intermediate",
      companySlugs: ["google"],
      dailyMinutes: 60,
      language: "python",
      knownTopicSlugs: ["arrays", "strings", "hashing"],
      learningGoal: "interview",
    };

    const stages = planRoadmapStages(input);
    const slugs = stages.map((s) => s.slug);

    expect(slugs).not.toContain("arrays");
    expect(slugs).not.toContain("strings");
    expect(slugs).not.toContain("hashing");
    expect(slugs.length).toBeGreaterThan(0);
  });

  it("boosts high-frequency topics for target companies without boosting custom companies", () => {
    const inputAmazon: OnboardingInput = {
      experienceLevel: "intermediate",
      companySlugs: ["amazon"],
      dailyMinutes: 60,
      language: "cpp",
      knownTopicSlugs: [],
      learningGoal: "interview",
    };

    const stages = planRoadmapStages(inputAmazon);
    const firstBoosted = stages.slice(0, 4).map((s) => s.slug);

    const amazonBoosts = COMPANY_BOOSTS["amazon"];
    for (const boost of amazonBoosts) {
      expect(firstBoosted).toContain(boost);
    }

    // Verify custom company does not receive an arbitrary boost
    const inputCustom: OnboardingInput = {
      experienceLevel: "intermediate",
      companySlugs: ["other"],
      customCompany: "Uber",
      dailyMinutes: 60,
      language: "cpp",
      knownTopicSlugs: [],
      learningGoal: "foundation",
    };
    const stagesCustom = planRoadmapStages(inputCustom);
    // Natural curriculum order is preserved
    expect(stagesCustom[0].slug).toBe("arrays");
    expect(stagesCustom[1].slug).toBe("strings");
  });

  it("calculates realistic stage duration based on dailyMinutes", () => {
    const input30Min: OnboardingInput = {
      experienceLevel: "beginner",
      companySlugs: ["other"],
      dailyMinutes: 30,
      language: "java",
      knownTopicSlugs: [],
      learningGoal: "foundation",
    };

    const input60Min: OnboardingInput = {
      ...input30Min,
      dailyMinutes: 60,
    };

    const stages30 = planRoadmapStages(input30Min);
    const stages60 = planRoadmapStages(input60Min);

    const arraysStage30 = stages30.find((s) => s.slug === "arrays")!;
    const arraysStage60 = stages60.find((s) => s.slug === "arrays")!;

    // Arrays is 300 minutes. 300 / 30 = 10 days; 300 / 60 = 5 days.
    expect(arraysStage30.plannedDays).toBe(10);
    expect(arraysStage60.plannedDays).toBe(5);

    // Test 15 and 45 minutes
    const stages15 = planRoadmapStages({ ...input30Min, dailyMinutes: 15 });
    const stages45 = planRoadmapStages({ ...input30Min, dailyMinutes: 45 });
    expect(stages15.find((s) => s.slug === "arrays")!.plannedDays).toBe(20);
    expect(stages45.find((s) => s.slug === "arrays")!.plannedDays).toBe(7);
  });

  it("supports completely empty company focus and preserves goal ordering", () => {
    const inputNoCompany: OnboardingInput = {
      experienceLevel: "beginner",
      companySlugs: [],
      dailyMinutes: 30,
      language: "python",
      knownTopicSlugs: [],
      learningGoal: "foundation",
    };

    const stages = planRoadmapStages(inputNoCompany);
    expect(stages.length).toBe(14);
    expect(stages[0].slug).toBe("arrays");
    expect(stages[1].slug).toBe("strings");

    const preview = generateRoadmapPreview(inputNoCompany);
    expect(preview).not.toBeNull();
    expect(preview!.summary.companyLabels).toEqual(["No company focus"]);
    expect(preview!.firstStep.topicName).toBe("Arrays");
  });

  it("produces distinct topic orders for different learning goals", () => {
    const baseInput = {
      experienceLevel: "intermediate" as const,
      companySlugs: [],
      dailyMinutes: 45 as const,
      language: "cpp" as const,
      knownTopicSlugs: [],
    };

    const internshipStages = planRoadmapStages({ ...baseInput, learningGoal: "internship" });
    const placementStages = planRoadmapStages({ ...baseInput, learningGoal: "placement" });
    const switchStages = planRoadmapStages({ ...baseInput, learningGoal: "switch" });
    const foundationStages = planRoadmapStages({ ...baseInput, learningGoal: "foundation" });
    const notSureStages = planRoadmapStages({ ...baseInput, learningGoal: "not_sure" });

    // Internship fast-tracks two-pointers and sliding-window before hashing
    expect(internshipStages[2].slug).toBe("two-pointers");
    expect(internshipStages[3].slug).toBe("sliding-window");

    // Placement prioritizes arrays, strings, hashing, two-pointers, binary-search, linked-list
    expect(placementStages[4].slug).toBe("binary-search");
    expect(placementStages[5].slug).toBe("linked-list");

    // Switch prioritizes high-signal system patterns: arrays, hashing, two-pointers, sliding-window
    expect(switchStages[1].slug).toBe("hashing");

    // Not sure maps to balanced foundation default
    expect(notSureStages.map((s) => s.slug)).toEqual(foundationStages.map((s) => s.slug));
  });

  it("generates 7 distinct pedagogical milestones without duplicate titles across 5 diverse topics", () => {
    const testTopicSlugs = ["arrays", "binary-search", "trees", "graphs", "dynamic-programming"];

    for (const slug of testTopicSlugs) {
      const profile = getTopicLearningProfile(slug);
      expect(profile).toBeDefined();
      expect(profile.coreConcepts.length).toBeGreaterThan(0);
      expect(profile.operations.length).toBeGreaterThan(0);
      expect(profile.patterns.length).toBeGreaterThan(0);

      const fakeStage = {
        slug: profile.slug,
        name: profile.name,
        order: 0,
        difficulty: "medium" as const,
        estimatedMinutes: 300,
        plannedDays: 10,
        startDay: 1,
        endDay: 10,
      };

      const milestones = generateWeeklyMilestones({
        primaryStage: fakeStage,
        targetCompanyLabel: "Google",
      });

      expect(milestones).toHaveLength(7);

      // Verify no duplicate titles within the 7-day sequence
      const titles = milestones.map((m) => m.title);
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(7);

      // Verify phases
      expect(milestones[0].phase).toBe("orientation");
      expect(milestones[0].isFirstDay).toBe(true);
      expect(milestones[6].phase).toBe("review");
      expect(milestones[6].isReviewOrCheckpoint).toBe(true);

      // Verify target company integration in Day 5
      expect(milestones[4].title).toContain("Google focus");
    }
  });

  it("generates a preview with custom company name in summary chips", () => {
    const input: OnboardingInput = {
      experienceLevel: "intermediate",
      companySlugs: ["other"],
      customCompany: "Netflix",
      dailyMinutes: 60,
      language: "python",
      knownTopicSlugs: [],
      learningGoal: "interview",
    };

    const preview = generateRoadmapPreview(input);
    expect(preview).not.toBeNull();
    expect(preview!.summary.companyLabels).toContain("Netflix");
    expect(preview!.summary.customCompany).toBe("Netflix");
    expect(preview!.schedule[4].title).toContain("Netflix focus");
  });

  it("handles incomplete inputs safely without throwing", () => {
    expect(hasCompletePreviewInputs({})).toBe(false);
    expect(generateRoadmapPreview({})).toBeNull();

    expect(
      hasCompletePreviewInputs({
        experienceLevel: "beginner",
        companySlugs: ["amazon"],
      })
    ).toBe(false);

    expect(
      generateRoadmapPreview({
        experienceLevel: "beginner",
        companySlugs: ["amazon"],
      })
    ).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import {
  calculateCycleDuration,
  resolvePrimaryTopicSlug,
  generatePlanBlueprint,
  buildDayBlueprint,
} from "./canonical-planner";
import { normalizeTopicSlug, isCanonicalTopicSlug, getAllCanonicalTopics } from "./topic-catalog";
import type { PlannerInput } from "../types/intelligence.types";

describe("Canonical Planner & Topic Identity Suite", () => {
  describe("topic-catalog and slug normalization", () => {
    it("normalizes variant slugs to canonical curriculum slugs", () => {
      expect(normalizeTopicSlug("linked_lists")).toBe("linked-list");
      expect(normalizeTopicSlug("linked_list")).toBe("linked-list");
      expect(normalizeTopicSlug("stacks_queues")).toBe("stack");
      expect(normalizeTopicSlug("dynamic_programming")).toBe("dynamic-programming");
      expect(normalizeTopicSlug("dp")).toBe("dynamic-programming");
      expect(normalizeTopicSlug("trees-bst")).toBe("trees");
      expect(normalizeTopicSlug("binary_search")).toBe("binary-search");
      expect(normalizeTopicSlug("two_pointers")).toBe("two-pointers");
      expect(normalizeTopicSlug("sliding_window")).toBe("sliding-window");
    });

    it("verifies canonical slugs are recognized directly", () => {
      expect(isCanonicalTopicSlug("arrays")).toBe(true);
      expect(isCanonicalTopicSlug("strings")).toBe(true);
      expect(isCanonicalTopicSlug("graphs")).toBe(true);
      expect(isCanonicalTopicSlug("dynamic-programming")).toBe(true);
      expect(isCanonicalTopicSlug("linked-list")).toBe(true);
    });

    it("provides 14 authentic curriculum topics with complete metadata", () => {
      const all = getAllCanonicalTopics();
      expect(all.length).toBe(14);
      expect(all.every((t) => t.slug && t.name && t.difficulty && t.minutes)).toBe(true);
    });
  });

  describe("calculateCycleDuration", () => {
    it("bounds cycle duration between 7 and 30 days", () => {
      const short = calculateCycleDuration({
        curriculumWorkloadMinutes: 30,
        dailyMinutes: 60,
      });
      expect(short).toBeGreaterThanOrEqual(7);

      const long = calculateCycleDuration({
        curriculumWorkloadMinutes: 5000,
        dailyMinutes: 15,
      });
      expect(long).toBeLessThanOrEqual(30);
    });

    it("applies beginner vs advanced pacing factors", () => {
      const beginner = calculateCycleDuration({
        curriculumWorkloadMinutes: 400,
        dailyMinutes: 30,
        experienceLevel: "beginner",
      });
      const advanced = calculateCycleDuration({
        curriculumWorkloadMinutes: 400,
        dailyMinutes: 30,
        experienceLevel: "advanced",
      });

      expect(beginner).toBeGreaterThanOrEqual(advanced);
    });

    it("returns standard fallback on invalid inputs", () => {
      const fallback = calculateCycleDuration({
        curriculumWorkloadMinutes: 0,
        dailyMinutes: 0,
      });
      expect(fallback).toBe(21);
    });
  });

  describe("resolvePrimaryTopicSlug", () => {
    it("selects explicitly provided focus topic first", () => {
      const slug = resolvePrimaryTopicSlug({
        focusTopicSlugs: ["trees", "graphs"],
      });
      expect(slug).toBe("trees");
    });

    it("normalizes variant focus slugs like linked_lists and dynamic_programming", () => {
      const llSlug = resolvePrimaryTopicSlug({
        focusTopicSlugs: ["linked_lists"],
      });
      expect(llSlug).toBe("linked-list");

      const dpSlug = resolvePrimaryTopicSlug({
        focusTopicSlugs: ["dynamic_programming"],
      });
      expect(dpSlug).toBe("dynamic-programming");

      const sqSlug = resolvePrimaryTopicSlug({
        focusTopicSlugs: ["stacks_queues"],
      });
      expect(sqSlug).toBe("stack");
    });

    it("preserves individual topic focus: Strings, Graphs, DP, Trees, Hashing", () => {
      expect(resolvePrimaryTopicSlug({ focusTopicSlugs: ["strings"] })).toBe("strings");
      expect(resolvePrimaryTopicSlug({ focusTopicSlugs: ["graphs"] })).toBe("graphs");
      expect(resolvePrimaryTopicSlug({ focusTopicSlugs: ["dynamic-programming"] })).toBe("dynamic-programming");
      expect(resolvePrimaryTopicSlug({ focusTopicSlugs: ["trees"] })).toBe("trees");
      expect(resolvePrimaryTopicSlug({ focusTopicSlugs: ["hashing"] })).toBe("hashing");
    });

    it("skips known topics and picks first unseen foundational topic", () => {
      const slug = resolvePrimaryTopicSlug({
        knownTopicSlugs: ["arrays", "strings"],
      });
      expect(slug).toBe("hashing");
    });

    it("falls back to arrays when no focus or known topics provided", () => {
      const slug = resolvePrimaryTopicSlug({});
      expect(slug).toBe("arrays");
    });
  });

  describe("generatePlanBlueprint and Day 8+ Execution", () => {
    const mockInput: PlannerInput = {
      experienceLevel: "intermediate",
      companySlugs: ["google", "amazon"],
      dailyMinutes: 45,
      language: "python",
      focusTopicSlugs: ["binary-search"],
      learningGoal: "interview",
    };

    it("places primary topic as first stage", () => {
      const blueprint = generatePlanBlueprint(mockInput);
      expect(blueprint.primaryTopicSlug).toBe("binary-search");
      expect(blueprint.stages[0].slug).toBe("binary-search");
    });

    it("generates full cycle schedule matching totalDays and 7-day weekly schedule", () => {
      const blueprint = generatePlanBlueprint(mockInput);
      expect(blueprint.estimatedSchedule).toHaveLength(blueprint.totalDays);
      expect(blueprint.weeklySchedule).toHaveLength(7);

      // Day 1
      const day1 = blueprint.estimatedSchedule[0];
      expect(day1.dayIndex).toBe(1);
      expect(day1.isFirstDay).toBe(true);
      expect(day1.suggestedActivities.length).toBeGreaterThanOrEqual(2);
      expect(day1.suggestedActivities.some((a) => a.entityType === "mission")).toBe(true);
      expect(day1.suggestedActivities.some((a) => a.entityType === "problem")).toBe(true);
      expect(day1.suggestedActivities.some((a) => a.entityType === "reflection")).toBe(true);

      // Day 7
      const day7 = blueprint.estimatedSchedule[6];
      expect(day7.dayIndex).toBe(7);
      expect(day7.isReviewOrCheckpoint).toBe(true);

      // Day 8 (Verifies fix for Day 8+ cycle blueprint bug)
      const day8 = blueprint.estimatedSchedule[7];
      expect(day8).toBeDefined();
      expect(day8.dayIndex).toBe(8);
      expect(day8.suggestedActivities.length).toBeGreaterThanOrEqual(2);
      expect(day8.topicSlug).toBeDefined();
      expect(day8.title).toBeDefined();
    });

    it("buildDayBlueprint creates authentic topic-aware schedule for any day", () => {
      const blueprint = generatePlanBlueprint(mockInput);
      const day8 = buildDayBlueprint({
        dayIndex: 8,
        stages: blueprint.stages,
        dailyMinutes: 45,
      });

      expect(day8.dayIndex).toBe(8);
      expect(day8.topicSlug).toBeDefined();
      expect(day8.suggestedActivities.length).toBeGreaterThanOrEqual(2);
      expect(day8.suggestedActivities.some((a) => a.entityType === "mission")).toBe(true);
      expect(day8.suggestedActivities.some((a) => a.entityType === "problem")).toBe(true);

      // Day 14 checkpoint
      const day14 = buildDayBlueprint({
        dayIndex: 14,
        stages: blueprint.stages,
        dailyMinutes: 45,
      });
      expect(day14.isReviewOrCheckpoint).toBe(true);
      expect(day14.phase).toBe("review");
      expect(day14.suggestedActivities.some((a) => a.entityType === "checkpoint")).toBe(true);
    });

    it("produces deterministic totalDays bounded within policy", () => {
      const blueprint = generatePlanBlueprint(mockInput);
      expect(blueprint.totalDays).toBeGreaterThanOrEqual(7);
      expect(blueprint.totalDays).toBeLessThanOrEqual(30);
    });

    it("focus-cycle MVP: keeps all stages grounded on the selected topic for single-focus intent", () => {
      const llInput: PlannerInput = {
        experienceLevel: "intermediate",
        dailyMinutes: 30,
        language: "python",
        companySlugs: [],
        focusTopicSlugs: ["linked-list"],
        learningGoal: "interview",
      };
      const blueprint = generatePlanBlueprint(llInput);
      expect(blueprint.primaryTopicSlug).toBe("linked-list");
      expect(blueprint.stages.every((s) => s.slug === "linked-list")).toBe(true);
      expect(blueprint.estimatedSchedule.every((d) => d.topicSlug === "linked-list")).toBe(true);
    });

    it("respects configurable dailyProblems (1, 2, 3, 4 problems)", () => {
      // 1 problem
      const p1Blueprint = generatePlanBlueprint({ ...mockInput, dailyProblems: 1 });
      const day2_p1 = p1Blueprint.estimatedSchedule[1];
      const problems_p1 = day2_p1.suggestedActivities.filter((a) => a.entityType === "problem");
      expect(problems_p1).toHaveLength(1);

      // 3 problems
      const p3Blueprint = generatePlanBlueprint({ ...mockInput, dailyProblems: 3 });
      const day2_p3 = p3Blueprint.estimatedSchedule[1];
      const problems_p3 = day2_p3.suggestedActivities.filter((a) => a.entityType === "problem");
      expect(problems_p3).toHaveLength(3);

      // 4 problems
      const p4Blueprint = generatePlanBlueprint({ ...mockInput, dailyProblems: 4 });
      const day2_p4 = p4Blueprint.estimatedSchedule[1];
      const problems_p4 = day2_p4.suggestedActivities.filter((a) => a.entityType === "problem");
      expect(problems_p4).toHaveLength(4);
    });

    it("gates daily advancement by marking reflection as required: true on all days", () => {
      const blueprint = generatePlanBlueprint(mockInput);
      for (const day of blueprint.estimatedSchedule) {
        const reflection = day.suggestedActivities.find((a) => a.entityType === "reflection");
        expect(reflection).toBeDefined();
        expect(reflection?.required).toBe(true);
      }
    });

    it("deduplicates missions across days: does not schedule missions on stageDay > 1", () => {
      const blueprint = generatePlanBlueprint(mockInput);
      // Day 1 has a mission (stageDay 1)
      const day1 = blueprint.estimatedSchedule[0];
      expect(day1.suggestedActivities.some((a) => a.entityType === "mission")).toBe(true);

      // Days 2 through 6 have NO missions scheduled (stageDay > 1)
      for (let d = 2; d <= 6; d++) {
        const day = blueprint.estimatedSchedule[d - 1];
        const missionActivity = day.suggestedActivities.find((a) => a.entityType === "mission");
        expect(missionActivity).toBeUndefined();
      }
    });
  });
});


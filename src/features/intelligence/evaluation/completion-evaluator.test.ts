import { describe, it, expect } from "vitest";
import { evaluatePlanCycleCompletion } from "./completion-evaluator";

describe("Plan Cycle Completion Evaluator Suite", () => {
  it("evaluates in-progress cycle correctly", () => {
    const res = evaluatePlanCycleCompletion({
      plan: {
        id: "plan-123",
        cycleNumber: 1,
        totalDays: 21,
      },
      days: [
        { dayIndex: 1, status: "completed", actualMinutes: 45, topicSlug: "arrays", topicName: "Arrays" },
        { dayIndex: 2, status: "completed", actualMinutes: 50, topicSlug: "arrays", topicName: "Arrays" },
        { dayIndex: 3, status: "available", actualMinutes: 0, topicSlug: "arrays", topicName: "Arrays" },
      ],
      tasks: [
        { required: true, status: "completed", entityType: "problem" },
        { required: true, status: "completed", entityType: "mission" },
        { required: true, status: "pending", entityType: "reflection" },
      ],
    });

    expect(res.isEligibleForCompletion).toBe(false);
    expect(res.completedDaysCount).toBe(2);
    expect(res.totalDays).toBe(21);
    expect(res.totalFocusedMinutes).toBe(95);
    expect(res.problemsSolvedCount).toBe(1);
    expect(res.recommendedNextTopicSlug).toBeDefined();
  });

  it("identifies fully completed cycle and advances to next curriculum topic", () => {
    const totalDays = 7;
    const completedDays = Array.from({ length: 7 }, (_, i) => ({
      dayIndex: i + 1,
      status: "completed",
      actualMinutes: 45,
      topicSlug: "arrays",
      topicName: "Arrays",
    }));

    const res = evaluatePlanCycleCompletion({
      plan: {
        id: "plan-456",
        cycleNumber: 1,
        totalDays,
      },
      days: completedDays,
      tasks: [
        { required: true, status: "completed", entityType: "problem" },
        { required: true, status: "completed", entityType: "problem" },
      ],
    });

    expect(res.isEligibleForCompletion).toBe(true);
    expect(res.completionPercentage).toBe(100);
    expect(res.completedDaysCount).toBe(7);
    expect(res.problemsSolvedCount).toBe(2);
    expect(res.readinessSummary).toContain("Cycle 1 completed");
  });
});

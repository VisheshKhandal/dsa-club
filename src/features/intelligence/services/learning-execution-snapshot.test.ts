import { describe, it, expect, vi } from "vitest";
import { resolveCurrentPlanDay } from "./learning-execution-snapshot";

describe("LearningExecutionSnapshot & Day Resolution Suite", () => {
  const mockDays = [
    {
      dayIndex: 1,
      dateKey: "2026-09-24",
      status: "completed",
      phase: "orientation",
      title: "Day 1 Title",
      focus: "Day 1 Focus",
      topicSlug: "strings",
      topicName: "Strings",
      targetMinutes: 45,
    },
    {
      dayIndex: 2,
      dateKey: "2026-09-25",
      status: "available",
      phase: "mechanics",
      title: "Day 2 Title",
      focus: "Day 2 Focus",
      topicSlug: "strings",
      topicName: "Strings",
      targetMinutes: 45,
    },
    {
      dayIndex: 3,
      dateKey: "2026-09-26",
      status: "locked",
      phase: "pattern_recognition",
      title: "Day 3 Title",
      focus: "Day 3 Focus",
      topicSlug: "strings",
      topicName: "Strings",
      targetMinutes: 45,
    },
  ];

  it("resolves explicitly in_progress day with highest priority", () => {
    const daysWithInProgress = [
      ...mockDays.slice(0, 1),
      { ...mockDays[1], status: "in_progress" },
      mockDays[2],
    ];

    const current = resolveCurrentPlanDay(
      { timezone: "Asia/Kolkata", totalDays: 21 },
      daysWithInProgress,
      new Date("2026-09-25T10:00:00Z"),
      "Asia/Kolkata"
    );

    expect(current?.dayIndex).toBe(2);
    expect(current?.status).toBe("in_progress");
  });

  it("resolves dateKey match when matching current date in learner timezone", () => {
    const testDays = [
      { ...mockDays[0], status: "available" },
      mockDays[1],
      mockDays[2],
    ];

    const current = resolveCurrentPlanDay(
      { timezone: "Asia/Kolkata", totalDays: 21 },
      testDays,
      new Date("2026-09-24T08:00:00Z"),
      "Asia/Kolkata"
    );

    expect(current?.dayIndex).toBe(1);
    expect(current?.dateKey).toBe("2026-09-24");
  });

  it("advances to next available day when today's day is completed", () => {
    const current = resolveCurrentPlanDay(
      { timezone: "Asia/Kolkata", totalDays: 21 },
      mockDays,
      new Date("2026-09-24T08:00:00Z"),
      "Asia/Kolkata"
    );

    expect(current?.dayIndex).toBe(2);
    expect(current?.status).toBe("available");
  });

  it("handles null/empty days array gracefully", () => {
    const current = resolveCurrentPlanDay(null, []);
    expect(current).toBeNull();
  });

  describe("validatePlanTaskTopicAlignment", () => {
    it("returns aligned when entity topic matches planned topic", async () => {
      const { validatePlanTaskTopicAlignment } = await import("./plan-content-resolver");
      const res = validatePlanTaskTopicAlignment({
        planTopicId: "507f1f77bcf86cd799439011",
        entityTopicIds: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439022"],
        entityType: "problem",
      });
      expect(res).toBe("aligned");
    });

    it("returns mismatched when problem topics do not include planned topic", async () => {
      const { validatePlanTaskTopicAlignment } = await import("./plan-content-resolver");
      const res = validatePlanTaskTopicAlignment({
        planTopicId: "507f1f77bcf86cd799439011", // e.g. Linked List
        entityTopicIds: ["507f1f77bcf86cd799439099"], // e.g. Trees
        entityType: "problem",
      });
      expect(res).toBe("mismatched");
    });

    it("returns unavailable when entity topic ids are empty", async () => {
      const { validatePlanTaskTopicAlignment } = await import("./plan-content-resolver");
      const res = validatePlanTaskTopicAlignment({
        planTopicId: "507f1f77bcf86cd799439011",
        entityTopicIds: [],
        entityType: "problem",
      });
      expect(res).toBe("unavailable");
    });
  });
});

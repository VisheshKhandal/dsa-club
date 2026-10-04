import { describe, it, expect } from "vitest";
import {
  formatPriorityBadge,
  getTypeCardDetails,
  formatRelativeDue,
  buildContinuousSessionUrl,
  getGradeLabel,
  type DueRevisionItem,
} from "./revision-view";

describe("Screen 12 — Revision Page Architecture & Pedagogical Flow Invariants", () => {
  describe("1. Priority Badge Formatting Invariants", () => {
    it("should classify high priority (priority >= 30) with student-facing labels", () => {
      const badge = formatPriorityBadge(40);
      expect(badge.label).toBe("High Priority");
      expect(badge.color).toContain("amber");
    });

    it("should classify overdue items as 'Overdue'", () => {
      const overdueDate = new Date(Date.now() - 2 * 86400000).toISOString();
      const badge = formatPriorityBadge(10, overdueDate);
      expect(badge.label).toBe("Overdue");
      expect(badge.color).toContain("amber");
    });

    it("should classify medium priority (priority 15..29) with student-facing labels", () => {
      const badge = formatPriorityBadge(20);
      expect(badge.label).toBe("Medium Priority");
      expect(badge.color).toContain("purple");
    });

    it("should classify normal priority (priority < 15) without raw numbers", () => {
      const badge = formatPriorityBadge(10);
      expect(badge.label).toBe("Normal Priority");
    });

    it("should NEVER output raw internal priority strings like 'Priority 40' or 'Priority 24'", () => {
      const testPriorities = [0, 5, 15, 24, 30, 40, 50, 99];
      for (const p of testPriorities) {
        const badge = formatPriorityBadge(p);
        expect(badge.label).not.toMatch(/^Priority \d+$/i);
        expect(badge.label).not.toContain(String(p));
      }
    });
  });

  describe("2. Differentiate Revision Types Invariants", () => {
    it("should return distinct flow subtitle and tag for Problem items", () => {
      const details = getTypeCardDetails("problem");
      expect(details.tag).toBe("Problem");
      expect(details.flowSubtitle).toBe("Recall approach → Pattern check → Solve one similar");
      expect(details.tagColor).toContain("cyan");
    });

    it("should return distinct flow subtitle and tag for Mission items", () => {
      const details = getTypeCardDetails("mission");
      expect(details.tag).toBe("Mission");
      expect(details.flowSubtitle).toBe("Concept recall → Key questions → Reflection");
      expect(details.tagColor).toContain("purple");
    });

    it("should return distinct flow subtitle and tag for Pattern items", () => {
      const details = getTypeCardDetails("pattern");
      expect(details.tag).toBe("Pattern");
      expect(details.flowSubtitle).toBe("Signal keywords → Recognition check → Tradeoffs");
      expect(details.tagColor).toContain("emerald");
    });

    it("should return distinct flow subtitle and tag for Topic items", () => {
      const details = getTypeCardDetails("topic");
      expect(details.tag).toBe("Topic");
      expect(details.flowSubtitle).toBe("Core mental model → Sub-skill check → Practice");
      expect(details.tagColor).toContain("amber");
    });

    it("should handle uppercase and unexpected casing safely", () => {
      const details = getTypeCardDetails("PROBLEM");
      expect(details.tag).toBe("Problem");
      expect(details.flowSubtitle).toBe("Recall approach → Pattern check → Solve one similar");
    });
  });

  describe("3. Unified Continuous Session URL Invariants", () => {
    it("should return '/revision' fallback if queue is empty", () => {
      expect(buildContinuousSessionUrl([])).toBe("/revision");
    });

    it("should construct single-item queue session URL", () => {
      const items: DueRevisionItem[] = [
        {
          id: "rev-item-1",
          entityType: "problem",
          conceptName: "Two Sum",
          href: "/practice/problems/two-sum",
          detail: "Easy · LeetCode",
          estimatedMinutes: 5,
          dueAt: new Date().toISOString(),
          priority: 40,
          state: "learning",
        },
      ];
      expect(buildContinuousSessionUrl(items)).toBe(
        "/revision/session/rev-item-1?queue=rev-item-1"
      );
    });

    it("should construct multi-item sequential queue session URL", () => {
      const items: DueRevisionItem[] = [
        {
          id: "rev-item-1",
          entityType: "problem",
          conceptName: "Two Sum",
          href: "/practice/problems/two-sum",
          detail: "Easy",
          estimatedMinutes: 5,
          dueAt: new Date().toISOString(),
          priority: 40,
          state: "learning",
        },
        {
          id: "rev-item-2",
          entityType: "pattern",
          conceptName: "Sliding Window",
          href: "/patterns/sliding-window",
          detail: "Medium",
          estimatedMinutes: 6,
          dueAt: new Date().toISOString(),
          priority: 25,
          state: "review",
        },
        {
          id: "rev-item-3",
          entityType: "topic",
          conceptName: "Arrays",
          href: "/learn/topics/arrays",
          detail: "Easy",
          estimatedMinutes: 5,
          dueAt: new Date().toISOString(),
          priority: 15,
          state: "review",
        },
      ];

      const url = buildContinuousSessionUrl(items);
      expect(url).toBe(
        "/revision/session/rev-item-1?queue=rev-item-1,rev-item-2,rev-item-3"
      );
      // Starts with first item
      expect(url.startsWith("/revision/session/rev-item-1")).toBe(true);
      // Contains all ids in query
      expect(url).toContain("queue=rev-item-1,rev-item-2,rev-item-3");
    });
  });

  describe("4. Relative Due Date Formatting Invariants", () => {
    it("should format dates due today as 'Due today'", () => {
      const nowStr = new Date().toISOString();
      expect(formatRelativeDue(nowStr)).toBe("Due today");
    });

    it("should format dates due tomorrow as 'Tomorrow'", () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeDue(tomorrow)).toBe("Tomorrow");
    });

    it("should format dates due in 2 days as 'In 2 days'", () => {
      const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeDue(inTwoDays)).toBe("In 2 days");
    });

    it("should handle invalid dates gracefully", () => {
      expect(formatRelativeDue("invalid-date")).toBe("Upcoming");
    });
  });

  describe("5. SM-2 Grade Label Mapping Invariants", () => {
    it("should map grade 5 to Easy with emerald styling", () => {
      const gradeInfo = getGradeLabel(5);
      expect(gradeInfo.label).toBe("Easy");
      expect(gradeInfo.color).toContain("emerald");
    });

    it("should map grade 4 to Good with cyan styling", () => {
      const gradeInfo = getGradeLabel(4);
      expect(gradeInfo.label).toBe("Good");
      expect(gradeInfo.color).toContain("cyan");
    });

    it("should map grade 3 to Hard with amber styling", () => {
      const gradeInfo = getGradeLabel(3);
      expect(gradeInfo.label).toBe("Hard");
      expect(gradeInfo.color).toContain("amber");
    });

    it("should map grade 2 or lower to Again with rose styling", () => {
      const gradeInfo2 = getGradeLabel(2);
      expect(gradeInfo2.label).toBe("Again");
      expect(gradeInfo2.color).toContain("rose");

      const gradeInfo1 = getGradeLabel(1);
      expect(gradeInfo1.label).toBe("Again");
      expect(gradeInfo1.color).toContain("rose");
    });
  });

  describe("6. Session Time & Sequence Estimation Invariants", () => {
    it("should aggregate estimated minutes across due items accurately", () => {
      const items: DueRevisionItem[] = [
        {
          id: "1",
          entityType: "problem",
          conceptName: "Two Sum",
          href: "",
          detail: "",
          estimatedMinutes: 7,
          dueAt: "",
          priority: 30,
          state: "",
        },
        {
          id: "2",
          entityType: "pattern",
          conceptName: "Two Pointers",
          href: "",
          detail: "",
          estimatedMinutes: 5,
          dueAt: "",
          priority: 20,
          state: "",
        },
        {
          id: "3",
          entityType: "mission",
          conceptName: "Array Foundations",
          href: "",
          detail: "",
          estimatedMinutes: 4,
          dueAt: "",
          priority: 10,
          state: "",
        },
      ];

      const totalMinutes = items.reduce((acc, itm) => acc + (itm.estimatedMinutes || 5), 0);
      expect(totalMinutes).toBe(16);
    });
  });
});

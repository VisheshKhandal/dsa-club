import { describe, expect, it } from "vitest";
import { buildDashboardNextAction } from "./learning-loop.selectors";

describe("core learning loop dashboard action", () => {
  it("continues an active mission before due revision work", () => {
    const action = buildDashboardNextAction(
      { slug: "arrays-basics", title: "Arrays Basics", status: "in_progress", topic: "Arrays", nextStage: { title: "Practice" } },
      [{ conceptName: "Two Sum", href: "/practice/problems/two-sum" }]
    );

    expect(action).toMatchObject({
      type: "mission",
      label: "Resume Mission",
      href: "/missions/arrays-basics",
      reason: "Next stage: Practice.",
    });
  });

  it("uses due revision when there is no active mission", () => {
    const action = buildDashboardNextAction(null, [{ conceptName: "Two Sum", href: "/practice/problems/two-sum" }]);

    expect(action).toMatchObject({
      type: "revision",
      label: "Start Revision",
      href: "/revision",
      title: "Two Sum",
    });
  });

  it("falls back to learning when there is no active work", () => {
    const action = buildDashboardNextAction(null, []);

    expect(action).toMatchObject({
      type: "learn",
      label: "Browse Topics",
      href: "/learn",
    });
  });
});

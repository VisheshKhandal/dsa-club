import { describe, it, expect } from "vitest";
import {
  NAVIGATION_CONFIG,
  isItemActive,
  isChildActive,
  getActiveParentId,
} from "./navigation.config";

describe("DSA Club Navigation Architecture & Configuration", () => {
  it("defines the exact 3 primary/core groups in canonical order", () => {
    expect(NAVIGATION_CONFIG.map((g) => g.id)).toEqual([
      "primary",
      "learn",
      "insights",
    ]);
    expect(NAVIGATION_CONFIG[1].label).toBe("LEARN");
    expect(NAVIGATION_CONFIG[2].label).toBe("INSIGHTS");
  });

  it("verifies Primary group items: Home and Plan (renamed from Club Intelligence)", () => {
    const primaryItems = NAVIGATION_CONFIG[0].items;
    expect(primaryItems.map((i) => i.id)).toEqual(["home", "plan"]);
    expect(primaryItems[0].label).toBe("Home");
    expect(primaryItems[0].href).toBe("/dashboard");
    expect(primaryItems[1].label).toBe("Plan");
    expect(primaryItems[1].href).toBe("/intelligence");
    expect(primaryItems[1].description).toContain("Club Intelligence");
  });

  it("verifies Learn group: Learn, Practice, Review, with NO top-level Paths", () => {
    const learnItems = NAVIGATION_CONFIG[1].items;
    expect(learnItems.map((i) => i.id)).toEqual([
      "learn-parent",
      "practice-parent",
      "review",
    ]);
    expect(learnItems.find((i) => i.id === "paths")).toBeUndefined();
  });

  it("verifies Learn parent has children in exact order: Topics -> Paths -> Missions", () => {
    const learnParent = NAVIGATION_CONFIG[1].items[0];
    expect(learnParent.children).toBeDefined();
    const childrenIds = learnParent.children?.map((c) => c.id);
    expect(childrenIds).toEqual(["topics", "paths", "missions"]);

    expect(learnParent.children?.[0].label).toBe("Topics");
    expect(learnParent.children?.[0].href).toBe("/learn/topics");

    expect(learnParent.children?.[1].label).toBe("Paths");
    expect(learnParent.children?.[1].href).toBe("/learn/paths");

    expect(learnParent.children?.[2].label).toBe("Missions");
    expect(learnParent.children?.[2].href).toBe("/missions");
  });

  it("verifies Practice parent has children: Problems -> Patterns", () => {
    const practiceParent = NAVIGATION_CONFIG[1].items[1];
    expect(practiceParent.children).toBeDefined();
    const childrenIds = practiceParent.children?.map((c) => c.id);
    expect(childrenIds).toEqual(["problems", "patterns"]);

    expect(practiceParent.children?.[0].label).toBe("Problems");
    expect(practiceParent.children?.[0].href).toBe("/practice");

    expect(practiceParent.children?.[1].label).toBe("Patterns");
    expect(practiceParent.children?.[1].href).toBe("/patterns");
  });

  it("verifies Insights group has Progress and Company Prep (renamed from Interview)", () => {
    const insightsItems = NAVIGATION_CONFIG[2].items;
    expect(insightsItems.map((i) => i.id)).toEqual(["progress", "company-prep"]);
    expect(insightsItems[0].label).toBe("Progress");
    expect(insightsItems[0].href).toBe("/progress");
    expect(insightsItems[1].label).toBe("Company Prep");
    expect(insightsItems[1].href).toBe("/interview");
  });

  describe("Route Matching Predicates", () => {
    const [primary, learnGroup, insights] = NAVIGATION_CONFIG;
    const [home, plan] = primary.items;
    const [learnParent, practiceParent, review] = learnGroup.items;
    const [progress, companyPrep] = insights.items;
    const [topics, paths, missions] = learnParent.children!;
    const [problems, patterns] = practiceParent.children!;

    it("matches Home only for /dashboard", () => {
      expect(isItemActive(home, "/dashboard")).toBe(true);
      expect(isItemActive(home, "/")).toBe(false);
      expect(isItemActive(home, "/dashboard/nested")).toBe(false);
    });

    it("matches Plan for /intelligence and subtabs", () => {
      expect(isItemActive(plan, "/intelligence")).toBe(true);
      expect(isItemActive(plan, "/intelligence/tab")).toBe(true);
      expect(isItemActive(plan, "/other")).toBe(false);
    });

    it("matches Learn parent for /learn, /learn/topics/*, /learn/paths, /learning-paths, /missions/*", () => {
      expect(isItemActive(learnParent, "/learn")).toBe(true);
      expect(isItemActive(learnParent, "/learn/topics/graphs")).toBe(true);
      expect(isItemActive(learnParent, "/learn/paths")).toBe(true);
      expect(isItemActive(learnParent, "/learning-paths/dsa-beginner")).toBe(true);
      expect(isItemActive(learnParent, "/missions/binary-search")).toBe(true);
      expect(isItemActive(learnParent, "/practice")).toBe(false);
    });

    it("matches Learn child lenses accurately", () => {
      expect(isChildActive(topics, "/learn/topics")).toBe(true);
      expect(isChildActive(topics, "/learn/topics/dynamic-programming")).toBe(true);
      expect(isChildActive(topics, "/learn/paths")).toBe(false);

      expect(isChildActive(paths, "/learn/paths")).toBe(true);
      expect(isChildActive(paths, "/learning-paths/blind-75")).toBe(true);
      expect(isChildActive(paths, "/learn/topics")).toBe(false);

      expect(isChildActive(missions, "/missions")).toBe(true);
      expect(isChildActive(missions, "/missions/array-mastery")).toBe(true);
      expect(isChildActive(missions, "/learn/paths")).toBe(false);
    });

    it("matches Practice parent and child lenses accurately", () => {
      expect(isItemActive(practiceParent, "/practice")).toBe(true);
      expect(isItemActive(practiceParent, "/practice/problems/two-sum")).toBe(true);
      expect(isItemActive(practiceParent, "/patterns")).toBe(true);
      expect(isItemActive(practiceParent, "/patterns/sliding-window")).toBe(true);

      expect(isChildActive(problems, "/practice")).toBe(true);
      expect(isChildActive(problems, "/practice/problems/two-sum")).toBe(true);
      expect(isChildActive(problems, "/patterns")).toBe(false);

      expect(isChildActive(patterns, "/patterns")).toBe(true);
      expect(isChildActive(patterns, "/patterns/sliding-window")).toBe(true);
      expect(isChildActive(patterns, "/practice")).toBe(false);
    });

    it("matches Review for /revision routes", () => {
      expect(isItemActive(review, "/revision")).toBe(true);
      expect(isItemActive(review, "/revision/session/123")).toBe(true);
      expect(isItemActive(review, "/practice")).toBe(false);
    });

    it("matches Progress for /progress routes", () => {
      expect(isItemActive(progress, "/progress")).toBe(true);
      expect(isItemActive(progress, "/progress/mastery")).toBe(true);
      expect(isItemActive(progress, "/dashboard")).toBe(false);
    });

    it("matches Company Prep for both /interview and /companies routes", () => {
      expect(isItemActive(companyPrep, "/interview")).toBe(true);
      expect(isItemActive(companyPrep, "/interview/meta")).toBe(true);
      expect(isItemActive(companyPrep, "/companies")).toBe(true);
      expect(isItemActive(companyPrep, "/companies/google")).toBe(true);
      expect(isItemActive(companyPrep, "/progress")).toBe(false);
    });

    it("correctly identifies active parent ID for auto-expansion", () => {
      expect(getActiveParentId("/learn/topics/linked-list")).toBe("learn-parent");
      expect(getActiveParentId("/missions/graph-bfs")).toBe("learn-parent");
      expect(getActiveParentId("/learn/paths/neetcode")).toBe("learn-parent");
      expect(getActiveParentId("/patterns/two-pointers")).toBe("practice-parent");
      expect(getActiveParentId("/practice/problems/3sum")).toBe("practice-parent");
      expect(getActiveParentId("/dashboard")).toBeNull();
      expect(getActiveParentId("/revision")).toBeNull();
    });
  });
});

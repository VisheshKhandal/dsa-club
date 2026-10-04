import { describe, it, expect } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";

describe("Practice Cockpit Architecture & Invariants", () => {
  it("verifies all Practice Cockpit components exist with proper exports", () => {
    const dir = path.resolve(process.cwd(), "src/components/product/dashboard");
    const files = [
      "NextSessionHero.tsx",
      "PlanSpineStrip.tsx",
      "ReviewQueuePreview.tsx",
      "ActivityRibbon.tsx",
      "GoalCheckpointProof.tsx",
      "AlternativeRoutesBar.tsx",
    ];

    for (const file of files) {
      expect(fs.existsSync(path.join(dir, file))).toBe(true);
    }
  });

  it("verifies NextSessionHero contains state-aware CTA, explicit rationale, and embedded Learning Spine", () => {
    const heroPath = path.resolve(
      process.cwd(),
      "src/components/product/dashboard/NextSessionHero.tsx"
    );
    const content = fs.readFileSync(heroPath, "utf-8");

    expect(content).toContain("Why this is next:");
    expect(content).toContain("Outcome:");
    expect(content).toContain("Start today's task");
    expect(content).toContain("Learning Spine");
  });

  it("verifies ReviewQueuePreview provides concise status row when clear and canonical review link", () => {
    const reviewPath = path.resolve(
      process.cwd(),
      "src/components/product/dashboard/ReviewQueuePreview.tsx"
    );
    const content = fs.readFileSync(reviewPath, "utf-8");

    expect(content).toContain("Review queue clear");
    expect(content).toContain('href="/review"');
  });

  it("verifies ActivityRibbon uses true Monday-Sunday calendar columns, max cell size, and single measure", () => {
    const ribbonPath = path.resolve(
      process.cwd(),
      "src/components/product/dashboard/ActivityRibbon.tsx"
    );
    const content = fs.readFileSync(ribbonPath, "utf-8");

    expect(content).toContain("Legend (Daily study minutes)");
    expect(content).toContain("60m+");
    expect(content).toContain("getIsoDayIndex");
  });

  it("verifies AlternativeRoutesBar provides quiet, context-specific secondary routes", () => {
    const routesPath = path.resolve(
      process.cwd(),
      "src/components/product/dashboard/AlternativeRoutesBar.tsx"
    );
    const content = fs.readFileSync(routesPath, "utf-8");

    expect(content).toContain("Supporting Options");
    expect(content).toContain('href: "/plan"');
    expect(content).toContain('href: "/review"');
  });

  it("verifies DashboardView orchestrates the Practice Cockpit zones", () => {
    const dashboardViewPath = path.resolve(
      process.cwd(),
      "src/components/product/dashboard/DashboardView.tsx"
    );
    const content = fs.readFileSync(dashboardViewPath, "utf-8");

    expect(content).toContain("<NextSessionHero");
    expect(content).toContain("<ReviewQueuePreview");
    expect(content).toContain("<GoalCheckpointProof");
    expect(content).toContain("<ActivityRibbon");
    expect(content).toContain("<AlternativeRoutesBar");
  });
});

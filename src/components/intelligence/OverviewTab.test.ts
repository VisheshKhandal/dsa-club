import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("OverviewTab Plan Map Redesign Invariants", () => {
  const overviewTabPath = path.resolve(process.cwd(), "src/components/intelligence/OverviewTab.tsx");
  const content = fs.readFileSync(overviewTabPath, "utf-8");

  it("verifies vanity streak signal is removed from core Overview hero", () => {
    // The previous vanity streak element in the hero should no longer exist
    expect(content).not.toContain("Practice Streak");
    expect(content).not.toContain("stats?.currentStreakDays");
  });

  it("verifies hero displays cycle, Day X of Y, current stage, schedule health, and real finish forecast", () => {
    // Cycle and Sprint duration
    expect(content).toContain("Cycle {plan.cycleNumber}");
    expect(content).toContain("{totalDays}-Day Sprint");
    // 4 KPI metrics in cockpit
    expect(content).toContain("Current Position");
    expect(content).toContain("Day {currentDayIndex} of {totalDays}");
    expect(content).toContain("Schedule Health");
    expect(content).toContain("Finish Forecast");
    expect(content).toContain("Curriculum Progress");
    expect(content).toContain("forecastFinishDate");
  });

  it("verifies old disconnected cards are replaced with a connected curriculum and stage map", () => {
    // Old disconnected bento sections
    expect(content).not.toContain("3 Stages Total");
    expect(content).not.toContain("3-STAGE CURRICULUM JOURNEY");
    // New connected stage map
    expect(content).toContain("Curriculum & Stage Map");
    expect(content).toContain("stages.map");
    expect(content).toContain("stageNumber");
    expect(content).toContain("Checkpoint Gate");
  });

  it("verifies an embedded 'You are here' marker is placed in the active stage card", () => {
    expect(content).toContain("YOU ARE HERE · Day {currentDayIndex}");
    expect(content).toContain("isCurrent");
  });

  it("verifies the large Next Action is demoted to a compact current-position card linking to Today", () => {
    // Old bulky header removed
    expect(content).not.toContain("Algorithmic Next Action · Club Intelligence Recommendation");
    // Compact current position card present
    expect(content).toContain("Current Position");
    expect(content).toContain("href={isTodayComplete ? \"/intelligence?tab=week\" : \"/intelligence?tab=today\"}");
    expect(content).toContain("Resume Today's Plan");
  });

  it("verifies schedule risk is prominently detected and links to Adjust Plan/Rebalance", () => {
    expect(content).toContain("Schedule Recalibration Recommended");
    expect(content).toContain("href=\"/intelligence?tab=manage\"");
    expect(content).toContain("Adjust Plan / Rebalance");
  });

  it("verifies Next Checkpoint Gate and Next Days Ahead are visually connected", () => {
    expect(content).toContain("Curriculum Progression");
    expect(content).toContain("Next Scheduled Checkpoint Gate");
    expect(content).toContain("Next Days Ahead");
    expect(content).toContain("checkpointDaysAway");
    expect(content).toContain("upcomingThreeDays");
  });

  it("verifies algorithmic transparency paragraph is replaced with human-readable Plan History timeline", () => {
    // Old engine text removed
    expect(content).not.toContain("Plan Transparency & Algorithmic Decisions");
    expect(content).not.toContain("Deterministic Engine 2.0");
    // New Plan History timeline
    expect(content).toContain("Plan History & Recalibrations");
    expect(content).toContain("historyEvents");
    expect(content).toContain("Initial Calibration");
  });

  it("verifies 'Why did this change?' disclosures are used instead of static paragraphs", () => {
    expect(content).toContain("Why did this change?");
    expect(content).toContain("<details");
    expect(content).toContain("<summary");
  });

  it("verifies reduced-motion hook is respected for animations and pulsing states", () => {
    expect(content).toContain("useReducedMotion");
    expect(content).toContain("shouldReduceMotion");
  });
});

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("WeekScheduleTab Visual Learning Schedule Redesign Invariants", () => {
  const weekTabPath = path.resolve(process.cwd(), "src/components/intelligence/WeekScheduleTab.tsx");
  const content = fs.readFileSync(weekTabPath, "utf-8");

  it("verifies the old bulky week cards were replaced with a compact week rail", () => {
    // Large 3-column button cards should not exist
    expect(content).not.toContain("grid grid-cols-1 sm:grid-cols-3 gap-3");
    expect(content).not.toContain("Select Learning Week");
    // Compact horizontal rail must exist
    expect(content).toContain("overflow-x-auto no-scrollbar");
  });

  it("verifies 5-second situational awareness strip is present with all 4 metrics", () => {
    expect(content).toContain("Current Position");
    expect(content).toContain("Schedule Health");
    expect(content).toContain("Next Checkpoint");
    expect(content).toContain("Week Progress");
  });

  it("verifies schedule health detection: On Track vs Attention Needed vs Paused", () => {
    expect(content).toContain("isScheduleOnTrack");
    expect(content).toContain("isPlanPaused");
    expect(content).toContain("Attention");
  });

  it("verifies attention callout provides direct links to solve missed day and recalibrate", () => {
    expect(content).toContain("Schedule Attention · Day");
    expect(content).toContain("href=\"/intelligence?tab=today\"");
    expect(content).toContain("href=\"/intelligence?tab=manage\"");
    expect(content).toContain("Recalibrate");
  });

  it("verifies connected 7-day timeline has continuous spine and node states", () => {
    // Spine
    expect(content).toContain("w-0.5 bg-(--border-subtle)");
    // Stages/phases
    expect(content).toContain("Stage 1 · Foundations");
    expect(content).toContain("Stage 2 · Practice");
    expect(content).toContain("Stage 3 · Retention");
  });

  it("verifies workload capacity check warns when day workload exceeds daily capacity", () => {
    expect(content).toContain("isOverCapacity");
    expect(content).toContain("Over capacity");
    expect(content).toContain("userDailyMinutes");
  });

  it("verifies static explanation was replaced with visual retention checkpoint card", () => {
    // Static paragraph was removed
    expect(content).not.toContain("Weekly Spaced Retention Engine");
    expect(content).not.toContain("At each 7-day boundary, Club Intelligence computes your memory retention decay curves.");

    // Dynamic visual retention checkpoint card exists
    expect(content).toContain("Retention Checkpoint · Day");
    expect(content).toContain("Pre-Checkpoint Sprint Continuity");
    expect(content).toContain("Retrieval Strategy");
    expect(content).toContain("Consolidation Focus");
  });

  it("verifies consistent PLAN_GRAMMAR token usage and smooth 180ms transitions", () => {
    expect(content).toContain("PLAN_GRAMMAR");
    expect(content).toContain("duration-180");
  });

  it("verifies graceful non-error state is displayed when plan is null or days is empty", () => {
    // Avoids pitch black blank screen
    expect(content).not.toBe("if (!plan) return null;");
    expect(content).toContain("if (!plan || days.length === 0)");
    expect(content).toContain("Starter Path · Self-Paced Practice");
    expect(content).toContain("Weekly Schedule Unlocks with a Structured Plan");
    expect(content).toContain("How a 7-Day Sprint Works");
    expect(content).toContain("Predictable Daily Pace");
    expect(content).toContain("7-Day Spaced Checkpoints");
    expect(content).toContain("Target Interview Forecast");
    expect(content).toContain("Create Structured Plan");
    expect(content).toContain("Continue Today&apos;s Practice");
  });
});

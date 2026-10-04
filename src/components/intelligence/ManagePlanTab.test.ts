import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("ManagePlanTab Configuration & Live Impact Experience Invariants", () => {
  const managePlanTabPath = path.resolve(
    process.cwd(),
    "src/components/intelligence/ManagePlanTab.tsx"
  );
  const content = fs.readFileSync(managePlanTabPath, "utf-8");

  it("moves Plan Mode near the top: Structured Plan vs Self-Paced", () => {
    // Plan Mode switcher should be placed before the two-column configuration
    const planModeIndex = content.indexOf("Plan Mode");
    const twoColIndex = content.indexOf("lg:grid-cols-12");
    expect(planModeIndex).toBeGreaterThan(-1);
    expect(planModeIndex).toBeLessThan(twoColIndex);

    // Both modes must be represented
    expect(content).toContain("Structured Plan");
    expect(content).toContain("Self-Paced Practice");
  });

  it("focuses normal configuration on three clean groups: Time & Availability, Learning Focus, Current Level", () => {
    // 3 primary groups
    expect(content).toContain("Time & Availability");
    expect(content).toContain("Learning Focus");
    expect(content).toContain("Current Level & Difficulty");

    // Time & Availability controls
    expect(content).toContain("Daily Minutes Target");
    expect(content).toContain("Daily Problems Target");
    expect(content).toContain("Study Days per Week");
    expect(content).toContain("Target / Interview Date (Optional)");

    // Learning Focus controls
    expect(content).toContain("Primary Focus Topic");
    expect(content).toContain("Target Milestone Goal");
    expect(content).toContain("Programming Language");

    // Current Level controls
    expect(content).toContain("Current Skill Level");
    expect(content).toContain("Progression Curve");
  });

  it("replaces the always-visible large topic grid with a compact selected-focus control that opens a searchable selector", () => {
    // No large static grid taking up the entire page
    expect(content).toContain("isTopicSelectorOpen");
    expect(content).toContain("setIsTopicSelectorOpen(true)");
    expect(content).toContain("Change Topic...");

    // Searchable modal with search query input and category filter
    expect(content).toContain("topicSearchQuery");
    expect(content).toContain("Search topics by name, concept, or pattern...");
    expect(content).toContain("selectedTopicCategory");
    expect(content).toContain("CANONICAL_TOPIC_CATALOG");
  });

  it("keeps advanced scheduling and catch-up options behind progressive disclosure", () => {
    expect(content).toContain("isAdvancedSchedulingOpen");
    expect(content).toContain("Advanced Scheduling & Catch-Up Policy");
    expect(content).toContain("Missed-Day Catch-Up Preference");
    expect(content).toContain("Unavailable Dates / Study Blackouts");

    // Catch-up strategies supported
    expect(content).toContain("rebalance_forward");
    expect(content).toContain("accelerate");
    expect(content).toContain("buffer_day");
  });

  it("moves Pause and End/Stop Plan away from primary hero into secondary plan controls / danger zone", () => {
    // Secondary controls
    expect(content).toContain("Schedule Controls");
    expect(content).toContain("Pause Active Cycle");
    expect(content).toContain("Resume Frozen Schedule");

    // Danger Zone
    expect(content).toContain("Danger Zone");
    expect(content).toContain("Stop Structured Plan");
    expect(content).toContain("showStopModal");
    expect(content).toContain("Important Difference from Pausing");
  });

  it("uses a responsive two-column layout on desktop: settings left, sticky Live Plan Impact preview right", () => {
    expect(content).toContain("lg:grid-cols-12");
    expect(content).toContain("lg:col-span-7");
    expect(content).toContain("lg:col-span-5");
    expect(content).toContain("lg:sticky");
    expect(content).toContain("Live Plan Impact");
  });

  it("calculates and displays real before -> after differences in the Live Plan Impact preview without hardcoding", () => {
    // Real diff derivation from active plan and preview
    expect(content).toContain("previewResult?.diff?.durationDiff");
    expect(content).toContain("dailyMinutes - initialMinutes");
    expect(content).toContain("dailyProblems - initialProblems");
    expect(content).toContain("createPlanPreviewAction");

    // Preserved progress continuity guarantee
    expect(content).toContain("Progress Continuity Guaranteed");
    expect(content).toContain("All historical problem solves, streaks, and XP remain 100% preserved");
  });

  it("disables Apply until changes occur and formats dynamic CTA 'Apply N Changes'", () => {
    // Change tracker
    expect(content).toContain("changesCount");
    expect(content).toContain("disabled={changesCount === 0 || isPending || isPreviewLoading}");
    expect(content).toContain("`Apply ${changesCount} Change${changesCount > 1 ? \"s\" : \"\"}`");
  });

  it("provides an Undo opportunity after applying changes with countdown and rollback", () => {
    expect(content).toContain("undoState");
    expect(content).toContain("handleUndo");
    expect(content).toContain("Undo ({undoState.secondsRemaining}s)");
    expect(content).toContain("secondsRemaining");
  });

  it("respects reduced-motion preferences with useReducedMotion", () => {
    expect(content).toContain("useReducedMotion");
    expect(content).toContain("shouldReduceMotion");
  });
});

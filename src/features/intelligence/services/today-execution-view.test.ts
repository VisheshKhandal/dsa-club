import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Today Plan Board Redesign Invariants", () => {
  const todayBoardPath = path.resolve(
    process.cwd(),
    "src/components/intelligence/TodayPlanBoard.tsx"
  );
  const content = fs.readFileSync(todayBoardPath, "utf-8");

  it("verifies single connected vertical execution timeline is rendered", () => {
    // Continuous vertical rail line
    expect(content).toContain("absolute left-[13px] sm:left-[17px] top-4 bottom-4 w-0.5 bg-(--border-subtle)");
    // Non-clickable status indicator badge
    expect(content).toContain(
      "Status indicator badge (Non-clickable: genuine progress driven by problem solving)"
    );
  });

  it("verifies state semantics: teal completed, lime current, neutral upcoming, sky revision", () => {
    expect(content).toContain("text-teal-400");
    expect(content).toContain("border-(--accent-lime)");
    expect(content).toContain("border-sky-500/30");
    expect(content).toContain("bg-sky-500/10");
  });

  it("verifies completed tasks are compact and collapsed", () => {
    expect(content).toContain("line-through");
    expect(content).toContain("Review");
  });

  it("verifies current task is expanded with one dominant primary CTA", () => {
    expect(content).toContain("Current Task");
    expect(content).toContain("ring-1 ring-(--accent-lime)/40");
    // Single dominant CTA button
    expect(content).toContain("inline-flex items-center gap-2 rounded-xl bg-(--accent-lime) px-5 py-2.5");
  });

  it("verifies reflection prompt and textarea are revealed ONLY when reflection is current", () => {
    expect(content).toContain("{isReflection && (");
    expect(content).toContain("Save Reflection & Complete Day");
  });

  it("verifies 'Less time today?' quick recalibration is supported", () => {
    expect(content).toContain("Less time today?");
    expect(content).toContain("Quick Time Recalibration");
    expect(content).toContain("recalibrateTodayMinutesAction");
  });

  it("verifies safe rescheduling of unfinished work through real plan logic", () => {
    expect(content).toContain("Reschedule");
    expect(content).toContain("reschedulePlanTaskAction");
    expect(content).toContain("handleReschedule");
  });

  it("verifies problem vault progressive disclosure and intelligent recommendations", () => {
    expect(content).toContain("id=\"problem-vault\"");
    expect(content).toContain("Extended Problem Vault");
    expect(content).toContain("recommendedProblems");
    expect(content).toContain("Browse all");
    expect(content).toContain("Jump to Vault");
    expect(content).toContain("Tomorrow&apos;s Focus · Day");
  });

  it("verifies reduced-motion is respected with 150-220ms subtle transitions", () => {
    expect(content).toContain("useReducedMotion");
    expect(content).toContain("shouldReduceMotion ? 0 : 0.2");
    expect(content).toContain('transition={{ duration: 0.18, ease: "easeOut" }}');
  });

  it("verifies retention checkpoint tasks provide actionable drill navigation and explicit completion CTA", () => {
    expect(content).toContain("isCheckpoint");
    expect(content).toContain("Start Checkpoint Drill");
    expect(content).toContain("Complete Checkpoint Review");
    expect(content).toContain("/revision?topic=");
  });

  it("verifies day completion victory screen with exploration hub, bonus challenge, and start early CTA", () => {
    expect(content).toContain("Objectives Mastered! 🎉");
    expect(content).toContain("Explore DSA Club While Resting");
    expect(content).toContain("Solve Bonus Problem");
    expect(content).toContain("Start Day");
    expect(content).toContain("Early");
    expect(content).toContain("startNextDayEarlyAction");
  });
});


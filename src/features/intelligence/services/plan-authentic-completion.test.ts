import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Plan Authentic Completion & UI Invariants", () => {
  const todayBoardPath = path.resolve(process.cwd(), "src/components/intelligence/TodayPlanBoard.tsx");
  const productActionsPath = path.resolve(process.cwd(), "src/features/product/actions/product.actions.ts");

  it("verifies TodayPlanBoard contains NO 'Mark Done' button", () => {
    const content = fs.readFileSync(todayBoardPath, "utf-8");
    expect(content).not.toContain("Mark Done");
  });

  it("verifies TodayPlanBoard does NOT allow clicking the status circle to toggle completion", () => {
    const content = fs.readFileSync(todayBoardPath, "utf-8");
    // Ensure the circle is not an interactive button with handleCompleteTask
    expect(content).not.toMatch(/<button[^>]*onClick=\{[^}]*handleCompleteTask[^}]*\}[^>]*>\s*\{isCompleted \?/);
    // Ensure non-clickable status indicator badge exists
    expect(content).toContain("Status indicator badge (Non-clickable: genuine progress driven by problem solving)");
  });

  it("verifies TodayPlanBoard includes Tomorrow's Focus preview and Problem Vault CTA", () => {
    const content = fs.readFileSync(todayBoardPath, "utf-8");
    expect(content).toContain("Tomorrow&apos;s Focus · Day");
    expect(content).toContain("Extended Problem Vault");
    expect(content).toContain("id=\"problem-vault\"");
    expect(content).toContain("Jump to Vault");
  });

  it("verifies product.actions.ts does not perform raw blind PlanTaskModel.updateMany", () => {
    const content = fs.readFileSync(productActionsPath, "utf-8");
    // Ensure the raw PlanTaskModel.updateMany bypass was eliminated
    expect(content).not.toContain("PlanTaskModel.updateMany");
    // Ensure problem attempt solving routes through reconcileTaskCompletion
    expect(content).toContain("reconcileTaskCompletion");
  });
});

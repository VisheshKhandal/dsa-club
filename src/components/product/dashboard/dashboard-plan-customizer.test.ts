import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Dashboard Plan Customizer & Skip Redirection Guards", () => {
  it("verifies ProductLayout allows both completed and skipped status users", () => {
    const layoutPath = path.resolve(process.cwd(), "src/app/(product)/layout.tsx");
    const content = fs.readFileSync(layoutPath, "utf-8");

    expect(content).toContain('status !== "completed" && status !== "skipped"');
    expect(content).not.toBe('if (profile?.onboarding?.status !== "completed") redirect("/onboarding");');
  });

  it("verifies HomePage allows both completed and skipped status users", () => {
    const homePath = path.resolve(process.cwd(), "src/app/page.tsx");
    const content = fs.readFileSync(homePath, "utf-8");

    expect(content).toContain('status === "completed" || profile?.onboarding?.status === "skipped"');
  });

  it("verifies OnboardingWizard uses window.location.assign and hides skip in calibrate mode", () => {
    const wizardPath = path.resolve(process.cwd(), "src/components/onboarding/onboarding-wizard.tsx");
    const content = fs.readFileSync(wizardPath, "utf-8");

    expect(content).toContain('window.location.assign("/dashboard")');
    expect(content).toContain('!isCalibrateMode && (');
    expect(content).toContain('Skip setup');
  });

  it("verifies DashboardPlanCustomizer has authentic title and in-place controls", () => {
    const customizerPath = path.resolve(
      process.cwd(),
      "src/components/product/dashboard/DashboardPlanCustomizer.tsx"
    );
    const content = fs.readFileSync(customizerPath, "utf-8");

    expect(content).toContain("You can customize your plan here");
    expect(content).toContain("Daily Time Commitment");
    expect(content).toContain("Experience Level");
    expect(content).toContain("Language Preference");
    expect(content).toContain("Learning Focus");
    expect(content).toContain("Target Companies");
    expect(content).toContain("Save & Apply Plan");
    expect(content).toContain("Cancel / Back to Dashboard");
  });

  it("verifies DashboardView integrates ClubIntelligenceCard and navigation links", () => {
    const dashboardViewPath = path.resolve(
      process.cwd(),
      "src/components/product/dashboard/DashboardView.tsx"
    );
    const content = fs.readFileSync(dashboardViewPath, "utf-8");

    expect(content).toContain("ClubIntelligenceCard");
    expect(content).toContain("/intelligence");
  });
});

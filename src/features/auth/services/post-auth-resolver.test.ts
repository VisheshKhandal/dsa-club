import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolvePostAuthRedirect } from "./post-auth-resolver.service";
import * as rbac from "@/lib/rbac";
import * as onboardingService from "@/features/onboarding/services/onboarding.service";

vi.mock("@/lib/rbac", () => ({
  isAdminEmail: vi.fn(),
}));

vi.mock("@/features/onboarding/services/onboarding.service", () => ({
  getOnboardingProfile: vi.fn(),
}));

describe("resolvePostAuthRedirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes admin emails to /studio regardless of onboarding status", async () => {
    vi.mocked(rbac.isAdminEmail).mockReturnValue(true);

    const dest = await resolvePostAuthRedirect({
      userId: "user-admin",
      email: "admin@dsaclub.dev",
      callbackUrl: "/practice",
    });

    expect(dest).toBe("/studio");
    expect(onboardingService.getOnboardingProfile).not.toHaveBeenCalled();
  });

  it("routes users with incomplete onboarding to /onboarding", async () => {
    vi.mocked(rbac.isAdminEmail).mockReturnValue(false);
    vi.mocked(onboardingService.getOnboardingProfile).mockResolvedValue({
      onboarding: { status: "in_progress", currentStep: 2 },
    } as never);

    const dest = await resolvePostAuthRedirect({
      userId: "user-incomplete",
      email: "learner@dsaclub.dev",
      callbackUrl: "/practice",
    });

    expect(dest).toBe("/onboarding");
  });

  it("routes users without an onboarding profile to /onboarding", async () => {
    vi.mocked(rbac.isAdminEmail).mockReturnValue(false);
    vi.mocked(onboardingService.getOnboardingProfile).mockResolvedValue(null);

    const dest = await resolvePostAuthRedirect({
      userId: "user-new",
      email: "newbie@dsaclub.dev",
    });

    expect(dest).toBe("/onboarding");
  });

  it("routes completed users to /dashboard by default when no callbackUrl", async () => {
    vi.mocked(rbac.isAdminEmail).mockReturnValue(false);
    vi.mocked(onboardingService.getOnboardingProfile).mockResolvedValue({
      onboarding: { status: "completed" },
    } as never);

    const dest = await resolvePostAuthRedirect({
      userId: "user-complete",
      email: "grad@dsaclub.dev",
    });

    expect(dest).toBe("/dashboard");
  });

  it("routes completed users to safe internal callbackUrl", async () => {
    vi.mocked(rbac.isAdminEmail).mockReturnValue(false);
    vi.mocked(onboardingService.getOnboardingProfile).mockResolvedValue({
      onboarding: { status: "completed" },
    } as never);

    const dest = await resolvePostAuthRedirect({
      userId: "user-complete",
      email: "grad@dsaclub.dev",
      callbackUrl: "/practice?tag=binary-tree",
    });

    expect(dest).toBe("/practice?tag=binary-tree");
  });

  it("rejects unsafe or circular callbackUrls and falls back to /dashboard", async () => {
    vi.mocked(rbac.isAdminEmail).mockReturnValue(false);
    vi.mocked(onboardingService.getOnboardingProfile).mockResolvedValue({
      onboarding: { status: "completed" },
    } as never);

    const blockedCases = [
      "https://external-malicious.com",
      "//evil.com",
      "/login",
      "/register",
      "/forgot-password",
      "/profile",
      "/account",
    ];

    for (const badCallback of blockedCases) {
      const dest = await resolvePostAuthRedirect({
        userId: "user-complete",
        email: "grad@dsaclub.dev",
        callbackUrl: badCallback,
      });
      expect(dest).toBe("/dashboard");
    }
  });

  it("routes to /onboarding if userId is missing", async () => {
    vi.mocked(rbac.isAdminEmail).mockReturnValue(false);

    const dest = await resolvePostAuthRedirect({
      email: "nouser@dsaclub.dev",
    });

    expect(dest).toBe("/onboarding");
  });

  it("routes users with skipped onboarding to /dashboard without looping back to /onboarding", async () => {
    vi.mocked(rbac.isAdminEmail).mockReturnValue(false);
    vi.mocked(onboardingService.getOnboardingProfile).mockResolvedValue({
      onboarding: { status: "skipped" },
    } as never);

    const dest = await resolvePostAuthRedirect({
      userId: "user-skipped",
      email: "skipper@dsaclub.dev",
    });

    expect(dest).toBe("/dashboard");
  });
});

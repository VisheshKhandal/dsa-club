import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  ONBOARDING_STEPS,
  resolveInitialStepId,
  STEP_LABELS,
} from "./utils/onboarding-steps";
import {
  onboardingSchema,
  onboardingDraftSchema,
  type OnboardingInput,
} from "./validators/onboarding.validators";
import {
  planRoadmapStages,
  generateRoadmapPreview,
  hasCompletePreviewInputs,
} from "./planning";

describe("Redesigned DSA Club Onboarding Suite", () => {
  const wizardPath = path.resolve(process.cwd(), "src/components/onboarding/onboarding-wizard.tsx");
  const wizardContent = fs.readFileSync(wizardPath, "utf-8");

  describe("1. Flow Structure & Step Definitions", () => {
    it("defines 4 core decisions plus plan preview in ONBOARDING_STEPS", () => {
      expect(ONBOARDING_STEPS).toEqual(["goal", "level", "time", "language", "plan"]);
      expect(ONBOARDING_STEPS.length).toBe(5);
    });

    it("verifies the progress header displays 4 questions without counting plan", () => {
      expect(wizardContent).toContain("STEP_LABELS");
      expect(wizardContent).toContain("{STEP_LABELS[activeStep].index} of 4 · {STEP_LABELS[activeStep].name}");
      expect(STEP_LABELS.goal).toEqual({ index: 1, name: "Goal" });
      expect(STEP_LABELS.level).toEqual({ index: 2, name: "Starting point" });
      expect(STEP_LABELS.time).toEqual({ index: 3, name: "Realistic time" });
      expect(STEP_LABELS.language).toEqual({ index: 4, name: "Coding language" });
      expect(wizardContent).toContain("Math.round(progressPercent)");
    });

    it("verifies the expectation banner on Screen 1", () => {
      expect(wizardContent).toContain("4 quick choices · about a minute · change anytime.");
    });
  });

  describe("2. Screen 1: Goal & Optional Company Focus", () => {
    it("verifies all 6 goal choices including 'Not sure yet'", () => {
      expect(wizardContent).toContain("What are you learning DSA for?");
      expect(wizardContent).toContain("Build strong foundations");
      expect(wizardContent).toContain("Campus placement");
      expect(wizardContent).toContain("Internship");
      expect(wizardContent).toContain("Interview preparation");
      expect(wizardContent).toContain("Switch companies");
      expect(wizardContent).toContain("Not sure yet");
    });

    it("verifies the optional company disclosure", () => {
      expect(wizardContent).toContain("Add a company focus");
      expect(wizardContent).toContain("Optional · No company focus is valid");
      expect(wizardContent).toContain("customCompanyInput");
      expect(wizardContent).toContain("Target company name:");
    });
  });

  describe("3. Screen 2: Starting Point", () => {
    it("verifies respectful behavior-based choices without legacy 14-topic checklist", () => {
      expect(wizardContent).toContain("Where are you starting from?");
      expect(wizardContent).toContain("New to DSA");
      expect(wizardContent).toContain("Know the basics; building pattern intuition");
      expect(wizardContent).toContain("Solve problems; need interview depth");

      // Verify the old 14-topic selection grid is removed from this flow
      expect(wizardContent).not.toContain("I'm starting from scratch");
      expect(wizardContent).not.toContain("Select only if comfortable solving from scratch");
    });
  });

  describe("4. Screen 3: Realistic Daily Time", () => {
    it("presents 15, 30, 45, and 60 minute options with live plan hints and removes 3+ hours", () => {
      expect(wizardContent).toContain("How much time can you realistically give each day?");
      expect(wizardContent).toContain("15 minutes");
      expect(wizardContent).toContain("30 minutes");
      expect(wizardContent).toContain("45 minutes");
      expect(wizardContent).toContain("60 minutes");

      // Verify 3+ hours default option was removed from flow
      expect(wizardContent).not.toContain("3+ hours");
      expect(wizardContent).not.toContain("180 min");
    });
  });

  describe("5. Screen 4: Coding Language", () => {
    it("presents C++, Java, Python, and JavaScript with explanation of walkthrough scope", () => {
      expect(wizardContent).toContain("Which language do you prefer to code in?");
      expect(wizardContent).toContain("C++");
      expect(wizardContent).toContain("Java");
      expect(wizardContent).toContain("Python");
      expect(wizardContent).toContain("JavaScript");
      expect(wizardContent).toContain("Code walkthroughs, patterns, and hints will use this language");
    });
  });

  describe("6. Screen 5: Plan Preview & First Session Focus", () => {
    it("renders first DSA session as visual hero with editable preferences and expand toggle", () => {
      expect(wizardContent).toContain("Your first DSA session");
      expect(wizardContent).toContain("Today · First Session · Ready to start");
      expect(wizardContent).toContain("Today’s 3-step practice flow:");
      expect(wizardContent).toContain("Upcoming week schedule");
      expect(wizardContent).toContain("Show remaining week (Days 5–");
      expect(wizardContent).toContain("Start my first session");
      expect(wizardContent).toContain("Adaptive schedule:");
    });

    it("contains direct edit actions for each preference on the plan screen", () => {
      expect(wizardContent).toContain('title="Edit goal"');
      expect(wizardContent).toContain('title="Edit level"');
      expect(wizardContent).toContain('title="Edit daily time"');
      expect(wizardContent).toContain('title="Edit language"');
    });
  });

  describe("7. Validation & Schema Enforcement", () => {
    it("validates that selecting no company is completely valid", () => {
      const validNoCompany: OnboardingInput = {
        experienceLevel: "beginner",
        companySlugs: [],
        dailyMinutes: 15,
        language: "python",
        knownTopicSlugs: [],
        learningGoal: "not_sure",
      };

      const result = onboardingSchema.safeParse(validNoCompany);
      expect(result.success).toBe(true);
    });

    it("validates 15, 30, 45, and 60 minutes are accepted", () => {
      const times = [15, 30, 45, 60] as const;
      for (const time of times) {
        const input = {
          experienceLevel: "intermediate" as const,
          companySlugs: [],
          dailyMinutes: time,
          language: "java" as const,
          knownTopicSlugs: [],
          learningGoal: "foundation" as const,
        };
        const result = onboardingSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });

    it("requires customCompany with at least 2 chars only when 'other' is selected", () => {
      const invalidShort = {
        experienceLevel: "beginner" as const,
        companySlugs: ["other" as const],
        customCompany: "A",
        dailyMinutes: 30 as const,
        language: "cpp" as const,
        knownTopicSlugs: [],
        learningGoal: "interview" as const,
      };
      const resInvalid = onboardingSchema.safeParse(invalidShort);
      expect(resInvalid.success).toBe(false);

      const validWithCustom = {
        ...invalidShort,
        customCompany: "Netflix",
      };
      const resValid = onboardingSchema.safeParse(validWithCustom);
      expect(resValid.success).toBe(true);
    });

    it("parses partial drafts safely with onboardingDraftSchema", () => {
      const partialDraft = {
        dailyMinutes: 45 as const,
        learningGoal: "placement" as const,
      };
      const res = onboardingDraftSchema.safeParse(partialDraft);
      expect(res.success).toBe(true);
    });
  });

  describe("8. Draft Resume & Legacy Step Mapping", () => {
    it("resolves explicitly requested step from query parameter", () => {
      expect(resolveInitialStepId("time", 0, {}, false)).toBe("time");
      expect(resolveInitialStepId("language", 1, {}, false)).toBe("language");
      expect(resolveInitialStepId("plan", 3, {}, false)).toBe("plan");
    });

    it("starts at 'goal' in calibrate mode", () => {
      expect(resolveInitialStepId(null, 3, {}, true)).toBe("goal");
    });

    it("navigates to nearest unanswered screen for fresh drafts", () => {
      expect(resolveInitialStepId(null, 0, {}, false)).toBe("goal");
      expect(resolveInitialStepId(null, 0, { learningGoal: "foundation" }, false)).toBe("level");
      expect(
        resolveInitialStepId(null, 0, { learningGoal: "foundation", experienceLevel: "beginner" }, false)
      ).toBe("time");
      expect(
        resolveInitialStepId(
          null,
          0,
          { learningGoal: "foundation", experienceLevel: "beginner", dailyMinutes: 30 },
          false
        )
      ).toBe("language");
      expect(
        resolveInitialStepId(
          null,
          0,
          {
            learningGoal: "foundation",
            experienceLevel: "beginner",
            dailyMinutes: 30,
            language: "python",
          },
          false
        )
      ).toBe("plan");
    });

    it("maps legacy 8-step numeric indices gracefully", () => {
      expect(resolveInitialStepId(null, 0, {}, false)).toBe("goal");
      expect(resolveInitialStepId(null, 1, { learningGoal: "foundation" }, false)).toBe("level");
      expect(
        resolveInitialStepId(null, 2, { learningGoal: "foundation", experienceLevel: "beginner" }, false)
      ).toBe("time");
      expect(
        resolveInitialStepId(null, 3, { learningGoal: "foundation", experienceLevel: "beginner" }, false)
      ).toBe("time");
      expect(
        resolveInitialStepId(
          null,
          4,
          { learningGoal: "foundation", experienceLevel: "beginner", dailyMinutes: 30 },
          false
        )
      ).toBe("language");
      expect(
        resolveInitialStepId(
          null,
          7,
          {
            learningGoal: "foundation",
            experienceLevel: "beginner",
            dailyMinutes: 30,
            language: "python",
          },
          false
        )
      ).toBe("plan");
    });
  });

  describe("9. Skip & Calibration Integration", () => {
    it("features one calm starter plan route with neutral confirmation copy", () => {
      expect(wizardContent).toContain("Start with a starter plan");
      expect(wizardContent).toContain("Start with a starter plan?");
      expect(wizardContent).toContain("You’ll start with our standard foundational curriculum.");
      expect(wizardContent).toContain("Keep personalizing");
      expect(wizardContent).toContain("Use starter plan");
    });

    it("supports calibration mode with alternate CTA and hides skip route", () => {
      expect(wizardContent).toContain("isCalibrateMode");
      expect(wizardContent).toContain("Calibrate plan");
      expect(wizardContent).toContain('isCalibrateMode ? "Update my plan" : "Start my first session"');
      expect(wizardContent).toContain("!isCalibrateMode && (");
    });
  });

  describe("10. Motion, Accessibility & Visual Cleanliness", () => {
    it("uses direction-aware transitions and honors reduced motion", () => {
      expect(wizardContent).toContain("useReducedMotion()");
      expect(wizardContent).toContain("custom={direction}");
      expect(wizardContent).toContain("reduceMotion ? 0 :");
      expect(wizardContent).toContain("aria-live=\"polite\"");
    });

    it("manages heading focus on step changes", () => {
      expect(wizardContent).toContain("headingRef");
      expect(wizardContent).toContain("tabIndex={-1}");
      expect(wizardContent).toContain("headingRef.current?.focus()");
    });

    it("implements truthful save status with sequence protection and retry", () => {
      expect(wizardContent).toContain("saveStatus");
      expect(wizardContent).toContain("saveSeqRef");
      expect(wizardContent).toContain("Saving…");
      expect(wizardContent).toContain("Saved");
      expect(wizardContent).toContain("Save failed · Retry");
      expect(wizardContent).toContain("handleRetrySave");
    });

    it("maintains cohesive full-page canvas without legacy desktop split rail", () => {
      expect(wizardContent).not.toContain("lg:grid-cols-[0.65fr_1.35fr]");
      expect(wizardContent).not.toContain("How this shapes your plan:");
      expect(wizardContent).not.toContain("Takes ~2 minutes");
      expect(wizardContent).toContain("(--accent-lime)");
      expect(wizardContent).toContain("(--bg-app)");
    });

    it("has zero legacy purple or fuchsia color tokens", () => {
      expect(wizardContent).not.toContain("rgba(168,85,247");
      expect(wizardContent).not.toContain("rgba(91,33,182");
      expect(wizardContent).not.toContain("from-fuchsia-400");
      expect(wizardContent).not.toContain("text-purple");
      expect(wizardContent).not.toContain("#030008");
    });
  });

  describe("11. Preview & Generated Roadmap Parity", () => {
    it("guarantees preview first step matches planned stage order", () => {
      const input: OnboardingInput = {
        experienceLevel: "beginner",
        companySlugs: ["amazon"],
        dailyMinutes: 30,
        language: "python",
        knownTopicSlugs: [],
        learningGoal: "interview",
      };

      const stages = planRoadmapStages(input);
      const preview = generateRoadmapPreview(input);

      expect(preview).not.toBeNull();
      expect(stages[0].slug).toBe(preview!.firstStep.topicSlug);
      expect(stages[0].name).toBe(preview!.firstStep.topicName);
      expect(preview!.firstStep.estimatedMinutes).toBe(30);
    });
  });
});

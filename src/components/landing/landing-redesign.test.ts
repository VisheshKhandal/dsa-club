import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  LANDING_NAV_LINKS,
  HERO_CONTENT,
  PAIN_POINTS_CONTENT,
  LEARNING_LOOP_CONTENT,
  FEATURES_CONTENT,
  SOCIAL_PROOF_CONTENT,
  FINAL_CTA_CONTENT,
  FOOTER_CONTENT,
  ROTATING_PATTERN_PROBLEMS,
  LEARNER_STORY_CONTENT,
} from "./landing-content";

describe("DSA Club Interactive Landing Page V2 Verification", () => {
  const landingDir = path.resolve(process.cwd(), "src/components/landing");

  describe("Phase 0 — File Architecture & Cleanups", () => {
    it("confirms obsolete public-landing-page.tsx does not exist", () => {
      const obsoleteFile = path.join(landingDir, "public-landing-page.tsx");
      expect(fs.existsSync(obsoleteFile)).toBe(false);
    });

    it("confirms custom cursor file is completely deleted", () => {
      const customCursorFile = path.join(landingDir, "custom-cursor.tsx");
      expect(fs.existsSync(customCursorFile)).toBe(false);
    });

    it("confirms landing-page.tsx does not import or render CustomCursor", () => {
      const pagePath = path.join(landingDir, "landing-page.tsx");
      const content = fs.readFileSync(pagePath, "utf-8");
      expect(content).not.toContain("CustomCursor");
      expect(content).not.toContain("custom-cursor");
    });

    it("confirms landing-hero.tsx has removed floating/drifting notification badges", () => {
      const heroPath = path.join(landingDir, "landing-hero.tsx");
      const content = fs.readFileSync(heroPath, "utf-8");
      expect(content).not.toContain("Arrays revision due");
      expect(content).not.toContain("Sliding Window mastered");
      expect(content).not.toContain("Binary Search · 45 min");
    });

    it("verifies all required V2 landing files exist", () => {
      const expectedFiles = [
        "landing-page.tsx",
        "landing-nav.tsx",
        "landing-hero.tsx",
        "pain-point-section.tsx",
        "before-after-toggle.tsx",
        "learning-loop-section.tsx",
        "features-section.tsx",
        "features-interactive.tsx",
        "product-playground.tsx",
        "social-proof-section.tsx",
        "final-cta-section.tsx",
        "landing-footer.tsx",
        "landing-content.ts",
        "landing-motion.ts",
        "smooth-scroll-provider.tsx",
        "hero-product-preview.tsx",
        "click-ripple.tsx",
        "learner-story-section.tsx",
      ];

      expectedFiles.forEach((file) => {
        expect(fs.existsSync(path.join(landingDir, file))).toBe(true);
      });
    });

    it("verifies server vs client component separation", () => {
      // Server components: NO "use client" directive
      const serverFiles = [
        "landing-page.tsx",
        "features-section.tsx",
        "social-proof-section.tsx",
        "final-cta-section.tsx",
        "landing-footer.tsx",
      ];

      serverFiles.forEach((file) => {
        const content = fs.readFileSync(path.join(landingDir, file), "utf-8");
        expect(content.startsWith('"use client"') || content.startsWith("'use client'")).toBe(false);
      });

      // Client components: MUST have "use client" directive
      const clientFiles = [
        "landing-nav.tsx",
        "landing-hero.tsx",
        "learning-loop-section.tsx",
        "pain-point-section.tsx",
        "before-after-toggle.tsx",
        "smooth-scroll-provider.tsx",
        "hero-product-preview.tsx",
        "features-interactive.tsx",
        "product-playground.tsx",
        "click-ripple.tsx",
        "learner-story-section.tsx",
      ];

      clientFiles.forEach((file) => {
        const content = fs.readFileSync(path.join(landingDir, file), "utf-8");
        expect(content.startsWith('"use client"') || content.startsWith("'use client'")).toBe(true);
      });
    });
  });

  describe("Content Single Source of Truth (landing-content.ts)", () => {
    it("has correct navigation links", () => {
      expect(LANDING_NAV_LINKS).toEqual([
        { label: "How it works", href: "#how-it-works" },
        { label: "Features", href: "#features" },
        { label: "Learning paths", href: "#learning-path" },
      ]);
    });

    it("has exact hero copy and registration-first CTA", () => {
      expect(HERO_CONTENT.headline).toContain("Know what to learn");
      expect(HERO_CONTENT.primaryCta.label).toBe("Start free →");
      expect(HERO_CONTENT.primaryCta.href).toBe("/register?callbackUrl=/onboarding");
      expect(HERO_CONTENT.secondaryCta.label).toBe("See how it works");
      expect(HERO_CONTENT.trustLine).toBe("No credit card · Free to start · DSA only");
    });

    it("has 3 pain point cards with problems and responses", () => {
      expect(PAIN_POINTS_CONTENT.cards).toHaveLength(3);
      expect(PAIN_POINTS_CONTENT.cards[0].title).toBe("Too many resources, no sequence");
      expect(PAIN_POINTS_CONTENT.cards[0].response).toBe("A structured learning path gives you one clear next step.");
      expect(PAIN_POINTS_CONTENT.cards[1].title).toBe("Random practice, no pattern understanding");
      expect(PAIN_POINTS_CONTENT.cards[1].response).toBe("Every problem begins with pattern recognition before you write code.");
      expect(PAIN_POINTS_CONTENT.cards[2].title).toBe("No revision system, so concepts fade");
      expect(PAIN_POINTS_CONTENT.cards[2].response).toBe("Spaced review resurfaces concepts right as your retention curve begins to dip.");
    });

    it("has rotating pattern problems defined", () => {
      expect(ROTATING_PATTERN_PROBLEMS).toHaveLength(3);
      expect(ROTATING_PATTERN_PROBLEMS[0].title).toBe("Container With Most Water");
      expect(ROTATING_PATTERN_PROBLEMS[0].correctPattern).toBe("Two Pointer");
    });

    it("has 4-step learning loop pipeline", () => {
      expect(LEARNING_LOOP_CONTENT.steps).toHaveLength(4);
      expect(LEARNING_LOOP_CONTENT.steps.map((s) => s.label)).toEqual([
        "Learn",
        "Practice",
        "Revise",
        "Master",
      ]);
    });

    it("has 3 feature differentiators", () => {
      expect(FEATURES_CONTENT.features).toHaveLength(3);
      expect(FEATURES_CONTENT.features[0].label).toBe("STRUCTURED LEARNING");
      expect(FEATURES_CONTENT.features[1].label).toBe("PATTERN INTELLIGENCE");
      expect(FEATURES_CONTENT.features[2].label).toBe("REVISION ENGINE");
    });

    it("has social proof evidence metrics and honest early access statement", () => {
      expect(SOCIAL_PROOF_CONTENT.cards).toHaveLength(3);
      expect(SOCIAL_PROOF_CONTENT.honestBlock.text).toContain("currently in active development");
      expect(SOCIAL_PROOF_CONTENT.honestBlock.cta).toBe("Be among the first learners →");
      expect(SOCIAL_PROOF_CONTENT.honestBlock.href).toBe("/register?callbackUrl=/onboarding");
    });

    it("has final CTA and footer content", () => {
      expect(FINAL_CTA_CONTENT.headline).toBe("Open the app with a direction, not a blank page.");
      expect(FINAL_CTA_CONTENT.buttonLabel).toBe("Build my learning path →");
      expect(FINAL_CTA_CONTENT.buttonHref).toBe("/register?callbackUrl=/onboarding");
      expect(FINAL_CTA_CONTENT.loginHref).toBe("/login?callbackUrl=/dashboard");
      expect(FOOTER_CONTENT.copyright).toContain("DSA Club");
      expect(FOOTER_CONTENT.links).toHaveLength(2);
    });
  });

  describe("Phase 1 & 2: Hero Live Product Preview", () => {
    it("verifies hero-product-preview.tsx implements 3-state machine and calm feedback", () => {
      const heroPreviewPath = path.join(landingDir, "hero-product-preview.tsx");
      const content = fs.readFileSync(heroPreviewPath, "utf-8");

      expect(content).toContain("Mastering Binary Trees");
      expect(content).toContain("Inorder DFS");
      expect(content).toContain("BFS Level");
      expect(content).toContain("Binary Search");
      expect(content).toContain("Two Pointer");
      expect(content).toContain("52");
      expect(content).toContain("Start Practice →");
      expect(content).toContain("Try again");
      expect(content).toContain("rotate(-4deg)");
      expect(content).toContain("rotate(3deg)");
    });

    it("verifies landing-hero.tsx embeds HeroProductPreview cleanly", () => {
      const heroPath = path.join(landingDir, "landing-hero.tsx");
      const content = fs.readFileSync(heroPath, "utf-8");

      expect(content).toContain("HeroProductPreview");
    });
  });

  describe("Phase 3 & 4: Pain Points 3D Flip Cards & Before/After Toggle", () => {
    it("verifies pain-point-section.tsx implements 3D flip cards and embeds BeforeAfterToggle", () => {
      const painPath = path.join(landingDir, "pain-point-section.tsx");
      const content = fs.readFileSync(painPath, "utf-8");

      expect(content).toContain("perspective:1000px");
      expect(content).toContain("transform-style:preserve-3d");
      expect(content).toContain("backface-visibility:hidden");
      expect(content).toContain("rotateY(180deg)");
      expect(content).toContain("DSA Club Solution");
      expect(content).toContain("BeforeAfterToggle");
    });

    it("verifies before-after-toggle.tsx provides comparative breakdown with neutral without vs lime with", () => {
      const togglePath = path.join(landingDir, "before-after-toggle.tsx");
      const content = fs.readFileSync(togglePath, "utf-8");

      expect(content).toContain("Without structure");
      expect(content).toContain("With DSA Club");
      expect(content).toContain("Choose");
      expect(content).toContain("Solve");
      expect(content).toContain("Forget");
      expect(content).toContain("Restart");
      expect(content).toContain("Learn");
      expect(content).toContain("Practice");
      expect(content).toContain("Review");
      expect(content).toContain("Improve");
      expect(content).toContain("learner-session");
    });
  });

  describe("Phase 5: Learning Loop with Permanent Auto-Advance Halt", () => {
    it("verifies learning-loop-section.tsx stops auto-advance on manual interaction", () => {
      const loopPath = path.join(landingDir, "learning-loop-section.tsx");
      const content = fs.readFileSync(loopPath, "utf-8");

      expect(content).toContain("hasInteracted");
      expect(content).toContain("setHasInteracted(true)");
      expect(content).toContain("See it in action →");
      expect(content).toContain("Start a focused mission");
      expect(content).toContain("Which pattern fits?");
      expect(content).toContain("5 min revision");
      expect(content).toContain("Mastery Verification");
    });
  });

  describe("Phase 6 & 7: Features Interactive Explorer & Product Playground", () => {
    it("verifies features-interactive.tsx implements 3 clickable tabs", () => {
      const featuresPath = path.join(landingDir, "features-interactive.tsx");
      const content = fs.readFileSync(featuresPath, "utf-8");

      expect(content).toContain("Complete Arrays in Depth");
      expect(content).toContain("Mission Complete! 🎉");
      expect(content).toContain("ROTATING_PATTERN_PROBLEMS");
      expect(content).toContain("Next problem →");
      expect(content).toContain("Today's Revision");
      expect(content).toContain("What is the key insight for this problem?");
      expect(content).toContain("Reveal answer →");
    });

    it("verifies product-playground.tsx implements 4-step DSA Club method test", () => {
      const playgroundPath = path.join(landingDir, "product-playground.tsx");
      const content = fs.readFileSync(playgroundPath, "utf-8");

      expect(content).toContain("Try one pattern question");
      expect(content).toContain("Give me a problem →");
      expect(content).toContain("What pattern or approach fits?");
      expect(content).toContain("Pattern recognized:");
      expect(content).toContain("Why this approach?");
      expect(content).toContain("Try another problem");
    });

    it("verifies features-section.tsx embeds both FeaturesInteractive and ProductPlayground", () => {
      const featuresSectionPath = path.join(landingDir, "features-section.tsx");
      const content = fs.readFileSync(featuresSectionPath, "utf-8");

      expect(content).toContain('id="features"');
      expect(content).toContain("FeaturesInteractive");
      expect(content).toContain("ProductPlayground");
    });
  });

  describe("Phase 8: 30-Minute Concrete Learner Story Section", () => {
    it("verifies LEARNER_STORY_CONTENT defines honest 30-minute 3-action workflow and 1 result", () => {
      expect(LEARNER_STORY_CONTENT.label).toBe("Example learner session");
      expect(LEARNER_STORY_CONTENT.scenarioBadge).toBe("Typical 30-minute session");
      expect(LEARNER_STORY_CONTENT.headline).toContain("You have 30 minutes");
      expect(LEARNER_STORY_CONTENT.headline).toContain("DSA Club turns it into a focused DSA session");
      expect(LEARNER_STORY_CONTENT.totalDuration).toBe("30 minutes");

      expect(LEARNER_STORY_CONTENT.steps).toHaveLength(3);
      expect(LEARNER_STORY_CONTENT.steps[0].action).toBe("Review");
      expect(LEARNER_STORY_CONTENT.steps[0].duration).toBe("5 min");
      expect(LEARNER_STORY_CONTENT.steps[1].action).toBe("Learn");
      expect(LEARNER_STORY_CONTENT.steps[1].duration).toBe("10 min");
      expect(LEARNER_STORY_CONTENT.steps[2].action).toBe("Practice");
      expect(LEARNER_STORY_CONTENT.steps[2].duration).toBe("15 min");

      expect(LEARNER_STORY_CONTENT.result.headline).toBe("After the session");
      expect(LEARNER_STORY_CONTENT.result.text).toBe(
        "Your progress is recorded and your next learning step is clear."
      );
      expect(LEARNER_STORY_CONTENT.cta.href).toBe("#how-it-works");
      expect(LEARNER_STORY_CONTENT.previewAction.label).toBe("Build my learning path");
      expect(LEARNER_STORY_CONTENT.previewAction.href).toBe("/register?callbackUrl=/onboarding");
    });

    it("verifies learner-story-section.tsx implements two-column calm layout with timeline and preview", () => {
      const storyPath = path.join(landingDir, "learner-story-section.tsx");
      const content = fs.readFileSync(storyPath, "utf-8");

      // Accessibility and semantic attributes
      expect(content).toContain('id="learner-session"');
      expect(content).toContain('aria-labelledby="learner-session-heading"');

      // User-visible timeline actions and content mapping
      expect(content).toContain("LEARNER_STORY_CONTENT.steps.map");
      expect(content).toContain("step.action");
      expect(content).toContain("step.duration");
      expect(content).toContain("LEARNER_STORY_CONTENT.result");

      // Simplified marketing session preview
      expect(content).toContain("Example learner session");
      expect(content).toContain("Why this session?");
      expect(content).toContain("Active Topic");
      expect(content).toContain("Complete");
      expect(content).toContain("Current");
      expect(content).toContain("Next");

      // CTAs
      expect(content).toContain("how-it-works");
      expect(content).toContain("previewAction");

      // Verifies no tight coupling to internal dashboard components
      expect(content).not.toContain("TodaysPlanPanel");
      expect(content).not.toContain("ReviewDueSection");
      expect(content).not.toContain("CompactProgressStrip");
    });

    it("verifies landing-page.tsx places LearnerStorySection between PainPointSection and LearningLoopSection", () => {
      const pagePath = path.join(landingDir, "landing-page.tsx");
      const content = fs.readFileSync(pagePath, "utf-8");

      expect(content).toContain("LearnerStorySection");
      const painIndex = content.indexOf("<PainPointSection");
      const storyIndex = content.indexOf("<LearnerStorySection");
      const loopIndex = content.indexOf("<LearningLoopSection");

      expect(painIndex).toBeGreaterThan(-1);
      expect(storyIndex).toBeGreaterThan(painIndex);
      expect(loopIndex).toBeGreaterThan(storyIndex);
    });
  });

  describe("Phase 9: Design System & Color Normalization Audit", () => {
    it("confirms zero hardcoded purple hex values across landing components", () => {
      const files = fs.readdirSync(landingDir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
      const purpleHexes = ["7C3AED", "6D28D9", "A78BFA", "C4B5FD", "8B5CF6"];

      files.forEach((file) => {
        if (file === "landing-redesign.test.ts") return; // exclude test file itself
        const content = fs.readFileSync(path.join(landingDir, file), "utf-8");
        purpleHexes.forEach((hex) => {
          expect(content.toUpperCase()).not.toContain(hex);
        });
      });
    });

    it("confirms all anchor targets exist for landing navigation", () => {
      const loopContent = fs.readFileSync(path.join(landingDir, "learning-loop-section.tsx"), "utf-8");
      const featuresContent = fs.readFileSync(path.join(landingDir, "features-section.tsx"), "utf-8");
      const storyContent = fs.readFileSync(path.join(landingDir, "learner-story-section.tsx"), "utf-8");

      expect(loopContent).toContain('id="how-it-works"');
      expect(loopContent).toContain('id="learning-path"');
      expect(featuresContent).toContain('id="features"');
      expect(storyContent).toContain('id="learner-session"');
    });

    it("confirms consistent registration-first callback architecture", () => {
      expect(HERO_CONTENT.primaryCta.href).toBe("/register?callbackUrl=/onboarding");
      expect(LEARNER_STORY_CONTENT.previewAction.href).toBe("/register?callbackUrl=/onboarding");
      expect(FINAL_CTA_CONTENT.buttonHref).toBe("/register?callbackUrl=/onboarding");
      expect(FINAL_CTA_CONTENT.loginHref).toBe("/login?callbackUrl=/dashboard");
    });
  });
});

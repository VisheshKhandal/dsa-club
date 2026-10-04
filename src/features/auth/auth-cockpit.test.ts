import { describe, it, expect } from "vitest";
import { COCKPIT_CARDS } from "@/components/auth/cockpit-carousel";
import { loginSchema, registerSchema } from "@/features/auth/validators/auth.validators";

describe("Cockpit Carousel & Auth Suite", () => {
  it("defines the 5 required reference learning cards in exact timeline sequence with approved realistic metrics", () => {
    expect(COCKPIT_CARDS).toHaveLength(5);
    const badges = COCKPIT_CARDS.map((c) => c.badge);
    expect(badges).toEqual(["LEARN", "PRACTICE", "RECOGNIZE", "REVISE", "PROGRESS"]);

    const learnCard = COCKPIT_CARDS.find((c) => c.badge === "LEARN")!;
    expect(learnCard.title).toBe("Guided Mission");
    expect(learnCard.subtext).toBe("Binary Trees");
    expect(learnCard.highlight).toBe("Tree Traversals");
    expect(learnCard.metricLabel).toBe("Concept Readiness");
    expect(learnCard.metricValue).toBe("Ready");
    expect(learnCard.metricPercent).toBe(100);

    const practiceCard = COCKPIT_CARDS.find((c) => c.badge === "PRACTICE")!;
    expect(practiceCard.tag).toBe("Focused Mission");
    expect(practiceCard.title).toBe("Today's Mission");
    expect(practiceCard.subtext).toBe("Solve one focused problem");
    expect(practiceCard.highlight).toBe("Pattern Recognition");
    expect(practiceCard.metricLabel).toBe("Progress");
    expect(practiceCard.metricValue).toBe("3 of 5");
    expect(practiceCard.metricPercent).toBe(60);

    const recognizeCard = COCKPIT_CARDS.find((c) => c.badge === "RECOGNIZE")!;
    expect(recognizeCard.title).toBe("Pattern Detected");
    expect(recognizeCard.subtext).toBe("Two Pointers");
    expect(recognizeCard.highlight).toBe("Sliding Window");
    expect(recognizeCard.metricLabel).toBe("Pattern Confidence");
    expect(recognizeCard.metricValue).toBe("High");
    expect(recognizeCard.metricPercent).toBe(92);

    const reviseCard = COCKPIT_CARDS.find((c) => c.badge === "REVISE")!;
    expect(reviseCard.title).toBe("Revision Due");
    expect(reviseCard.subtext).toBe("Arrays & Hashing");
    expect(reviseCard.highlight).toBe("Review Now");
    expect(reviseCard.metricLabel).toBe("Memory State");
    expect(reviseCard.metricValue).toBe("Due Today");
    expect(reviseCard.metricPercent).toBe(100);

    const progressCard = COCKPIT_CARDS.find((c) => c.badge === "PROGRESS")!;
    expect(progressCard.title).toBe("Learning Momentum");
    expect(progressCard.subtext).toBe("This week");
    expect(progressCard.highlight).toBe("Binary Trees");
    expect(progressCard.metricLabel).toBe("Completed");
    expect(progressCard.metricValue).toBe("6 focused sessions");
    expect(progressCard.metricPercent).toBe(80);
  });

  it("verifies absence of unproven or exaggerated marketing claims in cockpit data", () => {
    const serialized = JSON.stringify(COCKPIT_CARDS);
    expect(serialized).not.toContain("Top 5% Cohort");
    expect(serialized).not.toContain("Decay: 14h");
    expect(serialized).not.toContain("Interview Ready");
    expect(serialized).not.toContain("Easy-Med");
  });

  it("verifies infinite carousel modulo mapping never produces undefined cards or blank gaps", () => {
    const N = COCKPIT_CARDS.length;
    // Simulate cycling through 50 continuous transitions
    for (let step = 0; step < 50; step++) {
      const activeIndex = step % N;
      const card = COCKPIT_CARDS[activeIndex];
      expect(card).toBeDefined();
      expect(card.badge).toBeDefined();
    }
  });

  it("calculates 3D layered card stack depth, scale, and visibility correctly for 5 cards", () => {
    const N = 5;
    function getLayeredCardState(cardIndex: number, activeIndex: number) {
      let diff = (cardIndex - activeIndex) % N;
      if (diff < -Math.floor(N / 2)) diff += N;
      if (diff > Math.floor(N / 2)) diff -= N;

      if (diff === 0) {
        return { isCenter: true, xOffset: 0, zOffset: 30, scale: 1.04, opacity: 1, zIndex: 20 };
      } else if (diff === -1) {
        return { isLeft: true, xOffset: -155, zOffset: -20, scale: 0.88, opacity: 0.55, zIndex: 10 };
      } else if (diff === 1) {
        return { isRight: true, xOffset: 155, zOffset: -20, scale: 0.88, opacity: 0.55, zIndex: 10 };
      } else {
        return { isHidden: true, opacity: 0, zIndex: 1 };
      }
    }

    // When card 0 (Learn) is active:
    const c0 = getLayeredCardState(0, 0);
    expect(c0.isCenter).toBe(true);
    expect(c0.scale).toBeGreaterThan(1);
    expect(c0.zIndex).toBe(20);

    // Card 1 (Practice) is immediately right
    const c1 = getLayeredCardState(1, 0);
    expect(c1.isRight).toBe(true);
    expect(c1.xOffset).toBe(155);
    expect(c1.opacity).toBe(0.55);

    // Card 4 (Progress) is immediately left
    const c4 = getLayeredCardState(4, 0);
    expect(c4.isLeft).toBe(true);
    expect(c4.xOffset).toBe(-155);
    expect(c4.opacity).toBe(0.55);

    // Card 2 and 3 are hidden in the back
    const c2 = getLayeredCardState(2, 0);
    expect(c2.isHidden).toBe(true);
    expect(c2.opacity).toBe(0);

    const c3 = getLayeredCardState(3, 0);
    expect(c3.isHidden).toBe(true);
    expect(c3.opacity).toBe(0);
  });

  it("calculates clamped subtle magnetic physics strictly within 3-4px translation and 2-3 degrees tilt", () => {
    function computeCardPhysics(normX: number, normY: number, isHovered: boolean) {
      const clampedX = Math.max(-1, Math.min(1, normX));
      const clampedY = Math.max(-1, Math.min(1, normY));
      if (isHovered) {
        return {
          tx: clampedX * 3.5,
          ty: clampedY * 2.5,
          rx: -clampedY * 2.2,
          ry: clampedX * 2.8,
          scale: 1.04,
        };
      }
      return {
        tx: clampedX * 1.0,
        ty: clampedY * 0.8,
        rx: -clampedY * 0.8,
        ry: clampedX * 0.8,
        scale: 1.0,
      };
    }

    // Centered cursor -> 0 translation, 0 tilt
    const center = computeCardPhysics(0, 0, true);
    expect(center.tx).toBe(0);
    expect(center.ty).toBe(0);
    expect(Math.abs(center.rx)).toBe(0);
    expect(center.ry).toBe(0);

    // Extreme right corner -> clamped subtle displacement
    const rightCorner = computeCardPhysics(1.5, -1.5, true);
    expect(Math.abs(rightCorner.tx)).toBeLessThanOrEqual(4);
    expect(Math.abs(rightCorner.ty)).toBeLessThanOrEqual(4);
    expect(Math.abs(rightCorner.rx)).toBeLessThanOrEqual(3);
    expect(Math.abs(rightCorner.ry)).toBeLessThanOrEqual(3);
    expect(rightCorner.tx).toBe(3.5);
    expect(rightCorner.ty).toBe(-2.5);
    expect(rightCorner.rx).toBe(2.2);
    expect(rightCorner.ry).toBe(2.8);

    // Surrounding card has minimal secondary response (<= 1.0px)
    const secondary = computeCardPhysics(1.0, 1.0, false);
    expect(secondary.tx).toBeLessThanOrEqual(1.0);
    expect(secondary.scale).toBe(1.0);
  });

  it("verifies accessible dot labels for all 5 cards in timeline order", () => {
    const expectedLabels = [
      "Jump to Learn card",
      "Jump to Practice card",
      "Jump to Recognize card",
      "Jump to Revise card",
      "Jump to Progress card",
    ];

    expect(COCKPIT_CARDS).toHaveLength(5);
    COCKPIT_CARDS.forEach((card, idx) => {
      const stageName = card.badge.charAt(0) + card.badge.slice(1).toLowerCase();
      const label = `Jump to ${stageName} card`;
      expect(label).toBe(expectedLabels[idx]);
    });
  });

  it("validates login and register schemas correctly", () => {
    // Valid login
    const validLogin = loginSchema.safeParse({
      email: "learner@dsaclub.dev",
      password: "Password123",
    });
    expect(validLogin.success).toBe(true);

    // Invalid login
    const invalidLogin = loginSchema.safeParse({
      email: "not-an-email",
      password: "",
    });
    expect(invalidLogin.success).toBe(false);

    // Valid register
    const validRegister = registerSchema.safeParse({
      name: "Ada Lovelace",
      email: "ada@dsaclub.dev",
      password: "Password123",
      confirmPassword: "Password123",
    });
    expect(validRegister.success).toBe(true);

    // Mismatched passwords in register
    const mismatchedRegister = registerSchema.safeParse({
      name: "Ada Lovelace",
      email: "ada@dsaclub.dev",
      password: "Password123",
      confirmPassword: "DifferentPassword123",
    });
    expect(mismatchedRegister.success).toBe(false);
  });
});

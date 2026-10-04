import { describe, it, expect } from "vitest";
import {
  motionEase,
  pageEnter,
  sectionEnter,
  popoverEnter,
  listEnter,
  listItemEnter,
  successEnter,
  fadeEnter,
  exitFade,
} from "./variants";
import * as MotionExports from "./index";

describe("Motion System Standards & Invariants", () => {
  it("uses the standardized cubic-bezier curve [0.16, 1, 0.3, 1]", () => {
    expect(motionEase).toEqual([0.16, 1, 0.3, 1]);
  });

  describe("pageEnter variant", () => {
    it("has subtle y offset (<= 10px) and restrained duration (<= 240ms)", () => {
      const hidden = pageEnter.hidden as any;
      const visible = pageEnter.visible as any;

      expect(hidden.opacity).toBe(0);
      expect(hidden.y).toBeLessThanOrEqual(10);
      expect(visible.opacity).toBe(1);
      expect(visible.y).toBe(0);
      expect(visible.transition.duration).toBeLessThanOrEqual(0.24);
      expect(visible.transition.ease).toEqual(motionEase);
    });
  });

  describe("sectionEnter variant", () => {
    it("has 4px y offset and 180ms duration", () => {
      const hidden = sectionEnter.hidden as any;
      const visible = sectionEnter.visible as any;

      expect(hidden.opacity).toBe(0);
      expect(hidden.y).toBe(4);
      expect(visible.opacity).toBe(1);
      expect(visible.y).toBe(0);
      expect(visible.transition.duration).toBe(0.18);
    });
  });

  describe("popoverEnter variant", () => {
    it("has rapid 160ms enter and 120ms exit", () => {
      const hidden = popoverEnter.hidden as any;
      const visible = popoverEnter.visible as any;
      const exit = popoverEnter.exit as any;

      expect(hidden.opacity).toBe(0);
      expect(hidden.y).toBe(-4);
      expect(visible.opacity).toBe(1);
      expect(visible.y).toBe(0);
      expect(visible.transition.duration).toBe(0.16);
      expect(exit.opacity).toBe(0);
      expect(exit.transition.duration).toBe(0.12);
    });
  });

  describe("listEnter & listItemEnter", () => {
    it("staggers items between 50ms and 70ms", () => {
      const visible = listEnter.visible as any;
      expect(visible.transition.staggerChildren).toBeGreaterThanOrEqual(0.05);
      expect(visible.transition.staggerChildren).toBeLessThanOrEqual(0.07);
    });

    it("item enter is subtle (<= 6px y, <= 180ms)", () => {
      const hidden = listItemEnter.hidden as any;
      const visible = listItemEnter.visible as any;
      expect(hidden.y).toBeLessThanOrEqual(6);
      expect(visible.transition.duration).toBeLessThanOrEqual(0.18);
    });
  });

  describe("successEnter variant", () => {
    it("uses restrained scale (0.9 -> 1) with zero overshoot bounce", () => {
      const hidden = successEnter.hidden as any;
      const visible = successEnter.visible as any;

      expect(hidden.scale).toBe(0.9);
      expect(visible.scale).toBe(1);
      expect(visible.transition.duration).toBeLessThanOrEqual(0.24);
      expect(visible.transition.ease).toEqual(motionEase);
    });
  });

  describe("exit transitions", () => {
    it("are swift (<= 140ms)", () => {
      const exit = (exitFade.exit as any).transition;
      expect(exit.duration).toBeLessThanOrEqual(0.14);
    });
  });

  describe("Public Exports", () => {
    it("exports all motion primitives and skeleton components", () => {
      expect(MotionExports.MotionProvider).toBeDefined();
      expect(MotionExports.PageTransition).toBeDefined();
      expect(MotionExports.StaggerList).toBeDefined();
      expect(MotionExports.FadeIn).toBeDefined();
      expect(MotionExports.SlideFade).toBeDefined();
      expect(MotionExports.AnimatedNumber).toBeDefined();
      expect(MotionExports.ProgressReveal).toBeDefined();
      expect(MotionExports.SuccessState).toBeDefined();
      expect(MotionExports.SkeletonTransition).toBeDefined();

      // All 9 shared skeletons
      expect(MotionExports.SkeletonPageHeader).toBeDefined();
      expect(MotionExports.SkeletonCard).toBeDefined();
      expect(MotionExports.SkeletonList).toBeDefined();
      expect(MotionExports.SkeletonTable).toBeDefined();
      expect(MotionExports.SkeletonMission).toBeDefined();
      expect(MotionExports.SkeletonProgress).toBeDefined();
      expect(MotionExports.SkeletonDashboard).toBeDefined();
      expect(MotionExports.SkeletonLearningPath).toBeDefined();
      expect(MotionExports.SkeletonRevisionQueue).toBeDefined();
    });
  });
});

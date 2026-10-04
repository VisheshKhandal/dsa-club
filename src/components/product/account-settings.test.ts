import { describe, it, expect } from "vitest";
import {
  CAREER_TRACKS,
  TARGET_ROLES,
  EXPERIENCE_OPTIONS,
  LANGUAGE_OPTIONS,
  DAILY_MINUTES_STEPS,
  DIFFICULTY_PREFERENCES,
  LEARNING_FOCUS_OPTIONS,
  getPaceDescription,
  parseGoal,
  formatGoal,
} from "@/app/(product)/account/account-settings.logic";

describe("Account & Profile Settings Helpers", () => {
  describe("parseGoal and formatGoal", () => {
    it("parses combined goal string containing track and role with separator", () => {
      const parsed = parseGoal("FAANG / Big Tech · Frontend Engineer");
      expect(parsed.track).toBe("FAANG / Big Tech");
      expect(parsed.role).toBe("Frontend Engineer");
    });

    it("parses legacy single track string and defaults role gracefully", () => {
      const parsed = parseGoal("Product Company");
      expect(parsed.track).toBe("Product Company");
      expect(parsed.role).toBe("Software Development Engineer (SDE)");
    });

    it("handles undefined or empty goal and returns robust defaults", () => {
      const parsed = parseGoal(undefined);
      expect(parsed.track).toBe("FAANG / Big Tech");
      expect(parsed.role).toBe("Software Development Engineer (SDE)");

      const parsedEmpty = parseGoal("");
      expect(parsedEmpty.track).toBe("FAANG / Big Tech");
      expect(parsedEmpty.role).toBe("Software Development Engineer (SDE)");
    });

    it("formats track and role into standardized recommendation engine string", () => {
      const formatted = formatGoal("Startup", "Backend Engineer");
      expect(formatted).toBe("Startup · Backend Engineer");
    });
  });

  describe("getPaceDescription", () => {
    it("returns correct pace information for 15 minutes", () => {
      const pace = getPaceDescription(15);
      expect(pace.pace).toBe("Foundation Pace");
      expect(pace.frequency).toContain("1 topic every 2 weeks");
      expect(pace.weeklyHours).toBe("1.75 hrs/week");
    });

    it("returns correct pace information for 30 minutes", () => {
      const pace = getPaceDescription(30);
      expect(pace.pace).toBe("Steady Pace");
      expect(pace.frequency).toContain("1 topic per week");
      expect(pace.weeklyHours).toBe("3.5 hrs/week");
    });

    it("returns correct pace information for 60 minutes", () => {
      const pace = getPaceDescription(60);
      expect(pace.pace).toBe("Intensive Pace");
      expect(pace.frequency).toContain("2 topics per week");
      expect(pace.weeklyHours).toBe("7.0 hrs/week");
    });

    it("returns sprint pace for 120 minutes", () => {
      const pace = getPaceDescription(120);
      expect(pace.pace).toBe("Full-Time Sprint Pace");
      expect(pace.frequency).toContain("4+ topics per week");
      expect(pace.weeklyHours).toBe("14.0 hrs/week");
    });
  });

  describe("Constants & Structured Options", () => {
    it("provides valid career tracks", () => {
      expect(CAREER_TRACKS.length).toBeGreaterThanOrEqual(5);
      const values = CAREER_TRACKS.map((t) => t.value);
      expect(values).toContain("FAANG / Big Tech");
      expect(values).toContain("Product Company");
      expect(values).toContain("Startup");
      expect(values).toContain("Service Company");
      expect(values).toContain("Internship");
    });

    it("provides valid target roles", () => {
      expect(TARGET_ROLES.length).toBeGreaterThanOrEqual(4);
      const values = TARGET_ROLES.map((r) => r.value);
      expect(values).toContain("Software Development Engineer (SDE)");
      expect(values).toContain("Frontend Engineer");
      expect(values).toContain("Backend Engineer");
      expect(values).toContain("Full Stack Engineer");
    });

    it("provides valid experience levels", () => {
      const values = EXPERIENCE_OPTIONS.map((e) => e.value);
      expect(values).toEqual(["beginner", "intermediate", "advanced"]);
    });

    it("provides valid programming languages", () => {
      const values = LANGUAGE_OPTIONS.map((l) => l.value);
      expect(values).toContain("cpp");
      expect(values).toContain("python");
      expect(values).toContain("java");
      expect(values).toContain("javascript");
    });

    it("includes step points for daily minutes slider", () => {
      expect(DAILY_MINUTES_STEPS).toEqual([15, 30, 45, 60, 90, 120]);
    });

    it("supports difficulty calibration options", () => {
      const values = DIFFICULTY_PREFERENCES.map((d) => d.value);
      expect(values).toEqual(["adaptive", "gentle", "stretch"]);
    });

    it("supports learning loop focus options", () => {
      const values = LEARNING_FOCUS_OPTIONS.map((f) => f.value);
      expect(values).toEqual(["balanced", "concept_first", "practice_heavy"]);
    });
  });
});

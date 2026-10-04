import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_PREFERENCES,
  applyPreferencesToDOM,
  DSAClubPreferences,
} from "@/components/preferences/preferences-provider";

class MockClassList {
  classes = new Set<string>();
  add(c: string) { this.classes.add(c); }
  remove(c: string) { this.classes.delete(c); }
  contains(c: string) { return this.classes.has(c); }
}

class MockElement {
  attributes: Record<string, string> = {};
  classList = new MockClassList();
  setAttribute(k: string, v: string) { this.attributes[k] = v; }
  getAttribute(k: string) { return this.attributes[k]; }
}

describe("Account & Settings Separation and Personalization Engine", () => {
  let rootElement: MockElement;
  const originalDocument = (globalThis as any).document;

  beforeEach(() => {
    rootElement = new MockElement();
    (globalThis as any).document = {
      documentElement: rootElement,
    };
  });

  afterEach(() => {
    (globalThis as any).document = originalDocument;
  });

  describe("Preferences Schema & Default Values", () => {
    it("provides complete default preferences covering all 8 functional categories", () => {
      expect(DEFAULT_PREFERENCES.theme).toBe("dark");
      expect(DEFAULT_PREFERENCES.accentColor).toBe("purple");
      expect(DEFAULT_PREFERENCES.contrast).toBe("normal");
      expect(DEFAULT_PREFERENCES.borderRadius).toBe("rounded");

      expect(DEFAULT_PREFERENCES.interfaceDensity).toBe("comfortable");
      expect(DEFAULT_PREFERENCES.uiScale).toBe("default");
      expect(DEFAULT_PREFERENCES.motionPreference).toBe("full");

      expect(DEFAULT_PREFERENCES.dailyMinutes).toBe(30);
      expect(DEFAULT_PREFERENCES.difficultyPreference).toBe("adaptive");
      expect(DEFAULT_PREFERENCES.learningLoopStrategy).toBe("balanced");

      expect(DEFAULT_PREFERENCES.aiMentorDepth).toBe("socratic");
      expect(DEFAULT_PREFERENCES.autoSuggestHints).toBe(true);

      expect(DEFAULT_PREFERENCES.codeTheme).toBe("vs-dark");
      expect(DEFAULT_PREFERENCES.codeFontSize).toBe(14);
      expect(DEFAULT_PREFERENCES.codeTabSize).toBe(2);
      expect(DEFAULT_PREFERENCES.missionAutoAdvance).toBe(true);

      expect(DEFAULT_PREFERENCES.revisionPacing).toBe("standard");
      expect(DEFAULT_PREFERENCES.dailyRevisionCap).toBe(15);
      expect(DEFAULT_PREFERENCES.autoScheduleSolved).toBe(true);

      expect(DEFAULT_PREFERENCES.notifications.studyReminders).toBe(true);
      expect(DEFAULT_PREFERENCES.notifications.revisionAlerts).toBe(true);

      expect(DEFAULT_PREFERENCES.enhancedFocusRings).toBe(true);
    });
  });

  describe("applyPreferencesToDOM Engine", () => {
    it("applies dark theme and dark class to documentElement", () => {
      applyPreferencesToDOM({
        ...DEFAULT_PREFERENCES,
        theme: "dark",
      });

      expect(rootElement.getAttribute("data-theme")).toBe("dark");
      expect(rootElement.classList.contains("dark")).toBe(true);
      expect(rootElement.classList.contains("light")).toBe(false);
    });

    it("applies light theme and light class to documentElement", () => {
      applyPreferencesToDOM({
        ...DEFAULT_PREFERENCES,
        theme: "light",
      });

      expect(rootElement.getAttribute("data-theme")).toBe("light");
      expect(rootElement.classList.contains("light")).toBe(true);
      expect(rootElement.classList.contains("dark")).toBe(false);
    });

    it("applies accent color data-attribute across all 6 options", () => {
      const accents: Array<DSAClubPreferences["accentColor"]> = [
        "purple",
        "blue",
        "emerald",
        "amber",
        "rose",
        "cyan",
      ];

      for (const accent of accents) {
        applyPreferencesToDOM({
          ...DEFAULT_PREFERENCES,
          accentColor: accent,
        });
        expect(rootElement.getAttribute("data-accent")).toBe(accent);
      }
    });

    it("applies density, UI scale, radius, contrast, and motion attributes", () => {
      applyPreferencesToDOM({
        ...DEFAULT_PREFERENCES,
        interfaceDensity: "compact",
        uiScale: "small",
        borderRadius: "sharp",
        contrast: "high",
        motionPreference: "reduced",
      });

      expect(rootElement.getAttribute("data-density")).toBe("compact");
      expect(rootElement.getAttribute("data-ui-scale")).toBe("small");
      expect(rootElement.getAttribute("data-radius")).toBe("sharp");
      expect(rootElement.getAttribute("data-contrast")).toBe("high");
      expect(rootElement.getAttribute("data-motion")).toBe("reduced");
    });
  });

  describe("Theme Precedence & First-Time User Invariants", () => {
    it("guarantees first-time user defaults to canonical dark/purple theme", () => {
      // With no custom preferences passed, DEFAULT_PREFERENCES theme must be dark
      expect(DEFAULT_PREFERENCES.theme).toBe("dark");
      
      applyPreferencesToDOM(DEFAULT_PREFERENCES);
      expect(rootElement.getAttribute("data-theme")).toBe("dark");
      expect(rootElement.classList.contains("dark")).toBe(true);
      expect(rootElement.classList.contains("light")).toBe(false);
    });

    it("only switches to light mode when user explicitly specifies light theme", () => {
      const explicitLightPreferences: DSAClubPreferences = {
        ...DEFAULT_PREFERENCES,
        theme: "light",
      };

      applyPreferencesToDOM(explicitLightPreferences);
      expect(rootElement.getAttribute("data-theme")).toBe("light");
      expect(rootElement.classList.contains("light")).toBe(true);
      expect(rootElement.classList.contains("dark")).toBe(false);
    });

    it("preserves explicit dark theme when returning from light theme", () => {
      applyPreferencesToDOM({ ...DEFAULT_PREFERENCES, theme: "light" });
      expect(rootElement.classList.contains("light")).toBe(true);

      applyPreferencesToDOM({ ...DEFAULT_PREFERENCES, theme: "dark" });
      expect(rootElement.getAttribute("data-theme")).toBe("dark");
      expect(rootElement.classList.contains("dark")).toBe(true);
      expect(rootElement.classList.contains("light")).toBe(false);
    });
  });

  describe("Routing & Information Architecture Separation", () => {
    it("ensures next.config does not redirect /settings to /account", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const nextConfigPath = path.resolve(process.cwd(), "next.config.ts");
      const nextConfigContent = fs.readFileSync(nextConfigPath, "utf-8");

      // Verify that no redirect from /settings to /account exists
      expect(nextConfigContent).not.toMatch(/source:\s*["']\/settings["'],\s*destination:\s*["']\/account["']/);

      // Verify that /profile still cleanly redirects to /account
      expect(nextConfigContent).toMatch(/source:\s*["']\/profile["'],\s*destination:\s*["']\/account["']/);
    });

    it("verifies Light theme tokens exist with distinct readable surfaces in tokens.css", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const tokensPath = path.resolve(process.cwd(), "src/styles/tokens.css");
      const tokensContent = fs.readFileSync(tokensPath, "utf-8");

      // Light theme tokens block check
      expect(tokensContent).toContain(".light");
      expect(tokensContent).toContain("--color-bg: var(--bg-app)");
      expect(tokensContent).toContain("--color-surface-1: var(--bg-surface)");
      expect(tokensContent).toContain("--color-surface-2: var(--bg-surface-raised)");
      expect(tokensContent).toContain("--color-border: var(--border-subtle)");
      expect(tokensContent).toContain("--color-text-primary: var(--text-primary)");
      expect(tokensContent).toContain("--color-text-secondary: var(--text-secondary)");
      expect(tokensContent).toContain("--color-text-muted: var(--text-muted)");
    });
  });
});


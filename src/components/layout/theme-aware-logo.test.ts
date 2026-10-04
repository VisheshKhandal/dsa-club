import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { DEFAULT_PREFERENCES, applyPreferencesToDOM, DSAClubPreferences } from "@/components/preferences/preferences-provider";
import { DARK_LOGO_PATH, LIGHT_LOGO_PATH, ICON_LOGO_PATH } from "@/components/ui/brand-logo";

describe("Theme-Aware Logo & Dark Mode Default Acceptance Criteria", () => {
  const publicIconsDir = path.resolve(process.cwd(), "public/icons");
  let mockElement: any;

  beforeEach(() => {
    const classes = new Set<string>();
    const attributes: Record<string, string> = {};
    mockElement = {
      classList: {
        add: (c: string) => classes.add(c),
        remove: (c: string) => classes.delete(c),
        contains: (c: string) => classes.has(c),
      },
      setAttribute: (k: string, v: string) => {
        attributes[k] = v;
      },
      getAttribute: (k: string) => attributes[k] ?? null,
      removeAttribute: (k: string) => {
        delete attributes[k];
      },
    };
    (globalThis as any).document = {
      documentElement: mockElement,
    };
    (globalThis as any).window = {
      matchMedia: () => ({ matches: false }),
    };
  });

  describe("1. Asset Existence & Paths", () => {
    it("verifies the dark mode logo exists at the exact path", () => {
      const darkLogo = path.join(publicIconsDir, "dsa-club-lockup.png");
      expect(fs.existsSync(darkLogo)).toBe(true);
      expect(DARK_LOGO_PATH).toBe("/icons/dsa-club-lockup.png");
      expect(fs.statSync(darkLogo).size).toBeGreaterThan(0);
    });

    it("verifies the light mode logo exists as 'DSA Club Lockup Light Mode.png'", () => {
      const lightLogo = path.join(publicIconsDir, "DSA Club Lockup Light Mode.png");
      expect(fs.existsSync(lightLogo)).toBe(true);
      expect(LIGHT_LOGO_PATH).toBe("/icons/DSA Club Lockup Light Mode.png");
      expect(fs.statSync(lightLogo).size).toBeGreaterThan(0);
    });

    it("verifies the collapsed icon logo exists at /icons/dsa-club-icon.png", () => {
      const iconLogo = path.join(publicIconsDir, "dsa-club-icon.png");
      expect(fs.existsSync(iconLogo)).toBe(true);
      expect(ICON_LOGO_PATH).toBe("/icons/dsa-club-icon.png");
    });
  });

  describe("2. First-time User Default: DARK MODE", () => {
    it("verifies DEFAULT_PREFERENCES theme defaults to 'dark'", () => {
      expect(DEFAULT_PREFERENCES.theme).toBe("dark");
    });

    it("verifies root layout SSR output sets html className='dark' and data-theme='dark'", () => {
      const layoutPath = path.resolve(process.cwd(), "src/app/layout.tsx");
      const content = fs.readFileSync(layoutPath, "utf-8");
      expect(content).toMatch(/<html[^>]*className=["'][^"']*dark[^"']*["']/);
      expect(content).toMatch(/<html[^>]*data-theme=["']dark["']/);
    });

    it("verifies layout head script initializes dark mode when no preference is in localStorage", () => {
      const layoutPath = path.resolve(process.cwd(), "src/app/layout.tsx");
      const content = fs.readFileSync(layoutPath, "utf-8");
      // Head script fallback default must be dark
      expect(content).toContain('var t="dark"');
    });

    it("verifies globals.css sets :root to dark background by default", () => {
      const cssPath = path.resolve(process.cwd(), "src/app/globals.css");
      const content = fs.readFileSync(cssPath, "utf-8");
      expect(content).toMatch(/:root\s*\{[\s\S]*?--background:\s*#030008/);
      expect(content).toMatch(/:root\s*\{[\s\S]*?--primary:\s*#a855f7/);
    });
  });

  describe("3. Switch to Light Mode (Immediate, No Refresh)", () => {
    it("immediately applies 'light' class and data-theme='light' when light mode is selected", () => {
      const lightPrefs: DSAClubPreferences = {
        ...DEFAULT_PREFERENCES,
        theme: "light",
      };
      applyPreferencesToDOM(lightPrefs);

      expect(mockElement.classList.contains("light")).toBe(true);
      expect(mockElement.classList.contains("dark")).toBe(false);
      expect(mockElement.getAttribute("data-theme")).toBe("light");
    });

    it("CSS rules immediately hide dark logo and show light logo under light mode", () => {
      const cssPath = path.resolve(process.cwd(), "src/app/globals.css");
      const css = fs.readFileSync(cssPath, "utf-8");

      expect(css).toContain(".brand-logo-dark");
      expect(css).toContain(".brand-logo-light");

      // In dark mode: dark logo block, light logo none
      expect(css).toMatch(/\.brand-logo-dark\s*\{[\s\S]*?display:\s*block/);
      expect(css).toMatch(/\.brand-logo-light\s*\{[\s\S]*?display:\s*none/);

      // Under html.light or [data-theme="light"]: dark logo none !important, light logo block !important
      expect(css).toMatch(/html\.light\s+\.brand-logo-dark[\s\S]*?display:\s*none\s*!important/);
      expect(css).toMatch(/html\.light\s+\.brand-logo-light[\s\S]*?display:\s*block\s*!important/);
    });
  });

  describe("4. Switch Back to Dark Mode (Immediate, No Refresh)", () => {
    it("immediately restores 'dark' class and data-theme='dark' when dark mode is selected", () => {
      // First put it in light mode
      applyPreferencesToDOM({ ...DEFAULT_PREFERENCES, theme: "light" });
      expect(mockElement.classList.contains("light")).toBe(true);

      // Now switch back to dark mode
      applyPreferencesToDOM({ ...DEFAULT_PREFERENCES, theme: "dark" });
      expect(mockElement.classList.contains("dark")).toBe(true);
      expect(mockElement.classList.contains("light")).toBe(false);
      expect(mockElement.getAttribute("data-theme")).toBe("dark");
    });
  });

  describe("5. Component Integration (Sidebar, Header, BrandLogo)", () => {
    it("verifies Sidebar.tsx renders BrandLogo with expanded width 140 and height 36", () => {
      const sidebarPath = path.resolve(process.cwd(), "src/components/layout/Sidebar.tsx");
      const content = fs.readFileSync(sidebarPath, "utf-8");

      expect(content).toContain('import { BrandLogo } from "@/components/ui/brand-logo"');
      expect(content).toContain("<BrandLogo");
      expect(content).toContain("width={140}");
      expect(content).toContain("height={36}");
      // Collapsed icon continues to use dsa-club-icon.png 32x32
      expect(content).toContain("/icons/dsa-club-icon.png");
    });

    it("verifies Header.tsx renders BrandLogo for mobile/collapsed views", () => {
      const headerPath = path.resolve(process.cwd(), "src/components/layout/Header.tsx");
      const content = fs.readFileSync(headerPath, "utf-8");

      expect(content).toContain('import { BrandLogo } from "@/components/ui/brand-logo"');
      expect(content).toContain("<BrandLogo");
    });

    it("verifies BrandLogo renders both dark and light image elements to avoid SSR hydration mismatch", () => {
      const brandLogoPath = path.resolve(process.cwd(), "src/components/ui/brand-logo.tsx");
      const content = fs.readFileSync(brandLogoPath, "utf-8");

      expect(content).toContain('src={DARK_LOGO_PATH}');
      expect(content).toContain('src={LIGHT_LOGO_PATH}');
      expect(content).toContain('className="brand-logo-dark object-contain"');
      expect(content).toContain('className="brand-logo-light object-contain"');
      expect(content).toContain('priority={priority}');
    });
  });
});

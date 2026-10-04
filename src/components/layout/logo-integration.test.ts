import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("DSA Club Logo Integration", () => {
  const publicDir = path.resolve(process.cwd(), "public");
  const iconsDir = path.join(publicDir, "icons");

  describe("Asset Existence & Integrity", () => {
    it("ensures all 3 core logo files exist in /public/icons/", () => {
      const iconPath = path.join(iconsDir, "dsa-club-icon.png");
      const lockupPath = path.join(iconsDir, "dsa-club-lockup.png");
      const logoTextPath = path.join(iconsDir, "dsa-club-logo-text.png");

      expect(fs.existsSync(iconPath)).toBe(true);
      expect(fs.existsSync(lockupPath)).toBe(true);
      expect(fs.existsSync(logoTextPath)).toBe(true);

      expect(fs.statSync(iconPath).size).toBeGreaterThan(0);
      expect(fs.statSync(lockupPath).size).toBeGreaterThan(0);
      expect(fs.statSync(logoTextPath).size).toBeGreaterThan(0);
    });

    it("ensures favicon and PWA icons exist in /public/ without 404s", () => {
      expect(fs.existsSync(path.join(publicDir, "favicon.ico"))).toBe(true);
      expect(fs.existsSync(path.join(publicDir, "favicon-16x16.png"))).toBe(true);
      expect(fs.existsSync(path.join(publicDir, "favicon-32x32.png"))).toBe(true);
      expect(fs.existsSync(path.join(publicDir, "apple-touch-icon.png"))).toBe(true);
      expect(fs.existsSync(path.join(iconsDir, "icon-192x192.png"))).toBe(true);
      expect(fs.existsSync(path.join(iconsDir, "icon-512x512.png"))).toBe(true);
    });

    it("verifies public/manifest.json matches the PWA requirement", () => {
      const manifestPath = path.join(publicDir, "manifest.json");
      expect(fs.existsSync(manifestPath)).toBe(true);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

      expect(manifest.name).toBe("DSA Club");
      expect(manifest.short_name).toBe("DSA Club");
      expect(manifest.start_url).toBe("/dashboard");
      expect(manifest.display).toBe("standalone");
      expect(manifest.background_color).toBe("#0F0F1A");
      expect(manifest.theme_color).toBe("#7C3AED");
      expect(manifest.icons).toHaveLength(2);
      expect(manifest.icons[0].src).toBe("/icons/icon-192x192.png");
      expect(manifest.icons[1].src).toBe("/icons/icon-512x512.png");
    });
  });

  describe("Sidebar Logo Integration", () => {
    it("verifies Sidebar.tsx imports Image and implements collapsed/expanded logo switching", () => {
      const sidebarPath = path.resolve(process.cwd(), "src/components/layout/Sidebar.tsx");
      const content = fs.readFileSync(sidebarPath, "utf-8");

      expect(content).toMatch(/import\s+Image\s+from\s+["']next\/image["']/);
      expect(content).toContain("/icons/dsa-club-icon.png");
      expect(content).toContain("/icons/dsa-club-lockup.png");
      expect(content).toMatch(/width=\{140\}/);
      expect(content).toMatch(/height=\{36\}/);
      expect(content).toMatch(/width=\{32\}/);
      expect(content).toMatch(/height=\{32\}/);
    });
  });

  describe("Metadata & Layout Integration", () => {
    it("verifies layout.tsx has correct browser tab title template, favicon icons, and appleWebApp", () => {
      const layoutPath = path.resolve(process.cwd(), "src/app/layout.tsx");
      const content = fs.readFileSync(layoutPath, "utf-8");

      expect(content).toMatch(/default:\s*['"]DSA Club/);
      expect(content).toContain("template: '%s — DSA Club'");
      expect(content).toContain("url: '/favicon-16x16.png'");
      expect(content).toContain("url: '/favicon-32x32.png'");
      expect(content).toContain("url: '/favicon.ico'");
      expect(content).toContain("manifest: '/manifest.json'");
      expect(content).toContain("title: 'DSA Club'");
    });
  });

  describe("Login and Landing Page Integrations", () => {
    it("verifies login cockpit displays /icons/dsa-club-logo-text.png", () => {
      const cockpitPath = path.resolve(process.cwd(), "src/components/auth/learning-cockpit.tsx");
      const content = fs.readFileSync(cockpitPath, "utf-8");

      expect(content).toMatch(/import\s+Image\s+from\s+["']next\/image["']/);
      expect(content).toContain("/icons/dsa-club-logo-text.png");
      expect(content).toMatch(/width=\{220\}/);
      expect(content).toMatch(/height=\{70\}/);
    });

    it("verifies landing page navbar uses dsa-club-lockup.png and hero uses dsa-club-logo-text.png", () => {
      const navPath = path.resolve(process.cwd(), "src/components/landing/landing-nav.tsx");
      const heroPath = path.resolve(process.cwd(), "src/components/landing/landing-hero.tsx");
      const navContent = fs.readFileSync(navPath, "utf-8");
      const heroContent = fs.readFileSync(heroPath, "utf-8");

      expect(navContent).toMatch(/import\s+Image\s+from\s+["']next\/image["']/);
      expect(navContent).toContain("/icons/dsa-club-lockup.png");
      expect(heroContent).toContain("/icons/dsa-club-logo-text.png");
      expect(navContent).not.toContain('<img src="/dsa-club-logo.png"');
    });
  });

  describe("Theme-Aware Logo & Default Dark Mode Behavior", () => {
    it("ensures light mode logo file exists in /public/icons/ with non-zero size", () => {
      const lightLogoPath = path.join(iconsDir, "DSA Club Lockup Light Mode.png");
      expect(fs.existsSync(lightLogoPath)).toBe(true);
      expect(fs.statSync(lightLogoPath).size).toBeGreaterThan(0);
    });

    it("verifies BrandLogo component implements dark and light logo paths with CSS-driven classes", () => {
      const brandLogoPath = path.resolve(process.cwd(), "src/components/ui/brand-logo.tsx");
      expect(fs.existsSync(brandLogoPath)).toBe(true);
      const content = fs.readFileSync(brandLogoPath, "utf-8");

      expect(content).toContain("/icons/dsa-club-lockup.png");
      expect(content).toContain("/icons/DSA Club Lockup Light Mode.png");
      expect(content).toContain("brand-logo-dark");
      expect(content).toContain("brand-logo-light");
    });

    it("verifies layout.tsx sets initial server html to className='dark' and data-theme='dark'", () => {
      const layoutPath = path.resolve(process.cwd(), "src/app/layout.tsx");
      const content = fs.readFileSync(layoutPath, "utf-8");

      expect(content).toContain('className="dark"');
      expect(content).toContain('data-theme="dark"');
    });

    it("verifies globals.css defaults :root to dark background and defines brand logo visibility rules", () => {
      const cssPath = path.resolve(process.cwd(), "src/app/globals.css");
      const content = fs.readFileSync(cssPath, "utf-8");

      expect(content).toContain(".brand-logo-dark");
      expect(content).toContain(".brand-logo-light");
      expect(content).toMatch(/html\.light\s+\.brand-logo-dark[\s\S]*?display:\s*none\s*!important/);
      expect(content).toMatch(/html\.light\s+\.brand-logo-light[\s\S]*?display:\s*block\s*!important/);
    });

    it("verifies Header.tsx integrates BrandLogo for mobile and collapsed sidebar views", () => {
      const headerPath = path.resolve(process.cwd(), "src/components/layout/Header.tsx");
      const content = fs.readFileSync(headerPath, "utf-8");

      expect(content).toContain("BrandLogo");
      expect(content).toContain("<BrandLogo");
    });
  });
});


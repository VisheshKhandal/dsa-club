import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("DSA Club Responsive UI/UX Hardening", () => {
  const layoutDir = path.resolve(process.cwd(), "src/components/layout");
  const productDir = path.resolve(process.cwd(), "src/components/product");
  const settingsPath = path.resolve(process.cwd(), "src/app/(product)/settings/settings-view.tsx");

  describe("AppLayout Responsive Coordination", () => {
    it("reserves bottom space on mobile for floating bottom nav with safe-area support", () => {
      const appLayoutContent = fs.readFileSync(path.join(layoutDir, "AppLayout.tsx"), "utf-8");

      // Main container must have responsive bottom padding avoiding bottom nav overlap
      expect(appLayoutContent).toContain("pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]");
      // Main container must scale down to standard md:pb-8 on desktop
      expect(appLayoutContent).toContain("md:pb-8");
      // Side padding should be adaptive
      expect(appLayoutContent).toContain("p-4 sm:p-6 lg:p-8");
      // Dummy spacer should not be present
      expect(appLayoutContent).not.toContain("h-[84px]");
    });

    it("wires mobile menu drawer state between Header and Sidebar", () => {
      const appLayoutContent = fs.readFileSync(path.join(layoutDir, "AppLayout.tsx"), "utf-8");

      expect(appLayoutContent).toContain("mobileOpen");
      expect(appLayoutContent).toContain("setMobileOpen");
      expect(appLayoutContent).toContain("onMobileMenuOpen={() => setMobileOpen(true)}");
      expect(appLayoutContent).toContain("mobileOpen={mobileOpen}");
      expect(appLayoutContent).toContain("onMobileClose={() => setMobileOpen(false)}");
    });
  });

  describe("MobileBottomNav Light/Dark Adaptation & Safe Area", () => {
    it("uses dynamic safe-area-inset-bottom in style attribute", () => {
      const navContent = fs.readFileSync(path.join(layoutDir, "MobileBottomNav.tsx"), "utf-8");

      expect(navContent).toContain("calc(0.75rem + env(safe-area-inset-bottom, 0px))");
      expect(navContent).toContain("md:hidden");
    });

    it("uses semantic theme tokens for background, border, and text", () => {
      const navContent = fs.readFileSync(path.join(layoutDir, "MobileBottomNav.tsx"), "utf-8");

      expect(navContent).toContain("bg-(--color-surface-1)");
      expect(navContent).toContain("border-(--color-border)");
      expect(navContent).toContain("text-(--color-text-muted)");
      // Should not contain hardcoded dark colors
      expect(navContent).not.toContain("rgba(26,26,46,0.88)");
      expect(navContent).not.toContain("#5A5A7A");
    });

    it("ensures touch targets exceeding 44px on all navigation items", () => {
      const navContent = fs.readFileSync(path.join(layoutDir, "MobileBottomNav.tsx"), "utf-8");

      // Items have min-h-[52px] satisfying WCAG 44px requirement
      expect(navContent).toContain("min-h-[52px]");
    });

    it("uses premium glass shell with backdrop-blur-2xl and deep layered shadows", () => {
      const navContent = fs.readFileSync(path.join(layoutDir, "MobileBottomNav.tsx"), "utf-8");

      // Obsidian glass shell: heavy backdrop blur for frosted glass effect
      expect(navContent).toContain("backdrop-blur-2xl");
      // Deep ambient shadow pool for floating depth
      expect(navContent).toContain("16px 40px -8px");
      // Specular top-edge highlight for 3D physicality
      expect(navContent).toContain("rgba(255,255,255,0.25)");
    });

    it("uses Framer Motion layoutId spring physics for active indicator", () => {
      const navContent = fs.readFileSync(path.join(layoutDir, "MobileBottomNav.tsx"), "utf-8");

      // layoutId-based animation instead of manual CSS translateX
      expect(navContent).toContain("mobileNavActivePill");
      expect(navContent).toContain("layoutId");
      // Spring physics config (Linear/Arc feel)
      expect(navContent).toContain("stiffness");
      expect(navContent).toContain("damping");
      // Active state uses accent-lime text (not black-on-green)
      expect(navContent).toContain("text-(--accent-lime)");
    });
  });

  describe("Header Mobile Responsiveness & Accessibility", () => {
    it("provides responsive mobile destinations navigation with 44px touch targets in avatar menu", () => {
      const headerContent = fs.readFileSync(path.join(layoutDir, "Header.tsx"), "utf-8");

      expect(headerContent).toContain("min-h-[44px]");
      expect(headerContent).toContain("/learning-paths");
      expect(headerContent).toContain("/progress");
      expect(headerContent).toContain("/interview");
      expect(headerContent).toContain("md:hidden");
    });

    it("prevents header collision with title truncation and compact mobile search", () => {
      const headerContent = fs.readFileSync(path.join(layoutDir, "Header.tsx"), "utf-8");

      // Search button provides responsive layout
      expect(headerContent).toContain("hidden md:inline");
      expect(headerContent).toContain("Search workspace");
      // Page title constrained on mobile
      expect(headerContent).toContain("hidden sm:block");
      expect(headerContent).toContain("truncate");
    });
  });

  describe("Settings View Responsive Category Navigation", () => {
    it("scopes desktop category navigation to desktop and removes mobile sticky overlap", () => {
      const settingsContent = fs.readFileSync(settingsPath, "utf-8");

      // Desktop nav is hidden on mobile/tablet
      expect(settingsContent).toContain("hidden lg:block lg:col-span-4 sticky top-20");
    });

    it("provides dedicated mobile category selector dropdown", () => {
      const settingsContent = fs.readFileSync(settingsPath, "utf-8");

      expect(settingsContent).toContain("lg:hidden");
      expect(settingsContent).toContain("mobileCategoryOpen");
      expect(settingsContent).toContain("min-h-[44px]");
      expect(settingsContent).toContain("min-w-0 w-full");
    });
  });

  describe("AI Mentor Safe Positioning & Layout", () => {
    it("positions floating trigger above mobile bottom navigation bar", () => {
      const mentorContent = fs.readFileSync(path.join(productDir, "ai-mentor.tsx"), "utf-8");

      expect(mentorContent).toContain("bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]");
      expect(mentorContent).toContain("md:bottom-6");
      expect(mentorContent).toContain("min-h-[44px]");
      expect(mentorContent).toContain("min-w-[44px]");
    });

    it("constrains mentor panel dimensions to small viewports and uses theme tokens", () => {
      const mentorContent = fs.readFileSync(path.join(productDir, "ai-mentor.tsx"), "utf-8");

      expect(mentorContent).toContain("max-w-[calc(100vw-1.5rem)]");
      expect(mentorContent).toContain("max-h-[calc(100dvh-7.5rem)]");
      expect(mentorContent).toContain("bg-(--color-surface-1)");
      expect(mentorContent).toContain("border-(--color-border)");
      expect(mentorContent).toContain("text-(--color-text-primary)");
    });
  });

  describe("Problem Detail View Theme & Responsiveness", () => {
    it("uses semantic tokens for borders, surfaces, and text", () => {
      const problemDetailContent = fs.readFileSync(path.join(productDir, "problem-detail-view.tsx"), "utf-8");

      expect(problemDetailContent).toContain("border-(--color-border)");
      expect(problemDetailContent).toContain("bg-(--color-surface-1)");
      expect(problemDetailContent).toContain("text-(--color-text-primary)");
      expect(problemDetailContent).toContain("text-(--color-text-muted)");
      expect(problemDetailContent).not.toContain("border-white/[0.08]");
    });

    it("ensures mobile responsive breadcrumbs, headings, and phase stepper", () => {
      const problemDetailContent = fs.readFileSync(path.join(productDir, "problem-detail-view.tsx"), "utf-8");

      expect(problemDetailContent).toContain("min-w-0 w-full");
      expect(problemDetailContent).toContain("break-words");
      expect(problemDetailContent).toContain("shortLabel");
    });
  });
});

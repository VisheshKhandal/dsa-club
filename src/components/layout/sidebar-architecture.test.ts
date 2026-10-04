import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("DSA Club Sidebar Architecture & UX Hardening", () => {
  const sidebarPath = path.resolve(process.cwd(), "src/components/layout/Sidebar.tsx");
  const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");

  describe("1. Information Architecture & Navigation Config", () => {
    it("imports NAVIGATION_CONFIG and route helpers from navigation.config", () => {
      expect(sidebarContent).toContain("NAVIGATION_CONFIG");
      expect(sidebarContent).toContain("isItemActive");
      expect(sidebarContent).toContain("isChildActive");
      expect(sidebarContent).toContain("getActiveParentId");
      expect(sidebarContent).toContain("@/config/navigation.config");
    });

    it("renders uppercase semantic section headers for LEARN and INSIGHTS", () => {
      expect(sidebarContent).toContain("group.label");
      expect(sidebarContent).toContain("tracking-[0.14em]");
      expect(sidebarContent).toContain("uppercase");
    });

    it("provides accessible semantic navigation container with ARIA landmark", () => {
      expect(sidebarContent).toContain('<nav');
      expect(sidebarContent).toContain('aria-label="Primary navigation"');
    });
  });

  describe("2. Parent Landing Links & Disclosure Controls", () => {
    it("makes parent items clickable links to their canonical landing pages", () => {
      expect(sidebarContent).toContain("href={item.href}");
      expect(sidebarContent).toContain("aria-current={isParentActive ? \"page\" : undefined}");
    });

    it("separates parent route navigation from disclosure accordion toggles", () => {
      expect(sidebarContent).toContain("aria-expanded={isSectionOpen}");
      expect(sidebarContent).toContain('aria-controls={`${item.id}-subnav`}');
      expect(sidebarContent).toContain("toggleSection");
    });

    it("persists section disclosure states independently in localStorage", () => {
      expect(sidebarContent).toContain("sidebar-learn-open");
      expect(sidebarContent).toContain("sidebar-practice-open");
      expect(sidebarContent).toContain("setLearnOpen");
      expect(sidebarContent).toContain("setPracticeOpen");
    });
  });

  describe("3. Compact Mode Parity & Popover Flyout", () => {
    it("provides hover and focus tooltips in collapsed mode without relying on HTML title", () => {
      expect(sidebarContent).toContain("collapsed && (");
      expect(sidebarContent).toContain("group-hover:opacity-100");
      expect(sidebarContent).toContain("group-focus-visible:opacity-100");
    });

    it("renders compact mode obsidian glass flyout with role menu", () => {
      expect(sidebarContent).toContain('role="menu"');
      expect(sidebarContent).toContain("activeFlyout === item.id");
      expect(sidebarContent).toContain("handleFlyoutOpen");
      expect(sidebarContent).toContain("handleFlyoutCloseWithDelay");
    });

    it("supports Escape key to dismiss active flyout popovers", () => {
      expect(sidebarContent).toContain('e.key === "Escape"');
      expect(sidebarContent).toContain("setActiveFlyout(null)");
    });
  });

  describe("4. Edge Hover Collapse Affordance", () => {
    it("renders LeetCode-inspired hover edge toggle on sidebar right border", () => {
      expect(sidebarContent).toContain("group/sidebar");
      expect(sidebarContent).toContain("absolute -right-3 top-20");
      expect(sidebarContent).toContain("group-hover/sidebar:opacity-100");
      expect(sidebarContent).toContain("aria-label={collapsed ? \"Expand sidebar\" : \"Collapse sidebar\"}");
    });
  });

  describe("5. Active Visual Indicators & Obsidian Glass Physics", () => {
    it("uses Framer Motion layoutId for smooth active indicator transitions", () => {
      expect(sidebarContent).toContain('layoutId="activeNavIndicator"');
      expect(sidebarContent).toContain('layoutId="activeNavSubIndicator"');
      expect(sidebarContent).toContain("navIndicatorTransition");
      expect(sidebarContent).toContain("stiffness: 260");
      expect(sidebarContent).toContain("damping: 28");
    });

    it("uses DSA Club accent lime styling for active states", () => {
      expect(sidebarContent).toContain("text-(--accent-lime)");
      expect(sidebarContent).toContain("bg-(--accent-lime)/10");
      expect(sidebarContent).toContain("border-(--accent-lime)");
    });
  });

  describe("6. Bottom User Profile & Account Panel", () => {
    it("provides clean user profile card with avatar initials and account links without clunky buttons", () => {
      expect(sidebarContent).toContain("getInitials(user?.name)");
      expect(sidebarContent).toContain('href="/account"');
      expect(sidebarContent).toContain('href="/settings"');
      // No redundant search or bottom collapse text button
      expect(sidebarContent).not.toContain("handleTriggerCommandPalette");
      expect(sidebarContent).not.toContain("PanelLeftClose");
    });
  });
});

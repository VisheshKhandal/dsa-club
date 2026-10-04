"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { BrandLogo } from "@/components/ui/brand-logo";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Settings,
  HelpCircle,
} from "lucide-react";
import { SlideFade } from "@/components/motion";
import { cn } from "@/lib/utils";
import {
  NAVIGATION_CONFIG,
  NavigationGroup,
  NavigationItem,
  NavigationChild,
  isItemActive,
  isChildActive,
  getActiveParentId,
} from "@/config/navigation.config";

export interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  user?: {
    name?: string | null;
    email?: string | null;
  };
}

function getInitials(name?: string | null) {
  if (!name) return "DS";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const navIndicatorTransition = {
  type: "spring",
  stiffness: 260,
  damping: 28,
  mass: 0.8,
} as const;

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen = false,
  onMobileClose,
  user,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [navigatingHref, setNavigatingHref] = useState<string | null>(null);

  const handlePrefetch = (href: string) => {
    try {
      router.prefetch(href);
    } catch {}
  };

  // Section disclosure states (independent of rail collapse)
  const [learnOpen, setLearnOpen] = useState(true);
  const [practiceOpen, setPracticeOpen] = useState(true);

  // Track if user explicitly toggled during this session to respect manual collapse
  const manualLearnToggleRef = useRef(false);
  const manualPracticeToggleRef = useRef(false);

  // Compact mode flyout popover state
  const [activeFlyout, setActiveFlyout] = useState<string | null>(null);
  const flyoutCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load persisted section collapse states
  useEffect(() => {
    try {
      const savedLearn = window.localStorage.getItem("sidebar-learn-open");
      if (savedLearn !== null) setLearnOpen(savedLearn === "true");

      const savedPractice = window.localStorage.getItem("sidebar-practice-open");
      if (savedPractice !== null) setPracticeOpen(savedPractice === "true");
    } catch {
      // Ignore localStorage errors in SSR/strict envs
    }
  }, []);

  // Section toggle handlers
  const toggleLearn = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    manualLearnToggleRef.current = true;
    setLearnOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("sidebar-learn-open", String(next));
      } catch {}
      return next;
    });
  };

  const togglePractice = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    manualPracticeToggleRef.current = true;
    setPracticeOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("sidebar-practice-open", String(next));
      } catch {}
      return next;
    });
  };

  // Close mobile drawer and clear pending navigation intent on route change
  useEffect(() => {
    setNavigatingHref(null);
    setActiveFlyout(null);
    if (onMobileClose) {
      onMobileClose();
    }
  }, [pathname, onMobileClose]);

  const activePath = navigatingHref || pathname;

  // Route-aware intelligent auto-expansion
  useEffect(() => {
    const parentId = getActiveParentId(activePath);
    if (parentId === "learn-parent" && !learnOpen && !manualLearnToggleRef.current) {
      setLearnOpen(true);
    } else if (
      parentId === "practice-parent" &&
      !practiceOpen &&
      !manualPracticeToggleRef.current
    ) {
      setPracticeOpen(true);
    }
  }, [activePath, learnOpen, practiceOpen]);

  // Keyboard accessibility: Escape closes compact flyouts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeFlyout) {
        setActiveFlyout(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFlyout]);

  const handleFlyoutOpen = (itemId: string) => {
    if (flyoutCloseTimerRef.current) {
      clearTimeout(flyoutCloseTimerRef.current);
      flyoutCloseTimerRef.current = null;
    }
    setActiveFlyout(itemId);
  };

  const handleFlyoutCloseWithDelay = () => {
    flyoutCloseTimerRef.current = setTimeout(() => {
      setActiveFlyout(null);
    }, 150);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm md:hidden transition-opacity duration-150"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "group/sidebar fixed inset-y-0 left-0 z-50 flex flex-col bg-(--bg-sidebar) border-r border-(--border-subtle) transition-[width,transform] duration-[160ms] ease-out select-none",
          collapsed ? "w-[64px]" : "w-[64px] lg:w-[240px]",
          mobileOpen ? "translate-x-0 w-[240px]" : "-translate-x-full md:translate-x-0"
        )}
        aria-label="Main sidebar navigation"
      >
        {/* LeetCode-Inspired Hover Edge Collapse Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "absolute -right-3 top-20 z-50 hidden md:flex items-center justify-center size-6 rounded-full",
            "bg-(--bg-surface-raised) border border-(--border-subtle) text-(--text-muted) hover:text-(--accent-lime) hover:border-(--accent-lime)/40",
            "shadow-md shadow-black/40 transition-all duration-150 ease-out cursor-pointer",
            "opacity-0 group-hover/sidebar:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--accent-lime)"
          )}
        >
          {collapsed ? (
            <ChevronRight className="size-3" />
          ) : (
            <ChevronLeft className="size-3" />
          )}
        </button>

        {/* Brand Block */}
        <div className="flex items-center h-16 border-b border-(--border-subtle) shrink-0">
          <Link
            href="/dashboard"
            prefetch={true}
            onPointerEnter={() => handlePrefetch("/dashboard")}
            onClick={() => setNavigatingHref("/dashboard")}
            className="flex items-center w-full focus-visible:outline-none"
            title="DSA Club"
          >
            {collapsed ? (
              // Logo block — collapsed sidebar (icon-only mode, 64px wide)
              <div className="flex items-center justify-center w-full py-5">
                <Image
                  src="/icons/dsa-club-icon.png"
                  alt="DSA Club"
                  width={32}
                  height={32}
                  className="object-contain"
                  priority
                />
              </div>
            ) : (
              // Responsive brand block: icon-only on tablet (md:flex lg:hidden), full lockup (/icons/dsa-club-lockup.png) on mobile drawer and desktop lg:
              <div className="flex items-center w-full">
                <div className={cn("hidden lg:flex items-center gap-3 px-4 py-5", mobileOpen && "flex")}>
                  <BrandLogo width={140} height={36} priority />
                </div>
                <div className={cn("flex lg:hidden items-center justify-center w-full py-5", mobileOpen && "hidden")}>
                  <Image
                    src="/icons/dsa-club-icon.png"
                    alt="DSA Club"
                    width={32}
                    height={32}
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
            )}
          </Link>
          {/* Mobile close button */}
          {!collapsed && (
            <button
              type="button"
              onClick={onMobileClose}
              className="mr-3 ml-auto p-1.5 text-(--text-muted) hover:text-(--text-primary) md:hidden transition-colors duration-150"
              aria-label="Close sidebar"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* Semantic Navigation Section */}
        <nav
          className="flex-1 overflow-y-auto px-2 py-3 space-y-3 scrollbar-thin"
          aria-label="Primary navigation"
        >
          {NAVIGATION_CONFIG.map((group: NavigationGroup) => (
            <div key={group.id} className="space-y-1">
              {/* Group Section Header */}
              {group.label && (
                <>
                  {!collapsed ? (
                    <div className="hidden lg:block px-3 pt-3 pb-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--text-muted)/70">
                        {group.label}
                      </span>
                    </div>
                  ) : (
                    <div className="my-2 mx-2 border-t border-(--border-subtle)/40" aria-hidden="true" />
                  )}
                  {mobileOpen && (
                    <div className="lg:hidden px-3 pt-3 pb-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--text-muted)/70">
                        {group.label}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Items in Group */}
              {group.items.map((item: NavigationItem) => {
                const ItemIcon = item.icon;
                const isParentActive = isItemActive(item, activePath);
                const hasChildren = item.children && item.children.length > 0;
                const isLearnParent = item.id === "learn-parent";
                const isPracticeParent = item.id === "practice-parent";
                const isSectionOpen = isLearnParent ? learnOpen : isPracticeParent ? practiceOpen : false;
                const toggleSection = isLearnParent ? toggleLearn : isPracticeParent ? togglePractice : undefined;

                if (hasChildren) {
                  return (
                    <div
                      key={item.id}
                      className="relative"
                      onMouseEnter={() => collapsed && handleFlyoutOpen(item.id)}
                      onMouseLeave={() => collapsed && handleFlyoutCloseWithDelay()}
                    >
                      {/* Parent Row in Expanded / Tablet Mode */}
                      <div
                        className={cn(
                          "group relative flex items-center rounded-(--radius-btn) text-sm font-medium transition-colors duration-150 ease-out",
                          collapsed && "justify-center"
                        )}
                      >
                        {/* Parent Primary Landing Link */}
                        <Link
                          href={item.href}
                          prefetch={true}
                          onPointerEnter={() => handlePrefetch(item.href)}
                          onClick={() => setNavigatingHref(item.href)}
                          aria-current={isParentActive ? "page" : undefined}
                          className={cn(
                            "relative flex items-center gap-3 px-3 py-2 flex-1 rounded-(--radius-btn) text-sm font-medium transition-colors duration-150 ease-out",
                            collapsed && "justify-center px-0 flex-initial w-full",
                            isParentActive
                              ? "text-(--accent-lime) font-semibold"
                              : "text-(--text-secondary) hover:bg-(--bg-surface-raised) hover:text-(--text-primary)"
                          )}
                        >
                          {isParentActive && (
                            <motion.div
                              layoutId="activeNavIndicator"
                              className="absolute inset-0 rounded-(--radius-btn) bg-(--accent-lime)/10 border-l-2 border-(--accent-lime)"
                              transition={navIndicatorTransition}
                            />
                          )}
                          <ItemIcon className="size-4 shrink-0 relative z-10" />
                          {!collapsed && (
                            <span className="truncate relative z-10 transition-opacity duration-100 ease-out hidden lg:inline">
                              {item.label}
                            </span>
                          )}
                          {mobileOpen && (
                            <span className="truncate relative z-10 transition-opacity duration-100 ease-out lg:hidden">
                              {item.label}
                            </span>
                          )}
                        </Link>

                        {/* Expand/Collapse Accordion Chevron */}
                        {(!collapsed || mobileOpen) && toggleSection && (
                          <button
                            type="button"
                            onClick={toggleSection}
                            aria-expanded={isSectionOpen}
                            aria-controls={`${item.id}-subnav`}
                            aria-label={`Toggle ${item.label} section`}
                            className={cn(
                              "p-1.5 mr-1 text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-surface-hover) rounded transition-colors duration-150",
                              collapsed && !mobileOpen && "hidden"
                            )}
                          >
                            <ChevronDown
                              className={cn(
                                "size-3.5 transition-transform duration-[140ms] ease-out",
                                isSectionOpen && "rotate-180"
                              )}
                            />
                          </button>
                        )}

                        {/* Floating Tooltip in Collapsed Mode for Parent Trigger */}
                        {collapsed && (
                          <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap px-2.5 py-1 rounded-md bg-(--bg-surface-raised) border border-(--border-subtle) text-xs font-medium text-(--text-primary) shadow-xl shadow-black/50">
                            {item.label}
                          </div>
                        )}
                      </div>

                      {/* Expandable Sub-items in Expanded Mode */}
                      <SlideFade open={isSectionOpen && (!collapsed || mobileOpen)} duration={0.14}>
                        <div
                          id={`${item.id}-subnav`}
                          className="mt-0.5 space-y-0.5 pl-6"
                        >
                          {item.children?.map((child: NavigationChild) => {
                            const ChildIcon = child.icon;
                            const isChildSelected = isChildActive(child, activePath);
                            return (
                              <Link
                                key={child.id}
                                href={child.href}
                                prefetch={true}
                                onPointerEnter={() => handlePrefetch(child.href)}
                                onClick={() => setNavigatingHref(child.href)}
                                aria-current={isChildSelected ? "page" : undefined}
                                className={cn(
                                  "relative flex items-center gap-2.5 px-3 py-1.5 rounded-(--radius-btn) text-[13px] font-medium transition-colors duration-150 ease-out",
                                  isChildSelected
                                    ? "text-(--accent-lime) font-semibold"
                                    : "text-(--text-secondary) hover:bg-(--bg-surface-raised) hover:text-(--text-primary)"
                                )}
                              >
                                {isChildSelected && (
                                  <motion.div
                                    layoutId="activeNavSubIndicator"
                                    className="absolute inset-0 rounded-(--radius-btn) bg-(--accent-lime)/10"
                                    transition={navIndicatorTransition}
                                  />
                                )}
                                <ChildIcon className="size-3.5 shrink-0 relative z-10" />
                                <span className="truncate relative z-10">{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </SlideFade>

                      {/* Compact Mode Obsidian Glass Flyout Popover */}
                      {collapsed && activeFlyout === item.id && (
                        <div
                          role="menu"
                          aria-label={`${item.label} menu`}
                          onMouseEnter={() => handleFlyoutOpen(item.id)}
                          onMouseLeave={handleFlyoutCloseWithDelay}
                          className="absolute left-[calc(100%+6px)] top-0 z-50 min-w-[210px] py-2 px-1.5 rounded-xl bg-(--bg-sidebar)/95 backdrop-blur-xl border border-(--border-subtle) shadow-2xl shadow-black/70 animate-in fade-in zoom-in-95 duration-100"
                        >
                          <div className="px-2.5 py-1 mb-1 border-b border-(--border-subtle)/50">
                            <div className="text-xs font-semibold text-(--text-primary)">
                              {item.label}
                            </div>
                            {item.description && (
                              <div className="text-[10.5px] text-(--text-muted) leading-tight mt-0.5">
                                {item.description}
                              </div>
                            )}
                          </div>
                          <div className="space-y-0.5">
                            {item.children?.map((child: NavigationChild) => {
                              const ChildIcon = child.icon;
                              const isChildSelected = isChildActive(child, activePath);
                              return (
                                <Link
                                  key={child.id}
                                  href={child.href}
                                  prefetch={true}
                                  onPointerEnter={() => handlePrefetch(child.href)}
                                  onClick={() => {
                                    setNavigatingHref(child.href);
                                    setActiveFlyout(null);
                                  }}
                                  aria-current={isChildSelected ? "page" : undefined}
                                  className={cn(
                                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                    isChildSelected
                                      ? "bg-(--accent-lime)/12 text-(--accent-lime) font-semibold"
                                      : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-raised)"
                                  )}
                                >
                                  <ChildIcon className="size-3.5 shrink-0" />
                                  <span className="truncate">{child.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                // Standard Leaf Item (Home, Plan, Review, Progress, Company Prep)
                return (
                  <div key={item.id} className="relative group">
                    <Link
                      href={item.href}
                      prefetch={true}
                      onPointerEnter={() => handlePrefetch(item.href)}
                      onClick={() => setNavigatingHref(item.href)}
                      aria-current={isParentActive ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 px-3 py-2 rounded-(--radius-btn) text-sm font-medium transition-colors duration-150 ease-out",
                        collapsed && "justify-center px-0",
                        isParentActive
                          ? "text-(--accent-lime) font-semibold"
                          : "text-(--text-secondary) hover:bg-(--bg-surface-raised) hover:text-(--text-primary)"
                      )}
                    >
                      {isParentActive && (
                        <motion.div
                          layoutId="activeNavIndicator"
                          className="absolute inset-0 rounded-(--radius-btn) bg-(--accent-lime)/10 border-l-2 border-(--accent-lime)"
                          transition={navIndicatorTransition}
                        />
                      )}
                      <ItemIcon className="size-4 shrink-0 relative z-10" />
                      {!collapsed && (
                        <span className="truncate relative z-10 transition-opacity duration-100 ease-out hidden lg:inline">
                          {item.label}
                        </span>
                      )}
                      {mobileOpen && (
                        <span className="truncate relative z-10 transition-opacity duration-100 ease-out lg:hidden">
                          {item.label}
                        </span>
                      )}
                    </Link>

                    {/* Floating Tooltip in Collapsed Mode */}
                    {collapsed && (
                      <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap px-2.5 py-1 rounded-md bg-(--bg-surface-raised) border border-(--border-subtle) text-xs font-medium text-(--text-primary) shadow-xl shadow-black/50">
                        {item.label}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom User Account Panel */}
        <div className="border-t border-(--border-subtle) p-3 shrink-0 bg-(--bg-sidebar)">
          {/* User Profile Card */}
          <div
            className={cn(
              "group flex items-center gap-2.5 px-2 py-1.5 rounded-(--radius-btn) bg-(--bg-surface-raised) border border-(--border-subtle) transition-colors duration-150",
              collapsed && "justify-center px-0 bg-transparent border-transparent"
            )}
          >
            <Link
              href="/account"
              prefetch={true}
              onPointerEnter={() => handlePrefetch("/account")}
              onClick={() => setNavigatingHref("/account")}
              className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer focus-visible:outline-none"
              title="Profile"
              aria-label="Profile"
            >
              <div className="grid size-7 shrink-0 place-items-center rounded-full bg-(--accent-lime)/15 border border-(--accent-lime)/30 text-xs font-bold text-(--accent-lime) hover:scale-105 transition-all">
                {getInitials(user?.name)}
              </div>
              {!collapsed && (
                <div className="hidden lg:block min-w-0 flex-1 overflow-hidden transition-opacity duration-100 ease-out">
                  <div className="text-xs font-semibold text-(--text-primary) hover:text-(--accent-lime) transition-colors truncate leading-tight">
                    {user?.name ?? "Student"}
                  </div>
                  <div className="text-[11px] text-(--text-muted) truncate leading-tight">
                    {user?.email ?? "learner@dsaclub.io"}
                  </div>
                </div>
              )}
              {mobileOpen && (
                <div className="lg:hidden min-w-0 flex-1 overflow-hidden transition-opacity duration-100 ease-out">
                  <div className="text-xs font-semibold text-(--text-primary) hover:text-(--accent-lime) transition-colors truncate leading-tight">
                    {user?.name ?? "Student"}
                  </div>
                  <div className="text-[11px] text-(--text-muted) truncate leading-tight">
                    {user?.email ?? "learner@dsaclub.io"}
                  </div>
                </div>
              )}
            </Link>
            {(!collapsed || mobileOpen) && (
              <div className={cn("items-center gap-0.5 hidden lg:flex", mobileOpen && "flex")}>
                <Link
                  href="/settings"
                  prefetch={true}
                  onPointerEnter={() => handlePrefetch("/settings")}
                  onClick={() => setNavigatingHref("/settings")}
                  className="p-1 text-(--text-muted) hover:text-(--text-primary) transition-colors rounded hover:bg-(--bg-surface-hover)"
                  title="Settings"
                  aria-label="Settings"
                >
                  <Settings className="size-4 shrink-0" />
                </Link>
                <Link
                  href="/account"
                  prefetch={true}
                  className="p-1 text-(--text-muted) hover:text-(--text-primary) transition-colors rounded hover:bg-(--bg-surface-hover)"
                  title="Help & Feedback"
                  aria-label="Help & Feedback"
                >
                  <HelpCircle className="size-4 shrink-0" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

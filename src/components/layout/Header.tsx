"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bell,
  CheckCircle2,
  ChevronDown,
  User,
  Settings,
  Sliders,
  LogOut,
  AlertTriangle,
  ArrowRight,
  Menu,
  Compass,
  TrendingUp,
  Building2,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { CommandPalette } from "./CommandPalette";
import { ButtonGhost, ButtonDanger, ButtonSecondary, Button } from "@/components/ui/Button";
import { logoutAction } from "@/features/auth/actions/logout.action";
import { popoverEnter, motionEase } from "@/components/motion";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/ui/brand-logo";
import { NotificationBell } from "@/components/notifications/notification-center";

export interface NotificationItem {
  id: string;
  type: "revision" | "milestone" | "recommendation" | "system";
  title: string;
  subtitle: string;
  timestamp: string;
  read: boolean;
}

export interface HeaderProps {
  title?: string;
  sidebarCollapsed?: boolean;
  onMobileMenuOpen?: () => void;
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

function getPageTitle(pathname: string, explicitTitle?: string): string {
  if (explicitTitle) return explicitTitle;
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/intelligence" || pathname.startsWith("/intelligence/")) return "Plan";
  if (pathname === "/learn" || pathname.startsWith("/learn/")) return "Learn";
  if (pathname === "/learning-paths" || pathname.startsWith("/learning-paths/")) return "Paths";
  if (pathname === "/missions" || pathname.startsWith("/missions/")) return "Missions";
  if (pathname === "/practice" || pathname.startsWith("/practice/")) return "Problems";
  if (pathname === "/patterns" || pathname.startsWith("/patterns/")) return "Patterns";
  if (pathname === "/revision" || pathname.startsWith("/revision/")) return "Review";
  if (pathname === "/companies" || pathname.startsWith("/companies/") || pathname === "/interview" || pathname.startsWith("/interview/")) return "Company Prep";
  if (pathname === "/progress") return "Progress";
  if (pathname === "/account" || pathname === "/profile") return "Account";
  if (pathname === "/settings") return "Settings";
  if (pathname === "/notifications") return "Notifications";
  
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "Dashboard";
  const last = segments[segments.length - 1];
  return last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Header({
  title,
  sidebarCollapsed,
  onMobileMenuOpen,
  user,
}: HeaderProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname, title);

  const isPathsActive =
    pathname === "/learning-paths" ||
    pathname.startsWith("/learning-paths/") ||
    pathname === "/learn/paths" ||
    pathname.startsWith("/learn/paths/");
  const isProgressActive =
    pathname === "/progress" || pathname.startsWith("/progress/");
  const isInterviewActive =
    pathname === "/interview" ||
    pathname.startsWith("/interview/") ||
    pathname === "/companies" ||
    pathname.startsWith("/companies/");

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const avatarRef = useRef<HTMLDivElement>(null);

  // Global shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setNotificationOpen(false);
        setAvatarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close avatar dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        avatarRef.current &&
        !avatarRef.current.contains(e.target as Node)
      ) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await logoutAction();
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <header className="h-16 border-b border-(--border-subtle) bg-(--bg-app)/95 backdrop-blur-md px-3 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 z-40">
        {/* Left Area: Brand Logo (Always visible on mobile without hamburger clutter, and visible on desktop/tablet when sidebar is collapsed) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={cn(
              "items-center flex",
              !sidebarCollapsed && "md:hidden"
            )}
          >
            <Link
              href="/dashboard"
              className="flex items-center focus-visible:outline-none"
              title="DSA Club"
            >
              <BrandLogo width={108} height={28} priority />
            </Link>
          </div>
        </div>

        {/* Center: Current page title on sm+ screens with smooth cross-fade */}
        <div className="hidden sm:block flex-1 px-4 text-left min-w-0 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.h1
              key={pageTitle}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.16, ease: motionEase }}
              className="text-[16px] font-semibold text-(--text-primary) tracking-tight truncate"
            >
              {pageTitle}
            </motion.h1>
          </AnimatePresence>
        </div>

        {/* Right Area: Search ⌘K trigger, Bell with badge, User Avatar dropdown */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search Trigger */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center justify-center sm:justify-start gap-2 h-9 px-2.5 sm:px-3 rounded-(--radius-btn) bg-(--bg-surface-raised) border border-(--border-subtle) text-(--text-muted) hover:text-(--text-primary) hover:border-(--border-strong) hover:bg-(--bg-surface-hover) transition-all duration-150 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)"
            aria-label="Search problems, topics, or paths"
          >
            <Search className="size-3.5" />
            <span className="hidden md:inline">Search problems, topics, or paths</span>
            <span className="sr-only">Search workspace</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-(--bg-surface) border border-(--border-subtle) rounded text-(--text-secondary)">
              ⌘K
            </kbd>
          </button>

          {/* Unified Notification Bell with Popover */}
          <NotificationBell
            isOpen={notificationOpen}
            onToggle={() => {
              setNotificationOpen((prev) => {
                const next = !prev;
                if (next) setAvatarOpen(false);
                return next;
              });
            }}
            onClose={() => setNotificationOpen(false)}
          />

          {/* User Avatar Dropdown */}
          <div className="relative" ref={avatarRef}>
            <button
              type="button"
              onClick={() => {
                setAvatarOpen((prev) => {
                  const next = !prev;
                  if (next) setNotificationOpen(false);
                  return next;
                });
              }}
              className={cn(
                "flex items-center gap-1.5 p-1 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-(--focus-ring)",
                avatarOpen
                  ? "ring-2 ring-(--accent-lime)"
                  : "hover:ring-2 hover:ring-(--accent-lime)/40"
              )}
              aria-label="User menu"
              aria-expanded={avatarOpen}
            >
              <div className="relative grid size-8 place-items-center rounded-full bg-(--accent-lime) text-(--bg-app) font-bold text-xs shadow-xs">
                {getInitials(user?.name)}
                {(isPathsActive || isProgressActive || isInterviewActive) && (
                  <span className="md:hidden absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-(--accent-lime) ring-2 ring-(--bg-app) animate-pulse" />
                )}
              </div>
              <ChevronDown
                className={cn(
                  "size-3 text-(--text-muted) hidden sm:block transition-transform duration-200",
                  avatarOpen && "rotate-180"
                )}
              />
            </button>

            {/* Avatar Dropdown Menu */}
            <AnimatePresence>
              {avatarOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -4 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full mt-2 w-72 sm:w-60 rounded-2xl bg-(--bg-surface)/95 backdrop-blur-2xl border border-(--border-subtle) shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)] p-1.5 z-50 overflow-hidden"
                >
                  {/* User Profile Card */}
                  <Link
                    href="/account"
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.04] hover:border-(--accent-lime)/30 hover:bg-(--bg-surface-raised) transition-all group cursor-pointer"
                  >
                    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-(--accent-lime) to-[#9ce045] text-[11px] font-bold text-(--bg-app) shadow-sm group-hover:scale-105 transition-transform">
                      {getInitials(user?.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-(--text-primary) group-hover:text-(--accent-lime) transition-colors truncate">
                        {user?.name ?? "DSA Student"}
                      </p>
                      <p className="text-[11px] text-(--text-muted) truncate mt-0.5">
                        {user?.email ?? "student@dsaclub.io"}
                      </p>
                    </div>
                  </Link>

                  {/* Mobile-Only Exploration & Navigation Section (Paths, Progress, Interview) */}
                  <div className="md:hidden mt-2 pt-1 border-t border-(--border-subtle)">
                    <div className="flex items-center justify-between px-2.5 pt-1.5 pb-1">
                      <span className="text-[10px] font-bold tracking-wider text-(--text-muted) uppercase">
                        Explore
                      </span>
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-(--accent-lime)/10 text-(--accent-lime) border border-(--accent-lime)/20">
                        Quick Access
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      {/* Paths */}
                      <Link
                        href="/learning-paths"
                        onClick={() => setAvatarOpen(false)}
                        className={cn(
                          "flex items-center justify-between min-h-[44px] px-2.5 py-2 rounded-xl text-xs transition-all duration-150 group active:scale-[0.98]",
                          isPathsActive
                            ? "bg-(--accent-lime)/12 text-(--accent-lime) font-semibold border border-(--accent-lime)/25"
                            : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-raised)"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              "grid size-7 shrink-0 place-items-center rounded-lg transition-colors",
                              isPathsActive
                                ? "bg-(--accent-lime)/20 text-(--accent-lime)"
                                : "bg-(--bg-surface-raised) text-(--text-muted) group-hover:text-(--text-primary) group-hover:bg-(--bg-surface-hover)"
                            )}
                          >
                            <Compass className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-xs">Paths</div>
                            <div className="text-[10px] text-(--text-muted) truncate">
                              Curated Roadmaps
                            </div>
                          </div>
                        </div>
                        <ChevronRight
                          className={cn(
                            "size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5",
                            isPathsActive ? "text-(--accent-lime)" : "text-(--text-muted)"
                          )}
                        />
                      </Link>

                      {/* Progress */}
                      <Link
                        href="/progress"
                        onClick={() => setAvatarOpen(false)}
                        className={cn(
                          "flex items-center justify-between min-h-[44px] px-2.5 py-2 rounded-xl text-xs transition-all duration-150 group active:scale-[0.98]",
                          isProgressActive
                            ? "bg-(--accent-lime)/12 text-(--accent-lime) font-semibold border border-(--accent-lime)/25"
                            : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-raised)"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              "grid size-7 shrink-0 place-items-center rounded-lg transition-colors",
                              isProgressActive
                                ? "bg-(--accent-lime)/20 text-(--accent-lime)"
                                : "bg-(--bg-surface-raised) text-(--text-muted) group-hover:text-(--text-primary) group-hover:bg-(--bg-surface-hover)"
                            )}
                          >
                            <TrendingUp className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-xs">Progress</div>
                            <div className="text-[10px] text-(--text-muted) truncate">
                              Skill & Streak Insights
                            </div>
                          </div>
                        </div>
                        <ChevronRight
                          className={cn(
                            "size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5",
                            isProgressActive ? "text-(--accent-lime)" : "text-(--text-muted)"
                          )}
                        />
                      </Link>

                      {/* Interview */}
                      <Link
                        href="/interview"
                        onClick={() => setAvatarOpen(false)}
                        className={cn(
                          "flex items-center justify-between min-h-[44px] px-2.5 py-2 rounded-xl text-xs transition-all duration-150 group active:scale-[0.98]",
                          isInterviewActive
                            ? "bg-(--accent-lime)/12 text-(--accent-lime) font-semibold border border-(--accent-lime)/25"
                            : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-raised)"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              "grid size-7 shrink-0 place-items-center rounded-lg transition-colors",
                              isInterviewActive
                                ? "bg-(--accent-lime)/20 text-(--accent-lime)"
                                : "bg-(--bg-surface-raised) text-(--text-muted) group-hover:text-(--text-primary) group-hover:bg-(--bg-surface-hover)"
                            )}
                          >
                            <Building2 className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-xs">Company Prep</div>
                            <div className="text-[10px] text-(--text-muted) truncate">
                              Target Company Kits & Readiness
                            </div>
                          </div>
                        </div>
                        <ChevronRight
                          className={cn(
                            "size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5",
                            isInterviewActive ? "text-(--accent-lime)" : "text-(--text-muted)"
                          )}
                        />
                      </Link>
                    </div>
                  </div>

                  {/* Account & Settings Links */}
                  <div className="py-1 mt-1 border-t border-(--border-subtle)">
                    <Link
                      href="/account"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 min-h-[38px] text-xs font-medium text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-(--color-surface-2) rounded-lg transition-colors"
                    >
                      <User className="size-3.5 text-(--color-text-muted)" />
                      <span>Account</span>
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 min-h-[38px] text-xs font-medium text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-(--color-surface-2) rounded-lg transition-colors"
                    >
                      <Settings className="size-3.5 text-(--color-text-muted)" />
                      <span>Settings</span>
                    </Link>
                  </div>

                  {/* Sign Out */}
                  <div className="border-t border-(--border-subtle) pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarOpen(false);
                        setLogoutConfirmOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 min-h-[38px] text-xs font-medium text-(--color-red) hover:bg-(--color-red-subtle) rounded-lg transition-colors cursor-pointer"
                    >
                      <LogOut className="size-3.5" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Sign Out Confirmation Modal */}
      <AnimatePresence>
        {logoutConfirmOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => !isLoggingOut && setLogoutConfirmOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 4 }}
              transition={{ duration: 0.18, ease: motionEase }}
              className="relative w-full max-w-sm rounded-(--radius-card) bg-(--color-surface-1) border border-(--color-border) p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-(--color-red-subtle) text-(--color-red) shrink-0">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-(--color-text-primary)">
                    Sign Out
                  </h3>
                  <p className="text-xs text-(--color-text-secondary)">
                    Are you sure you want to end your current session?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <ButtonSecondary
                  size="sm"
                  onClick={() => setLogoutConfirmOpen(false)}
                  disabled={isLoggingOut}
                >
                  Cancel
                </ButtonSecondary>
                <ButtonDanger
                  size="sm"
                  onClick={handleSignOut}
                  loading={isLoggingOut}
                >
                  Sign out
                </ButtonDanger>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
}

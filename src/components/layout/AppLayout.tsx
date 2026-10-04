"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileBottomNav } from "./MobileBottomNav";
import { ToastProvider } from "@/components/ui/Toast";
import { NotificationProvider } from "@/components/notifications/notification-context";
import { LearnerSyncProvider } from "@/components/sync/learner-sync-context";
import { cn } from "@/lib/utils";

export interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  user?: {
    name?: string | null;
    email?: string | null;
  };
}

export function AppLayout({ children, title, user }: AppLayoutProps) {
  const pathname = usePathname();
  const isMissionPage = pathname?.startsWith("/missions/");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("dsa-club-sidebar-collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      } else if (typeof window !== "undefined" && window.innerWidth >= 768 && window.innerWidth < 1024) {
        setCollapsed(true);
      }
    } catch {
      // Ignore localStorage errors
    }
    setPreferenceLoaded(true);
  }, []);

  // Responsive breakpoint listener for smooth tablet experience (768px-1023px)
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined" && window.innerWidth >= 768 && window.innerWidth < 1024) {
        setCollapsed(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Lock window and body scrolling to ensure the dashboard/app shell never scrolls or reveals empty space
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
    const htmlEl = document.documentElement;
    const bodyEl = document.body;

    const prevHtmlOverflow = htmlEl.style.overflow;
    const prevBodyOverflow = bodyEl.style.overflow;
    const prevHtmlHeight = htmlEl.style.height;
    const prevBodyHeight = bodyEl.style.height;
    const prevHtmlOverscroll = htmlEl.style.overscrollBehavior;
    const prevBodyOverscroll = bodyEl.style.overscrollBehavior;

    htmlEl.classList.add("app-locked");
    bodyEl.classList.add("app-locked");
    htmlEl.style.overflow = "hidden";
    htmlEl.style.height = "100%";
    htmlEl.style.overscrollBehavior = "none";
    bodyEl.style.overflow = "hidden";
    bodyEl.style.height = "100%";
    bodyEl.style.overscrollBehavior = "none";

    return () => {
      htmlEl.classList.remove("app-locked");
      bodyEl.classList.remove("app-locked");
      htmlEl.style.overflow = prevHtmlOverflow;
      htmlEl.style.height = prevHtmlHeight;
      htmlEl.style.overscrollBehavior = prevHtmlOverscroll;
      bodyEl.style.overflow = prevBodyOverflow;
      bodyEl.style.height = prevBodyHeight;
      bodyEl.style.overscrollBehavior = prevBodyOverscroll;
    };
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("dsa-club-sidebar-collapsed", String(next));
      } catch {}
      return next;
    });
  };

  return (
    <ToastProvider>
      <NotificationProvider>
        <LearnerSyncProvider>
          <div className="flex h-screen h-dvh max-h-screen max-h-dvh w-full overflow-hidden overscroll-none bg-(--bg-app) text-(--text-primary)">
            {/* Sidebar Component */}
            <Sidebar
              collapsed={collapsed}
              onToggleCollapse={handleToggleCollapse}
              mobileOpen={mobileOpen}
              onMobileClose={() => setMobileOpen(false)}
              user={user}
            />

            {/* Desktop & Tablet Spacer for Fixed Sidebar */}
            <div
              className={cn(
                "hidden md:block shrink-0 transition-[width] duration-[160ms] ease-out",
                collapsed ? "w-[64px]" : "w-[64px] lg:w-[240px]"
              )}
              aria-hidden="true"
            />

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden min-w-0">
              <Header
                title={title}
                sidebarCollapsed={collapsed}
                onMobileMenuOpen={() => setMobileOpen(true)}
                user={user}
              />
              <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8 scrollbar-thin">
                <div className="max-w-[1240px] mx-auto w-full">{children}</div>
              </main>
              {/* Dedicated portal container for persistent bottom bars (e.g. Mission Workspace) */}
              <div id="app-bottom-bar-portal" />
              {!isMissionPage && (
                <footer className="hidden md:block text-center py-3 text-(--text-muted) text-caption border-t border-(--border-subtle) bg-(--bg-app) shrink-0">
                  DSA Club Learning OS — Minimal, fast, focused.
                </footer>
              )}
              {/* Mobile bottom nav — visible on <md only when not on mission reading page */}
              {!isMissionPage && <MobileBottomNav />}
            </div>
          </div>
        </LearnerSyncProvider>
      </NotificationProvider>
    </ToastProvider>
  );
}

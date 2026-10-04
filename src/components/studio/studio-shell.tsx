"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, ExternalLink, ChevronRight, Zap } from "lucide-react";
import { studioNav } from "@/lib/studio-data";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/logout-button";
import type { StudioSettings } from "@/lib/studio-settings";

const sections = ["Content", "Management", "System"] as const;

type StudioShellProps = {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null };
  settings: StudioSettings;
};

const accentVars: Record<StudioSettings["accentColor"], React.CSSProperties> = {
  blue: { "--primary": "#3b82f6", "--ring": "#3b82f6" } as React.CSSProperties,
  emerald: { "--primary": "#10b981", "--ring": "#10b981" } as React.CSSProperties,
  violet: { "--primary": "#8b5cf6", "--ring": "#8b5cf6" } as React.CSSProperties,
  amber: { "--primary": "#f59e0b", "--ring": "#f59e0b" } as React.CSSProperties,
  rose: { "--primary": "#f43f5e", "--ring": "#f43f5e" } as React.CSSProperties,
};

function initials(name?: string | null) {
  return (name ?? "Admin")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function StudioShell({ children, user, settings }: StudioShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const compact = settings.sidebarDensity === "compact";

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
    setPendingHref(null);
  }, [pathname]);

  return (
    <div className="dark studio-surface min-h-screen studio-text relative" style={accentVars[settings.accentColor]}>
      <div className="studio-grid pointer-events-none fixed inset-0 opacity-100" aria-hidden="true" />
      {pendingHref && (
        <div className="fixed left-0 right-0 top-0 z-[70] h-0.5 overflow-hidden bg-purple-500/20">
          <div className="h-full w-1/2 animate-[studio-nav-progress_900ms_ease-in-out_infinite] rounded-full bg-purple-500" />
        </div>
      )}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#06010e]/90 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        aria-label="Studio navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col studio-sidebar transition-transform duration-300 ease-out lg:translate-x-0 shadow-[18px_0_60px_rgba(0,0,0,0.5)]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Studio brand */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-purple-500/10 px-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-[11px] font-bold text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]">
              <Zap size={15} />
            </span>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-sm font-bold tracking-tight studio-text truncate">
                {settings.appName}
              </span>
              <span className="text-[10px] studio-text-subtle truncate">Content Management Platform</span>
            </div>
          </div>
          <button
            className="focus-ring grid size-8 place-items-center rounded-md studio-text-subtle hover:studio-text hover:bg-purple-500/10 lg:hidden transition-colors"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={15} />
          </button>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin"
          aria-label="Studio navigation"
        >
          {sections.map((section, si) => (
            <div key={section} className={cn(si > 0 && "mt-6")}>
              <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider studio-text-subtle">
                {section}
              </p>
              <div className="space-y-0.5">
                {studioNav
                  .filter((item) => item.section === section)
                  .map((item) => {
                    const isRouteActive =
                      item.href === "/studio"
                        ? pathname === "/studio"
                        : pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);
                    const isPending = pendingHref === item.href;
                    const isActive = isRouteActive || isPending;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setPendingHref(item.href)}
                        aria-current={isActive ? "page" : undefined}
                        title={item.description}
                        className={cn(
                          "pressable group studio-nav-item flex items-center gap-3 px-2 text-[14px] font-medium transition-colors",
                          compact ? "py-1" : "py-1.5",
                          isActive
                            ? "studio-nav-active"
                            : "studio-text-muted hover:studio-text"
                        )}
                      >
                        <Icon
                          size={14}
                          className={cn(
                            "shrink-0 transition-colors",
                            isActive
                              ? "studio-text"
                              : "studio-text-muted group-hover:studio-text"
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                        {isActive && (
                          <ChevronRight size={13} className="ml-auto shrink-0 studio-text-subtle transition-transform group-hover:translate-x-0.5" />
                        )}
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-purple-500/10 p-3 space-y-2">
          <Link
            href="/dashboard"
            className="pressable flex items-center gap-2 rounded-md px-2 py-1.5 text-sm studio-text-muted transition-colors hover:bg-purple-500/10 hover:studio-text"
          >
            <ExternalLink size={12} />
            View Student Site
          </Link>
          <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
            <span className="grid size-7 shrink-0 place-items-center rounded bg-purple-500/10 text-[11px] font-bold text-purple-400 border border-purple-500/20">
              {initials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold studio-text">{user.name}</p>
              <p className="truncate text-xs studio-text-subtle">Admin</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="min-h-screen lg:pl-[240px]">
        {/* Header */}
        <header className="sticky top-0 z-30 studio-topbar">
          <div className="flex h-14 items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                className="focus-ring grid size-8 place-items-center rounded-md studio-text-muted hover:bg-purple-500/10 lg:hidden transition-colors"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu size={16} />
              </button>
              {/* Breadcrumb */}
              <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-sm sm:flex">
                <span className="studio-text-subtle font-medium">Studio</span>
                {pathname !== "/studio" && (
                  <>
                    <ChevronRight size={12} className="studio-text-subtle" />
                    <span className="font-semibold text-purple-200 capitalize">
                      {pathname.split("/").filter(Boolean).slice(1).join(" / ").replaceAll("-", " ")}
                    </span>
                  </>
                )}
              </nav>
            </div>

            {/* Right area */}
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-400 sm:inline-flex items-center gap-1 border border-cyan-500/20 shadow-[0_0_8px_rgba(34,211,238,0.2)]">
                <Zap size={10} />
                Admin
              </span>
              <Link
                href="/dashboard"
                className="focus-ring pressable hidden h-9 items-center gap-1.5 rounded-md studio-btn-outline px-3 text-sm sm:flex"
              >
                <ExternalLink size={12} />
                Student Site
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 xl:px-8">
          <div key={pathname} className="studio-page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

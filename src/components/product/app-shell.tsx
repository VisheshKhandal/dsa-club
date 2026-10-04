"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ArrowRight, Bell, ChevronDown, ChevronRight, Command, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { productNav } from "@/lib/app-data";
import { LogoutButton } from "@/components/auth/logout-button";
import { NotificationBell } from "@/components/notifications/notification-center";

type CommandResult = { title: string; href: string; category: string; description: string };
type CommandGroup = { category: string; results: CommandResult[] };

function initials(name?: string | null) {
  return (name ?? "DSA Club").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function formatCrumb(segment: string): string {
  return segment.replaceAll("-", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

const SIDEBAR_EXPANDED = 272;
const SIDEBAR_COLLAPSED = 68;

export function AppShell({ children, user }: { children: React.ReactNode; user?: { name?: string | null; email?: string | null } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [remoteResults, setRemoteResults] = useState<CommandResult[]>([]);
  const [remoteGroups, setRemoteGroups] = useState<CommandGroup[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "error">("idle");
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarPreferenceLoaded, setSidebarPreferenceLoaded] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const profileRef = useRef<HTMLDivElement>(null);
  const crumbs = pathname.split("/").filter(Boolean);
  const sections = ["Core", "Practice", "Account"] as const;

  const navResults = useMemo(
    () =>
      productNav
        .map((item) => ({ title: item.label, href: item.href, category: item.section, description: `Open ${item.label}` }))
        .filter((item) => `${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8),
    [query]
  );
  const results = query.trim() ? remoteResults : navResults;
  const resultGroups = query.trim() ? remoteGroups : [{ category: "Suggestions", results: navResults }];

  useEffect(() => {
    setSidebarOpen(false);
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    const saved = window.localStorage.getItem("dsa-club-sidebar-collapsed");
    if (saved) setCollapsed(saved === "true");
    setSidebarPreferenceLoaded(true);
  }, []);

  useEffect(() => {
    if (!sidebarPreferenceLoaded) return;
    window.localStorage.setItem("dsa-club-sidebar-collapsed", String(collapsed));
  }, [collapsed, sidebarPreferenceLoaded]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const anchor = (event.target as Element | null)?.closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");
      if (!href || target || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === pathname) return;
      setPendingHref(`${url.pathname}${url.search}${url.hash}`);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!commandOpen || !query.trim()) { setRemoteResults([]); setRemoteGroups([]); setSearchStatus("idle"); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchStatus("loading");
      try {
        const response = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}&limit=12`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search failed");
        const payload = await response.json() as { results: CommandResult[]; groups?: CommandGroup[] };
        setRemoteResults(payload.results ?? []);
        setRemoteGroups(payload.groups ?? []);
        setSearchStatus("idle");
      } catch (error) {
        if (!controller.signal.aborted) {
          setRemoteResults([]);
          setRemoteGroups([]);
          setSearchStatus("error");
        }
      }
    }, 120);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [commandOpen, query]);

  useEffect(() => {
    if (!commandOpen) return;
    setActiveIndex(0);
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); }
      if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
      if (event.key === "Enter" && results[activeIndex]) go(results[activeIndex].href);
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commandOpen, results, activeIndex]);

  useEffect(() => {
    if (!profileOpen) return;
    const handler = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  function go(href: string) {
    setCommandOpen(false);
    setQuery("");
    setPendingHref(href);
    router.push(href);
  }

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  return (
    <div className="app-surface min-h-screen text-foreground">
      <div className="aurora-grid pointer-events-none fixed inset-0 opacity-80" aria-hidden="true" />

      {pendingHref && (
        <div className="fixed left-0 right-0 top-0 z-[70] h-[2px] overflow-hidden bg-purple-400/10">
          <div className="h-full w-1/2 animate-[studio-nav-progress_700ms_ease-in-out_infinite] rounded-full bg-gradient-to-r from-fuchsia-400 via-purple-300 to-violet-400 shadow-[0_0_18px_rgba(192,132,252,0.7)]" />
        </div>
      )}

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-black/75 backdrop-blur-md lg:hidden"
            onClick={() => setSidebarOpen(false)} aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        aria-label="Sidebar navigation"
        animate={{ width: sidebarWidth }}
        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/[0.07] bg-[#06010c]/96 shadow-[18px_0_60px_rgba(0,0,0,0.4)] backdrop-blur-2xl overflow-hidden lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ width: sidebarOpen ? SIDEBAR_EXPANDED : undefined }}
      >
        {/* Brand */}
        <div className="flex h-[60px] shrink-0 items-center border-b border-white/[0.07] px-4">
          <Link href="/dashboard" onClick={() => setPendingHref("/dashboard")} className="flex items-center gap-3 min-w-0" title={collapsed ? "DSA Club" : undefined}>
            {collapsed ? (
              <Image src="/icons/dsa-club-icon.png" alt="DSA Club" width={32} height={32} className="object-contain" priority />
            ) : (
              <BrandLogo width={140} height={36} priority />
            )}
          </Link>
          <button className="focus-ring ml-auto grid size-8 place-items-center rounded-lg text-purple-100/60 hover:bg-white/[0.07] hover:text-white lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar"><X size={16} /></button>
        </div>

        {/* Search */}
        <div className="px-3 pt-4 pb-2">
          <button onClick={() => { setSidebarOpen(false); setCommandOpen(true); }} className="focus-ring flex h-9 w-full items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.03] px-3 text-sm text-purple-100/50 transition hover:border-purple-400/30 hover:bg-purple-400/[0.08] hover:text-purple-100" title={collapsed ? "Search (Ctrl K)" : undefined}>
            <span className="flex items-center gap-2">
              <Search size={13} className="shrink-0" />
              <AnimatePresence initial={false}>
                {!collapsed && (<motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden whitespace-nowrap text-xs">Search workspace</motion.span>)}
              </AnimatePresence>
            </span>
            <AnimatePresence initial={false}>
              {!collapsed && (<motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="rounded border border-white/[0.08] bg-black/20 px-1.5 py-0.5 font-mono text-[9px] text-purple-100/40">⌃K</motion.span>)}
            </AnimatePresence>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 scrollbar-thin" aria-label="Main navigation">
          {sections.map((section, sectionIndex) => {
            const items = productNav.filter((item) => item.section === section);
            if (!items.length) return null;
            return (
              <div key={section} className={sectionIndex > 0 ? "mt-5" : ""}>
                <AnimatePresence initial={false}>
                  {!collapsed && (<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="label-xs mb-2 px-2 text-purple-100/28">{section}</motion.p>)}
                </AnimatePresence>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const isPending = pendingHref === item.href;
                    const Icon = item.icon;
                    return (
                      <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} onClick={() => { setSidebarOpen(false); setPendingHref(item.href); }} aria-current={active || isPending ? "page" : undefined}
                        className={`group relative flex items-center gap-3 rounded-lg py-2.5 text-[13px] transition-all ${collapsed ? "justify-center px-0" : "px-3"} ${active || isPending ? "bg-purple-500/[0.12] font-semibold text-purple-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" : "font-medium text-purple-100/60 hover:bg-purple-500/[0.08] hover:text-purple-50"}`}>
                        {(active || isPending) && (
                          <motion.span layoutId="nav-active" className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-purple-400 shadow-[0_0_12px_rgba(192,132,252,0.6)]" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                        )}
                        <Icon size={16} className={`shrink-0 transition-all ${active || isPending ? "text-purple-300 drop-shadow-[0_0_8px_rgba(216,180,254,0.4)]" : "text-purple-100/40 group-hover:text-purple-300/80"}`} />
                        <AnimatePresence initial={false}>
                          {!collapsed && (<motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden whitespace-nowrap">{item.label}</motion.span>)}
                        </AnimatePresence>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="shrink-0 border-t border-white/[0.07] p-3">
          <button className="hidden lg:flex focus-ring w-full items-center justify-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.025] py-1.5 text-xs font-medium text-purple-100/45 transition hover:border-purple-300/18 hover:bg-white/[0.05] hover:text-white mb-3" onClick={() => setCollapsed((v) => !v)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
            <AnimatePresence initial={false}>
              {!collapsed && (<motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden whitespace-nowrap">Collapse</motion.span>)}
            </AnimatePresence>
          </button>
          <div className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${collapsed ? "justify-center" : ""}`}>
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-purple-500/70 to-fuchsia-500/50 text-[10px] font-bold text-white">{initials(user?.name)}</span>
            <AnimatePresence initial={false}>
              {!collapsed && (<motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.15 }} className="min-w-0 overflow-hidden">
                <p className="truncate text-xs font-semibold text-white leading-tight">{user?.name ?? "DSA Club"}</p>
                <p className="truncate text-[10px] text-purple-100/38 leading-tight">{user?.email}</p>
              </motion.div>)}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>

      {/* Content wrapper — shifts with sidebar on desktop */}
      <div className="relative min-h-screen" style={{ paddingLeft: 0 }}>
        <motion.div
          className="hidden lg:block pointer-events-none fixed inset-y-0 left-0"
          animate={{ width: sidebarWidth }}
          transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
          aria-hidden="true"
        />
        <div
          className="relative min-h-screen transition-none lg:transition-all"
          style={{ paddingLeft: 0 }}
        >
          {/* This div handles the layout offset on desktop */}
          <motion.div
            className="fixed hidden lg:block inset-y-0 left-0 pointer-events-none z-[-1]"
            animate={{ width: sidebarWidth }}
            transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
          />

          {/* Actual content wrapped to offset from sidebar on desktop */}
          <motion.div
            animate={{ marginLeft: sidebarWidth }}
            transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
            className="hidden lg:block"
          >
            {/* Desktop header */}
            <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#030008]/82 backdrop-blur-xl">
              <div className="flex h-14 items-center justify-between px-5">
                <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
                  {crumbs.length === 0 ? (<span className="text-purple-100/38 text-[13px]">Home</span>) : (
                    crumbs.map((crumb, index) => {
                      const href = `/${crumbs.slice(0, index + 1).join("/")}`;
                      const current = index === crumbs.length - 1;
                      return (
                        <span key={`${crumb}-${index}`} className="flex items-center gap-1.5">
                          {index > 0 && <ChevronRight size={11} className="text-purple-100/18" />}
                          {current ? (<span className="font-semibold text-white text-[13px]">{formatCrumb(crumb)}</span>) : (
                            <Link href={href} onClick={() => setPendingHref(href)} className="pressable rounded px-1 py-0.5 text-[13px] text-purple-100/42 hover:bg-white/[0.05] hover:text-white">{formatCrumb(crumb)}</Link>
                          )}
                        </span>
                      );
                    })
                  )}
                </nav>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCommandOpen(true)} className="focus-ring hidden h-8 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.028] px-3 text-xs font-medium text-purple-100/50 transition hover:border-purple-300/22 hover:bg-purple-300/[0.06] hover:text-white md:flex">
                    <Command size={12} /><span>Command</span><span className="rounded border border-white/[0.08] px-1 py-0.5 font-mono text-[9px]">⌃K</span>
                  </button>
                  <NotificationBell />
                  <div className="relative" ref={profileRef}>
                    <button onClick={() => setProfileOpen(!profileOpen)} className="focus-ring flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.028] pl-1 pr-2 transition hover:border-purple-300/22 hover:bg-purple-300/[0.06]" aria-label="Open profile menu" aria-haspopup="true" aria-expanded={profileOpen}>
                      <span className="grid size-6 place-items-center rounded-md bg-gradient-to-br from-purple-500/70 to-fuchsia-500/50 text-[9px] font-bold text-white">{initials(user?.name)}</span>
                      <ChevronDown size={11} className={`text-purple-100/45 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {profileOpen && (
                        <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }} role="menu" className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-white/[0.1] bg-[#0c0716]/97 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                          <div className="mb-1.5 border-b border-white/[0.07] px-2 pb-1.5">
                            <p className="truncate text-xs font-semibold text-white">{user?.name ?? "DSA Club member"}</p>
                            <p className="mt-0.5 truncate text-[10px] text-purple-100/38">{user?.email}</p>
                          </div>
                          <Link role="menuitem" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-purple-100/60 transition-colors hover:bg-white/[0.055] hover:text-white" href="/account" onClick={() => { setProfileOpen(false); setPendingHref("/account"); }}>Account Settings</Link>
                          <div className="mt-1 border-t border-white/[0.07] pt-1"><LogoutButton /></div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </header>
            <main key={pathname} className="animate-reveal-up mx-auto w-full max-w-[1280px] px-5 py-8 xl:px-10">{children}</main>
            <footer className="border-t border-white/[0.05] px-5 py-5 text-center text-xs text-purple-100/25">DSA Club Learning OS — Minimal, fast, focused.</footer>
          </motion.div>

          {/* Mobile layout (no sidebar offset) */}
          <div className="lg:hidden">
            <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#030008]/82 backdrop-blur-xl">
              <div className="flex h-14 items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <button className="focus-ring grid size-8 place-items-center rounded-lg text-purple-100/60 hover:bg-white/[0.07] hover:text-white" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar"><Menu size={16} /></button>
                  <span className="text-sm font-semibold text-white">{crumbs.length > 0 ? formatCrumb(crumbs[crumbs.length - 1]) : "Dashboard"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCommandOpen(true)} className="focus-ring grid size-8 place-items-center rounded-lg border border-white/[0.07] bg-white/[0.028] text-purple-100/50 hover:text-white"><Search size={13} /></button>
                  <NotificationBell />
                </div>
              </div>
            </header>
            <main key={`mobile-${pathname}`} className="animate-reveal-up mx-auto w-full max-w-[1280px] px-4 py-6">{children}</main>
          </div>
        </div>
      </div>

      {/* Command palette */}
      <AnimatePresence>
        {commandOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 px-4 pt-[12vh] backdrop-blur-md" onMouseDown={() => setCommandOpen(false)} role="dialog" aria-modal="true" aria-label="Command palette">
            <motion.div initial={{ opacity: 0, y: -10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.97 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0c0716]/97 shadow-[0_32px_90px_rgba(0,0,0,0.65)] backdrop-blur-2xl" onMouseDown={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 border-b border-white/[0.07] px-4">
                <Search size={15} className="shrink-0 text-purple-200/48" />
                <input autoFocus value={query} onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }} placeholder="Search routes, topics, missions..." className="h-12 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-purple-100/32" />
                <button onClick={() => setCommandOpen(false)} className="focus-ring grid size-6 shrink-0 place-items-center rounded-lg text-purple-100/42 hover:bg-white/[0.08] hover:text-white" aria-label="Close command palette"><X size={13} /></button>
              </div>
              <div className="max-h-[320px] overflow-y-auto scrollbar-thin p-2">
                {searchStatus === "loading" ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Search size={20} className="mb-3 animate-pulse text-purple-100/36" />
                    <p className="text-sm font-medium text-purple-100/56">Searching MongoDB...</p>
                    <p className="mt-1 text-xs text-purple-100/30">Checking topics, missions, problems, patterns, companies, revision, and learning content.</p>
                  </div>
                ) : searchStatus === "error" ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Search size={20} className="mb-3 text-rose-200/55" />
                    <p className="text-sm font-medium text-rose-100/80">Search is unavailable.</p>
                    <p className="mt-1 text-xs text-purple-100/30">Try again in a moment or use the sidebar navigation.</p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Search size={20} className="mb-3 text-purple-100/28" />
                    <p className="text-sm font-medium text-purple-100/48">{query.trim() ? `No results for "${query.trim()}".` : "No suggestions available."}</p>
                    <p className="mt-1 text-xs text-purple-100/28">Try a topic, mission, problem, pattern, company, revision item, or learning path.</p>
                  </div>
                ) : (
                  <>
                    {resultGroups.map((group) => (
                      <div key={group.category} className="pb-1">
                        <p className="px-3 pb-1.5 pt-1 label-xs text-purple-100/28">{group.category}</p>
                        {group.results.map((item) => {
                          const index = results.findIndex((result) => result.href === item.href && result.title === item.title);
                          return (
                            <button key={`${item.href}-${item.title}`} onClick={() => go(item.href)} className={`focus-ring flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${index === activeIndex ? "bg-purple-400/[0.11] text-white" : "hover:bg-white/[0.045]"}`}>
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold">{item.title}</span>
                                <span className="mt-0.5 block truncate text-xs text-purple-100/38">{item.description}</span>
                              </span>
                              <span className="flex shrink-0 items-center gap-2">
                                <span className="label-xs text-purple-100/32">{item.category}</span>
                                <ArrowRight size={11} className="text-purple-100/32" />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

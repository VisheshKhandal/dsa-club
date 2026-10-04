"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  LayoutDashboard,
  Calendar,
  CheckSquare,
  SlidersHorizontal,
} from "lucide-react";
import { OverviewTab } from "./OverviewTab";
import { TodayPlanBoard } from "./TodayPlanBoard";
import { WeekScheduleTab } from "./WeekScheduleTab";
import { ManagePlanTab } from "./ManagePlanTab";
import type { IntelligenceViewProps } from "./types";
import { cn } from "@/lib/utils";

type TabKey = "today" | "week" | "overview" | "manage";

// Preserved for type safety & regression test compatibility
const TABS: Array<{ key: TabKey; label: string; icon: React.ElementType }> = [
  { key: "today", label: "Today", icon: CheckSquare },
  { key: "week", label: "This Week", icon: Calendar },
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "manage", label: "Manage Plan", icon: SlidersHorizontal },
];

const VIEW_TABS = TABS.filter((t) => t.key !== "manage");

const TAB_INDEX_MAP: Record<TabKey, number> = {
  today: 0,
  week: 1,
  overview: 2,
  manage: 3,
};

export function IntelligenceView(props: IntelligenceViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldReduceMotion = useReducedMotion();

  const queryTab = searchParams?.get("tab") as TabKey | null;
  const initialActive = queryTab && TABS.some((t) => t.key === queryTab) ? queryTab : props.initialTab || "today";
  const [activeTab, setActiveTab] = useState<TabKey>(initialActive);
  const [prevTab, setPrevTab] = useState<TabKey>(initialActive);

  useEffect(() => {
    if (queryTab && TABS.some((t) => t.key === queryTab) && queryTab !== activeTab) {
      setPrevTab(activeTab);
      setActiveTab(queryTab);
    }
  }, [queryTab, activeTab]);

  const handleTabChange = (key: TabKey) => {
    if (key === activeTab) return;
    setPrevTab(activeTab);
    setActiveTab(key);
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("tab", key);
    router.replace(`/intelligence?${params.toString()}`, { scroll: false });
    router.refresh();
  };

  // Directional calculation: +1 moving right, -1 moving left
  const direction = TAB_INDEX_MAP[activeTab] >= TAB_INDEX_MAP[prevTab] ? 1 : -1;

  // Purposeful, brief Apple HIG-aligned motion: 160-220ms fade with 8px subtle directional translate
  const pageVariants = {
    enter: (dir: number) => ({
      opacity: 0,
      x: shouldReduceMotion ? 0 : dir * 8,
    }),
    center: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.18, // 180ms
        ease: "easeOut" as const,
      },
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: shouldReduceMotion ? 0 : dir * -8,
      transition: {
        duration: 0.16, // 160ms
        ease: "easeOut" as const,
      },
    }),
  };

  return (
    <div className="mx-auto max-w-[1240px] pb-12 -mt-2 sm:-mt-3 space-y-5">
      {/* ── PLAN HEADER & VIEW NAVIGATION ── */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-(--border-subtle)/60"
      >
        {/* Brand & Context */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-(--text-primary)">
              Study Plan
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-(--border-subtle) bg-(--bg-surface-raised) px-2 py-0.5 text-[10px] font-semibold text-(--text-muted)">
              <Sparkles className="size-3 text-(--accent-lime)" />
              Powered by Club Intelligence
            </span>
          </div>
        </div>

        {/* Plan Navigation: [ Today ] [ This Week ] [ Overview ] + [ Adjust plan ⚙ ] */}
        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shrink-0">
          {/* Compact Segmented Switcher (Views) */}
          <div
            role="tablist"
            aria-label="Plan Views"
            className="relative flex items-center rounded-xl border border-(--border-subtle) bg-(--bg-surface)/90 p-1 shadow-xs gap-0.5"
          >
            {VIEW_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={cn(
                    "relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 shrink-0 cursor-pointer select-none",
                    isActive
                      ? "text-(--text-primary)"
                      : "text-(--text-muted) hover:text-(--text-secondary)"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activePlanTabIndicator"
                      className="absolute inset-0 rounded-lg bg-(--bg-surface-raised) border border-(--border-subtle) shadow-xs"
                      transition={{ type: "spring", stiffness: 480, damping: 36 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon
                      className={cn(
                        "size-3.5 transition-colors",
                        isActive ? "text-(--accent-lime)" : "text-(--text-muted)"
                      )}
                    />
                    <span>{tab.label}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Separate Secondary Configuration Action: Adjust plan ⚙ */}
          <button
            type="button"
            onClick={() => handleTabChange("manage")}
            aria-label="Adjust study plan settings"
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 shrink-0 cursor-pointer shadow-xs",
              activeTab === "manage"
                ? "border-(--accent-lime)/50 bg-(--accent-lime)/15 text-(--accent-lime) shadow-[0_0_12px_rgba(200,255,0,0.08)]"
                : "border-(--border-subtle) bg-(--bg-surface)/90 text-(--text-secondary) hover:text-(--text-primary) hover:border-(--border-strong) hover:bg-(--bg-surface-raised)"
            )}
          >
            <SlidersHorizontal className="size-3.5" />
            <span>Adjust plan</span>
            <span className="text-[11px] opacity-75">⚙</span>
          </button>
        </div>
      </div>

      {/* ── ACTIVE VIEW: Brief 160-220ms directional transition ── */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={activeTab}
          custom={direction}
          variants={pageVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="min-h-[420px]"
        >
          {activeTab === "overview" && <OverviewTab {...props} />}
          {activeTab === "today" && <TodayPlanBoard {...props} />}
          {activeTab === "week" && <WeekScheduleTab {...props} />}
          {activeTab === "manage" && <ManagePlanTab {...props} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

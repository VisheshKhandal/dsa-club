"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Filter,
  GraduationCap,
  Layers,
  LineChart,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Target,
  Trophy,
  X,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  NotificationItemData,
  NotificationType,
} from "./notification-context";
import {
  NotificationCard,
  GroupedNotificationCard,
  SmartEmptyState,
} from "./notification-center";

export type TimelineSection = "Today" | "Yesterday" | "Earlier";

function getTimelineBucket(isoDate: string): TimelineSection {
  const date = new Date(isoDate);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 3600 * 1000);

  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";
  return "Earlier";
}

export function NotificationsPageView({
  initialNotifications,
}: {
  initialNotifications?: NotificationItemData[];
}) {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications();

  const [activeCategory, setActiveCategory] = useState<
    "all" | "unread" | "revision" | "milestone" | "recommendation" | "system"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const reduced = useReducedMotion();

  // Category counts
  const counts = useMemo(() => {
    return {
      all: notifications.length,
      unread: notifications.filter((n) => n.status === "unread").length,
      revision: notifications.filter((n) => n.type === "revision_due").length,
      milestone: notifications.filter((n) => n.type === "achievement").length,
      recommendation: notifications.filter((n) => n.type === "recommendation").length,
      system: notifications.filter((n) => n.type === "system").length,
    };
  }, [notifications]);

  // Filter & Search
  const filtered = useMemo(() => {
    return notifications.filter((item) => {
      // Category filter
      if (activeCategory === "unread" && item.status !== "unread") return false;
      if (activeCategory === "revision" && item.type !== "revision_due") return false;
      if (activeCategory === "milestone" && item.type !== "achievement") return false;
      if (activeCategory === "recommendation" && item.type !== "recommendation") return false;
      if (activeCategory === "system" && item.type !== "system") return false;

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchBody = item.body.toLowerCase().includes(query);
        const matchType = item.type.toLowerCase().includes(query);
        if (!matchTitle && !matchBody && !matchType) return false;
      }

      return true;
    });
  }, [notifications, activeCategory, searchQuery]);

  // Timeline Grouping
  const timelineGroups = useMemo(() => {
    const buckets: Record<
      TimelineSection,
      Array<{ type: "single"; item: NotificationItemData } | { type: "group"; key: string; items: NotificationItemData[] }>
    > = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };

    // Group items within each bucket
    const itemBuckets: Record<TimelineSection, NotificationItemData[]> = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };

    for (const item of filtered) {
      const bucket = getTimelineBucket(item.scheduledAt);
      itemBuckets[bucket].push(item);
    }

    (Object.keys(itemBuckets) as TimelineSection[]).forEach((bucket) => {
      const itemsInBucket = itemBuckets[bucket];
      const groupedMap = new Map<string, NotificationItemData[]>();

      for (const item of itemsInBucket) {
        if (item.groupKey) {
          if (!groupedMap.has(item.groupKey)) groupedMap.set(item.groupKey, []);
          groupedMap.get(item.groupKey)!.push(item);
        } else {
          buckets[bucket].push({ type: "single", item });
        }
      }

      groupedMap.forEach((items, key) => {
        if (items.length === 1) {
          buckets[bucket].push({ type: "single", item: items[0] });
        } else {
          buckets[bucket].push({ type: "group", key, items });
        }
      });
    });

    return buckets;
  }, [filtered]);

  const hasAnyResults =
    timelineGroups.Today.length > 0 ||
    timelineGroups.Yesterday.length > 0 ||
    timelineGroups.Earlier.length > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-(--color-border) pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-(--color-text-primary)">
              Notifications
            </h1>
            {unreadCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-(--color-purple-subtle) text-(--color-purple) border border-(--color-purple)/25">
                {unreadCount} unread
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-(--color-surface-2) text-(--color-text-muted) border border-(--color-border)">
                All caught up
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-(--color-text-secondary) mt-1 max-w-xl">
            Stay on top of spaced repetition drills, mastery milestones, and personalized study recommendations.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) text-xs font-semibold text-(--color-text-primary) hover:border-(--color-purple)/40 hover:text-(--color-purple) transition-colors"
            >
              <CheckCheck className="size-3.5" />
              <span>Mark all read</span>
            </button>
          )}
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-(--radius-btn) bg-(--color-surface-1) border border-(--color-border) text-xs font-medium text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-(--color-surface-2) transition-colors"
            title="Notification preferences"
          >
            <Settings className="size-3.5" />
            <span className="hidden sm:inline">Preferences</span>
          </Link>
        </div>
      </header>

      {/* Toolbar: Category Filters & Search */}
      <section aria-label="Notification filters" className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(
            [
              { id: "all", label: "All", count: counts.all },
              { id: "unread", label: "Unread", count: counts.unread },
              { id: "revision", label: "Revision", count: counts.revision },
              { id: "milestone", label: "Milestones", count: counts.milestone },
              { id: "recommendation", label: "Recommendations", count: counts.recommendation },
              { id: "system", label: "System", count: counts.system },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-(--radius-btn) text-xs font-medium whitespace-nowrap transition-all",
                activeCategory === tab.id
                  ? "bg-(--color-purple) text-white font-semibold shadow-sm"
                  : "bg-(--color-surface-1) border border-(--color-border) text-(--color-text-secondary) hover:bg-(--color-surface-2) hover:text-(--color-text-primary)"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-bold leading-none",
                  activeCategory === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-(--color-surface-2) text-(--color-text-muted)"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Filter */}
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-(--color-text-muted)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search alerts..."
            className="w-full pl-8 pr-7 py-1.5 rounded-(--radius-btn) bg-(--color-surface-1) border border-(--color-border) text-xs text-(--color-text-primary) placeholder:text-(--color-text-muted) outline-none focus:border-(--color-purple) focus:ring-1 focus:ring-(--color-purple)"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-(--color-text-muted) hover:text-(--color-text-primary)"
              aria-label="Clear search"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </section>

      {/* Notification Timeline List */}
      <main className="space-y-6">
        {loading && notifications.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 rounded-(--radius-card) bg-(--color-surface-1) border border-(--color-border) animate-pulse"
              />
            ))}
          </div>
        ) : error && notifications.length === 0 ? (
          <div className="rounded-(--radius-card) bg-(--color-surface-1) border border-(--color-border) p-10 text-center text-sm text-(--color-text-secondary)">
            <p>{error}</p>
            <button
              type="button"
              onClick={refresh}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-(--color-purple) hover:underline"
            >
              <RefreshCw className="size-3" /> Try reloading
            </button>
          </div>
        ) : !hasAnyResults ? (
          <div className="rounded-(--radius-card) bg-(--color-surface-1) border border-(--color-border) overflow-hidden shadow-sm">
            <SmartEmptyState
              filterCategory={activeCategory}
              onResetFilter={() => {
                setActiveCategory("all");
                setSearchQuery("");
              }}
            />
          </div>
        ) : (
          (Object.keys(timelineGroups) as TimelineSection[]).map((bucket) => {
            const entries = timelineGroups[bucket];
            if (entries.length === 0) return null;

            return (
              <section key={bucket} aria-label={bucket} className="space-y-2.5">
                {/* Timeline Section Heading */}
                <div className="flex items-center gap-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-(--color-text-muted)">
                    {bucket}
                  </h2>
                  <div className="h-[1px] flex-1 bg-(--color-border)/60" />
                  <span className="text-[11px] font-mono text-(--color-text-muted)">
                    {entries.length} {entries.length === 1 ? "alert" : "alerts"}
                  </span>
                </div>

                {/* Timeline Card Items */}
                <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) overflow-hidden divide-y divide-(--color-border)/50 shadow-sm">
                  {entries.map((entry) => {
                    if (entry.type === "group") {
                      return (
                        <GroupedNotificationCard
                          key={entry.key}
                          groupKey={entry.key}
                          items={entry.items}
                          onRead={markAsRead}
                          compact={false}
                        />
                      );
                    }
                    return (
                      <NotificationCard
                        key={entry.item.id}
                        item={entry.item}
                        onRead={markAsRead}
                        compact={false}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </main>

      {/* System Context Footer Note */}
      <footer className="pt-6 border-t border-(--color-border)/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-(--color-text-muted)">
        <p>
          Notifications are tailored to your target company tracks, spaced repetition queue, and activity pace.
        </p>
        <Link
          href="/settings"
          className="font-medium text-(--color-purple) hover:underline shrink-0"
        >
          Configure alert triggers →
        </Link>
      </footer>
    </div>
  );
}

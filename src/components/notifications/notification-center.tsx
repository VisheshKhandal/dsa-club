"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  ExternalLink,
  GraduationCap,
  Layers,
  RefreshCw,
  Settings,
  Sparkles,
  Target,
  Trophy,
  X,
  CheckCircle2,
  LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  NotificationItemData,
  NotificationType,
} from "./notification-context";

export const NOTIFICATION_METAS: Record<
  NotificationType,
  {
    label: string;
    Icon: React.ElementType;
    tone: string;
    border: string;
    badgeBg: string;
  }
> = {
  revision_due: {
    label: "Revision",
    Icon: RefreshCw,
    tone: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    border: "border-l-amber-500",
    badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
  achievement: {
    label: "Milestone",
    Icon: Trophy,
    tone: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    border: "border-l-emerald-500",
    badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  recommendation: {
    label: "Recommendation",
    Icon: Sparkles,
    tone: "text-(--color-purple) bg-(--color-purple-subtle) border-(--color-purple)/20",
    border: "border-l-(--color-purple)",
    badgeBg: "bg-(--color-purple-subtle) text-(--color-purple) border-(--color-purple)/30",
  },
  plan_ready: {
    label: "Learning plan",
    Icon: GraduationCap,
    tone: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    border: "border-l-sky-500",
    badgeBg: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  },
  streak_risk: {
    label: "Study reminder",
    Icon: Clock3,
    tone: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    border: "border-l-orange-500",
    badgeBg: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  },
  system: {
    label: "System",
    Icon: CircleAlert,
    tone: "text-(--color-text-secondary) bg-(--color-surface-2) border-(--color-border)",
    border: "border-l-(--color-border)",
    badgeBg: "bg-(--color-surface-2) text-(--color-text-secondary) border-(--color-border)",
  },
};

export function relativeTime(value: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 172800) return "Yesterday";
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(value)
  );
}

// ── Smart Empty State ─────────────────────────────────────────────────────────

export function SmartEmptyState({
  filterCategory,
  onResetFilter,
}: {
  filterCategory?: string;
  onResetFilter?: () => void;
}) {
  return (
    <div className="py-8 px-4 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3">
        <CheckCircle2 className="size-6" />
      </div>
      <h3 className="text-sm font-semibold text-(--color-text-primary)">
        {filterCategory && filterCategory !== "all"
          ? `No ${filterCategory} alerts`
          : "You're all caught up."}
      </h3>
      <p className="mt-1 text-xs text-(--color-text-muted) max-w-xs mx-auto">
        {filterCategory && filterCategory !== "all"
          ? `No notifications currently under this category.`
          : "No new learning alerts right now. Keep building your streak!"}
      </p>

      {filterCategory && filterCategory !== "all" && onResetFilter ? (
        <button
          type="button"
          onClick={onResetFilter}
          className="mt-3 text-xs font-semibold text-(--color-purple) hover:underline"
        >
          View all notifications
        </button>
      ) : (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left max-w-sm mx-auto">
          <Link
            href="/learn"
            className="flex items-center gap-2 p-2 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) text-xs font-medium text-(--color-text-secondary) hover:text-(--color-text-primary) hover:border-(--color-purple)/40 transition-colors"
          >
            <GraduationCap className="size-3.5 text-(--color-purple) shrink-0" />
            <span className="truncate">Continue mission</span>
          </Link>
          <Link
            href="/practice"
            className="flex items-center gap-2 p-2 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) text-xs font-medium text-(--color-text-secondary) hover:text-(--color-text-primary) hover:border-(--color-purple)/40 transition-colors"
          >
            <Target className="size-3.5 text-sky-400 shrink-0" />
            <span className="truncate">Practice problem</span>
          </Link>
          <Link
            href="/progress"
            className="flex items-center gap-2 p-2 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) text-xs font-medium text-(--color-text-secondary) hover:text-(--color-text-primary) hover:border-(--color-purple)/40 transition-colors"
          >
            <LineChart className="size-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Review progress</span>
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-2 p-2 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) text-xs font-medium text-(--color-text-secondary) hover:text-(--color-text-primary) hover:border-(--color-purple)/40 transition-colors"
          >
            <Settings className="size-3.5 text-(--color-text-muted) shrink-0" />
            <span className="truncate">Preferences</span>
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Notification Item Card ───────────────────────────────────────────────────

export function NotificationCard({
  item,
  onRead,
  onNavigate,
  compact = false,
}: {
  item: NotificationItemData;
  onRead: (id: string) => void;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = NOTIFICATION_METAS[item.type] ?? NOTIFICATION_METAS.system;
  const Icon = meta.Icon;
  const isUnread = item.status === "unread";
  const isImportant = item.priority === "important";

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUnread) onRead(item.id);
    if (onNavigate) onNavigate();
  };

  return (
    <div
      onClick={() => {
        if (!expanded && isUnread) onRead(item.id);
        setExpanded(!expanded);
      }}
      className={cn(
        "group relative block border-l-2 p-3.5 text-left transition-colors cursor-pointer outline-none focus-visible:bg-(--color-surface-2)",
        meta.border,
        isUnread
          ? "bg-(--color-surface-2)/80 hover:bg-(--color-surface-2)"
          : "bg-(--color-surface-1) hover:bg-(--color-surface-2)/50 border-l-transparent"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Category Icon */}
        <span
          className={cn(
            "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border",
            meta.tone
          )}
        >
          <Icon className="size-4" />
        </span>

        {/* Content Body */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <h4
                className={cn(
                  "text-xs leading-snug truncate",
                  isUnread
                    ? "font-semibold text-(--color-text-primary)"
                    : "font-medium text-(--color-text-secondary)"
                )}
              >
                {item.title}
              </h4>
              {isImportant && isUnread && (
                <span className="px-1.5 py-0.2 rounded font-mono text-[9px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  Important
                </span>
              )}
            </div>
            <time className="shrink-0 text-[10px] text-(--color-text-muted) pt-0.5 whitespace-nowrap">
              {relativeTime(item.scheduledAt)}
            </time>
          </div>

          <p
            className={cn(
              "mt-1 text-xs text-(--color-text-secondary) leading-relaxed",
              compact && !expanded ? "line-clamp-2" : ""
            )}
          >
            {item.body}
          </p>

          {/* Action Row & Category Label */}
          <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold tracking-wide uppercase text-(--color-text-muted)">
                {meta.label}
              </span>
              {isUnread && (
                <span className="size-1.5 rounded-full bg-(--color-purple)" />
              )}
            </div>

            <div className="flex items-center gap-2">
              {item.actionLabel && item.deepLink && (
                <Link
                  href={item.deepLink}
                  onClick={handleActionClick}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-(--color-purple) hover:text-(--color-purple-hover) hover:underline"
                >
                  <span>{item.actionLabel}</span>
                  <ChevronRight className="size-3" />
                </Link>
              )}
              {isUnread && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRead(item.id);
                  }}
                  className="text-[11px] text-(--color-text-muted) hover:text-(--color-text-primary) px-1.5 py-0.5 rounded hover:bg-(--color-surface-2) transition-colors"
                  title="Mark as read"
                >
                  Mark read
                </button>
              )}
            </div>
          </div>

          {/* Expanded Educational Context Drawer */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.16 }}
                className="mt-3 pt-3 border-t border-(--color-border)/60 space-y-2 text-xs"
              >
                <div>
                  <span className="font-semibold text-(--color-text-primary)">
                    What happened?
                  </span>
                  <p className="text-(--color-text-secondary) mt-0.5">{item.title}</p>
                </div>
                <div>
                  <span className="font-semibold text-(--color-text-primary)">
                    Why it matters:
                  </span>
                  <p className="text-(--color-text-secondary) mt-0.5">{item.body}</p>
                </div>
                {item.deepLink && (
                  <div className="pt-1">
                    <Link
                      href={item.deepLink}
                      onClick={handleActionClick}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-(--radius-btn) bg-(--color-purple) text-white font-semibold text-xs hover:bg-(--color-purple-hover) transition-colors"
                    >
                      <span>{item.actionLabel ?? "Open destination"}</span>
                      <ExternalLink className="size-3" />
                    </Link>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Grouped Notifications Card ───────────────────────────────────────────────

export function GroupedNotificationCard({
  groupKey,
  items,
  onRead,
  onNavigate,
  compact = false,
}: {
  groupKey: string;
  items: NotificationItemData[];
  onRead: (id: string) => void;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const unreadCount = items.filter((i) => i.status === "unread").length;
  const sample = items[0];
  const meta = NOTIFICATION_METAS[sample.type] ?? NOTIFICATION_METAS.system;
  const Icon = meta.Icon;

  // Title generation based on groupKey
  const groupTitle =
    groupKey === "revision_today"
      ? `${items.length} revision drills due today`
      : `${items.length} related ${meta.label.toLowerCase()} alerts`;

  const groupSubtitle =
    groupKey === "revision_today"
      ? `Spaced repetition retention drills queued for active practice.`
      : `Collated learning notifications for your current track.`;

  const markGroupRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    items.forEach((item) => {
      if (item.status === "unread") onRead(item.id);
    });
  };

  return (
    <div className="border-l-2 border-l-amber-500 bg-(--color-surface-2)/60 transition-colors">
      <div
        onClick={() => setOpen(!open)}
        className="p-3.5 flex items-start gap-3 cursor-pointer hover:bg-(--color-surface-2) transition-colors"
      >
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border bg-amber-500/10 border-amber-500/20 text-amber-400">
          <Layers className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <h4 className="text-xs font-semibold text-(--color-text-primary) truncate">
                {groupTitle}
              </h4>
              <span className="px-1.5 py-0.2 rounded font-mono text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Grouped
              </span>
            </div>
            <time className="shrink-0 text-[10px] text-(--color-text-muted) pt-0.5 whitespace-nowrap">
              {relativeTime(sample.scheduledAt)}
            </time>
          </div>

          <p className="mt-1 text-xs text-(--color-text-secondary)">{groupSubtitle}</p>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase text-(--color-text-muted)">
                {meta.label}
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-500/20 text-amber-300">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markGroupRead}
                  className="text-[11px] text-(--color-text-muted) hover:text-(--color-text-primary) px-1.5 py-0.5 rounded hover:bg-(--color-surface-1)"
                >
                  Mark all read
                </button>
              )}
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-(--color-purple)">
                <span>{open ? "Collapse" : "Expand items"}</span>
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform duration-150",
                    open && "rotate-180"
                  )}
                />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded child notifications */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.16 }}
            className="pl-4 divide-y divide-(--color-border)/40 border-t border-(--color-border)/40 bg-(--color-surface-1)/70"
          >
            {items.map((subItem) => (
              <NotificationCard
                key={subItem.id}
                item={subItem}
                onRead={onRead}
                onNavigate={onNavigate}
                compact={compact}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Header Notification Bell with Popover ─────────────────────────────────────

export function NotificationBell({
  isOpen,
  onToggle,
  onClose,
}: {
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof isOpen === "boolean";
  const open = isControlled ? isOpen : internalOpen;

  const handleToggle = () => {
    if (isControlled && onToggle) onToggle();
    else setInternalOpen(!internalOpen);
  };

  const handleClose = () => {
    if (isControlled && onClose) onClose();
    else setInternalOpen(false);
  };

  const {
    notifications,
    unreadCount,
    hasImportantUnread,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications();

  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [activeTab, setActiveTab] = useState<
    "all" | "unread" | "revision" | "milestone" | "recommendation"
  >("all");

  // Close on Escape or click outside
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Tab Filtering
  const filteredNotifications = useMemo(() => {
    if (activeTab === "unread") {
      return notifications.filter((n) => n.status === "unread");
    }
    if (activeTab === "revision") {
      return notifications.filter((n) => n.type === "revision_due");
    }
    if (activeTab === "milestone") {
      return notifications.filter((n) => n.type === "achievement");
    }
    if (activeTab === "recommendation") {
      return notifications.filter((n) => n.type === "recommendation");
    }
    return notifications;
  }, [notifications, activeTab]);

  // Group notifications where groupKey is set
  const renderedGroups = useMemo(() => {
    const list: Array<{ type: "single"; item: NotificationItemData } | { type: "group"; key: string; items: NotificationItemData[] }> = [];
    const groupedMap = new Map<string, NotificationItemData[]>();

    for (const item of filteredNotifications) {
      if (item.groupKey) {
        if (!groupedMap.has(item.groupKey)) groupedMap.set(item.groupKey, []);
        groupedMap.get(item.groupKey)!.push(item);
      } else {
        list.push({ type: "single", item });
      }
    }

    // Append groups
    groupedMap.forEach((items, key) => {
      if (items.length === 1) {
        list.push({ type: "single", item: items[0] });
      } else {
        list.push({ type: "group", key, items });
      }
    });

    return list.slice(0, 10);
  }, [filteredNotifications]);

  return (
    <div ref={ref} className="relative">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "relative grid size-8 place-items-center rounded-(--radius-btn) text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-(--color-surface-1) transition-colors focus-visible:ring-2 focus-visible:ring-(--color-purple)",
          open && "bg-(--color-surface-1) text-(--color-text-primary)"
        )}
      >
        <Bell
          className={cn(
            "size-4 transition-transform duration-200",
            hasImportantUnread && !open && "animate-[bell-tilt_2.5s_ease-in-out_infinite]"
          )}
        />

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={reduced ? false : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white leading-none shadow-sm",
              hasImportantUnread ? "bg-rose-500 shadow-rose-500/40" : "bg-(--color-red)"
            )}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Popover Center */}
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label="Notifications center"
            initial={reduced ? false : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={cn(
              // Desktop: anchored to bell, viewport-safe
              // Mobile: responsive overlay within safe screen margins
              "fixed inset-x-3 top-16 z-50 overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) shadow-2xl backdrop-blur-xl",
              "sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[410px] sm:max-w-[calc(100vw-32px)]"
            )}
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between border-b border-(--color-border) px-4 py-3 bg-(--color-surface-1)">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-(--color-text-primary)">
                  Notifications
                </h2>
                {unreadCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-(--color-purple-subtle) text-(--color-purple)">
                    {unreadCount} unread
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-(--color-surface-2) text-(--color-text-muted)">
                    All read
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-(--color-purple) hover:bg-(--color-purple-subtle) transition-colors"
                  >
                    <CheckCheck className="size-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
                {/* Mobile close button */}
                <button
                  type="button"
                  onClick={handleClose}
                  className="sm:hidden p-1 text-(--color-text-muted) hover:text-(--color-text-primary)"
                  aria-label="Close notifications"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto px-3 py-2 border-b border-(--color-border)/50 bg-(--color-surface-2)/30 scrollbar-none">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "unread", label: "Unread" },
                  { id: "revision", label: "Revision" },
                  { id: "milestone", label: "Milestones" },
                  { id: "recommendation", label: "Recommendations" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors",
                    activeTab === tab.id
                      ? "bg-(--color-purple) text-white font-semibold"
                      : "text-(--color-text-secondary) hover:bg-(--color-surface-2) hover:text-(--color-text-primary)"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Notification List Body */}
            <div className="max-h-[min(380px,calc(100dvh-16rem))] overflow-y-auto divide-y divide-(--color-border)/40 scrollbar-thin">
              {loading && filteredNotifications.length === 0 ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 rounded-lg bg-(--color-surface-2) animate-pulse"
                    />
                  ))}
                </div>
              ) : error && filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-(--color-text-secondary)">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={refresh}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-(--color-purple)"
                  >
                    <RefreshCw className="size-3" /> Retry
                  </button>
                </div>
              ) : renderedGroups.length === 0 ? (
                <SmartEmptyState
                  filterCategory={activeTab}
                  onResetFilter={() => setActiveTab("all")}
                />
              ) : (
                renderedGroups.map((entry) => {
                  if (entry.type === "group") {
                    return (
                      <GroupedNotificationCard
                        key={entry.key}
                        groupKey={entry.key}
                        items={entry.items}
                        onRead={markAsRead}
                        onNavigate={handleClose}
                        compact
                      />
                    );
                  }
                  return (
                    <NotificationCard
                      key={entry.item.id}
                      item={entry.item}
                      onRead={markAsRead}
                      onNavigate={handleClose}
                      compact
                    />
                  );
                })
              )}
            </div>

            {/* Popover Footer */}
            <div className="flex items-center border-t border-(--color-border) bg-(--color-surface-1)">
              <Link
                href="/notifications"
                onClick={handleClose}
                className="flex flex-1 items-center justify-center gap-1 py-2.5 px-4 text-xs font-semibold text-(--color-text-secondary) hover:bg-(--color-surface-2) hover:text-(--color-text-primary) transition-colors"
              >
                <span>View all notifications</span>
                <ChevronRight className="size-3.5" />
              </Link>
              <Link
                href="/settings"
                onClick={handleClose}
                className="grid size-9 place-items-center border-l border-(--color-border) text-(--color-text-muted) hover:bg-(--color-surface-2) hover:text-(--color-text-primary) transition-colors"
                title="Notification settings"
                aria-label="Notification settings"
              >
                <Settings className="size-3.5" />
              </Link>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

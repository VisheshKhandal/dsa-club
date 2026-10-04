"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { usePreferences, isNotificationTypeAllowed } from "@/components/preferences/preferences-provider";

export type NotificationPriority = "important" | "actionable" | "informational";
export type NotificationType = "revision_due" | "achievement" | "recommendation" | "plan_ready" | "streak_risk" | "system";
export type NotificationStatus = "unread" | "read" | "archived";

export interface NotificationItemData {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  groupKey?: string | null;
  actionLabel?: string | null;
  title: string;
  body: string;
  deepLink?: string | null;
  status: NotificationStatus;
  scheduledAt: string;
  readAt?: string | null;
}

interface NotificationContextValue {
  notifications: NotificationItemData[];
  rawNotifications: NotificationItemData[];
  unreadCount: number;
  hasImportantUnread: boolean;
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archiveNotification: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  resetSeed: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const SYNC_EVENT = "dsa-notification-sync";

export function NotificationProvider({
  children,
  initialNotifications = [],
}: {
  children: React.ReactNode;
  initialNotifications?: NotificationItemData[];
}) {
  const { preferences } = usePreferences();
  const [rawNotifications, setRawNotifications] = useState<NotificationItemData[]>(initialNotifications);
  const [loading, setLoading] = useState(initialNotifications.length === 0);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/v1/notifications?limit=60", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load notifications");
      const data = await res.json();
      const fetched: NotificationItemData[] = (data.notifications || []).map((n: any) => ({
        id: String(n.id || n._id),
        type: (n.type as NotificationType) || "system",
        priority: (n.priority as NotificationPriority) || "informational",
        groupKey: n.groupKey ? String(n.groupKey) : null,
        actionLabel: n.actionLabel ? String(n.actionLabel) : null,
        title: String(n.title || "Notification"),
        body: String(n.body || ""),
        deepLink: n.deepLink ? String(n.deepLink) : null,
        status: (n.status as NotificationStatus) || "unread",
        scheduledAt: n.scheduledAt || new Date().toISOString(),
        readAt: n.readAt || null,
      }));
      setRawNotifications(fetched);
    } catch (err: any) {
      setError(err?.message || "Could not load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialNotifications.length === 0) {
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        const handle = (window as any).requestIdleCallback(
          () => {
            fetchNotifications();
          },
          { timeout: 2500 }
        );
        return () => (window as any).cancelIdleCallback(handle);
      } else {
        const timer = setTimeout(() => {
          fetchNotifications();
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [fetchNotifications, initialNotifications.length]);

  // Sync listener across tabs and component instances
  useEffect(() => {
    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && Array.isArray(detail)) {
        setRawNotifications(detail);
      } else {
        fetchNotifications();
      }
    };
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, [fetchNotifications]);

  const broadcastSync = (items: NotificationItemData[]) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: items }));
    }
  };

  // Filter notifications based on student's notification preferences
  const notifications = useMemo(() => {
    return rawNotifications.filter((item) => {
      if (item.status === "archived") return false;
      return isNotificationTypeAllowed(item.type, preferences.notifications);
    });
  }, [rawNotifications, preferences.notifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => n.status === "unread").length;
  }, [notifications]);

  const hasImportantUnread = useMemo(() => {
    return notifications.some((n) => n.status === "unread" && n.priority === "important");
  }, [notifications]);

  const markAsRead = useCallback(
    async (id: string) => {
      // Optimistic update
      const updated = rawNotifications.map((item) =>
        item.id === id ? { ...item, status: "read" as const, readAt: new Date().toISOString() } : item
      );
      setRawNotifications(updated);
      broadcastSync(updated);

      try {
        await fetch("/api/v1/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: id, status: "read" }),
        });
      } catch {
        // Fallback reload
        fetchNotifications();
      }
    },
    [rawNotifications, fetchNotifications]
  );

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    const nowIso = new Date().toISOString();
    const updated = rawNotifications.map((item) =>
      item.status === "unread" ? { ...item, status: "read" as const, readAt: nowIso } : item
    );
    setRawNotifications(updated);
    broadcastSync(updated);

    try {
      await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
    } catch {
      fetchNotifications();
    }
  }, [rawNotifications, fetchNotifications]);

  const archiveNotification = useCallback(
    async (id: string) => {
      const updated = rawNotifications.map((item) =>
        item.id === id ? { ...item, status: "archived" as const } : item
      );
      setRawNotifications(updated);
      broadcastSync(updated);

      try {
        await fetch("/api/v1/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: id, status: "archived" }),
        });
      } catch {
        fetchNotifications();
      }
    },
    [rawNotifications, fetchNotifications]
  );

  const resetSeed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_seed" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.notifications) {
          setRawNotifications(data.notifications);
          broadcastSync(data.notifications);
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      rawNotifications,
      unreadCount,
      hasImportantUnread,
      loading,
      error,
      markAsRead,
      markAllAsRead,
      archiveNotification,
      refresh: fetchNotifications,
      resetSeed,
    }),
    [
      notifications,
      rawNotifications,
      unreadCount,
      hasImportantUnread,
      loading,
      error,
      markAsRead,
      markAllAsRead,
      archiveNotification,
      fetchNotifications,
      resetSeed,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}

import { describe, it, expect } from "vitest";
import {
  relativeTime,
  NOTIFICATION_METAS,
} from "./notification-center";
import {
  isNotificationTypeAllowed,
  DEFAULT_PREFERENCES,
} from "@/components/preferences/preferences-provider";
import { NotificationItemData } from "./notification-context";

describe("Notifications System — Core Logic & Preferences", () => {
  describe("Relative Time Formatter", () => {
    it("formats timestamps within 60 seconds as 'Just now'", () => {
      const now = new Date().toISOString();
      expect(relativeTime(now)).toBe("Just now");
    });

    it("formats timestamps within minutes", () => {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      expect(relativeTime(tenMinsAgo)).toBe("10m ago");
    });

    it("formats timestamps within hours", () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
      expect(relativeTime(twoHoursAgo)).toBe("2h ago");
    });

    it("formats yesterday timestamps", () => {
      const yesterday = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
      expect(relativeTime(yesterday)).toBe("Yesterday");
    });
  });

  describe("Notification Types & Styling Metas", () => {
    it("provides correct labels and visual tones for all 6 notification types", () => {
      expect(NOTIFICATION_METAS.revision_due.label).toBe("Revision");
      expect(NOTIFICATION_METAS.revision_due.border).toContain("amber");

      expect(NOTIFICATION_METAS.achievement.label).toBe("Milestone");
      expect(NOTIFICATION_METAS.achievement.border).toContain("emerald");

      expect(NOTIFICATION_METAS.recommendation.label).toBe("Recommendation");
      expect(NOTIFICATION_METAS.recommendation.border).toContain("purple");

      expect(NOTIFICATION_METAS.plan_ready.label).toBe("Learning plan");
      expect(NOTIFICATION_METAS.streak_risk.label).toBe("Study reminder");
      expect(NOTIFICATION_METAS.system.label).toBe("System");
    });
  });

  describe("Preferences Category Filtering", () => {
    it("allows notifications when preferences are enabled", () => {
      const prefs = { ...DEFAULT_PREFERENCES.notifications };
      expect(isNotificationTypeAllowed("revision_due", prefs)).toBe(true);
      expect(isNotificationTypeAllowed("achievement", prefs)).toBe(true);
      expect(isNotificationTypeAllowed("recommendation", prefs)).toBe(true);
      expect(isNotificationTypeAllowed("system", prefs)).toBe(true);
    });

    it("filters out notifications when category preference is disabled by student", () => {
      const prefs = {
        ...DEFAULT_PREFERENCES.notifications,
        revisionAlerts: false,
        recommendations: false,
      };
      expect(isNotificationTypeAllowed("revision_due", prefs)).toBe(false);
      expect(isNotificationTypeAllowed("recommendation", prefs)).toBe(false);
      // Other categories remain enabled
      expect(isNotificationTypeAllowed("achievement", prefs)).toBe(true);
    });
  });

  describe("Grouping Logic Simulation", () => {
    it("correctly groups items with matching groupKey", () => {
      const mockItems: NotificationItemData[] = [
        {
          id: "1",
          type: "revision_due",
          priority: "actionable",
          groupKey: "revision_today",
          actionLabel: "Review now",
          title: "Sliding Window",
          body: "Ready for revision",
          status: "unread",
          scheduledAt: new Date().toISOString(),
        },
        {
          id: "2",
          type: "revision_due",
          priority: "actionable",
          groupKey: "revision_today",
          actionLabel: "Review now",
          title: "Two Pointers",
          body: "Ready for revision",
          status: "unread",
          scheduledAt: new Date().toISOString(),
        },
        {
          id: "3",
          type: "achievement",
          priority: "important",
          groupKey: null,
          actionLabel: "View progress",
          title: "Interview Readiness reached 80%",
          body: "Mastery milestone achieved",
          status: "unread",
          scheduledAt: new Date().toISOString(),
        },
      ];

      const groupedMap = new Map<string, NotificationItemData[]>();
      const singles: NotificationItemData[] = [];

      for (const item of mockItems) {
        if (item.groupKey) {
          if (!groupedMap.has(item.groupKey)) groupedMap.set(item.groupKey, []);
          groupedMap.get(item.groupKey)!.push(item);
        } else {
          singles.push(item);
        }
      }

      expect(groupedMap.has("revision_today")).toBe(true);
      expect(groupedMap.get("revision_today")?.length).toBe(2);
      expect(singles.length).toBe(1);
      expect(singles[0].title).toBe("Interview Readiness reached 80%");
    });
  });
});

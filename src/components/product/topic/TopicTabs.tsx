"use client";

import React from "react";
import { motion } from "framer-motion";
import { Zap, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export type TopicWorkspaceTab = "learning" | "progress";

interface TopicTabsProps {
  activeTab: TopicWorkspaceTab;
  onTabChange: (tab: TopicWorkspaceTab) => void;
  learningCount?: number;
  progressCount?: number;
}

export function TopicTabs({
  activeTab,
  onTabChange,
  learningCount,
  progressCount,
}: TopicTabsProps) {
  const tabs = [
    {
      id: "learning" as const,
      label: "Learning",
      icon: Zap,
      count: learningCount,
    },
    {
      id: "progress" as const,
      label: "Progress",
      icon: Trophy,
      count: progressCount,
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="Topic Workspace Modes"
      className="flex items-center gap-2 border-b border-(--color-border) pt-1"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`topic-workspace-panel-${tab.id}`}
            id={`topic-workspace-tab-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors rounded-t-(--radius-btn) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-purple)",
              isActive
                ? "text-(--color-text-primary) font-semibold"
                : "text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-(--color-surface-2)/40"
            )}
          >
            <Icon
              size={14}
              className={cn(
                "transition-colors",
                isActive ? "text-(--color-purple)" : "text-(--color-text-muted)"
              )}
            />
            <span>{tab.label}</span>

            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums transition-colors",
                  isActive
                    ? "bg-(--color-purple-subtle) text-(--color-purple)"
                    : "bg-(--color-surface-2) text-(--color-text-muted)"
                )}
              >
                {tab.count}
              </span>
            )}

            {isActive && (
              <motion.div
                layoutId="activeTopicTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-(--color-purple)"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  BookOpen,
  Target,
  CircleDot,
  GitBranch,
  Building2,
  X,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface SearchItem {
  id: string;
  title: string;
  href: string;
  group: "Navigation" | "Topics" | "Missions" | "Problems" | "Patterns" | "Companies";
  badge?: string;
  badgeVariant?: "easy" | "medium" | "hard" | "in-progress" | "not-started";
}

const STATIC_SEARCH_ITEMS: SearchItem[] = [
  // Navigation
  { id: "nav-1", title: "Account & Identity Center", href: "/account", group: "Navigation", badge: "Account", badgeVariant: "easy" },
  { id: "nav-2", title: "Settings & Preferences Control", href: "/settings", group: "Navigation", badge: "Preferences", badgeVariant: "easy" },
  { id: "nav-3", title: "Progress Intelligence", href: "/progress", group: "Navigation", badge: "Analytics", badgeVariant: "easy" },
  { id: "nav-4", title: "Spaced Revision Session", href: "/revision", group: "Navigation", badge: "Spaced Repetition", badgeVariant: "easy" },

  // Topics
  { id: "t-1", title: "Arrays & Strings", href: "/learn", group: "Topics", badge: "Beginner", badgeVariant: "easy" },
  { id: "t-2", title: "Two Pointers & Sliding Window", href: "/learn", group: "Topics", badge: "Beginner", badgeVariant: "easy" },
  { id: "t-3", title: "Hashing & Frequency Maps", href: "/learn", group: "Topics", badge: "Easy", badgeVariant: "easy" },
  { id: "t-4", title: "Recursion & Backtracking", href: "/learn", group: "Topics", badge: "Medium", badgeVariant: "medium" },
  { id: "t-5", title: "Binary Trees & BST", href: "/learn", group: "Topics", badge: "Medium", badgeVariant: "medium" },
  { id: "t-6", title: "Graphs (BFS & DFS)", href: "/learn", group: "Topics", badge: "Hard", badgeVariant: "hard" },
  { id: "t-7", title: "Dynamic Programming", href: "/learn", group: "Topics", badge: "Hard", badgeVariant: "hard" },

  // Missions
  { id: "m-1", title: "Sliding Window Foundations", href: "/missions", group: "Missions", badge: "In Progress", badgeVariant: "in-progress" },
  { id: "m-2", title: "Two Sum & Hash Map Mastery", href: "/missions", group: "Missions", badge: "Easy", badgeVariant: "easy" },
  { id: "m-3", title: "Binary Tree Path Invariants", href: "/missions", group: "Missions", badge: "Medium", badgeVariant: "medium" },
  { id: "m-4", title: "Graph Cycle Detection Lab", href: "/missions", group: "Missions", badge: "Hard", badgeVariant: "hard" },

  // Problems
  { id: "p-1", title: "Longest Substring Without Repeating Characters", href: "/practice", group: "Problems", badge: "Medium", badgeVariant: "medium" },
  { id: "p-2", title: "Trapping Rain Water", href: "/practice", group: "Problems", badge: "Hard", badgeVariant: "hard" },
  { id: "p-3", title: "Container With Most Water", href: "/practice", group: "Problems", badge: "Medium", badgeVariant: "medium" },
  { id: "p-4", title: "Valid Anagram", href: "/practice", group: "Problems", badge: "Easy", badgeVariant: "easy" },
  { id: "p-5", title: "Number of Islands", href: "/practice", group: "Problems", badge: "Medium", badgeVariant: "medium" },

  // Patterns
  { id: "pt-1", title: "Sliding Window", href: "/patterns", group: "Patterns", badge: "Core", badgeVariant: "easy" },
  { id: "pt-2", title: "Two Pointers", href: "/patterns", group: "Patterns", badge: "Core", badgeVariant: "easy" },
  { id: "pt-3", title: "Fast & Slow Pointers", href: "/patterns", group: "Patterns", badge: "Core", badgeVariant: "medium" },
  { id: "pt-4", title: "Monotonic Stack", href: "/patterns", group: "Patterns", badge: "Advanced", badgeVariant: "hard" },
  { id: "pt-5", title: "Topological Sort", href: "/patterns", group: "Patterns", badge: "Advanced", badgeVariant: "hard" },

  // Companies
  { id: "c-1", title: "Google", href: "/companies/google", group: "Companies", badge: "Tier 1", badgeVariant: "hard" },
  { id: "c-2", title: "Meta", href: "/companies/meta", group: "Companies", badge: "Tier 1", badgeVariant: "hard" },
  { id: "c-3", title: "Amazon", href: "/companies/amazon", group: "Companies", badge: "Tier 1", badgeVariant: "medium" },
  { id: "c-4", title: "Microsoft", href: "/companies/microsoft", group: "Companies", badge: "Tier 1", badgeVariant: "medium" },
  { id: "c-5", title: "Uber", href: "/companies/uber", group: "Companies", badge: "Tier 1", badgeVariant: "hard" },
];

const GROUP_ORDER: Array<SearchItem["group"]> = [
  "Navigation",
  "Topics",
  "Missions",
  "Problems",
  "Patterns",
  "Companies",
];

const GROUP_ICONS = {
  Navigation: Layers,
  Topics: BookOpen,
  Missions: Target,
  Problems: CircleDot,
  Patterns: GitBranch,
  Companies: Building2,
};

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter items
  const filteredItems = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STATIC_SEARCH_ITEMS;
    return STATIC_SEARCH_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        (item.badge && item.badge.toLowerCase().includes(q))
    );
  }, [query]);

  // Group items
  const grouped = React.useMemo(() => {
    const groups: { group: SearchItem["group"]; items: SearchItem[] }[] = [];
    for (const g of GROUP_ORDER) {
      const items = filteredItems.filter((i) => i.group === g);
      if (items.length > 0) {
        groups.push({ group: g, items });
      }
    }
    return groups;
  }, [filteredItems]);

  // Flattened items for keyboard indexing
  const flatItems = React.useMemo(() => {
    return grouped.flatMap((g) => g.items);
  }, [grouped]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const selectItem = (item: SearchItem) => {
    onClose();
    router.push(item.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < flatItems.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : flatItems.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        selectItem(flatItems[selectedIndex]);
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[15vh] px-4">
          {/* Dimmed Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Centered Panel (600px max, max-h-96) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="relative w-full max-w-[600px] max-h-[384px] flex flex-col bg-(--color-surface-1) border border-(--color-border) rounded-(--radius-card) shadow-2xl overflow-hidden z-10"
            onKeyDown={handleKeyDown}
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-(--color-border) bg-(--color-surface-1)">
              <Search className="size-4 text-(--color-text-muted) shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search topics, missions, problems, patterns..."
                className="w-full bg-transparent text-[14px] text-(--color-text-primary) placeholder:text-(--color-text-muted) outline-none font-sans"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-(--color-text-muted) hover:text-(--color-text-primary) p-1"
                >
                  <X className="size-3.5" />
                </button>
              )}
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-(--color-text-muted) bg-(--color-surface-2) border border-(--color-border) rounded">
                ESC
              </kbd>
            </div>

            {/* Results list */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
              {flatItems.length === 0 ? (
                <div className="py-12 text-center text-(--color-text-muted)">
                  <p className="text-body font-medium">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                  <p className="text-caption mt-1">
                    Try searching for arrays, sliding window, google, or recursion.
                  </p>
                </div>
              ) : (
                grouped.map((g) => {
                  const Icon = GROUP_ICONS[g.group];
                  return (
                    <div key={g.group} className="mb-2 last:mb-0">
                      <div className="px-2 py-1 text-label text-(--color-text-muted)">
                        {g.group}
                      </div>
                      <div className="space-y-0.5">
                        {g.items.map((item) => {
                          const itemIndex = flatItems.findIndex(
                            (fi) => fi.id === item.id
                          );
                          const isSelected = itemIndex === selectedIndex;
                          return (
                            <div
                              key={item.id}
                              onClick={() => selectItem(item)}
                              onMouseEnter={() => setSelectedIndex(itemIndex)}
                              className={`flex items-center justify-between gap-3 px-3 py-2 rounded-(--radius-btn) cursor-pointer text-sm transition-all duration-[80ms] ${
                                isSelected
                                  ? "bg-(--color-purple-subtle) text-(--color-text-primary) font-medium"
                                  : "text-(--color-text-secondary) hover:bg-(--color-surface-2) hover:text-(--color-text-primary)"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Icon
                                  className={`size-4 shrink-0 ${
                                    isSelected
                                      ? "text-(--color-purple)"
                                      : "text-(--color-text-muted)"
                                  }`}
                                />
                                <span className="truncate">{item.title}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {item.badge && (
                                  <Badge
                                    variant={item.badgeVariant ?? "not-started"}
                                    className="text-[10px]"
                                  >
                                    {item.badge}
                                  </Badge>
                                )}
                                {isSelected && (
                                  <ArrowRight className="size-3.5 text-(--color-purple)" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-(--color-border) bg-(--color-surface-1) text-[11px] text-(--color-text-muted)">
              <span>Navigate with <kbd className="px-1 py-0.5 bg-(--color-surface-2) border border-(--color-border) rounded font-mono">↑</kbd> <kbd className="px-1 py-0.5 bg-(--color-surface-2) border border-(--color-border) rounded font-mono">↓</kbd></span>
              <span>Select with <kbd className="px-1 py-0.5 bg-(--color-surface-2) border border-(--color-border) rounded font-mono">↵</kbd></span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

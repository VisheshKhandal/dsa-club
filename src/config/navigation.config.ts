import React from "react";
import {
  Home,
  Sparkles,
  GraduationCap,
  BookOpen,
  Compass,
  Target,
  Puzzle,
  CircleDot,
  GitBranch,
  RefreshCw,
  TrendingUp,
  Building2,
  LucideIcon,
} from "lucide-react";

export interface NavigationChild {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  matchRoutes: (pathname: string) => boolean;
  badge?: () => string | number | null;
}

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  children?: NavigationChild[];
  matchRoutes: (pathname: string) => boolean;
  badge?: () => string | number | null;
  requiresAuth?: boolean;
}

export interface NavigationGroup {
  id: string;
  label?: string;
  items: NavigationItem[];
}

export const NAVIGATION_CONFIG: NavigationGroup[] = [
  {
    id: "primary",
    items: [
      {
        id: "home",
        label: "Home",
        href: "/dashboard",
        icon: Home,
        matchRoutes: (p: string) => p === "/dashboard",
      },
      {
        id: "plan",
        label: "Plan",
        href: "/intelligence",
        icon: Sparkles,
        description: "Powered by Club Intelligence",
        matchRoutes: (p: string) =>
          p === "/intelligence" || p.startsWith("/intelligence/"),
      },
    ],
  },
  {
    id: "learn",
    label: "LEARN",
    items: [
      {
        id: "learn-parent",
        label: "Learn",
        href: "/learn",
        icon: GraduationCap,
        description: "Curriculum and concept foundation",
        matchRoutes: (p: string) =>
          p === "/learn" ||
          p.startsWith("/learn/") ||
          p.startsWith("/learning-paths") ||
          p.startsWith("/missions"),
        children: [
          {
            id: "topics",
            label: "Topics",
            href: "/learn/topics",
            icon: BookOpen,
            description: "Concept taxonomy and deep dives",
            matchRoutes: (p: string) =>
              p === "/learn/topics" || p.startsWith("/learn/topics/"),
          },
          {
            id: "paths",
            label: "Paths",
            href: "/learn/paths",
            icon: Compass,
            description: "Structured multi-week curriculums",
            matchRoutes: (p: string) =>
              p === "/learn/paths" ||
              p.startsWith("/learn/paths/") ||
              p === "/learning-paths" ||
              p.startsWith("/learning-paths/"),
          },
          {
            id: "missions",
            label: "Missions",
            href: "/missions",
            icon: Target,
            description: "Milestone challenge arcs",
            matchRoutes: (p: string) =>
              p === "/missions" || p.startsWith("/missions/"),
          },
        ],
      },
      {
        id: "practice-parent",
        label: "Practice",
        href: "/practice",
        icon: Puzzle,
        description: "Problem solving and pattern training",
        matchRoutes: (p: string) =>
          p === "/practice" ||
          p.startsWith("/practice/") ||
          p === "/patterns" ||
          p.startsWith("/patterns/"),
        children: [
          {
            id: "problems",
            label: "Problems",
            href: "/practice",
            icon: CircleDot,
            description: "Canonical problem database",
            matchRoutes: (p: string) =>
              p === "/practice" || p.startsWith("/practice/problems/"),
          },
          {
            id: "patterns",
            label: "Patterns",
            href: "/patterns",
            icon: GitBranch,
            description: "Algorithmic mental models",
            matchRoutes: (p: string) =>
              p === "/patterns" || p.startsWith("/patterns/"),
          },
        ],
      },
      {
        id: "review",
        label: "Review",
        href: "/revision",
        icon: RefreshCw,
        description: "Spaced repetition action queue",
        matchRoutes: (p: string) =>
          p === "/revision" || p.startsWith("/revision/"),
      },
    ],
  },
  {
    id: "insights",
    label: "INSIGHTS",
    items: [
      {
        id: "progress",
        label: "Progress",
        href: "/progress",
        icon: TrendingUp,
        description: "Diagnostic mastery evidence",
        matchRoutes: (p: string) =>
          p === "/progress" || p.startsWith("/progress/"),
      },
      {
        id: "company-prep",
        label: "Company Prep",
        href: "/interview",
        icon: Building2,
        description: "Company collections & readiness kits",
        matchRoutes: (p: string) =>
          p === "/interview" ||
          p.startsWith("/interview/") ||
          p === "/companies" ||
          p.startsWith("/companies/"),
      },
    ],
  },
];

/**
 * Checks if a top-level navigation item is active for the current path.
 */
export function isItemActive(item: NavigationItem, pathname: string): boolean {
  if (!pathname) return false;
  return item.matchRoutes(pathname);
}

/**
 * Checks if a child navigation item is active for the current path.
 */
export function isChildActive(child: NavigationChild, pathname: string): boolean {
  if (!pathname) return false;
  return child.matchRoutes(pathname);
}

/**
 * Returns parent item ID if the current path matches any of its children.
 */
export function getActiveParentId(pathname: string): string | null {
  for (const group of NAVIGATION_CONFIG) {
    for (const item of group.items) {
      if (item.children) {
        for (const child of item.children) {
          if (child.matchRoutes(pathname)) {
            return item.id;
          }
        }
      }
    }
  }
  return null;
}

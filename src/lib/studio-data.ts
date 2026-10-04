import {
  LayoutDashboard,
  BookOpen,
  GitBranch,
  Target,
  ListChecks,
  Building2,
  Map,
  Layers,
  Repeat2,
  Award,
  Image,
  Users,
  BarChart3,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type StudioNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  section: "Content" | "Management" | "System";
  description: string;
};

export const studioNav: StudioNavItem[] = [
  // Content
  { label: "Overview", href: "/studio", icon: LayoutDashboard, section: "Content", description: "Platform analytics & quick actions" },
  { label: "Topics", href: "/studio/topics", icon: BookOpen, section: "Content", description: "Manage DSA topics" },
  { label: "Patterns", href: "/studio/patterns", icon: GitBranch, section: "Content", description: "Manage algorithm patterns" },
  { label: "Problems", href: "/studio/problems", icon: Target, section: "Content", description: "Manage practice problems" },
  { label: "Missions", href: "/studio/missions", icon: ListChecks, section: "Content", description: "Build learning missions" },
  { label: "Companies", href: "/studio/companies", icon: Building2, section: "Content", description: "Company prep management" },
  { label: "Roadmaps", href: "/studio/roadmaps", icon: Map, section: "Content", description: "Build learning roadmaps" },
  { label: "Learning Paths", href: "/studio/learning-paths", icon: Layers, section: "Content", description: "Curated learning paths" },
  { label: "Revision", href: "/studio/revision", icon: Repeat2, section: "Content", description: "Revision system content" },
  { label: "Achievements", href: "/studio/achievements", icon: Award, section: "Content", description: "Badges & achievements" },
  // Management
  { label: "Media Library", href: "/studio/media", icon: Image, section: "Management", description: "Images, videos & assets" },
  { label: "Users", href: "/studio/users", icon: Users, section: "Management", description: "User management" },
  // System
  { label: "Analytics", href: "/studio/analytics", icon: BarChart3, section: "System", description: "Platform analytics" },
  { label: "Search", href: "/studio/search", icon: Search, section: "System", description: "Global studio search" },
  { label: "Settings", href: "/studio/settings", icon: Settings, section: "System", description: "Studio configuration" },
];

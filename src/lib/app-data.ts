import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  Building2,
  CalendarDays,
  Command,
  Compass,
  Flame,
  GitBranch,
  GraduationCap,
  Home,
  Layers3,
  LineChart,
  ListChecks,
  LucideIcon,
  Medal,
  Repeat2,
  Search,
  Settings,
  Sparkles,
  Target,
  Timer,
  User,
} from "lucide-react";

export type ProductNavItem = { label: string; href: string; icon: LucideIcon; section: "Core" | "Practice" | "Account" };
export type Difficulty = "Beginner" | "Easy" | "Medium" | "Hard" | "Advanced";

export const productNav: ProductNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home, section: "Core" },
  { label: "Learn", href: "/learn", icon: GraduationCap, section: "Core" },
  { label: "Practice", href: "/practice", icon: Target, section: "Core" },
  { label: "Revision", href: "/revision", icon: Repeat2, section: "Practice" },
  { label: "Company Prep", href: "/companies", icon: Building2, section: "Practice" },
  { label: "Progress", href: "/progress", icon: LineChart, section: "Core" },
];

export const topics = [
  { slug: "arrays-strings", title: "Arrays & Strings", progress: 72, difficulty: "Beginner" as Difficulty, patterns: ["Two pointers", "Sliding window", "Prefix sums"], minutes: 180 },
  { slug: "hashing", title: "Hashing", progress: 64, difficulty: "Easy" as Difficulty, patterns: ["Frequency maps", "Lookup tables", "Deduplication"], minutes: 140 },
  { slug: "recursion", title: "Recursion", progress: 38, difficulty: "Medium" as Difficulty, patterns: ["Backtracking", "State tree", "Base cases"], minutes: 220 },
  { slug: "graphs", title: "Graphs", progress: 28, difficulty: "Hard" as Difficulty, patterns: ["BFS", "DFS", "Shortest path"], minutes: 320 },
  { slug: "dynamic-programming", title: "Dynamic Programming", progress: 18, difficulty: "Advanced" as Difficulty, patterns: ["Memoization", "Tabulation", "State compression"], minutes: 420 },
];

export const missions = [
  { slug: "sliding-window-foundations", title: "Sliding Window Foundations", topic: "Arrays & Strings", progress: 58, duration: "45 min", difficulty: "Medium" as Difficulty, status: "Active" },
  { slug: "hash-map-patterns", title: "Hash Map Pattern Lab", topic: "Hashing", progress: 32, duration: "35 min", difficulty: "Easy" as Difficulty, status: "Queued" },
  { slug: "recursion-state-tracing", title: "Recursion State Tracing", topic: "Recursion", progress: 0, duration: "50 min", difficulty: "Medium" as Difficulty, status: "Locked" },
  { slug: "graph-traversal-drills", title: "Graph Traversal Drills", topic: "Graphs", progress: 0, duration: "60 min", difficulty: "Hard" as Difficulty, status: "Locked" },
];

export const problems = [
  { slug: "longest-window-after-replacement", title: "Longest Window After Replacement", source: "External", difficulty: "Medium" as Difficulty, pattern: "Sliding window", confidence: 62 },
  { slug: "subarray-sum-equals-k", title: "Subarray Sum Equals K", source: "External", difficulty: "Medium" as Difficulty, pattern: "Prefix sums", confidence: 48 },
  { slug: "top-k-frequent-elements", title: "Top K Frequent Elements", source: "External", difficulty: "Medium" as Difficulty, pattern: "Frequency maps", confidence: 70 },
  { slug: "course-schedule", title: "Course Schedule", source: "External", difficulty: "Hard" as Difficulty, pattern: "Topological order", confidence: 36 },
];

export const companies = [
  { slug: "google", name: "Google", readiness: 46, focus: ["Graphs", "DP", "Systematic reasoning"], sets: 6 },
  { slug: "amazon", name: "Amazon", readiness: 58, focus: ["Arrays", "Trees", "Leadership signals"], sets: 8 },
  { slug: "microsoft", name: "Microsoft", readiness: 52, focus: ["Recursion", "Design", "Hashing"], sets: 5 },
  { slug: "stripe", name: "Stripe", readiness: 41, focus: ["APIs", "Data modeling", "Edge cases"], sets: 4 },
];

export const stats = [
  { label: "Learning velocity", value: "7.4h", delta: "+12%", icon: Flame },
  { label: "Mastery score", value: "61%", delta: "+8%", icon: BarChart3 },
  { label: "Revision due", value: "9", delta: "3 urgent", icon: Repeat2 },
  { label: "Interview readiness", value: "48%", delta: "+5%", icon: Award },
];

export const activity = [42, 60, 32, 74, 88, 54, 68];

export const systemModules = [
  { label: "Recommendation engine", state: "Integration-ready", icon: Sparkles },
  { label: "Search provider", state: "MongoDB-backed", icon: Command },
  { label: "Learning calendar", state: "Data contract ready", icon: CalendarDays },
  { label: "Content graph", state: "Schema-backed", icon: Layers3 },
  { label: "Resource library", state: "Composable cards", icon: BookOpen },
  { label: "Timed practice", state: "Session shell", icon: Timer },
];

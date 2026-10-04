import type { OnboardingInput } from "@/features/onboarding/validators/onboarding.validators";

export type CurriculumTopic = {
  slug: string;
  name: string;
  order: number;
  difficulty: "easy" | "medium" | "hard";
  minutes: number;
  prerequisites: readonly string[];
};

export const CURRICULUM: readonly CurriculumTopic[] = [
  { slug: "arrays", name: "Arrays", order: 10, difficulty: "easy", minutes: 300, prerequisites: [] },
  { slug: "strings", name: "Strings", order: 20, difficulty: "easy", minutes: 240, prerequisites: [] },
  { slug: "hashing", name: "Hashing", order: 30, difficulty: "easy", minutes: 240, prerequisites: ["arrays"] },
  { slug: "two-pointers", name: "Two Pointers", order: 40, difficulty: "easy", minutes: 300, prerequisites: ["arrays", "strings"] },
  { slug: "sliding-window", name: "Sliding Window", order: 50, difficulty: "medium", minutes: 360, prerequisites: ["two-pointers"] },
  { slug: "binary-search", name: "Binary Search", order: 60, difficulty: "medium", minutes: 300, prerequisites: ["arrays"] },
  { slug: "stack", name: "Stack", order: 70, difficulty: "easy", minutes: 240, prerequisites: [] },
  { slug: "queue", name: "Queue", order: 80, difficulty: "easy", minutes: 180, prerequisites: ["stack"] },
  { slug: "linked-list", name: "Linked List", order: 90, difficulty: "medium", minutes: 300, prerequisites: [] },
  { slug: "trees", name: "Trees", order: 100, difficulty: "medium", minutes: 540, prerequisites: ["queue"] },
  { slug: "heap", name: "Heap", order: 110, difficulty: "medium", minutes: 300, prerequisites: ["trees"] },
  { slug: "graphs", name: "Graphs", order: 120, difficulty: "hard", minutes: 600, prerequisites: ["queue", "trees"] },
  { slug: "greedy", name: "Greedy", order: 130, difficulty: "medium", minutes: 360, prerequisites: ["arrays"] },
  { slug: "dynamic-programming", name: "Dynamic Programming", order: 140, difficulty: "hard", minutes: 720, prerequisites: ["arrays", "binary-search"] },
] as const;

export const COMPANY_BOOSTS: Record<string, string[]> = {
  amazon: ["trees", "graphs", "heap", "dynamic-programming"],
  google: ["graphs", "dynamic-programming", "trees"],
  microsoft: ["trees", "linked-list", "graphs"],
  adobe: ["dynamic-programming", "trees", "graphs"],
  flipkart: ["arrays", "sliding-window", "graphs"],
  atlassian: ["graphs", "dynamic-programming", "hashing"],
  other: [],
};

export function goalOrder(goal: OnboardingInput["learningGoal"] | undefined): string[] {
  if (goal === "internship") {
    // Fast-tracks two-pointers and sliding window right after strings for immediate contest/OA readiness
    return [
      "arrays",
      "strings",
      "two-pointers",
      "sliding-window",
      "hashing",
      "binary-search",
      "stack",
      "queue",
      "linked-list",
      "trees",
      "heap",
      "greedy",
      "graphs",
      "dynamic-programming",
    ];
  }
  if (goal === "placement") {
    // High-yield campus patterns: arrays, strings, hashing, linked list, binary search, trees
    return [
      "arrays",
      "strings",
      "hashing",
      "two-pointers",
      "binary-search",
      "linked-list",
      "stack",
      "queue",
      "trees",
      "sliding-window",
      "heap",
      "greedy",
      "graphs",
      "dynamic-programming",
    ];
  }
  if (goal === "interview") {
    // High-frequency interview patterns: trees, heap, graphs prioritized earlier
    return [
      "arrays",
      "strings",
      "hashing",
      "two-pointers",
      "sliding-window",
      "binary-search",
      "stack",
      "queue",
      "trees",
      "heap",
      "linked-list",
      "graphs",
      "dynamic-programming",
      "greedy",
    ];
  }
  if (goal === "switch") {
    // Experienced engineers: high-signal system/senior patterns
    return [
      "arrays",
      "hashing",
      "two-pointers",
      "sliding-window",
      "binary-search",
      "stack",
      "queue",
      "trees",
      "heap",
      "graphs",
      "dynamic-programming",
      "strings",
      "linked-list",
      "greedy",
    ];
  }
  // "foundation", "not_sure", and default
  return CURRICULUM.map((item) => item.slug);
}

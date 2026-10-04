import { CURRICULUM, type CurriculumTopic } from "@/features/onboarding/planning/curriculum-rules";

export interface CanonicalTopicEntry extends CurriculumTopic {
  displayName: string;
  category: "core_structures" | "algorithmic_patterns" | "advanced";
  description: string;
}

const TOPIC_METADATA: Record<
  string,
  { displayName: string; category: CanonicalTopicEntry["category"]; description: string }
> = {
  arrays: {
    displayName: "Arrays & Dynamic Memory",
    category: "core_structures",
    description: "Contiguous memory invariants, pointers, and sub-array logic",
  },
  strings: {
    displayName: "Strings & Rolling Hashes",
    category: "core_structures",
    description: "String matching, char frequency invariants, and anagram patterns",
  },
  hashing: {
    displayName: "Hash Tables & Sets",
    category: "core_structures",
    description: "O(1) lookups, deduplication, and frequency maps",
  },
  "two-pointers": {
    displayName: "Two Pointers Technique",
    category: "algorithmic_patterns",
    description: "Converging pointers, fast/slow runners, and sorting pre-conditions",
  },
  "sliding-window": {
    displayName: "Sliding Window",
    category: "algorithmic_patterns",
    description: "Fixed and dynamic window invariants over sequences",
  },
  "binary-search": {
    displayName: "Binary Search & Monotonicity",
    category: "algorithmic_patterns",
    description: "Predicate boundaries, answer space search, and range reduction",
  },
  stack: {
    displayName: "Stack & Monotonic Stacks",
    category: "core_structures",
    description: "LIFO state, nearest greater element invariants, and parsing",
  },
  queue: {
    displayName: "Queue & Deque",
    category: "core_structures",
    description: "FIFO buffering, breadth-first traversal, and sliding max windows",
  },
  "linked-list": {
    displayName: "Linked Lists",
    category: "core_structures",
    description: "Pointer re-wiring, sentinel nodes, and cycle detection invariants",
  },
  trees: {
    displayName: "Binary Trees & BST",
    category: "core_structures",
    description: "Recursive depth-first and breadth-first tree invariants",
  },
  heap: {
    displayName: "Heaps & Priority Queues",
    category: "core_structures",
    description: "Top-K elements, streaming medians, and greedy priority queues",
  },
  graphs: {
    displayName: "Graph Algorithms",
    category: "advanced",
    description: "Adjacency traversals, cycle detection, topological order, and shortest paths",
  },
  greedy: {
    displayName: "Greedy Algorithms",
    category: "algorithmic_patterns",
    description: "Local choice optimality, interval scheduling, and exchange arguments",
  },
  "dynamic-programming": {
    displayName: "Dynamic Programming",
    category: "advanced",
    description: "Overlapping subproblems, state transitions, and memory reduction",
  },
};

export const CANONICAL_TOPIC_CATALOG: readonly CanonicalTopicEntry[] = CURRICULUM.map((topic) => {
  const meta = TOPIC_METADATA[topic.slug] ?? {
    displayName: topic.name,
    category: "core_structures" as const,
    description: `${topic.name} fundamental data structure and algorithms`,
  };
  return {
    ...topic,
    displayName: meta.displayName,
    category: meta.category,
    description: meta.description,
  };
});

const CANONICAL_MAP = new Map<string, CanonicalTopicEntry>(
  CANONICAL_TOPIC_CATALOG.map((t) => [t.slug, t])
);

/**
 * Normalizes legacy, snake_case, or alternative topic slugs to canonical curriculum slugs.
 * E.g., 'linked_lists' -> 'linked-list', 'stacks_queues' -> 'stack', 'dynamic_programming' -> 'dynamic-programming'.
 */
export function normalizeTopicSlug(rawSlug: string | null | undefined): string | null {
  if (!rawSlug) return null;
  const cleaned = rawSlug.trim().toLowerCase();

  if (CANONICAL_MAP.has(cleaned)) {
    return cleaned;
  }

  // Common alias mapping table
  const ALIAS_MAP: Record<string, string> = {
    // Linked Lists
    linked_lists: "linked-list",
    linked_list: "linked-list",
    linkedlists: "linked-list",
    linkedlist: "linked-list",
    "linked-lists": "linked-list",

    // Stacks & Queues
    stacks_queues: "stack",
    stack_queue: "stack",
    stacks: "stack",
    "stacks-queues": "stack",
    queues: "queue",

    // Trees
    tree: "trees",
    binary_tree: "trees",
    binary_trees: "trees",
    "binary-tree": "trees",
    "binary-trees": "trees",
    bst: "trees",
    trees_bst: "trees",
    "trees-bst": "trees",

    // Dynamic Programming
    dp: "dynamic-programming",
    dynamic_programming: "dynamic-programming",
    dynamicprogramming: "dynamic-programming",

    // Binary Search
    binarysearch: "binary-search",
    binary_search: "binary-search",

    // Two Pointers
    two_pointers: "two-pointers",
    twopointers: "two-pointers",

    // Sliding Window
    sliding_window: "sliding-window",
    slidingwindow: "sliding-window",

    // Graph
    graph: "graphs",

    // Array / String
    array: "arrays",
    string: "strings",
    hash_tables: "hashing",
    hash_table: "hashing",
    hashtables: "hashing",
    hashtable: "hashing",
  };

  if (ALIAS_MAP[cleaned]) {
    return ALIAS_MAP[cleaned];
  }

  return null;
}

export function isCanonicalTopicSlug(slug: string): boolean {
  return CANONICAL_MAP.has(slug);
}

export function getCanonicalTopic(slug: string): CanonicalTopicEntry | undefined {
  const normalized = normalizeTopicSlug(slug) || slug;
  return CANONICAL_MAP.get(normalized);
}

export function getAllCanonicalTopics(): readonly CanonicalTopicEntry[] {
  return CANONICAL_TOPIC_CATALOG;
}

/**
 * Resolves genuine topic slug from authentic Topic model without defaulting to arrays.
 * Returns undefined for missing, unclassified, or non-existent topics.
 */
export async function resolveGenuineTopicSlug(topicId: unknown): Promise<string | undefined> {
  if (!topicId) return undefined;
  try {
    const { TopicModel } = await import("@/features/content/models/content.model");
    const q: any = TopicModel.findById(topicId as any);
    const doc = q && typeof q.select === "function"
      ? await q.select("slug").lean()
      : q && typeof q.lean === "function"
      ? await q.lean()
      : await q;
    return doc?.slug || undefined;
  } catch {
    return undefined;
  }
}

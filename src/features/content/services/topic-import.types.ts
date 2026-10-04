export type TopicDifficulty = "beginner" | "easy" | "medium" | "hard" | "advanced";

export type TopicImportRawInput = {
  name?: unknown;
  title?: unknown; // fallback alias
  slug?: unknown;
  description?: unknown;
  summary?: unknown; // fallback alias
  difficulty?: unknown;
  order?: unknown;
  displayOrder?: unknown; // fallback alias
  estimatedMinutes?: unknown;
  durationMinutes?: unknown; // fallback alias
  isPublished?: unknown;
  published?: unknown; // fallback alias
  prerequisiteTopics?: unknown;
  prerequisites?: unknown; // fallback alias
  prerequisiteTopicIds?: unknown;
  keyConcepts?: unknown;
  recommendedPatterns?: unknown;
  targetProblems?: unknown;
  learningObjectives?: unknown;
  tags?: unknown;
  [key: string]: unknown;
};

export type TopicValidationResult = {
  valid: boolean;
  status: "valid" | "warning" | "error";
  errors: string[];
  warnings: string[];
  info: string[];
  duplicateMatch?: { id: string; name: string; slug: string } | null;
  similarMatches?: Array<{ id: string; name: string; slug: string; similarity: number }>;
  resolved: {
    name: string;
    slug: string;
    description: string;
    difficulty: TopicDifficulty;
    order: number;
    estimatedMinutes: number;
    isPublished: boolean;
    prerequisiteTopicIds: string[];
    prerequisiteTopicNames: string[];
    metadata: {
      keyConcepts: string[];
      recommendedPatterns: string[];
      targetProblems: string[];
      learningObjectives: string[];
      tags: string[];
    };
  };
};

export interface ValidateTopicImportOptions {
  input: unknown;
  currentTopicId?: string | null;
  /** Optional dependency injection for testing without live Mongo connection */
  existingTopics?: Array<{ id: string; _id?: unknown; name: string; slug: string }>;
  existingPatterns?: Array<{ id: string; _id?: unknown; name: string; slug: string }>;
  existingProblems?: Array<{ id: string; _id?: unknown; title: string; slug: string }>;
}

export const ALLOWED_DIFFICULTIES: Record<string, TopicDifficulty> = {
  beginner: "beginner",
  intro: "beginner",
  introductory: "beginner",
  basic: "beginner",
  easy: "easy",
  medium: "medium",
  intermediate: "medium",
  moderate: "medium",
  hard: "hard",
  difficult: "hard",
  advanced: "advanced",
  expert: "advanced",
};

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getBigrams(str: string): Set<string> {
  const s = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  const bigrams = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) {
    bigrams.add(s.slice(i, i + 2));
  }
  return bigrams;
}

export function calculateStringSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0.0;
  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);
  let intersection = 0;
  for (const bg of b1) {
    if (b2.has(bg)) intersection++;
  }
  return (2.0 * intersection) / (b1.size + b2.size);
}

/**
 * Strips markdown code blocks (```json ... ```) and parses JSON.
 * Pure utility safe for browser and server runtime.
 */
export function cleanAndParseTopicJson(raw: string | unknown): TopicImportRawInput {
  if (typeof raw === "object" && raw !== null) {
    return raw as TopicImportRawInput;
  }

  if (typeof raw !== "string") {
    throw new Error("Invalid payload: expected a JSON string or object.");
  }

  let cleaned = raw.trim();
  if (!cleaned) {
    throw new Error("Empty input: please paste valid topic JSON.");
  }

  // Strip markdown code fences if present
  const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match && match[1]) {
    cleaned = match[1].trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Invalid format: expected a JSON object representing a Topic.");
    }
    return parsed as TopicImportRawInput;
  } catch (err: any) {
    throw new Error(`JSON parsing failed: ${err.message || "malformed JSON syntax"}`);
  }
}

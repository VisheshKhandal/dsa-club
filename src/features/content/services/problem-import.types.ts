import {
  cleanAndParseJson,
  slugify,
  calculateStringSimilarity,
} from "./content-import-shared";

export type ProblemDifficulty = "easy" | "medium" | "hard";

export type ProblemSource = "internal" | "leetcode" | "geeksforgeeks" | "codeforces" | "other";

export type ProblemHint = {
  level: number;
  title: string;
  content: string;
};

export { slugify, calculateStringSimilarity };

export type ProblemImportRawInput = {
  title?: unknown;
  name?: unknown;
  slug?: unknown;
  summary?: unknown;
  description?: unknown;
  thinkingDirection?: unknown;
  intuition?: unknown;
  dryRunPrompt?: unknown;
  walkthrough?: unknown;
  hints?: unknown;
  commonMistakes?: unknown;
  pitfalls?: unknown;
  source?: unknown;
  platform?: unknown;
  sourceUrl?: unknown;
  url?: unknown;
  link?: unknown;
  externalId?: unknown;
  problemNumber?: unknown;
  leetcodeId?: unknown;
  topics?: unknown;
  topic?: unknown;
  topicNames?: unknown;
  topicSlugs?: unknown;
  topicIds?: unknown;
  patterns?: unknown;
  pattern?: unknown;
  patternNames?: unknown;
  patternSlugs?: unknown;
  patternIds?: unknown;
  difficulty?: unknown;
  estimatedMinutes?: unknown;
  duration?: unknown;
  qualityScore?: unknown;
  companyIds?: unknown;
  tags?: unknown;
  isPublished?: unknown;
  published?: unknown;
  [key: string]: unknown;
};

export type ProblemValidationResult = {
  valid: boolean;
  status: "valid" | "warning" | "error";
  errors: string[];
  warnings: string[];
  info: string[];
  duplicateByUrl?: { id: string; title: string; slug: string; sourceUrl: string } | null;
  duplicateBySlug?: { id: string; title: string; slug: string } | null;
  duplicateByTitle?: { id: string; title: string; slug: string } | null;
  similarMatches?: Array<{ id: string; title: string; slug: string; similarity: number }>;
  resolvedTopics: Array<{ id: string; name: string; slug: string }>;
  resolvedPatterns: Array<{ id: string; name: string; slug: string }>;
  resolved: {
    title: string;
    slug: string;
    summary: string;
    source: ProblemSource;
    sourceUrl: string;
    externalId: string;
    topicIds: string[];
    patternIds: string[];
    difficulty: ProblemDifficulty;
    estimatedMinutes: number;
    qualityScore: number;
    thinkingDirection: string;
    dryRunPrompt: string;
    hints: ProblemHint[];
    commonMistakes: string[];
    tags: string[];
    isPublished: boolean;
  };
};

export interface ValidateProblemImportOptions {
  input: unknown;
  currentProblemId?: string | null;
  /** Optional dependency injection for testing without live Mongo connection */
  existingTopics?: Array<{ id: string; _id?: unknown; name: string; slug: string }>;
  existingPatterns?: Array<{ id: string; _id?: unknown; name: string; slug: string }>;
  existingProblems?: Array<{ id: string; _id?: unknown; title: string; slug: string; sourceUrl?: string }>;
}

export const PROBLEM_DIFFICULTY_MAP: Record<string, ProblemDifficulty> = {
  beginner: "easy",
  intro: "easy",
  basic: "easy",
  easy: "easy",
  medium: "medium",
  intermediate: "medium",
  moderate: "medium",
  hard: "hard",
  difficult: "hard",
  advanced: "hard",
  expert: "hard",
};

export const ALLOWED_SOURCES: Record<string, ProblemSource> = {
  leetcode: "leetcode",
  lc: "leetcode",
  geeksforgeeks: "geeksforgeeks",
  gfg: "geeksforgeeks",
  codeforces: "codeforces",
  cf: "codeforces",
  other: "other",
  internal: "internal",
};

/**
 * Strips markdown code blocks (```json ... ```) and parses JSON into ProblemImportRawInput.
 */
export function cleanAndParseProblemJson(raw: string | unknown): ProblemImportRawInput {
  return cleanAndParseJson<ProblemImportRawInput>(raw, "Problem");
}

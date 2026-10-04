import {
  ContentDifficulty,
  ALLOWED_DIFFICULTIES,
  cleanAndParseJson,
  slugify,
  calculateStringSimilarity,
} from "./content-import-shared";

export type PatternDifficulty = ContentDifficulty;

export { ALLOWED_DIFFICULTIES, slugify, calculateStringSimilarity };

export type PatternImportRawInput = {
  name?: unknown;
  title?: unknown;
  slug?: unknown;
  topic?: unknown;
  topicName?: unknown;
  topicSlug?: unknown;
  topicId?: unknown;
  description?: unknown;
  summary?: unknown;
  whenToUse?: unknown;
  usage?: unknown;
  mentalModel?: unknown;
  intuition?: unknown;
  variations?: unknown;
  commonVariations?: unknown;
  signalKeywords?: unknown;
  keywords?: unknown;
  signals?: unknown;
  tags?: unknown;
  prerequisitePatterns?: unknown;
  prerequisites?: unknown;
  prerequisitePatternIds?: unknown;
  difficulty?: unknown;
  isPublished?: unknown;
  published?: unknown;
  [key: string]: unknown;
};

export type PatternValidationResult = {
  valid: boolean;
  status: "valid" | "warning" | "error";
  errors: string[];
  warnings: string[];
  info: string[];
  duplicateMatch?: { id: string; name: string; slug: string } | null;
  similarMatches?: Array<{ id: string; name: string; slug: string; similarity: number }>;
  resolvedTopic?: { id: string; name: string; slug: string } | null;
  resolvedPrerequisitePatterns?: Array<{ id: string; name: string; slug: string }>;
  resolved: {
    name: string;
    slug: string;
    topicId: string;
    description: string;
    whenToUse: string;
    mentalModel: string;
    variations: string[];
    signalKeywords: string[];
    prerequisitePatternIds: string[];
    difficulty: PatternDifficulty;
    isPublished: boolean;
  };
};

export interface ValidatePatternImportOptions {
  input: unknown;
  currentPatternId?: string | null;
  /** Optional dependency injection for testing without live Mongo connection */
  existingTopics?: Array<{ id: string; _id?: unknown; name: string; slug: string }>;
  existingPatterns?: Array<{ id: string; _id?: unknown; name: string; slug: string; topicId?: string }>;
}

/**
 * Strips markdown code blocks (```json ... ```) and parses JSON into PatternImportRawInput.
 */
export function cleanAndParsePatternJson(raw: string | unknown): PatternImportRawInput {
  return cleanAndParseJson<PatternImportRawInput>(raw, "Pattern");
}

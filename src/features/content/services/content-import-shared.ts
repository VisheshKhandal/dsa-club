/**
 * Shared Content Import Utilities & Reference Resolvers
 * Reusable across Learning Paths, Topics, Patterns, Missions, and Problems.
 */

export type ContentDifficulty = "beginner" | "easy" | "medium" | "hard" | "advanced";

export const ALLOWED_DIFFICULTIES: Record<string, ContentDifficulty> = {
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

/**
 * Sørensen–Dice coefficient string similarity (0.0 to 1.0)
 */
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
 * Pure utility safe for browser and server runtimes.
 */
export function cleanAndParseJson<T = Record<string, unknown>>(
  raw: string | unknown,
  entityName = "Entity"
): T {
  if (typeof raw === "object" && raw !== null) {
    return raw as T;
  }

  if (typeof raw !== "string") {
    throw new Error(`Invalid payload: expected a JSON string or object for ${entityName}.`);
  }

  let cleaned = raw.trim();
  if (!cleaned) {
    throw new Error(`Empty input: please paste valid ${entityName.toLowerCase()} JSON.`);
  }

  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match && match[1]) {
    cleaned = match[1].trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error(`Invalid format: expected a JSON object representing a ${entityName}.`);
    }
    return parsed as T;
  } catch (err: any) {
    throw new Error(`JSON parsing failed: ${err.message || "malformed JSON syntax"}`);
  }
}

export interface EntityCandidate {
  id: string;
  name?: string;
  title?: string;
  slug: string;
  [key: string]: unknown;
}

export interface ResolveReferenceResult<T extends EntityCandidate> {
  matched: T | null;
  candidates: Array<{ entity: T; similarity: number }>;
  isAmbiguous: boolean;
}

/**
 * Deterministically resolves a human-readable identifier (name, title, slug, or ID)
 * against a list of existing database records.
 */
export function resolveReference<T extends EntityCandidate>(
  query: string,
  existingList: T[],
  options?: { similarityThreshold?: number }
): ResolveReferenceResult<T> {
  const q = query.trim();
  if (!q) {
    return { matched: null, candidates: [], isAmbiguous: false };
  }

  const qLower = q.toLowerCase();
  const qSlug = slugify(q);

  // 1. Exact ID match
  const exactId = existingList.find((item) => item.id === q);
  if (exactId) {
    return { matched: exactId, candidates: [{ entity: exactId, similarity: 1.0 }], isAmbiguous: false };
  }

  // 2. Exact slug match
  const exactSlug = existingList.find((item) => item.slug.toLowerCase() === qLower || item.slug.toLowerCase() === qSlug);
  if (exactSlug) {
    return { matched: exactSlug, candidates: [{ entity: exactSlug, similarity: 1.0 }], isAmbiguous: false };
  }

  // 3. Exact name / title match (case-insensitive)
  const exactName = existingList.find((item) => {
    const label = (item.name || item.title || "").toLowerCase().trim();
    return label === qLower;
  });
  if (exactName) {
    return { matched: exactName, candidates: [{ entity: exactName, similarity: 1.0 }], isAmbiguous: false };
  }

  // 4. Slugified name / title match
  const slugifiedName = existingList.find((item) => {
    const label = item.name || item.title || "";
    return label ? slugify(label) === qSlug : false;
  });
  if (slugifiedName) {
    return { matched: slugifiedName, candidates: [{ entity: slugifiedName, similarity: 0.95 }], isAmbiguous: false };
  }

  // 5. Fuzzy similarity evaluation
  const threshold = options?.similarityThreshold ?? 0.70;
  const scoredCandidates: Array<{ entity: T; similarity: number }> = [];

  for (const item of existingList) {
    const label = item.name || item.title || "";
    const simName = label ? calculateStringSimilarity(q, label) : 0;
    const simSlug = calculateStringSimilarity(qSlug, item.slug);
    const bestSim = Math.max(simName, simSlug);

    if (bestSim >= threshold) {
      scoredCandidates.push({ entity: item, similarity: bestSim });
    }
  }

  scoredCandidates.sort((a, b) => b.similarity - a.similarity);

  if (scoredCandidates.length === 0) {
    return { matched: null, candidates: [], isAmbiguous: false };
  }

  // Check if multiple candidates have very close high scores
  if (
    scoredCandidates.length > 1 &&
    Math.abs(scoredCandidates[0].similarity - scoredCandidates[1].similarity) < 0.05
  ) {
    return {
      matched: null,
      candidates: scoredCandidates,
      isAmbiguous: true,
    };
  }

  return {
    matched: scoredCandidates[0].entity,
    candidates: scoredCandidates,
    isAmbiguous: false,
  };
}

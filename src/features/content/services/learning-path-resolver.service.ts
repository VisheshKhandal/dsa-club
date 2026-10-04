import {
  TopicModel,
  PatternModel,
  ProblemModel,
  MissionModel,
} from "@/features/content/models/content.model";
import { connectToDatabase } from "@/lib/db/mongodb";

// ─── Types ───────────────────────────────────────────────────────────────────

type CatalogItem = {
  id: string;
  slug: string;
  name: string;
  sourceUrl?: string;
  difficulty?: string;
  isPublished?: boolean;
};

type ContentCatalog = {
  topics: CatalogItem[];
  patterns: CatalogItem[];
  problems: CatalogItem[];
  missions: CatalogItem[];
};

type RawStage = {
  title: string;
  description?: string;
  estimatedMinutes?: number;
  topics?: RawRef[];
  patterns?: RawRef[];
  problems?: RawRef[];
  missions?: RawRef[];
};

type RawRef = {
  slug?: string;
  title?: string;
  name?: string;
  url?: string;
  sourceUrl?: string;
};

type ResolvedRef = {
  id: string;
  slug: string;
  name: string;
  confidence: "exact" | "high" | "medium";
  matchedVia: string;
};

type UnresolvedRef = {
  input: RawRef;
  candidates: CandidateRef[];
};

type CandidateRef = {
  id: string;
  slug: string;
  name: string;
  score: number;
  matchedVia: string;
};

type ResolvedStage = {
  title: string;
  description: string;
  estimatedMinutes: number;
  topics: { resolved: ResolvedRef[]; unresolved: UnresolvedRef[] };
  patterns: { resolved: ResolvedRef[]; unresolved: UnresolvedRef[] };
  problems: { resolved: ResolvedRef[]; unresolved: UnresolvedRef[] };
  missions: { resolved: ResolvedRef[]; unresolved: UnresolvedRef[] };
};

export type ResolutionReport = {
  pathMeta: {
    title: string;
    slug: string;
    description: string;
    difficulty: string;
    estimatedMinutes: number;
    audience: string;
    tags: string[];
  };
  stages: ResolvedStage[];
  summary: {
    totalTopics: number;
    resolvedTopics: number;
    totalPatterns: number;
    resolvedPatterns: number;
    totalProblems: number;
    resolvedProblems: number;
    totalMissions: number;
    resolvedMissions: number;
    totalUnresolved: number;
  };
};

// ─── Normalization helpers ───────────────────────────────────────────────────

function normalizeSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeAlphanumeric(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function extractLeetCodeSlug(url: string): string | null {
  const match = url.match(/leetcode\.com\/problems\/([a-z0-9-]+)/);
  return match ? match[1] : null;
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Remove trailing slashes and common suffixes
    let path = u.pathname.replace(/\/+$/, "").replace(/\/description\/?$/, "");
    return `${u.hostname}${path}`.toLowerCase();
  } catch {
    return url.toLowerCase().trim();
  }
}

// ─── Token overlap scoring for candidate ranking ─────────────────────────────

function tokenScore(input: string, target: string): number {
  const inputTokens = new Set(
    input
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  );
  const targetTokens = new Set(
    target
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  );
  if (inputTokens.size === 0 || targetTokens.size === 0) return 0;
  let overlap = 0;
  for (const token of inputTokens) {
    if (targetTokens.has(token)) overlap++;
  }
  return overlap / Math.max(inputTokens.size, targetTokens.size);
}

// ─── Build in-memory hash indexes ────────────────────────────────────────────

type IndexMaps = {
  bySlug: Map<string, CatalogItem>;
  byNormalizedSlug: Map<string, CatalogItem>;
  byNormalizedName: Map<string, CatalogItem>;
  byLeetCodeSlug: Map<string, CatalogItem>;
  byNormalizedUrl: Map<string, CatalogItem>;
};

function buildIndexes(items: CatalogItem[]): IndexMaps {
  const maps: IndexMaps = {
    bySlug: new Map(),
    byNormalizedSlug: new Map(),
    byNormalizedName: new Map(),
    byLeetCodeSlug: new Map(),
    byNormalizedUrl: new Map(),
  };

  for (const item of items) {
    maps.bySlug.set(item.slug, item);
    maps.byNormalizedSlug.set(normalizeSlug(item.slug), item);
    maps.byNormalizedName.set(normalizeAlphanumeric(item.name), item);

    if (item.sourceUrl) {
      const lcSlug = extractLeetCodeSlug(item.sourceUrl);
      if (lcSlug) maps.byLeetCodeSlug.set(lcSlug, item);
      maps.byNormalizedUrl.set(normalizeUrl(item.sourceUrl), item);
    }
  }

  return maps;
}

// ─── Multi-tier deterministic resolution ─────────────────────────────────────

function resolveRef(
  ref: RawRef,
  indexes: IndexMaps,
  type: "topic" | "pattern" | "problem" | "mission",
  allItems: CatalogItem[]
): { resolved: ResolvedRef | null; unresolved: UnresolvedRef | null } {
  const refName = ref.title || ref.name || ref.slug || "";

  // For problems: try LeetCode URL first
  if (type === "problem") {
    const url = ref.url || ref.sourceUrl || "";
    if (url) {
      // Tier 1: LeetCode slug extraction
      const lcSlug = extractLeetCodeSlug(url);
      if (lcSlug) {
        const match = indexes.byLeetCodeSlug.get(lcSlug);
        if (match) {
          return {
            resolved: { id: match.id, slug: match.slug, name: match.name, confidence: "exact", matchedVia: "leetcode-slug" },
            unresolved: null,
          };
        }
      }

      // Tier 2: Normalized URL
      const normUrl = normalizeUrl(url);
      const urlMatch = indexes.byNormalizedUrl.get(normUrl);
      if (urlMatch) {
        return {
          resolved: { id: urlMatch.id, slug: urlMatch.slug, name: urlMatch.name, confidence: "exact", matchedVia: "source-url" },
          unresolved: null,
        };
      }
    }
  }

  // Tier: Slug match
  if (ref.slug) {
    const slugMatch = indexes.bySlug.get(ref.slug) || indexes.byNormalizedSlug.get(normalizeSlug(ref.slug));
    if (slugMatch) {
      return {
        resolved: { id: slugMatch.id, slug: slugMatch.slug, name: slugMatch.name, confidence: "exact", matchedVia: "slug" },
        unresolved: null,
      };
    }
  }

  // Tier: Normalized name/title match
  if (refName) {
    const normName = normalizeAlphanumeric(refName);
    const nameMatch = indexes.byNormalizedName.get(normName);
    if (nameMatch) {
      return {
        resolved: { id: nameMatch.id, slug: nameMatch.slug, name: nameMatch.name, confidence: "high", matchedVia: "title" },
        unresolved: null,
      };
    }

    // Also try slugified version of the name
    const slugFromName = normalizeSlug(refName);
    const slugNameMatch = indexes.byNormalizedSlug.get(slugFromName);
    if (slugNameMatch) {
      return {
        resolved: { id: slugNameMatch.id, slug: slugNameMatch.slug, name: slugNameMatch.name, confidence: "high", matchedVia: "title-slug" },
        unresolved: null,
      };
    }
  }

  // No exact match — generate candidates via token scoring
  const searchText = refName || ref.slug || "";
  const candidates: CandidateRef[] = allItems
    .map((item) => {
      const nameScore = tokenScore(searchText, item.name);
      const slugScore = tokenScore(searchText, item.slug);
      const score = Math.max(nameScore, slugScore);
      return {
        id: item.id,
        slug: item.slug,
        name: item.name,
        score: Math.round(score * 100),
        matchedVia: nameScore >= slugScore ? "name-similarity" : "slug-similarity",
      };
    })
    .filter((c) => c.score > 15)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return {
    resolved: null,
    unresolved: { input: ref, candidates },
  };
}

// ─── Exported functions ──────────────────────────────────────────────────────

export async function exportContentCatalog(): Promise<{
  catalog: ContentCatalog;
  promptCatalog: string;
  counts: { topics: number; patterns: number; problems: number; missions: number };
}> {
  await connectToDatabase();

  const [topics, patterns, problems, missions] = await Promise.all([
    TopicModel.find({}).select("slug name difficulty isPublished").lean(),
    PatternModel.find({}).select("slug name difficulty isPublished").lean(),
    ProblemModel.find({}).select("slug title sourceUrl difficulty isPublished").lean(),
    MissionModel.find({}).select("slug title difficulty isPublished").lean(),
  ]);

  const catalog: ContentCatalog = {
    topics: topics.map((t: any) => ({ id: String(t._id), slug: t.slug, name: t.name, difficulty: t.difficulty, isPublished: t.isPublished })),
    patterns: patterns.map((p: any) => ({ id: String(p._id), slug: p.slug, name: p.name, difficulty: p.difficulty, isPublished: p.isPublished })),
    problems: problems.map((p: any) => ({ id: String(p._id), slug: p.slug, name: p.title, sourceUrl: p.sourceUrl, difficulty: p.difficulty, isPublished: p.isPublished })),
    missions: missions.map((m: any) => ({ id: String(m._id), slug: m.slug, name: m.title, difficulty: m.difficulty, isPublished: m.isPublished })),
  };

  // Build token-efficient text for LLM prompts
  const lines: string[] = [];
  lines.push(`AVAILABLE TOPICS (${catalog.topics.length}):`);
  for (const t of catalog.topics) {
    lines.push(`- ${t.slug} (${t.name}) [${t.difficulty}]`);
  }
  lines.push("");
  lines.push(`AVAILABLE PATTERNS (${catalog.patterns.length}):`);
  for (const p of catalog.patterns) {
    lines.push(`- ${p.slug} (${p.name}) [${p.difficulty}]`);
  }
  lines.push("");
  lines.push(`AVAILABLE PROBLEMS (${catalog.problems.length}):`);
  for (const p of catalog.problems) {
    lines.push(`- ${p.slug} (${p.name})${p.sourceUrl ? ` [${p.sourceUrl}]` : ""} [${p.difficulty}]`);
  }
  lines.push("");
  lines.push(`AVAILABLE MISSIONS (${catalog.missions.length}):`);
  for (const m of catalog.missions) {
    lines.push(`- ${m.slug} (${m.name}) [${m.difficulty}]`);
  }

  return {
    catalog,
    promptCatalog: lines.join("\n"),
    counts: {
      topics: catalog.topics.length,
      patterns: catalog.patterns.length,
      problems: catalog.problems.length,
      missions: catalog.missions.length,
    },
  };
}

export async function resolveLearningPathReferences(rawPayload: any): Promise<ResolutionReport> {
  // 1. Validate and extract top-level meta
  const title = rawPayload.title || "";
  const slug = rawPayload.slug || normalizeSlug(title) || `path-${Date.now()}`;
  const description = rawPayload.description || "";
  const difficulty = rawPayload.difficulty || "beginner";
  const estimatedMinutes = rawPayload.estimatedMinutes || 600;
  const audience = rawPayload.audience || "";
  const tags = Array.isArray(rawPayload.tags) ? rawPayload.tags : [];
  const rawStages: RawStage[] = Array.isArray(rawPayload.stages) ? rawPayload.stages : [];

  // 2. Bulk-fetch all content and build indexes (single snapshot)
  const { catalog } = await exportContentCatalog();
  const topicIndexes = buildIndexes(catalog.topics);
  const patternIndexes = buildIndexes(catalog.patterns);
  const problemIndexes = buildIndexes(catalog.problems);
  const missionIndexes = buildIndexes(catalog.missions);

  // 3. Resolve each stage
  let totalTopics = 0, resolvedTopics = 0;
  let totalPatterns = 0, resolvedPatterns = 0;
  let totalProblems = 0, resolvedProblems = 0;
  let totalMissions = 0, resolvedMissions = 0;

  const stages: ResolvedStage[] = rawStages.map((stage) => {
    const resolveGroup = (
      refs: RawRef[],
      indexes: IndexMaps,
      type: "topic" | "pattern" | "problem" | "mission",
      allItems: CatalogItem[]
    ) => {
      const resolved: ResolvedRef[] = [];
      const unresolved: UnresolvedRef[] = [];
      const seenIds = new Set<string>();

      for (const ref of refs) {
        const result = resolveRef(ref, indexes, type, allItems);
        if (result.resolved) {
          // Deduplicate within stage
          if (!seenIds.has(result.resolved.id)) {
            seenIds.add(result.resolved.id);
            resolved.push(result.resolved);
          }
        } else if (result.unresolved) {
          unresolved.push(result.unresolved);
        }
      }
      return { resolved, unresolved };
    };

    const topicRefs = Array.isArray(stage.topics) ? stage.topics : [];
    const patternRefs = Array.isArray(stage.patterns) ? stage.patterns : [];
    const problemRefs = Array.isArray(stage.problems) ? stage.problems : [];
    const missionRefs = Array.isArray(stage.missions) ? stage.missions : [];

    const topicResult = resolveGroup(topicRefs, topicIndexes, "topic", catalog.topics);
    const patternResult = resolveGroup(patternRefs, patternIndexes, "pattern", catalog.patterns);
    const problemResult = resolveGroup(problemRefs, problemIndexes, "problem", catalog.problems);
    const missionResult = resolveGroup(missionRefs, missionIndexes, "mission", catalog.missions);

    totalTopics += topicRefs.length;
    resolvedTopics += topicResult.resolved.length;
    totalPatterns += patternRefs.length;
    resolvedPatterns += patternResult.resolved.length;
    totalProblems += problemRefs.length;
    resolvedProblems += problemResult.resolved.length;
    totalMissions += missionRefs.length;
    resolvedMissions += missionResult.resolved.length;

    return {
      title: stage.title || "Untitled Stage",
      description: stage.description || "",
      estimatedMinutes: stage.estimatedMinutes || 60,
      topics: topicResult,
      patterns: patternResult,
      problems: problemResult,
      missions: missionResult,
    };
  });

  const totalUnresolved =
    (totalTopics - resolvedTopics) +
    (totalPatterns - resolvedPatterns) +
    (totalProblems - resolvedProblems) +
    (totalMissions - resolvedMissions);

  return {
    pathMeta: { title, slug, description, difficulty, estimatedMinutes, audience, tags },
    stages,
    summary: {
      totalTopics,
      resolvedTopics,
      totalPatterns,
      resolvedPatterns,
      totalProblems,
      resolvedProblems,
      totalMissions,
      resolvedMissions,
      totalUnresolved,
    },
  };
}

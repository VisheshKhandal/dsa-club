import { connectToDatabase } from "@/lib/db/mongodb";
import {
  TopicModel,
  PatternModel,
  CompanyModel,
  LearningPathModel,
  MissionModel,
  ProblemModel,
} from "@/features/content/models/content.model";
import { RoadmapTemplateModel } from "@/features/learning/models/learning.model";

/**
 * Tag constants for granular cache invalidation
 */
export const CURRICULUM_TAGS = {
  TOPICS: "curriculum-topics",
  PATTERNS: "curriculum-patterns",
  PROBLEMS: "curriculum-problems",
  COMPANIES: "curriculum-companies",
  LEARNING_PATHS: "curriculum-learning-paths",
  ROADMAP_TEMPLATE: "curriculum-roadmap-template",
  MISSIONS: "curriculum-missions",
} as const;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const ramCache = new Map<string, CacheEntry<any>>();

function memoryCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  key: string,
  ttlSeconds = 3600
): T {
  return (async (...args: any[]) => {
    const fullKey = args.length > 0 ? `${key}:${JSON.stringify(args)}` : key;
    const now = Date.now();
    const hit = ramCache.get(fullKey);
    if (hit && hit.expiresAt > now) {
      return hit.data;
    }
    const data = await fn(...args);
    ramCache.set(fullKey, { data, expiresAt: now + ttlSeconds * 1000 });
    return data;
  }) as T;
}

/**
 * Fetch published topics (cached in RAM for 1 hour across requests)
 */
export const getCachedPublishedTopics = memoryCache(
  async () => {
    await connectToDatabase();
    return TopicModel.find({ isPublished: true }).sort({ order: 1 }).lean();
  },
  "cached-published-topics"
);

/**
 * Fetch a single published topic by slug from RAM cache (0ms DB cost)
 */
export async function getCachedTopicBySlug(slug: string) {
  const topics = await getCachedPublishedTopics();
  return (topics as any[]).find((t) => t.slug === slug) ?? null;
}

/**
 * Fetch published patterns (cached in RAM for 1 hour)
 */
export const getCachedPublishedPatterns = memoryCache(
  async () => {
    await connectToDatabase();
    return PatternModel.find({ isPublished: true })
      .populate("topicId", "name slug")
      .sort({ name: 1 })
      .lean();
  },
  "cached-published-patterns"
);

/**
 * Fetch a single published pattern by slug from RAM cache (0ms DB cost)
 */
export async function getCachedPatternBySlug(slug: string) {
  const patterns = await getCachedPublishedPatterns();
  return (patterns as any[]).find((p) => p.slug === slug) ?? null;
}

/**
 * Fetch active companies (cached in RAM for 1 hour)
 */
export const getCachedActiveCompanies = memoryCache(
  async () => {
    await connectToDatabase();
    return CompanyModel.find({ isActive: true })
      .sort({ tier: 1, name: 1 })
      .lean();
  },
  "cached-active-companies"
);

/**
 * Fetch active roadmap template (cached in RAM for 1 hour)
 */
export const getCachedRoadmapTemplate = memoryCache(
  async () => {
    await connectToDatabase();
    return RoadmapTemplateModel.findOne({
      isPublished: true,
      nodes: { $exists: true, $ne: [] },
    })
      .sort({ updatedAt: -1 })
      .lean();
  },
  "cached-roadmap-template"
);

/**
 * Fetch published learning paths (cached in RAM for 1 hour)
 */
export const getCachedLearningPaths = memoryCache(
  async () => {
    await connectToDatabase();
    return LearningPathModel.find({ isPublished: true })
      .sort({ isFeatured: -1, updatedAt: -1 })
      .populate("stages.topicIds stages.patternIds stages.problemIds stages.missionIds")
      .limit(6)
      .lean();
  },
  "cached-learning-paths"
);

/**
 * Fetch a single published learning path by slug from RAM cache (0ms DB cost on repeat)
 */
export const getCachedLearningPathBySlug = memoryCache(
  async (slug: string) => {
    await connectToDatabase();
    return LearningPathModel.findOne({ slug, isPublished: true })
      .populate("stages.topicIds stages.patternIds stages.problemIds stages.missionIds")
      .lean();
  },
  "cached-learning-path-by-slug"
);


/**
 * Fetch published missions (cached in RAM for 1 hour)
 */
export const getCachedPublishedMissions = memoryCache(
  async () => {
    await connectToDatabase();
    const missions = await MissionModel.find({ isPublished: true })
      .populate("topicId patternId")
      .sort({ order: 1, createdAt: 1 })
      .lean();

    // Canonical curriculum sequencing: sort primarily by parent Topic order, then by Mission order
    return (missions as any[]).sort((a, b) => {
      const topicOrderA = typeof a.topicId?.order === "number" ? a.topicId.order : 9999;
      const topicOrderB = typeof b.topicId?.order === "number" ? b.topicId.order : 9999;
      if (topicOrderA !== topicOrderB) return topicOrderA - topicOrderB;
      const missionOrderA = typeof a.order === "number" ? a.order : 0;
      const missionOrderB = typeof b.order === "number" ? b.order : 0;
      return missionOrderA - missionOrderB;
    });
  },
  "cached-published-missions"
);

/**
 * Fetch a single published mission by slug from RAM cache (0ms DB cost)
 */
export async function getCachedMissionBySlug(slug: string) {
  const missions = await getCachedPublishedMissions();
  return (missions as any[]).find((m) => m.slug === slug) ?? null;
}

/**
 * Fetch published problems (cached in RAM for 1 hour)
 * Excludes heavy solution / starter code fields to minimize memory and serialization cost.
 */
export const getCachedPublishedProblems = memoryCache(
  async () => {
    await connectToDatabase();
    let query = ProblemModel.find({ isPublished: true }) as any;
    if (typeof query.populate === "function") {
      query = query.populate("patternIds topicIds companyIds");
    }
    if (typeof query.select === "function") {
      query = query.select("-starterCode -testCases -editorialSolution -solutions");
    }
    if (typeof query.sort === "function") {
      query = query.sort({ qualityScore: -1 });
    }
    if (typeof query.lean === "function") {
      return query.lean();
    }
    return query;
  },
  "cached-published-problems"
);

/**
 * Fetch a single published problem by slug from RAM cache (0ms DB cost)
 */
export async function getCachedProblemBySlug(slug: string) {
  const problems = await getCachedPublishedProblems();
  return (problems as any[]).find((p) => p.slug === slug) ?? null;
}

/**
 * Trigger revalidation when curriculum is modified (e.g. from Studio)
 */
export function revalidateCurriculumCache(type?: keyof typeof CURRICULUM_TAGS) {
  ramCache.clear();
}

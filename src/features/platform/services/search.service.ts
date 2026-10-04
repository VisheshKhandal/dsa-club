import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { CompanyModel, LearningPathModel, MissionModel, PatternModel, ProblemModel, TopicModel } from "@/features/content/models/content.model";
import { RevisionQueueModel } from "@/features/intelligence/models/intelligence.model";
import type { SearchResultDto } from "@/features/platform/dto/platform.dto";

type SearchGroup = {
  category: string;
  results: SearchResultDto[];
};

type SearchResponse = {
  results: SearchResultDto[];
  groups: SearchGroup[];
};

type AnyDoc = Record<string, any>;

const CATEGORY_ORDER = ["Topic", "Mission", "Problem", "Pattern", "Company", "Revision", "Learning"];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function id(value: unknown) {
  return String(value);
}

function excerpt(value: unknown, fallback: string) {
  const text = String(value ?? "").trim() || fallback;
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

function searchableFilter(query: string, fields: string[], published = true) {
  const base: Record<string, unknown> = published ? { isPublished: true } : {};
  if (!query.trim()) return base;
  const pattern = new RegExp(escapeRegExp(query.trim()), "i");
  return { ...base, $or: fields.map((field) => ({ [field]: pattern })) };
}

function add(groups: Map<string, SearchResultDto[]>, result: SearchResultDto) {
  const bucket = groups.get(result.category) ?? [];
  if (!bucket.some((item) => item.href === result.href)) bucket.push(result);
  groups.set(result.category, bucket);
}

async function revisionResults(userId: string | undefined, query: string, limit: number) {
  if (!userId || !Types.ObjectId.isValid(userId)) return [];
  const uid = new Types.ObjectId(userId);
  const queues = await RevisionQueueModel.find({
    userId: uid,
    state: { $in: ["due", "scheduled", "snoozed"] },
  })
    .sort({ state: 1, priority: -1, dueAt: 1 })
    .limit(Math.max(limit * 2, 10))
    .lean();

  const idsByType = (queues as AnyDoc[]).reduce<Record<string, string[]>>((acc, item) => {
    acc[item.entityType] = [...(acc[item.entityType] ?? []), id(item.entityId)];
    return acc;
  }, {});

  const [topics, patterns, problems, missions] = await Promise.all([
    idsByType.topic?.length ? TopicModel.find({ _id: { $in: idsByType.topic } }).select("name slug description").lean() : [],
    idsByType.pattern?.length ? PatternModel.find({ _id: { $in: idsByType.pattern } }).select("name slug description").lean() : [],
    idsByType.problem?.length ? ProblemModel.find({ _id: { $in: idsByType.problem } }).select("title slug summary").lean() : [],
    idsByType.mission?.length ? MissionModel.find({ _id: { $in: idsByType.mission } }).select("title slug description").lean() : [],
  ]);

  const targets = new Map<string, { title: string; href: string; description: string }>();
  for (const item of topics as AnyDoc[]) targets.set(id(item._id), { title: item.name, href: `/learn/topics/${item.slug}`, description: item.description });
  for (const item of patterns as AnyDoc[]) targets.set(id(item._id), { title: item.name, href: `/patterns/${item.slug}`, description: item.description });
  for (const item of problems as AnyDoc[]) targets.set(id(item._id), { title: item.title, href: `/practice/problems/${item.slug}`, description: item.summary });
  for (const item of missions as AnyDoc[]) targets.set(id(item._id), { title: item.title, href: `/missions/${item.slug}`, description: item.description });

  const needle = query.trim().toLowerCase();
  return (queues as AnyDoc[])
    .map((queue) => {
      const target = targets.get(id(queue.entityId));
      if (!target) return null;
      return {
        title: `Review: ${target.title}`,
        href: `/revision/session/${id(queue._id)}`,
        category: "Revision",
        description: `${queue.state === "due" ? "Due now" : "Scheduled"} - ${excerpt(target.description, queue.entityType)}`,
      } satisfies SearchResultDto;
    })
    .filter((item): item is SearchResultDto => Boolean(item))
    .filter((item) => !needle || `${item.title} ${item.description}`.toLowerCase().includes(needle))
    .slice(0, limit);
}

export async function searchMongoProvider(query: string, limit = 10, userId?: string): Promise<SearchResponse> {
  await connectToDatabase();
  const normalizedLimit = Math.max(1, Math.min(50, limit));
  const perGroupLimit = Math.max(4, normalizedLimit);

  const [topics, missions, problems, patterns, companies, learningPaths, revisions] = await Promise.all([
    TopicModel.find(searchableFilter(query, ["name", "slug", "description"])).sort({ order: 1 }).limit(perGroupLimit).lean(),
    MissionModel.find(searchableFilter(query, ["title", "slug", "description"])).sort({ updatedAt: -1 }).limit(perGroupLimit).lean(),
    ProblemModel.find(searchableFilter(query, ["title", "slug", "summary", "tags"])).sort({ qualityScore: -1 }).limit(perGroupLimit).lean(),
    PatternModel.find(searchableFilter(query, ["name", "slug", "description", "whenToUse", "signalKeywords"])).sort({ updatedAt: -1 }).limit(perGroupLimit).lean(),
    CompanyModel.find(searchableFilter(query, ["name", "slug", "description", "tags"], false)).sort({ name: 1 }).limit(perGroupLimit).lean(),
    LearningPathModel.find(searchableFilter(query, ["title", "slug", "description", "tags"])).sort({ isFeatured: -1, updatedAt: -1 }).limit(perGroupLimit).lean(),
    revisionResults(userId, query, perGroupLimit),
  ]);

  const grouped = new Map<string, SearchResultDto[]>();
  for (const item of topics as AnyDoc[]) add(grouped, { title: String(item.name), href: `/learn/topics/${item.slug}`, category: "Topic", description: excerpt(item.description, "Open topic") });
  for (const item of missions as AnyDoc[]) add(grouped, { title: String(item.title), href: `/missions/${item.slug}`, category: "Mission", description: excerpt(item.description, "Open mission") });
  for (const item of problems as AnyDoc[]) add(grouped, { title: String(item.title), href: `/practice/problems/${item.slug}`, category: "Problem", description: excerpt(item.summary, "Open problem") });
  for (const item of patterns as AnyDoc[]) add(grouped, { title: String(item.name), href: `/patterns/${item.slug}`, category: "Pattern", description: excerpt(item.description || item.whenToUse, "Open pattern") });
  for (const item of companies as AnyDoc[]) add(grouped, { title: String(item.name), href: `/companies/${item.slug}`, category: "Company", description: excerpt(item.description || item.tier, "Open company prep") });
  for (const item of learningPaths as AnyDoc[]) add(grouped, { title: String(item.title), href: "/learn/paths", category: "Learning", description: excerpt(item.description, "Open learning path") });
  for (const item of revisions) add(grouped, item);

  const groups = CATEGORY_ORDER
    .map((category) => ({ category, results: grouped.get(category) ?? [] }))
    .filter((group) => group.results.length > 0);
  const results = groups.flatMap((group) => group.results).slice(0, normalizedLimit);

  return { results, groups };
}

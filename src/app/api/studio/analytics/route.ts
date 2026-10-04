import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { startOfDay, subDays } from "date-fns";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/rbac";
import { CompanyModel, LearningPathModel, MissionModel, PatternModel, ProblemModel, TopicModel } from "@/features/content/models/content.model";
import { RoadmapTemplateModel, LearningSessionModel, MissionProgressModel, ProblemAttemptModel } from "@/features/learning/models/learning.model";
import { ActivityEventModel, RevisionHistoryModel, RevisionQueueModel, UserStatisticsModel } from "@/features/intelligence/models/intelligence.model";
import { UserModel } from "@/features/identity/models/user.model";

type Range = "today" | "7d" | "30d" | "90d" | "all";

function getRangeStart(range: Range) {
  if (range === "all") return null;
  if (range === "today") return startOfDay(new Date());
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  return subDays(startOfDay(new Date()), days - 1);
}

function dateMatch(field: string, start: Date | null) {
  return start ? { [field]: { $gte: start } } : {};
}

async function safe<T>(label: string, fallback: T, work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err) {
    console.error(`[studio-analytics:${label}]`, err);
    return fallback;
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const range = ((req.nextUrl.searchParams.get("range") ?? "30d") as Range);
    const safeRange: Range = ["today", "7d", "30d", "90d", "all"].includes(range) ? range : "30d";
    const start = getRangeStart(safeRange);

    const overview = await safe("overview", null, async () => {
      const [
        totalUsers, activeUsers, newUsers, totalTopics, totalPatterns, totalProblems, totalMissions,
        totalRoadmaps, totalLearningPaths, totalCompanies, publishedTopics, publishedPatterns,
        publishedProblems, publishedMissions, publishedRoadmaps, publishedLearningPaths,
      ] = await Promise.all([
        UserModel.countDocuments({ status: "active" }),
        UserModel.countDocuments({ ...dateMatch("lastActiveAt", start) }),
        UserModel.countDocuments({ ...dateMatch("createdAt", start) }),
        TopicModel.countDocuments({}),
        PatternModel.countDocuments({}),
        ProblemModel.countDocuments({}),
        MissionModel.countDocuments({}),
        RoadmapTemplateModel.countDocuments({}),
        LearningPathModel.countDocuments({}),
        CompanyModel.countDocuments({}),
        TopicModel.countDocuments({ isPublished: true }),
        PatternModel.countDocuments({ isPublished: true }),
        ProblemModel.countDocuments({ isPublished: true }),
        MissionModel.countDocuments({ isPublished: true }),
        RoadmapTemplateModel.countDocuments({ isPublished: true }),
        LearningPathModel.countDocuments({ isPublished: true }),
      ]);
      return {
        totalUsers, activeUsers, newUsers,
        content: { totalTopics, totalPatterns, totalProblems, totalMissions, totalRoadmaps, totalLearningPaths, totalCompanies, publishedTopics, publishedPatterns, publishedProblems, publishedMissions, publishedRoadmaps, publishedLearningPaths },
      };
    });

    const activity = await safe("activity", { problemAttempts: 0, problemCompletions: 0, missionCompletions: 0, learningSessions: 0, revisionReviews: 0, dueRevisions: 0, focusedMinutes: 0 }, async () => {
      const [problemAttempts, problemCompletions, missionCompletions, learningSessions, revisionReviews, dueRevisions, focused] = await Promise.all([
        ProblemAttemptModel.countDocuments({ ...dateMatch("createdAt", start) }),
        ProblemAttemptModel.countDocuments({ status: "solved", ...dateMatch("completedAt", start) }),
        MissionProgressModel.countDocuments({ status: "completed", ...dateMatch("completedAt", start) }),
        LearningSessionModel.countDocuments({ ...dateMatch("startedAt", start) }),
        RevisionHistoryModel.countDocuments({ ...dateMatch("reviewedAt", start) }),
        RevisionQueueModel.countDocuments({ state: { $in: ["due", "scheduled"] } }),
        LearningSessionModel.aggregate([
          { $match: dateMatch("startedAt", start) },
          { $group: { _id: null, seconds: { $sum: { $ifNull: ["$focusedSeconds", 0] } } } },
        ]),
      ]);
      return { problemAttempts, problemCompletions, missionCompletions, learningSessions, revisionReviews, dueRevisions, focusedMinutes: Math.round(Number(focused[0]?.seconds ?? 0) / 60) };
    });

    const dailyActivity = await safe("daily-activity", [], async () => LearningSessionModel.aggregate([
      { $match: dateMatch("startedAt", start ?? subDays(startOfDay(new Date()), 29)) },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$startedAt" } }, focusedSeconds: { $sum: { $ifNull: ["$focusedSeconds", 0] } }, sessions: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]));

    const dailySignups = await safe("daily-signups", [], async () => UserModel.aggregate([
      { $match: dateMatch("createdAt", start ?? subDays(startOfDay(new Date()), 29)) },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]));

    const topTopics = await safe("top-topics", [], async () => UserStatisticsModel.aggregate([
      { $unwind: { path: "$strongTopicIds", preserveNullAndEmptyArrays: false } },
      { $group: { _id: "$strongTopicIds", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: "topics", localField: "_id", foreignField: "_id", as: "topic" } },
      { $unwind: { path: "$topic", preserveNullAndEmptyArrays: true } },
      { $project: { name: { $ifNull: ["$topic.name", "Unknown Topic"] }, count: 1 } },
    ]));

    const mostAttemptedProblems = await safe("most-attempted-problems", [], async () => ProblemAttemptModel.aggregate([
      { $match: dateMatch("createdAt", start) },
      { $group: { _id: "$problemId", attempts: { $sum: 1 }, completions: { $sum: { $cond: [{ $eq: ["$status", "solved"] }, 1, 0] } } } },
      { $sort: { attempts: -1 } },
      { $limit: 5 },
      { $lookup: { from: "problems", localField: "_id", foreignField: "_id", as: "problem" } },
      { $unwind: { path: "$problem", preserveNullAndEmptyArrays: true } },
      { $project: { title: { $ifNull: ["$problem.title", "Unknown Problem"] }, attempts: 1, completions: 1 } },
    ]));

    const eventsByType = await safe("events", [], async () => ActivityEventModel.aggregate([
      { $match: dateMatch("occurredAt", start) },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]));

    return NextResponse.json({ range: safeRange, overview, activity, dailyActivity, dailySignups, topTopics, mostAttemptedProblems, eventsByType });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[studio-analytics:get]", err);
    return NextResponse.json({ error: msg === "FORBIDDEN" ? "Forbidden" : "Unable to load analytics" }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

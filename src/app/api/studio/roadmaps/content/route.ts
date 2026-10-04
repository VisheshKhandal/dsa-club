import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/rbac";
import { MissionModel, PatternModel, ProblemModel, TopicModel } from "@/features/content/models/content.model";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type AnyDoc = Record<string, any>;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const q = req.nextUrl.searchParams.get("q") ?? "";
    const type = req.nextUrl.searchParams.get("type") ?? "all";
    const regex = q.trim() ? { $regex: q.trim(), $options: "i" } : undefined;
    const limit = 20;

    const [topics, patterns, missions, problems] = await Promise.all([
      type === "all" || type === "topic" ? TopicModel.find(regex ? { $or: [{ name: regex }, { slug: regex }] } : {}).sort({ order: 1 }).limit(limit).lean() : [],
      type === "all" || type === "pattern" ? PatternModel.find(regex ? { $or: [{ name: regex }, { slug: regex }] } : {}).populate("topicId", "name").limit(limit).lean() : [],
      type === "all" || type === "mission" ? MissionModel.find(regex ? { $or: [{ title: regex }, { slug: regex }] } : {}).populate("topicId", "name").limit(limit).lean() : [],
      type === "all" || type === "problem" ? ProblemModel.find(regex ? { $or: [{ title: regex }, { slug: regex }] } : {}).populate("topicIds", "name").limit(limit).lean() : [],
    ]);

    const results = [
      ...(topics as AnyDoc[]).map((item) => ({ id: String(item._id), type: "topic", title: item.name, difficulty: item.difficulty, metadata: `${item.estimatedMinutes ?? 0} min` })),
      ...(patterns as AnyDoc[]).map((item) => ({ id: String(item._id), type: "pattern", title: item.name, difficulty: item.difficulty, metadata: item.topicId?.name ?? "Pattern" })),
      ...(missions as AnyDoc[]).map((item) => ({ id: String(item._id), type: "mission", title: item.title, difficulty: item.difficulty, metadata: item.topicId?.name ?? "Mission" })),
      ...(problems as AnyDoc[]).map((item) => ({ id: String(item._id), type: "problem", title: item.title, difficulty: item.difficulty, metadata: item.topicIds?.[0]?.name ?? item.source })),
    ];

    return NextResponse.json({ results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

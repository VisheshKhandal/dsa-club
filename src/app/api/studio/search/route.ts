import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/rbac";
import { TopicModel, PatternModel, ProblemModel, MissionModel } from "@/features/content/models/content.model";
import { UserModel } from "@/features/identity/models/user.model";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q") ?? "";
    const limit = 5;

    if (!q.trim()) return NextResponse.json({ results: {} });

    const regex = { $regex: q, $options: "i" };

    const [topics, patterns, problems, missions, users] = await Promise.all([
      TopicModel.find({ $or: [{ name: regex }, { slug: regex }] }).limit(limit).lean(),
      PatternModel.find({ $or: [{ name: regex }, { slug: regex }] }).limit(limit).lean(),
      ProblemModel.find({ $or: [{ title: regex }, { slug: regex }] }).limit(limit).lean(),
      MissionModel.find({ $or: [{ title: regex }, { slug: regex }] }).limit(limit).lean(),
      UserModel.find({ $or: [{ name: regex }, { email: regex }] }).limit(limit).lean(),
    ]);

    return NextResponse.json({
      results: {
        topics: topics.map((t: any) => ({ id: String(t._id), name: t.name, slug: t.slug, type: "topic" })),
        patterns: patterns.map((p: any) => ({ id: String(p._id), name: p.name, slug: p.slug, type: "pattern" })),
        problems: problems.map((p: any) => ({ id: String(p._id), name: p.title, slug: p.slug, type: "problem" })),
        missions: missions.map((m: any) => ({ id: String(m._id), name: m.title, slug: m.slug, type: "mission" })),
        users: users.map((u: any) => ({ id: String(u._id), name: u.name, email: u.email, type: "user" })),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/rbac";
import { AchievementModel } from "@/features/intelligence/models/intelligence.model";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { NextRequest } from "next/server";

const bodySchema = z.object({
  key: z.string().min(1).max(80).regex(/^[a-z0-9_]+$/),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  icon: z.string().default("🏆"),
  category: z.enum(["consistency", "practice", "mastery", "revision", "milestone"]),
  xpReward: z.number().min(0).max(10000).default(100),
  criteria: z.record(z.unknown()).default({}),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { searchParams } = req.nextUrl;
    const search = searchParams.get("q") ?? "";
    const category = searchParams.get("category") ?? "all";
    const status = searchParams.get("status") ?? "all";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "30"));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (search) filter.$or = [{ title: { $regex: search, $options: "i" } }, { key: { $regex: search, $options: "i" } }];
    if (category !== "all") filter.category = category;
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;

    const [rawAchievements, total] = await Promise.all([
      AchievementModel.find(filter).sort({ category: 1, key: 1 }).skip(skip).limit(limit).lean(),
      AchievementModel.countDocuments(filter),
    ]);

    const achievements = rawAchievements.map((a: any) => ({ ...a, id: String(a._id) }));
    return NextResponse.json({ achievements, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    const achievement = await AchievementModel.create(parsed.data);
    return NextResponse.json({ achievement: { ...achievement.toObject(), id: String(achievement._id) } }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    if (msg.includes("E11000")) return NextResponse.json({ error: "An achievement with this key already exists." }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

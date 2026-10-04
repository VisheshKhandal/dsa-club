import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/rbac";
import { LearningPathModel } from "@/features/content/models/content.model";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { NextRequest } from "next/server";

const stageSchema = z.object({
  order: z.number().min(0),
  title: z.string().min(1).max(120),
  description: z.string().max(500).default(""),
  topicIds: z.array(z.string()).default([]),
  patternIds: z.array(z.string()).default([]),
  problemIds: z.array(z.string()).default([]),
  missionIds: z.array(z.string()).default([]),
  estimatedMinutes: z.number().min(5).default(60),
});

const bodySchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(160),
  description: z.string().max(2000).default(""),
  coverImage: z.string().max(2048).default(""),
  estimatedMinutes: z.number().min(30).max(50000),
  difficulty: z.enum(["beginner", "easy", "medium", "hard", "advanced"]),
  audience: z.string().max(500).default(""),
  stages: z.array(stageSchema).default([]),
  tags: z.array(z.string().max(40)).default([]),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { searchParams } = req.nextUrl;
    const search = searchParams.get("q") ?? "";
    const difficulty = searchParams.get("difficulty") ?? "all";
    const status = searchParams.get("status") ?? "all";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (search) filter.$or = [{ title: { $regex: search, $options: "i" } }, { slug: { $regex: search, $options: "i" } }];
    if (difficulty !== "all") filter.difficulty = difficulty;
    if (status === "published") filter.isPublished = true;
    if (status === "draft") filter.isPublished = false;

    const [rawPaths, total] = await Promise.all([
      LearningPathModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      LearningPathModel.countDocuments(filter),
    ]);

    const paths = rawPaths.map((p: any) => ({
      ...p,
      id: String(p._id),
      stages: Array.isArray(p.stages)
        ? [...p.stages].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        : [],
    }));
    return NextResponse.json({ paths, total, page, pages: Math.ceil(total / limit) });
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
    const lp = await LearningPathModel.create(parsed.data);
    const obj = lp.toObject();
    const stages = Array.isArray(obj.stages)
      ? [...obj.stages].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      : [];
    return NextResponse.json({ path: { ...obj, stages, id: String(lp._id) } }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    if (msg.includes("E11000")) return NextResponse.json({ error: "A learning path with this slug already exists." }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

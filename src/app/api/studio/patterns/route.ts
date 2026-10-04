import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { PatternModel } from "@/features/content/models/content.model";
import { requireAdmin } from "@/lib/rbac";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const patternBodySchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(120),
  topicId: z.string().min(1),
  description: z.string().min(1).max(2000),
  whenToUse: z.string().max(2000).default(""),
  mentalModel: z.string().max(2000).default(""),
  variations: z.array(z.string().max(300)).default([]),
  signalKeywords: z.array(z.string().max(80)).default([]),
  prerequisitePatternIds: z.array(z.string()).default([]),
  difficulty: z.enum(["beginner", "easy", "medium", "hard", "advanced"]),
  isPublished: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const { searchParams } = req.nextUrl;
    const search = searchParams.get("q") ?? "";
    const topicId = searchParams.get("topicId") ?? "all";
    const status = searchParams.get("status") ?? "all";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (search) filter.$or = [{ name: { $regex: search, $options: "i" } }, { slug: { $regex: search, $options: "i" } }];
    if (topicId !== "all") filter.topicId = topicId;
    if (status === "published") filter.isPublished = true;
    if (status === "draft") filter.isPublished = false;

    const [rawPatterns, total] = await Promise.all([
      PatternModel.find(filter).populate("topicId", "name slug").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      PatternModel.countDocuments(filter),
    ]);
    
    const patterns = rawPatterns.map((p: any) => ({
      ...p,
      id: String(p._id),
      // Normalize topicId so the client always gets a plain string for filtering
      topicId: p.topicId ? String((p.topicId as any)._id || p.topicId) : "",
    }));

    return NextResponse.json({ patterns, total, page, pages: Math.ceil(total / limit) });

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
    const parsed = patternBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }

    const pattern = await PatternModel.create(parsed.data);
    return NextResponse.json({ pattern }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    if (msg.includes("E11000")) return NextResponse.json({ error: "A pattern with this slug already exists." }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

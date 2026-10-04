import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { TopicModel } from "@/features/content/models/content.model";
import { requireAdmin } from "@/lib/rbac";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const topicBodySchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  order: z.number().int().min(0),
  difficulty: z.enum(["beginner", "easy", "medium", "hard", "advanced"]),
  estimatedMinutes: z.number().int().min(5).max(10000),
  isPublished: z.boolean().default(false),
  prerequisiteTopicIds: z.array(z.string()).default([]),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const { searchParams } = req.nextUrl;
    const search = searchParams.get("q") ?? "";
    const status = searchParams.get("status") ?? "all";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (search) filter.$or = [{ name: { $regex: search, $options: "i" } }, { slug: { $regex: search, $options: "i" } }];
    if (status === "published") filter.isPublished = true;
    if (status === "draft") filter.isPublished = false;

    const [rawTopics, total] = await Promise.all([
      TopicModel.find(filter).sort({ order: 1 }).skip(skip).limit(limit).lean(),
      TopicModel.countDocuments(filter),
    ]);
    
    const topics = rawTopics.map((t: any) => ({ ...t, id: String(t._id) }));

    return NextResponse.json({ topics, total, page, pages: Math.ceil(total / limit) });
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
    const parsed = topicBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }

    const topic = await TopicModel.create(parsed.data);
    return NextResponse.json({ topic }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    if (msg.includes("E11000")) return NextResponse.json({ error: "A topic with this slug already exists." }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

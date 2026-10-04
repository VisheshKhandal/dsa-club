import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ProblemModel } from "@/features/content/models/content.model";
import { requireAdmin } from "@/lib/rbac";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const problemBodySchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(220),
  summary: z.string().min(1).max(3000),
  thinkingDirection: z.string().max(3000).default(""),
  dryRunPrompt: z.string().max(3000).default(""),
  hints: z.array(z.object({
    level: z.number().int().min(1).max(5),
    title: z.string().max(120).default(""),
    content: z.string().min(1).max(1000),
  })).default([]),
  commonMistakes: z.array(z.string().max(300)).default([]),
  source: z.enum(["internal", "leetcode", "geeksforgeeks", "codeforces", "other"]),
  sourceUrl: z.string().url().max(2048),
  externalId: z.string().max(120).nullable().default(null),
  topicIds: z.array(z.string()).min(1),
  patternIds: z.array(z.string()).default([]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  estimatedMinutes: z.number().int().min(5).max(300),
  qualityScore: z.number().min(0).max(1).default(0.5),
  companyIds: z.array(z.string()).default([]),
  tags: z.array(z.string().max(40)).default([]),
  isPublished: z.boolean().default(false),
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

    const [rawProblems, total] = await Promise.all([
      ProblemModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ProblemModel.countDocuments(filter),
    ]);
    
    const problems = rawProblems.map((p: any) => ({ ...p, id: String(p._id) }));

    return NextResponse.json({ problems, total, page, pages: Math.ceil(total / limit) });
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
    const parsed = problemBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }

    const problem = await ProblemModel.create(parsed.data);
    return NextResponse.json({ problem }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    if (msg.includes("E11000")) return NextResponse.json({ error: "A problem with this slug already exists." }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

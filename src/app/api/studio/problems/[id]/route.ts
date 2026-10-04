import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ProblemModel } from "@/features/content/models/content.model";
import { requireAdmin } from "@/lib/rbac";
import { NextResponse } from "next/server";

const updateSchema = z.object({
  title: z.string().min(1).max(220).optional(),
  summary: z.string().min(1).max(3000).optional(),
  thinkingDirection: z.string().max(3000).optional(),
  dryRunPrompt: z.string().max(3000).optional(),
  hints: z.array(z.object({
    level: z.number().int().min(1).max(5),
    title: z.string().max(120).default(""),
    content: z.string().min(1).max(1000),
  })).optional(),
  commonMistakes: z.array(z.string().max(300)).optional(),
  source: z.enum(["internal", "leetcode", "geeksforgeeks", "codeforces", "other"]).optional(),
  sourceUrl: z.string().url().max(2048).optional(),
  externalId: z.string().max(120).nullable().optional(),
  topicIds: z.array(z.string()).optional(),
  patternIds: z.array(z.string()).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  estimatedMinutes: z.number().int().min(5).max(300).optional(),
  qualityScore: z.number().min(0).max(1).optional(),
  companyIds: z.array(z.string()).optional(),
  tags: z.array(z.string().max(40)).optional(),
  isPublished: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { id } = await params;
    const problem = await ProblemModel.findById(id).lean();
    if (!problem) return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    return NextResponse.json({ problem: { ...problem, id: String(problem._id) } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    const problem = await ProblemModel.findByIdAndUpdate(id, { $set: parsed.data }, { new: true, runValidators: true }).lean();
    if (!problem) return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    return NextResponse.json({ problem: { ...problem, id: String(problem._id) } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { id } = await params;
    const problem = await ProblemModel.findByIdAndDelete(id).lean();
    if (!problem) return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

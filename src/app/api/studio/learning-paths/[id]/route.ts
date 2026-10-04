import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/rbac";
import { LearningPathModel } from "@/features/content/models/content.model";
import { NextResponse } from "next/server";
import { z } from "zod";

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

const updateSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(2000).optional(),
  coverImage: z.string().max(2048).optional(),
  estimatedMinutes: z.number().min(30).max(50000).optional(),
  difficulty: z.enum(["beginner", "easy", "medium", "hard", "advanced"]).optional(),
  audience: z.string().max(500).optional(),
  stages: z.array(stageSchema).optional(),
  tags: z.array(z.string().max(40)).optional(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { id } = await params;
    const lp = await LearningPathModel.findById(id).lean();
    if (!lp) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const stages = Array.isArray((lp as any).stages)
      ? [...(lp as any).stages].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      : [];
    return NextResponse.json({ path: { ...(lp as any), stages, id: String((lp as any)._id) } });
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
    const lp = await LearningPathModel.findByIdAndUpdate(id, { $set: parsed.data }, { new: true, runValidators: true }).lean();
    if (!lp) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const stages = Array.isArray((lp as any).stages)
      ? [...(lp as any).stages].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      : [];
    return NextResponse.json({ path: { ...(lp as any), stages, id: String((lp as any)._id) } });
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
    const lp = await LearningPathModel.findByIdAndDelete(id).lean();
    if (!lp) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

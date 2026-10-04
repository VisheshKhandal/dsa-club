import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { PatternModel } from "@/features/content/models/content.model";
import { requireAdmin } from "@/lib/rbac";
import { NextResponse } from "next/server";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  topicId: z.string().min(1).optional(),
  description: z.string().min(1).max(2000).optional(),
  whenToUse: z.string().max(2000).optional(),
  mentalModel: z.string().max(2000).optional(),
  variations: z.array(z.string().max(300)).optional(),
  signalKeywords: z.array(z.string().max(80)).optional(),
  prerequisitePatternIds: z.array(z.string()).optional(),
  difficulty: z.enum(["beginner", "easy", "medium", "hard", "advanced"]).optional(),
  isPublished: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { id } = await params;
    const pattern = await PatternModel.findById(id).lean();
    if (!pattern) return NextResponse.json({ error: "Pattern not found" }, { status: 404 });
    return NextResponse.json({ pattern: { ...pattern, id: String(pattern._id) } });
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
    
    const pattern = await PatternModel.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true, runValidators: true }
    ).lean();
    
    if (!pattern) return NextResponse.json({ error: "Pattern not found" }, { status: 404 });
    return NextResponse.json({ pattern: { ...pattern, id: String(pattern._id) } });
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
    const pattern = await PatternModel.findByIdAndDelete(id).lean();
    if (!pattern) return NextResponse.json({ error: "Pattern not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

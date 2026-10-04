import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { TopicModel } from "@/features/content/models/content.model";
import { requireAdmin } from "@/lib/rbac";
import { NextResponse } from "next/server";

const topicUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().min(1).max(1000).optional(),
  order: z.number().int().min(0).optional(),
  difficulty: z.enum(["beginner", "easy", "medium", "hard", "advanced"]).optional(),
  estimatedMinutes: z.number().int().min(5).max(10000).optional(),
  isPublished: z.boolean().optional(),
  prerequisiteTopicIds: z.array(z.string()).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { id } = await params;
    const topic = await TopicModel.findById(id).lean();
    if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    return NextResponse.json({ topic: { ...topic, id: String(topic._id) } });
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
    const parsed = topicUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }

    const topic = await TopicModel.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true, runValidators: true }
    ).lean();
    if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    return NextResponse.json({ topic: { ...topic, id: String(topic._id) } });
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
    const topic = await TopicModel.findByIdAndDelete(id).lean();
    if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

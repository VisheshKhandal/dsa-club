import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/rbac";
import { AchievementModel } from "@/features/intelligence/models/intelligence.model";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).optional(),
  icon: z.string().optional(),
  category: z.enum(["consistency", "practice", "mastery", "revision", "milestone"]).optional(),
  xpReward: z.number().min(0).max(10000).optional(),
  criteria: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { id } = await params;
    const a = await AchievementModel.findById(id).lean();
    if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ achievement: { ...(a as any), id: String((a as any)._id) } });
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
    if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    const a = await AchievementModel.findByIdAndUpdate(id, { $set: parsed.data }, { new: true, runValidators: true }).lean();
    if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ achievement: { ...(a as any), id: String((a as any)._id) } });
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
    const a = await AchievementModel.findByIdAndDelete(id).lean();
    if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

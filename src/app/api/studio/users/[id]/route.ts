import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/rbac";
import { UserModel } from "@/features/identity/models/user.model";
import { UserStatisticsModel } from "@/features/intelligence/models/intelligence.model";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  role: z.enum(["student", "mentor", "author", "admin"]).optional(),
  status: z.enum(["active", "suspended", "deleted"]).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { id } = await params;
    const [user, stats] = await Promise.all([
      UserModel.findById(id).lean(),
      UserStatisticsModel.findOne({ userId: id }).lean(),
    ]);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({
      user: { ...(user as any), id: String((user as any)._id) },
      stats: stats ? { ...(stats as any), id: String((stats as any)._id) } : null,
    });
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
    const user = await UserModel.findByIdAndUpdate(id, { $set: parsed.data }, { new: true }).lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ user: { ...(user as any), id: String((user as any)._id) } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

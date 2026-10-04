import { v2 as cloudinary } from "cloudinary";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/rbac";
import { MediaAssetModel } from "@/features/content/models/content.model";
import { NextResponse } from "next/server";
import { z } from "zod";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const updateSchema = z.object({
  fileName: z.string().min(1).max(255).optional(),
  altText: z.string().max(255).optional(),
  folder: z.string().max(120).optional(),
  tags: z.array(z.string().max(40)).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { id } = await params;
    const asset = await MediaAssetModel.findById(id).lean();
    if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ asset: { ...(asset as any), id: String((asset as any)._id) } });
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
    const asset = await MediaAssetModel.findByIdAndUpdate(id, { $set: parsed.data }, { new: true }).lean();
    if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ asset: { ...(asset as any), id: String((asset as any)._id) } });
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
    const asset = await MediaAssetModel.findById(id).lean();
    if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy((asset as any).publicId, { resource_type: "auto" });
    } catch {
      // Continue even if Cloudinary deletion fails (may already be deleted)
    }

    await MediaAssetModel.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

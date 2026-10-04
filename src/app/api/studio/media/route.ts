import { v2 as cloudinary } from "cloudinary";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/rbac";
import { MediaAssetModel } from "@/features/content/models/content.model";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function getAssetType(mimeType: string): "image" | "video" | "pdf" | "svg" | "gif" | "other" {
  if (mimeType === "image/svg+xml") return "svg";
  if (mimeType === "image/gif") return "gif";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "pdf";
  return "other";
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { searchParams } = req.nextUrl;
    const search = searchParams.get("q") ?? "";
    const folder = searchParams.get("folder") ?? "all";
    const assetType = searchParams.get("type") ?? "all";
    const tag = searchParams.get("tag") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "30"));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (search) filter.$or = [{ fileName: { $regex: search, $options: "i" } }, { altText: { $regex: search, $options: "i" } }];
    if (folder !== "all") filter.folder = folder;
    if (assetType !== "all") filter.assetType = assetType;
    if (tag) filter.tags = tag;

    const [rawAssets, total] = await Promise.all([
      MediaAssetModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      MediaAssetModel.countDocuments(filter),
    ]);

    // Get unique folders for sidebar
    const folders = await MediaAssetModel.distinct("folder");

    const assets = rawAssets.map((a: any) => ({ ...a, id: String(a._id) }));
    return NextResponse.json({ assets, total, page, pages: Math.ceil(total / limit), folders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "general";
    const tags = ((formData.get("tags") as string) || "").split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
    const altText = (formData.get("altText") as string) || "";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });

    // Convert file to buffer for Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `dsa-club/${folder}`,
          public_id: `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`,
          resource_type: "auto",
          tags: tags,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    const assetType = getAssetType(file.type);
    const thumbnailUrl = result.resource_type === "image"
      ? cloudinary.url(result.public_id, { width: 300, height: 200, crop: "fill", quality: "auto", format: "webp" })
      : result.secure_url;

    const asset = await MediaAssetModel.create({
      publicId: result.public_id,
      url: result.secure_url,
      thumbnailUrl,
      fileName: file.name,
      originalName: file.name,
      mimeType: file.type,
      assetType,
      folder,
      sizeBytes: file.size,
      width: result.width || null,
      height: result.height || null,
      tags,
      altText,
    });

    return NextResponse.json({ asset: { ...asset.toObject(), id: String(asset._id) } }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

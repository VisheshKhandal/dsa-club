import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/rbac";
import { defaultStudioSettings, getStudioSettings, updateStudioSettings } from "@/lib/studio-settings";

function envStatus() {
  return [
    { key: "mongodb", label: "MongoDB", configured: Boolean(process.env.MONGODB_URI) },
    { key: "auth", label: "Authentication", configured: Boolean(process.env.AUTH_SECRET && process.env.AUTH_URL) },
    { key: "admin", label: "Admin Access", configured: Boolean(process.env.ADMIN_EMAILS) },
    { key: "cloudinary", label: "Cloudinary", configured: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) },
    { key: "email", label: "Email Delivery", configured: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM) },
  ];
}

export async function GET() {
  try {
    await requireAdmin();
    await connectToDatabase();
    return NextResponse.json({ settings: await getStudioSettings(), defaults: defaultStudioSettings, system: envStatus() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[studio-settings:get]", err);
    return NextResponse.json({ error: msg === "FORBIDDEN" ? "Forbidden" : "Unable to load settings" }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    await connectToDatabase();
    return NextResponse.json({ settings: await updateStudioSettings(await req.json()), defaults: defaultStudioSettings, system: envStatus() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[studio-settings:put]", err);
    return NextResponse.json({ error: msg === "FORBIDDEN" ? "Forbidden" : "Invalid or unsupported settings value" }, { status: msg === "FORBIDDEN" ? 403 : 400 });
  }
}

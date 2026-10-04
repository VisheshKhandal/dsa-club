import { requireAdmin } from "@/lib/rbac";
import { exportContentCatalog } from "@/features/content/services/learning-path-resolver.service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await requireAdmin();
    const { catalog, promptCatalog, counts } = await exportContentCatalog();
    return NextResponse.json({ catalog, promptCatalog, counts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "FORBIDDEN" ? 403 : 500 }
    );
  }
}

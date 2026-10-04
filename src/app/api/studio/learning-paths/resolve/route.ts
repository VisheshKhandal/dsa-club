import { requireAdmin } from "@/lib/rbac";
import { resolveLearningPathReferences } from "@/features/content/services/learning-path-resolver.service";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.stages) || body.stages.length === 0) {
      return NextResponse.json(
        { error: "JSON must include a non-empty 'stages' array" },
        { status: 400 }
      );
    }

    const report = await resolveLearningPathReferences(body);
    return NextResponse.json({ success: true, report });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "FORBIDDEN" ? 403 : 500 }
    );
  }
}

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/rbac";
import { validateTopicImport } from "@/features/content/services/topic-import-validator.service";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const body = await req.json().catch(() => ({}));
    const input = body.json ?? body.input ?? body;
    const currentTopicId = typeof body.currentTopicId === "string" ? body.currentTopicId : null;

    const result = await validateTopicImport({
      input,
      currentTopicId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      {
        valid: false,
        status: "error",
        errors: [msg],
        warnings: [],
        info: [],
      },
      { status: msg === "FORBIDDEN" ? 403 : 500 }
    );
  }
}

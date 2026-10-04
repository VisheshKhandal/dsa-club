import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/rbac";
import { validatePatternImport } from "@/features/content/services/pattern-import-validator.service";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const body = await req.json().catch(() => ({}));
    const input = body.json ?? body.input ?? body;
    const currentPatternId = typeof body.currentPatternId === "string" ? body.currentPatternId : null;

    const result = await validatePatternImport({
      input,
      currentPatternId,
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

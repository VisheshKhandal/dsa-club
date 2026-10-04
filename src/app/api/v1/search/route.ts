import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchMongoProvider } from "@/features/platform/services/search.service";
import { searchQuerySchema } from "@/features/platform/validators/platform.validators";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const input = searchQuerySchema.parse({ q: url.searchParams.get("q") ?? "", limit: url.searchParams.get("limit") ?? 10 });
  return NextResponse.json(await searchMongoProvider(input.q, input.limit, session.user.id));
}

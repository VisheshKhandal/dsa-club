import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/lib/auth";
import { generateNextAction } from "@/features/recommendations/services/recommendation.service";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const availableMinutes = Math.max(5, Math.min(720, Number(request.nextUrl.searchParams.get("minutes") ?? 45)));
  const recommendation = await generateNextAction(new Types.ObjectId(session.user.id), availableMinutes);
  return NextResponse.json(recommendation);
}

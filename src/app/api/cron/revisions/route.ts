import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { RevisionQueueModel } from "@/features/intelligence/models/intelligence.model";

import { verifyCronAuthorization } from "@/features/intelligence/services/learning-delivery.service";

export async function GET(request: NextRequest) {
  if (!verifyCronAuthorization(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectToDatabase();
  const result = await RevisionQueueModel.updateMany({ state: { $in: ["scheduled", "snoozed"] }, dueAt: { $lte: new Date() }, $or: [{ snoozedUntil: null }, { snoozedUntil: { $lte: new Date() } }] }, { $set: { state: "due" } });
  return NextResponse.json({ matched: result.matchedCount, modified: result.modifiedCount });
}

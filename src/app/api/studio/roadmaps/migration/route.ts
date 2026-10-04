import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/rbac";
import { RoadmapTemplateModel } from "@/features/learning/models/learning.model";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await requireAdmin();
    await connectToDatabase();
    const roadmaps = await RoadmapTemplateModel.find({}).lean();
    const malformed = roadmaps.flatMap((roadmap: any) =>
      (roadmap.stages ?? []).flatMap((stage: any) => [
        ...(stage.topicIds ?? []).filter((value: unknown) => !Types.ObjectId.isValid(String(value))).map((value: unknown) => ({ roadmapId: String(roadmap._id), roadmap: roadmap.name, stage: stage.title, field: "topicIds", value: String(value) })),
        ...(stage.missionIds ?? []).filter((value: unknown) => !Types.ObjectId.isValid(String(value))).map((value: unknown) => ({ roadmapId: String(roadmap._id), roadmap: roadmap.name, stage: stage.title, field: "missionIds", value: String(value) })),
      ])
    );
    return NextResponse.json({ malformed, count: malformed.length, message: malformed.length ? "Review these records before cleanup; no data was deleted." : "No malformed roadmap references found." });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

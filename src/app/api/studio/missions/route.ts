import { z } from "zod";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { MissionModel } from "@/features/content/models/content.model";
import { MissionPublishValidationError, validateMissionForPublish } from "@/features/content/services/mission-publish-validation.service";
import { requireAdmin } from "@/lib/rbac";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const stepSchema = z.object({
  key: z.string().default("Step").transform((v) => (v && v.trim() ? v.trim() : "Step")),
  kind: z.enum(["introduction", "intuition", "concept", "mental_model", "visualization", "pattern", "example", "practice", "reflection", "mastery"]).default("concept"),
  content: z.string().default(""),
  targetId: z.any().nullable().optional().transform((v) => {
    if (!v) return null;
    const str = typeof v === "object" ? String(v._id || v.id || "") : String(v);
    return str && Types.ObjectId.isValid(str) ? str : null;
  }),
  required: z.boolean().default(true),
  weight: z.coerce.number().min(0).max(1).default(0.1),
}).passthrough();

const missionBodySchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(160),
  description: z.string().max(2000).default("").transform((v) => (v && v.trim() ? v.trim() : "Draft mission description")),
  topicId: z.any().transform((v) => {
    const str = typeof v === "object" ? String(v._id || v.id || "") : String(v || "");
    return str;
  }).refine((v) => Types.ObjectId.isValid(v), { message: "Invalid topic ID" }),
  patternId: z.any().nullable().default(null).transform((v) => {
    if (!v) return null;
    const str = typeof v === "object" ? String(v._id || v.id || "") : String(v);
    return str && Types.ObjectId.isValid(str) ? str : null;
  }),
  estimatedMinutes: z.coerce.number().int().min(5).max(480).default(60),
  difficulty: z.enum(["beginner", "easy", "medium", "hard"]).default("medium"),
  order: z.coerce.number().int().min(0).default(0),
  steps: z.array(stepSchema).default([]),
  isPublished: z.boolean().default(false),
}).passthrough();

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const { searchParams } = req.nextUrl;
    const search = searchParams.get("q") ?? "";
    const topicId = searchParams.get("topicId") ?? "all";
    const status = searchParams.get("status") ?? "all";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (search) filter.$or = [{ title: { $regex: search, $options: "i" } }, { slug: { $regex: search, $options: "i" } }];
    if (topicId !== "all") filter.topicId = topicId;
    if (status === "published") filter.isPublished = true;
    if (status === "draft") filter.isPublished = false;

    const [rawMissions, total] = await Promise.all([
      MissionModel.find(filter).populate("topicId", "name slug").populate("patternId", "name slug").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      MissionModel.countDocuments(filter),
    ]);
    
    const missions = rawMissions.map((m: any) => ({ ...m, id: String(m._id) }));

    return NextResponse.json({ missions, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const body = await req.json();
    const parsed = missionBodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    if (parsed.data.isPublished) {
      await validateMissionForPublish(parsed.data);
    }

    const mission = await MissionModel.create({
      slug: parsed.data.slug,
      title: parsed.data.title,
      description: parsed.data.description,
      topicId: new Types.ObjectId(parsed.data.topicId),
      patternId: parsed.data.patternId ? new Types.ObjectId(parsed.data.patternId) : null,
      estimatedMinutes: parsed.data.estimatedMinutes,
      difficulty: parsed.data.difficulty,
      isPublished: parsed.data.isPublished,
      steps: parsed.data.steps.map((s) => ({
        key: s.key,
        kind: s.kind,
        content: s.content,
        targetId: s.targetId ? new Types.ObjectId(s.targetId) : null,
        required: s.required,
        weight: s.weight,
      })),
    });
    const obj = mission.toObject();
    return NextResponse.json({
      mission: {
        ...obj,
        id: String(mission._id),
        topicId: String(mission.topicId),
        patternId: mission.patternId ? String(mission.patternId) : null,
        steps: (obj.steps || []).map((s: any) => ({
          ...s,
          id: String(s._id || s.id || ""),
          targetId: s.targetId ? String(s.targetId) : null,
        })),
      }
    }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    if (err instanceof MissionPublishValidationError) return NextResponse.json({ error: err.message, issues: err.issues.map((message) => ({ path: ["isPublished"], message })) }, { status: 400 });
    if (msg.includes("E11000")) return NextResponse.json({ error: "A mission with this slug already exists." }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

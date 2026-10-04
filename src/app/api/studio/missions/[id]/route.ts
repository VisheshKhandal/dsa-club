import { z } from "zod";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { MissionModel } from "@/features/content/models/content.model";
import { mergeMissionForPublishValidation, MissionPublishValidationError, validateMissionForPublish } from "@/features/content/services/mission-publish-validation.service";
import { requireAdmin } from "@/lib/rbac";
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

const updateSchema = z.object({
  slug: z.string().optional(),
  title: z.string().max(160).optional().transform((v) => (v && v.trim() ? v.trim() : undefined)),
  description: z.string().max(2000).optional().transform((v) => (v && v.trim() ? v.trim() : undefined)),
  topicId: z.any().optional().transform((v) => {
    if (!v) return undefined;
    const str = typeof v === "object" ? String(v._id || v.id || "") : String(v);
    return str && Types.ObjectId.isValid(str) ? str : undefined;
  }),
  patternId: z.any().nullable().optional().transform((v) => {
    if (!v) return null;
    const str = typeof v === "object" ? String(v._id || v.id || "") : String(v);
    return str && Types.ObjectId.isValid(str) ? str : null;
  }),
  estimatedMinutes: z.coerce.number().int().min(5).max(480).optional(),
  difficulty: z.enum(["beginner", "easy", "medium", "hard"]).optional(),
  order: z.coerce.number().int().min(0).optional(),
  steps: z.array(stepSchema).optional(),
  isPublished: z.boolean().optional(),
}).passthrough();

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { id } = await params;
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid mission ID" }, { status: 400 });
    }
    const mission = await MissionModel.findById(id).lean();
    if (!mission) return NextResponse.json({ error: "Mission not found" }, { status: 404 });

    return NextResponse.json({
      mission: {
        ...mission,
        id: String(mission._id),
        topicId: mission.topicId ? String((mission.topicId as any)._id || mission.topicId) : "",
        patternId: mission.patternId ? String((mission.patternId as any)._id || mission.patternId) : null,
        steps: (mission.steps || []).map((s: any) => ({
          ...s,
          id: String(s._id || s.id || ""),
          targetId: s.targetId ? String((s.targetId as any)._id || s.targetId) : null,
        })),
      },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { id } = await params;
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid mission ID" }, { status: 400 });
    }
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }

    if (parsed.data.isPublished) {
      await validateMissionForPublish(await mergeMissionForPublishValidation(id, parsed.data));
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.topicId !== undefined) updateData.topicId = new Types.ObjectId(parsed.data.topicId);
    if (parsed.data.patternId !== undefined) {
      updateData.patternId = parsed.data.patternId ? new Types.ObjectId(parsed.data.patternId) : null;
    }
    if (parsed.data.estimatedMinutes !== undefined) updateData.estimatedMinutes = parsed.data.estimatedMinutes;
    if (parsed.data.difficulty !== undefined) updateData.difficulty = parsed.data.difficulty;
    if (parsed.data.isPublished !== undefined) updateData.isPublished = parsed.data.isPublished;
    if (parsed.data.steps !== undefined) {
      updateData.steps = parsed.data.steps.map((s) => ({
        key: s.key,
        kind: s.kind,
        content: s.content,
        targetId: s.targetId ? new Types.ObjectId(s.targetId) : null,
        required: s.required,
        weight: s.weight,
      }));
    }

    const mission = await MissionModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!mission) return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    return NextResponse.json({
      mission: {
        ...mission,
        id: String(mission._id),
        topicId: mission.topicId ? String((mission.topicId as any)._id || mission.topicId) : "",
        patternId: mission.patternId ? String((mission.patternId as any)._id || mission.patternId) : null,
        steps: (mission.steps || []).map((s: any) => ({
          ...s,
          id: String(s._id || s.id || ""),
          targetId: s.targetId ? String((s.targetId as any)._id || s.targetId) : null,
        })),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    if (err instanceof MissionPublishValidationError) return NextResponse.json({ error: err.message, issues: err.issues.map((message) => ({ path: ["isPublished"], message })) }, { status: 400 });
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { id } = await params;
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid mission ID" }, { status: 400 });
    }
    const mission = await MissionModel.findByIdAndDelete(id).lean();
    if (!mission) return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}


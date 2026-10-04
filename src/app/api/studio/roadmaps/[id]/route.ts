import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/rbac";
import { RoadmapTemplateModel } from "@/features/learning/models/learning.model";
import { MissionModel, PatternModel, ProblemModel, TopicModel } from "@/features/content/models/content.model";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";

const stageSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1).max(160),
  order: z.number().min(0),
  topicIds: z.array(z.string()).default([]),
  missionIds: z.array(z.string()).default([]),
  estimatedMinutes: z.number().min(5).default(60),
});

const objectIdSchema = z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid MongoDB ObjectId");
const nodeSchema = z.object({
  key: z.string().min(1).max(120),
  type: z.enum(["topic", "pattern", "mission", "problem", "milestone"]),
  refId: objectIdSchema.nullable().default(null),
  title: z.string().min(1).max(180),
  description: z.string().max(500).default(""),
  position: z.object({ x: z.number(), y: z.number() }).default({ x: 0, y: 0 }),
  order: z.number().int().min(0),
  estimatedMinutes: z.number().min(0).default(60),
  unlockRule: z.enum(["all_prerequisites", "any_prerequisite", "manual"]).default("all_prerequisites"),
}).superRefine((node, ctx) => {
  if (node.type !== "milestone" && !node.refId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Content nodes must reference an existing record.", path: ["refId"] });
  if (node.type === "milestone" && node.refId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Milestone nodes cannot reference content.", path: ["refId"] });
});
const edgeSchema = z.object({ key: z.string().min(1).max(160), source: z.string().min(1), target: z.string().min(1), type: z.enum(["prerequisite", "progression", "dependency"]).default("progression") });

const updateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  audience: z.object({
    levels: z.array(z.string()).default([]),
    goals: z.array(z.string()).default([]),
    dailyMinutes: z.object({ min: z.number().default(30), max: z.number().default(180) }).default({}),
  }).optional(),
  version: z.number().min(1).optional(),
  isPublished: z.boolean().optional(),
  stages: z.array(stageSchema).optional(),
  nodes: z.array(nodeSchema).optional(),
  edges: z.array(edgeSchema).optional(),
});

async function validateReferences(nodes?: z.infer<typeof nodeSchema>[]) {
  if (!nodes) return;
  const ids = {
    topic: nodes.filter((node) => node.type === "topic" && node.refId).map((node) => node.refId!),
    pattern: nodes.filter((node) => node.type === "pattern" && node.refId).map((node) => node.refId!),
    mission: nodes.filter((node) => node.type === "mission" && node.refId).map((node) => node.refId!),
    problem: nodes.filter((node) => node.type === "problem" && node.refId).map((node) => node.refId!),
  };
  const [topics, patterns, missions, problems] = await Promise.all([
    TopicModel.countDocuments({ _id: { $in: ids.topic } }),
    PatternModel.countDocuments({ _id: { $in: ids.pattern } }),
    MissionModel.countDocuments({ _id: { $in: ids.mission } }),
    ProblemModel.countDocuments({ _id: { $in: ids.problem } }),
  ]);
  if (topics !== new Set(ids.topic).size || patterns !== new Set(ids.pattern).size || missions !== new Set(ids.mission).size || problems !== new Set(ids.problem).size) throw new Error("One or more roadmap nodes reference content that does not exist.");
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { id } = await params;
    const roadmap = await RoadmapTemplateModel.findById(id).lean();
    if (!roadmap) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ roadmap: { ...(roadmap as any), id: String((roadmap as any)._id) } });
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
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    await validateReferences(parsed.data.nodes);
    const roadmap = await RoadmapTemplateModel.findByIdAndUpdate(id, { $set: parsed.data }, { new: true, runValidators: true }).lean();
    if (!roadmap) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ roadmap: { ...(roadmap as any), id: String((roadmap as any)._id) } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { id } = await params;
    const roadmap = await RoadmapTemplateModel.findByIdAndDelete(id).lean();
    if (!roadmap) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

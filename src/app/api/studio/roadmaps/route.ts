import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/rbac";
import { RoadmapTemplateModel } from "@/features/learning/models/learning.model";
import { MissionModel, PatternModel, ProblemModel, TopicModel } from "@/features/content/models/content.model";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { NextRequest } from "next/server";
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

const edgeSchema = z.object({
  key: z.string().min(1).max(160),
  source: z.string().min(1),
  target: z.string().min(1),
  type: z.enum(["prerequisite", "progression", "dependency"]).default("progression"),
});

const bodySchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(160),
  audience: z.object({
    levels: z.array(z.string()).default([]),
    goals: z.array(z.string()).default([]),
    dailyMinutes: z.object({ min: z.number().default(30), max: z.number().default(180) }).default({}),
  }).default({}),
  version: z.number().min(1).default(1),
  isPublished: z.boolean().default(false),
  stages: z.array(stageSchema).default([]),
  nodes: z.array(nodeSchema).default([]),
  edges: z.array(edgeSchema).default([]),
});

async function validateReferences(nodes: z.infer<typeof nodeSchema>[]) {
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
  if (topics !== new Set(ids.topic).size || patterns !== new Set(ids.pattern).size || missions !== new Set(ids.mission).size || problems !== new Set(ids.problem).size) {
    throw new Error("One or more roadmap nodes reference content that does not exist.");
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { searchParams } = req.nextUrl;
    const search = searchParams.get("q") ?? "";
    const status = searchParams.get("status") ?? "all";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (search) filter.name = { $regex: search, $options: "i" };
    if (status === "published") filter.isPublished = true;
    if (status === "draft") filter.isPublished = false;

    const [rawRoadmaps, total] = await Promise.all([
      RoadmapTemplateModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      RoadmapTemplateModel.countDocuments(filter),
    ]);

    const roadmaps = rawRoadmaps.map((r: any) => ({ ...r, id: String(r._id) }));
    return NextResponse.json({ roadmaps, total, page, pages: Math.ceil(total / limit) });
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
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    await validateReferences(parsed.data.nodes);

    const roadmap = await RoadmapTemplateModel.create(parsed.data);
    return NextResponse.json({ roadmap: { ...roadmap.toObject(), id: String(roadmap._id) } }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    if (msg.includes("E11000")) return NextResponse.json({ error: "A roadmap with this slug already exists." }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

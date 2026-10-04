import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/rbac";
import { MissionModel, PatternModel, ProblemModel, TopicModel } from "@/features/content/models/content.model";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  target: z.string().max(120).default("Interview Preparation"),
  difficulty: z.enum(["beginner", "easy", "medium", "hard", "advanced"]).default("beginner"),
  goal: z.string().max(200).default("DSA Foundations"),
  estimatedMinutes: z.number().min(30).max(50000).default(900),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });

    const difficultyOrder = ["beginner", "easy", "medium", "hard", "advanced"];
    const allowed = difficultyOrder.slice(0, difficultyOrder.indexOf(parsed.data.difficulty) + 1);
    const [topics, patterns, missions, problems] = await Promise.all([
      TopicModel.find({ difficulty: { $in: allowed } }).sort({ order: 1 }).limit(8).lean(),
      PatternModel.find({ difficulty: { $in: allowed } }).sort({ createdAt: 1 }).limit(8).lean(),
      MissionModel.find({ difficulty: { $in: allowed } }).sort({ estimatedMinutes: 1 }).limit(8).lean(),
      ProblemModel.find({ difficulty: { $in: allowed.filter((d) => d !== "beginner" && d !== "advanced") } }).sort({ qualityScore: -1 }).limit(8).lean(),
    ]);

    const content = [
      ...topics.map((item: any) => ({ id: String(item._id), type: "topic", title: item.name, estimatedMinutes: item.estimatedMinutes ?? 60 })),
      ...patterns.map((item: any) => ({ id: String(item._id), type: "pattern", title: item.name, estimatedMinutes: 45 })),
      ...missions.map((item: any) => ({ id: String(item._id), type: "mission", title: item.title, estimatedMinutes: item.estimatedMinutes ?? 60 })),
      ...problems.map((item: any) => ({ id: String(item._id), type: "problem", title: item.title, estimatedMinutes: item.estimatedMinutes ?? 30 })),
    ].slice(0, 14);

    const nodes = content.map((item, index) => ({
      key: `${item.type}-${item.id}`,
      type: item.type,
      refId: item.id,
      title: item.title,
      description: `${parsed.data.goal} - ${parsed.data.target}`,
      position: { x: 120 + (index % 2) * 280, y: 80 + index * 120 },
      order: index,
      estimatedMinutes: item.estimatedMinutes,
      unlockRule: "all_prerequisites",
    }));
    const edges = nodes.slice(1).map((node, index) => ({ key: `edge-${nodes[index].key}-${node.key}`, source: nodes[index].key, target: node.key, type: "progression" }));

    return NextResponse.json({ nodes, edges });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

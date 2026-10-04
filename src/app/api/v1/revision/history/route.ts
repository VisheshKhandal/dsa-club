import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { RevisionHistoryModel, RevisionQueueModel } from "@/features/intelligence/models/intelligence.model";
import { TopicModel, PatternModel, ProblemModel, MissionModel } from "@/features/content/models/content.model";
import { toDTO } from "@/features/product/services/product.service";

type AnyDoc = Record<string, any>;

function sid(v: unknown) { return String(v); }

async function resolveTitle(entityType: string, entityId: unknown): Promise<string> {
  try {
    if (entityType === "topic") {
      const doc = await TopicModel.findById(entityId).select("name").lean() as AnyDoc | null;
      return doc ? String(doc.name) : "Topic";
    } else if (entityType === "pattern") {
      const doc = await PatternModel.findById(entityId).select("name").lean() as AnyDoc | null;
      return doc ? String(doc.name) : "Pattern";
    } else if (entityType === "problem") {
      const doc = await ProblemModel.findById(entityId).select("title").lean() as AnyDoc | null;
      return doc ? String(doc.title) : "Problem";
    } else if (entityType === "mission") {
      const doc = await MissionModel.findById(entityId).select("title").lean() as AnyDoc | null;
      return doc ? String(doc.title) : "Mission";
    }
  } catch { /* ignore */ }
  return `Review ${entityType}`;
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const uid = new Types.ObjectId(session.user.id);

  // Fetch last 20 history entries
  const history = await RevisionHistoryModel.find({ userId: uid })
    .sort({ reviewedAt: -1 })
    .limit(20)
    .lean() as AnyDoc[];

  // Batch-resolve titles by gathering unique entityIds per type
  const titleCache = new Map<string, string>();
  const resolves: Promise<void>[] = [];
  for (const h of history) {
    const key = `${h.entityType}:${sid(h.entityId)}`;
    if (!titleCache.has(key)) {
      titleCache.set(key, ""); // placeholder
      resolves.push(
        resolveTitle(String(h.entityType), h.entityId).then((t) => { titleCache.set(key, t); })
      );
    }
  }
  await Promise.all(resolves);

  // Also fetch current queue states for context
  const queueIds = [...new Set(history.map((h) => sid(h.queueId)))];
  const queueDocs = queueIds.length
    ? await RevisionQueueModel.find({ _id: { $in: queueIds.map((i) => new Types.ObjectId(i)) } }).select("state intervalDays repetitions").lean() as AnyDoc[]
    : [];
  const queueMap = new Map(queueDocs.map((q) => [sid(q._id), q]));

  return NextResponse.json(toDTO(history.map((h) => {
    const key = `${h.entityType}:${sid(h.entityId)}`;
    const queue = queueMap.get(sid(h.queueId));
    return {
      id: sid(h._id),
      queueId: sid(h.queueId),
      entityType: String(h.entityType),
      entityId: sid(h.entityId),
      title: titleCache.get(key) ?? `Review ${h.entityType}`,
      reviewedAt: new Date(h.reviewedAt as Date).toISOString(),
      grade: Number(h.grade),
      confidence: Number(h.confidence),
      responseSeconds: Number(h.responseSeconds),
      previousIntervalDays: Number(h.previousIntervalDays),
      nextIntervalDays: Number(h.nextIntervalDays),
      wasOverdue: Boolean(h.wasOverdue),
      currentState: queue ? String(queue.state) : "unknown",
      currentInterval: queue ? Number(queue.intervalDays) : null,
    };
  })));
}

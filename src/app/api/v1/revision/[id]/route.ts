import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { RevisionQueueModel, RevisionHistoryModel } from "@/features/intelligence/models/intelligence.model";
import { TopicModel, PatternModel, ProblemModel, MissionModel } from "@/features/content/models/content.model";
import { toDTO } from "@/features/product/services/product.service";

type AnyDoc = Record<string, any>;

function sid(v: unknown) { return String(v); }
function difficulty(v: unknown) {
  const t = String(v ?? "easy");
  return t.charAt(0).toUpperCase() + t.slice(1).replace("_", " ");
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: queueId } = await params;
  if (!Types.ObjectId.isValid(queueId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await connectToDatabase();
  const uid = new Types.ObjectId(session.user.id);
  const item = await RevisionQueueModel.findOne({ _id: new Types.ObjectId(queueId), userId: uid }).lean() as AnyDoc | null;
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const entityType = String(item.entityType);
  const entityId = item.entityId;
  let entity: AnyDoc | null = null;

  if (entityType === "topic") {
    entity = await TopicModel.findById(entityId).lean() as AnyDoc | null;
  } else if (entityType === "pattern") {
    entity = await PatternModel.findById(entityId).populate("topicId").lean() as AnyDoc | null;
  } else if (entityType === "problem") {
    entity = await ProblemModel.findById(entityId).populate("patternIds topicIds").lean() as AnyDoc | null;
  } else if (entityType === "mission") {
    entity = await MissionModel.findById(entityId).populate("topicId patternId").lean() as AnyDoc | null;
  }

  let title = `Review ${entityType}`;
  let href = "/revision";
  let sourceHref = "";
  let detail = "Spaced repetition";
  let description = "";
  let patternName = "";
  let topicName = "";
  let keywords: string[] = [];
  let hints: { level: number; title: string; content: string }[] = [];
  let commonMistakes: string[] = [];
  let thinkingDirection = "";
  let dryRunPrompt = "";

  if (entity) {
    if (entityType === "topic") {
      title = String(entity.name);
      href = `/learn/topics/${entity.slug}`;
      detail = difficulty(entity.difficulty);
      description = String(entity.description ?? "");
    } else if (entityType === "pattern") {
      title = String(entity.name);
      href = `/patterns/${entity.slug}`;
      detail = difficulty(entity.difficulty);
      description = String(entity.description ?? "");
      topicName = String((entity.topicId as AnyDoc | null)?.name ?? "");
      keywords = ((entity.signalKeywords ?? []) as string[]).filter(Boolean);
    } else if (entityType === "problem") {
      title = String(entity.title);
      href = `/practice/problems/${entity.slug}`;
      sourceHref = String(entity.sourceUrl ?? "");
      detail = `${difficulty(entity.difficulty)} · ${String(entity.source ?? "practice")}`;
      description = String(entity.summary ?? "");
      const pat = Array.isArray(entity.patternIds) ? entity.patternIds[0] as AnyDoc | undefined : undefined;
      patternName = String(pat?.name ?? "");
      topicName = Array.isArray(entity.topicIds)
        ? (entity.topicIds as AnyDoc[]).map((t) => String(t.name ?? "")).filter(Boolean).join(", ")
        : "";
      thinkingDirection = String(entity.thinkingDirection ?? "");
      dryRunPrompt = String(entity.dryRunPrompt ?? "");
      hints = ((entity.hints ?? []) as AnyDoc[])
        .map((h: AnyDoc) => ({ level: Number(h.level ?? 1), title: String(h.title ?? ""), content: String(h.content ?? "") }))
        .filter((h) => h.content)
        .sort((a, b) => a.level - b.level);
      commonMistakes = ((entity.commonMistakes ?? []) as string[]).filter(Boolean);
    } else if (entityType === "mission") {
      title = String(entity.title);
      href = `/missions/${entity.slug}`;
      detail = `${difficulty(entity.difficulty)} · ${Number(entity.estimatedMinutes ?? 0)} min`;
      description = String(entity.description ?? "");
      topicName = String((entity.topicId as AnyDoc | null)?.name ?? "");
      patternName = String((entity.patternId as AnyDoc | null)?.name ?? "");
    }
  }

  const history = await RevisionHistoryModel.find({ queueId: item._id, userId: uid })
    .sort({ reviewedAt: -1 })
    .limit(3)
    .lean() as AnyDoc[];

  return NextResponse.json(toDTO({
    id: sid(item._id),
    entityType,
    entityId: sid(item.entityId),
    state: String(item.state),
    dueAt: new Date(item.dueAt as Date).toISOString(),
    intervalDays: Number(item.intervalDays ?? 1),
    easeFactor: Number(item.easeFactor ?? 2.3),
    repetitions: Number(item.repetitions ?? 0),
    lapses: Number(item.lapses ?? 0),
    priority: Number(item.priority ?? 50),
    lastReviewedAt: item.lastReviewedAt ? new Date(item.lastReviewedAt as Date).toISOString() : null,
    title,
    href,
    sourceHref,
    detail,
    description,
    patternName,
    topicName,
    keywords,
    hints,
    commonMistakes,
    thinkingDirection,
    dryRunPrompt,
    history: history.map((h) => ({
      id: sid(h._id),
      reviewedAt: new Date(h.reviewedAt as Date).toISOString(),
      grade: Number(h.grade),
      confidence: Number(h.confidence),
      responseSeconds: Number(h.responseSeconds),
      previousIntervalDays: Number(h.previousIntervalDays),
      nextIntervalDays: Number(h.nextIntervalDays),
    })),
  }));
}

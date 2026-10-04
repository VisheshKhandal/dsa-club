import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { notificationFilterSchema } from "@/features/platform/validators/platform.validators";
import { getNotifications } from "@/features/product/services/product.service";
import { connectToDatabase } from "@/lib/db/mongodb";
import { NotificationModel } from "@/features/intelligence/models/intelligence.model";
import { Types } from "mongoose";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const filter = notificationFilterSchema.parse({ unreadOnly: url.searchParams.get("unreadOnly") ?? false, type: url.searchParams.get("type") || undefined, limit: url.searchParams.get("limit") ?? 50 });
  const notifications = await getNotifications(session.user.id, filter.unreadOnly ? "unread" : undefined, filter.type, filter.limit);
  return NextResponse.json({ notifications, filter });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const action = body?.action;
  await connectToDatabase();
  const userId = new Types.ObjectId(session.user.id);
  if (action === "mark_all_read") {
    await NotificationModel.updateMany({ userId, status: "unread" }, { $set: { status: "read", readAt: new Date() } });
    return NextResponse.json({ ok: true });
  }
  if (!Types.ObjectId.isValid(body?.notificationId) || !["read", "unread", "archived"].includes(body?.status)) return NextResponse.json({ error: "Invalid notification update" }, { status: 400 });
  await NotificationModel.updateOne({ _id: new Types.ObjectId(body.notificationId), userId }, { $set: { status: body.status, readAt: body.status === "read" ? new Date() : null } });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  await connectToDatabase();
  const userId = new Types.ObjectId(session.user.id);
  if (body.action === "reset_seed") {
    await NotificationModel.deleteMany({ userId });
    const notifications = await getNotifications(session.user.id);
    return NextResponse.json({ ok: true, notifications });
  }
  if (body.title && body.type) {
    const created = await NotificationModel.create({
      userId,
      type: body.type,
      priority: body.priority ?? "informational",
      groupKey: body.groupKey ?? null,
      actionLabel: body.actionLabel ?? null,
      title: body.title,
      body: body.body ?? "",
      deepLink: body.deepLink ?? "/notifications",
      status: "unread",
      scheduledAt: new Date(),
    });
    return NextResponse.json({ ok: true, notification: created });
  }
  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}


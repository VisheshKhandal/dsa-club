import type { FilterQuery } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { NotificationModel } from "@/features/intelligence/models/intelligence.model";
import { SearchMetadataModel } from "@/features/platform/models/platform.model";

export async function findNotifications(userId: string, unreadOnly = false) {
  await connectToDatabase();
  const query: FilterQuery<unknown> = { userId };
  if (unreadOnly) Object.assign(query, { readAt: null });
  return NotificationModel.find(query).sort({ createdAt: -1 }).limit(50).lean();
}

export async function findSearchMetadata(query: string, limit: number) {
  await connectToDatabase();
  if (!query) return SearchMetadataModel.find({ isPublished: true }).limit(limit).lean();
  return SearchMetadataModel.find({ $text: { $search: query }, isPublished: true }).limit(limit).lean();
}

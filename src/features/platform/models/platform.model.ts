import { model, Schema } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";

const profileSchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true, unique: true, index: true },
  displayName: { type: String, maxlength: 120, default: "" },
  headline: { type: String, maxlength: 180, default: "" },
  timezone: { type: String, maxlength: 80, default: "Asia/Calcutta" },
  preferences: { theme: { type: String, enum: ["system", "dark"], default: "dark" }, dailyMinutes: { type: Number, min: 5, max: 300, default: 45 }, notifications: { type: Boolean, default: true } },
}));

const revisionSchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true, index: true },
  entityType: { type: String, enum: ["topic", "pattern", "problem", "mission"], required: true },
  entityId: { type: objectId, required: true },
  dueAt: { type: Date, required: true, index: true },
  intervalDays: { type: Number, min: 1, default: 1 },
  easeFactor: { type: Number, min: 1.3, max: 3, default: 2.5 },
  lastResult: { type: String, enum: ["again", "hard", "good", "easy", "new"], default: "new" },
}));
revisionSchema.index({ userId: 1, dueAt: 1 });

const statisticSchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true, index: true },
  period: { type: String, enum: ["day", "week", "month", "all_time"], required: true },
  key: { type: String, required: true, maxlength: 120 },
  value: { type: Number, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
}));
statisticSchema.index({ userId: 1, period: 1, key: 1 }, { unique: true });

const searchMetadataSchema = withTimestamps(new Schema({
  entityType: { type: String, enum: ["topic", "pattern", "problem", "mission", "company", "page"], required: true },
  entityId: { type: objectId, default: null },
  title: { type: String, required: true, maxlength: 220 },
  description: { type: String, maxlength: 1200, default: "" },
  href: { type: String, required: true, maxlength: 400 },
  keywords: [{ type: String, lowercase: true, trim: true, maxlength: 80 }],
  isPublished: { type: Boolean, default: true, index: true },
}));
searchMetadataSchema.index({ title: "text", description: "text", keywords: "text" });

export const ProfileModel = getModel("Profile", () => model("Profile", profileSchema));
export const RevisionItemModel = getModel("RevisionItem", () => model("RevisionItem", revisionSchema));
export const StatisticModel = getModel("Statistic", () => model("Statistic", statisticSchema));
export const SearchMetadataModel = getModel("SearchMetadata", () => model("SearchMetadata", searchMetadataSchema));

// Re-export canonical intelligence models to prevent duplicate Mongoose model registration
// and first-registration-wins schema conflicts
export {
  AchievementModel,
  NotificationModel,
  AIConversationModel,
} from "@/features/intelligence/models/intelligence.model";

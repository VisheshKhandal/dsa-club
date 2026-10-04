import { describe, expect, it } from "vitest";
import {
  AchievementModel as PlatformAchievementModel,
  NotificationModel as PlatformNotificationModel,
  AIConversationModel as PlatformAIConversationModel,
} from "@/features/platform/models/platform.model";
import {
  AchievementModel as IntelligenceAchievementModel,
  NotificationModel as IntelligenceNotificationModel,
  AIConversationModel as IntelligenceAIConversationModel,
} from "@/features/intelligence/models/intelligence.model";

describe("Model Registry Integrity & Deduplication", () => {
  it("exports identical canonical models from both platform and intelligence", () => {
    expect(PlatformAchievementModel).toBe(IntelligenceAchievementModel);
    expect(PlatformNotificationModel).toBe(IntelligenceNotificationModel);
    expect(PlatformAIConversationModel).toBe(IntelligenceAIConversationModel);
  });

  it("ensures NotificationModel uses the canonical intelligence schema", () => {
    const paths = IntelligenceNotificationModel.schema.paths;
    // Canonical intelligence notification schema fields
    expect(paths).toHaveProperty("type");
    expect(paths).toHaveProperty("status");
    expect(paths).toHaveProperty("scheduledAt");
    expect(paths).toHaveProperty("readAt");
    expect(paths).toHaveProperty("deepLink");
    // Obsolete platform schema fields should NOT exist
    expect(paths).not.toHaveProperty("kind");
    expect(paths).not.toHaveProperty("href");
  });

  it("ensures AchievementModel uses the canonical catalog schema", () => {
    const paths = IntelligenceAchievementModel.schema.paths;
    // Canonical catalog achievement fields
    expect(paths).toHaveProperty("key");
    expect(paths).toHaveProperty("title");
    expect(paths).toHaveProperty("category");
    expect(paths).toHaveProperty("criteria");
    expect(paths).toHaveProperty("isActive");
    // Obsolete user-specific achievement field should NOT exist on the catalog model
    expect(paths).not.toHaveProperty("earnedAt");
    expect(paths).not.toHaveProperty("progress");
  });

  it("ensures AIConversationModel uses the canonical intelligence schema with context", () => {
    const paths = IntelligenceAIConversationModel.schema.paths;
    // Canonical intelligence AI conversation fields
    expect(paths).toHaveProperty("context.topicId");
    expect(paths).toHaveProperty("context.problemId");
    expect(paths).toHaveProperty("context.missionId");
    expect(paths).toHaveProperty("lastMessageAt");
    expect(paths).toHaveProperty("status");
    // Obsolete platform schema fields should NOT exist (messages are in AIMessageModel)
    expect(paths).not.toHaveProperty("messages");
    expect(paths).not.toHaveProperty("provider");
  });
});

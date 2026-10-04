import { z } from "zod";
import { PlatformSettingModel } from "@/features/content/models/content.model";

export const studioSettingsSchema = z.object({
  appName: z.string().trim().min(2).max(60).default("DSA Club Studio"),
  sidebarDensity: z.enum(["comfortable", "compact"]).default("comfortable"),
  accentColor: z.enum(["blue", "emerald", "violet", "amber", "rose"]).default("blue"),
  analyticsDefaultRange: z.enum(["today", "7d", "30d", "90d", "all"]).default("30d"),
  analyticsAutoRefresh: z.boolean().default(false),
});

export type StudioSettings = z.infer<typeof studioSettingsSchema>;

export const defaultStudioSettings: StudioSettings = studioSettingsSchema.parse({});

export async function getStudioSettings(): Promise<StudioSettings> {
  const doc = await PlatformSettingModel.findOne({ key: "studio.settings" }).lean();
  return studioSettingsSchema.parse({ ...defaultStudioSettings, ...((doc?.value as Partial<StudioSettings> | undefined) ?? {}) });
}

export async function updateStudioSettings(input: unknown): Promise<StudioSettings> {
  const settings = studioSettingsSchema.parse(input);
  await PlatformSettingModel.findOneAndUpdate(
    { key: "studio.settings" },
    { $set: { key: "studio.settings", value: settings, category: "studio", updatedAt: new Date() } },
    { upsert: true, new: true, runValidators: true }
  );
  return settings;
}

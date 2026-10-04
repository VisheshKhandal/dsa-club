import { addDays } from "date-fns";
import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { RoadmapModel, RoadmapTemplateModel } from "@/features/learning/models/learning.model";
import { MissionModel } from "@/features/content/models/content.model";

export async function generateRoadmap(input: { userId: Types.ObjectId; level: string; dailyMinutes: number; language: string; goal: string; companyIds: Types.ObjectId[]; targetDate?: Date | null }) {
  await connectToDatabase();
  const template = await RoadmapTemplateModel.findOne({ isPublished: true, "audience.levels": input.level, "audience.goals": input.goal }).sort({ version: -1 });
  if (!template) throw new Error("No published roadmap template matches the onboarding profile");
  const templateStages = template.stages as Array<{ key: string; title: string; estimatedMinutes: number; topicIds: Types.ObjectId[]; missionIds: Types.ObjectId[] }>;
  const topicIds = templateStages.flatMap((stage) => stage.topicIds ?? []);
  const missionIds = templateStages.flatMap((stage) => stage.missionIds ?? []);
  const publishedMissions = await MissionModel.find({
    isPublished: true,
    $or: [{ _id: { $in: missionIds } }, { topicId: { $in: topicIds } }],
  }).sort({ order: 1, createdAt: 1 }).lean();
  const publishedMissionIds = new Set((publishedMissions as Array<{ _id: Types.ObjectId }>).map((mission) => String(mission._id)));
  const missionsByTopic = new Map<string, Types.ObjectId[]>();
  for (const mission of publishedMissions as Array<{ _id: Types.ObjectId; topicId: Types.ObjectId }>) {
    const topicId = String(mission.topicId);
    missionsByTopic.set(topicId, [...(missionsByTopic.get(topicId) ?? []), mission._id]);
  }
  const cursor = new Date();
  const stages = templateStages.map((stage, index: number) => {
    const days = Math.max(1, Math.ceil(stage.estimatedMinutes / input.dailyMinutes));
    const plannedStartAt = new Date(cursor);
    const plannedEndAt = addDays(cursor, days - 1);
    cursor.setTime(addDays(cursor, days).getTime());
    const topicSet = new Set((stage.topicIds ?? []).map(String));
    const directMissionIds = (stage.missionIds ?? []).filter((missionId) => publishedMissionIds.has(String(missionId)) && (!topicSet.size || (publishedMissions as Array<{ _id: Types.ObjectId; topicId: Types.ObjectId }>).some((mission) => String(mission._id) === String(missionId) && topicSet.has(String(mission.topicId)))));
    const topicMissionIds = (stage.topicIds ?? []).flatMap((topicId) => missionsByTopic.get(String(topicId)) ?? []);
    const resolvedMissionIds = directMissionIds.length ? directMissionIds : topicMissionIds;
    return { key: stage.key, title: stage.title, order: index, status: index === 0 ? "active" : "locked", plannedStartAt, plannedEndAt, topicIds: stage.topicIds, missionIds: [...new Set(resolvedMissionIds.map(String))], completionScore: 0 };
  });
  await RoadmapModel.updateMany({ userId: input.userId, status: "active" }, { $set: { status: "archived" } });
  return RoadmapModel.create({ userId: input.userId, templateId: template._id, status: "active", inputs: { targetCompanyIds: input.companyIds, currentLevel: input.level, dailyMinutes: input.dailyMinutes, language: input.language, goal: input.goal, targetDate: input.targetDate ?? null }, generatedAt: new Date(), algorithmVersion: "roadmap-v1", stages });
}

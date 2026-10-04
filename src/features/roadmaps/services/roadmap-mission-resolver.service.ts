import { MissionModel } from "@/features/content/models/content.model";

type AnyDoc = Record<string, any>;

function id(value: unknown) {
  return String(value);
}

export async function resolveStageMissions(stage: AnyDoc | null | undefined) {
  const missionIds = ((stage?.missionIds ?? []) as unknown[]).map(id).filter(Boolean);
  const topicIds = ((stage?.topicIds ?? []) as unknown[]).map(id).filter(Boolean);

  const directMissions = missionIds.length
    ? await MissionModel.find({ _id: { $in: missionIds }, isPublished: true })
        .populate("topicId patternId")
        .sort({ order: 1, createdAt: 1 })
        .lean()
    : [];

  const topicSet = new Set(topicIds);
  const validDirectMissions = (directMissions as AnyDoc[]).filter((mission) => {
    if (!topicSet.size) return true;
    return topicSet.has(id(mission.topicId?._id ?? mission.topicId));
  });

  if (validDirectMissions.length) {
    const byId = new Map(validDirectMissions.map((mission) => [id(mission._id), mission]));
    return missionIds.map((missionId) => byId.get(missionId)).filter(Boolean) as AnyDoc[];
  }

  if (!topicIds.length) return [];

  return MissionModel.find({ topicId: { $in: topicIds }, isPublished: true })
    .populate("topicId patternId")
    .sort({ order: 1, createdAt: 1 })
    .lean();
}

export async function resolveStageMissionIds(stage: AnyDoc | null | undefined) {
  const missions = await resolveStageMissions(stage);
  return (missions as AnyDoc[]).map((mission: AnyDoc) => mission._id);
}

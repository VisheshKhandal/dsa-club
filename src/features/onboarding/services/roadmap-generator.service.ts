import { addDays } from "date-fns";
import { connectToDatabase } from "@/lib/db/mongodb";
import { CompanyModel, MissionModel, TopicModel } from "@/features/content/models/content.model";
import { RoadmapModel } from "@/features/learning/models/learning.model";
import type { OnboardingInput } from "@/features/onboarding/validators/onboarding.validators";
import { CURRICULUM, planRoadmapStages } from "@/features/onboarding/planning";

export async function generatePersonalizedRoadmap(userId: string, input: OnboardingInput) {
  await connectToDatabase();
  const topicOperations = CURRICULUM.map((topic) => ({
    updateOne: {
      filter: { slug: topic.slug },
      update: {
        $setOnInsert: {
          slug: topic.slug,
          name: topic.name,
          description: `Core ${topic.name} practice sequence.`,
          order: topic.order,
          difficulty: topic.difficulty,
          estimatedMinutes: topic.minutes,
          isPublished: true,
          prerequisiteTopicIds: [],
        },
      },
      upsert: true,
    },
  }));
  await TopicModel.bulkWrite(topicOperations);
  const topics = (await TopicModel.find({ slug: { $in: CURRICULUM.map((topic) => topic.slug) } }).lean()) as Array<{
    _id: unknown;
    slug: string;
    name: string;
  }>;
  const topicBySlug = new Map(topics.map((topic) => [topic.slug, topic]));
  const missions = await MissionModel.find({
    topicId: { $in: topics.map((topic) => topic._id) },
    isPublished: true,
  })
    .sort({ estimatedMinutes: 1 })
    .lean();
  const missionIdsByTopic = new Map<string, unknown[]>();
  for (const mission of missions as Array<{ _id: unknown; topicId: unknown }>) {
    const topicId = String(mission.topicId);
    missionIdsByTopic.set(topicId, [...(missionIdsByTopic.get(topicId) ?? []), mission._id]);
  }
  const companies = (input.companySlugs ?? []).filter((slug) => slug !== "other");
  if (companies.length) {
    await CompanyModel.bulkWrite(
      companies.map((slug) => ({
        updateOne: {
          filter: { slug },
          update: { $setOnInsert: { slug, name: slug[0].toUpperCase() + slug.slice(1), tier: "product", isActive: true } },
          upsert: true,
        },
      }))
    );
  }
  const companyDocs = companies.length ? await CompanyModel.find({ slug: { $in: companies } }).lean() : [];

  // Shared planning engine guarantees preview and generated roadmap always match
  const plannedStages = planRoadmapStages(input);

  const start = new Date();
  let cursor = new Date(start);
  const stages = plannedStages.map((stageItem, index) => {
    const topicDoc = topicBySlug.get(stageItem.slug);
    const plannedDays = stageItem.plannedDays;
    const stage = {
      key: stageItem.slug,
      title: stageItem.name,
      order: index,
      status: index === 0 ? "active" : "locked",
      plannedStartAt: new Date(cursor),
      plannedEndAt: addDays(cursor, plannedDays - 1),
      topicIds: topicDoc?._id ? [topicDoc._id] : [],
      missionIds: topicDoc?._id ? (missionIdsByTopic.get(String(topicDoc._id)) ?? []) : [],
      completionScore: 0,
    };
    cursor = addDays(cursor, plannedDays);
    return stage;
  });

  await RoadmapModel.updateMany({ userId, status: "active" }, { $set: { status: "archived" } });
  return RoadmapModel.create({
    userId,
    status: "active",
    inputs: {
      targetCompanyIds: companyDocs.map((company: { _id: unknown }) => company._id),
      currentLevel: input.experienceLevel,
      dailyMinutes: input.dailyMinutes,
      language: input.language,
      goal: input.learningGoal,
      targetDate: null,
    },
    generatedAt: new Date(),
    algorithmVersion: "onboarding-rules-v1",
    stages,
  });
}

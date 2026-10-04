import { Types } from "mongoose";
import { unstable_cache, revalidateTag } from "next/cache";
import { connectToDatabase } from "@/lib/db/mongodb";
import { UserProfileModel } from "@/features/identity/models/user.model";
import { TopicModel } from "@/features/content/models/content.model";
import { NotificationModel } from "@/features/intelligence/models/intelligence.model";
import { generatePersonalizedRoadmap } from "@/features/onboarding/services/roadmap-generator.service";
import type { OnboardingInput } from "@/features/onboarding/validators/onboarding.validators";

const goalMap = {
  internship: "internship",
  placement: "placements",
  switch: "interviews",
  foundation: "foundation",
  interview: "interviews",
  not_sure: "foundation",
} as const;

async function fetchOnboardingProfile(userId: string) {
  await connectToDatabase();
  return UserProfileModel.findOne({ userId: new Types.ObjectId(userId) }).lean();
}

export async function getOnboardingProfile(userId: string) {
  if (typeof unstable_cache === "function") {
    const cachedLoader = unstable_cache(
      async (uid: string) => fetchOnboardingProfile(uid),
      [`onboarding-profile-${userId}`],
      {
        revalidate: 300,
        tags: [`onboarding-${userId}`],
      }
    );
    return cachedLoader(userId);
  }
  return fetchOnboardingProfile(userId);
}

export async function saveOnboardingDraft(
  userId: string,
  currentStep: number,
  draft: Partial<OnboardingInput>
) {
  await connectToDatabase();
  const res = await UserProfileModel.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    {
      $set: {
        "onboarding.status": "in_progress",
        "onboarding.currentStep": currentStep,
        "onboarding.draft": draft,
      },
      $setOnInsert: { userId: new Types.ObjectId(userId) },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  try {
    if (typeof revalidateTag === "function") revalidateTag(`onboarding-${userId}`);
  } catch {}
  return res;
}

export async function skipOnboarding(userId: string) {
  await connectToDatabase();
  const existingProfile = await UserProfileModel.findOne({ userId: new Types.ObjectId(userId) }).lean();

  let starterRoadmapId = existingProfile?.activeRoadmapId;
  if (!starterRoadmapId) {
    const starterInput: OnboardingInput = {
      experienceLevel: "beginner",
      companySlugs: [],
      dailyMinutes: 30,
      language: (existingProfile?.primaryLanguage as OnboardingInput["language"]) || "python",
      knownTopicSlugs: [],
      learningGoal: "foundation",
    };
    const roadmap = await generatePersonalizedRoadmap(userId, starterInput);
    starterRoadmapId = roadmap._id;
  }

  const res = await UserProfileModel.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    {
      $set: {
        "onboarding.status": "skipped",
        "onboarding.skippedAt": new Date(),
        "onboarding.completedAt": null,
        onboardingCompletedAt: null,
        roadmapSource: "starter",
        activeRoadmapId: starterRoadmapId,
      },
      $setOnInsert: { userId: new Types.ObjectId(userId) },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  try {
    if (typeof revalidateTag === "function") revalidateTag(`onboarding-${userId}`);
  } catch {}
  return res;
}

export async function completeOnboarding(userId: string, input: OnboardingInput) {
  await connectToDatabase();
  const roadmap = await generatePersonalizedRoadmap(userId, input);
  const knownTopics = await TopicModel.find({ slug: { $in: input.knownTopicSlugs } })
    .select("_id")
    .lean();

  await UserProfileModel.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    {
      $set: {
        currentLevel: input.experienceLevel,
        primaryLanguage: input.language,
        goals: [goalMap[input.learningGoal]],
        dailyMinutes: input.dailyMinutes,
        knownTopicIds: knownTopics.map((topic: { _id: unknown }) => topic._id),
        activeRoadmapId: roadmap._id,
        roadmapSource: "personalized",
        onboardingCompletedAt: new Date(),
        "onboarding.status": "completed",
        "onboarding.currentStep": 4,
        "onboarding.draft": input,
        "onboarding.completedAt": new Date(),
        "onboarding.skippedAt": null,
      },
      $setOnInsert: { userId: new Types.ObjectId(userId) },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  try {
    const notifCount = await NotificationModel.countDocuments({ userId: new Types.ObjectId(userId) });
    if (notifCount === 0) {
      await NotificationModel.create({
        userId: new Types.ObjectId(userId),
        type: "system",
        priority: "informational",
        groupKey: "welcome",
        actionLabel: "Start practicing",
        deepLink: "/practice",
        title: "Welcome to DSA Club",
        body: "Your structured learning workspace and spaced retrieval schedule are ready. Solve problems to build your readiness evidence.",
        status: "unread",
        scheduledAt: new Date(),
      }).catch(() => null);
    }
  } catch {}

  try {
    if (typeof revalidateTag === "function") revalidateTag(`onboarding-${userId}`);
  } catch {}
  return roadmap;
}

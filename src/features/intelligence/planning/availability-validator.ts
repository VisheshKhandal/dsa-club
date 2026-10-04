import { connectToDatabase } from "@/lib/db/mongodb";
import { TopicModel, MissionModel, ProblemModel } from "@/features/content/models/content.model";
import { CURRICULUM, type CurriculumTopic } from "@/features/onboarding/planning/curriculum-rules";
import { normalizeTopicSlug } from "./topic-catalog";
import type { AvailabilityResult } from "../types/intelligence.types";

const topicMap = new Map<string, CurriculumTopic>(CURRICULUM.map((t) => [t.slug, t]));

/**
 * Validates whether a requested focus topic is ready for an active learning plan,
 * checking prerequisite gaps, published missions, and practice problems in MongoDB.
 */
export async function validateTopicAvailability(
  rawTopicSlug: string,
  knownTopicSlugs: string[] = []
): Promise<AvailabilityResult> {
  const topicSlug = normalizeTopicSlug(rawTopicSlug) || rawTopicSlug;
  const curriculumTopic = topicMap.get(topicSlug);
  const topicName = curriculumTopic ? curriculumTopic.name : topicSlug;

  // 1. Check Prerequisite Gaps
  if (curriculumTopic && curriculumTopic.prerequisites.length > 0) {
    const knownSet = new Set(
      knownTopicSlugs
        .map((s) => normalizeTopicSlug(s))
        .filter((s): s is string => Boolean(s))
    );
    const missingPrereqs = curriculumTopic.prerequisites.filter((p) => !knownSet.has(p));

    if (missingPrereqs.length > 0) {
      const prerequisiteGaps = missingPrereqs.map((slug) => ({
        slug,
        name: topicMap.get(slug)?.name ?? slug,
      }));

      return {
        status: "blocked_by_prerequisite",
        topicSlug,
        topicName,
        availableMissionsCount: 0,
        availableProblemsCount: 0,
        prerequisiteGaps,
        userActionOptions: [
          {
            key: "start_prerequisite",
            label: `Start with ${prerequisiteGaps[0].name} (Recommended)`,
            description: `Build foundational intuition in ${prerequisiteGaps[0].name} before jumping into ${topicName}.`,
          },
          {
            key: "choose_other",
            label: "Choose another topic",
            description: "Pick a topic that matches your current comfort level.",
          },
          {
            key: "override_anyway",
            label: `Proceed with ${topicName} anyway`,
            description: "Skip prerequisite warning if you are already confident with fundamentals.",
          },
        ],
      };
    }
  }

  // 2. Database Content Query
  await connectToDatabase();

  const topicDoc = await TopicModel.findOne({ slug: topicSlug, isPublished: true }).lean();
  if (!topicDoc) {
    return {
      status: "content_unavailable",
      topicSlug,
      topicName,
      availableMissionsCount: 0,
      availableProblemsCount: 0,
      prerequisiteGaps: [],
      userActionOptions: [
        {
          key: "choose_other",
          label: "Choose an available topic (Recommended)",
          description: "Select from our fully published curriculum topics with guided walkthroughs.",
        },
        {
          key: "notify_waitlist",
          label: `Notify me when ${topicName} is published`,
          description: "We'll email you as soon as this topic is live.",
        },
      ],
    };
  }

  const topicId = String((topicDoc as any)._id);
  const [missionsCount, problemsCount] = await Promise.all([
    MissionModel.countDocuments({ topicId: (topicDoc as any)._id, isPublished: true }),
    ProblemModel.countDocuments({
      $or: [{ topicIds: (topicDoc as any)._id }, { topicId: (topicDoc as any)._id }],
      isPublished: true,
    }),
  ]);

  if (missionsCount === 0) {
    return {
      status: "content_unavailable",
      topicId,
      topicSlug,
      topicName,
      availableMissionsCount: 0,
      availableProblemsCount: problemsCount,
      prerequisiteGaps: [],
      userActionOptions: [
        {
          key: "choose_other",
          label: "Choose an available topic (Recommended)",
          description: "Select from our fully published curriculum topics with guided walkthroughs.",
        },
        {
          key: "notify_waitlist",
          label: `Notify me when ${topicName} is published`,
          description: "We'll email you as soon as this topic is live.",
        },
      ],
    };
  }

  if (problemsCount < 2) {
    return {
      status: "partial_content",
      topicId,
      topicSlug,
      topicName,
      availableMissionsCount: missionsCount,
      availableProblemsCount: problemsCount,
      prerequisiteGaps: [],
      userActionOptions: [
        {
          key: "proceed_partial",
          label: `Start with available ${topicName} missions`,
          description: `${missionsCount} guided mission(s) ready. Practice problems will supplement as you progress.`,
        },
        {
          key: "choose_other",
          label: "Choose a topic with full problem practice",
          description: "Pick a topic with extensive problem sets and pattern variations.",
        },
      ],
    };
  }

  return {
    status: "ready",
    topicId,
    topicSlug,
    topicName,
    availableMissionsCount: missionsCount,
    availableProblemsCount: problemsCount,
    prerequisiteGaps: [],
    userActionOptions: [],
  };
}

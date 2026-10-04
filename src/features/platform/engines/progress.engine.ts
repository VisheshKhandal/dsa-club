import { Types } from "mongoose";
import { MissionModel, type Mission } from "@/features/content/models/content.model";
import { MissionProgressModel, RoadmapModel, TopicProgressModel, ProblemAttemptModel, PatternRecognitionAttemptModel, type MissionProgress } from "@/features/learning/models/learning.model";
import { AssessmentResultModel, RevisionQueueModel, UserStatisticsModel } from "@/features/intelligence/models/intelligence.model";
import { getCachedPublishedProblems, getCachedPublishedPatterns } from "@/features/content/services/curriculum-cache";
import { connectToDatabase } from "@/lib/db/mongodb";
import { addDays } from "date-fns";

export class ProgressEngine {
  /**
   * Called when a user completes a mission.
   * Updates topic progress, creates a revision queue entry, and updates overall readiness.
   */
  static async processMissionCompletion(userId: string, missionId: string): Promise<void> {
    await connectToDatabase();
    const uid = new Types.ObjectId(userId);
    const mid = new Types.ObjectId(missionId);

    const mission = await MissionModel.findById(mid).lean() as Mission | null;
    if (!mission) return;

    // 1. Calculate new topic mastery
    await this.updateTopicMastery(uid, mission.topicId as Types.ObjectId);

    // 2. Add to Revision Queue (Spacing effect: 1 day later for first review)
    await this.scheduleRevision(uid, "mission", mid, 1, "mission");

    // 3. Keep dashboard/recommendations pointed at real progress
    await UserStatisticsModel.findOneAndUpdate(
      { userId: uid },
      { $set: { currentTopicId: mission.topicId, lastStudiedTopicId: mission.topicId }, $setOnInsert: { userId: uid } },
      { upsert: true }
    );
    await this.updateRoadmapProgress(uid, mid);
  }

  /**
   * Recalculates the mastery score for a topic based on its completed missions.
   */
  private static async updateTopicMastery(userId: Types.ObjectId, topicId: Types.ObjectId): Promise<void> {
    const { recomputeTopicProgress } = await import("@/features/progress/services/progress.service");
    await recomputeTopicProgress(userId, topicId);
  }

  /**
   * Schedules a revision in the queue.
   */
  private static async updateRoadmapProgress(userId: Types.ObjectId, completedMissionId: Types.ObjectId): Promise<void> {
    const roadmap = await RoadmapModel.findOne({ userId, status: "active" });
    if (!roadmap) return;

    const stages = (roadmap.stages ?? []) as Array<{ missionIds?: Types.ObjectId[]; status: "locked" | "active" | "completed"; completionScore?: number }>;
    const stageIndex = stages.findIndex((stage) => (stage.missionIds ?? []).some((missionId) => String(missionId) === String(completedMissionId)));
    if (stageIndex === -1) return;

    for (const stage of stages) {
      if (!stage.missionIds?.length) continue;
      const completedCount = await MissionProgressModel.countDocuments({ userId, missionId: { $in: stage.missionIds }, status: "completed" });
      stage.completionScore = Math.round((completedCount / stage.missionIds.length) * 100);
      if (stage.completionScore >= 100) stage.status = "completed";
    }

    const firstIncompleteIndex = stages.findIndex((stage) => stage.status !== "completed" && stage.missionIds?.length);
    stages.forEach((stage, index) => {
      if (stage.status === "completed") return;
      stage.status = index === firstIncompleteIndex ? "active" : "locked";
    });

    await roadmap.save();
  }

  private static async scheduleRevision(userId: Types.ObjectId, entityType: string, entityId: Types.ObjectId, daysFromNow: number, source: "mission" | "attempt" | "recommendation" | "manual"): Promise<void> {
    const dueAt = addDays(new Date(), daysFromNow);
    
    await RevisionQueueModel.findOneAndUpdate(
      { userId, entityType, entityId },
      {
        $set: {
          state: "scheduled",
          dueAt,
          priority: 5,
        },
        $setOnInsert: { userId, entityType, entityId, source }
      },
      { upsert: true }
    );
  }

  /**
   * Generates explainable progress for multiple topics in a single batched database roundtrip.
   * Replaces N * 5 queries with 6 parallel queries total.
   */
  static async explainTopicsProgressBatch(
    userId: Types.ObjectId | string,
    topicIds: (Types.ObjectId | string)[]
  ): Promise<Map<string, any>> {
    await connectToDatabase();
    const uid = new Types.ObjectId(userId);
    const validTopicIds = (topicIds || []).filter(Boolean).map((t) => new Types.ObjectId(t));
    const resultMap = new Map<string, any>();

    if (validTopicIds.length === 0) {
      return resultMap;
    }

    // 1. Fetch published problems and patterns from RAM cache (0ms DB roundtrip)
    const [cachedProblems, cachedPatterns] = await Promise.all([
      getCachedPublishedProblems(),
      getCachedPublishedPatterns(),
    ]);

    const validTopicIdSet = new Set(validTopicIds.map((t) => String(t)));

    // Filter problems and patterns belonging to requested topics
    const problems = (cachedProblems as any[]).filter((p) =>
      (p.topicIds ?? []).some((tid: any) => validTopicIdSet.has(String(tid?._id ?? tid)))
    );
    const patterns = (cachedPatterns as any[]).filter((pat) =>
      validTopicIdSet.has(String(pat.topicId?._id ?? pat.topicId))
    );

    // Map problems and patterns by topic and gather IDs
    const problemsByTopic = new Map<string, any[]>();
    const problemMap = new Map<string, string>();
    const allProblemIds: Types.ObjectId[] = [];
    for (const p of problems) {
      const pidStr = String(p._id);
      problemMap.set(pidStr, String(p.title ?? "a problem"));
      allProblemIds.push(new Types.ObjectId(p._id));
      for (const tid of p.topicIds ?? []) {
        const tidStr = String(tid?._id ?? tid);
        const list = problemsByTopic.get(tidStr) ?? [];
        list.push(p);
        problemsByTopic.set(tidStr, list);
      }
    }

    const patternsByTopic = new Map<string, any[]>();
    const patternMap = new Map<string, string>();
    const allPatternIds: Types.ObjectId[] = [];
    for (const pat of patterns) {
      const patIdStr = String(pat._id);
      patternMap.set(patIdStr, String(pat.name ?? "a pattern"));
      allPatternIds.push(new Types.ObjectId(pat._id));
      const tidStr = String(pat.topicId?._id ?? pat.topicId);
      const list = patternsByTopic.get(tidStr) ?? [];
      list.push(pat);
      patternsByTopic.set(tidStr, list);
    }

    // 2. Single parallel database roundtrip for all user-specific collections
    const [assessments, problemAttempts, patternAttempts, dueItems] = await Promise.all([
      AssessmentResultModel.find({ userId: uid, entityType: "topic", entityId: { $in: validTopicIds } })
        .sort({ createdAt: -1 })
        .lean() as Promise<any[]>,
      allProblemIds.length > 0
        ? (ProblemAttemptModel.find({ userId: uid, problemId: { $in: allProblemIds } })
            .sort({ createdAt: -1 })
            .lean() as Promise<any[]>)
        : Promise.resolve([]),
      allPatternIds.length > 0
        ? (PatternRecognitionAttemptModel.find({ userId: uid, expectedPatternId: { $in: allPatternIds } })
            .sort({ createdAt: -1 })
            .lean() as Promise<any[]>)
        : Promise.resolve([]),
      allPatternIds.length > 0
        ? (RevisionQueueModel.find({
            userId: uid,
            entityType: "pattern",
            entityId: { $in: allPatternIds },
            state: { $in: ["scheduled", "due"] },
            dueAt: { $lte: new Date() },
          }).lean() as Promise<any[]>)
        : Promise.resolve([]),
    ]);

    // Group latest assessment by topicId
    const latestAssessmentByTopic = new Map<string, any>();
    for (const a of assessments) {
      const tid = String(a.entityId);
      if (!latestAssessmentByTopic.has(tid)) {
        latestAssessmentByTopic.set(tid, a);
      }
    }

    // Group attempts by problemId
    const attemptsByProblem = new Map<string, any[]>();
    for (const att of problemAttempts) {
      const pid = String(att.problemId);
      const list = attemptsByProblem.get(pid) ?? [];
      list.push(att);
      attemptsByProblem.set(pid, list);
    }

    // Group recognition attempts by expectedPatternId
    const attemptsByPattern = new Map<string, any[]>();
    for (const att of patternAttempts) {
      const patId = String(att.expectedPatternId);
      const list = attemptsByPattern.get(patId) ?? [];
      list.push(att);
      attemptsByPattern.set(patId, list);
    }

    // Group due revision queue items by entityId
    const dueByPattern = new Map<string, any[]>();
    for (const item of dueItems) {
      const patId = String(item.entityId);
      const list = dueByPattern.get(patId) ?? [];
      list.push(item);
      dueByPattern.set(patId, list);
    }

    const dimMap: Record<string, string> = {
      recognition: "Pattern Recognition",
      understanding: "Concept Understanding",
      implementation: "Independent Implementation",
      optimization: "Code Optimization",
      explanation: "Reflective Explanation",
      edgeCases: "Edge Case Handling",
      retention: "Long-term Retention",
    };

    // 3. Process each topic in memory (0ms network delay)
    for (const tid of validTopicIds) {
      const tidStr = String(tid);
      const assessment = latestAssessmentByTopic.get(tidStr);

      const strongAreas: string[] = [];
      const weakAreas: string[] = [];

      if (assessment?.dimensions) {
        for (const [key, val] of Object.entries(assessment.dimensions)) {
          if (typeof val === "number") {
            if (val >= 75) strongAreas.push(dimMap[key] || key);
            else if (val < 50) weakAreas.push(dimMap[key] || key);
          }
        }
      }

      const topicProblems = problemsByTopic.get(tidStr) ?? [];
      const topicPatterns = patternsByTopic.get(tidStr) ?? [];

      // Collect and sort attempts for this topic's problems
      const topicProblemAttempts: any[] = [];
      for (const p of topicProblems) {
        const atts = attemptsByProblem.get(String(p._id));
        if (atts) topicProblemAttempts.push(...atts);
      }
      topicProblemAttempts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const recentProblemAttempts = topicProblemAttempts.slice(0, 5);

      const recentSuccesses: string[] = [];
      const recentMistakes: string[] = [];

      let successCount = 0;
      for (const attempt of recentProblemAttempts) {
        const pName = problemMap.get(String(attempt.problemId)) || "a problem";
        if (attempt.status === "solved" && attempt.strategy === "independent") {
          if (successCount < 2) recentSuccesses.push(`Solved '${pName}' independently in ${Math.round((attempt.durationSeconds || 0) / 60)}m`);
          successCount++;
        } else if (attempt.status === "abandoned" || (attempt.status === "solved" && attempt.strategy === "editorial_assisted")) {
          recentMistakes.push(`Struggled with '${pName}' (needed editorial)`);
        }
      }

      // Collect pattern recognition attempts
      const topicPatternAttempts: any[] = [];
      for (const pat of topicPatterns) {
        const atts = attemptsByPattern.get(String(pat._id));
        if (atts) topicPatternAttempts.push(...atts);
      }
      topicPatternAttempts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const recentPatternAttempts = topicPatternAttempts.slice(0, 3);

      for (const attempt of recentPatternAttempts) {
        const pName = patternMap.get(String(attempt.expectedPatternId)) || "a pattern";
        if (attempt.isCorrect) {
          if (successCount < 3) recentSuccesses.push(`Correctly recognized the ${pName} pattern`);
          successCount++;
        } else {
          recentMistakes.push(`Misidentified the ${pName} pattern`);
        }
      }

      // Collect due concepts for this topic
      const needsRevision: string[] = [];
      for (const pat of topicPatterns) {
        const dues = dueByPattern.get(String(pat._id));
        if (dues && dues.length > 0) {
          const pName = patternMap.get(String(pat._id));
          if (pName) needsRevision.push(pName);
        }
      }

      let why = "Not enough data to explain mastery. Complete more missions and problems.";
      let nextAction = "Continue your active mission for this topic.";

      if (assessment) {
        if (weakAreas.length > 0 && strongAreas.length > 0) {
          why = `Your mastery is bolstered by strong ${strongAreas[0]}, but limited by weaknesses in ${weakAreas[0]}.`;
        } else if (weakAreas.length > 0) {
          why = `Your mastery is currently limited due to struggles with ${weakAreas[0]}.`;
        } else if (strongAreas.length > 0) {
          why = `Excellent progress! You are showing high proficiency, particularly in ${strongAreas[0]}.`;
        } else {
          why = `You are making steady progress. Focus on improving independent problem-solving and pattern recognition.`;
        }
      }

      if (needsRevision.length > 0) {
        nextAction = `Review due concepts in your Revision Queue, starting with ${needsRevision[0]}.`;
      } else if (weakAreas.includes("Independent Implementation") && recentMistakes.length > 0) {
        nextAction = "Practice easier problems in this topic independently without using the editorial.";
      } else if (weakAreas.includes("Pattern Recognition")) {
        nextAction = "Complete a pattern-recognition drill for this topic.";
      }

      resultMap.set(tidStr, {
        mastery: assessment?.overallScore ?? 0,
        why,
        strongAreas: strongAreas.slice(0, 3),
        weakAreas: weakAreas.slice(0, 3),
        recentSuccesses: recentSuccesses.slice(0, 3),
        recentMistakes: recentMistakes.slice(0, 3),
        needsRevision: needsRevision.slice(0, 3),
        nextAction,
      });
    }

    return resultMap;
  }

  /**
   * Generates explainable progress for a topic based on raw database evidence and recent assessments.
   */
  static async explainTopicProgress(userId: Types.ObjectId | string, topicId: Types.ObjectId | string) {
    const tidStr = String(topicId);
    const batchMap = await this.explainTopicsProgressBatch(userId, [topicId]);
    if (batchMap.has(tidStr)) {
      return batchMap.get(tidStr);
    }
    return {
      mastery: 0,
      why: "Not enough data to explain mastery. Complete more missions and problems.",
      strongAreas: [],
      weakAreas: [],
      recentSuccesses: [],
      recentMistakes: [],
      needsRevision: [],
      nextAction: "Continue your active mission for this topic.",
    };
  }
}

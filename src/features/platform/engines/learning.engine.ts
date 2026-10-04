import { Types } from "mongoose";
import { MissionModel, PatternModel, ProblemModel, type Mission } from "@/features/content/models/content.model";
import { MissionProgressModel, PatternRecognitionAttemptModel, ProblemAttemptModel, ReflectionLogModel, type MissionProgress } from "@/features/learning/models/learning.model";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getCachedPublishedPatterns } from "@/features/content/services/curriculum-cache";
import { ProgressEngine } from "./progress.engine";

export type MissionStageKind = 
  | "introduction"
  | "intuition"
  | "concept"
  | "mental_model"
  | "visualization"
  | "pattern"
  | "example"
  | "practice"
  | "reflection"
  | "mastery";

export interface Stage {
  key: string;
  kind: MissionStageKind;
  title?: string | null;
  content?: string | null;
  targetId?: string | null;
  target?: {
    id: string;
    slug: string;
    title: string;
    summary?: string;
    source?: string;
    sourceUrl?: string;
    difficulty?: string;
    patternId?: string;
    patternName?: string;
    topicName?: string;
    description?: string;
    whenToUse?: string;
    mentalModel?: string;
    variations?: string[];
    signalKeywords?: string[];
  } | null;
  patternOptions?: Array<{ id: string; name: string; slug: string }>;
  latestPatternAttempt?: {
    selectedPatternId: string;
    isCorrect: boolean;
    reasoning: string;
    signalIdentified: string;
    createdAt: string;
  } | null;
  latestPracticeEvidence?: {
    status: "started" | "solved" | "abandoned";
    strategy: string;
    confidence: number;
    difficulty: number;
    reflection: string;
    createdAt: string;
  } | null;
  latestMasteryEvidence?: {
    content: string;
    selfRating: number;
    qualityScore: number | null;
    createdAt: string;
  } | null;
  status: "locked" | "active" | "completed";
}

export class LearningEngine {
  /**
   * Retrieves the current stages for a user's mission, calculating locked/active/completed state.
   */
  static async getMissionStages(
    userId: string,
    missionId: string,
    preloadedMission?: (Mission & Record<string, any>) | null,
    preloadedProgress?: MissionProgress | null
  ): Promise<{ stages: Stage[]; activeStageKey: string | null; progress: number }> {
    await connectToDatabase();
    const uid = new Types.ObjectId(userId);
    const mId = new Types.ObjectId(missionId);

    const [mission, progress] = await Promise.all([
      preloadedMission !== undefined
        ? preloadedMission
        : (MissionModel.findById(missionId).populate("topicId patternId").lean() as Promise<(Mission & Record<string, any>) | null>),
      preloadedProgress !== undefined
        ? preloadedProgress
        : (MissionProgressModel.findOne({ userId: uid, missionId: mId }).lean() as Promise<MissionProgress | null>),
    ]);

    if (!mission) throw new Error("Mission not found");

    const completedStepKeys = (progress?.completedStepKeys as string[] | undefined) ?? [];
    const completedKeys = new Set(completedStepKeys);
    let firstActiveFound = false;
    let activeStageKey: string | null = null;

    const missionSteps = mission.steps as Array<{ key: string; kind: string; content?: string; title?: string; targetId?: Types.ObjectId | null; required?: boolean; weight: number }>;
    const targetIds = missionSteps.map((step) => step.targetId).filter(Boolean);
    const hasPatternStage = missionSteps.some((step) => step.kind === "pattern");
    const practiceSteps = missionSteps.filter((step) => step.kind === "practice" && step.targetId);
    const missionTopicId = String((mission.topicId as Record<string, any> | null)?._id ?? mission.topicId ?? "");
    const patternStepKeys = missionSteps.filter((step) => step.kind === "pattern").map((step) => step.key);
    const practiceTargetIds = practiceSteps.map((step) => step.targetId);

    const [
      targetProblems,
      cachedPatterns,
      patternAttempts,
      latestProblemAttempts,
      missionPracticeReflections,
      latestMasteryEvidence,
    ] = await Promise.all([
      targetIds.length ? ProblemModel.find({ _id: { $in: targetIds }, isPublished: true }).populate("patternIds topicIds").lean() : [],
      getCachedPublishedPatterns(),
      hasPatternStage
        ? PatternRecognitionAttemptModel.find({
            userId: uid,
            missionId: mId,
            stepKey: { $in: patternStepKeys },
          }).sort({ createdAt: -1 }).lean()
        : [],
      practiceSteps.length
        ? ProblemAttemptModel.find({
            userId: uid,
            problemId: { $in: practiceTargetIds },
          }).sort({ createdAt: -1 }).lean()
        : [],
      ReflectionLogModel.find({
        userId: uid,
        entityType: "mission",
        entityId: mId,
        promptVersion: "mission-practice-v1",
      }).sort({ createdAt: -1 }).lean() as Promise<Record<string, any>[]>,
      ReflectionLogModel.findOne({
        userId: uid,
        entityType: "mission",
        entityId: mId,
        promptVersion: "mission-mastery-v1",
      }).sort({ createdAt: -1 }).lean() as Promise<Record<string, any> | null>,
    ]);

    const problemTargets = new Map((targetProblems as Record<string, any>[]).map((problem) => [String(problem._id), problem]));
    const patternTargets = new Map((cachedPatterns as Record<string, any>[]).map((pattern) => [String(pattern._id), pattern]));
    const missionPattern = mission.patternId as Record<string, any> | null;
    const topicPatternOptions = hasPatternStage && missionTopicId
      ? (cachedPatterns as Record<string, any>[]).filter((p) => String((p.topicId as Record<string, any> | null)?._id ?? p.topicId ?? "") === missionTopicId)
      : [];

    const latestPatternAttempts = new Map<string, Record<string, any>>();
    for (const attempt of patternAttempts as Record<string, any>[]) {
      const stepKey = String(attempt.stepKey ?? "");
      if (stepKey && !latestPatternAttempts.has(stepKey)) {
        latestPatternAttempts.set(stepKey, attempt);
      }
    }

    const latestAttemptsByProblem = new Map<string, Record<string, any>>();
    for (const attempt of latestProblemAttempts as Record<string, any>[]) {
      const problemId = String(attempt.problemId ?? "");
      if (problemId && !latestAttemptsByProblem.has(problemId)) {
        latestAttemptsByProblem.set(problemId, attempt);
      }
    }
    const latestAttemptIds = [...latestAttemptsByProblem.values()].map((attempt) => attempt._id).filter(Boolean);
    const practiceReflections = latestAttemptIds.length
      ? await ReflectionLogModel.find({
          userId: uid,
          problemAttemptId: { $in: latestAttemptIds },
        }).sort({ createdAt: -1 }).lean()
      : [];
    const reflectionsByAttempt = new Map<string, Record<string, any>>();
    for (const reflection of practiceReflections as Record<string, any>[]) {
      const attemptId = String(reflection.problemAttemptId ?? "");
      if (attemptId && !reflectionsByAttempt.has(attemptId)) {
        reflectionsByAttempt.set(attemptId, reflection);
      }
    }

    const stages: Stage[] = missionSteps.map((step) => {
      const isCompleted = completedKeys.has(step.key);
      let status: Stage["status"] = "locked";

      if (isCompleted) {
        status = "completed";
      } else if (!firstActiveFound) {
        status = "active";
        activeStageKey = step.key;
        firstActiveFound = true;
      }

      const targetId = step.targetId ? String(step.targetId) : null;
      const problem = targetId ? problemTargets.get(targetId) : null;
      const explicitPattern = targetId ? patternTargets.get(targetId) : null;
      const pattern = step.kind === "pattern"
        ? explicitPattern ?? (missionPattern?._id ? missionPattern : null)
        : explicitPattern;
      const latestPatternAttempt = step.kind === "pattern" ? latestPatternAttempts.get(step.key) : null;
      const latestPracticeAttempt = step.kind === "practice" && targetId ? latestAttemptsByProblem.get(targetId) : null;
      const fallbackPracticeReflection = step.kind === "practice" ? missionPracticeReflections[0] ?? null : null;
      const latestPracticeReflection = latestPracticeAttempt ? reflectionsByAttempt.get(String(latestPracticeAttempt._id)) : fallbackPracticeReflection;
      const firstProblemPattern = Array.isArray(problem?.patternIds) ? problem.patternIds[0] as Record<string, any> | undefined : undefined;
      const firstProblemTopic = Array.isArray(problem?.topicIds) ? problem.topicIds[0] as Record<string, any> | undefined : undefined;

      return {
        key: step.key,
        kind: step.kind as MissionStageKind,
        title: step.title ?? null,
        content: step.content ?? null,
        targetId,
        target: problem ? {
          id: String(problem._id),
          slug: String(problem.slug),
          title: String(problem.title),
          summary: String(problem.summary ?? ""),
          source: String(problem.source ?? ""),
          sourceUrl: String(problem.sourceUrl ?? ""),
          difficulty: String(problem.difficulty ?? ""),
          patternId: firstProblemPattern?._id ? String(firstProblemPattern._id) : "",
          patternName: String(firstProblemPattern?.name ?? ""),
          topicName: String(firstProblemTopic?.name ?? ""),
        } : pattern ? {
          id: String(pattern._id),
          slug: String(pattern.slug),
          title: String(pattern.name),
          summary: String(pattern.description ?? ""),
          difficulty: String(pattern.difficulty ?? ""),
          topicName: String((pattern.topicId as Record<string, any> | null)?.name ?? ""),
          description: String(pattern.description ?? ""),
          whenToUse: String(pattern.whenToUse ?? ""),
          mentalModel: String(pattern.mentalModel ?? ""),
          variations: ((pattern.variations ?? []) as unknown[]).map(String).filter(Boolean),
          signalKeywords: ((pattern.signalKeywords ?? []) as unknown[]).map(String).filter(Boolean),
        } : null,
        patternOptions: step.kind === "pattern"
          ? (topicPatternOptions as Record<string, any>[]).map((option) => ({
              id: String(option._id),
              name: String(option.name),
              slug: String(option.slug),
            }))
          : undefined,
        latestPatternAttempt: latestPatternAttempt ? {
          selectedPatternId: String(latestPatternAttempt.selectedPatternId ?? ""),
          isCorrect: Boolean(latestPatternAttempt.isCorrect),
          reasoning: String(latestPatternAttempt.reasoning ?? ""),
          signalIdentified: String(latestPatternAttempt.signalIdentified ?? ""),
          createdAt: latestPatternAttempt.createdAt instanceof Date
            ? latestPatternAttempt.createdAt.toISOString()
            : String(latestPatternAttempt.createdAt ?? ""),
        } : null,
        latestPracticeEvidence: (latestPracticeAttempt || latestPracticeReflection) ? {
          status: (latestPracticeAttempt?.status ?? "solved") as "started" | "solved" | "abandoned",
          strategy: String(latestPracticeAttempt?.strategy ?? "independent"),
          confidence: Number(latestPracticeAttempt?.selfConfidence ?? latestPracticeReflection?.selfRating ?? 3),
          difficulty: Number(latestPracticeAttempt?.perceivedDifficulty ?? 3),
          reflection: String(latestPracticeReflection?.content ?? ""),
          createdAt: (latestPracticeAttempt?.createdAt ?? latestPracticeReflection?.createdAt) instanceof Date
            ? (latestPracticeAttempt?.createdAt ?? latestPracticeReflection?.createdAt).toISOString()
            : String(latestPracticeAttempt?.createdAt ?? latestPracticeReflection?.createdAt ?? ""),
        } : null,
        latestMasteryEvidence: step.kind === "mastery" && latestMasteryEvidence ? {
          content: String(latestMasteryEvidence.content ?? ""),
          selfRating: Number(latestMasteryEvidence.selfRating ?? 3),
          qualityScore: typeof latestMasteryEvidence.qualityScore === "number" ? latestMasteryEvidence.qualityScore : null,
          createdAt: latestMasteryEvidence.createdAt instanceof Date
            ? latestMasteryEvidence.createdAt.toISOString()
            : String(latestMasteryEvidence.createdAt ?? ""),
        } : null,
        status,
      };
    });

    return { stages, activeStageKey, progress: Number(progress?.progress ?? 0) };
  }

  /**
   * Marks a specific stage as completed. Unlocks the next stage.
   * If all stages are completed, it delegates to completeMission().
   */
  static async completeStage(userId: string, missionId: string, stepKey: string, evidence?: any): Promise<void> {
    await connectToDatabase();
    const uid = new Types.ObjectId(userId);
    const mid = new Types.ObjectId(missionId);
    const mission = await MissionModel.findById(mid).lean() as Mission | null;
    if (!mission) throw new Error("Mission not found");
    const missionSteps = (mission.steps ?? []) as Array<{ key: string }>;
    const allKeys = new Set(missionSteps.map((step) => step.key).filter(Boolean));
    if (!allKeys.has(stepKey)) throw new Error("Mission step not found");
    
    const progress = await MissionProgressModel.findOneAndUpdate(
      { userId: uid, missionId: mid },
      { 
        $addToSet: { completedStepKeys: stepKey },
        $setOnInsert: { userId: uid, missionId: mid, startedAt: new Date() }
      },
      { new: true, upsert: true }
    ).lean() as MissionProgress;

    const completedKeys = new Set([...(progress.completedStepKeys as string[] | undefined ?? []), stepKey]);
    const isFinished = allKeys.size > 0 && Array.from(allKeys).every((key) => completedKeys.has(key));
    if (isFinished) {
      await this.completeMission(userId, missionId);
    } else if (progress.status !== "completed") {
      const percentage = allKeys.size ? Math.round((completedKeys.size / allKeys.size) * 100) : 0;
      const nextProgress = Math.max(Number(progress.progress ?? 0), percentage);
      await MissionProgressModel.updateOne(
        { _id: progress._id },
        { $set: { status: "in_progress", progress: nextProgress, completedAt: null } }
      );
    }
  }

  /**
   * Handles the end-of-mission lifecycle.
   */
  static async completeMission(userId: string, missionId: string, evidence?: any): Promise<void> {
    await connectToDatabase();
    
    // Mark mission as completed
    await MissionProgressModel.updateOne(
      { userId: new Types.ObjectId(userId), missionId: new Types.ObjectId(missionId) },
      { 
        $set: { 
          status: "completed", 
          progress: 100, 
          completedAt: new Date(),
        } 
      },
      { upsert: true }
    );

    // Synchronize plan task, emit canonical learning events, and advance plan schedule if complete
    const { reconcileMissionCompletion } = await import("@/features/intelligence/services/mission-plan-orchestrator");
    await reconcileMissionCompletion({ userId, missionId, evidence });
  }

  /**
   * Restarts a completed mission by resetting its progress and completed steps.
   */
  static async restartMission(userId: string, missionId: string): Promise<void> {
    await connectToDatabase();
    
    // Reset mission progress to 0% and clear completed steps
    await MissionProgressModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), missionId: new Types.ObjectId(missionId) },
      { 
        $set: { 
          status: "in_progress", 
          progress: 0, 
          completedStepKeys: [],
          startedAt: new Date()
        },
        $unset: {
          completedAt: 1
        },
        $setOnInsert: { userId: new Types.ObjectId(userId), missionId: new Types.ObjectId(missionId) }
      },
      { upsert: true }
    );
  }
}

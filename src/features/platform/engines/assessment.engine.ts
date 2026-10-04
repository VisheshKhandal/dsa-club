import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { 
  ProblemAttemptModel, 
  ReflectionLogModel, 
  PatternRecognitionAttemptModel, 
  QuizAttemptModel, 
  MissionProgressModel,
  TopicProgressModel,
  PatternMasteryModel
} from "@/features/learning/models/learning.model";
import { AssessmentResultModel, RevisionHistoryModel } from "@/features/intelligence/models/intelligence.model";
import { MissionModel, ProblemModel, PatternModel } from "@/features/content/models/content.model";

export class AssessmentEngine {
  
  static async assessTopic(userId: Types.ObjectId | string, topicId: Types.ObjectId | string) {
    await connectToDatabase();
    const uid = new Types.ObjectId(userId);
    const tid = new Types.ObjectId(topicId);

    // 1. Fetch relevant related entities (Problems, Patterns, Missions)
    const [problems, patterns, missions] = await Promise.all([
      ProblemModel.find({ topicIds: tid, isPublished: true }).select("_id").lean(),
      PatternModel.find({ topicId: tid, isPublished: true }).select("_id").lean(),
      MissionModel.find({ topicId: tid, isPublished: true }).select("_id").lean(),
    ]);

    const problemIds = problems.map((p: any) => p._id);
    const patternIds = patterns.map((p: any) => p._id);
    const missionIds = missions.map((m: any) => m._id);

    // 2. Fetch Evidence
    const [
      patternRecognitions,
      quizzes,
      missionProgress,
      problemAttempts,
      reflections,
      revisions
    ] = await Promise.all([
      PatternRecognitionAttemptModel.find({ userId: uid, expectedPatternId: { $in: patternIds } }).lean(),
      QuizAttemptModel.find({ userId: uid, topicId: tid }).lean(),
      MissionProgressModel.find({ userId: uid, missionId: { $in: missionIds }, status: "completed" }).lean(),
      ProblemAttemptModel.find({ userId: uid, problemId: { $in: problemIds } }).lean(),
      ReflectionLogModel.find({ userId: uid, topicId: tid }).lean(),
      RevisionHistoryModel.find({ userId: uid, entityType: "topic", entityId: tid }).lean(),
    ]);

    const evidenceUsed: Types.ObjectId[] = [];
    const evidenceTypes = new Set<string>();

    const addEvidence = (items: any[], type: string) => {
      items.forEach(item => {
        if (item._id) {
          evidenceUsed.push(item._id);
          evidenceTypes.add(type);
        }
      });
    };

    addEvidence(patternRecognitions, "PatternRecognitionAttempt");
    addEvidence(quizzes, "QuizAttempt");
    addEvidence(missionProgress, "MissionProgress");
    addEvidence(problemAttempts, "ProblemAttempt");
    addEvidence(reflections, "ReflectionLog");
    addEvidence(revisions, "RevisionHistory");

    // 3. Compute Dimensions

    // 3.1 Recognition (Pattern recognition accuracy)
    let recognitionScore = 0;
    if (patternRecognitions.length > 0) {
      const correct = patternRecognitions.filter((r: any) => r.isCorrect).length;
      recognitionScore = Math.round((correct / patternRecognitions.length) * 100);
    }

    // 3.2 Understanding (Quiz scores & Mission completion)
    let understandingScore = 0;
    let quizAvg = 0;
    if (quizzes.length > 0) {
      quizAvg = quizzes.reduce((sum: number, q: any) => sum + (q.score || 0), 0) / quizzes.length;
    }
    let missionCompletionRate = 0;
    if (missionIds.length > 0) {
      missionCompletionRate = (missionProgress.length / missionIds.length) * 100;
    }
    if (quizzes.length > 0 && missionIds.length > 0) {
      understandingScore = Math.round(quizAvg * 0.4 + missionCompletionRate * 0.6);
    } else if (quizzes.length > 0) {
      understandingScore = Math.round(quizAvg);
    } else if (missionIds.length > 0) {
      understandingScore = Math.round(missionCompletionRate);
    }

    // 3.3 Implementation & 3.4 Optimization (from Problem Attempts)
    let implementationScore = 0;
    let optimizationScore = 0;
    if (problemAttempts.length > 0) {
      const solvedAttempts = problemAttempts.filter((a: any) => a.status === "solved");
      
      if (problemIds.length > 0) {
        // Did they solve a good chunk of the available problems?
        const uniqueSolved = new Set(solvedAttempts.map((a: any) => String(a.problemId))).size;
        const target = Math.min(5, problemIds.length);
        const volumeScore = Math.min(100, (uniqueSolved / target) * 100);
        
        // How independent were they?
        let independenceScore = 0;
        if (solvedAttempts.length > 0) {
          const independent = solvedAttempts.filter((a: any) => a.strategy === "independent").length;
          independenceScore = (independent / solvedAttempts.length) * 100;
        }

        implementationScore = Math.round(volumeScore * 0.6 + independenceScore * 0.4);
      }

      // Optimization: Unassessed without automated runtime benchmark or algorithmic judge
      // Preserve as unassessed rather than inferring from hint penalty
      optimizationScore = 0;
    }

    // 3.5 Explanation (from Structured Reflections) & 3.6 Edge Cases (Unassessed)
    let explanationScore = 0;
    let edgeCasesScore = 0;
    if (reflections.length > 0) {
      // Explanation: Quality score and self-ratings from reflection log
      const avgQuality = reflections.reduce((sum: number, r: any) => sum + (r.qualityScore || 0), 0) / reflections.length;
      const avgRating = reflections.reduce((sum: number, r: any) => sum + (r.selfRating || 3), 0) / reflections.length;
      explanationScore = Math.round(avgQuality * 0.6 + (avgRating * 20) * 0.4);
      // Edge cases: Not judged from keyword scanning. Kept unassessed until dedicated edge-case testing is available.
      edgeCasesScore = 0;
    }

    // 3.7 Retention (Revision grades - preserve zero grade strictly!)
    let retentionScore = 0;
    if (revisions.length > 0) {
      const grades = revisions.map((r: any) => (r.grade !== undefined && r.grade !== null ? Number(r.grade) : 3));
      retentionScore = Math.round((grades.reduce((a: number, b: number) => a + b, 0) / grades.length) * 20); // grade 5 = 100
    }

    // 4. Overall Assessment Score (Weighted Rubric)
    // Foundational understanding = 20%, problem-solving implementation = 35%, recognition = 15%, retention = 15%, edge cases/optimization/explanation = 15%
    // In accordance with Requirement 8.2: do not renormalize a tiny amount of evidence into a confident score
    const overallScore = Math.round(
      recognitionScore * 0.15 +
      understandingScore * 0.20 +
      implementationScore * 0.35 +
      retentionScore * 0.15 +
      optimizationScore * 0.05 +
      explanationScore * 0.05 +
      edgeCasesScore * 0.05
    );

    // 5. Persist Assessment Result
    const assessment = await AssessmentResultModel.create({
      userId: uid,
      entityType: "topic",
      entityId: tid,
      dimensions: {
        recognition: recognitionScore,
        understanding: understandingScore,
        implementation: implementationScore,
        optimization: optimizationScore,
        explanation: explanationScore,
        edgeCases: edgeCasesScore,
        retention: retentionScore,
      },
      overallScore,
      evidenceUsed,
      evidenceTypes: Array.from(evidenceTypes),
    });

    // 6. Update Mastery
    const progress = await TopicProgressModel.findOneAndUpdate(
      { userId: uid, topicId: tid },
      { $setOnInsert: { userId: uid, topicId: tid } },
      { upsert: true, new: true }
    );

    // Use dimensions directly
    progress.patternRecognitionScore = recognitionScore;
    progress.understandingScore = understandingScore;
    progress.implementationScore = implementationScore;
    progress.optimizationScore = optimizationScore;
    progress.explanationScore = explanationScore;
    progress.edgeCasesScore = edgeCasesScore;
    progress.retentionScore = retentionScore;
    
    // We also preserve some of the old aggregated fields for compatibility if we want
    progress.practiceScore = implementationScore; // Compatibility
    progress.reflectionScore = explanationScore; // Compatibility

    progress.masteryScore = overallScore;
    progress.state = overallScore >= 90 ? "mastered" : overallScore >= 75 ? "solid" : overallScore >= 45 ? "practicing" : overallScore > 0 ? "learning" : "unseen";
    
    await progress.save();

    return assessment;
  }
}

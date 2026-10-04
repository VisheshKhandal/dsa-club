import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  InterviewDrillModel,
  type IInterviewDrillDocument,
  type InterviewDrillStep,
} from "../models/interview-drill.model";
import { PracticeSessionModel } from "../models/practice-session.model";
import { ProblemModel } from "@/features/content/models/content.model";
import { getLearnerEpoch, executePracticeSubmission } from "../services/learning-command.service";
import { createOrGetMistakeRepair } from "@/features/intelligence/services/mistake-repair.service";
import { RevisionQueueModel } from "@/features/intelligence/models/intelligence.model";

export async function startOrResumeInterviewDrill(params: {
  userId: string | Types.ObjectId;
  problemSlug: string;
  timeboxMinutes?: number | null;
}): Promise<IInterviewDrillDocument> {
  await connectToDatabase();
  const userObjectId =
    params.userId instanceof Types.ObjectId ? params.userId : new Types.ObjectId(params.userId);

  const learningEpoch = await getLearnerEpoch(userObjectId);

  // 1. Check for existing active or paused drill
  const existing = await InterviewDrillModel.findOne({
    userId: userObjectId,
    learningEpoch,
    problemSlug: params.problemSlug,
    status: { $in: ["active", "paused"] },
  });

  if (existing) {
    if (existing.isPaused) {
      existing.isPaused = false;
      existing.status = "active";
      existing.lastResumedAt = new Date();
      await existing.save();
    }
    return existing;
  }

  // 2. Resolve problem and persistent practice session
  const problem = await ProblemModel.findOne({ slug: params.problemSlug });
  if (!problem) {
    throw new Error(`Problem "${params.problemSlug}" not found`);
  }

  let session = await PracticeSessionModel.findOne({
    userId: userObjectId,
    problemId: problem._id,
    learningEpoch,
    state: "active",
  });

  if (!session) {
    session = await PracticeSessionModel.create({
      userId: userObjectId,
      problemId: problem._id,
      contentVersion: 1,
      sourceSurface: "interview_drill",
      learningEpoch,
      state: "active",
      activeAttemptNumber: 1,
      hintsRevealedLevels: [],
      editorialViewed: false,
      aiAssisted: false,
      timerState: {
        accumulatedSeconds: 0,
        isRunning: true,
        startedAt: new Date(),
        lastHeartbeatAt: new Date(),
        provenance: "measured",
      },
      startedAt: new Date(),
      version: 1,
    });
  }

  // 3. Create drill
  const drillId = `idr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const drill = await InterviewDrillModel.create({
    drillId,
    userId: userObjectId,
    learningEpoch,
    problemSlug: params.problemSlug,
    practiceSessionId: session._id,
    currentStep: 1,
    timeboxMinutes: params.timeboxMinutes ?? 30,
    elapsedActiveSeconds: 0,
    isPaused: false,
    startedAt: new Date(),
    lastResumedAt: new Date(),
    status: "active",
  });

  return drill;
}

export async function advanceInterviewStep(params: {
  drillId: string;
  userId: string | Types.ObjectId;
  step: InterviewDrillStep;
  response: any;
}): Promise<IInterviewDrillDocument> {
  await connectToDatabase();
  const userObjectId =
    params.userId instanceof Types.ObjectId ? params.userId : new Types.ObjectId(params.userId);

  const drill = await InterviewDrillModel.findOne({
    drillId: params.drillId,
    userId: userObjectId,
  });

  if (!drill) {
    throw new Error(`Interview drill "${params.drillId}" not found`);
  }

  // Accumulate active seconds
  if (!drill.isPaused && drill.lastResumedAt) {
    const deltaSeconds = Math.max(
      0,
      Math.floor((Date.now() - new Date(drill.lastResumedAt).getTime()) / 1000)
    );
    drill.elapsedActiveSeconds += deltaSeconds;
    drill.lastResumedAt = new Date();
  }

  // Save response for current step
  const responses = drill.stepResponses || {};
  if (params.step === 1) responses.step1Constraints = params.response;
  if (params.step === 2) responses.step2Approach = params.response;
  if (params.step === 3) responses.step3Implementation = params.response;
  if (params.step === 4) responses.step4BoundaryCases = params.response;
  if (params.step === 5) responses.step5Complexity = params.response;
  drill.stepResponses = responses;

  // Advance step or finalize
  if (params.step < 5) {
    drill.currentStep = (params.step + 1) as InterviewDrillStep;
  } else if (params.step === 5) {
    drill.currentStep = 6;
    await finalizeInterviewDrillInternal(drill);
  }

  await drill.save();
  return drill;
}

export async function togglePauseInterviewDrill(params: {
  drillId: string;
  userId: string | Types.ObjectId;
  pause: boolean;
}): Promise<IInterviewDrillDocument> {
  await connectToDatabase();
  const userObjectId =
    params.userId instanceof Types.ObjectId ? params.userId : new Types.ObjectId(params.userId);

  const drill = await InterviewDrillModel.findOne({
    drillId: params.drillId,
    userId: userObjectId,
  });

  if (!drill) {
    throw new Error(`Interview drill "${params.drillId}" not found`);
  }

  if (params.pause && !drill.isPaused) {
    if (drill.lastResumedAt) {
      const deltaSeconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(drill.lastResumedAt).getTime()) / 1000)
      );
      drill.elapsedActiveSeconds += deltaSeconds;
    }
    drill.isPaused = true;
    drill.status = "paused";
    drill.lastResumedAt = null;
  } else if (!params.pause && drill.isPaused) {
    drill.isPaused = false;
    drill.status = "active";
    drill.lastResumedAt = new Date();
  }

  await drill.save();
  return drill;
}

async function finalizeInterviewDrillInternal(drill: IInterviewDrillDocument) {
  if (drill.status === "completed") {
    return;
  }
  drill.status = "completed";
  drill.completedAt = new Date();

  const impl = drill.stepResponses?.step3Implementation;
  const hintsUsed = impl?.hintsUsed || 0;
  const solutionViewed = Boolean(impl?.solutionViewed);
  const selfStatus = impl?.selfReportedStatus || "partially_solved";
  const isSolved = selfStatus === "solved";

  const demonstratedIndependence =
    hintsUsed === 0 && !solutionViewed && isSolved;

  const problem = await ProblemModel.findOne({ slug: drill.problemSlug });
  if (!problem) {
    throw new Error(`Problem "${drill.problemSlug}" not found`);
  }

  // 1. Canonical practice submission integration (FLOW-002)
  const commandId = `cmd-drill-${drill.drillId}`;
  const strategy = demonstratedIndependence
    ? "independent"
    : hintsUsed > 0
    ? "hint_assisted"
    : solutionViewed
    ? "editorial_assisted"
    : "revisited";

  let receiptAttemptId: string | null = null;
  let reviewScheduled = false;

  try {
    const submissionResult = await executePracticeSubmission({
      userId: drill.userId,
      commandId,
      problemId: problem._id.toString(),
      status: isSolved ? "solved" : "abandoned",
      strategy,
      durationSeconds: Math.max(1, drill.elapsedActiveSeconds),
      durationProvenance: "measured",
      hintsUsed,
      editorialViewed: solutionViewed,
      sessionId: drill.practiceSessionId ? String(drill.practiceSessionId) : undefined,
    });

    if (submissionResult.ok && submissionResult.receipt) {
      receiptAttemptId = submissionResult.receipt.attemptId || null;
      reviewScheduled = Boolean(submissionResult.receipt.reviewEffect);
    } else {
      throw new Error(
        `CANONICAL_PRACTICE_SUBMISSION_FAILED: ${
          submissionResult.error || "Practice submission failed"
        }`
      );
    }
  } catch (submissionErr: any) {
    console.error("Interview drill practice submission error:", submissionErr);
    throw submissionErr;
  }

  // 2. Mistake repair registration if difficulty or assistance was observed
  let repairScheduled = false;
  if (!demonstratedIndependence || !isSolved) {
    try {
      await createOrGetMistakeRepair({
        userId: drill.userId,
        sourceType: "problem_attempt",
        sourceId: receiptAttemptId || drill.problemSlug,
        capability: "two_pointers_invariant",
        topicSlug: "arrays",
        explicitMisconception:
          selfStatus === "blocked"
            ? "boundary_condition_issue"
            : hintsUsed > 0
            ? "implementation_difficulty"
            : "unknown_cause",
        hintsUsed,
        solutionViewed,
      });
      repairScheduled = true;
    } catch {
      // Non-fatal
    }
  }

  // 3. Factual debrief language: self-reported outcome and stated complexity
  const minutesSpent = Math.ceil(drill.elapsedActiveSeconds / 60);
  const factualOutcome = demonstratedIndependence
    ? `Completed 6-step interview format independently in ${minutesSpent}m (self-reported solve; stated O(n) time, O(1) auxiliary space).`
    : `Completed with guided assistance (${hintsUsed} hints used, self-reported: ${selfStatus}). Mistake repair drill queued.`;

  drill.debrief = {
    summary: `Structured interview practice: ${drill.problemSlug} (${minutesSpent}m actual elapsed time)`,
    demonstratedIndependence,
    hintsUsed,
    solutionViewed,
    repairScheduled,
    reviewScheduled,
    factualOutcome,
  };
}

import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  PracticeSessionModel,
  type IPracticeSessionDocument,
  type PracticeSessionState,
  type DurationProvenance,
} from "../models/practice-session.model";
import { ProblemAttemptModel } from "../models/learning.model";
import { ProblemModel } from "@/features/content/models/content.model";
import { getLearnerEpoch } from "./learning-command.service";
import { recordLearningEvent } from "@/features/intelligence/services/learning-event.service";

export interface ResumeOrCreateSessionInput {
  userId: string | Types.ObjectId;
  problemId: string;
  sourceSurface?: string;
  planContext?: {
    planId?: string | null;
    planDayId?: string | null;
    planTaskId?: string | null;
    planVersion?: number | null;
  } | null;
}

export interface PracticeSessionDTO {
  sessionId: string;
  problemId: string;
  state: PracticeSessionState;
  activeAttemptNumber: number;
  hintsRevealedLevels: number[];
  editorialViewed: boolean;
  aiAssisted: boolean;
  isAssisted: boolean;
  hasPriorExposure: boolean;
  priorAttemptsCount: number;
  timerState: {
    accumulatedSeconds: number;
    isRunning: boolean;
    provenance: DurationProvenance;
    lastStartedAt?: string | null;
  };
  planContext?: {
    planId?: string | null;
    planDayId?: string | null;
    planTaskId?: string | null;
  } | null;

  // Compatibility aliases for consumers reading alternate field names
  _id?: string;
  currentAttemptNumber?: number;
  priorExposure?: boolean;
}

/**
 * Resumes an active practice session for a problem or creates a new one.
 * Refreshing the page returns the active attempt state.
 */
export async function getOrCreatePracticeSession(
  input: ResumeOrCreateSessionInput
): Promise<PracticeSessionDTO> {
  await connectToDatabase();
  const userId =
    input.userId instanceof Types.ObjectId
      ? input.userId
      : new Types.ObjectId(input.userId);
  const problemObjectId = new Types.ObjectId(input.problemId);

  const learningEpoch = await getLearnerEpoch(userId);

  // Check prior attempts count to determine prior exposure
  const priorAttemptsCount = await ProblemAttemptModel.countDocuments({
    userId,
    learningEpoch,
    problemId: problemObjectId,
  });
  const hasPriorExposure = priorAttemptsCount > 0;

  // Find active or paused session
  let session = await PracticeSessionModel.findOne({
    userId,
    learningEpoch,
    problemId: problemObjectId,
    state: { $in: ["active", "paused"] },
  });

  if (!session) {
    const attemptNumber = priorAttemptsCount + 1;
    session = await PracticeSessionModel.create({
      userId,
      learningEpoch,
      problemId: problemObjectId,
      contentVersion: 1,
      sourceSurface: input.sourceSurface || "workspace",
      planContext: input.planContext
        ? {
            planId: input.planContext.planId ? new Types.ObjectId(input.planContext.planId) : null,
            planDayId: input.planContext.planDayId ? new Types.ObjectId(input.planContext.planDayId) : null,
            planTaskId: input.planContext.planTaskId ? new Types.ObjectId(input.planContext.planTaskId) : null,
            planVersion: input.planContext.planVersion ?? null,
          }
        : undefined,
      state: "active",
      activeAttemptNumber: attemptNumber,
      hintsRevealedLevels: [],
      editorialViewed: false,
      aiAssisted: false,
      timerState: {
        accumulatedSeconds: 0,
        isRunning: false,
        startedAt: null,
        lastHeartbeatAt: null,
        provenance: "unknown",
      },
      startedAt: new Date(),
    });
  }

  const isAssisted =
    session.hintsRevealedLevels.length > 0 || session.editorialViewed || session.aiAssisted;

  const sessionIdStr = String(session._id);
  const timerStartedAtStr = session.timerState?.startedAt ? new Date(session.timerState.startedAt).toISOString() : null;

  return {
    sessionId: sessionIdStr,
    _id: sessionIdStr,
    problemId: String(session.problemId),
    state: session.state,
    activeAttemptNumber: session.activeAttemptNumber,
    currentAttemptNumber: session.activeAttemptNumber,
    hintsRevealedLevels: session.hintsRevealedLevels,
    editorialViewed: session.editorialViewed,
    aiAssisted: session.aiAssisted,
    isAssisted,
    hasPriorExposure,
    priorExposure: hasPriorExposure,
    priorAttemptsCount,
    timerState: {
      accumulatedSeconds: session.timerState.accumulatedSeconds,
      isRunning: session.timerState.isRunning,
      provenance: session.timerState.provenance,
      lastStartedAt: timerStartedAtStr,
    },
    planContext: session.planContext
      ? {
          planId: session.planContext.planId ? String(session.planContext.planId) : null,
          planDayId: session.planContext.planDayId ? String(session.planContext.planDayId) : null,
          planTaskId: session.planContext.planTaskId ? String(session.planContext.planTaskId) : null,
        }
      : null,
  };
}

/**
 * Starts a fresh attempt on the current problem ("Try again").
 * Resets attempt-scoped assistance (hints, editorial) while preserving prior exposure and plan context.
 */
export async function startFreshAttempt(
  userId: string | Types.ObjectId,
  problemId: string,
  options?: {
    planTaskId?: string | null;
    planContext?: {
      planId?: string | null;
      planDayId?: string | null;
      planTaskId?: string | null;
      planVersion?: number | null;
    } | null;
  }
): Promise<PracticeSessionDTO> {
  await connectToDatabase();
  const uid = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const problemObjectId = new Types.ObjectId(problemId);
  const learningEpoch = await getLearnerEpoch(uid);

  const previousSession = await PracticeSessionModel.findOne({
    userId: uid,
    learningEpoch,
    problemId: problemObjectId,
  }).sort({ activeAttemptNumber: -1 });

  // Close previous active session if any
  await PracticeSessionModel.updateMany(
    {
      userId: uid,
      learningEpoch,
      problemId: problemObjectId,
      state: { $in: ["active", "paused"] },
    },
    {
      $set: { state: "abandoned", completedAt: new Date() },
    }
  );

  const priorAttemptsCount = await ProblemAttemptModel.countDocuments({
    userId: uid,
    learningEpoch,
    problemId: problemObjectId,
  });

  const nextAttemptNumber = Math.max(
    priorAttemptsCount + 1,
    (previousSession?.activeAttemptNumber || 0) + 1
  );

  // Preserve planContext from options or inherited from previous session
  let planContextDoc: any = undefined;
  if (options?.planContext) {
    planContextDoc = {
      planId: options.planContext.planId ? new Types.ObjectId(options.planContext.planId) : null,
      planDayId: options.planContext.planDayId ? new Types.ObjectId(options.planContext.planDayId) : null,
      planTaskId: options.planContext.planTaskId ? new Types.ObjectId(options.planContext.planTaskId) : null,
      planVersion: options.planContext.planVersion ?? null,
    };
  } else if (options?.planTaskId) {
    planContextDoc = {
      planId: previousSession?.planContext?.planId ?? null,
      planDayId: previousSession?.planContext?.planDayId ?? null,
      planTaskId: new Types.ObjectId(options.planTaskId),
      planVersion: previousSession?.planContext?.planVersion ?? null,
    };
  } else if (previousSession?.planContext) {
    planContextDoc = previousSession.planContext;
  }

  const session = await PracticeSessionModel.create({
    userId: uid,
    learningEpoch,
    problemId: problemObjectId,
    state: "active",
    activeAttemptNumber: nextAttemptNumber,
    hintsRevealedLevels: [],
    editorialViewed: false,
    aiAssisted: false,
    planContext: planContextDoc || undefined,
    timerState: {
      accumulatedSeconds: 0,
      isRunning: false,
      startedAt: null,
      lastHeartbeatAt: null,
      provenance: "unknown",
    },
    startedAt: new Date(),
  });

  const sessionIdStr = String(session._id);

  return {
    sessionId: sessionIdStr,
    _id: sessionIdStr,
    problemId: String(session.problemId),
    state: session.state,
    activeAttemptNumber: nextAttemptNumber,
    currentAttemptNumber: nextAttemptNumber,
    hintsRevealedLevels: [],
    editorialViewed: false,
    aiAssisted: false,
    isAssisted: false,
    hasPriorExposure: true,
    priorExposure: true,
    priorAttemptsCount,
    timerState: {
      accumulatedSeconds: 0,
      isRunning: false,
      provenance: "unknown",
      lastStartedAt: null,
    },
    planContext: session.planContext
      ? {
          planId: session.planContext.planId ? String(session.planContext.planId) : null,
          planDayId: session.planContext.planDayId ? String(session.planContext.planDayId) : null,
          planTaskId: session.planContext.planTaskId ? String(session.planContext.planTaskId) : null,
        }
      : null,
  };
}

/**
 * Records hint revelation within the active attempt.
 * INVARIANT: Client cannot lower already revealed hint levels!
 * Validates hint level against problem definition.
 * Emits canonical hint_revealed event for topic progress projections.
 */
export async function recordAttemptHintReveal(
  userId: string | Types.ObjectId,
  problemId: string,
  hintLevel: number
): Promise<{ ok: boolean; hintsRevealedLevels: number[]; isAssisted: boolean }> {
  await connectToDatabase();
  const uid = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const problemObjectId = new Types.ObjectId(problemId);
  const learningEpoch = await getLearnerEpoch(uid);

  // Validate hint level against published problem hints
  const problem = await ProblemModel.findById(problemObjectId).select("hints").lean();
  const maxAvailableLevel = (problem?.hints && problem.hints.length > 0) ? problem.hints.length : 5;
  const validLevel = Math.min(maxAvailableLevel, Math.max(1, hintLevel));

  const session = await PracticeSessionModel.findOne({
    userId: uid,
    learningEpoch,
    problemId: problemObjectId,
    state: { $in: ["active", "paused"] },
  });

  if (!session) {
    return { ok: false, hintsRevealedLevels: [validLevel], isAssisted: true };
  }

  // Monotonic addition: client cannot lower assistance
  if (!session.hintsRevealedLevels.includes(validLevel)) {
    session.hintsRevealedLevels.push(validLevel);
    session.hintsRevealedLevels.sort((a: number, b: number) => a - b);
    await session.save();

    await recordLearningEvent({
      userId: uid,
      learningEpoch,
      eventType: "hint_revealed",
      idempotencyKey: `hint-rev:${uid}:${problemObjectId}:${validLevel}:${learningEpoch}`,
      problemId: problemObjectId,
      sessionId: String(session._id),
      payload: {
        hintLevel: validLevel,
        totalHintsRevealed: session.hintsRevealedLevels.length,
      },
    }).catch(() => {});
  }

  return {
    ok: true,
    hintsRevealedLevels: session.hintsRevealedLevels,
    isAssisted: true,
  };
}

/**
 * Updates persistent timer state (heartbeat or pause).
 */
export async function updateSessionTimerState(
  userId: string | Types.ObjectId,
  problemId: string,
  timerUpdate: {
    accumulatedSeconds: number;
    isRunning: boolean;
    provenance: DurationProvenance;
  }
): Promise<void> {
  await connectToDatabase();
  const uid = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const problemObjectId = new Types.ObjectId(problemId);
  const learningEpoch = await getLearnerEpoch(uid);

  await PracticeSessionModel.updateOne(
    {
      userId: uid,
      learningEpoch,
      problemId: problemObjectId,
      state: { $in: ["active", "paused"] },
    },
    {
      $set: {
        "timerState.accumulatedSeconds": Math.max(0, timerUpdate.accumulatedSeconds),
        "timerState.isRunning": timerUpdate.isRunning,
        "timerState.provenance": timerUpdate.provenance,
        "timerState.lastHeartbeatAt": new Date(),
      },
    }
  );
}

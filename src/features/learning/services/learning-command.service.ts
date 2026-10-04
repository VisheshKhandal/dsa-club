import crypto from "node:crypto";
import { Types, type ClientSession } from "mongoose";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  LearningCommandModel,
  type LearningCommandKind,
  type LearningReceipt,
  type PlanEffectSummary,
  type ReviewEffectSummary,
} from "../models/learning-command.model";
import { UserModel } from "@/features/identity/models/user.model";
import {
  ProblemAttemptModel,
  ReflectionLogModel,
} from "../models/learning.model";
import { PracticeSessionModel } from "../models/practice-session.model";
import {
  RevisionQueueModel,
  RevisionHistoryModel,
} from "@/features/intelligence/models/intelligence.model";
import { PlanModel } from "@/features/intelligence/models/plan.model";
import { PlanDayModel } from "@/features/intelligence/models/plan-day.model";
import { PlanTaskModel } from "@/features/intelligence/models/plan-task.model";
import { LearningEventModel } from "@/features/intelligence/models/learning-event.model";
import { LearningDeliveryModel } from "@/features/intelligence/models/learning-delivery.model";
import {
  enqueueDeliveries,
  type EnqueueDeliveryInput,
} from "@/features/intelligence/services/learning-delivery.service";
import { recordLearningEvent } from "@/features/intelligence/services/learning-event.service";
import { advancePlanDayIfComplete } from "@/features/intelligence/actions/plan-actions";
import { resolveUserActivePlan } from "@/features/intelligence/services/plan-migration.service";
import { resolveCurrentPlanDay } from "@/features/intelligence/services/learning-execution-snapshot";
import { ProblemModel } from "@/features/content/models/content.model";
import { resolveGenuineTopicSlug } from "@/features/intelligence/planning/topic-catalog";
import {
  resolveTaskRequirement,
  evaluateTaskCompletion,
} from "@/features/intelligence/services/completion-evaluator";
import { computeSchedule } from "@/features/revision/services/revision.service";

export interface ExecutePracticeSubmissionParams {
  userId: string | Types.ObjectId;
  commandId: string;
  problemId: string;
  status: "solved" | "started" | "abandoned";
  strategy: "independent" | "hint_assisted" | "editorial_assisted" | "revisited";
  durationSeconds: number;
  durationProvenance?: "measured" | "reported" | "unknown";
  hintsUsed?: number;
  hintsRevealedLevels?: number[];
  editorialViewed?: boolean;
  aiAssisted?: boolean;
  selfConfidence?: number;
  perceivedDifficulty?: number;
  codeLanguage?: string | null;
  reflection?: string | null;
  planTaskId?: string | null;
  sessionId?: string | null;
}

export interface ExecuteReviewSubmissionParams {
  userId: string | Types.ObjectId;
  commandId: string;
  queueId: string;
  grade: 0 | 1 | 2 | 3 | 4 | 5;
  confidence: number;
  responseSeconds: number;
  recallText?: string;
  quizAnswer?: string | null;
  patternNotes?: string;
  dryRunDone?: boolean;
  summary?: string;
  planTaskId?: string | null;
  assisted?: boolean;
  hintsUsed?: number;
  solutionViewed?: boolean;
}

export interface LearningCommandResult {
  ok: boolean;
  receipt?: LearningReceipt;
  isDuplicate?: boolean;
  error?: string;
  conflict?: boolean;
  status?: number;
}

/**
 * Deterministically serializes an object with sorted keys and computes a SHA-256 hash.
 */
export function computePayloadHash(payload: Record<string, unknown>): string {
  const sortedKeys = Object.keys(payload).sort();
  const normalized: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    const val = payload[key];
    if (val !== undefined) {
      normalized[key] = val;
    }
  }
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");
}

/**
 * Checks if the current MongoDB connection supports multi-document transactions.
 */
export async function canUseTransactions(): Promise<boolean> {
  try {
    if (mongoose.connection.readyState !== 1) return false;
    const client = mongoose.connection.getClient();
    const topologyType = (client as any)?.topology?.description?.type;
    if (
      topologyType === "ReplicaSetWithPrimary" ||
      topologyType === "Sharded" ||
      topologyType === "LoadBalanced"
    ) {
      return true;
    }
    // Fallback: check admin serverStatus if available
    try {
      const adminDb = mongoose.connection.db?.admin();
      if (adminDb) {
        const serverStatus = await adminDb.serverStatus();
        if (serverStatus?.repl || serverStatus?.process === "mongos") return true;
      }
    } catch {
      // serverStatus might fail due to lack of admin permissions
    }
    const session = await mongoose.startSession();
    try {
      const isRepl = Boolean(
        (session as any).client?.topology?.description?.type !== "Single"
      );
      await session.endSession();
      return isRepl;
    } catch {
      await session.endSession().catch(() => {});
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Retrieves the current learning epoch for a user.
 */
export async function getLearnerEpoch(userId: Types.ObjectId): Promise<number> {
  const user = await UserModel.findById(userId).select("learningEpoch").lean();
  return user?.learningEpoch ?? 1;
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * PRACTICE SUBMISSION BOUNDARY
 * ══════════════════════════════════════════════════════════════════════════════
 */
export async function executePracticeSubmission(
  params: ExecutePracticeSubmissionParams
): Promise<LearningCommandResult> {
  await connectToDatabase();
  const userId =
    params.userId instanceof Types.ObjectId
      ? params.userId
      : new Types.ObjectId(params.userId);

  if (!Types.ObjectId.isValid(params.problemId)) {
    return {
      ok: false,
      status: 400,
      error: `Invalid problemId format: "${params.problemId}".`,
    };
  }
  const problemObjectId = new Types.ObjectId(params.problemId);

  const learningEpoch = await getLearnerEpoch(userId);

  // 1. Resolve and validate problem
  const problemQuery = ProblemModel.findById(problemObjectId);
  const problem = (problemQuery && typeof (problemQuery as any).select === "function")
    ? await (problemQuery as any).select("slug topicIds estimatedMinutes title").lean()
    : (problemQuery && typeof (problemQuery as any).lean === "function")
    ? await (problemQuery as any).lean()
    : await problemQuery;

  if (!problem) {
    return {
      ok: false,
      status: 404,
      error: `Problem "${params.problemId}" not found.`,
    };
  }

  // 2. Locate active practice session and enforce association
  let activeSession: any = null;
  if (params.sessionId) {
    if (!Types.ObjectId.isValid(params.sessionId)) {
      return {
        ok: false,
        status: 400,
        error: `Invalid session ID format: "${params.sessionId}".`,
      };
    }
    const sessionDoc = await PracticeSessionModel.findById(new Types.ObjectId(params.sessionId));
    if (!sessionDoc) {
      return {
        ok: false,
        status: 404,
        error: `Practice session "${params.sessionId}" not found.`,
      };
    }
    if (String(sessionDoc.userId) !== String(userId)) {
      return {
        ok: false,
        conflict: true,
        status: 403,
        error: "SESSION_OWNER_MISMATCH: Practice session belongs to another learner.",
      };
    }
    if (sessionDoc.learningEpoch !== learningEpoch) {
      return {
        ok: false,
        conflict: true,
        status: 409,
        error: "SESSION_EPOCH_MISMATCH: Practice session was created in a previous learning epoch.",
      };
    }
    if (String(sessionDoc.problemId) !== String(problemObjectId)) {
      return {
        ok: false,
        conflict: true,
        status: 400,
        error: "SESSION_PROBLEM_MISMATCH: Practice session does not belong to the submitted problem.",
      };
    }
    activeSession = sessionDoc;
  } else {
    activeSession = await PracticeSessionModel.findOne({
      userId,
      learningEpoch,
      problemId: problemObjectId,
      state: { $in: ["active", "paused"] },
    });
  }

  // Two-tab / finalized session protection:
  if (activeSession && activeSession.state === "completed") {
    if (activeSession.finalizedCommandId === params.commandId) {
      const prevCmd = await LearningCommandModel.findOne({
        userId,
        learningEpoch,
        commandId: params.commandId,
      }).lean();
      if (prevCmd) {
        return {
          ok: true,
          receipt: prevCmd.receipt,
          isDuplicate: true,
        };
      }
    } else {
      return {
        ok: false,
        conflict: true,
        status: 409,
        error: "SESSION_ALREADY_COMPLETED: This practice session has already been finalized by another submission.",
      };
    }
  }

  // 3. Semantic normalization & payload hash (merging server-persisted session assistance)
  const sessionHints: number[] = Array.isArray(activeSession?.hintsRevealedLevels)
    ? activeSession.hintsRevealedLevels
    : [];
  const mergedHints = [...new Set([...sessionHints, ...(params.hintsRevealedLevels ?? [])])].sort((a: number, b: number) => a - b);
  const hintsUsed = Math.max(mergedHints.length, Number(params.hintsUsed ?? 0), Number(activeSession?.hintsUsed ?? 0));
  const editorialViewed = Boolean(params.editorialViewed || activeSession?.editorialViewed);
  const aiAssisted = Boolean(params.aiAssisted || activeSession?.aiAssisted);

  // Honest assistance: any hints, editorial view, or AI assist categorizes strategy as assisted
  let effectiveStrategy = params.strategy;
  if (hintsUsed > 0 || editorialViewed || aiAssisted) {
    if (effectiveStrategy === "independent") {
      effectiveStrategy = "hint_assisted";
    }
  }

  // Duration provenance: if 0 was passed and provenance is unknown/unspecified, honest label is unknown
  const durationSeconds = Math.max(0, Number(params.durationSeconds ?? 0));
  const durationProvenance =
    params.durationProvenance ?? (durationSeconds > 0 ? "measured" : "unknown");

  const normalizedSemanticPayload: Record<string, unknown> = {
    problemId: params.problemId,
    status: params.status,
    strategy: effectiveStrategy,
    durationSeconds,
    durationProvenance,
    hintsUsed,
    hintsRevealedLevels: mergedHints,
    editorialViewed,
    aiAssisted,
    selfConfidence: params.selfConfidence,
    perceivedDifficulty: params.perceivedDifficulty,
    codeLanguage: params.codeLanguage ?? null,
    reflection: params.reflection?.trim() || null,
    planTaskId: params.planTaskId || null,
  };

  const payloadHash = computePayloadHash(normalizedSemanticPayload);

  // 4. Pre-check idempotency gate
  const existingCommand = await LearningCommandModel.findOne({
    userId,
    learningEpoch,
    commandId: params.commandId,
  });

  if (existingCommand) {
    if (existingCommand.payloadHash === payloadHash) {
      return {
        ok: true,
        receipt: existingCommand.receipt,
        isDuplicate: true,
      };
    } else {
      return {
        ok: false,
        conflict: true,
        status: 409,
        error: `IDEMPOTENCY_CONFLICT: Command ID "${params.commandId}" was previously submitted with a different payload.`,
      };
    }
  }

  const attemptNumber = activeSession ? activeSession.activeAttemptNumber : 1;

  const primaryTopicId = problem?.topicIds?.[0] ?? null;
  const genuineTopicSlug = await resolveGenuineTopicSlug(primaryTopicId);

  // 5. Safe transaction execution (strict atomicity requirement)
  const supportsTx = await canUseTransactions();
  if (!supportsTx) {
    return {
      ok: false,
      status: 503,
      error: "TRANSACTION_UNAVAILABLE: Multi-document transactions are required for practice submission atomicity.",
    };
  }

  const dbSession = await mongoose.startSession();

  let receipt: LearningReceipt;
  const deliveriesToEnqueue: EnqueueDeliveryInput[] = [];

  const executeCoreWrites = async (session?: ClientSession) => {
    // A. Create or update finalized attempt
    const attemptId = new Types.ObjectId();
    const createdAttempt = await ProblemAttemptModel.create(
      [
        {
          _id: attemptId,
          userId,
          learningEpoch,
          problemId: problemObjectId,
          attemptNumber,
          status: params.status,
          outcomeSource: "learner-reported",
          strategy: effectiveStrategy,
          durationSeconds,
          durationProvenance,
          hintsUsed,
          hintsRevealedLevels: mergedHints,
          editorialViewed,
          aiAssisted,
          selfConfidence: params.selfConfidence ?? 3,
          perceivedDifficulty: params.perceivedDifficulty ?? 3,
          codeLanguage: params.codeLanguage ?? null,
          commandId: params.commandId,
          sessionId: activeSession ? String(activeSession._id) : null,
          startedAt: activeSession?.startedAt ?? new Date(),
          completedAt: new Date(),
        },
      ],
      { session }
    );
    const attempt = Array.isArray(createdAttempt) ? createdAttempt[0] : createdAttempt;

    // B. Reflection (if bundled in the same action)
    let reflectionDoc: any = null;
    const trimmedReflection = params.reflection?.trim();
    if (trimmedReflection && trimmedReflection.length >= 10) {
      const createdReflection = await ReflectionLogModel.create(
        [
          {
            userId,
            topicId: primaryTopicId ? new Types.ObjectId(primaryTopicId) : null,
            problemAttemptId: attempt._id,
            entityType: "problem",
            entityId: problemObjectId,
            promptVersion: "problem-learning-v1",
            content: trimmedReflection,
            selfRating: params.selfConfidence ?? 3,
          },
        ],
        { session }
      );
      reflectionDoc = Array.isArray(createdReflection) ? createdReflection[0] : createdReflection;
      attempt.reflectionId = reflectionDoc._id;
      if (typeof attempt.save === "function") {
        await attempt.save({ session });
      }
    }

    // C. Update practice session state if present
    if (activeSession) {
      activeSession.state = "completed";
      activeSession.finalizedCommandId = params.commandId;
      activeSession.completedAt = new Date();
      activeSession.hintsRevealedLevels = mergedHints;
      activeSession.editorialViewed = editorialViewed;
      activeSession.aiAssisted = aiAssisted;
      activeSession.timerState.accumulatedSeconds = durationSeconds;
      activeSession.timerState.provenance = durationProvenance;
      activeSession.timerState.isRunning = false;
      await activeSession.save({ session });
    }

    // D. Safe Plan Reconciliation
    const planEffect: PlanEffectSummary = {
      status: "not_applicable",
    };

    let plan: any = null;
    let days: any[] = [];
    let tasks: any[] = [];
    try {
      const planQuery = PlanModel.findOne({ userId, status: "active" });
      plan = planQuery && typeof (planQuery as any).lean === "function" ? await (planQuery as any).lean() : await planQuery;
      if (plan && plan.status === "active") {
        const daysQuery = PlanDayModel.find({ planId: plan._id });
        days = daysQuery && typeof (daysQuery as any).sort === "function"
          ? await (daysQuery as any).sort({ dayIndex: 1 }).lean()
          : (daysQuery && typeof (daysQuery as any).lean === "function")
          ? await (daysQuery as any).lean()
          : (await daysQuery) || [];
        const tasksQuery = PlanTaskModel.find({ planId: plan._id });
        tasks = tasksQuery && typeof (tasksQuery as any).sort === "function"
          ? await (tasksQuery as any).sort({ dayIndex: 1, order: 1 }).lean()
          : (tasksQuery && typeof (tasksQuery as any).lean === "function")
          ? await (tasksQuery as any).lean()
          : (await tasksQuery) || [];
      }
    } catch {
      // Off-plan learning is preserved even if plan lookups fail
    }

    if (plan && plan.status === "active") {
      const currentPlanDay = resolveCurrentPlanDay(plan, days, new Date(), plan.timezone);
      if (currentPlanDay) {
        const currentDayId = String(currentPlanDay._id);

        let matchingTask: any = null;
        if (params.planTaskId && Types.ObjectId.isValid(params.planTaskId)) {
          matchingTask = tasks.find(
            (t: any) =>
              String(t._id) === String(params.planTaskId) &&
              String(t.planDayId) === currentDayId &&
              t.entityType === "problem" &&
              t.entityId &&
              String(t.entityId) === String(problemObjectId)
          );
        }

        // If not matched by exact planTaskId, match on actionable day only if problemId matches and no explicit planTaskId was provided
        if (!matchingTask && !params.planTaskId) {
          matchingTask = tasks.find(
            (t: any) =>
              String(t.planDayId) === currentDayId &&
              t.entityType === "problem" &&
              t.entityId &&
              String(t.entityId) === String(problemObjectId)
          );
        }

        if (matchingTask) {
          if (matchingTask.status === "completed") {
            planEffect.status = "already_completed";
            planEffect.planTaskId = String(matchingTask._id);
          } else {
            const requirement = resolveTaskRequirement(matchingTask);
            const evalResult = evaluateTaskCompletion(requirement, {
              passed: params.status === "solved",
              score: params.status === "solved" ? 100 : 0,
              strategy: effectiveStrategy,
              hintsUsed,
              editorialViewed,
              aiAssisted,
              isAttemptSubmitted: true,
            });

            const actualMinutes = Math.round(durationSeconds / 60);

            if (evalResult.qualifies) {
              await PlanTaskModel.updateOne(
                { _id: matchingTask._id, status: { $ne: "completed" } },
                {
                  $set: {
                    status: "completed",
                    completedAt: new Date(),
                    actualMinutes,
                    evidence: {
                      problemAttemptId: attempt._id,
                      score: params.status === "solved" ? 100 : 0,
                      passed: params.status === "solved",
                      hintsUsed,
                      strategy: effectiveStrategy,
                      independentSolve: effectiveStrategy === "independent" && hintsUsed === 0 && !editorialViewed && !aiAssisted,
                    },
                  },
                },
                { session }
              );

              planEffect.status = "completed";
              planEffect.planTaskId = String(matchingTask._id);

              // Check if day can advance
              const advanceResult = await advancePlanDayIfComplete({
                planDayId: currentPlanDay._id as Types.ObjectId,
                planId: plan._id as Types.ObjectId,
                userObjectId: userId,
                session,
              });

              planEffect.dayAdvanced = Boolean(advanceResult.dayAdvanced);
              planEffect.nextDayIndex = advanceResult.nextDayIndex;
            } else {
              // Valid attempt recorded, but did not qualify to mark this specific requirement complete (e.g. solve_independently failed)
              await PlanTaskModel.updateOne(
                { _id: matchingTask._id, status: { $ne: "completed" } },
                {
                  $set: {
                    status: "in_progress",
                    actualMinutes,
                    "evidence.problemAttemptId": attempt._id,
                    "evidence.passed": params.status === "solved",
                  },
                },
                { session }
              );
              planEffect.status = "not_applicable";
              planEffect.planTaskId = String(matchingTask._id);
            }
          }
        } else if (params.planTaskId) {
          planEffect.status = "stale_context";
        }
      }
    }

    // E. Emit Canonical Learning Events
    // Event 1: problem_attempted
    const attemptEvent = await recordLearningEvent(
      {
        userId,
        learningEpoch,
        eventType: "problem_attempted",
        idempotencyKey: `problem-attempt:${attempt._id}`,
        problemId: problemObjectId,
        topicId: primaryTopicId ? new Types.ObjectId(primaryTopicId) : undefined,
        topicSlug: genuineTopicSlug,
        sessionId: activeSession ? String(activeSession._id) : undefined,
        payload: {
          attemptNumber,
          passed: params.status === "solved",
          minutesSpent: Math.round(durationSeconds / 60),
          strategy: effectiveStrategy,
          hintsUsed,
          selfConfidence: params.selfConfidence,
        },
      },
      { session }
    );

    // Event 2: task_completed if on-plan
    if (planEffect.status === "completed" && planEffect.planTaskId) {
      await recordLearningEvent(
        {
          userId,
          learningEpoch,
          eventType: "task_completed",
          idempotencyKey: `task-completed-${planEffect.planTaskId}-${attempt._id}`,
          planTaskId: new Types.ObjectId(planEffect.planTaskId),
          problemId: problemObjectId,
          topicId: primaryTopicId ? new Types.ObjectId(primaryTopicId) : undefined,
          topicSlug: genuineTopicSlug,
          payload: {
            minutesSpent: Math.round(durationSeconds / 60),
            score: params.status === "solved" ? 100 : 0,
            passed: params.status === "solved",
            independentSolve: effectiveStrategy === "independent" && hintsUsed === 0 && !editorialViewed && !aiAssisted,
            hintsUsed,
            problemAttemptId: String(attempt._id),
          },
        },
        { session }
      );
    }

    // F. Downstream deliveries (Projection update & XP)
    if (genuineTopicSlug && attemptEvent.event) {
      deliveriesToEnqueue.push({
        userId,
        learningEpoch,
        deliveryKey: `topic_proj:${attemptEvent.event._id}`,
        handler: "topic_progress_projection",
        eventId: attemptEvent.event._id as Types.ObjectId,
        commandId: params.commandId,
      });
    }

    if (params.status === "solved") {
      deliveriesToEnqueue.push({
        userId,
        learningEpoch,
        deliveryKey: `xp:solve:${attempt._id}`,
        handler: "gamification_xp",
        commandId: params.commandId,
        payload: {
          xpAmount: 100,
          eventType: "problem",
          idempotencyKey: `problem-solve:${attempt._id}`,
          entityId: String(problemObjectId),
        },
      });

      deliveriesToEnqueue.push({
        userId,
        learningEpoch,
        deliveryKey: `stats:solve:${attempt._id}`,
        handler: "activity_statistics",
        commandId: params.commandId,
        payload: {
          inc: { solvedProblems: 1 },
        },
      });
    }

    // G. Automatic Review Scheduling (FLOW-001)
    let reviewEffect: ReviewEffectSummary | undefined = undefined;
    const isSolved = params.status === "solved";
    const isSubstantiveAttempt =
      params.status === "started" && (durationSeconds >= 45 || Boolean(params.reflection?.trim()));

    if (isSolved || isSubstantiveAttempt) {
      const isIndependent =
        effectiveStrategy === "independent" && hintsUsed === 0 && !editorialViewed && !aiAssisted;
      const candidateIntervalDays = 1;
      const candidateEaseFactor = isSolved ? (isIndependent ? 2.3 : 2.1) : 2.0;
      const candidatePriority = isSolved ? (isIndependent ? 50 : 70) : 75;
      const candidateDueAt = new Date(Date.now() + candidateIntervalDays * 24 * 60 * 60 * 1000);

      const existingQueue = await RevisionQueueModel.findOne({
        userId,
        entityType: "problem",
        entityId: problemObjectId,
      }).session(session);

      let savedQueue: any = null;

      if (existingQueue) {
        const now = new Date();
        const isAlreadyDue = existingQueue.dueAt && new Date(existingQueue.dueAt).getTime() <= now.getTime();
        const isDueSooner =
          existingQueue.dueAt && new Date(existingQueue.dueAt).getTime() < candidateDueAt.getTime();

        // INVARIANT: Do NOT automatically postpone an overdue review because the learner practiced the same problem again!
        if (isAlreadyDue || isDueSooner) {
          existingQueue.state = isAlreadyDue ? "due" : existingQueue.state;
          existingQueue.priority = Math.max(existingQueue.priority, candidatePriority);
          existingQueue.version = (existingQueue.version || 1) + 1;
          savedQueue = await existingQueue.save({ session });
        } else {
          existingQueue.state = "scheduled";
          existingQueue.dueAt = candidateDueAt;
          existingQueue.priority = Math.max(existingQueue.priority, candidatePriority);
          existingQueue.intervalDays = candidateIntervalDays;
          existingQueue.version = (existingQueue.version || 1) + 1;
          savedQueue = await existingQueue.save({ session });
        }
      } else {
        const createdQueues = await RevisionQueueModel.create(
          [
            {
              userId,
              entityType: "problem",
              entityId: problemObjectId,
              state: "scheduled",
              dueAt: candidateDueAt,
              intervalDays: candidateIntervalDays,
              easeFactor: candidateEaseFactor,
              repetitions: 0,
              lapses: 0,
              priority: candidatePriority,
              source: "attempt",
              version: 1,
            },
          ],
          { session }
        );
        savedQueue = createdQueues[0];
      }

      if (savedQueue) {
        reviewEffect = {
          queueId: String(savedQueue._id),
          nextIntervalDays: savedQueue.intervalDays,
          dueAt: savedQueue.dueAt ? new Date(savedQueue.dueAt).toISOString() : null,
        };
      }
    }

    // Enqueue outbox deliveries atomically
    await enqueueDeliveries(deliveriesToEnqueue, session);

    // H. Formulate typed receipt
    receipt = {
      commandId: params.commandId,
      commandKind: "practice_submission",
      sessionId: activeSession ? String(activeSession._id) : null,
      attemptId: String(attempt._id),
      committedAt: new Date().toISOString(),
      learningEpoch,
      outcome: params.status,
      outcomeSource: "learner-reported",
      durationProvenance,
      durationSeconds,
      assistanceSummary: {
        hintsUsed,
        editorialViewed,
        aiAssisted,
        strategy: effectiveStrategy,
      },
      planEffect,
      reviewEffect,
      downstreamStatus: "pending",
      safeContinuation: {
        nextProblemSlug: problem?.slug,
      },
    };

    // H. Persist Learning Command
    await LearningCommandModel.create(
      [
        {
          userId,
          learningEpoch,
          commandId: params.commandId,
          commandKind: "practice_submission",
          payloadHash,
          status: "committed",
          receipt,
          downstreamStatus: "pending",
        },
      ],
      { session }
    );
  };

  try {
    await dbSession.withTransaction(async () => {
      await executeCoreWrites(dbSession);
    });
  } catch (txError: any) {
    // Concurrency race: check if command was written by parallel worker
    if (txError?.code === 11000 || String(txError?.message).includes("E11000")) {
      const raceExisting = await LearningCommandModel.findOne({
        userId,
        learningEpoch,
        commandId: params.commandId,
      });
      if (raceExisting) {
        if (raceExisting.payloadHash === payloadHash) {
          return {
            ok: true,
            receipt: raceExisting.receipt,
            isDuplicate: true,
          };
        } else {
          return {
            ok: false,
            conflict: true,
            status: 409,
            error: `IDEMPOTENCY_CONFLICT: Command ID "${params.commandId}" was previously submitted with a different payload.`,
          };
        }
      }
    }
    throw txError;
  } finally {
    await dbSession.endSession();
  }

  return {
    ok: true,
    receipt: receipt!,
    isDuplicate: false,
  };
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * REVIEW SUBMISSION BOUNDARY
 * ══════════════════════════════════════════════════════════════════════════════
 */
export async function executeReviewSubmission(
  params: ExecuteReviewSubmissionParams
): Promise<LearningCommandResult> {
  await connectToDatabase();
  const userId =
    params.userId instanceof Types.ObjectId
      ? params.userId
      : new Types.ObjectId(params.userId);
  const queueObjectId = new Types.ObjectId(params.queueId);

  const learningEpoch = await getLearnerEpoch(userId);

  // 1. Semantic normalization & payload hash
  // Preserve explicit grade 0! Never replace with fallback 3!
  const grade = params.grade;
  const confidence = Math.min(5, Math.max(1, Number(params.confidence || 3)));
  const responseSeconds = Math.max(0, Number(params.responseSeconds || 0));
  const isAssisted = Boolean(
    params.assisted || params.solutionViewed || (params.hintsUsed && params.hintsUsed > 0)
  );

  const normalizedSemanticPayload: Record<string, unknown> = {
    queueId: params.queueId,
    grade,
    confidence,
    responseSeconds,
    recallText: params.recallText?.trim() || null,
    quizAnswer: params.quizAnswer ?? null,
    patternNotes: params.patternNotes?.trim() || null,
    dryRunDone: Boolean(params.dryRunDone),
    summary: params.summary?.trim() || null,
    planTaskId: params.planTaskId || null,
    assisted: isAssisted,
    hintsUsed: Number(params.hintsUsed || 0),
    solutionViewed: Boolean(params.solutionViewed),
  };

  const payloadHash = computePayloadHash(normalizedSemanticPayload);

  // 2. Pre-check idempotency gate
  const existingCommand = await LearningCommandModel.findOne({
    userId,
    learningEpoch,
    commandId: params.commandId,
  });

  if (existingCommand) {
    if (existingCommand.payloadHash === payloadHash) {
      return {
        ok: true,
        receipt: existingCommand.receipt,
        isDuplicate: true,
      };
    } else {
      return {
        ok: false,
        conflict: true,
        status: 409,
        error: `IDEMPOTENCY_CONFLICT: Command ID "${params.commandId}" was previously submitted with a different payload.`,
      };
    }
  }

  // 3. Look up revision queue item
  const queue = await RevisionQueueModel.findOne({
    _id: queueObjectId,
    userId,
  });

  if (!queue || queue.state === "retired") {
    return {
      ok: false,
      error: "Revision queue item not found or already retired.",
      status: 404,
    };
  }

  // Resolve topic association for queue item to update UserTopicProgress retention
  let reviewTopicId: string | Types.ObjectId | null = null;
  let reviewTopicSlug: string | undefined = undefined;

  if (queue.entityType === "problem") {
    const problem = await ProblemModel.findById(queue.entityId).select("topicIds").lean();
    if (problem && problem.topicIds?.[0]) {
      reviewTopicId = problem.topicIds[0];
      reviewTopicSlug = (await resolveGenuineTopicSlug(reviewTopicId)) || undefined;
    }
  } else if (queue.entityType === "topic") {
    reviewTopicId = queue.entityId;
    reviewTopicSlug = (await resolveGenuineTopicSlug(queue.entityId)) || undefined;
  }

  // Compute SM-2 schedule transition with unified revision service and zero grade preserved
  const reviewedAt = new Date();
  const reviewResult = computeSchedule(
    {
      repetitions: queue.repetitions || 0,
      intervalDays: queue.intervalDays || 1,
      easeFactor: queue.easeFactor || 2.5,
      lapses: queue.lapses || 0,
    },
    grade,
    confidence,
    reviewedAt,
    {
      assisted: isAssisted,
      hintsUsed: params.hintsUsed,
    }
  );
  const { intervalDays, easeFactor, repetitions, lapses, dueAt } = reviewResult;
  const reviewAttemptId = new Types.ObjectId().toString();

  // 4. Safe transaction execution (strict atomicity requirement)
  const supportsTx = await canUseTransactions();
  if (!supportsTx) {
    return {
      ok: false,
      status: 503,
      error:
        "TRANSACTION_UNAVAILABLE: Multi-document transactions are required for review submission atomicity.",
    };
  }

  const dbSession = await mongoose.startSession();

  let receipt: LearningReceipt;
  const deliveriesToEnqueue: EnqueueDeliveryInput[] = [];

  const executeCoreWrites = async (session?: ClientSession) => {
    // A. Create RevisionHistory record with unique reviewAttemptId
    const createdHistory = await RevisionHistoryModel.create(
      [
        {
          userId,
          queueId: queue._id,
          learningEpoch,
          reviewAttemptId,
          commandId: params.commandId,
          entityType: queue.entityType,
          entityId: queue.entityId,
          reviewedAt,
          grade,
          confidence,
          responseSeconds,
          previousIntervalDays: queue.intervalDays,
          nextIntervalDays: intervalDays,
          wasOverdue: queue.dueAt ? queue.dueAt.getTime() < reviewedAt.getTime() : false,
          evidence: {
            recallText: params.recallText,
            quizAnswer: params.quizAnswer,
            patternNotes: params.patternNotes,
            dryRunDone: params.dryRunDone,
            summary: params.summary,
            assisted: isAssisted,
            hintsUsed: params.hintsUsed || 0,
            solutionViewed: Boolean(params.solutionViewed),
          },
        },
      ],
      { session }
    );
    const history = Array.isArray(createdHistory) ? createdHistory[0] : createdHistory;

    // B. Optimistically update revision queue with state transition
    const updateResult = await RevisionQueueModel.updateOne(
      { _id: queue._id, version: queue.version },
      {
        $set: {
          intervalDays,
          easeFactor,
          repetitions,
          lapses,
          dueAt,
          lastReviewedAt: reviewedAt,
          state: "scheduled",
          snoozedUntil: null,
          priority: grade < 3 || isAssisted ? 95 : Math.max(15, queue.priority - 8),
        },
        $inc: { version: 1 },
      },
      { session }
    );

    if (updateResult.matchedCount === 0) {
      const conflictError: any = new Error(
        "CONCURRENT_REVISION_CONFLICT: Revision queue item was modified concurrently."
      );
      conflictError.status = 409;
      conflictError.conflict = true;
      throw conflictError;
    }

    // C. Plan task reconciliation if on-plan
    const planEffect: PlanEffectSummary = {
      status: "not_applicable",
    };

    let plan: any = null;
    let days: any[] = [];
    let tasks: any[] = [];
    try {
      const planQuery = PlanModel.findOne({ userId, status: "active" });
      plan = planQuery && typeof (planQuery as any).lean === "function" ? await (planQuery as any).lean() : await planQuery;
      if (plan && plan.status === "active") {
        const daysQuery = PlanDayModel.find({ planId: plan._id });
        days = daysQuery && typeof (daysQuery as any).sort === "function"
          ? await (daysQuery as any).sort({ dayIndex: 1 }).lean()
          : (daysQuery && typeof (daysQuery as any).lean === "function")
          ? await (daysQuery as any).lean()
          : (await daysQuery) || [];
        const tasksQuery = PlanTaskModel.find({ planId: plan._id });
        tasks = tasksQuery && typeof (tasksQuery as any).sort === "function"
          ? await (tasksQuery as any).sort({ dayIndex: 1, order: 1 }).lean()
          : (tasksQuery && typeof (tasksQuery as any).lean === "function")
          ? await (tasksQuery as any).lean()
          : (await tasksQuery) || [];
      }
    } catch {
      // Off-plan review is preserved even if plan lookups fail
    }

    if (plan && plan.status === "active") {
      const currentPlanDay = resolveCurrentPlanDay(plan, days, new Date(), plan.timezone);
      if (currentPlanDay) {
        const currentDayId = String(currentPlanDay._id);

        let matchingTask: any = null;
        if (params.planTaskId && Types.ObjectId.isValid(params.planTaskId)) {
          matchingTask = tasks.find(
            (t: any) =>
              String(t._id) === String(params.planTaskId) &&
              String(t.planDayId) === currentDayId &&
              t.entityType === "revision"
          );
        }

        if (!matchingTask) {
          matchingTask = tasks.find(
            (t: any) =>
              String(t.planDayId) === currentDayId &&
              t.entityType === "revision" &&
              t.entityId &&
              String(t.entityId) === String(queue.entityId)
          );
        }

        if (matchingTask) {
          if (matchingTask.status === "completed") {
            planEffect.status = "already_completed";
            planEffect.planTaskId = String(matchingTask._id);
          } else {
            const requirement = resolveTaskRequirement(matchingTask);
            const evalResult = evaluateTaskCompletion(requirement, {
              grade,
              isReviewCompleted: true,
            });

            if (evalResult.qualifies) {
              await PlanTaskModel.updateOne(
                { _id: matchingTask._id, status: { $ne: "completed" } },
                {
                  $set: {
                    status: "completed",
                    completedAt: new Date(),
                    actualMinutes: Math.round(responseSeconds / 60),
                    evidence: {
                      score: grade * 20,
                      passed: grade >= 3 && !isAssisted,
                      durationSeconds: responseSeconds,
                    },
                  },
                },
                { session }
              );

              planEffect.status = "completed";
              planEffect.planTaskId = String(matchingTask._id);

              const advanceResult = await advancePlanDayIfComplete({
                planDayId: currentPlanDay._id as Types.ObjectId,
                planId: plan._id as Types.ObjectId,
                userObjectId: userId,
                session,
              });

              planEffect.dayAdvanced = Boolean(advanceResult.dayAdvanced);
              planEffect.nextDayIndex = advanceResult.nextDayIndex;
            } else {
              // Review performed but did not qualify (e.g. demonstrate_recall requirement failed)
              await PlanTaskModel.updateOne(
                { _id: matchingTask._id, status: { $ne: "completed" } },
                {
                  $set: {
                    status: "in_progress",
                    actualMinutes: Math.round(responseSeconds / 60),
                    "evidence.score": grade * 20,
                    "evidence.passed": false,
                  },
                },
                { session }
              );
              planEffect.status = "not_applicable";
              planEffect.planTaskId = String(matchingTask._id);
            }
          }
        }
      }
    }

    // D. Emit Canonical Learning Event with topicSlug & topicId
    const reviewEvent = await recordLearningEvent(
      {
        userId,
        learningEpoch,
        eventType: "review_completed",
        idempotencyKey: `review-comp:${reviewAttemptId}`,
        topicSlug: reviewTopicSlug,
        topicId: reviewTopicId ? new Types.ObjectId(reviewTopicId) : undefined,
        payload: {
          grade,
          responseSeconds,
          recalledSuccessfully: grade >= 3 && !isAssisted,
          nextIntervalDays: intervalDays,
          reviewAttemptId,
          topicSlug: reviewTopicSlug,
          assisted: isAssisted,
          hintsUsed: params.hintsUsed ?? 0,
        },
      },
      { session }
    );

    // E. Downstream deliveries: XP for review attempt + Topic progress projection if topic known
    deliveriesToEnqueue.push({
      userId,
      learningEpoch,
      deliveryKey: `xp:rev:${reviewAttemptId}`,
      handler: "gamification_xp",
      commandId: params.commandId,
      payload: {
        xpAmount: 20,
        eventType: "revision",
        idempotencyKey: `revision:${queue._id}:${reviewAttemptId}`,
        entityId: String(queue.entityId),
      },
    });

    if (reviewTopicSlug && reviewEvent.event) {
      deliveriesToEnqueue.push({
        userId,
        learningEpoch,
        deliveryKey: `topic_proj:${reviewEvent.event._id}`,
        handler: "topic_progress_projection",
        eventId: reviewEvent.event._id as Types.ObjectId,
        commandId: params.commandId,
      });
    }

    await enqueueDeliveries(deliveriesToEnqueue, session);

    // F. Formulate typed receipt
    receipt = {
      commandId: params.commandId,
      commandKind: "review_submission",
      reviewAttemptId,
      committedAt: reviewedAt.toISOString(),
      learningEpoch,
      outcome: `grade_${grade}`,
      outcomeSource: "learner-reported",
      durationProvenance: responseSeconds > 0 ? "measured" : "unknown",
      durationSeconds: responseSeconds,
      assistanceSummary: {
        hintsUsed: params.hintsUsed ?? 0,
        editorialViewed: Boolean(params.solutionViewed),
        aiAssisted: false,
        strategy: isAssisted ? "hint_assisted" : "spaced_retrieval",
      },
      planEffect,
      reviewEffect: {
        queueId: String(queue._id),
        grade,
        nextIntervalDays: intervalDays,
        dueAt: dueAt.toISOString(),
      },
      downstreamStatus: "pending",
    };

    // G. Persist Learning Command
    await LearningCommandModel.create(
      [
        {
          userId,
          learningEpoch,
          commandId: params.commandId,
          commandKind: "review_submission",
          payloadHash,
          status: "committed",
          receipt,
          downstreamStatus: "pending",
        },
      ],
      { session }
    );
  };

  try {
    await dbSession.withTransaction(async () => {
      await executeCoreWrites(dbSession);
    });
  } catch (txError: any) {
    if (txError?.conflict || txError?.status === 409) {
      return {
        ok: false,
        conflict: true,
        status: 409,
        error: txError.message || "CONCURRENT_REVISION_CONFLICT",
      };
    }
    if (txError?.code === 11000 || String(txError?.message).includes("E11000")) {
      const raceExisting = await LearningCommandModel.findOne({
        userId,
        learningEpoch,
        commandId: params.commandId,
      });
      if (raceExisting) {
        if (raceExisting.payloadHash === payloadHash) {
          return {
            ok: true,
            receipt: raceExisting.receipt,
            isDuplicate: true,
          };
        } else {
          return {
            ok: false,
            conflict: true,
            status: 409,
            error: `IDEMPOTENCY_CONFLICT: Command ID "${params.commandId}" was previously submitted with a different payload.`,
          };
        }
      }
    }
    throw txError;
  } finally {
    await dbSession.endSession();
  }

  return {
    ok: true,
    receipt: receipt!,
    isDuplicate: false,
  };
}

/**
 * Reads command receipt status by commandId.
 */
export async function getCommandReceipt(
  userId: string | Types.ObjectId,
  commandId: string
): Promise<LearningCommandResult> {
  await connectToDatabase();
  const uid = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const learningEpoch = await getLearnerEpoch(uid);

  const doc = await LearningCommandModel.findOne({
    userId: uid,
    learningEpoch,
    commandId,
  }).lean();

  if (!doc) {
    return { ok: false, status: 404, error: "Command receipt not found" };
  }

  let receipt = doc.receipt;
  if (receipt && receipt.downstreamStatus === "pending") {
    const pendingDeliveries = await LearningDeliveryModel.countDocuments({
      userId: uid,
      learningEpoch,
      commandId,
      status: { $in: ["pending", "claimed"] },
    });
    const failedDeliveries = await LearningDeliveryModel.countDocuments({
      userId: uid,
      learningEpoch,
      commandId,
      status: "failed",
    });

    if (failedDeliveries > 0) {
      receipt = {
        ...receipt,
        downstreamStatus: "failed",
      };
      await LearningCommandModel.updateOne(
        { _id: doc._id },
        { $set: { "receipt.downstreamStatus": "failed", downstreamStatus: "failed" } }
      );
    } else if (pendingDeliveries === 0) {
      receipt = {
        ...receipt,
        downstreamStatus: "synchronized",
      };
      await LearningCommandModel.updateOne(
        { _id: doc._id },
        { $set: { "receipt.downstreamStatus": "synchronized", downstreamStatus: "synchronized" } }
      );
    }
  }

  return {
    ok: true,
    receipt,
  };
}

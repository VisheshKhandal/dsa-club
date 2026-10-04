import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { IntelligenceDecisionModel } from "../models/intelligence-decision.model";
import type {
  DashboardPrimaryAction,
  DashboardSecondaryAction,
  PrimaryActionProvenance,
  PrimaryActionCtaState,
  PrimaryActionType,
} from "@/features/product/types/dashboard-dto.types";

export const DECISION_POLICY_VERSION = "2.0.0-deterministic";

type AnyDoc = Record<string, any>;

function id(val: unknown): string {
  return String(val);
}

export interface UnifiedSelectionParams {
  userId: string | Types.ObjectId;
  surface?: "dashboard" | "today_board" | "recovery_prompt" | "completion_eval" | "recalibration";
  mode?: "plan_led" | "self_paced";
  persistDecision?: boolean;
  activePlan?: AnyDoc | null;
  currentPlanDay?: AnyDoc | null;
  todayTasks?: AnyDoc[];
  dueRevisions?: AnyDoc[];
  activeSession?: AnyDoc | null;
  draftAttempt?: AnyDoc | null;
  activeMission?: AnyDoc | null;
  practiceRecs?: AnyDoc[];
  topicMasteryScore?: number;
  availableMinutes?: number;
}

export interface SelectionResult {
  primaryAction: DashboardPrimaryAction;
  secondaryAction: DashboardSecondaryAction | null;
  decisionId?: string;
}

/**
 * Resolves the single authoritative learning action across all learner states with
 * strict separation between Plan-Led and Self-Paced modes.
 *
 * CRITICAL PRODUCT BOUNDARY:
 * 1. PLAN-LED MODE:
 *    When an active plan has an actionable current plan day (and learner hasn't explicitly
 *    chosen self-paced mode), the plan is the absolute authority for the primary action:
 *    - In-progress task of today's plan day
 *    - Next required task in plan order (including explicitly plan-scheduled reviews)
 *    - Next optional task in plan order
 *    - Day completed state
 *    * Unscheduled due reviews, weak-topic scores, or Evidence Loop recommendations NEVER
 *      replace or reorder scheduled plan tasks.
 *    * In-flight drafts or active sessions outside the plan become secondaryAction only.
 *
 * 2. SELF-PACED MODE:
 *    Used when there is no active actionable plan, the plan is paused/completed, or the
 *    learner explicitly chose a self-paced route:
 *    - In-flight problem draft or active study session
 *    - High-priority due retention review
 *    - Self-paced practice recommendation (Evidence Loop adaptive scoring)
 *    - Roadmap continuity mission
 *    - Setup / path selection state
 *
 * Decision Persistence Rule:
 * Decisions are persisted ONLY when persistDecision === true (at state transitions),
 * never on routine dashboard reads.
 */
export async function resolveAuthoritativeLearningAction(
  params: UnifiedSelectionParams
): Promise<SelectionResult> {
  const {
    userId,
    surface = "dashboard",
    mode,
    persistDecision = false,
    activePlan,
    currentPlanDay,
    todayTasks = [],
    dueRevisions = [],
    activeSession,
    draftAttempt,
    activeMission,
    practiceRecs = [],
    topicMasteryScore = 0,
    availableMinutes,
  } = params;

  const currentTopicName = activePlan?.topicName || currentPlanDay?.topicName || activeMission?.topic || "DSA Fundamentals";
  const currentTopicSlug = activePlan?.topicSlug || currentPlanDay?.topicSlug || activeMission?.topicSlug || "dsa-fundamentals";

  let primary: DashboardPrimaryAction | null = null;
  let secondary: DashboardSecondaryAction | null = null;

  // Determine mode authority: plan-led whenever an active plan exists unless self_paced explicitly requested
  const isPlanActive = Boolean(
    activePlan &&
    activePlan.status !== "paused" &&
    activePlan.status !== "completed" &&
    activePlan.status !== "archived"
  );
  const isPlanLed =
    mode !== "self_paced" &&
    isPlanActive;

  // ════════════════════════════════════════════════════════════════════════════
  // BRANCH A: PLAN-LED MODE (Strict Plan Schedule Authority)
  // ════════════════════════════════════════════════════════════════════════════
  if (isPlanLed && activePlan) {
    if (!currentPlanDay) {
      // Safe fallback: Active plan exists, but current day cannot be resolved.
      // Preserve plan-led status and show a clear recovery/plan-state message.
      // Do NOT fall through to self-paced recommendations!
      primary = {
        id: `plan-recovery-${activePlan._id || activePlan.id || "active"}`,
        actionKey: "plan-recovery",
        type: "checkpoint",
        title: `Recalibrate ${currentTopicName} Plan`,
        href: "/plan",
        topicName: currentTopicName,
        topicSlug: currentTopicSlug,
        isCrossTopic: false,
        relationshipLabel: null,
        estimatedDurationMinutes: 5,
        isDurationEstimate: true,
        reason: `Your ${currentTopicName} study plan is active, but today's schedule needs recalibration. Open your plan to review your milestones.`,
        sourceProvenance: "required_plan_task",
        afterCompletionOutcome: "Restores your daily structured schedule and upcoming tasks.",
        ctaLabel: "Recalibrate study plan",
        ctaState: "start",
        planDayIndex: undefined,
      };
    } else {
    // 1. In-progress task of today's plan day
    const inProgressTask = todayTasks.find((t) => t.status === "in_progress");
    if (inProgressTask) {
      const isCrossTopic =
        inProgressTask.validationStatus === "cross_topic_bridge" ||
        inProgressTask.topicAlignment === "cross_topic_bridge";

      const taskTopicName = inProgressTask.topicName || inProgressTask.topicSlug || "Prerequisite topic";
      const relationshipLabel = isCrossTopic
        ? `Cross-topic foundation: ${taskTopicName} applied to ${currentTopicName}`
        : null;

      primary = {
        id: String(inProgressTask._id || inProgressTask.id || inProgressTask.taskKey),
        actionKey: inProgressTask.taskKey || "in-progress-task",
        type: (inProgressTask.entityType as PrimaryActionType) || "problem",
        title: String(inProgressTask.title),
        href: inProgressTask.targetUrl || (inProgressTask.topicSlug ? `/learn/topics/${inProgressTask.topicSlug}` : "/practice"),
        topicName: inProgressTask.topicName || currentTopicName,
        topicSlug: inProgressTask.topicSlug || currentTopicSlug,
        isCrossTopic,
        relationshipLabel,
        estimatedDurationMinutes: Number(inProgressTask.estimatedMinutes || 20),
        isDurationEstimate: true,
        reason: `You started "${inProgressTask.title}" earlier today. Resume to complete your daily commitment.`,
        sourceProvenance: "in_progress_task",
        afterCompletionOutcome: `Completes task ${inProgressTask.order ?? 1} of today's plan day.`,
        ctaLabel: "Resume today's task",
        ctaState: "resume",
        planDayIndex: currentPlanDay.dayIndex,
        taskId: String(inProgressTask._id || inProgressTask.id),
        entityId: inProgressTask.entityId ? String(inProgressTask.entityId) : null,
        entityType: inProgressTask.entityType,
      };
    }

    // 2. Next required task in plan order (including explicitly plan-scheduled reviews)
    if (!primary) {
      const nextRequired = todayTasks.find(
        (t) => t.required && t.status !== "completed" && t.status !== "unavailable"
      );

      if (nextRequired) {
        const isScheduledReview =
          nextRequired.entityType === "revision" ||
          nextRequired.entityType === "review";

        const isCrossTopic =
          nextRequired.validationStatus === "cross_topic_bridge" ||
          nextRequired.topicAlignment === "cross_topic_bridge";

        const taskTopicName = nextRequired.topicName || nextRequired.topicSlug || "Prerequisite topic";
        const relationshipLabel = isCrossTopic
          ? `Cross-topic foundation: ${taskTopicName} applied to ${currentTopicName}`
          : null;

        primary = {
          id: String(nextRequired._id || nextRequired.id || nextRequired.taskKey),
          actionKey: nextRequired.taskKey || "required-task",
          type: (nextRequired.entityType as PrimaryActionType) || (isScheduledReview ? "revision" : "problem"),
          title: String(nextRequired.title),
          href: nextRequired.targetUrl || (nextRequired.topicSlug ? `/learn/topics/${nextRequired.topicSlug}` : "/practice"),
          topicName: nextRequired.topicName || currentTopicName,
          topicSlug: nextRequired.topicSlug || currentTopicSlug,
          isCrossTopic,
          relationshipLabel,
          estimatedDurationMinutes: Number(nextRequired.estimatedMinutes || (isScheduledReview ? 10 : 20)),
          isDurationEstimate: true,
          reason: isScheduledReview
            ? `Scheduled retention review in Day ${currentPlanDay.dayIndex}: Spaced recall reinforces pattern mastery.`
            : `Part of Day ${currentPlanDay.dayIndex} in ${currentTopicName}: ${currentPlanDay.focus || "Core practice step"}`,
          sourceProvenance: isScheduledReview ? "due_review" : "required_plan_task",
          afterCompletionOutcome: `Advances Day ${currentPlanDay.dayIndex} schedule and records verified mastery.`,
          ctaLabel: isScheduledReview ? "Start scheduled review" : "Start today's task",
          ctaState: "start",
          planDayIndex: currentPlanDay.dayIndex,
          taskId: String(nextRequired._id || nextRequired.id),
          entityId: nextRequired.entityId ? String(nextRequired.entityId) : null,
          entityType: nextRequired.entityType,
        };
      }
    }

    // 3. Next optional task of today's plan day (Unscheduled reviews or Evidence Loop recs CANNOT replace this)
    if (!primary) {
      const nextOptional = todayTasks.find(
        (t) => !t.required && t.status !== "completed" && t.status !== "unavailable"
      );

      if (nextOptional) {
        primary = {
          id: String(nextOptional._id || nextOptional.id || nextOptional.taskKey),
          actionKey: nextOptional.taskKey || "optional-task",
          type: (nextOptional.entityType as PrimaryActionType) || "problem",
          title: String(nextOptional.title),
          href: nextOptional.targetUrl || "/practice",
          topicName: nextOptional.topicName || currentTopicName,
          topicSlug: nextOptional.topicSlug || currentTopicSlug,
          isCrossTopic: false,
          relationshipLabel: null,
          estimatedDurationMinutes: Number(nextOptional.estimatedMinutes || 15),
          isDurationEstimate: true,
          reason: `Optional practice for Day ${currentPlanDay.dayIndex}: Solidifies problem variations.`,
          sourceProvenance: "optional_plan_task",
          afterCompletionOutcome: "Records additional practice evidence.",
          ctaLabel: "Start bonus practice",
          ctaState: "start",
          planDayIndex: currentPlanDay.dayIndex,
          taskId: String(nextOptional._id || nextOptional.id),
          entityId: nextOptional.entityId ? String(nextOptional.entityId) : null,
          entityType: nextOptional.entityType,
        };
      }
    }

    // 4. Day complete state (Never silently replaced with an Evidence Loop recommendation)
    if (!primary) {
      primary = {
        id: `day-complete-${currentPlanDay.dayIndex}`,
        actionKey: "day-complete",
        type: "checkpoint",
        title: `Day ${currentPlanDay.dayIndex} Tasks Completed`,
        href: "/plan",
        topicName: currentTopicName,
        topicSlug: currentTopicSlug,
        isCrossTopic: false,
        relationshipLabel: null,
        estimatedDurationMinutes: 0,
        isDurationEstimate: true,
        reason: "You have finished your scheduled tasks for today. Great consistency!",
        sourceProvenance: "required_plan_task",
        afterCompletionOutcome: "Unlocks tomorrow's scheduled session.",
        ctaLabel: "Day complete · View full plan",
        ctaState: "day_complete",
        planDayIndex: currentPlanDay.dayIndex,
      };
    }
  }
}

  // ════════════════════════════════════════════════════════════════════════════
  // BRANCH B: SELF-PACED / OUTSIDE-PLAN MODE (Evidence Loop & General Practice)
  // ════════════════════════════════════════════════════════════════════════════
  if (!primary) {
    // 1. Paused plan state (if plan is explicitly paused and learner hasn't chosen self-paced)
    if (activePlan && activePlan.status === "paused" && mode !== "self_paced") {
      primary = {
        id: `paused-${activePlan._id || activePlan.id}`,
        actionKey: "plan-paused",
        type: "learn",
        title: `${activePlan.topicName} Plan (Paused)`,
        href: "/plan",
        topicName: activePlan.topicName,
        topicSlug: activePlan.topicSlug,
        isCrossTopic: false,
        relationshipLabel: null,
        estimatedDurationMinutes: 0,
        isDurationEstimate: true,
        reason: "Your active study plan is paused. Resume your schedule when you are ready.",
        sourceProvenance: "required_plan_task",
        afterCompletionOutcome: "Restores daily scheduled tasks and milestones.",
        ctaLabel: "Resume schedule",
        ctaState: "paused",
        planDayIndex: currentPlanDay?.dayIndex,
      };
    }

    // 2. In-flight draft attempt or active session
    if (!primary) {
      if (draftAttempt) {
        const p = draftAttempt.problemId;
        const title = String(p?.title ?? "Practice Problem");
        const slug = p?.slug ? String(p.slug) : "";

        primary = {
          id: String(draftAttempt._id),
          actionKey: `draft-${draftAttempt._id}`,
          type: "problem",
          title,
          href: slug ? `/practice/problems/${slug}` : "/practice",
          topicName: currentTopicName,
          topicSlug: currentTopicSlug,
          isCrossTopic: false,
          relationshipLabel: null,
          estimatedDurationMinutes: 20,
          isDurationEstimate: true,
          reason: `Unfinished practice problem: You started "${title}". Continue to solidify pattern recognition.`,
          sourceProvenance: "in_flight_draft",
          afterCompletionOutcome: "Submits verified test-passing solution and records independent mastery.",
          ctaLabel: "Continue problem",
          ctaState: "resume",
        };
      } else if (activeSession) {
        primary = {
          id: String(activeSession._id),
          actionKey: `session-${activeSession._id}`,
          type: "problem",
          title: "Active Study Session",
          href: currentTopicSlug ? `/practice?topic=${currentTopicSlug}` : "/practice",
          topicName: currentTopicName,
          topicSlug: currentTopicSlug,
          isCrossTopic: false,
          relationshipLabel: null,
          estimatedDurationMinutes: Math.max(15, Number(activeSession.plannedMinutes || 25)),
          isDurationEstimate: true,
          reason: "You have an active focus session running. Continue your practice rhythm.",
          sourceProvenance: "active_session",
          afterCompletionOutcome: "Logs focused study time and updates daily consistency.",
          ctaLabel: "Continue focus session",
          ctaState: "resume",
        };
      }
    }

    // 3. Spaced retrieval review due
    if (!primary && dueRevisions.length > 0) {
      const topReview = dueRevisions[0];
      primary = {
        id: String(topReview._id || topReview.id),
        actionKey: `review-${topReview._id || topReview.id}`,
        type: "revision",
        title: topReview.conceptName || `Review ${topReview.entityType || "Topic"}`,
        href: topReview.href || `/revision/session/${topReview._id || topReview.id}`,
        topicName: topReview.conceptName || currentTopicName,
        topicSlug: currentTopicSlug,
        isCrossTopic: false,
        relationshipLabel: null,
        estimatedDurationMinutes: Number(topReview.estimatedMinutes || 7),
        isDurationEstimate: true,
        reason: "Spaced retrieval is due for retention. Reinforcing pattern recall keeps retention high.",
        sourceProvenance: "due_review",
        afterCompletionOutcome: "Clears retention queue and resets spaced interval.",
        ctaLabel: "Start review",
        ctaState: "start",
      };
    }

    // 4. Evidence Loop adaptive practice recommendation (genuine behavioral evidence)
    if (!primary && practiceRecs.length > 0) {
      const rec = practiceRecs[0];
      const p = rec.problem || rec;
      primary = {
        id: String(p._id || p.id),
        actionKey: `rec-${p.slug}`,
        type: "problem",
        title: String(p.title),
        href: `/practice/problems/${p.slug}`,
        topicName: String(rec.weakTopic || currentTopicName),
        topicSlug: currentTopicSlug,
        isCrossTopic: false,
        relationshipLabel: null,
        estimatedDurationMinutes: Number(p.estimatedMinutes || 25),
        isDurationEstimate: true,
        reason: rec.reason || "Highest value practice step based on your recent activity.",
        sourceProvenance: "self_paced_recommendation",
        afterCompletionOutcome: "Verifies pattern implementation and builds independent solve evidence.",
        ctaLabel: "Solve in editor",
        ctaState: "start",
      };
    }

    // 5. Roadmap continuity mission
    if (!primary && activeMission) {
      primary = {
        id: String(activeMission._id || activeMission.id),
        actionKey: `mission-${activeMission.slug}`,
        type: "mission",
        title: String(activeMission.title),
        href: `/missions/${activeMission.slug}`,
        topicName: String(activeMission.topic || currentTopicName),
        topicSlug: String(activeMission.topicSlug || currentTopicSlug),
        isCrossTopic: false,
        relationshipLabel: null,
        estimatedDurationMinutes: Number(activeMission.estimatedMinutes || 25),
        isDurationEstimate: true,
        reason: `Continue your learning path in ${activeMission.topic || "curriculum"}.`,
        sourceProvenance: "roadmap_continuity",
        afterCompletionOutcome: "Completes mission stage and advances curriculum roadmap.",
        ctaLabel: activeMission.status === "in_progress" ? "Resume mission" : "Continue roadmap",
        ctaState: activeMission.status === "in_progress" ? "resume" : "start",
      };
    }

    // 6. Setup state
    if (!primary) {
      primary = {
        id: "setup-path",
        actionKey: "setup-path",
        type: "setup",
        title: "Choose a Learning Path",
        href: "/learn/paths",
        topicName: "DSA Curriculum",
        topicSlug: "dsa-curriculum",
        isCrossTopic: false,
        relationshipLabel: null,
        estimatedDurationMinutes: 5,
        isDurationEstimate: true,
        reason: "No active study plan or path selected. Choose a topic to begin structured daily practice.",
        sourceProvenance: "setup",
        afterCompletionOutcome: "Calibrates goals, company focus, and daily commitments.",
        ctaLabel: "Choose learning path",
        ctaState: "setup",
      };
    }
  }

  // ── Populate secondary action ONLY if a separate valid draft/session exists ──
  // (Never as a competing primary button)
  if (primary.sourceProvenance !== "in_flight_draft" && draftAttempt) {
    const p = draftAttempt.problemId;
    secondary = {
      id: String(draftAttempt._id),
      title: String(p?.title ?? "Practice Problem"),
      subtitle: "Unfinished draft · Pick up where you left off",
      href: p?.slug ? `/practice/problems/${p.slug}` : "/practice",
      type: "problem",
      lastActiveAt: draftAttempt.createdAt ? new Date(draftAttempt.createdAt).toISOString() : undefined,
      provenance: "draft_attempt",
    };
  } else if (primary.sourceProvenance !== "active_session" && activeSession) {
    secondary = {
      id: String(activeSession._id),
      title: "Active Study Session",
      subtitle: `${Math.round(Number(activeSession.focusedSeconds || 0) / 60)}m focused so far`,
      href: currentTopicSlug ? `/practice?topic=${currentTopicSlug}` : "/practice",
      type: "session",
      lastActiveAt: activeSession.startedAt ? new Date(activeSession.startedAt).toISOString() : undefined,
      provenance: "active_session",
    };
  }

  // Time Budget Evaluation: If primary estimate exceeds availableMinutes, preserve the estimate and attach alternative
  if (primary && availableMinutes !== undefined && primary.estimatedDurationMinutes > availableMinutes) {
    primary.timeBudgetExceeded = true;
    primary.timeBudgetAvailableMinutes = availableMinutes;

    const shorterReview = dueRevisions.find((r) => Number(r.estimatedMinutes || 7) <= availableMinutes);
    const shorterTask = todayTasks.find((t) => t.status !== "completed" && Number(t.estimatedMinutes || 20) <= availableMinutes);

    const alt = shorterReview
      ? {
          title: shorterReview.conceptName || `Retention Review`,
          href: shorterReview.href || `/revision`,
          estimatedMinutes: Number(shorterReview.estimatedMinutes || 7),
          reason: "Fits your available time. Clear a scheduled review item.",
        }
      : shorterTask
      ? {
          title: String(shorterTask.title),
          href: shorterTask.targetUrl || "/practice",
          estimatedMinutes: Number(shorterTask.estimatedMinutes || 15),
          reason: "Shorter task from today's plan that fits your session time.",
        }
      : null;

    primary.timeBudgetAlternative = alt;
  }

  // ── Persist Explainable Decision Record ONLY at meaningful state transitions ─
  let decisionId: string | undefined;
  if (persistDecision) {
    await connectToDatabase();
    const userObjectId =
      userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);

    const planObjectId = activePlan?._id ? new Types.ObjectId(activePlan._id) : null;
    const planDayObjectId = currentPlanDay?._id ? new Types.ObjectId(currentPlanDay._id) : null;
    const entityObjectId = primary.entityId ? new Types.ObjectId(primary.entityId) : null;

    try {
      const doc = await IntelligenceDecisionModel.create({
        userId: userObjectId,
        planId: planObjectId,
        planDayId: planDayObjectId,
        surface,
        decisionType: primary.sourceProvenance === "in_progress_task" ? "recovery_recommendation" : "daily_next_action",
        selectedAction: {
          actionKey: primary.actionKey,
          actionType: primary.type,
          entityType: primary.entityType || primary.type,
          entityId: entityObjectId,
          title: primary.title,
          estimatedMinutes: primary.estimatedDurationMinutes,
          planRelation: primary.sourceProvenance,
          targetUrl: primary.href,
        },
        primaryReason: primary.reason,
        secondaryReasons: [
          `Provenance: ${primary.sourceProvenance}`,
          `Outcome: ${primary.afterCompletionOutcome}`,
        ],
        signals: {
          planDayIndex: primary.planDayIndex || currentPlanDay?.dayIndex || 1,
          readinessScore: topicMasteryScore,
        },
        aiExplanation: {
          fallbackUsed: true,
        },
      });
      decisionId = doc._id.toString();
    } catch {
      // Persistence non-blocking if already recorded
    }
  }

  return {
    primaryAction: primary,
    secondaryAction: secondary,
    decisionId,
  };
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { Types } from "mongoose";
import { requireUserId } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db/mongodb";
import { resolveUserActivePlan } from "@/features/intelligence/services/plan-migration.service";
import { resolveLearningExecutionSnapshot } from "@/features/intelligence/services/learning-execution-snapshot";
import { IntelligenceDecisionModel } from "@/features/intelligence/models/intelligence-decision.model";
import { evaluateNextTaskDecision } from "@/features/intelligence/decisions";
import { UserStatisticsModel } from "@/features/intelligence/models/intelligence.model";
import { ProblemAttemptModel } from "@/features/learning/models/learning.model";
import { getCachedPublishedProblems, getCachedPublishedTopics } from "@/features/content/services/curriculum-cache";
import { CANONICAL_TOPIC_CATALOG } from "@/features/intelligence/planning/topic-catalog";
import { IntelligenceView } from "@/components/intelligence/IntelligenceView";
import { toDTO } from "@/features/product/services/product.service";

export const metadata: Metadata = {
  title: "Study Plan | Powered by Club Intelligence",
  description: "Track your active learning cycle, execute today's structured session, and calibrate your practice schedule.",
};

interface IntelligencePageProps {
  searchParams: Promise<{ tab?: "overview" | "today" | "week" | "manage" }>;
}

async function IntelligenceDataLoader({
  userId,
  initialTab,
}: {
  userId: string;
  initialTab?: "overview" | "today" | "week" | "manage";
}) {
  await connectToDatabase();
  const userObjectId = new Types.ObjectId(userId);

  const [executionSnapshot, planData, initialDecisions, stats, allProblems, solvedAttempts, publishedTopics] = await Promise.all([
    resolveLearningExecutionSnapshot(userId),
    resolveUserActivePlan(userId),
    IntelligenceDecisionModel.find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    UserStatisticsModel.findOne({ userId: userObjectId }).lean(),
    getCachedPublishedProblems().catch(() => []),
    ProblemAttemptModel.find({ userId: userObjectId, status: "solved" })
      .select("problemId")
      .lean()
      .catch(() => []),
    getCachedPublishedTopics().catch(() => []),
  ]);

  let decisions = initialDecisions;
  if (decisions.length === 0 && planData.plan) {
    try {
      await evaluateNextTaskDecision({ userId: userObjectId, surface: "dashboard_card" });
      decisions = await IntelligenceDecisionModel.find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    } catch {
      // safe fallback
    }
  }

  const primaryTopicSlug =
    (planData.plan?.snapshots as any)?.primaryTopicSlug ||
    planData.days[0]?.topicSlug ||
    executionSnapshot?.activePlan?.topicSlug ||
    (publishedTopics as any[])[0]?.slug ||
    CANONICAL_TOPIC_CATALOG[0]?.slug ||
    "arrays";

  const matchingTopic = (publishedTopics as any[]).find(
    (t: any) => t.slug === primaryTopicSlug || t._id?.toString() === primaryTopicSlug
  );
  const primaryTopicName =
    (planData.plan?.snapshots as any)?.primaryTopicName ||
    planData.days[0]?.topicName ||
    executionSnapshot?.activePlan?.topicName ||
    matchingTopic?.name ||
    "DSA Fundamentals";

  const solvedProblemIdSet = new Set((solvedAttempts || []).map((a: any) => String(a.problemId)));

  const topicProblems = ((allProblems as any[]) || [])
    .filter((p: any) => {
      const topicMatches = (p.topicIds || []).some(
        (t: any) => String(t.slug) === primaryTopicSlug || String(t.name).toLowerCase().includes(primaryTopicSlug.toLowerCase())
      );
      return topicMatches;
    })
    .map((p: any) => ({
      id: String(p._id),
      slug: String(p.slug),
      title: String(p.title),
      difficulty: String(p.difficulty || "medium"),
      estimatedMinutes: Number(p.estimatedMinutes || 25),
      patterns: (p.patternIds || []).map((pat: any) => String(pat.name || pat.slug || "")).filter(Boolean),
      companies: (p.companyIds || []).map((c: any) => String(c.name || c.slug || "")).filter(Boolean),
      isSolved: solvedProblemIdSet.has(String(p._id)),
    }));

  const mappedPlan = planData.plan
    ? {
        id: String(planData.plan._id),
        status: planData.plan.status,
        source: planData.plan.source,
        cycleNumber: planData.plan.cycleNumber || 1,
        totalDays: planData.plan.totalDays || 21,
        cyclePacePercent: executionSnapshot?.semanticProgress?.cyclePacePercent ?? Math.min(100, Math.round((1 / (planData.plan.totalDays || 21)) * 100)),
        todayTaskCompletionPercent: executionSnapshot?.semanticProgress?.todayTaskCompletionPercent ?? 0,
        cycleTaskCompletionPercent: executionSnapshot?.semanticProgress?.cycleTaskCompletionPercent ?? 0,
        masteryPercent: executionSnapshot?.semanticProgress?.masteryPercent ?? 0,
        topicConfidenceScore: executionSnapshot?.semanticProgress?.topicConfidenceScore ?? 0,
        topicDisplayState: executionSnapshot?.semanticProgress?.topicDisplayState ?? "not_assessed",
        startDate: planData.plan.startDate
          ? new Date(planData.plan.startDate).toISOString()
          : new Date().toISOString(),
        targetCompletionDate: planData.plan.targetCompletionDate
          ? new Date(planData.plan.targetCompletionDate).toISOString()
          : null,
        goal: planData.plan.goal,
        experienceLevel: planData.plan.experienceLevel,
        language: planData.plan.language,
        dailyMinutes: planData.plan.dailyMinutes,
        difficultyPreference: planData.plan.difficultyPreference,
        timezone: planData.plan.timezone,
        pausedDaysCount: planData.plan.pausedDaysCount || 0,
        snapshots: planData.plan.snapshots
          ? {
              availabilitySnapshot: planData.plan.snapshots.availabilitySnapshot
                ? {
                    status: String(
                      planData.plan.snapshots.availabilitySnapshot.status || "ready"
                    ),
                    availableMissionsCount: Number(
                      planData.plan.snapshots.availabilitySnapshot.availableMissionsCount || 0
                    ),
                    availableProblemsCount: Number(
                      planData.plan.snapshots.availabilitySnapshot.availableProblemsCount || 0
                    ),
                  }
                : undefined,
              estimatedScheduleSnapshot: Array.isArray(
                planData.plan.snapshots.estimatedScheduleSnapshot
              )
                ? planData.plan.snapshots.estimatedScheduleSnapshot.map((s: any) => ({
                    dayIndex: Number(s.dayIndex || 0),
                    title: String(s.title || `Day ${s.dayIndex || 0}`),
                    focus: String(s.focus || ""),
                    phase: String(s.phase || "learn"),
                  }))
                : undefined,
            }
          : undefined,
      }
    : null;

  const totalDays = Number(planData.plan?.totalDays || 18);
  const existingDaysMap = new Map(planData.days.map((d) => [d.dayIndex, d]));
  const scheduleSnapshots = (planData.plan?.snapshots as any)?.estimatedScheduleSnapshot || [];
  const scheduleSnapshotMap = new Map(scheduleSnapshots.map((s: any) => [s.dayIndex, s]));
  const startDate = planData.plan?.startDate ? new Date(planData.plan.startDate) : new Date();

  const mappedDays = [];
  for (let i = 1; i <= totalDays; i++) {
    const existingDay = existingDaysMap.get(i);
    if (existingDay) {
      mappedDays.push({
        id: String(existingDay._id),
        dayIndex: existingDay.dayIndex,
        dateKey: existingDay.dateKey,
        status: existingDay.status,
        phase: existingDay.phase,
        title: existingDay.title,
        focus: existingDay.focus,
        topicSlug: existingDay.topicSlug,
        topicName: existingDay.topicName,
        targetMinutes: existingDay.targetMinutes,
        actualMinutes: existingDay.actualMinutes || 0,
        isBufferDay: Boolean(existingDay.isBufferDay),
        isCheckpointDay: Boolean(existingDay.isCheckpointDay),
      });
    } else {
      const snap = scheduleSnapshotMap.get(i) as any;
      const dayDate = new Date(startDate.getTime() + (i - 1) * 86400000);
      const dateKey = dayDate.toISOString().slice(0, 10);
      mappedDays.push({
        id: `planned-day-${i}`,
        dayIndex: i,
        dateKey,
        status: "locked" as const,
        phase: snap?.phase || (i % 7 === 0 ? "checkpoint" : "guided_practice"),
        title: snap?.title || `Day ${i} · Practice & Retention`,
        focus: snap?.focus || `Progress through stage milestones and core patterns.`,
        topicSlug: snap?.topicSlug || primaryTopicSlug,
        topicName: snap?.topicName || planData.days[0]?.topicName || "Topic",
        targetMinutes: Number(planData.plan?.dailyMinutes || 45),
        actualMinutes: 0,
        isBufferDay: i % 7 === 0,
        isCheckpointDay: i % 7 === 0,
      });
    }
  }

  const completedDaysCount = planData.days.filter((d) => d.status === "completed").length;

  const mappedTasks = planData.tasks.map((t) => ({
    id: String(t._id),
    planDayId: String(t.planDayId),
    dayIndex: t.dayIndex,
    taskKey: t.taskKey,
    title: t.title,
    phase: t.phase,
    entityType: t.entityType,
    entityId: t.entityId ? String(t.entityId) : null,
    topicId: t.topicId ? String(t.topicId) : null,
    topicSlug: t.topicSlug,
    topicName: t.topicName,
    topicAlignment: (t as any).validationStatus || "aligned",
    order: t.order,
    required: t.required,
    estimatedMinutes: t.estimatedMinutes,
    status: t.status,
    planRelation: t.planRelation,
    targetUrl: t.targetUrl
      ? (t.targetUrl.startsWith("/problems/") ? `/practice${t.targetUrl}` : t.targetUrl)
      : null,
    reflectionPrompt: t.reflectionPrompt || null,
  }));

  const mappedDecisions = decisions.map((dec: any) => ({
    id: String(dec._id),
    surface: dec.surface,
    decisionType: dec.decisionType,
    selectedAction: {
      actionKey: dec.selectedAction?.actionKey || "action",
      title: dec.selectedAction?.title || "Action",
      targetUrl: dec.selectedAction?.targetUrl || "/intelligence",
      estimatedMinutes: dec.selectedAction?.estimatedMinutes || 20,
    },
    primaryReason: dec.primaryReason,
    secondaryReasons: dec.secondaryReasons || [],
    createdAt: dec.createdAt ? new Date(dec.createdAt).toISOString() : new Date().toISOString(),
  }));

  const mappedStats = stats
    ? {
        currentStreakDays: Number(stats.currentStreakDays ?? 0),
        totalFocusedMinutes: Number(stats.totalFocusedMinutes ?? 0),
        solvedProblems: Number(stats.solvedProblems ?? 0),
      }
    : { currentStreakDays: 0, totalFocusedMinutes: 0, solvedProblems: 0 };

  return (
    <IntelligenceView
      plan={toDTO(mappedPlan)}
      days={toDTO(mappedDays)}
      tasks={toDTO(mappedTasks)}
      decisions={toDTO(mappedDecisions)}
      stats={toDTO(mappedStats)}
      snapshot={toDTO(executionSnapshot)}
      topicProblems={toDTO(topicProblems)}
      activeTopicName={primaryTopicName}
      activeTopicSlug={primaryTopicSlug}
      completedDaysCount={completedDaysCount}
      initialTab={initialTab}
    />
  );
}

export default async function IntelligencePage({ searchParams }: IntelligencePageProps) {
  const userId = await requireUserId();
  const resolvedParams = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1240px] p-6 space-y-6 animate-pulse">
          <div className="h-10 w-64 rounded-xl bg-(--bg-surface-raised)" />
          <div className="h-44 w-full rounded-2xl bg-(--bg-surface-raised)" />
          <div className="h-96 w-full rounded-2xl bg-(--bg-surface-raised)" />
        </div>
      }
    >
      <IntelligenceDataLoader userId={userId} initialTab={resolvedParams.tab} />
    </Suspense>
  );
}

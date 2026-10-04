"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Flame,
  Keyboard,
  X,
  Clock,
  Compass,
} from "lucide-react";
import { NextSessionHero } from "./NextSessionHero";
import { ReviewQueuePreview } from "./ReviewQueuePreview";
import { ActivityRibbon } from "./ActivityRibbon";
import { GoalCheckpointProof } from "./GoalCheckpointProof";
import { AlternativeRoutesBar } from "./AlternativeRoutesBar";
import { ResumeContextBanner } from "./ResumeContextBanner";
import { ClubIntelligenceCard } from "./ClubIntelligenceCard";
import type {
  DashboardDTO,
  DashboardPrimaryAction,
  DashboardReviewQueue,
  DashboardTopicEvidence,
  DashboardActivityMetrics,
} from "@/features/product/types/dashboard-dto.types";

interface DashboardViewProps {
  data: any;
}


/**
 * Deliberate adapter at this single boundary for legacy tests or consumers
 * that pass an unmigrated snapshot payload.
 */
export function resolveDashboardDTO(data: any): DashboardDTO {
  if (data?.dashboardDTO && data.dashboardDTO.version === 2) {
    return data.dashboardDTO;
  }

  const user = data?.user;
  const stats = data?.stats ?? {};
  const activePlan = data?.activePlan;
  const focusAction = data?.focusAction;
  const activeMission = data?.activeMission;
  const dueRevisions = data?.dueRevisions ?? [];
  const dailyGoal = data?.dailyGoal;
  const activityHistory = data?.activityHistory ?? [];
  const topicEvidence = data?.topicEvidence;

  const todayMins = Number(dailyGoal?.studiedMinutes ?? 0);
  const targetMins = Number(dailyGoal?.goalMinutes ?? 45);
  const streak = Number(stats.currentStreak ?? stats.currentStreakDays ?? 0);
  const bestStreak = Math.max(streak, Number(stats.bestStreak ?? stats.longestStreak ?? 0));

  const primaryAction: DashboardPrimaryAction = {
    id: focusAction?.id || activeMission?.slug || "primary-action",
    actionKey: focusAction?.actionKey || "action-key",
    type: focusAction?.type || (focusAction?.planRelation === "plan_revision" ? "revision" : "problem"),
    title: focusAction?.title || activeMission?.title || "Core Algorithmic Practice",
    href: focusAction?.href || (activeMission?.slug ? `/missions/${activeMission.slug}` : "/practice"),
    topicName: focusAction?.topicName || activePlan?.topicName || activeMission?.topic || "DSA Fundamentals",
    topicSlug: focusAction?.topicSlug || activePlan?.topicSlug || activeMission?.topicSlug || "dsa",
    isCrossTopic: Boolean(focusAction?.isCrossTopic),
    relationshipLabel: focusAction?.relationshipLabel || null,
    estimatedDurationMinutes: Number(focusAction?.estimatedDurationMinutes ?? focusAction?.estimatedMinutes ?? 25),
    isDurationEstimate: true,
    reason: focusAction?.reason || focusAction?.whyThisIsNext || "Targeted invariant reinforcement.",
    sourceProvenance: focusAction?.sourceProvenance || (focusAction?.planRelation === "plan_revision" ? "due_review" : "required_plan_task"),
    afterCompletionOutcome: focusAction?.afterCompletionOutcome || "Advances schedule and records verified mastery.",
    ctaLabel: focusAction?.ctaLabel || (activePlan?.status === "paused" ? "Resume schedule" : "Start today's task"),
    ctaState: focusAction?.ctaState || (activePlan?.status === "paused" ? "paused" : "start"),
  };

  const adaptedQueue: DashboardReviewQueue = {
    dueCount: dueRevisions.length,
    estimatedTotalMinutes: Number(data?.totalRevisionMinutes ?? dueRevisions.reduce((sum: number, r: any) => sum + (r.estimatedMinutes || 7), 0)),
    items: dueRevisions.map((r: any) => ({
      id: String(r._id || r.id),
      entityType: r.entityType || "concept",
      conceptName: r.conceptName || r.title || "Concept review",
      detail: r.reason || "Retention interval elapsed",
      href: r.href || "/review",
      estimatedMinutes: r.estimatedMinutes || 7,
      priority: r.priority || 1,
      dueAt: r.dueAt || new Date().toISOString(),
    })),
    isClear: dueRevisions.length === 0,
  };

  const adaptedEvidence: DashboardTopicEvidence = {
    topicName: topicEvidence?.topicName || activePlan?.topicName || activeMission?.topic || "DSA Fundamentals",
    topicSlug: topicEvidence?.topicSlug || activePlan?.topicSlug || activeMission?.topicSlug || "dsa",
    topicSolvedCount: topicEvidence?.topicSolvedCount ?? (stats.solvedProblems > 0 ? stats.solvedProblems : null),
    topicMasteryPercent: topicEvidence?.topicMasteryPercent ?? (stats.overallMasteryScore > 0 ? stats.overallMasteryScore : null),
    hasVerifiedEvidence: Boolean(topicEvidence?.hasVerifiedEvidence ?? (stats.solvedProblems > 0 || stats.overallMasteryScore > 0)),
    checkpoint: activePlan?.checkpoint || null,
    hasRealCheckpoint: Boolean(activePlan?.checkpoint),
    focusAreas: (data?.focusAreas ?? []).map((f: any) => ({
      name: f.name,
      slug: f.slug || "",
      href: f.href || `/practice?topic=${f.slug}`,
      mastery: f.masteryScore ?? 0,
    })),
  };

  const adaptedMetrics: DashboardActivityMetrics = {
    todayFocusedMinutes: todayMins,
    todayTargetMinutes: targetMins,
    todaySolvesCount: 0,
    todayAttemptsCount: 0,
    currentStreakDays: streak,
    bestStreakDays: bestStreak,
    totalActiveDays: activityHistory.filter((d: any) => (d.actualMinutes || d.minutes || 0) > 0).length,
    totalFocusedHours: Math.round(todayMins / 60),
    totalSolvedProblems: Number(stats.solvedProblems ?? 0),
    activityHistory: activityHistory.map((d: any) => ({
      date: d.date,
      dateKey: d.dateKey || d.date,
      dayOfWeek: d.dayOfWeek ?? 0,
      actualMinutes: Number(d.actualMinutes ?? d.minutes ?? 0),
      minutes: Number(d.actualMinutes ?? d.minutes ?? 0),
      problemsSolved: Number(d.problemsSolved ?? 0),
      problemsAttempted: Number(d.problemsAttempted ?? 0),
      revisionsDone: Number(d.revisionsDone ?? 0),
      activityScore: Number(d.activityScore ?? 0),
    })),
  };

  return {
    version: 2,
    learner: {
      name: String(user?.name ?? "DSA Club Member"),
      firstName: String(user?.name ?? "Member").split(" ")[0],
      onboardingStatus: data?.onboardingSkipped ? "skipped" : (data?.isNewUser ? "in_progress" : "completed"),
      roadmapSource: (data?.roadmapSource === "personalized" || data?.roadmapSource === "customized" ? "customized" : data?.roadmapSource === "onboarding" ? "onboarding" : "starter"),
    },
    contextStatusText: data?.contextSentence || (activePlan ? `Day ${activePlan.currentDayIndex || 1} of ${activePlan.totalDays || 18} in active ${activePlan.topicName} plan.` : "Ready for today's practice."),
    learningMode: data?.learningMode || (activePlan && activePlan.status !== "paused" && activePlan.status !== "completed" ? "plan_led" : "self_paced"),
    activePlan: activePlan ?? null,
    primaryAction,
    secondaryAction: data?.resumePoint && data.resumePoint.href !== primaryAction.href ? {
      id: "secondary-resume",
      title: data.resumePoint.title || "Continue in-flight practice",
      subtitle: data.resumePoint.subtitle || "Resume draft",
      href: data.resumePoint.href,
      type: "problem",
      provenance: "draft_attempt",
    } : null,
    reviewQueue: adaptedQueue,
    topicEvidence: adaptedEvidence,
    activityMetrics: adaptedMetrics,
    interviewContext: data?.interviewImminent ? {
      isImminent: true,
      daysRemaining: data.interviewImminent.daysRemaining,
      companyName: data.interviewImminent.companyName || null,
      companySlug: data.interviewImminent.companySlug || null,
    } : null,
    bonusChallenge: data?.dashboardDTO?.bonusChallenge ?? data?.bonusChallenge ?? null,
  };
}

export function DashboardView({ data }: DashboardViewProps) {
  // Authoritative typed DashboardDTO source
  const dto: DashboardDTO = useMemo(() => resolveDashboardDTO(data), [data]);
  const router = useRouter();
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [singleKeyShortcutsEnabled, setSingleKeyShortcutsEnabled] = useState(true);
  const shortcutsOpenerRef = useRef<HTMLButtonElement>(null);
  const modalCloseButtonRef = useRef<HTMLButtonElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Load single-key shortcuts preference
  useEffect(() => {
    try {
      const stored = localStorage.getItem("dsa-club:single-key-shortcuts");
      if (stored !== null) {
        setSingleKeyShortcutsEnabled(stored === "true");
      }
    } catch {}
  }, []);

  // Time-aware greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Daily target progress: strictly uses activityMetrics.todayFocusedMinutes and todayTargetMinutes
  const studiedMins = dto.activityMetrics.todayFocusedMinutes;
  const goalMins = dto.activityMetrics.todayTargetMinutes;
  const targetPct = Math.min(100, Math.round((studiedMins / Math.max(1, goalMins)) * 100));

  // Authoritative primary action URL (Space / Enter shortcuts strictly follow this)
  const primaryActionHref = dto.primaryAction.href;
  const isPrimaryReview =
    dto.primaryAction.sourceProvenance === "due_review" || dto.primaryAction.type === "revision";

  // Focus management: move focus into modal when opened, restore to opener on close
  useEffect(() => {
    if (shortcutsModalOpen) {
      const timer = setTimeout(() => {
        modalCloseButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      shortcutsOpenerRef.current?.focus();
    }
  }, [shortcutsModalOpen]);

  // Keyboard navigation: Space/Enter trigger the authoritative hero destination
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
        return;
      }

      if (e.key === "Escape") {
        setShortcutsModalOpen(false);
        return;
      }

      if (shortcutsModalOpen) return;

      const isFocusedInteractive =
        document.activeElement &&
        document.activeElement !== document.body &&
        document.activeElement !== document.documentElement;

      if (!isFocusedInteractive) {
        if (e.code === "Space" || e.key === "Enter") {
          e.preventDefault();
          router.push(primaryActionHref);
        } else if (singleKeyShortcutsEnabled) {
          if (e.key.toLowerCase() === "r") {
            e.preventDefault();
            router.push("/review");
          } else if (e.key.toLowerCase() === "p") {
            e.preventDefault();
            router.push("/practice");
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [primaryActionHref, shortcutsModalOpen, singleKeyShortcutsEnabled, router]);

  // Motion variants with respect for prefers-reduced-motion
  const containerVariants: any = {
    hidden: { opacity: shouldReduceMotion ? 1 : 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.03,
        delayChildren: 0,
      },
    },
  };

  const itemVariants: any = {
    hidden: { opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 4 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.16, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="mx-auto max-w-[1240px] pb-12 space-y-6"
    >
      {/* ════════════════════════════════════════════════════════════════════
          1. CONTEXT HEADER
          Concise personal context line · Learner name · Real plan/topic · Daily target
          ════════════════════════════════════════════════════════════════════ */}
      <motion.section
        variants={itemVariants}
        aria-label="Personal learning context"
        className="pb-4 pt-1 border-b border-(--border-subtle)/60"
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-section sm:text-page-title text-(--text-primary) font-semibold tracking-tight">
              {greeting}, {dto.learner.firstName}.
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-(--text-secondary)">
              {dto.contextStatusText}
            </p>
          </div>

          {/* Context Badges: Daily target + Truthful streak + Shortcuts modal */}
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {/* Daily Target Progress Indicator: actual vs target */}
            <div
              className="inline-flex items-center gap-2 rounded-lg border border-(--border-subtle) bg-(--bg-surface) px-3 py-1.5 text-xs font-medium text-(--text-secondary)"
              title={`Daily target: ${studiedMins} of ${goalMins} minutes focused`}
            >
              <Clock className="size-3.5 text-(--accent-lime)" />
              <span className="font-tabular">
                <strong className="text-(--text-primary)">{studiedMins}</strong>/{goalMins}m today
              </span>
              <div className="w-10 h-1.5 rounded-full bg-(--border-subtle) overflow-hidden">
                <div
                  className="h-full bg-(--accent-lime) rounded-full transition-all duration-300"
                  style={{ width: `${targetPct}%` }}
                />
              </div>
            </div>

            {/* Streak Indicator (rendered only when truthful > 0) */}
            {dto.activityMetrics.currentStreakDays > 0 ? (
              <div
                className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-subtle) bg-(--bg-surface) px-2.5 py-1.5 text-xs font-semibold text-(--accent-lime)"
                title="Practice streak"
              >
                <Flame size={14} className="text-(--accent-lime)" aria-hidden />
                <span>{dto.activityMetrics.currentStreakDays}d streak</span>
              </div>
            ) : null}

            {/* Mode badge: Truthful Plan-Led vs Self-Paced Context */}
            {dto.learningMode === "plan_led" && dto.activePlan ? (
              <div
                className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-subtle) bg-(--bg-surface) px-2.5 py-1.5 text-xs font-semibold text-(--accent-lime)"
                title="Current learning mode: Plan-led structured progression"
              >
                <span className="size-1.5 rounded-full bg-(--accent-lime)" />
                <span>Plan-Led · Day {dto.activePlan.currentDayIndex}/{dto.activePlan.totalDays}</span>
              </div>
            ) : (
              <div
                className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-subtle) bg-(--bg-surface) px-2.5 py-1.5 text-xs font-medium text-(--text-secondary)"
                title="Current learning mode: Adaptive self-paced recommendations"
              >
                <span className="size-1.5 rounded-full bg-(--accent-teal)" />
                <span>Self-Paced Practice</span>
              </div>
            )}

            {/* Keyboard Shortcuts Trigger */}
            <button
              ref={shortcutsOpenerRef}
              type="button"
              onClick={() => setShortcutsModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-subtle) bg-(--bg-surface) px-2.5 py-1.5 text-xs font-medium text-(--text-muted) hover:text-(--text-primary) transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--accent-lime)"
              title="Keyboard shortcuts (Press ?)"
              aria-label="Keyboard shortcuts guide"
            >
              <Keyboard size={13} aria-hidden />
              <kbd className="font-mono text-[10px] text-(--text-muted)">?</kbd>
            </button>
          </div>
        </div>

        {/* Imminent Interview Notice Banner */}
        {dto.interviewContext?.isImminent && (
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--accent-amber)/40 bg-(--accent-amber)/10 px-3.5 py-2.5 text-xs text-(--accent-amber)">
            <span className="flex items-center gap-2">
              <strong className="text-xs uppercase font-bold text-(--accent-amber)">
                Interview in {dto.interviewContext.daysRemaining} days
              </strong>
              <span>
                {dto.interviewContext.companyName
                  ? `Priority focus active for ${dto.interviewContext.companyName}`
                  : "Targeted company mock window is open."}
              </span>
            </span>
            <Link
              href="/interview"
              className="inline-flex items-center gap-1 font-semibold text-(--accent-amber) hover:underline"
            >
              Go to company prep <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {/* Skipped Onboarding Starter Path Banner */}
        {(dto.learner.onboardingStatus === "skipped" || dto.learner.roadmapSource === "starter") && (
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) p-3.5 sm:px-4 sm:py-3 text-xs text-(--text-secondary)">
            <div className="flex items-center gap-2.5">
              <Compass className="size-4 shrink-0 text-(--accent-lime)" />
              <span>
                <strong className="font-semibold text-(--text-primary)">You’re on the Starter Path.</strong>{" "}
                Calibrate your schedule and targets anytime in Plan.
              </span>
            </div>
            <Link
              href="/intelligence?tab=manage"
              className="inline-flex items-center gap-1 font-semibold text-(--accent-lime) hover:underline"
            >
              Customize schedule <ArrowRight size={13} />
            </Link>
          </div>
        )}
      </motion.section>

      {/* ════════════════════════════════════════════════════════════════════
          2. AUTHORITATIVE PRIMARY ACTION SURFACE (FULL-WIDTH HERO)
          Visually dominant cockpit hero · Answers: "What should I do now?" & "Why this action?"
          ════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <NextSessionHero
          primaryAction={dto.primaryAction}
          activePlan={dto.activePlan}
          streakDays={dto.activityMetrics.currentStreakDays}
          bonusChallenge={dto.bonusChallenge}
        />

        {/* Secondary In-Flight Draft / Session Banner (Never competing with primary action) */}
        {dto.secondaryAction && (
          <div className="mt-3">
            <ResumeContextBanner
              resumePoint={dto.secondaryAction}
              primaryMissionHref={primaryActionHref}
            />
          </div>
        )}
      </motion.div>

      {/* ════════════════════════════════════════════════════════════════════
          3. LEARNING STATE REGION: TOPIC EVIDENCE & REVIEW ATTENTION
          Balanced 2-column grid · Answers: "How is my topic understanding and retention holding up?"
          ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <motion.div variants={itemVariants}>
          <GoalCheckpointProof
            topicEvidence={dto.topicEvidence}
            activePlan={dto.activePlan}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <ReviewQueuePreview
            reviewQueue={dto.reviewQueue}
            isPrimaryActionReview={isPrimaryReview}
            primaryActionId={dto.primaryAction.id}
            primaryActionTitle={dto.primaryAction.title}
            hasActivePlan={Boolean(dto.activePlan)}
            activePlanTopic={dto.activePlan?.topicName || dto.primaryAction.topicName}
          />
        </motion.div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          4. 28-DAY CONSISTENCY & PRACTICE RHYTHM (FULL-WIDTH)
          Answers: "How is my learning progressing over time?"
          Container-aware responsive calendar with stable inspector layout
          ════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <ActivityRibbon
          activityHistory={dto.activityMetrics.activityHistory}
          streakDays={dto.activityMetrics.currentStreakDays}
          todayFocusedMinutes={dto.activityMetrics.todayFocusedMinutes}
          todayTargetMinutes={dto.activityMetrics.todayTargetMinutes}
        />
      </motion.div>

      {/* ════════════════════════════════════════════════════════════════════
          5. SECONDARY ROUTES & EXPLORATION
          Quiet, clearly named text links without cramped mini-card clutter
          ════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <AlternativeRoutesBar
          topicSlug={dto.activePlan?.topicSlug || dto.primaryAction.topicSlug}
          topicName={dto.activePlan?.topicName || dto.primaryAction.topicName}
        />
      </motion.div>

      {/* ════════════════════════════════════════════════════════════════════
          KEYBOARD SHORTCUTS MODAL (Accessible dialog with focus trap)
          ════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {shortcutsModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setShortcutsModalOpen(false);
                return;
              }
              if (e.key === "Tab") {
                const focusables = modalContainerRef.current?.querySelectorAll<HTMLElement>(
                  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (!focusables || focusables.length === 0) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShortcutsModalOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            />
            <motion.div
              ref={modalContainerRef}
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.16, ease: "easeOut" }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-(--border-subtle) bg-(--bg-surface) p-6 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="shortcuts-modal-title"
            >
              <div className="flex items-center justify-between border-b border-(--border-subtle) pb-4">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-lg bg-(--accent-lime)/15 text-(--accent-lime)">
                    <Keyboard size={16} />
                  </div>
                  <div>
                    <h3 id="shortcuts-modal-title" className="text-sm font-bold text-(--text-primary)">
                      Keyboard Shortcuts
                    </h3>
                    <p className="text-[11px] text-(--text-muted)">
                      Direct controls for learning navigation
                    </p>
                  </div>
                </div>
                <button
                  ref={modalCloseButtonRef}
                  type="button"
                  onClick={() => setShortcutsModalOpen(false)}
                  className="rounded-lg p-1.5 text-(--text-muted) hover:bg-(--bg-surface-raised) hover:text-(--text-primary) transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--accent-lime)"
                  aria-label="Close dialog"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between rounded-lg bg-(--bg-surface-raised) p-2.5">
                  <span className="text-(--text-secondary)">Start / Resume Today&apos;s Task</span>
                  <div className="flex items-center gap-1 font-mono">
                    <kbd className="rounded-md border border-(--border-subtle) bg-(--bg-surface) px-2 py-0.5 text-[10px] text-(--text-primary)">
                      Space
                    </kbd>
                    <span className="text-(--text-muted)">or</span>
                    <kbd className="rounded-md border border-(--border-subtle) bg-(--bg-surface) px-2 py-0.5 text-[10px] text-(--text-primary)">
                      Enter
                    </kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-(--bg-surface-raised) p-2.5">
                  <span className="text-(--text-secondary)">Open Review Queue</span>
                  <kbd className="rounded-md border border-(--border-subtle) bg-(--bg-surface) px-2 py-0.5 font-mono text-[10px] text-(--text-primary)">
                    R
                  </kbd>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-(--bg-surface-raised) p-2.5">
                  <span className="text-(--text-secondary)">Jump to Practice</span>
                  <kbd className="rounded-md border border-(--border-subtle) bg-(--bg-surface) px-2 py-0.5 font-mono text-[10px] text-(--text-primary)">
                    P
                  </kbd>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-(--bg-surface-raised) p-2.5">
                  <span className="text-(--text-secondary)">Toggle This Guide</span>
                  <kbd className="rounded-md border border-(--border-subtle) bg-(--bg-surface) px-2 py-0.5 font-mono text-[10px] text-(--text-primary)">
                    ?
                  </kbd>
                </div>

                {/* Preference Toggle for Single-Key Shortcuts */}
                <div className="mt-3 pt-3 border-t border-(--border-subtle)/60 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-(--text-primary)">Enable single-key navigation (R, P)</p>
                    <p className="text-[10px] text-(--text-muted)">Disable if using screen readers or assistive key remappers</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={singleKeyShortcutsEnabled}
                    onClick={() => {
                      const next = !singleKeyShortcutsEnabled;
                      setSingleKeyShortcutsEnabled(next);
                      try {
                        localStorage.setItem("dsa-club:single-key-shortcuts", String(next));
                      } catch {}
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--accent-lime) ${
                      singleKeyShortcutsEnabled ? "bg-(--accent-lime)" : "bg-(--border-subtle)"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-4 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                        singleKeyShortcutsEnabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

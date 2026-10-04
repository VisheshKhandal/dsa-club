"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ButtonLink, EmptySlate } from "@/components/product/ui";
import { LearningPathContextBar } from "@/components/product/learning-path-context-bar";
import type { LearningPathContext } from "@/features/learning-paths/types/learning-path-continuity.types";

import {
  TopicHeader,
  TopicTabs,
  type TopicWorkspaceTab,
  CurrentLearningModule,
  TopicSnapshot,
  PracticeSection,
  PatternRecognitionSection,
  ExploreRelatedSection,
  TopicProgressWorkspace,
} from "./topic";

export type TopicDetailData = NonNullable<
  Awaited<ReturnType<typeof import("@/features/product/services/product.service").getTopicDetailData>>
>;

export function TopicDetailView({
  data,
  learningPathContext,
}: {
  data: TopicDetailData | null;
  learningPathContext?: LearningPathContext | null;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<TopicWorkspaceTab>("learning");
  const [focusMode, setFocusMode] = useState(false);

  if (!data) {
    return (
      <div className="w-full max-w-3xl mx-auto py-12">
        <EmptySlate
          title="Topic not found"
          description="This topic is not published in the current learning catalog."
          action={<ButtonLink href="/learn">Back to Learn</ButtonLink>}
        />
      </div>
    );
  }

  const activeMission =
    data.missions.find((m) => m.status === "in_progress") ??
    data.missions.find((m) => m.status !== "completed") ??
    data.missions[0];

  const totalPracticeCount = data.counts.problems;
  const solvedCount = data.counts.solvedProblems;
  const totalPatternCount = data.counts.patterns;
  const masteredPatternCount = data.counts.patternsCompleted;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-12 pt-1 transition-all duration-200">
      {/* ── Path Continuity Context Layer ── */}
      {learningPathContext && (
        <LearningPathContextBar context={learningPathContext} className="mb-2" />
      )}

      {/* ── Compact Editorial Topic Header ── */}
      <TopicHeader
        data={data}
        activeMission={activeMission}
        learningPathContext={learningPathContext}
        focusMode={focusMode}
        onToggleFocusMode={() => setFocusMode((prev) => !prev)}
      />

      {/* ── Workspace Level Switch (Learning vs Progress) ── */}
      <TopicTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        learningCount={data.counts.problems + data.missions.length}
        progressCount={data.counts.revisionsDue || undefined}
      />

      {/* ── Active Workspace View ── */}
      <AnimatePresence mode="wait">
        {activeTab === "learning" ? (
          <motion.div
            key="learning-workspace"
            id="topic-workspace-panel-learning"
            role="tabpanel"
            aria-labelledby="topic-workspace-tab-learning"
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="space-y-10"
          >
            {/* ── Row 1: Current Learning (≈65%) + Topic Snapshot (≈35%) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className={focusMode ? "lg:col-span-12" : "lg:col-span-8"}>
                <CurrentLearningModule data={data} missions={data.missions} />
              </div>

              {!focusMode && (
                <div className="lg:col-span-4">
                  <TopicSnapshot data={data} />
                </div>
              )}
            </div>

            {/* ── Row 2: Practice Problems (≈70%) + Pattern Recognition (≈30%) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
              <div className={focusMode ? "lg:col-span-12" : "lg:col-span-8"}>
                <PracticeSection
                  problems={data.problems}
                  solvedCount={solvedCount}
                  totalCount={totalPracticeCount}
                />
              </div>

              {!focusMode && (
                <div className="lg:col-span-4">
                  <PatternRecognitionSection
                    patterns={data.patterns}
                    masteredCount={masteredPatternCount}
                    totalCount={totalPatternCount}
                  />
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="progress-workspace"
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <TopicProgressWorkspace data={data} activeMission={activeMission} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Explore Related Topics (Lightweight Navigation Rail) ── */}
      <ExploreRelatedSection topics={data.relatedTopics} />
    </div>
  );
}

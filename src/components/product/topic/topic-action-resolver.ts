import type { TopicDetailData } from "@/components/product/topic-detail-view";

export type TopicResolvedStateKey =
  | "not_started"
  | "in_progress"
  | "mission_completed"
  | "mastered";

export interface ResolvedTopicAction {
  resolvedState: TopicResolvedStateKey;

  statusBadge: {
    label: string;
    variant: "not_started" | "in_progress" | "mission_completed" | "mastered";
  };

  headerAction: {
    label: string;
    href: string;
    icon: "play" | "target" | "git-branch" | "book-open";
    variant: "primary" | "secondary";
    subtext?: string;
  };

  spotlight: {
    eyebrow: string;
    title: string;
    description: string;
    actionLabel: string;
    actionHref: string;
    actionIcon: "play" | "target" | "git-branch" | "book-open";
    isMissionComplete: boolean;
    isTopicMastered: boolean;
    secondaryAction?: {
      label: string;
      href: string;
    };
  };
}

export function resolveTopicAction(data: TopicDetailData): ResolvedTopicAction {
  const { topic, counts, missions, problems, patterns } = data;

  const activeMission =
    missions.find((m) => m.status === "in_progress") ??
    missions.find((m) => m.status !== "completed") ??
    missions[0];

  const allMissionsDone =
    counts.missions > 0 && counts.missionsCompleted === counts.missions;
  const isMissionCompleted =
    Boolean(activeMission && activeMission.status === "completed") || allMissionsDone;

  const isTopicMastered =
    topic.state === "mastered" ||
    topic.progress >= 100 ||
    (counts.problems > 0 &&
      counts.solvedProblems === counts.problems &&
      counts.patternsCompleted === counts.patterns &&
      (counts.missions === 0 || allMissionsDone));

  // Find next actionable practice items
  const nextUnsolvedProblem = problems.find((p) => p.status !== "solved");
  const nextIncompletePattern = patterns.find((p) => p.status !== "completed");

  // ── CASE 1: TOPIC MASTERED ──
  if (isTopicMastered) {
    return {
      resolvedState: "mastered",
      statusBadge: {
        label: "Mastered",
        variant: "mastered",
      },
      headerAction: {
        label: activeMission ? "Review Mission" : "Practice Problems",
        href: activeMission ? `/missions/${activeMission.slug}` : "#practice-section",
        icon: activeMission ? "book-open" : "target",
        variant: "secondary",
      },
      spotlight: {
        eyebrow: "Topic Mastered · Complete",
        title: "All stages and objectives mastered",
        description:
          "You have achieved mastery in this topic. Review mission concepts anytime, solve more practice problems, or explore related topics.",
        actionLabel: activeMission ? "Review Mission" : "Practice Problems",
        actionHref: activeMission ? `/missions/${activeMission.slug}` : "#practice-section",
        actionIcon: activeMission ? "book-open" : "target",
        isMissionComplete: true,
        isTopicMastered: true,
      },
    };
  }

  // ── CASE 2: MISSION INCOMPLETE (Active or Not Started) ──
  if (activeMission && !isMissionCompleted) {
    const isMissionInProgress =
      activeMission.status === "in_progress" ||
      activeMission.completedSteps > 0 ||
      topic.progress > 0;

    const activeStage =
      activeMission.stages.find((s) => s.status === "active") ??
      activeMission.stages[0];
    const activeStageLabel = activeStage?.kind
      ? activeStage.kind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "Core Concept";

    if (isMissionInProgress) {
      return {
        resolvedState: "in_progress",
        statusBadge: {
          label: "In Progress",
          variant: "in_progress",
        },
        headerAction: {
          label: "Resume Mission →",
          href: `/missions/${activeMission.slug}`,
          icon: "play",
          variant: "primary",
          subtext: activeStageLabel,
        },
        spotlight: {
          eyebrow: "Current Step",
          title: activeStageLabel,
          description:
            "Understand foundational intuition and problem patterns before advancing to subsequent stages.",
          actionLabel: "Resume Mission →",
          actionHref: `/missions/${activeMission.slug}`,
          actionIcon: "play",
          isMissionComplete: false,
          isTopicMastered: false,
        },
      };
    }

    // Not started yet
    return {
      resolvedState: "not_started",
      statusBadge: {
        label: "Not Started",
        variant: "not_started",
      },
      headerAction: {
        label: "Start Mission →",
        href: `/missions/${activeMission.slug}`,
        icon: "play",
        variant: "primary",
      },
      spotlight: {
        eyebrow: "First Step",
        title: activeMission.title,
        description:
          "Begin this mission to build intuition, mental models, and algorithmic problem patterns.",
        actionLabel: "Start Mission →",
        actionHref: `/missions/${activeMission.slug}`,
        actionIcon: "play",
        isMissionComplete: false,
        isTopicMastered: false,
      },
    };
  }

  // ── CASE 3: MISSION COMPLETE, BUT TOPIC IN PROGRESS ──
  // Fix state inconsistency: If mission is complete, determine next meaningful focus!
  if (nextUnsolvedProblem) {
    return {
      resolvedState: "in_progress",
      statusBadge: {
        label: "In Progress",
        variant: "in_progress",
      },
      headerAction: {
        label: "Solve Problem →",
        href: `/practice/problems/${nextUnsolvedProblem.slug}`,
        icon: "target",
        variant: "primary",
        subtext: nextUnsolvedProblem.title,
      },
      spotlight: {
        eyebrow: "Mission Complete ✓ · Next Focus",
        title: `Solve: ${nextUnsolvedProblem.title}`,
        description: `Reinforce intuition from ${activeMission?.title ?? "the mission"} with ${nextUnsolvedProblem.difficulty} practice.`,
        actionLabel: "Solve Problem →",
        actionHref: `/practice/problems/${nextUnsolvedProblem.slug}`,
        actionIcon: "target",
        isMissionComplete: true,
        isTopicMastered: false,
        secondaryAction: activeMission
          ? {
              label: "Review Mission",
              href: `/missions/${activeMission.slug}`,
            }
          : undefined,
      },
    };
  }

  if (nextIncompletePattern) {
    return {
      resolvedState: "in_progress",
      statusBadge: {
        label: "In Progress",
        variant: "in_progress",
      },
      headerAction: {
        label: "Practice Patterns →",
        href: `/patterns/${nextIncompletePattern.slug}`,
        icon: "git-branch",
        variant: "primary",
        subtext: nextIncompletePattern.name,
      },
      spotlight: {
        eyebrow: "Mission Complete ✓ · Next Focus",
        title: `Pattern: ${nextIncompletePattern.name}`,
        description:
          "All mission stages completed. Master key problem variations and patterns to finish this topic.",
        actionLabel: "Practice Patterns →",
        actionHref: `/patterns/${nextIncompletePattern.slug}`,
        actionIcon: "git-branch",
        isMissionComplete: true,
        isTopicMastered: false,
        secondaryAction: activeMission
          ? {
              label: "Review Mission",
              href: `/missions/${activeMission.slug}`,
            }
          : undefined,
      },
    };
  }

  // If no more problems or patterns remain to solve
  return {
    resolvedState: "mission_completed",
    statusBadge: {
      label: "Mission Completed",
      variant: "mission_completed",
    },
    headerAction: {
      label: activeMission ? "Review Mission" : "Continue Learning →",
      href: activeMission ? `/missions/${activeMission.slug}` : "/learn",
      icon: "book-open",
      variant: "secondary",
    },
    spotlight: {
      eyebrow: "Current Step · ✓ All Stages Completed",
      title: "All stages mastered",
      description:
        "Reinforce your knowledge through practice or review the mission concepts.",
      actionLabel: "Review Mission",
      actionHref: activeMission ? `/missions/${activeMission.slug}` : "/learn",
      actionIcon: "book-open",
      isMissionComplete: true,
      isTopicMastered: false,
    },
  };
}

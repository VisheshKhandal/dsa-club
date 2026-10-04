import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("DSA Club Topic Workspace — Editorial Balance & Asymmetrical Composition", () => {
  const topicDir = path.resolve(process.cwd(), "src/components/product/topic");
  const viewFile = path.resolve(process.cwd(), "src/components/product/topic-detail-view.tsx");
  const loadingFile = path.resolve(process.cwd(), "src/app/(product)/learn/topics/[slug]/loading.tsx");

  describe("Surface Hierarchy: Open Primary Areas vs Selective Supporting Panels", () => {
    it("keeps primary areas (TopicHeader, CurrentLearningModule, PracticeSection) open and not wrapped in cards", () => {
      const headerContent = fs.readFileSync(path.join(topicDir, "TopicHeader.tsx"), "utf-8");
      const missionContent = fs.readFileSync(path.join(topicDir, "CurrentLearningModule.tsx"), "utf-8");
      const practiceContent = fs.readFileSync(path.join(topicDir, "PracticeSection.tsx"), "utf-8");

      // TopicHeader is an editorial header
      expect(headerContent).not.toContain("rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1)");
      expect(headerContent).toContain("<header");

      // CurrentLearningModule sits directly on canvas with timeline
      expect(missionContent).not.toContain("rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1)");
      expect(missionContent).toContain("Mission Journey");

      // PracticeSection sits directly on canvas with divider rows
      expect(practiceContent).not.toContain("rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1)");
      expect(practiceContent).toContain("divide-y divide-(--color-border)");
    });

    it("uses clean supporting panels for secondary features (TopicSnapshot, PatternRecognition)", () => {
      const snapshotContent = fs.readFileSync(path.join(topicDir, "TopicSnapshot.tsx"), "utf-8");
      const patternContent = fs.readFileSync(path.join(topicDir, "PatternRecognitionSection.tsx"), "utf-8");

      // TopicSnapshot is a contained supporting panel
      expect(snapshotContent).toContain("rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1)");
      expect(snapshotContent).toContain("divide-y divide-(--color-border)");

      // PatternRecognition is a contained supporting panel with lightweight rows
      expect(patternContent).toContain("rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1)");
      expect(patternContent).toContain("divide-y divide-(--color-border)");
      // Must NOT wrap each individual pattern in a nested card box
      expect(patternContent).not.toContain("rounded-(--radius-btn) border border-(--color-border) bg-(--color-surface-2)");
    });
  });

  describe("Asymmetrical Multi-Column Composition", () => {
    it("allocates ≈65% width to Current Learning and ≈35% to Topic Snapshot in Row 1", () => {
      const viewContent = fs.readFileSync(viewFile, "utf-8");

      expect(viewContent).toContain("grid grid-cols-1 lg:grid-cols-12 gap-8 items-start");
      expect(viewContent).toContain("lg:col-span-8");
      expect(viewContent).toContain("lg:col-span-4");
    });

    it("allocates ≈70% width to Practice and ≈30% to Pattern Recognition in Row 2", () => {
      const viewContent = fs.readFileSync(viewFile, "utf-8");

      expect(viewContent).toContain("grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2");
      expect(viewContent).toContain("<PracticeSection");
      expect(viewContent).toContain("<PatternRecognitionSection");
    });

    it("eliminates fixed narrow constraint (max-w-3xl) in favor of fluid max-w-7xl canvas", () => {
      const viewContent = fs.readFileSync(viewFile, "utf-8");

      expect(viewContent).toContain("max-w-7xl");
      expect(viewContent).not.toMatch(/<div className="[^"]*max-w-3xl[^"]*space-y-8/);
    });

    it("aligns loading skeleton geometry with the asymmetrical rows and panels", () => {
      const loadingContent = fs.readFileSync(loadingFile, "utf-8");

      expect(loadingContent).toContain("max-w-7xl");
      expect(loadingContent).toContain("lg:col-span-8");
      expect(loadingContent).toContain("lg:col-span-4");
    });
  });

  describe("Compact Hero & Metric Presentation", () => {
    it("renders a compact editorial header with title, difficulty, duration, and aligned CTA", () => {
      const headerContent = fs.readFileSync(path.join(topicDir, "TopicHeader.tsx"), "utf-8");

      expect(headerContent).toContain("DifficultyBadge");
      expect(headerContent).toContain("text-2xl sm:text-3xl font-extrabold");
      expect(headerContent).toContain("border-b border-(--color-border)");
    });

    it("formats metrics into a cohesive row without mini-card containers", () => {
      const headerContent = fs.readFileSync(path.join(topicDir, "TopicHeader.tsx"), "utf-8");

      expect(headerContent).toContain("Mastery");
      expect(headerContent).toContain("Problems");
      expect(headerContent).toContain("Patterns");
      expect(headerContent).toContain("Missions");
    });
  });

  describe("Learning Path Continuity & Breadcrumb Navigation", () => {
    it("integrates LearningPathContextBar when path context is provided", () => {
      const viewContent = fs.readFileSync(viewFile, "utf-8");

      expect(viewContent).toContain("learningPathContext &&");
      expect(viewContent).toContain("<LearningPathContextBar");
    });

    it("renders deterministic semantic back URL to stage in TopicHeader when in path context", () => {
      const headerContent = fs.readFileSync(path.join(topicDir, "TopicHeader.tsx"), "utf-8");

      expect(headerContent).toContain("learningPathContext.backToStageUrl");
      expect(headerContent).toContain("Stage {learningPathContext.stageOrder}");
    });

    it("renders fallback /learn breadcrumb when no path context exists", () => {
      const headerContent = fs.readFileSync(path.join(topicDir, "TopicHeader.tsx"), "utf-8");

      expect(headerContent).toContain('href="/learn"');
    });
  });

  describe("Progressive Disclosure & Workspace Tabs", () => {
    it("implements bounded initial problems with progressive disclosure toggle", () => {
      const practiceContent = fs.readFileSync(path.join(topicDir, "PracticeSection.tsx"), "utf-8");

      expect(practiceContent).toContain("INITIAL_VISIBLE_COUNT = 5");
      expect(practiceContent).toContain("remainingProblems");
      expect(practiceContent).toContain("Show fewer problems");
    });

    it("supports switching between Learning and Progress workspaces with tab semantics", () => {
      const tabsContent = fs.readFileSync(path.join(topicDir, "TopicTabs.tsx"), "utf-8");

      expect(tabsContent).toContain('role="tablist"');
      expect(tabsContent).toContain('role="tab"');
      expect(tabsContent).toContain("activeTopicTabUnderline");
    });
  });

  describe("Product Intelligence & State Consistency (resolveTopicAction)", () => {
    // Import helper dynamically
    it("resolves to Resume Mission when mission is in progress", async () => {
      const { resolveTopicAction } = await import("./topic-action-resolver");

      const mockData = {
        topic: { id: "1", slug: "arrays", title: "Arrays", description: "Array fundamentals", difficulty: "easy" as const, minutes: 60, progress: 30, confidence: 20, state: "in_progress", solvedCount: 1, attempts: 2, lastStudiedAt: "", lastSolvedAt: "" },
        counts: { problems: 10, solvedProblems: 1, patterns: 3, patternsCompleted: 0, missions: 1, missionsCompleted: 0, revisionsDue: 0 },
        missions: [
          { id: "m1", slug: "arrays-in-depth", title: "Complete Arrays in Depth", description: "", difficulty: "easy" as const, minutes: 30, progress: 50, status: "in_progress", completedSteps: 3, totalSteps: 6, stages: [{ key: "s1", kind: "intuition", label: "Intuition", status: "completed" as const }, { key: "s2", kind: "concept", label: "Concept", status: "active" as const }], activeStageKind: "concept" }
        ],
        problems: [
          { id: "p1", slug: "two-sum", title: "Two Sum", summary: "", difficulty: "easy" as const, pattern: "Hashing", status: "solved", confidence: 80 },
          { id: "p2", slug: "best-time", title: "Best Time to Buy and Sell Stock", summary: "", difficulty: "easy" as const, pattern: "Two Pointers", status: "not_started", confidence: 0 }
        ],
        patterns: [
          { id: "pat1", name: "Two Pointers", slug: "two-pointers", difficulty: "easy" as const, description: "", progress: 20, status: "in_progress" as const }
        ],
        relatedTopics: [],
        reflections: [],
        revisions: [],
      };

      const result = resolveTopicAction(mockData);
      expect(result.resolvedState).toBe("in_progress");
      expect(result.statusBadge.label).toBe("In Progress");
      expect(result.headerAction.label).toBe("Resume Mission →");
      expect(result.headerAction.href).toBe("/missions/arrays-in-depth");
      expect(result.spotlight.isMissionComplete).toBe(false);
    });

    it("eliminates contradiction: directs to Solve Problem when mission is complete but problems remain", async () => {
      const { resolveTopicAction } = await import("./topic-action-resolver");

      const mockData = {
        topic: { id: "1", slug: "arrays", title: "Arrays", description: "Array fundamentals", difficulty: "easy" as const, minutes: 60, progress: 43, confidence: 50, state: "in_progress", solvedCount: 1, attempts: 2, lastStudiedAt: "", lastSolvedAt: "" },
        counts: { problems: 46, solvedProblems: 1, patterns: 13, patternsCompleted: 0, missions: 1, missionsCompleted: 1, revisionsDue: 0 },
        missions: [
          { id: "m1", slug: "arrays-in-depth", title: "Complete Arrays in Depth", description: "", difficulty: "easy" as const, minutes: 30, progress: 100, status: "completed", completedSteps: 6, totalSteps: 6, stages: [{ key: "s1", kind: "intuition", label: "Intuition", status: "completed" as const }], activeStageKind: "intuition" }
        ],
        problems: [
          { id: "p1", slug: "two-sum", title: "Two Sum", summary: "", difficulty: "easy" as const, pattern: "Hashing", status: "solved", confidence: 80 },
          { id: "p2", slug: "min-rotated", title: "Find Minimum in Rotated Sorted Array", summary: "", difficulty: "medium" as const, pattern: "Binary Search", status: "not_started", confidence: 0 }
        ],
        patterns: [
          { id: "pat1", name: "Binary Search", slug: "binary-search", difficulty: "medium" as const, description: "", progress: 0, status: "not_started" as const }
        ],
        relatedTopics: [],
        reflections: [],
        revisions: [],
      };

      const result = resolveTopicAction(mockData);
      // NEVER say Resume Mission when mission is complete!
      expect(result.headerAction.label).not.toContain("Resume Mission");
      expect(result.headerAction.label).toBe("Solve Problem →");
      expect(result.headerAction.href).toBe("/practice/problems/min-rotated");
      expect(result.spotlight.eyebrow).toContain("Mission Complete");
      expect(result.spotlight.title).toBe("Solve: Find Minimum in Rotated Sorted Array");
      expect(result.spotlight.actionLabel).toBe("Solve Problem →");
      expect(result.spotlight.secondaryAction?.label).toBe("Review Mission");
    });

    it("directs to Practice Patterns when mission is complete and problems are solved", async () => {
      const { resolveTopicAction } = await import("./topic-action-resolver");

      const mockData = {
        topic: { id: "1", slug: "arrays", title: "Arrays", description: "Array fundamentals", difficulty: "easy" as const, minutes: 60, progress: 85, confidence: 90, state: "in_progress", solvedCount: 2, attempts: 2, lastStudiedAt: "", lastSolvedAt: "" },
        counts: { problems: 2, solvedProblems: 2, patterns: 2, patternsCompleted: 1, missions: 1, missionsCompleted: 1, revisionsDue: 0 },
        missions: [
          { id: "m1", slug: "arrays-in-depth", title: "Complete Arrays in Depth", description: "", difficulty: "easy" as const, minutes: 30, progress: 100, status: "completed", completedSteps: 6, totalSteps: 6, stages: [], activeStageKind: null }
        ],
        problems: [
          { id: "p1", slug: "two-sum", title: "Two Sum", summary: "", difficulty: "easy" as const, pattern: "Hashing", status: "solved", confidence: 100 },
          { id: "p2", slug: "min-rotated", title: "Find Minimum in Rotated Sorted Array", summary: "", difficulty: "medium" as const, pattern: "Binary Search", status: "solved", confidence: 90 }
        ],
        patterns: [
          { id: "pat1", name: "Hashing", slug: "hashing", difficulty: "easy" as const, description: "", progress: 100, status: "completed" as const },
          { id: "pat2", name: "Binary Search", slug: "binary-search", difficulty: "medium" as const, description: "", progress: 40, status: "in_progress" as const }
        ],
        relatedTopics: [],
        reflections: [],
        revisions: [],
      };

      const result = resolveTopicAction(mockData);
      expect(result.headerAction.label).toBe("Practice Patterns →");
      expect(result.headerAction.href).toBe("/patterns/binary-search");
      expect(result.spotlight.actionLabel).toBe("Practice Patterns →");
      expect(result.spotlight.title).toBe("Pattern: Binary Search");
    });

    it("resolves to Mastered with review actions when topic is fully completed", async () => {
      const { resolveTopicAction } = await import("./topic-action-resolver");

      const mockData = {
        topic: { id: "1", slug: "arrays", title: "Arrays", description: "Array fundamentals", difficulty: "easy" as const, minutes: 60, progress: 100, confidence: 100, state: "mastered", solvedCount: 2, attempts: 2, lastStudiedAt: "", lastSolvedAt: "" },
        counts: { problems: 2, solvedProblems: 2, patterns: 1, patternsCompleted: 1, missions: 1, missionsCompleted: 1, revisionsDue: 0 },
        missions: [
          { id: "m1", slug: "arrays-in-depth", title: "Complete Arrays in Depth", description: "", difficulty: "easy" as const, minutes: 30, progress: 100, status: "completed", completedSteps: 6, totalSteps: 6, stages: [], activeStageKind: null }
        ],
        problems: [
          { id: "p1", slug: "two-sum", title: "Two Sum", summary: "", difficulty: "easy" as const, pattern: "Hashing", status: "solved", confidence: 100 },
          { id: "p2", slug: "min-rotated", title: "Find Minimum in Rotated Sorted Array", summary: "", difficulty: "medium" as const, pattern: "Binary Search", status: "solved", confidence: 100 }
        ],
        patterns: [
          { id: "pat1", name: "Hashing", slug: "hashing", difficulty: "easy" as const, description: "", progress: 100, status: "completed" as const }
        ],
        relatedTopics: [],
        reflections: [],
        revisions: [],
      };

      const result = resolveTopicAction(mockData);
      expect(result.resolvedState).toBe("mastered");
      expect(result.statusBadge.label).toBe("Mastered");
      expect(result.statusBadge.variant).toBe("mastered");
      expect(result.headerAction.label).toBe("Review Mission");
      expect(result.spotlight.isTopicMastered).toBe(true);
    });
  });
});


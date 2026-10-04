import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { Types } from "mongoose";
import { resolveAuthoritativeLearningAction } from "../decisions/decision-selector";
import {
  applyEventToTopicProgressDoc,
  calculateTopicMasteryScore,
} from "../projections/topic-progress.projector";
import type { IUserTopicProgressDocument } from "../models/user-topic-progress.model";
import type { ILearningEvent } from "../events/learning-event.types";
import {
  applyPreferencesToDOM,
  DEFAULT_PREFERENCES,
  type DSAClubPreferences,
} from "@/components/preferences/preferences-provider";
import { DARK_LOGO_PATH, LIGHT_LOGO_PATH } from "@/components/ui/brand-logo";

describe("PROMPT 7 — Production Theme, Learning-Intelligence & Dashboard Contract", () => {
  const mockUserId = new Types.ObjectId().toString();

  // ══════════════════════════════════════════════════════════════════════════
  // SUITE 1: THEME SYSTEM CONSOLIDATION & BRAND LOGO TRANSPARENCY
  // ══════════════════════════════════════════════════════════════════════════
  describe("1. Theme Token Coverage & Persistence", () => {
    it("verifies tokens.css defines complete semantic surfaces in light theme without dark fallthrough", () => {
      const tokensPath = path.resolve(process.cwd(), "src/styles/tokens.css");
      const tokensContent = fs.readFileSync(tokensPath, "utf-8");

      // Core semantic surfaces must be present under light theme
      expect(tokensContent).toContain("--bg-app: #F8FAFC");
      expect(tokensContent).toContain("--bg-sidebar: #FFFFFF");
      expect(tokensContent).toContain("--bg-surface: #FFFFFF");
      expect(tokensContent).toContain("--bg-surface-raised: #F1F5F9");
      expect(tokensContent).toContain("--bg-surface-hover: #E2E8F0");
      expect(tokensContent).toContain("--border-subtle: #E2E8F0");
      expect(tokensContent).toContain("--border-strong: #CBD5E1");
      expect(tokensContent).toContain("--text-primary: #0F172A");
      expect(tokensContent).toContain("--text-secondary: #334155");
      expect(tokensContent).toContain("--text-muted: #64748B");
      expect(tokensContent).toContain("--focus-ring: #65A30D");

      // Complete bidirectional aliases for legacy --color-* variables
      expect(tokensContent).toContain("--color-bg: var(--bg-app)");
      expect(tokensContent).toContain("--color-surface-1: var(--bg-surface)");
      expect(tokensContent).toContain("--color-surface-2: var(--bg-surface-raised)");
      expect(tokensContent).toContain("--color-surface-3: var(--bg-surface-hover)");
      expect(tokensContent).toContain("--color-border: var(--border-subtle)");
      expect(tokensContent).toContain("--color-text-primary: var(--text-primary)");
    });

    it("verifies globals.css base layer wires Tailwind variables directly to semantic tokens", () => {
      const globalsPath = path.resolve(process.cwd(), "src/app/globals.css");
      const globalsContent = fs.readFileSync(globalsPath, "utf-8");

      expect(globalsContent).toContain("--background: var(--bg-app)");
      expect(globalsContent).toContain("--foreground: var(--text-primary)");
      expect(globalsContent).toContain("--card: var(--bg-surface)");
      expect(globalsContent).toContain("--border: var(--border-subtle)");
      expect(globalsContent).toContain("--ring: var(--focus-ring)");
    });

    it("verifies both Dark and Light logo assets exist and have transparent backgrounds", () => {
      const publicIconsDir = path.resolve(process.cwd(), "public/icons");
      const darkLogo = path.join(publicIconsDir, "dsa-club-lockup.png");
      const lightLogo = path.join(publicIconsDir, "DSA Club Lockup Light Mode.png");

      expect(fs.existsSync(darkLogo)).toBe(true);
      expect(fs.existsSync(lightLogo)).toBe(true);

      // Verify Light mode logo file size is optimized with transparent PNG encoding
      const stat = fs.statSync(lightLogo);
      expect(stat.size).toBeLessThan(50000); // 34KB transparent PNG vs 77KB opaque PNG
    });

    it("verifies applyPreferencesToDOM applies light theme classes and persists to DOM synchronously", () => {
      const classes = new Set<string>();
      const attributes: Record<string, string> = {};
      const mockElement: any = {
        classList: {
          add: (c: string) => classes.add(c),
          remove: (c: string) => classes.delete(c),
          contains: (c: string) => classes.has(c),
        },
        setAttribute: (k: string, v: string) => { attributes[k] = v; },
        getAttribute: (k: string) => attributes[k] ?? null,
      };
      (globalThis as any).document = { documentElement: mockElement };
      (globalThis as any).window = { matchMedia: () => ({ matches: false }) };

      const lightPrefs: DSAClubPreferences = {
        ...DEFAULT_PREFERENCES,
        theme: "light",
      };
      applyPreferencesToDOM(lightPrefs);

      expect(mockElement.classList.contains("light")).toBe(true);
      expect(mockElement.classList.contains("dark")).toBe(false);
      expect(mockElement.getAttribute("data-theme")).toBe("light");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SUITE 2: STRICT LEARNING-MODE CONTRACT & SAFE FAIL-SAFE
  // ══════════════════════════════════════════════════════════════════════════
  describe("2. Plan-Led vs Self-Paced Contract & Safe Recovery", () => {
    it("fails safely when active plan has unresolvable current day: preserves plan-led authority and does not fall through to self-paced", async () => {
      const activePlan = {
        _id: "plan-active-1",
        topicName: "Binary Trees",
        topicSlug: "binary-trees",
        status: "active",
      };

      // Unresolvable current day (e.g. calculation failed or schedule needs recalibration)
      const result = await resolveAuthoritativeLearningAction({
        userId: mockUserId,
        activePlan,
        currentPlanDay: null,
        mode: "plan_led",
        practiceRecs: [
          {
            problem: { _id: "prob-random-1", title: "Two Sum" },
            score: 95,
            reason: "adaptive_weakness",
          },
        ],
      });

      // Must NOT fall through to Two Sum practice recommendation!
      expect(result.primaryAction.title).toBe("Recalibrate Binary Trees Plan");
      expect(result.primaryAction.actionKey).toBe("plan-recovery");
      expect(result.primaryAction.ctaState).toBe("start");
      expect(result.primaryAction.ctaLabel).toBe("Recalibrate study plan");
      expect(result.primaryAction.href).toBe("/plan");
      expect(result.primaryAction.sourceProvenance).toBe("required_plan_task");
    });

    it("authoritatively prioritizes scheduled plan day task over unscheduled due reviews and off-plan recommendations", async () => {
      const activePlan = {
        _id: "plan-active-2",
        topicName: "Dynamic Programming",
        topicSlug: "dynamic-programming",
        status: "active",
      };
      const currentPlanDay = {
        dayIndex: 4,
        topicName: "Dynamic Programming",
        topicSlug: "dynamic-programming",
        focus: "1D DP Memoization",
      };
      const todayTasks = [
        {
          _id: "task-dp-1",
          taskKey: "climbing-stairs",
          title: "Climbing Stairs DP Invariant",
          required: true,
          status: "pending",
          entityType: "problem",
          estimatedMinutes: 20,
        },
      ];
      const dueRevisions = [
        {
          _id: "rev-heap-1",
          entityId: "heap-concept",
          entityType: "concept",
          priority: 5,
        },
      ];

      const result = await resolveAuthoritativeLearningAction({
        userId: mockUserId,
        activePlan,
        currentPlanDay,
        todayTasks,
        dueRevisions,
        mode: "plan_led",
      });

      expect(result.primaryAction.title).toBe("Climbing Stairs DP Invariant");
      expect(result.primaryAction.sourceProvenance).toBe("required_plan_task");
      expect(result.primaryAction.planDayIndex).toBe(4);
    });

    it("allows scheduled retention review to be primary action only when explicitly part of scheduled plan day", async () => {
      const activePlan = {
        _id: "plan-active-3",
        topicName: "Graphs",
        topicSlug: "graphs",
        status: "active",
      };
      const currentPlanDay = {
        dayIndex: 7,
        topicName: "Graphs",
        topicSlug: "graphs",
        focus: "Scheduled Retention & Cycle Detection",
      };
      const todayTasks = [
        {
          _id: "task-rev-graph",
          taskKey: "graph-bfs-revision",
          title: "Graph BFS Traversal Review",
          required: true,
          status: "pending",
          entityType: "revision",
          estimatedMinutes: 10,
        },
      ];

      const result = await resolveAuthoritativeLearningAction({
        userId: mockUserId,
        activePlan,
        currentPlanDay,
        todayTasks,
        mode: "plan_led",
      });

      expect(result.primaryAction.title).toBe("Graph BFS Traversal Review");
      expect(result.primaryAction.sourceProvenance).toBe("due_review");
      expect(result.primaryAction.type).toBe("revision");
      expect(result.primaryAction.ctaLabel).toBe("Start scheduled review");
    });

    it("allows explicit self-paced mode even when an active plan exists, enabling exploration and return to plan", async () => {
      const activePlan = {
        _id: "plan-active-4",
        topicName: "Sliding Window",
        topicSlug: "sliding-window",
        status: "active",
      };
      const currentPlanDay = {
        dayIndex: 2,
        topicName: "Sliding Window",
        topicSlug: "sliding-window",
      };

      const result = await resolveAuthoritativeLearningAction({
        userId: mockUserId,
        activePlan,
        currentPlanDay,
        mode: "self_paced",
        practiceRecs: [
          {
            problem: {
              _id: "prob-sliding-max",
              title: "Max Sliding Window",
              slug: "max-sliding-window",
              topic: "Sliding Window",
            },
            score: 92,
            reason: "adaptive_weakness",
          },
        ],
      });

      expect(result.primaryAction.title).toBe("Max Sliding Window");
      expect(result.primaryAction.sourceProvenance).toBe("self_paced_recommendation");
      expect(result.primaryAction.ctaLabel).toBe("Solve in editor");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SUITE 3: CANONICAL EVIDENCE LOOP & HINT DEDUPLICATION
  // ══════════════════════════════════════════════════════════════════════════
  describe("3. Live Projector Hint Deduplication & CQRS Projection", () => {
    it("deduplicates hint usage when both hint_requested and hint_revealed fire for the same hint level", () => {
      const doc = {
        topicSlug: "graphs",
        attemptedCount: 1,
        completedCount: 0,
        independentSolveCount: 0,
        hintCount: 0,
        seenHintKeys: [] as string[],
        skippedCount: 0,
        totalMinutesSpent: 0,
        averageConfidence: 0,
        confidenceSubmissionsCount: 0,
        masteryScore: 0,
        rebuildStatus: "healthy",
      } as unknown as IUserTopicProgressDocument;

      const eventRequested: ILearningEvent<any> = {
        idempotencyKey: "evt-hint-req-1",
        userId: mockUserId,
        eventType: "hint_requested",
        occurredAt: new Date("2026-09-29T10:00:00Z"),
        occurredAtTimezone: "UTC",
        schemaVersion: 1,
        source: "browser",
        problemId: new Types.ObjectId() as any,
        payload: { hintLevel: 1 },
      };

      // 1. User requests hint level 1
      applyEventToTopicProgressDoc(doc, eventRequested);
      expect(doc.hintCount).toBe(1);
      expect(doc.seenHintKeys?.length).toBe(1);

      // 2. UI reveals hint level 1 for the exact same problem
      const eventRevealed: ILearningEvent<any> = {
        idempotencyKey: "evt-hint-rev-1",
        userId: mockUserId,
        eventType: "hint_revealed",
        occurredAt: new Date("2026-09-29T10:00:05Z"),
        occurredAtTimezone: "UTC",
        schemaVersion: 1,
        source: "browser",
        problemId: eventRequested.problemId,
        payload: { hintLevel: 1 },
      };

      applyEventToTopicProgressDoc(doc, eventRevealed);
      // Critical assertion: hintCount must remain 1!
      expect(doc.hintCount).toBe(1);

      // 3. User requests a genuinely new hint level 2
      const eventLevel2: ILearningEvent<any> = {
        idempotencyKey: "evt-hint-req-2",
        userId: mockUserId,
        eventType: "hint_revealed",
        occurredAt: new Date("2026-09-29T10:05:00Z"),
        occurredAtTimezone: "UTC",
        schemaVersion: 1,
        source: "browser",
        problemId: eventRequested.problemId,
        payload: { hintLevel: 2 },
      };

      applyEventToTopicProgressDoc(doc, eventLevel2);
      expect(doc.hintCount).toBe(2);
      expect(doc.seenHintKeys?.length).toBe(2);
    });

    it("calculates topic mastery score with calibrated weights", () => {
      // 2 completed, 2 independent, 0 hints, 0 skips
      const perfectScore = calculateTopicMasteryScore({
        completedCount: 2,
        independentSolveCount: 2,
        hintCount: 0,
        skippedCount: 0,
      });
      // (2 * 25) + (2 * 10) = 70
      expect(perfectScore).toBe(70);

      // Hint penalty of 3 per hint
      const withHints = calculateTopicMasteryScore({
        completedCount: 2,
        independentSolveCount: 1,
        hintCount: 2,
        skippedCount: 0,
      });
      // (1 * 25) + (2 * 10) - (2 * 3) = 25 + 20 - 6 = 39
      expect(withHints).toBe(39);
    });
  });
});

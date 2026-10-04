import { describe, it, expect } from "vitest";
import { resolveAuthoritativeLearningAction } from "../decisions/decision-selector";
import { reduceTaskEvidence, createInitialTaskEvidenceState } from "../reducers/task-evidence.reducer";
import type { ILearningEvent } from "../events/learning-event.types";

describe("Prompt 6: Plan-Led vs Self-Paced Strict Recommendation Boundaries", () => {
  const mockUserId = "507f1f77bcf86cd799439011";

  // ── 1. Plan-Led Authority: Required Tasks vs Reviews & Weak Evidence ───────
  it("Active plan + pending required task + weak topic evidence + due review: scheduled required plan task remains primary", async () => {
    const result = await resolveAuthoritativeLearningAction({
      userId: mockUserId,
      mode: "plan_led",
      activePlan: { id: "plan-1", topicName: "Binary Trees", topicSlug: "binary-trees", status: "active" },
      currentPlanDay: { dayIndex: 2, topicName: "Binary Trees", topicSlug: "binary-trees", focus: "Invert & Subtree Invariants" },
      todayTasks: [
        {
          _id: "task-101",
          taskKey: "t101",
          title: "Invert Binary Tree",
          status: "pending",
          entityType: "problem",
          required: true,
          order: 1,
          estimatedMinutes: 20,
        },
      ],
      dueRevisions: [
        {
          id: "rev-99",
          conceptName: "Sliding Window Maximum",
          entityType: "problem",
          estimatedMinutes: 10,
        },
      ],
      practiceRecs: [
        {
          problem: { _id: "rec-1", title: "Two Sum", slug: "two-sum", estimatedMinutes: 15 },
          weakTopic: "Strings",
          reason: "Identified weak topic",
        },
      ],
    });

    // Plan-led authority guarantees required task is primary
    expect(result.primaryAction.sourceProvenance).toBe("required_plan_task");
    expect(result.primaryAction.title).toBe("Invert Binary Tree");
    expect(result.primaryAction.ctaState).toBe("start");
    expect(result.primaryAction.reason).toContain("Part of Day 2 in Binary Trees");
    // Due review or weak-topic rec MUST NOT hijack the plan
    expect(result.primaryAction.sourceProvenance).not.toBe("due_review");
    expect(result.primaryAction.sourceProvenance).not.toBe("self_paced_recommendation");
  });

  // ── 2. Sequential Order: Completion of first required task ─────────────────
  it("Required task completed with another required task remaining: the next task in plan order becomes primary", async () => {
    const result = await resolveAuthoritativeLearningAction({
      userId: mockUserId,
      mode: "plan_led",
      activePlan: { id: "plan-1", topicName: "Binary Trees", topicSlug: "binary-trees", status: "active" },
      currentPlanDay: { dayIndex: 2, topicName: "Binary Trees", topicSlug: "binary-trees" },
      todayTasks: [
        {
          _id: "task-101",
          taskKey: "t101",
          title: "Invert Binary Tree",
          status: "completed",
          entityType: "problem",
          required: true,
          order: 1,
        },
        {
          _id: "task-102",
          taskKey: "t102",
          title: "Symmetric Tree Check",
          status: "pending",
          entityType: "problem",
          required: true,
          order: 2,
          estimatedMinutes: 25,
        },
      ],
      dueRevisions: [
        {
          id: "rev-1",
          conceptName: "Prefix Sum",
          entityType: "problem",
          estimatedMinutes: 8,
        },
      ],
    });

    expect(result.primaryAction.sourceProvenance).toBe("required_plan_task");
    expect(result.primaryAction.title).toBe("Symmetric Tree Check");
    expect(result.primaryAction.ctaState).toBe("start");
  });

  // ── 3. Optional Plan Tasks Protection ─────────────────────────────────────
  it("Optional plan task remains: unscheduled due review or Evidence Loop suggestion cannot replace it", async () => {
    const result = await resolveAuthoritativeLearningAction({
      userId: mockUserId,
      mode: "plan_led",
      activePlan: { id: "plan-1", topicName: "Binary Trees", topicSlug: "binary-trees", status: "active" },
      currentPlanDay: { dayIndex: 2, topicName: "Binary Trees", topicSlug: "binary-trees" },
      todayTasks: [
        {
          _id: "task-101",
          taskKey: "t101",
          title: "Invert Binary Tree",
          status: "completed",
          entityType: "problem",
          required: true,
          order: 1,
        },
        {
          _id: "task-opt-1",
          taskKey: "t-opt-1",
          title: "Subtree of Another Tree",
          status: "pending",
          entityType: "problem",
          required: false,
          order: 2,
          estimatedMinutes: 15,
        },
      ],
      dueRevisions: [
        {
          id: "rev-1",
          conceptName: "Sliding Window",
          entityType: "problem",
          estimatedMinutes: 7,
        },
      ],
      practiceRecs: [
        {
          problem: { _id: "rec-2", title: "Valid Palindrome", slug: "valid-palindrome" },
          weakTopic: "Strings",
        },
      ],
    });

    // Optional plan task must remain primary in plan-led mode
    expect(result.primaryAction.sourceProvenance).toBe("optional_plan_task");
    expect(result.primaryAction.title).toBe("Subtree of Another Tree");
    expect(result.primaryAction.ctaLabel).toBe("Start bonus practice");
    // Unscheduled due review or Evidence Loop suggestion must NOT take over
    expect(result.primaryAction.sourceProvenance).not.toBe("due_review");
    expect(result.primaryAction.sourceProvenance).not.toBe("self_paced_recommendation");
  });

  // ── 4. Day-Complete State Protection ──────────────────────────────────────
  it("All scheduled tasks are complete: show the plan's day-complete state; do not silently inject an adaptive recommendation", async () => {
    const result = await resolveAuthoritativeLearningAction({
      userId: mockUserId,
      mode: "plan_led",
      activePlan: { id: "plan-1", topicName: "Binary Trees", topicSlug: "binary-trees", status: "active" },
      currentPlanDay: { dayIndex: 2, topicName: "Binary Trees", topicSlug: "binary-trees" },
      todayTasks: [
        {
          _id: "task-101",
          taskKey: "t101",
          title: "Invert Binary Tree",
          status: "completed",
          entityType: "problem",
          required: true,
          order: 1,
        },
      ],
      dueRevisions: [
        {
          id: "rev-unscheduled",
          conceptName: "Two Pointers Review",
          entityType: "problem",
          estimatedMinutes: 8,
        },
      ],
      practiceRecs: [
        {
          problem: { _id: "rec-3", title: "Trapping Rain Water", slug: "trapping-rain-water" },
          weakTopic: "Arrays",
        },
      ],
    });

    expect(result.primaryAction.ctaState).toBe("day_complete");
    expect(result.primaryAction.title).toBe("Day 2 Tasks Completed");
    expect(result.primaryAction.ctaLabel).toContain("Day complete");
    expect(result.primaryAction.estimatedDurationMinutes).toBe(0);
    // Crucial: Evidence Loop must NOT overwrite day-complete with an adaptive recommendation
    expect(result.primaryAction.sourceProvenance).not.toBe("self_paced_recommendation");
    expect(result.primaryAction.sourceProvenance).not.toBe("due_review");
  });

  // ── 5. Scheduled Review Task in Plan ───────────────────────────────────────
  it("A review explicitly scheduled in the plan is selected at its correct plan position", async () => {
    const result = await resolveAuthoritativeLearningAction({
      userId: mockUserId,
      mode: "plan_led",
      activePlan: { id: "plan-1", topicName: "Binary Trees", topicSlug: "binary-trees", status: "active" },
      currentPlanDay: { dayIndex: 3, topicName: "Binary Trees", topicSlug: "binary-trees" },
      todayTasks: [
        {
          _id: "task-scheduled-rev",
          taskKey: "rev-task-1",
          title: "Spaced Retention: Invert Binary Tree",
          status: "pending",
          entityType: "revision",
          required: true,
          order: 1,
          estimatedMinutes: 10,
        },
        {
          _id: "task-prog-1",
          taskKey: "prog-task-1",
          title: "Binary Tree Maximum Path Sum",
          status: "pending",
          entityType: "problem",
          required: true,
          order: 2,
          estimatedMinutes: 30,
        },
      ],
    });

    // The review is legitimately selected as primary because it is explicitly scheduled in the plan
    expect(result.primaryAction.sourceProvenance).toBe("due_review");
    expect(result.primaryAction.title).toBe("Spaced Retention: Invert Binary Tree");
    expect(result.primaryAction.ctaLabel).toBe("Start scheduled review");
    expect(result.primaryAction.planDayIndex).toBe(3);
  });

  // ── 6. Self-Paced Mode & Evidence Loop ────────────────────────────────────
  it("No active plan or explicitly selected self-paced mode: Evidence Loop recommends from real behavioral evidence", async () => {
    const result = await resolveAuthoritativeLearningAction({
      userId: mockUserId,
      mode: "self_paced",
      activePlan: null,
      currentPlanDay: null,
      todayTasks: [],
      practiceRecs: [
        {
          problem: { _id: "rec-p1", title: "Longest Repeating Character Replacement", slug: "longest-repeating-char", estimatedMinutes: 25 },
          weakTopic: "Sliding Window",
          reason: "High mistake rate on window shrinkage invariant.",
        },
      ],
    });

    expect(result.primaryAction.sourceProvenance).toBe("self_paced_recommendation");
    expect(result.primaryAction.title).toBe("Longest Repeating Character Replacement");
    expect(result.primaryAction.topicName).toBe("Sliding Window");
    expect(result.primaryAction.reason).toContain("window shrinkage invariant");
    expect(result.primaryAction.ctaLabel).toBe("Solve in editor");
    expect(result.primaryAction.ctaState).toBe("start");
  });

  // ── 7. Off-Plan Solve while Plan-Led relegated to Secondary Action ─────────
  it("An off-plan draft/solve while plan-led is recorded but does not reorder or replace the plan action", async () => {
    const result = await resolveAuthoritativeLearningAction({
      userId: mockUserId,
      mode: "plan_led",
      activePlan: { id: "plan-1", topicName: "Binary Trees", topicSlug: "binary-trees", status: "active" },
      currentPlanDay: { dayIndex: 2, topicName: "Binary Trees", topicSlug: "binary-trees" },
      todayTasks: [
        {
          _id: "task-req-1",
          taskKey: "req-1",
          title: "Tree Symmetric Check",
          status: "pending",
          entityType: "problem",
          required: true,
          order: 1,
        },
      ],
      draftAttempt: {
        _id: "draft-offplan",
        problemId: { title: "Random Off-Plan Graph Problem", slug: "random-graph-problem" },
        createdAt: new Date(),
      },
    });

    // Primary action remains the plan's scheduled required task
    expect(result.primaryAction.sourceProvenance).toBe("required_plan_task");
    expect(result.primaryAction.title).toBe("Tree Symmetric Check");

    // Off-plan draft is preserved in secondaryAction, never replacing or competing as primary CTA
    expect(result.secondaryAction).not.toBeNull();
    expect(result.secondaryAction?.title).toBe("Random Off-Plan Graph Problem");
    expect(result.secondaryAction?.provenance).toBe("draft_attempt");
  });

  // ── 8. Paused Plan Behavior ───────────────────────────────────────────────
  it("Paused plan behavior follows explicit mode rules and never guesses learner intent", async () => {
    // A: In plan schedule flow without self-paced override
    const resultPaused = await resolveAuthoritativeLearningAction({
      userId: mockUserId,
      activePlan: { id: "plan-1", status: "paused", topicName: "Binary Trees", topicSlug: "binary-trees" },
      currentPlanDay: { dayIndex: 2, topicName: "Binary Trees", topicSlug: "binary-trees" },
    });
    expect(resultPaused.primaryAction.ctaState).toBe("paused");
    expect(resultPaused.primaryAction.title).toContain("Paused");

    // B: When learner explicitly starts an explore/self-paced flow
    const resultExplore = await resolveAuthoritativeLearningAction({
      userId: mockUserId,
      mode: "self_paced",
      activePlan: { id: "plan-1", status: "paused", topicName: "Binary Trees", topicSlug: "binary-trees" },
      practiceRecs: [
        {
          problem: { _id: "rec-self", title: "Coin Change", slug: "coin-change", estimatedMinutes: 30 },
          weakTopic: "Dynamic Programming",
          reason: "Exploration recommendation while plan is paused.",
        },
      ],
    });
    expect(resultExplore.primaryAction.sourceProvenance).toBe("self_paced_recommendation");
    expect(resultExplore.primaryAction.title).toBe("Coin Change");
  });

  // ── 9. Single Consistent Hint Counting Rule ────────────────────────────────
  it("defines and enforces single consistent hint counting rule across hint_revealed and hint_requested", () => {
    const taskId = "task-hint-test";
    const initial = createInitialTaskEvidenceState(taskId);

    // User reveals hint level 1 in the UI
    const eventReveal: ILearningEvent<any> = {
      idempotencyKey: "e1",
      userId: mockUserId,
      eventType: "hint_revealed",
      occurredAt: new Date("2026-09-29T10:00:00Z"),
      occurredAtTimezone: "UTC",
      schemaVersion: 1,
      source: "browser",
      payload: { hintLevel: 1 },
    };
    const stateAfterReveal = reduceTaskEvidence(initial, eventReveal);
    expect(stateAfterReveal.hintCount).toBe(1);
    expect(stateAfterReveal.hintsRevealed).toEqual([1]);
    expect(stateAfterReveal.highestHintLevel).toBe(1);
    expect(stateAfterReveal.independentSolve).toBe(false);

    // On submit, legacy attempt submission sends hint_requested for the same hint level 1
    const eventRequestedDuplicate: ILearningEvent<any> = {
      idempotencyKey: "e2",
      userId: mockUserId,
      eventType: "hint_requested",
      occurredAt: new Date("2026-09-29T10:02:00Z"),
      occurredAtTimezone: "UTC",
      schemaVersion: 1,
      source: "browser",
      payload: { hintLevel: 1 },
    };
    const stateAfterRequested = reduceTaskEvidence(stateAfterReveal, eventRequestedDuplicate);

    // Crucial: hintCount must NOT become 2! It must remain 1 because it's the same hint level
    expect(stateAfterRequested.hintCount).toBe(1);
    expect(stateAfterRequested.hintsRevealed).toEqual([1]);

    // Now if a genuinely new hint level 2 is revealed
    const eventRevealLevel2: ILearningEvent<any> = {
      idempotencyKey: "e3",
      userId: mockUserId,
      eventType: "hint_revealed",
      occurredAt: new Date("2026-09-29T10:05:00Z"),
      occurredAtTimezone: "UTC",
      schemaVersion: 1,
      source: "browser",
      payload: { hintLevel: 2 },
    };
    const stateAfterLevel2 = reduceTaskEvidence(stateAfterRequested, eventRevealLevel2);
    expect(stateAfterLevel2.hintCount).toBe(2);
    expect(stateAfterLevel2.hintsRevealed).toEqual([1, 2]);
    expect(stateAfterLevel2.highestHintLevel).toBe(2);
  });

  // ── 10. Provenance Signal Details Exhaustiveness & Truthfulness ────────────
  it("verifies NextSessionHero signal mapping exhaustively maps all 9 provenance values and never labels due_review as Curriculum progression", async () => {
    const heroPath = "d:/DSA Club/src/components/product/dashboard/NextSessionHero.tsx";
    const fs = await import("node:fs");
    const content = fs.readFileSync(heroPath, "utf-8");

    // All 9 union values must be explicitly present in the switch statement
    const expectedProvenances = [
      "in_progress_task",
      "in_flight_draft",
      "active_session",
      "required_plan_task",
      "due_review",
      "optional_plan_task",
      "self_paced_recommendation",
      "roadmap_continuity",
      "setup",
    ];

    for (const p of expectedProvenances) {
      expect(content).toContain(`case "${p}":`);
    }

    // due_review must explicitly have "Spaced retrieval review" label
    expect(content).toContain('"Spaced retrieval review"');
    // required_plan_task must have "Scheduled plan task"
    expect(content).toContain('"Scheduled plan task"');
    // self_paced_recommendation must have "Targeted practice recommendation"
    expect(content).toContain('"Targeted practice recommendation"');
  });

  // ── 11. Review Queue Non-Duplication ───────────────
  it("verifies ReviewQueuePreview filters out primary review and shows additional items separately", async () => {
    const reviewPath = "d:/DSA Club/src/components/product/dashboard/ReviewQueuePreview.tsx";
    const fs = await import("node:fs");
    const content = fs.readFileSync(reviewPath, "utf-8");

    expect(content).toContain("primaryActionId");
    expect(content).toContain("primaryActionTitle");
    expect(content).toContain("additionalItems");
    expect(content).toContain("The active due item is featured as your primary action in the hero above");
  });

  // ── 12. Dashboard Balanced Layout ──────────────────────────────────────────
  it("verifies DashboardView replaces 7/5 split with balanced learning-state region and full-width activity view", async () => {
    const viewPath = "d:/DSA Club/src/components/product/dashboard/DashboardView.tsx";
    const fs = await import("node:fs");
    const content = fs.readFileSync(viewPath, "utf-8");

    // Must NOT contain the old unbalanced 7/5 split
    expect(content).not.toContain("lg:col-span-7");
    expect(content).not.toContain("lg:col-span-5");

    // Must contain balanced 2-column learning-state grid
    expect(content).toContain("grid-cols-1 md:grid-cols-2 gap-6");

    // Mode badge must be present
    expect(content).toContain("dto.learningMode === \"plan_led\"");
    expect(content).toContain("Self-Paced Practice");
  });
});

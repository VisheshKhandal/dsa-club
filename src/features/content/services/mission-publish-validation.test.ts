/**
 * Regression tests for validateMissionForPublish
 *
 * Covers:
 *   1. Topic-only mission (no patternId, no pattern step) → publishes.
 *   2. Pattern-focused mission with patternId AND valid pattern step → publishes.
 *   3. Pattern-focused mission with patternId but MISSING pattern step → blocked.
 *   4. Content-only pattern step (no targetId, no patternId) → publishes.
 *   5. Content-only practice step (no targetId but has content) → publishes.
 *   6. Empty practice step (no targetId AND no content) → blocked.
 *   7. Pattern target validation only fires when a target is actually provided.
 *   8. Practice step pattern-linkage check uses resolved pattern target.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";

// ── Mock DB models ────────────────────────────────────────────────────────────
vi.mock("@/features/content/models/content.model", () => ({
  TopicModel: {
    exists: vi.fn(),
  },
  PatternModel: {
    findOne: vi.fn(),
  },
  ProblemModel: {
    findOne: vi.fn(),
  },
  MissionModel: {
    findById: vi.fn(),
  },
}));

import {
  validateMissionForPublish,
  MissionPublishValidationError,
} from "./mission-publish-validation.service";
import {
  TopicModel,
  PatternModel,
  ProblemModel,
} from "@/features/content/models/content.model";

// ── Shared fixtures ───────────────────────────────────────────────────────────
const topicId = new Types.ObjectId().toString();
const patternId = new Types.ObjectId().toString();
const problemId = new Types.ObjectId().toString();

/** Minimal valid content string (≥ 40 chars) */
const content = "A".repeat(50);

/** Minimal valid mastery content string (≥ 80 chars) */
const masteryContent = "Explain the algorithm, optimise for space, and discuss edge cases in detail. ".repeat(2);

/**
 * Base step set for a topic-only mission (no pattern step).
 * Satisfies: introduction, concept, practice, reflection, mastery.
 */
function baseSteps(overrides: Record<string, object> = {}) {
  return [
    { key: "intro", kind: "introduction", content, required: true, weight: 0.1, targetId: null, ...overrides["intro"] },
    { key: "concept", kind: "concept", content, required: true, weight: 0.2, targetId: null, ...overrides["concept"] },
    { key: "practice", kind: "practice", content: "", required: true, weight: 0.4, targetId: problemId, ...overrides["practice"] },
    { key: "reflection", kind: "reflection", content, required: true, weight: 0.15, targetId: null, ...overrides["reflection"] },
    { key: "mastery", kind: "mastery", content: masteryContent, required: true, weight: 0.15, targetId: null, ...overrides["mastery"] },
  ];
}

// ── DB mock helpers ───────────────────────────────────────────────────────────
function mockTopicExists() {
  (TopicModel.exists as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: topicId });
}

function mockTopicNotFound() {
  (TopicModel.exists as ReturnType<typeof vi.fn>).mockResolvedValue(null);
}

function mockPatternExists(opts: { topicId?: string } = {}) {
  (PatternModel.findOne as ReturnType<typeof vi.fn>).mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: patternId, topicId: opts.topicId ?? topicId }),
    }),
  });
}

function mockPatternNotFound() {
  (PatternModel.findOne as ReturnType<typeof vi.fn>).mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
  });
}

function mockProblemExists(opts: { topicIds?: string[]; patternIds?: string[]; sourceUrl?: string } = {}) {
  (ProblemModel.findOne as ReturnType<typeof vi.fn>).mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: problemId,
        topicIds: opts.topicIds ?? [topicId],
        patternIds: opts.patternIds ?? [],
        sourceUrl: opts.sourceUrl ?? "https://leetcode.com/problems/two-sum/",
      }),
    }),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("validateMissionForPublish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── REGRESSION: the original blockers ───────────────────────────────────────
  it("REGRESSION: topic-only mission with no patternId and no pattern step publishes successfully", async () => {
    mockTopicExists();
    mockProblemExists();

    await expect(
      validateMissionForPublish({
        topicId,
        patternId: null,
        steps: baseSteps(),
      })
    ).resolves.toBeUndefined();
  });

  it("REGRESSION: pattern step with no targetId and no mission patternId publishes as content-only", async () => {
    mockTopicExists();
    mockProblemExists();

    const steps = [
      ...baseSteps(),
      { key: "pattern-step", kind: "pattern", content, required: true, weight: 0.1, targetId: null },
    ];

    // This was previously blocked with "Pattern stage must be connected." — now allowed
    await expect(
      validateMissionForPublish({ topicId, patternId: null, steps })
    ).resolves.toBeUndefined();
  });

  it("REGRESSION: practice step with no targetId but with content publishes as content-only", async () => {
    mockTopicExists();

    const steps = [
      { key: "intro", kind: "introduction", content, required: true, weight: 0.1, targetId: null },
      { key: "concept", kind: "concept", content, required: true, weight: 0.2, targetId: null },
      { key: "hands-on", kind: "practice", content: "Go to LeetCode and solve these practice problems to reinforce your understanding.", required: true, weight: 0.4, targetId: null },
      { key: "reflection", kind: "reflection", content, required: true, weight: 0.15, targetId: null },
      { key: "mastery", kind: "mastery", content: masteryContent, required: true, weight: 0.15, targetId: null },
    ];

    // This was previously blocked with "must target a published problem" — now allowed
    await expect(
      validateMissionForPublish({ topicId, patternId: null, steps })
    ).resolves.toBeUndefined();
  });

  // ── Pattern-focused missions must still be validated ─────────────────────────
  it("pattern-focused mission with valid patternId + pattern step publishes successfully", async () => {
    mockTopicExists();
    mockPatternExists({ topicId });
    mockProblemExists({ patternIds: [patternId] });

    const steps = [
      ...baseSteps(),
      { key: "pattern-step", kind: "pattern", content: "", required: true, weight: 0.1, targetId: patternId },
    ];

    await expect(
      validateMissionForPublish({ topicId, patternId, steps })
    ).resolves.toBeUndefined();
  });

  it("blocks when patternId is set but no pattern step exists", async () => {
    mockTopicExists();
    mockPatternExists({ topicId });
    mockProblemExists({ patternIds: [patternId] });

    await expect(
      validateMissionForPublish({
        topicId,
        patternId,
        steps: baseSteps(),
      })
    ).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(MissionPublishValidationError);
      const issues = (err as MissionPublishValidationError).issues;
      expect(issues.some((i) => i.includes("pattern"))).toBe(true);
      return true;
    });
  });

  it("blocks when pattern stage target is an unpublished/missing pattern", async () => {
    mockTopicExists();
    mockPatternNotFound();
    mockProblemExists();

    const steps = [
      ...baseSteps(),
      { key: "pattern-step", kind: "pattern", content: "", required: true, weight: 0.1, targetId: patternId },
    ];

    await expect(
      validateMissionForPublish({ topicId, patternId, steps })
    ).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(MissionPublishValidationError);
      const issues = (err as MissionPublishValidationError).issues;
      expect(issues.some((i) => i.includes("published pattern"))).toBe(true);
      return true;
    });
  });

  // ── Practice step validations ───────────────────────────────────────────────
  it("blocks empty practice step with no target and no content", async () => {
    mockTopicExists();

    const steps = [
      { key: "intro", kind: "introduction", content, required: true, weight: 0.1, targetId: null },
      { key: "concept", kind: "concept", content, required: true, weight: 0.2, targetId: null },
      { key: "empty-practice", kind: "practice", content: "", required: true, weight: 0.4, targetId: null },
      { key: "reflection", kind: "reflection", content, required: true, weight: 0.15, targetId: null },
      { key: "mastery", kind: "mastery", content: masteryContent, required: true, weight: 0.15, targetId: null },
    ];

    await expect(
      validateMissionForPublish({ topicId, patternId: null, steps })
    ).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(MissionPublishValidationError);
      const issues = (err as MissionPublishValidationError).issues;
      expect(issues.some((i) => i.includes("target problem or at least 40 characters"))).toBe(true);
      return true;
    });
  });

  it("practice step pattern-linkage check is NOT raised for topic-only missions", async () => {
    mockTopicExists();
    mockProblemExists({ patternIds: [] });

    await expect(
      validateMissionForPublish({
        topicId,
        patternId: null,
        steps: baseSteps(),
      })
    ).resolves.toBeUndefined();
  });

  it("practice step pattern-linkage check IS raised for pattern-focused missions when problem lacks the pattern", async () => {
    mockTopicExists();
    mockPatternExists({ topicId });
    mockProblemExists({ patternIds: [] });

    const steps = [
      ...baseSteps(),
      { key: "pattern-step", kind: "pattern", content: "", required: true, weight: 0.1, targetId: patternId },
    ];

    await expect(
      validateMissionForPublish({ topicId, patternId, steps })
    ).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(MissionPublishValidationError);
      const issues = (err as MissionPublishValidationError).issues;
      expect(issues.some((i) => i.includes("linked to the mission pattern"))).toBe(true);
      return true;
    });
  });

  // ── Core structural validations are unchanged ────────────────────────────────
  it("blocks when topic is not published", async () => {
    mockTopicNotFound();
    mockProblemExists();

    await expect(
      validateMissionForPublish({ topicId, patternId: null, steps: baseSteps() })
    ).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(MissionPublishValidationError);
      const issues = (err as MissionPublishValidationError).issues;
      expect(issues.some((i) => i.includes("topic must exist and be published"))).toBe(true);
      return true;
    });
  });

  it("blocks when required stages are missing", async () => {
    mockTopicExists();

    await expect(
      validateMissionForPublish({ topicId, patternId: null, steps: [] })
    ).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(MissionPublishValidationError);
      return true;
    });
  });
});

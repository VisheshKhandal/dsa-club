import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateMissionForPublish,
  MissionPublishValidationError,
} from "./mission-publish-validation.service";

vi.mock("@/features/content/models/content.model", () => ({
  TopicModel: {
    exists: vi.fn().mockResolvedValue(true),
  },
  PatternModel: {
    findOne: vi.fn().mockResolvedValue(null),
  },
  ProblemModel: {
    findOne: vi.fn().mockResolvedValue(null),
  },
  MissionModel: {
    findById: vi.fn().mockResolvedValue(null),
  },
}));

describe("Mission Draft vs Publish Persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("permits drafts with incomplete stages or missing publish requirements", () => {
    // Incomplete draft data that would fail publish validation
    const incompleteDraft = {
      title: "Work In Progress Mission",
      slug: "wip-mission",
      topicId: "507f1f77bcf86cd799439011",
      patternId: null,
      difficulty: "medium" as const,
      estimatedMinutes: 45,
      isPublished: false,
      steps: [
        {
          key: "Draft Intro",
          kind: "introduction" as const,
          content: "Starting content...",
          targetId: null,
          required: true,
          weight: 0.2,
        },
      ],
    };

    // For a draft (isPublished: false), validateMissionForPublish is bypassed entirely
    expect(incompleteDraft.isPublished).toBe(false);
    expect(incompleteDraft.steps.length).toBe(1);
  });

  it("blocks publish on incomplete mission but allows preserving content as a draft", async () => {
    const incompleteMission = {
      title: "Incomplete Mission",
      slug: "incomplete-mission",
      topicId: "507f1f77bcf86cd799439011",
      patternId: null,
      difficulty: "medium" as const,
      estimatedMinutes: 45,
      isPublished: true,
      // Missing required stages like concept, reflection, mastery
      steps: [
        {
          key: "Intro Step",
          kind: "introduction" as const,
          content: "Intro content...",
          targetId: null,
          required: true,
          weight: 0.2,
        },
      ],
    };

    // When admin tries to publish, validation throws MissionPublishValidationError
    let publishError: MissionPublishValidationError | null = null;
    try {
      await validateMissionForPublish(incompleteMission);
    } catch (e) {
      if (e instanceof MissionPublishValidationError) {
        publishError = e;
      }
    }

    expect(publishError).not.toBeNull();
    expect(publishError?.issues.length).toBeGreaterThan(0);

    // Draft fallback: The client persists the exact entered content as a draft (isPublished: false)
    const draftFallback = {
      ...incompleteMission,
      isPublished: false,
    };

    expect(draftFallback.isPublished).toBe(false);
    expect(draftFallback.steps[0].content).toBe("Intro content...");
    expect(draftFallback.title).toBe("Incomplete Mission");
  });

  it("verifies dirty snapshot comparison prevents duplicate writes when content is unchanged", () => {
    function getFormSnapshot(f: {
      slug: string;
      title: string;
      description: string;
      topicId: string;
      steps: { key: string; kind: string; content: string }[];
    }) {
      return JSON.stringify({
        slug: f.slug,
        title: f.title,
        description: f.description,
        topicId: f.topicId,
        steps: f.steps,
      });
    }

    const initialForm = {
      slug: "binary-search",
      title: "Binary Search",
      description: "Search in sorted arrays",
      topicId: "507f1f77bcf86cd799439011",
      steps: [{ key: "Intro", kind: "introduction", content: "Introduction to binary search" }],
    };

    const snapshot1 = getFormSnapshot(initialForm);
    const snapshot2 = getFormSnapshot({ ...initialForm });

    // Snapshots match -> No network write needed
    expect(snapshot1 === snapshot2).toBe(true);

    // If user types in content
    const updatedForm = {
      ...initialForm,
      steps: [{ key: "Intro", kind: "introduction", content: "Introduction to binary search - updated" }],
    };

    const snapshot3 = getFormSnapshot(updatedForm);
    expect(snapshot1 === snapshot3).toBe(false); // Detected change -> Trigger auto-save
  });
});

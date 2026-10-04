import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock mongodb connection
vi.mock("@/lib/db/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

// Mock DB models
vi.mock("@/features/content/models/content.model", () => ({
  TopicModel: {
    find: vi.fn(),
  },
  PatternModel: {
    find: vi.fn(),
  },
  ProblemModel: {
    find: vi.fn(),
  },
  MissionModel: {
    find: vi.fn(),
  },
}));

import {
  TopicModel,
  PatternModel,
  ProblemModel,
  MissionModel,
} from "@/features/content/models/content.model";
import {
  exportContentCatalog,
  resolveLearningPathReferences,
} from "./learning-path-resolver.service";

describe("Learning Path Resolver Service", () => {
  const mockTopics = [
    { _id: "topic-1", slug: "arrays-and-hashing", name: "Arrays & Hashing", difficulty: "beginner", isPublished: true },
    { _id: "topic-2", slug: "two-pointers", name: "Two Pointers", difficulty: "easy", isPublished: true },
  ];

  const mockPatterns = [
    { _id: "pat-1", slug: "prefix-sum", name: "Prefix Sum", difficulty: "easy", isPublished: true },
    { _id: "pat-2", slug: "sliding-window", name: "Sliding Window", difficulty: "medium", isPublished: true },
  ];

  const mockProblems = [
    {
      _id: "prob-1",
      slug: "two-sum",
      title: "Two Sum",
      sourceUrl: "https://leetcode.com/problems/two-sum/",
      difficulty: "easy",
      isPublished: true,
    },
    {
      _id: "prob-2",
      slug: "best-time-to-buy-and-sell-stock",
      title: "Best Time to Buy and Sell Stock",
      sourceUrl: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/description/",
      difficulty: "easy",
      isPublished: true,
    },
  ];

  const mockMissions = [
    { _id: "mis-1", slug: "master-two-pointers", title: "Master Two Pointers", difficulty: "medium", isPublished: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    const mockLean = (data: any) => ({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(data),
      }),
    });

    (TopicModel.find as any).mockReturnValue(mockLean(mockTopics));
    (PatternModel.find as any).mockReturnValue(mockLean(mockPatterns));
    (ProblemModel.find as any).mockReturnValue(mockLean(mockProblems));
    (MissionModel.find as any).mockReturnValue(mockLean(mockMissions));
  });

  describe("exportContentCatalog", () => {
    it("returns structured catalog and prompt text formatted for external LLM", async () => {
      const result = await exportContentCatalog();

      expect(result.counts.topics).toBe(2);
      expect(result.counts.patterns).toBe(2);
      expect(result.counts.problems).toBe(2);
      expect(result.counts.missions).toBe(1);

      expect(result.promptCatalog).toContain("AVAILABLE TOPICS (2):");
      expect(result.promptCatalog).toContain("- arrays-and-hashing (Arrays & Hashing)");
      expect(result.promptCatalog).toContain("- two-sum (Two Sum)");
      expect(result.promptCatalog).toContain("https://leetcode.com/problems/two-sum/");
    });
  });

  describe("resolveLearningPathReferences", () => {
    it("resolves exact matches by slug, title, and LeetCode URL", async () => {
      const payload = {
        title: "DSA Fundamentals Journey",
        description: "A comprehensive beginner path",
        difficulty: "beginner",
        stages: [
          {
            title: "Stage 1: Arrays",
            topics: [{ slug: "arrays-and-hashing" }],
            patterns: [{ title: "Prefix Sum" }],
            problems: [
              { url: "https://leetcode.com/problems/two-sum" },
              { sourceUrl: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/description/" },
            ],
            missions: [{ slug: "master-two-pointers" }],
          },
        ],
      };

      const report = await resolveLearningPathReferences(payload);

      expect(report.summary.totalTopics).toBe(1);
      expect(report.summary.resolvedTopics).toBe(1);
      expect(report.summary.totalPatterns).toBe(1);
      expect(report.summary.resolvedPatterns).toBe(1);
      expect(report.summary.totalProblems).toBe(2);
      expect(report.summary.resolvedProblems).toBe(2);
      expect(report.summary.totalMissions).toBe(1);
      expect(report.summary.resolvedMissions).toBe(1);
      expect(report.summary.totalUnresolved).toBe(0);

      const stage1 = report.stages[0];
      expect(stage1.topics.resolved[0].id).toBe("topic-1");
      expect(stage1.patterns.resolved[0].id).toBe("pat-1");
      expect(stage1.problems.resolved[0].id).toBe("prob-1");
      expect(stage1.problems.resolved[0].matchedVia).toBe("leetcode-slug");
      expect(stage1.problems.resolved[1].id).toBe("prob-2");
    });

    it("deduplicates identical items within the same stage", async () => {
      const payload = {
        title: "Test Duplicates",
        stages: [
          {
            title: "Stage 1",
            problems: [
              { slug: "two-sum" },
              { url: "https://leetcode.com/problems/two-sum" },
            ],
          },
        ],
      };

      const report = await resolveLearningPathReferences(payload);
      expect(report.summary.totalProblems).toBe(2);
      expect(report.stages[0].problems.resolved.length).toBe(1);
      expect(report.stages[0].problems.resolved[0].id).toBe("prob-1");
    });

    it("identifies unresolved items and generates ranked candidate suggestions", async () => {
      const payload = {
        title: "Test Unresolved",
        stages: [
          {
            title: "Stage 1",
            problems: [
              { title: "Two Sum II - Input Array Is Sorted" },
            ],
          },
        ],
      };

      const report = await resolveLearningPathReferences(payload);
      expect(report.summary.totalProblems).toBe(1);
      expect(report.summary.resolvedProblems).toBe(0);
      expect(report.summary.totalUnresolved).toBe(1);

      const unresolved = report.stages[0].problems.unresolved[0];
      expect(unresolved.candidates.length).toBeGreaterThan(0);
      expect(unresolved.candidates[0].slug).toBe("two-sum");
    });
  });
});

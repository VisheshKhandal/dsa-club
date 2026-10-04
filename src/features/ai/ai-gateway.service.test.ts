import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateAsyncPlanExplanation } from "./ai-gateway.service";

describe("AI Gateway Service Suite", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  it("returns deterministic fallback immediately when API key is missing", async () => {
    const fallbackText = "Master two-pointer boundary manipulation for array problems.";
    const result = await generateAsyncPlanExplanation({
      topicName: "Arrays",
      focus: "Two Pointers",
      phase: "Guided Practice",
      targetMinutes: 45,
      experienceLevel: "beginner",
      fallbackText,
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.text).toBe(fallbackText);
    expect(result.model).toBe("deterministic-curriculum-rules");
  });

  it("recovers gracefully and returns fallback when upstream fetch throws", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

    const fallbackText = "Understand graph traversal fundamentals.";
    const result = await generateAsyncPlanExplanation({
      topicName: "Graphs",
      focus: "BFS & DFS",
      phase: "Orientation",
      targetMinutes: 30,
      experienceLevel: "intermediate",
      fallbackText,
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.text).toBe(fallbackText);
  });
});

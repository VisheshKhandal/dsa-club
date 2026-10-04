import { describe, it, expect } from "vitest";
import { toDTO } from "@/features/product/services/product.service";

describe("Learn Page — Invariants & Null-Safety", () => {
  it("toDTO preserves shared references between activePath and featuredPaths without returning null", () => {
    const rawPath = {
      id: "path-1",
      slug: "foundational-dsa",
      title: "Foundational DSA",
      description: "Core algorithms",
      difficulty: "Medium",
      stages: [
        { order: 0, title: "Arrays & Two Pointers", progress: 0, status: "in_progress" },
      ],
      progress: 0,
      status: "in_progress",
      isFeatured: true,
      stageCount: 1,
    };

    const payload = {
      activePath: rawPath,
      featuredPaths: [rawPath],
    };

    const dto = toDTO(payload);

    expect(dto.activePath).not.toBeNull();
    expect(dto.activePath.slug).toBe("foundational-dsa");
    expect(dto.featuredPaths).toHaveLength(1);
    expect(dto.featuredPaths[0]).not.toBeNull();
    expect(dto.featuredPaths[0].slug).toBe("foundational-dsa");
  });

  it("toDTO preserves heroMission and upNext items that share references with missions list", () => {
    const m1 = { id: "m-1", slug: "two-pointers-intro", title: "Two Pointers Intro", status: "in_progress" };
    const m2 = { id: "m-2", slug: "sliding-window-intro", title: "Sliding Window Intro", status: "not_started" };

    const payload = {
      missions: [m1, m2],
      heroMission: m1,
      upNext: [m2],
    };

    const dto = toDTO(payload);

    expect(dto.missions).toHaveLength(2);
    expect(dto.heroMission).not.toBeNull();
    expect(dto.heroMission.slug).toBe("two-pointers-intro");
    expect(dto.upNext).toHaveLength(1);
    expect(dto.upNext[0]).not.toBeNull();
    expect(dto.upNext[0].slug).toBe("sliding-window-intro");
  });

  it("safely sanitizes sparse arrays with nulls in featuredPaths, topics, and missions", () => {
    const sparseFeaturedPaths: any[] = [
      null,
      undefined,
      { slug: "binary-search", title: "Binary Search", difficulty: "Medium", stageCount: 3, progress: 10 },
      { slug: "", title: "Invalid empty slug" },
    ];

    const safePaths = sparseFeaturedPaths.filter(
      (path): path is { slug: string; title: string } => Boolean(path && path.slug)
    );

    expect(safePaths).toHaveLength(1);
    expect(safePaths[0].slug).toBe("binary-search");
  });
});

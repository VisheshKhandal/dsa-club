import { describe, it, expect } from "vitest";
import { calculateLevelFromXp } from "./gamification.service";

describe("Gamification Service - calculateLevelFromXp", () => {
  it("defaults to Level 1 Algo Initiate for 0 or negative XP", () => {
    const res0 = calculateLevelFromXp(0);
    expect(res0.level).toBe(1);
    expect(res0.title).toBe("Algo Initiate");
    expect(res0.progressPercent).toBe(0);

    const resNeg = calculateLevelFromXp(-50);
    expect(resNeg.level).toBe(1);
    expect(resNeg.title).toBe("Algo Initiate");
    expect(resNeg.progressPercent).toBe(0);
  });

  it("calculates progress percentage correctly within Level 1 (0 to 200 XP)", () => {
    const res = calculateLevelFromXp(100);
    expect(res.level).toBe(1);
    expect(res.title).toBe("Algo Initiate");
    expect(res.currentXp).toBe(100);
    expect(res.prevLevelXp).toBe(0);
    expect(res.nextLevelXp).toBe(200);
    expect(res.progressPercent).toBe(50);
  });

  it("advances to Level 2 Array Explorer at 200 XP", () => {
    const res = calculateLevelFromXp(200);
    expect(res.level).toBe(2);
    expect(res.title).toBe("Array Explorer");
    expect(res.prevLevelXp).toBe(200);
    expect(res.nextLevelXp).toBe(500);
    expect(res.progressPercent).toBe(0);
  });

  it("advances to Level 3 Pointer Novice at 500 XP", () => {
    const res = calculateLevelFromXp(750);
    expect(res.level).toBe(3);
    expect(res.title).toBe("Pointer Novice");
    expect(res.progressPercent).toBe(50);
  });

  it("handles maximum level (Level 8 Grandmaster Knight) for 8000+ XP", () => {
    const res = calculateLevelFromXp(12000);
    expect(res.level).toBe(8);
    expect(res.title).toBe("Grandmaster Knight");
    expect(res.progressPercent).toBe(100);
  });
});

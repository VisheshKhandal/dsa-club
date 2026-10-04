import { describe, it, expect } from "vitest";
import { normalizeProblemContent, splitSubSteps, extractComplexityBadges } from "./problem-content-normalizer";

describe("Problem Content Normalizer", () => {
  const rawThinking =
    "1. Understand: Determine whether s is identical reading forwards and backwards, ignoring casing and skipping all non-alphanumeric characters. 2. Filter and Reverse (Naive): Filter the string into a new string `cleaned` by keeping only alphanumeric characters converted to lowercase, then check if `cleaned == reversed(cleaned)`. This is O(N) time but requires O(N) extra space to store the filtered string. 3. Two Pointers In-Place (Optimal): We can check without allocating any extra memory using two pointers: `left = 0` and `right = len(s) - 1`. 4. Algorithm: While `left < right`: While `left < right` and `s[left]` is not alphanumeric, advance `left++`. While `left < right` and `s[right]` is not alphanumeric, decrement `right--`. Compare `toLowerCase(s[left])` with `toLowerCase(s[right])`. If they do not match, return false immediately. If they match, advance `left++` and decrement `right--`. 5. Termination: If the pointers cross without any mismatch, return true. 6. Complexity: Time complexity is O(N) since each pointer traverses at most N characters. Auxiliary space complexity is O(1) since no new string is created.";

  const rawDryRun =
    "Given s = 'A man, a plan, a canal: Panama': 1. left = 0 ('A'), right = 29 ('a'). Both alphanumeric. tolower('A') == tolower('a') ('a' == 'a') -> match! left=1, right=28. 2. left=1 (' '), skip non-alphanumeric -> left=2 ('m'). right=28 ('m'). 'm' == 'm' -> match! left=3, right=27. 3. left=3 ('a'), right=27 ('a') -> match! left=4, right=26. 4. left=4 ('n'), right=26 ('n') -> match! left=5, right=25. 5. Continue inward skipping commas, spaces, and colons. All characters match symmetrically until left and right meet in the middle at 'c'. 6. Return true.";

  it("normalizes raw thinkingDirection into 6 distinct structured steps", () => {
    const result = normalizeProblemContent({
      thinkingDirection: rawThinking,
      dryRunPrompt: rawDryRun,
    });

    expect(result.reasoningSteps).toHaveLength(6);
    expect(result.reasoningSteps[0].id).toBe(1);
    expect(result.reasoningSteps[0].title).toBe("Understand");
    expect(result.reasoningSteps[1].title).toContain("Filter and Reverse");
    expect(result.reasoningSteps[2].title).toContain("Two Pointers");
    expect(result.reasoningSteps[3].title).toBe("Algorithm");
    expect(result.reasoningSteps[4].title).toBe("Termination");
    expect(result.reasoningSteps[5].title).toBe("Complexity");

    // Check complexity extraction on step 6
    expect(result.reasoningSteps[5].complexityBadges).toEqual(
      expect.arrayContaining([
        { type: "time", value: "O(N)" },
        { type: "space", value: "O(1)" },
      ])
    );
  });

  it("normalizes raw single-line dryRunPrompt into structured DryRunData", () => {
    const result = normalizeProblemContent({
      thinkingDirection: rawThinking,
      dryRunPrompt: rawDryRun,
    });

    expect(result.hasDryRun).toBe(true);
    expect(result.dryRunData).not.toBeNull();
    expect(result.dryRunData?.input).toContain("A man, a plan, a canal: Panama");
    expect(result.dryRunData?.steps.length).toBeGreaterThanOrEqual(5);

    const step1 = result.dryRunData?.steps[0];
    expect(step1?.stepNumber).toBe(1);
    expect(step1?.stateBadges).toEqual(
      expect.arrayContaining([
        { label: "left", value: "0", color: "purple" },
        { label: "right", value: "29", color: "cyan" },
        { label: "Status", value: "Match", color: "emerald" },
      ])
    );

    const lastStep = result.dryRunData?.steps[result.dryRunData.steps.length - 1];
    expect(lastStep?.stateBadges).toEqual(
      expect.arrayContaining([{ label: "Result", value: "true", color: "emerald" }])
    );
  });

  it("extracts sub-steps for algorithmic branching logic", () => {
    const text =
      "While left < right: advance left. Advance right. Compare toLowerCase(s[left]). If they mismatch, return false.";
    const sub = splitSubSteps(text);
    expect(sub.length).toBeGreaterThanOrEqual(2);
  });

  it("extracts time and space complexity badges", () => {
    const text = "Time complexity is O(N) and auxiliary space complexity is O(1)";
    const badges = extractComplexityBadges(text);
    expect(badges).toEqual([
      { type: "time", value: "O(N)" },
      { type: "space", value: "O(1)" },
    ]);
  });

  it("normalizes Step 1: labeled dry run prompts without step number collision", () => {
    const prompt =
      "List A: 4 -> 1 -> [8 -> 4 -> 5]. List B: 5 -> 6 -> 1 -> [8 -> 4 -> 5]. Intersection is Node(8). pA starts at 4, pB starts at 5. Step 1: pA=1, pB=6. Step 2: pA=8, pB=1. Step 3: pA=4, pB=8. Step 4: pA=5, pB=4. Step 5: pA reaches null -> switch pA to headB(5). pB reaches 5. Step 6: pA=6; pB reaches null -> switch pB to headA(4). Step 7: pA=1, pB=1. Step 8: pA=Node(8), pB=Node(8). pA == pB -> return Node(8).";

    const result = normalizeProblemContent({
      thinkingDirection: rawThinking,
      dryRunPrompt: prompt,
    });

    expect(result.hasDryRun).toBe(true);
    expect(result.dryRunData?.steps.length).toBe(8);
    expect(result.dryRunData?.steps[0].stepNumber).toBe(1);
    expect(result.dryRunData?.steps[4].stepNumber).toBe(5);
    expect(result.dryRunData?.steps[7].stepNumber).toBe(8);

    // Verify all step numbers are unique
    const stepNumbers = result.dryRunData?.steps.map((s) => s.stepNumber) ?? [];
    const uniqueStepNumbers = new Set(stepNumbers);
    expect(uniqueStepNumbers.size).toBe(stepNumbers.length);
  });
});

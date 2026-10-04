import { decodeHtmlEntities } from "@/components/learning/content-normalizer";
import { parseDryRunFromText } from "@/components/learning/ast-semantic-transformer";
import type { DryRunData, DryRunStep } from "@/components/learning/dry-run-stepper";

export interface ComplexityBadge {
  type: "time" | "space";
  value: string;
}

export interface ReasoningStep {
  id: number;
  title: string;
  body: string;
  subSteps: string[];
  complexityBadges: ComplexityBadge[];
}

export interface NormalizedProblemContent {
  reasoningSteps: ReasoningStep[];
  dryRunData: DryRunData | null;
  hasDryRun: boolean;
  commonMistakes: string[];
}

/**
 * Splits complex algorithmic conditional logic into structured bullet points.
 */
export function splitSubSteps(text: string): string[] {
  if (!text) return [];

  // Match: a) ... b) ... or i) ... ii) ... or 1) ... 2) ...
  const labeledParts = text.split(/(?:^|\s+)(?:[a-z]\)|\([a-z]\)|(?:[ivx]+)\)|\d+\))\s+/i).map((s) => s.trim()).filter(Boolean);
  if (labeledParts.length > 1) {
    return labeledParts;
  }

  // Match: "While left < right: ... If ... else ..."
  const sentences = text
    .split(/(?<=[.?!])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length > 1 && sentences.some((s) => /^While\s|^If\s|^Compare\s|^Advance\s|^Decrement\s|^Check\s/i.test(s))) {
    return sentences;
  }

  return [];
}

/**
 * Extracts explicit Time and Space complexities.
 */
export function extractComplexityBadges(text: string): ComplexityBadge[] {
  const badges: ComplexityBadge[] = [];

  const timeMatch = text.match(/time\s*(?:complexity)?\s*(?:is|:|-)?\s*(O\([^\)]+\))/i);
  if (timeMatch) {
    badges.push({ type: "time", value: timeMatch[1] });
  }

  const spaceMatch = text.match(/(?:auxiliary\s*)?space\s*(?:complexity)?\s*(?:is|:|-)?\s*(O\([^\)]+\))/i);
  if (spaceMatch) {
    badges.push({ type: "space", value: spaceMatch[1] });
  }

  return badges;
}

/**
 * Canonical normalizer for problem content.
 * Guarantees that EVERY phase (Phase 1, Phase 2, Phase 3, Phase 4)
 * consumes the same parsed AST representation, preventing raw text leakage.
 */
export function normalizeProblemContent(problem: {
  thinkingDirection?: string | null;
  dryRunPrompt?: string | null;
  commonMistakes?: string[] | null;
}): NormalizedProblemContent {
  // 1. Normalize Thinking Direction
  const rawThinking = String(problem.thinkingDirection ?? "").trim();
  const reasoningSteps: ReasoningStep[] = [];

  if (rawThinking) {
    const decoded = decodeHtmlEntities(rawThinking);
    const stepRegex = /(?:^|\s+)(\d+)[\.\)]\s*([A-Za-z0-9\s\(\)\/&-]+?)(?::|\s+-\s+)([\s\S]*?)(?=(?:\s+\d+[\.\)]\s*[A-Za-z0-9\s\(\)\/&-]+?(?::|\s+-\s+)|\s*$))/g;

    let match: RegExpExecArray | null;
    while ((match = stepRegex.exec(decoded)) !== null) {
      const stepNum = parseInt(match[1], 10);
      const title = match[2].trim();
      const body = match[3].trim();
      const subSteps = splitSubSteps(body);
      const complexityBadges = title.toLowerCase().includes("complexity") || body.includes("O(")
        ? extractComplexityBadges(body)
        : [];

      reasoningSteps.push({
        id: stepNum,
        title,
        body,
        subSteps,
        complexityBadges,
      });
    }

    // Fallback if regex found no numbered steps
    if (reasoningSteps.length === 0) {
      reasoningSteps.push({
        id: 1,
        title: "Thinking Direction",
        body: decoded,
        subSteps: splitSubSteps(decoded),
        complexityBadges: extractComplexityBadges(decoded),
      });
    }
  }

  // 2. Normalize Dry Run Prompt
  const rawDryRun = String(problem.dryRunPrompt ?? "").trim();
  let dryRunData: DryRunData | null = null;

  if (rawDryRun) {
    dryRunData = parseDryRunFromText(rawDryRun);

    // Fallback parser if parseDryRunFromText returns null but text clearly has steps
    if (!dryRunData) {
      const decoded = decodeHtmlEntities(rawDryRun);
      const prefixMatch = decoded.match(/^(.*?)(?::\s*|\s+-\s+)(?=\d+[\.\)])/i);
      const input = prefixMatch ? prefixMatch[1].replace(/^(?:given|input)\s*/i, "").trim() : undefined;
      const stepBody = prefixMatch ? decoded.slice(prefixMatch[0].length) : decoded;

      const stepRegex = /(?:^|\s+)(\d+)[\.\)]\s*([\s\S]*?)(?=(?:\s+\d+[\.\)]\s*|\s*$))/g;
      const steps: DryRunStep[] = [];
      let m: RegExpExecArray | null;

      while ((m = stepRegex.exec(stepBody)) !== null) {
        const stepNum = parseInt(m[1], 10);
        const desc = m[2].trim();
        const badges: DryRunStep["stateBadges"] = [];

        // Pointers
        const leftMatch = desc.match(/left\s*=\s*(\d+)/i);
        if (leftMatch) badges.push({ label: "left", value: leftMatch[1], color: "purple" });
        const rightMatch = desc.match(/right\s*=\s*(\d+)/i);
        if (rightMatch) badges.push({ label: "right", value: rightMatch[1], color: "cyan" });

        // Status
        if (/match!/i.test(desc)) badges.push({ label: "Status", value: "Match", color: "emerald" });
        if (/mismatch/i.test(desc)) badges.push({ label: "Status", value: "Mismatch", color: "rose" });
        if (/skip/i.test(desc)) badges.push({ label: "Action", value: "Skip", color: "amber" });

        // Result
        const returnMatch = desc.match(/return\s+(true|false|[A-Za-z0-9_]+)/i);
        if (returnMatch) badges.push({ label: "Result", value: returnMatch[1], color: "emerald" });

        steps.push({
          stepNumber: stepNum,
          label: `Step ${stepNum}`,
          description: desc,
          stateBadges: badges,
        });
      }

      if (steps.length > 0) {
        dryRunData = {
          title: "Step-by-Step Execution Dry Run",
          input,
          steps,
          result: steps.find((s) => s.stateBadges?.some((b) => b.label === "Result"))?.stateBadges?.find((b) => b.label === "Result")?.value,
        };
      }
    }
  }

  // 3. Normalize Common Mistakes
  const commonMistakes = (problem.commonMistakes ?? []).map((m) => decodeHtmlEntities(String(m).trim())).filter(Boolean);

  return {
    reasoningSteps,
    dryRunData,
    hasDryRun: Boolean(dryRunData && dryRunData.steps.length > 0),
    commonMistakes,
  };
}

import { decodeHtmlEntities } from "./content-normalizer";
import { parseAsciiTree, TreeNode } from "./tree-visualization";
import { DryRunData, DryRunStep } from "./dry-run-stepper";
import { IntervalItem } from "./array-visualization";

export interface HtmlNode {
  type: "element" | "text" | "custom";
  tag?: string;
  attrs?: Record<string, string>;
  children?: HtmlNode[];
  text?: string;
  customType?:
    | "code-illustration"
    | "tree-viz"
    | "array-viz"
    | "stack-queue-viz"
    | "dry-run"
    | "structured-example"
    | "mental-model"
    | "key-insight"
    | "warning-callout"
    | "think-checkpoint";
  customData?: any;
}

export function getNodeText(node: HtmlNode): string {
  if (node.type === "text") return node.text ?? "";
  if (!node.children?.length) return "";
  return node.children.map(getNodeText).join("");
}

/**
 * Checks if a string has unambiguous code signatures
 */
function isCodeStartLine(text: string): boolean {
  const trimmed = text.trim();
  return (
    /^(?:struct|class)\s+[A-Za-z0-9_]+\s*\{/i.test(trimmed) ||
    /^(?:def|function)\s+[A-Za-z0-9_]+\s*\(/i.test(trimmed) ||
    /^(?:void|int|bool|double|float|auto|long|char|TreeNode\*|ListNode\*|vector<[^>]+>|string)\s+[A-Za-z0-9_]+\s*\(.*(?:\)|{|;)/i.test(
      trimmed
    ) ||
    /^#include\s+<[^>]+>/i.test(trimmed) ||
    /^\/\/\s+(?:Example|Binary Tree Node|Calculate|Pass).*$/i.test(trimmed)
  );
}

/**
 * Checks if a collection of paragraph lines represents code
 */
function isCodeBlockParagraphs(pTexts: string[]): boolean {
  if (!pTexts.length) return false;
  const first = pTexts[0].trim();
  const startsWithCode =
    isCodeStartLine(first) ||
    (first.startsWith("//") && pTexts.length > 1 && isCodeStartLine(pTexts[1].trim()));

  if (!startsWithCode) return false;

  const joined = pTexts.join("\n");
  const hasBraces = joined.includes("{") || joined.includes("}") || (first.startsWith("def ") && joined.includes(":"));
  const hasCodeTokens =
    /(?:return|nullptr|NULL|int |void |bool |node->|if\s*\(|while\s*\(|TreeNode|ListNode)/i.test(joined);

  return hasBraces && hasCodeTokens;
}

/**
 * Parses execution traces into DryRunData
 */
export function parseDryRunFromText(text: string): DryRunData | null {
  if (!text || typeof text !== "string") return null;
  const decoded = decodeHtmlEntities(text).trim();

  // If text does not contain multiple newlines, check if it contains inline numbered steps (e.g. "Given s = '...': 1. left = 0 ..." or "List A: ... Step 1: pA=1 ...")
  let normalizedText = decoded;
  if (!normalizedText.includes("\n")) {
    if (/step\s+\d+[:\.]/i.test(normalizedText)) {
      const prefixMatch = normalizedText.match(/^(.*?)(?=\s*step\s+1[:\.])/i);
      const prefix = prefixMatch ? prefixMatch[1].trim() : "";
      const stepRegex = /(?:^|\s+)step\s+(\d+)[:\.]\s*([\s\S]*?)(?=(?:\s+step\s+\d+[:\.]|\s*$))/gi;
      const splitLines: string[] = [];
      if (prefix) {
        splitLines.push(
          prefix.toLowerCase().startsWith("given") || prefix.toLowerCase().startsWith("input")
            ? `Input: ${prefix.replace(/^given\s*/i, "").trim()}`
            : prefix.startsWith("Input")
            ? prefix
            : `Input: ${prefix}`
        );
      }
      let m: RegExpExecArray | null;
      while ((m = stepRegex.exec(normalizedText)) !== null) {
        splitLines.push(`Step ${m[1]}: ${m[2].trim()}`);
      }
      if (splitLines.length >= 2) {
        normalizedText = splitLines.join("\n");
      }
    } else if (/(?:^|\s+)\d+[\.\)]\s+/.test(normalizedText)) {
      const prefixMatch = normalizedText.match(/^(.*?)(?::\s*|\s+-\s+)(?=\d+[\.\)])/i);
      let prefix = "";
      let stepBody = normalizedText;
      if (prefixMatch) {
        prefix = prefixMatch[1].trim();
        stepBody = normalizedText.slice(prefixMatch[0].length);
      }
      const stepRegex = /(?:^|\s+)(\d+)[\.\)]\s*([\s\S]*?)(?=(?:\s+\d+[\.\)]\s*|\s*$))/g;
      const splitLines: string[] = [];
      if (prefix) {
        splitLines.push(
          prefix.toLowerCase().startsWith("given") || prefix.toLowerCase().startsWith("input")
            ? `Input: ${prefix.replace(/^given\s*/i, "").trim()}`
            : prefix
        );
      }
      let m: RegExpExecArray | null;
      while ((m = stepRegex.exec(stepBody)) !== null) {
        splitLines.push(`${m[1]}. ${m[2].trim()}`);
      }
      if (splitLines.length >= 2) {
        normalizedText = splitLines.join("\n");
      }
    }
  }

  const lines = normalizedText.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const isTrace = lines.some((l) =>
    /^(?:step \d+|i\s*=\s*\d+|queue progression|timeline:|trace:|at \d+:|start at \d+:|getheight\([a-zA-Z0-9]+\):|\d+\.\s*(?:sort|pick|skip|select|left|right|return|compare))/i.test(
      l
    )
  );
  if (!isTrace) return null;

  let title = "Step-by-Step Execution Dry Run";
  let input: string | undefined = undefined;
  let result: string | undefined = undefined;
  const steps: DryRunStep[] = [];

  for (const line of lines) {
    if (/^(?:queue progression|trace:)/i.test(line)) {
      title = line.replace(/:$/, "").trim();
      continue;
    }
    if (/^(?:intervals|activities|points|array)\s*=/i.test(line) || /^input:/i.test(line)) {
      input = line.replace(/^input:\s*/i, "").trim();
      continue;
    }
    if (/^(?:result|output|selected):/i.test(line)) {
      result = line.replace(/^(?:result|output|selected):\s*/i, "").trim();
      continue;
    }

    // Pattern 1: Step 1: Q = [1] -> Output: [1]
    const stepMatch = line.match(/^Step\s+(\d+):\s*(.+)$/i);
    if (stepMatch) {
      const stepNum = parseInt(stepMatch[1], 10);
      const rest = stepMatch[2];
      const parts = rest.split(/→|->/);
      const statePart = parts[0]?.trim();
      const outputPart = parts[1]?.trim();

      const badges: DryRunStep["stateBadges"] = [];
      if (statePart) {
        badges.push({ label: "State", value: statePart, color: "cyan" });
      }
      if (outputPart) {
        badges.push({ label: "Output", value: outputPart, color: "emerald" });
      }

      steps.push({
        stepNumber: stepNum,
        label: `Step ${stepNum}`,
        description: rest,
        stateBadges: badges,
      });
      continue;
    }

    // Pattern 2: i=1: [2,3] starts at 2 >= 2. lastEndTime = 3.
    const iMatch = line.match(/^i\s*=\s*(\d+):\s*(.+)$/i);
    if (iMatch) {
      const idx = parseInt(iMatch[1], 10);
      const desc = iMatch[2];
      const badges: DryRunStep["stateBadges"] = [{ label: "Index i", value: String(idx), color: "purple" }];

      const removalsMatch = desc.match(/removals\s*=\s*(\d+)/i);
      if (removalsMatch) {
        badges.push({ label: "Removals", value: removalsMatch[1], color: "rose" });
      }
      const endMatch = desc.match(/lastEndTime\s*=\s*(\d+)/i);
      if (endMatch) {
        badges.push({ label: "Last End", value: endMatch[1], color: "cyan" });
      }
      if (/overlap!/i.test(desc)) {
        badges.push({ label: "Status", value: "Overlap", color: "amber" });
      }

      steps.push({
        stepNumber: steps.length + 1,
        label: `Iteration i = ${idx}`,
        description: desc,
        stateBadges: badges,
      });
      continue;
    }

    // Pattern 3: Start at 5: 4 < 5, go left / At 3: 4 > 3, go right / At 4: FOUND!
    const navMatch = line.match(/^(Start at|At)\s+([a-zA-Z0-9]+):\s*(.+)$/i);
    if (navMatch) {
      const nodeVal = navMatch[2];
      const desc = navMatch[3];
      const isFound = /found/i.test(desc);
      const badges: DryRunStep["stateBadges"] = [
        { label: "Current Node", value: nodeVal, color: isFound ? "emerald" : "cyan" },
      ];
      if (isFound) badges.push({ label: "Status", value: "MATCH FOUND", color: "emerald" });

      steps.push({
        stepNumber: steps.length + 1,
        label: `Visit Node ${nodeVal}`,
        description: desc,
        stateBadges: badges,
      });
      continue;
    }

    // Pattern 4: 1. Sort by... / 2. Pick A... / 1. left = 0 ('A'), right = 29 ('a')...
    const numMatch = line.match(/^(\d+)\.\s*(.+)$/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      const desc = numMatch[2];
      const badges: DryRunStep["stateBadges"] = [];

      if (/^pick/i.test(desc)) badges.push({ label: "Action", value: "PICK", color: "emerald" });
      if (/^skip/i.test(desc)) badges.push({ label: "Action", value: "SKIP", color: "amber" });
      if (/^sort/i.test(desc)) badges.push({ label: "Action", value: "SORT", color: "purple" });

      // Pointers detection
      const leftMatch = desc.match(/left\s*=\s*(\d+)/i);
      if (leftMatch) badges.push({ label: "left", value: leftMatch[1], color: "purple" });
      const rightMatch = desc.match(/right\s*=\s*(\d+)/i);
      if (rightMatch) badges.push({ label: "right", value: rightMatch[1], color: "cyan" });

      // Comparison / Status detection
      if (/match!/i.test(desc)) {
        badges.push({ label: "Status", value: "Match", color: "emerald" });
      } else if (/mismatch/i.test(desc)) {
        badges.push({ label: "Status", value: "Mismatch", color: "rose" });
      }

      // Return / Result detection
      const returnMatch = desc.match(/return\s+(true|false|[A-Za-z0-9_]+)/i);
      if (returnMatch) {
        result = returnMatch[1];
        badges.push({ label: "Result", value: returnMatch[1], color: "emerald" });
      }

      steps.push({
        stepNumber: num,
        label: `Step ${num}`,
        description: desc,
        stateBadges: badges,
      });
      continue;
    }

    // Pattern 5: getHeight(D): returns 0
    const fnMatch = line.match(/^([a-zA-Z0-9_]+\([^\)]*\)):\s*(.+)$/);
    if (fnMatch) {
      const call = fnMatch[1];
      const desc = fnMatch[2];
      steps.push({
        stepNumber: steps.length + 1,
        label: call,
        description: desc,
        stateBadges: [{ label: "Evaluation", value: call, color: "cyan" }],
      });
      continue;
    }
  }

  if (!steps.length) return null;
  return { title, input, steps, result };
}

/**
 * Parses activities / interval text into IntervalItem array
 */
export function parseIntervalsFromText(text: string): IntervalItem[] | null {
  // Format: A: [1, 4]  B: [3, 5]  C: [0, 6] ...
  const matches = [...text.matchAll(/([A-Za-z0-9_-]+):\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]/g)];
  if (matches.length >= 2) {
    return matches.map((m, idx) => ({
      id: `interval-${idx}`,
      label: m[1],
      start: parseInt(m[2], 10),
      end: parseInt(m[3], 10),
    }));
  }

  // Format: [[1,2], [2,3], [3,4]]
  const arrayIntervalMatch = text.match(/\[\s*(\[\s*\d+\s*,\s*\d+\s*\](?:\s*,\s*\[\s*\d+\s*,\s*\d+\s*\])*)\s*\]/);
  if (arrayIntervalMatch) {
    try {
      const parsed = JSON.parse(arrayIntervalMatch[0]) as [number, number][];
      if (Array.isArray(parsed) && parsed.length >= 2) {
        return parsed.map(([start, end], idx) => ({
          id: `interval-${idx}`,
          label: `[${start}, ${end}]`,
          start,
          end,
        }));
      }
    } catch {}
  }

  return null;
}

/**
 * Transforms AST nodes according to SEMANTIC-FIRST architecture.
 * Explicit markup is preserved. Legacy unformatted text is promoted safely.
 */
export function transformAst(rawNodes: HtmlNode[], stageTitle?: string): HtmlNode[] {
  const nodes = rawNodes.filter((n) => n.type !== "text" || (n.text && n.text.trim().length > 0));
  const result: HtmlNode[] = [];
  const normalizedStageTitle = (stageTitle || "").toLowerCase().trim();

  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i];

    // ── 0. Suppress Redundant Duplicate Stage Title Header ──
    if (i === 0 && (node.tag === "h1" || node.tag === "h2")) {
      const headingText = getNodeText(node).toLowerCase().trim();
      if (
        headingText &&
        normalizedStageTitle &&
        (headingText === normalizedStageTitle ||
          normalizedStageTitle.includes(headingText) ||
          headingText.includes(normalizedStageTitle))
      ) {
        i++;
        continue;
      }
    }

    // ── 1. SEMANTIC-FIRST: Explicit Pre / Code Blocks ──
    if (node.tag === "pre") {
      const codeChild = node.children?.find((c) => c.tag === "code");
      const codeClass = codeChild?.attrs?.class || node.attrs?.class || "";
      const rawText = codeChild ? getNodeText(codeChild) : getNodeText(node);
      const trimmedText = rawText.trim();

      // Check if explicitly marked as tree or diagram
      if (
        codeClass.includes("language-tree") ||
        codeClass.includes("language-diagram") ||
        node.attrs?.["data-type"] === "tree"
      ) {
        result.push({
          type: "custom",
          customType: "tree-viz",
          customData: {
            treeData: trimmedText,
            title: `${stageTitle || "Stage"} · Tree Structure`,
          },
        });
        i++;
        continue;
      }

      // Check if ASCII Tree Diagram inside <pre>
      if (trimmedText.includes("/") || trimmedText.includes("\\")) {
        const parsedTree = parseAsciiTree(trimmedText);
        if (parsedTree) {
          result.push({
            type: "custom",
            customType: "tree-viz",
            customData: {
              treeData: parsedTree,
              title: `${stageTitle || "Stage"} · Binary Tree`,
            },
          });
          i++;
          continue;
        }
      }

      // Check if Dry Run / Trace inside <pre>
      const dryRun = parseDryRunFromText(trimmedText);
      if (dryRun) {
        result.push({
          type: "custom",
          customType: "dry-run",
          customData: dryRun,
        });
        i++;
        continue;
      }

      // Check if Timeline / Interval schedule inside <pre>
      const intervals = parseIntervalsFromText(trimmedText);
      if (intervals && intervals.length > 0) {
        result.push({
          type: "custom",
          customType: "array-viz",
          customData: {
            title: "Interval Schedule Timeline",
            intervals,
          },
        });
        i++;
        continue;
      }

      // Explicit Code Block with Syntax Highlighting & Copy
      const langMatch = codeClass.match(/language-([a-zA-Z0-9_+-]+)/);
      const lang = langMatch ? langMatch[1] : undefined;
      result.push({
        type: "custom",
        customType: "code-illustration",
        customData: {
          code: rawText,
          language: lang,
        },
      });
      i++;
      continue;
    }

    // ── 2. COMPATIBILITY: Grouping Consecutive Code Paragraphs ──
    if (node.tag === "p") {
      const pText = getNodeText(node);

      // Check if this starts a sequence of code paragraphs
      if (isCodeStartLine(pText)) {
        const codeParas: string[] = [pText];
        let j = i + 1;
        while (j < nodes.length) {
          const nextNode = nodes[j];
          if (nextNode.tag === "p") {
            const nextText = getNodeText(nextNode);
            // If empty line or continuing code line
            if (
              !nextText.trim() ||
              /^[ \t]/.test(nextText) ||
              /[{};=><+\-*&|]\s*$/.test(nextText.trim()) ||
              /^(?:return|if|else|for|while|struct|class|def|void|int|bool|double|float|auto|nullptr|ListNode|TreeNode|\/\/|\})/i.test(
                nextText.trim()
              )
            ) {
              codeParas.push(nextText);
              j++;
              continue;
            }
          }
          break;
        }

        if (codeParas.length >= 2 && isCodeBlockParagraphs(codeParas)) {
          result.push({
            type: "custom",
            customType: "code-illustration",
            customData: {
              code: codeParas.join("\n"),
            },
          });
          i = j;
          continue;
        }
      }

      // Check if ASCII Tree in <p> lines
      if (pText.includes("/ \\") || pText.includes("/  \\") || pText.includes("/   \\")) {
        const treeParas: string[] = [pText];
        let j = i + 1;
        while (j < nodes.length && nodes[j].tag === "p") {
          const t = getNodeText(nodes[j]);
          if (t.includes("/") || t.includes("\\") || /^\s*[A-Za-z0-9_\-\s]+\s*$/.test(t)) {
            treeParas.push(t);
            j++;
          } else {
            break;
          }
        }
        const fullTreeAscii = treeParas.join("\n");
        const parsedTree = parseAsciiTree(fullTreeAscii);
        if (parsedTree) {
          result.push({
            type: "custom",
            customType: "tree-viz",
            customData: {
              treeData: parsedTree,
              title: `${stageTitle || "Stage"} · Binary Tree`,
            },
          });
          i = j;
          continue;
        }
      }

      // Check if Dry Run Trace in <p>
      const dryRun = parseDryRunFromText(pText);
      if (dryRun) {
        result.push({
          type: "custom",
          customType: "dry-run",
          customData: dryRun,
        });
        i++;
        continue;
      }

      // Check if Interval Schedule in <p>
      const intervals = parseIntervalsFromText(pText);
      if (intervals && intervals.length > 0) {
        result.push({
          type: "custom",
          customType: "array-viz",
          customData: {
            title: "Interval Schedule Timeline",
            intervals,
          },
        });
        i++;
        continue;
      }

      // Check if Conceptual Callout (Mental Model, Key Insight, Common Mistake)
      const trimmedPara = pText.trim();
      if (
        trimmedPara.startsWith("Model 1:") ||
        trimmedPara.startsWith("Model 2:") ||
        trimmedPara.startsWith("Model 3:") ||
        trimmedPara.toLowerCase().startsWith("the bst mental model") ||
        trimmedPara.toLowerCase().startsWith("decision framework:")
      ) {
        result.push({
          type: "custom",
          customType: "mental-model",
          customData: {
            title: trimmedPara.split(":")[0]?.trim() || "Mental Model",
            content: trimmedPara.replace(/^[^:]+:\s*/, ""),
          },
        });
        i++;
        continue;
      }

      if (
        trimmedPara.startsWith("> [!KEY INSIGHT]") ||
        trimmedPara.startsWith("┃ KEY INSIGHT") ||
        trimmedPara.toLowerCase().startsWith("key insight:") ||
        trimmedPara.toLowerCase().startsWith("the golden rule:")
      ) {
        const title = trimmedPara.toLowerCase().startsWith("the golden rule:") ? "The Golden Rule" : "Key Insight";
        const cleaned = trimmedPara
          .replace(/^>\s*\[!KEY INSIGHT\]\s*/i, "")
          .replace(/^┃\s*KEY INSIGHT\s*/i, "")
          .replace(/^(?:key insight|the golden rule):\s*/i, "")
          .trim();
        result.push({
          type: "custom",
          customType: "key-insight",
          customData: { title, content: cleaned },
        });
        i++;
        continue;
      }

      if (
        trimmedPara.startsWith("> [!WARNING]") ||
        trimmedPara.toLowerCase().startsWith("common mistake:") ||
        trimmedPara.toLowerCase().startsWith("common mistakes:") ||
        trimmedPara.toLowerCase().startsWith("pitfall:")
      ) {
        const cleaned = trimmedPara
          .replace(/^>\s*\[!WARNING\]\s*/i, "")
          .replace(/^(?:common mistakes?|pitfall):\s*/i, "")
          .trim();
        result.push({
          type: "custom",
          customType: "warning-callout",
          customData: { title: "Common Mistake", content: cleaned },
        });
        i++;
        continue;
      }

      if (
        trimmedPara.startsWith("> [!THINK]") ||
        trimmedPara.toLowerCase().startsWith("think checkpoint:") ||
        trimmedPara.toLowerCase().startsWith("think about this:")
      ) {
        const cleaned = trimmedPara
          .replace(/^>\s*\[!THINK\]\s*/i, "")
          .replace(/^think (?:checkpoint|about this):\s*/i, "")
          .trim();
        const [q, ...expParts] = cleaned.split(/\n(?=(?:Explanation|Answer|Intuition):)/i);
        result.push({
          type: "custom",
          customType: "think-checkpoint",
          customData: {
            question: q,
            explanation: expParts.join("\n").replace(/^(?:Explanation|Answer|Intuition):\s*/i, "").trim() ||
              "Think through the invariants, constraints, and base cases.",
          },
        });
        i++;
        continue;
      }

      // Default normal paragraph
      result.push(node);
      i++;
      continue;
    }

    // ── 3. Headings with Semantic Callout Promotion ──
    if (node.tag === "h3" || node.tag === "h2") {
      const hText = getNodeText(node).trim();
      if (
        hText.toLowerCase().startsWith("model ") ||
        hText.toLowerCase().startsWith("decision-making framework") ||
        hText.toLowerCase().startsWith("the bst mental model")
      ) {
        // Collect following paragraphs as part of the Mental Model
        const contentNodes: HtmlNode[] = [];
        let j = i + 1;
        while (j < nodes.length && nodes[j].tag !== "h2" && nodes[j].tag !== "h3") {
          contentNodes.push(nodes[j]);
          j++;
        }
        if (contentNodes.length > 0) {
          result.push({
            type: "custom",
            customType: "mental-model",
            customData: {
              title: hText,
              children: contentNodes,
            },
          });
          i = j;
          continue;
        }
      }
    }

    // Pass through all other nodes
    result.push(node);
    i++;
  }

  return result;
}

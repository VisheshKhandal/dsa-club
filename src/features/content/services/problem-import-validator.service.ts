import { ProblemModel, TopicModel, PatternModel } from "@/features/content/models/content.model";
import {
  ProblemDifficulty,
  ProblemSource,
  ProblemHint,
  ProblemImportRawInput,
  ProblemValidationResult,
  ValidateProblemImportOptions,
  PROBLEM_DIFFICULTY_MAP,
  ALLOWED_SOURCES,
  cleanAndParseProblemJson,
} from "./problem-import.types";
import {
  slugify,
  calculateStringSimilarity,
  resolveReference,
} from "./content-import-shared";

export * from "./problem-import.types";

/**
 * Deterministically validates an imported Problem against DSA Club schemas,
 * business invariants, and existing database records.
 */
export async function validateProblemImport(
  options: ValidateProblemImportOptions
): Promise<ProblemValidationResult> {
  const { input, currentProblemId } = options;
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];

  let data: ProblemImportRawInput;
  try {
    data = cleanAndParseProblemJson(input);
  } catch (err: any) {
    return {
      valid: false,
      status: "error",
      errors: [err.message || "Failed to parse JSON input."],
      warnings: [],
      info: [],
      resolvedTopics: [],
      resolvedPatterns: [],
      resolved: {
        title: "",
        slug: "",
        summary: "",
        source: "leetcode",
        sourceUrl: "",
        externalId: "",
        topicIds: [],
        patternIds: [],
        difficulty: "easy",
        estimatedMinutes: 30,
        qualityScore: 0.5,
        thinkingDirection: "",
        dryRunPrompt: "",
        hints: [],
        commonMistakes: [],
        tags: [],
        isPublished: false,
      },
    };
  }

  // ── 1. Title Validation ──
  const rawTitle = String(data.title ?? data.name ?? "").trim();
  if (!rawTitle) {
    errors.push("Problem 'title' is required.");
  } else if (rawTitle.length > 220) {
    errors.push(`Problem title exceeds maximum length of 220 characters (${rawTitle.length} chars).`);
  }

  // ── 2. Slug Validation & Consistency ──
  let rawSlug = String(data.slug ?? "").trim().toLowerCase();
  const derivedSlug = rawTitle ? slugify(rawTitle) : "";

  if (!rawSlug) {
    if (derivedSlug) {
      rawSlug = derivedSlug;
      info.push(`Slug was auto-generated as '${rawSlug}' from problem title.`);
    } else {
      errors.push("Problem 'slug' is required.");
    }
  } else {
    if (!/^[a-z0-9-]+$/.test(rawSlug)) {
      errors.push("Slug must contain only lowercase alphanumeric characters and hyphens.");
    }
    if (rawSlug.length > 100) {
      errors.push("Slug cannot exceed 100 characters.");
    }
    // Consistency check: check if slug differs significantly from title
    if (derivedSlug && rawSlug !== derivedSlug) {
      const slugSim = calculateStringSimilarity(rawSlug.replace(/-/g, " "), rawTitle);
      if (slugSim < 0.3) {
        warnings.push(`Slug '${rawSlug}' diverges significantly from problem title '${rawTitle}'.`);
      }
    }
  }

  // ── 3. URL Validation & Platform Inference ──
  let rawUrl = String(data.sourceUrl ?? data.url ?? data.link ?? "").trim();
  let canonicalUrl = "";
  let inferredSource: ProblemSource = "leetcode";

  if (!rawUrl) {
    errors.push("Problem source URL is required (e.g. LeetCode or GeeksforGeeks link).");
  } else {
    try {
      const parsedUrl = new URL(rawUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        errors.push("Problem source URL must use http or https protocol.");
      } else {
        // Strip trailing slash for canonical duplicate detection
        canonicalUrl = rawUrl.replace(/\/+$/, "");
        const hostname = parsedUrl.hostname.toLowerCase();

        if (hostname.includes("leetcode.com")) {
          inferredSource = "leetcode";
        } else if (hostname.includes("geeksforgeeks.org")) {
          inferredSource = "geeksforgeeks";
        } else if (hostname.includes("codeforces.com")) {
          inferredSource = "codeforces";
        } else {
          inferredSource = "other";
        }
      }
    } catch {
      errors.push(`Invalid source URL format: '${rawUrl}'.`);
    }
  }

  // Platform normalization
  const rawPlatform = String(data.source ?? data.platform ?? "").toLowerCase().trim();
  let normalizedSource: ProblemSource = inferredSource;
  if (rawPlatform) {
    if (ALLOWED_SOURCES[rawPlatform]) {
      normalizedSource = ALLOWED_SOURCES[rawPlatform];
    } else {
      warnings.push(`Unrecognized platform '${rawPlatform}'. Auto-detected '${inferredSource}' from URL.`);
    }
  }

  // External ID (e.g., LeetCode problem number)
  let externalId = String(data.externalId ?? data.problemNumber ?? data.leetcodeId ?? "").trim();
  if (externalId.length > 120) {
    externalId = externalId.slice(0, 120);
  }

  // ── 4. Topic References Resolution (DSA Club Intelligence) ──
  let rawTopicsList: unknown[] = [];
  if (Array.isArray(data.topics)) {
    rawTopicsList = data.topics;
  } else if (Array.isArray(data.topicIds)) {
    rawTopicsList = data.topicIds;
  } else if (Array.isArray(data.topicNames)) {
    rawTopicsList = data.topicNames;
  } else if (Array.isArray(data.topicSlugs)) {
    rawTopicsList = data.topicSlugs;
  } else if (data.topic) {
    rawTopicsList = typeof data.topic === "string" ? data.topic.split(/[\n,]+/).map((s) => s.trim()) : [data.topic];
  } else if (typeof data.topics === "string" && data.topics.trim()) {
    rawTopicsList = data.topics.split(/[\n,]+/).map((s) => s.trim());
  }

  let topicsList: Array<{ id: string; _id?: unknown; name: string; slug: string }> =
    options.existingTopics ?? [];

  if (!options.existingTopics) {
    try {
      const dbTopics = await TopicModel.find({}).select("name slug _id").lean();
      topicsList = dbTopics.map((t: any) => ({
        id: String(t._id),
        _id: t._id,
        name: String(t.name || ""),
        slug: String(t.slug || ""),
      }));
    } catch {
      topicsList = [];
    }
  }

  const resolvedTopicIds: string[] = [];
  const resolvedTopics: Array<{ id: string; name: string; slug: string }> = [];

  for (const item of rawTopicsList) {
    const itemStr = String(item ?? "").trim();
    if (!itemStr) continue;

    const resolution = resolveReference(itemStr, topicsList);
    if (resolution.matched) {
      if (!resolvedTopicIds.includes(resolution.matched.id)) {
        resolvedTopicIds.push(resolution.matched.id);
        resolvedTopics.push({
          id: resolution.matched.id,
          name: resolution.matched.name || "",
          slug: resolution.matched.slug,
        });
        info.push(`✓ Resolved topic "${resolution.matched.name}" (slug: ${resolution.matched.slug}).`);
      }
    } else if (resolution.isAmbiguous) {
      const candidates = resolution.candidates.map((c) => `"${c.entity.name}"`).slice(0, 3).join(", ");
      warnings.push(`Topic reference '${itemStr}' is ambiguous (${candidates}).`);
    } else {
      warnings.push(`Referenced topic '${itemStr}' was not found in the database.`);
    }
  }

  if (resolvedTopicIds.length === 0) {
    errors.push("At least one valid Topic reference is required (e.g. 'Arrays & Strings').");
  }

  // ── 5. Pattern References Resolution (DSA Club Intelligence) ──
  let rawPatternsList: unknown[] = [];
  if (Array.isArray(data.patterns)) {
    rawPatternsList = data.patterns;
  } else if (Array.isArray(data.patternIds)) {
    rawPatternsList = data.patternIds;
  } else if (Array.isArray(data.patternNames)) {
    rawPatternsList = data.patternNames;
  } else if (Array.isArray(data.patternSlugs)) {
    rawPatternsList = data.patternSlugs;
  } else if (data.pattern) {
    rawPatternsList = typeof data.pattern === "string" ? data.pattern.split(/[\n,]+/).map((s) => s.trim()) : [data.pattern];
  } else if (typeof data.patterns === "string" && data.patterns.trim()) {
    rawPatternsList = data.patterns.split(/[\n,]+/).map((s) => s.trim());
  }

  let patternsList: Array<{ id: string; _id?: unknown; name: string; slug: string }> =
    options.existingPatterns ?? [];

  if (!options.existingPatterns) {
    try {
      const dbPatterns = await PatternModel.find({}).select("name slug _id").lean();
      patternsList = dbPatterns.map((p: any) => ({
        id: String(p._id),
        _id: p._id,
        name: String(p.name || ""),
        slug: String(p.slug || ""),
      }));
    } catch {
      patternsList = [];
    }
  }

  const resolvedPatternIds: string[] = [];
  const resolvedPatterns: Array<{ id: string; name: string; slug: string }> = [];

  for (const item of rawPatternsList) {
    const itemStr = String(item ?? "").trim();
    if (!itemStr) continue;

    const resolution = resolveReference(itemStr, patternsList);
    if (resolution.matched) {
      if (!resolvedPatternIds.includes(resolution.matched.id)) {
        resolvedPatternIds.push(resolution.matched.id);
        resolvedPatterns.push({
          id: resolution.matched.id,
          name: resolution.matched.name || "",
          slug: resolution.matched.slug,
        });
        info.push(`✓ Resolved pattern "${resolution.matched.name}" (slug: ${resolution.matched.slug}).`);
      }
    } else if (resolution.isAmbiguous) {
      const candidates = resolution.candidates.map((c) => `"${c.entity.name}"`).slice(0, 3).join(", ");
      warnings.push(`Pattern reference '${itemStr}' is ambiguous (${candidates}).`);
    } else {
      warnings.push(`Referenced pattern '${itemStr}' was not found in the database.`);
    }
  }

  // ── 6. Description / Summary Validation ──
  const rawSummary = String(data.summary ?? data.description ?? "").trim();
  if (!rawSummary) {
    errors.push("Problem 'summary' (description) is required.");
  } else if (rawSummary.length < 10) {
    errors.push("Problem summary must be at least 10 characters.");
  } else if (rawSummary.length > 3000) {
    errors.push(`Problem summary exceeds maximum length of 3000 characters (${rawSummary.length} chars).`);
  } else if (rawSummary.length < 30) {
    warnings.push("Summary is very brief. Consider providing problem constraints and input/output descriptions.");
  }

  // ── 7. Pedagogical Extensions Validation ──
  const thinkingDirection = String(data.thinkingDirection ?? data.intuition ?? "").trim();
  if (thinkingDirection.length > 3000) {
    errors.push(`Thinking direction exceeds 3000 characters limit (${thinkingDirection.length} chars).`);
  }

  const dryRunPrompt = String(data.dryRunPrompt ?? data.walkthrough ?? "").trim();
  if (dryRunPrompt.length > 3000) {
    errors.push(`Dry run prompt exceeds 3000 characters limit (${dryRunPrompt.length} chars).`);
  }

  // Hints normalization
  const hints: ProblemHint[] = [];
  if (Array.isArray(data.hints)) {
    data.hints.forEach((h: any, idx: number) => {
      if (typeof h === "string") {
        const text = h.trim();
        if (text) {
          hints.push({
            level: Math.min(5, idx + 1),
            title: `Hint ${idx + 1}`,
            content: text.slice(0, 1000),
          });
        }
      } else if (typeof h === "object" && h !== null) {
        const content = String(h.content ?? h.text ?? "").trim();
        if (content) {
          const rawLevel = Number(h.level ?? idx + 1);
          const level = Math.max(1, Math.min(5, isNaN(rawLevel) ? idx + 1 : Math.round(rawLevel)));
          const title = String(h.title ?? `Hint ${level}`).trim().slice(0, 120);
          hints.push({
            level,
            title,
            content: content.slice(0, 1000),
          });
        }
      }
    });
  }

  // Common Mistakes normalization
  let rawMistakesList: unknown[] = [];
  if (Array.isArray(data.commonMistakes)) {
    rawMistakesList = data.commonMistakes;
  } else if (Array.isArray(data.pitfalls)) {
    rawMistakesList = data.pitfalls;
  } else if (typeof data.commonMistakes === "string" && data.commonMistakes.trim()) {
    rawMistakesList = data.commonMistakes.split(/[\n,]+/).map((s) => s.trim());
  }

  const commonMistakes: string[] = [];
  const seenMistakes = new Set<string>();
  for (const m of rawMistakesList) {
    const mStr = String(m ?? "").trim();
    if (!mStr) continue;
    const truncated = mStr.slice(0, 300);
    const key = truncated.toLowerCase();
    if (!seenMistakes.has(key)) {
      seenMistakes.add(key);
      commonMistakes.push(truncated);
    }
  }

  // Tags normalization
  let rawTagsList: unknown[] = [];
  if (Array.isArray(data.tags)) {
    rawTagsList = data.tags;
  } else if (typeof data.tags === "string" && data.tags.trim()) {
    rawTagsList = data.tags.split(/[\n,]+/).map((s) => s.trim());
  }

  const tags: string[] = [];
  const seenTags = new Set<string>();
  for (const t of rawTagsList) {
    const tStr = String(t ?? "").trim().toLowerCase();
    if (!tStr) continue;
    const truncated = tStr.slice(0, 40);
    if (!seenTags.has(truncated)) {
      seenTags.add(truncated);
      tags.push(truncated);
    }
  }

  // ── 8. Difficulty Normalization ──
  const rawDiffStr = String(data.difficulty ?? "easy").toLowerCase().trim();
  const normalizedDifficulty: ProblemDifficulty = PROBLEM_DIFFICULTY_MAP[rawDiffStr] || "easy";
  if (!PROBLEM_DIFFICULTY_MAP[rawDiffStr]) {
    warnings.push(`Unrecognized difficulty '${rawDiffStr}'. Defaulted to 'easy'.`);
  } else if (rawDiffStr !== normalizedDifficulty) {
    info.push(`Difficulty alias '${rawDiffStr}' normalized to standard '${normalizedDifficulty}'.`);
  }

  // ── 9. Metadata (Estimated Minutes, Quality Score, Published) ──
  let estimatedMinutes = Number(data.estimatedMinutes ?? data.duration ?? 30);
  if (isNaN(estimatedMinutes) || estimatedMinutes < 5) {
    estimatedMinutes = 30;
  } else if (estimatedMinutes > 300) {
    warnings.push("Estimated time capped at 300 minutes.");
    estimatedMinutes = 300;
  }

  let qualityScore = Number(data.qualityScore ?? 0.5);
  if (isNaN(qualityScore) || qualityScore < 0) qualityScore = 0;
  if (qualityScore > 1) qualityScore = 1;

  const isPublished = Boolean(data.isPublished ?? data.published ?? false);

  // ── 10. Database Checks & Triple Duplicate Intelligence ──
  let problemsList: Array<{ id: string; _id?: unknown; title: string; slug: string; sourceUrl?: string }> =
    options.existingProblems ?? [];

  if (!options.existingProblems) {
    try {
      const dbProblems = await ProblemModel.find({}).select("title slug sourceUrl _id").lean();
      problemsList = dbProblems.map((p: any) => ({
        id: String(p._id),
        _id: p._id,
        title: String(p.title || ""),
        slug: String(p.slug || ""),
        sourceUrl: String(p.sourceUrl || ""),
      }));
    } catch {
      problemsList = [];
    }
  }

  const currentIdStr = currentProblemId ? String(currentProblemId) : "";
  let duplicateByUrl: { id: string; title: string; slug: string; sourceUrl: string } | null = null;
  let duplicateBySlug: { id: string; title: string; slug: string } | null = null;
  let duplicateByTitle: { id: string; title: string; slug: string } | null = null;
  const similarMatches: Array<{ id: string; title: string; slug: string; similarity: number }> = [];

  // Check URL collision
  if (canonicalUrl) {
    const urlCollision = problemsList.find(
      (p) =>
        p.id !== currentIdStr &&
        p.sourceUrl &&
        p.sourceUrl.replace(/\/+$/, "").toLowerCase() === canonicalUrl.toLowerCase()
    );
    if (urlCollision) {
      errors.push(
        `A problem with URL '${rawUrl}' already exists in the database ("${urlCollision.title}"). URLs must be unique.`
      );
      duplicateByUrl = {
        id: urlCollision.id,
        title: urlCollision.title,
        slug: urlCollision.slug,
        sourceUrl: urlCollision.sourceUrl || "",
      };
    }
  }

  // Check exact Slug collision
  const slugCollision = problemsList.find(
    (p) => p.slug === rawSlug && p.id !== currentIdStr
  );
  if (slugCollision) {
    errors.push(
      `A problem with slug '${rawSlug}' already exists in the database ("${slugCollision.title}"). Slugs must be unique.`
    );
    duplicateBySlug = {
      id: slugCollision.id,
      title: slugCollision.title,
      slug: slugCollision.slug,
    };
  }

  // Check exact Title collision
  const titleCollision = problemsList.find(
    (p) => p.title.toLowerCase() === rawTitle.toLowerCase() && p.id !== currentIdStr
  );
  if (titleCollision && !slugCollision) {
    warnings.push(
      `A problem with title '${titleCollision.title}' already exists (slug: '${titleCollision.slug}'). Confirm if this is an update or distinct problem.`
    );
    duplicateByTitle = {
      id: titleCollision.id,
      title: titleCollision.title,
      slug: titleCollision.slug,
    };
  }

  // Fuzzy Title Similarity Check (>= 80%)
  for (const existing of problemsList) {
    if (existing.id === currentIdStr) continue;
    if (existing.slug === rawSlug || existing.title.toLowerCase() === rawTitle.toLowerCase()) continue;

    const sim = calculateStringSimilarity(rawTitle, existing.title);
    if (sim >= 0.80) {
      similarMatches.push({
        id: existing.id,
        title: existing.title,
        slug: existing.slug,
        similarity: Math.round(sim * 100),
      });
      warnings.push(
        `Problem title is highly similar (${Math.round(sim * 100)}%) to existing problem "${existing.title}" (slug: '${existing.slug}').`
      );
    }
  }

  // ── Status determination ──
  const status: ProblemValidationResult["status"] =
    errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "valid";

  return {
    valid: errors.length === 0,
    status,
    errors,
    warnings,
    info,
    duplicateByUrl,
    duplicateBySlug,
    duplicateByTitle,
    similarMatches: similarMatches.length > 0 ? similarMatches : undefined,
    resolvedTopics,
    resolvedPatterns,
    resolved: {
      title: rawTitle,
      slug: rawSlug,
      summary: rawSummary,
      source: normalizedSource,
      sourceUrl: canonicalUrl || rawUrl,
      externalId,
      topicIds: resolvedTopicIds,
      patternIds: resolvedPatternIds,
      difficulty: normalizedDifficulty,
      estimatedMinutes,
      qualityScore,
      thinkingDirection,
      dryRunPrompt,
      hints,
      commonMistakes,
      tags,
      isPublished,
    },
  };
}

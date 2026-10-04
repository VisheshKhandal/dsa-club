import { PatternModel, TopicModel } from "@/features/content/models/content.model";
import {
  PatternDifficulty,
  PatternImportRawInput,
  PatternValidationResult,
  ValidatePatternImportOptions,
  ALLOWED_DIFFICULTIES,
  slugify,
  calculateStringSimilarity,
  cleanAndParsePatternJson,
} from "./pattern-import.types";
import { resolveReference } from "./content-import-shared";

export * from "./pattern-import.types";

/**
 * Deterministically validates an imported Pattern against DSA Club schemas,
 * business invariants, and existing database records.
 */
export async function validatePatternImport(
  options: ValidatePatternImportOptions
): Promise<PatternValidationResult> {
  const { input, currentPatternId } = options;
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];

  let data: PatternImportRawInput;
  try {
    data = cleanAndParsePatternJson(input);
  } catch (err: any) {
    return {
      valid: false,
      status: "error",
      errors: [err.message || "Failed to parse JSON input."],
      warnings: [],
      info: [],
      resolved: {
        name: "",
        slug: "",
        topicId: "",
        description: "",
        whenToUse: "",
        mentalModel: "",
        variations: [],
        signalKeywords: [],
        prerequisitePatternIds: [],
        difficulty: "medium",
        isPublished: false,
      },
    };
  }

  // ── 1. Name Validation ──
  const rawName = String(data.name ?? data.title ?? "").trim();
  if (!rawName) {
    errors.push("Pattern 'name' is required.");
  } else if (rawName.length > 120) {
    errors.push(`Pattern name exceeds maximum length of 120 characters (${rawName.length} chars).`);
  }

  // ── 2. Slug Validation & Consistency ──
  let rawSlug = String(data.slug ?? "").trim().toLowerCase();
  const derivedSlug = rawName ? slugify(rawName) : "";

  if (!rawSlug) {
    if (derivedSlug) {
      rawSlug = derivedSlug;
      info.push(`Slug was auto-generated as '${rawSlug}' from pattern name.`);
    } else {
      errors.push("Pattern 'slug' is required.");
    }
  } else {
    if (!/^[a-z0-9-]+$/.test(rawSlug)) {
      errors.push("Slug must contain only lowercase alphanumeric characters and hyphens.");
    }
    if (rawSlug.length > 100) {
      errors.push("Slug cannot exceed 100 characters.");
    }
    // Consistency check: check if slug differs significantly from name
    if (derivedSlug && rawSlug !== derivedSlug) {
      const slugSim = calculateStringSimilarity(rawSlug.replace(/-/g, " "), rawName);
      if (slugSim < 0.3) {
        warnings.push(`Slug '${rawSlug}' diverges significantly from pattern name '${rawName}'.`);
      }
    }
  }

  // ── 3. Topic Reference Resolution (DSA Club Intelligence) ──
  const rawTopic = String(
    data.topic ?? data.topicName ?? data.topicSlug ?? data.topicId ?? ""
  ).trim();

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

  let resolvedTopicId = "";
  let resolvedTopic: { id: string; name: string; slug: string } | null = null;

  if (!rawTopic) {
    errors.push("Pattern 'topic' reference is required (specify topic name, slug, or ID).");
  } else {
    const resolution = resolveReference(rawTopic, topicsList);

    if (resolution.matched) {
      resolvedTopicId = resolution.matched.id;
      resolvedTopic = {
        id: resolution.matched.id,
        name: resolution.matched.name || "",
        slug: resolution.matched.slug,
      };
      info.push(
        `✓ Resolved topic to "${resolvedTopic.name}" (slug: ${resolvedTopic.slug}).`
      );
    } else if (resolution.isAmbiguous) {
      const candidateNames = resolution.candidates
        .map((c) => `"${c.entity.name}"`)
        .slice(0, 3)
        .join(", ");
      errors.push(
        `Topic reference '${rawTopic}' is ambiguous. Potential matches include: ${candidateNames}. Please specify exact topic name or slug.`
      );
    } else {
      const suggestions = resolution.candidates
        .map((c) => `"${c.entity.name}"`)
        .slice(0, 2)
        .join(" or ");
      const suggestionText = suggestions ? ` (did you mean ${suggestions}?)` : "";
      errors.push(
        `Referenced Topic '${rawTopic}' was not found in the database${suggestionText}. Create or select an existing topic first.`
      );
    }
  }

  // ── 4. Description Validation ──
  const rawDescription = String(data.description ?? data.summary ?? "").trim();
  if (!rawDescription) {
    errors.push("Pattern 'description' is required.");
  } else if (rawDescription.length < 10) {
    errors.push("Pattern description must be at least 10 characters.");
  } else if (rawDescription.length > 2000) {
    errors.push(`Pattern description exceeds 2000 characters limit (${rawDescription.length} chars).`);
  } else if (rawDescription.length < 30) {
    warnings.push("Description is very brief. A more detailed explanation will help students learn faster.");
  }

  // ── 5. When to Use Validation ──
  const rawWhenToUse = String(data.whenToUse ?? data.usage ?? "").trim();
  if (rawWhenToUse.length > 2000) {
    errors.push(`'When to Use' exceeds 2000 characters limit (${rawWhenToUse.length} chars).`);
  } else if (!rawWhenToUse) {
    warnings.push("Adding a 'When to Use' explanation helps learners recognize when to apply this pattern in interviews.");
  }

  // ── 6. Mental Model Validation ──
  const rawMentalModel = String(data.mentalModel ?? data.intuition ?? "").trim();
  if (rawMentalModel.length > 2000) {
    errors.push(`'Mental Model' exceeds 2000 characters limit (${rawMentalModel.length} chars).`);
  } else if (!rawMentalModel) {
    warnings.push("Adding a 'Mental Model' provides an intuitive mental framework or visual model for learners.");
  }

  // ── 7. Common Variations Normalization ──
  let rawVariationsList: unknown[] = [];
  if (Array.isArray(data.variations)) {
    rawVariationsList = data.variations;
  } else if (Array.isArray(data.commonVariations)) {
    rawVariationsList = data.commonVariations;
  } else if (typeof data.variations === "string" && data.variations.trim()) {
    rawVariationsList = data.variations.split(/[\n,]+/).map((s) => s.trim());
  }

  const variations: string[] = [];
  const seenVariations = new Set<string>();
  for (const v of rawVariationsList) {
    const vStr = String(v ?? "").trim();
    if (!vStr) continue;
    if (vStr.length > 300) {
      warnings.push(`Variation "${vStr.slice(0, 30)}..." exceeds 300 characters. Truncated.`);
    }
    const truncated = vStr.slice(0, 300);
    const key = truncated.toLowerCase();
    if (!seenVariations.has(key)) {
      seenVariations.add(key);
      variations.push(truncated);
    }
  }

  // ── 8. Signal Keywords Normalization ──
  let rawKeywordsList: unknown[] = [];
  if (Array.isArray(data.signalKeywords)) {
    rawKeywordsList = data.signalKeywords;
  } else if (Array.isArray(data.keywords)) {
    rawKeywordsList = data.keywords;
  } else if (Array.isArray(data.signals)) {
    rawKeywordsList = data.signals;
  } else if (Array.isArray(data.tags)) {
    rawKeywordsList = data.tags;
  } else if (typeof data.signalKeywords === "string" && data.signalKeywords.trim()) {
    rawKeywordsList = data.signalKeywords.split(/[\n,]+/).map((s) => s.trim());
  } else if (typeof data.keywords === "string" && data.keywords.trim()) {
    rawKeywordsList = data.keywords.split(/[\n,]+/).map((s) => s.trim());
  }

  const signalKeywords: string[] = [];
  const seenKeywords = new Set<string>();
  for (const kw of rawKeywordsList) {
    const kwStr = String(kw ?? "").trim().toLowerCase();
    if (!kwStr) continue;
    if (kwStr.length > 80) {
      warnings.push(`Keyword "${kwStr.slice(0, 20)}..." exceeds 80 characters. Truncated.`);
    }
    const truncated = kwStr.slice(0, 80);
    if (!seenKeywords.has(truncated)) {
      seenKeywords.add(truncated);
      signalKeywords.push(truncated);
    }
  }

  // ── 9. Difficulty Normalization ──
  const rawDiffStr = String(data.difficulty ?? "medium").toLowerCase().trim();
  const normalizedDifficulty: PatternDifficulty = ALLOWED_DIFFICULTIES[rawDiffStr] || "medium";
  if (!ALLOWED_DIFFICULTIES[rawDiffStr]) {
    warnings.push(`Unrecognized difficulty '${rawDiffStr}'. Defaulted to 'medium'.`);
  } else if (rawDiffStr !== normalizedDifficulty) {
    info.push(`Difficulty alias '${rawDiffStr}' normalized to standard '${normalizedDifficulty}'.`);
  }

  // ── 10. Published Status ──
  const isPublished = Boolean(data.isPublished ?? data.published ?? false);

  // ── 11. Database Checks & Duplicate Pattern Intelligence ──
  let patternsList: Array<{ id: string; _id?: unknown; name: string; slug: string; topicId?: string }> =
    options.existingPatterns ?? [];

  if (!options.existingPatterns) {
    try {
      const dbPatterns = await PatternModel.find({}).select("name slug topicId _id").lean();
      patternsList = dbPatterns.map((p: any) => ({
        id: String(p._id),
        _id: p._id,
        name: String(p.name || ""),
        slug: String(p.slug || ""),
        topicId: p.topicId ? String(p.topicId) : undefined,
      }));
    } catch {
      patternsList = [];
    }
  }

  let duplicateMatch: { id: string; name: string; slug: string } | null = null;
  const similarMatches: Array<{ id: string; name: string; slug: string; similarity: number }> = [];
  const currentIdStr = currentPatternId ? String(currentPatternId) : "";

  // Check exact slug collision
  const slugCollision = patternsList.find(
    (p) => p.slug === rawSlug && p.id !== currentIdStr
  );
  if (slugCollision) {
    errors.push(
      `A pattern with slug '${rawSlug}' already exists in the database ("${slugCollision.name}"). Slugs must be unique.`
    );
    duplicateMatch = { id: slugCollision.id, name: slugCollision.name, slug: slugCollision.slug };
  }

  // Check exact name collision
  const nameCollision = patternsList.find(
    (p) => p.name.toLowerCase() === rawName.toLowerCase() && p.id !== currentIdStr
  );
  if (nameCollision && !slugCollision) {
    warnings.push(
      `A pattern with name '${nameCollision.name}' already exists (slug: '${nameCollision.slug}'). Confirm if this is an update or a distinct pattern.`
    );
    if (!duplicateMatch) {
      duplicateMatch = { id: nameCollision.id, name: nameCollision.name, slug: nameCollision.slug };
    }
  }

  // Fuzzy Similarity Check
  for (const existing of patternsList) {
    if (existing.id === currentIdStr) continue;
    if (existing.slug === rawSlug || existing.name.toLowerCase() === rawName.toLowerCase()) continue;

    const sim = calculateStringSimilarity(rawName, existing.name);
    if (sim >= 0.72) {
      similarMatches.push({
        id: existing.id,
        name: existing.name,
        slug: existing.slug,
        similarity: Math.round(sim * 100),
      });
      warnings.push(
        `Pattern name is highly similar (${Math.round(sim * 100)}%) to existing pattern "${existing.name}" (slug: '${existing.slug}').`
      );
    }
  }

  // ── 12. Prerequisite Patterns Resolution ──
  const rawPrereqs = Array.isArray(data.prerequisitePatterns)
    ? data.prerequisitePatterns
    : Array.isArray(data.prerequisites)
    ? data.prerequisites
    : Array.isArray(data.prerequisitePatternIds)
    ? data.prerequisitePatternIds
    : typeof data.prerequisitePatterns === "string" && data.prerequisitePatterns.trim()
    ? data.prerequisitePatterns.split(/[\n,]+/).map((s) => s.trim())
    : [];

  const resolvedPrereqIds: string[] = [];
  const resolvedPrereqPatterns: Array<{ id: string; name: string; slug: string }> = [];

  for (const item of rawPrereqs) {
    const itemStr = String(item ?? "").trim();
    if (!itemStr) continue;

    // Check self-reference
    if (
      (currentIdStr && itemStr === currentIdStr) ||
      (rawSlug && itemStr.toLowerCase() === rawSlug.toLowerCase()) ||
      (rawName && itemStr.toLowerCase() === rawName.toLowerCase())
    ) {
      errors.push("Pattern cannot list itself as a prerequisite.");
      continue;
    }

    const matched = patternsList.find(
      (p) =>
        p.id === itemStr ||
        p.slug.toLowerCase() === itemStr.toLowerCase() ||
        p.name.toLowerCase() === itemStr.toLowerCase() ||
        slugify(p.name) === slugify(itemStr)
    );

    if (matched) {
      if (!resolvedPrereqIds.includes(matched.id)) {
        resolvedPrereqIds.push(matched.id);
        resolvedPrereqPatterns.push({ id: matched.id, name: matched.name, slug: matched.slug });
        info.push(`✓ Matched prerequisite pattern "${matched.name}" (slug: ${matched.slug}).`);
      }
    } else {
      warnings.push(`Referenced prerequisite pattern '${itemStr}' was not found in the database.`);
    }
  }

  // ── Status determination ──
  const status: PatternValidationResult["status"] =
    errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "valid";

  return {
    valid: errors.length === 0,
    status,
    errors,
    warnings,
    info,
    duplicateMatch,
    similarMatches: similarMatches.length > 0 ? similarMatches : undefined,
    resolvedTopic,
    resolvedPrerequisitePatterns: resolvedPrereqPatterns.length > 0 ? resolvedPrereqPatterns : undefined,
    resolved: {
      name: rawName,
      slug: rawSlug,
      topicId: resolvedTopicId,
      description: rawDescription,
      whenToUse: rawWhenToUse,
      mentalModel: rawMentalModel,
      variations,
      signalKeywords,
      prerequisitePatternIds: resolvedPrereqIds,
      difficulty: normalizedDifficulty,
      isPublished,
    },
  };
}

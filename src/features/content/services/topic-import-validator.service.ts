import { TopicModel, PatternModel, ProblemModel } from "@/features/content/models/content.model";
import {
  TopicDifficulty,
  TopicImportRawInput,
  TopicValidationResult,
  ValidateTopicImportOptions,
  ALLOWED_DIFFICULTIES,
  slugify,
  calculateStringSimilarity,
  cleanAndParseTopicJson,
} from "./topic-import.types";

export * from "./topic-import.types";

/**
 * Deterministically validates a parsed Topic against DSA Club rules and existing DB records.
 */
export async function validateTopicImport(options: ValidateTopicImportOptions): Promise<TopicValidationResult> {
  const { input, currentTopicId } = options;
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];

  let data: TopicImportRawInput;
  try {
    data = cleanAndParseTopicJson(input);
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
        description: "",
        difficulty: "beginner",
        order: 0,
        estimatedMinutes: 60,
        isPublished: false,
        prerequisiteTopicIds: [],
        prerequisiteTopicNames: [],
        metadata: {
          keyConcepts: [],
          recommendedPatterns: [],
          targetProblems: [],
          learningObjectives: [],
          tags: [],
        },
      },
    };
  }

  // ── 1. Name Validation ──
  const rawName = String(data.name ?? data.title ?? "").trim();
  if (!rawName) {
    errors.push("Topic 'name' is required.");
  } else if (rawName.length > 120) {
    errors.push(`Topic name exceeds maximum length of 120 characters (${rawName.length} chars).`);
  }

  // ── 2. Slug Validation & Consistency ──
  let rawSlug = String(data.slug ?? "").trim().toLowerCase();
  const derivedSlug = rawName ? slugify(rawName) : "";

  if (!rawSlug) {
    if (derivedSlug) {
      rawSlug = derivedSlug;
      info.push(`Slug was auto-generated as '${rawSlug}' from topic name.`);
    } else {
      errors.push("Topic 'slug' is required.");
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
        warnings.push(`Slug '${rawSlug}' diverges significantly from topic name '${rawName}'.`);
      }
    }
  }

  // ── 3. Description Validation ──
  const rawDescription = String(data.description ?? data.summary ?? "").trim();
  if (!rawDescription) {
    errors.push("Topic 'description' is required.");
  } else if (rawDescription.length < 10) {
    errors.push("Topic description must be at least 10 characters.");
  } else if (rawDescription.length > 1000) {
    errors.push(`Topic description exceeds 1000 characters limit (${rawDescription.length} chars).`);
  } else if (rawDescription.length < 35) {
    warnings.push("Description is very brief. We recommend providing a more comprehensive curriculum summary.");
  }

  // ── 4. Difficulty Normalization ──
  const rawDiffStr = String(data.difficulty ?? "beginner").toLowerCase().trim();
  const normalizedDifficulty: TopicDifficulty = ALLOWED_DIFFICULTIES[rawDiffStr] || "beginner";
  if (!ALLOWED_DIFFICULTIES[rawDiffStr]) {
    warnings.push(`Unrecognized difficulty '${rawDiffStr}'. Defaulted to 'beginner'.`);
  } else if (rawDiffStr !== normalizedDifficulty) {
    info.push(`Difficulty alias '${rawDiffStr}' normalized to standard '${normalizedDifficulty}'.`);
  }

  // ── 5. Display Order Validation ──
  let rawOrder = Number(data.order ?? data.displayOrder ?? 0);
  if (isNaN(rawOrder) || rawOrder < 0 || !Number.isInteger(rawOrder)) {
    warnings.push("Display order should be a non-negative integer. Defaulted to 0.");
    rawOrder = 0;
  }

  // ── 6. Estimated Minutes Validation ──
  let rawMinutes = Number(data.estimatedMinutes ?? data.durationMinutes ?? 60);
  if (isNaN(rawMinutes) || rawMinutes < 5) {
    warnings.push("Estimated study time should be at least 5 minutes. Defaulted to 60 minutes.");
    rawMinutes = 60;
  } else if (rawMinutes > 10000) {
    warnings.push("Estimated study time is unusually high (>10,000 mins). Capped at 10,000.");
    rawMinutes = 10000;
  }

  // ── 7. Published Status ──
  const isPublished = Boolean(data.isPublished ?? data.published ?? false);

  // ── 8. Extensible Metadata Normalization ──
  const keyConcepts = Array.isArray(data.keyConcepts)
    ? data.keyConcepts.map(String).map((s) => s.trim()).filter(Boolean)
    : [];
  const recommendedPatterns = Array.isArray(data.recommendedPatterns)
    ? data.recommendedPatterns.map(String).map((s) => s.trim()).filter(Boolean)
    : [];
  const targetProblems = Array.isArray(data.targetProblems)
    ? data.targetProblems.map(String).map((s) => s.trim()).filter(Boolean)
    : [];
  const learningObjectives = Array.isArray(data.learningObjectives)
    ? data.learningObjectives.map(String).map((s) => s.trim()).filter(Boolean)
    : [];
  const tags = Array.isArray(data.tags)
    ? data.tags.map(String).map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [];

  // ── 9. Database Checks & Duplicate Intelligence ──
  let topicsList: Array<{ id: string; _id?: unknown; name: string; slug: string }> = options.existingTopics ?? [];

  // If not injected via options, query database
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

  let duplicateMatch: { id: string; name: string; slug: string } | null = null;
  const similarMatches: Array<{ id: string; name: string; slug: string; similarity: number }> = [];

  const currentIdStr = currentTopicId ? String(currentTopicId) : "";

  // Check exact slug collision
  const slugCollision = topicsList.find(
    (t) => t.slug === rawSlug && t.id !== currentIdStr
  );
  if (slugCollision) {
    errors.push(
      `A topic with slug '${rawSlug}' already exists in the database ("${slugCollision.name}"). Slugs must be unique.`
    );
    duplicateMatch = { id: slugCollision.id, name: slugCollision.name, slug: slugCollision.slug };
  }

  // Check exact name collision
  const nameCollision = topicsList.find(
    (t) => t.name.toLowerCase() === rawName.toLowerCase() && t.id !== currentIdStr
  );
  if (nameCollision && !slugCollision) {
    warnings.push(
      `A topic with name '${nameCollision.name}' already exists (slug: '${nameCollision.slug}'). Confirm if this is an update or distinct topic.`
    );
    if (!duplicateMatch) {
      duplicateMatch = { id: nameCollision.id, name: nameCollision.name, slug: nameCollision.slug };
    }
  }

  // Fuzzy Similarity Check
  for (const existing of topicsList) {
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
        `Topic name is highly similar (${Math.round(sim * 100)}%) to existing topic "${existing.name}" (slug: '${existing.slug}').`
      );
    }
  }

  // ── 10. Prerequisite Topics Validation ──
  const rawPrereqs = Array.isArray(data.prerequisiteTopics)
    ? data.prerequisiteTopics
    : Array.isArray(data.prerequisites)
    ? data.prerequisites
    : Array.isArray(data.prerequisiteTopicIds)
    ? data.prerequisiteTopicIds
    : [];

  const resolvedPrereqIds: string[] = [];
  const resolvedPrereqNames: string[] = [];

  for (const item of rawPrereqs) {
    const itemStr = String(item ?? "").trim();
    if (!itemStr) continue;

    // Check self-reference
    if (
      (currentIdStr && itemStr === currentIdStr) ||
      (rawSlug && itemStr.toLowerCase() === rawSlug.toLowerCase()) ||
      (rawName && itemStr.toLowerCase() === rawName.toLowerCase())
    ) {
      errors.push("Topic cannot list itself as a prerequisite.");
      continue;
    }

    // Match against existing topics by ID, slug, or name
    const matched = topicsList.find(
      (t) =>
        t.id === itemStr ||
        t.slug.toLowerCase() === itemStr.toLowerCase() ||
        t.name.toLowerCase() === itemStr.toLowerCase()
    );

    if (matched) {
      if (!resolvedPrereqIds.includes(matched.id)) {
        resolvedPrereqIds.push(matched.id);
        resolvedPrereqNames.push(matched.name);
        info.push(`✓ Matched prerequisite topic "${matched.name}" (slug: ${matched.slug}).`);
      }
    } else {
      warnings.push(`Referenced prerequisite topic '${itemStr}' was not found in the database.`);
    }
  }

  // ── 11. Referenced Patterns Validation ──
  let patternsList: Array<{ id: string; _id?: unknown; name: string; slug: string }> = options.existingPatterns ?? [];
  if (recommendedPatterns.length > 0) {
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

    for (const pat of recommendedPatterns) {
      const patStr = pat.trim();
      const matched = patternsList.find(
        (p) =>
          p.id === patStr ||
          p.slug.toLowerCase() === patStr.toLowerCase() ||
          p.name.toLowerCase() === patStr.toLowerCase()
      );
      if (matched) {
        info.push(`✓ Matched pattern "${matched.name}" (slug: ${matched.slug}).`);
      } else {
        warnings.push(`Referenced pattern '${patStr}' was not found in the database.`);
      }
    }
  }

  // ── 12. Referenced Problems Validation ──
  let problemsList: Array<{ id: string; _id?: unknown; title: string; slug: string }> = options.existingProblems ?? [];
  if (targetProblems.length > 0) {
    if (!options.existingProblems) {
      try {
        const dbProblems = await ProblemModel.find({}).select("title slug _id").lean();
        problemsList = dbProblems.map((p: any) => ({
          id: String(p._id),
          _id: p._id,
          title: String(p.title || ""),
          slug: String(p.slug || ""),
        }));
      } catch {
        problemsList = [];
      }
    }

    for (const prob of targetProblems) {
      const probStr = prob.trim();
      const matched = problemsList.find(
        (p) =>
          p.id === probStr ||
          p.slug.toLowerCase() === probStr.toLowerCase() ||
          p.title.toLowerCase() === probStr.toLowerCase()
      );
      if (matched) {
        info.push(`✓ Matched problem "${matched.title}" (slug: ${matched.slug}).`);
      } else {
        warnings.push(`Referenced problem '${probStr}' was not found in the database.`);
      }
    }
  }

  // ── Status determination ──
  const status: TopicValidationResult["status"] =
    errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "valid";

  return {
    valid: errors.length === 0,
    status,
    errors,
    warnings,
    info,
    duplicateMatch,
    similarMatches: similarMatches.length > 0 ? similarMatches : undefined,
    resolved: {
      name: rawName,
      slug: rawSlug,
      description: rawDescription,
      difficulty: normalizedDifficulty,
      order: rawOrder,
      estimatedMinutes: rawMinutes,
      isPublished,
      prerequisiteTopicIds: resolvedPrereqIds,
      prerequisiteTopicNames: resolvedPrereqNames,
      metadata: {
        keyConcepts,
        recommendedPatterns,
        targetProblems,
        learningObjectives,
        tags,
      },
    },
  };
}

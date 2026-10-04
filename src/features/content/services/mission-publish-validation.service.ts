import { Types } from "mongoose";
import { MissionModel, PatternModel, ProblemModel, TopicModel } from "@/features/content/models/content.model";

type MissionStepInput = {
  key: string;
  kind: string;
  
  content?: string | null;
  targetId?: string | null;
  required?: boolean;
  weight?: number;
};

type MissionPublishInput = {
  _id?: unknown;
  title?: string;
  topicId?: string | Types.ObjectId | null;
  patternId?: string | Types.ObjectId | null;
  steps?: MissionStepInput[];
};

const REQUIRED_STAGE_KINDS = ["introduction", "concept", "pattern", "practice", "reflection", "mastery"];
const MECHANIC_STAGE_KINDS = new Set(["pattern", "practice", "mastery"]);

function textOnly(value: unknown) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isObjectId(value: unknown) {
  return typeof value === "string" && Types.ObjectId.isValid(value);
}

function id(value: unknown) {
  return value ? String(value) : "";
}

export class MissionPublishValidationError extends Error {
  constructor(public issues: string[]) {
    super("Mission is not ready to publish.");
  }
}


export async function validateMissionForPublish(input: MissionPublishInput) {
  const issues: string[] = [];
  const steps = input.steps ?? [];
  const topicId = id(input.topicId);
  const patternId = id(input.patternId);

  if (!topicId || !Types.ObjectId.isValid(topicId)) {
    issues.push("Select a valid topic before publishing.");
  } else {
    const topicExists = await TopicModel.exists({ _id: topicId, isPublished: true });
    if (!topicExists) issues.push("The mission topic must exist and be published.");
  }

  if (!steps.length) {
    issues.push("Add mission steps before publishing.");
  }

  const keys = new Set<string>();
  for (const step of steps) {
    const stepLabel = step.key || step.kind || "Unnamed step";
    if (!step.key?.trim()) issues.push("Every step needs a stable key.");
    if (step.key && keys.has(step.key)) issues.push(`Duplicate step key: "${step.key}".`);
    if (step.key) keys.add(step.key);
    if (step.required !== false && Number(step.weight ?? 0) <= 0) {
      issues.push(`Required step "${stepLabel}" needs a positive progress weight.`);
    }
    if (!MECHANIC_STAGE_KINDS.has(step.kind) && textOnly(step.content).length < 40) {
      issues.push(`Step "${stepLabel}" needs at least 40 characters of learner-facing content.`);
    }
  }

  // Core structural stages every mission must have (pattern stage is handled separately below)
  const ALWAYS_REQUIRED_STAGES = REQUIRED_STAGE_KINDS.filter((k) => k !== "pattern");
  for (const kind of ALWAYS_REQUIRED_STAGES) {
    if (!steps.some((step) => step.kind === kind)) {
      issues.push(`Add a "${kind.replace("_", " ")}" stage before publishing.`);
    }
  }

  // Pattern-stage validation: only validate target linkage when a target is actually provided.
  // A pattern step with content but no linked target is valid (content-only educational step).
  const patternStage = steps.find((step) => step.kind === "pattern");
  const hasPatternId = Boolean(patternId && Types.ObjectId.isValid(patternId));
  const hasPatternStep = Boolean(patternStage);

  if (hasPatternId && !hasPatternStep) {
    // Mission has a pattern selected but no pattern step to teach it
    issues.push('Add a "pattern" stage before publishing (the mission has a pattern selected).');
  }

  // Resolve the pattern target: step-level targetId takes priority, then mission-level patternId
  const patternTargetId = id(patternStage?.targetId) || patternId;
  const hasResolvedPatternTarget = Boolean(patternTargetId && Types.ObjectId.isValid(patternTargetId));

  // Only validate the pattern target if one was actually provided
  if (hasResolvedPatternTarget) {
    const pattern = await PatternModel.findOne({ _id: patternTargetId, isPublished: true }).select("topicId").lean();
    if (!pattern) {
      issues.push("Pattern stage target must be a published pattern.");
    } else if (topicId && id(pattern.topicId) !== topicId) {
      issues.push("Pattern stage target must belong to the selected mission topic.");
    }
  }

  const practiceSteps = steps.filter((step) => step.kind === "practice");
  for (const step of practiceSteps) {
    const stepLabel = step.key || "Unnamed practice step";
    // If the step has a targetId, validate it points to a real published problem
    if (step.targetId) {
      if (!isObjectId(step.targetId)) {
        issues.push(`Practice step "${stepLabel}" has an invalid target ID.`);
        continue;
      }
      const problem = await ProblemModel.findOne({ _id: step.targetId, isPublished: true }).select("topicIds patternIds sourceUrl").lean();
      if (!problem) {
        issues.push(`Practice step "${stepLabel}" target problem must exist and be published.`);
        continue;
      }
      if (!String(problem.sourceUrl ?? "").startsWith("http")) {
        issues.push(`Practice step "${stepLabel}" target problem needs a valid external URL.`);
      }
      if (topicId && !(problem.topicIds ?? []).some((candidate: unknown) => id(candidate) === topicId)) {
        issues.push(`Practice step "${stepLabel}" target problem must belong to the mission topic.`);
      }
      // Only check pattern linkage when this mission has a resolved pattern target
      if (hasResolvedPatternTarget && !(problem.patternIds ?? []).some((candidate: unknown) => id(candidate) === patternTargetId)) {
        issues.push(`Practice step "${stepLabel}" target problem should be linked to the mission pattern.`);
      }
    } else {
      // No targetId — this is a content-only practice step. Require meaningful content.
      if (textOnly(step.content).length < 40) {
        issues.push(`Practice step "${stepLabel}" needs either a target problem or at least 40 characters of content.`);
      }
    }
  }

  const masteryStage = steps.find((step) => step.kind === "mastery");
  if (masteryStage && textOnly(masteryStage.content).length < 80) {
    issues.push("Mastery stage needs a meaningful prompt that asks the learner to explain, optimize, or assess edge cases.");
  }

  if (issues.length) throw new MissionPublishValidationError(issues);
}

export async function mergeMissionForPublishValidation(id: string, patch: Partial<MissionPublishInput>) {
  const existing = await MissionModel.findById(id).lean();
  if (!existing) return patch as MissionPublishInput;
  return {
    _id: existing._id,
    title: String(patch.title ?? existing.title ?? ""),
    topicId: patch.topicId ?? existing.topicId,
    patternId: patch.patternId ?? existing.patternId,
    steps: patch.steps ?? (existing.steps as MissionStepInput[] | undefined) ?? [],
  };
}

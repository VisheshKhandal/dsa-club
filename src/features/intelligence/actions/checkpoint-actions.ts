"use server";

import { requireUserId } from "@/lib/auth-guard";
import {
  getEligibleCheckpointItems,
  submitCheckpointAttempt,
  seedCheckpointFixtures,
  startCheckpointSession,
} from "../services/checkpoint.service";
import type { CheckpointPurpose } from "../models/checkpoint-session.model";
import { revalidatePath } from "next/cache";
import { serializeForClient } from "@/lib/utils";

/**
 * Pure read query: retrieves published checkpoints for a topic.
 * Content mutation is strictly separated from ordinary learner reads.
 */
export async function getTopicCheckpointsAction(topicSlug: string) {
  const items = await getEligibleCheckpointItems(topicSlug);

  return {
    ok: true,
    items: items.map((item) => ({
      itemKey: item.itemKey,
      version: item.version,
      topicSlug: item.topicSlug,
      capability: item.capability,
      prompt: item.prompt,
      itemType: item.itemType,
      evidenceType: item.evidenceType || "boundary_reasoning",
      variantFamilyId: item.variantFamilyId || null,
      variantType: item.variantType || "baseline",
      difficulty: item.difficulty,
      expectedDurationMinutes: item.expectedDurationMinutes,
      options: item.evaluationRubric.options?.map((opt) => ({
        key: opt.key,
        text: opt.text,
      })),
      reviewStatus: item.reviewStatus,
      isProvisional: item.reviewStatus !== "reviewed" && item.reviewStatus !== "approved",
    })),
  };
}

/**
 * Explicit administrative/setup action to seed checkpoint fixtures.
 */
export async function seedCheckpointsAction() {
  const count = await seedCheckpointFixtures();
  return { ok: true, seededCount: count };
}

/**
 * Starts an assessment session and freezes the assigned item version.
 */
export async function startCheckpointSessionAction(params: {
  itemKey: string;
  itemVersion?: string;
  purpose?: CheckpointPurpose;
  hintsUsed?: number;
  solutionViewed?: boolean;
}) {
  const userId = await requireUserId();
  const result = await startCheckpointSession({
    userId,
    itemKey: params.itemKey,
    itemVersion: params.itemVersion,
    purpose: params.purpose,
    hintsUsed: params.hintsUsed,
    solutionViewed: params.solutionViewed,
  });

  return {
    ok: true,
    sessionId: result.session.sessionId,
    item: serializeForClient(result.item),
  };
}

/**
 * Submits a learner response for a checkpoint item and computes rubric feedback.
 */
export async function submitCheckpointAttemptAction(params: {
  itemKey?: string;
  itemVersion?: string;
  selectedOptionKey: string;
  responseContent?: string;
  durationSeconds?: number;
  sessionId?: string;
  hintsUsed?: number;
  solutionViewed?: boolean;
  idempotencyKey?: string;
}) {
  const userId = await requireUserId();
  const result = await submitCheckpointAttempt({
    userId,
    itemKey: params.itemKey,
    itemVersion: params.itemVersion,
    selectedOptionKey: params.selectedOptionKey,
    responseContent: params.responseContent,
    durationSeconds: params.durationSeconds,
    sessionId: params.sessionId,
    hintsUsed: params.hintsUsed,
    solutionViewed: params.solutionViewed,
    idempotencyKey: params.idempotencyKey,
  });

  revalidatePath("/dashboard");
  revalidatePath("/progress");

  return {
    ok: true,
    isCorrect: result.isCorrect,
    score: result.score,
    feedback: result.feedback,
    explanation: result.explanation,
    reviewStatus: result.reviewStatus,
    isProvisional: result.isProvisional,
    demonstratedIndependence: result.demonstratedIndependence,
  };
}


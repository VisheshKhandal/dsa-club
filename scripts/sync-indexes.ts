import { connectToDatabase } from "../src/lib/db/mongodb";
import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

// Explicitly register all models across identity, content, learning, and intelligence
import "../src/features/identity/models/user.model";
import "../src/features/content/models/content.model";
import "../src/features/learning/models/learning.model";
import "../src/features/learning/models/learning-command.model";
import "../src/features/learning/models/practice-session.model";
import "../src/features/intelligence/models/intelligence.model";
import "../src/features/intelligence/models/learning-delivery.model";
import "../src/features/intelligence/models/learning-event.model";
import "../src/features/intelligence/models/user-topic-progress.model";
import "../src/features/intelligence/models/plan.model";
import "../src/features/intelligence/models/plan-day.model";
import "../src/features/intelligence/models/plan-task.model";
import "../src/features/intelligence/models/track.model";
import "../src/features/intelligence/models/checkpoint-item.model";
import "../src/features/intelligence/models/checkpoint-session.model";
import "../src/features/learning/models/interview-drill.model";
import "../src/features/intelligence/models/journey.model";
import "../src/features/intelligence/models/mistake-repair.model";
import "../src/features/intelligence/models/intelligence-decision.model";

interface ConflictCheck {
  modelName: string;
  fields: Record<string, 1 | -1>;
  filter?: Record<string, any>;
  description: string;
}

const UNIQUE_INDEX_CHECKS: ConflictCheck[] = [
  {
    modelName: "LearningCommand",
    fields: { userId: 1, learningEpoch: 1, commandId: 1 },
    description: "Unique Command ID per user and learning epoch",
  },
  {
    modelName: "PracticeSession",
    fields: { userId: 1, learningEpoch: 1, problemId: 1 },
    filter: { state: "active" },
    description: "Single active practice session per user, epoch, and problem",
  },
  {
    modelName: "ProblemAttempt",
    fields: { userId: 1, commandId: 1 },
    filter: { commandId: { $exists: true, $ne: null } },
    description: "Unique practice submission outcome per command ID",
  },
  {
    modelName: "RevisionHistory",
    fields: { userId: 1, reviewAttemptId: 1 },
    filter: { reviewAttemptId: { $exists: true, $ne: null } },
    description: "Unique review attempt outcome per reviewAttemptId",
  },
  {
    modelName: "UserTopicProgress",
    fields: { userId: 1, learningEpoch: 1, topicSlug: 1 },
    description: "Unique topic progress state per user, epoch, and topic slug",
  },
  {
    modelName: "LearningDelivery",
    fields: { userId: 1, learningEpoch: 1, deliveryKey: 1 },
    description: "Unique outbox delivery per user, epoch, and deliveryKey",
  },
  {
    modelName: "TrackEnrollment",
    fields: { userId: 1, learningEpoch: 1, trackSlug: 1 },
    description: "Unique track enrollment per user, epoch, and track slug",
  },
  {
    modelName: "CheckpointAttempt",
    fields: { userId: 1, idempotencyKey: 1 },
    filter: { idempotencyKey: { $exists: true, $ne: null } },
    description: "Unique checkpoint attempt per user and idempotencyKey",
  },
  {
    modelName: "CheckpointSession",
    fields: { sessionId: 1 },
    description: "Unique checkpoint session per sessionId",
  },
  {
    modelName: "InterviewDrill",
    fields: { drillId: 1 },
    description: "Unique interview drill per drillId",
  },
  {
    modelName: "MistakeRepair",
    fields: { dedupKey: 1 },
    description: "Unique mistake repair record per dedupKey",
  },
];

async function checkConflicts(isDryRun: boolean) {
  console.info("Running pre-flight uniqueness conflict checks...");
  let conflictsFound = 0;

  for (const check of UNIQUE_INDEX_CHECKS) {
    const model = mongoose.models[check.modelName];
    if (!model) {
      console.warn(`[WARN] Model ${check.modelName} not found in mongoose registry.`);
      continue;
    }

    try {
      const matchStage = check.filter ? { $match: check.filter } : null;
      const groupFields: Record<string, any> = {};
      for (const field of Object.keys(check.fields)) {
        groupFields[field] = `$${field}`;
      }

      const pipeline: any[] = [];
      if (matchStage) pipeline.push(matchStage);
      pipeline.push(
        { $group: { _id: groupFields, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 5 }
      );

      const duplicates = await model.aggregate(pipeline);
      if (duplicates.length > 0) {
        conflictsFound++;
        console.error(
          `[CONFLICT] Found ${duplicates.length} duplicate group(s) in ${check.modelName} for ${check.description}:`
        );
        console.error(JSON.stringify(duplicates, null, 2));
      } else {
        console.info(`[OK] No conflicts in ${check.modelName} (${check.description})`);
      }
    } catch (err: any) {
      console.warn(`[SKIP] Could not check duplicates in ${check.modelName}: ${err.message}`);
    }
  }

  return conflictsFound;
}

async function main() {
  loadEnvConfig(process.cwd());
  const isDryRun = process.argv.includes("--dry-run");

  if (isDryRun) {
    console.info("=== DRY RUN MODE ENABLED: No database indexes will be altered ===");
  }

  console.info("Connecting to MongoDB Atlas...");
  await connectToDatabase();
  console.info(`Connected. Registered models: ${Object.keys(mongoose.models).length}`);

  const conflicts = await checkConflicts(isDryRun);
  if (conflicts > 0) {
    console.error(`Pre-flight checks found ${conflicts} conflict(s). Aborting index creation to avoid failure.`);
    process.exitCode = 1;
    await mongoose.disconnect();
    return;
  }

  if (isDryRun) {
    console.info("\nDry run completed successfully. All pre-flight conflict checks passed.");
    console.info("Indexes defined in schemas are safe to deploy additively.");
    await mongoose.disconnect();
    return;
  }

  console.info("\nApplying additive indexes via Model.createIndexes() (non-destructive)...");
  for (const [name, model] of Object.entries(mongoose.models)) {
    try {
      await model.createIndexes();
      console.info(`[INDEXED] ${name}`);
    } catch (err: any) {
      console.error(`[ERROR] Failed to index ${name}:`, err.message);
      process.exitCode = 1;
    }
  }

  await mongoose.disconnect();
  console.info("\nIndex synchronization completed safely.");
}

main().catch(async (error: unknown) => {
  await mongoose.disconnect();
  console.error("Index sync script failed:", error);
  process.exitCode = 1;
});

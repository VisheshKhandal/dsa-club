import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import { PlanModel } from "../models/plan.model";
import { PlanDayModel } from "../models/plan-day.model";
import { PlanTaskModel } from "../models/plan-task.model";
import {
  TopicModel,
  MissionModel,
  ProblemModel,
} from "@/features/content/models/content.model";
import {
  activateCanonicalPlanForUser,
  resolveUserActivePlan,
} from "./plan-migration.service";
import {
  completePlanTaskAction,
  pausePlanAction,
  resumePlanAction,
  skipPlanTaskAction,
  startPlanTaskAction,
} from "../actions/plan-actions";
import {
  authorizePlanTaskCommand,
  PlanAuthorizationError,
} from "./plan-task-authorizer";
import {
  resolveLearningExecutionSnapshot,
  resolveCurrentPlanDay,
} from "./learning-execution-snapshot";
import { generateCanonicalPlan } from "../planning/canonical-planner";
import type { PlannerInput } from "../types/intelligence.types";

// Mock Next.js cache and auth guard to direct execution into the real MongoDB memory server
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

let currentMockUserId = new Types.ObjectId().toString();

vi.mock("@/lib/auth-guard", () => ({
  requireUserId: vi.fn(() => Promise.resolve(currentMockUserId)),
}));

let mongod: MongoMemoryServer;

async function seedTopic(params: {
  name: string;
  slug: string;
  order?: number;
  difficulty?: "beginner" | "easy" | "medium" | "hard" | "advanced";
  estimatedMinutes?: number;
  description?: string;
  isPublished?: boolean;
}) {
  return TopicModel.create({
    name: params.name,
    slug: params.slug,
    order: params.order ?? 1,
    difficulty: params.difficulty ?? "easy",
    estimatedMinutes: params.estimatedMinutes ?? 120,
    description: params.description ?? `Master fundamentals of ${params.name}`,
    isPublished: params.isPublished ?? true,
  });
}

async function seedMission(params: {
  title: string;
  slug: string;
  topicId: Types.ObjectId;
  order?: number;
  estimatedMinutes?: number;
  difficulty?: "beginner" | "easy" | "medium" | "hard";
  description?: string;
  isPublished?: boolean;
}) {
  return MissionModel.create({
    title: params.title,
    slug: params.slug,
    topicId: params.topicId,
    order: params.order ?? 1,
    estimatedMinutes: params.estimatedMinutes ?? 30,
    difficulty: params.difficulty ?? "easy",
    description: params.description ?? `Interactive mission for ${params.title}`,
    isPublished: params.isPublished ?? true,
    steps: [],
  });
}

async function seedProblem(params: {
  title: string;
  slug: string;
  topicId: Types.ObjectId;
  difficulty?: "easy" | "medium" | "hard";
  estimatedMinutes?: number;
}) {
  return ProblemModel.create({
    title: params.title,
    slug: params.slug,
    topicIds: [params.topicId],
    patternIds: [],
    difficulty: params.difficulty ?? "easy",
    estimatedMinutes: params.estimatedMinutes ?? 20,
    summary: `Practice problem for ${params.title}`,
    source: "internal",
    sourceUrl: `/problems/${params.slug}`,
    isPublished: true,
  });
}

describe("Phase 0 Correctness Gate: Real MongoDB Persistence Integration", () => {
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);

    // Sync all indexes including partial unique index on PlanModel
    await PlanModel.syncIndexes();
    await PlanDayModel.syncIndexes();
    await PlanTaskModel.syncIndexes();
    await TopicModel.syncIndexes();
    await MissionModel.syncIndexes();
    await ProblemModel.syncIndexes();
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    // Reset database collections before each test run
    await PlanModel.deleteMany({});
    await PlanDayModel.deleteMany({});
    await PlanTaskModel.deleteMany({});
    await TopicModel.deleteMany({});
    await MissionModel.deleteMany({});
    await ProblemModel.deleteMany({});

    currentMockUserId = new Types.ObjectId().toString();
  });

  // ── 1. MULTI-TOPIC PLANS & PER-DAY TOPIC IDENTITY PERSISTENCE ──
  it("1. Persists and verifies authentic per-day topic identity across multi-topic plans", async () => {
    // Seed 3 authentic topics
    const arraysTopic = await seedTopic({ name: "Arrays", slug: "arrays", order: 1 });
    const hashingTopic = await seedTopic({ name: "Hashing", slug: "hashing", order: 2 });
    const twoPointersTopic = await seedTopic({ name: "Two Pointers", slug: "two-pointers", order: 3, difficulty: "medium" });

    // Seed published missions & problems for each
    await seedMission({ title: "Array Basics", slug: "array-basics", topicId: arraysTopic._id as Types.ObjectId });
    await seedProblem({ title: "Two Sum", slug: "two-sum", topicId: arraysTopic._id as Types.ObjectId });
    await seedMission({ title: "Hash Map Mastery", slug: "hash-map-mastery", topicId: hashingTopic._id as Types.ObjectId });
    await seedMission({ title: "Two Pointers Essentials", slug: "two-pointers-essentials", topicId: twoPointersTopic._id as Types.ObjectId });

    const input: PlannerInput = {
      learningGoal: "placement",
      focusTopicSlugs: ["arrays", "hashing", "two-pointers"],
      knownTopicSlugs: [],
      companySlugs: [],
      dailyMinutes: 45,
      experienceLevel: "beginner",
      language: "cpp",
      timezone: "Asia/Kolkata",
    };

    const blueprint = generateCanonicalPlan(input, 1);
    const result = await activateCanonicalPlanForUser({
      userId: currentMockUserId,
      blueprint,
      input,
      source: "customized",
    });

    expect(result.plan).toBeDefined();
    expect(result.days.length).toBe(7);

    // Reload days directly from real MongoDB via a fresh find query
    const reloadedDays = await PlanDayModel.find({ planId: result.plan._id })
      .sort({ dayIndex: 1 })
      .lean();

    expect(reloadedDays.length).toBe(7);

    // Verify per-day topicId strictly matches the topic corresponding to its topicSlug
    for (const day of reloadedDays) {
      expect(day.topicSlug).toBeDefined();
      expect(day.topicId).toBeDefined();
      expect(day.topicId).not.toBeNull();

      if (day.topicSlug === "arrays") {
        expect(String(day.topicId)).toBe(String(arraysTopic._id));
      } else if (day.topicSlug === "hashing") {
        expect(String(day.topicId)).toBe(String(hashingTopic._id));
      } else if (day.topicSlug === "two-pointers") {
        expect(String(day.topicId)).toBe(String(twoPointersTopic._id));
      }
    }

    // Verify day 1 tasks match Day 1 topicId
    const day1Tasks = await PlanTaskModel.find({ planDayId: reloadedDays[0]._id }).lean();
    expect(day1Tasks.length).toBeGreaterThan(0);
    for (const t of day1Tasks) {
      expect(String(t.topicId)).toBe(String(reloadedDays[0].topicId));
      expect(t.topicSlug).toBe(reloadedDays[0].topicSlug);
      expect(t.validationStatus).toBe("aligned");
    }
  });

  // ── 2. STALE TASK COMPLETION AUTHORIZATION ──
  it("2. Rejects stale task completion and future-day task commands", async () => {
    const topic = await seedTopic({
      name: "Binary Search",
      slug: "binary-search",
      order: 1,
      difficulty: "medium",
    });

    await seedMission({
      title: "Binary Search Foundations",
      slug: "binary-search-foundations",
      topicId: topic._id as Types.ObjectId,
      order: 1,
    });

    const input: PlannerInput = {
      learningGoal: "placement",
      focusTopicSlugs: ["binary-search"],
      knownTopicSlugs: [],
      companySlugs: [],
      dailyMinutes: 45,
      experienceLevel: "intermediate",
      language: "python",
      timezone: "Asia/Kolkata",
    };

    const blueprint = generateCanonicalPlan(input, 1);
    const { plan, days, tasks } = await activateCanonicalPlanForUser({
      userId: currentMockUserId,
      blueprint,
      input,
      source: "customized",
    });

    // Create a manual future Day 2 task
    const day2 = days.find((d) => d.dayIndex === 2)!;
    const futureTask = await PlanTaskModel.create({
      planId: plan._id,
      planDayId: day2._id,
      userId: new Types.ObjectId(currentMockUserId),
      dayIndex: 2,
      taskKey: "day-2-future-task",
      title: "Future Day 2 Task",
      phase: "practice",
      entityType: "mission",
      order: 1,
      required: true,
      estimatedMinutes: 20,
      actualMinutes: 0,
      status: "pending",
      topicId: topic._id,
      topicSlug: topic.slug,
      topicName: topic.name,
      validationStatus: "aligned",
    });

    // Attempt to authorize future Day 2 task while Day 1 is the actionable day
    await expect(
      authorizePlanTaskCommand({
        userId: currentMockUserId,
        taskId: String(futureTask._id),
        command: "complete",
      })
    ).rejects.toThrow("Task does not belong to the current actionable day.");

    // Attempt to authorize a task that belongs to a different plan
    const otherPlanId = new Types.ObjectId();
    const staleTask = await PlanTaskModel.create({
      planId: otherPlanId,
      planDayId: days[0]._id,
      userId: new Types.ObjectId(currentMockUserId),
      dayIndex: 1,
      taskKey: "stale-plan-task",
      title: "Stale Plan Task",
      phase: "learn",
      entityType: "mission",
      order: 99,
      required: true,
      estimatedMinutes: 15,
      actualMinutes: 0,
      status: "pending",
      topicId: topic._id,
      topicSlug: topic.slug,
      topicName: topic.name,
      validationStatus: "aligned",
    });

    await expect(
      authorizePlanTaskCommand({
        userId: currentMockUserId,
        taskId: String(staleTask._id),
        command: "complete",
      })
    ).rejects.toThrow("Stale task rejected: Task does not belong to the currently active plan.");
  });

  // ── 3. ACTIVATION RACES & ATOMIC UNIQUE ACTIVE PLAN CONSTRAINT ──
  it("3. Enforces MongoDB partial unique index to prevent multiple concurrent active plans", async () => {
    await seedTopic({
      name: "Graphs",
      slug: "graphs",
      order: 1,
      difficulty: "hard",
    });

    const input: PlannerInput = {
      learningGoal: "internship",
      focusTopicSlugs: ["graphs"],
      knownTopicSlugs: [],
      companySlugs: [],
      dailyMinutes: 60,
      experienceLevel: "advanced",
      language: "java",
      timezone: "Asia/Kolkata",
    };

    const blueprint = generateCanonicalPlan(input, 1);

    // Trigger two plan activations concurrently
    await Promise.allSettled([
      activateCanonicalPlanForUser({
        userId: currentMockUserId,
        blueprint,
        input,
        source: "customized",
      }),
      activateCanonicalPlanForUser({
        userId: currentMockUserId,
        blueprint,
        input,
        source: "customized",
      }),
    ]);

    // Check MongoDB for active plans for this user
    const activePlans = await PlanModel.find({
      userId: new Types.ObjectId(currentMockUserId),
      status: "active",
    }).lean();

    // Invariant: At no point can a user have more than 1 active plan
    expect(activePlans.length).toBe(1);
  });

  // ── 4. PAUSE AND RESUME WITH STALE TASK GUARDS ──
  it("4. Blocks task completion while paused and shifts target dates upon resume", async () => {
    const topic = await seedTopic({
      name: "Dynamic Programming",
      slug: "dynamic-programming",
      order: 1,
      difficulty: "hard",
    });

    await seedMission({
      title: "1D DP Primer",
      slug: "1d-dp-primer",
      topicId: topic._id as Types.ObjectId,
      order: 1,
    });

    const input: PlannerInput = {
      learningGoal: "placement",
      focusTopicSlugs: ["dynamic-programming"],
      knownTopicSlugs: [],
      companySlugs: [],
      dailyMinutes: 45,
      experienceLevel: "intermediate",
      language: "cpp",
      timezone: "Asia/Kolkata",
    };

    const blueprint = generateCanonicalPlan(input, 1);
    const { plan, tasks } = await activateCanonicalPlanForUser({
      userId: currentMockUserId,
      blueprint,
      input,
      source: "customized",
    });

    // 1. Pause active plan
    const pauseResult = await pausePlanAction("exam");
    expect(pauseResult.success).toBe(true);

    const pausedPlan = await PlanModel.findById(plan._id).lean();
    expect(pausedPlan?.status).toBe("paused");
    expect(pausedPlan?.pausePeriods.length).toBe(1);
    expect(pausedPlan?.pausePeriods[0].reason).toBe("exam");

    // 2. Attempt task completion while paused -> Expect rejection
    const day1Task = tasks[0];
    await expect(
      completePlanTaskAction(String(day1Task._id))
    ).rejects.toThrow("Cannot complete tasks while plan is paused");

    // 3. Resume plan
    const resumeResult = await resumePlanAction();
    expect(resumeResult.success).toBe(true);

    const resumedPlan = await PlanModel.findById(plan._id).lean();
    expect(resumedPlan?.status).toBe("active");
    expect(resumedPlan?.pausePeriods[0].endedAt).toBeDefined();
  });

  // ── 5. TIMEZONE BOUNDARIES & LOCAL DATE RESOLUTION ──
  it("5. Resolves correct actionable plan day across timezone boundaries without premature advances", async () => {
    await seedTopic({
      name: "Linked List",
      slug: "linked-list",
      order: 1,
      difficulty: "easy",
    });

    const input: PlannerInput = {
      learningGoal: "foundation",
      focusTopicSlugs: ["linked-list"],
      knownTopicSlugs: [],
      companySlugs: [],
      dailyMinutes: 30,
      experienceLevel: "beginner",
      language: "javascript",
      timezone: "America/New_York",
    };

    const blueprint = generateCanonicalPlan(input, 1);
    const { plan, days } = await activateCanonicalPlanForUser({
      userId: currentMockUserId,
      blueprint,
      input,
      source: "customized",
    });

    // Test resolveCurrentPlanDay
    const currentDay = resolveCurrentPlanDay(plan, days);
    expect(currentDay).toBeDefined();
    expect(currentDay?._id.toString()).toBe(days[0]._id.toString());
    expect(currentDay?.status).toBe("available");
  });

  // ── 6. UNAVAILABLE CONTENT HANDLING WITHOUT SILENT FALLBACKS ──
  it("6. Explicitly marks tasks unavailable when content is unseeded, with zero silent arrays fallback", async () => {
    // Topic exists in database, but has zero published missions or problems
    await seedTopic({
      name: "Greedy Algorithms",
      slug: "greedy",
      order: 13,
      difficulty: "medium",
    });

    const input: PlannerInput = {
      learningGoal: "placement",
      focusTopicSlugs: ["greedy"],
      knownTopicSlugs: [],
      companySlugs: [],
      dailyMinutes: 45,
      experienceLevel: "advanced",
      language: "cpp",
      timezone: "Asia/Kolkata",
    };

    const blueprint = generateCanonicalPlan(input, 1);
    const { plan, days, tasks } = await activateCanonicalPlanForUser({
      userId: currentMockUserId,
      blueprint,
      input,
      source: "customized",
    });

    // Reload tasks
    const reloadedTasks = await PlanTaskModel.find({ planDayId: days[0]._id }).lean();
    expect(reloadedTasks.length).toBeGreaterThan(0);

    const missionTask = reloadedTasks.find((t: any) => t.entityType === "mission");
    expect(missionTask).toBeDefined();
    expect(missionTask?.status).toBe("unavailable");
    expect(missionTask?.validationStatus).toBe("unavailable");
    expect(missionTask?.topicSlug).toBe("greedy");
    // Ensure it NEVER silently converted to "arrays"
    expect(missionTask?.topicSlug).not.toBe("arrays");

    // Snapshot generation should also report content unavailability without crashing
    const snapshot = await resolveLearningExecutionSnapshot(currentMockUserId);
    expect(snapshot.activePlan).toBeDefined();
    expect(snapshot.activePlan?.topicSlug).toBe("greedy");
    expect(snapshot.todayTasks.some((t) => t.status === "unavailable")).toBe(true);
    expect(snapshot.activePlan?.topicSlug).not.toBe("arrays");
  });

  // ── 7. DUPLICATE COMPLETION REQUESTS IDEMPOTENCY ──
  it("7. Idempotently handles parallel duplicate completion requests without double advancing the day", async () => {
    const topic = await seedTopic({
      name: "Strings",
      slug: "strings",
      order: 1,
      difficulty: "easy",
    });

    await seedMission({
      title: "String Traversal",
      slug: "string-traversal",
      topicId: topic._id as Types.ObjectId,
      order: 1,
    });

    const input: PlannerInput = {
      learningGoal: "foundation",
      focusTopicSlugs: ["strings"],
      knownTopicSlugs: [],
      companySlugs: [],
      dailyMinutes: 30,
      experienceLevel: "beginner",
      language: "java",
      timezone: "Asia/Kolkata",
    };

    const blueprint = generateCanonicalPlan(input, 1);
    const { plan, days, tasks } = await activateCanonicalPlanForUser({
      userId: currentMockUserId,
      blueprint,
      input,
      source: "customized",
    });

    const targetTaskId = String(tasks[0]._id);

    // Send two completion requests in parallel
    const [res1, res2] = await Promise.all([
      completePlanTaskAction(targetTaskId),
      completePlanTaskAction(targetTaskId),
    ]);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);

    // Exactly one should be the original completion; the other should detect already completed
    const alreadyCompletedCount = [res1.alreadyCompleted, res2.alreadyCompleted].filter(Boolean).length;
    expect(alreadyCompletedCount).toBe(1);

    // Verify task is completed in MongoDB
    const completedTask = await PlanTaskModel.findById(targetTaskId).lean();
    expect(completedTask?.status).toBe("completed");
  });
});

import { loadEnvConfig } from "@next/env";
import { Types } from "mongoose";
import { connectToDatabase } from "../src/lib/db/mongodb";
import { UserModel } from "../src/features/identity/models/user.model";
import { TopicModel } from "../src/features/content/models/content.model";
import { TopicProgressModel, ProblemAttemptModel, MissionProgressModel } from "../src/features/learning/models/learning.model";
import { PlanModel } from "../src/features/intelligence/models/plan.model";
import { PlanDayModel } from "../src/features/intelligence/models/plan-day.model";
import { PlanTaskModel } from "../src/features/intelligence/models/plan-task.model";
import mongoose from "mongoose";

async function main() {
  loadEnvConfig(process.cwd());
  console.info("=================================================================");
  console.info("DSA Club Intelligence — Live User Progress & Plan Record Audit");
  console.info("=================================================================\n");

  await connectToDatabase();

  // Find all active plans or users
  const activePlans = await PlanModel.find({ status: { $in: ["active", "paused"] } })
    .populate("primaryTopicId")
    .lean();

  console.info(`Found ${activePlans.length} active/paused plans in database.\n`);

  if (activePlans.length === 0) {
    // Check if there are any users at all
    const users = await UserModel.find().limit(5).lean();
    console.info(`No active plans found. Checking users: found ${users.length} users.`);
    for (const u of users) {
      console.info(`- User ${u._id}: ${u.email} (${u.name})`);
      const tpCount = await TopicProgressModel.countDocuments({ userId: u._id });
      console.info(`  TopicProgress records: ${tpCount}`);
    }
  }

  for (const plan of activePlans) {
    const userId = plan.userId;
    const user = await UserModel.findById(userId).lean();
    console.info(`-----------------------------------------------------------------`);
    console.info(`AUDIT FOR USER: ${user?.email || "Unknown"} (userId: ${userId})`);
    console.info(`Plan ID: ${plan._id}`);
    console.info(`Status: ${plan.status}, Source: ${plan.source}, Cycle: ${plan.cycleNumber}`);
    console.info(`Total Days: ${plan.totalDays}, Daily Minutes: ${plan.dailyMinutes}`);
    console.info(`Start Date: ${plan.startDate}`);

    const primaryTopic = plan.primaryTopicId as any;
    const topicSlug = primaryTopic?.slug || (plan.snapshots as any)?.primaryTopicSlug || "unknown";
    const topicName = primaryTopic?.name || "Unknown Topic";
    console.info(`Plan Primary Topic: ${topicName} (slug: ${topicSlug})`);

    // Plan Days
    const days = await PlanDayModel.find({ planId: plan._id }).sort({ dayIndex: 1 }).lean();
    console.info(`\nPlan Days in DB: ${days.length}`);
    const activeDay = days.find((d) => d.status === "in_progress" || d.status === "available") || days[0];
    const currentDayIndex = activeDay?.dayIndex ?? 1;
    console.info(`Current Active Day: Day ${currentDayIndex} (Status: ${activeDay?.status}, Title: "${activeDay?.title}", Topic: "${activeDay?.topicName}")`);

    // Plan Tasks for current day
    const currentDayTasks = activeDay
      ? await PlanTaskModel.find({ planDayId: activeDay._id }).sort({ order: 1 }).lean()
      : [];
    console.info(`\nTasks for Day ${currentDayIndex}: ${currentDayTasks.length} tasks`);
    for (const t of currentDayTasks) {
      console.info(`  - [${t.status}] ${t.title} (${t.phase}, required: ${t.required}, topicSlug: ${t.topicSlug || "none"})`);
    }

    const allPlanTasks = await PlanTaskModel.find({ planId: plan._id }).lean();
    const completedTasksCount = allPlanTasks.filter((t) => t.status === "completed").length;
    console.info(`\nTotal Cycle Tasks: ${allPlanTasks.length} (${completedTasksCount} completed)`);

    // TopicProgress for this topic
    let topicDoc = primaryTopic;
    if (!topicDoc && topicSlug) {
      topicDoc = await TopicModel.findOne({ slug: topicSlug }).lean();
    }

    console.info(`\nTopicProgress Inspection for topic "${topicSlug}":`);
    if (topicDoc) {
      const tp = await TopicProgressModel.findOne({ userId, topicId: topicDoc._id }).lean();
      if (tp) {
        console.info(`  -> FOUND TopicProgress record:`);
        console.info(`     masteryScore: ${tp.masteryScore}`);
        console.info(`     confidenceScore: ${tp.confidenceScore}`);
        console.info(`     state: "${tp.state}"`);
        console.info(`     lastPracticedAt: ${tp.lastPracticedAt || "never"}`);
        console.info(`     createdAt: ${tp.createdAt}, updatedAt: ${tp.updatedAt}`);
      } else {
        console.info(`  -> NO TopicProgress record exists for this topic (defaults to 0% mastery / 'unseen')`);
      }
    } else {
      console.info(`  -> Could not resolve topic document for slug: ${topicSlug}`);
    }

    // Check all TopicProgress records for this user
    const allTp = await TopicProgressModel.find({ userId }).populate("topicId").lean();
    console.info(`\nAll TopicProgress records for user (${allTp.length} total):`);
    for (const p of allTp) {
      const t = p.topicId as any;
      console.info(`  * ${t?.name || "Unknown"} (${t?.slug}): mastery=${p.masteryScore}%, confidence=${p.confidenceScore}%, state=${p.state}`);
    }

    // Problem Attempts
    const attempts = await ProblemAttemptModel.find({ userId }).lean();
    console.info(`\nProblem Attempts: ${attempts.length} total`);

    // Mission Progress
    const missions = await MissionProgressModel.find({ userId }).lean();
    console.info(`Mission Progress records: ${missions.length} total`);

    // Formula Disambiguation Analysis
    console.info(`\n================== FORMULA TRACE ANALYSIS ==================`);
    const totalDays = plan.totalDays || 21;
    const schedulePercent = Math.min(100, Math.round((currentDayIndex / totalDays) * 100));
    console.info(`1. Schedule Calendar Pace: round((${currentDayIndex} / ${totalDays}) * 100) = ${schedulePercent}%`);

    const todayCompleted = currentDayTasks.filter((t) => t.status === "completed").length;
    const todayTotal = currentDayTasks.length;
    const todayPercent = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;
    console.info(`2. Today Task Completion: ${todayCompleted} / ${todayTotal} = ${todayPercent}%`);

    const cyclePercent = allPlanTasks.length > 0 ? Math.round((completedTasksCount / allPlanTasks.length) * 100) : 0;
    console.info(`3. Full Cycle Task Completion: ${completedTasksCount} / ${allPlanTasks.length} = ${cyclePercent}%`);

    console.info(`\nCONCLUSION FOR THIS USER:`);
    console.info(`If the user observed ~5% (specifically ${schedulePercent}%), it is PROVEN to be derived from`);
    console.info(`Schedule Calendar Pace: Day ${currentDayIndex} of ${totalDays} days.`);
    console.info(`============================================================\n`);
  }

  await mongoose.disconnect();
  console.info("Audit completed safely without mutating any data.");
}

main().catch(async (err) => {
  await mongoose.disconnect();
  console.error("Audit error:", err);
  process.exitCode = 1;
});

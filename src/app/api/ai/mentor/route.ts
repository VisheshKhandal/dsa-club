import { NextRequest } from "next/server";
import OpenAI from "openai";
import mongoose from "mongoose";
import crypto from "crypto";
import { requireUserId } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AIConversationModel, AIMessageModel, ActivityEventModel } from "@/features/intelligence/models/intelligence.model";
import { MissionModel, PatternModel, ProblemModel, TopicModel } from "@/features/content/models/content.model";

const MODEL = process.env.AI_MENTOR_MODEL || "openrouter/free";
const DAILY_REQUEST_LIMIT = Number(process.env.AI_MENTOR_DAILY_REQUEST_LIMIT || 80);
const DAILY_TOKEN_LIMIT = Number(process.env.AI_MENTOR_DAILY_TOKEN_LIMIT || 120_000);
const WINDOW_REQUEST_LIMIT = Number(process.env.AI_MENTOR_RATE_LIMIT_REQUESTS || 12);
const WINDOW_MS = Number(process.env.AI_MENTOR_RATE_LIMIT_WINDOW_SECONDS || 60) * 1000;
const MAX_HISTORY_MESSAGES = 10;
const MAX_ACTION_LENGTH = 2_000;

type MentorContext = {
  topicId?: string;
  problemId?: string;
  missionId?: string;
  patternId?: string;
  phase?: number;
  userPrediction?: string;
  userReasoning?: string;
};

type SafeContext = {
  topicId: string | null;
  patternId: string | null;
  problemId: string | null;
  missionId: string | null;
  topic?: string;
  pattern?: string;
  problem?: string;
  mission?: string;
  phase?: number;
  userPrediction?: string;
  userReasoning?: string;
  difficulty?: string;
  description?: string;
  learningGoal?: string;
  sourceUrl?: string;
};

function jsonError(message: string, status: number, headers: HeadersInit = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function getProviderConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length < 20) {
    return { ok: false as const, message: "AI Mentor is not configured yet. Please contact the site administrator." };
  }
  return {
    ok: true as const,
    client: new OpenAI({
      baseURL: process.env.AI_MENTOR_BASE_URL || "https://openrouter.ai/api/v1",
      apiKey,
      timeout: Number(process.env.AI_MENTOR_TIMEOUT_MS || 30_000),
    }),
  };
}

function isValidObjectId(id: unknown): id is string {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
}

function toObjectId(id: string | null) {
  return id ? new mongoose.Types.ObjectId(id) : null;
}

function sameId(a: unknown, b: string | null) {
  return Boolean(a && b && String(a) === b);
}

function dayStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function parseContext(raw: unknown): MentorContext {
  if (!raw || typeof raw !== "object") return {};
  const context = raw as Record<string, unknown>;
  return {
    topicId: isValidObjectId(context.topicId) ? context.topicId : undefined,
    problemId: isValidObjectId(context.problemId) ? context.problemId : undefined,
    missionId: isValidObjectId(context.missionId) ? context.missionId : undefined,
    patternId: isValidObjectId(context.patternId) ? context.patternId : undefined,
    phase: typeof context.phase === "number" ? context.phase : undefined,
    userPrediction: cleanText(context.userPrediction, 120) || undefined,
    userReasoning: cleanText(context.userReasoning, 500) || undefined,
  };
}

function sanitizeHistory(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(-MAX_HISTORY_MESSAGES).flatMap((message) => {
    if (!message || typeof message !== "object") return [];
    const role = (message as any).role;
    const content = cleanText((message as any).content, 2_000);
    if ((role !== "user" && role !== "assistant") || !content) return [];
    return [{ role, content }];
  });
}

async function enforceRateLimits(userId: string) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);
  const today = dayStart();
  const [windowCount, dailyUsage] = await Promise.all([
    ActivityEventModel.countDocuments({ userId, type: "ai_mentor_used", occurredAt: { $gte: windowStart } }),
    ActivityEventModel.aggregate([
      { $match: { userId: toObjectId(userId), type: "ai_mentor_used", occurredAt: { $gte: today } } },
      { $group: { _id: null, requests: { $sum: 1 }, input: { $sum: { $ifNull: ["$payload.tokenUsage.input", 0] } }, output: { $sum: { $ifNull: ["$payload.tokenUsage.output", 0] } } } },
    ]),
  ]);

  const usage = dailyUsage[0] ?? { requests: 0, input: 0, output: 0 };
  if (windowCount >= WINDOW_REQUEST_LIMIT) {
    return { allowed: false as const, status: 429, message: "AI Mentor is receiving requests too quickly. Please wait a moment before asking again.", retryAfter: Math.ceil(WINDOW_MS / 1000) };
  }
  if (usage.requests >= DAILY_REQUEST_LIMIT || usage.input + usage.output >= DAILY_TOKEN_LIMIT) {
    return { allowed: false as const, status: 429, message: "You have reached today's AI Mentor usage limit. Please continue tomorrow.", retryAfter: 60 * 60 };
  }
  return { allowed: true as const };
}

async function resolveSafeContext(context: MentorContext): Promise<SafeContext> {
  const [problem, mission, explicitTopic, explicitPattern] = await Promise.all([
    context.problemId ? ProblemModel.findOne({ _id: context.problemId, isPublished: true }).lean() : null,
    context.missionId ? MissionModel.findOne({ _id: context.missionId, isPublished: true }).lean() : null,
    context.topicId ? TopicModel.findOne({ _id: context.topicId, isPublished: true }).lean() : null,
    context.patternId ? PatternModel.findOne({ _id: context.patternId, isPublished: true }).lean() : null,
  ]);

  if (context.problemId && !problem) throw new Error("The requested problem context is unavailable.");
  if (context.missionId && !mission) throw new Error("The requested mission context is unavailable.");
  if (context.topicId && !explicitTopic) throw new Error("The requested topic context is unavailable.");
  if (context.patternId && !explicitPattern) throw new Error("The requested pattern context is unavailable.");
  if (problem && mission && !problem.topicIds?.some((id: unknown) => sameId(id, String(mission.topicId)))) {
    throw new Error("The problem does not belong to the supplied mission topic.");
  }
  if (problem && explicitTopic && !problem.topicIds?.some((id: unknown) => sameId(id, String(explicitTopic._id)))) {
    throw new Error("The supplied topic does not belong to the supplied problem.");
  }

  const patternId = context.patternId ?? (problem?.patternIds?.[0] ? String(problem.patternIds[0]) : mission?.patternId ? String(mission.patternId) : null);
  const pattern = patternId && (!explicitPattern || String(explicitPattern._id) !== patternId)
    ? await PatternModel.findOne({ _id: patternId, isPublished: true }).lean()
    : explicitPattern;

  let topicId: string | null = null;
  if (context.topicId) {
    topicId = context.topicId;
  } else if (problem?.topicIds?.length) {
    const matchingTopicId = pattern?.topicId && problem.topicIds.some((id: unknown) => sameId(id, String(pattern.topicId)))
      ? String(pattern.topicId)
      : null;
    topicId = matchingTopicId ?? String(problem.topicIds[0]);
  } else if (mission?.topicId) {
    topicId = String(mission.topicId);
  }

  const topic = topicId && (!explicitTopic || String(explicitTopic._id) !== topicId)
    ? await TopicModel.findOne({ _id: topicId, isPublished: true }).lean()
    : explicitTopic;

  if (problem && pattern && !problem.patternIds?.some((id: unknown) => sameId(id, String(pattern._id)))) {
    throw new Error("The supplied pattern does not belong to the supplied problem.");
  }
  if (mission && pattern && mission.patternId && !sameId(mission.patternId, String(pattern._id))) {
    throw new Error("The supplied pattern does not belong to the supplied mission.");
  }
  // Only enforce pattern-to-topic ownership when in an isolated topic+pattern scope without a problem or mission
  if (!problem && !mission && pattern && topic && !sameId(pattern.topicId, String(topic._id))) {
    throw new Error("The supplied pattern does not belong to the supplied topic.");
  }

  return {
    topicId: topic ? String(topic._id) : null,
    patternId: pattern ? String(pattern._id) : null,
    problemId: problem ? String(problem._id) : null,
    missionId: mission ? String(mission._id) : null,
    topic: topic?.name,
    pattern: pattern?.name,
    problem: problem?.title,
    mission: mission?.title,
    phase: context.phase,
    userPrediction: context.userPrediction,
    userReasoning: context.userReasoning,
    difficulty: problem?.difficulty ?? mission?.difficulty ?? pattern?.difficulty ?? topic?.difficulty,
    description: cleanText(problem?.summary ?? mission?.description ?? pattern?.description ?? topic?.description, 2_500),
    learningGoal: cleanText(problem?.thinkingDirection ?? pattern?.mentalModel ?? mission?.description, 1_500),
    sourceUrl: problem?.sourceUrl,
  };
}

function buildSystemPrompt(context: SafeContext) {
  return `You are DSA Club Intelligence, a progressive DSA guided learning mentor.

CORE GOAL:
GUIDE THE LEARNER TO DISCOVER THE SOLUTION THEMSELVES. DO NOT SOLVE THE PROBLEM FOR THEM.

Teaching rules:
1. Stay strictly focused on DSA learning and the validated context below.
2. If the user asks "Give me the answer", "Tell me how to solve it", "Give me the intuition", or similar requests:
   - DO NOT dump the complete solution, code, or final algorithm.
   - Instead, follow progressive guided inquiry:
     * Ask what invariant, constraint, or relationship the user has observed so far.
     * Suggest ONE small directional step at a time (e.g. "What changes if you compare left and right characters directly?").
     * Ask leading questions that prompt them to think about edge cases or bounds.
     * Offer tiny 3-element examples or dry runs to test their hypothesis.
     * Ask them to predict what happens on the next step.
3. Only reveal stronger hints progressively as the conversation develops. Never skip directly to the end.
4. If multi-line code is necessary (e.g. reviewing their own code), wrap in proper markdown code fences (\`\`\`language ... \`\`\`). Keep inline code in backticks.
5. Challenge incorrect assumptions gently by proposing counter-examples.
6. Keep responses concise, encouraging, and focused on building algorithmic intuition.

Validated DSA Club context:
${context.topic ? `- Topic: ${context.topic}` : ""}
${context.mission ? `- Mission: ${context.mission}` : ""}
${context.problem ? `- Problem: ${context.problem}` : ""}
${context.pattern ? `- Pattern: ${context.pattern}` : ""}
${context.difficulty ? `- Difficulty: ${context.difficulty}` : ""}
${context.phase ? `- Current Learning Phase: Phase ${context.phase}` : ""}
${context.userPrediction ? `- Learner's Selected Pattern: ${context.userPrediction}` : ""}
${context.userReasoning ? `- Learner's Observation: ${context.userReasoning}` : ""}
${context.learningGoal ? `- Learning goal: ${context.learningGoal}` : ""}
${context.description ? `- Description: ${context.description}` : ""}`;
}

function providerErrorMessage(error: any) {
  const status = error?.status ?? error?.response?.status;
  if (status === 401 || status === 403) return "AI Mentor provider authentication failed. Please contact the site administrator.";
  if (status === 429) return "AI Mentor is temporarily rate-limited by the provider. Please try again shortly.";
  if (error?.name === "AbortError" || /timeout/i.test(String(error?.message))) return "AI Mentor took too long to respond. Please try a shorter question.";
  return "AI Mentor is having trouble responding right now. Please try again.";
}

export async function POST(req: NextRequest) {
  try {
    const provider = getProviderConfig();
    if (!provider.ok) return jsonError(provider.message, 503);

    const userId = await requireUserId();
    await connectToDatabase();

    const body = await req.json().catch(() => null);
    const action = cleanText(body?.action, MAX_ACTION_LENGTH);
    if (!action) return jsonError("Please enter a question for the AI Mentor.", 400);

    const rateLimit = await enforceRateLimits(userId);
    if (!rateLimit.allowed) {
      return jsonError(rateLimit.message, rateLimit.status, { "Retry-After": String(rateLimit.retryAfter) });
    }

    const safeContext = await resolveSafeContext(parseContext(body?.context)).catch((error) => {
      throw Object.assign(new Error(error.message), { status: 400 });
    });
    const history = sanitizeHistory(body?.history);

    const db = mongoose.connection.db;
    const cacheCollection: any = db?.collection("ai_cache") ?? null;
    if (cacheCollection) {
      cacheCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 900 }).catch(() => {});
    }

    const cacheKey = crypto.createHash("sha256").update(JSON.stringify({
      userId,
      action: action.toLowerCase(),
      history: history.map((message) => `${message.role}:${message.content}`).join("|"),
      context: {
        topicId: safeContext.topicId,
        patternId: safeContext.patternId,
        problemId: safeContext.problemId,
        missionId: safeContext.missionId,
      },
    })).digest("hex");

    const cached = cacheCollection ? await cacheCollection.findOne({ _id: cacheKey }) : null;
    if (cached?.response) {
      await ActivityEventModel.create({
        userId,
        type: "ai_mentor_cache_hit",
        entityType: safeContext.problemId ? "problem" : safeContext.missionId ? "mission" : safeContext.topicId ? "topic" : null,
        entityId: toObjectId(safeContext.problemId ?? safeContext.missionId ?? safeContext.topicId),
        occurredAt: new Date(),
        idempotencyKey: `ai-cache-${crypto.randomUUID()}`,
        payload: { model: MODEL },
      }).catch(() => {});
      return new Response(cached.response, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-AI-Cache": "HIT" } });
    }

    const conversation = await AIConversationModel.findOneAndUpdate(
      {
        userId,
        "context.problemId": toObjectId(safeContext.problemId),
        "context.missionId": toObjectId(safeContext.missionId),
      },
      {
        $setOnInsert: {
          userId,
          title: `${action.substring(0, 40)} - ${safeContext.problem || safeContext.mission || safeContext.topic || "Mentoring"}`,
          context: {
            topicId: toObjectId(safeContext.topicId),
            patternId: toObjectId(safeContext.patternId),
            problemId: toObjectId(safeContext.problemId),
            missionId: toObjectId(safeContext.missionId),
          },
        },
        $set: { lastMessageAt: new Date() },
      },
      { new: true, upsert: true }
    );

    const messages = [
      { role: "system", content: buildSystemPrompt(safeContext) },
      ...history,
      { role: "user", content: `Latest learner question: ${action}` },
    ];

    const response = await provider.client.chat.completions.create({
      model: MODEL,
      messages: messages as any,
      stream: true,
      max_tokens: Number(process.env.AI_MENTOR_MAX_TOKENS || 900),
      temperature: Number(process.env.AI_MENTOR_TEMPERATURE || 0.55),
      stream_options: { include_usage: true },
    } as any, {
      headers: {
        "HTTP-Referer": process.env.AI_MENTOR_SITE_URL || "https://dsaclub.com",
        "X-Title": "DSA Club Intelligence",
      },
    });

    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        let tokenUsage = { input: 0, output: 0 };
        const encoder = new TextEncoder();

        try {
          for await (const chunk of response as any) {
            const content = chunk.choices?.[0]?.delta?.content || "";
            if (chunk.usage) {
              tokenUsage = {
                input: Number(chunk.usage.prompt_tokens ?? chunk.usage.input_tokens ?? 0),
                output: Number(chunk.usage.completion_tokens ?? chunk.usage.output_tokens ?? 0),
              };
            }
            if (content) {
              fullResponse += content;
              controller.enqueue(encoder.encode(content));
            }
          }

          if (!fullResponse.trim()) {
            controller.enqueue(encoder.encode("I could not produce a useful response this time. Please try rephrasing your question."));
            fullResponse = "I could not produce a useful response this time. Please try rephrasing your question.";
          }

          const metadata = {
            model: MODEL,
            provider: process.env.OPENROUTER_API_KEY ? "openrouter" : "openai-compatible",
            context: {
              topicId: safeContext.topicId,
              patternId: safeContext.patternId,
              problemId: safeContext.problemId,
              missionId: safeContext.missionId,
            },
          };

          await Promise.all([
            AIMessageModel.create({ conversationId: conversation._id, userId, role: "user", content: action, model: MODEL, metadata }),
            AIMessageModel.create({ conversationId: conversation._id, userId, role: "assistant", content: fullResponse, model: MODEL, tokenUsage, metadata }),
            ActivityEventModel.create({
              userId,
              type: "ai_mentor_used",
              entityType: safeContext.problemId ? "problem" : safeContext.missionId ? "mission" : safeContext.topicId ? "topic" : null,
              entityId: toObjectId(safeContext.problemId ?? safeContext.missionId ?? safeContext.topicId),
              occurredAt: new Date(),
              idempotencyKey: `ai-${crypto.randomUUID()}`,
              payload: { model: MODEL, tokenUsage, actionLength: action.length, context: metadata.context },
            }),
            AIConversationModel.updateOne({ _id: conversation._id }, { lastMessageAt: new Date() }),
            cacheCollection ? cacheCollection.updateOne({ _id: cacheKey }, { $set: { response: fullResponse, createdAt: new Date() } }, { upsert: true }) : Promise.resolve(),
          ]).catch((error) => console.error("Error saving AI interaction:", error));
        } catch (error: any) {
          console.error("AI Mentor stream error:", { status: error?.status, message: error?.message });
          if (!fullResponse) controller.enqueue(encoder.encode(providerErrorMessage(error)));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (error: any) {
    const status = error?.status === 400 ? 400 : error?.message === "Unauthorized" ? 401 : 502;
    console.error("AI Mentor request error:", { status, message: error?.message });
    return jsonError(status === 502 ? providerErrorMessage(error) : error.message, status);
  }
}

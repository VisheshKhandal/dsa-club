/**
 * Non-blocking AI Gateway for explainability and contextual feedback.
 *
 * Core architectural rule:
 * Deterministic planning is the source of truth. AI is strictly asynchronous,
 * non-blocking, and guarantees an immediate deterministic fallback whenever
 * offline, unconfigured, or timed out.
 */

export interface ExplanationRequest {
  topicName: string;
  focus: string;
  phase: string;
  targetMinutes: number;
  experienceLevel: string;
  fallbackText: string;
}

export interface ExplanationResult {
  text: string;
  model: string;
  enhancedAt?: Date;
  fallbackUsed: boolean;
}

export async function generateAsyncPlanExplanation(
  req: ExplanationRequest
): Promise<ExplanationResult> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      text: req.fallbackText,
      model: "deterministic-curriculum-rules",
      fallbackUsed: true,
    };
  }

  const model = process.env.AI_MENTOR_MODEL || "openrouter/free";
  const baseUrl = process.env.AI_MENTOR_BASE_URL || "https://openrouter.ai/api/v1";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s strict timeout

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://dsaclub.dev",
        "X-Title": "DSA Club Intelligence",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are DSA Club Intelligence. Provide a concise, 1-2 sentence pedagogical rationale explaining why today's learning step matters for the learner's interview prep. Be direct, encouraging, and clear.",
          },
          {
            role: "user",
            content: `Learner level: ${req.experienceLevel}. Topic: ${req.topicName}. Session focus: "${req.focus}". Phase: ${req.phase}. Duration: ${req.targetMinutes} minutes. Explain why this step is critical.`,
          },
        ],
        max_tokens: 120,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        text: req.fallbackText,
        model: "deterministic-curriculum-rules",
        fallbackUsed: true,
      };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (content) {
      return {
        text: content,
        model,
        enhancedAt: new Date(),
        fallbackUsed: false,
      };
    }

    return {
      text: req.fallbackText,
      model: "deterministic-curriculum-rules",
      fallbackUsed: true,
    };
  } catch {
    // Non-blocking catch: Return deterministic fallback
    return {
      text: req.fallbackText,
      model: "deterministic-curriculum-rules",
      fallbackUsed: true,
    };
  }
}

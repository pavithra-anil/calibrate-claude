const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";
const TIMEOUT_MS = 15_000;

export type Stakes = "low" | "high";
export type SignalStatus = "trusted" | "check" | "verify";
export type ReadyStatus = "use-as-is" | "review-first" | "not-ready";
export type Verdict = "safe-to-use" | "review-before-using" | "do-not-use";

export interface CalibrateSignal {
  status: SignalStatus;
  summary: string;
  details: string[];
  assumption: string | null;
}

export interface CalibrateResult {
  verdict: Verdict;
  verdict_reason: string;
  accuracy: CalibrateSignal;
  completeness: CalibrateSignal;
  ready: {
    status: ReadyStatus;
    summary: string;
    actions: string[];
  };
  recommended_actions: string[];
}

const HARDCODED_GROQ_API_KEY = "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";

const EVALUATION_SYSTEM_PROMPT = `You are a critical AI output evaluation agent. Your job is to help professionals decide whether to trust and use an AI-generated response.

Evaluate across THREE signals only:

1. ACCURACY — Is what Claude said actually correct? Are facts reliable?
   Combines faithfulness to prompt + factual confidence
   
2. COMPLETENESS — Is anything missing or assumed without being stated?
   Combines completeness of response + uncertainty about context
   
3. READY TO USE — Can the user use this right now or does something need to happen first?
   Based on overall output quality, assumptions made, and professional risk

For high stakes: be strict. Real professional consequences if wrong.
For low stakes: be reasonable. Only flag genuine concerns.

CRITICAL RULES:
- NEVER mark everything as trusted/complete/ready for code or research responses
- For code: always check if libraries, environments, or credentials were assumed
- For research: always check if sources were actually available to the AI
- Assumptions must be specific and actionable — not generic
- Recommended actions must be concrete steps — not vague advice
- Maximum 2 recommended actions
- Details array: maximum 2 items per signal, each one sentence

Return ONLY valid JSON:
{
  "verdict": "safe-to-use|review-before-using|do-not-use",
  "verdict_reason": "one sentence explaining the verdict — specific not generic",
  "accuracy": {
    "status": "trusted|check|verify",
    "summary": "one sentence — what this means for the user",
    "details": ["specific detail 1", "specific detail 2 or omit"],
    "assumption": "what Claude assumed about facts or null"
  },
  "completeness": {
    "status": "trusted|check|verify",
    "summary": "one sentence — what this means for the user",
    "details": ["specific detail 1", "specific detail 2 or omit"],
    "assumption": "what Claude assumed about context or null"
  },
  "ready": {
    "status": "use-as-is|review-first|not-ready",
    "summary": "one sentence — can they use this right now?",
    "actions": ["concrete next step 1", "concrete next step 2 or omit"]
  },
  "recommended_actions": ["most important action", "second action or omit"]
}`;

const ENRICHMENT_SYSTEM_PROMPT = `You are a prompt intelligence agent. Analyze the user's prompt.

If the prompt is underspecified — missing environment, constraints, output format, or context — generate exactly 3 distinct enriched versions. Each version should represent a genuinely different interpretation of what the user might need.

If the prompt is already specific enough (more than 20 words with clear context), return needs_enrichment: false.

Return ONLY valid JSON:
{
  "needs_enrichment": true|false,
  "versions": [
    {
      "label": "2-3 word label e.g. Beginner-friendly",
      "prompt": "complete enriched prompt"
    },
    {
      "label": "2-3 word label e.g. Production-ready", 
      "prompt": "complete enriched prompt"
    },
    {
      "label": "2-3 word label e.g. With specific schema",
      "prompt": "complete enriched prompt"
    }
  ]
}`;

function getKey() {
  const k =
    HARDCODED_GROQ_API_KEY ||
    (import.meta.env.VITE_GROQ_API_KEY as string | undefined);
  if (!k) throw new Error("VITE_GROQ_API_KEY is not set");
  return k;
}

type GroqMessage = { role: "user" | "assistant" | "system"; content: string };
type GroqRequestBody = {
  model: string;
  messages: GroqMessage[];
  temperature: number;
  response_format?: { type: "json_object" };
};

async function callGroq(body: GroqRequestBody): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getKey()}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const rawBody = await res.text();
    if (!res.ok) {
      console.log("Groq API error:", { status: res.status, body: rawBody });
      throw new Error(`Groq ${res.status}`);
    }
    const json = JSON.parse(rawBody) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json?.choices?.[0]?.message?.content;
    if (!text) throw new Error("Empty response");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateReply(userMessage: string): Promise<string> {
  return callGroq({
    model: MODEL,
    messages: [{ role: "user", content: userMessage }],
    temperature: 0.7,
  });
}

export async function evaluateReply(
  userMessage: string,
  aiResponse: string,
  stakes: Stakes,
): Promise<CalibrateResult> {
  const raw = await callGroq({
    model: MODEL,
    messages: [
      { role: "system", content: EVALUATION_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Original prompt:\n${userMessage}\n\nAI response:\n${aiResponse}\n\nStakes level: ${stakes}\n\nBe thorough. Identify every assumption. Be specific.`,
      },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  return JSON.parse(cleaned) as CalibrateResult;
}

export interface EnrichmentResult {
  needs_enrichment: boolean;
  versions: { label: string; prompt: string }[];
}

export async function enrichPrompt(
  userMessage: string,
): Promise<EnrichmentResult> {
  const raw = await callGroq({
    model: MODEL,
    messages: [
      { role: "system", content: ENRICHMENT_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  return JSON.parse(cleaned) as EnrichmentResult;
}
// Gemini Flash API client for generation + Calibrate evaluation.

const ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const TIMEOUT_MS = 10_000;

export type Stakes = "low" | "high";
export type CalibrateStatus = "Strong" | "Review" | "Verify";

export interface CalibrateDimension {
  status: CalibrateStatus;
  explanation: string;
  detail: string;
  assumption: string | null;
}

export interface CalibrateResult {
  faithfulness: CalibrateDimension;
  completeness: CalibrateDimension;
  reasoning: CalibrateDimension;
  factual_confidence: CalibrateDimension;
  uncertainty: CalibrateDimension;
  overall: "Use as-is" | "Verify flagged sections" | "Consider regenerating";
  recommendation: string;
}

function getKey() {
  const k = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!k) throw new Error("VITE_GEMINI_API_KEY is not set");
  return k;
}

async function callGemini(body: unknown): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${ENDPOINT}?key=${getKey()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const json = await res.json();
    const text: string | undefined =
      json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty response");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateReply(userMessage: string): Promise<string> {
  return callGemini({
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
  });
}

export async function evaluateReply(
  userMessage: string,
  aiResponse: string,
  stakes: Stakes,
): Promise<CalibrateResult> {
  const stakesInstruction =
    stakes === "high"
      ? "Be strict. Flag anything uncertain. Prefer Verify over Review."
      : "Be reasonable. Only flag genuine concerns.";

  const prompt = `You are an expert output evaluation agent. Analyze this AI response against the original user prompt.

Original prompt: ${userMessage}

AI response: ${aiResponse}

Stakes level: ${stakes}

${stakesInstruction}

Return ONLY valid JSON, no other text:
{
  "faithfulness": {"status": "Strong|Review|Verify", "explanation": "one sentence max", "detail": "specific thing to verify", "assumption": "what Claude assumed or null"},
  "completeness": {"status": "Strong|Review|Verify", "explanation": "one sentence max", "detail": "specific thing to verify", "assumption": "what Claude assumed or null"},
  "reasoning": {"status": "Strong|Review|Verify", "explanation": "one sentence max", "detail": "specific thing to verify", "assumption": "what Claude assumed or null"},
  "factual_confidence": {"status": "Strong|Review|Verify", "explanation": "one sentence max", "detail": "specific thing to verify", "assumption": "what Claude assumed or null"},
  "uncertainty": {"status": "Strong|Review|Verify", "explanation": "one sentence max", "detail": "specific thing to verify", "assumption": "what Claude assumed or null"},
  "overall": "Use as-is|Verify flagged sections|Consider regenerating",
  "recommendation": "one sentence overall recommendation"
}`;

  const raw = await callGemini({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  });

  // Strip code fences if present
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  return JSON.parse(cleaned) as CalibrateResult;
}

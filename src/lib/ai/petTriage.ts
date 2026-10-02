import { SYSTEM_PROMPT, DEFAULT_OPENAI_MODEL, TRIAGE_FUNCTION } from "./petCarePrompt";
import type { TriageResult, ChatMessage } from "./petCareSchema";

const AI_BASE_URL = (
  process.env.AI_BASE_URL || "https://api.openai.com/v1"
).replace(/\/$/, "");
const AI_MODEL = process.env.AI_MODEL || DEFAULT_OPENAI_MODEL;
// Model chain: primary + a fast fallback. Gemini free-tier quotas are
// per-model, so alternating also dodges per-model rate limits.
const AI_MODEL_CHAIN = [
  AI_MODEL,
  process.env.AI_FALLBACK_MODEL || "gemini-3.5-flash-lite",
].filter((m, i, arr) => arr.indexOf(m) === i);
const AI_API_KEY = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;

const PER_ATTEMPT_TIMEOUT_MS = 18000;
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = 1500;

function getChatCompletionsUrl(): string {
  return `${AI_BASE_URL}/chat/completions`;
}

async function callAI(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!AI_API_KEY) {
    throw new Error("AI_API_KEY not configured");
  }

  let lastError = "AI request failed";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const model = AI_MODEL_CHAIN[(attempt - 1) % AI_MODEL_CHAIN.length];

    try {
      const response = await fetch(getChatCompletionsUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({ ...body, model }),
        signal: AbortSignal.timeout(PER_ATTEMPT_TIMEOUT_MS),
      });

      if (response.ok) {
        return (await response.json()) as Record<string, unknown>;
      }

      const errText = await response.text().catch(() => "");
      lastError = `AI service error (${response.status})`;
      console.error(
        `AI API error (attempt ${attempt}/${MAX_ATTEMPTS}, model=${model}):`,
        response.status,
        errText.slice(0, 300)
      );

      // Stop on non-transient errors (bad request, auth)
      if (response.status !== 429 && response.status !== 503 && response.status !== 504) {
        break;
      }
    } catch (err) {
      // Timeout or network error — retry with next model
      lastError = err instanceof Error ? err.message : "AI request failed";
      console.error(
        `AI request failed (attempt ${attempt}/${MAX_ATTEMPTS}, model=${model}):`,
        lastError
      );
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, BACKOFF_MS));
    }
  }

  throw new Error(lastError);
}

function getFallbackTriage(): TriageResult {
  return {
    urgency: "uncertain",
    needs_vet: false,
    specialty: null,
    next_action: "CONTINUE_CHAT",
    confidence: 0.3,
    observations: [],
    red_flags: [],
    missing_information: [],
    guidance: { what_you_can_do: [], monitor_for: [], contact_vet_if: [] },
  };
}

interface OpenAIToolCall {
  function?: { name?: string; arguments?: string };
}

function parseTriage(
  toolCall: OpenAIToolCall | undefined
): { triage: TriageResult; replyMessage: string } {
  if (!toolCall) return { triage: getFallbackTriage(), replyMessage: "" };
  try {
    const args =
      typeof toolCall.function?.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : {};
    const triage: TriageResult = {
      urgency: args.urgency || "uncertain",
      needs_vet: !!args.needs_vet,
      specialty: args.specialty || null,
      next_action: args.next_action || "CONTINUE_CHAT",
      confidence: typeof args.confidence === "number" ? args.confidence : 0.5,
      observations: args.observations || [],
      red_flags: args.red_flags || [],
      missing_information: args.missing_information || [],
      guidance: args.guidance || {
        what_you_can_do: [],
        monitor_for: [],
        contact_vet_if: [],
      },
    };
    return { triage, replyMessage: typeof args.reply_message === "string" ? args.reply_message : "" };
  } catch {
    return { triage: getFallbackTriage(), replyMessage: "" };
  }
}

interface PetProfile {
  name?: string;
  species?: string;
  breed?: string;
  age?: string;
}

interface ChatOptions {
  messages: ChatMessage[];
  language?: string;
  petProfile?: PetProfile | null;
  imageUrls?: string[];
}

export async function generateAIResponse(
  options: ChatOptions
): Promise<{ message: string; triage: TriageResult }> {
  if (!AI_API_KEY) {
    throw new Error("AI_API_KEY not configured");
  }

  const { messages, language, petProfile, imageUrls } = options;

  // Build OpenAI messages
  const openaiMessages: Record<string, unknown>[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (petProfile) {
    openaiMessages.push({
      role: "system",
      content: `Pet context: Name=${petProfile.name || "unknown"}, Species=${petProfile.species || "unknown"}, Breed=${petProfile.breed || "unknown"}, Age=${petProfile.age || "unknown"}`,
    });
  }

  if (language && language !== "en") {
    const langName =
      language === "hinglish"
        ? "Hinglish (Hindi written in Latin script, casual mixed Hindi-English)"
        : language;
    openaiMessages.push({
      role: "system",
      content: `User's preferred language: ${langName}. Respond in this language naturally.`,
    });
  }

  // Add conversation history (limit to last 20 messages for cost control)
  const recentMessages = messages.slice(-20);
  for (const msg of recentMessages) {
    if (msg.images && msg.images.length > 0 && msg.role === "user") {
      const content: Record<string, unknown>[] = [
        { type: "text", text: msg.content || "Please look at this photo." },
      ];
      for (const url of msg.images) {
        content.push({ type: "image_url", image_url: { url } });
      }
      openaiMessages.push({ role: msg.role, content });
    } else {
      openaiMessages.push({ role: msg.role, content: msg.content });
    }
  }

  // If images were uploaded but not in message history, attach to last message
  if (imageUrls && imageUrls.length > 0) {
    const content: Record<string, unknown>[] = [
      { type: "text", text: messages[messages.length - 1]?.content || "Look at this photo." },
    ];
    for (const url of imageUrls) {
      content.push({ type: "image_url", image_url: { url } });
    }
    // Replace last user message with vision content
    for (let i = openaiMessages.length - 1; i >= 0; i--) {
      if (openaiMessages[i].role === "user") {
        openaiMessages[i] = { role: "user", content };
        break;
      }
    }
  }

  const body = {
    model: AI_MODEL,
    messages: openaiMessages,
    tools: [{ type: "function", function: TRIAGE_FUNCTION }],
    tool_choice: "auto",
    max_tokens: 4096,
    temperature: 0.7,
  };

  const data = await callAI(body);
  const choice = (data.choices as Record<string, unknown>[] | undefined)?.[0] as
    | Record<string, unknown>
    | undefined;
  const msg = choice?.message as Record<string, unknown> | undefined;

  let text = (msg?.content as string) || "";
  let triage = getFallbackTriage();

  const toolCalls = msg?.tool_calls as OpenAIToolCall[] | undefined;
  if (toolCalls && toolCalls.length > 0) {
    for (const tc of toolCalls) {
      if (tc.function?.name === "report_triage") {
        const parsed = parseTriage(tc);
        triage = parsed.triage;
        // Gemini returns tool calls without text — the model's conversational
        // reply rides inside the tool call as reply_message
        if (!text && parsed.replyMessage) {
          text = parsed.replyMessage;
        }
      }
    }
    // If AI only returned tool_calls without text, use a default message
    if (!text && triage.next_action === "REFER_TO_VET") {
      text =
        "Based on what you've described, I'd recommend getting a professional evaluation for your pet. Let me find some available veterinarians for you.";
    } else if (!text) {
      text = "I understand. Could you tell me a bit more about what's happening?";
    }
  }

  return { message: text.trim(), triage };
}

export async function generateCaseSummary(
  messages: ChatMessage[],
  petProfile: PetProfile | null,
  triage: TriageResult
): Promise<string> {
  const apiKey = AI_API_KEY;
  if (!apiKey) {
    return messages
      .slice(-6)
      .map((m) => `${m.role === "user" ? "Owner" : "AI"}: ${m.content}`)
      .join("\n");
  }

  const conversation = messages
    .slice(-20)
    .map((m) => `${m.role === "user" ? "Owner" : "Assistant"}: ${m.content}`)
    .join("\n");

  try {
    const data = await callAI({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Summarize this pet care conversation into a concise case handoff for a veterinarian. Include: primary concern, duration, key symptoms, owner answers, and AI observations. Max 150 words.",
        },
        {
          role: "user",
          content: `Pet: ${petProfile?.name || "Unknown"} (${petProfile?.species || "Unknown"}, ${petProfile?.breed || "Unknown breed"}, ${petProfile?.age || "Unknown age"})\nTriage: ${triage.urgency}\n\n${conversation}`,
        },
      ],
      max_tokens: 1024,
    });
    const choices = data.choices as Record<string, unknown>[] | undefined;
    const content = (
      (choices?.[0]?.message as Record<string, unknown> | undefined)?.content as string
    ) || "";
    return content || "Summary unavailable.";
  } catch {
    return messages
      .slice(-6)
      .map((m) => `${m.role === "user" ? "Owner" : "AI"}: ${m.content}`)
      .join("\n");
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 40;

const TTS_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-3.8-flash-lite-tts";
const DEFAULT_VOICE = "Kore";
const MAX_TEXT = 1500;

function sanitizeText(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .replace(/[*_#`>~|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT);
}

async function generateTts(
  apiKey: string,
  text: string,
  voice: string
): Promise<{ wav: Uint8Array; mimeType: string } | null> {
  const model = process.env.AI_TTS_MODEL || DEFAULT_MODEL;

  const res = await fetch(`${TTS_BASE}/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error(`TTS error (${res.status}):`, errText.slice(0, 300));
    return null;
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  const inline = Array.isArray(parts)
    ? parts.find((p: { inlineData?: { data?: string } }) => p.inlineData?.data)
    : null;

  if (!inline?.inlineData?.data) {
    console.error("TTS response missing audio data");
    return null;
  }

  const binary = Buffer.from(inline.inlineData.data, "base64");
  return {
    wav: new Uint8Array(binary),
    mimeType: inline.inlineData.mimeType || "audio/wav",
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "TTS not configured" }, { status: 503 });
    }

    const body = await request.json();
    const text = sanitizeText(String(body.text || ""));
    if (!text) {
      return NextResponse.json({ error: "No text" }, { status: 400 });
    }
    const voice = String(body.voice || DEFAULT_VOICE).slice(0, 20);

    let result = await generateTts(apiKey, text, voice);
    // One retry on overload (Gemini free tier spikes often)
    if (!result) {
      await new Promise((r) => setTimeout(r, 2000));
      result = await generateTts(apiKey, text, voice);
    }

    if (!result) {
      return NextResponse.json({ error: "TTS generation failed" }, { status: 503 });
    }

    return new NextResponse(Buffer.from(result.wav), {
      headers: {
        "Content-Type": result.mimeType.startsWith("audio/")
          ? result.mimeType.split(";")[0]
          : "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("TTS route error:", error);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIResponse } from "@/lib/ai/petTriage";
import { uploadPetCareMedia } from "@/lib/storage/petCareMedia";
import type { ChatMessage, AIResponse } from "@/lib/ai/petCareSchema";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      session_id,
      message,
      language,
      pet_id,
      images,
      message_type,
    } = body as {
      session_id?: string;
      message: string;
      language?: string;
      pet_id?: string;
      images?: { data: string; mimeType: string; name?: string }[];
      message_type?: "TEXT" | "VOICE" | "IMAGE";
    };

    if (!message && (!images || images.length === 0)) {
      return NextResponse.json({ error: "Message or images required" }, { status: 400 });
    }

    // 1. Session management
    let sessionId = session_id;
    if (!sessionId) {
      const { data: session, error: sessionErr } = await supabase
        .from("ai_care_sessions")
        .insert({
          user_id: user.id,
          pet_id: pet_id || null,
          preferred_language: language || "en",
          status: "active",
        })
        .select("id")
        .single();
      if (sessionErr || !session) {
        console.error("Session create error:", sessionErr);
        return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
      }
      sessionId = session.id;
    } else {
      // Verify ownership
      const { data: owned } = await supabase
        .from("ai_care_sessions")
        .select("id, user_id, pet_id")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .single();
      if (!owned) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      if (language) {
        await supabase
          .from("ai_care_sessions")
          .update({ preferred_language: language })
          .eq("id", sessionId);
      }
    }

    if (!sessionId) {
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    // 2. Handle image uploads (archived to storage; AI receives raw data URLs)
    if (images && images.length > 0) {
      for (const img of images) {
        const upload = await uploadPetCareMedia(
          user.id,
          pet_id || null,
          sessionId,
          img
        );
        if (upload) {
          await supabase.from("ai_care_media").insert({
            session_id: sessionId,
            user_id: user.id,
            pet_id: pet_id || null,
            storage_path: upload.path,
            mime_type: img.mimeType,
          });
        }
      }
    }

    // 3. Save user message
    const userMsgType = images && images.length > 0 ? "IMAGE" : message_type || "TEXT";
    const userMessage = message || (images && images.length > 0 ? "Please look at this photo." : "");
    if (userMessage || images?.length) {
      await supabase.from("ai_care_messages").insert({
        session_id: sessionId,
        role: "user",
        message: userMessage,
        message_type: userMsgType,
        language: language || "en",
        metadata: images?.length ? { image_count: images.length } : null,
      });
    }

    // 4. Load conversation history
    const { data: history } = await supabase
      .from("ai_care_messages")
      .select("role, message, message_type, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(40);

    const chatHistory: ChatMessage[] = (history || []).map(
      (m: { role: string; message: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.message,
      })
    );

    // 5. Load pet profile
    let petProfile = null;
    if (pet_id) {
      const { data: pet } = await supabase
        .from("pets")
        .select("name, species, breed, age")
        .eq("id", pet_id)
        .single();
      petProfile = pet;
    }

    // 6. Call AI (pass raw data URLs — storage bucket is private, so public
    // URLs would not be fetchable by the AI provider)
    const aiImageUrls = images?.length ? images.map((i) => i.data) : [];
    let aiResult;
    try {
      aiResult = await generateAIResponse({
        messages: chatHistory,
        language,
        petProfile,
        imageUrls: aiImageUrls,
      });
    } catch (aiErr) {
      console.error("AI generation error:", aiErr);
      return NextResponse.json(
        { error: "AI service is temporarily unavailable. Please try again." },
        { status: 503 }
      );
    }

    const { message: aiMessage, triage } = aiResult;

    // 7. Save AI message
    await supabase.from("ai_care_messages").insert({
      session_id: sessionId,
      role: "assistant",
      message: aiMessage,
      message_type: "TEXT",
      language: language || "en",
    });

    // 8. Save triage result
    await supabase.from("ai_triage_results").insert({
      session_id: sessionId,
      urgency: triage.urgency,
      confidence: triage.confidence,
      specialty: triage.specialty,
      next_action: triage.next_action,
      observations: triage.observations,
      red_flags: triage.red_flags,
      missing_information: triage.missing_information,
      guidance: triage.guidance,
    });

    // 9. Update session triage level
    await supabase
      .from("ai_care_sessions")
      .update({
        triage_level: triage.urgency,
        recommended_specialty: triage.specialty,
        needs_vet: triage.needs_vet,
      })
      .eq("id", sessionId);

    const response: AIResponse = {
      message: aiMessage,
      triage,
      session_id: sessionId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("AI care chat error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

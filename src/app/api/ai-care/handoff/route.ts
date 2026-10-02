import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCaseSummary } from "@/lib/ai/petTriage";
import type { ChatMessage, TriageResult, SpecialtyKey } from "@/lib/ai/petCareSchema";
import { toStringArray } from "@/lib/ai/petCareSchema";

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
    const { session_id, vet_id } = body as { session_id?: string; vet_id?: string };

    if (!session_id) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }

    // Verify session ownership
    const { data: session } = await supabase
      .from("ai_care_sessions")
      .select("id, user_id, pet_id, triage_level, recommended_specialty")
      .eq("id", session_id)
      .eq("user_id", user.id)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Load conversation
    const { data: messages } = await supabase
      .from("ai_care_messages")
      .select("role, message, message_type, created_at")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true })
      .limit(40);

    const chatHistory: ChatMessage[] = (messages || []).map(
      (m: { role: string; message: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.message,
      })
    );

    // Load pet profile
    let petProfile = null;
    if (session.pet_id) {
      const { data: pet } = await supabase
        .from("pets")
        .select("name, species, breed, age")
        .eq("id", session.pet_id)
        .single();
      petProfile = pet;
    }

    // Latest triage
    const { data: latestTriage } = await supabase
      .from("ai_triage_results")
      .select("urgency, confidence, specialty, observations, red_flags")
      .eq("session_id", session_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const triage: TriageResult = {
      urgency: (latestTriage?.urgency as TriageResult["urgency"]) || "uncertain",
      needs_vet: true,
      specialty: (latestTriage?.specialty as SpecialtyKey) || null,
      next_action: "REFER_TO_VET",
      confidence: latestTriage?.confidence || 0.5,
      observations: toStringArray(latestTriage?.observations),
      red_flags: toStringArray(latestTriage?.red_flags),
      missing_information: [],
      guidance: { what_you_can_do: [], monitor_for: [], contact_vet_if: [] },
    };

    // Generate case summary
    const caseSummary = await generateCaseSummary(chatHistory, petProfile, triage);

    // Count uploaded media
    const { count: mediaCount } = await supabase
      .from("ai_care_media")
      .select("id", { count: "exact", head: true })
      .eq("session_id", session_id);

    const petSnapshot = petProfile
      ? {
          name: petProfile.name || null,
          species: petProfile.species || null,
          breed: petProfile.breed || null,
          age: petProfile.age || null,
        }
      : null;

    const triageSnapshot = {
      urgency: triage.urgency,
      specialty: session.recommended_specialty || triage.specialty,
      confidence: triage.confidence,
      observations: triage.observations,
      red_flags: triage.red_flags,
      missing_information: triage.missing_information,
      guidance: triage.guidance,
    };

    const baseRow = {
      session_id,
      user_id: user.id,
      vet_id: vet_id || null,
      case_summary: caseSummary,
      urgency: triage.urgency,
      specialty: session.recommended_specialty || triage.specialty,
      status: "pending",
    };

    // One handoff per session — resend updates it instead of duplicating
    const { data: existing } = await supabase
      .from("ai_handoffs")
      .select("id, vet_id")
      .eq("session_id", session_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let handoff: { id: string } | null = null;
    let handoffErr: unknown = null;

    if (existing) {
      // Keep original vet if one was already assigned and none chosen now
      const row = {
        ...baseRow,
        vet_id: vet_id || (existing as { vet_id: string | null }).vet_id,
        pet_snapshot: petSnapshot,
        triage_snapshot: triageSnapshot,
      };
      const res = await supabase
        .from("ai_handoffs")
        .update(row)
        .eq("id", (existing as { id: string }).id)
        .select("id")
        .single();
      handoff = res.data;
      handoffErr = res.error;
    } else {
      const res = await supabase
        .from("ai_handoffs")
        .insert({
          ...baseRow,
          pet_snapshot: petSnapshot,
          triage_snapshot: triageSnapshot,
        })
        .select("id")
        .single();
      handoff = res.data;
      handoffErr = res.error;
    }

    // Fallback: migration 008 not applied yet (snapshot columns missing)
    if (handoffErr && !handoff) {
      console.warn("Handoff with snapshots failed, retrying basic:", handoffErr);
      if (existing) {
        const res = await supabase
          .from("ai_handoffs")
          .update(baseRow)
          .eq("id", (existing as { id: string }).id)
          .select("id")
          .single();
        handoff = res.data;
        handoffErr = res.error;
      } else {
        const res = await supabase
          .from("ai_handoffs")
          .insert(baseRow)
          .select("id")
          .single();
        handoff = res.data;
        handoffErr = res.error;
      }
    }

    if (handoffErr || !handoff) {
      console.error("Handoff error:", handoffErr);
      return NextResponse.json({ error: "Failed to create handoff" }, { status: 500 });
    }

    return NextResponse.json({
      handoff_id: handoff.id,
      case_summary: caseSummary,
      urgency: triage.urgency,
      specialty: session.recommended_specialty || triage.specialty,
      pet: petSnapshot,
      triage: triageSnapshot,
      media_count: mediaCount || 0,
      message_count: chatHistory.length,
      session_id,
    });
  } catch (error) {
    console.error("Handoff error:", error);
    return NextResponse.json({ error: "Failed to create handoff" }, { status: 500 });
  }
}

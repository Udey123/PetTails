import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function safeQuery<T>(promise: Promise<{ data: T | null; error: unknown }>): Promise<T | null> {
  try {
    const { data, error } = await promise;
    if (error) console.warn("Query warning:", error);
    return data;
  } catch (e) {
    console.warn("Query failed (table may not exist):", e);
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const vet = await safeQuery<{ id: string; user_id: string; [key: string]: unknown }>(
      supabase.from("vets").select("*").eq("id", id).single()
    );

    if (!vet) {
      return NextResponse.json({ error: "Vet not found" }, { status: 404 });
    }

    const profile = await safeQuery<{ id: string; name: string; email: string; phone: string; avatar_url: string }>(
      supabase.from("profiles").select("id, name, email, phone, avatar_url").eq("id", vet.user_id).single()
    );

    const services = await safeQuery<{ id: string; service_type: string; title: string; description: string; price: number; duration_minutes: number; is_active: boolean }[]>(
      supabase.from("vet_services").select("*").eq("vet_id", id).eq("is_active", true)
    );

    const reviews = await safeQuery<{ id: string; owner_id: string; rating: number; review_text: string; created_at: string }[]>(
      supabase.from("reviews").select("*").eq("vet_id", id).order("created_at", { ascending: false }).limit(20)
    );

    const reviewOwnerIds = (reviews || []).map((r) => r.owner_id).filter(Boolean);
    let profilesMap = new Map<string, { name: string }>();
    if (reviewOwnerIds.length > 0) {
      const reviewProfiles = await safeQuery<{ id: string; name: string }[]>(
        supabase.from("profiles").select("id, name").in("id", reviewOwnerIds)
      );
      profilesMap = new Map((reviewProfiles || []).map((p) => [p.id, p]));
    }

    const enrichedReviews = (reviews || []).map((r) => ({
      ...r,
      profiles: profilesMap.get(r.owner_id) || null,
    }));

    const availability = await safeQuery<{ id: string; day_of_week: number; start_time: string; end_time: string; is_available: boolean }[]>(
      supabase.from("vet_availability").select("*").eq("vet_id", id).eq("is_available", true)
    );

    return NextResponse.json({
      ...vet,
      profiles: profile || null,
      vet_services: services || [],
      reviews: enrichedReviews,
      availability: availability || [],
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

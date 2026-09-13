import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const { data: vet, error } = await supabase
      .from("vets")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !vet) {
      return NextResponse.json({ error: "Vet not found" }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, email, phone, avatar_url")
      .eq("id", vet.user_id)
      .single();

    const { data: services } = await supabase
      .from("vet_services")
      .select("*")
      .eq("vet_id", id)
      .eq("is_active", true);

    const { data: reviews } = await supabase
      .from("reviews")
      .select("*")
      .eq("vet_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    const reviewOwnerIds = (reviews || []).map((r: Record<string, unknown>) => r.owner_id as string);
    let profilesMap = new Map<string, { name: string }>();
    if (reviewOwnerIds.length > 0) {
      const { data: reviewProfiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", reviewOwnerIds);
      profilesMap = new Map((reviewProfiles || []).map((p: Record<string, unknown>) => [p.id as string, p as { name: string }]));
    }

    const enrichedReviews = (reviews || []).map((r: Record<string, unknown>) => ({
      ...r,
      profiles: profilesMap.get(r.owner_id as string) || null,
    }));

    const { data: availability } = await supabase
      .from("vet_availability")
      .select("*")
      .eq("vet_id", id)
      .eq("is_available", true);

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

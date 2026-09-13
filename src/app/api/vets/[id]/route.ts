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
      .select("*, profiles!vets_user_id_fkey(name, email, phone, avatar_url)")
      .eq("id", id)
      .single();

    if (error || !vet) {
      return NextResponse.json({ error: "Vet not found" }, { status: 404 });
    }

    // Get services
    const { data: services } = await supabase
      .from("vet_services")
      .select("*")
      .eq("vet_id", id)
      .eq("is_active", true);

    // Get reviews with owner names
    const { data: reviews } = await supabase
      .from("reviews")
      .select("*, profiles!reviews_owner_id_fkey(name)")
      .eq("vet_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Get availability
    const { data: availability } = await supabase
      .from("vet_availability")
      .select("*")
      .eq("vet_id", id)
      .eq("is_available", true);

    return NextResponse.json({
      ...vet,
      vet_services: services || [],
      reviews: reviews || [],
      availability: availability || [],
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

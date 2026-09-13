import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    const { data: vets, error } = await supabase
      .from("vets")
      .select("*")
      .eq("verified", true)
      .eq("accepting_bookings", true);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch vets" }, { status: 500 });
    }

    if (!vets || vets.length === 0) {
      return NextResponse.json([]);
    }

    const userIds = vets.map((v: { user_id: string }) => v.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email, avatar_url")
      .in("id", userIds);

    const profilesMap = new Map((profiles || []).map((p: { id: string }) => [p.id, p]));

    const enriched = vets.map((vet: Record<string, unknown>) => ({
      ...vet,
      profiles: profilesMap.get(vet.user_id as string) || null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

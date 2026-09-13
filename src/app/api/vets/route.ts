import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from("vets")
      .select("*, profiles!vets_user_id_fkey(name, email)")
      .eq("verified", true)
      .eq("accepting_bookings", true);

    if (user) {
      const { data: myVet } = await supabase
        .from("vets")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (myVet) {
        query = query.or(`id.eq.${myVet.id}`);
      }
    }

    const { data: vets, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch vets" }, { status: 500 });
    }

    return NextResponse.json(vets);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

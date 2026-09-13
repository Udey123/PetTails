import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: vets, error } = await supabase
      .from("vets")
      .select("*, profiles!vets_user_id_fkey(name, email)")
      .eq("verified", true)
      .eq("accepting_bookings", true);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch vets" }, { status: 500 });
    }

    return NextResponse.json(vets);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

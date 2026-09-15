import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: vet } = await supabase
      .from("vets")
      .select("id, google_meet_url")
      .eq("user_id", user.id)
      .single();

    if (!vet) {
      return NextResponse.json({ error: "Vet not found" }, { status: 404 });
    }

    return NextResponse.json({ google_meet_url: vet.google_meet_url || null });
  } catch (error) {
    console.error("Get meet link error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { google_meet_url } = await request.json();

    if (google_meet_url && google_meet_url.trim() !== "") {
      const url = google_meet_url.trim();
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") {
          return NextResponse.json(
            { error: "Please enter a valid Google Meet link (must start with https://)" },
            { status: 400 }
          );
        }
        if (!parsed.hostname.includes("meet.google.com")) {
          return NextResponse.json(
            { error: "Please enter a valid Google Meet link (meet.google.com)" },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Please enter a valid URL" },
          { status: 400 }
        );
      }
    }

    const { error } = await supabase
      .from("vets")
      .update({ google_meet_url: google_meet_url?.trim() || null })
      .eq("user_id", user.id);

    if (error) {
      console.error("Update meet link error:", error);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save meet link error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

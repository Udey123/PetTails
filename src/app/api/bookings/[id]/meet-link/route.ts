import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Props) {
  try {
    const { id: bookingId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, owner_id, vet_id, service_type, status")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const isOwner = booking.owner_id === user.id;
    let isVet = false;
    if (!isOwner) {
      const { data: vet } = await supabase
        .from("vets")
        .select("id")
        .eq("user_id", user.id)
        .eq("id", booking.vet_id)
        .single();
      isVet = !!vet;
    }

    if (!isOwner && !isVet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (booking.service_type !== "video_consult") {
      return NextResponse.json(
        { error: "Not a video consultation" },
        { status: 400 }
      );
    }

    const { data: vet } = await supabase
      .from("vets")
      .select("google_meet_url")
      .eq("id", booking.vet_id)
      .single();

    if (!vet?.google_meet_url) {
      return NextResponse.json(
        { error: "Google Meet link not available yet" },
        { status: 404 }
      );
    }

    return NextResponse.json({ google_meet_url: vet.google_meet_url });
  } catch (error) {
    console.error("Get booking meet link error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

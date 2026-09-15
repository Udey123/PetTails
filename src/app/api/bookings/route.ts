import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

function generateRef(): string {
  const bytes = randomBytes(4).toString("hex");
  return `PT-${bytes}`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { vet_id, pet_id, service_type, service_id, scheduled_at, urgency, symptoms, concern } = body;

    if (!vet_id || !pet_id || !service_type || !scheduled_at) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validUrgencies = ["routine", "soon", "urgent", "emergency"];
    const bookingUrgency = validUrgencies.includes(urgency) ? urgency : "routine";

    const { data: pet, error: petError } = await supabase
      .from("pets")
      .select("id")
      .eq("id", pet_id)
      .eq("owner_id", user.id)
      .single();

    if (petError || !pet) {
      return NextResponse.json({ error: "Pet not found or unauthorized" }, { status: 403 });
    }

    const { data: vet, error: vetError } = await supabase
      .from("vets")
      .select("id, consultation_price, verified, verification_status, accepting_bookings")
      .eq("id", vet_id)
      .single();

    if (vetError || !vet || (!vet.verified && vet.verification_status !== "verified")) {
      return NextResponse.json({ error: "Vet not found or not verified" }, { status: 404 });
    }

    if (!vet.accepting_bookings) {
      return NextResponse.json({ error: "This vet is not currently accepting bookings" }, { status: 409 });
    }

    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("id")
      .eq("vet_id", vet_id)
      .eq("scheduled_at", scheduled_at)
      .in("status", ["pending", "confirmed"])
      .single();

    if (existingBooking) {
      return NextResponse.json({ error: "This time slot is no longer available" }, { status: 409 });
    }

    const bookingReference = generateRef();

    let bookingPrice: number | null = null;

    try {
      const { data: pricingRow } = await supabase
        .from("consultation_pricing")
        .select("price")
        .eq("vet_id", vet_id)
        .eq("service_type", service_type)
        .eq("urgency", bookingUrgency)
        .eq("is_active", true)
        .single();

      if (pricingRow) {
        bookingPrice = pricingRow.price;
      }
    } catch {
      // consultation_pricing table may not exist yet — fall through to fallback
    }

    if (bookingPrice === null || bookingPrice === undefined) {
      try {
        const { data: service } = await supabase
          .from("vet_services")
          .select("price, is_active")
          .eq("vet_id", vet_id)
          .eq("service_type", service_type)
          .eq("is_active", true)
          .single();
        if (service) {
          bookingPrice = service.price;
        }
      } catch {
        // fall through
      }
    }

    if (bookingPrice === null || bookingPrice === undefined) {
      bookingPrice = vet.consultation_price;
    }

    if (bookingPrice === null || bookingPrice === undefined) {
      return NextResponse.json({ error: "Consultation price unavailable for this service and urgency" }, { status: 400 });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        booking_reference: bookingReference,
        owner_id: user.id,
        vet_id,
        pet_id,
        service_type,
        urgency: bookingUrgency,
        scheduled_at,
        price: bookingPrice,
        status: "confirmed",
        payment_status: "paid",
        concern: concern || symptoms || null,
        symptoms: symptoms || null,
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Booking insert error:", bookingError);
      return NextResponse.json({ error: "Failed to create booking. Please try again." }, { status: 500 });
    }

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error("Booking API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "vet") {
      const { data: vet } = await supabase
        .from("vets")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!vet) {
        return NextResponse.json({ error: "Vet record not found" }, { status: 404 });
      }

      const { data: bookings } = await supabase
        .from("bookings")
        .select("*, pets(name, species)")
        .eq("vet_id", vet.id)
        .order("created_at", { ascending: false });

      const ownerIds = (bookings || []).map((b: Record<string, unknown>) => b.owner_id).filter(Boolean);
      let ownerMap = new Map<string, { name: string }>();
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", ownerIds);
        ownerMap = new Map((owners || []).map((p: Record<string, unknown>) => [p.id as string, p as { name: string }]));
      }

      const enriched = (bookings || []).map((b: Record<string, unknown>) => ({
        ...b,
        profiles: ownerMap.get(b.owner_id as string) || null,
      }));

      return NextResponse.json(enriched);
    }

    const { data: bookings } = await supabase
      .from("bookings")
      .select("*, pets(name, species)")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    const vetIds = (bookings || []).map((b: Record<string, unknown>) => b.vet_id).filter(Boolean);
    let vetMap = new Map<string, Record<string, unknown>>();
    if (vetIds.length > 0) {
      const { data: vets } = await supabase
        .from("vets")
        .select("id, specialization, city, area, display_name")
        .in("id", vetIds);
      const vetUserIds = (vets || []).map((v: Record<string, unknown>) => v.id);
      const { data: vetProfiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", vetUserIds);

      const profilesByVetId = new Map((vetProfiles || []).map((p: Record<string, unknown>) => [p.id as string, p]));
      vetMap = new Map((vets || []).map((v: Record<string, unknown>) => [v.id as string, { ...v, profiles: profilesByVetId.get(v.id as string) || null }]));
    }

    const enriched = (bookings || []).map((b: Record<string, unknown>) => ({
      ...b,
      vets: vetMap.get(b.vet_id as string) || null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Booking GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

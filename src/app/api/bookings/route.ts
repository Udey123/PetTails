import { NextResponse } from "next/server";
import { createClient, getServiceClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";
import { randomBytes } from "crypto";

function generateRef(): string {
  const bytes = randomBytes(4).toString("hex");
  return `VT-${bytes}`;
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
    const { vet_id, pet_id, service_type, service_id, scheduled_at, concern, urgency, symptoms, duration_minutes } = body;

    if (!vet_id || !pet_id || !service_type || !scheduled_at) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate urgency is a valid value
    const validUrgencies = ["routine", "soon", "urgent", "emergency"];
    const bookingUrgency = validUrgencies.includes(urgency) ? urgency : "routine";

    // Validate pet belongs to owner
    const { data: pet, error: petError } = await supabase
      .from("pets")
      .select("id")
      .eq("id", pet_id)
      .eq("owner_id", user.id)
      .single();

    if (petError || !pet) {
      return NextResponse.json({ error: "Pet not found or unauthorized" }, { status: 403 });
    }

    // Validate vet exists and is verified
    const { data: vet, error: vetError } = await supabase
      .from("vets")
      .select("id, consultation_price, verified, verification_status")
      .eq("id", vet_id)
      .single();

    if (vetError || !vet || (!vet.verified && vet.verification_status !== "verified")) {
      return NextResponse.json({ error: "Vet not found or not verified" }, { status: 404 });
    }

    // Prevent double booking - check for existing booking at same time
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("id")
      .eq("vet_id", vet_id)
      .eq("scheduled_at", scheduled_at)
      .in("status", ["pending", "confirmed", "vet_assigned"])
      .single();

    if (existingBooking) {
      return NextResponse.json({ error: "This time slot is no longer available" }, { status: 409 });
    }

    // Create booking
    const bookingReference = generateRef();

    // Server-side price validation: never trust frontend price
    let bookingPrice = vet.consultation_price;
    if (service_id) {
      const { data: service } = await supabase
        .from("vet_services")
        .select("price")
        .eq("id", service_id)
        .eq("vet_id", vet_id)
        .single();
      if (service) {
        bookingPrice = service.price;
      }
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        owner_id: user.id,
        vet_id,
        pet_id,
        service_id: service_id || null,
        service_type,
        booking_type: service_type,
        urgency: bookingUrgency,
        scheduled_at,
        duration_minutes: duration_minutes || 30,
        status: "pending",
        price: bookingPrice,
        payment_status: "pending",
        booking_reference: bookingReference,
        concern: concern || null,
        symptoms: symptoms || null,
      })
      .select()
      .single();

    if (bookingError) {
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
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
        .select("*, pets(name, species), profiles(name)")
        .eq("vet_id", vet.id)
        .order("created_at", { ascending: false });

      return NextResponse.json(bookings);
    }

    const { data: bookings } = await supabase
      .from("bookings")
      .select("*, pets(name, species), vets(*, profiles(name))")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

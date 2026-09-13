import { NextResponse } from "next/server";
import { createClient, getServiceClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

function generateRef(): string {
  const num = Math.floor(10000 + Math.random() * 89999);
  return `VT-${num}`;
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
    const { vet_id, pet_id, service_type, scheduled_at, concern } = body;

    if (!vet_id || !pet_id || !service_type || !scheduled_at) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

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
      .select("id, consultation_price, verified")
      .eq("id", vet_id)
      .single();

    if (vetError || !vet || !vet.verified) {
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
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        owner_id: user.id,
        vet_id,
        pet_id,
        service_type,
        scheduled_at,
        status: "pending",
        price: vet.consultation_price,
        payment_status: "pending",
        booking_reference: bookingReference,
        concern: concern || null,
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

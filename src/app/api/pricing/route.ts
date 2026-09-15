import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vet_id = searchParams.get("vet_id");
    const service_type = searchParams.get("service_type") || "video_consult";
    const urgency = searchParams.get("urgency");

    if (!vet_id || !urgency) {
      return NextResponse.json({ error: "vet_id and urgency required" }, { status: 400 });
    }

    const validUrgencies = ["routine", "soon", "urgent", "emergency"];
    if (!validUrgencies.includes(urgency)) {
      return NextResponse.json({ error: "Invalid urgency" }, { status: 400 });
    }

    const supabase = await createClient();

    let pricing = null;
    try {
      const result = await supabase
        .from("consultation_pricing")
        .select("id, price, currency, duration_minutes, urgency, service_type")
        .eq("vet_id", vet_id)
        .eq("service_type", service_type)
        .eq("urgency", urgency)
        .eq("is_active", true)
        .single();
      pricing = result.data;
    } catch {
      // consultation_pricing table may not exist yet
    }

    if (!pricing) {
      const { data: service } = await supabase
        .from("vet_services")
        .select("price, duration_minutes")
        .eq("vet_id", vet_id)
        .eq("service_type", service_type)
        .eq("is_active", true)
        .single();

      if (service) {
        return NextResponse.json({
          price: service.price,
          currency: "INR",
          duration_minutes: service.duration_minutes || 30,
          urgency,
          service_type,
        });
      }

      const { data: vet } = await supabase
        .from("vets")
        .select("consultation_price")
        .eq("id", vet_id)
        .single();

      if (vet?.consultation_price) {
        return NextResponse.json({
          price: vet.consultation_price,
          currency: "INR",
          duration_minutes: 30,
          urgency,
          service_type,
        });
      }

      return NextResponse.json(
        { error: "Pricing not available for this service and urgency" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      price: pricing.price,
      currency: pricing.currency,
      duration_minutes: pricing.duration_minutes,
      urgency: pricing.urgency,
      service_type: pricing.service_type,
    });
  } catch (error) {
    console.error("Pricing API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findMatchingVets, getSpecialtyLabel } from "@/lib/ai/vetRouting";
import type { SpecialtyKey } from "@/lib/ai/petCareSchema";

const VALID_SPECIALTIES = [
  "GENERAL_VETERINARY",
  "DERMATOLOGY",
  "ORTHOPEDICS",
  "DENTAL",
  "OPHTHALMOLOGY",
  "INTERNAL_MEDICINE",
  "SURGERY",
  "EMERGENCY",
];

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const specialtyParam = searchParams.get("specialty") || "GENERAL_VETERINARY";
    const limit = parseInt(searchParams.get("limit") || "6", 10);

    const specialty = VALID_SPECIALTIES.includes(specialtyParam)
      ? (specialtyParam as SpecialtyKey)
      : "GENERAL_VETERINARY";

    const vets = await findMatchingVets(specialty, { limit });

    return NextResponse.json({
      specialty,
      specialty_label: getSpecialtyLabel(specialty),
      vets,
      count: vets.length,
    });
  } catch (error) {
    console.error("Find vets error:", error);
    return NextResponse.json({ error: "Failed to find vets" }, { status: 500 });
  }
}

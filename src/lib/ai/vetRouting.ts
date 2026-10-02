import { createClient } from "@/lib/supabase/server";
import { SPECIALTIES, type SpecialtyKey } from "./petCareSchema";

interface VetSearchResult {
  id: string;
  display_name: string | null;
  profile_name: string | null;
  specialization: string;
  specializations: string[];
  expertise: string[];
  city: string | null;
  area: string | null;
  rating: number;
  review_count: number;
  accepting_bookings: boolean;
  verified: boolean;
  consultation_price: number;
  google_meet_url: string | null;
  online: boolean;
}

function matchesSpecialty(vet: Record<string, unknown>, specialty: SpecialtyKey): boolean {
  if (specialty === "GENERAL_VETERINARY") return true;

  const searchFields = [
    (vet.specialization as string) || "",
    ...((vet.specializations as string[]) || []),
    ...((vet.expertise as string[]) || []),
  ]
    .join(" ")
    .toLowerCase();

  const label = SPECIALTIES[specialty].toLowerCase();
  const key = specialty.toLowerCase().replace(/_/g, " ");

  return (
    searchFields.includes(label) ||
    searchFields.includes(key) ||
    searchFields.includes(specialty.toLowerCase())
  );
}

export async function findMatchingVets(
  specialty: SpecialtyKey | null,
  options?: { limit?: number }
): Promise<VetSearchResult[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const limit = options?.limit || 6;

  const { data: vets, error } = await supabase
    .from("vets")
    .select(
      "id, display_name, user_id, specialization, specializations, expertise, city, area, rating, review_count, accepting_bookings, verified, verification_status, consultation_price, google_meet_url, online"
    )
    .eq("verified", true)
    .eq("accepting_bookings", true);

  if (error || !vets) return [];

  // Enrich with profile names
  const userIds = vets.map((v: { user_id: string }) => v.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", userIds);
  const profileMap = new Map<string, string>(
    ((profiles || []) as { id: string; name: string }[]).map((p) => [p.id, p.name])
  );

  let filtered = vets as Record<string, unknown>[];

  // Apply specialty filter if specified
  if (specialty && specialty !== "GENERAL_VETERINARY") {
    const matching = filtered.filter((v) => matchesSpecialty(v, specialty));
    // If no exact specialty match, fall back to general practice
    if (matching.length > 0) {
      filtered = matching;
    }
  }

  const enriched: VetSearchResult[] = filtered
    .slice(0, limit)
    .map((vet) => ({
      id: vet.id as string,
      display_name: vet.display_name as string | null,
      profile_name: profileMap.get(vet.user_id as string) || null,
      specialization: vet.specialization as string,
      specializations: (vet.specializations as string[]) || [],
      expertise: (vet.expertise as string[]) || [],
      city: vet.city as string | null,
      area: vet.area as string | null,
      rating: (vet.rating as number) || 0,
      review_count: (vet.review_count as number) || 0,
      accepting_bookings: (vet.accepting_bookings as boolean) || false,
      verified: (vet.verified as boolean) || false,
      consultation_price: (vet.consultation_price as number) || 0,
      google_meet_url: vet.google_meet_url as string | null,
      online: (vet.online as boolean) || false,
    }));

  return enriched;
}

export function getSpecialtyLabel(specialty: string | null): string {
  if (!specialty) return "General Veterinary";
  return SPECIALTIES[specialty as SpecialtyKey] || specialty;
}

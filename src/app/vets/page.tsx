"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { FilterState } from "@/components/search/SearchFilters";
import { BookingModal } from "@/components/booking/BookingModal";
import type { Vet, ServiceType } from "@/lib/types";
import { formatPrice, COMMON_SPECIES, SERVICE_LABELS } from "@/lib/utils";

const DEFAULT_FILTERS: FilterState = {
  species: [],
  specialization: [],
  serviceType: [],
  minPrice: 0,
  maxPrice: 10000,
  minRating: 0,
  onlineOnly: false,
  minExperience: 0,
  city: "",
};

const SPECIALIZATIONS = [
  "General Practice",
  "Surgery",
  "Dermatology",
  "Cardiology",
  "Orthopedics",
  "Dentistry",
  "Ophthalmology",
  "Internal Medicine",
  "Emergency & Critical Care",
  "Nutrition",
  "Exotic Animals",
];

const SPECIALIZATION_CHIPS = [
  "General Practice",
  "Dermatology",
  "Surgery",
  "Internal Medicine",
];

const SERVICE_TYPES: { label: string; value: string }[] = [
  { label: "Video Consultation", value: "video_consult" },
  { label: "Home Visit", value: "home_visit" },
  { label: "Clinic Consultation", value: "clinic_consult" },
  { label: "Emergency", value: "emergency" },
];

const RATING_OPTIONS = [
  { label: "4+ ★", value: 4 },
  { label: "3+ ★", value: 3 },
  { label: "2+ ★", value: 2 },
  { label: "Any", value: 0 },
];

const EXPERIENCE_OPTIONS = [
  { label: "1+ years", value: 1 },
  { label: "3+ years", value: 3 },
  { label: "5+ years", value: 5 },
  { label: "10+ years", value: 10 },
];

type ReviewEntry = {
  id: string;
  rating: number;
  review_text: string;
  created_at: string;
  reviewer: string | null;
};

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5 21 21" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function IconStar({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5L2.6 9.3l6.5-.9z" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function IconSliders() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M3 7h9M17 7h4M3 17h3M11 17h10" />
      <circle cx="15" cy="7" r="2.2" />
      <circle cx="9" cy="17" r="2.2" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function IconPaw() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <ellipse cx="7" cy="8.5" rx="2" ry="2.6" />
      <ellipse cx="12" cy="6.8" rx="2" ry="2.6" />
      <ellipse cx="17" cy="8.5" rx="2" ry="2.6" />
      <path d="M12 11.5c-2.7 0-5.2 2.4-5.2 4.7 0 1.7 1.4 2.8 3.1 2.4 1.4-.3 2.8-.3 4.2 0 1.7.4 3.1-.7 3.1-2.4 0-2.3-2.5-4.7-5.2-4.7z" />
    </svg>
  );
}

function IconRupee() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 5h10M7 9.5h10M16.5 5c0 3.2-2.3 5-5.5 5H7l8 9" />
    </svg>
  );
}

function VerifiedBadge() {
  return (
    <span className="fv-verified" title="Verified" aria-label="Verified">
      <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path
          d="m8 12.4 2.6 2.6 5-5.6"
          fill="none"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function vetName(vet: Vet): string {
  return vet.profiles?.name || vet.display_name || "Unknown";
}

function VetAvatar({ vet, className }: { vet: Vet; className: string }) {
  const url = vet.profiles?.avatar_url;
  if (url) {
    return (
      <span className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" />
      </span>
    );
  }
  return <span className={className}>{initialsOf(vetName(vet)) || "V"}</span>;
}

function starString(value: number): string {
  const full = Math.floor(value);
  const half = value - full >= 0.3;
  let out = "";
  for (let i = 0; i < 5; i++) {
    if (i < full) out += "★";
    else if (i === full && half) out += "★";
    else out += "☆";
  }
  return out;
}

export default function VetsBrowsePage() {
  const supabase = createClient();

  const [vets, setVets] = useState<Vet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [bookingVet, setBookingVet] = useState<Vet | null>(null);

  const [queryInput, setQueryInput] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [sort, setSort] = useState<"relevance" | "rating" | "price">("relevance");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "about" | "services" | "reviews"
  >("about");
  const [reviewsByVet, setReviewsByVet] = useState<Record<string, ReviewEntry[]>>({});

  useEffect(() => {
    const fetchVets = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/vets");
        if (!res.ok) throw new Error("Failed to load vets");
        const data = await res.json();

        const vetIds: string[] = data.map((v: Vet) => v.id);

        const servicesMap: Record<string, Vet["vet_services"]> = {};
        if (vetIds.length > 0) {
          try {
            const { data: services } = await supabase
              .from("vet_services")
              .select("*")
              .eq("is_active", true)
              .in("vet_id", vetIds);

            if (services) {
              for (const svc of services) {
                if (!servicesMap[svc.vet_id]) servicesMap[svc.vet_id] = [];
                servicesMap[svc.vet_id]!.push(svc);
              }
            }
          } catch {
            // vet_services table may not exist yet
          }
        }

        const enriched: Vet[] = data.map((vet: Vet) => ({
          ...vet,
          vet_services: servicesMap[vet.id] || [],
        }));

        setVets(enriched);
      } catch {
        setError("Could not load vets. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchVets();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel("vets-browse")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "vets" },
          () => fetchVets()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "vet_services" },
          () => fetchVets()
        )
        .subscribe();
    } catch {
      // Realtime may not be enabled on these tables yet
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  const applySearch = () => {
    setAppliedQuery(queryInput);
    setFilters((prev) => ({ ...prev, city: cityInput }));
  };

  const filteredVets = useMemo(() => {
    return vets.filter((vet) => {
      if (
        filters.species.length > 0 &&
        !filters.species.some((s) => vet.species_treated?.includes(s))
      ) {
        return false;
      }

      if (
        filters.specialization.length > 0 &&
        !filters.specialization.some((s) => vet.specializations?.includes(s))
      ) {
        return false;
      }

      if (filters.serviceType.length > 0) {
        const vetServiceTypes =
          vet.vet_services?.map((s) => s.service_type) ?? [];
        if (!filters.serviceType.some((st) => vetServiceTypes.includes(st as ServiceType))) {
          return false;
        }
      }

      if (vet.consultation_price < filters.minPrice) return false;
      if (filters.maxPrice < 10000 && vet.consultation_price > filters.maxPrice)
        return false;

      if (filters.minRating > 0 && vet.rating < filters.minRating) return false;

      if (filters.onlineOnly && !vet.online) return false;

      if (
        filters.minExperience > 0 &&
        (vet.years_experience ?? 0) < filters.minExperience
      ) {
        return false;
      }

      if (filters.city.trim()) {
        const query = filters.city.trim().toLowerCase();
        const cityMatch = vet.city?.toLowerCase().includes(query);
        const areaMatch = vet.area?.toLowerCase().includes(query);
        const clinicMatch = vet.clinic_name?.toLowerCase().includes(query);
        if (!cityMatch && !areaMatch && !clinicMatch) return false;
      }

      const q = appliedQuery.trim().toLowerCase();
      if (q) {
        const hay = [
          vet.profiles?.name,
          vet.display_name,
          vet.specialization,
          ...(vet.specializations ?? []),
          vet.clinic_name,
          vet.city,
          vet.area,
          ...(vet.species_treated ?? []),
          ...(vet.vet_services ?? []).map((s) => s.title),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [vets, filters, appliedQuery]);

  const sortedVets = useMemo(() => {
    if (sort === "rating") {
      return [...filteredVets].sort((a, b) => b.rating - a.rating);
    }
    if (sort === "price") {
      return [...filteredVets].sort(
        (a, b) => a.consultation_price - b.consultation_price
      );
    }
    return filteredVets;
  }, [filteredVets, sort]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.species.length > 0) count++;
    if (filters.specialization.length > 0) count++;
    if (filters.serviceType.length > 0) count++;
    if (filters.minPrice > 0) count++;
    if (filters.maxPrice < 10000) count++;
    if (filters.minRating > 0) count++;
    if (filters.onlineOnly) count++;
    if (filters.minExperience > 0) count++;
    if (filters.city.trim()) count++;
    return count;
  }, [filters]);

  const effectiveId = useMemo(() => {
    if (sortedVets.length === 0) return null;
    if (selectedId && sortedVets.some((v) => v.id === selectedId)) {
      return selectedId;
    }
    return sortedVets[0]!.id;
  }, [sortedVets, selectedId]);

  useEffect(() => {
    if (!effectiveId || reviewsByVet[effectiveId]) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: reviews } = await supabase
          .from("reviews")
          .select("id, owner_id, rating, review_text, created_at")
          .eq("vet_id", effectiveId)
          .order("created_at", { ascending: false })
          .limit(10);
        if (cancelled) return;
        const list: {
          id: string;
          owner_id: string;
          rating: number;
          review_text: string;
          created_at: string;
        }[] = reviews || [];
        const names: Record<string, string> = {};
        const ownerIds = Array.from(
          new Set(list.map((r) => r.owner_id))
        );
        if (ownerIds.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", ownerIds);
          for (const p of profs || []) names[p.id] = p.name;
        }
        if (cancelled) return;
        setReviewsByVet((prev) => ({
          ...prev,
          [effectiveId]: list.map((r) => ({
            id: r.id,
            rating: r.rating,
            review_text: r.review_text,
            created_at: r.created_at,
            reviewer: names[r.owner_id] || null,
          })),
        }));
      } catch {
        if (!cancelled)
          setReviewsByVet((prev) => ({ ...prev, [effectiveId]: [] }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveId, reviewsByVet, supabase]);

  const selectedVet = useMemo(
    () => sortedVets.find((v) => v.id === effectiveId) || null,
    [sortedVets, effectiveId]
  );

  function update(patch: Partial<FilterState>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function toggleArray(
    key: "species" | "specialization" | "serviceType",
    value: string
  ) {
    const arr = filters[key];
    const next = arr.includes(value)
      ? arr.filter((v) => v !== value)
      : [...arr, value];
    update({ [key]: next });
  }

  function clearChips() {
    update({ specialization: [], onlineOnly: false });
  }

  function clearAll() {
    setFilters({ ...DEFAULT_FILTERS });
    setCityInput("");
    setQueryInput("");
    setAppliedQuery("");
  }

  function jumpTo(section: "about" | "services" | "reviews") {
    setActiveSection(section);
    const el = document.getElementById(`fv-${section}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const allChipsActive =
    filters.specialization.length === 0 && !filters.onlineOnly;

  const selectedReviews = effectiveId ? reviewsByVet[effectiveId] : undefined;
  const selectedServices = selectedVet?.vet_services ?? [];

  const detailFacts: { icon: React.ReactNode; text: string }[] = [];
  if (selectedVet) {
    if (selectedVet.years_experience != null) {
      detailFacts.push({
        icon: <IconCalendar />,
        text: `${selectedVet.years_experience}+ Years Experience`,
      });
    }
    const loc = [selectedVet.area, selectedVet.city]
      .filter(Boolean)
      .join(", ");
    if (loc) detailFacts.push({ icon: <IconPin />, text: loc });
    detailFacts.push({
      icon: <IconClock />,
      text: selectedVet.online ? "Available Now" : "Not accepting bookings",
    });
    if (selectedVet.species_treated && selectedVet.species_treated.length > 0) {
      detailFacts.push({
        icon: <IconPaw />,
        text: selectedVet.species_treated.join(", "),
      });
    }
    detailFacts.push({
      icon: <IconRupee />,
      text: `Consultation ${formatPrice(selectedVet.consultation_price)}`,
    });
  }

  return (
    <div className="fv-page">
      <div className="fv-bg" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="fv-bg-l" src="/images/hero-pets.jpg" alt="" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="fv-bg-r" src="/images/cat-closeup.jpg" alt="" />
      </div>

      <div className="fv-wrap">
        {/* Hero */}
        <section className="fv-hero">
          <p className="fv-eyebrow">
            Trusted veterinarians for a happier, healthier life
          </p>
          <h1 className="fv-title">Find the right vet for your pet</h1>
          <p className="fv-sub">
            Search trusted veterinarians near you and get the care your pet
            deserves.
          </p>

          <form
            className="fv-searchrow"
            onSubmit={(e) => {
              e.preventDefault();
              applySearch();
            }}
          >
            <label className="fv-input fv-input-q">
              <IconSearch />
              <input
                type="search"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Search by vet name, specialty, or service..."
                aria-label="Search by vet name, specialty, or service"
              />
            </label>
            <label className="fv-input fv-input-loc">
              <IconPin />
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="Search by city..."
                aria-label="Search by city"
              />
            </label>
            <button className="fv-searchbtn" type="submit">
              Search
            </button>
          </form>

          <div className="fv-chips" role="group" aria-label="Quick filters">
            <button
              type="button"
              className={`fv-chip${allChipsActive ? " active" : ""}`}
              onClick={clearChips}
            >
              All
            </button>
            <button
              type="button"
              className={`fv-chip${filters.onlineOnly ? " active" : ""}`}
              onClick={() => update({ onlineOnly: !filters.onlineOnly })}
            >
              Available Now
            </button>
            {SPECIALIZATION_CHIPS.map((s) => (
              <button
                key={s}
                type="button"
                className={`fv-chip${
                  filters.specialization.includes(s) ? " active" : ""
                }`}
                onClick={() => toggleArray("specialization", s)}
              >
                {s}
              </button>
            ))}
            <button
              type="button"
              className="fv-chip fv-chip-more"
              onClick={() => setShowMore(!showMore)}
              aria-expanded={showMore}
            >
              <IconSliders />
              More filters
              {activeFilterCount > 0 && (
                <span className="fv-badge">{activeFilterCount}</span>
              )}
            </button>
          </div>

          {showMore && (
            <div className="fv-more">
              <div className="fv-morehead">
                <span>All filters</span>
                <button
                  type="button"
                  className="fv-moreclose"
                  onClick={() => setShowMore(false)}
                  aria-label="Close filters"
                >
                  ×
                </button>
              </div>

              <div className="fv-fgroup">
                <span className="fv-flabel">Species</span>
                <div className="fv-frow">
                  {COMMON_SPECIES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`filter-btn${
                        filters.species.includes(s) ? " active" : ""
                      }`}
                      onClick={() => toggleArray("species", s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fv-fgroup">
                <span className="fv-flabel">Specialization</span>
                <div className="fv-frow">
                  {SPECIALIZATIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`filter-btn${
                        filters.specialization.includes(s) ? " active" : ""
                      }`}
                      onClick={() => toggleArray("specialization", s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fv-fgroup">
                <span className="fv-flabel">Consultation Type</span>
                <div className="fv-frow">
                  {SERVICE_TYPES.map((st) => (
                    <button
                      key={st.value}
                      type="button"
                      className={`filter-btn${
                        filters.serviceType.includes(st.value) ? " active" : ""
                      }`}
                      onClick={() => toggleArray("serviceType", st.value)}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fv-fgroup">
                <span className="fv-flabel">Price Range (₹)</span>
                <div className="fv-frow">
                  <input
                    className="fv-num"
                    type="number"
                    placeholder="Min"
                    min={0}
                    value={filters.minPrice || ""}
                    onChange={(e) =>
                      update({ minPrice: Number(e.target.value) || 0 })
                    }
                  />
                  <span className="fv-dash">—</span>
                  <input
                    className="fv-num"
                    type="number"
                    placeholder="Max"
                    min={0}
                    value={filters.maxPrice === 10000 ? "" : filters.maxPrice}
                    onChange={(e) =>
                      update({ maxPrice: Number(e.target.value) || 10000 })
                    }
                  />
                </div>
              </div>

              <div className="fv-fgroup">
                <span className="fv-flabel">Minimum Rating</span>
                <div className="fv-frow">
                  {RATING_OPTIONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      className={`filter-btn${
                        filters.minRating === r.value ? " active" : ""
                      }`}
                      onClick={() => update({ minRating: r.value })}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fv-fgroup">
                <span className="fv-flabel">Experience</span>
                <div className="fv-frow">
                  {EXPERIENCE_OPTIONS.map((e) => (
                    <button
                      key={e.value}
                      type="button"
                      className={`filter-btn${
                        filters.minExperience === e.value ? " active" : ""
                      }`}
                      onClick={() =>
                        update({
                          minExperience:
                            filters.minExperience === e.value ? 0 : e.value,
                        })
                      }
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fv-fgroup">
                <label className="fv-check">
                  <input
                    type="checkbox"
                    checked={filters.onlineOnly}
                    onChange={(e) => update({ onlineOnly: e.target.checked })}
                  />
                  Online now
                </label>
              </div>

              <div className="fv-factions">
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: "10px 16px", fontSize: "0.86rem" }}
                  onClick={clearAll}
                >
                  Clear all
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: "10px 16px", fontSize: "0.86rem" }}
                  onClick={() => setFilters({ ...filters })}
                >
                  Apply filters
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Results */}
        <section className="fv-results">
          <div className="fv-grid">
            {/* List column */}
            <div className="fv-listcard">
              <div className="fv-listhead">
                <div>
                  <h2>Veterinarians Near You</h2>
                  <p>
                    {loading ? (
                      "Loading vets..."
                    ) : (
                      <>
                        {sortedVets.length} veterinarian
                        {sortedVets.length !== 1 ? "s" : ""} found
                        {activeFilterCount > 0 && (
                          <span className="fv-filteractive">
                            {" "}
                            · {activeFilterCount} filter
                            {activeFilterCount !== 1 ? "s" : ""} active
                          </span>
                        )}
                      </>
                    )}
                  </p>
                </div>
                <label className="fv-sortwrap">
                  Sort by:
                  <select
                    className="fv-sort"
                    value={sort}
                    onChange={(e) =>
                      setSort(e.target.value as "relevance" | "rating" | "price")
                    }
                    aria-label="Sort veterinarians"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="rating">Highest rating</option>
                    <option value="price">Lowest price</option>
                  </select>
                </label>
              </div>

              {loading && (
                <div className="fv-rows">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="fv-skrow">
                      <span className="fv-skavatar" />
                      <span className="fv-sklines">
                        <i style={{ width: "34%" }} />
                        <i style={{ width: "58%" }} />
                        <i style={{ width: "42%" }} />
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {!loading && error && (
                <div className="fv-state">
                  <div className="fv-stateicon">⚠️</div>
                  <p className="fv-statetext">{error}</p>
                  <button
                    className="btn-primary"
                    onClick={() => window.location.reload()}
                    style={{ fontSize: "0.9rem" }}
                  >
                    Try again
                  </button>
                </div>
              )}

              {!loading && !error && sortedVets.length === 0 && (
                <div className="fv-state">
                  <div className="fv-stateicon">🔍</div>
                  <h3>No vets match your filters</h3>
                  <p className="fv-statetext">
                    Try adjusting your search criteria or clear all filters to
                    see all available vets.
                  </p>
                  <button
                    className="btn-secondary"
                    onClick={clearAll}
                    style={{ fontSize: "0.9rem" }}
                  >
                    Clear all filters
                  </button>
                </div>
              )}

              {!loading && !error && sortedVets.length > 0 && (
                <div className="fv-rows">
                  {sortedVets.map((vet) => (
                    <button
                      key={vet.id}
                      type="button"
                      className={`fv-row${effectiveId === vet.id ? " sel" : ""}`}
                      onClick={() => setSelectedId(vet.id)}
                      aria-pressed={effectiveId === vet.id}
                    >
                      <VetAvatar vet={vet} className="fv-rowavatar" />
                      <span className="fv-rowbody">
                        <span
                          className={`fv-rowstatus${vet.online ? "" : " off"}`}
                        >
                          <i />
                          {vet.online ? "Available Now" : "Not Available Now"}
                        </span>
                        <span className="fv-rowname">Dr. {vetName(vet)}</span>
                        {vet.specialization && (
                          <span className="fv-rowspec">{vet.specialization}</span>
                        )}
                        <span className="fv-rowmeta">
                          <span className="fv-starwrap">
                            <IconStar size={13} />
                          </span>
                          <b>{vet.rating}</b>
                          <span>({vet.review_count} reviews)</span>
                        </span>
                      </span>
                      <span className="fv-rowchev" aria-hidden="true">
                        <IconChevron />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Detail column */}
            <aside className="fv-detail">
              {loading && (
                <div className="fv-panel">
                  <div className="fv-skpanel">
                    <span className="fv-skavatar big" />
                    <span className="fv-sklines">
                      <i style={{ width: "55%" }} />
                      <i style={{ width: "38%" }} />
                      <i style={{ width: "46%" }} />
                    </span>
                  </div>
                </div>
              )}

              {!loading && selectedVet && (
                <div className="fv-panel">
                  <div className="fv-phead">
                    <VetAvatar vet={selectedVet} className="fv-pavatar" />
                    <div className="fv-pinfo">
                      <h3 className="fv-pname">
                        Dr. {vetName(selectedVet)}
                        {selectedVet.verified && <VerifiedBadge />}
                      </h3>
                      {selectedVet.specialization && (
                        <p className="fv-pmeta">
                          <IconPin />
                          {selectedVet.specialization}
                        </p>
                      )}
                      {[selectedVet.area, selectedVet.city]
                        .filter(Boolean)
                        .join(", ") && (
                        <p className="fv-pmeta">
                          <IconPin />
                          {[selectedVet.area, selectedVet.city]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                      <p className="fv-pmeta">
                        <span className="fv-starwrap">
                          <IconStar size={15} />
                        </span>
                        <b className="fv-prating">{selectedVet.rating}</b>
                        ({selectedVet.review_count} reviews)
                      </p>
                      <span
                        className={`fv-status${selectedVet.online ? "" : " off"}`}
                      >
                        <i />
                        {selectedVet.online
                          ? "Available Now"
                          : "Not Available Now"}
                      </span>
                    </div>
                    <div className="fv-pcta">
                      <button
                        type="button"
                        className="fv-cta"
                        onClick={() => setBookingVet(selectedVet)}
                      >
                        Start Consultation <IconArrow />
                      </button>
                      <Link
                        className="fv-profilelink"
                        href={`/vets/${selectedVet.id}`}
                      >
                        View full profile
                      </Link>
                    </div>
                  </div>

                  <div className="fv-tabs" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeSection === "about"}
                      className={`fv-tab${activeSection === "about" ? " on" : ""}`}
                      onClick={() => jumpTo("about")}
                    >
                      About
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeSection === "services"}
                      className={`fv-tab${
                        activeSection === "services" ? " on" : ""
                      }`}
                      onClick={() => jumpTo("services")}
                    >
                      Services
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeSection === "reviews"}
                      className={`fv-tab${
                        activeSection === "reviews" ? " on" : ""
                      }`}
                      onClick={() => jumpTo("reviews")}
                    >
                      Reviews
                    </button>
                  </div>

                  <div className="fv-about" id="fv-about">
                    <div>
                      <h4>About Dr. {vetName(selectedVet)}</h4>
                      <p>
                        {selectedVet.bio?.trim() ||
                          "No bio has been provided yet."}
                      </p>
                    </div>
                    <div className="fv-facts">
                      {detailFacts.map((f, i) => (
                        <div className="fv-fact" key={i}>
                          {f.icon}
                          <span>{f.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="fv-section" id="fv-services">
                    <h4>Services</h4>
                    {selectedServices.length > 0 ? (
                      <div className="fv-services">
                        {selectedServices.map((svc) => (
                          <span className="fv-servicechip" key={svc.id}>
                            {svc.title?.trim() ||
                              SERVICE_LABELS[svc.service_type] ||
                              "Service"}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="fv-muted">
                        No services have been listed yet.
                      </p>
                    )}
                  </div>

                  <div className="fv-section" id="fv-reviews">
                    <h4>Reviews</h4>
                    {selectedReviews === undefined ? (
                      <p className="fv-muted">Loading reviews…</p>
                    ) : selectedReviews.length > 0 ? (
                      <div>
                        {selectedReviews.map((r) => (
                          <div className="fv-review" key={r.id}>
                            <div className="fv-reviewhead">
                              <span className="fv-ravatar">
                                {(r.reviewer || "U").charAt(0).toUpperCase()}
                              </span>
                              <span className="fv-rname">
                                {r.reviewer || "Pet owner"}
                              </span>
                              <span className="fv-rstars">
                                {starString(r.rating)}
                              </span>
                              <span className="fv-rdate">
                                {new Date(r.created_at).toLocaleDateString(
                                  undefined,
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                )}
                              </span>
                            </div>
                            <p className="fv-rtext">{r.review_text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="fv-muted">No reviews yet.</p>
                    )}
                  </div>
                </div>
              )}

              {!loading && !selectedVet && (
                <div className="fv-panel">
                  <div className="fv-state noborder">
                    <div className="fv-stateicon">🐾</div>
                    <h3>No veterinarian selected</h3>
                    <p className="fv-statetext">
                      {error
                        ? "Veterinarians could not be loaded."
                        : "Pick a veterinarian from the list to see their details."}
                    </p>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </section>
      </div>

      {/* Booking modal */}
      {bookingVet && (
        <BookingModal vet={bookingVet} onClose={() => setBookingVet(null)} />
      )}

      <style>{`
        .fv-page { position: relative; min-height: 100vh; }
        .fv-bg { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
        .fv-bg img { position: absolute; top: 0; height: 100%; object-fit: cover; }
        .fv-bg-l {
          left: 0;
          width: clamp(280px, 30vw, 470px);
          object-position: 58% 30%;
          filter: brightness(2.1) saturate(0.78) contrast(0.7) sepia(0.2);
          opacity: 0.47;
          -webkit-mask-image:
            linear-gradient(to right, #000 42%, transparent 98%),
            linear-gradient(to bottom, #000 45%, transparent 88%);
          mask-image:
            linear-gradient(to right, #000 42%, transparent 98%),
            linear-gradient(to bottom, #000 45%, transparent 88%);
          -webkit-mask-composite: source-in;
          mask-composite: intersect;
        }
        .fv-bg-r {
          right: -6px;
          width: clamp(170px, 21vw, 340px);
          object-position: 45% 30%;
          filter: brightness(1.5) saturate(0.75) contrast(0.85) blur(4px);
          opacity: 0.28;
          -webkit-mask-image:
            linear-gradient(to left, #000 40%, transparent 98%),
            linear-gradient(to bottom, #000 45%, transparent 88%);
          mask-image:
            linear-gradient(to left, #000 40%, transparent 98%),
            linear-gradient(to bottom, #000 45%, transparent 88%);
          -webkit-mask-composite: source-in;
          mask-composite: intersect;
        }
        footer { position: relative; z-index: 1; }

        .fv-wrap { position: relative; z-index: 1; max-width: 1440px; margin: 0 auto; padding: 0 12px; }

        .fv-hero { padding: 40px 0 0 clamp(0px, 26vw, 400px); text-align: center; }
        .fv-eyebrow {
          font-size: 0.8rem; font-weight: 700; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--amber-dark); margin-bottom: 14px;
          padding-right: 130px;
        }
        .fv-title {
          font-family: var(--font-fraunces), Fraunces, serif;
          font-weight: 600; font-size: clamp(2rem, 3.2vw, 3rem);
          line-height: 1.08; color: var(--deep); margin-bottom: 12px;
          padding-right: 130px;
        }
        .fv-sub {
          font-size: clamp(1rem, 1.15vw, 1.12rem); color: var(--ink-soft);
          line-height: 1.55; max-width: 850px; margin: 0 auto 24px;
          padding-right: 130px;
        }

        .fv-searchrow { display: flex; gap: 14px; max-width: 1040px; margin: 0 auto; }
        .fv-input {
          flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px;
          height: 58px; padding: 0 18px; background: var(--white);
          border: 1px solid #E4DFCC; border-radius: 15px; cursor: text;
        }
        .fv-input svg { flex: none; color: #8A9187; }
        .fv-input input {
          flex: 1; min-width: 0; border: none; background: none; outline: none;
          font: inherit; font-size: 0.98rem; color: var(--ink); width: 100%;
        }
        .fv-input input::placeholder { color: #9AA096; }
        .fv-input:focus-within { border-color: var(--deep); }
        .fv-input-loc { flex: 0 1 240px; }
        .fv-searchbtn {
          flex: none; width: 170px; height: 58px; background: var(--deep);
          color: var(--white); border: none; border-radius: 15px; font: inherit;
          font-size: 1rem; font-weight: 600; cursor: pointer;
          transition: background 0.15s ease;
        }
        .fv-searchbtn:hover { background: var(--deep-2); }

        .fv-chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
        .fv-chip {
          display: inline-flex; align-items: center; gap: 7px; height: 40px;
          padding: 0 18px; border-radius: 999px; background: var(--white);
          border: 1px solid rgba(28, 42, 33, 0.16); color: var(--ink-soft);
          font: inherit; font-size: 0.84rem; font-weight: 600; cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
        }
        .fv-chip:hover { border-color: var(--deep); color: var(--deep); }
        .fv-chip.active { background: var(--deep); border-color: var(--deep); color: var(--white); }
        .fv-badge {
          background: var(--amber); color: var(--deep-2); font-size: 0.7rem;
          font-weight: 700; min-width: 18px; height: 18px; border-radius: 999px;
          display: inline-flex; align-items: center; justify-content: center; padding: 0 5px;
        }

        .fv-more {
          margin-top: 16px; text-align: left; background: var(--white);
          border: 1px solid var(--line); border-radius: 14px; padding: 22px;
          max-width: 1040px; margin-left: auto; margin-right: auto;
          box-shadow: 0 14px 34px rgba(24, 44, 32, 0.07);
          animation: fvRise 0.2s ease;
        }
        @keyframes fvRise { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
        .fv-morehead {
          display: flex; justify-content: space-between; align-items: center;
          font-weight: 700; font-size: 1.02rem; color: var(--ink); margin-bottom: 18px;
        }
        .fv-moreclose {
          background: none; border: none; font-size: 1.4rem; line-height: 1;
          color: var(--ink-soft); cursor: pointer; padding: 2px 6px;
        }
        .fv-moreclose:hover { color: var(--ink); }
        .fv-fgroup { margin-bottom: 16px; }
        .fv-flabel { font-size: 0.78rem; font-weight: 600; color: var(--ink-soft); margin-bottom: 8px; display: block; }
        .fv-frow { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
        .fv-num {
          padding: 9px 11px; border: 1px solid var(--line); border-radius: 6px;
          font: inherit; font-size: 0.88rem; width: 118px; background: var(--paper); color: var(--ink);
        }
        .fv-dash { color: var(--ink-soft); }
        .fv-check {
          display: flex; align-items: center; gap: 9px; font-size: 0.9rem;
          font-weight: 600; color: var(--ink); cursor: pointer;
        }
        .fv-check input { width: 17px; height: 17px; accent-color: var(--deep); cursor: pointer; }
        .fv-factions {
          display: flex; gap: 10px; margin-top: 20px; padding-top: 16px;
          border-top: 1px solid var(--line);
        }

        .fv-results { padding: 16px 0 90px; }
        .fv-grid {
          display: grid; grid-template-columns: minmax(0, 560px) minmax(0, 1fr);
          gap: 30px; align-items: start;
        }

        .fv-listcard {
          background: var(--white); border: 1px solid var(--line);
          border-radius: 20px; padding: 16px;
          box-shadow: 0 10px 30px rgba(24, 44, 32, 0.05);
        }
        .fv-listhead {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px; padding: 6px 6px 14px;
        }
        .fv-listhead h2 {
          font-family: var(--font-fraunces), Fraunces, serif;
          font-size: 1.08rem; font-weight: 600; color: var(--ink); margin-bottom: 3px;
        }
        .fv-listhead p { font-size: 0.82rem; color: var(--ink-soft); }
        .fv-filteractive { color: var(--ink-soft); }
        .fv-sortwrap {
          display: flex; align-items: center; gap: 4px; font-size: 0.82rem;
          color: var(--ink-soft); flex: none; height: 40px; padding: 0 8px 0 13px;
          background: var(--white); border: 1px solid var(--line);
          border-radius: 11px;
        }
        .fv-sort {
          border: none; background: none; font: inherit; font-size: 0.82rem;
          font-weight: 600; color: var(--ink); cursor: pointer; padding: 0 2px;
          outline: none;
        }

        .fv-rows { display: flex; flex-direction: column; gap: 12px; }
        .fv-row {
          display: flex; align-items: center; gap: 14px; width: 100%;
          text-align: left; padding: 11px 14px; background: var(--white);
          border: 1px solid #E6E1D0; border-radius: 14px; cursor: pointer;
          font: inherit; color: inherit;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .fv-row:hover { border-color: #AFBCAC; }
        .fv-row.sel { border: 2px solid #3F7C55; background: #EEF6EE; padding: 10px 13px; }
        .fv-rowavatar {
          flex: none; width: 138px; height: 86px; border-radius: 10px;
          background: var(--deep); color: var(--white);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-fraunces), Fraunces, serif;
          font-size: 1.6rem; font-weight: 600; overflow: hidden;
        }
        .fv-rowavatar img, .fv-pavatar img { width: 100%; height: 100%; object-fit: cover; }
        .fv-rowbody { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .fv-rowstatus {
          display: flex; align-items: center; gap: 6px; font-size: 0.72rem;
          font-weight: 700; color: #3F7C55;
        }
        .fv-rowstatus i, .fv-status i {
          width: 7px; height: 7px; border-radius: 50%; background: #3F7C55;
          display: inline-block; flex: none;
        }
        .fv-rowstatus.off { color: #8A9187; }
        .fv-rowstatus.off i { background: #B7BCB3; }
        .fv-rowname {
          font-family: var(--font-fraunces), Fraunces, serif;
          font-weight: 600; font-size: 1.05rem; color: var(--ink);
        }
        .fv-rowspec { font-size: 0.82rem; color: var(--ink-soft); }
        .fv-rowmeta {
          display: flex; align-items: center; gap: 5px; font-size: 0.8rem;
          color: var(--ink-soft); margin-top: 3px;
        }
        .fv-rowmeta b { color: var(--ink); font-size: 0.84rem; }
        .fv-starwrap { color: var(--amber); display: inline-flex; }
        .fv-rowchev {
          flex: none; width: 34px; height: 34px; border-radius: 50%;
          background: var(--paper); border: 1px solid var(--line);
          display: flex; align-items: center; justify-content: center;
          color: var(--ink-soft);
        }

        .fv-panel {
          background: var(--white); border: 1px solid var(--line);
          border-radius: 20px; padding: 26px;
          box-shadow: 0 10px 30px rgba(24, 44, 32, 0.05);
        }
        .fv-phead { display: flex; gap: 22px; align-items: center; }
        .fv-pavatar {
          flex: none; width: 210px; height: 160px; border-radius: 14px;
          background: var(--deep); color: var(--white);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-fraunces), Fraunces, serif;
          font-size: 2.6rem; font-weight: 600; overflow: hidden;
        }
        .fv-pinfo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
        .fv-pname {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
          font-family: var(--font-fraunces), Fraunces, serif;
          font-weight: 600; font-size: 1.55rem; color: var(--ink);
        }
        .fv-verified { display: inline-flex; color: #34A05A; }
        .fv-pmeta {
          display: flex; align-items: center; gap: 7px; font-size: 0.88rem;
          color: var(--ink-soft);
        }
        .fv-pmeta > svg { color: #8A9187; flex: none; }
        .fv-prating { color: var(--ink); font-size: 0.95rem; }
        .fv-status {
          display: inline-flex; align-items: center; gap: 6px; align-self: flex-start;
          background: #EAF5EB; color: #2F7A50; font-size: 0.76rem; font-weight: 700;
          padding: 5px 11px; border-radius: 999px;
        }
        .fv-status.off { background: var(--paper-2); color: var(--ink-soft); }
        .fv-status.off i { background: #B7BCB3; }
        .fv-pcta { flex: none; display: flex; flex-direction: column; gap: 10px; width: 215px; }
        .fv-cta {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: var(--deep); color: var(--white); border: none;
          border-radius: 12px; height: 50px; font: inherit; font-weight: 600;
          font-size: 0.95rem; cursor: pointer; transition: background 0.15s ease;
        }
        .fv-cta:hover { background: var(--deep-2); }
        .fv-profilelink {
          text-align: center; font-size: 0.85rem; font-weight: 600;
          color: var(--ink-soft); text-decoration: none; padding: 5px 0;
          transition: color 0.15s ease;
        }
        .fv-profilelink:hover { color: var(--deep); text-decoration: underline; }

        .fv-tabs {
          display: flex; gap: 26px; border-bottom: 1px solid var(--line);
          margin-top: 26px;
        }
        .fv-tab {
          padding: 12px 2px; font: inherit; font-size: 0.9rem; font-weight: 600;
          color: var(--ink-soft); background: none; border: none;
          border-bottom: 2px solid transparent; margin-bottom: -1px; cursor: pointer;
        }
        .fv-tab:hover { color: var(--ink); }
        .fv-tab.on { color: var(--ink); border-bottom-color: var(--ink); }

        .fv-about {
          display: grid; grid-template-columns: minmax(0, 1fr) 275px; gap: 24px;
          padding-top: 22px; scroll-margin-top: 96px;
        }
        .fv-about h4, .fv-section h4 {
          font-size: 1rem; font-weight: 700; color: var(--ink); margin-bottom: 10px;
        }
        .fv-about p { font-size: 0.92rem; line-height: 1.65; color: var(--ink-soft); }
        .fv-facts {
          background: #FBFAF2; border: 1px solid var(--line); border-radius: 12px;
          padding: 16px; display: flex; flex-direction: column; gap: 13px;
          height: fit-content;
        }
        .fv-fact { display: flex; align-items: center; gap: 10px; font-size: 0.86rem; color: var(--ink); }
        .fv-fact svg { color: #7A8578; flex: none; }
        .fv-section { padding-top: 26px; scroll-margin-top: 96px; }
        .fv-services { display: flex; flex-wrap: wrap; gap: 9px; }
        .fv-servicechip {
          border: 1px solid var(--line); background: var(--white);
          border-radius: 999px; padding: 8px 14px; font-size: 0.82rem;
          font-weight: 600; color: var(--ink);
        }
        .fv-muted { color: var(--ink-soft); font-size: 0.9rem; }

        .fv-review {
          border: 1px solid var(--line); background: var(--paper);
          border-radius: 12px; padding: 14px 16px; margin-bottom: 10px;
        }
        .fv-reviewhead { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
        .fv-ravatar {
          width: 32px; height: 32px; border-radius: 50%; background: var(--deep);
          color: #fff; display: flex; align-items: center; justify-content: center;
          font-size: 0.78rem; font-weight: 700;
        }
        .fv-rname { font-weight: 700; font-size: 0.88rem; color: var(--ink); }
        .fv-rstars { color: var(--amber); font-size: 0.8rem; letter-spacing: 2px; }
        .fv-rdate { font-size: 0.75rem; color: var(--ink-soft); margin-left: auto; }
        .fv-rtext { font-size: 0.88rem; color: var(--ink-soft); line-height: 1.55; }

        .fv-state {
          background: var(--white); border: 1px dashed var(--line);
          border-radius: 16px; padding: 40px 24px; text-align: center;
        }
        .fv-state.noborder { border: none; background: transparent; padding: 48px 12px; }
        .fv-stateicon { font-size: 1.8rem; margin-bottom: 12px; }
        .fv-state h3 {
          font-family: var(--font-fraunces), Fraunces, serif;
          font-size: 1.15rem; margin-bottom: 8px; color: var(--ink);
        }
        .fv-statetext { color: var(--ink-soft); font-size: 0.9rem; margin-bottom: 18px; }
        .fv-state .fv-statetext:last-child { margin-bottom: 0; }

        .fv-skrow {
          display: flex; gap: 14px; align-items: center; padding: 13px 14px;
          border: 1px solid var(--line); border-radius: 14px;
        }
        .fv-skpanel { display: flex; gap: 22px; align-items: center; }
        .fv-skavatar {
          flex: none; width: 138px; height: 92px; border-radius: 10px;
          background: var(--paper-2); animation: pulse-bg 1.5s ease-in-out infinite alternate;
        }
        .fv-skavatar.big { width: 210px; height: 160px; border-radius: 14px; }
        .fv-sklines { flex: 1; display: flex; flex-direction: column; gap: 9px; }
        .fv-sklines i {
          display: block; height: 13px; background: var(--paper-2); border-radius: 4px;
          animation: pulse-bg 1.5s ease-in-out infinite alternate;
        }
        @keyframes pulse-bg { from { opacity: 0.6; } to { opacity: 1; } }

        @media (max-width: 1100px) {
          .fv-hero { padding-left: 0; }
          .fv-eyebrow, .fv-title, .fv-sub { padding-right: 0; }
          .fv-bg { display: none; }
        }
        @media (max-width: 980px) {
          .fv-grid { grid-template-columns: 1fr; }
          .fv-phead { flex-wrap: wrap; }
          .fv-pcta { width: 100%; flex-direction: row; }
          .fv-pcta > * { flex: 1; }
          .fv-about { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .fv-hero { padding-top: 40px; }
          .fv-searchrow { flex-wrap: wrap; }
          .fv-input-q { flex: 1 1 100%; }
          .fv-input-loc { flex: 1 1 auto; }
          .fv-searchbtn { flex: 1 1 auto; width: auto; }
          .fv-listhead { flex-direction: column; }
          .fv-pavatar { width: 140px; height: 105px; font-size: 1.9rem; }
          .fv-rowavatar { width: 96px; height: 74px; font-size: 1.25rem; }
          .fv-panel { padding: 18px; }
        }
        @media (max-width: 480px) {
          .fv-title { font-size: 1.72rem; }
          .fv-input { height: 54px; padding: 0 14px; }
          .fv-searchbtn { height: 54px; }
          .fv-listcard { padding: 12px; }
          .fv-row { gap: 10px; padding: 11px 10px; }
          .fv-row.sel { padding: 10px 9px; }
          .fv-rowavatar { width: 76px; height: 64px; font-size: 1.05rem; }
          .fv-rowchev { display: none; }
          .fv-phead { gap: 14px; }
          .fv-pavatar { width: 110px; height: 88px; font-size: 1.5rem; }
          .fv-pname { font-size: 1.2rem; }
          .fv-tabs { gap: 18px; }
        }
      `}</style>
    </div>
  );
}

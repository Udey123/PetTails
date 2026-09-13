"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import SearchFilters, { type FilterState } from "@/components/search/SearchFilters";
import { VetCard } from "@/components/vets/VetCard";
import { BookingModal } from "@/components/booking/BookingModal";
import type { Vet, VetService } from "@/lib/types";

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

export default function VetsBrowsePage() {
  const supabase = createClient();

  const [vets, setVets] = useState<Vet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [bookingVet, setBookingVet] = useState<Vet | null>(null);

  useEffect(() => {
    const fetchVets = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/vets");
        if (!res.ok) throw new Error("Failed to load vets");
        const data = await res.json();

        const vetIds: string[] = data.map((v: Vet) => v.id);

        let servicesMap: Record<string, VetService[]> = {};
        if (vetIds.length > 0) {
          const { data: services } = await supabase
            .from("vet_services")
            .select("*")
            .eq("is_active", true)
            .in("vet_id", vetIds);

          if (services) {
            for (const svc of services) {
              if (!servicesMap[svc.vet_id]) servicesMap[svc.vet_id] = [];
              servicesMap[svc.vet_id].push(svc);
            }
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
  }, [supabase]);

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
        if (!filters.serviceType.some((st) => vetServiceTypes.includes(st as any))) {
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

      return true;
    });
  }, [vets, filters]);

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

  return (
    <>
      {/* Hero */}
      <section
        style={{
          padding: "56px 0 48px",
          background: "var(--deep)",
          color: "var(--white)",
        }}
      >
        <div className="wrap" style={{ textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "var(--font-fraunces), Fraunces, serif",
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              fontWeight: 600,
              marginBottom: 12,
              color: "var(--white)",
            }}
          >
            Find a Vet
          </h1>
          <p
            style={{
              fontSize: "1.05rem",
              color: "#B9C7BF",
              maxWidth: 520,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            Browse verified veterinarians and book a consultation for your pet
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section style={{ padding: "36px 0 84px" }}>
        <div className="wrap">
          <div
            className="vets-browse-layout"
            style={{
              display: "grid",
              gridTemplateColumns: "280px 1fr",
              gap: 32,
              alignItems: "start",
            }}
          >
            {/* Sidebar */}
            <aside className="vets-sidebar" style={{ position: "sticky", top: 24 }}>
              <SearchFilters filters={filters} onFilterChange={setFilters} />
            </aside>

            {/* Results */}
            <div>
              {/* Results header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: "0.95rem", color: "var(--ink-soft)" }}>
                  {loading ? (
                    "Loading vets..."
                  ) : (
                    <>
                      <span style={{ fontWeight: 700, color: "var(--ink)" }}>
                        {filteredVets.length}
                      </span>{" "}
                      vet{filteredVets.length !== 1 ? "s" : ""} found
                      {activeFilterCount > 0 && (
                        <span style={{ marginLeft: 8, fontSize: "0.82rem" }}>
                          ({activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active)
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Loading state */}
              {loading && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                    gap: 20,
                  }}
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: "var(--radius-m)",
                        background: "var(--white)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          aspectRatio: "16/11",
                          background: "var(--paper-2)",
                          animation: "pulse-bg 1.5s ease-in-out infinite alternate",
                        }}
                      />
                      <div style={{ padding: 18 }}>
                        <div
                          style={{
                            height: 18,
                            width: "60%",
                            background: "var(--paper-2)",
                            borderRadius: 4,
                            marginBottom: 10,
                          }}
                        />
                        <div
                          style={{
                            height: 14,
                            width: "40%",
                            background: "var(--paper-2)",
                            borderRadius: 4,
                            marginBottom: 14,
                          }}
                        />
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            marginBottom: 14,
                          }}
                        >
                          {[1, 2, 3].map((j) => (
                            <div
                              key={j}
                              style={{
                                height: 24,
                                width: 56,
                                background: "var(--paper-2)",
                                borderRadius: 100,
                              }}
                            />
                          ))}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              height: 38,
                              background: "var(--paper-2)",
                              borderRadius: "var(--radius-s)",
                            }}
                          />
                          <div
                            style={{
                              flex: 1,
                              height: 38,
                              background: "var(--paper-2)",
                              borderRadius: "var(--radius-s)",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error state */}
              {!loading && error && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "48px 24px",
                    border: "1px dashed var(--line)",
                    borderRadius: "var(--radius-m)",
                    background: "var(--white)",
                  }}
                >
                  <div style={{ fontSize: "1.8rem", marginBottom: 12 }}>⚠️</div>
                  <p
                    style={{
                      color: "var(--ink-soft)",
                      fontSize: "0.95rem",
                      marginBottom: 18,
                    }}
                  >
                    {error}
                  </p>
                  <button
                    className="btn-primary"
                    onClick={() => window.location.reload()}
                    style={{ fontSize: "0.9rem" }}
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Empty state */}
              {!loading && !error && filteredVets.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "48px 24px",
                    border: "1px dashed var(--line)",
                    borderRadius: "var(--radius-m)",
                    background: "var(--white)",
                  }}
                >
                  <div style={{ fontSize: "2.2rem", marginBottom: 14 }}>🔍</div>
                  <h3
                    style={{
                      fontFamily: "var(--font-fraunces), Fraunces, serif",
                      fontSize: "1.2rem",
                      marginBottom: 8,
                    }}
                  >
                    No vets match your filters
                  </h3>
                  <p
                    style={{
                      color: "var(--ink-soft)",
                      fontSize: "0.92rem",
                      marginBottom: 20,
                      maxWidth: 400,
                      margin: "0 auto 20px",
                    }}
                  >
                    Try adjusting your search criteria or clear all filters to see
                    all available vets.
                  </p>
                  <button
                    className="btn-secondary"
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    style={{ fontSize: "0.9rem" }}
                  >
                    Clear all filters
                  </button>
                </div>
              )}

              {/* Vet grid */}
              {!loading && !error && filteredVets.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                    gap: 20,
                  }}
                >
                  {filteredVets.map((vet) => (
                    <VetCard
                      key={vet.id}
                      vet={vet}
                      onBook={() => setBookingVet(vet)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Booking modal */}
      {bookingVet && (
        <BookingModal vet={bookingVet} onClose={() => setBookingVet(null)} />
      )}

      <style>{`
        @keyframes pulse-bg {
          from { opacity: 0.6; }
          to { opacity: 1; }
        }
        @media (max-width: 768px) {
          .vets-browse-layout {
            grid-template-columns: 1fr !important;
          }
          .vets-sidebar {
            position: static !important;
          }
        }
      `}</style>
    </>
  );
}

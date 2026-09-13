"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Vet, VetService, Review, VetAvailability } from "@/lib/types";
import { formatPrice, formatDate, SERVICE_LABELS, SERVICE_ICONS, DAYS_SHORT } from "@/lib/utils";
import { BookingModal } from "@/components/booking/BookingModal";

interface VetProfileData extends Vet {
  vet_services: VetService[];
  reviews: (Review & { profiles?: { name: string } })[];
  availability: VetAvailability[];
}

const AVATAR_COLORS = ["#123832", "#C6842A", "#C9727A", "#4C8B5B", "#1C2A21"];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function renderStars(rating: number) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3;
  const stars: string[] = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push("★");
    else if (i === full && half) stars.push("★");
    else stars.push("☆");
  }
  return stars.join("");
}

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function VetProfilePage() {
  const params = useParams();
  const vetId = params.id as string;

  const [vet, setVet] = useState<VetProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => {
    if (!vetId) return;

    const fetchVet = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/vets/${vetId}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setVet(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchVet();
  }, [vetId]);

  if (loading) {
    return (
      <div style={{ padding: "84px 0", textAlign: "center" }}>
        <div className="wrap">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
            <div className="pulse" />
            <p style={{ color: "var(--ink-soft)", fontSize: "1.05rem" }}>Loading profile…</p>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !vet) {
    return (
      <div style={{ padding: "84px 0", textAlign: "center" }}>
        <div className="wrap">
          <div style={{ maxWidth: 420, margin: "0 auto" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--paper-2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                fontSize: "1.6rem",
                color: "var(--ink-soft)",
              }}
            >
              ?
            </div>
            <h2 style={{ fontSize: "1.6rem", marginBottom: 10 }}>Vet not found</h2>
            <p style={{ color: "var(--ink-soft)", fontSize: "0.95rem", marginBottom: 24 }}>
              This profile may have been removed or the link may be incorrect.
            </p>
            <a href="/" className="btn-primary" style={{ textDecoration: "none", display: "inline-block" }}>
              Back to home
            </a>
          </div>
        </div>
      </div>
    );
  }

  const vetName = vet.profiles?.name || vet.display_name || "Unknown Vet";
  const initials = getInitials(vetName);
  const avatarColor = getAvatarColor(vet.id);
  const location = [vet.area, vet.city].filter(Boolean).join(", ");

  const availabilityByDay = vet.availability.reduce(
    (acc, slot) => {
      if (!acc[slot.day_of_week]) acc[slot.day_of_week] = [];
      acc[slot.day_of_week].push(slot);
      return acc;
    },
    {} as Record<number, VetAvailability[]>
  );

  return (
    <>
      {/* PROFILE HEADER */}
      <section style={{ padding: "48px 0 52px", borderBottom: "1px solid var(--line)" }}>
        <div className="wrap">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 28,
              alignItems: "start",
            }}
            className="vet-profile-header"
          >
            {/* Avatar */}
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: vet.profiles?.avatar_url ? "var(--paper-2)" : avatarColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Fraunces', serif",
                fontSize: "2.2rem",
                fontWeight: 600,
                color: "var(--white)",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {vet.profiles?.avatar_url ? (
                <img
                  src={vet.profiles.avatar_url}
                  alt={vetName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                initials
              )}
            </div>

            {/* Info */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1
                  style={{
                    fontSize: "clamp(1.5rem, 3vw, 2rem)",
                    lineHeight: 1.15,
                  }}
                >
                  Dr. {vetName}
                </h1>
                {vet.verified && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 10px",
                      borderRadius: 100,
                      background: "#4C8B5B22",
                      color: "#4C8B5B",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                    }}
                  >
                    ✓ Verified
                  </span>
                )}
                {vet.online && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 10px",
                      borderRadius: 100,
                      background: "var(--white)",
                      color: "var(--ink)",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      border: "1px solid var(--line)",
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "#4C8B5B",
                      }}
                    />
                    Online now
                  </span>
                )}
              </div>

              {vet.professional_title && (
                <div style={{ color: "var(--ink-soft)", fontSize: "0.95rem", marginTop: 4 }}>
                  {vet.professional_title}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                  marginTop: 12,
                  fontSize: "0.9rem",
                  color: "var(--ink-soft)",
                }}
              >
                <span style={{ color: "var(--amber-dark)", fontWeight: 600 }}>
                  {renderStars(vet.rating)} {vet.rating.toFixed(1)}
                </span>
                <span>
                  {vet.review_count} review{vet.review_count !== 1 ? "s" : ""}
                </span>
                <span style={{ color: "var(--line)" }}>|</span>
                <span>{vet.total_consultations} consultations</span>
                {vet.years_experience != null && (
                  <>
                    <span style={{ color: "var(--line)" }}>|</span>
                    <span>{vet.years_experience} yrs experience</span>
                  </>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                  marginTop: 10,
                  fontSize: "0.88rem",
                  color: "var(--ink-soft)",
                }}
              >
                {location && <span>📍 {location}</span>}
                {vet.clinic_name && <span>🏥 {vet.clinic_name}</span>}
                {vet.languages.length > 0 && (
                  <span>🌐 {vet.languages.join(", ")}</span>
                )}
              </div>
            </div>

            {/* CTA */}
            <div style={{ textAlign: "right" }} className="vet-profile-cta">
              <div
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 600,
                  fontSize: "1.5rem",
                  marginBottom: 6,
                }}
              >
                {formatPrice(vet.consultation_price)}
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 400,
                    color: "var(--ink-soft)",
                    display: "block",
                  }}
                >
                  per consultation
                </span>
              </div>
              <button
                className="btn-amber"
                style={{ padding: "14px 28px", fontSize: "1rem" }}
                onClick={() => setShowBooking(true)}
                disabled={!vet.accepting_bookings}
              >
                {vet.accepting_bookings ? "Book Consultation" : "Not accepting bookings"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <section style={{ padding: "48px 0 84px" }}>
        <div className="wrap">
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 40, alignItems: "start" }}
            className="vet-profile-grid"
          >
            {/* LEFT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
              {/* ABOUT */}
              {vet.bio && (
                <div>
                  <h2 style={{ fontSize: "1.3rem", marginBottom: 14 }}>About</h2>
                  <div className="card" style={{ padding: 22 }}>
                    <p style={{ fontSize: "0.95rem", lineHeight: 1.7, color: "var(--ink)" }}>
                      {vet.bio}
                    </p>

                    {(vet.degree || vet.university || vet.graduation_year) && (
                      <div
                        style={{
                          marginTop: 18,
                          paddingTop: 16,
                          borderTop: "1px solid var(--line)",
                        }}
                      >
                        <h3 style={{ fontSize: "0.82rem", color: "var(--ink-soft)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Education
                        </h3>
                        <div style={{ fontSize: "0.92rem" }}>
                          {vet.degree && <div style={{ fontWeight: 600 }}>{vet.degree}</div>}
                          {vet.university && <div style={{ color: "var(--ink-soft)" }}>{vet.university}</div>}
                          {vet.graduation_year && (
                            <div style={{ color: "var(--ink-soft)", fontSize: "0.85rem" }}>
                              Class of {vet.graduation_year}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {(vet.registration_number || vet.registration_council) && (
                      <div
                        style={{
                          marginTop: 16,
                          paddingTop: 16,
                          borderTop: "1px solid var(--line)",
                        }}
                      >
                        <h3 style={{ fontSize: "0.82rem", color: "var(--ink-soft)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Registration
                        </h3>
                        <div style={{ fontSize: "0.92rem" }}>
                          {vet.registration_council && (
                            <div style={{ color: "var(--ink-soft)" }}>{vet.registration_council}</div>
                          )}
                          {vet.registration_number && (
                            <div style={{ fontFamily: "monospace", fontSize: "0.88rem", color: "var(--ink-soft)" }}>
                              {vet.registration_number}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SPECIALIZATIONS */}
              {vet.specializations.length > 0 && (
                <div>
                  <h2 style={{ fontSize: "1.3rem", marginBottom: 14 }}>Specializations</h2>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {vet.specializations.map((spec) => (
                      <span
                        key={spec}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 100,
                          background: "var(--deep)",
                          color: "var(--white)",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                        }}
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* SPECIES TREATED */}
              {vet.species_treated.length > 0 && (
                <div>
                  <h2 style={{ fontSize: "1.3rem", marginBottom: 14 }}>Species treated</h2>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {vet.species_treated.map((species) => (
                      <span
                        key={species}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 100,
                          background: "var(--paper-2)",
                          color: "var(--ink)",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          border: "1px solid var(--line)",
                        }}
                      >
                        {species}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* SERVICES */}
              {vet.vet_services.length > 0 && (
                <div>
                  <h2 style={{ fontSize: "1.3rem", marginBottom: 14 }}>Services</h2>
                  <div
                    style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}
                  >
                    {vet.vet_services.map((service) => (
                      <div
                        key={service.id}
                        className="card"
                        style={{
                          padding: 20,
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: "1.2rem" }}>
                            {SERVICE_ICONS[service.service_type] || "🩺"}
                          </span>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "var(--ink-soft)",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {SERVICE_LABELS[service.service_type] || service.service_type}
                          </span>
                        </div>
                        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "1.05rem" }}>
                          {service.title}
                        </div>
                        {service.description && (
                          <p style={{ fontSize: "0.88rem", color: "var(--ink-soft)", margin: 0, lineHeight: 1.6 }}>
                            {service.description}
                          </p>
                        )}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: "auto",
                            paddingTop: 10,
                            borderTop: "1px solid var(--line)",
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                            {formatPrice(service.price)}
                          </span>
                          <span style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>
                            {service.duration_minutes} min
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* REVIEWS */}
              {vet.reviews.length > 0 && (
                <div>
                  <h2 style={{ fontSize: "1.3rem", marginBottom: 14 }}>
                    Reviews{" "}
                    <span style={{ fontSize: "0.85rem", fontWeight: 400, color: "var(--ink-soft)" }}>
                      ({vet.review_count})
                    </span>
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {vet.reviews.map((review) => (
                      <div key={review.id} className="card" style={{ padding: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: "50%",
                              background: "var(--paper-2)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: "'Fraunces', serif",
                              fontWeight: 600,
                              fontSize: "0.85rem",
                              color: "var(--deep)",
                              flexShrink: 0,
                            }}
                          >
                            {review.profiles?.name?.charAt(0) || "?"}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                              {review.profiles?.name || "Anonymous"}
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>
                              {formatDate(review.created_at)}
                            </div>
                          </div>
                          <div style={{ color: "var(--amber-dark)", fontWeight: 600, fontSize: "0.88rem", whiteSpace: "nowrap" }}>
                            {renderStars(review.rating)} {review.rating}.0
                          </div>
                        </div>
                        <p style={{ fontSize: "0.92rem", lineHeight: 1.65, margin: 0 }}>
                          {review.review_text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT SIDEBAR */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24, position: "sticky", top: 24 }}>
              {/* QUICK STATS */}
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: "0.82rem", color: "var(--ink-soft)", fontWeight: 600, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Quick stats
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.88rem", color: "var(--ink-soft)" }}>Rating</span>
                    <span style={{ fontWeight: 600 }}>
                      ★ {vet.rating.toFixed(1)} <span style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>({vet.review_count})</span>
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.88rem", color: "var(--ink-soft)" }}>Consultations</span>
                    <span style={{ fontWeight: 600 }}>{vet.total_consultations}</span>
                  </div>
                  {vet.years_experience != null && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.88rem", color: "var(--ink-soft)" }}>Experience</span>
                      <span style={{ fontWeight: 600 }}>{vet.years_experience} years</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.88rem", color: "var(--ink-soft)" }}>Consultation fee</span>
                    <span style={{ fontWeight: 600 }}>{formatPrice(vet.consultation_price)}</span>
                  </div>
                </div>
              </div>

              {/* AVAILABILITY */}
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: "0.82rem", color: "var(--ink-soft)", fontWeight: 600, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Weekly availability
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                    const slots = availabilityByDay[dayIdx];
                    const isAvailable = slots && slots.length > 0;
                    return (
                      <div
                        key={dayIdx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 0",
                          borderBottom: dayIdx !== 0 ? "1px solid var(--line)" : "none",
                          fontSize: "0.88rem",
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{DAYS_SHORT[dayIdx]}</span>
                        {isAvailable ? (
                          <span style={{ color: "#4C8B5B", fontWeight: 500, fontSize: "0.82rem" }}>
                            {slots
                              .sort((a, b) => a.start_time.localeCompare(b.start_time))
                              .map((s) => {
                                const start = s.start_time.slice(0, 5);
                                const end = s.end_time.slice(0, 5);
                                return `${start}–${end}`;
                              })
                              .join(", ")}
                          </span>
                        ) : (
                          <span style={{ color: "var(--ink-soft)", fontSize: "0.82rem" }}>—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BOOKING CTA (sidebar) */}
              <div
                className="card"
                style={{
                  padding: 20,
                  background: "var(--deep)",
                  color: "var(--white)",
                  border: "none",
                }}
              >
                <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "1.1rem", marginBottom: 6 }}>
                  Need a vet?
                </div>
                <p style={{ fontSize: "0.88rem", color: "#B9C7BF", margin: "0 0 16px" }}>
                  {vet.online
                    ? "This vet is online right now. Book a consultation to get started."
                    : "Schedule a consultation with Dr. " + vetName.split(" ")[0] + "."}
                </p>
                <button
                  className="btn-amber"
                  style={{ width: "100%" }}
                  onClick={() => setShowBooking(true)}
                  disabled={!vet.accepting_bookings}
                >
                  {vet.accepting_bookings ? "Book Consultation" : "Currently unavailable"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BOOKING MODAL */}
      {showBooking && vet && (
        <BookingModal vet={vet} onClose={() => setShowBooking(false)} />
      )}

      <style>{`
        @media (max-width: 900px) {
          .vet-profile-grid {
            grid-template-columns: 1fr !important;
          }
          .vet-profile-header {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
          .vet-profile-header > div:first-child {
            margin: 0 auto;
          }
          .vet-profile-cta {
            text-align: center !important;
          }
        }
        @media (max-width: 600px) {
          .vet-profile-header {
            gap: 18px !important;
          }
        }
      `}</style>
    </>
  );
}

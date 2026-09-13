"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  formatDate,
  formatPrice,
  SERVICE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  URGENCY_LABELS,
  URGENCY_COLORS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/utils";
import type { Booking, Pet, Review } from "@/lib/types";

type Tab = "pets" | "consultations" | "saved-vets" | "payments";

const PAYMENT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#E4A13B22", text: "#C6842A" },
  paid: { bg: "#4C8B5B22", text: "#4C8B5B" },
  failed: { bg: "#C9727A22", text: "#C9727A" },
  refunded: { bg: "#12383222", text: "#123832" },
};

export default function OwnerDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("pets");
  const [pets, setPets] = useState<Pet[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  // Pet form
  const [petName, setPetName] = useState("");
  const [petSpecies, setPetSpecies] = useState("Dog");
  const [petBreed, setPetBreed] = useState("");
  const [petAge, setPetAge] = useState("");
  const [petWeight, setPetWeight] = useState("");
  const [editingPet, setEditingPet] = useState<string | null>(null);

  // Cancel modal
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Review modal
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const [petsRes, bookingsRes, reviewsRes] = await Promise.all([
        supabase.from("pets").select("*").eq("owner_id", user.id),
        supabase
          .from("bookings")
          .select("*, pets(name, species), vets(*, profiles(name))")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("reviews").select("*").eq("owner_id", user.id),
      ]);

      setPets(petsRes.data || []);
      setBookings(bookingsRes.data || []);
      setReviews(reviewsRes.data || []);
      setLoading(false);
    };
    load();
  }, [supabase, router]);

  useEffect(() => {
    if (actionMessage) {
      const t = setTimeout(() => setActionMessage(null), 3500);
      return () => clearTimeout(t);
    }
  }, [actionMessage]);

  const flash = (type: "success" | "error", text: string) => {
    setActionMessage({ type, text });
  };

  // ── Pet CRUD ────────────────────────────────────────────────────────────

  const addPet = async () => {
    if (!petName.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (editingPet) {
      const { error } = await supabase
        .from("pets")
        .update({
          name: petName,
          species: petSpecies,
          breed: petBreed || null,
          age: petAge || null,
          weight: petWeight || null,
        })
        .eq("id", editingPet);
      if (error) {
        flash("error", "Failed to update pet.");
        return;
      }
      flash("success", "Pet updated.");
      setEditingPet(null);
    } else {
      const { error } = await supabase.from("pets").insert({
        owner_id: user.id,
        name: petName,
        species: petSpecies,
        breed: petBreed || null,
        age: petAge || null,
        weight: petWeight || null,
      });
      if (error) {
        flash("error", "Failed to add pet.");
        return;
      }
      flash("success", "Pet added.");
    }

    setPetName("");
    setPetSpecies("Dog");
    setPetBreed("");
    setPetAge("");
    setPetWeight("");
    const { data } = await supabase
      .from("pets")
      .select("*")
      .eq("owner_id", user.id);
    setPets(data || []);
  };

  const editPet = (pet: Pet) => {
    setEditingPet(pet.id);
    setPetName(pet.name);
    setPetSpecies(pet.species);
    setPetBreed(pet.breed || "");
    setPetAge(pet.age || "");
    setPetWeight(pet.weight || "");
  };

  const removePet = async (id: string) => {
    const { error } = await supabase.from("pets").delete().eq("id", id);
    if (error) {
      flash("error", "Failed to delete pet.");
      return;
    }
    flash("success", "Pet removed.");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("pets")
        .select("*")
        .eq("owner_id", user.id);
      setPets(data || []);
    }
  };

  // ── Cancel booking ──────────────────────────────────────────────────────

  const cancelBooking = async () => {
    if (!cancelBookingId) return;
    setCancelling(true);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", cancelBookingId);
    setCancelling(false);
    setCancelBookingId(null);
    if (error) {
      flash("error", "Could not cancel booking.");
      return;
    }
    flash("success", "Booking cancelled.");
    setBookings((prev) =>
      prev.map((b) =>
        b.id === cancelBookingId ? { ...b, status: "cancelled" } : b
      )
    );
  };

  // ── Submit review ───────────────────────────────────────────────────────

  const submitReview = async () => {
    if (!reviewBookingId) return;
    setSubmittingReview(true);
    const booking = bookings.find((b) => b.id === reviewBookingId);
    if (!booking) {
      setSubmittingReview(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmittingReview(false);
      return;
    }

    const { error } = await supabase.from("reviews").insert({
      booking_id: reviewBookingId,
      owner_id: user.id,
      vet_id: booking.vet_id,
      rating: reviewRating,
      review_text: reviewText,
    });

    setSubmittingReview(false);
    setReviewBookingId(null);
    setReviewRating(5);
    setReviewText("");

    if (error) {
      flash("error", "Could not submit review.");
      return;
    }

    flash("success", "Review submitted — thank you!");
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("owner_id", user.id);
    setReviews(data || []);
  };

  // ── Derived data ────────────────────────────────────────────────────────

  const reviewedBookingIds = useMemo(
    () => new Set(reviews.map((r) => r.booking_id)),
    [reviews]
  );

  const completedBookings = bookings.filter(
    (b) => b.status === "completed" && !reviewedBookingIds.has(b.id)
  );

  const recentVets = useMemo(() => {
    const seen = new Map<string, Booking>();
    for (const b of bookings) {
      if (b.vets && !seen.has(b.vet_id)) {
        seen.set(b.vet_id, b);
      }
    }
    return Array.from(seen.values());
  }, [bookings]);

  const payments = bookings.filter(
    (b) => b.payment_status === "paid" || b.payment_status === "refunded"
  );

  const totalPaid = payments.reduce(
    (sum, b) => (b.payment_status === "paid" ? sum + b.price : sum),
    0
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // ── Loading state ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: "84px 0", textAlign: "center", color: "var(--ink-soft)" }}>
        Loading…
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "40px 0 84px" }}>
      <div className="wrap">
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div>
            <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>
              My Dashboard
            </h1>
            <p
              style={{
                color: "var(--ink-soft)",
                fontSize: "0.94rem",
                marginTop: 4,
              }}
            >
              Manage your pets, bookings, and reviews.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <a href="/#vet-grid" className="btn-primary" style={{ textDecoration: "none" }}>
              Book a Vet
            </a>
            <button className="btn-ghost" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>

        {/* Flash message */}
        {actionMessage && (
          <div
            style={{
              padding: "12px 18px",
              borderRadius: "var(--radius-s)",
              marginBottom: 20,
              fontSize: "0.92rem",
              fontWeight: 600,
              background: actionMessage.type === "success" ? "#4C8B5B22" : "#C9727A22",
              color: actionMessage.type === "success" ? "#4C8B5B" : "var(--rose)",
              border: `1px solid ${actionMessage.type === "success" ? "#4C8B5B44" : "#C9727A44"}`,
            }}
          >
            {actionMessage.text}
          </div>
        )}

        {/* Tabs */}
        <div className="tab-nav">
          {(
            [
              { id: "pets", label: "My Pets" },
              { id: "consultations", label: "Consultations" },
              { id: "saved-vets", label: "Saved Vets" },
              { id: "payments", label: "Payments" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ────────────── MY PETS ────────────── */}
        {activeTab === "pets" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.2fr",
              gap: 32,
            }}
            className="profile-layout"
          >
            {/* Form */}
            <div className="card" style={{ padding: 22 }}>
              <h3 style={{ fontSize: "1.1rem", marginBottom: 16 }}>
                {editingPet ? "Edit pet" : "Add a pet"}
              </h3>
              <div className="field" style={{ marginBottom: 14 }}>
                <label>Pet&apos;s name</label>
                <input
                  type="text"
                  placeholder="e.g. Chintu"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 14,
                }}
                className="hail-row"
              >
                <div className="field">
                  <label>Species</label>
                  <select
                    value={petSpecies}
                    onChange={(e) => setPetSpecies(e.target.value)}
                  >
                    <option>Dog</option>
                    <option>Cat</option>
                    <option>Bird</option>
                    <option>Rabbit</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="field">
                  <label>Breed</label>
                  <input
                    type="text"
                    placeholder="e.g. Beagle"
                    value={petBreed}
                    onChange={(e) => setPetBreed(e.target.value)}
                  />
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 14,
                }}
                className="hail-row"
              >
                <div className="field">
                  <label>Age</label>
                  <input
                    type="text"
                    placeholder="e.g. 3 years"
                    value={petAge}
                    onChange={(e) => setPetAge(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Weight</label>
                  <input
                    type="text"
                    placeholder="e.g. 12 kg"
                    value={petWeight}
                    onChange={(e) => setPetWeight(e.target.value)}
                  />
                </div>
              </div>
              <button
                className="btn-primary"
                style={{ width: "100%" }}
                onClick={addPet}
              >
                {editingPet ? "Update pet" : "Save pet"}
              </button>
              {editingPet && (
                <button
                  className="btn-ghost"
                  style={{ width: "100%", marginTop: 8 }}
                  onClick={() => {
                    setEditingPet(null);
                    setPetName("");
                    setPetSpecies("Dog");
                    setPetBreed("");
                    setPetAge("");
                    setPetWeight("");
                  }}
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Pet list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {pets.length === 0 ? (
                <div
                  style={{
                    color: "var(--ink-soft)",
                    fontSize: "0.94rem",
                    padding: 20,
                    border: "1px dashed var(--line)",
                    borderRadius: "var(--radius-m)",
                    textAlign: "center",
                  }}
                >
                  No pets saved yet — add one on the left.
                </div>
              ) : (
                pets.map((pet) => (
                  <div
                    key={pet.id}
                    className="card"
                    style={{
                      padding: "16px 18px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-fraunces), Fraunces, serif",
                          fontWeight: 600,
                          fontSize: "1.05rem",
                        }}
                      >
                        {pet.name}
                      </div>
                      <div
                        style={{
                          color: "var(--ink-soft)",
                          fontSize: "0.86rem",
                          marginTop: 2,
                        }}
                      >
                        {[pet.species, pet.breed, pet.age, pet.weight]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        className="btn-ghost"
                        onClick={() => editPet(pet)}
                        style={{ fontSize: "0.85rem" }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-ghost"
                        onClick={() => removePet(pet.id)}
                        style={{ color: "var(--rose)", fontSize: "0.85rem" }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ────────────── CONSULTATIONS ────────────── */}
        {activeTab === "consultations" && (
          <div>
            {bookings.length === 0 ? (
              <div
                style={{
                  color: "var(--ink-soft)",
                  padding: 40,
                  textAlign: "center",
                }}
              >
                No consultations yet.{" "}
                <a href="/#vet-grid" style={{ color: "var(--deep)" }}>
                  Browse vets
                </a>{" "}
                to book your first visit.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {bookings.map((b) => {
                  const sColor = STATUS_COLORS[b.status] || {
                    bg: "#E4A13B22",
                    text: "#C6842A",
                  };
                  const uColor = URGENCY_COLORS[b.urgency] || {
                    bg: "#F0EEE1",
                    text: "#4A5A4E",
                    border: "#D3CEB9",
                  };
                  const canCancel =
                    b.status === "pending" || b.status === "confirmed";
                  const isCompleted = b.status === "completed";
                  const alreadyReviewed = reviewedBookingIds.has(b.id);

                  return (
                    <div key={b.id} className="card" style={{ padding: 20 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          flexWrap: "wrap",
                          gap: 12,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                            <span style={{ fontWeight: 600, fontSize: "1.02rem" }}>
                              Dr. {b.vets?.profiles?.name || "Unknown"}
                            </span>
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: 100,
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                background: uColor.bg,
                                color: uColor.text,
                                border: `1px solid ${uColor.border}`,
                              }}
                            >
                              {URGENCY_LABELS[b.urgency] || b.urgency}
                            </span>
                          </div>
                          <div
                            style={{
                              color: "var(--ink-soft)",
                              fontSize: "0.88rem",
                              marginTop: 2,
                            }}
                          >
                            {b.pets?.name ? (
                              <>
                                {b.pets.name} ({b.pets.species}) ·{" "}
                                {SERVICE_LABELS[b.service_type] || b.service_type}
                              </>
                            ) : (
                              SERVICE_LABELS[b.service_type] || b.service_type
                            )}
                          </div>
                          {b.concern && (
                            <div
                              style={{
                                color: "var(--ink-soft)",
                                fontSize: "0.85rem",
                                marginTop: 4,
                                fontStyle: "italic",
                              }}
                            >
                              &ldquo;{b.concern}&rdquo;
                            </div>
                          )}
                          <div
                            style={{
                              color: "var(--ink-soft)",
                              fontSize: "0.84rem",
                              marginTop: 6,
                            }}
                          >
                            {formatDate(b.scheduled_at)} · Ref: {b.booking_reference} · {formatPrice(b.price)}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: 8,
                          }}
                        >
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: 100,
                                fontSize: "0.76rem",
                                fontWeight: 600,
                                background: sColor.bg,
                                color: sColor.text,
                              }}
                            >
                              {STATUS_LABELS[b.status] || b.status}
                            </span>
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: 100,
                                fontSize: "0.76rem",
                                fontWeight: 600,
                                background:
                                  PAYMENT_STATUS_COLORS[b.payment_status]?.bg || "#E4A13B22",
                                color:
                                  PAYMENT_STATUS_COLORS[b.payment_status]?.text || "#C6842A",
                              }}
                            >
                              {PAYMENT_STATUS_LABELS[b.payment_status] || b.payment_status}
                            </span>
                          </div>

                          <div style={{ display: "flex", gap: 6 }}>
                            {canCancel && (
                              <button
                                className="btn-ghost"
                                style={{ color: "var(--rose)", fontSize: "0.84rem" }}
                                onClick={() => setCancelBookingId(b.id)}
                              >
                                Cancel
                              </button>
                            )}
                            {isCompleted && !alreadyReviewed && (
                              <button
                                className="btn-ghost"
                                style={{ color: "var(--amber-dark)", fontSize: "0.84rem" }}
                                onClick={() => setReviewBookingId(b.id)}
                              >
                                Leave review
                              </button>
                            )}
                            {isCompleted && alreadyReviewed && (
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  color: "var(--ink-soft)",
                                  fontWeight: 500,
                                }}
                              >
                                ✓ Reviewed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ────────────── SAVED VETS ────────────── */}
        {activeTab === "saved-vets" && (
          <div>
            {recentVets.length === 0 ? (
              <div
                style={{
                  color: "var(--ink-soft)",
                  padding: 40,
                  textAlign: "center",
                }}
              >
                No saved vets yet. Book a consultation to see them here.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: 16,
                }}
              >
                {recentVets.map((b) => {
                  const vet = b.vets;
                  if (!vet) return null;
                  return (
                    <div
                      key={vet.id}
                      className="card"
                      style={{ padding: 22 }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 8,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontFamily: "var(--font-fraunces), Fraunces, serif",
                              fontWeight: 600,
                              fontSize: "1.05rem",
                            }}
                          >
                            {vet.display_name || vet.profiles?.name || "Veterinarian"}
                          </div>
                          <div
                            style={{
                              color: "var(--ink-soft)",
                              fontSize: "0.86rem",
                              marginTop: 2,
                            }}
                          >
                            {vet.specialization}
                            {vet.city ? ` · ${vet.city}` : ""}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontSize: "0.86rem",
                              fontWeight: 600,
                              color: "var(--amber-dark)",
                            }}
                          >
                            ★ {vet.rating.toFixed(1)}
                          </div>
                          <div
                            style={{
                              fontSize: "0.78rem",
                              color: "var(--ink-soft)",
                            }}
                          >
                            {vet.review_count} reviews
                          </div>
                        </div>
                      </div>

                      {vet.profiles?.name && (
                        <div
                          style={{
                            marginTop: 10,
                            fontSize: "0.86rem",
                            color: "var(--ink-soft)",
                          }}
                        >
                          {vet.clinic_name || ""}
                          {vet.area ? ` · ${vet.area}` : ""}
                        </div>
                      )}

                      <div
                        style={{
                          marginTop: 14,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.82rem",
                            color: "var(--ink-soft)",
                          }}
                        >
                          Last booked {formatDate(b.created_at)}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-fraunces), Fraunces, serif",
                            fontWeight: 600,
                            fontSize: "1rem",
                          }}
                        >
                          {formatPrice(vet.consultation_price)}
                        </span>
                      </div>

                      <a
                        href="/#vet-grid"
                        className="btn-secondary"
                        style={{
                          display: "block",
                          textAlign: "center",
                          marginTop: 14,
                          fontSize: "0.88rem",
                          textDecoration: "none",
                        }}
                      >
                        Book again
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ────────────── PAYMENTS ────────────── */}
        {activeTab === "payments" && (
          <div>
            {payments.length === 0 ? (
              <div
                style={{
                  color: "var(--ink-soft)",
                  padding: 40,
                  textAlign: "center",
                }}
              >
                No payment history yet.
              </div>
            ) : (
              <>
                <div
                  className="card"
                  style={{
                    padding: "18px 22px",
                    marginBottom: 20,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--ink-soft)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Total Spent
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-fraunces), Fraunces, serif",
                        fontWeight: 600,
                        fontSize: "1.4rem",
                        marginTop: 2,
                      }}
                    >
                      {formatPrice(totalPaid)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--ink-soft)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Transactions
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-fraunces), Fraunces, serif",
                        fontWeight: 600,
                        fontSize: "1.4rem",
                        marginTop: 2,
                      }}
                    >
                      {payments.length}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {payments.map((b) => {
                    const pColor = PAYMENT_STATUS_COLORS[b.payment_status] || {
                      bg: "#E4A13B22",
                      text: "#C6842A",
                    };
                    return (
                      <div
                        key={b.id}
                        className="card"
                        style={{
                          padding: "16px 18px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "1rem" }}>
                            Dr. {b.vets?.profiles?.name || "Unknown"}
                          </div>
                          <div
                            style={{
                              color: "var(--ink-soft)",
                              fontSize: "0.86rem",
                              marginTop: 2,
                            }}
                          >
                            {SERVICE_LABELS[b.service_type] || b.service_type} · Ref:{" "}
                            {b.booking_reference}
                          </div>
                          <div
                            style={{
                              color: "var(--ink-soft)",
                              fontSize: "0.84rem",
                              marginTop: 2,
                            }}
                          >
                            {formatDate(b.created_at)}
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-fraunces), Fraunces, serif",
                              fontWeight: 600,
                              fontSize: "1.05rem",
                            }}
                          >
                            {formatPrice(b.price)}
                          </span>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: 100,
                              fontSize: "0.76rem",
                              fontWeight: 600,
                              background: pColor.bg,
                              color: pColor.text,
                            }}
                          >
                            {PAYMENT_STATUS_LABELS[b.payment_status] || b.payment_status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ────────────── Cancel Modal ────────────── */}
      {cancelBookingId && (
        <div className="modal-backdrop" onClick={() => setCancelBookingId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setCancelBookingId(null)}
            >
              ×
            </button>
            <h3 style={{ fontSize: "1.15rem", marginBottom: 12 }}>
              Cancel booking?
            </h3>
            <p
              style={{
                color: "var(--ink-soft)",
                fontSize: "0.94rem",
                marginBottom: 22,
              }}
            >
              This action cannot be undone. You can re-book the vet later.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                className="btn-ghost"
                onClick={() => setCancelBookingId(null)}
                disabled={cancelling}
              >
                Keep booking
              </button>
              <button
                className="btn-danger"
                onClick={cancelBooking}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling…" : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────── Review Modal ────────────── */}
      {reviewBookingId && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setReviewBookingId(null);
            setReviewRating(5);
            setReviewText("");
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => {
                setReviewBookingId(null);
                setReviewRating(5);
                setReviewText("");
              }}
            >
              ×
            </button>
            <h3 style={{ fontSize: "1.15rem", marginBottom: 16 }}>
              Leave a review
            </h3>

            <div className="field" style={{ marginBottom: 16 }}>
              <label>Rating</label>
              <div style={{ display: "flex", gap: 6, paddingTop: 4 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "1.6rem",
                      cursor: "pointer",
                      color: star <= reviewRating ? "var(--amber)" : "var(--line)",
                      padding: 0,
                      lineHeight: 1,
                      transition: "color 0.12s",
                    }}
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="field" style={{ marginBottom: 18 }}>
              <label>Your review</label>
              <textarea
                rows={4}
                placeholder="How was your experience with this vet?"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                className="btn-ghost"
                onClick={() => {
                  setReviewBookingId(null);
                  setReviewRating(5);
                  setReviewText("");
                }}
                disabled={submittingReview}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={submitReview}
                disabled={submittingReview || reviewText.trim().length === 0}
                style={{
                  opacity:
                    submittingReview || reviewText.trim().length === 0 ? 0.5 : 1,
                }}
              >
                {submittingReview ? "Submitting…" : "Submit review"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 800px) {
          .profile-layout { grid-template-columns: 1fr !important; }
          .hail-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

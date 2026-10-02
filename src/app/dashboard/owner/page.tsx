"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

  // Delete confirmation
  const [deletePetId, setDeletePetId] = useState<string | null>(null);
  const [deletingPet, setDeletingPet] = useState(false);

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

  const confirmDeletePet = async () => {
    if (!deletePetId) return;
    setDeletingPet(true);
    await removePet(deletePetId);
    setDeletingPet(false);
    setDeletePetId(null);
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

  const petToDelete = deletePetId
    ? pets.find((p) => p.id === deletePetId)
    : undefined;

  // ── Loading state ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="db-page">
        <div className="wrap db-loading" role="status">
          <span className="db-loading-dot" aria-hidden="true" />
          Loading…
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="db-page">
      <div className="wrap">
        {/* Header */}
        <header className="db-head">
          <div className="db-head-copy">
            <h1 className="db-title">My Dashboard</h1>
            <p className="db-sub">Manage your pets, bookings, and reviews.</p>
          </div>
          <div className="db-head-actions">
            <Link href="/#vets" className="db-book">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4.5" width="18" height="17" rx="3" />
                <path d="M8 2.5v4M16 2.5v4M3 10h18" />
              </svg>
              Book a Vet
            </Link>
            <button className="db-logout" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </header>

        {/* Flash message */}
        {actionMessage && (
          <div
            className={`db-flash db-flash-${actionMessage.type}`}
            role="status"
          >
            <span className="db-flash-ic" aria-hidden="true">
              {actionMessage.type === "success" ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7.5v5.5M12 16.5v.01" />
                </svg>
              )}
            </span>
            {actionMessage.text}
          </div>
        )}

        {/* Tabs */}
        <div className="tab-nav db-tabs">
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
          <div className="db-panel profile-layout">
            {/* Form */}
            <div className={`db-card db-form ${editingPet ? "editing" : ""}`}>
              <div className="db-card-head">
                <span className="db-ic" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
                <h3>{editingPet ? "Edit pet" : "Add a pet"}</h3>
              </div>
              <div className="db-fields">
                <div className="field">
                  <label>Pet&apos;s name</label>
                  <input
                    type="text"
                    placeholder="e.g. Chintu"
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                  />
                </div>
                <div className="db-row2">
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
                <div className="db-row2">
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
              </div>
              <button className="btn-primary db-save" onClick={addPet}>
                {editingPet ? "Update pet" : "Save pet"}
              </button>
              {editingPet && (
                <button
                  className="btn-ghost db-cancel"
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
            <div className="db-petlist">
              {pets.length === 0 ? (
                <div className="db-empty">
                  <span className="db-empty-ic" aria-hidden="true">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="6.5" cy="9.5" r="2" />
                      <circle cx="10" cy="6" r="2" />
                      <circle cx="14" cy="6" r="2" />
                      <circle cx="17.5" cy="9.5" r="2" />
                      <path d="M12 11c-3 0-5.5 2.4-5.5 5 0 1.8 1.4 3 3.2 2.7.8-.1 1.6-.3 2.3-.3s1.5.2 2.3.3c1.8.3 3.2-.9 3.2-2.7 0-2.6-2.5-5-5.5-5Z" />
                    </svg>
                  </span>
                  <p>No pets saved yet — add one on the left.</p>
                </div>
              ) : (
                pets.map((pet, i) => (
                  <div
                    key={pet.id}
                    className="db-pet"
                    style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
                  >
                    <span className="db-pet-av" aria-hidden="true">
                      {pet.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="db-pet-body">
                      <div className="db-pet-name">{pet.name}</div>
                      <div className="db-pet-meta">
                        {[pet.species, pet.breed, pet.age, pet.weight]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <div className="db-pet-acts">
                      <button
                        className="db-btn-sm"
                        onClick={() => editPet(pet)}
                      >
                        Edit
                      </button>
                      <button
                        className="db-btn-sm db-btn-del"
                        onClick={() => setDeletePetId(pet.id)}
                      >
                        Delete
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
          <div className="db-panel">
            {bookings.length === 0 ? (
              <div className="db-empty">
                <span className="db-empty-ic" aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4.5" width="18" height="17" rx="3" />
                    <path d="M8 2.5v4M16 2.5v4M3 10h18" />
                  </svg>
                </span>
                <p>
                  No consultations yet.{" "}
                  <Link href="/#vets">Browse vets</Link> to book your first
                  visit.
                </p>
              </div>
            ) : (
              <div className="db-list">
                {bookings.map((b, i) => {
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
                    <div
                      key={b.id}
                      className="db-card db-consult"
                      style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
                    >
                      <div className="db-consult-main">
                        <div className="db-consult-top">
                          <span className="db-cname">
                            Dr. {b.vets?.profiles?.name || "Unknown"}
                          </span>
                          <span
                            className="db-pill"
                            style={{
                              background: uColor.bg,
                              color: uColor.text,
                              border: `1px solid ${uColor.border}`,
                            }}
                          >
                            {URGENCY_LABELS[b.urgency] || b.urgency}
                          </span>
                        </div>
                        <div className="db-meta">
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
                          <div className="db-concern">
                            &ldquo;{b.concern}&rdquo;
                          </div>
                        )}
                        <div className="db-meta db-meta2">
                          {formatDate(b.scheduled_at)} · Ref:{" "}
                          {b.booking_reference} · {formatPrice(b.price)}
                        </div>
                      </div>

                      <div className="db-consult-side">
                        <div className="db-pills">
                          <span
                            className="db-pill"
                            style={{
                              background: sColor.bg,
                              color: sColor.text,
                            }}
                          >
                            {STATUS_LABELS[b.status] || b.status}
                          </span>
                          <span
                            className="db-pill"
                            style={{
                              background:
                                PAYMENT_STATUS_COLORS[b.payment_status]?.bg ||
                                "#E4A13B22",
                              color:
                                PAYMENT_STATUS_COLORS[b.payment_status]?.text ||
                                "#C6842A",
                            }}
                          >
                            {PAYMENT_STATUS_LABELS[b.payment_status] ||
                              b.payment_status}
                          </span>
                        </div>

                        <div className="db-acts">
                          {b.service_type === "video_consult" &&
                            b.status === "confirmed" &&
                            (() => {
                              const scheduled = new Date(
                                b.scheduled_at
                              ).getTime();
                              const now = Date.now();
                              const joinWindow =
                                now >= scheduled - 10 * 60 * 1000 &&
                                now <= scheduled + 2 * 60 * 60 * 1000;
                              if (joinWindow) {
                                return (
                                  <a
                                    href={`/consultation/${b.id}`}
                                    className="db-join"
                                  >
                                    📹 Join Now →
                                  </a>
                                );
                              }
                              return null;
                            })()}
                          {b.service_type === "video_consult" &&
                            b.status === "in_progress" && (
                              <a
                                href={`/consultation/${b.id}`}
                                className="db-join"
                              >
                                📹 Join Now →
                              </a>
                            )}
                          {canCancel && (
                            <button
                              className="db-btn-sm db-btn-cancel"
                              onClick={() => setCancelBookingId(b.id)}
                            >
                              Cancel
                            </button>
                          )}
                          {isCompleted && !alreadyReviewed && (
                            <button
                              className="db-btn-sm db-btn-review"
                              onClick={() => setReviewBookingId(b.id)}
                            >
                              Leave review
                            </button>
                          )}
                          {isCompleted && alreadyReviewed && (
                            <span className="db-reviewed">✓ Reviewed</span>
                          )}
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
          <div className="db-panel">
            {recentVets.length === 0 ? (
              <div className="db-empty">
                <span className="db-empty-ic" aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.8 6.6a5 5 0 0 0-7.1 0L12 8.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1Z" />
                  </svg>
                </span>
                <p>No saved vets yet. Book a consultation to see them here.</p>
              </div>
            ) : (
              <div className="db-vetgrid">
                {recentVets.map((b, i) => {
                  const vet = b.vets;
                  if (!vet) return null;
                  return (
                    <div
                      key={vet.id}
                      className="db-card db-vetcard"
                      style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
                    >
                      <div className="db-vet-top">
                        <span className="db-pet-av db-pet-av-sm" aria-hidden="true">
                          {(vet.display_name ||
                            vet.profiles?.name ||
                            "V"
                          ).charAt(0).toUpperCase()}
                        </span>
                        <div className="db-vet-head">
                          <div className="db-pet-name">
                            {vet.display_name ||
                              vet.profiles?.name ||
                              "Veterinarian"}
                          </div>
                          <div className="db-pet-meta">
                            {vet.specialization}
                            {vet.city ? ` · ${vet.city}` : ""}
                          </div>
                        </div>
                        <div className="db-vet-rate">
                          <span className="db-rate">
                            ★ {vet.rating.toFixed(1)}
                          </span>
                          <span className="db-reviews">
                            {vet.review_count} reviews
                          </span>
                        </div>
                      </div>

                      {vet.profiles?.name && (
                        <div className="db-vet-clinic">
                          {vet.clinic_name || ""}
                          {vet.area ? ` · ${vet.area}` : ""}
                        </div>
                      )}

                      <div className="db-vet-foot">
                        <span className="db-last">
                          Last booked {formatDate(b.created_at)}
                        </span>
                        <span className="db-price">
                          {formatPrice(vet.consultation_price)}
                        </span>
                      </div>

                      <Link
                        href="/#vets"
                        className="btn-secondary db-book-again"
                      >
                        Book again
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ────────────── PAYMENTS ────────────── */}
        {activeTab === "payments" && (
          <div className="db-panel">
            {payments.length === 0 ? (
              <div className="db-empty">
                <span className="db-empty-ic" aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2.5" y="5" width="19" height="14" rx="3" />
                    <path d="M2.5 10h19" />
                  </svg>
                </span>
                <p>No payment history yet.</p>
              </div>
            ) : (
              <>
                <div className="db-card db-pay-summary">
                  <div className="db-pay-stat">
                    <span className="db-pay-ic db-pay-ic-a" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2.5" y="5" width="19" height="14" rx="3" />
                        <path d="M2.5 10h19" />
                      </svg>
                    </span>
                    <div>
                      <div className="db-pay-label">Total Spent</div>
                      <div className="db-pay-val">{formatPrice(totalPaid)}</div>
                    </div>
                  </div>
                  <div className="db-pay-stat db-pay-stat-r">
                    <span className="db-pay-ic db-pay-ic-b" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 7h16M4 12h11M4 17h14" />
                      </svg>
                    </span>
                    <div>
                      <div className="db-pay-label">Transactions</div>
                      <div className="db-pay-val">{payments.length}</div>
                    </div>
                  </div>
                </div>

                <div className="db-list db-paylist">
                  {payments.map((b, i) => {
                    const pColor = PAYMENT_STATUS_COLORS[b.payment_status] || {
                      bg: "#E4A13B22",
                      text: "#C6842A",
                    };
                    return (
                      <div
                        key={b.id}
                        className="db-card db-pay"
                        style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
                      >
                        <div>
                          <div className="db-pay-vet">
                            Dr. {b.vets?.profiles?.name || "Unknown"}
                          </div>
                          <div className="db-pet-meta">
                            {SERVICE_LABELS[b.service_type] || b.service_type}{" "}
                            · Ref: {b.booking_reference}
                          </div>
                          <div className="db-meta db-meta2">
                            {formatDate(b.created_at)}
                          </div>
                        </div>
                        <div className="db-pay-right">
                          <span className="db-pay-amount">
                            {formatPrice(b.price)}
                          </span>
                          <span
                            className="db-pill"
                            style={{
                              background: pColor.bg,
                              color: pColor.text,
                            }}
                          >
                            {PAYMENT_STATUS_LABELS[b.payment_status] ||
                              b.payment_status}
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

      {/* ────────────── Delete Pet Modal ────────────── */}
      {deletePetId && (
        <div className="modal-backdrop" onClick={() => setDeletePetId(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="del-pet-title"
          >
            <button
              className="modal-close"
              onClick={() => setDeletePetId(null)}
            >
              ×
            </button>
            <h3 id="del-pet-title" style={{ fontSize: "1.15rem", marginBottom: 12 }}>
              Delete this pet?
            </h3>
            <p
              style={{
                color: "var(--ink-soft)",
                fontSize: "0.94rem",
                marginBottom: 22,
              }}
            >
              {petToDelete
                ? `${petToDelete.name} will be removed from your pets. This action cannot be undone.`
                : "This action cannot be undone."}
            </p>
            <div className="db-modal-acts">
              <button
                className="btn-ghost"
                onClick={() => setDeletePetId(null)}
                disabled={deletingPet}
              >
                Keep pet
              </button>
              <button
                className="btn-danger"
                onClick={confirmDeletePet}
                disabled={deletingPet}
              >
                {deletingPet ? "Deleting…" : "Delete pet"}
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div className="db-modal-acts">
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

            <div className="db-modal-acts">
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
              >
                {submittingReview ? "Submitting…" : "Submit review"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .db-page {
          padding: 44px 0 96px;
          min-height: 62vh;
        }

        /* ── Hero ── */
        .db-page .db-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 30px;
          animation: dbFade 0.45s ease both;
        }
        .db-page .db-title {
          font-size: clamp(2rem, 4.4vw, 2.7rem);
          color: #0b3a2b;
          letter-spacing: -0.02em;
          line-height: 1.08;
        }
        .db-page .db-sub {
          margin-top: 8px;
          color: var(--ink-soft);
          font-size: 1.02rem;
          max-width: 46ch;
        }
        .db-page .db-head-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .db-page .db-book {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          background: var(--deep);
          color: var(--white);
          text-decoration: none;
          padding: 14px 24px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.96rem;
          box-shadow: 0 10px 24px rgba(13, 43, 38, 0.18);
          transition: transform 0.18s ease, box-shadow 0.18s ease,
            background 0.18s ease;
        }
        .db-page .db-book:hover {
          background: var(--deep-2);
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(13, 43, 38, 0.24);
        }
        .db-page .db-book svg {
          flex: none;
        }
        .db-page .db-logout {
          background: transparent;
          border: 1px solid rgba(28, 42, 33, 0.35);
          color: var(--ink-soft);
          padding: 13px 21px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.94rem;
          transition: all 0.18s ease;
        }
        .db-page .db-logout:hover {
          background: var(--paper-2);
          color: var(--ink);
          border-color: rgba(28, 42, 33, 0.55);
        }

        /* ── Flash ── */
        .db-page .db-flash {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--white);
          border: 1px solid rgba(28, 42, 33, 0.07);
          border-left-width: 4px;
          border-radius: 12px;
          padding: 13px 16px;
          font-size: 0.92rem;
          font-weight: 600;
          margin-bottom: 22px;
          box-shadow: 0 8px 22px rgba(31, 45, 35, 0.07);
          animation: dbSlide 0.3s ease both;
        }
        .db-page .db-flash-success {
          border-left-color: #4c8b5b;
          color: #33603f;
        }
        .db-page .db-flash-error {
          border-left-color: var(--rose);
          color: #8e4a52;
        }
        .db-page .db-flash-ic {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: none;
        }
        .db-page .db-flash-success .db-flash-ic {
          background: #4c8b5b1f;
          color: #4c8b5b;
        }
        .db-page .db-flash-error .db-flash-ic {
          background: #c9727a1f;
          color: var(--rose);
        }

        /* ── Tabs ── */
        .db-page .db-tabs {
          display: inline-flex;
          gap: 4px;
          padding: 5px;
          background: #efebdc;
          border: 1px solid rgba(28, 42, 33, 0.06);
          border-bottom: none;
          border-radius: 14px;
          margin-bottom: 30px;
          box-shadow: inset 0 1px 2px rgba(31, 45, 35, 0.05);
          max-width: 100%;
        }
        .db-page .db-tabs .tab-btn {
          border: none;
          border-radius: 10px;
          padding: 10px 20px;
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--ink-soft);
          transition: background 0.18s ease, color 0.18s ease,
            box-shadow 0.18s ease;
          white-space: nowrap;
        }
        .db-page .db-tabs .tab-btn:hover {
          color: var(--ink);
          background: rgba(255, 253, 248, 0.75);
        }
        .db-page .db-tabs .tab-btn.active {
          background: var(--deep);
          color: var(--white);
          font-weight: 600;
          border-bottom: none;
          box-shadow: 0 4px 12px rgba(13, 43, 38, 0.25);
        }
        .db-page .db-tabs .tab-btn.active:hover {
          background: var(--deep-2);
          color: var(--white);
        }

        /* ── Panels & cards ── */
        .db-page .db-panel {
          animation: dbFade 0.3s ease both;
        }
        .db-page .db-card {
          background: var(--white);
          border: 1px solid rgba(28, 42, 33, 0.07);
          border-radius: 18px;
          box-shadow: 0 6px 20px rgba(31, 45, 35, 0.05);
        }
        .db-page .db-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* ── Buttons (scoped restyle) ── */
        .db-page .btn-primary {
          border-radius: 12px;
          padding: 14px 22px;
          box-shadow: 0 8px 20px rgba(13, 43, 38, 0.16);
          transition: transform 0.18s ease, box-shadow 0.18s ease,
            background 0.18s ease;
        }
        .db-page .btn-primary:hover {
          background: var(--deep-2);
          transform: translateY(-2px);
          box-shadow: 0 12px 26px rgba(13, 43, 38, 0.22);
        }
        .db-page .btn-primary:disabled {
          opacity: 0.55;
          transform: none;
          box-shadow: none;
          cursor: not-allowed;
        }
        .db-page .btn-ghost {
          border-radius: 10px;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .db-page .btn-secondary {
          border-radius: 12px;
          border-color: rgba(28, 42, 33, 0.55);
          transition: all 0.18s ease;
        }
        .db-page .btn-secondary:hover {
          background: var(--deep);
          border-color: var(--deep);
        }
        .db-page .btn-danger {
          border-radius: 12px;
          padding: 12px 20px;
          transition: opacity 0.15s ease;
        }

        /* ── Form card ── */
        .db-page .profile-layout {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 28px;
          align-items: start;
        }
        .db-page .db-form {
          padding: 26px;
        }
        .db-page .db-form.editing {
          border-color: rgba(198, 132, 42, 0.5);
          box-shadow: 0 6px 22px rgba(198, 132, 42, 0.12);
        }
        .db-page .db-card-head {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .db-page .db-ic {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: #e1efe4;
          color: var(--deep);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: none;
        }
        .db-page .db-card-head h3 {
          font-size: 1.15rem;
        }
        .db-page .db-fields {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 18px;
        }
        .db-page .db-row2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .db-page .field label {
          font-size: 0.79rem;
          letter-spacing: 0.02em;
          color: #3c4c43;
          font-weight: 600;
        }
        .db-page .field input,
        .db-page .field select,
        .db-page .field textarea {
          padding: 12px 14px;
          border-radius: 10px;
          background: #f7f5ec;
          border: 1px solid #e2ddcb;
          font-size: 0.95rem;
          transition: border-color 0.15s ease, box-shadow 0.15s ease,
            background 0.15s ease;
        }
        .db-page .field input:focus,
        .db-page .field select:focus,
        .db-page .field textarea:focus {
          background: var(--white);
          border-color: var(--deep);
          box-shadow: 0 0 0 3px rgba(18, 56, 50, 0.12);
          outline: none;
        }
        .db-page .field input::placeholder,
        .db-page .field textarea::placeholder {
          color: #9aa298;
        }
        .db-page .db-save {
          width: 100%;
        }
        .db-page .db-cancel {
          width: 100%;
          margin-top: 10px;
        }

        /* ── Pet cards ── */
        .db-page .db-petlist {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .db-page .db-pet {
          display: flex;
          align-items: center;
          gap: 16px;
          background: var(--white);
          border: 1px solid rgba(28, 42, 33, 0.07);
          border-radius: 18px;
          padding: 16px 20px;
          box-shadow: 0 6px 18px rgba(31, 45, 35, 0.05);
          transition: transform 0.2s ease, box-shadow 0.2s ease,
            border-color 0.2s ease;
          animation: dbIn 0.4s ease both;
        }
        .db-page .db-pet:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(31, 45, 35, 0.1);
          border-color: rgba(18, 56, 50, 0.16);
        }
        .db-page .db-pet-av {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: linear-gradient(135deg, #e1efe4, #cfe7d7);
          color: var(--deep);
          font-family: var(--font-fraunces), Fraunces, serif;
          font-weight: 700;
          font-size: 1.3rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: none;
        }
        .db-page .db-pet-av-sm {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          font-size: 1.15rem;
        }
        .db-page .db-pet-body {
          flex: 1;
          min-width: 0;
        }
        .db-page .db-pet-name {
          font-family: var(--font-fraunces), Fraunces, serif;
          font-weight: 600;
          font-size: 1.06rem;
          color: var(--ink);
        }
        .db-page .db-pet-meta {
          color: var(--ink-soft);
          font-size: 0.87rem;
          margin-top: 3px;
        }
        .db-page .db-pet-acts {
          display: flex;
          gap: 8px;
          flex: none;
        }
        .db-page .db-btn-sm {
          background: transparent;
          border: 1px solid rgba(28, 42, 33, 0.3);
          color: var(--ink);
          padding: 8px 15px;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.16s ease;
        }
        .db-page .db-btn-sm:hover {
          background: var(--paper-2);
          border-color: rgba(28, 42, 33, 0.5);
        }
        .db-page .db-btn-del {
          border-color: transparent;
          color: var(--rose);
        }
        .db-page .db-btn-del:hover {
          background: #c9727a14;
          border-color: #c9727a44;
          color: #a85560;
        }

        /* ── Empty states ── */
        .db-page .db-empty {
          background: rgba(255, 253, 248, 0.6);
          border: 1px dashed #cfc9b2;
          border-radius: 18px;
          padding: 44px 24px;
          text-align: center;
          color: var(--ink-soft);
          font-size: 0.95rem;
          animation: dbFade 0.3s ease both;
        }
        .db-page .db-empty-ic {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #e1efe4;
          color: #2e5d4c;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }
        .db-page .db-empty p {
          margin: 0 auto;
          max-width: 44ch;
        }
        .db-page .db-empty a {
          color: var(--deep);
          font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        /* ── Consultation cards ── */
        .db-page .db-consult {
          padding: 20px 22px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
          animation: dbIn 0.4s ease both;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .db-page .db-consult:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(31, 45, 35, 0.1);
        }
        .db-page .db-consult-main {
          flex: 1;
          min-width: 220px;
        }
        .db-page .db-consult-top {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }
        .db-page .db-cname {
          font-family: var(--font-fraunces), Fraunces, serif;
          font-weight: 600;
          font-size: 1.05rem;
        }
        .db-page .db-pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 11px;
          border-radius: 100px;
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.01em;
        }
        .db-page .db-meta {
          color: var(--ink-soft);
          font-size: 0.88rem;
          margin-top: 3px;
        }
        .db-page .db-meta2 {
          margin-top: 7px;
          font-size: 0.84rem;
        }
        .db-page .db-concern {
          color: var(--ink-soft);
          font-size: 0.86rem;
          margin-top: 5px;
          font-style: italic;
        }
        .db-page .db-consult-side {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
        }
        .db-page .db-pills {
          display: flex;
          gap: 6px;
          align-items: center;
          flex-wrap: wrap;
        }
        .db-page .db-acts {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .db-page .db-join {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--deep);
          color: var(--white);
          padding: 8px 15px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.85rem;
          text-decoration: none;
          transition: all 0.16s ease;
        }
        .db-page .db-join:hover {
          background: var(--deep-2);
          transform: translateY(-1px);
        }
        .db-page .db-btn-cancel {
          border-color: transparent;
          color: var(--rose);
        }
        .db-page .db-btn-cancel:hover {
          background: #c9727a14;
        }
        .db-page .db-btn-review {
          border-color: transparent;
          color: var(--amber-dark);
        }
        .db-page .db-btn-review:hover {
          background: #e4a13b1a;
        }
        .db-page .db-reviewed {
          font-size: 0.8rem;
          color: var(--ink-soft);
          font-weight: 500;
        }

        /* ── Saved vets ── */
        .db-page .db-vetgrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }
        .db-page .db-vetcard {
          padding: 22px;
          display: flex;
          flex-direction: column;
          animation: dbIn 0.4s ease both;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .db-page .db-vetcard:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(31, 45, 35, 0.1);
        }
        .db-page .db-vet-top {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }
        .db-page .db-vet-head {
          flex: 1;
          min-width: 0;
        }
        .db-page .db-vet-rate {
          margin-left: auto;
          text-align: right;
          flex: none;
        }
        .db-page .db-rate {
          display: inline-block;
          font-size: 0.86rem;
          font-weight: 700;
          color: var(--amber-dark);
          background: #e4a13b1a;
          padding: 4px 10px;
          border-radius: 100px;
        }
        .db-page .db-reviews {
          display: block;
          font-size: 0.78rem;
          color: var(--ink-soft);
          margin-top: 5px;
        }
        .db-page .db-vet-clinic {
          margin-top: 12px;
          font-size: 0.86rem;
          color: var(--ink-soft);
        }
        .db-page .db-vet-foot {
          margin-top: 16px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }
        .db-page .db-last {
          font-size: 0.82rem;
          color: var(--ink-soft);
        }
        .db-page .db-price {
          font-family: var(--font-fraunces), Fraunces, serif;
          font-weight: 600;
          font-size: 1.05rem;
          color: var(--deep);
        }
        .db-page .db-book-again {
          display: block;
          text-align: center;
          margin-top: auto;
          font-size: 0.9rem;
          text-decoration: none;
          padding: 11px 22px;
        }

        /* ── Payments ── */
        .db-page .db-pay-summary {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          padding: 22px 26px;
          margin-bottom: 20px;
          animation: dbIn 0.4s ease both;
        }
        .db-page .db-pay-stat {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .db-page .db-pay-stat-r {
          flex-direction: row-reverse;
          text-align: right;
        }
        .db-page .db-pay-ic {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: none;
        }
        .db-page .db-pay-ic-a {
          background: #fdeee0;
          color: #c6842a;
        }
        .db-page .db-pay-ic-b {
          background: #e1efe4;
          color: #2e5d4c;
        }
        .db-page .db-pay-label {
          font-size: 0.75rem;
          color: var(--ink-soft);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .db-page .db-pay-val {
          font-family: var(--font-fraunces), Fraunces, serif;
          font-weight: 600;
          font-size: 1.55rem;
          color: #0b3a2b;
          margin-top: 2px;
        }
        .db-page .db-pay {
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          animation: dbIn 0.4s ease both;
        }
        .db-page .db-pay-vet {
          font-weight: 600;
          font-size: 1rem;
        }
        .db-page .db-pay-right {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .db-page .db-pay-amount {
          font-family: var(--font-fraunces), Fraunces, serif;
          font-weight: 600;
          font-size: 1.08rem;
        }

        /* ── Modals ── */
        .db-page .modal-backdrop {
          background: rgba(13, 43, 38, 0.55);
          backdrop-filter: blur(4px);
          animation: dbFade 0.2s ease both;
        }
        .db-page .modal {
          border-radius: 22px;
          padding: 30px;
          border: 1px solid rgba(28, 42, 33, 0.06);
          box-shadow: 0 30px 70px rgba(10, 26, 20, 0.35);
          animation: dbPop 0.22s ease both;
        }
        .db-page .modal h3 {
          font-size: 1.2rem;
        }
        .db-page .db-modal-acts {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        /* ── Loading ── */
        .db-page .db-loading {
          padding: 90px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: var(--ink-soft);
          font-weight: 500;
        }
        .db-page .db-loading-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--deep);
          animation: dbBlink 1s ease infinite;
        }

        /* ── Motion ── */
        @keyframes dbFade {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @keyframes dbIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @keyframes dbSlide {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @keyframes dbPop {
          from {
            opacity: 0;
            transform: scale(0.97);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @keyframes dbBlink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.35;
          }
        }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .db-page .profile-layout {
            grid-template-columns: 1fr;
          }
          .db-page .db-row2 {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .db-page {
            padding: 32px 0 72px;
          }
          .db-page .db-head {
            align-items: flex-start;
          }
          .db-page .db-head-actions {
            width: 100%;
          }
          .db-page .db-book {
            flex: 1;
            justify-content: center;
          }
          .db-page .db-tabs {
            display: flex;
            width: 100%;
          }
          .db-page .db-consult {
            flex-direction: column;
          }
          .db-page .db-consult-side {
            align-items: flex-start;
            width: 100%;
          }
          .db-page .db-acts {
            justify-content: flex-start;
          }
          .db-page .db-pay-summary {
            flex-direction: column;
            gap: 16px;
          }
          .db-page .db-pay-stat-r {
            flex-direction: row;
            text-align: left;
          }
        }
        @media (max-width: 560px) {
          .db-page .db-pet {
            flex-wrap: wrap;
          }
          .db-page .db-pet-acts {
            width: 100%;
            justify-content: flex-end;
          }
          .db-page .db-vet-top {
            flex-wrap: wrap;
          }
          .db-page .db-vet-rate {
            margin-left: 60px;
            text-align: left;
            width: 100%;
          }
          .db-page .db-pay {
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

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
  DAYS_SHORT,
} from "@/lib/utils";
import type {
  Booking,
  VetService,
  VetAvailability,
  Review,
  Vet,
  ServiceType,
} from "@/lib/types";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "bookings", label: "Bookings" },
  { id: "services", label: "Services" },
  { id: "availability", label: "Availability" },
  { id: "profile", label: "Profile" },
  { id: "verification", label: "Verification" },
] as const;

type Tab = (typeof TABS)[number]["id"];
type BookingFilter = "all" | "pending" | "confirmed" | "completed" | "cancelled";

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || { bg: "#E4A13B22", text: "#C6842A" };
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 100,
        fontSize: "0.78rem",
        fontWeight: 600,
        background: colors.bg,
        color: colors.text,
      }}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const colors = URGENCY_COLORS[urgency] || {
    bg: "#F0EEE1",
    text: "#4A5A4E",
    border: "#D3CEB9",
  };
  return (
    <span
      style={{
        padding: "3px 8px",
        borderRadius: 100,
        fontSize: "0.72rem",
        fontWeight: 700,
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {URGENCY_LABELS[urgency] || urgency}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const label = PAYMENT_STATUS_LABELS[status] || status;
  const color =
    status === "paid"
      ? { bg: "#4C8B5B22", text: "#4C8B5B" }
      : status === "failed"
        ? { bg: "#C9727A22", text: "#C9727A" }
        : status === "refunded"
          ? { bg: "#12383222", text: "#123832" }
          : { bg: "#E4A13B22", text: "#C6842A" };
  return (
    <span
      style={{
        padding: "3px 8px",
        borderRadius: 100,
        fontSize: "0.72rem",
        fontWeight: 600,
        background: color.bg,
        color: color.text,
      }}
    >
      {label}
    </span>
  );
}

export default function VetDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<VetService[]>([]);
  const [availability, setAvailability] = useState<VetAvailability[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [vet, setVet] = useState<Vet | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>("all");
  const [editingService, setEditingService] = useState<VetService | null>(null);
  const [showServiceForm, setShowServiceForm] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: vetData } = await supabase
        .from("vets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!vetData) {
        router.push("/dashboard/vet/onboarding");
        return;
      }

      // onboarding_completed may not exist if migration 002 hasn't run
      // If the column is missing, vetData.onboarding_completed is undefined (falsy)
      // Only redirect if the column EXISTS and is explicitly false
      if (vetData.onboarding_completed === false && "onboarding_completed" in vetData) {
        router.push("/dashboard/vet/onboarding");
        return;
      }

      setVet(vetData);
      setOnline(vetData.online);
      setAccepting(vetData.accepting_bookings);

      const [bookingsRes, servicesRes, availRes, reviewsRes] =
        await Promise.all([
          supabase
            .from("bookings")
            .select("*, pets(name, species), profiles(name)")
            .eq("vet_id", vetData.id)
            .order("scheduled_at", { ascending: false }),
          supabase
            .from("vet_services")
            .select("*")
            .eq("vet_id", vetData.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("vet_availability")
            .select("*")
            .eq("vet_id", vetData.id)
            .order("day_of_week", { ascending: true }),
          supabase
            .from("reviews")
            .select("*, profiles(name)")
            .eq("vet_id", vetData.id)
            .order("created_at", { ascending: false }),
        ]);

      setBookings(bookingsRes.data || []);
      setServices(servicesRes.data || []);
      setAvailability(availRes.data || []);
      setReviews(reviewsRes.data || []);
      setLoading(false);
    };
    load();
  }, [supabase, router]);

  const updateBookingStatus = async (bookingId: string, status: string) => {
    await supabase.from("bookings").update({ status }).eq("id", bookingId);
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? { ...b, status: status as Booking["status"] }
          : b
      )
    );
  };

  const toggleOnline = async (val: boolean) => {
    if (!vet) return;
    await supabase.from("vets").update({ online: val }).eq("id", vet.id);
    setOnline(val);
  };

  const toggleAccepting = async (val: boolean) => {
    if (!vet) return;
    await supabase
      .from("vets")
      .update({ accepting_bookings: val })
      .eq("id", vet.id);
    setAccepting(val);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const totalEarnings = bookings
    .filter((b) => b.payment_status === "paid")
    .reduce((sum, b) => sum + b.price, 0);

  const avgRating = vet?.rating || 0;
  const reviewCount = vet?.review_count || reviews.length;

  const filteredBookings = useMemo(() => {
    if (bookingFilter === "all") return bookings;
    return bookings.filter((b) => b.status === bookingFilter);
  }, [bookings, bookingFilter]);

  const groupedBookings = useMemo(() => {
    const groups: Record<string, Booking[]> = {};
    filteredBookings.forEach((b) => {
      const dateKey = new Date(b.scheduled_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(b);
    });
    return groups;
  }, [filteredBookings]);

  const handleSaveService = async (svc: Partial<VetService>) => {
    if (!vet) return;
    if (editingService) {
      const { data } = await supabase
        .from("vet_services")
        .update({
          title: svc.title,
          description: svc.description,
          price: svc.price,
          duration_minutes: svc.duration_minutes,
          is_active: svc.is_active,
        })
        .eq("id", editingService.id)
        .select()
        .single();
      if (data) {
        setServices((prev) =>
          prev.map((s) => (s.id === data.id ? data : s))
        );
      }
    } else {
      const { data } = await supabase
        .from("vet_services")
        .insert({
          vet_id: vet.id,
          service_type: svc.service_type,
          title: svc.title,
          description: svc.description,
          price: svc.price,
          duration_minutes: svc.duration_minutes,
          is_active: true,
        })
        .select()
        .single();
      if (data) {
        setServices((prev) => [data, ...prev]);
      }
    }
    setShowServiceForm(false);
    setEditingService(null);
  };

  const handleDeleteService = async (id: string) => {
    await supabase.from("vet_services").delete().eq("id", id);
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const handleToggleService = async (svc: VetService) => {
    await supabase
      .from("vet_services")
      .update({ is_active: !svc.is_active })
      .eq("id", svc.id);
    setServices((prev) =>
      prev.map((s) =>
        s.id === svc.id ? { ...s, is_active: !s.is_active } : s
      )
    );
  };

  const handleSaveAvailability = async (
    day: number,
    start: string,
    end: string
  ) => {
    if (!vet) return;
    const { data } = await supabase
      .from("vet_availability")
      .upsert({
        vet_id: vet.id,
        day_of_week: day,
        start_time: start,
        end_time: end,
        is_available: true,
      })
      .select()
      .single();
    if (data) {
      const { data: all } = await supabase
        .from("vet_availability")
        .select("*")
        .eq("vet_id", vet.id)
        .order("day_of_week", { ascending: true });
      setAvailability(all || []);
    }
  };

  const handleRemoveAvailability = async (id: string) => {
    await supabase.from("vet_availability").delete().eq("id", id);
    setAvailability((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSaveProfile = async (fields: Partial<Vet>) => {
    if (!vet) return;
    const { data, error } = await supabase
      .from("vets")
      .update(fields)
      .eq("id", vet.id)
      .select()
      .single();
    if (error) {
      console.warn("Profile save partial failure:", error.message);
    }
    if (data) setVet(data);
  };

  const handleSubmitVerification = async () => {
    if (!vet) return;
    const { data, error } = await supabase
      .from("vets")
      .update({ verification_status: "under_review" })
      .eq("id", vet.id)
      .select()
      .single();
    if (error) {
      console.warn("Verification submit failed:", error.message);
    }
    if (data) setVet(data);
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "84px 0",
          textAlign: "center",
          color: "var(--ink-soft)",
        }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 0 84px" }}>
      <div className="wrap">
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 32,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>
              Vet Dashboard
            </h1>
            <p
              style={{
                color: "var(--ink-soft)",
                fontSize: "0.94rem",
                marginTop: 4,
              }}
            >
              Manage bookings, services, and your profile.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={online}
                onChange={(e) => toggleOnline(e.target.checked)}
                style={{ accentColor: "var(--deep)" }}
              />
              Online
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={accepting}
                onChange={(e) => toggleAccepting(e.target.checked)}
                style={{ accentColor: "var(--deep)" }}
              />
              Accepting bookings
            </label>
            <button className="btn-ghost" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>

        {/* Onboarding prompt */}
        {vet && !vet.onboarding_completed && (
          <div
            className="card"
            style={{
              padding: 24,
              marginBottom: 24,
              background: "#E4A13B11",
              border: "1px solid var(--amber)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "1.1rem",
                    color: "var(--amber-dark)",
                    marginBottom: 4,
                  }}
                >
                  Complete your profile
                </h3>
                <p style={{ fontSize: "0.9rem", color: "var(--ink-soft)" }}>
                  Finish onboarding to start receiving bookings.
                </p>
              </div>
              <button
                className="btn-amber"
                onClick={() => router.push("/dashboard/vet/onboarding")}
              >
                Complete Setup
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tab-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Overview ─── */}
        {activeTab === "overview" && (
          <div>
            <div
              className="stats-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
                marginBottom: 28,
              }}
            >
              {[
                {
                  label: "Total Bookings",
                  value: bookings.length,
                  accent: false,
                },
                {
                  label: "Completed",
                  value: bookings.filter((b) => b.status === "completed")
                    .length,
                  accent: true,
                },
                {
                  label: "Pending",
                  value: bookings.filter((b) => b.status === "pending").length,
                  accent: false,
                },
                {
                  label: "Earnings",
                  value: formatPrice(totalEarnings),
                  accent: false,
                },
                {
                  label: "Rating",
                  value: avgRating > 0 ? avgRating.toFixed(1) : "–",
                  accent: true,
                },
                {
                  label: "Reviews",
                  value: reviewCount,
                  accent: false,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="card"
                  style={{ padding: 18, textAlign: "center" }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-fraunces), Fraunces, serif",
                      fontSize: "1.6rem",
                      fontWeight: 600,
                      color: stat.accent ? "var(--amber-dark)" : "var(--ink)",
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{
                      color: "var(--ink-soft)",
                      fontSize: "0.85rem",
                      marginTop: 2,
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 28,
                flexWrap: "wrap",
              }}
            >
              <button
                className="btn-primary"
                onClick={() => setActiveTab("bookings")}
              >
                View Bookings
              </button>
              <button
                className="btn-secondary"
                onClick={() => setActiveTab("services")}
              >
                Manage Services
              </button>
              <button
                className="btn-secondary"
                onClick={() => setActiveTab("availability")}
              >
                Edit Availability
              </button>
            </div>

            {/* Recent bookings */}
            <h3 style={{ fontSize: "1.1rem", marginBottom: 14 }}>
              Recent Bookings
            </h3>
            {bookings.length === 0 ? (
              <div
                style={{
                  color: "var(--ink-soft)",
                  padding: 40,
                  textAlign: "center",
                }}
              >
                No bookings yet. When pet owners book you, they&apos;ll appear
                here.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {bookings.slice(0, 5).map((b) => (
                  <div
                    key={b.id}
                    className="card"
                    style={{
                      padding: "14px 18px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        {b.profiles?.name || "Pet Owner"}
                      </div>
                      <div
                        style={{
                          color: "var(--ink-soft)",
                          fontSize: "0.85rem",
                          marginTop: 2,
                        }}
                      >
                        {b.pets?.name} ·{" "}
                        {SERVICE_LABELS[b.service_type] || b.service_type} ·{" "}
                        {formatDate(b.scheduled_at)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {b.urgency && <UrgencyBadge urgency={b.urgency} />}
                      <StatusBadge status={b.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Bookings ─── */}
        {activeTab === "bookings" && (
          <div>
            {/* Filter tabs */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 20,
                flexWrap: "wrap",
              }}
            >
              {(
                [
                  "all",
                  "pending",
                  "confirmed",
                  "completed",
                  "cancelled",
                ] as BookingFilter[]
              ).map((f) => (
                <button
                  key={f}
                  className={`filter-btn ${bookingFilter === f ? "active" : ""}`}
                  onClick={() => setBookingFilter(f)}
                >
                  {f === "all" ? "All" : STATUS_LABELS[f] || f}
                  {f !== "all" && (
                    <span style={{ marginLeft: 4, opacity: 0.7 }}>
                      ({bookings.filter((b) => b.status === f).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {filteredBookings.length === 0 ? (
              <div
                style={{
                  color: "var(--ink-soft)",
                  padding: 40,
                  textAlign: "center",
                }}
              >
                No bookings match this filter.
              </div>
            ) : (
              Object.entries(groupedBookings).map(([date, items]) => (
                <div key={date} style={{ marginBottom: 28 }}>
                  <h4
                    style={{
                      fontSize: "0.95rem",
                      color: "var(--ink-soft)",
                      marginBottom: 10,
                      fontWeight: 600,
                      borderBottom: "1px solid var(--line)",
                      paddingBottom: 6,
                    }}
                  >
                    {date}
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {items.map((b) => (
                      <div key={b.id} className="card" style={{ padding: 18 }}>
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
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap",
                                marginBottom: 4,
                              }}
                            >
                              <span style={{ fontWeight: 600, fontSize: "1rem" }}>
                                {b.profiles?.name || "Pet Owner"}
                              </span>
                              {b.urgency && (
                                <UrgencyBadge urgency={b.urgency} />
                              )}
                            </div>
                            <div
                              style={{
                                color: "var(--ink-soft)",
                                fontSize: "0.88rem",
                              }}
                            >
                              Pet: {b.pets?.name} ({b.pets?.species}) ·{" "}
                              {SERVICE_LABELS[b.service_type] || b.service_type}
                            </div>
                            <div
                              style={{
                                color: "var(--ink-soft)",
                                fontSize: "0.85rem",
                                marginTop: 2,
                              }}
                            >
                              {formatDate(b.scheduled_at)} · Ref:{" "}
                              {b.booking_reference}
                            </div>
                            {b.concern && (
                              <div
                                style={{
                                  color: "var(--ink-soft)",
                                  fontSize: "0.85rem",
                                  marginTop: 4,
                                }}
                              >
                                Concern: {b.concern}
                              </div>
                            )}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: 6,
                            }}
                          >
                            <StatusBadge status={b.status} />
                            <PaymentBadge status={b.payment_status} />
                            <span
                              style={{
                                fontSize: "0.88rem",
                                fontWeight: 600,
                                color: "var(--ink)",
                              }}
                            >
                              {formatPrice(b.price)}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        {b.status === "pending" && (
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              marginTop: 12,
                              borderTop: "1px solid var(--line)",
                              paddingTop: 12,
                            }}
                          >
                            <button
                              className="btn-primary"
                              style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                              onClick={() =>
                                updateBookingStatus(b.id, "confirmed")
                              }
                            >
                              Accept
                            </button>
                            <button
                              className="btn-danger"
                              style={{ fontSize: "0.85rem" }}
                              onClick={() =>
                                updateBookingStatus(b.id, "declined")
                              }
                            >
                              Decline
                            </button>
                          </div>
                        )}
                        {b.status === "confirmed" && (
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              marginTop: 12,
                              borderTop: "1px solid var(--line)",
                              paddingTop: 12,
                            }}
                          >
                            <button
                              className="btn-primary"
                              style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                              onClick={() =>
                                updateBookingStatus(b.id, "in_progress")
                              }
                            >
                              Start Visit
                            </button>
                            <button
                              className="btn-primary"
                              style={{
                                padding: "8px 16px",
                                fontSize: "0.85rem",
                                background: "#4C8B5B",
                              }}
                              onClick={() =>
                                updateBookingStatus(b.id, "completed")
                              }
                            >
                              Complete
                            </button>
                            <button
                              className="btn-danger"
                              style={{ fontSize: "0.85rem" }}
                              onClick={() =>
                                updateBookingStatus(b.id, "no_show")
                              }
                            >
                              No-show
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── Services ─── */}
        {activeTab === "services" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h3 style={{ fontSize: "1.1rem" }}>Your Services</h3>
              <button
                className="btn-primary"
                onClick={() => {
                  setEditingService(null);
                  setShowServiceForm(true);
                }}
              >
                + Add Service
              </button>
            </div>

            {showServiceForm && (
              <ServiceForm
                initial={editingService}
                onSave={handleSaveService}
                onCancel={() => {
                  setShowServiceForm(false);
                  setEditingService(null);
                }}
              />
            )}

            {services.length === 0 && !showServiceForm ? (
              <div
                style={{
                  color: "var(--ink-soft)",
                  padding: 40,
                  textAlign: "center",
                  border: "1px dashed var(--line)",
                  borderRadius: "var(--radius-m)",
                }}
              >
                No services yet. Add a service to let pet owners know what you
                offer.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {services.map((svc) => (
                  <div
                    key={svc.id}
                    className="card"
                    style={{
                      padding: 18,
                      opacity: svc.is_active ? 1 : 0.6,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{ fontWeight: 600, fontSize: "1rem" }}
                          >
                            {svc.title}
                          </span>
                          <span
                            style={{
                              fontSize: "0.78rem",
                              color: "var(--ink-soft)",
                              background: "var(--paper)",
                              padding: "2px 8px",
                              borderRadius: 100,
                            }}
                          >
                            {SERVICE_LABELS[svc.service_type] ||
                              svc.service_type}
                          </span>
                        </div>
                        {svc.description && (
                          <p
                            style={{
                              color: "var(--ink-soft)",
                              fontSize: "0.88rem",
                              margin: "4px 0 0",
                            }}
                          >
                            {svc.description}
                          </p>
                        )}
                        <div
                          style={{
                            display: "flex",
                            gap: 16,
                            marginTop: 8,
                            fontSize: "0.88rem",
                            color: "var(--ink-soft)",
                          }}
                        >
                          <span>{formatPrice(svc.price)}</span>
                          <span>{svc.duration_minutes} min</span>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                        }}
                      >
                        <button
                          className="btn-ghost"
                          style={{ fontSize: "0.85rem" }}
                          onClick={() => {
                            setEditingService(svc);
                            setShowServiceForm(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-ghost"
                          style={{
                            fontSize: "0.85rem",
                            color: svc.is_active
                              ? "var(--amber-dark)"
                              : "var(--ink-soft)",
                          }}
                          onClick={() => handleToggleService(svc)}
                        >
                          {svc.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          className="btn-ghost"
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--rose)",
                          }}
                          onClick={() => handleDeleteService(svc.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Availability ─── */}
        {activeTab === "availability" && (
          <div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: 20 }}>
              Weekly Schedule
            </h3>
            <AvailabilityEditor
              availability={availability}
              onAdd={handleSaveAvailability}
              onRemove={handleRemoveAvailability}
            />
          </div>
        )}

        {/* ─── Profile ─── */}
        {activeTab === "profile" && vet && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h3 style={{ fontSize: "1.1rem" }}>Your Profile</h3>
              <button
                className="btn-secondary"
                style={{ fontSize: "0.88rem" }}
                onClick={() => router.push("/dashboard/vet/onboarding")}
              >
                Edit Detailed Profile
              </button>
            </div>
            <ProfileEditor vet={vet} onSave={handleSaveProfile} />
          </div>
        )}

        {/* ─── Verification ─── */}
        {activeTab === "verification" && vet && (
          <div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: 20 }}>
              Verification Status
            </h3>
            <VerificationPanel vet={vet} onSubmit={handleSubmitVerification} />
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════
   Service Form
   ═══════════════════════════════════════ */

function ServiceForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: VetService | null;
  onSave: (svc: Partial<VetService>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [serviceType, setServiceType] = useState<ServiceType>(
    initial?.service_type || "video_consult"
  );
  const [description, setDescription] = useState(
    initial?.description || ""
  );
  const [price, setPrice] = useState(initial?.price?.toString() || "");
  const [duration, setDuration] = useState(
    initial?.duration_minutes?.toString() || "30"
  );

  return (
    <div
      className="card"
      style={{
        padding: 22,
        marginBottom: 20,
        background: "var(--paper)",
      }}
    >
      <h4
        style={{
          fontSize: "1rem",
          marginBottom: 16,
        }}
      >
        {initial ? "Edit Service" : "New Service"}
      </h4>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Video Consultation"
          />
        </div>
        <div className="field">
          <label>Service Type</label>
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value as ServiceType)}
          >
            {Object.entries(SERVICE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Price (₹)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="500"
          />
        </div>
        <div className="field">
          <label>Duration (min)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="30"
          />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe what this service includes…"
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          className="btn-primary"
          onClick={() =>
            onSave({
              title,
              service_type: serviceType as VetService["service_type"],
              description,
              price: Number(price) || 0,
              duration_minutes: Number(duration) || 30,
            })
          }
        >
          {initial ? "Save Changes" : "Add Service"}
        </button>
        <button className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Availability Editor
   ═══════════════════════════════════════ */

function AvailabilityEditor({
  availability,
  onAdd,
  onRemove,
}: {
  availability: VetAvailability[];
  onAdd: (day: number, start: string, end: string) => void;
  onRemove: (id: string) => void;
}) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  const grouped = useMemo(() => {
    const map: Record<number, VetAvailability[]> = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    availability.forEach((a) => {
      map[a.day_of_week]?.push(a);
    });
    return map;
  }, [availability]);

  return (
    <div>
      {/* Add slot form */}
      <div
        className="card"
        style={{ padding: 22, marginBottom: 24 }}
      >
        <h4 style={{ fontSize: "1rem", marginBottom: 14 }}>
          Add Time Slot
        </h4>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <div className="field">
            <label>Day</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
            >
              {DAYS_SHORT.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Start</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="field">
            <label>End</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <button
            className="btn-primary"
            onClick={() => onAdd(selectedDay, startTime, endTime)}
          >
            Add
          </button>
        </div>
      </div>

      {/* Weekly schedule grouped by day */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {DAYS_SHORT.map((dayName, dayIdx) => (
          <div key={dayIdx}>
            <h4
              style={{
                fontSize: "0.92rem",
                fontWeight: 600,
                color: grouped[dayIdx].length > 0 ? "var(--ink)" : "var(--ink-soft)",
                marginBottom: 8,
              }}
            >
              {dayName}
            </h4>
            {grouped[dayIdx].length === 0 ? (
              <div
                style={{
                  color: "var(--ink-soft)",
                  fontSize: "0.85rem",
                  padding: "10px 14px",
                  border: "1px dashed var(--line)",
                  borderRadius: "var(--radius-m)",
                }}
              >
                No slots
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {grouped[dayIdx].map((slot) => (
                  <div
                    key={slot.id}
                    className="card"
                    style={{
                      padding: "10px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: "0.92rem" }}>
                      {slot.start_time} – {slot.end_time}
                    </span>
                    <button
                      className="btn-ghost"
                      style={{ color: "var(--rose)", padding: "4px 8px" }}
                      onClick={() => onRemove(slot.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Profile Editor
   ═══════════════════════════════════════ */

function ProfileEditor({
  vet,
  onSave,
}: {
  vet: Vet;
  onSave: (fields: Partial<Vet>) => void;
}) {
  const [displayName, setDisplayName] = useState(vet.display_name || "");
  const [bio, setBio] = useState(vet.bio || "");
  const [city, setCity] = useState(vet.city || "");
  const [area, setArea] = useState(vet.area || "");
  const [clinicName, setClinicName] = useState(vet.clinic_name || "");
  const [consultationPrice, setConsultationPrice] = useState(
    vet.consultation_price?.toString() || ""
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave({
      display_name: displayName,
      bio,
      city,
      area,
      clinic_name: clinicName,
      consultation_price: Number(consultationPrice) || 0,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="card" style={{ padding: 22 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Display Name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div className="field">
          <label>City</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="field">
          <label>Area</label>
          <input value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
        <div className="field">
          <label>Clinic Name</label>
          <input
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Consultation Price (₹)</label>
          <input
            type="number"
            value={consultationPrice}
            onChange={(e) => setConsultationPrice(e.target.value)}
          />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Tell pet owners about yourself…"
          />
        </div>
      </div>

      {/* Read-only fields */}
      <div
        style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: "1px solid var(--line)",
        }}
      >
        <h4
          style={{
            fontSize: "0.92rem",
            marginBottom: 12,
            color: "var(--ink-soft)",
          }}
        >
          Professional Details (edit via onboarding)
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            fontSize: "0.9rem",
          }}
        >
          <div>
            <span style={{ color: "var(--ink-soft)" }}>Specialization: </span>
            {vet.specialization || "–"}
          </div>
          <div>
            <span style={{ color: "var(--ink-soft)" }}>Degree: </span>
            {vet.degree || "–"}
          </div>
          <div>
            <span style={{ color: "var(--ink-soft)" }}>University: </span>
            {vet.university || "–"}
          </div>
          <div>
            <span style={{ color: "var(--ink-soft)" }}>Experience: </span>
            {vet.years_experience ? `${vet.years_experience} years` : "–"}
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <span style={{ color: "var(--ink-soft)" }}>Languages: </span>
            {vet.languages?.length > 0 ? vet.languages.join(", ") : "–"}
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <span style={{ color: "var(--ink-soft)" }}>
              Species Treated:{" "}
            </span>
            {vet.species_treated?.length > 0
              ? vet.species_treated.join(", ")
              : "–"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 20, alignItems: "center" }}>
        <button className="btn-primary" onClick={handleSave}>
          Save Profile
        </button>
        {saved && (
          <span
            style={{
              color: "#4C8B5B",
              fontSize: "0.88rem",
              fontWeight: 600,
            }}
          >
            Saved ✓
          </span>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Verification Panel
   ═══════════════════════════════════════ */

function VerificationPanel({
  vet,
  onSubmit,
}: {
  vet: Vet;
  onSubmit: () => void;
}) {
  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    pending: { bg: "#E4A13B22", text: "#C6842A", border: "#E4A13B" },
    under_review: { bg: "#12383222", text: "#123832", border: "#123832" },
    verified: { bg: "#4C8B5B22", text: "#4C8B5B", border: "#4C8B5B" },
    rejected: { bg: "#C9727A22", text: "#C9727A", border: "#C9727A" },
  };

  const statusLabels: Record<string, string> = {
    pending: "Pending",
    under_review: "Under Review",
    verified: "Verified",
    rejected: "Rejected",
  };

  const current = statusColors[vet.verification_status] || statusColors.pending;

  return (
    <div>
      {/* Status card */}
      <div
        className="card"
        style={{
          padding: 24,
          marginBottom: 20,
          borderLeft: `4px solid ${current.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 6,
              }}
            >
              <h3 style={{ fontSize: "1.1rem" }}>Verification Status</h3>
              <span
                style={{
                  padding: "5px 12px",
                  borderRadius: 100,
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  background: current.bg,
                  color: current.text,
                  border: `1px solid ${current.border}`,
                }}
              >
                {statusLabels[vet.verification_status] || vet.verification_status}
              </span>
            </div>
            {vet.verification_status === "verified" && vet.verified_at && (
              <p
                style={{
                  color: "var(--ink-soft)",
                  fontSize: "0.88rem",
                }}
              >
                Verified on {formatDate(vet.verified_at)}
              </p>
            )}
            {vet.verification_status === "rejected" && vet.rejection_reason && (
              <p
                style={{
                  color: "var(--rose)",
                  fontSize: "0.88rem",
                  marginTop: 4,
                }}
              >
                Reason: {vet.rejection_reason}
              </p>
            )}
          </div>
          {(vet.verification_status === "pending" ||
            vet.verification_status === "rejected") && (
            <button className="btn-primary" onClick={onSubmit}>
              {vet.verification_status === "rejected"
                ? "Resubmit for Review"
                : "Submit for Review"}
            </button>
          )}
        </div>
      </div>

      {/* Documents */}
      <div
        className="card"
        style={{ padding: 22, marginBottom: 20 }}
      >
        <h4 style={{ fontSize: "1rem", marginBottom: 14 }}>
          Submitted Documents
        </h4>
        {vet.verification_documents &&
        vet.verification_documents.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {vet.verification_documents.map((doc, idx) => (
              <div
                key={idx}
                style={{
                  padding: "10px 14px",
                  background: "var(--paper)",
                  borderRadius: "var(--radius-s)",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ color: "var(--ink-soft)" }}>📄</span>
                {doc}
              </div>
            ))}
          </div>
        ) : (
          <p
            style={{
              color: "var(--ink-soft)",
              fontSize: "0.9rem",
            }}
          >
            No documents submitted yet. Complete your onboarding to upload
            verification documents.
          </p>
        )}
      </div>

      {/* Verification info */}
      <div
        className="card"
        style={{ padding: 22 }}
      >
        <h4 style={{ fontSize: "1rem", marginBottom: 10 }}>
          About Verification
        </h4>
        <ul
          style={{
            margin: 0,
            paddingLeft: 20,
            fontSize: "0.9rem",
            color: "var(--ink-soft)",
            lineHeight: 1.7,
          }}
        >
          <li>
            Verification confirms your professional credentials and registration.
          </li>
          <li>
            Our team reviews your degree, registration number, and council
            membership.
          </li>
          <li>
            Verification typically takes 1–2 business days.
          </li>
          <li>
            Verified vets receive a badge and higher visibility in search results.
          </li>
        </ul>
      </div>
    </div>
  );
}

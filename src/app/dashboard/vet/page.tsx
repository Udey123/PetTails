"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { formatDate, SERVICE_LABELS, STATUS_LABELS } from "@/lib/utils";
import type { Booking, Availability, Review } from "@/lib/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function VetDashboard() {
  const [activeTab, setActiveTab] = useState("bookings");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [vetRecord, setVetRecord] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: vet } = await supabase
        .from("vets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (vet) {
        setVetRecord(vet);
        setOnline(vet.online);
        setAccepting(vet.accepting_bookings);

        const [bookingsRes, availRes, reviewsRes] = await Promise.all([
          supabase.from("bookings").select("*, pets(name, species), profiles(name)").eq("vet_id", vet.id).order("created_at", { ascending: false }),
          supabase.from("availability").select("*").eq("vet_id", vet.id),
          supabase.from("reviews").select("*, profiles(name)").eq("vet_id", vet.id),
        ]);

        setBookings(bookingsRes.data || []);
        setAvailability(availRes.data || []);
        setReviews(reviewsRes.data || []);
      }
      setLoading(false);
    };
    load();
  }, [supabase, router]);

  const updateBookingStatus = async (bookingId: string, status: string) => {
    await supabase.from("bookings").update({ status }).eq("id", bookingId);
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: status as Booking["status"] } : b))
    );
  };

  const toggleOnline = async (val: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: vet } = await supabase
      .from("vets")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (vet) {
      await supabase.from("vets").update({ online: val }).eq("id", vet.id);
      setOnline(val);
    }
  };

  const toggleAccepting = async (val: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: vet } = await supabase
      .from("vets")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (vet) {
      await supabase.from("vets").update({ accepting_bookings: val }).eq("id", vet.id);
      setAccepting(val);
    }
  };

  const addAvailability = async (day: number, start: string, end: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: vet } = await supabase
      .from("vets")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (vet) {
      await supabase.from("availability").upsert({
        vet_id: vet.id,
        day_of_week: day,
        start_time: start,
        end_time: end,
        is_available: true,
      });
      const { data } = await supabase.from("availability").select("*").eq("vet_id", vet.id);
      setAvailability(data || []);
    }
  };

  const removeAvailability = async (id: string) => {
    await supabase.from("availability").delete().eq("id", id);
    setAvailability((prev) => prev.filter((a) => a.id !== id));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const totalEarnings = bookings
    .filter((b) => b.payment_status === "paid")
    .reduce((sum, b) => sum + b.price, 0);

  if (loading) {
    return (
      <div style={{ padding: "84px 0", textAlign: "center", color: "var(--ink-soft)" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 0 84px" }}>
      <div className="wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>Vet Dashboard</h1>
            <p style={{ color: "var(--ink-soft)", fontSize: "0.94rem", marginTop: 4 }}>
              Manage bookings, availability, and your profile.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem" }}>
              <input
                type="checkbox"
                checked={online}
                onChange={(e) => toggleOnline(e.target.checked)}
              />
              Online
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem" }}>
              <input
                type="checkbox"
                checked={accepting}
                onChange={(e) => toggleAccepting(e.target.checked)}
              />
              Accepting bookings
            </label>
            <button className="btn-ghost" onClick={handleLogout}>Log out</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }} className="stats-grid">
          {[
            { label: "Total bookings", value: bookings.length },
            { label: "Completed", value: bookings.filter((b) => b.status === "completed").length },
            { label: "Pending", value: bookings.filter((b) => b.status === "pending").length },
            { label: "Earnings", value: `₹${totalEarnings.toLocaleString("en-IN")}` },
          ].map((stat) => (
            <div key={stat.label} className="card" style={{ padding: 18, textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-fraunces), Fraunces, serif", fontSize: "1.6rem", fontWeight: 600 }}>
                {stat.value}
              </div>
              <div style={{ color: "var(--ink-soft)", fontSize: "0.85rem" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="tab-nav">
          {[
            { id: "bookings", label: "Bookings" },
            { id: "availability", label: "Availability" },
            { id: "reviews", label: "Reviews" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "bookings" && (
          <div>
            {bookings.length === 0 ? (
              <div style={{ color: "var(--ink-soft)", padding: 40, textAlign: "center" }}>
                No bookings yet. When pet owners book you, they&apos;ll appear here.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {bookings.map((b) => (
                  <div key={b.id} className="card" style={{ padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "1rem" }}>
                          {b.profiles?.name || "Pet Owner"}
                        </div>
                        <div style={{ color: "var(--ink-soft)", fontSize: "0.88rem", marginTop: 2 }}>
                          Pet: {b.pets?.name} ({b.pets?.species}) · {SERVICE_LABELS[b.service_type]}
                        </div>
                        <div style={{ color: "var(--ink-soft)", fontSize: "0.85rem" }}>
                          {formatDate(b.scheduled_at)} · Ref: {b.booking_reference}
                        </div>
                        {b.concern && (
                          <div style={{ color: "var(--ink-soft)", fontSize: "0.85rem", marginTop: 4 }}>
                            Concern: {b.concern}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 100,
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            background: b.status === "completed" ? "#4C8B5B22" : b.status === "cancelled" ? "#C9727A22" : "#E4A13B22",
                            color: b.status === "completed" ? "#4C8B5B" : b.status === "cancelled" ? "var(--rose)" : "var(--amber-dark)",
                          }}
                        >
                          {STATUS_LABELS[b.status] || b.status}
                        </span>
                      </div>
                    </div>
                    {b.status === "pending" && (
                      <div style={{ display: "flex", gap: 8, marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                        <button
                          className="btn-primary"
                          style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                          onClick={() => updateBookingStatus(b.id, "confirmed")}
                        >
                          Accept
                        </button>
                        <button
                          className="btn-danger"
                          style={{ fontSize: "0.85rem" }}
                          onClick={() => updateBookingStatus(b.id, "declined")}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {b.status === "confirmed" && (
                      <div style={{ display: "flex", gap: 8, marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                        <button
                          className="btn-primary"
                          style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                          onClick={() => updateBookingStatus(b.id, "in_progress")}
                        >
                          Start visit
                        </button>
                        <button
                          className="btn-primary"
                          style={{ padding: "8px 16px", fontSize: "0.85rem", background: "#4C8B5B" }}
                          onClick={() => updateBookingStatus(b.id, "completed")}
                        >
                          Complete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "availability" && (
          <div>
            <div className="card" style={{ padding: 22, marginBottom: 24 }}>
              <h3 style={{ fontSize: "1.1rem", marginBottom: 16 }}>Add availability</h3>
              <AvailabilityForm onAdd={addAvailability} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {availability.length === 0 ? (
                <div style={{ color: "var(--ink-soft)", padding: 20, border: "1px dashed var(--line)", borderRadius: "var(--radius-m)", textAlign: "center" }}>
                  No availability set. Add your available hours above.
                </div>
              ) : (
                availability.map((a) => (
                  <div
                    key={a.id}
                    className="card"
                    style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <span>
                      {DAYS[a.day_of_week]} · {a.start_time} – {a.end_time}
                    </span>
                    <button
                      className="btn-ghost"
                      style={{ color: "var(--rose)" }}
                      onClick={() => removeAvailability(a.id)}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "reviews" && (
          <div>
            {reviews.length === 0 ? (
              <div style={{ color: "var(--ink-soft)", padding: 40, textAlign: "center" }}>
                No reviews yet. Reviews appear after completed bookings.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {reviews.map((r) => (
                  <div key={r.id} className="card" style={{ padding: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontWeight: 600 }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                      <span style={{ color: "var(--ink-soft)", fontSize: "0.85rem" }}>
                        by {r.profiles?.name || "Anonymous"} · {formatDate(r.created_at)}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.95rem" }}>{r.review_text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 600px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}

function AvailabilityForm({ onAdd }: { onAdd: (day: number, start: string, end: string) => void }) {
  const [day, setDay] = useState(1);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
      <div className="field">
        <label>Day</label>
        <select value={day} onChange={(e) => setDay(Number(e.target.value))}>
          {DAYS.map((d, i) => (
            <option key={i} value={i}>{d}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Start</label>
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
      </div>
      <div className="field">
        <label>End</label>
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <button className="btn-primary" onClick={() => onAdd(day, start, end)}>
        Add
      </button>
    </div>
  );
}

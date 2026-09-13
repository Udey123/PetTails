"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { formatDate, SERVICE_LABELS, STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/utils";
import type { Pet, Booking, Review } from "@/lib/types";

export default function OwnerDashboard() {
  const [activeTab, setActiveTab] = useState("pets");
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

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const [petsRes, bookingsRes, reviewsRes] = await Promise.all([
        supabase.from("pets").select("*").eq("owner_id", user.id),
        supabase.from("bookings").select("*, pets(name, species), vets(*, profiles(name))").eq("owner_id", user.id).order("created_at", { ascending: false }),
        supabase.from("reviews").select("*").eq("owner_id", user.id),
      ]);

      setPets(petsRes.data || []);
      setBookings(bookingsRes.data || []);
      setReviews(reviewsRes.data || []);
      setLoading(false);
    };
    load();
  }, [supabase, router]);

  const addPet = async () => {
    if (!petName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingPet) {
      await supabase.from("pets").update({
        name: petName,
        species: petSpecies,
        breed: petBreed || null,
        age: petAge || null,
        weight: petWeight || null,
      }).eq("id", editingPet);
      setEditingPet(null);
    } else {
      await supabase.from("pets").insert({
        owner_id: user.id,
        name: petName,
        species: petSpecies,
        breed: petBreed || null,
        age: petAge || null,
        weight: petWeight || null,
      });
    }

    setPetName("");
    setPetBreed("");
    setPetAge("");
    setPetWeight("");
    const { data } = await supabase.from("pets").select("*").eq("owner_id", user.id);
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
    await supabase.from("pets").delete().eq("id", id);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("pets").select("*").eq("owner_id", user.id);
      setPets(data || []);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>My Dashboard</h1>
            <p style={{ color: "var(--ink-soft)", fontSize: "0.94rem", marginTop: 4 }}>
              Manage your pets, bookings, and reviews.
            </p>
          </div>
          <button className="btn-ghost" onClick={handleLogout}>Log out</button>
        </div>

        <div className="tab-nav">
          {[
            { id: "pets", label: "My Pets" },
            { id: "bookings", label: "Bookings" },
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

        {activeTab === "pets" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 32 }} className="profile-layout">
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }} className="hail-row">
                <div className="field">
                  <label>Species</label>
                  <select value={petSpecies} onChange={(e) => setPetSpecies(e.target.value)}>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }} className="hail-row">
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
              <button className="btn-primary" style={{ width: "100%" }} onClick={addPet}>
                {editingPet ? "Update pet" : "Save pet"}
              </button>
              {editingPet && (
                <button
                  className="btn-ghost"
                  style={{ width: "100%", marginTop: 8 }}
                  onClick={() => { setEditingPet(null); setPetName(""); setPetBreed(""); setPetAge(""); setPetWeight(""); }}
                >
                  Cancel
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {pets.length === 0 ? (
                <div style={{ color: "var(--ink-soft)", fontSize: "0.94rem", padding: 20, border: "1px dashed var(--line)", borderRadius: "var(--radius-m)", textAlign: "center" }}>
                  No pets saved yet — add one on the left.
                </div>
              ) : (
                pets.map((pet) => (
                  <div
                    key={pet.id}
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius-m)",
                      background: "var(--white)",
                      padding: "16px 18px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: "var(--font-fraunces), Fraunces, serif", fontWeight: 600, fontSize: "1.05rem" }}>
                        {pet.name}
                      </div>
                      <div style={{ color: "var(--ink-soft)", fontSize: "0.86rem", marginTop: 2 }}>
                        {[pet.species, pet.breed, pet.age, pet.weight].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn-ghost" onClick={() => editPet(pet)} style={{ fontSize: "0.85rem" }}>
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

        {activeTab === "bookings" && (
          <div>
            {bookings.length === 0 ? (
              <div style={{ color: "var(--ink-soft)", padding: 40, textAlign: "center" }}>
                No bookings yet. <a href="/#vets" style={{ color: "var(--deep)" }}>Browse vets</a> to book your first visit.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="card"
                    style={{ padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "1rem" }}>
                        Dr. {b.vets?.profiles?.name || "Unknown"}
                      </div>
                      <div style={{ color: "var(--ink-soft)", fontSize: "0.88rem", marginTop: 2 }}>
                        {b.pets?.name} · {SERVICE_LABELS[b.service_type] || b.service_type}
                      </div>
                      <div style={{ color: "var(--ink-soft)", fontSize: "0.85rem" }}>
                        {formatDate(b.scheduled_at)} · Ref: {b.booking_reference}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 100,
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          background: b.payment_status === "paid" ? "#4C8B5B22" : "#C9727A22",
                          color: b.payment_status === "paid" ? "#4C8B5B" : "var(--rose)",
                        }}
                      >
                        {PAYMENT_STATUS_LABELS[b.payment_status] || b.payment_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "reviews" && (
          <div>
            {reviews.length === 0 ? (
              <div style={{ color: "var(--ink-soft)", padding: 40, textAlign: "center" }}>
                No reviews yet. Reviews appear after completing a booking.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {reviews.map((r) => (
                  <div key={r.id} className="card" style={{ padding: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontWeight: 600 }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                      <span style={{ color: "var(--ink-soft)", fontSize: "0.85rem" }}>{formatDate(r.created_at)}</span>
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
        @media (max-width: 800px) {
          .profile-layout { grid-template-columns: 1fr !important; }
          .hail-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

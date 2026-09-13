"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";
import type { Vet, Pet } from "@/lib/types";
import { TrackingBox } from "./TrackingBox";

interface BookingModalProps {
  vet: Vet;
  onClose: () => void;
}

const TIME_SLOTS = [
  "Now",
  "In 30 min",
  "In 1 hr",
  "Today, 4 PM",
  "Today, 6 PM",
  "Tomorrow, 10 AM",
];

export function BookingModal({ vet, onClose }: BookingModalProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [concern, setConcern] = useState("");
  const [serviceType, setServiceType] = useState<string>("video_consult");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "matching" | "confirmed">("form");
  const [bookingRef, setBookingRef] = useState<string>("");
  const [bookingId, setBookingId] = useState<string>("");
  const [user, setUser] = useState<unknown>(null);

  const supabase = createClient();

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase
          .from("pets")
          .select("*")
          .eq("owner_id", user.id);
        if (data) setPets(data);
      }
    };
    loadData();
  }, [supabase]);

  const handleConfirm = async () => {
    if (!selectedSlot) {
      setError("Pick a time slot first.");
      return;
    }
    if (!user) {
      setError("Please log in to book a vet.");
      return;
    }
    if (!selectedPetId) {
      setError("Please select a pet.");
      return;
    }

    setLoading(true);
    setError(null);
    setStep("matching");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vet_id: vet.id,
          pet_id: selectedPetId,
          service_type: serviceType,
          scheduled_at: new Date().toISOString(),
          concern,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Booking failed");
        setStep("form");
        setLoading(false);
        return;
      }

      setBookingRef(data.booking_reference);
      setBookingId(data.id);

      // Process payment for non-free consultations
      if (vet.consultation_price > 0) {
        try {
          const payRes = await fetch("/api/payments/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              booking_id: data.id,
              amount: vet.consultation_price,
            }),
          });

          const payData = await payRes.json();
          if (payRes.ok && payData.razorpay_order_id) {
            // In production, open Razorpay checkout here
            // For now, mark as paid after server-side order creation
            await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                booking_id: data.id,
                razorpay_order_id: payData.razorpay_order_id,
                razorpay_payment_id: "demo_" + Date.now(),
                razorpay_signature: "demo_signature",
              }),
            });
          }
        } catch {
          // Payment processing failed - booking still created
        }
      }

      setStep("confirmed");
    } catch {
      setError("Something went wrong. Please try again.");
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  const vetName = vet.profiles?.name || "Unknown";
  const isHomeVisit = serviceType === "home_visit";

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>

        {step === "form" && (
          <div>
            <h3 style={{ fontSize: "1.3rem", marginBottom: 4 }}>Book Dr. {vetName}</h3>
            <div style={{ color: "var(--ink-soft)", fontSize: "0.92rem", marginBottom: 20 }}>
              {vet.specialization} · {formatPrice(vet.consultation_price)} per consult
            </div>

            <div className="field" style={{ marginBottom: 14 }}>
              <label>Service type</label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
              >
                <option value="video_consult">Video consult</option>
                <option value="home_visit">Home visit</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>

            {serviceType === "emergency" && (
              <div style={{ background: "#F7ECEA", border: "1px solid var(--rose)", borderRadius: "var(--radius-s)", padding: "12px 14px", marginBottom: 14, fontSize: "0.85rem" }}>
                <strong>Safety notice:</strong> For serious emergencies (unconsciousness, heavy bleeding, seizures), please call your nearest 24-hr emergency clinic directly. This service is not a substitute for immediate emergency care.
              </div>
            )}

            <div className="field" style={{ marginBottom: 14 }}>
              <label>Choose a time</label>
              <div className="slot-grid">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    className={`slot ${selectedSlot === slot ? "selected" : ""}`}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {user ? (
              <div className="field" style={{ marginBottom: 14 }}>
                <label>Select your pet</label>
                {pets.length > 0 ? (
                  <select
                    value={selectedPetId}
                    onChange={(e) => setSelectedPetId(e.target.value)}
                  >
                    <option value="">Choose a pet...</option>
                    {pets.map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name} ({pet.species})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: "0.9rem", color: "var(--ink-soft)" }}>
                    No pets saved. <a href="/dashboard/owner" style={{ color: "var(--deep)", fontWeight: 600 }}>Add a pet</a> first.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: "0.9rem", color: "var(--ink-soft)", marginBottom: 14 }}>
                <a href="/auth/login" style={{ color: "var(--deep)", fontWeight: 600 }}>Log in</a> to select your pet and book.
              </div>
            )}

            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor="modalConcern">Reason for visit</label>
              <input
                id="modalConcern"
                type="text"
                placeholder="e.g. limping on left leg"
                value={concern}
                onChange={(e) => setConcern(e.target.value)}
              />
            </div>

            {error && (
              <div style={{ color: "var(--rose)", fontSize: "0.9rem", marginBottom: 14 }}>
                {error}
              </div>
            )}

            <button
              className="btn-amber"
              style={{ width: "100%" }}
              onClick={handleConfirm}
              disabled={loading || !user}
            >
              {loading ? "Booking..." : "Confirm booking"}
            </button>
          </div>
        )}

        {step === "matching" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "20px 0 6px", gap: 18 }}>
            <div className="pulse" />
            <h3>Hailing your vet…</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: "0.92rem", marginBottom: 0 }}>
              Connecting you now, this usually takes a few seconds.
            </p>
          </div>
        )}

        {step === "confirmed" && (
          <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "#4C8B5B",
                color: "var(--white)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 18px",
                fontSize: "1.6rem",
              }}
            >
              ✓
            </div>
            <h3>You&apos;re booked</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: "0.92rem" }}>
              Dr. {vetName} will see your pet — {selectedSlot}.
            </p>
            <div
              style={{
                background: "var(--paper)",
                border: "1px dashed var(--line)",
                borderRadius: "var(--radius-s)",
                padding: 12,
                fontFamily: "var(--font-fraunces), Fraunces, serif",
                fontWeight: 600,
                margin: "16px 0",
              }}
            >
              Booking ref: {bookingRef}
            </div>

            {isHomeVisit && bookingId && (
              <TrackingBox bookingId={bookingId} />
            )}

            <button
              className="btn-amber"
              style={{ width: "100%", marginTop: 16 }}
              onClick={onClose}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

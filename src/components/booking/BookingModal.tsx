"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  formatPrice,
  SERVICE_LABELS,
  SERVICE_ICONS,
  URGENCY_LABELS,
  URGENCY_DESCRIPTIONS,
  URGENCY_COLORS,
} from "@/lib/utils";
import type { Vet, Pet, VetService, TimeSlot } from "@/lib/types";
import { TrackingBox } from "./TrackingBox";

interface BookingModalProps {
  vet: Vet;
  onClose: () => void;
}

type Step =
  | "pet"
  | "service"
  | "urgency"
  | "problem"
  | "datetime"
  | "summary"
  | "payment"
  | "confirmation";

const STEPS: { key: Step; label: string }[] = [
  { key: "pet", label: "Pet" },
  { key: "service", label: "Service" },
  { key: "urgency", label: "Urgency" },
  { key: "problem", label: "Details" },
  { key: "datetime", label: "Date & Time" },
  { key: "summary", label: "Summary" },
  { key: "payment", label: "Payment" },
  { key: "confirmation", label: "Done" },
];

const SPECIES_OPTIONS = [
  "Dog",
  "Cat",
  "Bird",
  "Rabbit",
  "Hamster",
  "Guinea Pig",
  "Reptile",
  "Fish",
  "Other",
];

const URGENCY_KEYS = ["routine", "soon", "urgent", "emergency"] as const;

function getNextDays(count: number): { label: string; date: string; dayName: string }[] {
  const days: { label: string; date: string; dayName: string }[] = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : `${monthNames[d.getMonth()]} ${d.getDate()}`,
      date: d.toISOString().split("T")[0],
      dayName: dayNames[d.getDay()],
    });
  }
  return days;
}

export function BookingModal({ vet, onClose }: BookingModalProps) {
  const supabase = createClient();

  const [step, setStep] = useState<Step>("pet");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState("");
  const [showAddPet, setShowAddPet] = useState(false);
  const [newPetName, setNewPetName] = useState("");
  const [newPetSpecies, setNewPetSpecies] = useState("");
  const [newPetBreed, setNewPetBreed] = useState("");
  const [addingPet, setAddingPet] = useState(false);

  const services: VetService[] = useMemo(() => {
    if (vet.vet_services && vet.vet_services.length > 0) {
      return vet.vet_services.filter((s) => s.is_active);
    }
    return [
      {
        id: "default-video",
        vet_id: vet.id,
        service_type: "video_consult",
        title: "Video Consultation",
        description: "Connect with the vet over a live video call.",
        price: vet.consultation_price,
        duration_minutes: 30,
        is_active: true,
        created_at: "",
      },
    ];
  }, [vet]);

  const [selectedService, setSelectedService] = useState<VetService | null>(
    services[0] || null
  );
  const [urgency, setUrgency] = useState<string>("routine");
  const [symptoms, setSymptoms] = useState("");

  const dateOptions = useMemo(() => getNextDays(7), []);
  const [selectedDate, setSelectedDate] = useState(dateOptions[0]?.date || "");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const [bookingRef, setBookingRef] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);
  const selectedPet = pets.find((p) => p.id === selectedPetId);
  const vetName = vet.profiles?.name || vet.display_name || "Unknown Vet";

  useEffect(() => {
    const loadPets = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("pets")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });
      if (data) setPets(data);
    };
    loadPets();
  }, [supabase]);

  useEffect(() => {
    if (step !== "datetime" || !selectedDate) return;
    const fetchSlots = async () => {
      setSlotsLoading(true);
      setSelectedSlot(null);
      try {
        const res = await fetch(
          `/api/availability?vet_id=${vet.id}&date=${selectedDate}`
        );
        const data = await res.json();
        if (res.ok) {
          setSlots(data.slots || []);
        } else {
          setSlots([]);
        }
      } catch {
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [step, selectedDate, vet.id]);

  function validateStep(): string | null {
    switch (step) {
      case "pet":
        if (!selectedPetId) return "Please select a pet.";
        return null;
      case "service":
        if (!selectedService) return "Please select a service.";
        return null;
      case "urgency":
        if (!urgency) return "Please select an urgency level.";
        return null;
      case "problem":
        return null;
      case "datetime":
        if (!selectedSlot) return "Please select a time slot.";
        return null;
      case "summary":
        return null;
      default:
        return null;
    }
  }

  function handleNext() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    const idx = STEPS.findIndex((s) => s.key === step);
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1].key);
    }
  }

  function handleBack() {
    setError(null);
    const idx = STEPS.findIndex((s) => s.key === step);
    if (idx > 0) {
      setStep(STEPS[idx - 1].key);
    }
  }

  async function handleAddPet() {
    if (!newPetName.trim() || !newPetSpecies.trim()) return;
    setAddingPet(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Please log in first.");
        return;
      }
      const { data, error: insertErr } = await supabase
        .from("pets")
        .insert({
          owner_id: user.id,
          name: newPetName.trim(),
          species: newPetSpecies.trim(),
          breed: newPetBreed.trim() || null,
        })
        .select()
        .single();
      if (insertErr) {
        setError("Failed to add pet. Please try again.");
        return;
      }
      if (data) {
        setPets((prev) => [...prev, data]);
        setSelectedPetId(data.id);
        setShowAddPet(false);
        setNewPetName("");
        setNewPetSpecies("");
        setNewPetBreed("");
      }
    } catch {
      setError("Something went wrong adding your pet.");
    } finally {
      setAddingPet(false);
    }
  }

  async function handleCreateBooking() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vet_id: vet.id,
          pet_id: selectedPetId,
          service_type: selectedService?.service_type || "video_consult",
          service_id: selectedService?.id || null,
          scheduled_at: selectedSlot?.start,
          urgency,
          concern: symptoms || null,
          symptoms: symptoms || null,
          duration_minutes: selectedService?.duration_minutes || 30,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Booking failed. Please try again.");
        setLoading(false);
        return;
      }

      setBookingRef(data.booking_reference);
      setBookingId(data.id);

      const price = selectedService?.price || 0;
      if (price > 0) {
        setStep("payment");
        setLoading(false);
        return;
      }

      setStep("confirmation");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handlePayment() {
    setPaymentProcessing(true);
    setError(null);
    try {
      const payRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          amount: selectedService?.price || vet.consultation_price,
        }),
      });

      const payData = await payRes.json();

      if (payRes.ok && payData.razorpay_order_id) {
        await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            booking_id: bookingId,
            razorpay_order_id: payData.razorpay_order_id,
            razorpay_payment_id: "demo_" + Date.now(),
            razorpay_signature: "demo_signature",
          }),
        });
      }

      setStep("confirmation");
    } catch {
      setError("Payment failed. Your booking is saved — you can retry payment from your dashboard.");
      setStep("confirmation");
    } finally {
      setPaymentProcessing(false);
    }
  }

  function formatSlotTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  function formatSelectedDate() {
    if (!selectedDate) return "";
    const d = new Date(selectedDate + "T00:00:00");
    return d.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ padding: 0, overflow: "hidden" }}>
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
          style={{ zIndex: 10 }}
        >
          ×
        </button>

        {/* Progress bar */}
        <div style={{ padding: "20px 28px 0" }}>
          <div
            style={{
              display: "flex",
              gap: 3,
              marginBottom: 6,
            }}
          >
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background:
                    i <= currentStepIndex ? "var(--deep)" : "var(--line)",
                  transition: "background 0.3s",
                }}
              />
            ))}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--ink-soft)",
              fontWeight: 500,
            }}
          >
            Step {currentStepIndex + 1} of {STEPS.length}
          </div>
        </div>

        {/* Step content */}
        <div style={{ padding: "16px 28px 20px", minHeight: 340 }}>
          {/* ── Step 1: Select Pet ── */}
          {step === "pet" && (
            <div>
              <h3 style={{ fontSize: "1.2rem", marginBottom: 4 }}>
                Who&apos;s the patient?
              </h3>
              <p
                style={{
                  color: "var(--ink-soft)",
                  fontSize: "0.88rem",
                  marginBottom: 18,
                }}
              >
                Select the pet you&apos;d like to book for.
              </p>

              {pets.length === 0 && !showAddPet ? (
                <div>
                  <div
                    style={{
                      textAlign: "center",
                      padding: "28px 16px",
                      border: "1px dashed var(--line)",
                      borderRadius: "var(--radius-m)",
                      marginBottom: 14,
                    }}
                  >
                    <div style={{ fontSize: "1.8rem", marginBottom: 10 }}>🐾</div>
                    <p
                      style={{
                        color: "var(--ink-soft)",
                        fontSize: "0.9rem",
                        marginBottom: 14,
                      }}
                    >
                      You haven&apos;t added any pets yet.
                    </p>
                    <button
                      className="btn-amber"
                      onClick={() => setShowAddPet(true)}
                      style={{ fontSize: "0.88rem" }}
                    >
                      Add your first pet
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  {pets.map((pet) => (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => setSelectedPetId(pet.id)}
                      style={{
                        border: `2px solid ${
                          selectedPetId === pet.id ? "var(--deep)" : "var(--line)"
                        }`,
                        borderRadius: "var(--radius-m)",
                        padding: "14px 12px",
                        background:
                          selectedPetId === pet.id
                            ? "var(--deep)"
                            : "var(--white)",
                        color:
                          selectedPetId === pet.id ? "var(--white)" : "var(--ink)",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "1.3rem",
                          marginBottom: 6,
                        }}
                      >
                        {pet.species === "Dog"
                          ? "🐕"
                          : pet.species === "Cat"
                          ? "🐈"
                          : pet.species === "Bird"
                          ? "🐦"
                          : "🐾"}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>
                        {pet.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.78rem",
                          opacity: 0.8,
                          marginTop: 2,
                        }}
                      >
                        {pet.species}
                        {pet.breed ? ` · ${pet.breed}` : ""}
                      </div>
                    </button>
                  ))}

                  {!showAddPet && (
                    <button
                      type="button"
                      onClick={() => setShowAddPet(true)}
                      style={{
                        border: "2px dashed var(--line)",
                        borderRadius: "var(--radius-m)",
                        padding: "14px 12px",
                        background: "transparent",
                        color: "var(--ink-soft)",
                        cursor: "pointer",
                        textAlign: "center",
                        fontSize: "0.85rem",
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        minHeight: 100,
                      }}
                    >
                      <span style={{ fontSize: "1.4rem" }}>+</span>
                      Add pet
                    </button>
                  )}
                </div>
              )}

              {showAddPet && (
                <div
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-m)",
                    padding: 16,
                    marginTop: 6,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      marginBottom: 12,
                    }}
                  >
                    Add a new pet
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <input
                      type="text"
                      placeholder="Pet name"
                      value={newPetName}
                      onChange={(e) => setNewPetName(e.target.value)}
                      style={{
                        width: "100%",
                        border: "1px solid var(--line)",
                        borderRadius: "var(--radius-s)",
                        padding: "9px 10px",
                        fontSize: "0.88rem",
                        background: "var(--white)",
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <select
                      value={newPetSpecies}
                      onChange={(e) => setNewPetSpecies(e.target.value)}
                      style={{
                        width: "100%",
                        border: "1px solid var(--line)",
                        borderRadius: "var(--radius-s)",
                        padding: "9px 10px",
                        fontSize: "0.88rem",
                        background: "var(--white)",
                      }}
                    >
                      <option value="">Select species</option>
                      {SPECIES_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <input
                      type="text"
                      placeholder="Breed (optional)"
                      value={newPetBreed}
                      onChange={(e) => setNewPetBreed(e.target.value)}
                      style={{
                        width: "100%",
                        border: "1px solid var(--line)",
                        borderRadius: "var(--radius-s)",
                        padding: "9px 10px",
                        fontSize: "0.88rem",
                        background: "var(--white)",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn-amber"
                      onClick={handleAddPet}
                      disabled={addingPet || !newPetName.trim() || !newPetSpecies.trim()}
                      style={{ flex: 1, fontSize: "0.85rem", padding: "10px 12px" }}
                    >
                      {addingPet ? "Adding..." : "Add pet"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddPet(false);
                        setNewPetName("");
                        setNewPetSpecies("");
                        setNewPetBreed("");
                      }}
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: "var(--radius-s)",
                        padding: "10px 14px",
                        background: "var(--white)",
                        color: "var(--ink-soft)",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        fontWeight: 500,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Select Service ── */}
          {step === "service" && (
            <div>
              <h3 style={{ fontSize: "1.2rem", marginBottom: 4 }}>
                Choose a service
              </h3>
              <p
                style={{
                  color: "var(--ink-soft)",
                  fontSize: "0.88rem",
                  marginBottom: 18,
                }}
              >
                Available services from {vetName}.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {services.map((svc) => (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => setSelectedService(svc)}
                    style={{
                      border: `2px solid ${
                        selectedService?.id === svc.id
                          ? "var(--deep)"
                          : "var(--line)"
                      }`,
                      borderRadius: "var(--radius-m)",
                      padding: "16px 18px",
                      background:
                        selectedService?.id === svc.id
                          ? "#12383208"
                          : "var(--white)",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      gap: 14,
                      alignItems: "flex-start",
                      transition: "all 0.15s",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.6rem",
                        lineHeight: 1,
                        marginTop: 2,
                      }}
                    >
                      {SERVICE_ICONS[svc.service_type] || "🩺"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                          {svc.title || SERVICE_LABELS[svc.service_type] || svc.service_type}
                        </span>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "0.92rem",
                            color: "var(--deep)",
                          }}
                        >
                          {formatPrice(svc.price)}
                        </span>
                      </div>
                      {svc.description && (
                        <p
                          style={{
                            color: "var(--ink-soft)",
                            fontSize: "0.82rem",
                            margin: 0,
                            lineHeight: 1.4,
                          }}
                        >
                          {svc.description}
                        </p>
                      )}
                      <div
                        style={{
                          fontSize: "0.76rem",
                          color: "var(--ink-soft)",
                          marginTop: 6,
                        }}
                      >
                        {svc.duration_minutes} min
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Select Urgency ── */}
          {step === "urgency" && (
            <div>
              <h3 style={{ fontSize: "1.2rem", marginBottom: 4 }}>
                How urgent is this?
              </h3>
              <p
                style={{
                  color: "var(--ink-soft)",
                  fontSize: "0.88rem",
                  marginBottom: 18,
                }}
              >
                This helps the vet prepare for your consultation.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                {URGENCY_KEYS.map((key) => {
                  const colors = URGENCY_COLORS[key];
                  const isSelected = urgency === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setUrgency(key)}
                      style={{
                        border: `2px solid ${isSelected ? colors.border : "var(--line)"}`,
                        borderRadius: "var(--radius-m)",
                        padding: "16px 14px",
                        background: isSelected ? colors.bg : "var(--white)",
                        color: isSelected ? colors.text : "var(--ink)",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: "0.92rem", marginBottom: 4 }}>
                        {URGENCY_LABELS[key]}
                      </div>
                      <div style={{ fontSize: "0.78rem", opacity: 0.85 }}>
                        {URGENCY_DESCRIPTIONS[key]}
                      </div>
                    </button>
                  );
                })}
              </div>

              {urgency === "emergency" && (
                <div
                  style={{
                    background: "#F7ECEA",
                    border: "1px solid var(--rose)",
                    borderRadius: "var(--radius-s)",
                    padding: "14px 16px",
                    fontSize: "0.84rem",
                    lineHeight: 1.5,
                    color: "#6B2C32",
                  }}
                >
                  <strong>Safety notice:</strong> For serious emergencies
                  (unconsciousness, heavy bleeding, seizures, difficulty
                  breathing), please call your nearest 24-hr emergency clinic
                  directly. This service is not a substitute for immediate
                  emergency care.
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Describe Problem ── */}
          {step === "problem" && (
            <div>
              <h3 style={{ fontSize: "1.2rem", marginBottom: 4 }}>
                Describe the concern
              </h3>
              <p
                style={{
                  color: "var(--ink-soft)",
                  fontSize: "0.88rem",
                  marginBottom: 18,
                }}
              >
                Share symptoms or details so the vet can prepare. This is optional
                but recommended.
              </p>

              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="e.g. My dog has been limping on the left front leg for 2 days, with slight swelling near the paw..."
                maxLength={1000}
                rows={6}
                style={{
                  width: "100%",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-s)",
                  padding: "12px 14px",
                  fontSize: "0.9rem",
                  fontFamily: "inherit",
                  lineHeight: 1.55,
                  resize: "vertical",
                  background: "var(--white)",
                }}
              />
              <div
                style={{
                  textAlign: "right",
                  fontSize: "0.75rem",
                  color: "var(--ink-soft)",
                  marginTop: 4,
                }}
              >
                {symptoms.length}/1000
              </div>
            </div>
          )}

          {/* ── Step 5: Select Date & Time ── */}
          {step === "datetime" && (
            <div>
              <h3 style={{ fontSize: "1.2rem", marginBottom: 4 }}>
                Pick a date & time
              </h3>
              <p
                style={{
                  color: "var(--ink-soft)",
                  fontSize: "0.88rem",
                  marginBottom: 16,
                }}
              >
                Available slots for {vetName}.
              </p>

              {/* Date buttons */}
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  overflowX: "auto",
                  paddingBottom: 4,
                  marginBottom: 16,
                }}
              >
                {dateOptions.map((d) => (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setSelectedDate(d.date)}
                    style={{
                      flex: "0 0 auto",
                      border: `2px solid ${
                        selectedDate === d.date ? "var(--deep)" : "var(--line)"
                      }`,
                      borderRadius: "var(--radius-s)",
                      padding: "8px 14px",
                      background:
                        selectedDate === d.date ? "var(--deep)" : "var(--white)",
                      color:
                        selectedDate === d.date ? "var(--white)" : "var(--ink)",
                      cursor: "pointer",
                      textAlign: "center",
                      minWidth: 68,
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>
                      {d.label}
                    </div>
                    <div style={{ fontSize: "0.72rem", opacity: 0.8 }}>
                      {d.dayName}
                    </div>
                  </button>
                ))}
              </div>

              {/* Time slots */}
              {slotsLoading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "28px 0",
                    color: "var(--ink-soft)",
                    fontSize: "0.88rem",
                  }}
                >
                  Loading available slots...
                </div>
              ) : slots.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "28px 0",
                    color: "var(--ink-soft)",
                    fontSize: "0.88rem",
                    border: "1px dashed var(--line)",
                    borderRadius: "var(--radius-m)",
                  }}
                >
                  No availability for this date. Try another day.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 8,
                  }}
                >
                  {slots.map((slot) => {
                    const isSelected =
                      selectedSlot?.start === slot.start;
                    return (
                      <button
                        key={slot.start}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => slot.available && setSelectedSlot(slot)}
                        style={{
                          border: `1px solid ${
                            isSelected ? "var(--deep)" : "var(--line)"
                          }`,
                          background: isSelected
                            ? "var(--deep)"
                            : slot.available
                            ? "var(--paper)"
                            : "var(--paper-2)",
                          color: isSelected
                            ? "var(--white)"
                            : slot.available
                            ? "var(--ink)"
                            : "var(--ink-soft)",
                          padding: "9px 6px",
                          borderRadius: "var(--radius-s)",
                          fontSize: "0.86rem",
                          textAlign: "center",
                          cursor: slot.available ? "pointer" : "not-allowed",
                          opacity: slot.available ? 1 : 0.5,
                          transition: "all 0.15s",
                        }}
                      >
                        {formatSlotTime(slot.start)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Step 6: Booking Summary ── */}
          {step === "summary" && (
            <div>
              <h3 style={{ fontSize: "1.2rem", marginBottom: 16 }}>
                Review your booking
              </h3>

              <div
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-m)",
                  overflow: "hidden",
                }}
              >
                {/* Vet info */}
                <div
                  style={{
                    padding: "14px 16px",
                    borderBottom: "1px solid var(--line)",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      background: "var(--paper-2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.2rem",
                      flexShrink: 0,
                    }}
                  >
                    👨‍⚕️
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>
                      Dr. {vetName}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--ink-soft)",
                      }}
                    >
                      {vet.specialization}
                    </div>
                  </div>
                </div>

                <SummaryRow label="Pet" value={selectedPet?.name || ""} />
                <SummaryRow
                  label="Service"
                  value={
                    selectedService?.title ||
                    SERVICE_LABELS[selectedService?.service_type || ""] ||
                    ""
                  }
                />
                <SummaryRow
                  label="Urgency"
                  value={URGENCY_LABELS[urgency] || urgency}
                />
                {symptoms && (
                  <SummaryRow
                    label="Concern"
                    value={
                      symptoms.length > 80
                        ? symptoms.substring(0, 80) + "..."
                        : symptoms
                    }
                  />
                )}
                <SummaryRow
                  label="Date"
                  value={formatSelectedDate()}
                />
                <SummaryRow
                  label="Time"
                  value={
                    selectedSlot ? formatSlotTime(selectedSlot.start) : ""
                  }
                  noBorder
                />
              </div>

              <div
                style={{
                  marginTop: 16,
                  padding: "14px 16px",
                  background: "var(--paper)",
                  borderRadius: "var(--radius-s)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                  Total
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "1.15rem",
                    color: "var(--deep)",
                  }}
                >
                  {formatPrice(selectedService?.price || 0)}
                </span>
              </div>
            </div>
          )}

          {/* ── Step 7: Payment ── */}
          {step === "payment" && (
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "var(--paper)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 18px",
                  fontSize: "1.5rem",
                }}
              >
                💳
              </div>
              <h3 style={{ fontSize: "1.15rem", marginBottom: 6 }}>
                Complete payment
              </h3>
              <p
                style={{
                  color: "var(--ink-soft)",
                  fontSize: "0.88rem",
                  marginBottom: 20,
                }}
              >
                Confirm your booking with {vetName}.
              </p>

              <div
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-m)",
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8,
                    fontSize: "0.88rem",
                  }}
                >
                  <span style={{ color: "var(--ink-soft)" }}>Service</span>
                  <span>
                    {selectedService?.title || SERVICE_LABELS[selectedService?.service_type || ""]}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.88rem",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ color: "var(--ink-soft)" }}>Duration</span>
                  <span>{selectedService?.duration_minutes || 30} min</span>
                </div>
                <div
                  style={{
                    borderTop: "1px solid var(--line)",
                    paddingTop: 8,
                    marginTop: 4,
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 700,
                    fontSize: "1rem",
                  }}
                >
                  <span>Total</span>
                  <span style={{ color: "var(--deep)" }}>
                    {formatPrice(selectedService?.price || 0)}
                  </span>
                </div>
              </div>

              {error && (
                <div
                  style={{
                    color: "var(--rose)",
                    fontSize: "0.85rem",
                    marginBottom: 14,
                    textAlign: "left",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                className="btn-amber"
                style={{ width: "100%" }}
                onClick={handlePayment}
                disabled={paymentProcessing}
              >
                {paymentProcessing
                  ? "Processing..."
                  : `Pay ${formatPrice(selectedService?.price || 0)}`}
              </button>
            </div>
          )}

          {/* ── Step 8: Confirmation ── */}
          {step === "confirmation" && (
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
              <h3 style={{ fontSize: "1.2rem", marginBottom: 4 }}>
                You&apos;re booked!
              </h3>
              <p
                style={{
                  color: "var(--ink-soft)",
                  fontSize: "0.88rem",
                  marginBottom: 18,
                }}
              >
                Dr. {vetName} will see {selectedPet?.name || "your pet"} on{" "}
                {formatSelectedDate()} at{" "}
                {selectedSlot ? formatSlotTime(selectedSlot.start) : ""}.
              </p>

              <div
                style={{
                  background: "var(--paper)",
                  border: "1px dashed var(--line)",
                  borderRadius: "var(--radius-s)",
                  padding: 12,
                  fontFamily: "var(--font-fraunces), Fraunces, serif",
                  fontWeight: 600,
                  marginBottom: 18,
                  fontSize: "0.92rem",
                }}
              >
                Booking ref: {bookingRef}
              </div>

              {selectedService?.service_type === "home_visit" && bookingId && (
                <TrackingBox bookingId={bookingId} />
              )}

              <button
                className="btn-amber"
                style={{ width: "100%", marginTop: 8 }}
                onClick={onClose}
              >
                Done
              </button>
            </div>
          )}

          {/* Error display */}
          {step !== "payment" && step !== "confirmation" && error && (
            <div
              style={{
                color: "var(--rose)",
                fontSize: "0.85rem",
                marginTop: 12,
                padding: "10px 12px",
                background: "#C9727A11",
                borderRadius: "var(--radius-s)",
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Navigation footer */}
        {step !== "payment" && step !== "confirmation" && (
          <div
            style={{
              padding: "14px 28px 20px",
              display: "flex",
              gap: 10,
              borderTop: "1px solid var(--line)",
            }}
          >
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handleBack}
                style={{
                  flex: "0 0 auto",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-s)",
                  padding: "11px 18px",
                  background: "var(--white)",
                  color: "var(--ink)",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
            )}
            <button
              className="btn-amber"
              style={{ flex: 1 }}
              onClick={
                step === "summary"
                  ? () => {
                      setLoading(true);
                      setError(null);
                      handleCreateBooking();
                    }
                  : handleNext
              }
              disabled={loading}
            >
              {loading
                ? "Booking..."
                : step === "summary"
                ? "Confirm & pay"
                : "Continue →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  noBorder = false,
}: {
  label: string;
  value: string;
  noBorder?: boolean;
}) {
  return (
    <div
      style={{
        padding: "10px 16px",
        display: "flex",
        justifyContent: "space-between",
        fontSize: "0.86rem",
        borderBottom: noBorder ? "none" : "1px solid var(--line)",
      }}
    >
      <span style={{ color: "var(--ink-soft)" }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

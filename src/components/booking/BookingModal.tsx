"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  formatPrice,
  SERVICE_LABELS,
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
  | "confirmation";

const STEPS: { key: Step; label: string }[] = [
  { key: "pet", label: "Pet" },
  { key: "service", label: "Service" },
  { key: "urgency", label: "Urgency" },
  { key: "problem", label: "Details" },
  { key: "datetime", label: "Date & Time" },
  { key: "summary", label: "Summary" },
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
  const [bookingCreated, setBookingCreated] = useState(false);

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
  const [urgencyPrice, setUrgencyPrice] = useState<number | null>(null);
  const [urgencyPriceLoading, setUrgencyPriceLoading] = useState(false);
  const [urgencyPriceError, setUrgencyPriceError] = useState<string | null>(null);

  const dateOptions = useMemo(() => getNextDays(7), []);
  const [selectedDate, setSelectedDate] = useState(dateOptions[0]?.date || "");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const [bookingRef, setBookingRef] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState<{
    price: number;
    serviceTitle: string;
    petName: string;
    date: string;
    time: string;
    urgency: string;
    vetName: string;
    bookingRef: string;
  } | null>(null);

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
    if (!selectedService || !urgency) return;
    let cancelled = false;
    async function fetchPrice() {
      setUrgencyPriceLoading(true);
      setUrgencyPriceError(null);
      try {
        const res = await fetch(
          `/api/pricing?vet_id=${vet.id}&service_type=${selectedService!.service_type}&urgency=${urgency}`
        );
        if (!res.ok) {
          if (!cancelled) {
            setUrgencyPrice(null);
            setUrgencyPriceError("Consultation price unavailable for this urgency");
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setUrgencyPrice(data.price);
        }
      } catch {
        if (!cancelled) {
          setUrgencyPrice(null);
          setUrgencyPriceError("Failed to load pricing");
        }
      } finally {
        if (!cancelled) setUrgencyPriceLoading(false);
      }
    }
    fetchPrice();
    return () => { cancelled = true; };
  }, [vet.id, selectedService, urgency]);

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

  async function handleConfirmAndPay() {
    if (loading || bookingCreated) return;
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
          symptoms: symptoms || null,
          concern: symptoms || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.error?.includes("time slot")) {
          setError("This time slot is no longer available. Please choose another time.");
          setStep("datetime");
          setLoading(false);
          return;
        }
        setError(data.error || "Unable to confirm your consultation right now. Please try again.");
        setLoading(false);
        return;
      }

      setBookingCreated(true);
      setBookingRef(data.booking_reference);
      setBookingId(data.id);

      const slotDate = selectedSlot
        ? new Date(selectedSlot.start).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "";
      const slotTime = selectedSlot
        ? new Date(selectedSlot.start).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

      setConfirmedBooking({
        price: data.price,
        serviceTitle: selectedService?.title || SERVICE_LABELS[selectedService?.service_type || ""] || "Consultation",
        petName: selectedPet?.name || "your pet",
        date: slotDate,
        time: slotTime,
        urgency: URGENCY_LABELS[urgency as keyof typeof URGENCY_LABELS] || urgency,
        vetName,
        bookingRef: data.booking_reference,
      });

      setStep("confirmation");
    } catch {
      setError("Unable to confirm your consultation right now. Please try again.");
    } finally {
      setLoading(false);
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

  const handleClose = () => {
    if (bookingCreated) {
      onClose();
    } else {
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={handleClose}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 520,
          width: "95vw",
          maxHeight: "90vh",
          borderRadius: "var(--radius-l)",
          background: "var(--white)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 28px 14px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "1.08rem",
                fontWeight: 700,
                color: "var(--ink)",
                margin: 0,
              }}
            >
              {step === "confirmation" ? "Booking Confirmed" : "Book a Consultation"}
            </h2>
            {step !== "confirmation" && (
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--ink-soft)",
                  margin: "4px 0 0",
                }}
              >
                with {vetName}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.3rem",
              cursor: "pointer",
              color: "var(--ink-soft)",
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Progress bar */}
        {step !== "confirmation" && (
          <div
            style={{
              padding: "12px 28px 0",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 4,
                height: 3,
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              {STEPS.slice(0, -1).map((s, i) => (
                <div
                  key={s.key}
                  style={{
                    flex: 1,
                    background:
                      i <= currentStepIndex
                        ? "var(--amber)"
                        : "var(--line)",
                    borderRadius: 2,
                    transition: "background 0.3s",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 6,
                fontSize: "0.72rem",
                color: "var(--ink-soft)",
              }}
            >
              <span>Step {currentStepIndex + 1} of {STEPS.length - 1}</span>
              <span>{STEPS[currentStepIndex]?.label}</span>
            </div>
          </div>
        )}

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "18px 28px 20px",
          }}
        >
          {/* ── Step 1: Pet ── */}
          {step === "pet" && (
            <div>
              <h3 style={{ fontSize: "1rem", marginBottom: 12, fontWeight: 600 }}>
                Who is this consultation for?
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPetId(p.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      border: `2px solid ${selectedPetId === p.id ? "var(--amber)" : "var(--line)"}`,
                      borderRadius: "var(--radius-m)",
                      background: selectedPetId === p.id ? "#E4A13B11" : "var(--white)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: "1.3rem" }}>
                      {p.species === "Dog" ? "🐕" : p.species === "Cat" ? "🐱" : "🐾"}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>{p.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>
                        {p.species}{p.breed ? ` · ${p.breed}` : ""}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {!showAddPet ? (
                <button
                  onClick={() => setShowAddPet(true)}
                  style={{
                    marginTop: 10,
                    padding: "10px 14px",
                    border: "1px dashed var(--line)",
                    borderRadius: "var(--radius-m)",
                    background: "none",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    color: "var(--ink-soft)",
                    width: "100%",
                  }}
                >
                  + Add a new pet
                </button>
              ) : (
                <div
                  style={{
                    marginTop: 10,
                    padding: 14,
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-m)",
                  }}
                >
                  <input
                    placeholder="Pet name *"
                    value={newPetName}
                    onChange={(e) => setNewPetName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius-s)",
                      marginBottom: 8,
                      fontSize: "0.88rem",
                    }}
                  />
                  <select
                    value={newPetSpecies}
                    onChange={(e) => setNewPetSpecies(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius-s)",
                      marginBottom: 8,
                      fontSize: "0.88rem",
                      background: "var(--white)",
                    }}
                  >
                    <option value="">Species *</option>
                    {SPECIES_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <input
                    placeholder="Breed (optional)"
                    value={newPetBreed}
                    onChange={(e) => setNewPetBreed(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius-s)",
                      marginBottom: 10,
                      fontSize: "0.88rem",
                    }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={handleAddPet}
                      disabled={addingPet || !newPetName.trim() || !newPetSpecies.trim()}
                      className="btn-amber"
                      style={{ flex: 1, fontSize: "0.85rem" }}
                    >
                      {addingPet ? "Adding..." : "Add Pet"}
                    </button>
                    <button
                      onClick={() => { setShowAddPet(false); setError(null); }}
                      style={{
                        flex: "0 0 auto",
                        border: "1px solid var(--line)",
                        borderRadius: "var(--radius-s)",
                        padding: "8px 14px",
                        background: "var(--white)",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Service ── */}
          {step === "service" && (
            <div>
              <h3 style={{ fontSize: "1rem", marginBottom: 12, fontWeight: 600 }}>
                Choose a service
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {services.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedService(s)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 14px",
                      border: `2px solid ${selectedService?.id === s.id ? "var(--amber)" : "var(--line)"}`,
                      borderRadius: "var(--radius-m)",
                      background: selectedService?.id === s.id ? "#E4A13B11" : "var(--white)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                        {s.title || SERVICE_LABELS[s.service_type]}
                      </div>
                      {s.description && (
                        <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", marginTop: 2 }}>
                          {s.description}
                        </div>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, color: "var(--deep)", fontSize: "0.95rem" }}>
                      {formatPrice(s.price)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Urgency ── */}
          {step === "urgency" && (
            <div>
              <h3 style={{ fontSize: "1rem", marginBottom: 12, fontWeight: 600 }}>
                How urgent is this?
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {URGENCY_KEYS.map((u) => (
                  <button
                    key={u}
                    onClick={() => setUrgency(u)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      border: `2px solid ${urgency === u ? URGENCY_COLORS[u].border : "var(--line)"}`,
                      borderRadius: "var(--radius-m)",
                      background: urgency === u ? `${URGENCY_COLORS[u].bg}` : "var(--white)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: URGENCY_COLORS[u].bg,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                        {URGENCY_LABELS[u]}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>
                        {URGENCY_DESCRIPTIONS[u]}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Price panel */}
              {urgency === "emergency" && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 14px",
                    borderRadius: "var(--radius-s)",
                    background: "#C9727A11",
                    border: "1px solid #C9727A33",
                    fontSize: "0.82rem",
                    color: "var(--rose)",
                    lineHeight: 1.5,
                  }}
                >
                  This may be a veterinary emergency. If your pet is in immediate danger, seek immediate emergency veterinary care rather than waiting for an online consultation.
                </div>
              )}

              <div
                style={{
                  marginTop: 14,
                  padding: "16px 18px",
                  borderRadius: "var(--radius-m)",
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--ink-soft)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: 6,
                  }}
                >
                  Consultation fee
                </div>
                {urgencyPriceLoading ? (
                  <div style={{ fontSize: "0.9rem", color: "var(--ink-soft)" }}>
                    Loading price...
                  </div>
                ) : urgencyPriceError ? (
                  <div style={{ fontSize: "0.9rem", color: "var(--rose)" }}>
                    {urgencyPriceError}
                  </div>
                ) : urgencyPrice !== null ? (
                  <>
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "var(--deep)",
                        fontFamily: "var(--font-fraunces), Fraunces, serif",
                      }}
                    >
                      {formatPrice(urgencyPrice)}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginTop: 2 }}>
                      One-time consultation
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginTop: 4 }}>
                      Urgency: {URGENCY_LABELS[urgency as keyof typeof URGENCY_LABELS]}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}

          {/* ── Step 4: Problem ── */}
          {step === "problem" && (
            <div>
              <h3 style={{ fontSize: "1rem", marginBottom: 12, fontWeight: 600 }}>
                Describe the concern
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)", marginBottom: 10 }}>
                Optional — helps the vet prepare.
              </p>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="e.g., Not eating since morning, limping on left front leg..."
                rows={4}
                maxLength={1000}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-m)",
                  fontSize: "0.9rem",
                  resize: "vertical",
                  fontFamily: "inherit",
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

          {/* ── Step 5: DateTime ── */}
          {step === "datetime" && (
            <div>
              <h3 style={{ fontSize: "1rem", marginBottom: 12, fontWeight: 600 }}>
                Pick a date & time
              </h3>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  overflowX: "auto",
                  paddingBottom: 8,
                  marginBottom: 14,
                }}
              >
                {dateOptions.map((d) => (
                  <button
                    key={d.date}
                    onClick={() => setSelectedDate(d.date)}
                    style={{
                      flex: "0 0 auto",
                      padding: "8px 12px",
                      border: `2px solid ${selectedDate === d.date ? "var(--amber)" : "var(--line)"}`,
                      borderRadius: "var(--radius-s)",
                      background: selectedDate === d.date ? "#E4A13B11" : "var(--white)",
                      cursor: "pointer",
                      textAlign: "center",
                      minWidth: 60,
                    }}
                  >
                    <div style={{ fontSize: "0.72rem", color: "var(--ink-soft)" }}>{d.dayName}</div>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{d.label}</div>
                  </button>
                ))}
              </div>

              {slotsLoading ? (
                <div style={{ textAlign: "center", padding: 20, color: "var(--ink-soft)" }}>
                  Loading available times...
                </div>
              ) : slots.length === 0 ? (
                <div style={{ textAlign: "center", padding: 20, color: "var(--ink-soft)" }}>
                  No available slots for this date.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                    gap: 8,
                  }}
                >
                  {slots
                    .filter((s) => s.available)
                    .map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedSlot(s)}
                        style={{
                          padding: "10px 6px",
                          border: `2px solid ${
                            selectedSlot?.start === s.start
                              ? "var(--amber)"
                              : "var(--line)"
                          }`,
                          borderRadius: "var(--radius-s)",
                          background:
                            selectedSlot?.start === s.start
                              ? "#E4A13B11"
                              : "var(--white)",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          textAlign: "center",
                        }}
                      >
                        {formatSlotTime(s.start)}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step 6: Summary ── */}
          {step === "summary" && (
            <div>
              <h3 style={{ fontSize: "1rem", marginBottom: 14, fontWeight: 600 }}>
                Review your booking
              </h3>
              <div
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-m)",
                  padding: 16,
                }}
              >
                <SummaryRow label="Vet" value={`Dr. ${vetName}`} />
                <SummaryRow label="Specialization" value={vet.specialization} />
                <SummaryRow label="Pet" value={selectedPet?.name || "—"} />
                <SummaryRow
                  label="Service"
                  value={selectedService?.title || SERVICE_LABELS[selectedService?.service_type || ""] || "—"}
                />
                <SummaryRow label="Date" value={formatSelectedDate()} />
                <SummaryRow
                  label="Time"
                  value={selectedSlot ? formatSlotTime(selectedSlot.start) : "—"}
                />
                <SummaryRow
                  label="Urgency"
                  value={URGENCY_LABELS[urgency as keyof typeof URGENCY_LABELS] || urgency}
                  color={URGENCY_COLORS[urgency as keyof typeof URGENCY_COLORS]?.text || "var(--ink)"}
                />
                {symptoms && (
                  <SummaryRow label="Concern" value={symptoms} italic />
                )}
                <SummaryRow
                  label="Consultation fee"
                  value={urgencyPrice !== null ? formatPrice(urgencyPrice) : "—"}
                  bold
                />
                <div
                  style={{
                    borderTop: "1px solid var(--line)",
                    marginTop: 10,
                    paddingTop: 10,
                    display: "flex",
                    justifyContent: "space-between",
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
                    {urgencyPrice !== null ? formatPrice(urgencyPrice) : "—"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 7: Confirmation / Success ── */}
          {step === "confirmation" && confirmedBooking && (
            <div style={{ textAlign: "center", padding: "6px 0 4px" }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: "var(--deep)",
                  color: "var(--white)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 18px",
                  fontSize: "1.8rem",
                }}
              >
                ✓
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 4, color: "var(--deep)" }}>
                Payment successful
              </h3>
              <p
                style={{
                  color: "var(--ink-soft)",
                  fontSize: "0.88rem",
                  marginBottom: 20,
                }}
              >
                Your consultation has been booked successfully.
              </p>

              <div
                style={{
                  background: "var(--paper)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-m)",
                  padding: "16px 20px",
                  textAlign: "left",
                  marginBottom: 20,
                }}
              >
                <SummaryRow label="Vet" value={`Dr. ${confirmedBooking.vetName}`} />
                <SummaryRow label="Pet" value={confirmedBooking.petName} />
                <SummaryRow label="Service" value={confirmedBooking.serviceTitle} />
                <SummaryRow label="Date" value={confirmedBooking.date} />
                <SummaryRow label="Time" value={confirmedBooking.time} />
                <SummaryRow label="Urgency" value={confirmedBooking.urgency} />
                <SummaryRow
                  label="Total"
                  value={formatPrice(confirmedBooking.price)}
                  bold
                />
                <div
                  style={{
                    borderTop: "1px dashed var(--line)",
                    marginTop: 10,
                    paddingTop: 10,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
                    Booking reference
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-fraunces), Fraunces, serif",
                      fontWeight: 700,
                      fontSize: "0.92rem",
                      color: "var(--deep)",
                    }}
                  >
                    {confirmedBooking.bookingRef}
                  </span>
                </div>
              </div>

              {selectedService?.service_type === "home_visit" && bookingId && (
                <TrackingBox bookingId={bookingId} />
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  className="btn-amber"
                  style={{ width: "100%" }}
                  onClick={() => {
                    window.location.href = "/dashboard/owner";
                  }}
                >
                  View my booking
                </button>
                <button
                  onClick={onClose}
                  style={{
                    width: "100%",
                    padding: "11px 18px",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-s)",
                    background: "var(--white)",
                    color: "var(--ink)",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                  }}
                >
                  Back to PetTails
                </button>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && step !== "confirmation" && (
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
        {step !== "confirmation" && (
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
                disabled={loading}
                style={{
                  flex: "0 0 auto",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-s)",
                  padding: "11px 18px",
                  background: "var(--white)",
                  color: "var(--ink)",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.5 : 1,
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
                  ? handleConfirmAndPay
                  : handleNext
              }
              disabled={loading || (step === "urgency" && (urgencyPriceLoading || urgencyPrice === null))}
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
  color,
  italic,
  bold,
}: {
  label: string;
  value: string;
  color?: string;
  italic?: boolean;
  bold?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        fontSize: "0.88rem",
        borderBottom: "1px solid #f0f0f0",
      }}
    >
      <span style={{ color: "var(--ink-soft)" }}>{label}</span>
      <span
        style={{
          fontWeight: bold ? 700 : 500,
          color: color || "var(--ink)",
          fontStyle: italic ? "italic" : "normal",
          textAlign: "right",
          maxWidth: "60%",
        }}
      >
        {value}
      </span>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { COMMON_SPECIES, COMMON_LANGUAGES, SERVICE_LABELS } from "@/lib/utils";
import type { VetService, VetAvailability } from "@/lib/types";

const TOTAL_STEPS = 7;

const STEP_LABELS = [
  "Professional Info",
  "Education & License",
  "Specializations",
  "Services & Pricing",
  "Availability",
  "Bio & Photo",
  "Review & Publish",
];

interface ServiceEntry {
  service_type: string;
  title: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

interface AvailabilityEntry {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface OnboardingData {
  full_name: string;
  display_name: string;
  professional_title: string;
  phone: string;
  city: string;
  area: string;
  clinic_name: string;
  degree: string;
  university: string;
  graduation_year: string;
  registration_number: string;
  registration_council: string;
  years_experience: string;
  specializations: string[];
  species_treated: string[];
  languages: string[];
  expertise: string[];
  services: ServiceEntry[];
  availability: AvailabilityEntry[];
  bio: string;
  achievements: string[];
}

function toggleArrayItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}

const EMPTY_DATA: OnboardingData = {
  full_name: "",
  display_name: "",
  professional_title: "",
  phone: "",
  city: "",
  area: "",
  clinic_name: "",
  degree: "",
  university: "",
  graduation_year: "",
  registration_number: "",
  registration_council: "",
  years_experience: "",
  specializations: [],
  species_treated: [],
  languages: [],
  expertise: [],
  services: [
    { service_type: "video_consult", title: "Video Consultation", price: 500, duration_minutes: 30, is_active: true },
    { service_type: "home_visit", title: "Home Visit", price: 1000, duration_minutes: 45, is_active: false },
    { service_type: "clinic_consult", title: "Clinic Consultation", price: 800, duration_minutes: 30, is_active: false },
    { service_type: "emergency", title: "Emergency", price: 2000, duration_minutes: 60, is_active: false },
    { service_type: "followup", title: "Follow-up", price: 300, duration_minutes: 20, is_active: false },
  ],
  availability: [],
  bio: "",
  achievements: [],
};

const SPECIALIZATION_OPTIONS = [
  "General Practice",
  "Surgery",
  "Dermatology",
  "Cardiology",
  "Orthopedics",
  "Dentistry",
  "Ophthalmology",
  "Internal Medicine",
  "Emergency & Critical Care",
  "Nutrition",
  "Behavioral Medicine",
  "Exotic Animals",
  "Reproduction",
  "Oncology",
  "Radiology",
  "Anesthesiology",
];

const EXPERTISE_OPTIONS = [
  "Vaccination & Preventive Care",
  "Spay/Neuter Surgery",
  "Dental Cleaning",
  "X-Ray & Imaging",
  "Blood Work & Diagnostics",
  "Wound Treatment",
  "Fracture Repair",
  "Skin Allergies",
  "Gastrointestinal Issues",
  "Cardiac Evaluation",
  "Senior Pet Care",
  "Puppy & Kitten Care",
  "Travel Certificates",
  "Microchipping",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function VetOnboarding() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(EMPTY_DATA);
  const [vetId, setVetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Try to find existing vet record (no join — FK doesn't exist)
      const { data: vet, error: vetError } = await supabase
        .from("vets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (vetError || !vet) {
        // No vet record found — create one using only base columns (migration 001)
        const { data: newVet, error: createError } = await supabase
          .from("vets")
          .insert({
            user_id: user.id,
            specialization: "General practice",
            consultation_price: 499,
            verified: false,
            online: false,
            accepting_bookings: false,
          })
          .select()
          .single();

        if (createError || !newVet) {
          console.error("Failed to create vet record:", createError);
          setError("Failed to create vet profile. Please try again or contact support.");
          setLoading(false);
          return;
        }

        // Try to set new columns (may not exist if migration 002 hasn't run)
        try {
          await supabase.from("vets").update({
            verification_status: "pending",
            onboarding_completed: false,
          }).eq("id", newVet.id);
        } catch {
          // New columns don't exist yet — that's fine, onboarding will still work
        }

        setVetId(newVet.id);
        setLoading(false);
        return;
      }

      setVetId(vet.id);

      // Fetch profile data separately
      const { data: profileData } = await supabase
        .from("profiles")
        .select("name, email, phone, avatar_url")
        .eq("id", user.id)
        .single();

      // Load services and availability only if vet.id exists
      const { data: existingServices } = await supabase
        .from("vet_services")
        .select("*")
        .eq("vet_id", vet.id);

      const { data: existingAvailability } = await supabase
        .from("vet_availability")
        .select("*")
        .eq("vet_id", vet.id);

      const services: ServiceEntry[] = existingServices && existingServices.length > 0
        ? existingServices.map((s: VetService) => ({
            service_type: s.service_type,
            title: s.title,
            price: s.price,
            duration_minutes: s.duration_minutes,
            is_active: s.is_active,
          }))
        : EMPTY_DATA.services;

      const availability: AvailabilityEntry[] = existingAvailability
        ? existingAvailability.map((a: VetAvailability) => ({
            day_of_week: a.day_of_week,
            start_time: a.start_time,
            end_time: a.end_time,
            is_available: a.is_available,
          }))
        : [];

      setData({
        full_name: "",
        display_name: vet.display_name || "",
        professional_title: vet.professional_title || "",
        phone: profileData?.phone || "",
        city: vet.city || "",
        area: vet.area || "",
        clinic_name: vet.clinic_name || "",
        degree: vet.degree || "",
        university: vet.university || "",
        graduation_year: vet.graduation_year ? String(vet.graduation_year) : "",
        registration_number: vet.registration_number || "",
        registration_council: vet.registration_council || "",
        years_experience: vet.years_experience ? String(vet.years_experience) : "",
        specializations: vet.specializations || [],
        species_treated: vet.species_treated || [],
        languages: vet.languages || [],
        expertise: vet.expertise || [],
        services,
        availability,
        bio: vet.bio || "",
        achievements: vet.achievements || [],
      });

      if (vet.onboarding_completed) {
        setStep(TOTAL_STEPS);
      }

      setLoading(false);
    };
    load();
  }, [supabase, router]);

  const update = (partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
    setErrors({});
  };

  const validateStep = (): boolean => {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!data.display_name.trim()) errs.display_name = "Display name is required";
      if (!data.city.trim()) errs.city = "City is required";
    } else if (step === 2) {
      if (!data.degree.trim()) errs.degree = "Degree is required";
      if (!data.registration_number.trim()) errs.registration_number = "Registration number is required";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveVetData = async (): Promise<boolean> => {
    if (!vetId) {
      setError("No vet profile found. Please refresh and try again.");
      return false;
    }
    setSaving(true);
    setError(null);

    const vetUpdate: Record<string, unknown> = {
      display_name: data.display_name || null,
      professional_title: data.professional_title || null,
      city: data.city || null,
      area: data.area || null,
      clinic_name: data.clinic_name || null,
      degree: data.degree || null,
      university: data.university || null,
      graduation_year: data.graduation_year ? Number(data.graduation_year) : null,
      registration_number: data.registration_number || null,
      registration_council: data.registration_council || null,
      years_experience: data.years_experience ? Number(data.years_experience) : null,
      specializations: data.specializations,
      species_treated: data.species_treated,
      languages: data.languages,
      expertise: data.expertise,
      bio: data.bio || null,
      achievements: data.achievements,
    };

    if (step === TOTAL_STEPS) {
      vetUpdate.onboarding_completed = true;
    }

    const { error: updateError } = await supabase.from("vets").update(vetUpdate).eq("id", vetId);

    if (updateError) {
      console.error("Failed to save vet data:", updateError);
      // If the error is about missing columns, show a helpful message
      if (updateError.message?.includes("column") || updateError.code === "42703") {
        setError("Some fields require a database update. Please run the migration in Supabase SQL Editor (supabase/migrations/002_vet_marketplace.sql), then try again.");
      } else {
        setError(`Failed to save: ${updateError.message}`);
      }
      setSaving(false);
      return false;
    }

    if (step === 4) {
      const { error: delErr } = await supabase.from("vet_services").delete().eq("vet_id", vetId);
      if (delErr) {
        console.error("Failed to clear services:", delErr);
      }
      const activeServices = data.services.filter((s) => s.is_active);
      if (activeServices.length > 0) {
        const { error: insErr } = await supabase.from("vet_services").insert(
          activeServices.map((s) => ({
            vet_id: vetId,
            service_type: s.service_type,
            title: s.title,
            price: s.price,
            duration_minutes: s.duration_minutes,
            is_active: s.is_active,
          }))
        );
        if (insErr) {
          console.error("Failed to save services:", insErr);
          setError(`Failed to save services: ${insErr.message}`);
          setSaving(false);
          return false;
        }
      }
    }

    if (step === 5) {
      const { error: delErr } = await supabase.from("vet_availability").delete().eq("vet_id", vetId);
      if (delErr) {
        console.error("Failed to clear availability:", delErr);
      }
      if (data.availability.length > 0) {
        const { error: insErr } = await supabase.from("vet_availability").insert(
          data.availability.map((a) => ({
            vet_id: vetId,
            day_of_week: a.day_of_week,
            start_time: a.start_time,
            end_time: a.end_time,
            is_available: a.is_available,
          }))
        );
        if (insErr) {
          console.error("Failed to save availability:", insErr);
          setError(`Failed to save availability: ${insErr.message}`);
          setSaving(false);
          return false;
        }
      }
    }

    setSaving(false);
    return true;
  };

  const handleNext = async () => {
    if (!validateStep()) return;
    const saved = await saveVetData();
    if (!saved) return; // Don't advance if save failed
    if (step === TOTAL_STEPS) {
      router.push("/dashboard/vet");
    } else {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSkip = async () => {
    await saveVetData();
    router.push("/dashboard/vet");
  };

  if (loading) {
    return (
      <div style={{ padding: "84px 0", textAlign: "center", color: "var(--ink-soft)" }}>
        Loading your profile...
      </div>
    );
  }

  if (!vetId) {
    return (
      <div style={{ padding: "84px 0", textAlign: "center" }}>
        <div className="wrap" style={{ maxWidth: 420 }}>
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
            🩺
          </div>
          <h2 style={{ fontSize: "1.4rem", marginBottom: 10 }}>Create your vet profile</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.95rem", marginBottom: 24 }}>
            Set up your professional profile to start receiving consultations from pet owners.
          </p>
          <button
            className="btn-primary"
            style={{ padding: "14px 28px", fontSize: "1rem" }}
            onClick={async () => {
              setError(null);
              setLoading(true);
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) {
                router.push("/auth/login");
                return;
              }
              const { data: newVet, error: createErr } = await supabase
                .from("vets")
                .insert({
                  user_id: user.id,
                  specialization: "General practice",
                  consultation_price: 499,
                  verified: false,
                  online: false,
                  accepting_bookings: false,
                })
                .select()
                .single();
              if (createErr || !newVet) {
                console.error("Create failed:", createErr);
                setError("Could not create profile. Please try again.");
                setLoading(false);
                return;
              }
              // Try setting new columns
              try {
                await supabase.from("vets").update({
                  verification_status: "pending",
                  onboarding_completed: false,
                }).eq("id", newVet.id);
              } catch { /* ignore */ }
              setVetId(newVet.id);
              setLoading(false);
            }}
          >
            Create Profile
          </button>
          <p style={{ marginTop: 16, fontSize: "0.85rem", color: "var(--ink-soft)" }}>
            Already have an account?{" "}
            <a href="/auth/login" style={{ color: "var(--deep)", fontWeight: 600 }}>Log in</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 0 84px" }}>
      <div className="wrap" style={{ maxWidth: 680 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", marginBottom: 8 }}>
            Set Up Your Vet Profile
          </h1>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.95rem" }}>
            Complete your profile to start receiving consultations.
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 600 }}>
              Step {step} of {TOTAL_STEPS}
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>
              {STEP_LABELS[step - 1]}
            </span>
          </div>
          <div
            style={{
              height: 6,
              background: "var(--line)",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(step / TOTAL_STEPS) * 100}%`,
                background: "var(--deep)",
                borderRadius: 3,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
            {STEP_LABELS.map((label, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  background: i + 1 <= step ? "var(--deep)" : "var(--line)",
                  transition: "background 0.3s",
                }}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        {error && (
          <div
            style={{
              padding: "14px 18px",
              borderRadius: "var(--radius-s)",
              background: "#C9727A22",
              border: "1px solid var(--rose)",
              color: "var(--rose)",
              fontSize: "0.9rem",
              marginBottom: 16,
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}
        <div className="card" style={{ padding: 28 }}>
          {step === 1 && (
            <StepProfessional
              data={data}
              update={update}
              errors={errors}
            />
          )}
          {step === 2 && (
            <StepEducation
              data={data}
              update={update}
              errors={errors}
            />
          )}
          {step === 3 && (
            <StepSpecializations
              data={data}
              update={update}
            />
          )}
          {step === 4 && (
            <StepServices
              data={data}
              update={update}
            />
          )}
          {step === 5 && (
            <StepAvailability
              data={data}
              update={update}
            />
          )}
          {step === 6 && (
            <StepBio
              data={data}
              update={update}
            />
          )}
          {step === 7 && (
            <StepReview data={data} />
          )}
        </div>

        {/* Navigation */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 24,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            {step > 1 && (
              <button className="btn-secondary" onClick={handleBack}>
                Back
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn-ghost" onClick={handleSkip}>
              Skip for now
            </button>
            <button
              className="btn-primary"
              onClick={handleNext}
              disabled={saving}
              style={{ minWidth: 140 }}
            >
              {saving
                ? "Saving..."
                : step === TOTAL_STEPS
                  ? "Publish Profile"
                  : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepProfessional({
  data,
  update,
  errors,
}: {
  data: OnboardingData;
  update: (p: Partial<OnboardingData>) => void;
  errors: Record<string, string>;
}) {
  return (
    <div>
      <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>Professional Information</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", marginBottom: 24 }}>
        Tell pet owners about yourself.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="field">
          <label>Full Name</label>
          <input
            type="text"
            placeholder="Dr. Jane Smith"
            value={data.full_name}
            onChange={(e) => update({ full_name: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Display Name *</label>
          <input
            type="text"
            placeholder="Dr. Jane"
            value={data.display_name}
            onChange={(e) => update({ display_name: e.target.value })}
            style={errors.display_name ? { borderColor: "var(--rose)" } : {}}
          />
          {errors.display_name && (
            <span style={{ color: "var(--rose)", fontSize: "0.8rem" }}>{errors.display_name}</span>
          )}
        </div>
        <div className="field">
          <label>Professional Title</label>
          <input
            type="text"
            placeholder="Veterinarian, BVSc & AH"
            value={data.professional_title}
            onChange={(e) => update({ professional_title: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Phone Number</label>
          <input
            type="tel"
            placeholder="+91 98765 43210"
            value={data.phone}
            onChange={(e) => update({ phone: e.target.value })}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="field">
            <label>City *</label>
            <input
              type="text"
              placeholder="Mumbai"
              value={data.city}
              onChange={(e) => update({ city: e.target.value })}
              style={errors.city ? { borderColor: "var(--rose)" } : {}}
            />
            {errors.city && (
              <span style={{ color: "var(--rose)", fontSize: "0.8rem" }}>{errors.city}</span>
            )}
          </div>
          <div className="field">
            <label>Area / Locality</label>
            <input
              type="text"
              placeholder="Bandra West"
              value={data.area}
              onChange={(e) => update({ area: e.target.value })}
            />
          </div>
        </div>
        <div className="field">
          <label>Clinic Name</label>
          <input
            type="text"
            placeholder="PetCare Clinic"
            value={data.clinic_name}
            onChange={(e) => update({ clinic_name: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

function StepEducation({
  data,
  update,
  errors,
}: {
  data: OnboardingData;
  update: (p: Partial<OnboardingData>) => void;
  errors: Record<string, string>;
}) {
  return (
    <div>
      <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>Education & License</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", marginBottom: 24 }}>
        Your qualifications help pet owners trust you.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="field">
          <label>Degree *</label>
          <select
            value={data.degree}
            onChange={(e) => update({ degree: e.target.value })}
            style={errors.degree ? { borderColor: "var(--rose)" } : {}}
          >
            <option value="">Select degree</option>
            <option value="BVSc & AH">Bachelor of Veterinary Science (BVSc & AH)</option>
            <option value="MVSc">Master of Veterinary Science (MVSc)</option>
            <option value="PhD">PhD in Veterinary Science</option>
            <option value="DVM">Doctor of Veterinary Medicine (DVM)</option>
            <option value="BPT">Bachelor of Pet Technology</option>
            <option value="Other">Other</option>
          </select>
          {errors.degree && (
            <span style={{ color: "var(--rose)", fontSize: "0.8rem" }}>{errors.degree}</span>
          )}
        </div>
        <div className="field">
          <label>University</label>
          <input
            type="text"
            placeholder="Mumbai Veterinary College"
            value={data.university}
            onChange={(e) => update({ university: e.target.value })}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="field">
            <label>Graduation Year</label>
            <input
              type="number"
              min="1970"
              max="2030"
              placeholder="2018"
              value={data.graduation_year}
              onChange={(e) => update({ graduation_year: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Years of Experience</label>
            <input
              type="number"
              min="0"
              max="60"
              placeholder="5"
              value={data.years_experience}
              onChange={(e) => update({ years_experience: e.target.value })}
            />
          </div>
        </div>
        <div className="field">
          <label>Registration Number *</label>
          <input
            type="text"
            placeholder="VCI-12345"
            value={data.registration_number}
            onChange={(e) => update({ registration_number: e.target.value })}
            style={errors.registration_number ? { borderColor: "var(--rose)" } : {}}
          />
          {errors.registration_number && (
            <span style={{ color: "var(--rose)", fontSize: "0.8rem" }}>
              {errors.registration_number}
            </span>
          )}
        </div>
        <div className="field">
          <label>Registration Council</label>
          <select
            value={data.registration_council}
            onChange={(e) => update({ registration_council: e.target.value })}
          >
            <option value="">Select council</option>
            <option value="VCI">Veterinary Council of India (VCI)</option>
            <option value="State Council">State Veterinary Council</option>
            <option value="RCVS">Royal College of Veterinary Surgeons</option>
            <option value="AVMA">American Veterinary Medical Association</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function StepSpecializations({
  data,
  update,
}: {
  data: OnboardingData;
  update: (p: Partial<OnboardingData>) => void;
}) {
  const [customSpec, setCustomSpec] = useState("");
  const [customExpertise, setCustomExpertise] = useState("");

  const addCustomSpec = () => {
    if (customSpec.trim() && !data.specializations.includes(customSpec.trim())) {
      update({ specializations: [...data.specializations, customSpec.trim()] });
      setCustomSpec("");
    }
  };

  const addCustomExpertise = () => {
    if (customExpertise.trim() && !data.expertise.includes(customExpertise.trim())) {
      update({ expertise: [...data.expertise, customExpertise.trim()] });
      setCustomExpertise("");
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>Specializations</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", marginBottom: 24 }}>
        Help pet owners find you based on your expertise.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Specializations */}
        <div>
          <label
            style={{
              fontSize: "0.78rem",
              color: "var(--ink-soft)",
              fontWeight: 600,
              display: "block",
              marginBottom: 10,
            }}
          >
            Specializations
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {SPECIALIZATION_OPTIONS.map((spec) => (
              <button
                key={spec}
                type="button"
                className={data.specializations.includes(spec) ? "filter-btn active" : "filter-btn"}
                onClick={() =>
                  update({ specializations: toggleArrayItem(data.specializations, spec) })
                }
                style={{ fontSize: "0.82rem" }}
              >
                {spec}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="Add custom specialization"
              value={customSpec}
              onChange={(e) => setCustomSpec(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSpec())}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-s)",
                fontSize: "0.88rem",
                fontFamily: "inherit",
              }}
            />
            <button className="btn-ghost" onClick={addCustomSpec} style={{ fontSize: "0.85rem" }}>
              Add
            </button>
          </div>
          {data.specializations.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {data.specializations
                .filter((s) => !SPECIALIZATION_OPTIONS.includes(s))
                .map((s) => (
                  <span
                    key={s}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 10px",
                      borderRadius: 100,
                      background: "var(--deep)",
                      color: "var(--white)",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                    }}
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() =>
                        update({
                          specializations: data.specializations.filter((i) => i !== s),
                        })
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--white)",
                        padding: 0,
                        fontSize: "1rem",
                        lineHeight: 1,
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Species Treated */}
        <div>
          <label
            style={{
              fontSize: "0.78rem",
              color: "var(--ink-soft)",
              fontWeight: 600,
              display: "block",
              marginBottom: 10,
            }}
          >
            Species Treated
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {COMMON_SPECIES.map((species) => (
              <button
                key={species}
                type="button"
                className={data.species_treated.includes(species) ? "filter-btn active" : "filter-btn"}
                onClick={() =>
                  update({ species_treated: toggleArrayItem(data.species_treated, species) })
                }
                style={{ fontSize: "0.82rem" }}
              >
                {species}
              </button>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div>
          <label
            style={{
              fontSize: "0.78rem",
              color: "var(--ink-soft)",
              fontWeight: 600,
              display: "block",
              marginBottom: 10,
            }}
          >
            Languages
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {COMMON_LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                className={data.languages.includes(lang) ? "filter-btn active" : "filter-btn"}
                onClick={() =>
                  update({ languages: toggleArrayItem(data.languages, lang) })
                }
                style={{ fontSize: "0.82rem" }}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Expertise */}
        <div>
          <label
            style={{
              fontSize: "0.78rem",
              color: "var(--ink-soft)",
              fontWeight: 600,
              display: "block",
              marginBottom: 10,
            }}
          >
            Areas of Expertise
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {EXPERTISE_OPTIONS.map((exp) => (
              <button
                key={exp}
                type="button"
                className={data.expertise.includes(exp) ? "filter-btn active" : "filter-btn"}
                onClick={() =>
                  update({ expertise: toggleArrayItem(data.expertise, exp) })
                }
                style={{ fontSize: "0.82rem" }}
              >
                {exp}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="Add custom expertise"
              value={customExpertise}
              onChange={(e) => setCustomExpertise(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomExpertise())}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-s)",
                fontSize: "0.88rem",
                fontFamily: "inherit",
              }}
            />
            <button className="btn-ghost" onClick={addCustomExpertise} style={{ fontSize: "0.85rem" }}>
              Add
            </button>
          </div>
          {data.expertise.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {data.expertise
                .filter((e) => !EXPERTISE_OPTIONS.includes(e))
                .map((e) => (
                  <span
                    key={e}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 10px",
                      borderRadius: 100,
                      background: "var(--deep)",
                      color: "var(--white)",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                    }}
                  >
                    {e}
                    <button
                      type="button"
                      onClick={() =>
                        update({ expertise: data.expertise.filter((i) => i !== e) })
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--white)",
                        padding: 0,
                        fontSize: "1rem",
                        lineHeight: 1,
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepServices({
  data,
  update,
}: {
  data: OnboardingData;
  update: (p: Partial<OnboardingData>) => void;
}) {
  const updateService = (index: number, field: keyof ServiceEntry, value: unknown) => {
    const updated = data.services.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    );
    update({ services: updated });
  };

  return (
    <div>
      <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>Services & Pricing</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", marginBottom: 24 }}>
        Set the services you offer and their pricing.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {data.services.map((service, i) => (
          <div
            key={service.service_type}
            className="card"
            style={{
              padding: 18,
              opacity: service.is_active ? 1 : 0.6,
              transition: "opacity 0.2s",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label
                  style={{
                    position: "relative",
                    width: 44,
                    height: 24,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={service.is_active}
                    onChange={(e) => updateService(i, "is_active", e.target.checked)}
                    style={{ display: "none" }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 12,
                      background: service.is_active ? "var(--deep)" : "var(--line)",
                      transition: "background 0.2s",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: 2,
                      left: service.is_active ? 22 : 2,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "var(--white)",
                      transition: "left 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                    }}
                  />
                </label>
                <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                  {SERVICE_LABELS[service.service_type] || service.title}
                </span>
              </div>
            </div>
            {service.is_active && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="field">
                  <label>Title</label>
                  <input
                    type="text"
                    value={service.title}
                    onChange={(e) => updateService(i, "title", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={service.price}
                    onChange={(e) => updateService(i, "price", Number(e.target.value))}
                  />
                </div>
                <div className="field">
                  <label>Duration (minutes)</label>
                  <select
                    value={service.duration_minutes}
                    onChange={(e) => updateService(i, "duration_minutes", Number(e.target.value))}
                  >
                    <option value={15}>15 min</option>
                    <option value={20}>20 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StepAvailability({
  data,
  update,
}: {
  data: OnboardingData;
  update: (p: Partial<OnboardingData>) => void;
}) {
  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("17:00");

  const addSlot = () => {
    const exists = data.availability.some(
      (a) => a.day_of_week === newDay && a.start_time === newStart && a.end_time === newEnd
    );
    if (!exists) {
      update({
        availability: [
          ...data.availability,
          { day_of_week: newDay, start_time: newStart, end_time: newEnd, is_available: true },
        ],
      });
    }
  };

  const removeSlot = (index: number) => {
    update({
      availability: data.availability.filter((_, i) => i !== index),
    });
  };

  const groupedByDay = DAYS_FULL.map((day, i) => ({
    day,
    dayIndex: i,
    slots: data.availability.filter((a) => a.day_of_week === i),
  })).filter((g) => g.slots.length > 0);

  return (
    <div>
      <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>Availability</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", marginBottom: 24 }}>
        Set your working hours for each day.
      </p>

      {/* Add slot form */}
      <div
        className="card"
        style={{ padding: 18, marginBottom: 24 }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ flex: 1, minWidth: 120 }}>
            <label>Day</label>
            <select value={newDay} onChange={(e) => setNewDay(Number(e.target.value))}>
              {DAYS_FULL.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1, minWidth: 100 }}>
            <label>Start Time</label>
            <input
              type="time"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
            />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 100 }}>
            <label>End Time</label>
            <input
              type="time"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
            />
          </div>
          <button
            className="btn-primary"
            onClick={addSlot}
            style={{ padding: "11px 20px", height: "fit-content" }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Existing slots */}
      {groupedByDay.length === 0 ? (
        <div
          style={{
            color: "var(--ink-soft)",
            padding: 32,
            border: "1px dashed var(--line)",
            borderRadius: "var(--radius-m)",
            textAlign: "center",
            fontSize: "0.92rem",
          }}
        >
          No availability set yet. Add your working hours above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {groupedByDay.map((group) => (
            <div key={group.dayIndex}>
              <div
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "var(--ink-soft)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {group.day}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {group.slots.map((slot, si) => {
                  const globalIndex = data.availability.indexOf(slot);
                  return (
                    <div
                      key={si}
                      className="card"
                      style={{
                        padding: "10px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: "0.9rem" }}>
                        {slot.start_time} – {slot.end_time}
                      </span>
                      <button
                        className="btn-ghost"
                        style={{ color: "var(--rose)", padding: "4px 8px" }}
                        onClick={() => removeSlot(globalIndex)}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepBio({
  data,
  update,
}: {
  data: OnboardingData;
  update: (p: Partial<OnboardingData>) => void;
}) {
  const [newAchievement, setNewAchievement] = useState("");

  const addAchievement = () => {
    if (newAchievement.trim() && !data.achievements.includes(newAchievement.trim())) {
      update({ achievements: [...data.achievements, newAchievement.trim()] });
      setNewAchievement("");
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>Bio & Achievements</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", marginBottom: 24 }}>
        Tell pet owners your story and highlight your accomplishments.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div className="field">
          <label>Bio</label>
          <textarea
            rows={5}
            placeholder="Write a short bio about yourself, your approach to animal care, and what makes you unique..."
            value={data.bio}
            onChange={(e) => update({ bio: e.target.value })}
            style={{ resize: "vertical", minHeight: 120 }}
          />
          <span style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>
            {data.bio.length}/500 characters
          </span>
        </div>

        <div>
          <label
            style={{
              fontSize: "0.78rem",
              color: "var(--ink-soft)",
              fontWeight: 600,
              display: "block",
              marginBottom: 10,
            }}
          >
            Achievements & Awards
          </label>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              placeholder="e.g. Best Vet Award 2023, Published Research..."
              value={newAchievement}
              onChange={(e) => setNewAchievement(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAchievement())}
              style={{
                flex: 1,
                padding: "10px 12px",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-s)",
                fontSize: "0.9rem",
                fontFamily: "inherit",
              }}
            />
            <button className="btn-ghost" onClick={addAchievement}>
              Add
            </button>
          </div>
          {data.achievements.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {data.achievements.map((a) => (
                <span
                  key={a}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 12px",
                    borderRadius: 100,
                    background: "var(--amber)",
                    color: "var(--deep-2)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                  }}
                >
                  {a}
                  <button
                    type="button"
                    onClick={() =>
                      update({ achievements: data.achievements.filter((i) => i !== a) })
                    }
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--deep-2)",
                      padding: 0,
                      fontSize: "1rem",
                      lineHeight: 1,
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepReview({ data }: { data: OnboardingData }) {
  const activeServices = data.services.filter((s) => s.is_active);
  const groupedByDay = DAYS_FULL.map((day, i) => ({
    day,
    slots: data.availability.filter((a) => a.day_of_week === i),
  })).filter((g) => g.slots.length > 0);

  const sections = [
    {
      title: "Professional Information",
      items: [
        { label: "Display Name", value: data.display_name },
        { label: "Full Name", value: data.full_name },
        { label: "Title", value: data.professional_title },
        { label: "Phone", value: data.phone },
        { label: "City", value: data.city },
        { label: "Area", value: data.area },
        { label: "Clinic", value: data.clinic_name },
      ],
    },
    {
      title: "Education & License",
      items: [
        { label: "Degree", value: data.degree },
        { label: "University", value: data.university },
        { label: "Graduation Year", value: data.graduation_year },
        { label: "Experience", value: data.years_experience ? `${data.years_experience} years` : "" },
        { label: "Registration #", value: data.registration_number },
        { label: "Council", value: data.registration_council },
      ],
    },
    {
      title: "Specializations",
      items: [
        { label: "Specializations", value: data.specializations.join(", ") },
        { label: "Species", value: data.species_treated.join(", ") },
        { label: "Languages", value: data.languages.join(", ") },
        { label: "Expertise", value: data.expertise.join(", ") },
      ],
    },
    {
      title: "Bio & Achievements",
      items: [
        { label: "Bio", value: data.bio },
        { label: "Achievements", value: data.achievements.join(", ") },
      ],
    },
  ];

  return (
    <div>
      <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>Review & Publish</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", marginBottom: 24 }}>
        Review your profile before publishing.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {sections.map((section) => {
          const visibleItems = section.items.filter((item) => item.value);
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title}>
              <h3
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--ink-soft)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: 10,
                  paddingBottom: 6,
                  borderBottom: "1px solid var(--line)",
                }}
              >
                {section.title}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {visibleItems.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 16,
                      fontSize: "0.9rem",
                    }}
                  >
                    <span style={{ color: "var(--ink-soft)", minWidth: 110, flexShrink: 0 }}>
                      {item.label}
                    </span>
                    <span style={{ fontWeight: 500, textAlign: "right" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Services */}
        <div>
          <h3
            style={{
              fontSize: "0.82rem",
              fontWeight: 700,
              color: "var(--ink-soft)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 10,
              paddingBottom: 6,
              borderBottom: "1px solid var(--line)",
            }}
          >
            Services
          </h3>
          {activeServices.length === 0 ? (
            <p style={{ color: "var(--ink-soft)", fontSize: "0.88rem" }}>No active services</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {activeServices.map((s) => (
                <div
                  key={s.service_type}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.9rem",
                  }}
                >
                  <span>{s.title}</span>
                  <span style={{ fontWeight: 600 }}>
                    ₹{s.price.toLocaleString("en-IN")} · {s.duration_minutes} min
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Availability */}
        <div>
          <h3
            style={{
              fontSize: "0.82rem",
              fontWeight: 700,
              color: "var(--ink-soft)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 10,
              paddingBottom: 6,
              borderBottom: "1px solid var(--line)",
            }}
          >
            Availability
          </h3>
          {groupedByDay.length === 0 ? (
            <p style={{ color: "var(--ink-soft)", fontSize: "0.88rem" }}>No availability set</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {groupedByDay.map((g) => (
                <div key={g.day} style={{ fontSize: "0.9rem" }}>
                  <span style={{ fontWeight: 600 }}>{g.day}: </span>
                  <span style={{ color: "var(--ink-soft)" }}>
                    {g.slots.map((s) => `${s.start_time}–${s.end_time}`).join(", ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notice */}
        <div
          style={{
            padding: 16,
            borderRadius: "var(--radius-s)",
            background: "var(--amber)15",
            border: "1px solid var(--amber)",
            fontSize: "0.88rem",
            color: "var(--ink-soft)",
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: "var(--ink)" }}>Before publishing:</strong> Make sure your
          registration number and qualifications are accurate. Your profile will be verified by our
          team before you can receive bookings.
        </div>
      </div>
    </div>
  );
}

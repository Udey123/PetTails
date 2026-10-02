"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  formatDate,
  formatTime,
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
import { toStringArray } from "@/lib/ai/petCareSchema";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "bookings", label: "Bookings" },
  { id: "ai-handoffs", label: "AI Handoffs" },
  { id: "services", label: "Services" },
  { id: "availability", label: "Availability" },
  { id: "profile", label: "Profile" },
  { id: "verification", label: "Verification" },
] as const;

type Tab = (typeof TABS)[number]["id"];
type BookingFilter = "all" | "pending" | "confirmed" | "completed" | "cancelled";

interface AIHandoff {
  id: string;
  session_id: string;
  user_id: string;
  vet_id: string | null;
  case_summary: string | null;
  urgency: string | null;
  specialty: string | null;
  status: string;
  created_at: string;
  profiles?: { name: string } | null;
  pet_snapshot?: {
    name?: string | null;
    species?: string | null;
    breed?: string | null;
    age?: string | null;
  } | null;
  triage_snapshot?: {
    observations?: string[];
    red_flags?: string[];
    missing_information?: string[];
    guidance?: {
      what_you_can_do?: string[];
      monitor_for?: string[];
      contact_vet_if?: string[];
    };
  } | null;
}

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || { bg: "#E4A13B22", text: "#C6842A" };
  return (
    <span
      style={{
        padding: "5px 11px",
        borderRadius: 100,
        fontSize: "0.76rem",
        fontWeight: 700,
        letterSpacing: "0.01em",
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
        padding: "4px 10px",
        borderRadius: 100,
        fontSize: "0.74rem",
        fontWeight: 700,
        letterSpacing: "0.01em",
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

function Ico({
  d,
  size = 18,
  cls,
}: {
  d: string;
  size?: number;
  cls?: string;
}) {
  return (
    <svg
      className={cls}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

function ownerInitials(name?: string | null) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PO";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

const SIDEBAR_ICONS: Record<Tab, string> = {
  overview:
    "M3.5 10.7 12 3.5l8.5 7.2M5.8 9.6V19.6a1 1 0 0 0 1 1H10v-5.4h4v5.4h3.2a1 1 0 0 0 1-1V9.6",
  bookings:
    "M5 6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v12A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5zM8 3v4M16 3v4M5 10h14",
  "ai-handoffs":
    "M12 4l1.7 4.3L18 10l-4.3 1.7L12 16l-1.7-4.3L6 10l4.3-1.7zM18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z",
  services: "M12 3.5l7.5 4.2v8.6L12 20.5l-7.5-4.2V7.7zM4.5 7.7 12 12l7.5-4.3M12 12v8.5",
  availability:
    "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 7.8V12l2.8 1.8",
  profile:
    "M12 11.5a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6zM4.8 20c1.1-3 3.8-4.7 7.2-4.7s6.1 1.7 7.2 4.7",
  verification:
    "M12 3.5l7 2.8v5c0 4.2-2.9 7.9-7 9.2-4.1-1.3-7-5-7-9.2v-5zM9.2 11.8l2 2 3.6-3.8",
};

const ICONS = {
  calendar:
    "M5 6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v12A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5zM8 3v4M16 3v4M5 10h14",
  clock: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 7.8V12l2.8 1.8",
  check: "M5.5 12.5l4.3 4.3 8.7-9",
  wallet:
    "M4.5 8V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2M4.5 8a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2M4.5 8h15M16 14.5h1.5",
  star: "M12 4.5l2.3 4.7 5.2.7-3.8 3.6.9 5.1L12 16.1l-4.6 2.5.9-5.1-3.8-3.6 5.2-.7z",
  message:
    "M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4 3.5V16.5H6.5a2 2 0 0 1-2-2z",
  box: "M12 3.5l7.5 4.2v8.6L12 20.5l-7.5-4.2V7.7zM4.5 7.7 12 12l7.5-4.3M12 12v8.5",
  arrow: "M5 12h13M12.5 6.5 19 12l-6.5 5.5",
};

const SERVICE_TYPE_ICONS: Record<string, string> = {
  video_consult:
    "M15.5 10.4 20.5 7.5v9l-5-2.9M4.5 6.5h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z",
  home_visit:
    "M3.5 10.7 12 3.5l8.5 7.2M5.8 9.6V19.6a1 1 0 0 0 1 1H10v-5.4h4v5.4h3.2a1 1 0 0 0 1-1V9.6",
  clinic_consult:
    "M5 20.5h14M6.5 20.5V6a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v14.5M12 8.5v5M9.5 11h5",
  emergency: "M12 4.5 20.5 19.5H3.5zM12 10v4M12 16.6h.01",
  followup:
    "M19.5 9.5A7.5 7.5 0 0 0 6.4 6.4L4.5 8.3M4.5 14.5a7.5 7.5 0 0 0 13.1 3.1l1.9-1.9M4.5 4.5v4h4M19.5 19.5v-4h-4",
};

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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [handoffs, setHandoffs] = useState<AIHandoff[]>([]);
  const [handoffPhotos, setHandoffPhotos] = useState<Record<string, string[]>>({});
  const vetIdRef = useRef<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  const safeQuery = useCallback(async <T,>(promise: Promise<{ data: T | null; error: unknown }>): Promise<T | null> => {
    try {
      const { data, error } = await promise;
      if (error) {
        console.warn("Query warning:", error);
      }
      return data;
    } catch (e) {
      console.warn("Query failed (table may not exist):", e);
      return null;
    }
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Any = any;

  const loadDashboard = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const vetData = await safeQuery<Vet>(
      supabase.from("vets").select("*").eq("user_id", user.id).single()
    );

    if (!vetData) {
      router.push("/dashboard/vet/onboarding");
      return;
    }

    if (vetData.onboarding_completed === false && "onboarding_completed" in vetData) {
      router.push("/dashboard/vet/onboarding");
      return;
    }

    setVet(vetData);
    setOnline(vetData.online);
    setAccepting(vetData.accepting_bookings);
    vetIdRef.current = vetData.id;

    const bookingsData = await safeQuery<Any[]>(
      supabase.from("bookings").select("*, pets(name, species)").eq("vet_id", vetData.id).order("scheduled_at", { ascending: false })
    );

    const servicesData = await safeQuery<VetService[]>(
      supabase.from("vet_services").select("*").eq("vet_id", vetData.id).order("created_at", { ascending: false })
    );

    const availData = await safeQuery<VetAvailability[]>(
      supabase.from("vet_availability").select("*").eq("vet_id", vetData.id).order("day_of_week", { ascending: true })
    );

    const reviewsData = await safeQuery<Any[]>(
      supabase.from("reviews").select("*").eq("vet_id", vetData.id).order("created_at", { ascending: false })
    );

    const handoffsData = await safeQuery<AIHandoff[]>(
      supabase.from("ai_handoffs").select("*").eq("vet_id", vetData.id).order("created_at", { ascending: false }).limit(50)
    );
    let handoffProfiles = new Map<string, { name: string }>();

    const bookingOwnerIds = (bookingsData || []).map((b) => b.owner_id as string).filter(Boolean);
    const reviewOwnerIds = (reviewsData || []).map((r) => r.owner_id as string).filter(Boolean);
    const allOwnerIds = [...new Set([...bookingOwnerIds, ...reviewOwnerIds])];

    let ownerProfilesMap = new Map<string, { name: string }>();
    if (allOwnerIds.length > 0) {
      const ownerProfiles = await safeQuery<{ id: string; name: string }[]>(
        supabase.from("profiles").select("id, name").in("id", allOwnerIds)
      );
      ownerProfilesMap = new Map((ownerProfiles || []).map((p) => [p.id, p]));
    }

    const enrichedBookings = (bookingsData || []).map((b) => ({
      ...b,
      profiles: ownerProfilesMap.get(b.owner_id as string) || null,
    }));

    const petIds = (bookingsData || []).map((b) => b.pet_id as string).filter(Boolean);
    let petsMap = new Map<string, { name: string; species: string }>();
    if (petIds.length > 0) {
      const petsData = await safeQuery<{ id: string; name: string; species: string }[]>(
        supabase.from("pets").select("id, name, species").in("id", petIds)
      );
      petsMap = new Map((petsData || []).map((p) => [p.id, p]));
    }

    const finalBookings = enrichedBookings.map((b) => ({
      ...b,
      pets: petsMap.get(b.pet_id as string) || null,
    }));

    const enrichedReviews = (reviewsData || []).map((r) => ({
      ...r,
      profiles: ownerProfilesMap.get(r.owner_id as string) || null,
    }));

    const handoffOwnerIds = (handoffsData || []).map((h) => h.user_id).filter(Boolean);
    if (handoffOwnerIds.length > 0) {
      const ownerProfiles = await safeQuery<{ id: string; name: string }[]>(
        supabase.from("profiles").select("id, name").in("id", handoffOwnerIds)
      );
      handoffProfiles = new Map((ownerProfiles || []).map((p) => [p.id, p]));
    }
    setHandoffs(
      (handoffsData || []).map((h) => ({
        ...h,
        triage_snapshot: h.triage_snapshot
          ? {
              ...h.triage_snapshot,
              observations: toStringArray(h.triage_snapshot.observations),
              red_flags: toStringArray(h.triage_snapshot.red_flags),
            }
          : h.triage_snapshot,
        profiles: handoffProfiles.get(h.user_id) || null,
      }))
    );

    // Load photos shared in handoff sessions (requires migration 008 policies)
    const handoffSessions = (handoffsData || []).map((h) => h.session_id).filter(Boolean);
    if (handoffSessions.length > 0) {
      const media = await safeQuery<{ session_id: string; storage_path: string }[]>(
        supabase
          .from("ai_care_media")
          .select("session_id, storage_path")
          .in("session_id", handoffSessions)
          .limit(30)
      );
      const photoMap: Record<string, string[]> = {};
      await Promise.all(
        (media || []).map(async (m) => {
          try {
            const { data } = await supabase.storage
              .from("pet-care-media")
              .createSignedUrl(m.storage_path, 3600);
            if (data?.signedUrl) {
              photoMap[m.session_id] = [...(photoMap[m.session_id] || []), data.signedUrl];
            }
          } catch {
            // Storage policy not applied yet — skip photos gracefully
          }
        })
      );
      setHandoffPhotos(photoMap);
    }

    setBookings(finalBookings);
    setServices(servicesData || []);
    setAvailability(availData || []);
    setReviews(enrichedReviews);
    setLoading(false);
  }, [supabase, router, safeQuery]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Realtime subscription — separate useEffect, depends only on vet ID
  useEffect(() => {
    if (!vetIdRef.current) return;

    const vid = vetIdRef.current;

    const channel = supabase
      .channel("vet-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vet_services" },
        async () => {
          const data = await safeQuery<VetService[]>(
            supabase.from("vet_services").select("*").eq("vet_id", vid).order("created_at", { ascending: false })
          );
          setServices(data || []);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vet_availability" },
        async () => {
          const data = await safeQuery<VetAvailability[]>(
            supabase.from("vet_availability").select("*").eq("vet_id", vid).order("day_of_week", { ascending: true })
          );
          setAvailability(data || []);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        async () => {
          const data = await safeQuery<Any[]>(
            supabase.from("bookings").select("*").eq("vet_id", vid).order("scheduled_at", { ascending: false })
          );
          if (data) {
            const ownerIds = data.map((b) => b.owner_id as string).filter(Boolean);
            let ownerMap = new Map<string, { name: string }>();
            if (ownerIds.length > 0) {
              const owners = await safeQuery<{ id: string; name: string }[]>(
                supabase.from("profiles").select("id, name").in("id", ownerIds)
              );
              ownerMap = new Map((owners || []).map((p) => [p.id, p]));
            }
            const petIds = data.map((b) => b.pet_id as string).filter(Boolean);
            let petsMap = new Map<string, { name: string; species: string }>();
            if (petIds.length > 0) {
              const pets = await safeQuery<{ id: string; name: string; species: string }[]>(
                supabase.from("pets").select("id, name, species").in("id", petIds)
              );
              petsMap = new Map((pets || []).map((p) => [p.id, p]));
            }
            setBookings(data.map((b) => ({
              ...b,
              profiles: ownerMap.get(b.owner_id as string) || null,
              pets: petsMap.get(b.pet_id as string) || null,
            })));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, safeQuery]);

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

  const updateHandoffStatus = async (handoffId: string, status: string) => {
    await supabase.from("ai_handoffs").update({ status }).eq("id", handoffId);
    setHandoffs((prev) =>
      prev.map((h) => (h.id === handoffId ? { ...h, status } : h))
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
    setSaveError(null);
    if (editingService) {
      const { data, error } = await supabase
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
      if (error) {
        console.error("Failed to update service:", error);
        setSaveError(`Failed to save: ${error.message}`);
        return;
      }
      if (data) {
        setServices((prev) =>
          prev.map((s) => (s.id === data.id ? data : s))
  );
}

    } else {
      const { data, error } = await supabase
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
      if (error) {
        console.error("Failed to add service:", error);
        setSaveError(`Failed to save: ${error.message}`);
        return;
      }
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
    setSaveError(null);
    const { data, error } = await supabase
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
    if (error) {
      console.error("Failed to save availability:", error);
      setSaveError(`Failed to save availability: ${error.message}`);
      return;
    }
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
    <div className="dv-page">
      <div className="dv-shell">
        {/* Left navigation */}
        <aside className="dv-side">
          <nav className="dv-nav" aria-label="Dashboard sections">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`dv-nav-item ${activeTab === tab.id ? "active" : ""}`}
                aria-current={activeTab === tab.id ? "page" : undefined}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="dv-nav-ico">
                  <Ico d={SIDEBAR_ICONS[tab.id]} />
                </span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="dv-main">
          {/* Hero header */}
          <div className="dv-hero">
            <div>
              <h1 className="dv-title">
                Vet Dashboard
                <span className="dv-wave" aria-hidden="true">
                  👋
                </span>
              </h1>
              <p className="dv-sub">
                Manage bookings, services, and your profile.
              </p>
            </div>
            <div className="dv-status">
              <label className={`dv-pill ${online ? "on" : ""}`}>
                <input
                  type="checkbox"
                  checked={online}
                  onChange={(e) => toggleOnline(e.target.checked)}
                />
                <span className="dv-dot" aria-hidden="true" />
                <span>Online</span>
              </label>
              <label className={`dv-pill ${accepting ? "on" : ""}`}>
                <input
                  type="checkbox"
                  checked={accepting}
                  onChange={(e) => toggleAccepting(e.target.checked)}
                />
                <span className="dv-check" aria-hidden="true" />
                <span>Accepting bookings</span>
              </label>
              <button className="dv-logout" onClick={handleLogout}>
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

        {/* ─── Overview ─── */}
        {activeTab === "overview" && (
          <div>
            <div className="dv-stats">
              {[
                {
                  label: "Total Bookings",
                  value: bookings.length,
                  icon: ICONS.calendar,
                  tone: "sage",
                },
                {
                  label: "Completed",
                  value: bookings.filter((b) => b.status === "completed")
                    .length,
                  icon: ICONS.check,
                  tone: "green",
                },
                {
                  label: "Pending",
                  value: bookings.filter((b) => b.status === "pending").length,
                  icon: ICONS.clock,
                  tone: "amber",
                },
                {
                  label: "Earnings",
                  value: formatPrice(totalEarnings),
                  icon: ICONS.wallet,
                  tone: "amber",
                },
                {
                  label: "Rating",
                  value: avgRating > 0 ? avgRating.toFixed(1) : "–",
                  icon: ICONS.star,
                  tone: "amber",
                },
                {
                  label: "Reviews",
                  value: reviewCount,
                  icon: ICONS.message,
                  tone: "sage",
                },
              ].map((stat) => (
                <div key={stat.label} className="card dv-stat">
                  <span
                    className={`dv-stat-ico ${stat.tone}`}
                    aria-hidden="true"
                  >
                    <Ico d={stat.icon} />
                  </span>
                  <div className="dv-stat-body">
                    <div className="dv-stat-num">{stat.value}</div>
                    <div className="dv-stat-label">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="dv-actions">
              <button
                className="btn-primary dv-act"
                onClick={() => setActiveTab("bookings")}
              >
                <Ico d={ICONS.calendar} size={17} />
                View Bookings
                <Ico d={ICONS.arrow} size={16} cls="dv-arrow" />
              </button>
              <button
                className="btn-secondary dv-act"
                onClick={() => setActiveTab("services")}
              >
                <Ico d={ICONS.box} size={17} />
                Manage Services
              </button>
              <button
                className="btn-secondary dv-act"
                onClick={() => setActiveTab("availability")}
              >
                <Ico d={ICONS.clock} size={17} />
                Edit Availability
              </button>
            </div>

            {/* Recent bookings */}
            <div className="dv-section-head">
              <h3>Recent Bookings</h3>
            </div>
            {bookings.length === 0 ? (
              <div className="dv-empty">
                No bookings yet. When pet owners book you, they&apos;ll appear
                here.
              </div>
            ) : (
              <div className="dv-rows">
                {bookings.slice(0, 5).map((b) => (
                  <div key={b.id} className="card dv-row">
                    <span className="dv-avatar" aria-hidden="true">
                      {ownerInitials(b.profiles?.name)}
                    </span>
                    <div className="dv-row-who">
                      <strong>{b.profiles?.name || "Pet Owner"}</strong>
                      <span>
                        {b.pets?.name
                          ? `${b.pets.name}${
                              b.pets.species ? ` · ${b.pets.species}` : ""
                            }`
                          : `Booking ${b.booking_reference}`}
                      </span>
                    </div>
                    <div className="dv-row-when">
                      <span>
                        <Ico d={ICONS.calendar} size={14} />
                        {formatDate(b.scheduled_at)}
                      </span>
                      <span>
                        <Ico d={ICONS.clock} size={14} />
                        {formatTime(b.scheduled_at)}
                      </span>
                    </div>
                    <div className="dv-row-type">
                      <Ico
                        d={
                          SERVICE_TYPE_ICONS[b.service_type] || ICONS.calendar
                        }
                        size={15}
                      />
                      <span>
                        {SERVICE_LABELS[b.service_type] || b.service_type}
                      </span>
                    </div>
                    <div className="dv-row-badges">
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
                              {b.pets?.name
                                ? `Pet: ${b.pets.name} (${
                                    b.pets.species || "pet"
                                  }) · `
                                : ""}
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
                            {b.service_type === "video_consult" && (() => {
                              const scheduled = new Date(b.scheduled_at).getTime();
                              const now = Date.now();
                              const joinWindow = now >= scheduled - 10 * 60 * 1000 && now <= scheduled + 2 * 60 * 60 * 1000;
                              if (joinWindow) {
                                return (
                                  <a
                                    href={`/consultation/${b.id}`}
                                    style={{
                                      padding: "8px 16px",
                                      borderRadius: "var(--radius-s)",
                                      background: "var(--deep)",
                                      color: "var(--white)",
                                      fontWeight: 600,
                                      fontSize: "0.85rem",
                                      textDecoration: "none",
                                    }}
                                  >
                                    📹 Join Video
                                  </a>
                                );
                              }
                              return null;
                            })()}
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
                        {b.status === "in_progress" && (
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              marginTop: 12,
                              borderTop: "1px solid var(--line)",
                              paddingTop: 12,
                            }}
                          >
                            {b.service_type === "video_consult" && (
                              <a
                                href={`/consultation/${b.id}`}
                                style={{
                                  padding: "8px 16px",
                                  borderRadius: "var(--radius-s)",
                                  background: "var(--deep)",
                                  color: "var(--white)",
                                  fontWeight: 600,
                                  fontSize: "0.85rem",
                                  textDecoration: "none",
                                }}
                              >
                                📹 Join Video
                              </a>
                            )}
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
                              ✓ Complete Consultation
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

        {/* ─── AI Handoffs ─── */}
        {activeTab === "ai-handoffs" && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <h2
                style={{
                  fontFamily: "var(--font-fraunces), Fraunces, serif",
                  fontSize: "1.35rem",
                  color: "var(--deep)",
                  marginBottom: 4,
                }}
              >
                AI Care Handoffs
              </h2>
              <p style={{ fontSize: "0.9rem", color: "var(--ink-soft)" }}>
                Case summaries sent to you by pet owners through the PetTails AI Care Assistant.
              </p>
            </div>

            {handoffs.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  border: "1px dashed var(--line)",
                  borderRadius: "var(--radius-m)",
                  background: "var(--white)",
                }}
              >
                <div style={{ fontSize: "1.6rem", marginBottom: 8 }}>🤖</div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  No AI handoffs yet
                </div>
                <div style={{ fontSize: "0.9rem", color: "var(--ink-soft)" }}>
                  When owners use the AI Care Assistant and are routed to you,
                  their case summaries will appear here.
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {handoffs.map((h) => {
                  const urgencyStyle =
                    h.urgency === "emergency"
                      ? { bg: "#B3363F18", text: "#B3363F" }
                      : h.urgency === "urgent"
                        ? { bg: "#C9727A18", text: "#C9727A" }
                        : h.urgency === "moderate" || h.urgency === "uncertain"
                          ? { bg: "#E4A13B18", text: "#C6842A" }
                          : { bg: "#4C8B5B18", text: "#4C8B5B" };
                  const statusColors: Record<string, { bg: string; text: string }> = {
                    pending: { bg: "#E4A13B18", text: "#C6842A" },
                    accepted: { bg: "#12383218", text: "#123832" },
                    completed: { bg: "#4C8B5B18", text: "#4C8B5B" },
                    declined: { bg: "#C9727A18", text: "#C9727A" },
                  };
                  const sc = statusColors[h.status] || statusColors.pending;
                  return (
                    <div
                      key={h.id}
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: "var(--radius-m)",
                        background: "var(--white)",
                        padding: "16px 18px",
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: 100,
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            background: urgencyStyle.bg,
                            color: urgencyStyle.text,
                            textTransform: "capitalize",
                          }}
                        >
                          {h.urgency || "unknown"} urgency
                        </span>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: 100,
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            background: sc.bg,
                            color: sc.text,
                            textTransform: "capitalize",
                          }}
                        >
                          {h.status}
                        </span>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            color: "var(--ink-soft)",
                            fontWeight: 600,
                          }}
                        >
                          {h.specialty || "General Veterinary"}
                        </span>
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: "0.8rem",
                            color: "var(--ink-soft)",
                          }}
                        >
                          {h.profiles?.name || "Owner"} ·{" "}
                          {new Date(h.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>

                      {h.pet_snapshot && (h.pet_snapshot.name || h.pet_snapshot.species) && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {[
                            h.pet_snapshot.name && `🐾 ${h.pet_snapshot.name}`,
                            h.pet_snapshot.species,
                            h.pet_snapshot.breed,
                            h.pet_snapshot.age,
                          ]
                            .filter(Boolean)
                            .map((chip, i) => (
                              <span
                                key={i}
                                style={{
                                  fontSize: "0.76rem",
                                  fontWeight: 600,
                                  color: "var(--deep)",
                                  background: "#12383214",
                                  padding: "3px 10px",
                                  borderRadius: 100,
                                }}
                              >
                                {chip}
                              </span>
                            ))}
                        </div>
                      )}

                      <div
                        style={{
                          fontSize: "0.9rem",
                          lineHeight: 1.6,
                          color: "var(--ink)",
                          background: "var(--paper)",
                          border: "1px solid var(--line)",
                          borderRadius: "var(--radius-s)",
                          padding: "12px 14px",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {h.case_summary || "No summary available."}
                      </div>

                      {h.triage_snapshot?.red_flags && h.triage_snapshot.red_flags.length > 0 && (
                        <div
                          style={{
                            fontSize: "0.84rem",
                            background: "#C9727A14",
                            border: "1px solid #C9727A44",
                            borderRadius: "var(--radius-s)",
                            padding: "10px 13px",
                          }}
                        >
                          <strong style={{ color: "#B3363F" }}>🚩 Red flags: </strong>
                          {h.triage_snapshot.red_flags.join(" · ")}
                        </div>
                      )}

                      {h.triage_snapshot?.observations &&
                        h.triage_snapshot.observations.length > 0 && (
                          <div
                            style={{
                              fontSize: "0.84rem",
                              background: "#12383210",
                              border: "1px solid #12383233",
                              borderRadius: "var(--radius-s)",
                              padding: "10px 13px",
                            }}
                          >
                            <strong style={{ color: "var(--deep)" }}>👁 Observations: </strong>
                            {h.triage_snapshot.observations.join(" · ")}
                          </div>
                        )}

                      {(handoffPhotos[h.session_id] || []).length > 0 && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {(handoffPhotos[h.session_id] || []).map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={`Shared photo ${i + 1}`}
                                style={{
                                  width: 74,
                                  height: 74,
                                  objectFit: "cover",
                                  borderRadius: 8,
                                  border: "1px solid var(--line)",
                                }}
                              />
                            </a>
                          ))}
                        </div>
                      )}

                      {h.status === "pending" && (
                        <div style={{ display: "flex", gap: 9 }}>
                          <button
                            className="btn-primary"
                            style={{
                              padding: "8px 16px",
                              fontSize: "0.85rem",
                              background: "#4C8B5B",
                            }}
                            onClick={() => updateHandoffStatus(h.id, "accepted")}
                          >
                            ✓ Accept
                          </button>
                          <button
                            className="btn-danger"
                            style={{ fontSize: "0.85rem" }}
                            onClick={() => updateHandoffStatus(h.id, "declined")}
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      {h.status === "accepted" && (
                        <div style={{ display: "flex", gap: 9 }}>
                          <button
                            className="btn-primary"
                            style={{
                              padding: "8px 16px",
                              fontSize: "0.85rem",
                              background: "#4C8B5B",
                            }}
                            onClick={() => updateHandoffStatus(h.id, "completed")}
                          >
                            ✓ Mark reviewed
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Services ─── */}
        {activeTab === "services" && (
          <div>
            {saveError && (
              <div style={{
                padding: "12px 16px",
                marginBottom: 16,
                borderRadius: "var(--radius-s)",
                background: "#C9727A15",
                border: "1px solid #C9727A",
                color: "#C9727A",
                fontSize: "0.88rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <span>{saveError}</span>
                <button onClick={() => setSaveError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#C9727A", fontWeight: 600, fontSize: "0.88rem" }}>✕</button>
              </div>
            )}
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
            <MeetLinkEditor />
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
      </div>

      <style>{`
        .dv-page {
          padding: 36px 0 84px;
        }
        .dv-shell {
          width: min(1440px, calc(100% - 48px));
          margin: 0 auto;
          display: grid;
          grid-template-columns: 244px minmax(0, 1fr);
          gap: 34px;
          align-items: start;
        }
        .dv-main {
          min-width: 0;
        }

        /* ── Left sidebar nav ── */
        .dv-side {
          position: sticky;
          top: 88px;
          background: linear-gradient(180deg, #F7F5EA 0%, #F2EFE2 100%);
          border: 1px solid rgba(28, 42, 33, 0.09);
          border-radius: 22px;
          padding: 14px;
        }
        .dv-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .dv-nav-item {
          display: flex;
          align-items: center;
          gap: 11px;
          width: 100%;
          padding: 10px 12px;
          border: none;
          background: none;
          border-radius: 13px;
          font-size: 0.93rem;
          font-weight: 500;
          color: var(--ink-soft);
          cursor: pointer;
          text-align: left;
          transition: background 0.16s, color 0.16s, box-shadow 0.16s;
        }
        .dv-nav-item:hover {
          background: rgba(255, 253, 248, 0.85);
          color: var(--ink);
        }
        .dv-nav-item.active {
          background: var(--white);
          color: var(--deep);
          font-weight: 600;
          box-shadow: 0 1px 2px rgba(20, 45, 32, 0.07), 0 8px 18px -10px rgba(20, 45, 32, 0.3);
        }
        .dv-nav-ico {
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border-radius: 9px;
          background: rgba(18, 56, 50, 0.07);
          color: inherit;
          flex: none;
        }
        .dv-nav-item.active .dv-nav-ico {
          background: rgba(18, 56, 50, 0.12);
          color: var(--deep);
        }

        /* ── Hero ── */
        .dv-hero {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
          margin-bottom: 26px;
        }
        .dv-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: clamp(1.7rem, 2.4vw, 2.25rem);
        }
        .dv-wave {
          font-size: 0.8em;
        }
        .dv-sub {
          color: var(--ink-soft);
          font-size: 0.95rem;
          margin-top: 6px;
        }
        .dv-status {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .dv-pill {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 9px 15px;
          border-radius: 999px;
          background: var(--white);
          border: 1px solid rgba(28, 42, 33, 0.14);
          font-size: 0.88rem;
          font-weight: 600;
          color: #26382E;
          cursor: pointer;
          user-select: none;
          transition: background 0.16s, border-color 0.16s, box-shadow 0.16s;
        }
        .dv-pill:hover {
          border-color: rgba(18, 56, 50, 0.35);
          box-shadow: 0 2px 8px rgba(20, 45, 32, 0.07);
        }
        .dv-pill input {
          position: absolute;
          opacity: 0;
          width: 1px;
          height: 1px;
          margin: 0;
        }
        .dv-pill:focus-within {
          outline: 2px solid rgba(18, 56, 50, 0.55);
          outline-offset: 2px;
        }
        .dv-pill.on {
          background: #EDF4EC;
          border-color: #BCD6C2;
        }
        .dv-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #A9AEA4;
          flex: none;
          transition: background 0.16s, box-shadow 0.16s;
        }
        .dv-pill.on .dv-dot {
          background: #4C8B5B;
          box-shadow: 0 0 0 3px rgba(76, 139, 91, 0.18);
        }
        .dv-check {
          width: 16px;
          height: 16px;
          border-radius: 5px;
          border: 1.5px solid rgba(28, 42, 33, 0.4);
          display: grid;
          place-items: center;
          flex: none;
          transition: background 0.15s, border-color 0.15s;
        }
        .dv-check::after {
          content: "";
          width: 8px;
          height: 4.5px;
          border-left: 2px solid #fff;
          border-bottom: 2px solid #fff;
          transform: rotate(-45deg) translateY(-1px) scale(0);
          transition: transform 0.15s;
        }
        .dv-pill.on .dv-check {
          background: var(--deep);
          border-color: var(--deep);
        }
        .dv-pill.on .dv-check::after {
          transform: rotate(-45deg) translateY(-1px) scale(1);
        }
        .dv-logout {
          padding: 9px 16px;
          border-radius: 999px;
          border: 1px solid rgba(28, 42, 33, 0.22);
          background: transparent;
          color: var(--ink-soft);
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.16s, color 0.16s, border-color 0.16s;
        }
        .dv-logout:hover {
          background: var(--ink);
          border-color: var(--ink);
          color: var(--white);
        }

        /* ── Stats ── */
        .dv-stats {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 26px;
        }
        .dv-page .card.dv-stat {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px 14px;
        }
        .dv-stat-ico {
          width: 42px;
          height: 42px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          flex: none;
        }
        .dv-stat-ico.sage {
          background: #E5E9DC;
          color: #5E7A64;
        }
        .dv-stat-ico.green {
          background: #D8EBDC;
          color: #35694A;
        }
        .dv-stat-ico.amber {
          background: #F8E8CD;
          color: #B67A22;
        }
        .dv-stat-num {
          font-family: 'Fraunces', serif;
          font-size: 1.32rem;
          font-weight: 600;
          color: var(--ink);
          line-height: 1.15;
        }
        .dv-stat-label {
          font-size: 0.76rem;
          color: var(--ink-soft);
          font-weight: 500;
          margin-top: 2px;
        }

        /* ── Buttons (scoped restyle) ── */
        .dv-page .btn-primary,
        .dv-page .btn-secondary,
        .dv-page .btn-amber,
        .dv-page .btn-danger,
        .dv-page .btn-ghost {
          border-radius: 12px;
          transition: background 0.16s, color 0.16s, border-color 0.16s, transform 0.16s, box-shadow 0.16s;
        }
        .dv-page .btn-primary {
          box-shadow: 0 8px 18px -10px rgba(13, 43, 38, 0.6);
        }
        .dv-page .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 22px -10px rgba(13, 43, 38, 0.55);
        }
        .dv-page .btn-secondary {
          border-color: rgba(28, 42, 33, 0.3);
        }
        .dv-page .btn-secondary:hover {
          border-color: var(--ink);
        }
        .dv-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 30px;
        }
        .dv-act {
          display: inline-flex;
          align-items: center;
          gap: 9px;
        }
        .dv-act .dv-arrow {
          transition: transform 0.16s;
        }
        .dv-act:hover .dv-arrow {
          transform: translateX(3px);
        }

        /* ── Section head + booking rows ── */
        .dv-section-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }
        .dv-rows {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .dv-page .card.dv-row {
          display: grid;
          grid-template-columns: auto minmax(150px, 1.3fr) minmax(170px, auto) minmax(150px, auto) auto;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          transition: box-shadow 0.16s, transform 0.16s;
        }
        .dv-page .card.dv-row:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 26px -14px rgba(20, 45, 32, 0.4);
        }
        .dv-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #E2E9DF;
          border: 1px solid rgba(47, 94, 67, 0.18);
          color: #2F5E43;
          display: grid;
          place-items: center;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          flex: none;
        }
        .dv-row-who {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .dv-row-who strong {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dv-row-who span {
          font-size: 0.83rem;
          color: var(--ink-soft);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dv-row-when {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.84rem;
          color: var(--ink-soft);
        }
        .dv-row-when span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          white-space: nowrap;
        }
        .dv-row-when svg {
          flex: none;
          opacity: 0.75;
        }
        .dv-row-type {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 0.83rem;
          font-weight: 600;
          color: #33463B;
          background: var(--paper);
          border: 1px solid rgba(28, 42, 33, 0.07);
          padding: 7px 12px;
          border-radius: 999px;
          white-space: nowrap;
          justify-self: start;
        }
        .dv-row-badges {
          display: flex;
          gap: 6px;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
        }
        .dv-empty {
          padding: 44px 20px;
          text-align: center;
          color: var(--ink-soft);
          font-size: 0.92rem;
          border: 1px dashed var(--line);
          border-radius: var(--radius-m);
          background: rgba(255, 253, 248, 0.55);
        }

        /* ── Shared component restyles ── */
        .dv-page .card {
          border-color: rgba(28, 42, 33, 0.07);
          border-radius: 18px;
          box-shadow: 0 1px 2px rgba(20, 45, 32, 0.04), 0 14px 30px -24px rgba(20, 45, 32, 0.4);
        }
        .dv-page h3 {
          color: var(--deep);
        }
        .dv-page .field input,
        .dv-page .field select,
        .dv-page .field textarea {
          background: #F4F2E9;
          border: 1px solid transparent;
          border-radius: 12px;
          padding: 12px 14px;
        }
        .dv-page .field input:focus,
        .dv-page .field select:focus,
        .dv-page .field textarea:focus {
          background: var(--white);
          border-color: rgba(18, 56, 50, 0.5);
          box-shadow: 0 0 0 3px rgba(18, 56, 50, 0.12);
        }
        .dv-page .filter-btn {
          font-size: 0.87rem;
        }

        /* ── Responsive ── */
        @media (max-width: 1400px) {
          .dv-stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @media (max-width: 1180px) {
          .dv-shell {
            grid-template-columns: 218px minmax(0, 1fr);
            gap: 24px;
          }
        }
        @media (max-width: 960px) {
          .dv-shell {
            grid-template-columns: minmax(0, 1fr);
            gap: 22px;
          }
          .dv-side {
            position: static;
            padding: 10px;
          }
          .dv-nav {
            flex-direction: row;
            overflow-x: auto;
            gap: 6px;
            padding-bottom: 2px;
          }
          .dv-nav-item {
            flex: none;
            width: auto;
            white-space: nowrap;
            padding: 9px 14px;
            border-radius: 999px;
          }
        }
        @media (max-width: 760px) {
          .dv-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .dv-page .card.dv-row {
            grid-template-columns: auto minmax(0, 1fr) auto;
            grid-template-areas:
              "av who badges"
              "when when type";
            row-gap: 10px;
          }
          .dv-avatar { grid-area: av; }
          .dv-row-who { grid-area: who; }
          .dv-row-badges { grid-area: badges; }
          .dv-row-when {
            grid-area: when;
            flex-direction: row;
            gap: 16px;
          }
          .dv-row-type {
            grid-area: type;
            justify-self: end;
          }
        }
        @media (max-width: 560px) {
          .dv-page {
            padding: 24px 0 64px;
          }
          .dv-shell {
            width: min(1440px, calc(100% - 32px));
          }
          .dv-title {
            font-size: 1.55rem;
          }
          .dv-stats {
            grid-template-columns: minmax(0, 1fr);
          }
          .dv-page .card.dv-row {
            grid-template-columns: auto minmax(0, 1fr);
            grid-template-areas:
              "av who"
              "badges badges"
              "when when"
              "type type";
          }
          .dv-row-badges {
            justify-content: flex-start;
          }
          .dv-row-type {
            justify-self: start;
          }
          .dv-actions .btn-primary,
          .dv-actions .btn-secondary {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

function MeetLinkEditor() {
  const [meetUrl, setMeetUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/vet/meet-link");
        const data = await res.json();
        if (res.ok) {
          setSavedUrl(data.google_meet_url);
          setMeetUrl(data.google_meet_url || "");
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function isValidMeetUrl(url: string): boolean {
    if (!url.trim()) return false;
    try {
      const parsed = new URL(url);
      return (
        parsed.protocol === "https:" &&
        parsed.hostname === "meet.google.com" &&
        parsed.pathname.split("/").filter(Boolean).length >= 1
      );
    } catch {
      return false;
    }
  }

  async function handleSave() {
    if (!isValidMeetUrl(meetUrl)) {
      setMessage({ type: "error", text: "Please enter a valid Google Meet link." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/vet/meet-link", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ google_meet_url: meetUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSavedUrl(meetUrl.trim());
        setEditing(false);
        setMessage({ type: "success", text: "Google Meet link saved" });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save" });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/vet/meet-link", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ google_meet_url: "" }),
      });
      if (res.ok) {
        setSavedUrl(null);
        setMeetUrl("");
        setEditing(false);
        setMessage({ type: "success", text: "Google Meet link removed" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to remove" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to remove" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: 22, marginTop: 20 }}>
        <p style={{ color: "var(--ink-soft)" }}>Loading...</p>
      </div>
    );
  }

  const isConnected = !!savedUrl;

  return (
    <div className="card" style={{ padding: 22, marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h4 style={{ fontSize: "1rem" }}>Video Consultation</h4>
        <span
          style={{
            fontSize: "0.78rem",
            fontWeight: 600,
            padding: "3px 10px",
            borderRadius: 20,
            background: isConnected ? "#4C8B5B15" : "var(--line)",
            color: isConnected ? "#4C8B5B" : "var(--ink-soft)",
          }}
        >
          {isConnected ? "✓ Connected" : "○ Not connected"}
        </span>
      </div>
      <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)", marginBottom: 16 }}>
        Add the Google Meet link you use for your video consultations.
      </p>

      <label style={{ display: "block", fontSize: "0.88rem", fontWeight: 600, marginBottom: 6 }}>
        Google Meet link
      </label>
      <input
        type="url"
        value={meetUrl}
        onChange={(e) => setMeetUrl(e.target.value)}
        placeholder="https://meet.google.com/abc-defg-hij"
        disabled={!editing && isConnected}
        style={{
          width: "100%",
          padding: "10px 14px",
          border: `1px solid ${message?.type === "error" ? "var(--rose)" : "var(--line)"}`,
          borderRadius: "var(--radius-s)",
          fontSize: "0.9rem",
          marginBottom: 12,
          background: !editing && isConnected ? "var(--paper)" : "var(--white)",
          color: !editing && isConnected ? "var(--ink-soft)" : "var(--ink)",
          opacity: !editing && isConnected ? 0.7 : 1,
        }}
      />

      <p style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginTop: -8, marginBottom: 12 }}>
        This link will be used for your confirmed video consultations.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {!isConnected || editing ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-amber"
            style={{ fontSize: "0.88rem" }}
          >
            {saving ? "Saving..." : "Save Google Meet Link"}
          </button>
        ) : (
          <>
            <button
              onClick={() => { setEditing(true); setMessage(null); }}
              className="btn-amber"
              style={{ fontSize: "0.88rem" }}
            >
              Edit Link
            </button>
            <button
              onClick={handleRemove}
              disabled={saving}
              style={{
                fontSize: "0.88rem",
                padding: "8px 16px",
                borderRadius: "var(--radius-s)",
                border: "1px solid var(--line)",
                background: "var(--white)",
                cursor: "pointer",
                color: "var(--rose)",
                fontWeight: 500,
              }}
            >
              {saving ? "Removing..." : "Remove Link"}
            </button>
          </>
        )}
      </div>

      {message && (
        <div
          style={{
            marginTop: 12,
            padding: "8px 12px",
            borderRadius: "var(--radius-s)",
            fontSize: "0.85rem",
            background: message.type === "success" ? "#4C8B5B15" : "#C9727A15",
            color: message.type === "success" ? "#4C8B5B" : "var(--rose)",
          }}
        >
          {message.text}
        </div>
      )}
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

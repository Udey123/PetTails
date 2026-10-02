"use client";

import Link from "next/link";
import type { Urgency, SpecialtyKey } from "@/lib/ai/petCareSchema";
import { SPECIALTIES } from "@/lib/ai/petCareSchema";

export interface VetLite {
  id: string;
  display_name: string | null;
  profile_name: string | null;
  specialization: string;
  city: string | null;
  area: string | null;
  rating: number;
  review_count: number;
  verified: boolean;
  consultation_price: number;
  google_meet_url: string | null;
  online: boolean;
}

interface ReferralCardProps {
  urgency: Urgency;
  specialty: SpecialtyKey | null;
  vets: VetLite[];
  loading: boolean;
  handoffState: "idle" | "loading" | "done" | "error";
  handoffData: Record<string, unknown> | null;
  onHandoff: (vetId?: string) => void;
  onFindMore: () => void;
  onBook: (vetId: string) => void;
  bookingVetId: string | null;
}

const URGENCY: Record<Urgency, { label: string; color: string; bg: string; note: string }> = {
  low: { label: "Low risk", color: "#4C8B5B", bg: "#e8f5e9", note: "General guidance may be enough." },
  moderate: { label: "Monitor", color: "#C6842A", bg: "#fdf3e3", note: "Worth a professional check if it persists." },
  uncertain: { label: "Needs more info", color: "#C6842A", bg: "#fdf3e3", note: "A vet can help clarify what's going on." },
  urgent: { label: "See a vet soon", color: "#C9727A", bg: "#f9e8ea", note: "Professional evaluation recommended soon." },
  emergency: { label: "Emergency", color: "#B3363F", bg: "#fbe9ea", note: "Contact a veterinary clinic immediately." },
};

export default function ReferralCard({
  urgency,
  specialty,
  vets,
  loading,
  handoffState,
  handoffData,
  onHandoff,
  onFindMore,
  onBook,
  bookingVetId,
}: ReferralCardProps) {
  const meta = URGENCY[urgency] || URGENCY.uncertain;
  const specialtyLabel = specialty ? SPECIALTIES[specialty] || specialty : "General Veterinary";

  return (
    <div
      style={{
        border: `1.5px solid ${meta.color}55`,
        borderRadius: "var(--radius-m, 12px)",
        background: "var(--white)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "11px 14px",
          background: meta.bg,
          color: meta.color,
          fontWeight: 700,
          fontSize: "0.88rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: meta.color }} />
          {meta.label} — {specialtyLabel}
        </span>
        <span style={{ fontWeight: 500, fontSize: "0.8rem" }}>{meta.note}</span>
      </div>

      <div style={{ padding: 13, display: "grid", gap: 10 }}>
        {/* Case summary from handoff */}
        {handoffState === "done" && handoffData?.case_summary ? (
          <div
            style={{
              background: "var(--paper)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-s, 8px)",
              padding: "11px 13px",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "0.84rem", marginBottom: 5, color: "var(--deep)" }}>
              📋 Case summary sent to your vet
            </div>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink)", lineHeight: 1.55 }}>
              {String(handoffData.case_summary)}
            </p>
            <div style={{ marginTop: 7, fontSize: "0.78rem", color: "var(--ink-soft)" }}>
              {String(handoffData.message_count || 0)} messages ·{" "}
              {String(handoffData.media_count || 0)} photo(s) shared
            </div>
          </div>
        ) : null}

        {/* Vet list */}
        {loading ? (
          <div style={{ fontSize: "0.87rem", color: "var(--ink-soft)", padding: "6px 0" }}>
            Finding matching veterinarians…
          </div>
        ) : vets.length === 0 ? (
          <div style={{ fontSize: "0.87rem", color: "var(--ink-soft)", padding: "6px 0" }}>
            No vets matched right now. Try{" "}
            <button
              onClick={onFindMore}
              style={{
                background: "none",
                border: "none",
                color: "var(--deep)",
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
                textDecoration: "underline",
                fontSize: "inherit",
                fontFamily: "inherit",
              }}
            >
              searching again
            </button>
            .
          </div>
        ) : (
          vets.map((vet) => {
            const name = vet.display_name || vet.profile_name || "Veterinarian";
            const location = [vet.area, vet.city].filter(Boolean).join(", ");
            const isAssigned =
              !!handoffData &&
              (handoffData as { vet_id?: string | null }).vet_id === vet.id;
            return (
              <div
                key={vet.id}
                className="vet-ai-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "10px 12px",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-s, 8px)",
                  background: "var(--white)",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "var(--deep)",
                    color: "var(--white)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    flex: "none",
                  }}
                >
                  {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {name.startsWith("Dr.") ? name : `Dr. ${name}`}
                    {vet.verified && (
                      <span style={{ fontSize: "0.68rem", color: "#4C8B5B", fontWeight: 700 }}>✓</span>
                    )}
                    {vet.online && (
                      <span
                        style={{
                          fontSize: "0.66rem",
                          background: "#e8f5e9",
                          color: "#4C8B5B",
                          padding: "1px 7px",
                          borderRadius: 100,
                          fontWeight: 700,
                        }}
                      >
                        Online
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>
                    {vet.specialization}
                    {location ? ` · ${location}` : ""}
                  </div>
                </div>
                <div
                  className="vet-ai-actions"
                  style={{ display: "flex", gap: 7, flex: "none", flexWrap: "wrap" }}
                >
                  <Link
                    href={`/vets/${vet.id}`}
                    style={{
                      padding: "7px 11px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      border: "1px solid var(--line)",
                      borderRadius: 100,
                      color: "var(--ink)",
                      textDecoration: "none",
                    }}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => onHandoff(vet.id)}
                    disabled={handoffState === "loading" || handoffState === "done"}
                    title="Send the AI case summary to this vet"
                    style={{
                      padding: "7px 11px",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      borderRadius: 100,
                      border: "1px solid var(--line)",
                      cursor:
                        handoffState === "loading" || handoffState === "done"
                          ? "default"
                          : "pointer",
                      background: isAssigned || handoffState === "done" ? "#e8f5e9" : "var(--white)",
                      color: isAssigned || handoffState === "done" ? "#4C8B5B" : "var(--ink-soft)",
                      opacity: handoffState === "loading" ? 0.6 : 1,
                    }}
                  >
                    {handoffState === "loading"
                      ? "Sending…"
                      : isAssigned || handoffState === "done"
                        ? "✓ Case sent"
                        : "Send case"}
                  </button>
                  <button
                    onClick={() => onBook(vet.id)}
                    disabled={bookingVetId !== null}
                    style={{
                      padding: "7px 14px",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      borderRadius: 100,
                      border: "none",
                      cursor: bookingVetId ? "default" : "pointer",
                      background: "var(--amber)",
                      color: "#1C2A21",
                      opacity: bookingVetId === vet.id ? 0.7 : 1,
                    }}
                  >
                    {bookingVetId === vet.id ? "Opening…" : "Book →"}
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Generic handoff (no specific vet) */}
        {handoffState !== "done" && !loading && vets.length > 0 && (
          <button
            onClick={() => onHandoff()}
            disabled={handoffState === "loading"}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "var(--radius-s, 8px)",
              border: "1px dashed var(--line)",
              background: "transparent",
              color: "var(--ink-soft)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: handoffState === "loading" ? "default" : "pointer",
              opacity: handoffState === "loading" ? 0.6 : 1,
            }}
          >
            {handoffState === "loading"
              ? "Preparing case summary…"
              : "Send AI case summary without picking a vet"}
          </button>
        )}

        {handoffState === "error" && (
          <div style={{ fontSize: "0.84rem", color: "#B3363F" }}>
            Couldn&apos;t send the handoff. Please try again.
          </div>
        )}

        {/* Case sent — booking happens inline via the Book button */}
        {handoffState === "done" && (
          <div
            style={{
              fontSize: "0.84rem",
              color: "#4C8B5B",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            ✓ Case package sent — tap “Book →” on a vet above to schedule a
            consultation right here.
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .vet-ai-actions { width: 100%; justify-content: flex-end; }
        }
      `}</style>
    </div>
  );
}

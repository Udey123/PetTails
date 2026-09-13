"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface TrackingBoxProps {
  bookingId: string;
}

const TRACK_STEPS = [
  { id: "confirmed", label: "Confirmed" },
  { id: "vet_assigned", label: "Vet assigned" },
  { id: "vet_en_route", label: "Vet en route" },
  { id: "arriving", label: "Arriving" },
  { id: "arrived", label: "Arrived" },
];

export function TrackingBox({ bookingId }: TrackingBoxProps) {
  const [currentStatus, setCurrentStatus] = useState("confirmed");
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          if (payload.new?.status) {
            setCurrentStatus(payload.new.status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, supabase]);

  const activeIdx = TRACK_STEPS.findIndex((s) => s.id === currentStatus);

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-s)",
        padding: "14px 16px",
        marginBottom: 16,
        textAlign: "left",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 10 }}>
        Live status
      </div>
      <div className="track-steps">
        {TRACK_STEPS.map((step, i) => (
          <div
            key={step.id}
            className={`track-step ${i <= activeIdx ? "active" : ""}`}
          >
            {step.label}
          </div>
        ))}
      </div>
      <div style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
        {currentStatus === "arrived"
          ? "Vet has arrived"
          : currentStatus === "confirmed"
          ? "Waiting for vet assignment..."
          : `Status: ${currentStatus.replace(/_/g, " ")}`}
      </div>
    </div>
  );
}

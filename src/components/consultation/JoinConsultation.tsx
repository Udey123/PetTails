"use client";

import { useState } from "react";

interface Props {
  bookingId: string;
  bookingReference: string;
  scheduledAt: string;
  urgency: string;
  status: string;
  price: number;
  userRole: "owner" | "vet";
  petName: string;
  petSpecies: string;
  petBreed: string;
  vetName: string;
  vetSpecialization: string;
  googleMeetUrl: string | null;
}

export default function JoinConsultation(props: Props) {
  const [joining, setJoining] = useState(false);

  const scheduledDate = new Date(props.scheduledAt);
  const formattedDate = scheduledDate.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formattedTime = scheduledDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const now = Date.now();
  const scheduledMs = scheduledDate.getTime();
  const tenMinBefore = scheduledMs - 10 * 60 * 1000;
  const twoHoursAfter = scheduledMs + 2 * 60 * 60 * 1000;
  const isCompleted = props.status === "completed";
  const isInWindow = now >= tenMinBefore && now <= twoHoursAfter;
  const isActiveStatus = props.status === "confirmed" || props.status === "in_progress";
  const isJoinable = isActiveStatus && isInWindow;
  const isBefore = !isCompleted && now < tenMinBefore;
  const isAfter = !isCompleted && now > twoHoursAfter && isActiveStatus;

  function handleJoin() {
    if (!props.googleMeetUrl) return;
    setJoining(true);
    window.open(props.googleMeetUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => setJoining(false), 2000);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ink)",
        color: "var(--white)",
        fontFamily: "var(--font-work), Work Sans, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          background: "rgba(255,255,255,0.04)",
          borderRadius: "var(--radius-l)",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "32px 28px",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <span
            style={{
              fontFamily: "var(--font-fraunces), Fraunces, serif",
              fontWeight: 700,
              fontSize: "1.1rem",
              color: "var(--amber)",
            }}
          >
            PetTails
          </span>
          <h1
            style={{
              fontSize: "1.3rem",
              fontWeight: 700,
              marginTop: 16,
              marginBottom: 4,
            }}
          >
            Video Consultation
          </h1>
          <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>
            Reference: {props.bookingReference}
          </p>
        </div>

        {/* Booking details */}
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            borderRadius: "var(--radius-m)",
            padding: 18,
            marginBottom: 24,
          }}
        >
          <DetailRow label="Vet" value={`Dr. ${props.vetName}`} />
          <DetailRow label="Pet" value={`${props.petName} (${props.petSpecies})`} />
          <DetailRow label="Service" value="Video Consultation" />
          <DetailRow label="Date" value={formattedDate} />
          <DetailRow label="Time" value={formattedTime} />
          <DetailRow
            label="Urgency"
            value={props.urgency.charAt(0).toUpperCase() + props.urgency.slice(1)}
          />
          <DetailRow label="Status" value={props.status.charAt(0).toUpperCase() + props.status.slice(1)} />
        </div>

        {/* Meet link status */}
        {props.googleMeetUrl ? (
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: "0.88rem",
                opacity: 0.7,
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              Your consultation will take place on Google Meet.
            </p>

            {isCompleted ? (
              <div
                style={{
                  padding: "14px 20px",
                  borderRadius: "var(--radius-m)",
                  background: "rgba(76,139,91,0.15)",
                  border: "1px solid rgba(76,139,91,0.3)",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: "0.92rem", fontWeight: 600 }}>
                  Consultation completed
                </p>
              </div>
            ) : isBefore ? (
              <div
                style={{
                  padding: "14px 20px",
                  borderRadius: "var(--radius-m)",
                  background: "rgba(228,161,59,0.1)",
                  border: "1px solid rgba(228,161,59,0.25)",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: "0.88rem", opacity: 0.8 }}>
                  Join available shortly before your appointment
                </p>
                <p style={{ fontSize: "0.82rem", opacity: 0.5, marginTop: 6 }}>
                  Opens at {new Date(tenMinBefore).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ) : isAfter ? (
              <div
                style={{
                  padding: "14px 20px",
                  borderRadius: "var(--radius-m)",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: "0.92rem", fontWeight: 600 }}>
                  Consultation ended
                </p>
              </div>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining}
                style={{
                  width: "100%",
                  padding: "14px 24px",
                  borderRadius: "var(--radius-m)",
                  border: "none",
                  background: "var(--amber)",
                  color: "var(--ink)",
                  fontWeight: 700,
                  fontSize: "1rem",
                  cursor: joining ? "default" : "pointer",
                  opacity: joining ? 0.7 : 1,
                  fontFamily: "var(--font-fraunces), Fraunces, serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {joining ? (
                  "Opening Google Meet..."
                ) : (
                  <>
                    Join Video Consultation →
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: "18px 20px",
              borderRadius: "var(--radius-m)",
              background: "rgba(201,114,122,0.1)",
              border: "1px solid rgba(201,114,122,0.25)",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "0.92rem", fontWeight: 600, marginBottom: 6 }}>
              Google Meet link not available yet
            </p>
            <p style={{ fontSize: "0.82rem", opacity: 0.6, lineHeight: 1.4 }}>
              {props.userRole === "owner"
                ? "Please contact the veterinary professional or check again before your appointment."
                : "Add your Google Meet link in your Video Consultation settings."}
            </p>
          </div>
        )}

        {/* Back button */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: "10px 20px",
              borderRadius: "var(--radius-s)",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent",
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.88rem",
              cursor: "pointer",
            }}
          >
            ← Back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "7px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        fontSize: "0.88rem",
      }}
    >
      <span style={{ opacity: 0.5 }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

import type { Vet } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

interface VetCardProps {
  vet: Vet;
  onBook: () => void;
}

const COLORS = ["#123832", "#C6842A", "#C9727A", "#4C8B5B", "#123832"];

export function VetCard({ vet, onBook }: VetCardProps) {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const initials = vet.profiles?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2) || "V";

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-m)",
        background: "var(--white)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          aspectRatio: "16/11",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-fraunces), Fraunces, serif",
          fontSize: "2.2rem",
          fontWeight: 600,
          color: "var(--white)",
          background: color,
          position: "relative",
        }}
      >
        {vet.online && (
          <span
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              background: "var(--white)",
              color: "var(--ink)",
              fontSize: "0.72rem",
              fontWeight: 700,
              padding: "5px 9px",
              borderRadius: 100,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4C8B5B" }} />
            Online now
          </span>
        )}
        {initials}
      </div>
      <div style={{ padding: "18px 18px 20px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <div style={{ fontFamily: "var(--font-fraunces), Fraunces, serif", fontWeight: 600, fontSize: "1.12rem" }}>
              Dr. {vet.profiles?.name || "Unknown"}
            </div>
            <div style={{ color: "var(--ink-soft)", fontSize: "0.88rem", marginTop: 2 }}>
              {vet.specialization}
            </div>
          </div>
          <div style={{ fontSize: "0.86rem", whiteSpace: "nowrap", color: "var(--ink-soft)" }}>
            ★ {vet.rating}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            fontSize: "0.85rem",
            color: "var(--ink-soft)",
            borderTop: "1px solid var(--line)",
            paddingTop: 12,
            marginTop: 2,
          }}
        >
          <span>{vet.online ? "Available now" : "Offline"}</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "auto",
            paddingTop: 6,
          }}
        >
          <div style={{ fontWeight: 700 }}>
            {formatPrice(vet.consultation_price)}{" "}
            <span style={{ fontWeight: 400, color: "var(--ink-soft)", fontSize: "0.8rem" }}>/ consult</span>
          </div>
          <button
            className="btn-primary"
            style={{ padding: "10px 18px", fontSize: "0.9rem" }}
            onClick={onBook}
          >
            Book
          </button>
        </div>
      </div>
    </div>
  );
}

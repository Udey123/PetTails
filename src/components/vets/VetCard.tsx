import Link from "next/link";
import type { Vet } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

interface VetCardProps {
  vet: Vet;
  onBook: () => void;
}

const COLORS = ["#123832", "#C6842A", "#C9727A", "#4C8B5B", "#123832"];

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function VetCard({ vet, onBook }: VetCardProps) {
  const color = COLORS[hashId(vet.id) % COLORS.length];
  const initials =
    vet.profiles?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2) || "V";

  const location = [vet.area, vet.city].filter(Boolean).join(", ");

  const MAX_SPECIES = 3;
  const shownSpecies = vet.species_treated?.slice(0, MAX_SPECIES) ?? [];
  const extraSpecies = (vet.species_treated?.length ?? 0) - MAX_SPECIES;

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
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#4C8B5B",
              }}
            />
            Online now
          </span>
        )}
        {initials}
      </div>
      <div
        style={{
          padding: "18px 18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "var(--font-fraunces), Fraunces, serif",
                fontWeight: 600,
                fontSize: "1.12rem",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Dr. {vet.profiles?.name || "Unknown"}
              {vet.verified && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: "#4C8B5B",
                    background: "#e8f5e9",
                    padding: "2px 7px",
                    borderRadius: 100,
                    whiteSpace: "nowrap",
                  }}
                >
                  ✓ Verified
                </span>
              )}
            </div>
            <div
              style={{
                color: "var(--ink-soft)",
                fontSize: "0.88rem",
                marginTop: 2,
              }}
            >
              {vet.specialization}
            </div>
            {location && (
              <div
                style={{
                  color: "var(--ink-soft)",
                  fontSize: "0.82rem",
                  marginTop: 2,
                }}
              >
                {location}
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: "0.86rem",
              whiteSpace: "nowrap",
              color: "var(--ink-soft)",
            }}
          >
            ★ {vet.rating} ({vet.review_count})
          </div>
        </div>

        {shownSpecies.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {shownSpecies.map((species) => (
              <span
                key={species}
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "var(--ink-soft)",
                  background: "var(--line)",
                  padding: "3px 8px",
                  borderRadius: 100,
                }}
              >
                {species}
              </span>
            ))}
            {extraSpecies > 0 && (
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "var(--ink-soft)",
                  padding: "3px 4px",
                  borderRadius: 100,
                }}
              >
                +{extraSpecies} more
              </span>
            )}
          </div>
        )}

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
          {vet.vet_services && vet.vet_services.length > 0 && (
            <span style={{ marginLeft: "auto" }}>
              {vet.vet_services.length} service{vet.vet_services.length !== 1 ? "s" : ""}
            </span>
          )}
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
            {vet.vet_services && vet.vet_services.length > 0 ? (
              <>
                {formatPrice(Math.min(...vet.vet_services.map((s) => s.price)))}
                {" – "}
                {formatPrice(Math.max(...vet.vet_services.map((s) => s.price)))}
              </>
            ) : (
              vet.consultation_price > 0 ? formatPrice(vet.consultation_price) : null
            )}
            <span
              style={{
                fontWeight: 400,
                color: "var(--ink-soft)",
                fontSize: "0.8rem",
              }}
            >
              {" "}/ service
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href={`/vets/${vet.id}`}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px 14px",
              fontSize: "0.88rem",
              fontWeight: 600,
              borderRadius: "var(--radius-s, 8px)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            View Profile
          </Link>
          <button
            className="btn-primary"
            style={{ flex: 1, padding: "10px 14px", fontSize: "0.88rem" }}
            onClick={onBook}
          >
            Book Consultation
          </button>
        </div>
      </div>
    </div>
  );
}

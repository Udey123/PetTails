"use client";

import type { TriageGuidance } from "@/lib/ai/petCareSchema";

interface GuidanceCardProps {
  guidance: TriageGuidance;
}

function Section({
  icon,
  title,
  items,
  color,
  bg,
}: {
  icon: string;
  title: string;
  items: string[];
  color: string;
  bg: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${color}33`,
        borderRadius: "var(--radius-s, 8px)",
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          fontWeight: 700,
          fontSize: "0.85rem",
          color,
          marginBottom: 7,
        }}
      >
        <span>{icon}</span>
        {title}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: "0.87rem", color: "var(--ink)", lineHeight: 1.5 }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function GuidanceCard({ guidance }: GuidanceCardProps) {
  const hasContent =
    (guidance.what_you_can_do?.length || 0) +
      (guidance.monitor_for?.length || 0) +
      (guidance.contact_vet_if?.length || 0) >
    0;

  if (!hasContent) return null;

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-m, 12px)",
        background: "var(--white)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          background: "var(--deep)",
          color: "var(--white)",
          fontWeight: 700,
          fontSize: "0.88rem",
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}
      >
        ✅ Basic Care Guidance
      </div>
      <div style={{ padding: 12, display: "grid", gap: 9 }}>
        <Section
          icon="💙"
          title="What you can do now"
          items={guidance.what_you_can_do || []}
          color="#123832"
          bg="#eef4f1"
        />
        <Section
          icon="👀"
          title="Watch for these changes…"
          items={guidance.monitor_for || []}
          color="#C6842A"
          bg="#fdf7ec"
        />
        <Section
          icon="🏥"
          title="Contact a veterinarian if…"
          items={guidance.contact_vet_if || []}
          color="#C9727A"
          bg="#fbf0f1"
        />
      </div>
    </div>
  );
}

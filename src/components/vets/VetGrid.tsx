import type { Vet } from "@/lib/types";
import { VetCard } from "./VetCard";

interface VetGridProps {
  vets: Vet[];
  onBookVet: (vet: Vet) => void;
}

export function VetGrid({ vets, onBookVet }: VetGridProps) {
  if (vets.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-soft)" }}>
        No vets currently available. Check back soon.
      </div>
    );
  }

  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}
      className="vet-grid-responsive"
    >
      {vets.map((vet) => (
        <VetCard key={vet.id} vet={vet} onBook={() => onBookVet(vet)} />
      ))}
    </div>
  );
}

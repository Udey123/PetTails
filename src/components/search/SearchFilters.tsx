"use client";

import { useState } from "react";
import { COMMON_SPECIES, SERVICE_LABELS } from "@/lib/utils";

export interface FilterState {
  species: string[];
  specialization: string[];
  serviceType: string[];
  minPrice: number;
  maxPrice: number;
  minRating: number;
  onlineOnly: boolean;
  minExperience: number;
  city: string;
}

interface SearchFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

const DEFAULT_FILTERS: FilterState = {
  species: [],
  specialization: [],
  serviceType: [],
  minPrice: 0,
  maxPrice: 10000,
  minRating: 0,
  onlineOnly: false,
  minExperience: 0,
  city: "",
};

const SPECIALIZATIONS = [
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
  "Exotic Animals",
];

const SERVICE_TYPES: { label: string; value: string }[] = [
  { label: "Video Consultation", value: "video_consult" },
  { label: "Home Visit", value: "home_visit" },
  { label: "Clinic Consultation", value: "clinic_consult" },
  { label: "Emergency", value: "emergency" },
];

const RATING_OPTIONS = [
  { label: "4+ ★", value: 4 },
  { label: "3+ ★", value: 3 },
  { label: "2+ ★", value: 2 },
  { label: "Any", value: 0 },
];

const EXPERIENCE_OPTIONS = [
  { label: "1+ years", value: 1 },
  { label: "3+ years", value: 3 },
  { label: "5+ years", value: 5 },
  { label: "10+ years", value: 10 },
];

export default function SearchFilters({
  filters,
  onFilterChange,
}: SearchFiltersProps) {
  const [collapsed, setCollapsed] = useState(true);

  function update(patch: Partial<FilterState>) {
    onFilterChange({ ...filters, ...patch });
  }

  function toggleArray(key: "species" | "specialization" | "serviceType", value: string) {
    const arr = filters[key];
    const next = arr.includes(value)
      ? arr.filter((v) => v !== value)
      : [...arr, value];
    update({ [key]: next });
  }

  function isArraysEqual(a: FilterState, b: FilterState): boolean {
    return (
      a.species.length === b.species.length &&
      a.species.every((v) => b.species.includes(v)) &&
      a.specialization.length === b.specialization.length &&
      a.specialization.every((v) => b.specialization.includes(v)) &&
      a.serviceType.length === b.serviceType.length &&
      a.serviceType.every((v) => b.serviceType.includes(v)) &&
      a.minPrice === b.minPrice &&
      a.maxPrice === b.maxPrice &&
      a.minRating === b.minRating &&
      a.onlineOnly === b.onlineOnly &&
      a.minExperience === b.minExperience &&
      a.city === b.city
    );
  }

  const hasActiveFilters = !isArraysEqual(filters, DEFAULT_FILTERS);

  function clearAll() {
    onFilterChange({ ...DEFAULT_FILTERS });
  }

  const sectionStyle: React.CSSProperties = {
    marginBottom: 22,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "var(--ink-soft)",
    marginBottom: 8,
    display: "block",
  };

  const headingStyle: React.CSSProperties = {
    fontFamily: "var(--font-fraunces), Fraunces, serif",
    fontWeight: 600,
    fontSize: "1.15rem",
    marginBottom: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  const toggleRowStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  };

  const inputRowStyle: React.CSSProperties = {
    display: "flex",
    gap: 10,
    alignItems: "center",
  };

  const priceInputStyle: React.CSSProperties = {
    flex: 1,
    padding: "10px 12px",
    border: "1px solid var(--line)",
    borderRadius: "var(--radius-s)",
    background: "var(--paper)",
    fontSize: "0.9rem",
    fontFamily: "inherit",
    color: "var(--ink)",
    width: "100%",
  };

  const checkboxLabelStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--ink)",
    cursor: "pointer",
  };

  const content = (
    <div>
      {/* City */}
      <div className="field" style={sectionStyle}>
        <label style={labelStyle}>Location</label>
        <input
          type="text"
          placeholder="Search by city..."
          value={filters.city}
          onChange={(e) => update({ city: e.target.value })}
        />
      </div>

      {/* Species */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Species</span>
        <div style={toggleRowStyle}>
          {COMMON_SPECIES.map((s) => (
            <button
              key={s}
              className={`filter-btn${filters.species.includes(s) ? " active" : ""}`}
              onClick={() => toggleArray("species", s)}
              type="button"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Specialization */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Specialization</span>
        <div style={toggleRowStyle}>
          {SPECIALIZATIONS.map((s) => (
            <button
              key={s}
              className={`filter-btn${filters.specialization.includes(s) ? " active" : ""}`}
              onClick={() => toggleArray("specialization", s)}
              type="button"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Service Type */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Consultation Type</span>
        <div style={toggleRowStyle}>
          {SERVICE_TYPES.map((st) => (
            <button
              key={st.value}
              className={`filter-btn${filters.serviceType.includes(st.value) ? " active" : ""}`}
              onClick={() => toggleArray("serviceType", st.value)}
              type="button"
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="field" style={sectionStyle}>
        <label style={labelStyle}>Price Range (₹)</label>
        <div style={inputRowStyle}>
          <input
            type="number"
            placeholder="Min"
            min={0}
            value={filters.minPrice || ""}
            onChange={(e) => update({ minPrice: Number(e.target.value) || 0 })}
            style={priceInputStyle}
          />
          <span style={{ color: "var(--ink-soft)", flexShrink: 0 }}>—</span>
          <input
            type="number"
            placeholder="Max"
            min={0}
            value={filters.maxPrice === 10000 ? "" : filters.maxPrice}
            onChange={(e) =>
              update({ maxPrice: Number(e.target.value) || 10000 })
            }
            style={priceInputStyle}
          />
        </div>
      </div>

      {/* Rating */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Minimum Rating</span>
        <div style={toggleRowStyle}>
          {RATING_OPTIONS.map((r) => (
            <button
              key={r.value}
              className={`filter-btn${filters.minRating === r.value ? " active" : ""}`}
              onClick={() => update({ minRating: r.value })}
              type="button"
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Online Only */}
      <div style={sectionStyle}>
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={filters.onlineOnly}
            onChange={(e) => update({ onlineOnly: e.target.checked })}
            style={{
              width: 18,
              height: 18,
              accentColor: "var(--deep)",
              cursor: "pointer",
            }}
          />
          Online now
        </label>
      </div>

      {/* Experience */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Experience</span>
        <div style={toggleRowStyle}>
          {EXPERIENCE_OPTIONS.map((e) => (
            <button
              key={e.value}
              className={`filter-btn${filters.minExperience === e.value ? " active" : ""}`}
              onClick={() =>
                update({
                  minExperience:
                    filters.minExperience === e.value ? 0 : e.value,
                })
              }
              type="button"
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 28,
          paddingTop: 20,
          borderTop: "1px solid var(--line)",
        }}
      >
        <button
          className="btn-secondary"
          style={{ flex: 1, padding: "11px 14px", fontSize: "0.88rem" }}
          onClick={clearAll}
          type="button"
          disabled={!hasActiveFilters}
        >
          Clear all
        </button>
        <button
          className="btn-primary"
          style={{ flex: 1, padding: "11px 14px", fontSize: "0.88rem" }}
          onClick={() => onFilterChange({ ...filters })}
          type="button"
        >
          Apply filters
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="btn-ghost"
        onClick={() => setCollapsed(!collapsed)}
        type="button"
        style={{
          display: "none",
          width: "100%",
          justifyContent: "center",
          padding: "12px 16px",
          marginBottom: 16,
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-s)",
          fontWeight: 600,
          fontSize: "0.95rem",
          color: "var(--ink)",
        }}
        aria-label={collapsed ? "Show filters" : "Hide filters"}
      >
        {collapsed ? "Show Filters" : "Hide Filters"}
      </button>

      {/* Desktop always visible, mobile collapsible */}
      <style>{`
        .search-filters-panel {
          display: block;
        }
        @media (max-width: 768px) {
          .search-filters-toggle {
            display: flex !important;
          }
          .search-filters-panel {
            display: ${collapsed ? "none" : "block"};
          }
        }
      `}</style>

      <div className="search-filters-toggle" style={{ display: "none" }}>
        <button
          className="btn-ghost"
          onClick={() => setCollapsed(!collapsed)}
          type="button"
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "12px 16px",
            marginBottom: 16,
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-s)",
            fontWeight: 600,
            fontSize: "0.95rem",
            color: "var(--ink)",
          }}
        >
          {collapsed ? "Show Filters" : "Hide Filters"}
        </button>
      </div>

      <div
        className="search-filters-panel"
        style={{
          background: "var(--white)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-m)",
          padding: 22,
        }}
      >
        <div style={headingStyle}>
          <span>Filters</span>
          {hasActiveFilters && (
            <button
              className="btn-ghost"
              onClick={clearAll}
              type="button"
              style={{ fontSize: "0.8rem", padding: "4px 10px" }}
            >
              Clear all
            </button>
          )}
        </div>
        {content}
      </div>
    </>
  );
}

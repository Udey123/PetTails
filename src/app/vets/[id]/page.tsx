"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Vet, VetService, Review, VetAvailability } from "@/lib/types";
import { formatPrice, formatDate, DAYS_SHORT } from "@/lib/utils";
import { BookingModal } from "@/components/booking/BookingModal";

interface VetProfileData extends Vet {
  vet_services: VetService[];
  reviews: (Review & { profiles?: { name: string } })[];
  availability: VetAvailability[];
}

const AVATAR_COLORS = ["#123832", "#C6842A", "#C9727A", "#4C8B5B", "#1C2A21"];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function renderStars(rating: number) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3;
  const stars: string[] = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push("★");
    else if (i === full && half) stars.push("★");
    else stars.push("☆");
  }
  return stars.join("");
}

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

type IconProps = { s?: number };
const svgProps = (s: number) => ({
  width: s,
  height: s,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

const IcCheck = ({ s = 13 }: IconProps) => (
  <svg {...svgProps(s)} strokeWidth={2.6}>
    <path d="M4.5 8.6l3.3 3.3L19.5 5.4" />
  </svg>
);
const IcPin = ({ s = 15 }: IconProps) => (
  <svg {...svgProps(s)}>
    <path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);
const IcStar = ({ s = 15 }: IconProps) => (
  <svg {...svgProps(s)} fill="currentColor" stroke="none">
    <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z" />
  </svg>
);
const IcCap = ({ s = 15 }: IconProps) => (
  <svg {...svgProps(s)}>
    <path d="M2.5 8.8L12 4.2l9.5 4.6L12 13.4z" />
    <path d="M6.6 11v5c0 1.5 2.4 2.8 5.4 2.8s5.4-1.3 5.4-2.8v-5" />
    <path d="M21.5 8.8v5.4" />
  </svg>
);
const IcArrow = ({ s = 17 }: IconProps) => (
  <svg {...svgProps(s)}>
    <path d="M4.5 12h14M13 6.5l5.5 5.5L13 17.5" />
  </svg>
);
const IcCal = ({ s = 17 }: IconProps) => (
  <svg {...svgProps(s)}>
    <rect x="3.5" y="5.2" width="17" height="15.3" rx="2.4" />
    <path d="M3.5 9.8h17M8.2 3v4.4M15.8 3v4.4" />
  </svg>
);
const IcClock = ({ s = 17 }: IconProps) => (
  <svg {...svgProps(s)}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 7.4V12l3.2 2" />
  </svg>
);
const IcGlobe = ({ s = 17 }: IconProps) => (
  <svg {...svgProps(s)}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M3.4 12h17.2M12 3.4c2.7 2.4 2.7 14.8 0 17.2M12 3.4c-2.7 2.4-2.7 14.8 0 17.2" />
  </svg>
);
const IcPaw = ({ s = 17 }: IconProps) => (
  <svg {...svgProps(s)} fill="currentColor" stroke="none">
    <circle cx="7.2" cy="9.4" r="1.9" />
    <circle cx="11.2" cy="6.9" r="1.9" />
    <circle cx="15.6" cy="7.7" r="1.9" />
    <circle cx="18.7" cy="11" r="1.7" />
    <path d="M12.8 12c2.6 0 4.9 2.2 4.9 4.6 0 1.8-1.5 2.9-3.3 2.5-1.1-.2-2.2-.2-3.3 0-1.8.4-3.3-.7-3.3-2.5 0-2.4 2.4-4.6 5-4.6z" />
  </svg>
);
const IcVideo = ({ s = 17 }: IconProps) => (
  <svg {...svgProps(s)}>
    <rect x="3" y="6.6" width="12.4" height="10.8" rx="2.4" />
    <path d="M15.4 10.6l5-3v8.8l-5-3z" />
  </svg>
);
const IcClinic = ({ s = 17 }: IconProps) => (
  <svg {...svgProps(s)}>
    <rect x="4.6" y="4.2" width="14.8" height="16.6" rx="2" />
    <path d="M12 8.6v5.2M9.4 11.2h5.2" />
  </svg>
);
const IcHome = ({ s = 17 }: IconProps) => (
  <svg {...svgProps(s)}>
    <path d="M4 10.6L12 4.2l8 6.4V20a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 20z" />
    <path d="M9.6 21.4V14h4.8v7.4" />
  </svg>
);
const IcAlert = ({ s = 17 }: IconProps) => (
  <svg {...svgProps(s)}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 7.8v5M12 16.1v.2" />
  </svg>
);
const IcRepeat = ({ s = 17 }: IconProps) => (
  <svg {...svgProps(s)}>
    <path d="M4.2 9.8A8 8 0 0 1 19.6 8.2M19.8 14.2A8 8 0 0 1 4.4 15.8" />
    <path d="M4.2 5.4v4.4h4.4M19.8 18.6v-4.4h-4.4" />
  </svg>
);
const IcTag = ({ s = 17 }: IconProps) => (
  <svg {...svgProps(s)}>
    <path d="M3.6 12.6l8.2-8.2h8.6v8.6l-8.2 8.2z" />
    <circle cx="15.9" cy="8.1" r="1.5" />
  </svg>
);
const IcCount = ({ s = 17 }: IconProps) => (
  <svg {...svgProps(s)}>
    <rect x="5" y="4.4" width="14" height="16.6" rx="2.2" />
    <path d="M9 3.4h6v3H9zM8.8 11.4h6.4M8.8 15.2h4.4" />
  </svg>
);
const IcDoc = ({ s = 16 }: IconProps) => (
  <svg {...svgProps(s)}>
    <path d="M6.2 3.6h7.6l4.2 4.2v12.6H6.2z" />
    <path d="M13.6 3.6v4.4h4.4M9.2 12.4h5.6M9.2 15.8h5.6" />
  </svg>
);
const IcGrid = ({ s = 16 }: IconProps) => (
  <svg {...svgProps(s)}>
    <rect x="4" y="4" width="7" height="7" rx="1.6" />
    <rect x="13" y="4" width="7" height="7" rx="1.6" />
    <rect x="4" y="13" width="7" height="7" rx="1.6" />
    <rect x="13" y="13" width="7" height="7" rx="1.6" />
  </svg>
);
const IcChat = ({ s = 16 }: IconProps) => (
  <svg {...svgProps(s)}>
    <path d="M20 11.8c0 3.5-3.6 6.4-8 6.4-1 0-2-.15-2.9-.42L4.4 19.8l1.5-3.3C4.6 15.3 4 13.6 4 11.8 4 8.3 7.6 5.4 12 5.4s8 2.9 8 6.4z" />
  </svg>
);

const TABS = [
  { id: "vp-about", label: "About", Icon: IcDoc },
  { id: "vp-services", label: "Services", Icon: IcGrid },
  { id: "vp-reviews", label: "Reviews", Icon: IcChat },
];

function serviceTypeIcon(type: string, s = 17) {
  switch (type) {
    case "video_consult":
      return <IcVideo s={s} />;
    case "clinic_consult":
      return <IcClinic s={s} />;
    case "home_visit":
      return <IcHome s={s} />;
    case "emergency":
      return <IcAlert s={s} />;
    case "followup":
      return <IcRepeat s={s} />;
    default:
      return <IcClinic s={s} />;
  }
}

export default function VetProfilePage() {
  const params = useParams();
  const vetId = params.id as string;

  const [vet, setVet] = useState<VetProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [activeTab, setActiveTab] = useState("vp-about");

  useEffect(() => {
    if (!vetId) return;

    const fetchVet = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/vets/${vetId}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setVet(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchVet();
  }, [vetId]);

  useEffect(() => {
    if (!vet) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const line = window.innerHeight * 0.25;
        let current = TABS[0].id;
        for (const { id } of TABS) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= line) current = id;
        }
        setActiveTab((prev) => (prev === current ? prev : current));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [vet]);

  const goToSection = (id: string) => {
    setActiveTab(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToAvailability = () => {
    document.getElementById("vp-availability")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (loading) {
    return (
      <div style={{ padding: "84px 0", textAlign: "center" }}>
        <div className="wrap">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
            <div className="pulse" />
            <p style={{ color: "var(--ink-soft)", fontSize: "1.05rem" }}>Loading profile…</p>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !vet) {
    return (
      <div style={{ padding: "84px 0", textAlign: "center" }}>
        <div className="wrap">
          <div style={{ maxWidth: 420, margin: "0 auto" }}>
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
              ?
            </div>
            <h2 style={{ fontSize: "1.6rem", marginBottom: 10 }}>Vet not found</h2>
            <p style={{ color: "var(--ink-soft)", fontSize: "0.95rem", marginBottom: 24 }}>
              This profile may have been removed or the link may be incorrect.
            </p>
            <Link href="/" className="btn-primary" style={{ textDecoration: "none", display: "inline-block" }}>
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const vetName = vet.profiles?.name || vet.display_name || "Unknown Vet";
  const fullName = `Dr. ${vetName}`;
  const initials = getInitials(vetName);
  const avatarColor = getAvatarColor(vet.id);
  const location = [vet.area, vet.city].filter(Boolean).join(", ");

  const chips = Array.from(
    new Set([...vet.species_treated, ...vet.expertise, ...vet.specializations].filter(Boolean))
  );

  const svcTypes = new Set(vet.vet_services.map((s) => s.service_type));
  const consultParts: string[] = [];
  if (vet.online) consultParts.push("Online");
  if (svcTypes.has("clinic_consult")) consultParts.push("In-clinic");
  if (svcTypes.has("home_visit")) consultParts.push("Home visit");
  const consultType = consultParts.join(" & ");

  const facts: ReactNode[] = [];
  if (vet.years_experience != null)
    facts.push(
      <div key="exp" className="vp-fact">
        <IcCap s={17} /> {vet.years_experience}+ Years Experience
      </div>
    );
  if (location)
    facts.push(
      <div key="loc" className="vp-fact">
        <IcPin s={17} /> {location}
      </div>
    );
  facts.push(
    <div key="avail" className="vp-fact">
      <IcClock s={17} />
      {vet.online ? "Available Now" : vet.accepting_bookings ? "Accepting bookings" : "Not accepting bookings"}
    </div>
  );
  if (vet.species_treated.length > 0)
    facts.push(
      <div key="species" className="vp-fact">
        <IcPaw s={17} /> Consults: {vet.species_treated.join(", ")}
      </div>
    );

  const consultRows: ReactNode[] = [];
  const pushRow = (key: string, icon: ReactNode, label: string, value: string) =>
    consultRows.push(
      <div key={key} className="vp-inforow">
        <span className="vp-inforowicon">{icon}</span>
        <div>
          <div className="vp-inforowlabel">{label}</div>
          <div className="vp-inforowvalue">{value}</div>
        </div>
      </div>
    );
  if (consultType) pushRow("type", <IcVideo s={17} />, "Consultation Type", consultType);
  if (vet.languages.length > 0) pushRow("lang", <IcGlobe s={17} />, "Languages", vet.languages.join(", "));
  if (vet.species_treated.length > 0)
    pushRow("species", <IcPaw s={17} />, "Consults", vet.species_treated.join(", "));
  if (vet.years_experience != null)
    pushRow("exp", <IcCap s={17} />, "Experience", `${vet.years_experience}+ Years`);
  pushRow("fee", <IcTag s={17} />, "Consultation Fee", formatPrice(vet.consultation_price));
  pushRow("count", <IcCount s={17} />, "Consultations", String(vet.total_consultations));

  const availabilityByDay = vet.availability.reduce(
    (acc, slot) => {
      if (!acc[slot.day_of_week]) acc[slot.day_of_week] = [];
      acc[slot.day_of_week].push(slot);
      return acc;
    },
    {} as Record<number, VetAvailability[]>
  );

  return (
    <>
      <div className="vp-page">
        <div className="vp-bg" aria-hidden="true">
          <img className="vp-bg-l" src="/images/hero-pets.jpg" alt="" />
          <img className="vp-bg-r" src="/images/cat-closeup.jpg" alt="" />
        </div>

        <div className="vp-wrap">
          <nav className="vp-crumb" aria-label="Breadcrumb">
            <span>← Back to Search</span>
            <span className="vp-crumb-sep">›</span>
            <span>Find a Vet</span>
            <span className="vp-crumb-sep">›</span>
            <span className="vp-crumb-cur">{fullName}</span>
          </nav>

          <div className="vp-grid">
            {/* HERO */}
            <section className="vp-hero">
              <div className="vp-photo">
                {vet.profiles?.avatar_url ? (
                  <img src={vet.profiles.avatar_url} alt={fullName} />
                ) : (
                  <span className="vp-initials" style={{ background: avatarColor }}>
                    {initials}
                  </span>
                )}
                {vet.online && (
                  <span className="vp-availpill">
                    <i /> Available Now
                  </span>
                )}
              </div>

              <div className="vp-info">
                <div className="vp-nameline">
                  <h1 className="vp-name">{fullName}</h1>
                  {vet.verified && (
                    <span className="vp-verified" title="Verified" aria-label="Verified">
                      <IcCheck s={13} />
                    </span>
                  )}
                </div>

                <p className="vp-spec">{vet.specialization}</p>

                <div className="vp-meta">
                  {vet.professional_title && vet.professional_title !== vet.specialization && (
                    <>
                      <span>{vet.professional_title}</span>
                      <i className="vp-meta-sep">•</i>
                    </>
                  )}
                  {location && (
                    <>
                      <span>
                        <IcPin s={15} /> {location}
                      </span>
                      <i className="vp-meta-sep">•</i>
                    </>
                  )}
                  <span className="vp-meta-rating">
                    <IcStar s={14} /> {vet.rating} ({vet.review_count} {vet.review_count === 1 ? "review" : "reviews"})
                  </span>
                  {vet.years_experience != null && (
                    <>
                      <i className="vp-meta-sep">•</i>
                      <span>
                        <IcCap s={15} /> {vet.years_experience}+ Years Experience
                      </span>
                    </>
                  )}
                </div>

                {chips.length > 0 && (
                  <div className="vp-chips">
                    {chips.map((chip) => (
                      <span className="vp-chip" key={chip}>
                        {chip}
                      </span>
                    ))}
                  </div>
                )}

                {vet.bio && <p className="vp-bio">{vet.bio}</p>}
              </div>
            </section>

            {/* CTA CARD */}
            <aside className="vp-ctacol">
              <div className="vp-card vp-ctacard">
                <button
                  className="vp-btn vp-btn-primary"
                  onClick={() => setShowBooking(true)}
                  disabled={!vet.accepting_bookings}
                >
                  {vet.accepting_bookings ? (
                    <>
                      Start Consultation <IcArrow s={17} />
                    </>
                  ) : (
                    "Not accepting bookings"
                  )}
                </button>
                <button className="vp-btn vp-btn-secondary" onClick={scrollToAvailability}>
                  <IcCal s={17} /> Check Availability
                </button>
                {vet.online && <div className="vp-statusbox"><i /> Available Now</div>}
              </div>
            </aside>

            {/* MAIN: about / services / reviews */}
            <main className="vp-card vp-main">
              <div className="vp-tabs">
                {TABS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    className={`vp-tab${activeTab === id ? " active" : ""}`}
                    aria-current={activeTab === id ? "true" : undefined}
                    onClick={() => goToSection(id)}
                  >
                    <Icon s={16} /> {label}
                  </button>
                ))}
              </div>

              <div className="vp-tabbody">
                <section id="vp-about">
                  <div className="vp-aboutrow">
                    <div className="vp-abouttext">
                      <h2 className="vp-h2">About {fullName}</h2>
                      {vet.bio ? (
                        <p>{vet.bio}</p>
                      ) : (
                        <p className="vp-empty">No bio provided yet.</p>
                      )}

                      {(vet.degree || vet.university || vet.graduation_year) && (
                        <div className="vp-edu">
                          <h4 className="vp-edulabel">Education</h4>
                          {vet.degree && <div className="vp-edumain">{vet.degree}</div>}
                          {vet.university && <div className="vp-edusub">{vet.university}</div>}
                          {vet.graduation_year && <div className="vp-edusub">Class of {vet.graduation_year}</div>}
                        </div>
                      )}

                      {(vet.registration_number || vet.registration_council) && (
                        <div className="vp-edu">
                          <h4 className="vp-edulabel">Registration</h4>
                          {vet.registration_council && <div className="vp-edumain">{vet.registration_council}</div>}
                          {vet.registration_number && <div className="vp-edusub vp-mono">{vet.registration_number}</div>}
                        </div>
                      )}
                    </div>

                    <div className="vp-facts">{facts}</div>
                  </div>
                </section>

                <section id="vp-services">
                  <div className="vp-sechead">
                    <h2 className="vp-h2">Services Offered</h2>
                  </div>
                  {vet.vet_services.length > 0 ? (
                    <div className="vp-svcgrid">
                      {vet.vet_services.map((service) => (
                        <div className="vp-svc" key={service.id}>
                          <span className="vp-svcicon">{serviceTypeIcon(service.service_type)}</span>
                          <div className="vp-svctitle">{service.title || "Consultation"}</div>
                          {service.description && <p className="vp-svcdesc">{service.description}</p>}
                          <div className="vp-svcmeta">
                            {formatPrice(service.price)}
                            {service.duration_minutes > 0 && ` · ${service.duration_minutes} min`}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="vp-empty">No services listed yet.</p>
                  )}
                </section>

                <section id="vp-reviews">
                  <h2 className="vp-h2">
                    Reviews{" "}
                    {vet.reviews.length > 0 && <span className="vp-hcount">({vet.review_count})</span>}
                  </h2>
                  {vet.reviews.length > 0 ? (
                    <div className="vp-reviewlist">
                      {vet.reviews.map((review) => (
                        <div className="vp-review" key={review.id}>
                          <div className="vp-reviewhead">
                            <span className="vp-reviewavatar">{review.profiles?.name?.charAt(0) || "?"}</span>
                            <div className="vp-reviewwho">
                              <div className="vp-reviewname">{review.profiles?.name || "Anonymous"}</div>
                              <div className="vp-reviewdate">{formatDate(review.created_at)}</div>
                            </div>
                            <span className="vp-reviewstars">
                              {renderStars(review.rating)} {review.rating}.0
                            </span>
                          </div>
                          <p className="vp-reviewtext">{review.review_text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="vp-empty">No reviews yet.</p>
                  )}
                </section>
              </div>
            </main>

            {/* SIDEBAR */}
            <aside className="vp-side">
              <div className="vp-card vp-pad">
                <h3 className="vp-cardtitle">Clinic Location</h3>
                {vet.clinic_name || location ? (
                  <>
                    {vet.clinic_name && (
                      <div className="vp-locrow vp-locmain">
                        <IcClinic s={16} /> {vet.clinic_name}
                      </div>
                    )}
                    {location && (
                      <div className="vp-locrow">
                        <IcPin s={16} /> {location}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="vp-empty">No clinic location listed.</p>
                )}
              </div>

              <div className="vp-card vp-pad">
                <h3 className="vp-cardtitle">Consultation Information</h3>
                {consultRows}
              </div>

              <div className="vp-card vp-pad" id="vp-availability">
                <h3 className="vp-cardtitle">Weekly availability</h3>
                {vet.availability.length === 0 ? (
                  <p className="vp-empty">Availability has not been set for this vet.</p>
                ) : (
                  <div className="vp-availrows">
                    {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                      const slots = availabilityByDay[dayIdx];
                      const isAvailable = slots && slots.length > 0;
                      return (
                        <div className="vp-availrow" key={dayIdx}>
                          <span className="vp-availday">{DAYS_SHORT[dayIdx]}</span>
                          {isAvailable ? (
                            <span className="vp-availtimes">
                              {slots
                                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                                .map((s) => `${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`)
                                .join(", ")}
                            </span>
                          ) : (
                            <span className="vp-availoff">—</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>

      {showBooking && vet && <BookingModal vet={vet} onClose={() => setShowBooking(false)} />}

      <style>{`
        .vp-page { position: relative; min-height: 100vh; padding-bottom: 76px; }
        .vp-bg { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
        .vp-bg img { position: absolute; top: 0; height: 100%; object-fit: cover; }
        .vp-bg-l {
          left: 0;
          width: clamp(280px, 30vw, 470px);
          object-position: 58% 30%;
          filter: brightness(2.0) saturate(0.74) contrast(0.66) sepia(0.16);
          opacity: 0.42;
          -webkit-mask-image:
            linear-gradient(to right, #000 42%, transparent 98%),
            linear-gradient(to bottom, #000 45%, transparent 88%);
          mask-image:
            linear-gradient(to right, #000 42%, transparent 98%),
            linear-gradient(to bottom, #000 45%, transparent 88%);
          -webkit-mask-composite: source-in;
          mask-composite: intersect;
        }
        .vp-bg-r {
          right: -6px;
          width: clamp(170px, 21vw, 340px);
          object-position: 45% 30%;
          filter: brightness(1.5) saturate(0.75) contrast(0.85) blur(4px);
          opacity: 0.28;
          -webkit-mask-image:
            linear-gradient(to left, #000 40%, transparent 98%),
            linear-gradient(to bottom, #000 45%, transparent 88%);
          mask-image:
            linear-gradient(to left, #000 40%, transparent 98%),
            linear-gradient(to bottom, #000 45%, transparent 88%);
          -webkit-mask-composite: source-in;
          mask-composite: intersect;
        }
        footer { position: relative; z-index: 1; }

        .vp-wrap {
          position: relative;
          z-index: 1;
          width: min(1380px, calc(100% - 40px));
          margin: 0 auto;
          padding-top: 24px;
        }

        .vp-crumb {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          font-size: 0.94rem;
          color: var(--ink-soft);
          margin-bottom: 21px;
        }
        .vp-crumb-sep { color: #ADA894; }
        .vp-crumb-cur { color: var(--ink); font-weight: 600; }

        .vp-grid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 6px 16px;
          align-items: start;
        }

        .vp-hero {
          display: grid;
          grid-template-columns: 372px 1fr;
          gap: 31px;
          animation: vpRise 0.5s cubic-bezier(0.2, 0.7, 0.3, 1) both;
        }
        .vp-photo {
          position: relative;
          width: 372px;
          height: 286px;
          border-radius: 20px;
          overflow: hidden;
          background: var(--paper-2);
        }
        .vp-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .vp-initials {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-fraunces), serif;
          font-size: 4.6rem;
          font-weight: 600;
          color: var(--white);
        }
        .vp-availpill {
          position: absolute;
          right: 14px;
          bottom: 14px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(255, 253, 248, 0.96);
          border-radius: 100px;
          padding: 7px 13px;
          font-size: 0.79rem;
          font-weight: 600;
          color: var(--ink);
          box-shadow: 0 2px 10px rgba(28, 42, 33, 0.14);
        }
        .vp-availpill i { width: 7px; height: 7px; border-radius: 50%; background: #2F9E5F; }

        .vp-info { padding-top: 20px; min-width: 0; }
        .vp-nameline { display: flex; align-items: flex-start; gap: 12px; }
        .vp-name {
          font-family: var(--font-fraunces), serif;
          font-size: 2.5rem;
          font-weight: 600;
          line-height: 1.15;
          letter-spacing: -0.01em;
          margin: 0;
        }
        .vp-verified {
          flex-shrink: 0;
          width: 23px;
          height: 23px;
          margin-top: 7px;
          border-radius: 50%;
          background: #3E8B57;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .vp-spec { margin: 4px 0 0; font-size: 1.3rem; font-weight: 500; color: var(--ink-soft); }
        .vp-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px 13px;
          margin-top: 10px;
          font-size: 0.94rem;
          color: var(--ink-soft);
        }
        .vp-meta > span { display: inline-flex; align-items: center; gap: 6px; }
        .vp-meta-rating { color: var(--amber-dark); font-weight: 600; }
        .vp-meta-sep { color: #B5B09B; font-style: normal; }
        .vp-chips { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 21px; }
        .vp-chip {
          border: 1px solid var(--line);
          background: var(--white);
          border-radius: 100px;
          padding: 3px 14px;
          font-size: 0.84rem;
          font-weight: 500;
          color: var(--ink);
        }
        .vp-bio {
          margin: 19px 0 0;
          font-size: 0.94rem;
          line-height: 1.55;
          color: var(--ink-soft);
          max-width: 545px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .vp-card { background: #FBFAF5; border-radius: 16px; }
        .vp-ctacol { margin-top: 12px; animation: vpRise 0.5s cubic-bezier(0.2, 0.7, 0.3, 1) 0.06s both; }
        .vp-ctacard { padding: 20px 20px 24px; display: flex; flex-direction: column; gap: 14px; }
        .vp-btn {
          border: none;
          border-radius: 10px;
          height: 54px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          font-family: inherit;
          font-size: 0.97rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
        }
        .vp-btn-primary { background: var(--deep); color: var(--white); }
        .vp-btn-primary:hover:not(:disabled) {
          background: var(--deep-2);
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(18, 56, 50, 0.25);
        }
        .vp-btn-primary:disabled { background: #9DA9A2; cursor: not-allowed; }
        .vp-btn-secondary { background: #EFEBE4; color: var(--ink); }
        .vp-btn-secondary:hover { background: #E7E2D7; transform: translateY(-1px); }
        .vp-statusbox {
          background: #EDF7F3;
          border-radius: 10px;
          padding: 15px 16px;
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #1E5B41;
        }
        .vp-statusbox i { width: 8px; height: 8px; border-radius: 50%; background: #2F9E5F; }

        .vp-main { overflow: hidden; animation: vpRise 0.5s cubic-bezier(0.2, 0.7, 0.3, 1) 0.12s both; }
        .vp-tabs {
          display: flex;
          height: 56px;
          border-bottom: 1px solid rgba(211, 206, 185, 0.55);
        }
        .vp-tab {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 56px;
          min-width: 134px;
          padding: 0 24px;
          background: none;
          border: none;
          font-family: inherit;
          font-size: 0.94rem;
          font-weight: 600;
          color: #5A6B60;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        .vp-tab:hover { color: var(--deep); }
        .vp-tab.active { color: var(--deep); }
        .vp-tab::after {
          content: "";
          position: absolute;
          left: 8px;
          right: 8px;
          bottom: -1px;
          height: 3px;
          background: var(--deep);
          border-radius: 3px 3px 0 0;
          opacity: 0;
          transform: scaleX(0.55);
          transition: opacity 0.22s ease, transform 0.22s ease;
        }
        .vp-tab.active::after { opacity: 1; transform: scaleX(1); }

        .vp-tabbody { padding: 24px; }
        .vp-tabbody > section { scroll-margin-top: 96px; }
        .vp-tabbody > section + section { margin-top: 34px; }
        .vp-h2 {
          font-family: var(--font-fraunces), serif;
          font-size: 1.38rem;
          font-weight: 600;
          margin: 0;
          color: var(--ink);
        }
        .vp-hcount { font-family: inherit; font-size: 0.88rem; font-weight: 400; color: var(--ink-soft); }

        .vp-aboutrow {
          display: grid;
          grid-template-columns: 1fr 276px;
          gap: 40px;
          align-items: start;
          margin-top: 0;
        }
        .vp-abouttext .vp-h2 { margin-bottom: 10px; }
        .vp-abouttext p { margin: 0; font-size: 0.97rem; line-height: 1.7; color: var(--ink); }
        .vp-edu { margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--line); }
        .vp-edu + .vp-edu { margin-top: 14px; }
        .vp-edulabel {
          margin: 0 0 7px;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .vp-edumain { font-size: 0.92rem; font-weight: 600; }
        .vp-edusub { font-size: 0.87rem; color: var(--ink-soft); }
        .vp-mono { font-family: monospace; }

        .vp-facts {
          background: #F4F2EB;
          border-radius: 12px;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .vp-fact { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; color: var(--ink); }
        .vp-fact svg { color: #4E6157; flex-shrink: 0; }

        .vp-sechead { display: flex; align-items: baseline; justify-content: space-between; }
        .vp-svcgrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          gap: 15px;
          margin-top: 16px;
        }
        .vp-svc {
          border: 1px solid rgba(211, 206, 185, 0.7);
          background: #FDFCF7;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
        }
        .vp-svcicon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #E7F0E7;
          color: #2E7D4F;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .vp-svctitle { margin-top: 18px; font-size: 0.92rem; font-weight: 700; color: var(--ink); }
        .vp-svcdesc { margin: 6px 0 0; font-size: 0.79rem; line-height: 1.5; color: #6E7B71; }
        .vp-svcmeta {
          margin-top: auto;
          padding-top: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--ink-soft);
        }

        .vp-reviewlist { display: flex; flex-direction: column; gap: 14px; margin-top: 16px; }
        .vp-review {
          border: 1px solid rgba(211, 206, 185, 0.7);
          background: #FDFCF7;
          border-radius: 12px;
          padding: 18px 20px;
        }
        .vp-reviewhead { display: flex; align-items: center; gap: 11px; }
        .vp-reviewavatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--paper-2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-fraunces), serif;
          font-weight: 600;
          font-size: 0.88rem;
          color: var(--deep);
          flex-shrink: 0;
        }
        .vp-reviewwho { flex: 1; min-width: 0; }
        .vp-reviewname { font-size: 0.93rem; font-weight: 600; }
        .vp-reviewdate { font-size: 0.78rem; color: var(--ink-soft); }
        .vp-reviewstars { color: var(--amber-dark); font-weight: 600; font-size: 0.88rem; white-space: nowrap; }
        .vp-reviewtext { margin: 11px 0 0; font-size: 0.93rem; line-height: 1.65; color: var(--ink); }

        .vp-empty { font-size: 0.9rem; color: var(--ink-soft); margin: 10px 0 0; }

        .vp-side {
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: sticky;
          top: 88px;
          animation: vpRise 0.5s cubic-bezier(0.2, 0.7, 0.3, 1) 0.18s both;
        }
        .vp-pad { padding: 20px; }
        .vp-cardtitle { margin: 0 0 13px; font-size: 0.97rem; font-weight: 700; color: var(--ink); }
        .vp-locrow {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.9rem;
          color: var(--ink-soft);
          margin-top: 9px;
        }
        .vp-locrow:first-of-type { margin-top: 0; }
        .vp-locrow svg { flex-shrink: 0; margin-top: 1px; color: #4E6157; }
        .vp-locmain { font-weight: 600; color: var(--ink); }

        .vp-inforow { display: flex; gap: 12px; align-items: flex-start; padding: 9px 0; }
        .vp-inforow:first-of-type { padding-top: 0; }
        .vp-inforow:last-of-type { padding-bottom: 0; }
        .vp-inforowicon {
          width: 24px;
          display: flex;
          justify-content: center;
          color: #4E6157;
          margin-top: 2px;
          flex-shrink: 0;
        }
        .vp-inforowlabel { font-size: 0.84rem; font-weight: 700; color: var(--ink); }
        .vp-inforowvalue { font-size: 0.86rem; color: var(--ink-soft); margin-top: 2px; }

        .vp-availrows { display: flex; flex-direction: column; }
        .vp-availrow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          font-size: 0.87rem;
          border-bottom: 1px solid rgba(211, 206, 185, 0.55);
        }
        .vp-availrow:last-child { border-bottom: none; padding-bottom: 0; }
        .vp-availday { font-weight: 500; }
        .vp-availtimes { color: #2F7D4F; font-weight: 500; font-size: 0.82rem; text-align: right; }
        .vp-availoff { color: var(--ink-soft); }

        @keyframes vpRise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: none; }
        }

        @media (max-width: 1150px) {
          .vp-grid { grid-template-columns: 1fr 320px; }
          .vp-hero { grid-template-columns: 330px 1fr; gap: 24px; }
          .vp-photo { width: 330px; height: 262px; }
          .vp-aboutrow { grid-template-columns: 1fr 250px; gap: 26px; }
        }

        @media (max-width: 900px) {
          .vp-grid { grid-template-columns: 1fr; }
          .vp-hero { grid-template-columns: 1fr; gap: 18px; }
          .vp-photo { width: 100%; max-width: 420px; height: auto; aspect-ratio: 372 / 286; }
          .vp-info { padding-top: 0; }
          .vp-ctacol { margin-top: 4px; }
          .vp-side { position: static; }
          .vp-aboutrow { grid-template-columns: 1fr; gap: 20px; }
          .vp-bio { max-width: none; }
        }

        @media (max-width: 640px) {
          .vp-wrap { width: calc(100% - 32px); }
          .vp-bg { display: none; }
          .vp-name { font-size: clamp(1.7rem, 7.5vw, 2.2rem); }
          .vp-spec { font-size: 1.1rem; }
          .vp-tab { padding: 0 14px; min-width: 0; font-size: 0.88rem; gap: 6px; }
          .vp-tabbody { padding: 18px 16px; }
          .vp-ctacard { padding: 16px 16px 20px; }
          .vp-svcgrid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
        }

        @media (max-width: 480px) {
          .vp-svcgrid { grid-template-columns: 1fr; }
          .vp-crumb { font-size: 0.86rem; gap: 7px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .vp-hero, .vp-ctacol, .vp-main, .vp-side { animation: none; }
          .vp-btn { transition: none; }
          .vp-tab::after { transition: none; }
        }
      `}</style>
    </>
  );
}

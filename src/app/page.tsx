"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { VetGrid } from "@/components/vets/VetGrid";
import { BookingModal } from "@/components/booking/BookingModal";
import type { Vet } from "@/lib/types";

export default function HomePage() {
  const [vets, setVets] = useState<Vet[]>([]);
  const [selectedVet, setSelectedVet] = useState<Vet | null>(null);
  const [triageVisible, setTriageVisible] = useState(false);
  const [vetCount, setVetCount] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [bookingCount, setBookingCount] = useState<number | null>(null);
  const [avgRating, setAvgRating] = useState<string | null>(null);
  const [realReviews, setRealReviews] = useState<{ text: string; name: string; rating: number; created_at: string }[]>([]);
  const [authRole, setAuthRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchVets = async () => {
      const supabase = createClient();
      const { data: vetData } = await supabase
        .from("vets")
        .select("*")
        .eq("verified", true)
        .eq("accepting_bookings", true);
      if (!vetData) return;

      const userIds = vetData.map((v: { user_id: string }) => v.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);
      const profilesMap = new Map((profiles || []).map((p: { id: string }) => [p.id, p]));

      setVets(vetData.map((v: Record<string, unknown>) => ({
        ...v,
        profiles: profilesMap.get(v.user_id as string) || null,
      })) as Vet[]);
    };
    fetchVets();

    const fetchStats = async () => {
      const supabase = createClient();
      const [vetRes, reviewRes, bookingRes] = await Promise.all([
        supabase.from("vets").select("id", { count: "exact", head: true }).eq("verified", true),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed"),
      ]);
      setVetCount(vetRes.count ?? 0);
      setReviewCount(reviewRes.count ?? 0);
      setBookingCount(bookingRes.count ?? 0);

      const { data: ratingData } = await supabase.from("vets").select("rating").eq("verified", true).gt("rating", 0);
      if (ratingData && ratingData.length > 0) {
        const avg = ratingData.reduce((sum: number, v: { rating: number | null }) => sum + (v.rating || 0), 0) / ratingData.length;
        setAvgRating(avg.toFixed(1) + "/5");
      } else {
        setAvgRating(null);
      }

      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("review_text, rating, created_at, owner_id")
        .order("created_at", { ascending: false })
        .limit(3);
      if (reviewsData && reviewsData.length > 0) {
        const ownerIds = reviewsData.map((r: { owner_id: string }) => r.owner_id);
        const { data: ownerProfiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", ownerIds);
        const ownerMap = new Map<string, { id: string; name?: string }>((ownerProfiles || []).map((p: { id: string; name?: string }) => [p.id, p]));
        setRealReviews(reviewsData.map((r: { review_text: string; rating: number; created_at: string; owner_id: string }) => ({
          text: r.review_text,
          name: ownerMap.get(r.owner_id)?.name || "Anonymous",
          rating: r.rating,
          created_at: r.created_at,
        })));
      }
    };
    fetchStats();

    const fetchAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        setAuthRole(data?.role || "owner");
      }
    };
    fetchAuth();
  }, []);

  const featured = vets.length > 0 ? vets[0] : null;
  const startHref = authRole === "vet" ? "/dashboard/vet" : authRole === "owner" ? "/dashboard/owner" : "/auth/signup";

  return (
    <div className="hp-page">
      {/* HERO */}
      <section className="hp-hero">
        <div className="hp-hero-in hp-wrap">
          <div className="hp-hero-copy">
            <p className="hp-eyebrow hp-anim-1">HAPPIER PETS. HEALTHIER TOMORROWS.</p>
            <h1 className="hp-h1 hp-anim-2">
              Complete care
              <br />
              for every paw
              <svg className="hp-h1-heart" width="44" height="40" viewBox="0 0 46 42" fill="none" aria-hidden="true">
                <path
                  d="M23 37.5C10.5 29 3.5 21.5 3.5 13.8 3.5 7.3 8.5 3 14 3c4 0 7.3 2.4 9 5.6C24.7 5.4 28 3 32 3c5.5 0 10.5 4.3 10.5 10.8C42.5 21.5 35.5 29 23 37.5Z"
                  stroke="#C6842A"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </h1>
            <p className="hp-sub hp-anim-3">
              AI-powered guidance, trusted veterinarians, and personalized care — all in one place for your pet&apos;s happier, healthier life.
            </p>
            <div className="hp-ctas hp-anim-4">
              <Link href={startHref} className="hp-btn hp-btn-dark">
                Get Started
                <IconArrow />
              </Link>
              <Link href="/vets" className="hp-btn hp-btn-outline">
                <IconSearch />
                Find a Vet
              </Link>
            </div>
            <div className="hp-trust hp-anim-5">
              <span className="hp-avatars" aria-hidden="true">
                <span className="hp-av">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/golden-dog.jpg" alt="" />
                </span>
                <span className="hp-av">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/cat-closeup.jpg" alt="" />
                </span>
                <span className="hp-av">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/hero-pets.jpg" alt="" />
                </span>
                <span className="hp-av hp-av-paw">
                  <IconPaw />
                </span>
              </span>
              <p>
                Trusted by pet parents
                <br />
                and licensed vets
              </p>
            </div>
          </div>
        </div>

        <div className="hp-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hp-photo-img" src="/images/golden-dog.jpg" alt="" />
          <span className="hp-photo-fade" aria-hidden="true" />

          <span className="hp-hand hp-hand-l" aria-hidden="true">
            Better
            <br />
            Care
            <svg width="30" height="42" viewBox="0 0 30 42" fill="none">
              <path d="M20 2C16 14 12 24 8 34" stroke="#FFFDF6" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M4 27l4 9 9-3" stroke="#FFFDF6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="hp-hand hp-hand-r" aria-hidden="true">
            Happier
            <br />
            Lives
            <svg className="hp-hand-heart" width="34" height="30" viewBox="0 0 46 42" fill="none">
              <path
                d="M23 37.5C10.5 29 3.5 21.5 3.5 13.8 3.5 7.3 8.5 3 14 3c4 0 7.3 2.4 9 5.6C24.7 5.4 28 3 32 3c5.5 0 10.5 4.3 10.5 10.8C42.5 21.5 35.5 29 23 37.5Z"
                stroke="#E4A13B"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <svg className="hp-hand-arrow" width="34" height="44" viewBox="0 0 34 44" fill="none">
              <path d="M30 2C24 16 16 26 6 34" stroke="#FFFDF6" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M3 25l2 10 10-1" stroke="#FFFDF6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>

          <Link href="/ai-care" className="hp-float hp-float-ai hp-anim-6">
            <span className="hp-float-ic">
              <IconSpark />
            </span>
            <span>
              <b>AI Care Assistant</b>
              <span>Get instant guidance for your pet</span>
            </span>
          </Link>

          <Link href="/vets" className="hp-float hp-float-vet hp-anim-7">
            <span className="hp-float-ic">
              <IconVetBadge />
            </span>
            <span>
              <b>Trusted Veterinarians</b>
            </span>
            <svg className="hp-float-heart" width="15" height="14" viewBox="0 0 46 42" fill="none" aria-hidden="true">
              <path
                d="M23 37.5C10.5 29 3.5 21.5 3.5 13.8 3.5 7.3 8.5 3 14 3c4 0 7.3 2.4 9 5.6C24.7 5.4 28 3 32 3c5.5 0 10.5 4.3 10.5 10.8C42.5 21.5 35.5 29 23 37.5Z"
                stroke="#E4A13B"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* FEATURE STRIP */}
      <div className="hp-strip-wrap hp-anim-8">
        <div className="hp-wrap">
          <div className="hp-strip">
            <div className="hp-strip-item">
              <span className="hp-strip-ic">
                <IconChat />
              </span>
              <div>
                <b>AI Care Assistant</b>
                <p>Instant, reliable guidance 24/7</p>
              </div>
            </div>
            <div className="hp-strip-item">
              <span className="hp-strip-ic">
                <IconStetho />
              </span>
              <div>
                <b>Trusted Veterinarians</b>
                <p>Connect with verified vets near you</p>
              </div>
            </div>
            <div className="hp-strip-item">
              <span className="hp-strip-ic">
                <IconHeart />
              </span>
              <div>
                <b>Personalized Care</b>
                <p>Tailored recommendations for your pet</p>
              </div>
            </div>
            <div className="hp-strip-item">
              <span className="hp-strip-ic">
                <IconPaw />
              </span>
              <div>
                <b>Happier, Healthier Pets</b>
                <p>Proactive care for a longer, better life</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section id="how" className="hp-how">
        <div className="hp-wrap">
          <div className="hp-how-head">
            <p className="hp-eyebrow">HOW PETTAILS WORKS</p>
            <h2 className="hp-how-h2">Care for your pet, made simple</h2>
            <Link href="/#hail" className="hp-learn">
              Learn more
              <IconArrow />
            </Link>
          </div>

          <div className="hp-steps">
            <span className="hp-conn hp-conn1" aria-hidden="true">
              <svg viewBox="0 0 100 30" preserveAspectRatio="none" fill="none">
                <path d="M0 8Q50 30 100 8" stroke="#D89A3A" strokeWidth="1.6" strokeDasharray="6 7" vectorEffect="non-scaling-stroke" />
              </svg>
              <span className="hp-paw">
                <IconPaw />
              </span>
            </span>
            <span className="hp-conn hp-conn2" aria-hidden="true">
              <svg viewBox="0 0 100 30" preserveAspectRatio="none" fill="none">
                <path d="M0 8Q50 30 100 8" stroke="#D89A3A" strokeWidth="1.6" strokeDasharray="6 7" vectorEffect="non-scaling-stroke" />
              </svg>
              <span className="hp-paw">
                <IconPaw />
              </span>
            </span>
            <span className="hp-conn hp-conn3" aria-hidden="true">
              <svg viewBox="0 0 100 30" preserveAspectRatio="none" fill="none">
                <path d="M0 8Q50 30 100 8" stroke="#D89A3A" strokeWidth="1.6" strokeDasharray="6 7" vectorEffect="non-scaling-stroke" />
              </svg>
              <span className="hp-paw">
                <IconPaw />
              </span>
            </span>

            <div className="hp-step">
              <span className="hp-badge">1</span>
              <div className="hp-illo">
                <div className="hp-i1">
                  <div className="hp-phone">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/cat-closeup.jpg" alt="" />
                  </div>
                  <div className="hp-bubs">
                    <span className="hp-bub hp-bub1"><i /><i /></span>
                    <span className="hp-bub hp-bub2"><i /><i /></span>
                    <span className="hp-bub hp-bub3"><i /><i /></span>
                  </div>
                </div>
              </div>
              <h3>Get AI Guidance</h3>
              <p>Describe your pet&apos;s issue, get instant advice and next steps.</p>
            </div>

            <div className="hp-step">
              <span className="hp-badge">2</span>
              <div className="hp-illo">
                <div className="hp-i2">
                  <div className="hp-procard">
                    <div className="hp-protop">
                      <span className="hp-proav">
                        <VetBust />
                      </span>
                      <div className="hp-probars">
                        <i />
                        <i />
                      </div>
                    </div>
                    <div className="hp-prostars">
                      <IconStar /><IconStar /><IconStar /><IconStar /><IconStar />
                    </div>
                    <div className="hp-promap">
                      <IconPinSmall />
                      <i />
                    </div>
                  </div>
                </div>
              </div>
              <h3>Find the Right Vet</h3>
              <p>Search and connect with trusted veterinarians near you.</p>
            </div>

            <div className="hp-step">
              <span className="hp-badge">3</span>
              <div className="hp-illo">
                <div className="hp-i3">
                  <div className="hp-video">
                    <VetBust waving />
                  </div>
                  <div className="hp-vidctl">
                    <span className="hp-vc hp-vc-mic" aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                        <rect x="9" y="2" width="6" height="12" rx="3" />
                        <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
                      </svg>
                    </span>
                    <span className="hp-vc hp-vc-cam" aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                        <rect x="2" y="6" width="13" height="12" rx="3" />
                        <path d="M15 11l7-4v10l-7-4" />
                      </svg>
                    </span>
                    <span className="hp-vc hp-vc-end" aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 8c-3 0-5 .8-7 2.4l2.4 2.8c.6-.4 1.2-.7 1.9-.9l.6 1.7c1.4-.2 2.7-.8 3.9-1.7 1.2.9 2.5 1.5 3.9 1.7l.6-1.7c.7.2 1.3.5 1.9.9L22 10.4C20 8.8 15 8 12 8z" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
              <h3>Consult with Ease</h3>
              <p>Start a video or in-person consultation at your convenience.</p>
            </div>

            <div className="hp-step">
              <span className="hp-badge">4</span>
              <div className="hp-illo">
                <div className="hp-i4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/golden-dog.jpg" alt="" />
                  <span className="hp-chip-heart">
                    <IconHeart />
                  </span>
                  <span className="hp-chip-chart">
                    <IconChart />
                  </span>
                </div>
              </div>
              <h3>Keep Them Healthy</h3>
              <p>Follow personalized care plans for a happier, healthier life.</p>
            </div>
          </div>
        </div>
      </section>

      {/* REAL STATS */}
      <div className="hp-stats">
        <div className="hp-wrap hp-stats-in">
          {(vetCount ?? 0) > 0 && (
            <div className="hp-stat">
              <b>{vetCount}</b>
              <span>licensed vets on the network</span>
            </div>
          )}
          {(reviewCount ?? 0) > 0 && (
            <div className="hp-stat">
              <b>{reviewCount}</b>
              <span>pet-owner reviews</span>
            </div>
          )}
          {(bookingCount ?? 0) > 0 && (
            <div className="hp-stat">
              <b>{bookingCount}</b>
              <span>consultations completed</span>
            </div>
          )}
          {avgRating && (
            <div className="hp-stat">
              <b>{avgRating}</b>
              <span>average pet-owner rating</span>
            </div>
          )}
        </div>
      </div>

      {/* AI CARE */}
      <section id="ai" className="hp-ai">
        <span className="hp-ai-glow" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/cat-closeup.jpg" alt="" />
        </span>
        <div className="hp-wrap hp-ai-in">
          <div className="hp-ai-copy">
            <p className="hp-eyebrow">AI CARE</p>
            <h2>PetTails AI Care Assistant</h2>
            <p className="hp-lede">
              Listen, understand, observe, and guide — then hand you off to a real vet when it matters.
            </p>
            <div className="hp-chips">
              <span className="hp-chip"><IconChat /> Text chat</span>
              <span className="hp-chip"><IconMic /> Voice replies</span>
              <span className="hp-chip"><IconImage /> Photo uploads</span>
              <span className="hp-chip"><IconGlobe /> 10 languages</span>
              <span className="hp-chip"><IconStetho /> Vet handoff</span>
            </div>
            <p className="hp-disc">
              <IconInfo />
              <span>PetTails AI provides guidance, not diagnosis. In an emergency, contact your nearest veterinary clinic immediately.</span>
            </p>
            <Link href="/ai-care" className="hp-btn hp-btn-dark hp-cta-mt">
              Open AI Care Assistant
              <IconArrow />
            </Link>
          </div>

          <Link href="/ai-care" className="hp-aiprev" aria-label="Open the PetTails AI Care Assistant">
            <span className="hp-aipills">
              <span className="hp-aipill"><IconPaw /> No pet selected</span>
              <span className="hp-aipill"><IconGlobe /> English</span>
              <span className="hp-aipill"><IconMicOff /> Voice off</span>
            </span>
            <span className="hp-aizone">
              <span className="hp-aispark">
                <IconSpark />
              </span>
              <b>Start a conversation</b>
              <span>Symptoms, food, behaviour — ask anything about your pet.</span>
            </span>
            <span className="hp-aiinput">
              <span className="hp-aiplus" aria-hidden="true">+</span>
              <span className="hp-aifake">Describe what&apos;s happening, or tap the mic…</span>
              <span className="hp-aiorb" aria-hidden="true">
                <IconMic />
              </span>
              <span className="hp-aisend">Send</span>
            </span>
          </Link>
        </div>
      </section>

      {/* FIND A VET */}
      <section className="hp-find">
        <div className="hp-wrap">
          <div className="hp-find-top">
            <div className="hp-find-copy">
              <p className="hp-eyebrow">FIND A VET</p>
              <h2>The right vet, near you</h2>
              <p className="hp-lede">
                Every vet is licensed and background-checked before joining the network. Availability updates live.
              </p>

              <div id="hail" className="hp-hail">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }} className="hail-row">
                  <div className="field">
                    <label htmlFor="pet-type">Pet</label>
                    <select id="pet-type">
                      <option>Dog</option>
                      <option>Cat</option>
                      <option>Bird</option>
                      <option>Rabbit</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="visit-type">Visit type</label>
                    <select
                      id="visit-type"
                      onChange={(e) => {
                        setTriageVisible(e.target.value === "emergency");
                      }}
                    >
                      <option value="video_consult">Video consult</option>
                      <option value="home_visit">Home visit</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                </div>

                <div className="field" style={{ marginBottom: 14 }}>
                  <label htmlFor="concern">What&apos;s going on?</label>
                  <input id="concern" type="text" placeholder="e.g. not eating since yesterday" />
                </div>

                {triageVisible && (
                  <div style={{ background: "#F7ECEA", border: "1px solid var(--rose)", borderRadius: "var(--radius-s)", padding: "14px 16px", marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 10 }}>Quick triage — helps us prioritize</div>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem", marginBottom: 8 }}>
                      <input type="checkbox" /> Unconscious or not breathing
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem", marginBottom: 8 }}>
                      <input type="checkbox" /> Heavy bleeding
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem", marginBottom: 8 }}>
                      <input type="checkbox" /> Seizure or collapse
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem", marginBottom: 8 }}>
                      <input type="checkbox" /> Swallowed something toxic
                    </label>
                    <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", marginTop: 6 }}>
                      For life-threatening emergencies, please call your nearest 24-hr clinic or emergency helpline directly.
                    </div>
                  </div>
                )}

                <button
                  className="btn-amber"
                  style={{ width: "100%", marginTop: 6 }}
                  onClick={() => document.getElementById("vets")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Hail a vet now
                </button>
                <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginTop: 12 }}>
                  {vets.length} vet{vets.length !== 1 ? "s are" : " is"} online near you right now.
                </div>
              </div>
            </div>

            <div className="hp-feat">
              {featured ? (
                <>
                  <div className="hp-feat-head">
                    <span className="hp-feat-av">
                      {(featured.profiles?.name || featured.display_name || "V").charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <div className="hp-feat-name">{featured.profiles?.name || featured.display_name || "Verified vet"}</div>
                      <div className="hp-feat-spec">{featured.specialization || "General Practice"}</div>
                    </div>
                  </div>
                  <div className="hp-feat-badges">
                    <span className="hp-fbadge hp-fbadge-ok">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      Verified
                    </span>
                    {featured.accepting_bookings && (
                      <span className="hp-fbadge hp-fbadge-live">
                        <span className="hp-fdot" aria-hidden="true" />
                        Accepting bookings
                      </span>
                    )}
                  </div>
                  <div className="hp-feat-meta">
                    {featured.rating > 0 && (
                      <span>
                        <span className="hp-star">★</span> {featured.rating.toFixed(1)}
                        {featured.review_count > 0 ? ` (${featured.review_count} review${featured.review_count !== 1 ? "s" : ""})` : ""}
                      </span>
                    )}
                    {featured.consultation_price > 0 && <span>₹{featured.consultation_price} consultation</span>}
                    {featured.city && (
                      <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>{" "}
                        {featured.city}
                        {featured.area ? `, ${featured.area}` : ""}
                      </span>
                    )}
                  </div>
                  <div className="hp-feat-cta">
                    <button className="btn-primary" onClick={() => setSelectedVet(featured)}>
                      Book consultation
                    </button>
                    <Link href={`/vets/${featured.id}`} className="hp-feat-link">
                      View profile
                      <IconArrow />
                    </Link>
                  </div>
                </>
              ) : (
                <div className="hp-feat-fallback">No vets currently available. Check back soon.</div>
              )}
            </div>
          </div>

          <div id="vets" className="hp-find-grid">
            <VetGrid vets={vets} onBookVet={setSelectedVet} />
            <div className="hp-find-browse">
              <Link href="/vets" className="btn-secondary" style={{ textDecoration: "none", display: "inline-block" }}>
                Browse all vets
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SAFETY */}
      <section style={{ padding: "84px 0" }}>
        <div className="wrap">
          <div className="section-head">
            <h2>Every vet is checked before they go online</h2>
            <p>We verify credentials up front so you&apos;re not the one doing background checks mid-emergency.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }} className="safety-grid">
            {[
              { title: "License verified", desc: "Registration number and degree checked against the veterinary council before onboarding." },
              { title: "Background checked", desc: "Identity and criminal record check completed for every vet and home-visit provider." },
              { title: "Insured visits", desc: "Every consult and home visit are covered under our provider liability policy." },
              { title: "Rated after every visit", desc: "Owners rate each consult; vets falling below our bar are reviewed and paused." },
            ].map((item) => (
              <div key={item.title} className="card" style={{ padding: 22 }}>
                <h3 style={{ fontSize: "1.05rem", marginBottom: 8 }}>{item.title}</h3>
                <p style={{ color: "var(--ink-soft)", fontSize: "0.92rem" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: "84px 0" }}>
        <div className="wrap">
          <div className="section-head">
            <h2>Straightforward pricing</h2>
            <p>Know the cost before you hail. No clinic-visit surprises.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 24 }} className="price-grid">
            <div className="card" style={{ padding: 26 }}>
              <h3>Video consult</h3>
              <div style={{ fontFamily: "var(--font-fraunces), Fraunces, serif", fontWeight: 600, fontSize: "1.9rem", margin: "12px 0 16px" }}>
                Set by vet
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 9 }}>
                <li style={{ fontSize: "0.9rem", color: "var(--ink-soft)", paddingLeft: 16, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "var(--amber-dark)" }}>—</span>Video call with a licensed vet</li>
                <li style={{ fontSize: "0.9rem", color: "var(--ink-soft)", paddingLeft: 16, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "var(--amber-dark)" }}>—</span>Written care plan after</li>
                <li style={{ fontSize: "0.9rem", color: "var(--ink-soft)", paddingLeft: 16, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "var(--amber-dark)" }}>—</span>Follow-up messaging</li>
              </ul>
              <button className="btn-secondary" style={{ width: "100%" }} onClick={() => document.getElementById("hail")?.scrollIntoView({ behavior: "smooth" })}>Choose video</button>
            </div>
            <div className="card" style={{ padding: 26, border: "2px solid var(--deep)", position: "relative" }}>
              <span style={{ position: "absolute", top: -12, left: 24, background: "var(--amber)", color: "var(--deep-2)", fontSize: "0.72rem", fontWeight: 700, padding: "5px 10px", borderRadius: 100 }}>Most booked</span>
              <h3>Home visit</h3>
              <div style={{ fontFamily: "var(--font-fraunces), Fraunces, serif", fontWeight: 600, fontSize: "1.9rem", margin: "12px 0 16px" }}>
                Set by vet
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 9 }}>
                <li style={{ fontSize: "0.9rem", color: "var(--ink-soft)", paddingLeft: 16, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "var(--amber-dark)" }}>—</span>Vet at your door, no carrier needed</li>
                <li style={{ fontSize: "0.9rem", color: "var(--ink-soft)", paddingLeft: 16, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "var(--amber-dark)" }}>—</span>On-the-spot basic treatment</li>
                <li style={{ fontSize: "0.9rem", color: "var(--ink-soft)", paddingLeft: 16, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "var(--amber-dark)" }}>—</span>Prescription sent to your phone</li>
              </ul>
              <button className="btn-primary" style={{ width: "100%" }} onClick={() => document.getElementById("hail")?.scrollIntoView({ behavior: "smooth" })}>Choose home visit</button>
            </div>
            <div className="card" style={{ padding: 26 }}>
              <h3>Emergency</h3>
              <div style={{ fontFamily: "var(--font-fraunces), Fraunces, serif", fontWeight: 600, fontSize: "1.9rem", margin: "12px 0 16px" }}>
                Set by vet
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 9 }}>
                <li style={{ fontSize: "0.9rem", color: "var(--ink-soft)", paddingLeft: 16, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "var(--amber-dark)" }}>—</span>Priority match, skips the queue</li>
                <li style={{ fontSize: "0.9rem", color: "var(--ink-soft)", paddingLeft: 16, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "var(--amber-dark)" }}>—</span>Available for urgent needs</li>
                <li style={{ fontSize: "0.9rem", color: "var(--ink-soft)", paddingLeft: 16, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "var(--amber-dark)" }}>—</span>Nearest 24-hr clinic as backup</li>
              </ul>
              <button className="btn-secondary" style={{ width: "100%" }} onClick={() => document.getElementById("hail")?.scrollIntoView({ behavior: "smooth" })}>Choose emergency</button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, border: "1px solid var(--line)", borderRadius: "var(--radius-m)", background: "var(--paper-2)", padding: "22px 26px" }}>
            <div>
              <h3 style={{ marginBottom: 6 }}>PetTails Plus</h3>
              <p style={{ color: "var(--ink-soft)", fontSize: "0.94rem", margin: 0 }}>Subscription plan — unlimited video consults, discounts on home visits, priority matching.</p>
            </div>
            <button className="btn-primary" style={{ opacity: 0.6, cursor: "not-allowed" }} disabled title="Coming soon">Coming soon</button>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" style={{ padding: "84px 0", background: "var(--deep)", color: "var(--white)" }}>
        <div className="wrap">
          <div className="section-head">
            <h2 style={{ color: "var(--white)" }}>One network, every kind of visit</h2>
            <p style={{ color: "#B9C7BF" }}>Match the care to the moment — from a quick question to an urgent house call.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--line-deep)", border: "1px solid var(--line-deep)" }} className="svc-grid">
            {[
              { title: "Video consult", desc: "Face-to-face with a vet in minutes for questions, follow-ups, and second opinions." },
              { title: "Home visit", desc: "A vet comes to you for exams, injuries, or pets too anxious for a clinic." },
              { title: "Emergency", desc: "Priority matching around the clock when something can't wait until morning." },
              { title: "Vaccination & wellness", desc: "Routine shots, checkups, and preventive care scheduled around you." },
            ].map((svc) => (
              <div key={svc.title} style={{ background: "var(--deep)", padding: "30px 26px" }}>
                <h3 style={{ color: "var(--white)", fontSize: "1.08rem", marginBottom: 10 }}>{svc.title}</h3>
                <p style={{ color: "#AEC0B6", fontSize: "0.92rem" }}>{svc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" style={{ padding: "84px 0" }}>
        <div className="wrap">
          <div className="section-head">
            <h2>Pet owners on PetTails</h2>
            <p>Real feedback after real visits.</p>
          </div>
          {realReviews.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-soft)", fontSize: "0.95rem" }}>
              No reviews yet. Reviews appear after completed consultations.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }} className="quotes-grid">
              {realReviews.map((q, i) => (
                <div key={i} className="card" style={{ padding: 26, display: "flex", flexDirection: "column", gap: 16 }}>
                  <p style={{ fontSize: "1.02rem" }}>&quot;{q.text}&quot;</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--paper-2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-fraunces), Fraunces, serif", fontWeight: 600, fontSize: "0.9rem", color: "var(--deep)" }}>
                      {q.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>{q.name}</div>
                      <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>★{q.rating}.0</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* PET PROFILE */}
      <PetProfileSection />

      {/* PARTNER */}
      <section id="partner" style={{ background: "var(--paper-2)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "84px 0" }}>
        <div className="wrap partner-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 40, alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "clamp(1.7rem,3vw,2.2rem)" }}>Practising vets, set your own hours.</h2>
            <p style={{ marginTop: 14, color: "var(--ink-soft)", maxWidth: "52ch" }}>
              Join the network and take video consults or home visits around your existing schedule. You set your availability and your rates — we bring the bookings.
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 26, flexWrap: "wrap" }}>
              <a href="/auth/signup?role=vet" className="btn-primary" style={{ textDecoration: "none" }}>Apply as a vet</a>
              <button className="btn-secondary">See how earnings work</button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {[
              { num: "You choose", label: "your hours, radius, and rates" },
              { num: "Set your price", label: "for video consults and home visits" },
              { num: "Fast verification", label: "to start receiving bookings" },
            ].map((s) => (
              <div key={s.label} style={{ borderLeft: "3px solid var(--amber)", paddingLeft: 16 }}>
                <div style={{ fontFamily: "var(--font-fraunces), Fraunces, serif", fontSize: "1.6rem", fontWeight: 600 }}>{s.num}</div>
                <div style={{ color: "var(--ink-soft)", fontSize: "0.88rem" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOOKING MODAL */}
      {selectedVet && (
        <BookingModal vet={selectedVet} onClose={() => setSelectedVet(null)} />
      )}

      <style>{`
        .hp-page {
          background: #F8F3EA;
        }
        .hp-wrap {
          width: min(1332px, calc(100% - 48px));
          margin: 0 auto;
          position: relative;
        }

        /* ---------- HERO ---------- */
        .hp-hero {
          position: relative;
          margin-top: -62px;
          padding: 116px 0 26px;
        }
        .hp-hero-in {
          position: relative;
          z-index: 2;
          padding-left: 28px;
        }
        .hp-hero-copy {
          max-width: 640px;
        }
        .hp-eyebrow {
          margin: 0 0 9px;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--amber-dark);
        }
        .hp-h1 {
          margin: 0;
          font-family: var(--font-fraunces), Fraunces, serif;
          font-weight: 700;
          font-size: clamp(2.7rem, 5vw, 4.6rem);
          line-height: 1.1;
          letter-spacing: -0.015em;
          color: #0B3A2B;
        }
        .hp-h1-heart {
          display: inline-block;
          vertical-align: -4px;
          margin-left: 12px;
        }
        .hp-sub {
          max-width: 505px;
          margin: 4px 0 0;
          font-size: 1.05rem;
          line-height: 1.32;
          color: var(--ink-soft);
        }
        .hp-ctas {
          display: flex;
          gap: 16px;
          margin-top: 14px;
          flex-wrap: wrap;
        }
        .hp-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 50px;
          padding: 0 32px;
          border-radius: 10px;
          font-size: 0.98rem;
          font-weight: 600;
          text-decoration: none;
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        .hp-btn:hover { transform: translateY(-2px); }
        .hp-btn-dark {
          background: var(--deep);
          color: var(--white);
          box-shadow: 0 10px 24px rgba(12, 42, 34, 0.22);
        }
        .hp-btn-dark:hover { background: var(--deep-2); }
        .hp-btn-outline {
          background: var(--white);
          color: var(--ink);
          border: 1px solid rgba(28, 42, 33, 0.65);
        }
        .hp-btn-outline:hover { background: #F1EEE4; }
        .hp-trust {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-top: 25px;
        }
        .hp-avatars {
          display: inline-flex;
        }
        .hp-av {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          overflow: hidden;
          border: 2.5px solid #F4EFE2;
          margin-left: -8px;
          box-shadow: 0 2px 6px rgba(30, 40, 30, 0.18);
          background: #DDE8DC;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: none;
        }
        .hp-av:first-child { margin-left: 0; }
        .hp-av img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .hp-av-paw {
          background: var(--deep);
          color: var(--amber);
        }
        .hp-av-paw svg {
          width: 20px;
          height: 20px;
        }
        .hp-trust p {
          margin: 0;
          font-size: 0.98rem;
          line-height: 1.42;
          color: var(--ink-soft);
        }

        /* hero photo */
        .hp-photo {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 30%;
          right: 0;
          overflow: hidden;
          z-index: 1;
        }
        .hp-photo-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: 50% 40%;
        }
        .hp-photo-fade {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            #F8F3EA 0%,
            rgba(248, 243, 234, 0.95) 13%,
            rgba(248, 243, 234, 0.55) 30%,
            rgba(248, 243, 234, 0) 56%
          );
        }

        /* floating cards */
        .hp-float {
          position: absolute;
          z-index: 3;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          background: #FFFEFB;
          border: 1px solid rgba(28, 42, 33, 0.05);
          border-radius: 16px;
          padding: 14px 16px;
          box-shadow: 0 14px 34px rgba(24, 40, 30, 0.16);
          text-decoration: none;
          color: var(--ink);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hp-float:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 42px rgba(24, 40, 30, 0.22);
        }
        .hp-float-ic {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #E1EFE4;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: none;
          color: var(--deep);
        }
        .hp-float-ic svg {
          width: 20px;
          height: 20px;
        }
        .hp-float b {
          display: block;
          font-size: 0.95rem;
          font-weight: 700;
          line-height: 1.25;
        }
        .hp-float > span > span {
          display: block;
          font-size: 0.82rem;
          font-weight: 400;
          color: var(--ink-soft);
          line-height: 1.35;
          margin-top: 3px;
        }
        .hp-float-ai {
          left: 14.6%;
          top: 387px;
          width: 222px;
        }
        .hp-float-vet {
          right: 4.4%;
          top: 293px;
          width: 184px;
          padding-right: 32px;
        }
        .hp-float-heart {
          position: absolute;
          top: 11px;
          right: 11px;
        }

        /* handwritten notes */
        .hp-hand {
          position: absolute;
          z-index: 3;
          font-family: "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive;
          color: #FFFDF6;
          font-size: 30px;
          line-height: 1.04;
          text-shadow: 0 2px 12px rgba(20, 30, 25, 0.5);
          pointer-events: none;
        }
        .hp-hand-l {
          left: 31%;
          top: 152px;
          transform: rotate(-7deg);
        }
        .hp-hand-l svg {
          position: absolute;
          left: 2px;
          top: 66px;
          transform: rotate(14deg);
        }
        .hp-hand-r {
          left: 85%;
          top: 150px;
          transform: rotate(5deg);
        }
        .hp-hand-heart {
          position: absolute;
          left: 74px;
          top: 34px;
          transform: rotate(10deg);
        }
        .hp-hand-arrow {
          position: absolute;
          left: -20px;
          top: 64px;
          transform: rotate(-12deg);
        }

        /* ---------- FEATURE STRIP ---------- */
        .hp-strip {
          background: #FCF9F1;
          border: 1px solid rgba(28, 42, 33, 0.05);
          border-radius: 22px;
          box-shadow: 0 16px 40px rgba(31, 45, 35, 0.07);
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          padding: 8px 0;
        }
        .hp-strip-item {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          padding: 14px 26px;
        }
        .hp-strip-item + .hp-strip-item {
          border-left: 1px solid #E8E3D1;
        }
        .hp-strip-ic {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: #E2EFE6;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: none;
          color: #14432F;
          transition: transform 0.2s ease;
        }
        .hp-strip-ic svg {
          width: 22px;
          height: 22px;
        }
        .hp-strip-item:hover .hp-strip-ic { transform: scale(1.08); }
        .hp-strip-item b {
          display: block;
          font-size: 0.98rem;
          font-weight: 700;
          color: var(--ink);
          line-height: 1.3;
        }
        .hp-strip-item p {
          margin: 4px 0 0;
          font-size: 0.86rem;
          line-height: 1.45;
          color: #5D6B61;
        }

        /* ---------- HOW IT WORKS ---------- */
        .hp-how {
          padding: 41px 0 70px;
        }
        .hp-how-head {
          position: relative;
          text-align: center;
          margin-bottom: 22px;
        }
        .hp-how-head .hp-eyebrow {
          margin-bottom: 8px;
        }
        .hp-how-h2 {
          margin: 0;
          font-family: var(--font-fraunces), Fraunces, serif;
          font-weight: 600;
          font-size: clamp(2rem, 3.4vw, 2.9rem);
          line-height: 1.12;
          color: #0B3A2B;
        }
        .hp-learn {
          position: absolute;
          right: 0;
          bottom: 4px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #FFFEFB;
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 11px 18px;
          font-size: 0.95rem;
          font-weight: 600;
          text-decoration: none;
          color: var(--ink);
          box-shadow: 0 6px 18px rgba(31, 45, 35, 0.07);
          transition: transform 0.18s ease;
        }
        .hp-learn:hover { transform: translateY(-2px); }
        .hp-learn svg { width: 16px; height: 16px; }

        .hp-steps {
          --g: 92px;
          position: relative;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--g);
        }
        .hp-step {
          position: relative;
          z-index: 1;
          background: #FCF9F2;
          border: 1px solid rgba(28, 42, 33, 0.05);
          border-radius: 18px;
          padding: 22px 22px 26px;
          box-shadow: 0 12px 30px rgba(31, 45, 35, 0.06);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hp-step:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 38px rgba(31, 45, 35, 0.1);
        }
        .hp-badge {
          position: absolute;
          top: 18px;
          left: 18px;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #FBF1E0;
          color: var(--amber-dark);
          font-family: var(--font-fraunces), Fraunces, serif;
          font-weight: 700;
          font-size: 1rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .hp-illo {
          height: 152px;
          margin-top: 34px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hp-step h3 {
          margin: 16px 0 8px;
          font-size: 1.08rem;
          font-weight: 700;
          color: var(--ink);
        }
        .hp-step p {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.5;
          color: var(--ink-soft);
        }

        /* dashed connectors */
        .hp-conn {
          position: absolute;
          top: 36px;
          height: 30px;
          width: var(--g);
          z-index: 0;
        }
        .hp-conn svg {
          display: block;
          width: 100%;
          height: 30px;
        }
        .hp-paw {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -30%);
          width: 17px;
          height: 17px;
          color: #D89A3A;
        }
        .hp-paw svg {
          width: 17px;
          height: 17px;
        }
        .hp-conn1 { left: calc((100% - 3 * var(--g)) / 4); }
        .hp-conn2 { left: calc(2 * (100% - 3 * var(--g)) / 4 + var(--g)); }
        .hp-conn3 { left: calc(3 * (100% - 3 * var(--g)) / 4 + 2 * var(--g)); }

        /* illustrations */
        .hp-i1 {
          display: flex;
          gap: 13px;
          align-items: center;
        }
        .hp-phone {
          width: 74px;
          height: 142px;
          border: 3px solid #123832;
          border-radius: 15px;
          background: #fff;
          padding: 13px 5px 6px;
          position: relative;
          flex: none;
          box-shadow: 0 8px 18px rgba(31, 45, 35, 0.12);
        }
        .hp-phone::before {
          content: "";
          position: absolute;
          top: 6px;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 4px;
          border-radius: 3px;
          background: #123832;
        }
        .hp-phone img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 9px;
        }
        .hp-bubs {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .hp-bub {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
          height: 30px;
          padding: 0 11px;
          border-radius: 15px;
          background: #DCEBE2;
        }
        .hp-bub i {
          display: block;
          height: 4px;
          border-radius: 2px;
          background: #93B7A2;
        }
        .hp-bub i + i { width: 62%; }
        .hp-bub1 { width: 96px; }
        .hp-bub2 { width: 118px; }
        .hp-bub3 { width: 78px; }

        .hp-i2 { width: 100%; }
        .hp-procard {
          background: #fff;
          border: 1px solid #E3DECC;
          border-radius: 12px;
          padding: 13px;
          box-shadow: 0 8px 18px rgba(31, 45, 35, 0.08);
        }
        .hp-protop {
          display: flex;
          gap: 11px;
          align-items: center;
        }
        .hp-proav {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          overflow: hidden;
          background: #E2EFE6;
          flex: none;
          display: inline-flex;
          align-items: flex-end;
          justify-content: center;
        }
        .hp-proav svg {
          width: 44px;
          height: 44px;
        }
        .hp-probars {
          display: flex;
          flex-direction: column;
          gap: 7px;
          flex: 1;
        }
        .hp-probars i {
          display: block;
          height: 7px;
          border-radius: 4px;
          background: #DCD7C4;
        }
        .hp-probars i + i { width: 56%; height: 5px; background: #E9E5D5; }
        .hp-prostars {
          display: flex;
          gap: 4px;
          margin-top: 12px;
          color: var(--amber);
        }
        .hp-prostars svg {
          width: 15px;
          height: 15px;
        }
        .hp-promap {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 11px;
          background: #E7F1EA;
          border-radius: 8px;
          padding: 8px 10px;
          color: #2E7D5B;
        }
        .hp-promap svg {
          width: 15px;
          height: 15px;
          flex: none;
        }
        .hp-promap i {
          display: block;
          height: 5px;
          border-radius: 3px;
          background: #BBD7C6;
          flex: 1;
        }

        .hp-i3 {
          width: 100%;
          background: #0D2B26;
          border-radius: 12px;
          padding: 9px 9px 11px;
          box-shadow: 0 10px 22px rgba(13, 43, 38, 0.25);
        }
            .hp-video {
              height: 96px;
              border-radius: 8px;
              background: linear-gradient(160deg, #DCEBE2, #BEDACB);
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }
        .hp-video svg {
          width: 84px;
          height: 84px;
        }
        .hp-vidctl {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 10px;
        }
        .hp-vc {
          width: 25px;
          height: 25px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }
        .hp-vc-mic { background: #2E7D5B; }
        .hp-vc-cam { background: #46584F; }
        .hp-vc-end { background: #D64545; }

        .hp-i4 {
          position: relative;
          width: 100%;
          height: 148px;
        }
        .hp-i4 img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 12px;
        }
        .hp-chip-heart {
          position: absolute;
          top: -9px;
          right: -7px;
          width: 42px;
          height: 42px;
          border-radius: 13px;
          background: #FFFEFB;
          border: 1px solid #E9E3D0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--amber);
          box-shadow: 0 8px 18px rgba(31, 45, 35, 0.12);
        }
        .hp-chip-heart svg {
          width: 20px;
          height: 20px;
        }
        .hp-chip-chart {
          position: absolute;
          bottom: -8px;
          right: -7px;
          width: 47px;
          height: 47px;
          border-radius: 13px;
          background: #E2EFE6;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #2E7D5B;
          box-shadow: 0 8px 18px rgba(31, 45, 35, 0.12);
        }
        .hp-chip-chart svg {
          width: 22px;
          height: 22px;
        }

        /* ---------- STATS ---------- */
        .hp-stats {
          padding: 8px 0 74px;
        }
        .hp-stats-in {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 24px 64px;
          text-align: center;
        }
        .hp-stat b {
          display: block;
          font-family: var(--font-fraunces), Fraunces, serif;
          font-weight: 600;
          font-size: 1.65rem;
          color: #0B3A2B;
          line-height: 1.2;
        }
        .hp-stat span {
          font-size: 0.87rem;
          color: var(--ink-soft);
        }

        /* ---------- AI CARE ---------- */
        .hp-ai {
          position: relative;
          padding: 30px 0 92px;
          overflow: hidden;
        }
        .hp-ai-glow {
          position: absolute;
          right: -170px;
          top: -170px;
          width: 640px;
          height: 640px;
          border-radius: 50%;
          overflow: hidden;
          opacity: 0.42;
          -webkit-mask-image: radial-gradient(circle, #000 30%, transparent 68%);
          mask-image: radial-gradient(circle, #000 30%, transparent 68%);
        }
        .hp-ai-glow img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: blur(46px) saturate(1.15);
        }
        .hp-ai-in {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1fr 1.02fr;
          gap: 56px;
          align-items: center;
        }
        .hp-ai-copy h2,
        .hp-find-copy h2 {
          margin: 0;
          font-family: var(--font-fraunces), Fraunces, serif;
          font-weight: 600;
          font-size: clamp(1.9rem, 3.2vw, 2.7rem);
          line-height: 1.14;
          color: #0B3A2B;
        }
        .hp-lede {
          margin: 14px 0 0;
          font-size: 1.03rem;
          line-height: 1.55;
          color: var(--ink-soft);
          max-width: 54ch;
        }
        .hp-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin: 22px 0 18px;
        }
        .hp-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: #EAF3EC;
          border: 1px solid #D3E5D9;
          color: #1E4B3A;
          font-size: 0.86rem;
          font-weight: 600;
          padding: 8px 14px;
          border-radius: 100px;
        }
        .hp-chip svg {
          width: 15px;
          height: 15px;
        }
        .hp-disc {
          display: flex;
          gap: 9px;
          align-items: flex-start;
          margin: 0;
          font-size: 0.85rem;
          line-height: 1.5;
          color: var(--ink-soft);
          background: #FFF7E8;
          border: 1px solid #F0E2C4;
          border-radius: 10px;
          padding: 11px 14px;
          max-width: 58ch;
        }
        .hp-disc svg {
          width: 16px;
          height: 16px;
          flex: none;
          color: var(--amber-dark);
          margin-top: 2px;
        }
        .hp-cta-mt {
          margin-top: 22px;
        }

        .hp-aiprev {
          display: block;
          background: #FFFEFB;
          border: 1px solid rgba(28, 42, 33, 0.06);
          border-radius: 22px;
          padding: 18px;
          box-shadow: 0 24px 60px rgba(31, 45, 35, 0.12);
          text-decoration: none;
          color: inherit;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hp-aiprev:hover {
          transform: translateY(-4px);
          box-shadow: 0 30px 66px rgba(31, 45, 35, 0.16);
        }
        .hp-aipills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .hp-aipill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #F4F2E7;
          border: 1px solid #E7E3D0;
          border-radius: 100px;
          padding: 7px 13px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #3C4C43;
        }
        .hp-aipill svg {
          width: 14px;
          height: 14px;
        }
        .hp-aizone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          min-height: 236px;
          border-radius: 16px;
          background: linear-gradient(180deg, #F7F5EA, #FFFEFB);
          border: 1px dashed #DED9C4;
          padding: 24px;
          gap: 7px;
        }
        .hp-aispark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: #FBF1E0;
          color: var(--amber-dark);
          margin-bottom: 4px;
        }
        .hp-aispark svg {
          width: 26px;
          height: 26px;
        }
        .hp-aizone b {
          font-family: var(--font-fraunces), Fraunces, serif;
          font-weight: 600;
          font-size: 1.16rem;
          color: var(--ink);
        }
        .hp-aizone > span:last-child {
          font-size: 0.87rem;
          color: var(--ink-soft);
        }
        .hp-aiinput {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 14px;
          background: #F4F2E7;
          border: 1px solid #E7E3D0;
          border-radius: 14px;
          padding: 10px 12px;
        }
        .hp-aiplus {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          background: #FFFEFB;
          border: 1px solid #E7E3D0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          color: #5D6B61;
          flex: none;
        }
        .hp-aifake {
          flex: 1;
          text-align: left;
          font-size: 0.88rem;
          color: #7A857B;
        }
        .hp-aiorb {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #DCEBE2;
          color: #1E7A4E;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: none;
        }
        .hp-aiorb svg {
          width: 15px;
          height: 15px;
        }
        .hp-aisend {
          background: var(--deep);
          color: var(--white);
          font-size: 0.85rem;
          font-weight: 600;
          padding: 8px 15px;
          border-radius: 10px;
          flex: none;
        }

        /* ---------- FIND A VET ---------- */
        .hp-find {
          padding: 26px 0 92px;
        }
        .hp-find-top {
          display: grid;
          grid-template-columns: 1.06fr 0.94fr;
          gap: 48px;
          align-items: start;
        }
        .hp-hail {
          background: #FFFEFB;
          border: 1px solid rgba(28, 42, 33, 0.06);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 16px 40px rgba(31, 45, 35, 0.08);
          margin-top: 26px;
          max-width: 540px;
        }
        .hp-hail .btn-amber {
          border-radius: 10px;
        }
        .hp-feat {
          background: #FFFEFB;
          border: 1px solid rgba(28, 42, 33, 0.06);
          border-radius: 20px;
          padding: 26px;
          box-shadow: 0 20px 50px rgba(31, 45, 35, 0.1);
          position: sticky;
          top: 92px;
        }
        .hp-feat-head {
          display: flex;
          gap: 14px;
          align-items: center;
        }
        .hp-feat-av {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #E2EFE6;
          color: var(--deep);
          font-family: var(--font-fraunces), Fraunces, serif;
          font-weight: 700;
          font-size: 1.35rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: none;
        }
        .hp-feat-name {
          font-family: var(--font-fraunces), Fraunces, serif;
          font-weight: 600;
          font-size: 1.25rem;
          color: var(--ink);
          line-height: 1.2;
        }
        .hp-feat-spec {
          font-size: 0.9rem;
          color: var(--ink-soft);
          margin-top: 3px;
        }
        .hp-feat-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 16px;
        }
        .hp-fbadge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 100px;
          padding: 6px 12px;
          font-size: 0.8rem;
          font-weight: 700;
        }
        .hp-fbadge-ok {
          background: #E7F1EA;
          color: #1E7A4E;
        }
        .hp-fbadge-live {
          background: #FBF1E0;
          color: #9A6417;
        }
        .hp-fdot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #2E9E63;
        }
        .hp-feat-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 18px;
          align-items: center;
          margin-top: 15px;
          font-size: 0.9rem;
          color: var(--ink-soft);
        }
        .hp-feat-meta > span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .hp-star {
          color: var(--amber);
          font-size: 1rem;
        }
        .hp-feat-cta {
          display: flex;
          gap: 14px;
          align-items: center;
          flex-wrap: wrap;
          margin-top: 20px;
        }
        .hp-feat-link {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 0.92rem;
          font-weight: 600;
          color: var(--deep);
          text-decoration: none;
        }
        .hp-feat-link:hover { text-decoration: underline; }
        .hp-feat-link svg { width: 15px; height: 15px; }
        .hp-feat-fallback {
          color: var(--ink-soft);
          font-size: 0.95rem;
          text-align: center;
          padding: 30px 0;
        }
        .hp-find-grid {
          margin-top: 56px;
          scroll-margin-top: 96px;
        }
        .hp-find-browse {
          text-align: center;
          margin-top: 32px;
        }

        /* keep old anchor sections clear of floating nav */
        .hp-page #hail,
        .hp-page #how,
        .hp-page #pricing,
        .hp-page #services,
        .hp-page #reviews,
        .hp-page #partner {
          scroll-margin-top: 96px;
        }

        /* light restyle of existing sections */
        .hp-page .card {
          border-radius: 16px;
          border-color: #E4DFCC;
          background: #FCF9F2;
          box-shadow: 0 10px 28px rgba(31, 45, 35, 0.05);
        }
        .hp-page .btn-primary,
        .hp-page .btn-secondary,
        .hp-page .btn-amber {
          border-radius: 10px;
        }
        .hp-page .section-head h2 {
          color: #0B3A2B;
        }

        /* entrance animation */
        @keyframes hpUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hp-anim-1 { animation: hpUp 0.55s ease 0.02s both; }
        .hp-anim-2 { animation: hpUp 0.6s ease 0.09s both; }
        .hp-anim-3 { animation: hpUp 0.6s ease 0.16s both; }
        .hp-anim-4 { animation: hpUp 0.6s ease 0.23s both; }
        .hp-anim-5 { animation: hpUp 0.6s ease 0.31s both; }
        .hp-anim-6 { animation: hpUp 0.6s ease 0.5s both; }
        .hp-anim-7 { animation: hpUp 0.6s ease 0.6s both; }
        .hp-anim-8 { animation: hpUp 0.6s ease 0.55s both; }

        /* ---------- RESPONSIVE ---------- */
        @media (max-width: 1240px) {
          .hp-hand { display: none; }
          .hp-steps { --g: 56px; }
        }
        @media (max-width: 1040px) {
          .hp-steps { --g: 32px; grid-template-columns: 1fr 1fr; row-gap: 26px; }
          .hp-conn { display: none; }
          .hp-ai-in { grid-template-columns: 1fr; gap: 40px; }
          .hp-find-top { grid-template-columns: 1fr; gap: 40px; }
          .hp-feat { position: static; }
          .hp-strip-item { padding: 14px 18px; }
          .safety-grid { grid-template-columns: 1fr 1fr !important; }
          .price-grid { grid-template-columns: 1fr !important; }
          .svc-grid { grid-template-columns: 1fr 1fr !important; }
          .quotes-grid { grid-template-columns: 1fr !important; }
          .partner-grid, .profile-layout { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 900px) {
          .hp-hero {
            margin-top: -56px;
            padding: 96px 0 30px;
          }
          .hp-hero-in { padding-left: 0; }
          .hp-photo {
            position: relative;
            left: auto;
            right: auto;
            top: auto;
            bottom: auto;
            width: calc(100% - 48px);
            margin: 36px auto 0;
            height: 330px;
            border-radius: 22px;
          }
          .hp-photo-fade {
            background: linear-gradient(180deg, rgba(248,243,234,0.18) 0%, rgba(248,243,234,0) 30%);
          }
          .hp-float-ai {
            left: 14px;
            top: auto;
            bottom: 14px;
          }
          .hp-float-vet {
            right: 14px;
            top: 14px;
          }
          .hp-strip { grid-template-columns: 1fr 1fr; padding: 8px 0; }
          .hp-strip-item:nth-child(odd) { border-left: none; }
          .hp-strip-item:nth-child(n + 3) { border-top: 1px solid #E8E3D1; }
          .hp-learn {
            position: static;
            display: inline-flex;
            margin-top: 14px;
          }
          .hp-how-head { text-align: left; }
          .hp-how-h2 { max-width: 18ch; }
        }
        @media (max-width: 760px) {
          .hp-stats-in { gap: 22px 40px; }
          .hp-strip { grid-template-columns: 1fr; }
          .hp-strip-item { border-left: none !important; }
          .hp-strip-item + .hp-strip-item { border-top: 1px solid #E8E3D1; }
        }
        @media (max-width: 640px) {
          .hp-wrap { width: calc(100% - 36px); }
          .hp-h1 { font-size: clamp(2.4rem, 10vw, 3rem); }
          .hp-trust { flex-wrap: wrap; }
          .hp-steps { grid-template-columns: 1fr; gap: 18px; }
          .hp-conn { display: none; }
          .hp-i2, .hp-i3, .hp-i4 { max-width: 320px; margin: 0 auto; }
          .hp-feat-cta .btn-primary { width: 100%; }
          .safety-grid, .svc-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .hail-row { grid-template-columns: 1fr !important; }
          .hp-ctas .hp-btn { width: 100%; }
          .hp-photo { width: calc(100% - 36px); height: 280px; }
          .hp-float-vet { display: none; }
        }
      `}</style>
    </div>
  );
}

function PetProfileSection() {
  return (
    <section id="profile" style={{ padding: "84px 0" }}>
      <div className="wrap">
        <div className="section-head">
          <h2>Your pets, saved once</h2>
          <p>Add your pet&apos;s details so you&apos;re not retyping them at every booking.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 32 }} className="profile-layout">
          <div className="card" style={{ padding: 22 }}>
            <p style={{ color: "var(--ink-soft)", fontSize: "0.94rem" }}>
              <a href="/auth/login" style={{ color: "var(--deep)", fontWeight: 600 }}>Log in</a> to add and manage your pets from your dashboard.
            </p>
          </div>
          <div style={{ color: "var(--ink-soft)", fontSize: "0.94rem", padding: 20, border: "1px dashed var(--line)", borderRadius: "var(--radius-m)", textAlign: "center" }}>
            No pets saved yet — log in to add your first pet.
          </div>
        </div>
      </div>
    </section>
  );
}

function VetBust({ waving = false }: { waving?: boolean }) {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="30" r="15" fill="#EFC9A4" />
      <path d="M25 29c0-9 6-16 15-16s15 7 15 16c0 1-.2 3-.4 4-1.2-6-5.4-9.5-14.6-9.5S26.4 27 25.2 33c-.2-1-.2-2.6-.2-4Z" fill="#2A2622" />
      <circle cx="34" cy="30" r="1.8" fill="#2A2622" />
      <circle cx="46" cy="30" r="1.8" fill="#2A2622" />
      <path d="M36 37c2.5 2 5.5 2 8 0" stroke="#2A2622" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M16 80c2-16 11-24 24-24s22 8 24 24Z" fill="#2F7D63" />
      <path d="M34 56.5 40 64l6-7.5" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinejoin="round" />
      <path d="M31 58c-2 6-2 12 0 18M49 58c2 6 2 12 0 18" stroke="#0D2B26" strokeWidth="1.5" fill="none" />
      <circle cx="49" cy="73" r="4" fill="none" stroke="#0D2B26" strokeWidth="2" />
      {waving && (
        <>
          <path d="M60 62c8-5 11-14 9-23" stroke="#2F7D63" strokeWidth="9" strokeLinecap="round" fill="none" />
          <circle cx="68" cy="36" r="6" fill="#EFC9A4" />
        </>
      )}
    </svg>
  );
}

function IconArrow() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5c.7 4 2.6 6 6.5 6.6-3.9.7-5.8 2.7-6.5 6.7-.7-4-2.6-6-6.5-6.7 3.9-.6 5.8-2.6 6.5-6.6Z" />
      <path d="M19 14.5c.4 2 1.4 3 3.3 3.3-1.9.4-2.9 1.4-3.3 3.4-.4-2-1.4-3-3.3-3.4 1.9-.3 2.9-1.3 3.3-3.3Z" opacity="0.75" />
      <path d="M5.5 15c.3 1.6 1.1 2.4 2.7 2.7-1.6.3-2.4 1.1-2.7 2.8-.3-1.7-1.1-2.5-2.7-2.8 1.6-.3 2.4-1.1 2.7-2.7Z" opacity="0.75" />
    </svg>
  );
}

function IconVetBadge() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21c.9-4 4-6 7.5-6s6.6 2 7.5 6" />
      <path d="M17.5 3.5v4M15.5 5.5h4" stroke="#C6842A" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.7 8.7 0 0 1-3.8-.9L3 21l1.9-5.4a8.4 8.4 0 0 1-.9-3.9A8.4 8.4 0 0 1 12.5 3.5 8.4 8.4 0 0 1 21 11.5Z" />
      <path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" strokeWidth="2.4" />
    </svg>
  );
}

function IconStetho() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 3v5a5 5 0 0 0 10 0V3" />
      <path d="M10 13v3a5 5 0 0 0 10 0v-2" />
      <circle cx="20" cy="12" r="2" />
      <path d="M5 3H3.5M15 3h1.5" />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.8 5.6a5.4 5.4 0 0 0-7.7 0L12 6.7l-1.1-1.1a5.4 5.4 0 0 0-7.7 7.7l1.1 1.1L12 22l7.7-7.6 1.1-1.1a5.4 5.4 0 0 0 0-7.7Z" />
    </svg>
  );
}

function IconPaw() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <ellipse cx="12" cy="15.8" rx="4.7" ry="4" />
      <circle cx="6.7" cy="9.3" r="2.15" />
      <circle cx="10.6" cy="6.9" r="2.25" />
      <circle cx="14.9" cy="6.9" r="2.25" />
      <circle cx="18.6" cy="9.6" r="2.1" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="m12 2 3 6.6 7 .8-5.2 4.8L18.2 21 12 17.4 5.8 21l1.4-6.8L2 9.4l7-.8Z" />
    </svg>
  );
}

function IconPinSmall() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 20h18" />
      <path d="m5 15 4.5-5 3.5 3 5.5-7" />
      <path d="M15 6h3.5v3.5" />
    </svg>
  );
}

function IconMic() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
    </svg>
  );
}

function IconMicOff() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v4M4 3l16 16" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9S14.6 18.4 12 21c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3Z" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="2" />
      <path d="m4 18 5-5 4 4 3-3 4 4" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

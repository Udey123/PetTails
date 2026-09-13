"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { VetGrid } from "@/components/vets/VetGrid";
import { BookingModal } from "@/components/booking/BookingModal";
import type { Vet } from "@/lib/types";

export default function HomePage() {
  const [vets, setVets] = useState<Vet[]>([]);
  const [selectedVet, setSelectedVet] = useState<Vet | null>(null);
  const [visitType, setVisitType] = useState("video_consult");
  const [triageVisible, setTriageVisible] = useState(false);

  useEffect(() => {
    const fetchVets = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("vets")
        .select("*, profiles!vets_user_id_fkey(name, email)")
        .eq("verified", true)
        .eq("accepting_bookings", true);
      if (data) setVets(data as Vet[]);
    };
    fetchVets();
  }, []);

  return (
    <>
      {/* HERO */}
      <section style={{ padding: "76px 0 90px", borderBottom: "1px solid var(--line)" }}>
        <div className="wrap hero-grid" style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 56, alignItems: "center" }}>
          <div>
            <div style={{ color: "var(--ink-soft)", fontSize: "0.95rem", marginBottom: 18 }}>
              Veterinary care, on your street&apos;s schedule
            </div>
            <h1 style={{ fontSize: "clamp(2.4rem, 4.4vw, 3.6rem)", lineHeight: 1.06 }}>
              Hail a vet the moment your pet needs one.
            </h1>
            <p style={{ marginTop: 22, fontSize: "1.14rem", color: "var(--ink-soft)", maxWidth: "46ch" }}>
              Tell us what&apos;s wrong, and we&apos;ll match you with a licensed vet nearby for a video call or a home visit — usually inside twenty minutes.
            </p>

            <div id="hail" style={{ marginTop: 34, background: "var(--white)", border: "1px solid var(--line)", borderRadius: "var(--radius-m)", padding: 22, boxShadow: "var(--shadow)" }}>
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
                      setVisitType(e.target.value);
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
                {vets.length} vet{vets.length !== 1 ? "s" : ""} are online near you right now.
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="hero-art">
            <div style={{ borderRadius: "var(--radius-m)", overflow: "hidden", border: "1px solid var(--line)", background: "#C9727A33", aspectRatio: "1/1.9", gridRow: "span 2", display: "flex", alignItems: "flex-end", position: "relative" }}>
              <svg viewBox="0 0 200 380" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
                <rect width="200" height="380" fill="#DCA6AC" />
                <circle cx="70" cy="140" r="46" fill="#F0EEE1" />
                <circle cx="55" cy="120" r="9" fill="#123832" />
                <circle cx="90" cy="120" r="9" fill="#123832" />
                <ellipse cx="70" cy="150" rx="14" ry="9" fill="#123832" />
                <rect x="20" y="200" width="100" height="120" rx="18" fill="#F0EEE1" />
                <rect x="130" y="230" width="55" height="80" rx="14" fill="#E4A13B" />
              </svg>
              <span style={{ margin: 12, padding: "6px 10px", background: "rgba(18,31,25,0.82)", color: "var(--white)", fontSize: "0.75rem", borderRadius: 100, fontWeight: 600, position: "absolute" }}>
                Home visit
              </span>
            </div>
            <div style={{ borderRadius: "var(--radius-m)", overflow: "hidden", border: "1px solid var(--line)", background: "#12383233", aspectRatio: "1/1", display: "flex", alignItems: "flex-end", position: "relative" }}>
              <svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
                <rect width="200" height="180" fill="#9FB8AE" />
                <rect x="24" y="24" width="152" height="100" rx="10" fill="#F0EEE1" />
                <circle cx="100" cy="74" r="26" fill="#123832" />
                <rect x="70" y="140" width="60" height="10" rx="5" fill="#123832" />
              </svg>
              <span style={{ margin: 12, padding: "6px 10px", background: "rgba(18,31,25,0.82)", color: "var(--white)", fontSize: "0.75rem", borderRadius: 100, fontWeight: 600, position: "absolute" }}>
                Video consult
              </span>
            </div>
            <div style={{ borderRadius: "var(--radius-m)", overflow: "hidden", border: "1px solid var(--line)", background: "#E4A13B33", aspectRatio: "1/1", display: "flex", alignItems: "flex-end", position: "relative" }}>
              <svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
                <rect width="200" height="180" fill="#EFCB8F" />
                <circle cx="100" cy="90" r="50" fill="#F0EEE1" />
                <circle cx="82" cy="80" r="8" fill="#123832" />
                <circle cx="118" cy="80" r="8" fill="#123832" />
                <path d="M80 105 Q100 120 120 105" stroke="#123832" strokeWidth="5" fill="none" strokeLinecap="round" />
              </svg>
              <span style={{ margin: 12, padding: "6px 10px", background: "rgba(18,31,25,0.82)", color: "var(--white)", fontSize: "0.75rem", borderRadius: 100, fontWeight: 600, position: "absolute" }}>
                Wellness
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <div style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="wrap" style={{ display: "flex", flexWrap: "wrap", gap: 40, padding: "26px 32px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-fraunces), Fraunces, serif", fontWeight: 600, fontSize: "1.4rem" }}>1,240+</span>
            <span style={{ fontSize: "0.88rem", color: "var(--ink-soft)" }}>licensed vets on the network</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-fraunces), Fraunces, serif", fontWeight: 600, fontSize: "1.4rem" }}>18 min</span>
            <span style={{ fontSize: "0.88rem", color: "var(--ink-soft)" }}>average time to match</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-fraunces), Fraunces, serif", fontWeight: 600, fontSize: "1.4rem" }}>42</span>
            <span style={{ fontSize: "0.88rem", color: "var(--ink-soft)" }}>cities covered</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-fraunces), Fraunces, serif", fontWeight: 600, fontSize: "1.4rem" }}>4.9/5</span>
            <span style={{ fontSize: "0.88rem", color: "var(--ink-soft)" }}>average pet-owner rating</span>
          </div>
        </div>
      </div>

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
              { title: "Insured visits", desc: "Every consult and home visit is covered under our provider liability policy." },
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

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: "84px 0", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", background: "var(--paper-2)" }}>
        <div className="wrap">
          <div className="section-head">
            <h2>Three steps between you and a vet</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }} className="steps-grid">
            {[
              { idx: "1", title: "Tell us what's wrong", desc: "Pick your pet, describe the concern, and choose video, home visit, or emergency care." },
              { idx: "2", title: "Get matched instantly", desc: "We hail the nearest available, licensed vet who treats your pet's species and concern." },
              { idx: "3", title: "Consult and get a plan", desc: "Talk it through, get a diagnosis or referral, and a written care plan lands in your inbox." },
            ].map((step, i) => (
              <div key={step.idx} style={{ padding: "36px 40px", borderLeft: i > 0 ? "1px solid var(--line)" : "none", paddingLeft: i === 0 ? 0 : undefined }} className="step-card">
                <div style={{ fontFamily: "var(--font-fraunces), Fraunces, serif", fontSize: "0.95rem", color: "var(--amber-dark)", fontWeight: 700, marginBottom: 14 }}>{step.idx}</div>
                <h3 style={{ fontSize: "1.22rem", marginBottom: 10 }}>{step.title}</h3>
                <p style={{ color: "var(--ink-soft)", fontSize: "0.97rem" }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VETS */}
      <section id="vets" style={{ padding: "84px 0" }}>
        <div className="wrap">
          <div className="section-head">
            <h2>Vets online near you</h2>
            <p>Every vet is licensed and background-checked before joining the network. Availability updates live.</p>
          </div>
          <VetGrid vets={vets} onBookVet={setSelectedVet} />
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <a
              href="/vets"
              className="btn-secondary"
              style={{ textDecoration: "none", display: "inline-block" }}
            >
              Browse all vets
            </a>
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
                ₹499<span style={{ fontSize: "0.9rem", fontWeight: 400, color: "var(--ink-soft)" }}>/visit</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 9 }}>
                <li style={{ fontSize: "0.9rem", color: "var(--ink-soft)", paddingLeft: 16, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "var(--amber-dark)" }}>—</span>15-minute video call</li>
                <li style={{ fontSize: "0.9rem", color: "var(--ink-soft)", paddingLeft: 16, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "var(--amber-dark)" }}>—</span>Written care plan after</li>
                <li style={{ fontSize: "0.9rem", color: "var(--ink-soft)", paddingLeft: 16, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "var(--amber-dark)" }}>—</span>Free 48-hr follow-up message</li>
              </ul>
              <button className="btn-secondary" style={{ width: "100%" }} onClick={() => document.getElementById("hail")?.scrollIntoView({ behavior: "smooth" })}>Choose video</button>
            </div>
            <div className="card" style={{ padding: 26, border: "2px solid var(--deep)", position: "relative" }}>
              <span style={{ position: "absolute", top: -12, left: 24, background: "var(--amber)", color: "var(--deep-2)", fontSize: "0.72rem", fontWeight: 700, padding: "5px 10px", borderRadius: 100 }}>Most booked</span>
              <h3>Home visit</h3>
              <div style={{ fontFamily: "var(--font-fraunces), Fraunces, serif", fontWeight: 600, fontSize: "1.9rem", margin: "12px 0 16px" }}>
                ₹899<span style={{ fontSize: "0.9rem", fontWeight: 400, color: "var(--ink-soft)" }}>/visit</span>
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
                ₹1,299<span style={{ fontSize: "0.9rem", fontWeight: 400, color: "var(--ink-soft)" }}>/visit</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 9 }}>
                <li style={{ fontSize: "0.9rem", color: "var(--ink-soft)", paddingLeft: 16, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "var(--amber-dark)" }}>—</span>Priority match, skips the queue</li>
                <li style={{ fontSize: "0.9rem", color: "var(--ink-soft)", paddingLeft: 16, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "var(--amber-dark)" }}>—</span>Available 24/7</li>
                <li style={{ fontSize: "0.9rem", color: "var(--ink-soft)", paddingLeft: 16, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "var(--amber-dark)" }}>—</span>Nearest 24-hr clinic as backup</li>
              </ul>
              <button className="btn-secondary" style={{ width: "100%" }} onClick={() => document.getElementById("hail")?.scrollIntoView({ behavior: "smooth" })}>Choose emergency</button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, border: "1px solid var(--line)", borderRadius: "var(--radius-m)", background: "var(--paper-2)", padding: "22px 26px" }}>
            <div>
              <h3 style={{ marginBottom: 6 }}>PetTails Plus</h3>
              <p style={{ color: "var(--ink-soft)", fontSize: "0.94rem", margin: 0 }}>₹299/month — unlimited video consults, 20% off home visits, priority matching.</p>
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
            <p>Real feedback after real visits, filterable by rating.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }} className="quotes-grid">
            {[
              { text: "Our dog wouldn't touch his food at 9pm on a Sunday. Had a vet on video in under fifteen minutes.", name: "Riya M.", pet: "Owner of Bruno, Labrador", rating: 5 },
              { text: "My cat hates carriers. A vet came to the flat instead — first time she didn't hide under the bed.", name: "Arjun K.", pet: "Owner of Momo, cat", rating: 5 },
              { text: "Booking felt like calling a cab, not fighting a clinic's phone line. That alone is worth it.", name: "Sana P.", pet: "Owner of two rescue pups", rating: 4 },
            ].map((q) => (
              <div key={q.name} className="card" style={{ padding: 26, display: "flex", flexDirection: "column", gap: 16 }}>
                <p style={{ fontSize: "1.02rem" }}>&quot;{q.text}&quot;</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--paper-2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-fraunces), Fraunces, serif", fontWeight: 600, fontSize: "0.9rem", color: "var(--deep)" }}>
                    {q.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>{q.name}</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>{q.pet} · ★{q.rating}.0</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
              { num: "₹1,800+", label: "average earned per video consult" },
              { num: "You choose", label: "your hours, radius, and rates" },
              { num: "48 hrs", label: "typical time to get verified" },
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
        @media (max-width: 900px) {
          .hero-grid, .partner-grid { grid-template-columns: 1fr !important; }
          .safety-grid, .svc-grid, .price-grid, .quotes-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .step-card { border-left: none !important; border-top: 1px solid var(--line); padding: 32px 0 !important; }
          .step-card:first-child { border-top: none; }
        }
        @media (max-width: 620px) {
          .vet-grid-responsive { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .hail-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      router.push(profile?.role === "vet" ? "/dashboard/vet" : "/dashboard/owner");
    }
  };

  return (
    <div className="lg-page">
      <div className="lg-decor" aria-hidden="true">
        <span className="lg-glow lg-glow-bl" />
        <span className="lg-bok lg-bok1" />
        <span className="lg-bok lg-bok2" />
        <span className="lg-bok lg-bok3" />
        <span className="lg-bok lg-bok4" />
        <span className="lg-bok lg-bok5" />
        <span className="lg-glow lg-glow-w" />
        <span className="lg-glow lg-glow-tr" />
        <span className="lg-bok lg-bok6" />
        <span className="lg-bok lg-bok7" />
        <span className="lg-sweep" />
      </div>

      <div className="lg-grid">
        <section className="lg-left">
          <p className="lg-eyebrow anim a1">HAPPIER PETS. HEALTHIER TOMORROWS.</p>
          <div className="lg-title-row anim a2">
            <h1>Welcome back</h1>
            <svg className="lg-heart-title" viewBox="0 0 48 44" fill="none" stroke="#E8963F" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M24 40S5.5 29.5 3.5 16.5C1.8 5.5 12 0.8 18 5.5c2.6 2 4.6 5.3 6 8.8 1.4-3.5 3.4-6.8 6-8.8 6-4.7 16.2 0 14.5 11C42.5 29.5 24 40 24 40z" />
              <path d="M20 37.5S8 30 6 20" opacity="0.4" />
            </svg>
          </div>
          <p className="lg-lead anim a3">
            Log in to your PetTails account and continue caring for your furry
            friend.
          </p>

          <ul className="lg-feats anim a4">
            <li>
              <span className="lg-ico">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <ellipse cx="7.4" cy="10" rx="1.9" ry="2.3" />
                  <ellipse cx="11.6" cy="7" rx="2" ry="2.4" />
                  <ellipse cx="16.2" cy="7.2" rx="2" ry="2.4" />
                  <ellipse cx="19.4" cy="10.8" rx="1.8" ry="2.2" />
                  <path d="M12.3 12.2c2.5 0 4.8 2 5.2 4.3.4 2.3-1.4 4.2-3.6 4.2-.9 0-1.3-.4-2.1-.4-.9 0-1.2.4-2.1.4-2.2 0-4-1.9-3.6-4.2.4-2.3 2.8-4.3 6.2-4.3z" />
                </svg>
              </span>
              <div>
                <strong>Access your pets</strong>
                <span>Manage their profiles and health info</span>
              </div>
            </li>
            <li>
              <span className="lg-ico">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
                  <path d="M3.5 9.8h17" />
                  <path d="M8 3.2v3.4" />
                  <path d="M16 3.2v3.4" />
                </svg>
              </span>
              <div>
                <strong>Book consultations</strong>
                <span>Connect with trusted veterinarians</span>
              </div>
            </li>
            <li>
              <span className="lg-ico">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20.5s-7.3-4.5-9.3-8.8C1.1 8.4 3 4.9 6.4 4.6c2.1-.2 4 .9 5.6 2.9 1.6-2 3.5-3.1 5.6-2.9 3.4.3 5.3 3.8 3.7 7.1-2 4.3-9.3 8.8-9.3 8.8z" />
                </svg>
              </span>
              <div>
                <strong>Get AI guidance</strong>
                <span>Instant help for your pet&apos;s care</span>
              </div>
            </li>
          </ul>

          <svg className="lg-heart-btm" viewBox="0 0 48 44" fill="none" stroke="#E8963F" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M24 40S5.5 29.5 3.5 16.5C1.8 5.5 12 0.8 18 5.5c2.6 2 4.6 5.3 6 8.8 1.4-3.5 3.4-6.8 6-8.8 6-4.7 16.2 0 14.5 11C42.5 29.5 24 40 24 40z" />
          </svg>
          <svg className="lg-squig" viewBox="0 0 120 44" fill="none" stroke="#4C9468" strokeWidth="3.2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 30c8-16 17 6 26-8s17 12 27-4 17 10 27-6" />
          </svg>
        </section>

        <section className="lg-card-col">
          <div className="lg-card">
            <div className="lg-card-head">
              <h2>Welcome back</h2>
              <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <ellipse cx="7.4" cy="10" rx="1.9" ry="2.3" />
                <ellipse cx="11.6" cy="7" rx="2" ry="2.4" />
                <ellipse cx="16.2" cy="7.2" rx="2" ry="2.4" />
                <ellipse cx="19.4" cy="10.8" rx="1.8" ry="2.2" />
                <path d="M12.3 12.2c2.5 0 4.8 2 5.2 4.3.4 2.3-1.4 4.2-3.6 4.2-.9 0-1.3-.4-2.1-.4-.9 0-1.2.4-2.1.4-2.2 0-4-1.9-3.6-4.2.4-2.3 2.8-4.3 6.2-4.3z" />
              </svg>
            </div>
            <p className="lg-card-sub">Log in to your PetTails account.</p>

            <form onSubmit={handleLogin}>
              <label className="lg-label" htmlFor="email">Email</label>
              <div className="lg-inp-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
                  <path d="m4.5 7.5 7.5 5.4 7.5-5.4" />
                </svg>
                <input
                  className="lg-inp"
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <label className="lg-label" htmlFor="password">Password</label>
              <div className="lg-inp-wrap lg-inp-wrap-last">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" />
                  <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
                </svg>
                <input
                  className="lg-inp"
                  id="password"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="lg-error" role="alert">
                  {error}
                </div>
              )}

              <button
                className="lg-btn"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="lg-spin" aria-hidden="true" />
                    Logging in...
                  </>
                ) : (
                  <>
                    Log in
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4.5 12h15" />
                      <path d="m13 5.5 6.5 6.5-6.5 6.5" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <p className="lg-signup">
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup">Sign up</Link>
            </p>
          </div>
        </section>

        <section className="lg-right">
          <div className="lg-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/hero-pets.jpg"
              alt="A cat and a dog sitting close together outdoors"
            />
          </div>
          <svg className="lg-heart-photo" viewBox="0 0 48 44" fill="none" stroke="#E8963F" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M24 40S5.5 29.5 3.5 16.5C1.8 5.5 12 0.8 18 5.5c2.6 2 4.6 5.3 6 8.8 1.4-3.5 3.4-6.8 6-8.8 6-4.7 16.2 0 14.5 11C42.5 29.5 24 40 24 40z" />
          </svg>
          <svg className="lg-squig-photo" viewBox="0 0 120 44" fill="none" stroke="#D8EEDC" strokeWidth="3.2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 30c8-16 17 6 26-8s17 12 27-4 17 10 27-6" />
          </svg>
        </section>
      </div>

      <style>{`
        .lg-page {
          position: relative;
          min-height: calc(100vh - 62px);
          background: #F3F1E5;
          padding: clamp(26px, 4vh, 42px) 0 clamp(48px, 6.5vh, 74px);
          color: var(--ink);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .lg-decor {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }
        .lg-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(48px);
        }
        .lg-glow-bl {
          width: 560px;
          height: 500px;
          left: -190px;
          bottom: -170px;
          background: radial-gradient(closest-side, rgba(139, 174, 126, 0.62), rgba(139, 174, 126, 0) 72%);
        }
        .lg-glow-w {
          width: 780px;
          height: 660px;
          right: -80px;
          top: 10%;
          background: radial-gradient(closest-side, rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0) 74%);
          filter: blur(24px);
        }
        .lg-glow-tr {
          width: 560px;
          height: 520px;
          right: -170px;
          top: -150px;
          background: radial-gradient(closest-side, rgba(126, 166, 116, 0.5), rgba(126, 166, 116, 0) 72%);
        }
        .lg-bok {
          position: absolute;
          border-radius: 50%;
          filter: blur(10px);
        }
        .lg-bok1 {
          left: 8px;
          bottom: 215px;
          width: 74px;
          height: 74px;
          background: rgba(233, 244, 222, 0.75);
        }
        .lg-bok2 {
          left: 98px;
          bottom: 100px;
          width: 54px;
          height: 54px;
          background: rgba(154, 196, 140, 0.7);
        }
        .lg-bok3 {
          left: -14px;
          bottom: 54px;
          width: 120px;
          height: 120px;
          background: rgba(96, 142, 92, 0.55);
        }
        .lg-bok4 {
          left: 174px;
          bottom: 196px;
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.8);
        }
        .lg-bok5 {
          left: 44px;
          bottom: 336px;
          width: 88px;
          height: 88px;
          background: rgba(174, 206, 156, 0.5);
        }
        .lg-bok6 {
          right: 66px;
          top: 46px;
          width: 62px;
          height: 62px;
          background: rgba(196, 224, 184, 0.65);
        }
        .lg-bok7 {
          right: 178px;
          top: 118px;
          width: 38px;
          height: 38px;
          background: rgba(255, 255, 255, 0.7);
        }
        .lg-sweep {
          position: absolute;
          left: 50%;
          bottom: -96px;
          transform: translateX(-50%);
          width: min(780px, 72%);
          height: 250px;
          background: radial-gradient(closest-side, rgba(255, 254, 250, 0.9), rgba(255, 254, 250, 0));
          border-radius: 50%;
          filter: blur(6px);
        }

        .lg-grid {
          position: relative;
          z-index: 1;
          width: min(1440px, calc(100% - clamp(40px, 8vw, 170px)));
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(370px, 448px) minmax(0, 1.06fr);
          gap: clamp(30px, 3.6vw, 56px);
          align-items: center;
        }

        .lg-left {
          position: relative;
        }
        .lg-eyebrow {
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: #1B4536;
          margin: 0 0 18px;
        }
        .lg-title-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .lg-title-row h1 {
          font-family: var(--font-fraunces), Fraunces, serif;
          font-weight: 700;
          font-size: clamp(42px, 3.5vw, 54px);
          line-height: 1.05;
          letter-spacing: -0.02em;
          color: #133026;
          margin: 0;
        }
        .lg-heart-title {
          width: clamp(44px, 3.8vw, 58px);
          flex: none;
          margin-top: 8px;
          transform: rotate(-7deg);
        }
        .lg-lead {
          font-size: clamp(15.5px, 1.15vw, 17px);
          line-height: 1.65;
          color: var(--ink-soft);
          max-width: 46ch;
          margin: 22px 0 34px;
        }
        .lg-feats {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .lg-feats li {
          display: flex;
          align-items: center;
          gap: 17px;
        }
        .lg-ico {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #E4EFE6;
          display: grid;
          place-items: center;
          color: var(--deep);
          flex: none;
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .lg-feats li:hover .lg-ico {
          background: #D8E9DC;
          transform: translateY(-2px);
        }
        .lg-feats strong {
          display: block;
          font-family: var(--font-fraunces), Fraunces, serif;
          font-weight: 700;
          font-size: 1.06rem;
          color: var(--ink);
          margin-bottom: 3px;
        }
        .lg-feats div span {
          font-size: 0.93rem;
          color: var(--ink-soft);
          line-height: 1.5;
        }
        .lg-heart-btm {
          position: absolute;
          width: 44px;
          right: 5%;
          bottom: -10px;
          transform: rotate(9deg);
        }
        .lg-squig {
          position: absolute;
          width: 86px;
          left: 46%;
          bottom: -46px;
        }

        .lg-card {
          width: 100%;
          background: #FFFEFA;
          border: 1px solid rgba(28, 42, 33, 0.06);
          border-radius: 24px;
          padding: clamp(28px, 2.6vw, 38px) clamp(26px, 2.6vw, 38px) 30px;
          box-shadow: 0 26px 64px rgba(15, 40, 28, 0.11), 0 2px 6px rgba(15, 40, 28, 0.05);
        }
        .lg-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .lg-card-head h2 {
          font-family: var(--font-fraunces), Fraunces, serif;
          font-weight: 700;
          font-size: clamp(24px, 1.9vw, 29px);
          color: var(--deep);
          margin: 0;
          letter-spacing: -0.01em;
        }
        .lg-card-head svg {
          color: var(--deep);
          flex: none;
        }
        .lg-card-sub {
          font-size: 0.96rem;
          color: var(--ink-soft);
          margin: 9px 0 26px;
        }
        .lg-label {
          display: block;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--ink);
          margin: 0 0 7px;
        }
        .lg-inp-wrap {
          position: relative;
          margin-bottom: 16px;
        }
        .lg-inp-wrap-last {
          margin-bottom: 0;
        }
        .lg-inp-wrap > svg {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #3A5245;
          opacity: 0.8;
          pointer-events: none;
        }
        .lg-inp {
          width: 100%;
          padding: 14.5px 16px 14.5px 46px;
          font-size: 0.97rem;
          font-family: inherit;
          color: var(--ink);
          background: #F4F2E9;
          border: 1px solid rgba(28, 42, 33, 0.07);
          border-radius: 12px;
          outline: none;
          transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        .lg-inp::placeholder {
          color: #93978D;
        }
        .lg-inp:hover {
          border-color: rgba(28, 42, 33, 0.16);
        }
        .lg-inp:focus {
          background: #FFFEFA;
          border-color: rgba(18, 56, 50, 0.5);
          box-shadow: 0 0 0 3px rgba(18, 56, 50, 0.13);
        }
        .lg-error {
          background: #FBEFEF;
          border: 1px solid rgba(201, 114, 122, 0.5);
          color: #9E454E;
          font-size: 0.89rem;
          line-height: 1.45;
          padding: 11px 14px;
          border-radius: 10px;
          margin: 16px 0 0;
        }
        .lg-btn {
          width: 100%;
          margin-top: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 15.5px 18px;
          font-size: 1rem;
          font-weight: 600;
          font-family: inherit;
          color: #fff;
          background: var(--deep);
          border: none;
          border-radius: 12px;
          cursor: pointer;
          box-shadow: 0 12px 26px rgba(18, 56, 50, 0.24);
          transition: background 0.18s ease, transform 0.15s ease, box-shadow 0.18s ease, opacity 0.18s ease;
        }
        .lg-btn:hover:not(:disabled) {
          background: var(--deep-2);
          transform: translateY(-1px);
          box-shadow: 0 16px 30px rgba(18, 56, 50, 0.28);
        }
        .lg-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .lg-btn:disabled {
          opacity: 0.78;
          cursor: default;
        }
        .lg-btn svg {
          transition: transform 0.18s ease;
        }
        .lg-btn:hover:not(:disabled) svg {
          transform: translateX(3px);
        }
        .lg-spin {
          width: 15px;
          height: 15px;
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: lgSpin 0.7s linear infinite;
        }
        @keyframes lgSpin {
          to { transform: rotate(360deg); }
        }
        .lg-signup {
          text-align: center;
          font-size: 0.93rem;
          color: var(--ink-soft);
          margin: 24px 0 0;
        }
        .lg-signup a {
          color: var(--deep);
          font-weight: 600;
          text-decoration: none;
        }
        .lg-signup a:hover {
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .lg-right {
          position: relative;
        }
        .lg-photo {
          position: relative;
          overflow: hidden;
          aspect-ratio: 4 / 5.8;
          border-radius: 48% 52% 46% 54% / 42% 40% 60% 58%;
          box-shadow: 0 34px 80px rgba(20, 45, 32, 0.2);
          background: #DFE7DC;
        }
        .lg-photo img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: 50% 42%;
          transform: scale(1.04);
          transition: transform 0.6s ease;
        }
        .lg-photo:hover img {
          transform: scale(1.07);
        }
        .lg-heart-photo {
          position: absolute;
          left: -4%;
          top: 24%;
          width: 58px;
          transform: rotate(-10deg);
          z-index: 2;
        }
        .lg-squig-photo {
          position: absolute;
          right: 6%;
          top: 8%;
          width: 92px;
          z-index: 2;
        }

        .anim {
          animation: lgUp 0.5s cubic-bezier(0.22, 0.68, 0.36, 1) both;
        }
        .a1 { animation-delay: 0.05s; }
        .a2 { animation-delay: 0.12s; }
        .a3 { animation-delay: 0.2s; }
        .a4 { animation-delay: 0.28s; }
        .lg-card {
          animation: lgUp 0.55s cubic-bezier(0.22, 0.68, 0.36, 1) both;
        }
        .lg-photo {
          animation: lgIn 0.6s ease 0.1s both;
        }
        @keyframes lgUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lgIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lg-page *,
          .lg-page *::before,
          .lg-page *::after {
            animation-duration: 0.01ms !important;
            animation-delay: 0s !important;
            transition-duration: 0.01ms !important;
          }
        }

        @media (min-width: 1440px) {
          .lg-title-row h1 { white-space: nowrap; }
        }
        @media (max-width: 1160px) {
          .lg-grid {
            grid-template-columns: minmax(0, 1fr) minmax(340px, 440px);
          }
          .lg-right {
            grid-column: 1 / -1;
            max-width: 760px;
            width: 100%;
            margin: 16px auto 0;
          }
          .lg-photo {
            aspect-ratio: 16 / 7.6;
          }
          .lg-heart-photo {
            top: auto;
            bottom: 14%;
            left: -8px;
            width: 48px;
          }
          .lg-squig-photo {
            top: 10%;
            right: 8%;
            width: 76px;
          }
        }
        @media (max-width: 760px) {
          .lg-grid {
            grid-template-columns: 1fr;
            gap: 34px;
            width: calc(100% - 40px);
          }
          .lg-title-row h1 {
            font-size: clamp(40px, 11vw, 54px);
          }
          .lg-lead {
            font-size: 15.5px;
            margin: 16px 0 26px;
          }
          .lg-eyebrow {
            font-size: 0.72rem;
            margin-bottom: 14px;
          }
          .lg-feats {
            gap: 18px;
          }
          .lg-heart-btm,
          .lg-squig {
            display: none;
          }
          .lg-card {
            max-width: 560px;
            margin: 0 auto;
          }
          .lg-right {
            margin-top: 4px;
          }
          .lg-photo {
            aspect-ratio: 4 / 3.6;
            max-width: 520px;
            margin: 0 auto;
          }
        }
        @media (max-width: 440px) {
          .lg-grid {
            width: calc(100% - 28px);
            gap: 28px;
          }
          .lg-card {
            padding: 24px 18px;
            border-radius: 20px;
          }
          .lg-ico {
            width: 50px;
            height: 50px;
          }
          .lg-inp {
            padding: 13.5px 14px 13.5px 44px;
          }
          .lg-title-row h1 {
            font-size: 38px;
          }
          .lg-heart-title {
            width: 40px;
          }
          .lg-heart-photo {
            width: 40px;
          }
        }
      `}</style>
    </div>
  );
}

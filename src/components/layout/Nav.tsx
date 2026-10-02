"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const THEME_KEY = "pettails-nav-theme";

export function isFloatNav(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/ai-care" ||
    pathname.startsWith("/vets") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/auth")
  );
}

export function Nav() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(false);
  const supabase = createClient();
  const pathname = usePathname();
  const floatNav = isFloatNav(pathname);
  const showLoc =
    floatNav &&
    !pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/auth");

  // Restore saved header theme before paint (no flash, no SSR mismatch)
  useIsomorphicLayoutEffect(() => {
    try {
      if (window.localStorage.getItem(THEME_KEY) === "dark") setDark(true);
    } catch {
      /* noop */
    }
  }, []);

  // Scroll state: passive listener, rAF-throttled, boolean updates only
  useEffect(() => {
    if (!floatNav) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      setScrolled(window.scrollY > 40);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [floatNav]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(data);
      }
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: { user: User | null } | null) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          setProfile(data);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const applyTheme = (next: boolean) => {
    setDark(next);
    try {
      window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      /* noop */
    }
  };

  const themeControl = (variant: "d" | "m") => (
    <div className={`nav-theme nav-theme-${variant}`} role="group" aria-label="Color theme">
      <button
        type="button"
        aria-label="Light theme"
        aria-pressed={!dark}
        className={`nav-theme-b${!dark ? " on" : ""}`}
        onClick={() => applyTheme(false)}
      >
        <span className="nav-theme-i" aria-hidden="true">☀️</span>
      </button>
      <button
        type="button"
        aria-label="Dark theme"
        aria-pressed={dark}
        className={`nav-theme-b${dark ? " on" : ""}`}
        onClick={() => applyTheme(true)}
      >
        <span className="nav-theme-i" aria-hidden="true">🌙</span>
      </button>
    </div>
  );

  return (
    <header
      className={[
        floatNav ? "nav-float" : "nav-bar",
        scrolled ? "nav-scrolled" : "",
        dark ? "nav-dark" : "",
        mobileOpen ? "nav-menu-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={floatNav ? "nav-float-in" : "nav-bar-in"}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            fontFamily: "var(--font-fraunces), Fraunces, serif",
            fontWeight: 700,
            fontSize: "1.35rem",
            textDecoration: "none",
            color: "var(--nav-ink)",
          }}
        >
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "var(--deep)",
              position: "relative",
              flex: "none",
              display: "inline-block",
            }}
          >
            <span
              style={{
                position: "absolute",
                inset: 6,
                borderRadius: "50%",
                background: "var(--amber)",
              }}
            />
          </span>
          PetTails
        </Link>

        <nav className="nav-links-desktop">
          <Link
            href="/#how"
            style={{
              textDecoration: "none",
              color: "var(--nav-ink-soft)",
              fontSize: "0.96rem",
              fontWeight: 500,
            }}
          >
            How it works
          </Link>
          <Link
            href="/vets"
            className={pathname.startsWith("/vets") ? "nav-link-active" : undefined}
            style={{
              textDecoration: "none",
              color: "var(--nav-ink-soft)",
              fontSize: "0.96rem",
              fontWeight: 500,
            }}
          >
            Find a vet
          </Link>
          <Link
            href="/ai-care"
            className={pathname === "/ai-care" ? "nav-link-active" : undefined}
            style={{
              textDecoration: "none",
              color: "var(--nav-ink-soft)",
              fontSize: "0.96rem",
              fontWeight: 500,
            }}
          >
            AI Care
          </Link>
          <Link
            href="/#pricing"
            style={{
              textDecoration: "none",
              color: "var(--nav-ink-soft)",
              fontSize: "0.96rem",
              fontWeight: 500,
            }}
          >
            Pricing
          </Link>
          {user && (
            <Link
              href={
                profile?.role === "vet"
                  ? "/dashboard/vet"
                  : "/dashboard/owner"
              }
              className={
                pathname.startsWith("/dashboard") ? "nav-link-active" : undefined
              }
              style={{
                textDecoration: "none",
                color: "var(--nav-ink-soft)",
                fontSize: "0.96rem",
                fontWeight: 500,
              }}
            >
              Dashboard
            </Link>
          )}
          <div className="nav-right">
            {themeControl("d")}
            {showLoc && (
              <span className="nav-loc">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Available for online bookings
              </span>
            )}
            {!user ? (
              <>
                <Link
                  href="/auth/login"
                  className={
                    pathname === "/auth/login"
                      ? "nav-tail nav-link-active"
                      : "nav-tail nav-login"
                  }
                  style={{
                    textDecoration: "none",
                    color: "var(--nav-ink-soft)",
                    fontSize: "0.96rem",
                    fontWeight: 500,
                  }}
                >
                  Log in
                </Link>
                <Link
                  href="/auth/signup"
                  className="nav-signup"
                  style={{
                    background: "var(--nav-cta-bg)",
                    color: "var(--nav-cta-ink)",
                    padding: "11px 21px",
                    borderRadius: "var(--radius-s)",
                    fontSize: "0.94rem",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Sign up
                </Link>
              </>
            ) : (
              !pathname.startsWith("/dashboard") && (
                <button onClick={handleLogout} className="nav-tail nav-logout">
                  Log out
                </button>
              )
            )}
            {floatNav && user && (
              <>
                <span className="nav-div" aria-hidden="true" />
                <Link
                  href={
                    profile?.role === "vet" ? "/dashboard/vet" : "/dashboard/owner"
                  }
                  className="nav-av"
                  title={profile?.name || "Your profile"}
                  aria-label="Your profile"
                >
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar_url} alt={profile.name || "Profile"} />
                  ) : (
                    <span>{(profile?.name || user.email || "U").charAt(0).toUpperCase()}</span>
                  )}
                </Link>
              </>
            )}
          </div>
        </nav>

        {themeControl("m")}
        <button
          className="nav-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            display: "none",
            background: "none",
            border: "none",
            fontSize: "1.5rem",
          }}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? "×" : "☰"}
        </button>
      </div>

      {mobileOpen && (
        <div
          className="nav-mobile-menu"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            padding: "16px 32px 24px",
            borderTop: "1px solid var(--nav-div)",
          }}
        >
          <Link href="/#how" onClick={() => setMobileOpen(false)}>
            How it works
          </Link>
          <Link href="/vets" onClick={() => setMobileOpen(false)}>
            Find a vet
          </Link>
          <Link href="/ai-care" onClick={() => setMobileOpen(false)}>
            AI Care
          </Link>
          <Link href="/#pricing" onClick={() => setMobileOpen(false)}>
            Pricing
          </Link>
          {user && (
            <Link
              href={
                profile?.role === "vet"
                  ? "/dashboard/vet"
                  : "/dashboard/owner"
              }
              onClick={() => setMobileOpen(false)}
            >
              Dashboard
            </Link>
          )}
          {!user ? (
            <>
              <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                Log in
              </Link>
              <Link href="/auth/signup" onClick={() => setMobileOpen(false)}>
                Sign up
              </Link>
            </>
          ) : (
            <button onClick={handleLogout}>Log out</button>
          )}
        </div>
      )}

      <style>{`
        /* ── Fixed floating pill header (Apple-style glass) ── */
        .nav-float {
          position: fixed;
          top: 12px;
          left: 0;
          right: 0;
          z-index: 40;
          background: transparent;
          border-bottom: none;
        }
        .nav-float-in {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: min(1440px, calc(100% - clamp(24px, 7vw, 200px)));
          margin: 0 auto;
          padding: 9px 26px 9px 30px;
          background: var(--nav-glass);
          border: 1px solid var(--nav-border);
          border-radius: 999px;
          box-shadow: var(--nav-shadow);
          backdrop-filter: blur(var(--nav-blur)) saturate(var(--nav-sat));
          -webkit-backdrop-filter: blur(var(--nav-blur)) saturate(var(--nav-sat));
          transition:
            width 450ms var(--nav-ease),
            padding 450ms var(--nav-ease),
            background-color 450ms var(--nav-ease),
            border-color 450ms var(--nav-ease),
            box-shadow 450ms var(--nav-ease),
            backdrop-filter 450ms var(--nav-ease),
            border-radius 450ms var(--nav-ease);
        }
        /* Scrolled: compact — narrower, tighter padding, denser glass, stronger shadow */
        .nav-float.nav-scrolled .nav-float-in {
          width: min(1440px, calc(100% - clamp(32px, 13.3vw, 340px)));
          padding: 6px 14px 6px 22px;
          background: var(--nav-glass-2);
          box-shadow: var(--nav-shadow-2);
          backdrop-filter: blur(var(--nav-blur-2)) saturate(var(--nav-sat-2));
          -webkit-backdrop-filter: blur(var(--nav-blur-2)) saturate(var(--nav-sat-2));
        }

        /* ── Flat bar (non-float routes) — tokens only, same layout ── */
        .nav-bar {
          position: sticky;
          top: 0;
          z-index: 40;
          background: var(--nav-flat-bg);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--nav-flat-border);
          transition: background-color 400ms var(--nav-ease),
            border-color 400ms var(--nav-ease);
        }
        .nav-bar-in {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 32px;
          max-width: var(--maxw);
          margin: 0 auto;
        }

        /* ── Nav links: pill hover + active ── */
        .nav-links-desktop {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .nav-float .nav-links-desktop {
          flex: 1;
          margin-left: 30px;
        }
        .nav-links-desktop > a {
          padding: 6px 9px;
          border-radius: 999px;
          transition:
            background-color 200ms ease,
            color 200ms ease,
            transform 200ms ease;
        }
        .nav-links-desktop > a:hover {
          background: var(--nav-hover-bg);
          transform: translateY(-1px);
        }
        .nav-link-active {
          background: var(--nav-active-bg);
          color: var(--nav-active-ink) !important;
          font-weight: 600 !important;
          transition: background-color 220ms ease, color 220ms ease;
        }
        .nav-link-active:hover {
          background: var(--nav-active-bg-hover);
        }
        .nav-float .nav-right {
          margin-left: auto;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .nav-loc {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.92rem;
          font-weight: 500;
          color: var(--nav-loc);
          white-space: nowrap;
        }
        .nav-loc svg { flex: none; }

        /* ── Buttons: soft elevation + subtle scale ── */
        .nav-float .nav-login {
          border: 1px solid var(--nav-login-border);
          background: var(--nav-login-bg);
          padding: 9px 18px;
          border-radius: 10px;
          transition: background-color 180ms ease, transform 180ms ease,
            box-shadow 180ms ease, border-color 180ms ease;
        }
        .nav-float .nav-login:hover {
          background: var(--nav-login-hover);
          transform: translateY(-1px);
        }
        .nav-float .nav-signup {
          border-radius: 10px;
          transition: transform 180ms ease, box-shadow 180ms ease,
            background-color 180ms ease;
        }
        .nav-float .nav-signup:hover {
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 6px 16px rgba(18, 56, 50, 0.18);
        }
        .nav-logout {
          background: transparent;
          border: 1px solid var(--nav-flat-border);
          color: var(--nav-ink-soft);
          padding: 11px 21px;
          border-radius: var(--radius-s);
          font-size: 0.94rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 180ms ease, transform 180ms ease,
            box-shadow 180ms ease, border-color 180ms ease;
        }
        .nav-logout:hover {
          background: var(--nav-hover-bg);
          transform: translateY(-1px);
        }
        .nav-float .nav-logout {
          background: var(--nav-logout-bg);
          border: 1px solid transparent;
          color: var(--nav-logout-ink);
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 0.92rem;
        }
        .nav-float .nav-logout:hover {
          background: var(--nav-logout-bg);
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 6px 16px rgba(18, 56, 50, 0.16);
        }

        /* ── Theme toggle (Apple-like, compact) ── */
        .nav-theme {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px;
          background: var(--nav-track);
          border: 1px solid var(--nav-border);
          border-radius: 999px;
          flex: none;
        }
        .nav-theme-m { display: none; }
        .nav-theme-b {
          width: 26px;
          height: 26px;
          border: none;
          padding: 0;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--nav-tog-off);
          cursor: pointer;
          transition:
            background-color 420ms var(--nav-ease),
            transform 200ms ease,
            box-shadow 300ms ease;
        }
        .nav-theme-b:hover { transform: scale(1.1); }
        .nav-theme-b.on {
          background: var(--nav-tog-on);
          box-shadow: var(--nav-tog-shadow);
        }
        .nav-theme-i {
          display: block;
          font-size: 14px;
          line-height: 1;
          transition:
            transform 450ms var(--nav-ease),
            opacity 400ms ease;
        }
        .nav-theme-b:not(.on) .nav-theme-i {
          transform: rotate(-55deg) scale(0.7);
          opacity: 0.45;
        }
        .nav-theme-b.on .nav-theme-i {
          transform: rotate(0deg) scale(1);
          opacity: 1;
        }

        /* ── Divider + avatar ── */
        .nav-div {
          width: 1px;
          height: 26px;
          background: var(--nav-div);
          flex: none;
          transition: background-color 400ms var(--nav-ease);
        }
        .nav-av {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          flex: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--nav-cta-bg);
          color: var(--nav-cta-ink);
          font-weight: 700;
          font-size: 0.95rem;
          text-decoration: none;
          border: 1px solid var(--nav-av-border);
          transition: transform 200ms ease, background-color 400ms var(--nav-ease);
        }
        .nav-av:hover { transform: scale(1.05); }
        .nav-av img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* ── Mobile menu ── */
        .nav-menu-open .nav-float-in { border-radius: 26px; }
        .nav-mobile-menu a,
        .nav-mobile-menu button {
          padding: 7px 10px;
          border-radius: 12px;
          color: var(--nav-ink);
          text-decoration: none;
          font-weight: 500;
          text-align: left;
          background: none;
          border: none;
          font-size: 1rem;
          transition: background-color 180ms ease, transform 180ms ease;
        }
        .nav-mobile-menu a:hover,
        .nav-mobile-menu button:hover {
          background: var(--nav-hover-bg);
          transform: translateY(-1px);
        }

        .nav-dark :focus-visible { outline-color: var(--nav-active-ink); }

        /* ── Responsive ── */
        .nav-float .nav-mobile-menu { border-radius: 0 0 26px 26px; }
        @media (max-width: 1440px) {
          .nav-float-in { width: calc(100% - 48px); }
          .nav-float.nav-scrolled .nav-float-in { width: calc(100% - 76px); }
        }
        @media (max-width: 1240px) {
          .nav-loc { display: none; }
        }
        @media (max-width: 1024px) {
          .nav-links-desktop { display: none !important; }
          .nav-mobile-toggle { display: block !important; }
          .nav-theme-m { display: flex; margin-left: auto; }
          .nav-float { top: 8px; }
          .nav-float-in {
            width: calc(100% - 16px);
            padding: 8px 14px;
            gap: 10px;
          }
          .nav-float.nav-scrolled .nav-float-in {
            width: calc(100% - 16px);
            padding: 8px 14px;
          }
          .nav-mobile-toggle {
            border-radius: 50%;
            width: 38px;
            height: 38px;
            display: flex !important;
            align-items: center;
            justify-content: center;
            color: var(--nav-ink);
            transition: background-color 180ms ease, transform 180ms ease;
          }
          .nav-mobile-toggle:hover {
            background: var(--nav-hover-bg);
            transform: scale(1.05);
          }
        }
      `}</style>
    </header>
  );
}

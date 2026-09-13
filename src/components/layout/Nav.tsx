"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

export function Nav() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createClient();

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
      async (_event, session) => {
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

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "rgba(240,238,225,0.92)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 32px",
          maxWidth: "var(--maxw)",
          margin: "0 auto",
        }}
      >
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
            color: "var(--ink)",
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

        <nav
          style={{
            display: "flex",
            gap: 34,
            alignItems: "center",
          }}
          className="nav-links-desktop"
        >
          <Link
            href="/#how"
            style={{
              textDecoration: "none",
              color: "var(--ink-soft)",
              fontSize: "0.96rem",
              fontWeight: 500,
            }}
          >
            How it works
          </Link>
          <Link
            href="/#vets"
            style={{
              textDecoration: "none",
              color: "var(--ink-soft)",
              fontSize: "0.96rem",
              fontWeight: 500,
            }}
          >
            Find a vet
          </Link>
          <Link
            href="/#pricing"
            style={{
              textDecoration: "none",
              color: "var(--ink-soft)",
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
              style={{
                textDecoration: "none",
                color: "var(--ink-soft)",
                fontSize: "0.96rem",
                fontWeight: 500,
              }}
            >
              Dashboard
            </Link>
          )}
          {!user ? (
            <>
              <Link
                href="/auth/login"
                style={{
                  textDecoration: "none",
                  color: "var(--ink-soft)",
                  fontSize: "0.96rem",
                  fontWeight: 500,
                }}
              >
                Log in
              </Link>
              <Link
                href="/auth/signup"
                style={{
                  background: "var(--deep)",
                  color: "var(--white)",
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
            <button
              onClick={handleLogout}
              style={{
                background: "transparent",
                border: "1px solid var(--line)",
                color: "var(--ink-soft)",
                padding: "11px 21px",
                borderRadius: "var(--radius-s)",
                fontSize: "0.94rem",
                fontWeight: 600,
              }}
            >
              Log out
            </button>
          )}
        </nav>

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
            borderTop: "1px solid var(--line)",
          }}
        >
          <Link href="/#how" onClick={() => setMobileOpen(false)}>
            How it works
          </Link>
          <Link href="/#vets" onClick={() => setMobileOpen(false)}>
            Find a vet
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
        @media (max-width: 860px) {
          .nav-links-desktop { display: none !important; }
          .nav-mobile-toggle { display: block !important; }
        }
      `}</style>
    </header>
  );
}
